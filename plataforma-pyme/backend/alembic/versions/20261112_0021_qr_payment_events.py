"""E3-2B B3: eventos auditables e idempotentes de QR MOCK_QA.

Revision ID: e32b_qr_events
Revises: e32b_qr_intents
"""
from typing import Sequence
from alembic import op
import sqlalchemy as sa

revision: str = "e32b_qr_events"
down_revision: str | None = "e32b_qr_intents"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "qr_payment_events",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("business_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("intent_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("event_key", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(16), nullable=False),
        sa.Column("from_status", sa.String(24), nullable=False),
        sa.Column("to_status", sa.String(24), nullable=False),
        sa.Column("actor_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["business_id", "intent_id"],
            ["qr_payment_intents.business_id", "qr_payment_intents.id"],
            name="fk_qr_event_intent_tenant", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"],
            name="fk_qr_events_actor", ondelete="RESTRICT"),
        sa.UniqueConstraint("business_id", "intent_id", "sequence", name="uq_qr_events_sequence"),
        sa.UniqueConstraint("business_id", "intent_id", "event_key", name="uq_qr_events_idempotency"),
        sa.CheckConstraint("sequence >= 1", name="ck_qr_events_sequence"),
        sa.CheckConstraint(
            "action IN ('CREAR','CANCELAR','APROBAR','RECHAZAR','EXPIRAR','INDETERMINAR')",
            name="ck_qr_events_action"),
        sa.CheckConstraint(
            "from_status IN ('SIN_ESTADO','ESPERANDO_PAGO','CANCELADA','EXPIRADA',"
            "'APROBADA_DEMO','RECHAZADA','INDETERMINADA','REQUIERE_REVISION','FINALIZADA')",
            name="ck_qr_events_from_status"),
        sa.CheckConstraint(
            "to_status IN ('ESPERANDO_PAGO','CANCELADA','EXPIRADA','APROBADA_DEMO',"
            "'RECHAZADA','INDETERMINADA','REQUIERE_REVISION','FINALIZADA')",
            name="ck_qr_events_to_status"),
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.execute(sa.text("SELECT EXISTS (SELECT 1 FROM qr_payment_events LIMIT 1)")).scalar_one():
        raise RuntimeError("No se puede revertir: existen eventos auditables de cobro")
    op.drop_table("qr_payment_events")
