"""Auditoría de aceptación: quién aceptó y cuándo, con estado coherente.

Revision ID: e213c4_acceptance
Revises: e213c3_invitations
Create Date: 2026-11-08
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "e213c4_acceptance"
down_revision: str | None = "e213c3_invitations"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "business_invitations",
        sa.Column("accepted_by_user_id", sa.Uuid(as_uuid=True), nullable=True),
    )
    op.add_column(
        "business_invitations",
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_business_invitation_acceptor", "business_invitations",
        "users", ["accepted_by_user_id"], ["id"], ondelete="RESTRICT",
    )
    op.create_check_constraint(
        "ck_business_invitation_acceptance_audit", "business_invitations",
        "(status = 'ACEPTADA' AND accepted_by_user_id IS NOT NULL "
        "AND accepted_at IS NOT NULL) OR "
        "(status <> 'ACEPTADA' AND accepted_by_user_id IS NULL "
        "AND accepted_at IS NULL)",
    )


def downgrade() -> None:
    """Solo en base descartable: esta reversión elimina trazas de aceptación."""
    op.drop_constraint(
        "ck_business_invitation_acceptance_audit",
        "business_invitations", type_="check",
    )
    op.drop_constraint(
        "fk_business_invitation_acceptor",
        "business_invitations", type_="foreignkey",
    )
    op.drop_column("business_invitations", "accepted_at")
    op.drop_column("business_invitations", "accepted_by_user_id")
