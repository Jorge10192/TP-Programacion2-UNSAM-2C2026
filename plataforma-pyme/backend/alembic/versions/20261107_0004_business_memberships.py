"""E2-1.3A: empresa tenant + membresía por usuario/empresa.

Revision ID: e213a_business_members
Revises: e212b_sessions
Create Date: 2026-11-07
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "e213a_business_members"
down_revision: str | None = "e212b_sessions"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "businesses",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("category", sa.String(length=120), nullable=False),
        sa.Column("activity_kind", sa.String(length=16), nullable=False),
        sa.Column("founder_user_id", sa.Uuid(as_uuid=True), nullable=False),
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
        sa.PrimaryKeyConstraint("id", name="pk_businesses"),
        sa.ForeignKeyConstraint(
            ["founder_user_id"], ["users.id"], name="fk_businesses_founder_user",
            ondelete="RESTRICT",
        ),
        sa.CheckConstraint(
            "length(btrim(name)) BETWEEN 2 AND 120", name="ck_businesses_name_length",
        ),
        sa.CheckConstraint(
            "length(btrim(category)) BETWEEN 2 AND 120", name="ck_businesses_category_length",
        ),
        sa.CheckConstraint(
            "activity_kind IN ('PRODUCTOS', 'SERVICIOS', 'MIXTO')",
            name="ck_businesses_activity_kind",
        ),
        sa.CheckConstraint(
            "status IN ('ACTIVA', 'SUSPENDIDA')", name="ck_businesses_status",
        ),
    )
    op.create_table(
        "memberships",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("business_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column(
            "status", sa.String(length=16), nullable=False,
            server_default=sa.text("'ACTIVA'"),
        ),
        sa.Column("job_title", sa.String(length=100), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id", name="pk_memberships"),
        sa.ForeignKeyConstraint(
            ["business_id"], ["businesses.id"], name="fk_memberships_business",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_memberships_user",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "business_id", "user_id", name="uq_memberships_business_user",
        ),
        sa.CheckConstraint(
            "role IN ('TITULAR_ADMINISTRATIVO', 'ADMINISTRADOR', 'ENCARGADO', 'TRABAJADOR')",
            name="ck_memberships_role",
        ),
        sa.CheckConstraint(
            "status IN ('ACTIVA', 'INACTIVA')", name="ck_memberships_status",
        ),
    )
    op.create_index(
        "ix_memberships_user_id", "memberships", ["user_id"], unique=False,
    )
    # PostgreSQL: protege como máximo un titular ACTIVO en cada negocio.
    op.create_index(
        "uq_memberships_one_active_owner", "memberships", ["business_id"],
        unique=True,
        postgresql_where=sa.text(
            "role = 'TITULAR_ADMINISTRATIVO' AND status = 'ACTIVA'"
        ),
    )


def downgrade() -> None:
    """Solo en DB descartable: borra membresías y empresas."""
    op.drop_index("uq_memberships_one_active_owner", table_name="memberships")
    op.drop_index("ix_memberships_user_id", table_name="memberships")
    op.drop_table("memberships")
    op.drop_table("businesses")
