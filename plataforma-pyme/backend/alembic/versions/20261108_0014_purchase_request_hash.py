"""E2-4 D: huella inmutable del comando de Compra.

Revision ID: e24d_purchase_hash
Revises: e24c_purchases
Create Date: 2026-11-08
"""
from typing import Sequence
from alembic import op
import sqlalchemy as sa

revision: str = "e24d_purchase_hash"
down_revision: str | None = "e24c_purchases"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    # Nullable para documentos que puedan existir antes de habilitar la API.
    # Los nuevos comandos POST siempre escriben su hash SHA-256.
    op.add_column("purchases", sa.Column("request_sha256", sa.String(length=64), nullable=True))
    op.create_check_constraint(
        "ck_purchases_request_sha256", "purchases",
        "request_sha256 IS NULL OR length(request_sha256) = 64",
    )


def downgrade() -> None:
    """Solo bases de prueba: elimina la huella histórica de reintentos."""
    op.drop_constraint("ck_purchases_request_sha256", "purchases", type_="check")
    op.drop_column("purchases", "request_sha256")
