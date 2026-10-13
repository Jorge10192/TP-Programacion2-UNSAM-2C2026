"""actualizar unidades de medida e insumos

Revision ID: 40cf39f3bf84
Revises: 90a95f3ebf25
Create Date: 2026-10-11 18:32:41.821216
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "40cf39f3bf84"
down_revision: Union[str, Sequence[str], None] = "90a95f3ebf25"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. Crear catálogo de unidades de medida
    # ------------------------------------------------------------------

    op.create_table(
        "unidades_medida",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("simbolo", sa.String(length=20), nullable=True),
        sa.Column(
            "activa",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("nombre"),
    )

    # ------------------------------------------------------------------
    # 2. Crear unidades equivalentes al enum anterior
    # ------------------------------------------------------------------

    op.execute(
        """
        INSERT INTO unidades_medida (nombre, simbolo, activa)
        VALUES
            ('Kilogramo', 'kg', 1),
            ('Litro', 'L', 1),
            ('Unidad', 'u', 1)
        """
    )

    # ------------------------------------------------------------------
    # 3. Eliminar es_sistema de CategoriaInsumo
    # ------------------------------------------------------------------

    with op.batch_alter_table("categorias_insumo") as batch_op:
        batch_op.drop_column("es_sistema")

    # ------------------------------------------------------------------
    # 4. Agregar unidad_stock_id temporalmente nullable
    #
    # Primero debe permitir NULL porque pueden existir insumos anteriores.
    # Después migramos sus unidades y finalmente lo hacemos obligatorio.
    # ------------------------------------------------------------------

    with op.batch_alter_table("insumos") as batch_op:
        batch_op.add_column(
            sa.Column(
                "unidad_stock_id",
                sa.Integer(),
                nullable=True,
            )
        )

    # ------------------------------------------------------------------
    # 5. Migrar los valores del enum anterior
    #
    # KILOGRAMO -> UnidadMedida "Kilogramo"
    # LITRO     -> UnidadMedida "Litro"
    # UNIDAD    -> UnidadMedida "Unidad"
    # ------------------------------------------------------------------

    op.execute(
        """
        UPDATE insumos
        SET unidad_stock_id =
            CASE unidad_base
                WHEN 'KILOGRAMO' THEN (
                    SELECT id
                    FROM unidades_medida
                    WHERE nombre = 'Kilogramo'
                )
                WHEN 'LITRO' THEN (
                    SELECT id
                    FROM unidades_medida
                    WHERE nombre = 'Litro'
                )
                WHEN 'UNIDAD' THEN (
                    SELECT id
                    FROM unidades_medida
                    WHERE nombre = 'Unidad'
                )
            END
        """
    )

    # ------------------------------------------------------------------
    # 6. Terminar modificación de Insumo
    #
    # Ahora que los registros existentes tienen unidad:
    # - unidad_stock_id pasa a NOT NULL
    # - se crea la FK
    # - se elimina unidad_base
    # ------------------------------------------------------------------

    with op.batch_alter_table("insumos") as batch_op:
        batch_op.alter_column(
            "unidad_stock_id",
            existing_type=sa.Integer(),
            nullable=False,
        )

        batch_op.create_foreign_key(
            "fk_insumos_unidad_stock_id_unidades_medida",
            "unidades_medida",
            ["unidad_stock_id"],
            ["id"],
        )

        batch_op.drop_column("unidad_base")


def downgrade() -> None:
    # ------------------------------------------------------------------
    # 1. Recuperar temporalmente unidad_base
    # ------------------------------------------------------------------

    with op.batch_alter_table("insumos") as batch_op:
        batch_op.add_column(
            sa.Column(
                "unidad_base",
                sa.String(length=9),
                nullable=True,
            )
        )

    # ------------------------------------------------------------------
    # 2. Convertir nuevamente las unidades al modelo anterior
    # ------------------------------------------------------------------

    op.execute(
        """
        UPDATE insumos
        SET unidad_base =
            CASE (
                SELECT nombre
                FROM unidades_medida
                WHERE unidades_medida.id = insumos.unidad_stock_id
            )
                WHEN 'Kilogramo' THEN 'KILOGRAMO'
                WHEN 'Litro' THEN 'LITRO'
                ELSE 'UNIDAD'
            END
        """
    )

    # ------------------------------------------------------------------
    # 3. Eliminar relación con UnidadMedida
    # ------------------------------------------------------------------

    with op.batch_alter_table("insumos") as batch_op:
        batch_op.drop_constraint(
            "fk_insumos_unidad_stock_id_unidades_medida",
            type_="foreignkey",
        )

        batch_op.drop_column("unidad_stock_id")

        batch_op.alter_column(
            "unidad_base",
            existing_type=sa.String(length=9),
            nullable=False,
        )

    # ------------------------------------------------------------------
    # 4. Recuperar es_sistema
    # ------------------------------------------------------------------

    with op.batch_alter_table("categorias_insumo") as batch_op:
        batch_op.add_column(
            sa.Column(
                "es_sistema",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            )
        )

    # ------------------------------------------------------------------
    # 5. Eliminar catálogo de unidades
    # ------------------------------------------------------------------

    op.drop_table("unidades_medida")