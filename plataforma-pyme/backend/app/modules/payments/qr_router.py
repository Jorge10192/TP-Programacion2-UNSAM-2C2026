"""API autenticada de QR DEMO. No acredita pagos."""
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from pydantic import UUID4
from sqlalchemy.orm import Session
from app.api.dependencies import get_db
from app.modules.auth.dependencies import current_auth, unauthorized
from app.modules.auth.session_service import AuthContext
from app.modules.purchases.service import PurchaseSessionInvalid, PurchaseBusinessUnavailable, PurchasePermissionDenied
from app.modules.payments.qr_schemas import CreateQrIntentRequest, QrIntentView
from app.modules.payments.qr_service import (
    QrIntentService, QrIntentNotFound, QrIntentConflict, QrIntentInvalid,
    QrIntentForbidden, QrIntentNoConnection, QrIntentNoStock,
)

router = APIRouter(prefix="/businesses/{business_id}/qr-payment-intents", tags=["cobros QR DEMO"])


def _handle(error: Exception):
    if isinstance(error, PurchaseSessionInvalid):
        raise unauthorized() from None
    if isinstance(error, (PurchaseBusinessUnavailable, QrIntentNotFound)):
        raise HTTPException(404, detail="Intento o empresa no disponible") from None
    if isinstance(error, (PurchasePermissionDenied, QrIntentForbidden)):
        raise HTTPException(403, detail="Sin permiso de cobro QR") from None
    if isinstance(error, (QrIntentNoStock, QrIntentNoConnection, QrIntentConflict)):
        raise HTTPException(409, detail="Cuenta, stock o intento no disponible") from None
    if isinstance(error, QrIntentInvalid):
        raise HTTPException(422, detail="Artículo, cantidad o sede no disponibles") from None
    raise error


@router.post("", response_model=QrIntentView, status_code=201,
    responses={200: {"description": "Repetición idempotente"},
               401: {"description": "Sesión inválida"}, 403: {"description": "Permiso"},
               404: {"description": "Empresa ajena"}, 409: {"description": "Conflicto"},
               422: {"description": "Datos inválidos"}},
    summary="Crear intención QR DEMO: snapshot sin venta ni movimiento de stock")
def create_qr_intent(
    business_id: UUID, command: CreateQrIntentRequest, response: Response,
    idempotency_key: UUID4 = Header(alias="Idempotency-Key"),
    context: AuthContext = Depends(current_auth), db: Session = Depends(get_db),
) -> QrIntentView:
    try:
        result = QrIntentService(db).create(
            context.user.id, context.auth_session.id, business_id, idempotency_key, command)
    except Exception as error:
        _handle(error)
    response.status_code = 200 if result.replayed else 201
    return result.body


@router.get("/by-request/{request_id}", response_model=QrIntentView,
    responses={401: {"description": "Sesión inválida"}, 404: {"description": "No visible"}},
    summary="Recuperar intento por clave idempotente del creador")
def get_by_request(
    business_id: UUID, request_id: UUID4, context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> QrIntentView:
    try:
        return QrIntentService(db).by_request(
            context.user.id, context.auth_session.id, business_id, request_id)
    except Exception as error:
        _handle(error)


@router.get("/{intent_id}", response_model=QrIntentView,
    responses={401: {"description": "Sesión inválida"}, 404: {"description": "No visible"}},
    summary="Consultar QR y detalle inmutable desde PostgreSQL")
def get_qr_intent(
    business_id: UUID, intent_id: UUID, context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> QrIntentView:
    try:
        return QrIntentService(db).get(
            context.user.id, context.auth_session.id, business_id, intent_id)
    except Exception as error:
        _handle(error)


@router.post("/{intent_id}/cancel", response_model=QrIntentView,
    responses={401: {"description": "Sesión inválida"}, 404: {"description": "No visible"},
               409: {"description": "No cancelable"}},
    summary="Cancelar QR DEMO sin confirmar venta")
def cancel_qr_intent(
    business_id: UUID, intent_id: UUID, context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> QrIntentView:
    try:
        return QrIntentService(db).cancel(
            context.user.id, context.auth_session.id, business_id, intent_id)
    except Exception as error:
        _handle(error)
