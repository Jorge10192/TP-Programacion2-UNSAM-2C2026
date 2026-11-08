"""E2-2 A.1: agrega CASA sin reescribir la migración de ubicaciones ya aplicada.

Revision ID: e22b_location_casa
Revises: e22a_locations
Create Date: 2026-11-08

Cambio aditivo de dominio permitido: amplía CHECK, conserva filas existentes.
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "e22b_location_casa"
down_revision: str | None = "e22a_locations"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("ck_locations_kind", "locations", type_="check")
    op.create_check_constraint(
        "ck_locations_kind",
        "locations",
        "kind IN ('LOCAL', 'FERIA', 'DEPOSITO', 'OFICINA', 'CASA', 'OTRO')",
    )


def downgrade() -> None:
    """Proteger ubicaciones CASA: no permitir un downgrade que las invalide."""
    bind = op.get_bind()
    has_casas = bind.execute(
        sa.text("SELECT EXISTS (SELECT 1 FROM locations WHERE kind = 'CASA')")
    ).scalar_one()
    if has_casas:
        raise RuntimeError(
            "No se puede revertir e22b_location_casa con ubicaciones CASA existentes. "
            "Conservar datos o planificar una conversión explícita."
        )
    op.drop_constraint("ck_locations_kind", "locations", type_="check")
    op.create_check_constraint(
        "ck_locations_kind",
        "locations",
        "kind IN ('LOCAL', 'FERIA', 'DEPOSITO', 'OFICINA', 'OTRO')",
    )
