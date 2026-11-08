"""E2-4 E: recepción única, movimientos auditables y saldos sin negativos.

Revision ID: e24e_receipt_stock
Revises: e24d_purchase_hash
Create Date: 2026-11-08
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "e24e_receipt_stock"
down_revision: str | None = "e24d_purchase_hash"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "purchase_receipts",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("business_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("purchase_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("location_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("request_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("request_sha256", sa.String(length=64), nullable=False),
        sa.Column("confirmed_by_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("balances_after", postgresql.JSONB(), nullable=False,
                  server_default=sa.text("'[]'::jsonb")),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"],
                                name="fk_purchase_receipts_business", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["business_id", "purchase_id"], ["purchases.business_id", "purchases.id"],
                                name="fk_purchase_receipts_purchase_tenant", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["business_id", "location_id"], ["locations.business_id", "locations.id"],
                                name="fk_purchase_receipts_location_tenant", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["business_id", "confirmed_by_id"],
                                ["memberships.business_id", "memberships.user_id"],
                                name="fk_purchase_receipts_actor_tenant", ondelete="RESTRICT"),
        sa.UniqueConstraint("business_id", "id", name="uq_purchase_receipts_business_id_id"),
        sa.UniqueConstraint("business_id", "purchase_id", name="uq_purchase_receipts_business_purchase"),
        sa.UniqueConstraint("business_id", "request_id", name="uq_purchase_receipts_business_request"),
        sa.CheckConstraint("length(request_sha256) = 64", name="ck_purchase_receipts_digest"),
        sa.CheckConstraint("jsonb_typeof(balances_after) = 'array'",
                           name="ck_purchase_receipts_balance_snapshot"),
    )
    op.create_table(
        "stock_balances",
        sa.Column("business_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("location_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("catalog_item_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("quantity_milli", sa.BigInteger(), nullable=False),
        sa.Column("version", sa.BigInteger(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("business_id", "location_id", "catalog_item_id"),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"],
                                name="fk_stock_balances_business", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["business_id", "location_id"], ["locations.business_id", "locations.id"],
                                name="fk_stock_balances_location_tenant", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["business_id", "catalog_item_id"],
                                ["catalog_items.business_id", "catalog_items.id"],
                                name="fk_stock_balances_catalog_tenant", ondelete="RESTRICT"),
        sa.CheckConstraint("quantity_milli BETWEEN 0 AND 999999999999999",
                           name="ck_stock_balances_quantity_nonnegative"),
        sa.CheckConstraint("version BETWEEN 1 AND 9223372036854775807",
                           name="ck_stock_balances_version"),
    )
    op.create_index("ix_stock_balances_business_catalog", "stock_balances",
                    ["business_id", "catalog_item_id"])
    op.create_table(
        "stock_movements",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("business_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("location_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("catalog_item_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("receipt_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("purchase_line_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("actor_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(length=24), nullable=False),
        sa.Column("delta_milli", sa.BigInteger(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"],
                                name="fk_stock_movements_business", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["business_id", "location_id"], ["locations.business_id", "locations.id"],
                                name="fk_stock_movements_location_tenant", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["business_id", "catalog_item_id"],
                                ["catalog_items.business_id", "catalog_items.id"],
                                name="fk_stock_movements_catalog_tenant", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["business_id", "receipt_id"],
                                ["purchase_receipts.business_id", "purchase_receipts.id"],
                                name="fk_stock_movements_receipt_tenant", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["business_id", "purchase_line_id"],
                                ["purchase_lines.business_id", "purchase_lines.id"],
                                name="fk_stock_movements_line_tenant", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["business_id", "actor_id"],
                                ["memberships.business_id", "memberships.user_id"],
                                name="fk_stock_movements_actor_tenant", ondelete="RESTRICT"),
        sa.UniqueConstraint("business_id", "receipt_id", "purchase_line_id",
                            name="uq_stock_movements_receipt_line"),
        sa.CheckConstraint("delta_milli BETWEEN 1 AND 999999999",
                           name="ck_stock_movements_positive_entry"),
        sa.CheckConstraint("event_type = 'COMPRA_RECEPCION'",
                           name="ck_stock_movements_receipt_only"),
    )
    op.create_index("ix_stock_movements_business_location_item", "stock_movements",
                    ["business_id", "location_id", "catalog_item_id"])


def downgrade() -> None:
    """Solo en base efímera; los registros de recepción/stock son históricos."""
    op.drop_index("ix_stock_movements_business_location_item", table_name="stock_movements")
    op.drop_table("stock_movements")
    op.drop_index("ix_stock_balances_business_catalog", table_name="stock_balances")
    op.drop_table("stock_balances")
    op.drop_table("purchase_receipts")
