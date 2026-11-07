"""Crear cuentas personales globales, sin empresas ni membresías.

Revision ID: e2101_users
Revises: e2003_baseline
Create Date: 2026-11-07
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "e2101_users"
down_revision: str | None = "e2003_baseline"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("email_normalizado", sa.String(length=254), nullable=False),
        sa.Column("password_hash", sa.String(length=512), nullable=False),
        sa.Column("display_name", sa.String(length=70), nullable=False),
        sa.Column("contact_phone", sa.String(length=30), nullable=True),
        sa.Column(
            "status", sa.String(length=24), nullable=False,
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
        sa.PrimaryKeyConstraint("id", name="pk_users"),
        sa.UniqueConstraint("email_normalizado", name="uq_users_email_normalizado"),
        sa.CheckConstraint(
            "length(email_normalizado) BETWEEN 3 AND 254",
            name="ck_users_email_length",
        ),
        sa.CheckConstraint(
            "email_normalizado = lower(btrim(email_normalizado))",
            name="ck_users_email_normalized",
        ),
        sa.CheckConstraint(
            "length(btrim(display_name)) BETWEEN 2 AND 70",
            name="ck_users_display_name_length",
        ),
        sa.CheckConstraint(
            "length(password_hash) >= 20",
            name="ck_users_password_hash_length",
        ),
        sa.CheckConstraint(
            "status IN ('ACTIVO', 'DESHABILITADO')",
            name="ck_users_status",
        ),
    )


def downgrade() -> None:
    """Peligroso con datos reales: elimina todas las cuentas personales."""
    op.drop_table("users")
