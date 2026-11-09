"""CU-09 E2-5 B: trasladar inventario entre dos ubicaciones en un solo commit.

Orden de locks: usuario/sesion, empresa/membresia, ubicaciones en orden UUID,
articulo; saldo de origen mediante UPDATE condicional y saldo destino con UPSERT.
El saldo existente del autor no se borra ni se reinicializa.
"""
from dataclasses import dataclass
from uuid import UUID, uuid4

from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError, DataError
from sqlalchemy.orm import Session

from app.infrastructure.models import (
    CatalogItem, InventoryOperation, Location, LocationAssignment,
    StockBalance, StockMovement,
)
from app.modules.businesses.repository import BusinessRepository
from app.modules.locations.permissions import can_operate_at_location
from app.modules.purchases.service import PurchaseService
from app.modules.purchases.transfer_schemas import TransferStockRequest, StockTransferView


class TransferNotFound(Exception):
    pass


class TransferPermissionDenied(Exception):
    pass


class TransferCompanySuspended(Exception):
    pass


class TransferInvalidLocation(Exception):
    pass


class TransferLocationIncompatible(Exception):
    pass


class TransferInvalidItem(Exception):
    pass


class TransferInvalidQuantity(Exception):
    pass


class TransferInsufficientStock(Exception):
    pass


class TransferBalanceOverflow(Exception):
    pass


class TransferIdempotencyConflict(Exception):
    pass


@dataclass(frozen=True)
class TransferResult:
    body: StockTransferView
    replayed: bool


class TransferService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.purchase_auth = PurchaseService(db)
        self.businesses = BusinessRepository(db)

    def _authorize(self, actor_id: UUID, session_id: UUID, business_id: UUID):
        # El mismo candado transaccional que Compras/Recepciones: no confiar
        # exclusivamente en el bearer validado al inicio del request.
        self.purchase_auth._authorize(actor_id, session_id, business_id, writing=False)
        pair = self.businesses.own_business(actor_id, business_id)
        if pair is None:
            from app.modules.purchases.service import PurchaseBusinessUnavailable
            raise PurchaseBusinessUnavailable()
        return pair

    def _by_request(self, business_id: UUID, key: UUID) -> InventoryOperation | None:
        return self.db.scalar(select(InventoryOperation).where(
            InventoryOperation.business_id == business_id,
            InventoryOperation.request_id == key,
        ))

    def _movements(self, business_id: UUID, operation_id: UUID) -> list[StockMovement]:
        rows = list(self.db.scalars(select(StockMovement).where(
            StockMovement.business_id == business_id,
            StockMovement.inventory_operation_id == operation_id,
        ).order_by(StockMovement.event_type.desc())).all())
        # SALIDA primero, ENTRADA después (independiente del orden textual).
        return sorted(rows, key=lambda m: (m.event_type != "TRASLADO_SALIDA", str(m.id)))

    def _view(self, record: InventoryOperation) -> StockTransferView:
        return StockTransferView.from_records(
            record, self._movements(record.business_id, record.id),
        )

    def _replay(
        self, business_id: UUID, actor_id: UUID, key: UUID, digest: str,
    ) -> StockTransferView | None:
        record = self._by_request(business_id, key)
        if record is None:
            return None
        if (record.kind != "TRASLADO" or record.actor_id != actor_id
                or record.request_sha256 != digest):
            raise TransferIdempotencyConflict()
        return self._view(record)

    def transfer(
        self, actor_id: UUID, session_id: UUID, business_id: UUID,
        key: UUID, command: TransferStockRequest,
    ) -> TransferResult:
        digest = command.payload_digest()
        try:
            business, member = self._authorize(actor_id, session_id, business_id)
            previous = self._replay(business_id, actor_id, key, digest)
            if previous is not None:
                self.db.rollback()
                return TransferResult(previous, replayed=True)
            if business.status != "ACTIVA":
                raise TransferCompanySuspended()

            source_id = command.source_location_id
            target_id = command.destination_location_id
            locations = list(self.db.scalars(select(Location).where(
                Location.business_id == business_id,
                Location.id.in_([source_id, target_id]),
            ).order_by(Location.id)
                .with_for_update().execution_options(populate_existing=True)).all())
            if len(locations) != 2:
                raise TransferInvalidLocation()
            by_id = {loc.id: loc for loc in locations}
            for loc_id in (source_id, target_id):
                location = by_id[loc_id]
                if location.status != "ACTIVA" or not location.can_store:
                    raise TransferLocationIncompatible()
                assignment = self.db.scalar(select(LocationAssignment).where(
                    LocationAssignment.business_id == business_id,
                    LocationAssignment.location_id == loc_id,
                    LocationAssignment.user_id == actor_id,
                ))
                if not can_operate_at_location(
                    role=member.role, membership_status=member.status,
                    business_status=business.status, location_status=location.status,
                    can_sell=location.can_sell, can_store=location.can_store,
                    assignment_status=assignment.status if assignment else None,
                    operation="STORE",
                ):
                    raise TransferPermissionDenied()

            product = self.db.scalar(select(CatalogItem).where(
                CatalogItem.business_id == business_id,
                CatalogItem.id == command.catalog_item_id,
            ).with_for_update(read=True).execution_options(populate_existing=True))
            if product is None:
                raise TransferInvalidItem()
            if product.status != "ACTIVO" or product.item_type != "BIEN":
                raise TransferInvalidItem()
            if product.unit in ("UNIDAD", "PAQUETE", "CAJA") and command.quantity_milli % 1000:
                raise TransferInvalidQuantity()

            amount = command.quantity_milli
            # Nunca se permite saldo negativo; un saldo inexistente equivale a cero.
            debit = update(StockBalance).where(
                StockBalance.business_id == business_id,
                StockBalance.location_id == source_id,
                StockBalance.catalog_item_id == product.id,
                StockBalance.quantity_milli >= amount,
            ).values(
                quantity_milli=StockBalance.quantity_milli - amount,
                version=StockBalance.version + 1,
                updated_at=func.now(),
            ).returning(StockBalance.quantity_milli)
            if self.db.execute(debit).scalar_one_or_none() is None:
                raise TransferInsufficientStock()

            credit = pg_insert(StockBalance).values(
                business_id=business_id,
                location_id=target_id,
                catalog_item_id=product.id,
                quantity_milli=amount,
                version=1,
            )
            credit = credit.on_conflict_do_update(
                index_elements=[
                    StockBalance.business_id, StockBalance.location_id,
                    StockBalance.catalog_item_id,
                ],
                set_={
                    "quantity_milli": StockBalance.quantity_milli + credit.excluded.quantity_milli,
                    "version": StockBalance.version + 1,
                    "updated_at": func.now(),
                },
            )
            self.db.execute(credit)

            operation = InventoryOperation(
                id=uuid4(),
                business_id=business_id,
                request_id=key, request_sha256=digest,
                kind="TRASLADO",
                catalog_item_id=product.id,
                unit_snapshot=product.unit,
                quantity_milli=amount,
                source_location_id=source_id,
                destination_location_id=target_id,
                reason=command.reason,
                actor_id=actor_id,
            )
            self.db.add(operation)
            self.db.flush()
            movements = [
                StockMovement(
                    id=uuid4(), business_id=business_id,
                    location_id=source_id, catalog_item_id=product.id,
                    receipt_id=None, purchase_line_id=None,
                    inventory_operation_id=operation.id, operation_kind="TRASLADO",
                    actor_id=actor_id, event_type="TRASLADO_SALIDA",
                    delta_milli=-amount,
                ),
                StockMovement(
                    id=uuid4(), business_id=business_id,
                    location_id=target_id, catalog_item_id=product.id,
                    receipt_id=None, purchase_line_id=None,
                    inventory_operation_id=operation.id, operation_kind="TRASLADO",
                    actor_id=actor_id, event_type="TRASLADO_ENTRADA",
                    delta_milli=amount,
                ),
            ]
            self.db.add_all(movements)
            self.db.flush()
            result = StockTransferView.from_records(operation, movements)
            self.db.commit()
            return TransferResult(result, replayed=False)
        except (IntegrityError, DataError) as exc:
            self.db.rollback()
            constraint = getattr(getattr(exc.orig, "diag", None), "constraint_name", None)
            sqlstate = getattr(exc.orig, "sqlstate", None)
            if constraint == "uq_inventory_operations_business_request":
                raise TransferIdempotencyConflict() from exc
            if constraint in ("ck_stock_balances_quantity_nonnegative", "ck_stock_balances_version") or sqlstate == "22003":
                raise TransferBalanceOverflow() from exc
            raise
        except Exception:
            self.db.rollback()
            raise

    def get(
        self, actor_id: UUID, session_id: UUID,
        business_id: UUID, transfer_id: UUID,
    ) -> StockTransferView:
        try:
            self._authorize(actor_id, session_id, business_id)
            record = self.db.scalar(select(InventoryOperation).where(
                InventoryOperation.id == transfer_id,
                InventoryOperation.business_id == business_id,
                InventoryOperation.kind == "TRASLADO",
            ))
            if record is None:
                raise TransferNotFound()
            view = self._view(record)
            self.db.rollback()
            return view
        except Exception:
            self.db.rollback()
            raise
