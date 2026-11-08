"""Consultas de Compras siempre filtradas por tenant y sin commits."""
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.models import Purchase, PurchaseLine


class PurchaseRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list(self, business_id: UUID, *, offset: int, limit: int) -> list[Purchase]:
        return list(self.db.scalars(
            select(Purchase).where(Purchase.business_id == business_id)
            .order_by(Purchase.created_at.desc(), Purchase.id.desc())
            .offset(offset).limit(limit)
        ).all())

    def get(self, business_id: UUID, purchase_id: UUID) -> Purchase | None:
        return self.db.scalar(select(Purchase).where(
            Purchase.business_id == business_id, Purchase.id == purchase_id,
        ))

    def by_request(self, business_id: UUID, key: UUID) -> Purchase | None:
        return self.db.scalar(select(Purchase).where(
            Purchase.business_id == business_id, Purchase.request_id == key,
        ))

    def lines(self, business_id: UUID, purchase_id: UUID) -> list[PurchaseLine]:
        return list(self.db.scalars(
            select(PurchaseLine).where(
                PurchaseLine.business_id == business_id,
                PurchaseLine.purchase_id == purchase_id,
            ).order_by(PurchaseLine.line_number)
        ).all())
