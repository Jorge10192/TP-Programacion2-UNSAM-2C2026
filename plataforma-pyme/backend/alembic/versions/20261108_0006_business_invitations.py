"""E2-1.3C.3: invitaciones empresariales, token opaco con hash y unicidad pendiente.

Revision ID: e213c3_invitations
Revises: e213b_business_creation
Create Date: 2026-11-08
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "e213c3_invitations"
down_revision: str | None = "e213b_business_creation"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "business_invitations",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("business_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("invited_by_user_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("email_normalizado", sa.String(length=254), nullable=False),
        sa.Column("proposed_role", sa.String(length=32), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "status", sa.String(length=16), nullable=False,
            server_default=sa.text("'PENDIENTE'"),
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["business_id"], ["businesses.id"],
            name="fk_business_invitation_business", ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["invited_by_user_id"], ["users.id"],
            name="fk_business_invitation_inviter", ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "token_hash", name="uq_business_invitations_token_hash",
        ),
        sa.CheckConstraint(
            "length(email_normalizado) BETWEEN 3 AND 254",
            name="ck_business_invitation_email_length",
        ),
        sa.CheckConstraint(
            "email_normalizado = lower(btrim(email_normalizado))",
            name="ck_business_invitation_email_normalized",
        ),
        sa.CheckConstraint(
            "proposed_role IN ('ENCARGADO', 'TRABAJADOR')",
            name="ck_business_invitation_proposed_role",
        ),
        sa.CheckConstraint(
            "status IN ('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA', 'EXPIRADA')",
            name="ck_business_invitation_status",
        ),
        sa.CheckConstraint(
            "length(token_hash) = 64",
            name="ck_business_invitation_token_length",
        ),
        sa.CheckConstraint(
            "expires_at > created_at",
            name="ck_business_invitation_expiration",
        ),
    )
    op.create_index(
        "ix_business_invitations_business_id",
        "business_invitations", ["business_id"],
    )
    op.create_index(
        "uq_business_invitations_pending_email",
        "business_invitations", ["business_id", "email_normalizado"],
        unique=True,
        postgresql_where=sa.text("status = 'PENDIENTE'"),
    )


def downgrade() -> None:
    """Solo en base descartable: elimina invitaciones históricas y tokens."""
    op.drop_index(
        "uq_business_invitations_pending_email",
        table_name="business_invitations",
    )
    op.drop_index(
        "ix_business_invitations_business_id",
        table_name="business_invitations",
    )
    op.drop_table("business_invitations")
