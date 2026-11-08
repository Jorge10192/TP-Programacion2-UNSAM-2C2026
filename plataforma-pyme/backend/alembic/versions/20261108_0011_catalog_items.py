"""E2-3 A: catálogo empresarial con unicidad de nombre/SKU por tenant.

Revision ID: e23a_catalog
Revises: e22d_assignments
Create Date: 2026-11-08

Solo agrega catalog_items: sin artículos ficticios, saldos, compras ni ventas.
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "e23a_catalog"
down_revision: str | None = "e22d_assignments"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "catalog_items",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("business_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=90), nullable=False),
        sa.Column("name_key", sa.String(length=90), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column(
            "category", sa.String(length=60), nullable=False,
            server_default=sa.text("'General'"),
        ),
        sa.Column("sku", sa.String(length=32), nullable=True),
        sa.Column("unit", sa.String(length=16), nullable=False),
        sa.Column(
            "description", sa.String(length=450), nullable=False,
            server_default=sa.text("''"),
        ),
        sa.Column(
            "observations", sa.String(length=600), nullable=False,
            server_default=sa.text("''"),
        ),
        sa.Column("sellable", sa.Boolean(), nullable=False),
        sa.Column("price_cents", sa.BigInteger(), nullable=True),
        sa.Column("reference_cost_cents", sa.BigInteger(), nullable=True),
        sa.Column(
            "status", sa.String(length=16), nullable=False,
            server_default=sa.text("'ACTIVO'"),
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id", name="pk_catalog_items"),
        sa.ForeignKeyConstraint(
            ["business_id"], ["businesses.id"],
            name="fk_catalog_items_business", ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "business_id", "id", name="uq_catalog_items_business_id_id",
        ),
        sa.UniqueConstraint(
            "business_id", "name_key", name="uq_catalog_items_business_name",
        ),
        sa.CheckConstraint(
            "length(btrim(name)) BETWEEN 2 AND 90",
            name="ck_catalog_items_name_length",
        ),
        sa.CheckConstraint(
            "length(btrim(name_key)) BETWEEN 2 AND 90",
            name="ck_catalog_items_name_key_length",
        ),
        sa.CheckConstraint(
            "length(btrim(category)) BETWEEN 2 AND 60",
            name="ck_catalog_items_category_length",
        ),
        sa.CheckConstraint(
            "kind IN ('ELABORADO', 'REVENTA', 'INSUMO', 'SERVICIO')",
            name="ck_catalog_items_kind",
        ),
        sa.CheckConstraint(
            "unit IN ('UNIDAD', 'GRAMO', 'KILOGRAMO', 'MILILITRO', "
            "'LITRO', 'PAQUETE', 'CAJA', 'SERVICIO')",
            name="ck_catalog_items_unit",
        ),
        sa.CheckConstraint(
            "(kind = 'SERVICIO' AND unit = 'SERVICIO') OR "
            "(kind <> 'SERVICIO' AND unit <> 'SERVICIO')",
            name="ck_catalog_items_kind_unit",
        ),
        sa.CheckConstraint(
            "sku IS NULL OR sku ~ '^[A-Z0-9._-]{1,32}$'",
            name="ck_catalog_items_sku_format",
        ),
        sa.CheckConstraint(
            "price_cents IS NULL OR price_cents BETWEEN 0 AND 99999999999",
            name="ck_catalog_items_price_cents",
        ),
        sa.CheckConstraint(
            "reference_cost_cents IS NULL OR "
            "reference_cost_cents BETWEEN 0 AND 99999999999",
            name="ck_catalog_items_reference_cost_cents",
        ),
        sa.CheckConstraint(
            "status IN ('ACTIVO', 'INACTIVO')",
            name="ck_catalog_items_status",
        ),
    )
    op.create_index(
        "ix_catalog_items_business_id", "catalog_items", ["business_id"],
    )
    op.create_index(
        "uq_catalog_items_business_sku", "catalog_items", ["business_id", "sku"],
        unique=True, postgresql_where=sa.text("sku IS NOT NULL"),
    )


def downgrade() -> None:
    """Solo sobre base descartable: elimina fichas de catálogo."""
    op.drop_index("uq_catalog_items_business_sku", table_name="catalog_items")
    op.drop_index("ix_catalog_items_business_id", table_name="catalog_items")
    op.drop_table("catalog_items")
