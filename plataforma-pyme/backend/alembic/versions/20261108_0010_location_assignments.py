"""E2-2 D1: asignaciones a ubicaciones con FK compuestas por empresa.

Revision ID: e22d_assignments
Revises: e22b_location_casa
Create Date: 2026-11-08

Migración exclusivamente aditiva: no modifica registros de E2-0/E2-1
ni asigna colaboradores en forma automática.
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "e22d_assignments"
down_revision: str | None = "e22b_location_casa"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    # PostgreSQL requiere UNIQUE de los mismos campos de una FK compuesta.
    # locations.id ya es PK; UNIQUE(business_id,id) solo hace referenciable el par.
    op.create_unique_constraint(
        "uq_locations_business_id_id", "locations", ["business_id", "id"],
    )
    op.create_table(
        "location_assignments",
        sa.Column("business_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("location_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False,
                  server_default=sa.text("'ACTIVA'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint(
            "business_id", "location_id", "user_id",
            name="pk_location_assignments",
        ),
        sa.ForeignKeyConstraint(
            ["business_id", "location_id"], ["locations.business_id", "locations.id"],
            name="fk_location_assignments_location_tenant", ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["business_id", "user_id"], ["memberships.business_id", "memberships.user_id"],
            name="fk_location_assignments_membership_tenant", ondelete="RESTRICT",
        ),
        sa.CheckConstraint(
            "(status = 'ACTIVA' AND revoked_at IS NULL) OR "
            "(status = 'REVOCADA' AND revoked_at IS NOT NULL)",
            name="ck_location_assignments_status_revocation",
        ),
    )
    op.create_index(
        "ix_location_assignments_business_user", "location_assignments",
        ["business_id", "user_id"],
    )


def downgrade() -> None:
    """Solo sobre base descartable: la reversión eliminaría asignaciones."""
    op.drop_index("ix_location_assignments_business_user", table_name="location_assignments")
    op.drop_table("location_assignments")
    op.drop_constraint("uq_locations_business_id_id", "locations", type_="unique")
