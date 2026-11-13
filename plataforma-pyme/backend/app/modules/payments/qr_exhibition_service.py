"""Two deliberate, fictional actions for public QR exhibition.

COBRAR reuses the existing atomic QR-to-sale pipeline. RECHAZAR closes
the exhibition without Sale or stock movement. Never contacts Mercado Pago.
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
from app.modules.payments.qr_exhibition import exhibition_simulation_enabled
from app.modules.payments.qr_service import QrIntentConflict, QrIntentNotFound
from app.modules.payments.qr_settlement_service import (
    QrFinalizationDisabled, QrSettlementService,
)
from app.modules.payments.qr_schemas import QrIntentView
from app.modules.sales.schemas import SaleView


@dataclass(frozen=True)
class QrExhibitionResult:
    intent: QrIntentView
    sale: SaleView | None
    replayed: bool


class QrExhibitionService:
    def __init__(self, db: Session):
        self.db = db
        self.settlement = QrSettlementService(db)

    def decide(
        self, actor: UUID, session: UUID, business: UUID,
        intent_id: UUID, event_key: UUID, action: str,
    ) -> QrExhibitionResult:
        if not exhibition_simulation_enabled():
            raise QrFinalizationDisabled()
        if action == "COBRAR":
            # Lock, approval event, sale, stock, settlement and FINALIZAR event
            # are committed together by the existing service. Replays return
            # the same Sale and cannot debit stock a second time.
            done = self.settlement.finalize(
                actor, session, business, intent_id,
                exhibition_event_key=event_key,
            )
            return QrExhibitionResult(done.intent, done.sale, done.replayed)
        if action != "RECHAZAR":
            raise QrIntentConflict()

        try:
            self.settlement._authorize(actor, session, business, manager=True)
            qr = self.settlement.qr._lookup_by_id(business, intent_id, lock=True)
            if qr is None or qr.provider != "MOCK_QA":
                raise QrIntentNotFound()
            # Same request/actor can recover a previously rejected QR.
            if qr.status == "RECHAZADA":
                previous = self.db.scalar(select(QrPaymentEvent).where(
                    QrPaymentEvent.business_id == business,
                    QrPaymentEvent.intent_id == intent_id,
                    QrPaymentEvent.event_key == event_key,
                    QrPaymentEvent.action == "RECHAZAR",
                    QrPaymentEvent.actor_id == actor,
                ))
                if previous is None:
                    raise QrIntentConflict()
                result = QrExhibitionResult(
                    self.settlement.qr._view(qr), None, True,
                )
                self.db.rollback()
                return result

            if qr.status != "ESPERANDO_PAGO" or qr.expires_at <= now_utc():
                raise QrIntentConflict()
            if self.db.scalar(select(MercadoPagoTestOrder.id).where(
                MercadoPagoTestOrder.business_id == business,
                MercadoPagoTestOrder.source_intent_id == intent_id,
            ).limit(1)) is not None:
                raise QrIntentConflict()
            if self.db.scalar(select(MpSharedQaOrder.id).where(
                MpSharedQaOrder.business_id == business,
                MpSharedQaOrder.source_intent_id == intent_id,
            ).limit(1)) is not None:
                raise QrIntentConflict()

            qr.status = "RECHAZADA"
            self.db.flush()
            append_qr_event(
                self.db, qr, actor_id=actor, event_key=event_key,
                action="RECHAZAR", from_status="ESPERANDO_PAGO",
                to_status="RECHAZADA",
            )
            result = QrExhibitionResult(self.settlement.qr._view(qr), None, False)
            self.db.commit()
            return result
        except Exception:
            self.db.rollback()
            raise
