"""E2-6 C: ventas fisicas y mixtas con comprobante, ledger y stock atomicos."""
from collections import defaultdict
from dataclasses import dataclass
from uuid import UUID, uuid4

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.infrastructure.models import (
    CatalogItem, Location, LocationAssignment, Sale, SaleLine, SalePayment,
    StockBalance, StockMovement,
)
from app.modules.locations.permissions import can_operate_at_location
from app.modules.purchases.schemas import line_total_cents
from app.modules.purchases.service import PurchaseService
from app.modules.sales.schemas import CreateSaleRequest, SaleSummaryView, SaleView


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


class SaleInsufficientStock(Exception):
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
            location = None
            assignment_status = None
            if command.location_id is not None:
                location = self.db.scalar(select(Location).where(
                    Location.business_id == business_id,
                    Location.id == command.location_id,
                ).with_for_update().execution_options(populate_existing=True))
                if location is None:
                    raise SaleLocationNotEnabled()
                assignment = self.db.scalar(select(LocationAssignment).where(
                    LocationAssignment.business_id == business_id,
                    LocationAssignment.location_id == location.id,
                    LocationAssignment.user_id == actor_id,
                ))
                assignment_status = assignment.status if assignment else None
                if not can_operate_at_location(
                    role=member.role, membership_status=member.status,
                    business_status=company.status, location_status=location.status,
                    can_sell=location.can_sell, can_store=location.can_store,
                    assignment_status=assignment_status, operation="SELL",
                ):
                    raise SalePermissionDenied()
            elif member.role not in ("TITULAR_ADMINISTRATIVO", "ADMINISTRADOR"):
                raise SalePermissionDenied()
            previous = self._replay(business_id, actor_id, key, digest)
            if previous is not None:
                self.db.rollback()
                return SaleCreated(previous, replayed=True)
            if company.status != "ACTIVA":
                raise SaleBusinessSuspended()

            ids = sorted({line.catalog_item_id for line in command.lines}, key=str)
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
                if item.status != "ACTIVO" or not item.sellable:
                    raise SaleInvalidReference()
                if item.unit in ("UNIDAD", "PAQUETE", "CAJA", "SERVICIO"):
                    if line.quantity_milli % 1000 != 0:
                        raise SaleInvalidReference()

            physical = [line for line in command.lines
                        if items[line.catalog_item_id].item_type == "BIEN"]
            if physical:
                if location is None or not location.can_store:
                    raise SaleLocationNotEnabled()
                if not can_operate_at_location(
                    role=member.role, membership_status=member.status,
                    business_status=company.status, location_status=location.status,
                    can_sell=location.can_sell, can_store=location.can_store,
                    assignment_status=assignment_status, operation="STORE",
                ):
                    raise SalePermissionDenied()
            required = defaultdict(int)
            for line in physical:
                required[line.catalog_item_id] += line.quantity_milli

            subtotal = sum(line_total_cents(line.quantity_milli, line.unit_price_cents)
                           for line in command.lines)
            row = Sale(
                id=uuid4(), business_id=business_id,
                location_id=location.id if location else None,
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
                    description_snapshot=item.name, kind_snapshot=item.item_type,
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
            snapshots = []
            for item_id in sorted(required, key=str):
                debit = update(StockBalance).where(
                    StockBalance.business_id == business_id,
                    StockBalance.location_id == location.id,
                    StockBalance.catalog_item_id == item_id,
                    StockBalance.quantity_milli >= required[item_id],
                ).values(
                    quantity_milli=StockBalance.quantity_milli - required[item_id],
                    version=StockBalance.version + 1,
                    updated_at=func.now(),
                ).returning(StockBalance.quantity_milli, StockBalance.version)
                balance = self.db.execute(debit).one_or_none()
                if balance is None:
                    raise SaleInsufficientStock()
                snapshots.append({
                    "catalog_item_id": str(item_id),
                    "quantity_milli": balance[0], "version": balance[1],
                })
            self.db.add_all([
                StockMovement(
                    id=uuid4(), business_id=business_id, location_id=location.id,
                    catalog_item_id=line.catalog_item_id, sale_id=row.id,
                    sale_line_id=saved.id, actor_id=actor_id,
                    event_type="VENTA_SALIDA", delta_milli=-line.quantity_milli,
                )
                for line, saved in zip(command.lines, lines)
                if items[line.catalog_item_id].item_type == "BIEN"
            ])
            row.balances_after = snapshots
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
                company, member = self._authorize(actor_id, session_id, business_id)
                if command.location_id is None:
                    if member.role not in ("TITULAR_ADMINISTRATIVO", "ADMINISTRADOR"):
                        raise SalePermissionDenied()
                else:
                    loc = self.db.scalar(select(Location).where(
                        Location.business_id == business_id,
                        Location.id == command.location_id,
                    ).with_for_update().execution_options(populate_existing=True))
                    assigned = self.db.scalar(select(LocationAssignment).where(
                        LocationAssignment.business_id == business_id,
                        LocationAssignment.location_id == command.location_id,
                        LocationAssignment.user_id == actor_id,
                    ))
                    if loc is None or not can_operate_at_location(
                        role=member.role, membership_status=member.status,
                        business_status=company.status, location_status=loc.status,
                        can_sell=loc.can_sell, can_store=loc.can_store,
                        assignment_status=assigned.status if assigned else None,
                        operation="SELL",
                    ):
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

    # T09-B: autorización de lectura histórica, diferente del derecho a vender.
    # El autor no conserva acceso si perdió su asignación a la sede.
    # Se restringe la consulta SQL ANTES de offset/limit para no filtrar en Python.
    def _read_query(self, business_id: UUID, actor_id: UUID, role: str):
        query = select(Sale).where(Sale.business_id == business_id)
        if role in ("TITULAR_ADMINISTRATIVO", "ADMINISTRADOR"):
            return query
        if role in ("ENCARGADO", "TRABAJADOR"):
            allowed_locations = select(LocationAssignment.location_id).where(
                LocationAssignment.business_id == business_id,
                LocationAssignment.user_id == actor_id,
                LocationAssignment.status == "ACTIVA",
            )
            # location_id NULL nunca aparece para roles operativos.
            return query.where(Sale.location_id.in_(allowed_locations))
        raise SalePermissionDenied()

    def list(self, actor_id: UUID, session_id: UUID, business_id: UUID,
             *, offset: int, limit: int,
             location_id: UUID | None = None) -> list[SaleSummaryView]:
        try:
            _, member = self._authorize(actor_id, session_id, business_id)
            query = self._read_query(business_id, actor_id, member.role)
            if location_id is not None:
                query = query.where(Sale.location_id == location_id)
            rows = self.db.scalars(
                query.order_by(Sale.created_at.desc(), Sale.id.desc())
                .offset(offset).limit(limit)
            ).all()
            result = [SaleSummaryView.from_record(row) for row in rows]
            self.db.rollback()
            return result
        except Exception:
            self.db.rollback()
            raise

    def by_request(self, actor_id: UUID, session_id: UUID,
                   business_id: UUID, request_id: UUID) -> SaleView:
        try:
            _, member = self._authorize(actor_id, session_id, business_id)
            row = self.db.scalar(
                self._read_query(business_id, actor_id, member.role).where(
                    Sale.request_id == request_id,
                )
            )
            if row is None:
                raise SaleNotFound()
            result = self._view(row)
            self.db.rollback()
            return result
        except Exception:
            self.db.rollback()
            raise

    def get(self, actor_id: UUID, session_id: UUID,
            business_id: UUID, sale_id: UUID) -> SaleView:
        try:
            _, member = self._authorize(actor_id, session_id, business_id)
            row = self.db.scalar(
                self._read_query(business_id, actor_id, member.role).where(
                    Sale.id == sale_id,
                )
            )
            if row is None:
                # Misma respuesta para venta inexistente, de otro tenant o no visible.
                raise SaleNotFound()
            body = self._view(row)
            self.db.rollback()
            return body
        except Exception:
            self.db.rollback()
            raise
