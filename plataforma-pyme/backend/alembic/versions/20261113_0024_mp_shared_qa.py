"""B7-B: ordenes QR compartidas y candado global de una sola caja.

Revision ID: e32c_shared_qa
Revises: e32b_mp_official
"""
from typing import Sequence
from alembic import op
import sqlalchemy as sa

revision: str = "e32c_shared_qa"
down_revision: str | None = "e32b_mp_official"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "mp_shared_qa_box",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("active_order_id", sa.Uuid(as_uuid=True)),
        sa.CheckConstraint("id = 1", name="ck_mp_shared_box_singleton"),
    )
    op.execute("INSERT INTO mp_shared_qa_box(id,active_order_id) VALUES (1,NULL)")
    op.create_table(
        "mp_shared_qa_orders",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("business_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("source_intent_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("request_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("created_by_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("external_reference", sa.String(64), nullable=False),
        sa.Column("provider_order_id", sa.String(90)),
        sa.Column("payment_id", sa.String(90)),
        sa.Column("sale_id", sa.Uuid(as_uuid=True)),
        sa.Column("total_cents", sa.BigInteger(), nullable=False),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("provider_status_detail", sa.String(60)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["business_id","source_intent_id"],
            ["qr_payment_intents.business_id","qr_payment_intents.id"],
            name="fk_mp_shared_order_intent", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["business_id","sale_id"],
            ["sales.business_id","sales.id"],
            name="fk_mp_shared_order_sale", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint("business_id","source_intent_id", name="uq_mp_shared_order_source"),
        sa.UniqueConstraint("business_id","request_id", name="uq_mp_shared_order_request"),
        sa.UniqueConstraint("provider_order_id", name="uq_mp_shared_order_provider"),
        sa.UniqueConstraint("external_reference", name="uq_mp_shared_order_reference"),
        sa.UniqueConstraint("business_id","sale_id", name="uq_mp_shared_order_sale"),
        sa.CheckConstraint("total_cents BETWEEN 1 AND 99999999999", name="ck_mp_shared_amount"),
        sa.CheckConstraint("status IN ('PREPARANDO','INDETERMINADA','CREADA',"
                           "'PROCESADA','CANCELADA','EXPIRADA','REEMBOLSADA',"
                           "'REQUIERE_REVISION')", name="ck_mp_shared_status"),
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.execute(sa.text("SELECT EXISTS (SELECT 1 FROM mp_shared_qa_orders LIMIT 1)")).scalar_one():
        raise RuntimeError("Existen órdenes compartidas: se prohíbe revertir el historial QA")
    if bind.execute(sa.text("SELECT active_order_id IS NOT NULL FROM mp_shared_qa_box WHERE id=1")).scalar_one():
        raise RuntimeError("Hay una orden activa: no se puede revertir")
    op.drop_table("mp_shared_qa_orders")
    op.drop_table("mp_shared_qa_box")
