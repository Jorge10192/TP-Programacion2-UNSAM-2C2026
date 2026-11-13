"""B7-B: caja Mercado Pago QA global, órdenes inmutables por tenant."""
from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, ForeignKeyConstraint, Integer, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column
from app.infrastructure.models.base import Base


class MpSharedQaBox(Base):
    __tablename__ = "mp_shared_qa_box"
    __table_args__ = (CheckConstraint("id = 1", name="ck_mp_shared_box_singleton"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    active_order_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True))


class MpSharedQaOrder(Base):
    __tablename__ = "mp_shared_qa_orders"
    __table_args__ = (
        ForeignKeyConstraint(["business_id", "source_intent_id"],
            ["qr_payment_intents.business_id", "qr_payment_intents.id"],
            name="fk_mp_shared_order_intent", ondelete="RESTRICT"),
        ForeignKeyConstraint(["business_id", "sale_id"],
            ["sales.business_id", "sales.id"],
            name="fk_mp_shared_order_sale", ondelete="RESTRICT"),
        UniqueConstraint("business_id", "source_intent_id", name="uq_mp_shared_order_source"),
        UniqueConstraint("business_id", "request_id", name="uq_mp_shared_order_request"),
        UniqueConstraint("provider_order_id", name="uq_mp_shared_order_provider"),
        UniqueConstraint("external_reference", name="uq_mp_shared_order_reference"),
        UniqueConstraint("business_id", "sale_id", name="uq_mp_shared_order_sale"),
        CheckConstraint("total_cents BETWEEN 1 AND 99999999999", name="ck_mp_shared_amount"),
        CheckConstraint("status IN ('PREPARANDO','INDETERMINADA','CREADA','PROCESADA',"
                        "'CANCELADA','EXPIRADA','REEMBOLSADA','REQUIERE_REVISION')",
                        name="ck_mp_shared_status"),
    )
    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    source_intent_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    request_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    created_by_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    external_reference: Mapped[str] = mapped_column(String(64), nullable=False)
    provider_order_id: Mapped[str | None] = mapped_column(String(90))
    payment_id: Mapped[str | None] = mapped_column(String(90))
    sale_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True))
    total_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False)
    provider_status_detail: Mapped[str | None] = mapped_column(String(60))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
