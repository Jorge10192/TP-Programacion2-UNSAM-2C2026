"""E3-2B B3: simulador de estados y trazabilidad, nunca fondos reales.

Para emitir eventos hace falta habilitación explícita de entorno QA y un
ADMINISTRADOR/TITULAR. El evento no crea ninguna Sale ni modifica inventario.
"""
import os
from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.models import QrPaymentEvent, QrPaymentIntent
from app.modules.auth.tokens import now_utc
from app.modules.payments.qr_event_log import append_qr_event
from app.modules.payments.qr_service import (
    QrIntentService, QrIntentNotFound, QrIntentConflict, QrIntentForbidden,
)
from app.modules.payments.qr_schemas import QrIntentView, QrPaymentEventView

_ACTION_TARGET = {
    "APROBAR": "APROBADA_DEMO",
    "RECHAZAR": "RECHAZADA",
    "EXPIRAR": "EXPIRADA",
    "INDETERMINAR": "INDETERMINADA",
}
_MANAGERS = {"TITULAR_ADMINISTRATIVO", "ADMINISTRADOR"}


class QrLabDisabled(Exception):
    pass


@dataclass(frozen=True)
class QrEventResult:
    intent: QrIntentView
    replayed: bool


def is_qr_lab_enabled() -> bool:
    return os.environ.get("PYME_ENABLE_QR_DEMO_LAB") == "1"


class QrEventService:
    def __init__(self, db: Session):
        self.db = db
        self.intents = QrIntentService(db)

    def _read_authorized(self, actor: UUID, session_id: UUID, business_id: UUID,
                         intent_id: UUID) -> QrPaymentIntent:
        # No revela información de otros tenants ni de usuarios operativos ajenos.
        _, member = self.intents._authorize(actor, session_id, business_id)
        intent = self.intents._lookup_by_id(business_id, intent_id)
        if intent is None or (
            member.role not in _MANAGERS and intent.created_by_id != actor
        ):
            raise QrIntentNotFound()
        return intent

    def list_events(self, actor: UUID, session_id: UUID, business_id: UUID,
                    intent_id: UUID) -> list[QrPaymentEventView]:
        try:
            self._read_authorized(actor, session_id, business_id, intent_id)
            rows = list(self.db.scalars(select(QrPaymentEvent).where(
                QrPaymentEvent.business_id == business_id,
                QrPaymentEvent.intent_id == intent_id,
            ).order_by(QrPaymentEvent.sequence.asc())).all())
            result = [QrPaymentEventView.model_validate(record) for record in rows]
            self.db.rollback()
            return result
        except Exception:
            self.db.rollback()
            raise

    def simulate(self, actor: UUID, session_id: UUID, business_id: UUID,
                 intent_id: UUID, event_key: UUID, action: str) -> QrEventResult:
        try:
            if not is_qr_lab_enabled():
                raise QrLabDisabled()
            company, member = self.intents._authorize(actor, session_id, business_id)
            # El laboratorio nunca se habilita para vendedores u otros empleados.
            if member.role not in _MANAGERS:
                raise QrIntentForbidden()
            intent = self.intents._lookup_by_id(business_id, intent_id, lock=True)
            if intent is None or intent.provider != "MOCK_QA":
                raise QrIntentNotFound()
            previous = self.db.scalar(select(QrPaymentEvent).where(
                QrPaymentEvent.business_id == business_id,
                QrPaymentEvent.intent_id == intent_id,
                QrPaymentEvent.event_key == event_key,
            ))
            if previous is not None:
                if previous.action != action or previous.actor_id != actor:
                    raise QrIntentConflict()
                result = self.intents._view(intent)
                self.db.rollback()
                return QrEventResult(result, replayed=True)
            if company.status != "ACTIVA":
                raise QrIntentConflict()
            if intent.status not in ("ESPERANDO_PAGO", "INDETERMINADA"):
                raise QrIntentConflict()
            if intent.expires_at <= now_utc() and action != "EXPIRAR":
                raise QrIntentConflict()
            if intent.status == "INDETERMINADA" and action == "INDETERMINAR":
                raise QrIntentConflict()

            next_state = _ACTION_TARGET[action]
            previous_state = intent.status
            intent.status = next_state
            self.db.flush()
            append_qr_event(
                self.db, intent, actor_id=actor, event_key=event_key,
                action=action, from_status=previous_state, to_status=next_state,
            )
            result = self.intents._view(intent)
            self.db.commit()
            return QrEventResult(result, replayed=False)
        except Exception:
            self.db.rollback()
            raise
