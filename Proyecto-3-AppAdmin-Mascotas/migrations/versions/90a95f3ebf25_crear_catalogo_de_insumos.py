"""crear catalogo de insumos

Revision ID: 90a95f3ebf25
Revises: ce7a018cf3a4
Create Date: 2026-10-04 18:17:11.228972

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "90a95f3ebf25"
down_revision: Union[str, Sequence[str], None] = "ce7a018cf3a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "categorias_insumo",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("activa", sa.Boolean(), nullable=False),
        sa.Column("es_sistema", sa.Boolean(), nullable=False),
        sa.Column(
            "fecha_creacion",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("nombre"),
    )

    categorias_insumo = sa.table(
        "categorias_insumo",
        sa.column("nombre", sa.String),
        sa.column("descripcion", sa.Text),
        sa.column("activa", sa.Boolean),
        sa.column("es_sistema", sa.Boolean),
    )

    op.bulk_insert(
        categorias_insumo,
        [
            {
                "nombre": "Materia prima",
                "descripcion": "Ingredientes y materias primas utilizadas por WALOS.",
                "activa": True,
                "es_sistema": True,
            },
            {
                "nombre": "Empaque",
                "descripcion": "Envases, bolsas, cajas y otros elementos de empaque.",
                "activa": True,
                "es_sistema": True,
            },
            {
                "nombre": "Limpieza",
                "descripcion": "Productos e insumos destinados a limpieza e higiene.",
                "activa": True,
                "es_sistema": True,
            },
            {
                "nombre": "Otros",
                "descripcion": (
                    "Otros bienes físicos que no correspondan "
                    "a las categorías anteriores."
                ),
                "activa": True,
                "es_sistema": True,
            },
        ],
    )

    op.create_table(
        "insumos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=150), nullable=False),
        sa.Column("categoria_id", sa.Integer(), nullable=False),
        sa.Column(
            "unidad_base",
            sa.Enum(
                "KILOGRAMO",
                "LITRO",
                "UNIDAD",
                name="unidad_medida",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("activo", sa.Boolean(), nullable=False),
        sa.Column(
            "fecha_creacion",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["categoria_id"],
            ["categorias_insumo.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_table("insumos")
    op.drop_table("categorias_insumo")


    