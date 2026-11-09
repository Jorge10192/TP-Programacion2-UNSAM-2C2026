"""E2-5 C / CU-11: ajuste físico y stock inicial auditable e idempotente.

Candados: usuario/sesión -> empresa/membresía -> ubicación -> catálogo -> saldo.
Todos los comandos de stock existentes toman el lock de ubicación; por eso
una versión observada no puede ser sobrescrita por recepción/traslado concurrente.
Una transacción persiste operación, movimiento firmado y proyección de saldo.
"""
from dataclasses import dataclass
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.exc import DataError, IntegrityError
from sqlalchemy.orm import Session

from app.infrastructure.models import (
    CatalogItem, InventoryOperation, Location, LocationAssignment,
    StockBalance, StockMovement,
)
from app.infrastructure.models.stock_balance import MAX_BALANCE_MILLI
from app.modules.businesses.repository import BusinessRepository
from app.modules.locations.permissions import can_operate_at_location
from app.modules.purchases.adjustment_schemas import AdjustStockRequest, StockAdjustmentView
from app.modules.purchases.service import PurchaseBusinessUnavailable, PurchaseService


class AdjustmentNotFound(Exception):
    pass


class AdjustmentPermissionDenied(Exception):
    pass


class AdjustmentCompanySuspended(Exception):
    pass


class AdjustmentLocationUnavailable(Exception):
    pass


class AdjustmentLocationIncompatible(Exception):
    pass


class AdjustmentItemUnavailable(Exception):
    pass


class AdjustmentInvalidQuantity(Exception):
    pass


class AdjustmentVersionConflict(Exception):
    pass


class AdjustmentInsufficientStock(Exception):
    pass


class AdjustmentInitialConflict(Exception):
    pass


class AdjustmentBalanceOverflow(Exception):
    pass


class AdjustmentIdempotencyConflict(Exception):
    pass


@dataclass(frozen=True)
class AdjustmentResult:
    body: StockAdjustmentView
    replayed: bool


class AdjustmentService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.purchase_auth = PurchaseService(db)
        self.businesses = BusinessRepository(db)

    def _authorize(self, actor_id: UUID, session_id: UUID, business_id: UUID):
        self.purchase_auth._authorize(actor_id, session_id, business_id, writing=False)
        pair = self.businesses.own_business(actor_id, business_id)
        if pair is None:
            raise PurchaseBusinessUnavailable()
        return pair

    def _by_request(self, business_id: UUID, key: UUID) -> InventoryOperation | None:
        return self.db.scalar(select(InventoryOperation).where(
            InventoryOperation.business_id == business_id,
            InventoryOperation.request_id == key,
        ))

    def _view(self, record: InventoryOperation) -> StockAdjustmentView:
        moves = list(self.db.scalars(select(StockMovement).where(
            StockMovement.business_id == record.business_id,
            StockMovement.inventory_operation_id == record.id,
        ).order_by(StockMovement.occurred_at, StockMovement.id)).all())
        return StockAdjustmentView.from_records(record, moves)

    def _replay(
        self, business_id: UUID, actor_id: UUID, key: UUID,
        kind: str, digest: str,
    ) -> StockAdjustmentView | None:
        recorded = self._by_request(business_id, key)
        if recorded is None:
            return None
        if (recorded.kind != kind or recorded.actor_id != actor_id
                or recorded.request_sha256 != digest):
            raise AdjustmentIdempotencyConflict()
        return self._view(recorded)

    def adjust(
        self, actor_id: UUID, session_id: UUID, business_id: UUID,
        key: UUID, command: AdjustStockRequest,
    ) -> AdjustmentResult:
        digest = command.payload_digest()
        try:
            business, member = self._authorize(actor_id, session_id, business_id)
            previous = self._replay(
                business_id, actor_id, key, command.kind, digest,
            )
            if previous is not None:
                self.db.rollback()
                return AdjustmentResult(previous, replayed=True)
            if business.status != "ACTIVA":
                raise AdjustmentCompanySuspended()

            # STOCK_INICIAL es más sensible que un ajuste: solo titular/admin.
            # Los TRABAJADOR no realizan operaciones de creación/destrucción de stock.
            if command.kind == "STOCK_INICIAL":
                allowed_roles = ("TITULAR_ADMINISTRATIVO", "ADMINISTRADOR")
            else:
                allowed_roles = ("TITULAR_ADMINISTRATIVO", "ADMINISTRADOR", "ENCARGADO")
            if member.role not in allowed_roles:
                raise AdjustmentPermissionDenied()

            location = self.db.scalar(select(Location).where(
                Location.business_id == business_id,
                Location.id == command.location_id,
            ).with_for_update().execution_options(populate_existing=True))
            if location is None:
                raise AdjustmentLocationUnavailable()
            if location.status != "ACTIVA" or not location.can_store:
                raise AdjustmentLocationIncompatible()
            assignment = self.db.scalar(select(LocationAssignment).where(
                LocationAssignment.business_id == business_id,
                LocationAssignment.location_id == location.id,
                LocationAssignment.user_id == actor_id,
            ))
            if not can_operate_at_location(
                role=member.role, membership_status=member.status,
                business_status=business.status, location_status=location.status,
                can_sell=location.can_sell, can_store=location.can_store,
                assignment_status=assignment.status if assignment else None,
                operation="STORE",
            ):
                raise AdjustmentPermissionDenied()

            product = self.db.scalar(select(CatalogItem).where(
                CatalogItem.business_id == business_id,
                CatalogItem.id == command.catalog_item_id,
            ).with_for_update(read=True).execution_options(populate_existing=True))
            if product is None or product.status != "ACTIVO" or product.item_type != "BIEN":
                raise AdjustmentItemUnavailable()
            if (product.unit in ("UNIDAD", "PAQUETE", "CAJA")
                    and command.quantity_milli % 1000 != 0):
                raise AdjustmentInvalidQuantity()

            row = self.db.scalar(select(StockBalance).where(
                StockBalance.business_id == business_id,
                StockBalance.location_id == location.id,
                StockBalance.catalog_item_id == product.id,
            ).with_for_update().execution_options(populate_existing=True))
            amount = command.quantity_milli
            is_initial = command.kind == "STOCK_INICIAL"

            if is_initial:
                # Nunca inicializar sobre proyección histórica (ni con cantidad 0),
                # y nunca si el ledger muestra movimientos previos.
                historical = self.db.scalar(select(StockMovement.id).where(
                    StockMovement.business_id == business_id,
                    StockMovement.location_id == location.id,
                    StockMovement.catalog_item_id == product.id,
                ).limit(1))
                if row is not None or historical is not None:
                    raise AdjustmentInitialConflict()
                if command.expected_version != 0:
                    raise AdjustmentVersionConflict()
            else:
                # Ajustar requiere saldo existente: primera carga debe ser
                # stock inicial autorizado o recepción de compra.
                if row is None:
                    raise AdjustmentVersionConflict()
                if row.version != command.expected_version:
                    raise AdjustmentVersionConflict()

            if is_initial:
                delta = amount
                self.db.add(StockBalance(
                    business_id=business_id, location_id=location.id,
                    catalog_item_id=product.id, quantity_milli=amount, version=1,
                ))
            else:
                if command.kind == "AJUSTE_SALIDA":
                    if row.quantity_milli < amount:
                        raise AdjustmentInsufficientStock()
                    delta = -amount
                else:
                    delta = amount
                    if row.quantity_milli + amount > MAX_BALANCE_MILLI:
                        raise AdjustmentBalanceOverflow()
                row.quantity_milli += delta
                row.version += 1

            operation = InventoryOperation(
                id=uuid4(), business_id=business_id, request_id=key,
                request_sha256=digest, kind=command.kind,
                catalog_item_id=product.id, unit_snapshot=product.unit,
                quantity_milli=amount,
                source_location_id=location.id if command.kind == "AJUSTE_SALIDA" else None,
                destination_location_id=location.id if command.kind != "AJUSTE_SALIDA" else None,
                reason=command.reason, actor_id=actor_id,
            )
            self.db.add(operation)
            self.db.flush()
            movement = StockMovement(
                id=uuid4(), business_id=business_id,
                location_id=location.id, catalog_item_id=product.id,
                receipt_id=None, purchase_line_id=None,
                inventory_operation_id=operation.id, operation_kind=command.kind,
                actor_id=actor_id, event_type=command.kind, delta_milli=delta,
            )
            self.db.add(movement)
            self.db.flush()
            view = StockAdjustmentView.from_records(operation, [movement])
            self.db.commit()
            return AdjustmentResult(view, replayed=False)
        except (IntegrityError, DataError) as exc:
            self.db.rollback()
            constraint = getattr(getattr(exc.orig, "diag", None), "constraint_name", None)
            sqlstate = getattr(exc.orig, "sqlstate", None)
            if constraint == "uq_inventory_operations_business_request":
                raise AdjustmentIdempotencyConflict() from exc
            if constraint in ("ck_stock_balances_quantity_nonnegative",
                              "ck_stock_balances_version") or sqlstate == "22003":
                raise AdjustmentBalanceOverflow() from exc
            raise
        except Exception:
            self.db.rollback()
            raise

    def get(
        self, actor_id: UUID, session_id: UUID, business_id: UUID, operation_id: UUID,
    ) -> StockAdjustmentView:
        try:
            self._authorize(actor_id, session_id, business_id)
            record = self.db.scalar(select(InventoryOperation).where(
                InventoryOperation.business_id == business_id,
                InventoryOperation.id == operation_id,
                InventoryOperation.kind.in_(
                    ("AJUSTE_ENTRADA", "AJUSTE_SALIDA", "STOCK_INICIAL")
                ),
            ))
            if record is None:
                raise AdjustmentNotFound()
            view = self._view(record)
            self.db.rollback()
            return view
        except Exception:
            self.db.rollback()
            raise
