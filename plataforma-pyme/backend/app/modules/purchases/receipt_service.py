"""CU-07 E2-4 E: recibir toda la mercadería de una compra, una única vez.

Locks: usuario -> sesión -> empresa/membresía -> compra -> ubicación ->
catálogo (orden UUID). Para la primera entrada a un saldo inexistente se usa
INSERT ... ON CONFLICT DO UPDATE, no una lectura/inserción con race condition.
Recepción, ledger, saldos, estado e idempotencia: una sola transacción.
"""
from collections import defaultdict
from dataclasses import dataclass
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError, DataError
from sqlalchemy.orm import Session

from app.infrastructure.models import (
    CatalogItem, Location, LocationAssignment, Purchase, PurchaseReceipt,
    StockBalance, StockMovement,
)
from app.modules.businesses.repository import BusinessRepository
from app.modules.locations.permissions import can_operate_at_location
from app.modules.purchases.service import (
    PurchaseService, PurchaseSessionInvalid, PurchaseBusinessUnavailable,
    PurchasePermissionDenied,
)
from app.modules.purchases.repository import PurchaseRepository
from app.modules.purchases.receipt_repository import ReceiptRepository
from app.modules.purchases.receipt_schemas import (
    PurchaseReceiptView, ReceivePurchaseRequest, StockBalanceView, StockMovementView,
)


class ReceiptNotFound(Exception):
    """Compra o recepción inexistente para el tenant autenticado."""


class ReceiptLocationUnavailable(Exception):
    """Ubicación ausente o de otro tenant."""


class ReceiptBusinessSuspended(Exception):
    """El negocio suspendido no puede recibir nueva mercadería."""


class ReceiptLocationIncompatible(Exception):
    """Ubicación pausada o sin capacidad de almacén."""


class ReceiptPermissionDenied(Exception):
    """Rol sin asignación/capacidad de STORE sobre la ubicación."""


class ReceiptAlreadyProcessed(Exception):
    """Compra cerrada, cancelada o ya recibida con otra clave."""


class ReceiptIdempotencyConflict(Exception):
    """Clave usada con compra, cuerpo o actor diferente."""


class ReceiptCatalogIncompatible(Exception):
    """Ficha inactiva o cambió su unidad/tipo físico después de la compra."""


class ReceiptBalanceOverflow(Exception):
    """La proyección alcanzó el máximo de milésimas permitido."""


@dataclass(frozen=True)
class ReceiptResult:
    body: PurchaseReceiptView
    replayed: bool


class ReceiptService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.purchases = PurchaseRepository(db)
        self.receipts = ReceiptRepository(db)
        self.purchase_auth = PurchaseService(db)
        self.businesses = BusinessRepository(db)

    def _authorize(self, actor_id: UUID, session_id: UUID, business_id: UUID):
        # Revalida usuario, sesión y membresía bajo lock: la autenticación de
        # FastAPI puede haberse revocado antes de ejecutar el comando.
        self.purchase_auth._authorize(actor_id, session_id, business_id, writing=False)
        pair = self.businesses.own_business(actor_id, business_id)
        if pair is None:
            raise PurchaseBusinessUnavailable()
        return pair

    def _view(self, receipt: PurchaseReceipt) -> PurchaseReceiptView:
        return PurchaseReceiptView.from_records(
            receipt, self.receipts.movements_for_receipt(receipt.business_id, receipt.id),
        )

    def _replay(
        self, actor_id: UUID, business_id: UUID,
        purchase_id: UUID, key: UUID, digest: str,
    ) -> PurchaseReceiptView | None:
        recorded = self.receipts.by_request(business_id, key)
        if recorded is None:
            return None
        if (recorded.purchase_id != purchase_id
                or recorded.confirmed_by_id != actor_id
                or recorded.request_sha256 != digest):
            raise ReceiptIdempotencyConflict()
        return self._view(recorded)

    def receive(
        self, actor_id: UUID, session_id: UUID, business_id: UUID, purchase_id: UUID,
        key: UUID, command: ReceivePurchaseRequest,
    ) -> ReceiptResult:
        digest = command.digest_for(purchase_id)
        try:
            business, member = self._authorize(actor_id, session_id, business_id)

            # El replay previo es inmutable: no precisa que la ubicación siga
            # ACTIVA, ni que el stock posterior conserve la misma cantidad.
            prior = self._replay(actor_id, business_id, purchase_id, key, digest)
            if prior is not None:
                self.db.rollback()
                return ReceiptResult(body=prior, replayed=True)

            if business.status != "ACTIVA":
                raise ReceiptBusinessSuspended()

            purchase = self.db.scalar(
                select(Purchase).where(
                    Purchase.business_id == business_id, Purchase.id == purchase_id,
                ).with_for_update().execution_options(populate_existing=True)
            )
            if purchase is None:
                raise ReceiptNotFound()
            if purchase.status != "REGISTRADA" or self.receipts.by_purchase(business_id, purchase_id):
                raise ReceiptAlreadyProcessed()

            location = self.db.scalar(
                select(Location).where(
                    Location.business_id == business_id, Location.id == command.location_id,
                ).with_for_update().execution_options(populate_existing=True)
            )
            if location is None:
                raise ReceiptLocationUnavailable()
            if location.status != "ACTIVA" or not location.can_store:
                raise ReceiptLocationIncompatible()

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
                raise ReceiptPermissionDenied()

            lines = self.purchases.lines(business_id, purchase_id)
            physical = [line for line in lines if line.kind_snapshot == "BIEN"]
            if not physical:
                raise ReceiptAlreadyProcessed()

            ids = sorted({line.catalog_item_id for line in physical}, key=str)
            if any(item_id is None for item_id in ids):
                raise ReceiptCatalogIncompatible()
            current_items = list(self.db.scalars(
                select(CatalogItem).where(
                    CatalogItem.business_id == business_id,
                    CatalogItem.id.in_(ids),
                ).order_by(CatalogItem.id)
                .with_for_update(read=True).execution_options(populate_existing=True)
            ).all())
            by_id = {item.id: item for item in current_items}
            if len(by_id) != len(ids):
                raise ReceiptCatalogIncompatible()
            for line in physical:
                item = by_id[line.catalog_item_id]
                if item.status != "ACTIVO" or item.item_type != "BIEN" or item.unit != line.unit_snapshot:
                    raise ReceiptCatalogIncompatible()

            receipt = PurchaseReceipt(
                id=uuid4(), business_id=business_id,
                purchase_id=purchase.id, location_id=location.id,
                request_id=key, request_sha256=digest,
                confirmed_by_id=actor_id, balances_after=[],
            )
            self.db.add(receipt)
            self.db.flush()

            movements: list[StockMovement] = []
            summed: dict[UUID, int] = defaultdict(int)
            for line in physical:
                summed[line.catalog_item_id] += line.quantity_milli
                movement = StockMovement(
                    id=uuid4(), business_id=business_id, location_id=location.id,
                    catalog_item_id=line.catalog_item_id, receipt_id=receipt.id,
                    purchase_line_id=line.id, actor_id=actor_id,
                    event_type="COMPRA_RECEPCION", delta_milli=line.quantity_milli,
                )
                movements.append(movement)
            self.db.add_all(movements)
            self.db.flush()  # verifica FK y UNIQUE sin confirmar ninguna entrada

            snapshots = []
            for item_id in sorted(summed, key=str):
                # El servidor agrega por ARTÍCULO solo para actualizar el saldo;
                # los movimientos preservan cada línea física original.
                statement = pg_insert(StockBalance).values(
                    business_id=business_id, location_id=location.id,
                    catalog_item_id=item_id, quantity_milli=summed[item_id], version=1,
                )
                statement = statement.on_conflict_do_update(
                    index_elements=[
                        StockBalance.business_id, StockBalance.location_id,
                        StockBalance.catalog_item_id,
                    ],
                    set_={
                        "quantity_milli": StockBalance.quantity_milli + statement.excluded.quantity_milli,
                        "version": StockBalance.version + 1,
                        "updated_at": func.now(),
                    },
                ).returning(StockBalance.quantity_milli, StockBalance.version)
                qty, version = self.db.execute(statement).one()
                snapshots.append({
                    "catalog_item_id": str(item_id), "quantity_milli": qty,
                    "version": version,
                })

            receipt.balances_after = snapshots
            purchase.status = "RECIBIDA"
            self.db.flush()
            result = PurchaseReceiptView.from_records(receipt, movements)
            self.db.commit()
            return ReceiptResult(body=result, replayed=False)
        except (IntegrityError, DataError) as exc:
            self.db.rollback()
            sqlstate = getattr(exc.orig, "sqlstate", None)
            constraint = getattr(getattr(exc.orig, "diag", None), "constraint_name", None)
            if constraint in (
                "uq_purchase_receipts_business_purchase",
                "uq_purchase_receipts_business_request",
                "uq_stock_movements_receipt_line",
            ):
                raise ReceiptAlreadyProcessed() from exc
            if (constraint in ("ck_stock_balances_quantity_nonnegative",
                               "ck_stock_balances_version")
                    or sqlstate == "22003"):
                raise ReceiptBalanceOverflow() from exc
            raise
        except Exception:
            self.db.rollback()
            raise

    def get_receipt(
        self, actor_id: UUID, session_id: UUID,
        business_id: UUID, purchase_id: UUID,
    ) -> PurchaseReceiptView:
        try:
            self._authorize(actor_id, session_id, business_id)
            row = self.receipts.by_purchase(business_id, purchase_id)
            if row is None:
                raise ReceiptNotFound()
            view = self._view(row)
            self.db.rollback()
            return view
        except Exception:
            self.db.rollback()
            raise

    def list_balances(
        self, actor_id: UUID, session_id: UUID, business_id: UUID,
        *, location_id: UUID | None, catalog_item_id: UUID | None,
        offset: int, limit: int,
    ) -> list[StockBalanceView]:
        try:
            self._authorize(actor_id, session_id, business_id)
            result = [StockBalanceView.from_record(row) for row in self.receipts.list_balances(
                business_id, location_id=location_id, catalog_item_id=catalog_item_id,
                offset=offset, limit=limit,
            )]
            self.db.rollback()
            return result
        except Exception:
            self.db.rollback()
            raise

    def list_movements(
        self, actor_id: UUID, session_id: UUID, business_id: UUID,
        *, location_id: UUID | None, catalog_item_id: UUID | None,
        offset: int, limit: int,
    ) -> list[StockMovementView]:
        try:
            self._authorize(actor_id, session_id, business_id)
            result = [StockMovementView.from_record(row) for row in self.receipts.list_movements(
                business_id, location_id=location_id, catalog_item_id=catalog_item_id,
                offset=offset, limit=limit,
            )]
            self.db.rollback()
            return result
        except Exception:
            self.db.rollback()
            raise
