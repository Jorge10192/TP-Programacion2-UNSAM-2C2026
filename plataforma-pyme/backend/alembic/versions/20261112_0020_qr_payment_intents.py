"""E3-2B B2: intenciones QR e ítems inmutables; no afecta sales ni stock."""
from typing import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "e32b_qr_intents"
down_revision: str | None = "e32b_payment_connection"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "qr_payment_intents",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("business_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("merchant_connection_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("location_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("created_by_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("request_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("request_sha256", sa.String(64), nullable=False),
        sa.Column("reference", sa.String(60), nullable=False),
        sa.Column("provider", sa.String(16), nullable=False, server_default=sa.text("'MOCK_QA'")),
        sa.Column("status", sa.String(24), nullable=False, server_default=sa.text("'ESPERANDO_PAGO'")),
        sa.Column("currency", sa.String(3), nullable=False, server_default=sa.text("'ARS'")),
        sa.Column("subtotal_cents", sa.BigInteger(), nullable=False),
        sa.Column("discount_cents", sa.BigInteger(), nullable=False),
        sa.Column("total_cents", sa.BigInteger(), nullable=False),
        sa.Column("notes", sa.String(500), nullable=False, server_default=sa.text("''")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], name="fk_qr_intents_business", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["merchant_connection_id"], ["merchant_payment_connections.id"],
                                name="fk_qr_intents_merchant_connection", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], name="fk_qr_intents_creator", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["business_id", "location_id"], ["locations.business_id", "locations.id"],
                                name="fk_qr_intent_location_tenant", ondelete="RESTRICT"),
        sa.UniqueConstraint("business_id", "id", name="uq_qr_intents_business_id_id"),
        sa.UniqueConstraint("business_id", "request_id", name="uq_qr_intents_business_request"),
        sa.UniqueConstraint("reference", name="uq_qr_intents_reference"),
        sa.CheckConstraint(
            "status IN ('ESPERANDO_PAGO', 'CANCELADA', 'EXPIRADA', 'APROBADA_DEMO', "
            "'RECHAZADA', 'INDETERMINADA', 'REQUIERE_REVISION', 'FINALIZADA')",
            name="ck_qr_intents_status"),
        sa.CheckConstraint(
            "subtotal_cents BETWEEN 1 AND 99999999999 AND discount_cents BETWEEN 0 AND 99999999999 "
            "AND total_cents BETWEEN 1 AND 99999999999 "
            "AND total_cents = subtotal_cents - discount_cents",
            name="ck_qr_intents_total"),
        sa.CheckConstraint("length(request_sha256) = 64", name="ck_qr_intents_digest"),
        sa.CheckConstraint("length(notes) <= 500", name="ck_qr_intents_notes"),
        sa.CheckConstraint("expires_at > created_at", name="ck_qr_intents_expiration"),
    )
    op.create_index("ix_qr_intents_business_created", "qr_payment_intents", ["business_id", "created_at"])
    op.create_table(
        "qr_payment_intent_lines",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("business_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("intent_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("line_number", sa.Integer(), nullable=False),
        sa.Column("catalog_item_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("description_snapshot", sa.String(90), nullable=False),
        sa.Column("sku_snapshot", sa.String(32), nullable=False, server_default=sa.text("''")),
        sa.Column("kind_snapshot", sa.String(8), nullable=False),
        sa.Column("unit_snapshot", sa.String(16), nullable=False),
        sa.Column("quantity_milli", sa.BigInteger(), nullable=False),
        sa.Column("unit_price_cents", sa.BigInteger(), nullable=False),
        sa.Column("line_total_cents", sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(["business_id", "intent_id"],
                                ["qr_payment_intents.business_id", "qr_payment_intents.id"],
                                name="fk_qr_intent_lines_tenant", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["business_id", "catalog_item_id"],
                                ["catalog_items.business_id", "catalog_items.id"],
                                name="fk_qr_intent_lines_catalog_tenant", ondelete="RESTRICT"),
        sa.UniqueConstraint("intent_id", "line_number", name="uq_qr_intent_lines_number"),
        sa.CheckConstraint("line_number BETWEEN 1 AND 30", name="ck_qr_intent_lines_number"),
        sa.CheckConstraint("kind_snapshot IN ('BIEN','SERVICIO')", name="ck_qr_intent_lines_kind"),
        sa.CheckConstraint("quantity_milli BETWEEN 1 AND 999999999", name="ck_qr_intent_lines_quantity"),
        sa.CheckConstraint("unit_price_cents BETWEEN 0 AND 99999999999", name="ck_qr_intent_lines_unit_price"),
        sa.CheckConstraint("line_total_cents BETWEEN 0 AND 99999999999", name="ck_qr_intent_lines_total"),
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.execute(sa.text("SELECT EXISTS (SELECT 1 FROM qr_payment_intents LIMIT 1)")).scalar_one():
        raise RuntimeError("La reversión borraría intentos de cobro existentes")
    op.drop_table("qr_payment_intent_lines")
    op.drop_index("ix_qr_intents_business_created", table_name="qr_payment_intents")
    op.drop_table("qr_payment_intents")
