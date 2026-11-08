"""Renglón histórico de Compra: snapshot en unidad de catálogo, nunca stock.

La FK compuesta impide vincular una línea a un catálogo de otra empresa.
El servicio E2-4 D debe calcular HALF_UP por línea y conciliar el encabezado.
"""
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger, CheckConstraint, ForeignKeyConstraint, SmallInteger, String,
    UniqueConstraint, Uuid, text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base


class PurchaseLine(Base):
    __tablename__ = "purchase_lines"
    __table_args__ = (
        ForeignKeyConstraint(
            ["business_id", "purchase_id"], ["purchases.business_id", "purchases.id"],
            name="fk_purchase_lines_purchase_tenant", ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["business_id", "catalog_item_id"],
            ["catalog_items.business_id", "catalog_items.id"],
            name="fk_purchase_lines_catalog_tenant", ondelete="RESTRICT",
        ),
        UniqueConstraint("business_id", "id", name="uq_purchase_lines_business_id_id"),
        UniqueConstraint(
            "business_id", "purchase_id", "line_number",
            name="uq_purchase_lines_business_purchase_line_number",
        ),
        CheckConstraint(
            "line_number BETWEEN 1 AND 30",
            name="ck_purchase_lines_line_number",
        ),
        CheckConstraint(
            "length(btrim(description_snapshot)) BETWEEN 2 AND 140",
            name="ck_purchase_lines_description",
        ),
        CheckConstraint(
            "kind_snapshot IN ('BIEN', 'SERVICIO', 'CONCEPTO')",
            name="ck_purchase_lines_kind",
        ),
        CheckConstraint(
            "(kind_snapshot = 'CONCEPTO' AND catalog_item_id IS NULL "
            "AND unit_snapshot = 'CONCEPTO') OR "
            "(kind_snapshot = 'SERVICIO' AND catalog_item_id IS NOT NULL "
            "AND unit_snapshot = 'SERVICIO') OR "
            "(kind_snapshot = 'BIEN' AND catalog_item_id IS NOT NULL "
            "AND unit_snapshot IN ('UNIDAD', 'GRAMO', 'KILOGRAMO', "
            "'MILILITRO', 'LITRO', 'PAQUETE', 'CAJA'))",
            name="ck_purchase_lines_kind_unit_catalog",
        ),
        CheckConstraint(
            "quantity_milli BETWEEN 1 AND 999999999",
            name="ck_purchase_lines_quantity_milli",
        ),
        CheckConstraint(
            "unit_snapshot NOT IN ('UNIDAD', 'PAQUETE', 'CAJA', 'SERVICIO', 'CONCEPTO') "
            "OR quantity_milli % 1000 = 0",
            name="ck_purchase_lines_discrete_quantity",
        ),
        CheckConstraint(
            "unit_cost_cents BETWEEN 0 AND 99999999999",
            name="ck_purchase_lines_unit_cost_cents",
        ),
        CheckConstraint(
            "line_total_cents BETWEEN 0 AND 99999999999",
            name="ck_purchase_lines_total_cents",
        ),
        CheckConstraint(
            "line_total_cents = floor((quantity_milli::numeric * unit_cost_cents + 500) / 1000)",
            name="ck_purchase_lines_half_up_total",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    purchase_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    line_number: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    catalog_item_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    description_snapshot: Mapped[str] = mapped_column(String(140), nullable=False)
    kind_snapshot: Mapped[str] = mapped_column(String(12), nullable=False)
    unit_snapshot: Mapped[str] = mapped_column(String(16), nullable=False)
    sku_snapshot: Mapped[str] = mapped_column(
        String(32), nullable=False, default="", server_default=text("''"),
    )
    quantity_milli: Mapped[int] = mapped_column(BigInteger, nullable=False)
    unit_cost_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    line_total_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
