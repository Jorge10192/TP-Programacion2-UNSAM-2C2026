"""Hecho histórico inmutable de entrada física, trazable hasta su línea de Compra.

E2-4 E incorpora el primer origen: RECEPCION. Venta y operación manual todavía
no existen; un futuro corte ampliará FK y CHECK al XOR de tres orígenes.
"""
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger, CheckConstraint, DateTime, ForeignKey, ForeignKeyConstraint,
    Index, String, UniqueConstraint, Uuid, func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base


class StockMovement(Base):
    __tablename__ = "stock_movements"
    __table_args__ = (
        ForeignKeyConstraint(
            ["business_id", "location_id"], ["locations.business_id", "locations.id"],
            name="fk_stock_movements_location_tenant", ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["business_id", "catalog_item_id"], ["catalog_items.business_id", "catalog_items.id"],
            name="fk_stock_movements_catalog_tenant", ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["business_id", "receipt_id"], ["purchase_receipts.business_id", "purchase_receipts.id"],
            name="fk_stock_movements_receipt_tenant", ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["business_id", "purchase_line_id"], ["purchase_lines.business_id", "purchase_lines.id"],
            name="fk_stock_movements_line_tenant", ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["business_id", "actor_id"], ["memberships.business_id", "memberships.user_id"],
            name="fk_stock_movements_actor_tenant", ondelete="RESTRICT",
        ),
        UniqueConstraint("business_id", "receipt_id", "purchase_line_id",
                         name="uq_stock_movements_receipt_line"),
        CheckConstraint("delta_milli BETWEEN 1 AND 999999999", name="ck_stock_movements_positive_entry"),
        CheckConstraint("event_type = 'COMPRA_RECEPCION'", name="ck_stock_movements_receipt_only"),
        Index("ix_stock_movements_business_location_item",
              "business_id", "location_id", "catalog_item_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("businesses.id", name="fk_stock_movements_business", ondelete="RESTRICT"),
        nullable=False,
    )
    location_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    catalog_item_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    receipt_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    purchase_line_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    actor_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    event_type: Mapped[str] = mapped_column(String(24), nullable=False, default="COMPRA_RECEPCION")
    delta_milli: Mapped[int] = mapped_column(BigInteger, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False,
                                                  server_default=func.now())
