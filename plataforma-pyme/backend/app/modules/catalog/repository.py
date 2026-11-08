"""Persistencia tenant-scoped de Catálogo; no abre ni confirma transacciones."""
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.models import CatalogItem


class CatalogRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_for_business(
        self, business_id: UUID, *, offset: int = 0, limit: int = 100,
    ) -> list[CatalogItem]:
        return list(self.db.scalars(
            select(CatalogItem).where(CatalogItem.business_id == business_id)
            .order_by(CatalogItem.name_key, CatalogItem.id)
            .offset(offset).limit(limit)
        ).all())

    def get(self, business_id: UUID, item_id: UUID) -> CatalogItem | None:
        return self.db.scalar(select(CatalogItem).where(
            CatalogItem.business_id == business_id, CatalogItem.id == item_id,
        ))

    def get_for_update(self, business_id: UUID, item_id: UUID) -> CatalogItem | None:
        return self.db.scalar(
            select(CatalogItem)
            .where(CatalogItem.business_id == business_id, CatalogItem.id == item_id)
            .with_for_update().execution_options(populate_existing=True)
        )

    def add(self, item: CatalogItem) -> None:
        self.db.add(item)
        self.db.flush()
