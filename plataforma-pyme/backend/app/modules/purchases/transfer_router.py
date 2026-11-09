"""RF-06/CU-09: transferencia física explícita entre ubicaciones propias."""
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from pydantic import UUID4
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.modules.auth.dependencies import current_auth, unauthorized
from app.modules.auth.session_service import AuthContext
from app.modules.purchases.service import (
    PurchaseSessionInvalid, PurchaseBusinessUnavailable, PurchasePermissionDenied,
)
from app.modules.purchases.transfer_schemas import TransferStockRequest, StockTransferView
from app.modules.purchases.transfer_service import (
    TransferService, TransferNotFound, TransferPermissionDenied,
    TransferCompanySuspended, TransferInvalidLocation, TransferLocationIncompatible,
    TransferInvalidItem, TransferInvalidQuantity, TransferInsufficientStock,
    TransferBalanceOverflow, TransferIdempotencyConflict,
)

router = APIRouter(prefix="/businesses/{business_id}/inventory/transfers", tags=["traslados"])


def _http_error(error: Exception) -> HTTPException:
    if isinstance(error, (PurchaseBusinessUnavailable, TransferNotFound,
                          TransferInvalidLocation, TransferInvalidItem)):
        return HTTPException(404, detail="Empresa, articulo, ubicacion o traslado no disponible")
    if isinstance(error, (PurchasePermissionDenied, TransferPermissionDenied)):
        return HTTPException(403, detail="Sin permiso STORE en ambas ubicaciones")
    if isinstance(error, TransferCompanySuspended):
        return HTTPException(409, detail="Empresa suspendida")
    if isinstance(error, TransferLocationIncompatible):
        return HTTPException(409, detail="Ubicacion inactiva o no apta para almacenar")
    if isinstance(error, TransferInsufficientStock):
        return HTTPException(409, detail="Stock insuficiente en la ubicacion de origen")
    if isinstance(error, TransferBalanceOverflow):
        return HTTPException(409, detail="El saldo destino supera el limite permitido")
    if isinstance(error, TransferIdempotencyConflict):
        return HTTPException(409, detail="Clave idempotente reutilizada con otro contenido o actor")
    if isinstance(error, TransferInvalidQuantity):
        return HTTPException(422, detail="Cantidad fraccionaria para articulo discreto")
    raise TypeError("Error de traslado sin mapeo HTTP")


@router.post(
    "", status_code=201, response_model=StockTransferView,
    response_model_exclude_none=True,
    responses={
        200: {"description": "Misma operacion y clave, sin duplicar stock"},
        401: {"description": "Sesion no valida"},
        403: {"description": "Sin permiso en una o ambas ubicaciones"},
        404: {"description": "Empresa, ubicacion o articulo de otro tenant"},
        409: {"description": "Stock insuficiente, ubicacion inhabilitada o conflicto"},
        422: {"description": "Cantidad, campos, UUID o cuerpo invalidos"},
    },
    summary="Trasladar un articulo entre dos depositos atomicamente sin stock negativo",
)
def create_transfer(
    business_id: UUID, command: TransferStockRequest, response: Response,
    idempotency_key: UUID4 = Header(alias="Idempotency-Key"),
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> StockTransferView:
    try:
        result = TransferService(db).transfer(
            context.user.id, context.auth_session.id,
            business_id, idempotency_key, command,
        )
    except PurchaseSessionInvalid:
        raise unauthorized() from None
    except (
        PurchaseBusinessUnavailable, PurchasePermissionDenied, TransferPermissionDenied,
        TransferCompanySuspended, TransferInvalidLocation, TransferLocationIncompatible,
        TransferInvalidItem, TransferInvalidQuantity, TransferInsufficientStock,
        TransferBalanceOverflow, TransferIdempotencyConflict,
    ) as error:
        raise _http_error(error) from None
    response.status_code = 200 if result.replayed else 201
    return result.body


@router.get(
    "/{transfer_id}", response_model=StockTransferView,
    response_model_exclude_none=True,
    responses={401: {"description": "Sesion invalida"}, 403: {"description": "Sin lectura"},
               404: {"description": "No existe en el tenant"}},
    summary="Consultar un traslado y sus dos movimientos historicos",
)
def get_transfer(
    business_id: UUID, transfer_id: UUID,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> StockTransferView:
    try:
        return TransferService(db).get(
            context.user.id, context.auth_session.id, business_id, transfer_id,
        )
    except PurchaseSessionInvalid:
        raise unauthorized() from None
    except (PurchaseBusinessUnavailable, PurchasePermissionDenied, TransferNotFound) as error:
        raise _http_error(error) from None
