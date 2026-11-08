"""RF-03 E2-2 B: endpoints de lectura y alta de ubicaciones por tenant."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.modules.auth.dependencies import current_auth, unauthorized
from app.modules.auth.session_service import AuthContext
from app.modules.locations.schemas import CreateLocationRequest, LocationView
from app.modules.locations.service import (
    LocationBusinessSuspended, LocationBusinessUnavailable,
    LocationNotFound, LocationPermissionDenied, LocationService,
    LocationSessionInvalid,
)

router = APIRouter(prefix="/businesses/{business_id}/locations", tags=["ubicaciones"])


def _location_http_error(error: Exception) -> HTTPException:
    if isinstance(error, (LocationBusinessUnavailable, LocationNotFound)):
        return HTTPException(404, detail="Recurso no disponible")
    if isinstance(error, LocationPermissionDenied):
        return HTTPException(403, detail="Operacion no permitida")
    if isinstance(error, LocationBusinessSuspended):
        return HTTPException(409, detail="Empresa suspendida")
    raise TypeError("Excepción no administrada")


@router.get(
    "", response_model=list[LocationView],
    responses={
        401: {"description": "Sesión requerida o inválida"},
        403: {"description": "Membresía sin permiso de consulta"},
        404: {"description": "Empresa no disponible al solicitante"},
    },
    summary="Listar únicamente ubicaciones de la empresa autorizada",
)
def list_locations(
    business_id: UUID,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> list[LocationView]:
    try:
        return LocationService(db).list_for_business(
            context.user.id, context.auth_session.id, business_id,
        )
    except LocationSessionInvalid:
        raise unauthorized() from None
    except (LocationBusinessUnavailable, LocationPermissionDenied) as error:
        raise _location_http_error(error) from None


@router.get(
    "/{location_id}", response_model=LocationView,
    responses={
        401: {"description": "Sesión requerida o inválida"},
        403: {"description": "Sin permiso de consulta"},
        404: {"description": "Empresa o ubicación fuera del tenant"},
    },
    summary="Consultar una ubicación dentro de su tenant",
)
def get_location(
    business_id: UUID, location_id: UUID,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> LocationView:
    try:
        return LocationService(db).get_for_business(
            context.user.id, context.auth_session.id, business_id, location_id,
        )
    except LocationSessionInvalid:
        raise unauthorized() from None
    except (LocationBusinessUnavailable, LocationNotFound, LocationPermissionDenied) as error:
        raise _location_http_error(error) from None


@router.post(
    "", response_model=LocationView, status_code=201,
    responses={
        401: {"description": "Sesión requerida o inválida"},
        403: {"description": "Rol sin facultad de creación"},
        404: {"description": "Empresa inexistente, ajena o membresía inactiva"},
        409: {"description": "Empresa suspendida"},
        422: {"description": "Atributos inválidos o campos protegidos"},
    },
    summary="Crear ubicación real: titular/administrador, tenant y principal protegidos",
)
def create_location(
    business_id: UUID, command: CreateLocationRequest,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> LocationView:
    try:
        return LocationService(db).create(
            context.user.id, context.auth_session.id, business_id, command,
        )
    except LocationSessionInvalid:
        raise unauthorized() from None
    except (LocationBusinessUnavailable, LocationPermissionDenied, LocationBusinessSuspended) as error:
        raise _location_http_error(error) from None
