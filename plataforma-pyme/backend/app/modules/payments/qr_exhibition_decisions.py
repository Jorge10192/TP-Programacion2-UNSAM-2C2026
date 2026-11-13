"""Two opt-in decisions for the existing, non-payable main QR exhibition.

No payment provider calls. A simulated acceptance registers an internal QA
sale atomically; a rejection only closes the QR. All operations require an
authenticated company manager.
"""
from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.models import (
    MercadoPagoTestOrder, MpSharedQaOrder, QrPaymentEvent,
)
from app.modules.auth.tokens import now_utc
from app.modules.payments.qr_event_log import append_qr_event
from app.modules.payments.qr_exhibition import exhibition_decisions_enabled
from app.modules.payments.qr_service import QrIntentConflict, QrIntentNotFound
from app.modules.payments.qr_settlement_service import (
    QrFinalizationDisabled, QrSettlementService,
)
from app.modules.payments.qr_schemas import QrIntentView
from app.modules.sales.schemas import SaleView


@dataclass(frozen=True)
class ExhibitionDecisionResult:
    intent: QrIntentView
    sale: SaleView | None
    replayed: bool


class ExhibitionDecisionService:
    def __init__(self, db: Session):
        self.db = db
        self.settlement = QrSettlementService(db)

    def decide(
        self, actor: UUID, auth_session: UUID, business: UUID,
        intent_id: UUID, event_key: UUID, action: str,
    ) -> ExhibitionDecisionResult:
        if not exhibition_decisions_enabled():
            raise QrFinalizationDisabled()

        if action == "ACEPTAR":
            # Reuses the existing sale, immutable QR snapshot, stock controls,
            # deterministic key, one-to-one settlement, and single DB commit.
            settled = self.settlement.finalize(
                actor, auth_session, business, intent_id,
                exhibition_key=event_key,
            )
            return ExhibitionDecisionResult(
                settled.intent, settled.sale, settled.replayed,
            )

        if action != "RECHAZAR":
            raise QrIntentConflict()

        try:
            self.settlement._authorize(actor, auth_session, business, manager=True)
            intent = self.settlement.qr._lookup_by_id(
                business, intent_id, lock=True,
            )
            if intent is None or intent.provider != "MOCK_QA":
                raise QrIntentNotFound()
            if intent.status == "RECHAZADA":
                # Replaying the SAME actor and event cannot reject again.
                original = self.db.scalar(select(QrPaymentEvent.id).where(
                    QrPaymentEvent.business_id == business,
                    QrPaymentEvent.intent_id == intent_id,
                    QrPaymentEvent.event_key == event_key,
                    QrPaymentEvent.actor_id == actor,
                    QrPaymentEvent.action == "RECHAZAR",
                ).limit(1))
                if original is None:
                    raise QrIntentConflict()
                response = ExhibitionDecisionResult(
                    self.settlement.qr._view(intent), None, True,
                )
                self.db.rollback()
                return response

            if intent.status != "ESPERANDO_PAGO" or intent.expires_at <= now_utc():
                raise QrIntentConflict()
            # Never change an external-payment-backed QR.
            for remote in (MercadoPagoTestOrder, MpSharedQaOrder):
                found = self.db.scalar(select(remote.id).where(
                    remote.business_id == business,
                    remote.source_intent_id == intent_id,
                ).limit(1))
                if found is not None:
                    raise QrIntentConflict()

            intent.status = "RECHAZADA"
            self.db.flush()
            append_qr_event(
                self.db, intent, actor_id=actor, event_key=event_key,
                action="RECHAZAR", from_status="ESPERANDO_PAGO",
                to_status="RECHAZADA",
            )
            response = ExhibitionDecisionResult(
                self.settlement.qr._view(intent), None, False,
            )
            self.db.commit()
            return response
        except Exception:
            self.db.rollback()
            raise
