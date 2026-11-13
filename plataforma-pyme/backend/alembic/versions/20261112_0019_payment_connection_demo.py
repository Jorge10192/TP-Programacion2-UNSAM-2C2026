"""E3-2B B1: conexión Mercado Pago DEMO aditiva y aislada por tenant."""
from typing import Sequence
from alembic import op
import sqlalchemy as sa

revision: str = "e32b_payment_connection"
down_revision: str | None = "e32a_photo_assets"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "merchant_payment_connections",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("business_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(24), nullable=False, server_default=sa.text("'MERCADO_PAGO'")),
        sa.Column("mode", sa.String(8), nullable=False, server_default=sa.text("'DEMO'")),
        sa.Column("status", sa.String(12), nullable=False, server_default=sa.text("'ACTIVA'")),
        sa.Column("mock_merchant_name", sa.String(120), nullable=False),
        sa.Column("mock_merchant_ref", sa.String(64), nullable=False),
        sa.Column("updated_by_user_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], name="fk_payment_connection_business", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], name="fk_payment_connection_updated_by", ondelete="RESTRICT"),
        sa.UniqueConstraint("business_id", "provider", "mode", name="uq_payment_connection_tenant_provider_mode"),
        sa.UniqueConstraint("mock_merchant_ref", name="uq_payment_connection_mock_ref"),
        sa.CheckConstraint("provider = 'MERCADO_PAGO'", name="ck_payment_connection_provider"),
        sa.CheckConstraint("mode = 'DEMO'", name="ck_payment_connection_mode"),
        sa.CheckConstraint("status IN ('ACTIVA', 'INACTIVA')", name="ck_payment_connection_status"),
    )


def downgrade() -> None:
    connection = op.get_bind()
    if connection.execute(sa.text("SELECT EXISTS(SELECT 1 FROM merchant_payment_connections LIMIT 1)")).scalar_one():
        raise RuntimeError("No se revierten conexiones existentes sin revisión de datos")
    op.drop_table("merchant_payment_connections")
