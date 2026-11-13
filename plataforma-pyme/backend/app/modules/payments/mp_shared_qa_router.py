"""B7: caja única QA. Lectura y órdenes static por tenant; sin tokens al frontend."""
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel, UUID4
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.modules.auth.dependencies import current_auth
from app.modules.auth.session_service import AuthContext
from app.modules.payments.qr_service import QrIntentService
from app.modules.payments.mp_official_client import render_official_test_qr, MpNotReady
from app.modules.payments.mp_official_router import _errors, MpConflict
from app.modules.payments.mp_shared_qa_config import (
    MERCHANT_ID, STORE_ID, POS_ID, EXTERNAL_POS_ID, STATIC_QR,
    shared_qa_enabled, qa_token,
)
from app.modules.payments.mp_shared_qa_service import MpSharedQaService

router = APIRouter(
    prefix="/businesses/{business_id}/mercadopago/qa-shared",
    tags=["Mercado Pago · caja QA compartida"],
)
QR_RAW = STATIC_QR  # compatibilidad B7-A


class SharedOrderView(BaseModel):
    id: UUID
    business_id: UUID
    source_intent_id: UUID
    provider_order_id: str | None
    status: str
    provider_status_detail: str | None
    external_reference: str
    total_cents: int
    created_at: datetime
    qr_png_data_uri: str | None
    test_only: bool
    sale_registered: bool
    sale_id: UUID | None
    shared_box: bool


@router.get("/connection", summary="Vinculación virtual de empresa a la única caja QA")
def shared_qa_connection(
    business_id: UUID, context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
):
    try:
        business, _member = QrIntentService(db)._authorize(
            context.user.id, context.auth_session.id, business_id)
        if business.status != "ACTIVA":
            raise MpConflict()
        enabled = shared_qa_enabled()
        try:
            qa_token()
            orders_ready = True
        except MpNotReady:
            orders_ready = False
        return {
            "business_id": business_id, "enabled": enabled, "virtual_link": enabled,
            "status": "DISPONIBLE_QA" if enabled else "DESHABILITADA",
            "mp_user_id": MERCHANT_ID if enabled else None,
            "store_id": STORE_ID if enabled else None,
            "pos_id": POS_ID if enabled else None,
            "external_pos_id": EXTERNAL_POS_ID if enabled else None,
            "qr_png_data_uri": render_official_test_qr(STATIC_QR) if enabled else None,
            "orders_integrated": orders_ready, "remote_verified": False,
            "sandbox_only": True,
        }
    except Exception as exc:
        _errors(exc)
    finally:
        db.rollback()


@router.post("/orders/from-qr/{source_intent_id}", response_model=SharedOrderView,
             status_code=201, summary="Orden QR static con bloqueo global de caja")
def create_shared_order(
    business_id: UUID, source_intent_id: UUID,
    idempotency_key: UUID4 = Header(alias="Idempotency-Key"),
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
):
    try:
        return MpSharedQaService(db).create(
            context.user.id, context.auth_session.id, business_id,
            source_intent_id, idempotency_key)
    except Exception as exc:
        _errors(exc)


@router.get("/orders/for-qr/{source_intent_id}", response_model=SharedOrderView | None)
def find_shared_order(
    business_id: UUID, source_intent_id: UUID,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
):
    try:
        return MpSharedQaService(db).by_source(
            context.user.id, context.auth_session.id, business_id, source_intent_id)
    except Exception as exc:
        _errors(exc)


@router.get("/orders/{order_id}", response_model=SharedOrderView)
def read_shared_order(
    business_id: UUID, order_id: UUID,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
):
    try:
        return MpSharedQaService(db).read(
            context.user.id, context.auth_session.id, business_id, order_id)
    except Exception as exc:
        _errors(exc)


@router.post("/orders/{order_id}/reconcile", response_model=SharedOrderView)
def reconcile_shared_order(
    business_id: UUID, order_id: UUID,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
):
    try:
        return MpSharedQaService(db).reconcile(
            context.user.id, context.auth_session.id, business_id, order_id)
    except Exception as exc:
        _errors(exc)


@router.post("/orders/{order_id}/cancel", response_model=SharedOrderView)
def cancel_shared_order(
    business_id: UUID, order_id: UUID,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
):
    try:
        return MpSharedQaService(db).cancel(
            context.user.id, context.auth_session.id, business_id, order_id)
    except Exception as exc:
        _errors(exc)


@router.post("/orders/{order_id}/settle-qa",
             summary="Registrar venta QA solo después de GET acreditado")
def settle_shared_order(
    business_id: UUID, order_id: UUID,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
):
    try:
        return MpSharedQaService(db).settle(
            context.user.id, context.auth_session.id, business_id, order_id)
    except Exception as exc:
        _errors(exc)
