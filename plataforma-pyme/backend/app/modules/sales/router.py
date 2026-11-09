"""E2-6 C: API de ventas de servicios, bienes y mixtas con stock atomico."""
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from pydantic import UUID4
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.modules.auth.dependencies import current_auth, unauthorized
from app.modules.auth.session_service import AuthContext
from app.modules.purchases.service import (
    PurchaseBusinessUnavailable, PurchasePermissionDenied, PurchaseSessionInvalid,
)
from app.modules.sales.schemas import CreateSaleRequest, SaleView
from app.modules.sales.service import (
    SaleService, SaleBusinessSuspended, SaleIdempotencyConflict, SaleInvalidReference,
    SaleLocationNotEnabled, SaleNotFound, SalePermissionDenied, SaleInsufficientStock,
    SaleBalanceOverflow,
)

router = APIRouter(prefix="/businesses/{business_id}/sales", tags=["ventas"])


def _http(error: Exception) -> HTTPException:
    if isinstance(error, (PurchaseBusinessUnavailable, SaleNotFound)):
        return HTTPException(404, detail="Empresa o venta no disponible")
    if isinstance(error, (PurchasePermissionDenied, SalePermissionDenied)):
        return HTTPException(403, detail="Sin permiso de venta en esta empresa")
    if isinstance(error, SaleBusinessSuspended):
        return HTTPException(409, detail="Empresa suspendida")
    if isinstance(error, SaleIdempotencyConflict):
        return HTTPException(409, detail="Clave de venta reutilizada con otro contenido o actor")
    if isinstance(error, SaleLocationNotEnabled):
        return HTTPException(409, detail="Ubicacion inexistente o no habilitada para la venta")
    if isinstance(error, SaleInsufficientStock):
        return HTTPException(409, detail="Stock insuficiente para confirmar la venta")
    if isinstance(error, SaleBalanceOverflow):
        return HTTPException(409, detail="El saldo alcanzo su limite de operaciones")
    if isinstance(error, SaleInvalidReference):
        return HTTPException(422, detail="Articulo no disponible, no vendible o cantidad invalida")
    raise TypeError("Excepcion de ventas sin mapeo HTTP")


@router.post(
    "", response_model=SaleView, status_code=201,
    responses={
        200: {"description": "Replay identico, sin nueva venta"},
        401: {"description": "Sesion no valida"},
        403: {"description": "Rol sin permiso de venta"},
        404: {"description": "Empresa no disponible"},
        409: {"description": "Clave en conflicto, empresa o ubicacion suspendida, stock insuficiente o limite de version"},
        422: {"description": "Campos, pagos, importe o articulo invalidos"},
    },
    summary="Registrar ventas de bienes, servicios o mixtas con stock atomico",
)
def create_sale(
    business_id: UUID, command: CreateSaleRequest, response: Response,
    idempotency_key: UUID4 = Header(alias="Idempotency-Key"),
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> SaleView:
    try:
        result = SaleService(db).create(
            context.user.id, context.auth_session.id, business_id, idempotency_key, command,
        )
    except PurchaseSessionInvalid:
        raise unauthorized() from None
    except (
        PurchaseBusinessUnavailable, PurchasePermissionDenied, SalePermissionDenied,
        SaleBusinessSuspended, SaleIdempotencyConflict, SaleInvalidReference,
        SaleInsufficientStock, SaleLocationNotEnabled, SaleBalanceOverflow,
    ) as error:
        raise _http(error) from None
    response.status_code = 200 if result.replayed else 201
    return result.body


@router.get(
    "/{sale_id}", response_model=SaleView,
    responses={
        401: {"description": "Sesion invalida"},
        403: {"description": "Sin lectura"},
        404: {"description": "Venta inexistente o de otra empresa"},
    },
    summary="Consultar comprobante historico de venta",
)
def get_sale(
    business_id: UUID, sale_id: UUID,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> SaleView:
    try:
        return SaleService(db).get(
            context.user.id, context.auth_session.id, business_id, sale_id,
        )
    except PurchaseSessionInvalid:
        raise unauthorized() from None
    except (PurchaseBusinessUnavailable, PurchasePermissionDenied, SaleNotFound) as error:
        raise _http(error) from None
