"""Acceso a Recepción, movimientos y saldos; todas las consultas filtran business_id."""
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.models import PurchaseReceipt, StockBalance, StockMovement, PurchaseLine


class ReceiptRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def by_request(self, business_id: UUID, request_id: UUID) -> PurchaseReceipt | None:
        return self.db.scalar(select(PurchaseReceipt).where(
            PurchaseReceipt.business_id == business_id,
            PurchaseReceipt.request_id == request_id,
        ))

    def by_purchase(self, business_id: UUID, purchase_id: UUID) -> PurchaseReceipt | None:
        return self.db.scalar(select(PurchaseReceipt).where(
            PurchaseReceipt.business_id == business_id,
            PurchaseReceipt.purchase_id == purchase_id,
        ))

    def movements_for_receipt(self, business_id: UUID, receipt_id: UUID) -> list[StockMovement]:
        return list(self.db.scalars(
            select(StockMovement).join(
                PurchaseLine,
                (PurchaseLine.id == StockMovement.purchase_line_id)
                & (PurchaseLine.business_id == StockMovement.business_id),
            ).where(
                StockMovement.business_id == business_id,
                StockMovement.receipt_id == receipt_id,
            ).order_by(PurchaseLine.line_number),
        ).all())

    def list_balances(
        self, business_id: UUID, *, location_id: UUID | None,
        catalog_item_id: UUID | None, offset: int, limit: int,
    ) -> list[StockBalance]:
        query = select(StockBalance).where(StockBalance.business_id == business_id)
        if location_id is not None:
            query = query.where(StockBalance.location_id == location_id)
        if catalog_item_id is not None:
            query = query.where(StockBalance.catalog_item_id == catalog_item_id)
        return list(self.db.scalars(
            query.order_by(StockBalance.location_id, StockBalance.catalog_item_id)
            .offset(offset).limit(limit),
        ).all())

    def list_movements(
        self, business_id: UUID, *, location_id: UUID | None,
        catalog_item_id: UUID | None, offset: int, limit: int,
    ) -> list[StockMovement]:
        query = select(StockMovement).where(StockMovement.business_id == business_id)
        if location_id is not None:
            query = query.where(StockMovement.location_id == location_id)
        if catalog_item_id is not None:
            query = query.where(StockMovement.catalog_item_id == catalog_item_id)
        return list(self.db.scalars(
            query.order_by(StockMovement.occurred_at.desc(), StockMovement.id.desc())
            .offset(offset).limit(limit),
        ).all())
