"""Proyección bloqueable por empresa, ubicación y bien físico; nunca inventario negativo."""
from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    BigInteger, CheckConstraint, DateTime, ForeignKey, ForeignKeyConstraint,
    Index, Uuid, func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base

MAX_BALANCE_MILLI = 999_999_999_999_999


class StockBalance(Base):
    __tablename__ = "stock_balances"
    __table_args__ = (
        ForeignKeyConstraint(
            ["business_id", "location_id"], ["locations.business_id", "locations.id"],
            name="fk_stock_balances_location_tenant", ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["business_id", "catalog_item_id"], ["catalog_items.business_id", "catalog_items.id"],
            name="fk_stock_balances_catalog_tenant", ondelete="RESTRICT",
        ),
        CheckConstraint(
            "quantity_milli BETWEEN 0 AND 999999999999999",
            name="ck_stock_balances_quantity_nonnegative",
        ),
        CheckConstraint("version BETWEEN 1 AND 9223372036854775807", name="ck_stock_balances_version"),
        Index("ix_stock_balances_business_catalog", "business_id", "catalog_item_id"),
    )

    business_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("businesses.id", name="fk_stock_balances_business", ondelete="RESTRICT"),
        primary_key=True,
    )
    location_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    catalog_item_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    quantity_milli: Mapped[int] = mapped_column(BigInteger, nullable=False)
    version: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now(),
    )
