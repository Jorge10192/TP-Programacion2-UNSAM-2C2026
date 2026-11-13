"""E3-2C B7-B: una caja TEST compartida y órdenes QR static por tenant.

El POS no envía precio, vendedor, token ni caja: se consume el snapshot
persistido, se reserva el único candado PostgreSQL y se usa Orders API.
Nunca confirmar venta por la imagen QR, el POST o el webhook sin GET remoto.
"""
import hashlib
from datetime import timedelta
from uuid import UUID, uuid4, uuid5, NAMESPACE_URL

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.models import (
    MpSharedQaBox, MpSharedQaOrder, MercadoPagoTestOrder, QrPaymentSettlement,
    QrPaymentIntent, QrPaymentEvent, Sale, SaleLine,
)
from app.modules.auth.tokens import now_utc
from app.modules.payments.mp_shared_qa_config import (
    MERCHANT_ID, EXTERNAL_POS_ID, STATIC_QR, qa_token,
)
from app.modules.payments.mp_official_client import (
    MercadoPagoTransport, MpIntegrityError, MpProviderFailure,
    validate_order, render_official_test_qr,
)
from app.modules.payments.mp_official_service import MpOfficialService, MpMissing, MpConflict, MANAGERS
from app.modules.payments.qr_service import QrIntentService
from app.modules.payments.qr_settlement_service import QrSettlementService
from app.modules.sales.schemas import CreateSaleRequest
from app.modules.sales.service import (
    SaleService, SaleInsufficientStock, SaleInvalidReference,
    SaleLocationNotEnabled, SaleMissingCatalogPrice, SalePermissionDenied,
)

_TERMINAL = frozenset(("PROCESADA","CANCELADA","EXPIRADA","REEMBOLSADA","REQUIERE_REVISION"))
_MP_STATUS = {"created":"CREADA","processed":"PROCESADA",
              "canceled":"CANCELADA","expired":"EXPIRADA","refunded":"REEMBOLSADA"}


class MpSharedQaService:
    def __init__(self, db: Session, transport: MercadoPagoTransport | None = None):
        self.db = db
        self.transport = transport or MercadoPagoTransport()
        self.qr = QrIntentService(db)

    def _authorize(self, actor: UUID, session: UUID, business: UUID, *, manager=False):
        company, member = self.qr._authorize(actor, session, business)
        if company.status != "ACTIVA":
            raise MpConflict()
        if manager and member.role not in MANAGERS:
            from app.modules.payments.mp_official_service import MpForbidden
            raise MpForbidden()
        return member

    def _gate(self):
        gate = self.db.scalar(select(MpSharedQaBox).where(
            MpSharedQaBox.id == 1
        ).with_for_update().execution_options(populate_existing=True))
        if gate is None:
            raise MpIntegrityError()
        return gate

    def _order(self, business: UUID, order_id: UUID, *, lock=False):
        query = select(MpSharedQaOrder).where(
            MpSharedQaOrder.business_id == business,
            MpSharedQaOrder.id == order_id,
        )
        if lock:
            query = query.with_for_update().execution_options(populate_existing=True)
        return self.db.scalar(query)

    def _authorized_order(self, actor, session, business, order_id, *, manager=False):
        member = self._authorize(actor, session, business, manager=manager)
        row = self._order(business, order_id)
        if row is None or (member.role not in MANAGERS and row.created_by_id != actor):
            raise MpMissing()
        return row

    def _seller(self, token: str):
        payload = self.transport.seller(token=token)
        if not isinstance(payload, dict) or str(payload.get("id")) != MERCHANT_ID or payload.get("site_id") != "MLA":
            raise MpIntegrityError()

    @staticmethod
    def view(row: MpSharedQaOrder) -> dict:
        return {
            "id": row.id,
            "business_id": row.business_id,
            "source_intent_id": row.source_intent_id,
            "provider_order_id": row.provider_order_id,
            "status": row.status,
            "provider_status_detail": row.provider_status_detail,
            "external_reference": row.external_reference,
            "total_cents": row.total_cents,
            "created_at": row.created_at,
            "qr_png_data_uri": (render_official_test_qr(STATIC_QR) if row.status == "CREADA" else None),
            "test_only": True,
            "sale_registered": row.sale_id is not None,
            "sale_id": row.sale_id,
            "shared_box": True,
        }

    def by_source(self, actor, session, business, source_id):
        try:
            member = self._authorize(actor, session, business)
            source = self.qr._lookup_by_id(business, source_id)
            if source is None or (member.role not in MANAGERS and source.created_by_id != actor):
                raise MpMissing()
            row = self.db.scalar(select(MpSharedQaOrder).where(
                MpSharedQaOrder.business_id == business,
                MpSharedQaOrder.source_intent_id == source_id,
            ))
            return self.view(row) if row else None
        finally:
            self.db.rollback()

    def read(self, actor, session, business, order_id):
        try:
            row = self._authorized_order(actor, session, business, order_id)
            return self.view(row)
        finally:
            self.db.rollback()

    def create(self, actor: UUID, session: UUID, business: UUID,
               source_id: UUID, request_id: UUID) -> dict:
        token = qa_token()
        # Si el token pertenece a otro vendedor, no se reserva ni se crea orden.
        self._seller(token)
        try:
            member = self._authorize(actor, session, business)
            source = self.qr._lookup_by_id(business, source_id, lock=True)
            if source is None or (member.role not in MANAGERS and source.created_by_id != actor):
                raise MpMissing()
            if source.provider != "MOCK_QA" or source.request_id != request_id:
                raise MpConflict()
            # Una orden por QR original: jamás asociar también una orden B6,
            # un pago simulado o un cierre QA ficticio.
            if self.db.scalar(select(MercadoPagoTestOrder.id).where(
                MercadoPagoTestOrder.business_id == business,
                MercadoPagoTestOrder.source_intent_id == source_id,
            ).limit(1)) is not None or self.db.scalar(select(QrPaymentSettlement.id).where(
                QrPaymentSettlement.business_id == business,
                QrPaymentSettlement.intent_id == source_id,
            ).limit(1)) is not None or self.db.scalar(select(QrPaymentEvent.id).where(
                QrPaymentEvent.business_id == business,
                QrPaymentEvent.intent_id == source_id,
                QrPaymentEvent.action.in_(("APROBAR","RECHAZAR","EXPIRAR","INDETERMINAR","FINALIZAR")),
            ).limit(1)) is not None:
                raise MpConflict()
            gate = self._gate()
            existing = self.db.scalar(select(MpSharedQaOrder).where(
                MpSharedQaOrder.business_id == business,
                MpSharedQaOrder.source_intent_id == source_id,
            ).with_for_update().execution_options(populate_existing=True))
            if existing:
                if existing.request_id != request_id or existing.created_by_id != actor:
                    raise MpConflict()
                if existing.status not in ("PREPARANDO","INDETERMINADA"):
                    result = self.view(existing)
                    self.db.rollback()
                    return result
                if gate.active_order_id != existing.id:
                    raise MpIntegrityError()
                if existing.status == "PREPARANDO" and existing.created_at + timedelta(minutes=1) > now_utc():
                    result = self.view(existing)
                    self.db.rollback()
                    return result
                if existing.created_at + timedelta(hours=23) <= now_utc():
                    raise MpConflict()  # Fuera de ventana de idempotencia: revisión humana.
                record = existing
            else:
                if source.status != "ESPERANDO_PAGO" or source.expires_at <= now_utc():
                    raise MpConflict()
                if gate.active_order_id is not None:
                    raise MpConflict()  # Otra empresa aún tiene la única caja.
                record = MpSharedQaOrder(
                    id=uuid4(), business_id=business, source_intent_id=source_id,
                    request_id=request_id, created_by_id=actor,
                    external_reference="PYME" + uuid4().hex.upper(),
                    total_cents=source.total_cents, status="PREPARANDO",
                )
                self.db.add(record)
                gate.active_order_id = record.id
                self.db.commit()  # La reserva sobrevive al POST /timeout externo.
            if record.total_cents != source.total_cents:
                raise MpIntegrityError()
            payload = self.transport.create_order(
                token=token, key=str(record.request_id),
                amount_cents=record.total_cents, external_reference=record.external_reference,
                external_pos_id=EXTERNAL_POS_ID, description="Cobro QR TEST PyME " + str(record.id),
                items=MpOfficialService(self.db)._order_items(source), mode="static",
            )
            status,detail,pay_id,_ = validate_order(
                payload, order_id=record.provider_order_id,
                external_reference=record.external_reference,
                amount_cents=record.total_cents, merchant_id=MERCHANT_ID,
                pos_id=EXTERNAL_POS_ID, mode="static",
            )
            gate = self._gate()
            record = self._order(business, record.id, lock=True)
            if gate.active_order_id != record.id:
                raise MpIntegrityError()
            record.provider_order_id=payload["id"]
            record.payment_id=pay_id
            record.provider_status_detail=detail
            record.status=_MP_STATUS[status]
            record.updated_at=now_utc()
            if record.status in _TERMINAL:
                gate.active_order_id=None
            self.db.commit()
            return self.view(record)
        except (MpProviderFailure, MpIntegrityError):
            self.db.rollback()
            if "record" in locals():
                try:
                    row = self._order(business, record.id, lock=True)
                    if row and row.status in ("PREPARANDO","INDETERMINADA"):
                        row.status = "INDETERMINADA"
                        row.updated_at = now_utc()
                        self.db.commit()
                except Exception:
                    self.db.rollback()
            raise
        except Exception:
            self.db.rollback()
            raise

    def _sync(self, row: MpSharedQaOrder, token: str) -> dict:
        if not row.provider_order_id:
            raise MpConflict()  # Respuesta incierta, reintento POST misma clave.
        payload=self.transport.order(token=token,order_id=row.provider_order_id)
        status,detail,pay_id,_=validate_order(
            payload,order_id=row.provider_order_id,
            external_reference=row.external_reference,amount_cents=row.total_cents,
            merchant_id=MERCHANT_ID,pos_id=EXTERNAL_POS_ID,mode="static",
        )
        current=_MP_STATUS[status]
        if row.status in _TERMINAL and current not in _TERMINAL:
            raise MpIntegrityError()
        if row.status == "REQUIERE_REVISION" and current == "PROCESADA":
            current = "REQUIERE_REVISION"
        gate=self._gate()
        if current in _TERMINAL:
            if gate.active_order_id == row.id:
                gate.active_order_id = None
        elif gate.active_order_id != row.id:
            raise MpIntegrityError()
        row.status=current
        row.payment_id=pay_id or row.payment_id
        row.provider_status_detail=detail
        row.updated_at=now_utc()
        self.db.commit()
        return self.view(row)

    def reconcile(self,actor,session,business,order_id):
        token=qa_token()
        try:
            self._authorized_order(actor,session,business,order_id)
            row=self._order(business,order_id,lock=True)
            return self._sync(row,token)
        except Exception:
            self.db.rollback()
            raise

    def cancel(self,actor,session,business,order_id):
        token=qa_token()
        try:
            row=self._authorized_order(actor,session,business,order_id)
            if row.status=="CANCELADA":
                result=self.view(row);self.db.rollback();return result
            if row.status!="CREADA" or not row.provider_order_id:
                raise MpConflict()
            # La API solo permite cancelar órdenes created. Falla incierta:
            # la caja continúa bloqueada hasta que GET confirme terminal.
            payload=self.transport.cancel(
                token=token,order_id=row.provider_order_id,
                key=str(uuid5(NAMESPACE_URL,"pyme/shared/cancel/"+str(row.id))),
            )
            status,detail,pay_id,_=validate_order(
                payload,order_id=row.provider_order_id,
                external_reference=row.external_reference,amount_cents=row.total_cents,
                merchant_id=MERCHANT_ID,pos_id=EXTERNAL_POS_ID,mode="static",
            )
            if status!="canceled":
                raise MpIntegrityError()
            gate=self._gate()
            row=self._order(business,order_id,lock=True)
            if gate.active_order_id == row.id:
                gate.active_order_id=None
            row.status="CANCELADA"
            row.provider_status_detail=detail
            row.payment_id=pay_id or row.payment_id
            row.updated_at=now_utc()
            self.db.commit()
            return self.view(row)
        except Exception:
            self.db.rollback()
            raise

    def _mark_review(self,business,order_id):
        try:
            row=self._order(business,order_id,lock=True)
            if row and row.status=="PROCESADA" and not row.sale_id:
                row.status="REQUIERE_REVISION"
                self.db.commit()
            else:
                self.db.rollback()
        except Exception:
            self.db.rollback()
            raise

    def settle(self,actor,session,business,order_id):
        token=qa_token()
        try:
            self._authorized_order(actor,session,business,order_id,manager=True)
            row=self._order(business,order_id,lock=True)
            if row.sale_id:
                result={"order":self.view(row),"sale_id":row.sale_id,"replayed":True}
                self.db.rollback()
                return result
            if row.status not in ("CREADA","PROCESADA"):
                raise MpConflict()
            self._sync(row,token) # Reconcilia en proveedor antes del COMMIT de venta.
            row=self._order(business,order_id,lock=True)
            if row.sale_id:
                result={"order":self.view(row),"sale_id":row.sale_id,"replayed":True}
                self.db.rollback()
                return result
            if row.status!="PROCESADA" or row.provider_status_detail not in ("accredited","processed"):
                raise MpConflict()
            source=self.qr._lookup_by_id(business,row.source_intent_id)
            if source is None or source.total_cents!=row.total_cents:
                raise MpIntegrityError()
            if self.db.scalar(select(QrPaymentSettlement.id).where(
                QrPaymentSettlement.business_id==business,
                QrPaymentSettlement.intent_id==source.id,
            )) is not None:
                raise MpConflict()
            base_command, original=QrSettlementService(self.db)._snapshot_command(business,source)
            payload=base_command.model_dump(mode="json")
            payload["payments"]=[{
                "method":"MERCADO_PAGO_DECLARADO",
                "amount_cents":row.total_cents,
                "reference":row.external_reference,
            }]
            command=CreateSaleRequest.model_validate(payload)
            digest=hashlib.sha256(f"pyme/b7/shared-sale/{business}/{row.id}".encode()).digest()
            request_id=UUID(bytes=digest[:16],version=4)
            created=SaleService(self.db).create(
                actor,session,business,request_id,command,
                commit=False,trusted_mp_test=True,
            )
            if created.replayed:
                raise MpConflict()
            sale=self.db.scalar(select(Sale).where(
                Sale.business_id==business,Sale.id==created.body.id,
            ))
            if sale is None:
                raise MpIntegrityError()
            sold=list(self.db.scalars(select(SaleLine).where(
                SaleLine.business_id==business,SaleLine.sale_id==sale.id,
            ).order_by(SaleLine.line_number)).all())
            if len(sold)!=len(original):
                raise MpIntegrityError()
            for item,old in zip(sold,original):
                if item.catalog_item_id!=old.catalog_item_id or (
                    item.line_total_cents!=old.line_total_cents or
                    item.quantity_milli!=old.quantity_milli
                ):
                    raise MpIntegrityError()
                item.description_snapshot=old.description_snapshot
                item.sku_snapshot=old.sku_snapshot
            row.sale_id=sale.id
            row.updated_at=now_utc()
            self.db.flush()
            result={"order":self.view(row),"sale_id":sale.id,"replayed":False}
            self.db.commit()
            return result
        except (SaleInsufficientStock,SaleInvalidReference,SaleLocationNotEnabled,
                SaleMissingCatalogPrice,SalePermissionDenied) as exc:
            self.db.rollback()
            self._mark_review(business,order_id)
            raise MpConflict() from exc
        except Exception:
            self.db.rollback()
            raise

    def webhook_reconcile(self, provider_order_id):
        token=qa_token()
        try:
            row=self.db.scalar(select(MpSharedQaOrder).where(
                MpSharedQaOrder.provider_order_id==provider_order_id,
            ).with_for_update().execution_options(populate_existing=True))
            if row is None:
                self.db.rollback()
                return False
            self._sync(row,token)
            return True
        except Exception:
            self.db.rollback()
            raise
