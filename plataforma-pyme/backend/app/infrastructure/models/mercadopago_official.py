"""B6: integración oficial TEST aislada de MerchantPaymentConnection MOCK_QA.

Tokens OAuth cifrados (Fernet en aplicación) y ningún token en API/UI.
"""
from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import (
    BigInteger, CheckConstraint, DateTime, ForeignKey, ForeignKeyConstraint,
    Index, Integer, String, Text, UniqueConstraint, Uuid, func,
)
from sqlalchemy.orm import Mapped, mapped_column
from app.infrastructure.models.base import Base


class MercadoPagoOAuthPending(Base):
    __tablename__ = "mp_oauth_pending"
    __table_args__ = (
        UniqueConstraint("state_hash", name="uq_mp_oauth_state_hash"),
        Index("ix_mp_oauth_pending_business", "business_id", "created_at"),
    )
    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("businesses.id", ondelete="RESTRICT"), nullable=False)
    actor_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    state_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    verifier_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class MercadoPagoTestAccount(Base):
    __tablename__ = "mp_test_accounts"
    __table_args__ = (
        UniqueConstraint("business_id", name="uq_mp_test_account_business"),
        UniqueConstraint("business_id", "id", name="uq_mp_test_account_tenant_id"),
        UniqueConstraint("mp_user_id", name="uq_mp_test_account_seller"),
        CheckConstraint("status IN ('ACTIVA','INACTIVA')", name="ck_mp_test_account_status"),
    )
    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("businesses.id", ondelete="RESTRICT"), nullable=False)
    mp_user_id: Mapped[str] = mapped_column(String(40), nullable=False)
    access_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    external_pos_id: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(12), nullable=False)
    updated_by_user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class MercadoPagoTestOrder(Base):
    __tablename__ = "mp_test_orders"
    __table_args__ = (
        ForeignKeyConstraint(["business_id", "source_intent_id"],
            ["qr_payment_intents.business_id", "qr_payment_intents.id"],
            name="fk_mp_order_qr_source", ondelete="RESTRICT"),
        ForeignKeyConstraint(["business_id", "account_id"],
            ["mp_test_accounts.business_id", "mp_test_accounts.id"],
            name="fk_mp_order_account_tenant", ondelete="RESTRICT"),
        UniqueConstraint("business_id", "source_intent_id", name="uq_mp_order_source_intent"),
        UniqueConstraint("business_id", "request_id", name="uq_mp_order_request"),
        UniqueConstraint("provider_order_id", name="uq_mp_order_provider_id"),
        UniqueConstraint("external_reference", name="uq_mp_order_external_ref"),
        UniqueConstraint("business_id", "sale_id", name="uq_mp_order_sale"),
        ForeignKeyConstraint(["business_id", "sale_id"], ["sales.business_id", "sales.id"],
            name="fk_mp_order_sale_tenant", ondelete="RESTRICT"),
        CheckConstraint("total_cents BETWEEN 1 AND 99999999999", name="ck_mp_order_total"),
        CheckConstraint("status IN ('PREPARANDO','INDETERMINADA','CREADA','PROCESADA',"
            "'CANCELADA','EXPIRADA','REEMBOLSADA','REQUIERE_REVISION')",
            name="ck_mp_order_status"),
    )
    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    source_intent_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    account_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    request_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    created_by_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    external_reference: Mapped[str] = mapped_column(String(64), nullable=False)
    external_pos_id: Mapped[str] = mapped_column(String(64), nullable=False)
    provider_order_id: Mapped[str | None] = mapped_column(String(90))
    payment_id: Mapped[str | None] = mapped_column(String(90))
    sale_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True))
    qr_data: Mapped[str | None] = mapped_column(Text)
    total_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False)
    provider_status_detail: Mapped[str | None] = mapped_column(String(60))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
