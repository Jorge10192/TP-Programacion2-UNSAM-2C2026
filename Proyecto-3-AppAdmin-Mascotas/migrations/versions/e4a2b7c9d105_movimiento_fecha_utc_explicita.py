"""Record timezone provenance for new stock movements without altering history.

Revision ID: e4a2b7c9d105
Revises: d91f6e72a803
"""
from alembic import op
import sqlalchemy as sa

revision = 'e4a2b7c9d105'
down_revision = 'd91f6e72a803'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # False means unknown, not local time. Do not backfill dates or infer an offset.
    with op.batch_alter_table('movimientos_stock') as batch:
        batch.add_column(sa.Column('fecha_es_utc', sa.Boolean(), server_default=sa.false(), nullable=False))


def downgrade() -> None:
    raise RuntimeError('Revisión sólo hacia adelante: recuperar una copia verificada para volver atrás')
