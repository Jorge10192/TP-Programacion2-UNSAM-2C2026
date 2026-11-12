"""B6: OAuth + Orders MP TEST aislados (sin alterar los QR MOCK_QA).

Revision ID: e32b_mp_official
Revises: e32b_qr_sales
"""
from typing import Sequence
from alembic import op
import sqlalchemy as sa

revision: str = "e32b_mp_official"
down_revision: str | None = "e32b_qr_sales"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

def upgrade() -> None:
    op.create_table(
        "mp_oauth_pending",
        sa.Column("id",sa.Uuid(as_uuid=True),primary_key=True),
        sa.Column("business_id",sa.Uuid(as_uuid=True),nullable=False),
        sa.Column("actor_id",sa.Uuid(as_uuid=True),nullable=False),
        sa.Column("state_hash",sa.String(64),nullable=False),
        sa.Column("verifier_encrypted",sa.Text(),nullable=False),
        sa.Column("created_at",sa.DateTime(timezone=True),nullable=False,server_default=sa.text("now()")),
        sa.Column("expires_at",sa.DateTime(timezone=True),nullable=False),
        sa.Column("used_at",sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(["business_id"],["businesses.id"],ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["actor_id"],["users.id"],ondelete="RESTRICT"),
        sa.UniqueConstraint("state_hash",name="uq_mp_oauth_state_hash"),
    )
    op.create_index("ix_mp_oauth_pending_business","mp_oauth_pending",["business_id","created_at"])
    op.create_table(
        "mp_test_accounts",
        sa.Column("id",sa.Uuid(as_uuid=True),primary_key=True),
        sa.Column("business_id",sa.Uuid(as_uuid=True),nullable=False),
        sa.Column("mp_user_id",sa.String(40),nullable=False),
        sa.Column("access_encrypted",sa.Text(),nullable=False),
        sa.Column("refresh_encrypted",sa.Text(),nullable=False),
        sa.Column("expires_at",sa.DateTime(timezone=True),nullable=False),
        sa.Column("external_pos_id",sa.String(64)),
        sa.Column("status",sa.String(12),nullable=False),
        sa.Column("updated_by_user_id",sa.Uuid(as_uuid=True),nullable=False),
        sa.Column("updated_at",sa.DateTime(timezone=True),nullable=False,server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["business_id"],["businesses.id"],ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["updated_by_user_id"],["users.id"],ondelete="RESTRICT"),
        sa.UniqueConstraint("business_id",name="uq_mp_test_account_business"),
        sa.UniqueConstraint("business_id","id",name="uq_mp_test_account_tenant_id"),
        sa.UniqueConstraint("mp_user_id",name="uq_mp_test_account_seller"),
        sa.CheckConstraint("status IN ('ACTIVA','INACTIVA')",name="ck_mp_test_account_status"),
    )
    op.create_table(
        "mp_test_orders",
        sa.Column("id",sa.Uuid(as_uuid=True),primary_key=True),
        sa.Column("business_id",sa.Uuid(as_uuid=True),nullable=False),
        sa.Column("source_intent_id",sa.Uuid(as_uuid=True),nullable=False),
        sa.Column("account_id",sa.Uuid(as_uuid=True),nullable=False),
        sa.Column("request_id",sa.Uuid(as_uuid=True),nullable=False),
        sa.Column("created_by_id",sa.Uuid(as_uuid=True),nullable=False),
        sa.Column("external_reference",sa.String(64),nullable=False),
        sa.Column("external_pos_id",sa.String(64),nullable=False),
        sa.Column("provider_order_id",sa.String(90)),
        sa.Column("payment_id",sa.String(90)),
        sa.Column("sale_id",sa.Uuid(as_uuid=True)),
        sa.Column("qr_data",sa.Text()),
        sa.Column("total_cents",sa.BigInteger(),nullable=False),
        sa.Column("status",sa.String(24),nullable=False),
        sa.Column("provider_status_detail",sa.String(60)),
        sa.Column("created_at",sa.DateTime(timezone=True),nullable=False,server_default=sa.text("now()")),
        sa.Column("updated_at",sa.DateTime(timezone=True),nullable=False,server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["business_id","source_intent_id"],
            ["qr_payment_intents.business_id","qr_payment_intents.id"],
            name="fk_mp_order_qr_source",ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["business_id","account_id"],
            ["mp_test_accounts.business_id","mp_test_accounts.id"],
            name="fk_mp_order_account_tenant",ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["created_by_id"],["users.id"],ondelete="RESTRICT"),
        sa.UniqueConstraint("business_id","source_intent_id",name="uq_mp_order_source_intent"),
        sa.UniqueConstraint("business_id","request_id",name="uq_mp_order_request"),
        sa.UniqueConstraint("provider_order_id",name="uq_mp_order_provider_id"),
        sa.UniqueConstraint("external_reference",name="uq_mp_order_external_ref"),
        sa.UniqueConstraint("business_id","sale_id",name="uq_mp_order_sale"),
        sa.ForeignKeyConstraint(["business_id","sale_id"],
            ["sales.business_id","sales.id"],name="fk_mp_order_sale_tenant",ondelete="RESTRICT"),
        sa.CheckConstraint("total_cents BETWEEN 1 AND 99999999999",name="ck_mp_order_total"),
        sa.CheckConstraint(
            "status IN ('PREPARANDO','INDETERMINADA','CREADA','PROCESADA',"
            "'CANCELADA','EXPIRADA','REEMBOLSADA','REQUIERE_REVISION')",
            name="ck_mp_order_status"),
    )
    # Salida QA verificada separada de pagos DECLARADOS y del MOCK_QA B4.
    op.drop_constraint("ck_sale_payments_declared_method","sale_payments",type_="check")
    op.create_check_constraint("ck_sale_payments_declared_method","sale_payments",
        "method IN ('EFECTIVO','TRANSFERENCIA','CUENTA_DNI','TARJETA',"
        "'MERCADO_PAGO_DECLARADO','MERCADO_PAGO_DEMO_QA','MERCADO_PAGO_QR_TEST')")

def downgrade() -> None:
    bind=op.get_bind()
    for table in ("mp_test_orders","mp_test_accounts","mp_oauth_pending"):
        if bind.execute(sa.text(f"SELECT EXISTS (SELECT 1 FROM {table} LIMIT 1)")).scalar_one():
            raise RuntimeError("B6 preserva credenciales OAuth y órdenes existentes: no se puede revertir")
    if bind.execute(sa.text(
        "SELECT EXISTS (SELECT 1 FROM sale_payments WHERE method='MERCADO_PAGO_QR_TEST' LIMIT 1)"
    )).scalar_one():
        raise RuntimeError("Ventas QA MP TEST existentes: no se revierte el método")
    op.drop_constraint("ck_sale_payments_declared_method","sale_payments",type_="check")
    op.create_check_constraint("ck_sale_payments_declared_method","sale_payments",
        "method IN ('EFECTIVO','TRANSFERENCIA','CUENTA_DNI','TARJETA',"
        "'MERCADO_PAGO_DECLARADO','MERCADO_PAGO_DEMO_QA')")
    op.drop_table("mp_test_orders")
    op.drop_table("mp_test_accounts")
    op.drop_index("ix_mp_oauth_pending_business",table_name="mp_oauth_pending")
    op.drop_table("mp_oauth_pending")
