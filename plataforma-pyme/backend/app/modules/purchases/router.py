"""RF-05: operaciones HTTP de Compras; recepción física queda pendiente E2-4 E."""
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response
from pydantic import UUID4
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.modules.auth.dependencies import current_auth, unauthorized
from app.modules.auth.session_service import AuthContext
from app.modules.purchases.schemas import CreatePurchaseRequest, PurchaseView
from app.modules.purchases.service import (
    PurchaseBusinessSuspended, PurchaseBusinessUnavailable,
    PurchaseIdempotencyConflict, PurchaseInvalidReference,
    PurchaseNotFound, PurchasePermissionDenied, PurchaseService,
    PurchaseSessionInvalid,
)

router = APIRouter(prefix="/businesses/{business_id}/purchases", tags=["compras"])


def _http(error: Exception) -> HTTPException:
    if isinstance(error, (PurchaseBusinessUnavailable, PurchaseNotFound)):
        return HTTPException(404, detail="Recurso no disponible")
    if isinstance(error, PurchasePermissionDenied):
        return HTTPException(403, detail="Operacion no permitida")
    if isinstance(error, PurchaseBusinessSuspended):
        return HTTPException(409, detail="Empresa suspendida")
    if isinstance(error, PurchaseIdempotencyConflict):
        return HTTPException(409, detail="Clave de compra reutilizada con contenido diferente")
    if isinstance(error, PurchaseInvalidReference):
        return HTTPException(422, detail="Proveedor, articulo o unidad no habilitados en esta empresa")
    raise TypeError("Excepcion sin mapeo HTTP")


@router.post(
    "", response_model=PurchaseView, status_code=201,
    responses={
        200: {"description": "Reintento sin crear otra compra"},
        401: {"description": "Sesion requerida o invalida"},
        403: {"description": "Rol sin permiso de registrar compras"},
        404: {"description": "Empresa ajena o membresia inactiva"},
        409: {"description": "Empresa suspendida o clave idempotente reutilizada"},
        422: {"description": "Campos, proveedor o articulo invalidos"},
    },
    summary="Registrar compra y renglones sin ubicacion, recepcion ni stock",
)
def register_purchase(
    business_id: UUID, command: CreatePurchaseRequest, response: Response,
    idempotency_key: UUID4 = Header(alias="Idempotency-Key"),
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> PurchaseView:
    try:
        result = PurchaseService(db).create(
            context.user.id, context.auth_session.id, business_id, idempotency_key, command,
        )
    except PurchaseSessionInvalid:
        raise unauthorized() from None
    except (PurchaseBusinessUnavailable, PurchasePermissionDenied,
            PurchaseBusinessSuspended, PurchaseIdempotencyConflict,
            PurchaseInvalidReference) as error:
        raise _http(error) from None
    response.status_code = 200 if result.replayed else 201
    return result.body


@router.get(
    "", response_model=list[PurchaseView],
    responses={
        401: {"description": "Sesion invalida"},
        403: {"description": "Sin acceso de lectura"},
        404: {"description": "Empresa no disponible"},
        422: {"description": "Paginacion fuera de rango"},
    },
    summary="Listar historial de compras de esta empresa, sin filtrar las pendientes",
)
def list_purchases(
    business_id: UUID,
    offset: int = Query(0, ge=0, le=9_223_372_036_854_775_807),
    limit: int = Query(100, ge=1, le=500),
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> list[PurchaseView]:
    try:
        return PurchaseService(db).list(
            context.user.id, context.auth_session.id,
            business_id, offset=offset, limit=limit,
        )
    except PurchaseSessionInvalid:
        raise unauthorized() from None
    except (PurchaseBusinessUnavailable, PurchasePermissionDenied) as error:
        raise _http(error) from None


@router.get(
    "/{purchase_id}", response_model=PurchaseView,
    responses={
        401: {"description": "Sesion invalida"},
        403: {"description": "Sin acceso de lectura"},
        404: {"description": "Compra inexistente o de otra empresa"},
    },
    summary="Consultar compra con snapshots inmutables de renglones",
)
def get_purchase(
    business_id: UUID, purchase_id: UUID,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> PurchaseView:
    try:
        return PurchaseService(db).get(
            context.user.id, context.auth_session.id, business_id, purchase_id,
        )
    except PurchaseSessionInvalid:
        raise unauthorized() from None
    except (PurchaseBusinessUnavailable, PurchasePermissionDenied, PurchaseNotFound) as error:
        raise _http(error) from None
