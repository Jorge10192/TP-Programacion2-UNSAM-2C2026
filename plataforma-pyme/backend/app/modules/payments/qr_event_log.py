"""Anexar eventos QR únicamente dentro de la transacción y bajo bloqueo del intento."""
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.models import QrPaymentEvent, QrPaymentIntent


def append_qr_event(
    db: Session, intent: QrPaymentIntent, *, actor_id: UUID, event_key: UUID,
    action: str, from_status: str, to_status: str,
) -> QrPaymentEvent:
    last = db.scalar(
        select(QrPaymentEvent.sequence).where(
            QrPaymentEvent.business_id == intent.business_id,
            QrPaymentEvent.intent_id == intent.id,
        ).order_by(QrPaymentEvent.sequence.desc()).limit(1)
    )
    event = QrPaymentEvent(
        id=uuid4(), business_id=intent.business_id, intent_id=intent.id,
        event_key=event_key, sequence=(last or 0) + 1, action=action,
        from_status=from_status, to_status=to_status, actor_id=actor_id,
    )
    db.add(event)
    db.flush()
    return event
