"""Commands over the shared SQL resources; one transaction per operation."""
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
import hashlib
import json
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError

from src.auth.security import ahora
from src.compras.models import CategoriaInsumo, Compra, Insumo, Proveedor, UnidadMedida
from src.compras.schemas import CompraCreate, ItemCreate
from src.compras.services import crear_compra, confirmar_compra, habilitado
from src.inventario.models import Existencia
from src.inventario.services import mover_stock
from src.operacion.models import ConteoStock, Gasto, ItemConteoStock, ItemVenta, JornadaCaja, PagoVenta, Venta
from src.operacion.schemas import MAX_CENTS


def error(status, code, message):
    raise HTTPException(status, {'code': code, 'message': message})


def location(value):
    if value != 'principal':
        error(404, 'UBICACION_INEXISTENTE', 'La instalación sólo opera en la ubicación principal')


def obtain(db, model, identifier):
    row = db.get(model, identifier, populate_existing=True)
    if row is None:
        error(404, 'RECURSO_INEXISTENTE', 'Registro inexistente')
    return row


def fingerprint(data, actor_id, operation):
    def normalize(value):
        if isinstance(value, Decimal):
            return format(value.normalize(), 'f')
        if isinstance(value, (UUID, date)):
            return str(value)
        if isinstance(value, dict):
            return {key: normalize(item) for key, item in value.items() if key != 'request_id'}
        if isinstance(value, list):
            return [normalize(item) for item in value]
        return value
    body = {'operation': operation, 'actor': actor_id, 'payload': normalize(data.model_dump())}
    return hashlib.sha256(json.dumps(body, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def command(db, model, data, user_id, build):
    rid = str(data.request_id)
    digest = fingerprint(data, user_id, model.__tablename__)

    def prior():
        existing = db.query(model).filter_by(request_id=rid).populate_existing().first()
        if existing and existing.request_hash != digest:
            error(409, 'IDEMPOTENCIA_CONFLICTO', 'Solicitud reutilizada con otros datos o actor')
        return existing

    existing = prior()
    if existing:
        return existing, False
    try:
        result = build(rid, digest)
        db.flush()
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = prior()
        if existing:
            return existing, False
        error(409, 'CONFLICTO', 'Registro duplicado, jornada ya abierta o datos incompatibles')
    except HTTPException as exc:
        db.rollback()
        if exc.status_code == 409:
            existing = prior()
            if existing:
                return existing, False
        raise
    except Exception:
        db.rollback()
        raise
    db.expire_all()
    return result, True


def micros(quantity):
    value = quantity * 1_000_000
    if value != value.to_integral_value() or value < 0 or value >= 10**18:
        error(422, 'CANTIDAD_INVALIDA', 'Cantidad fuera de rango o de precisión')
    return int(value)


def line_total(quantity, unit_cents):
    value = int((quantity * unit_cents).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
    if value < 0 or value > MAX_CENTS:
        error(422, 'IMPORTE_FUERA_RANGO', 'El importe de línea supera el límite admitido')
    return value


def physical_item(db, identifier):
    item = habilitado(db, Insumo, identifier)
    unit = habilitado(db, UnidadMedida, item.unidad_stock_id)
    if unit.codigo_ui is None:
        error(422, 'UNIDAD_NO_CONFIGURADA', 'La unidad requiere configuración antes de operar online')
    return item, unit


def check_quantity(quantity, unit):
    value = micros(quantity)
    if unit.codigo_ui in {'UNIDAD', 'PAQUETE', 'CAJA'} and value % 1_000_000:
        error(422, 'CANTIDAD_DISCRETA', 'Esta unidad sólo admite cantidades enteras')
    return value


def create_provider(db, data, user_id):
    def build(rid, digest):
        row = Proveedor(nombre=data.nombre, observaciones=data.observaciones,
                        request_id=rid, request_hash=digest, fecha_creacion=ahora())
        db.add(row)
        return row
    return command(db, Proveedor, data, user_id, build)


def configure_unit(db, identifier, data):
    row = obtain(db, UnidadMedida, identifier)
    dimensions = {'UNIDAD': 'conteo', 'GRAMO': 'masa', 'KILOGRAMO': 'masa',
                  'MILILITRO': 'volumen', 'LITRO': 'volumen', 'PAQUETE': 'comercial', 'CAJA': 'comercial'}
    if not row.activo or row.dimension != dimensions[data.codigo_ui]:
        error(422, 'UNIDAD_INCOMPATIBLE', 'El código no corresponde a la dimensión de la unidad')
    if row.codigo_ui and row.codigo_ui != data.codigo_ui:
        error(409, 'UNIDAD_INMUTABLE', 'El código ya fue asignado y no puede cambiarse')
    row.codigo_ui = data.codigo_ui
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        error(409, 'CODIGO_OCUPADO', 'El código ya está asociado a otra unidad')
    return row


def create_catalog(db, data, user_id):
    def build(rid, digest):
        habilitado(db, CategoriaInsumo, data.categoria_id)
        unit = habilitado(db, UnidadMedida, data.unidad_stock_id)
        if not unit.codigo_ui:
            error(422, 'UNIDAD_NO_CONFIGURADA', 'Configurá la unidad antes de crear el artículo online')
        row = Insumo(**data.model_dump(exclude={'request_id'}), request_id=rid, request_hash=digest,
                     creada_en=ahora(), actualizada_en=ahora())
        db.add(row)
        db.flush()
        db.add(Existencia(insumo_id=row.id, cantidad_micro=0, version=0))
        return row
    return command(db, Insumo, data, user_id, build)


def create_purchase(db, data, user_id):
    def build(rid, digest):
        provider = habilitado(db, Proveedor, data.proveedor_id)
        if db.query(Compra.id).filter_by(usuario_id=user_id, referencia='online:' + rid).first():
            error(409, 'REFERENCIA_OCUPADA', 'La identidad de operación ya está ocupada')
        items = []
        sources = {}
        for raw in data.items:
            item, unit = physical_item(db, raw.insumo_id)
            if raw.unidad_compra_id != item.unidad_stock_id:
                error(422, 'CONVERSION_NO_OFRECIDA', 'La compra online usa la unidad del catálogo')
            check_quantity(raw.cantidad, unit)
            total = line_total(raw.cantidad, raw.costo_unitario_centavos)
            items.append(ItemCreate(insumo_id=item.id, cantidad=raw.cantidad,
                                    unidad_compra_id=unit.id, precio_total=Decimal(total) / 100))
            sources[item.id] = (raw, item)
        if sum(int(row.precio_total * 100) for row in items) > MAX_CENTS:
            error(422, 'IMPORTE_FUERA_RANGO', 'El total de compra supera el límite admitido')
        request = CompraCreate(referencia='online:' + rid, proveedor_id=provider.id, fecha=data.fecha,
                               observaciones=data.observaciones, items=items)
        row = crear_compra(db, request, user_id, commit=False)
        row.request_id, row.request_hash = rid, digest
        row.referencia_comercial = data.referencia_comercial
        row.nombre_proveedor_snapshot = provider.nombre
        for line in row.items:
            raw, item = sources[line.insumo_id]
            line.costo_unitario_centavos = raw.costo_unitario_centavos
            line.nombre_snapshot, line.sku_snapshot, line.tipo_snapshot = item.nombre, item.sku, 'BIEN'
        return row
    return command(db, Compra, data, user_id, build)


def receive_purchase(db, identifier, data, user_id):
    location(data.ubicacion_id)
    row = obtain(db, Compra, identifier)
    try:
        result = confirmar_compra(db, row, user_id, commit=False)
        db.commit()
        db.expire_all()
        return result
    except Exception:
        db.rollback()
        raise


def count_stock(db, data, user_id):
    location(data.ubicacion_id)
    def build(rid, digest):
        locked = {}
        # Lock every reviewed row, even a row whose delta will be zero.
        for raw in sorted(data.items, key=lambda row: row.insumo_id):
            item, unit = physical_item(db, raw.insumo_id)
            current = db.execute(update(Existencia).where(
                Existencia.insumo_id == item.id, Existencia.version == raw.expected_version
            ).values(version=Existencia.version), execution_options={'synchronize_session': False}).rowcount
            if current != 1:
                error(409, 'STOCK_DESACTUALIZADO', 'El stock cambió mientras revisabas el control')
            stock = obtain(db, Existencia, item.id)
            expected = check_quantity(raw.cantidad_esperada, unit)
            counted = check_quantity(raw.cantidad_contada, unit)
            if expected != stock.cantidad_micro:
                error(409, 'STOCK_DESACTUALIZADO', 'El saldo revisado ya no coincide con el servidor')
            locked[item.id] = (item, unit, stock.cantidad_micro, counted, stock.version)
        row = ConteoStock(request_id=rid, request_hash=digest, usuario_id=user_id,
                          motivo=data.motivo, creada_en=ahora())
        db.add(row)
        db.flush()
        for order, raw in enumerate(data.items):
            item, unit, before, counted, version = locked[raw.insumo_id]
            delta = counted - before
            movement = None
            if delta:
                movement = mover_stock(db, item.id, delta, user_id, 'CONTEO',
                                       f'conteo:{row.id}:{item.id}', data.motivo, fingerprint=digest,
                                       fecha_utc=row.creada_en)
                db.flush()
            row.items.append(ItemConteoStock(insumo_id=item.id, orden=order,
                cantidad_anterior_micro=before, cantidad_contada_micro=counted,
                version_anterior=version, version_resultante=version + bool(delta),
                nombre_snapshot=item.nombre, unidad_snapshot=unit.codigo_ui,
                movimiento_id=movement.id if movement else None))
        return row
    return command(db, ConteoStock, data, user_id, build)


def cash_totals(db, session):
    cash_sales = db.scalar(select(func.coalesce(func.sum(PagoVenta.importe_centavos), 0)).join(
        Venta, Venta.id == PagoVenta.venta_id).where(Venta.jornada_id == session.id, PagoVenta.medio == 'EFECTIVO'))
    cash_expenses = db.scalar(select(func.coalesce(func.sum(Gasto.importe_centavos), 0)).where(
        Gasto.jornada_id == session.id, Gasto.medio == 'EFECTIVO'))
    sale_ids = list(db.scalars(select(Venta.id).join(PagoVenta).where(
        Venta.jornada_id == session.id, PagoVenta.medio == 'EFECTIVO').distinct().order_by(Venta.id)))
    expense_ids = list(db.scalars(select(Gasto.id).where(
        Gasto.jornada_id == session.id, Gasto.medio == 'EFECTIVO').order_by(Gasto.id)))
    expected = session.fondo_centavos + cash_sales - cash_expenses
    if any(value < 0 or value > MAX_CENTS for value in (cash_sales, cash_expenses, expected)):
        error(409, 'CAJA_FUERA_RANGO', 'El efectivo esperado está fuera de rango; requiere revisión')
    return {'ventas_efectivo_centavos': cash_sales, 'gastos_efectivo_centavos': cash_expenses,
            'esperado_centavos': expected, 'venta_ids': sale_ids, 'gasto_ids': expense_ids}


def lock_open(db, identifier, expected_version=None):
    query = update(JornadaCaja).where(JornadaCaja.id == identifier, JornadaCaja.estado == 'ABIERTA')
    if expected_version is not None:
        query = query.where(JornadaCaja.version == expected_version)
    changed = db.execute(query.values(version=JornadaCaja.version + 1),
                         execution_options={'synchronize_session': False}).rowcount
    if changed != 1:
        obtain(db, JornadaCaja, identifier)
        error(409, 'JORNADA_NO_DISPONIBLE', 'La jornada está cerrada o cambió desde que la revisaste')
    return obtain(db, JornadaCaja, identifier)


def open_cash(db, data, user_id):
    location(data.ubicacion_id)
    def build(rid, digest):
        row = JornadaCaja(request_id=rid, request_hash=digest, fondo_centavos=data.fondo_centavos,
                          abierta_por_id=user_id, abierta_en=ahora(), estado='ABIERTA', abierta_guard=1, version=0)
        db.add(row)
        return row
    return command(db, JornadaCaja, data, user_id, build)


def create_sale(db, data, user_id):
    location(data.ubicacion_id)
    def build(rid, digest):
        session = lock_open(db, data.jornada_id)
        prepared = []
        subtotal = 0
        for raw in data.items:
            item, unit = physical_item(db, raw.insumo_id)
            if not item.vendible:
                error(422, 'NO_VENDIBLE', 'El artículo no está habilitado para vender')
            quantity = check_quantity(raw.cantidad, unit)
            total = line_total(raw.cantidad, raw.precio_unitario_centavos)
            subtotal += total
            prepared.append((raw, item, unit, quantity, total))
        if subtotal > MAX_CENTS or subtotal <= 0 or data.descuento_centavos >= subtotal:
            error(422, 'DESCUENTO_INVALIDO', 'El descuento debe ser menor al subtotal positivo')
        total = subtotal - data.descuento_centavos
        if sum(payment.importe_centavos for payment in data.pagos) != total:
            error(422, 'PAGOS_NO_CONCILIADOS', 'Los pagos declarados deben sumar exactamente el total')
        row = Venta(request_id=rid, request_hash=digest, jornada_id=session.id, usuario_id=user_id,
                    creada_en=ahora(), observaciones=data.observaciones, subtotal_centavos=subtotal,
                    descuento_centavos=data.descuento_centavos, total_centavos=total)
        db.add(row)
        for order, (raw, item, unit, quantity, amount) in enumerate(prepared):
            row.items.append(ItemVenta(orden=order, insumo_id=item.id, cantidad_micro=quantity,
                precio_unitario_centavos=raw.precio_unitario_centavos, total_centavos=amount,
                nombre_snapshot=item.nombre, sku_snapshot=item.sku, unidad_snapshot=unit.codigo_ui))
        for order, payment in enumerate(data.pagos):
            row.pagos.append(PagoVenta(orden=order, medio=payment.medio, importe_centavos=payment.importe_centavos))
        db.flush()
        for item in sorted(row.items, key=lambda line: line.insumo_id):
            mover_stock(db, item.insumo_id, -item.cantidad_micro, user_id, 'VENTA',
                        f'venta:{row.id}:{item.insumo_id}', 'Venta declarada', item_venta_id=item.id,
                        fecha_utc=row.creada_en)
        db.flush()
        cash_totals(db, session)
        return row
    return command(db, Venta, data, user_id, build)


def create_expense(db, data, user_id):
    location(data.ubicacion_id)
    def build(rid, digest):
        session = lock_open(db, data.jornada_id)
        if data.medio == 'EFECTIVO' and data.importe_centavos > cash_totals(db, session)['esperado_centavos']:
            error(409, 'EFECTIVO_INSUFICIENTE', 'El gasto supera el efectivo esperado de la jornada')
        row = Gasto(**data.model_dump(exclude={'request_id', 'ubicacion_id', 'cuenta_financiera_id'}),
                    request_id=rid, request_hash=digest, usuario_id=user_id, creada_en=ahora())
        db.add(row)
        return row
    return command(db, Gasto, data, user_id, build)


def close_cash(db, identifier, data, user_id):
    digest = fingerprint(data, user_id, f'cerrar:{identifier}')
    rid = str(data.request_id)
    session = obtain(db, JornadaCaja, identifier)
    if session.estado == 'CERRADA':
        if session.close_request_id == rid and session.close_request_hash == digest:
            return session
        error(409, 'CIERRE_INMUTABLE', 'Esta jornada ya está cerrada; su arqueo no se puede modificar')
    try:
        session = lock_open(db, identifier, data.expected_version)
        totals = cash_totals(db, session)
        difference = data.contado_centavos - totals['esperado_centavos']
        if difference and len(data.motivo) < 2:
            error(422, 'MOTIVO_REQUERIDO', 'Explicá la diferencia entre el efectivo esperado y el contado')
        session.estado, session.abierta_guard = 'CERRADA', None
        session.close_request_id, session.close_request_hash = rid, digest
        session.cerrada_por_id, session.cerrada_en, session.motivo = user_id, ahora(), data.motivo
        session.contado_centavos, session.diferencia_centavos = data.contado_centavos, difference
        session.esperado_centavos = totals['esperado_centavos']
        session.ventas_efectivo_centavos = totals['ventas_efectivo_centavos']
        session.gastos_efectivo_centavos = totals['gastos_efectivo_centavos']
        db.commit()
    except HTTPException as exc:
        db.rollback()
        current = obtain(db, JornadaCaja, identifier)
        if (exc.status_code == 409 and current.estado == 'CERRADA' and
                current.close_request_id == rid and current.close_request_hash == digest):
            return current
        raise
    except IntegrityError:
        db.rollback()
        error(409, 'IDEMPOTENCIA_CONFLICTO', 'La solicitud de cierre ya pertenece a otra jornada')
    except Exception:
        db.rollback()
        raise
    db.expire_all()
    return session
