"""E3-2B B1: vinculación ficticia por empresa. Sin tokens ni cuentas bancarias."""
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, UniqueConstraint, Uuid, func, text
from sqlalchemy.orm import Mapped, mapped_column
from app.infrastructure.models.base import Base


class MerchantPaymentConnection(Base):
    __tablename__ = "merchant_payment_connections"
    __table_args__ = (
        UniqueConstraint("business_id", "provider", "mode", name="uq_payment_connection_tenant_provider_mode"),
        UniqueConstraint("mock_merchant_ref", name="uq_payment_connection_mock_ref"),
        CheckConstraint("provider = 'MERCADO_PAGO'", name="ck_payment_connection_provider"),
        CheckConstraint("mode = 'DEMO'", name="ck_payment_connection_mode"),
        CheckConstraint("status IN ('ACTIVA', 'INACTIVA')", name="ck_payment_connection_status"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("businesses.id", name="fk_payment_connection_business", ondelete="RESTRICT"), nullable=False
    )
    provider: Mapped[str] = mapped_column(String(24), nullable=False, server_default=text("'MERCADO_PAGO'"))
    mode: Mapped[str] = mapped_column(String(8), nullable=False, server_default=text("'DEMO'"))
    status: Mapped[str] = mapped_column(String(12), nullable=False, server_default=text("'ACTIVA'"))
    mock_merchant_name: Mapped[str] = mapped_column(String(120), nullable=False)
    mock_merchant_ref: Mapped[str] = mapped_column(String(64), nullable=False)
    updated_by_user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", name="fk_payment_connection_updated_by", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
