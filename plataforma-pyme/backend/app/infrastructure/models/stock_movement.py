"""Hecho histórico firmado de stock, con origen explícito y verificable.

E2-4 E: COMPRA_RECEPCION; E2-5: operaciones manuales;
E2-6 A: origen VENTA_SALIDA con FK triple a sale_lines del mismo comprobante.
La operación comercial actualizará saldo y ledger en la misma transacción.
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
            ["business_id", "inventory_operation_id", "operation_kind"],
            ["inventory_operations.business_id", "inventory_operations.id", "inventory_operations.kind"],
            name="fk_stock_movements_operation_kind_tenant", ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["business_id", "sale_id", "sale_line_id"],
            ["sale_lines.business_id", "sale_lines.sale_id", "sale_lines.id"],
            name="fk_stock_movements_sale_line_tenant", ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["business_id", "actor_id"], ["memberships.business_id", "memberships.user_id"],
            name="fk_stock_movements_actor_tenant", ondelete="RESTRICT",
        ),
        UniqueConstraint(
            "business_id", "receipt_id", "purchase_line_id",
            name="uq_stock_movements_receipt_line",
        ),
        UniqueConstraint(
            "business_id", "inventory_operation_id", "event_type",
            name="uq_stock_movements_operation_event",
        ),
        UniqueConstraint(
            "business_id", "sale_id", "sale_line_id",
            name="uq_stock_movements_sale_line",
        ),
        CheckConstraint(
            "("
            "event_type = 'COMPRA_RECEPCION' AND receipt_id IS NOT NULL "
            "AND purchase_line_id IS NOT NULL AND inventory_operation_id IS NULL "
            "AND operation_kind IS NULL AND sale_id IS NULL AND sale_line_id IS NULL "
            "AND delta_milli BETWEEN 1 AND 999999999"
            ") OR ("
            "event_type = 'TRASLADO_ENTRADA' AND receipt_id IS NULL "
            "AND purchase_line_id IS NULL AND inventory_operation_id IS NOT NULL "
            "AND operation_kind IS NOT NULL AND operation_kind = 'TRASLADO' AND sale_id IS NULL AND sale_line_id IS NULL AND delta_milli BETWEEN 1 AND 999999999"
            ") OR ("
            "event_type = 'TRASLADO_SALIDA' AND receipt_id IS NULL "
            "AND purchase_line_id IS NULL AND inventory_operation_id IS NOT NULL "
            "AND operation_kind IS NOT NULL AND operation_kind = 'TRASLADO' AND sale_id IS NULL AND sale_line_id IS NULL AND delta_milli BETWEEN -999999999 AND -1"
            ") OR ("
            "event_type = 'AJUSTE_ENTRADA' AND receipt_id IS NULL "
            "AND purchase_line_id IS NULL AND inventory_operation_id IS NOT NULL "
            "AND operation_kind IS NOT NULL AND operation_kind = 'AJUSTE_ENTRADA' AND sale_id IS NULL AND sale_line_id IS NULL AND delta_milli BETWEEN 1 AND 999999999"
            ") OR ("
            "event_type = 'AJUSTE_SALIDA' AND receipt_id IS NULL "
            "AND purchase_line_id IS NULL AND inventory_operation_id IS NOT NULL "
            "AND operation_kind IS NOT NULL AND operation_kind = 'AJUSTE_SALIDA' AND sale_id IS NULL AND sale_line_id IS NULL AND delta_milli BETWEEN -999999999 AND -1"
            ") OR ("
            "event_type = 'STOCK_INICIAL' AND receipt_id IS NULL "
            "AND purchase_line_id IS NULL AND inventory_operation_id IS NOT NULL "
            "AND operation_kind IS NOT NULL AND operation_kind = 'STOCK_INICIAL' AND sale_id IS NULL AND sale_line_id IS NULL AND delta_milli BETWEEN 1 AND 999999999"
            ") OR ("
            "event_type = 'VENTA_SALIDA' AND receipt_id IS NULL "
            "AND purchase_line_id IS NULL AND inventory_operation_id IS NULL "
            "AND operation_kind IS NULL AND sale_id IS NOT NULL "
            "AND sale_line_id IS NOT NULL AND delta_milli BETWEEN -999999999 AND -1"
            ")",
            name="ck_stock_movements_origin_and_sign",
        ),
        Index("ix_stock_movements_business_sale", "business_id", "sale_id"),
        Index(
            "ix_stock_movements_business_location_item",
            "business_id", "location_id", "catalog_item_id",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("businesses.id", name="fk_stock_movements_business", ondelete="RESTRICT"),
        nullable=False,
    )
    location_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    catalog_item_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    receipt_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    purchase_line_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    inventory_operation_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    operation_kind: Mapped[str | None] = mapped_column(String(24), nullable=True)
    sale_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    sale_line_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    actor_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    event_type: Mapped[str] = mapped_column(String(24), nullable=False, default="COMPRA_RECEPCION")
    delta_milli: Mapped[int] = mapped_column(BigInteger, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
