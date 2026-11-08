"""E2-4 C: compras + líneas históricas; sin recibir ni crear saldos.

Revision ID: e24c_purchases
Revises: e24a_suppliers
Create Date: 2026-11-08
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "e24c_purchases"
down_revision: str | None = "e24a_suppliers"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "purchases",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("business_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("request_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("supplier_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("supplier_name_snapshot", sa.String(length=90), nullable=False,
                  server_default=sa.text("''")),
        sa.Column("purchased_on", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("total_cents", sa.BigInteger(), nullable=False),
        sa.Column("reference", sa.String(length=70), nullable=False,
                  server_default=sa.text("''")),
        sa.Column("notes", sa.String(length=500), nullable=False,
                  server_default=sa.text("''")),
        sa.Column("created_by_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id", name="pk_purchases"),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"],
                                name="fk_purchases_business", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["business_id", "supplier_id"], ["suppliers.business_id", "suppliers.id"],
            name="fk_purchases_supplier_tenant", ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["business_id", "created_by_id"], ["memberships.business_id", "memberships.user_id"],
            name="fk_purchases_creator_membership_tenant", ondelete="RESTRICT",
        ),
        sa.UniqueConstraint("business_id", "id", name="uq_purchases_business_id_id"),
        sa.UniqueConstraint("business_id", "request_id", name="uq_purchases_business_request"),
        sa.CheckConstraint(
            "purchased_on BETWEEN DATE '2000-01-01' AND DATE '2100-12-31'",
            name="ck_purchases_purchased_on",
        ),
        sa.CheckConstraint(
            "status IN ('REGISTRADA', 'RECIBIDA', 'CERRADA_SIN_RECEPCION', 'CANCELADA')",
            name="ck_purchases_status",
        ),
        sa.CheckConstraint(
            "total_cents BETWEEN 0 AND 99999999999", name="ck_purchases_total_cents",
        ),
        sa.CheckConstraint(
            "(supplier_id IS NULL AND supplier_name_snapshot = '') OR "
            "(supplier_id IS NOT NULL AND "
            "length(btrim(supplier_name_snapshot)) BETWEEN 2 AND 90)",
            name="ck_purchases_supplier_snapshot_optional",
        ),
    )
    op.create_index("ix_purchases_business_date", "purchases",
                    ["business_id", "purchased_on"])

    op.create_table(
        "purchase_lines",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("business_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("purchase_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("line_number", sa.SmallInteger(), nullable=False),
        sa.Column("catalog_item_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("description_snapshot", sa.String(length=140), nullable=False),
        sa.Column("kind_snapshot", sa.String(length=12), nullable=False),
        sa.Column("unit_snapshot", sa.String(length=16), nullable=False),
        sa.Column("sku_snapshot", sa.String(length=32), nullable=False,
                  server_default=sa.text("''")),
        sa.Column("quantity_milli", sa.BigInteger(), nullable=False),
        sa.Column("unit_cost_cents", sa.BigInteger(), nullable=False),
        sa.Column("line_total_cents", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_purchase_lines"),
        sa.ForeignKeyConstraint(
            ["business_id", "purchase_id"], ["purchases.business_id", "purchases.id"],
            name="fk_purchase_lines_purchase_tenant", ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["business_id", "catalog_item_id"],
            ["catalog_items.business_id", "catalog_items.id"],
            name="fk_purchase_lines_catalog_tenant", ondelete="RESTRICT",
        ),
        sa.UniqueConstraint("business_id", "id", name="uq_purchase_lines_business_id_id"),
        sa.UniqueConstraint("business_id", "purchase_id", "line_number",
                            name="uq_purchase_lines_business_purchase_line_number"),
        sa.CheckConstraint("line_number BETWEEN 1 AND 30",
                           name="ck_purchase_lines_line_number"),
        sa.CheckConstraint(
            "length(btrim(description_snapshot)) BETWEEN 2 AND 140",
            name="ck_purchase_lines_description",
        ),
        sa.CheckConstraint(
            "kind_snapshot IN ('BIEN', 'SERVICIO', 'CONCEPTO')",
            name="ck_purchase_lines_kind",
        ),
        sa.CheckConstraint(
            "(kind_snapshot = 'CONCEPTO' AND catalog_item_id IS NULL "
            "AND unit_snapshot = 'CONCEPTO') OR "
            "(kind_snapshot = 'SERVICIO' AND catalog_item_id IS NOT NULL "
            "AND unit_snapshot = 'SERVICIO') OR "
            "(kind_snapshot = 'BIEN' AND catalog_item_id IS NOT NULL "
            "AND unit_snapshot IN ('UNIDAD', 'GRAMO', 'KILOGRAMO', "
            "'MILILITRO', 'LITRO', 'PAQUETE', 'CAJA'))",
            name="ck_purchase_lines_kind_unit_catalog",
        ),
        sa.CheckConstraint(
            "quantity_milli BETWEEN 1 AND 999999999",
            name="ck_purchase_lines_quantity_milli",
        ),
        sa.CheckConstraint(
            "unit_snapshot NOT IN ('UNIDAD', 'PAQUETE', 'CAJA', 'SERVICIO', 'CONCEPTO') "
            "OR quantity_milli % 1000 = 0",
            name="ck_purchase_lines_discrete_quantity",
        ),
        sa.CheckConstraint(
            "unit_cost_cents BETWEEN 0 AND 99999999999",
            name="ck_purchase_lines_unit_cost_cents",
        ),
        sa.CheckConstraint(
            "line_total_cents BETWEEN 0 AND 99999999999",
            name="ck_purchase_lines_total_cents",
        ),
        sa.CheckConstraint(
            "line_total_cents = floor((quantity_milli::numeric * unit_cost_cents + 500) / 1000)",
            name="ck_purchase_lines_half_up_total",
        ),
    )


def downgrade() -> None:
    """Solo para DB descartables: elimina historial de compras."""
    op.drop_table("purchase_lines")
    op.drop_index("ix_purchases_business_date", table_name="purchases")
    op.drop_table("purchases")
