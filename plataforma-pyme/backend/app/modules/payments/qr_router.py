"""API autenticada de QR DEMO. No acredita pagos."""
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response
from pydantic import UUID4
from sqlalchemy.orm import Session
from app.api.dependencies import get_db
from app.modules.auth.dependencies import current_auth, unauthorized
from app.modules.auth.session_service import AuthContext
from app.modules.purchases.service import PurchaseSessionInvalid, PurchaseBusinessUnavailable, PurchasePermissionDenied
from app.modules.payments.qr_schemas import (
    CreateQrIntentRequest, QrIntentView, QrPaymentEventView, QrSimulateRequest, QrFinalizedView,
    QrIntentSummaryView,
)
from app.modules.payments.qr_event_service import QrEventService, QrLabDisabled
from app.modules.payments.qr_settlement_service import (
    QrSettlementService, QrFinalizationDisabled, QrFinalizationNeedsReview,
)
from app.modules.sales.schemas import SaleView
from app.modules.sales.service import (
    SalePermissionDenied, SaleIdempotencyConflict, SaleBusinessSuspended,
)
from app.modules.payments.qr_service import (
    QrIntentService, QrIntentNotFound, QrIntentConflict, QrIntentInvalid,
    QrIntentForbidden, QrIntentNoConnection, QrIntentNoStock,
)

router = APIRouter(prefix="/businesses/{business_id}/qr-payment-intents", tags=["cobros QR DEMO"])


def _handle(error: Exception):
    if isinstance(error, QrFinalizationDisabled):
        raise HTTPException(403, detail="Cierre de venta QR DEMO habilitado solo en PostgreSQL QA descartable") from None
    if isinstance(error, QrFinalizationNeedsReview):
        raise HTTPException(409, detail="Pago de prueba aprobado pero venta no registrada: requiere revisión de stock/catálogo") from None
    if isinstance(error, QrLabDisabled):
        raise HTTPException(403, detail="Laboratorio QR DEMO deshabilitado en este entorno") from None
    if isinstance(error, PurchaseSessionInvalid):
        raise unauthorized() from None
    if isinstance(error, (PurchaseBusinessUnavailable, QrIntentNotFound)):
        raise HTTPException(404, detail="Intento o empresa no disponible") from None
    if isinstance(error, (PurchasePermissionDenied, QrIntentForbidden, SalePermissionDenied)):
        raise HTTPException(403, detail="Sin permiso de cobro QR") from None
    if isinstance(error, (QrIntentNoStock, QrIntentNoConnection, QrIntentConflict,
                          SaleIdempotencyConflict, SaleBusinessSuspended)):
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


@router.get("", response_model=list[QrIntentSummaryView],
    responses={401: {"description": "Sesión inválida"},
               404: {"description": "Empresa no accesible"}},
    summary="Listar cobros QR DEMO de la empresa, con alcance por rol")
def list_qr_intents(
    business_id: UUID, offset: int = Query(0, ge=0, le=10_000_000),
    limit: int = Query(20, ge=1, le=50),
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> list[QrIntentSummaryView]:
    try:
        return QrIntentService(db).list(
            context.user.id, context.auth_session.id, business_id,
            offset=offset, limit=limit,
        )
    except Exception as error:
        _handle(error)


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


@router.get("/{intent_id}/events", response_model=list[QrPaymentEventView],
    responses={401: {"description": "Sesión inválida"},
               404: {"description": "Intención no visible"}},
    summary="Historial auditable de transiciones QR, sin secretos de pago")
def list_qr_events(
    business_id: UUID, intent_id: UUID,
    context: AuthContext = Depends(current_auth), db: Session = Depends(get_db),
) -> list[QrPaymentEventView]:
    try:
        return QrEventService(db).list_events(
            context.user.id, context.auth_session.id, business_id, intent_id)
    except Exception as error:
        _handle(error)


@router.post("/{intent_id}/simulate", response_model=QrIntentView, status_code=201,
    responses={200: {"description": "Evento idempotente: no duplica la transición"},
               401: {"description": "Sesión inválida"},
               403: {"description": "Rol no administrador o laboratorio deshabilitado"},
               404: {"description": "Intención ajena o inexistente"},
               409: {"description": "Evento incompatible o intento ya resuelto"},
               422: {"description": "Acción inválida"}},
    summary="Simular SOLO en QA un resultado de cobro ficticio; NO crear venta")
def simulate_qr_event(
    business_id: UUID, intent_id: UUID, command: QrSimulateRequest, response: Response,
    idempotency_key: UUID4 = Header(alias="Idempotency-Key"),
    context: AuthContext = Depends(current_auth), db: Session = Depends(get_db),
) -> QrIntentView:
    try:
        result = QrEventService(db).simulate(
            context.user.id, context.auth_session.id, business_id, intent_id,
            idempotency_key, command.action)
    except Exception as error:
        _handle(error)
    response.status_code = 200 if result.replayed else 201
    return result.intent



@router.post("/{intent_id}/finalize-demo", response_model=QrFinalizedView,
    status_code=201,
    responses={200: {"description": "Misma venta y QR recuperados, sin nuevo descuento de stock"},
               401: {"description": "Sesión inválida"},
               403: {"description": "No autorizado o entorno QA no habilitado"},
               404: {"description": "QR no visible"},
               409: {"description": "Pendiente, rechazado, revisión, stock o estado incompatible"}},
    summary="Cerrar UNA venta REAL de QA después de aprobación ficticia; transacción única")
def finalize_qr_sale(
    business_id: UUID, intent_id: UUID, response: Response,
    context: AuthContext = Depends(current_auth), db: Session = Depends(get_db),
) -> QrFinalizedView:
    try:
        result = QrSettlementService(db).finalize(
            context.user.id, context.auth_session.id, business_id, intent_id)
    except Exception as error:
        _handle(error)
    response.status_code = 200 if result.replayed else 201
    return QrFinalizedView(intent=result.intent, sale=result.sale, replayed=result.replayed)


@router.get("/{intent_id}/receipt", response_model=SaleView,
    responses={401: {"description": "Sesión inválida"},
               403: {"description": "Sin permiso de lectura de venta"},
               404: {"description": "QR sin venta confirmada o no visible"}},
    summary="Recuperar comprobante de venta QA vinculada a QR, lectura solamente")
def qr_sale_receipt(
    business_id: UUID, intent_id: UUID,
    context: AuthContext = Depends(current_auth), db: Session = Depends(get_db),
) -> SaleView:
    try:
        return QrSettlementService(db).receipt(
            context.user.id, context.auth_session.id, business_id, intent_id)
    except Exception as error:
        _handle(error)
