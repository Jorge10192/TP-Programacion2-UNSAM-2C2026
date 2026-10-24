"""integrar catalogos y borradores de compras

Revision ID: b72f4d981c20
Revises: 8ad65c3a4412
Create Date: 2026-10-24 11:21:21.992958

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b72f4d981c20'
down_revision: Union[str, Sequence[str], None] = '8ad65c3a4412'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('imagenes_insumo',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('insumo_id', sa.Integer(), nullable=False),
    sa.Column('archivo', sa.String(length=500), nullable=False),
    sa.Column('principal', sa.Boolean(), nullable=False),
    sa.Column('activo', sa.Boolean(), nullable=False),
    sa.ForeignKeyConstraint(['insumo_id'], ['insumos.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('presentaciones_insumo',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('insumo_id', sa.Integer(), nullable=False),
    sa.Column('nombre', sa.String(length=150), nullable=False),
    sa.Column('marca', sa.String(length=150), nullable=True),
    sa.Column('unidad_compra_id', sa.Integer(), nullable=False),
    sa.Column('contenido_por_unidad', sa.Numeric(precision=18, scale=6), nullable=True),
    sa.Column('unidad_contenido_id', sa.Integer(), nullable=True),
    sa.Column('activo', sa.Boolean(), nullable=False),
    sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.CheckConstraint('(contenido_por_unidad IS NULL) = (unidad_contenido_id IS NULL)', name='presentacion_contenido_completo'),
    sa.CheckConstraint('contenido_por_unidad > 0', name='presentacion_contenido_positivo'),
    sa.ForeignKeyConstraint(['insumo_id'], ['insumos.id'], ),
    sa.ForeignKeyConstraint(['unidad_compra_id'], ['unidades_medida.id'], ),
    sa.ForeignKeyConstraint(['unidad_contenido_id'], ['unidades_medida.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('registros_actividad_compra',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('compra_id', sa.Integer(), nullable=False),
    sa.Column('usuario_id', sa.Integer(), nullable=False),
    sa.Column('fecha', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('tipo', sa.String(length=30), nullable=False),
    sa.Column('descripcion', sa.Text(), nullable=False),
    sa.Column('datos_anteriores', sa.JSON(), nullable=True),
    sa.Column('datos_nuevos', sa.JSON(), nullable=True),
    sa.ForeignKeyConstraint(['compra_id'], ['compras.id'], ),
    sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('categorias_insumo', schema=None) as batch_op:
        batch_op.add_column(sa.Column('descripcion', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False))

    with op.batch_alter_table('compras', schema=None) as batch_op:
        batch_op.add_column(sa.Column('fecha_confirmacion', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('fecha_ultima_modificacion', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False))
        batch_op.alter_column('proveedor_id',
               existing_type=sa.INTEGER(),
               nullable=True)

    with op.batch_alter_table('insumos', schema=None) as batch_op:
        batch_op.add_column(sa.Column('tipo_control_stock', sa.String(length=30), server_default='CONTROL_PERIODICO', nullable=False))
        batch_op.add_column(sa.Column('controla_vencimiento', sa.Boolean(), server_default=sa.false(), nullable=False))
        batch_op.add_column(sa.Column('fecha_creacion', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False))

    with op.batch_alter_table('items_compra', schema=None) as batch_op:
        batch_op.add_column(sa.Column('presentacion_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('item_presentacion_fk', 'presentaciones_insumo', ['presentacion_id'], ['id'])

    with op.batch_alter_table('proveedores', schema=None) as batch_op:
        batch_op.add_column(sa.Column('direccion', sa.String(length=255), nullable=True))

    with op.batch_alter_table('unidades_medida', schema=None) as batch_op:
        batch_op.add_column(sa.Column('simbolo', sa.String(length=20), nullable=True))



def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('unidades_medida', schema=None) as batch_op:
        batch_op.drop_column('simbolo')

    with op.batch_alter_table('proveedores', schema=None) as batch_op:
        batch_op.drop_column('direccion')

    with op.batch_alter_table('items_compra', schema=None) as batch_op:
        batch_op.drop_constraint('item_presentacion_fk', type_='foreignkey')
        batch_op.drop_column('presentacion_id')

    with op.batch_alter_table('insumos', schema=None) as batch_op:
        batch_op.drop_column('fecha_creacion')
        batch_op.drop_column('controla_vencimiento')
        batch_op.drop_column('tipo_control_stock')

    with op.batch_alter_table('compras', schema=None) as batch_op:
        batch_op.alter_column('proveedor_id',
               existing_type=sa.INTEGER(),
               nullable=False)
        batch_op.drop_column('fecha_ultima_modificacion')
        batch_op.drop_column('fecha_confirmacion')

    with op.batch_alter_table('categorias_insumo', schema=None) as batch_op:
        batch_op.drop_column('fecha_creacion')
        batch_op.drop_column('descripcion')

    op.drop_table('registros_actividad_compra')
    op.drop_table('presentaciones_insumo')
    op.drop_table('imagenes_insumo')
