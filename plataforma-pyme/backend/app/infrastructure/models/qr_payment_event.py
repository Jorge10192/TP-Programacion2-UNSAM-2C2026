"""E3-2B B3: bitácora inmutable de transiciones de cobro ficticio."""
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint, DateTime, ForeignKey, ForeignKeyConstraint, Integer,
    String, UniqueConstraint, Uuid, func,
)
from sqlalchemy.orm import Mapped, mapped_column
from app.infrastructure.models.base import Base


class QrPaymentEvent(Base):
    __tablename__ = "qr_payment_events"
    __table_args__ = (
        ForeignKeyConstraint(
            ["business_id", "intent_id"],
            ["qr_payment_intents.business_id", "qr_payment_intents.id"],
            name="fk_qr_event_intent_tenant", ondelete="RESTRICT",
        ),
        UniqueConstraint("business_id", "intent_id", "sequence", name="uq_qr_events_sequence"),
        UniqueConstraint("business_id", "intent_id", "event_key", name="uq_qr_events_idempotency"),
        CheckConstraint("sequence >= 1", name="ck_qr_events_sequence"),
        CheckConstraint(
            "action IN ('CREAR','CANCELAR','APROBAR','RECHAZAR','EXPIRAR','INDETERMINAR')",
            name="ck_qr_events_action",
        ),
        CheckConstraint(
            "from_status IN ('SIN_ESTADO','ESPERANDO_PAGO','CANCELADA','EXPIRADA',"
            "'APROBADA_DEMO','RECHAZADA','INDETERMINADA','REQUIERE_REVISION','FINALIZADA')",
            name="ck_qr_events_from_status",
        ),
        CheckConstraint(
            "to_status IN ('ESPERANDO_PAGO','CANCELADA','EXPIRADA','APROBADA_DEMO',"
            "'RECHAZADA','INDETERMINADA','REQUIERE_REVISION','FINALIZADA')",
            name="ck_qr_events_to_status",
        ),
    )
    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    intent_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    event_key: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    action: Mapped[str] = mapped_column(String(16), nullable=False)
    from_status: Mapped[str] = mapped_column(String(24), nullable=False)
    to_status: Mapped[str] = mapped_column(String(24), nullable=False)
    actor_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", name="fk_qr_events_actor", ondelete="RESTRICT"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
