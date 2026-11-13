"""E3-2B B4: vinculación única y atómica de QR DEMO con venta QA."""
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    DateTime, ForeignKey, ForeignKeyConstraint, UniqueConstraint, Uuid, func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base


class QrPaymentSettlement(Base):
    __tablename__ = "qr_payment_settlements"
    __table_args__ = (
        ForeignKeyConstraint(
            ["business_id", "intent_id"],
            ["qr_payment_intents.business_id", "qr_payment_intents.id"],
            name="fk_qr_settlement_intent_tenant", ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["business_id", "sale_id"],
            ["sales.business_id", "sales.id"],
            name="fk_qr_settlement_sale_tenant", ondelete="RESTRICT",
        ),
        UniqueConstraint("business_id", "intent_id", name="uq_qr_settlement_intent"),
        UniqueConstraint("business_id", "sale_id", name="uq_qr_settlement_sale"),
    )
    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    intent_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    sale_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    finalized_by_user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id",
              name="fk_qr_settlement_finalized_by", ondelete="RESTRICT"), nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
