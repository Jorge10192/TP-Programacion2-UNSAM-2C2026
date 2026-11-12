"""E3-2B B2: intención de cobro QR (no equivale a venta ni a pago)."""
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger, CheckConstraint, DateTime, ForeignKey, ForeignKeyConstraint,
    Index, Integer, String, UniqueConstraint, Uuid, func, text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base


class QrPaymentIntent(Base):
    __tablename__ = "qr_payment_intents"
    __table_args__ = (
        ForeignKeyConstraint(
            ["business_id", "location_id"], ["locations.business_id", "locations.id"],
            name="fk_qr_intent_location_tenant", ondelete="RESTRICT",
        ),
        UniqueConstraint("business_id", "id", name="uq_qr_intents_business_id_id"),
        UniqueConstraint("business_id", "request_id", name="uq_qr_intents_business_request"),
        UniqueConstraint("reference", name="uq_qr_intents_reference"),
        Index("ix_qr_intents_business_created", "business_id", "created_at"),
        CheckConstraint(
            "status IN ('ESPERANDO_PAGO', 'CANCELADA', 'EXPIRADA', 'APROBADA_DEMO', "
            "'RECHAZADA', 'INDETERMINADA', 'REQUIERE_REVISION', 'FINALIZADA')",
            name="ck_qr_intents_status",
        ),
        CheckConstraint(
            "subtotal_cents BETWEEN 1 AND 99999999999 AND "
            "discount_cents BETWEEN 0 AND 99999999999 AND "
            "total_cents BETWEEN 1 AND 99999999999 AND "
            "total_cents = subtotal_cents - discount_cents",
            name="ck_qr_intents_total",
        ),
        CheckConstraint("length(request_sha256) = 64", name="ck_qr_intents_digest"),
        CheckConstraint("length(notes) <= 500", name="ck_qr_intents_notes"),
        CheckConstraint("expires_at > created_at", name="ck_qr_intents_expiration"),
    )
    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("businesses.id", name="fk_qr_intents_business", ondelete="RESTRICT"),
        nullable=False,
    )
    merchant_connection_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("merchant_payment_connections.id",
                                      name="fk_qr_intents_merchant_connection", ondelete="RESTRICT"),
        nullable=False,
    )
    location_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    created_by_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", name="fk_qr_intents_creator", ondelete="RESTRICT"),
        nullable=False,
    )
    request_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    request_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    reference: Mapped[str] = mapped_column(String(60), nullable=False)
    provider: Mapped[str] = mapped_column(String(16), nullable=False, server_default=text("'MOCK_QA'"))
    status: Mapped[str] = mapped_column(String(24), nullable=False, server_default=text("'ESPERANDO_PAGO'"))
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default=text("'ARS'"))
    subtotal_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    discount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    total_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    notes: Mapped[str] = mapped_column(String(500), nullable=False, server_default=text("''"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class QrPaymentIntentLine(Base):
    __tablename__ = "qr_payment_intent_lines"
    __table_args__ = (
        UniqueConstraint("intent_id", "line_number", name="uq_qr_intent_lines_number"),
        ForeignKeyConstraint(
            ["business_id", "intent_id"], ["qr_payment_intents.business_id", "qr_payment_intents.id"],
            name="fk_qr_intent_lines_tenant", ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["business_id", "catalog_item_id"], ["catalog_items.business_id", "catalog_items.id"],
            name="fk_qr_intent_lines_catalog_tenant", ondelete="RESTRICT",
        ),
        CheckConstraint("line_number BETWEEN 1 AND 30", name="ck_qr_intent_lines_number"),
        CheckConstraint("kind_snapshot IN ('BIEN','SERVICIO')", name="ck_qr_intent_lines_kind"),
        CheckConstraint("quantity_milli BETWEEN 1 AND 999999999", name="ck_qr_intent_lines_quantity"),
        CheckConstraint("unit_price_cents BETWEEN 0 AND 99999999999", name="ck_qr_intent_lines_unit_price"),
        CheckConstraint("line_total_cents BETWEEN 0 AND 99999999999", name="ck_qr_intent_lines_total"),
    )
    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    intent_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    catalog_item_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    description_snapshot: Mapped[str] = mapped_column(String(90), nullable=False)
    sku_snapshot: Mapped[str] = mapped_column(String(32), nullable=False, server_default=text("''"))
    kind_snapshot: Mapped[str] = mapped_column(String(8), nullable=False)
    unit_snapshot: Mapped[str] = mapped_column(String(16), nullable=False)
    quantity_milli: Mapped[int] = mapped_column(BigInteger, nullable=False)
    unit_price_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    line_total_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
