"""E3-2B B4: transacción QR DEMO → venta QA + stock + vínculo único.

Un QR ficticio APROBADA_DEMO no constituye acreditación Mercado Pago.
Solo la acción administrativa en una base descartable puede cerrar una Sale.
"""
import os
from hashlib import sha256
from dataclasses import dataclass
from uuid import UUID, NAMESPACE_URL, uuid4, uuid5

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.models import (
    QrPaymentEvent, QrPaymentIntent, QrPaymentIntentLine, QrPaymentSettlement,
    Sale, SaleLine, MercadoPagoTestOrder, MpSharedQaOrder,
)
from app.modules.payments.qr_event_log import append_qr_event
from app.modules.payments.qr_exhibition import exhibition_simulation_enabled
from app.modules.auth.tokens import now_utc
from app.modules.payments.qr_service import (
    QrIntentService, QrIntentConflict, QrIntentForbidden, QrIntentNotFound,
)
from app.modules.payments.qr_schemas import QrIntentView
from app.modules.sales.schemas import CreateSaleRequest, SaleView
from app.modules.sales.service import (
    SaleService, SaleInsufficientStock, SaleInvalidReference,
    SaleLocationNotEnabled, SaleMissingCatalogPrice, SalePermissionDenied,
)

MANAGER_ROLES = frozenset(("TITULAR_ADMINISTRATIVO", "ADMINISTRADOR"))


class QrFinalizationDisabled(Exception):
    pass


class QrFinalizationNeedsReview(Exception):
    pass


@dataclass(frozen=True)
class QrSettlementView:
    intent: QrIntentView
    sale: SaleView
    replayed: bool


def qr_finalization_enabled() -> bool:
    # Doble guardia server-side: nunca activar sobre la base cotidiana.
    return (
        os.environ.get("PYME_ENABLE_QR_DEMO_LAB") == "1"
        and os.environ.get("PYME_DISPOSABLE_QA") == "1"
    )


def sale_key_for_intent(business_id: UUID, intent_id: UUID) -> UUID:
    # Identidad determinística 1:1, única para QR mock de este tenant.
    digest = sha256(f"pyme/e3-b4/demo-sale/{business_id}/{intent_id}".encode("utf-8")).digest()
    # RFC4122 v4 bits, determinístico para este intento; compatible con GET /sales/by-request.
    return UUID(bytes=digest[:16], version=4)


class QrSettlementService:
    def __init__(self, db: Session):
        self.db = db
        self.qr = QrIntentService(db)
        self.sales = SaleService(db)

    def _authorize(self, actor: UUID, session: UUID, business: UUID, *, manager: bool):
        company, member = self.qr._authorize(actor, session, business)
        if manager and (member.role not in MANAGER_ROLES or company.status != "ACTIVA"):
            raise QrIntentForbidden()
        return member

    def _link(self, business: UUID, intent_id: UUID) -> QrPaymentSettlement | None:
        return self.db.scalar(select(QrPaymentSettlement).where(
            QrPaymentSettlement.business_id == business,
            QrPaymentSettlement.intent_id == intent_id,
        ))

    def _sale_view(self, business: UUID, sale_id: UUID) -> SaleView:
        row = self.db.scalar(select(Sale).where(
            Sale.business_id == business, Sale.id == sale_id,
        ))
        if row is None:
            raise QrIntentConflict()
        return self.sales._view(row)

    def _snapshot_command(self, business: UUID, intent: QrPaymentIntent) -> tuple[CreateSaleRequest, list[QrPaymentIntentLine]]:
        lines = list(self.db.scalars(select(QrPaymentIntentLine).where(
            QrPaymentIntentLine.business_id == business,
            QrPaymentIntentLine.intent_id == intent.id,
        ).order_by(QrPaymentIntentLine.line_number)).all())
        if not lines or len(lines) > 30 or [l.line_number for l in lines] != list(range(1, len(lines)+1)):
            raise QrIntentConflict()
        command = CreateSaleRequest.model_validate({
            "location_id": intent.location_id, "discount_cents": intent.discount_cents,
            "notes": intent.notes,
            "lines": [
                {"catalog_item_id": row.catalog_item_id,
                 "quantity_milli": row.quantity_milli,
                 "unit_price_cents": row.unit_price_cents}
                for row in lines
            ],
            # Internamente se utiliza un pago declarado para validar totales.
            # El servicio de venta lo graba exclusivamente como DEMO_QA.
            "payments": [
                {"method": "MERCADO_PAGO_DECLARADO", "amount_cents": intent.total_cents,
                 "reference": intent.reference}
            ],
        })
        if (
            sum(x.line_total_cents for x in lines) != intent.subtotal_cents
            or command.discount_cents + intent.total_cents != intent.subtotal_cents
        ):
            raise QrIntentConflict()
        return command, lines

    def finalize(self, actor: UUID, session: UUID, business: UUID, intent_id: UUID, *,
                 exhibition_event_key: UUID | None = None) -> QrSettlementView:
        """Register one internal simulated sale; approval and stock commit atomically.

        exhibition_event_key selects the strictly separate public exhibition path.
        Legacy QR lab finalization remains gated to a disposable database.
        """
        try:
            if exhibition_event_key is not None:
                if not exhibition_simulation_enabled():
                    raise QrFinalizationDisabled()
            elif not qr_finalization_enabled():
                raise QrFinalizationDisabled()
            self._authorize(actor, session, business, manager=True)
            intent = self.qr._lookup_by_id(business, intent_id, lock=True)
            if intent is None or intent.provider != "MOCK_QA":
                raise QrIntentNotFound()

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
            link = self._link(business, intent_id)
            if link is not None:
                if intent.status != "FINALIZADA":
                    raise QrIntentConflict()
                response = QrSettlementView(
                    intent=self.qr._view(intent),
                    sale=self._sale_view(business, link.sale_id),
                    replayed=True,
                )
                self.db.rollback()
                return response

            if exhibition_event_key is not None:
                if intent.status != "ESPERANDO_PAGO" or intent.expires_at <= now_utc():
                    raise QrIntentConflict()
                intent.status = "APROBADA_DEMO"
                self.db.flush()
                append_qr_event(
                    self.db, intent, actor_id=actor, event_key=exhibition_event_key,
                    action="APROBAR", from_status="ESPERANDO_PAGO",
                    to_status="APROBADA_DEMO",
                )

            if intent.status == "REQUIERE_REVISION":
                raise QrFinalizationNeedsReview()
            if intent.status != "APROBADA_DEMO":
                raise QrIntentConflict()
            approved = self.db.scalar(select(QrPaymentEvent.id).where(
                QrPaymentEvent.business_id == business,
                QrPaymentEvent.intent_id == intent_id,
                QrPaymentEvent.action == "APROBAR",
                QrPaymentEvent.to_status == "APROBADA_DEMO",
            ).limit(1))
            if approved is None:
                raise QrIntentConflict()

            command, original_lines = self._snapshot_command(business, intent)
            sale_key = sale_key_for_intent(business, intent_id)
            created = self.sales.create(
                actor, session, business, sale_key, command,
                commit=False, trusted_qr_demo=True,
            )
            if created.replayed:
                raise QrIntentConflict()
            sale_id = created.body.id
            sale_row = self.db.scalar(select(Sale).where(
                Sale.business_id == business, Sale.id == sale_id,
            ))
            if sale_row is None:
                raise QrIntentConflict()

            # El comprobante conserva los nombres y unidades del QR original,
            # aunque el catálogo haya cambiado entre B2 y B4.
            sale_lines = list(self.db.scalars(select(SaleLine).where(
                SaleLine.business_id == business, SaleLine.sale_id == sale_id,
            ).order_by(SaleLine.line_number)).all())
            if len(sale_lines) != len(original_lines):
                raise QrIntentConflict()
            for sold, original in zip(sale_lines, original_lines):
                if (
                    sold.line_number != original.line_number
                    or sold.catalog_item_id != original.catalog_item_id
                    or sold.quantity_milli != original.quantity_milli
                    or sold.unit_price_cents != original.unit_price_cents
                    or sold.line_total_cents != original.line_total_cents
                    or sold.kind_snapshot != original.kind_snapshot
                    or sold.unit_snapshot != original.unit_snapshot
                ):
                    raise QrIntentConflict()
                sold.description_snapshot = original.description_snapshot
                sold.sku_snapshot = original.sku_snapshot

            link = QrPaymentSettlement(
                id=uuid4(), business_id=business, intent_id=intent.id,
                sale_id=sale_id, finalized_by_user_id=actor,
            )
            self.db.add(link)
            intent.status = "FINALIZADA"
            self.db.flush()
            append_qr_event(
                self.db, intent, actor_id=actor,
                event_key=uuid5(NAMESPACE_URL, "pyme/e3-b4/finalize-event/" + str(intent.id)),
                action="FINALIZAR", from_status="APROBADA_DEMO", to_status="FINALIZADA",
            )
            self.db.flush()
            result = QrSettlementView(
                intent=self.qr._view(intent),
                sale=self.sales._view(sale_row),
                replayed=False,
            )
            # ÚNICO commit: Sale + SaleLines + SalePayment DEMO + Stock + movimientos
            # + settlement + estado y evento QR.
            self.db.commit()
            return result
        except (SaleInsufficientStock, SaleInvalidReference, SaleLocationNotEnabled,
                SaleMissingCatalogPrice, SalePermissionDenied) as error:
            self.db.rollback()
            if exhibition_event_key is None:
                self._mark_needs_review(actor, session, business, intent_id)
            # Exhibition mode rolls back approval + sale + stock together, so
            # an insufficient balance is safely retryable after restocking.
            raise QrFinalizationNeedsReview() from error
        except Exception:
            self.db.rollback()
            raise

    def _mark_needs_review(self, actor: UUID, session: UUID, business: UUID, intent_id: UUID):
        # Segunda transacción solo si la primera falló: nunca se conserva
        # una Sale fallida. El intent sigue bloqueado por turno.
        try:
            self._authorize(actor, session, business, manager=True)
            row = self.qr._lookup_by_id(business, intent_id, lock=True)
            if row is None:
                raise QrIntentNotFound()
            if row.status == "FINALIZADA":
                # Otro request ganó la carrera; el GET permite recuperarlo.
                self.db.rollback()
                return
            if row.status != "APROBADA_DEMO" or self._link(business, intent_id):
                raise QrIntentConflict()
            row.status = "REQUIERE_REVISION"
            self.db.flush()
            append_qr_event(
                self.db, row, actor_id=actor,
                event_key=uuid5(NAMESPACE_URL, "pyme/e3-b4/review-event/" + str(row.id)),
                action="REVISION", from_status="APROBADA_DEMO",
                to_status="REQUIERE_REVISION",
            )
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

    def receipt(self, actor: UUID, session: UUID, business: UUID,
                intent_id: UUID) -> SaleView:
        try:
            _, member = self.qr._authorize(actor, session, business)
            intent = self.qr._lookup_by_id(business, intent_id)
            if intent is None or (
                member.role not in MANAGER_ROLES and intent.created_by_id != actor
            ):
                raise QrIntentNotFound()
            link = self._link(business, intent_id)
            if link is None or intent.status != "FINALIZADA":
                raise QrIntentNotFound()
            # Reutilizar lectura de ventas REAL, incluida la sede del colaborador.
            self.db.rollback()
            return self.sales.get(actor, session, business, link.sale_id)
        except Exception:
            self.db.rollback()
            raise
