"""Revision inicial sin tablas comerciales.

Revision ID: e2003_baseline
Revises:
Create Date: 2026-11-07
"""
from typing import Sequence

revision: str = "e2003_baseline"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    """Alembic genera alembic_version; las entidades se agregan despues."""
    pass


def downgrade() -> None:
    """No hay tablas de negocio que revertir."""
    pass
