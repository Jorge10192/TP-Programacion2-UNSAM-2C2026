"""E3-2A: fotografías privadas de usuario, empresa, artículo y proveedor.

Revision ID: e32a_photo_assets
Revises: e26a_sales_foundation
Migración aditiva. No altera historia comercial, membresías ni datos existentes.
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "e32a_photo_assets"
down_revision: str | None = "e26a_sales_foundation"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "photo_assets",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("owner_type", sa.String(length=12), nullable=False),
        sa.Column("owner_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("business_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("width", sa.Integer(), nullable=False),
        sa.Column("height", sa.Integer(), nullable=False),
        sa.Column("byte_size", sa.Integer(), nullable=False),
        sa.Column("mime_type", sa.String(length=32), nullable=False, server_default=sa.text("'image/webp'")),
        sa.Column("content", sa.LargeBinary(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], name="fk_photo_assets_business", ondelete="RESTRICT"),
        sa.UniqueConstraint("owner_type", "owner_id", "position", name="uq_photo_assets_owner_slot"),
        sa.CheckConstraint("owner_type IN ('PROFILE','BUSINESS','CATALOG','SUPPLIER')", name="ck_photo_assets_owner_type"),
        sa.CheckConstraint("(owner_type = 'PROFILE' AND business_id IS NULL) OR (owner_type <> 'PROFILE' AND business_id IS NOT NULL)", name="ck_photo_assets_business_scope"),
        sa.CheckConstraint("(owner_type = 'CATALOG' AND position BETWEEN 0 AND 7) OR (owner_type <> 'CATALOG' AND position = 0)", name="ck_photo_assets_position"),
        sa.CheckConstraint("byte_size BETWEEN 1 AND 2097152", name="ck_photo_assets_byte_size"),
        sa.CheckConstraint("width BETWEEN 1 AND 1280 AND height BETWEEN 1 AND 1280", name="ck_photo_assets_dimensions"),
        sa.CheckConstraint("mime_type = 'image/webp'", name="ck_photo_assets_mime"),
    )
    op.create_index("ix_photo_assets_business_id", "photo_assets", ["business_id"])


def downgrade() -> None:
    connection = op.get_bind()
    if connection.execute(sa.text("SELECT EXISTS (SELECT 1 FROM photo_assets LIMIT 1)")).scalar_one():
        raise RuntimeError("No se permite borrar fotografías cargadas al revertir e32a_photo_assets")
    op.drop_index("ix_photo_assets_business_id", table_name="photo_assets")
    op.drop_table("photo_assets")
