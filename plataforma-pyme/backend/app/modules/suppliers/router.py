"""RF-05: cinco rutas REST de Proveedores, sin borrado físico ni compras."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.modules.auth.dependencies import current_auth, unauthorized
from app.modules.auth.session_service import AuthContext
from app.modules.suppliers.schemas import (
    ChangeSupplierStatusRequest, CreateSupplierRequest, SupplierView,
    UpdateSupplierRequest,
)
from app.modules.suppliers.service import (
    SupplierBusinessSuspended, SupplierBusinessUnavailable, SupplierConflict,
    SupplierNotFound, SupplierPermissionDenied, SupplierService, SupplierSessionInvalid,
)

router = APIRouter(prefix="/businesses/{business_id}/suppliers", tags=["proveedores"])


def _as_http(error: Exception) -> HTTPException:
    if isinstance(error, (SupplierBusinessUnavailable, SupplierNotFound)):
        return HTTPException(404, detail="Recurso no disponible")
    if isinstance(error, SupplierPermissionDenied):
        return HTTPException(403, detail="Operacion no permitida")
    if isinstance(error, SupplierBusinessSuspended):
        return HTTPException(409, detail="Empresa suspendida")
    if isinstance(error, SupplierConflict):
        return HTTPException(409, detail="Nombre de proveedor utilizado en esta empresa")
    raise TypeError("Excepción sin mapeo HTTP")


@router.get(
    "", response_model=list[SupplierView],
    responses={
        401: {"description": "Sesión requerida o inválida"},
        403: {"description": "Sin permiso empresarial"},
        404: {"description": "Empresa ajena, inexistente o membresía inactiva"},
        422: {"description": "Paginación inválida"},
    },
    summary="Listar proveedores propios, activos e inactivos",
)
def list_suppliers(
    business_id: UUID,
    offset: int = Query(0, ge=0, le=9_223_372_036_854_775_807),
    limit: int = Query(100, ge=1, le=500),
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> list[SupplierView]:
    try:
        return SupplierService(db).list_for_business(
            context.user.id, context.auth_session.id, business_id,
            offset=offset, limit=limit,
        )
    except SupplierSessionInvalid:
        raise unauthorized() from None
    except (SupplierBusinessUnavailable, SupplierPermissionDenied) as error:
        raise _as_http(error) from None


@router.get(
    "/{supplier_id}", response_model=SupplierView,
    responses={
        401: {"description": "Sesión inválida"},
        403: {"description": "Sin permiso empresarial"},
        404: {"description": "Proveedor o empresa ajeno/inexistente"},
    },
    summary="Consultar ficha de proveedor dentro de la empresa",
)
def get_supplier(
    business_id: UUID, supplier_id: UUID,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> SupplierView:
    try:
        return SupplierService(db).get(
            context.user.id, context.auth_session.id, business_id, supplier_id,
        )
    except SupplierSessionInvalid:
        raise unauthorized() from None
    except (SupplierBusinessUnavailable, SupplierPermissionDenied, SupplierNotFound) as error:
        raise _as_http(error) from None


@router.post(
    "", response_model=SupplierView, status_code=201,
    responses={
        401: {"description": "Sesión inválida"},
        403: {"description": "Rol sin permiso de creación"},
        404: {"description": "Empresa ajena o membresía inactiva"},
        409: {"description": "Nombre duplicado o empresa suspendida"},
        422: {"description": "Campos inválidos o protegidos"},
    },
    summary="Registrar proveedor sin compras ni movimientos",
)
def create_supplier(
    business_id: UUID, command: CreateSupplierRequest,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> SupplierView:
    try:
        return SupplierService(db).create(
            context.user.id, context.auth_session.id, business_id, command,
        )
    except SupplierSessionInvalid:
        raise unauthorized() from None
    except (
        SupplierBusinessUnavailable, SupplierPermissionDenied,
        SupplierBusinessSuspended, SupplierConflict,
    ) as error:
        raise _as_http(error) from None


@router.patch(
    "/{supplier_id}", response_model=SupplierView,
    responses={
        401: {"description": "Sesión inválida"},
        403: {"description": "Rol sin permiso de edición"},
        404: {"description": "Empresa o proveedor ajeno/inexistente"},
        409: {"description": "Nombre duplicado o empresa suspendida"},
        422: {"description": "Edición inválida o campo protegido"},
    },
    summary="Editar contactos y datos, nunca el estado ni la empresa",
)
def update_supplier(
    business_id: UUID, supplier_id: UUID, command: UpdateSupplierRequest,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> SupplierView:
    try:
        return SupplierService(db).update(
            context.user.id, context.auth_session.id, business_id,
            supplier_id, command,
        )
    except SupplierSessionInvalid:
        raise unauthorized() from None
    except (
        SupplierBusinessUnavailable, SupplierPermissionDenied,
        SupplierBusinessSuspended, SupplierConflict, SupplierNotFound,
    ) as error:
        raise _as_http(error) from None


@router.patch(
    "/{supplier_id}/status", response_model=SupplierView,
    responses={
        401: {"description": "Sesión inválida"},
        403: {"description": "Rol sin permiso de gestionar estado"},
        404: {"description": "Empresa/proveedor ajeno o inexistente"},
        409: {"description": "Empresa suspendida"},
        422: {"description": "Estado inválido o campos extra"},
    },
    summary="Desactivar o reactivar sin borrado ni liberación de nombre",
)
def change_supplier_status(
    business_id: UUID, supplier_id: UUID, command: ChangeSupplierStatusRequest,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> SupplierView:
    try:
        return SupplierService(db).change_status(
            context.user.id, context.auth_session.id, business_id,
            supplier_id, command,
        )
    except SupplierSessionInvalid:
        raise unauthorized() from None
    except (
        SupplierBusinessUnavailable, SupplierPermissionDenied,
        SupplierBusinessSuspended, SupplierNotFound,
    ) as error:
        raise _as_http(error) from None
