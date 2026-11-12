"""E3-2B B2: creación y lectura de QR ficticio, sin mover stock ni crear Sale.

B3 agregará el simulador de eventos. B4 finalizará la venta con el servicio de
ventas. Nada de esta unidad puede aprobar pagos o acreditar dinero externo.
"""
import base64
from dataclasses import dataclass
from datetime import timedelta
from io import BytesIO
from uuid import UUID, uuid4, uuid5, NAMESPACE_URL

import qrcode
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.models import (
    CatalogItem, Location, LocationAssignment, MerchantPaymentConnection,
    QrPaymentIntent, QrPaymentIntentLine, StockBalance,
)
from app.modules.auth.tokens import now_utc
from app.modules.locations.permissions import can_operate_at_location
from app.modules.purchases.schemas import line_total_cents
from app.modules.sales.service import SaleService
from app.modules.payments.qr_schemas import CreateQrIntentRequest, QrIntentLineView, QrIntentView
from app.modules.payments.qr_event_log import append_qr_event


class QrIntentNotFound(Exception):
    pass


class QrIntentConflict(Exception):
    pass


class QrIntentInvalid(Exception):
    pass


class QrIntentForbidden(Exception):
    pass


class QrIntentNoConnection(Exception):
    pass


class QrIntentNoStock(Exception):
    pass


@dataclass(frozen=True)
class QrCreated:
    body: QrIntentView
    replayed: bool


def render_demo_qr_data_uri(reference: str) -> str:
    """Código QR legible, con texto DEMO inocuo; NO es qr_data del proveedor."""
    code = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=6, border=4)
    code.add_data("PYME-DEMO-QR:" + reference)
    code.make(fit=True)
    buffer = BytesIO()
    code.make_image(fill_color="black", back_color="white").save(buffer, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")


class QrIntentService:
    def __init__(self, db: Session):
        self.db = db

    def _authorize(self, actor_id: UUID, session_id: UUID, business_id: UUID):
        # Reutiliza exactamente las comprobaciones de sesión y membresía REAL.
        return SaleService(self.db)._authorize(actor_id, session_id, business_id)

    def _for_reader(self, actor_id: UUID, session_id: UUID, business_id: UUID,
                    row: QrPaymentIntent) -> None:
        _, member = self._authorize(actor_id, session_id, business_id)
        if member.role not in ("TITULAR_ADMINISTRATIVO", "ADMINISTRADOR") and row.created_by_id != actor_id:
            raise QrIntentNotFound()

    def _lookup_by_id(self, business_id: UUID, intent_id: UUID, *, lock=False):
        query = select(QrPaymentIntent).where(
            QrPaymentIntent.business_id == business_id, QrPaymentIntent.id == intent_id,
        )
        if lock:
            query = query.with_for_update().execution_options(populate_existing=True)
        return self.db.scalar(query)

    def _view(self, row: QrPaymentIntent) -> QrIntentView:
        lines = self.db.scalars(select(QrPaymentIntentLine).where(
            QrPaymentIntentLine.business_id == row.business_id,
            QrPaymentIntentLine.intent_id == row.id,
        ).order_by(QrPaymentIntentLine.line_number)).all()
        current_state = "EXPIRADA" if row.status == "ESPERANDO_PAGO" and row.expires_at <= now_utc() else row.status
        return QrIntentView(
            id=row.id, business_id=row.business_id, location_id=row.location_id,
            request_id=row.request_id, provider="MOCK_QA", status=current_state,
            currency="ARS", reference=row.reference, subtotal_cents=row.subtotal_cents,
            discount_cents=row.discount_cents, total_cents=row.total_cents, notes=row.notes,
            created_at=row.created_at, expires_at=row.expires_at,
            qr_png_data_uri=render_demo_qr_data_uri(row.reference),
            lines=[QrIntentLineView.model_validate(line) for line in lines],
        )

    def create(self, actor_id: UUID, session_id: UUID, business_id: UUID,
               request_id: UUID, command: CreateQrIntentRequest) -> QrCreated:
        try:
            company, member = self._authorize(actor_id, session_id, business_id)
            existing = self.db.scalar(select(QrPaymentIntent).where(
                QrPaymentIntent.business_id == business_id, QrPaymentIntent.request_id == request_id,
            ))
            digest = command.payload_digest()
            if existing is not None:
                if existing.request_sha256 != digest or existing.created_by_id != actor_id:
                    raise QrIntentConflict()
                result = self._view(existing)
                self.db.rollback()
                return QrCreated(result, replayed=True)
            if company.status != "ACTIVA":
                raise QrIntentConflict()
            connection = self.db.scalar(select(MerchantPaymentConnection).where(
                MerchantPaymentConnection.business_id == business_id,
                MerchantPaymentConnection.provider == "MERCADO_PAGO",
                MerchantPaymentConnection.mode == "DEMO",
                MerchantPaymentConnection.status == "ACTIVA",
            ))
            if connection is None:
                raise QrIntentNoConnection()

            location = None
            assignment_status = None
            if command.location_id is not None:
                location = self.db.scalar(select(Location).where(
                    Location.business_id == business_id, Location.id == command.location_id,
                ).with_for_update().execution_options(populate_existing=True))
                if location is None:
                    raise QrIntentInvalid()
                assignment = self.db.scalar(select(LocationAssignment).where(
                    LocationAssignment.business_id == business_id,
                    LocationAssignment.location_id == location.id,
                    LocationAssignment.user_id == actor_id,
                ))
                assignment_status = assignment.status if assignment else None
                if not can_operate_at_location(
                    role=member.role, membership_status=member.status,
                    business_status=company.status, location_status=location.status,
                    can_sell=location.can_sell, can_store=location.can_store,
                    assignment_status=assignment_status, operation="SELL",
                ):
                    raise QrIntentForbidden()
            elif member.role not in ("TITULAR_ADMINISTRATIVO", "ADMINISTRADOR"):
                raise QrIntentForbidden()

            ids = sorted({line.catalog_item_id for line in command.lines}, key=str)
            records = self.db.scalars(select(CatalogItem).where(
                CatalogItem.business_id == business_id, CatalogItem.id.in_(ids),
            ).order_by(CatalogItem.id).with_for_update(read=True).execution_options(populate_existing=True)).all()
            items = {item.id: item for item in records}
            if len(items) != len(ids):
                raise QrIntentInvalid()
            is_manager = member.role in ("TITULAR_ADMINISTRATIVO", "ADMINISTRADOR")
            if not is_manager and command.discount_cents:
                raise QrIntentForbidden()
            for line in command.lines:
                item = items[line.catalog_item_id]
                if item.status != "ACTIVO" or not item.sellable:
                    raise QrIntentInvalid()
                if item.unit in ("UNIDAD", "PAQUETE", "CAJA", "SERVICIO") and line.quantity_milli % 1000:
                    raise QrIntentInvalid()
                if not is_manager and (item.price_cents is None or line.unit_price_cents != item.price_cents):
                    raise QrIntentForbidden()
                if item.item_type == "BIEN":
                    if location is None or not location.can_store:
                        raise QrIntentInvalid()
                    if not can_operate_at_location(
                        role=member.role, membership_status=member.status,
                        business_status=company.status, location_status=location.status,
                        can_sell=location.can_sell, can_store=location.can_store,
                        assignment_status=assignment_status, operation="STORE",
                    ):
                        raise QrIntentForbidden()
                    balance = self.db.scalar(select(StockBalance).where(
                        StockBalance.business_id == business_id,
                        StockBalance.location_id == location.id,
                        StockBalance.catalog_item_id == item.id,
                    ).with_for_update(read=True).execution_options(populate_existing=True))
                    if balance is None or balance.quantity_milli < line.quantity_milli:
                        raise QrIntentNoStock()

            subtotal = sum(line_total_cents(line.quantity_milli, line.unit_price_cents) for line in command.lines)
            # created_at fijo para que expires_at > created_at incluso en transacciones largas.
            created = now_utc()
            intent = QrPaymentIntent(
                id=uuid4(), business_id=business_id, merchant_connection_id=connection.id,
                location_id=location.id if location else None,
                created_by_id=actor_id, request_id=request_id, request_sha256=digest,
                reference="PYME-DEMO-" + uuid4().hex.upper(),
                provider="MOCK_QA", status="ESPERANDO_PAGO", currency="ARS",
                subtotal_cents=subtotal, discount_cents=command.discount_cents,
                total_cents=subtotal - command.discount_cents, notes=command.notes,
                created_at=created, expires_at=created + timedelta(minutes=15),
            )
            self.db.add(intent)
            self.db.flush()
            self.db.add_all([
                QrPaymentIntentLine(
                    id=uuid4(), business_id=business_id, intent_id=intent.id,
                    line_number=n, catalog_item_id=line.catalog_item_id,
                    description_snapshot=items[line.catalog_item_id].name,
                    sku_snapshot=items[line.catalog_item_id].sku or "",
                    kind_snapshot=items[line.catalog_item_id].item_type,
                    unit_snapshot=items[line.catalog_item_id].unit,
                    quantity_milli=line.quantity_milli, unit_price_cents=line.unit_price_cents,
                    line_total_cents=line_total_cents(line.quantity_milli, line.unit_price_cents),
                ) for n, line in enumerate(command.lines, 1)
            ])
            self.db.flush()
            append_qr_event(self.db, intent, actor_id=actor_id, event_key=request_id,
                            action='CREAR', from_status='SIN_ESTADO', to_status='ESPERANDO_PAGO')
            result = self._view(intent)
            self.db.commit()
            return QrCreated(result, replayed=False)
        except Exception:
            self.db.rollback()
            raise

    def get(self, actor_id: UUID, session_id: UUID, business_id: UUID, intent_id: UUID) -> QrIntentView:
        try:
            row = self._lookup_by_id(business_id, intent_id)
            if row is None:
                # Se exige identidad y membresía aún si el recurso no existe.
                self._authorize(actor_id, session_id, business_id)
                raise QrIntentNotFound()
            self._for_reader(actor_id, session_id, business_id, row)
            result = self._view(row)
            self.db.rollback()
            return result
        except Exception:
            self.db.rollback()
            raise

    def by_request(self, actor_id: UUID, session_id: UUID, business_id: UUID,
                   request_id: UUID) -> QrIntentView:
        try:
            self._authorize(actor_id, session_id, business_id)
            row = self.db.scalar(select(QrPaymentIntent).where(
                QrPaymentIntent.business_id == business_id,
                QrPaymentIntent.request_id == request_id,
                QrPaymentIntent.created_by_id == actor_id,
            ))
            if row is None:
                raise QrIntentNotFound()
            result = self._view(row)
            self.db.rollback()
            return result
        except Exception:
            self.db.rollback()
            raise

    def cancel(self, actor_id: UUID, session_id: UUID, business_id: UUID,
               intent_id: UUID) -> QrIntentView:
        try:
            company, member = self._authorize(actor_id, session_id, business_id)
            row = self._lookup_by_id(business_id, intent_id, lock=True)
            if row is None or (row.created_by_id != actor_id and member.role not in ("TITULAR_ADMINISTRATIVO", "ADMINISTRADOR")):
                raise QrIntentNotFound()
            if row.status == "CANCELADA":
                result = self._view(row)
                self.db.rollback()
                return result
            if row.status != "ESPERANDO_PAGO" or row.expires_at <= now_utc():
                raise QrIntentConflict()
            # B2: no hay orden remota, pago ni venta que compensar.
            row.status = "CANCELADA"
            self.db.flush()
            append_qr_event(self.db, row, actor_id=actor_id,
                            event_key=uuid5(NAMESPACE_URL, 'qr-cancel:' + str(row.id)),
                            action='CANCELAR', from_status='ESPERANDO_PAGO', to_status='CANCELADA')
            result = self._view(row)
            self.db.commit()
            return result
        except Exception:
            self.db.rollback()
            raise
