"""E2-6 B: venta exclusiva de servicios, atomicidad comercial e idempotencia.

Sin saldos, ubicaciones ni acreditación externa. E2-6 C habilitará bienes.
El candado de empresa serializa reintentos de una misma clave por tenant.
"""
from dataclasses import dataclass
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.infrastructure.models import CatalogItem, Sale, SaleLine, SalePayment
from app.modules.purchases.schemas import line_total_cents
from app.modules.purchases.service import PurchaseService
from app.modules.sales.schemas import CreateSaleRequest, SaleView


class SaleNotFound(Exception):
    pass


class SalePermissionDenied(Exception):
    pass


class SaleBusinessSuspended(Exception):
    pass


class SaleInvalidReference(Exception):
    pass


class SalePhysicalNotEnabled(Exception):
    pass


class SaleLocationNotEnabled(Exception):
    pass


class SaleIdempotencyConflict(Exception):
    pass


@dataclass(frozen=True)
class SaleCreated:
    body: SaleView
    replayed: bool


class SaleService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.purchase_auth = PurchaseService(db)

    def _authorize(self, actor_id: UUID, session_id: UUID, business_id: UUID):
        # Revalidar sesión y membresía con locks en la misma transacción.
        self.purchase_auth._authorize(actor_id, session_id, business_id, writing=False)
        pair = self.purchase_auth.businesses.own_business(actor_id, business_id)
        assert pair is not None  # _authorize ya exige membresía activa
        return pair

    def _view(self, row: Sale) -> SaleView:
        lines = list(self.db.scalars(select(SaleLine).where(
            SaleLine.business_id == row.business_id, SaleLine.sale_id == row.id,
        ).order_by(SaleLine.line_number)).all())
        payments = list(self.db.scalars(select(SalePayment).where(
            SalePayment.business_id == row.business_id, SalePayment.sale_id == row.id,
        ).order_by(SalePayment.payment_number)).all())
        return SaleView.from_records(row, lines, payments)

    def _by_key(self, business_id: UUID, key: UUID) -> Sale | None:
        return self.db.scalar(select(Sale).where(
            Sale.business_id == business_id, Sale.request_id == key,
        ))

    def _replay(self, business_id: UUID, actor_id: UUID,
                key: UUID, digest: str) -> SaleView | None:
        row = self._by_key(business_id, key)
        if row is None:
            return None
        if row.created_by_id != actor_id or row.request_sha256 != digest:
            raise SaleIdempotencyConflict()
        return self._view(row)

    def create(self, actor_id: UUID, session_id: UUID, business_id: UUID,
               key: UUID, command: CreateSaleRequest) -> SaleCreated:
        digest = command.payload_digest()
        try:
            company, member = self._authorize(actor_id, session_id, business_id)
            # Nunca permitir replay por un usuario cuyo rol perdió permiso de ventas.
            if member.role not in ("TITULAR_ADMINISTRATIVO", "ADMINISTRADOR"):
                raise SalePermissionDenied()
            previous = self._replay(business_id, actor_id, key, digest)
            if previous is not None:
                self.db.rollback()
                return SaleCreated(previous, replayed=True)
            if company.status != "ACTIVA":
                raise SaleBusinessSuspended()
            if command.location_id is not None:
                raise SaleLocationNotEnabled()

            ids = sorted({line.catalog_item_id for line in command.lines})
            records = self.db.scalars(select(CatalogItem).where(
                CatalogItem.business_id == business_id,
                CatalogItem.id.in_(ids),
            ).order_by(CatalogItem.id)
                .with_for_update(read=True).execution_options(populate_existing=True)).all()
            items = {record.id: record for record in records}
            if len(items) != len(ids):
                raise SaleInvalidReference()
            for line in command.lines:
                item = items[line.catalog_item_id]
                if item.item_type != "SERVICIO":
                    raise SalePhysicalNotEnabled()
                if item.status != "ACTIVO" or not item.sellable or item.unit != "SERVICIO":
                    raise SaleInvalidReference()
                if line.quantity_milli % 1000 != 0:
                    raise SaleInvalidReference()

            subtotal = sum(line_total_cents(line.quantity_milli, line.unit_price_cents)
                           for line in command.lines)
            row = Sale(
                id=uuid4(), business_id=business_id, location_id=None,
                request_id=key, request_sha256=digest, status="CONFIRMADA",
                subtotal_cents=subtotal, discount_cents=command.discount_cents,
                total_cents=subtotal - command.discount_cents, notes=command.notes,
                created_by_id=actor_id, balances_after=[],
            )
            self.db.add(row)
            self.db.flush()
            lines = []
            for number, line in enumerate(command.lines, 1):
                item = items[line.catalog_item_id]
                lines.append(SaleLine(
                    id=uuid4(), business_id=business_id, sale_id=row.id,
                    line_number=number, catalog_item_id=item.id,
                    description_snapshot=item.name, kind_snapshot="SERVICIO",
                    unit_snapshot=item.unit, sku_snapshot=item.sku or "",
                    quantity_milli=line.quantity_milli,
                    unit_price_cents=line.unit_price_cents,
                    line_total_cents=line_total_cents(
                        line.quantity_milli, line.unit_price_cents,
                    ),
                ))
            payments = [
                SalePayment(
                    id=uuid4(), business_id=business_id, sale_id=row.id,
                    payment_number=number, method=payment.method,
                    amount_cents=payment.amount_cents, reference=payment.reference,
                )
                for number, payment in enumerate(command.payments, 1)
            ]
            self.db.add_all([*lines, *payments])
            self.db.flush()
            body = SaleView.from_records(row, lines, payments)
            self.db.commit()
            return SaleCreated(body, replayed=False)
        except IntegrityError as error:
            self.db.rollback()
            constraint = getattr(getattr(error.orig, "diag", None), "constraint_name", None)
            if constraint != "uq_sales_business_request":
                raise
            # Defensa adicional ante reintentos concurrentes / unicidad de SQL.
            try:
                _, member = self._authorize(actor_id, session_id, business_id)
                if member.role not in ("TITULAR_ADMINISTRATIVO", "ADMINISTRADOR"):
                    raise SalePermissionDenied()
                existing = self._replay(business_id, actor_id, key, digest)
                if existing is None:
                    raise SaleIdempotencyConflict()
                self.db.rollback()
                return SaleCreated(existing, replayed=True)
            except Exception:
                self.db.rollback()
                raise
        except Exception:
            self.db.rollback()
            raise

    def get(self, actor_id: UUID, session_id: UUID,
            business_id: UUID, sale_id: UUID) -> SaleView:
        try:
            self._authorize(actor_id, session_id, business_id)
            row = self.db.scalar(select(Sale).where(
                Sale.business_id == business_id, Sale.id == sale_id,
            ))
            if row is None:
                raise SaleNotFound()
            body = self._view(row)
            self.db.rollback()
            return body
        except Exception:
            self.db.rollback()
            raise
