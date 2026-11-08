"""Comandos por tenant. Un bloqueo empresarial y un commit por operación.

Serializar escrituras de una misma PyME simplifica stock, caja e idempotencia;
empresas diferentes no comparten ese bloqueo. No se usa estado del navegador.
"""
import hashlib
import json
import unicodedata
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.infrastructure.models import AuthSession, Business, Membership, User
from app.infrastructure.models.commerce import (BusinessSettings, UserPreferences, Location,
    CatalogItem, Supplier, FinancialAccount, Purchase, StockBalance, InventoryOperation,
    StockMovement, CashSession, Sale, Expense, CommandReceipt)
from app.modules.auth.tokens import now_utc
from app.modules.businesses.permissions import BusinessPermission, has_business_permission

MANAGERS = {'TITULAR_ADMINISTRATIVO', 'ADMINISTRADOR', 'ENCARGADO'}
ADMINISTRATORS = {'TITULAR_ADMINISTRATIVO', 'ADMINISTRADOR'}
MAX_CENTS = 99_999_999_999
DISCRETE = {'UNIDAD','PAQUETE','CAJA','SERVICIO','CONCEPTO'}


def fail(message, code=422):
    raise HTTPException(code, message)


def name_key(value):
    return ' '.join(unicodedata.normalize('NFKC', value).split()).casefold()


def stamp(value):
    return value.isoformat().replace('+00:00', 'Z')


def quantity(value, unit, zero=False):
    if type(value) is not int or value < (0 if zero else 1) or value >= 1_000_000_000:
        fail('Cantidad fuera de rango')
    if unit in DISCRETE and value % 1000:
        fail('La unidad seleccionada no admite fracciones')
    return value


def line_total(qty, cents):
    result = (qty * cents + 500) // 1000
    if result > MAX_CENTS:
        fail('Importe fuera de rango')
    return result


class CommerceService:
    def __init__(self, db, context, business_id):
        self.db, self.context, self.business_id = db, context, business_id
        self.business = None
        self.member = None

    def authorize(self, managers=False, administrators=False, write=False):
        query = select(Business).where(Business.id == self.business_id)
        self.business = self.db.scalar(query.with_for_update() if write else query.with_for_update(read=True))
        member_query = select(Membership).where(
            Membership.business_id == self.business_id,
            Membership.user_id == self.context.user.id, Membership.status == 'ACTIVA',
        ).execution_options(populate_existing=True)
        self.member = self.db.scalar(member_query.with_for_update() if write else member_query.with_for_update(read=True))
        if self.business is None or self.member is None:
            fail('Empresa no disponible', 404)
        user_query = select(User).where(User.id == self.context.user.id).execution_options(populate_existing=True)
        session_query = select(AuthSession).where(AuthSession.id == self.context.auth_session.id).execution_options(populate_existing=True)
        user = self.db.scalar(user_query.with_for_update() if write else user_query)
        session = self.db.scalar(session_query.with_for_update() if write else session_query)
        if user is None or session is None or user.status != 'ACTIVO' or session.revoked_at or session.expires_at <= now_utc():
            fail('Credenciales invalidas o sesion vencida', 401)
        allowed = ADMINISTRATORS if administrators else MANAGERS if managers else MANAGERS | {'TRABAJADOR'}
        if self.member.role not in allowed:
            fail('Tu membresía no permite esta operación', 403)
        if self.business.status != 'ACTIVA':
            fail('La empresa no permite operaciones en su estado actual', 409)
        if administrators and not has_business_permission(role=self.member.role,
                membership_status=self.member.status, business_status=self.business.status,
                permission=BusinessPermission.EDIT_PROFILE):
            fail('Tu membresía no permite editar esta empresa', 403)

    def get(self, model, identifier, active=True):
        row = self.db.scalar(select(model).where(model.id == identifier, model.business_id == self.business_id))
        if row is None:
            fail('Recurso no disponible en esta empresa', 404)
        if active and getattr(row, 'status', 'ACTIVO') not in {'ACTIVO', 'ACTIVA', 'ABIERTA'}:
            fail('El recurso está inactivo', 409)
        return row

    def run(self, operation, key, payload, handler, managers=False, administrators=False):
        try:
            self.authorize(managers, administrators, write=True)
            digest = hashlib.sha256(json.dumps(payload.model_dump(mode='json'),
                sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
            previous = self.db.get(CommandReceipt, (self.business_id, self.context.user.id, key))
            if previous:
                if previous.operation != operation or previous.digest != digest:
                    fail('La clave ya fue usada con otra operación o contenido', 409)
                result = previous.result
                self.db.rollback()
                return result, False
            result = handler(payload)
            self.db.flush()
            self.db.add(CommandReceipt(business_id=self.business_id, actor_id=self.context.user.id,
                key=key, operation=operation, digest=digest, result=result))
            self.db.commit()
            return result, True
        except IntegrityError:
            self.db.rollback()
            fail('Registro duplicado o referencia incompatible en esta empresa', 409)
        except Exception:
            self.db.rollback()
            raise

    def add(self, model, **fields):
        row = model(id=uuid4(), business_id=self.business_id, **fields)
        self.db.add(row)
        self.db.flush()
        return row

    def location(self, identifier, capability=None):
        row = self.get(Location, identifier)
        if capability and not getattr(row, capability):
            fail('La ubicación no tiene habilitada esta operación', 409)
        return row

    def item(self, identifier, physical=False, sellable=False):
        row = self.get(CatalogItem, identifier)
        if physical and row.kind == 'SERVICIO':
            fail('Un servicio no genera stock')
        if sellable and not row.sellable:
            fail('El artículo no está disponible para vender', 409)
        return row

    def balance(self, location_id, item_id):
        return self.db.get(StockBalance, (self.business_id, location_id, item_id))

    def move(self, item, location_id, delta, operation_id, kind, reason, reference=''):
        balance = self.balance(location_id, item.id)
        current = balance.quantity_milli if balance else 0
        if current + delta < 0:
            fail('Stock insuficiente: no se permite existencia negativa', 409)
        quantity(current + delta, item.unit, zero=True)
        if balance is None:
            balance = StockBalance(business_id=self.business_id, location_id=location_id,
                item_id=item.id, quantity_milli=current + delta, version=1)
            self.db.add(balance)
        else:
            balance.quantity_milli += delta
            balance.version += 1
        return self.add(StockMovement, location_id=location_id, item_id=item.id,
            operation_id=operation_id, delta_milli=delta, kind=kind,
            item_name=item.name, unit=item.unit, reason=reason, reference=reference)

    def open_cash(self, location_id):
        if location_id:
            self.location(location_id, 'can_sell')
        session = self.db.scalar(select(CashSession).where(
            CashSession.business_id == self.business_id, CashSession.location_id == location_id,
            CashSession.status == 'ABIERTA'))
        if session is None:
            fail('Abrí una jornada de caja para este destino antes de operar', 409)
        return session

    def cash_totals(self, session):
        sales = list(self.db.scalars(select(Sale).where(Sale.business_id == self.business_id,
            Sale.cash_session_id == session.id).order_by(Sale.created_at, Sale.id)))
        expenses = list(self.db.scalars(select(Expense).where(Expense.business_id == self.business_id,
            Expense.cash_session_id == session.id).order_by(Expense.created_at, Expense.id)))
        income = sum(p['amountCents'] for s in sales for p in s.payments if p['method'] == 'EFECTIVO')
        outgoing = sum(e.amount_cents for e in expenses if e.payment_method == 'EFECTIVO')
        return dict(openingCashCents=session.opening_cents, cashSalesCents=income,
            cashExpensesCents=outgoing, expectedCashCents=session.opening_cents + income - outgoing,
            saleIds=[str(s.id) for s in sales if any(p['method'] == 'EFECTIVO' for p in s.payments)],
            expenseIds=[str(e.id) for e in expenses if e.payment_method == 'EFECTIVO'])

    def save_location(self, data, identifier=None):
        row = self.get(Location, identifier, active=False) if identifier else self.add(Location,
            name=data.name, name_key=name_key(data.name), kind=data.kind, can_sell=data.canSell, can_store=data.canStore)
        if identifier and (row.can_store and not data.canStore or row.can_sell and not data.canSell):
            if self.db.scalar(select(StockBalance).where(StockBalance.business_id == self.business_id,
                    StockBalance.location_id == row.id, StockBalance.quantity_milli > 0)) or self.db.scalar(select(CashSession).where(
                    CashSession.business_id == self.business_id, CashSession.location_id == row.id, CashSession.status == 'ABIERTA')):
                fail('La ubicación conserva stock o una caja abierta', 409)
        for attr, value in dict(name=data.name, name_key=name_key(data.name), kind=data.kind,
                address=data.address, map_url=data.mapUrl, can_sell=data.canSell, can_store=data.canStore).items():
            setattr(row, attr, value)
        self.db.flush()
        return {'id': str(row.id)}

    def save_catalog(self, data, identifier=None):
        row = self.get(CatalogItem, identifier, active=False) if identifier else None
        if row and (row.kind != data.kind or row.unit != data.unit):
            fail('El tipo y la unidad de un artículo existente son inmutables', 409)
        values = dict(name=data.name, name_key=name_key(data.name), category=data.category,
            kind=data.kind, unit=data.unit, sku=data.sku, sellable=data.sellable,
            price_cents=data.priceCents, reference_cost_cents=data.referenceCostCents,
            description=data.description, observations=data.observations)
        if row is None:
            row = self.add(CatalogItem, **values)
        else:
            for attr, value in values.items():
                setattr(row, attr, value)
        self.db.flush()
        return {'id': str(row.id)}

    def save_supplier(self, data, identifier=None):
        row = self.get(Supplier, identifier, active=False) if identifier else self.add(Supplier,
            name=data.name, name_key=name_key(data.name), details=data.model_dump(mode='json'))
        row.name, row.name_key, row.details = data.name, name_key(data.name), data.model_dump(mode='json')
        self.db.flush()
        return {'id': str(row.id)}

    def save_account(self, data, identifier=None):
        for other in self.db.scalars(select(FinancialAccount).where(FinancialAccount.business_id == self.business_id)):
            if other.id != identifier and ((data.alias and other.details.get('alias') == data.alias)
                    or (data.identifier and other.details.get('identifier') == data.identifier)):
                fail('La cuenta ya está registrada en esta empresa', 409)
        row = self.get(FinancialAccount, identifier, active=False) if identifier else self.add(FinancialAccount,
            details=data.model_dump(mode='json'))
        row.details = data.model_dump(mode='json')
        return {'id': str(row.id)}

    def set_status(self, model, identifier, data):
        row = self.get(model, identifier, active=False)
        choices = {'ACTIVA','PAUSADA'} if model is Location else {'ACTIVA','INACTIVA'} if model is FinancialAccount else {'ACTIVO','INACTIVO'}
        if data.status not in choices:
            fail('Estado inválido para este recurso')
        if model is Location and data.status == 'PAUSADA':
            if self.db.scalar(select(StockBalance).where(StockBalance.business_id == self.business_id,
                    StockBalance.location_id == identifier, StockBalance.quantity_milli > 0)) or self.db.scalar(select(CashSession).where(
                    CashSession.business_id == self.business_id, CashSession.location_id == identifier, CashSession.status == 'ABIERTA')):
                fail('La ubicación conserva stock o una caja abierta', 409)
        row.status = data.status
        if hasattr(row, 'is_primary') and data.status not in {'ACTIVO','ACTIVA'}:
            row.is_primary = False
        return {'id': str(row.id)}

    def set_primary(self, model, identifier):
        row = self.get(model, identifier)
        for entry in self.db.scalars(select(model).where(model.business_id == self.business_id)):
            entry.is_primary = entry.id == row.id
        return {'id': str(row.id)}

    def create_purchase(self, data):
        supplier = self.get(Supplier, data.supplierId) if data.supplierId else None
        lines, total = [], 0
        for raw in data.lines:
            item = self.item(raw.catalogItemId) if raw.catalogItemId else None
            if item is None and raw.unit != 'CONCEPTO' or item and raw.unit != item.unit:
                fail('La unidad debe coincidir con el catálogo; concepto libre usa CONCEPTO')
            quantity(raw.quantityMilli, raw.unit)
            amount = line_total(raw.quantityMilli, raw.unitCostCents)
            lines.append(dict(id=str(uuid4()), catalogItemId=str(item.id) if item else None,
                description=item.name if item else raw.description, unit=raw.unit,
                quantityMilli=raw.quantityMilli, unitCostCents=raw.unitCostCents,
                kind='CONCEPTO' if item is None else 'SERVICIO' if item.kind == 'SERVICIO' else 'BIEN',
                sku=item.sku if item else '', totalCents=amount))
            total += amount
        if total > MAX_CENTS:
            fail('Total de compra fuera de rango')
        row = self.add(Purchase, supplier_id=supplier.id if supplier else None,
            supplier_name=supplier.name if supplier else '', purchased_on=data.purchasedOn,
            reference=data.reference, notes=data.notes, lines=lines, total_cents=total)
        return {'id': str(row.id)}

    def receive_purchase(self, identifier, data):
        row = self.get(Purchase, identifier)
        if row.receipt:
            if row.location_id != data.locationId:
                fail('La compra ya fue recibida en otra ubicación', 409)
            return {'id': str(row.id)}
        self.location(data.locationId, 'can_store')
        physical = [line for line in row.lines if line['kind'] == 'BIEN']
        if not physical:
            fail('La compra no tiene bienes físicos para recibir')
        receipt_id = uuid4()
        movements = []
        for line in physical:
            item = self.item(UUID(line['catalogItemId']), physical=True)
            movement = self.move(item, data.locationId, line['quantityMilli'], receipt_id,
                'RECEPCION_COMPRA', 'Recepción de compra', row.reference)
            movements.append(dict(id=str(movement.id), purchaseLineId=line['id'],
                catalogItemId=str(item.id), unit=item.unit, quantityMilli=line['quantityMilli']))
        row.location_id = data.locationId
        row.receipt = dict(id=str(receipt_id), locationId=str(data.locationId), createdAt=stamp(now_utc()), movements=movements)
        return {'id': str(row.id)}

    def count(self, data):
        self.location(data.locationId, 'can_store')
        if len({line.catalogItemId for line in data.lines}) != len(data.lines):
            fail('Un artículo sólo puede aparecer una vez por conteo')
        operation = self.add(InventoryOperation, kind='BATCH_COUNT', snapshot={})
        lines = []
        for raw in data.lines:
            item = self.item(raw.catalogItemId, physical=True)
            quantity(raw.countedMilli, item.unit, zero=True)
            balance = self.balance(data.locationId, item.id)
            current, version = (balance.quantity_milli, balance.version) if balance else (0, 0)
            if current != raw.expectedMilli or version != raw.expectedVersion:
                fail('El stock cambió desde la lectura. Actualizá el conteo', 409)
            delta = raw.countedMilli - current
            self.move(item, data.locationId, delta, operation.id, 'AJUSTE_CONTEO', data.reason)
            lines.append(dict(catalogItemId=str(item.id), itemNameSnapshot=item.name, unit=item.unit,
                expectedMilli=current, countedMilli=raw.countedMilli, deltaMilli=delta))
        operation.snapshot = dict(locationId=str(data.locationId), reason=data.reason, lines=lines)
        return {'id': str(operation.id)}

    def transfer(self, data):
        if data.sourceLocationId == data.destinationLocationId:
            fail('Origen y destino deben ser diferentes')
        self.location(data.sourceLocationId, 'can_store')
        self.location(data.destinationLocationId, 'can_store')
        item = self.item(data.catalogItemId, physical=True)
        quantity(data.quantityMilli, item.unit)
        operation = self.add(InventoryOperation, kind='TRANSFER', snapshot={})
        self.move(item, data.sourceLocationId, -data.quantityMilli, operation.id, 'TRASLADO_SALIDA', data.reason)
        self.move(item, data.destinationLocationId, data.quantityMilli, operation.id, 'TRASLADO_ENTRADA', data.reason)
        operation.snapshot = dict(catalogItemId=str(item.id), itemNameSnapshot=item.name, unit=item.unit,
            sourceLocationId=str(data.sourceLocationId), destinationLocationId=str(data.destinationLocationId),
            quantityMilli=data.quantityMilli, reason=data.reason)
        return {'id': str(operation.id)}

    def payment(self, method, identifier):
        if not identifier:
            return None
        if method in {'EFECTIVO','TARJETA'}:
            fail('Este medio no usa cuenta financiera')
        account = self.get(FinancialAccount, identifier)
        if method != 'TRANSFERENCIA' and (account.details['kind'] != 'BILLETERA' or account.details['channel'] != method):
            fail('La cuenta no corresponde al medio declarado')
        return account.details['label']

    def create_sale(self, data):
        cash = self.open_cash(data.locationId)
        lines, subtotal = [], 0
        items = []
        for raw in data.lines:
            item = self.item(raw.catalogItemId, sellable=True)
            quantity(raw.quantityMilli, item.unit)
            if item.kind != 'SERVICIO':
                if not data.locationId:
                    fail('Un bien físico requiere ubicación de venta')
                self.location(data.locationId, 'can_store')
            amount = line_total(raw.quantityMilli, raw.unitPriceCents)
            lines.append(dict(id=str(uuid4()), catalogItemId=str(item.id), quantityMilli=raw.quantityMilli,
                unitPriceCents=raw.unitPriceCents, name=item.name, sku=item.sku, unit=item.unit,
                kind='SERVICIO' if item.kind == 'SERVICIO' else 'BIEN', lineTotalCents=amount))
            items.append((item, raw.quantityMilli))
            subtotal += amount
        total = subtotal - data.discountCents
        if total <= 0 or subtotal > MAX_CENTS or sum(p.amountCents for p in data.payments) != total:
            fail('Los pagos deben sumar exactamente el total positivo de la venta')
        payments = []
        for payment in data.payments:
            payments.append(dict(method=payment.method, amountCents=payment.amountCents,
                financialAccountId=str(payment.financialAccountId) if payment.financialAccountId else None,
                financialAccountLabelSnapshot=self.payment(payment.method, payment.financialAccountId)))
        row = self.add(Sale, location_id=data.locationId, cash_session_id=cash.id, lines=lines,
            payments=payments, subtotal_cents=subtotal, discount_cents=data.discountCents,
            total_cents=total, notes=data.notes)
        for item, qty in items:
            if item.kind != 'SERVICIO':
                self.move(item, data.locationId, -qty, row.id, 'VENTA_SALIDA', 'Venta registrada')
        return {'id': str(row.id)}

    def create_expense(self, data):
        cash = self.open_cash(data.locationId)
        details = data.model_dump(mode='json')
        details['financialAccountLabelSnapshot'] = self.payment(data.paymentMethod, data.financialAccountId)
        row = self.add(Expense, location_id=data.locationId, cash_session_id=cash.id,
            paid_on=data.paidOn, category=data.category, description=data.description,
            amount_cents=data.amountCents, payment_method=data.paymentMethod, details=details)
        return {'id': str(row.id)}

    def create_cash(self, data):
        if data.locationId:
            self.location(data.locationId, 'can_sell')
        if self.db.scalar(select(CashSession).where(CashSession.business_id == self.business_id,
                CashSession.location_id == data.locationId, CashSession.status == 'ABIERTA')):
            fail('Ya hay una caja abierta para este destino', 409)
        row = self.add(CashSession, location_id=data.locationId, opening_cents=data.openingCashCents,
            opened_by=self.context.user.display_name)
        return {'id': str(row.id)}

    def close_cash(self, identifier, data):
        row = self.get(CashSession, identifier, active=False)
        if row.status != 'ABIERTA':
            fail('La caja ya está cerrada', 409)
        totals = self.cash_totals(row)
        difference = data.countedCashCents - totals['expectedCashCents']
        if difference and len(data.notes.strip()) < 5:
            fail('Explicá la diferencia entre el efectivo esperado y el contado')
        row.close_snapshot = dict(**totals, countedCashCents=data.countedCashCents,
            differenceCents=difference, closedBy=self.context.user.display_name,
            closedAt=stamp(now_utc()), notes=data.notes)
        row.status = 'CERRADA'
        return {'id': str(row.id)}

    def update_business(self, data):
        settings = self.db.get(BusinessSettings, self.business_id)
        if settings is None:
            settings = BusinessSettings(business_id=self.business_id)
            self.db.add(settings)
        for field in data.model_fields_set:
            value = getattr(data, field)
            if value is None:
                fail('El campo no admite null')
            target = self.business if field in {'name','category'} else settings
            setattr(target, 'tax_id' if field == 'taxId' else field, value)
        return {'id': str(self.business_id)}
