"""E2-4 A: proveedores por empresa sin crear compras ni registros ficticios.

Revision ID: e24a_suppliers
Revises: e23a_catalog
Create Date: 2026-11-08
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "e24a_suppliers"
down_revision: str | None = "e23a_catalog"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "suppliers",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("business_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=90), nullable=False),
        sa.Column("name_key", sa.String(length=90), nullable=False),
        sa.Column("offerings", sa.String(length=240), nullable=False, server_default=sa.text("''")),
        sa.Column("contact_person", sa.String(length=100), nullable=False, server_default=sa.text("''")),
        sa.Column("phone", sa.String(length=35), nullable=False, server_default=sa.text("''")),
        sa.Column("whatsapp", sa.String(length=35), nullable=False, server_default=sa.text("''")),
        sa.Column("email", sa.String(length=120), nullable=False, server_default=sa.text("''")),
        sa.Column("address", sa.String(length=160), nullable=False, server_default=sa.text("''")),
        sa.Column("maps_url", sa.String(length=2048), nullable=False, server_default=sa.text("''")),
        sa.Column("website", sa.String(length=2048), nullable=False, server_default=sa.text("''")),
        sa.Column("instagram", sa.String(length=31), nullable=False, server_default=sa.text("''")),
        sa.Column("notes", sa.String(length=650), nullable=False, server_default=sa.text("''")),
        sa.Column(
            "payment_methods", JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "promotions", JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb"),
        ),
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
        sa.PrimaryKeyConstraint("id", name="pk_suppliers"),
        sa.ForeignKeyConstraint(
            ["business_id"], ["businesses.id"],
            name="fk_suppliers_business", ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "business_id", "id", name="uq_suppliers_business_id_id",
        ),
        sa.UniqueConstraint(
            "business_id", "name_key", name="uq_suppliers_business_name",
        ),
        sa.CheckConstraint(
            "length(btrim(name)) BETWEEN 2 AND 90",
            name="ck_suppliers_name_length",
        ),
        sa.CheckConstraint(
            "length(btrim(name_key)) BETWEEN 2 AND 90",
            name="ck_suppliers_name_key_length",
        ),
        sa.CheckConstraint(
            "status IN ('ACTIVO', 'INACTIVO')", name="ck_suppliers_status",
        ),
        sa.CheckConstraint(
            "CASE WHEN jsonb_typeof(payment_methods) = 'array' "
            "THEN jsonb_array_length(payment_methods) <= 7 ELSE false END",
            name="ck_suppliers_payment_methods_array",
        ),
        sa.CheckConstraint(
            "CASE WHEN jsonb_typeof(promotions) = 'array' "
            "THEN jsonb_array_length(promotions) <= 8 ELSE false END",
            name="ck_suppliers_promotions_array",
        ),
    )
    op.create_index(
        "ix_suppliers_business_id", "suppliers", ["business_id"],
    )


def downgrade() -> None:
    """Solo para bases descartables: elimina todos los proveedores."""
    op.drop_index("ix_suppliers_business_id", table_name="suppliers")
    op.drop_table("suppliers")
