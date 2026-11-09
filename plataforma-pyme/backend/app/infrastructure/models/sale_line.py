"""E2-6 A: renglón de venta inmutable, con snapshot comercial y HALF_UP.

Cada renglón permanece separado para cálculos monetarios. El servicio agrupará
artículos físicos repetidos únicamente para chequear/descontar existencias.
"""
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger, CheckConstraint, ForeignKeyConstraint, SmallInteger, String,
    UniqueConstraint, Uuid, text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base


class SaleLine(Base):
    __tablename__ = "sale_lines"
    __table_args__ = (
        ForeignKeyConstraint(
            ["business_id", "sale_id"], ["sales.business_id", "sales.id"],
            name="fk_sale_lines_sale_tenant", ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["business_id", "catalog_item_id"],
            ["catalog_items.business_id", "catalog_items.id"],
            name="fk_sale_lines_catalog_tenant", ondelete="RESTRICT",
        ),
        UniqueConstraint("business_id", "id", name="uq_sale_lines_business_id_id"),
        UniqueConstraint(
            "business_id", "sale_id", "id", name="uq_sale_lines_business_sale_id_id",
        ),
        UniqueConstraint(
            "business_id", "sale_id", "line_number",
            name="uq_sale_lines_business_sale_line_number",
        ),
        CheckConstraint("line_number BETWEEN 1 AND 30", name="ck_sale_lines_number"),
        CheckConstraint(
            "length(btrim(description_snapshot)) BETWEEN 2 AND 140",
            name="ck_sale_lines_description",
        ),
        CheckConstraint(
            "(kind_snapshot = 'SERVICIO' AND unit_snapshot = 'SERVICIO') OR "
            "(kind_snapshot = 'BIEN' AND unit_snapshot IN "
            "('UNIDAD','GRAMO','KILOGRAMO','MILILITRO','LITRO','PAQUETE','CAJA'))",
            name="ck_sale_lines_kind_unit",
        ),
        CheckConstraint(
            "quantity_milli BETWEEN 1 AND 999999999", name="ck_sale_lines_quantity",
        ),
        CheckConstraint(
            "unit_snapshot NOT IN ('UNIDAD','PAQUETE','CAJA','SERVICIO') "
            "OR quantity_milli % 1000 = 0", name="ck_sale_lines_discrete_quantity",
        ),
        CheckConstraint(
            "unit_price_cents BETWEEN 0 AND 99999999999", name="ck_sale_lines_unit_price",
        ),
        CheckConstraint(
            "line_total_cents BETWEEN 0 AND 99999999999", name="ck_sale_lines_total",
        ),
        CheckConstraint(
            "line_total_cents = floor("
            "(quantity_milli::numeric * unit_price_cents + 500) / 1000)",
            name="ck_sale_lines_half_up_total",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    sale_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    line_number: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    catalog_item_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    description_snapshot: Mapped[str] = mapped_column(String(140), nullable=False)
    kind_snapshot: Mapped[str] = mapped_column(String(12), nullable=False)
    unit_snapshot: Mapped[str] = mapped_column(String(16), nullable=False)
    sku_snapshot: Mapped[str] = mapped_column(
        String(32), nullable=False, default="", server_default=text("''"),
    )
    quantity_milli: Mapped[int] = mapped_column(BigInteger, nullable=False)
    unit_price_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    line_total_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
