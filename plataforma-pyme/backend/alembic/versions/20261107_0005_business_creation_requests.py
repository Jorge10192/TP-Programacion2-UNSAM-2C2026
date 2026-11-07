"""Registrar altas empresariales idempotentes por usuario y clave.

Revision ID: e213b_business_creation
Revises: e213a_business_members
Create Date: 2026-11-07
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "e213b_business_creation"
down_revision: str | None = "e213a_business_members"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "business_creation_requests",
        sa.Column("actor_user_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("idempotency_key", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("request_sha256", sa.String(length=64), nullable=False),
        sa.Column("business_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint(
            "actor_user_id", "idempotency_key",
            name="pk_business_creation_requests",
        ),
        sa.ForeignKeyConstraint(
            ["actor_user_id"], ["users.id"],
            name="fk_business_creation_actor", ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["business_id"], ["businesses.id"],
            name="fk_business_creation_business", ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "actor_user_id", "idempotency_key",
            name="uq_business_creation_actor_key",
        ),
        sa.UniqueConstraint(
            "business_id", name="uq_business_creation_business",
        ),
        sa.CheckConstraint(
            "length(request_sha256) = 64",
            name="ck_business_creation_request_digest",
        ),
    )


def downgrade() -> None:
    """Solo en base descartable: perder estas claves permite altas duplicadas."""
    op.drop_table("business_creation_requests")
