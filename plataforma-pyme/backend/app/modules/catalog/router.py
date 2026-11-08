"""RF-04 E2-3 B: catálogo de bienes y servicios por empresa autorizada."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.modules.auth.dependencies import current_auth, unauthorized
from app.modules.auth.session_service import AuthContext
from app.modules.catalog.schemas import (
    CatalogItemView, CreateCatalogItemRequest, UpdateCatalogItemRequest,
)
from app.modules.catalog.service import (
    CatalogService, CatalogSessionInvalid, CatalogBusinessUnavailable,
    CatalogItemNotFound, CatalogPermissionDenied,
    CatalogBusinessSuspended, CatalogConflict, CatalogInvalidChange,
)

router = APIRouter(prefix="/businesses/{business_id}/catalog", tags=["catalogo"])


def _as_http(error: Exception) -> HTTPException:
    if isinstance(error, (CatalogBusinessUnavailable, CatalogItemNotFound)):
        return HTTPException(404, detail="Recurso no disponible")
    if isinstance(error, CatalogPermissionDenied):
        return HTTPException(403, detail="Operacion no permitida")
    if isinstance(error, CatalogBusinessSuspended):
        return HTTPException(409, detail="Empresa suspendida")
    if isinstance(error, CatalogConflict):
        return HTTPException(409, detail="Nombre o SKU ya utilizado en esta empresa")
    if isinstance(error, CatalogInvalidChange):
        return HTTPException(422, detail="Tipo y unidad incompatibles")
    raise TypeError("Excepción sin mapeo HTTP")


@router.get(
    "", response_model=list[CatalogItemView],
    responses={
        401: {"description": "Sesión requerida o inválida"},
        403: {"description": "Sin permiso de lectura"},
        404: {"description": "Empresa inexistente o ajena"},
        422: {"description": "Paginación inválida"},
    },
    summary="Listar catálogo propio, incluidas fichas inactivas, con paginación",
)
def list_catalog(
    business_id: UUID, offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> list[CatalogItemView]:
    try:
        return CatalogService(db).list_for_business(
            context.user.id, context.auth_session.id,
            business_id, offset=offset, limit=limit,
        )
    except CatalogSessionInvalid:
        raise unauthorized() from None
    except (CatalogBusinessUnavailable, CatalogPermissionDenied) as error:
        raise _as_http(error) from None


@router.get(
    "/{item_id}", response_model=CatalogItemView,
    responses={
        401: {"description": "Sesión requerida o inválida"},
        403: {"description": "Sin permiso de lectura"},
        404: {"description": "Artículo fuera del tenant o inexistente"},
    },
    summary="Consultar artículo por UUID y empresa",
)
def get_catalog_item(
    business_id: UUID, item_id: UUID,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> CatalogItemView:
    try:
        return CatalogService(db).get(
            context.user.id, context.auth_session.id, business_id, item_id,
        )
    except CatalogSessionInvalid:
        raise unauthorized() from None
    except (
        CatalogBusinessUnavailable, CatalogItemNotFound, CatalogPermissionDenied,
    ) as error:
        raise _as_http(error) from None


@router.post(
    "", response_model=CatalogItemView, status_code=201,
    responses={
        401: {"description": "Sesión requerida o inválida"},
        403: {"description": "Rol sin facultad de creación"},
        404: {"description": "Empresa inexistente, ajena o membresía inactiva"},
        409: {"description": "Nombre/SKU duplicado o empresa suspendida"},
        422: {"description": "Valores inválidos o campos protegidos"},
    },
    summary="Crear bien, insumo o servicio sin stock ni ventas",
)
def create_catalog_item(
    business_id: UUID, command: CreateCatalogItemRequest,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> CatalogItemView:
    try:
        return CatalogService(db).create(
            context.user.id, context.auth_session.id, business_id, command,
        )
    except CatalogSessionInvalid:
        raise unauthorized() from None
    except (
        CatalogBusinessUnavailable, CatalogPermissionDenied,
        CatalogBusinessSuspended, CatalogConflict, CatalogInvalidChange,
    ) as error:
        raise _as_http(error) from None


@router.patch(
    "/{item_id}", response_model=CatalogItemView,
    responses={
        401: {"description": "Sesión requerida o inválida"},
        403: {"description": "Rol sin permiso de edición"},
        404: {"description": "Empresa o artículo ajeno/inexistente"},
        409: {"description": "Nombre/SKU duplicado o empresa suspendida"},
        422: {"description": "Edición inválida"},
    },
    summary="Modificar datos de una ficha sin alterar tenant ni estado",
)
def update_catalog_item(
    business_id: UUID, item_id: UUID, command: UpdateCatalogItemRequest,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> CatalogItemView:
    try:
        return CatalogService(db).update(
            context.user.id, context.auth_session.id,
            business_id, item_id, command,
        )
    except CatalogSessionInvalid:
        raise unauthorized() from None
    except (
        CatalogBusinessUnavailable, CatalogItemNotFound, CatalogPermissionDenied,
        CatalogBusinessSuspended, CatalogConflict,
    ) as error:
        raise _as_http(error) from None
