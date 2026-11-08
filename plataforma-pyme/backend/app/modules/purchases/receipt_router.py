"""CU-07: confirmar y consultar recepción física completa de una Compra."""
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from pydantic import UUID4
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.modules.auth.dependencies import current_auth, unauthorized
from app.modules.auth.session_service import AuthContext
from app.modules.purchases.receipt_schemas import ReceivePurchaseRequest, PurchaseReceiptView
from app.modules.purchases.receipt_service import (
    ReceiptService, ReceiptNotFound, ReceiptLocationUnavailable,
    ReceiptBusinessSuspended, ReceiptLocationIncompatible, ReceiptPermissionDenied,
    ReceiptAlreadyProcessed, ReceiptIdempotencyConflict,
    ReceiptCatalogIncompatible, ReceiptBalanceOverflow,
)
from app.modules.purchases.service import (
    PurchaseSessionInvalid, PurchaseBusinessUnavailable, PurchasePermissionDenied,
)

router = APIRouter(
    prefix="/businesses/{business_id}/purchases/{purchase_id}",
    tags=["recepciones"],
)


def receipt_error(exc: Exception) -> HTTPException:
    if isinstance(exc, (PurchaseBusinessUnavailable, ReceiptNotFound, ReceiptLocationUnavailable)):
        return HTTPException(404, detail="Compra, empresa o ubicacion no disponible")
    if isinstance(exc, (PurchasePermissionDenied, ReceiptPermissionDenied)):
        return HTTPException(403, detail="Sin permiso para operar en esta ubicacion")
    if isinstance(exc, ReceiptBusinessSuspended):
        return HTTPException(409, detail="Empresa suspendida")
    if isinstance(exc, ReceiptLocationIncompatible):
        return HTTPException(409, detail="Ubicacion pausada o no habilitada para almacenamiento")
    if isinstance(exc, ReceiptAlreadyProcessed):
        return HTTPException(409, detail="Compra ya recibida, cancelada o sin bienes fisicos recepcionables")
    if isinstance(exc, ReceiptIdempotencyConflict):
        return HTTPException(409, detail="Clave de recepcion reutilizada para otra operacion")
    if isinstance(exc, ReceiptCatalogIncompatible):
        return HTTPException(409, detail="Articulo historico inactivo o con tipo/unidad incompatible")
    if isinstance(exc, ReceiptBalanceOverflow):
        return HTTPException(409, detail="Cantidad de inventario excede el limite permitido")
    raise TypeError("Error sin mapeo HTTP")


@router.post(
    "/receive", response_model=PurchaseReceiptView, status_code=201,
    responses={
        200: {"description": "Repeticion identica sin duplicar stock"},
        401: {"description": "Sesion requerida o invalida"},
        403: {"description": "Sin permiso STORE en destino"},
        404: {"description": "Empresa, compra o ubicacion fuera del tenant"},
        409: {"description": "Compra cerrada, destino invalido, clave distinta o conflicto de stock"},
        422: {"description": "Cuerpo o encabezado invalido"},
    },
    summary="Recibir compra completa en una ubicacion y confirmar entradas de stock atomicas",
)
def receive_purchase(
    business_id: UUID, purchase_id: UUID,
    command: ReceivePurchaseRequest, response: Response,
    idempotency_key: UUID4 = Header(alias="Idempotency-Key"),
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> PurchaseReceiptView:
    try:
        result = ReceiptService(db).receive(
            context.user.id, context.auth_session.id,
            business_id, purchase_id, idempotency_key, command,
        )
    except PurchaseSessionInvalid:
        raise unauthorized() from None
    except (PurchaseBusinessUnavailable, PurchasePermissionDenied, ReceiptNotFound,
            ReceiptLocationUnavailable, ReceiptBusinessSuspended, ReceiptLocationIncompatible,
            ReceiptPermissionDenied, ReceiptAlreadyProcessed, ReceiptIdempotencyConflict,
            ReceiptCatalogIncompatible, ReceiptBalanceOverflow) as exc:
        raise receipt_error(exc) from None
    response.status_code = 200 if result.replayed else 201
    return result.body


@router.get(
    "/receipt", response_model=PurchaseReceiptView,
    responses={
        401: {"description": "Sesion invalida"},
        403: {"description": "Sin permiso de lectura"},
        404: {"description": "Recepcion ausente o de otro tenant"},
    },
    summary="Consultar comprobante y movimientos de recepcion historicos",
)
def get_receipt(
    business_id: UUID, purchase_id: UUID,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> PurchaseReceiptView:
    try:
        return ReceiptService(db).get_receipt(
            context.user.id, context.auth_session.id, business_id, purchase_id,
        )
    except PurchaseSessionInvalid:
        raise unauthorized() from None
    except (PurchaseBusinessUnavailable, PurchasePermissionDenied, ReceiptNotFound) as exc:
        raise receipt_error(exc) from None
