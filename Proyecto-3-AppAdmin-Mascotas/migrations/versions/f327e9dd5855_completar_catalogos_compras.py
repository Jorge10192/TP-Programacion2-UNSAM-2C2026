"""completar catalogos compras

Revision ID: f327e9dd5855
Revises: 40cf39f3bf84
Create Date: 2026-10-13 15:14:52.634903

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f327e9dd5855"
down_revision: Union[str, Sequence[str], None] = "40cf39f3bf84"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "imagenes_insumo",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("insumo_id", sa.Integer(), nullable=False),
        sa.Column("archivo", sa.String(length=500), nullable=False),
        sa.Column(
            "principal",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column(
            "activa",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.ForeignKeyConstraint(
            ["insumo_id"],
            ["insumos.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "presentaciones_insumo",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("insumo_id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=150), nullable=False),
        sa.Column("marca", sa.String(length=150), nullable=True),
        sa.Column("unidad_compra_id", sa.Integer(), nullable=False),
        sa.Column(
            "contenido_por_unidad",
            sa.Numeric(precision=12, scale=4),
            nullable=True,
        ),
        sa.Column("unidad_contenido_id", sa.Integer(), nullable=True),
        sa.Column(
            "activa",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column(
            "fecha_creacion",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["insumo_id"],
            ["insumos.id"],
        ),
        sa.ForeignKeyConstraint(
            ["unidad_compra_id"],
            ["unidades_medida.id"],
        ),
        sa.ForeignKeyConstraint(
            ["unidad_contenido_id"],
            ["unidades_medida.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.add_column(
        "insumos",
        sa.Column(
            "tipo_control_stock",
            sa.Enum(
                "CONTROL_MINIMO",
                "CONTROL_PERIODICO",
                "SIN_CONTROL_DETALLADO",
                name="tipocontrolstock",
            ),
            nullable=False,
            server_default="CONTROL_PERIODICO",
        ),
    )

    op.add_column(
        "insumos",
        sa.Column(
            "controla_vencimiento",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    op.add_column(
        "proveedores",
        sa.Column(
            "direccion",
            sa.String(length=255),
            nullable=True,
        ),
    )

    op.add_column(
        "unidades_medida",
        sa.Column(
            "magnitud",
            sa.Enum(
                "MASA",
                "VOLUMEN",
                "SUPERFICIE",
                "CANTIDAD",
                name="magnitudunidad",
            ),
            nullable=True,
        ),
    )

    op.add_column(
        "unidades_medida",
        sa.Column(
            "factor_base",
            sa.Numeric(precision=12, scale=6),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_column(
        "unidades_medida",
        "factor_base",
    )

    op.drop_column(
        "unidades_medida",
        "magnitud",
    )

    op.drop_column(
        "proveedores",
        "direccion",
    )

    op.drop_column(
        "insumos",
        "controla_vencimiento",
    )

    op.drop_column(
        "insumos",
        "tipo_control_stock",
    )

    op.drop_table(
        "presentaciones_insumo",
    )

    op.drop_table(
        "imagenes_insumo",
    )
