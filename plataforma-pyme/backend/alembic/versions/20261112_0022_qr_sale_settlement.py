"""E3-2B B4: settlement QR→Sale sin pagos reales.

Revision: e32b_qr_sales
Revises: e32b_qr_events
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "e32b_qr_sales"
down_revision: str | None = "e32b_qr_events"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

def upgrade() -> None:
    op.create_table(
        "qr_payment_settlements",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("business_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("intent_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("sale_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("finalized_by_user_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["business_id", "intent_id"],
            ["qr_payment_intents.business_id", "qr_payment_intents.id"],
            name="fk_qr_settlement_intent_tenant", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["business_id", "sale_id"],
            ["sales.business_id", "sales.id"],
            name="fk_qr_settlement_sale_tenant", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["finalized_by_user_id"], ["users.id"],
            name="fk_qr_settlement_finalized_by", ondelete="RESTRICT"),
        sa.UniqueConstraint("business_id", "intent_id", name="uq_qr_settlement_intent"),
        sa.UniqueConstraint("business_id", "sale_id", name="uq_qr_settlement_sale"),
    )
    op.drop_constraint("ck_sale_payments_declared_method", "sale_payments", type_="check")
    op.create_check_constraint("ck_sale_payments_declared_method", "sale_payments",
        "method IN ('EFECTIVO','TRANSFERENCIA','CUENTA_DNI','TARJETA',"
        "'MERCADO_PAGO_DECLARADO','MERCADO_PAGO_DEMO_QA')")
    op.drop_constraint("ck_qr_events_action", "qr_payment_events", type_="check")
    op.create_check_constraint("ck_qr_events_action", "qr_payment_events",
        "action IN ('CREAR','CANCELAR','APROBAR','RECHAZAR','EXPIRAR',"
        "'INDETERMINAR','FINALIZAR','REVISION')")

def downgrade() -> None:
    bind = op.get_bind()
    if bind.execute(sa.text("SELECT EXISTS (SELECT 1 FROM qr_payment_settlements LIMIT 1)")).scalar_one():
        raise RuntimeError("No se borra un vínculo QR/venta existente")
    if bind.execute(sa.text("SELECT EXISTS (SELECT 1 FROM sale_payments WHERE method = 'MERCADO_PAGO_DEMO_QA' LIMIT 1)")).scalar_one():
        raise RuntimeError("Existen pagos QR DEMO que requieren preservar el esquema")
    if bind.execute(sa.text("SELECT EXISTS (SELECT 1 FROM qr_payment_events WHERE action IN ('FINALIZAR','REVISION') LIMIT 1)")).scalar_one():
        raise RuntimeError("Existen eventos de cierre QR que deben preservarse")
    op.drop_table("qr_payment_settlements")
    op.drop_constraint("ck_sale_payments_declared_method", "sale_payments", type_="check")
    op.create_check_constraint("ck_sale_payments_declared_method", "sale_payments",
        "method IN ('EFECTIVO','TRANSFERENCIA','CUENTA_DNI','TARJETA','MERCADO_PAGO_DECLARADO')")
    op.drop_constraint("ck_qr_events_action", "qr_payment_events", type_="check")
    op.create_check_constraint("ck_qr_events_action", "qr_payment_events",
        "action IN ('CREAR','CANCELAR','APROBAR','RECHAZAR','EXPIRAR','INDETERMINAR')")
