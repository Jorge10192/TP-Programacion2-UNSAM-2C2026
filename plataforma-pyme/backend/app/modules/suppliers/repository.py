"""Consultas SQL de Proveedores con filtro obligatorio por empresa; sin commit."""
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.models import Supplier


class SupplierRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_for_business(self, business_id: UUID, *, offset: int, limit: int) -> list[Supplier]:
        return list(self.db.scalars(
            select(Supplier).where(Supplier.business_id == business_id)
            .order_by(Supplier.name_key, Supplier.id)
            .offset(offset).limit(limit)
        ).all())

    def get(self, business_id: UUID, supplier_id: UUID) -> Supplier | None:
        return self.db.scalar(select(Supplier).where(
            Supplier.business_id == business_id, Supplier.id == supplier_id,
        ))

    def get_for_update(self, business_id: UUID, supplier_id: UUID) -> Supplier | None:
        return self.db.scalar(select(Supplier).where(
            Supplier.business_id == business_id, Supplier.id == supplier_id,
        ).with_for_update().execution_options(populate_existing=True))

    def add(self, row: Supplier) -> None:
        self.db.add(row)
        self.db.flush()
