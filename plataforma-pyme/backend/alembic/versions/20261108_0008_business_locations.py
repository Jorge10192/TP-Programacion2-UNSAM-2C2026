"""E2-2 A: ubicaciones empresariales, capacidades y principal único por tenant.

Revision ID: e22a_locations
Revises: e213c4_acceptance
Create Date: 2026-11-08

Solo añade estructura: no inserta ubicaciones ficticias ni toca datos previos.
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "e22a_locations"
down_revision: str | None = "e213c4_acceptance"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "locations",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("business_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column(
            "address", sa.String(length=160), nullable=False,
            server_default=sa.text("''"),
        ),
        sa.Column(
            "map_url", sa.String(length=2048), nullable=False,
            server_default=sa.text("''"),
        ),
        sa.Column("can_sell", sa.Boolean(), nullable=False),
        sa.Column("can_store", sa.Boolean(), nullable=False),
        sa.Column(
            "is_primary", sa.Boolean(), nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "status", sa.String(length=16), nullable=False,
            server_default=sa.text("'ACTIVA'"),
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id", name="pk_locations"),
        sa.ForeignKeyConstraint(
            ["business_id"], ["businesses.id"],
            name="fk_locations_business", ondelete="RESTRICT",
        ),
        sa.CheckConstraint(
            "length(btrim(name)) BETWEEN 2 AND 80",
            name="ck_locations_name_length",
        ),
        sa.CheckConstraint(
            "kind IN ('LOCAL', 'FERIA', 'DEPOSITO', 'OFICINA', 'OTRO')",
            name="ck_locations_kind",
        ),
        sa.CheckConstraint(
            "status IN ('ACTIVA', 'PAUSADA')",
            name="ck_locations_status",
        ),
        sa.CheckConstraint(
            "NOT is_primary OR status = 'ACTIVA'",
            name="ck_locations_primary_active",
        ),
    )
    op.create_index(
        "ix_locations_business_id", "locations", ["business_id"],
    )
    op.create_index(
        "uq_locations_one_active_primary", "locations", ["business_id"],
        unique=True,
        postgresql_where=sa.text("is_primary AND status = 'ACTIVA'"),
    )


def downgrade() -> None:
    """Solo en una DB descartable: borra todos los datos de ubicaciones."""
    op.drop_index("uq_locations_one_active_primary", table_name="locations")
    op.drop_index("ix_locations_business_id", table_name="locations")
    op.drop_table("locations")
