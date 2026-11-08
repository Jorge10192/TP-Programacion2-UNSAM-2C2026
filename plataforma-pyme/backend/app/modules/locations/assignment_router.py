"""Gestión de asignaciones de miembros a ubicaciones del mismo tenant."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.modules.auth.dependencies import current_auth, unauthorized
from app.modules.auth.session_service import AuthContext
from app.modules.locations.assignment_schemas import (
    ChangeLocationAssignmentRequest, LocationAssignmentView,
)
from app.modules.locations.assignment_service import LocationAssignmentService
from app.modules.locations.router import _location_http_error
from app.modules.locations.service import (
    LocationBusinessSuspended, LocationBusinessUnavailable,
    LocationConflict, LocationNotFound,
    LocationPermissionDenied, LocationSessionInvalid,
)

router = APIRouter(
    prefix="/businesses/{business_id}/locations/{location_id}/assignments",
    tags=["asignaciones-ubicacion"],
)


def _assignment_http_error(error: Exception) -> HTTPException:
    if isinstance(error, LocationConflict):
        return HTTPException(409, detail="Miembro o ubicación incompatibles con la asignación")
    return _location_http_error(error)


@router.get(
    "", response_model=list[LocationAssignmentView],
    responses={
        401: {"description": "Sesión inválida"},
        403: {"description": "Sin permiso de gestionar asignaciones"},
        404: {"description": "Empresa o ubicación no disponible"},
    },
    summary="Listar asignaciones vigentes y revocadas de una sede propia",
)
def list_location_assignments(
    business_id: UUID, location_id: UUID,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> list[LocationAssignmentView]:
    try:
        return LocationAssignmentService(db).list_for_location(
            context.user.id, context.auth_session.id,
            business_id, location_id,
        )
    except LocationSessionInvalid:
        raise unauthorized() from None
    except (
        LocationBusinessUnavailable, LocationNotFound, LocationPermissionDenied,
    ) as error:
        raise _assignment_http_error(error) from None


@router.put(
    "/{membership_id}", response_model=LocationAssignmentView,
    responses={
        401: {"description": "Sesión inválida"},
        403: {"description": "Rol sin permiso de gestionar asignaciones"},
        404: {"description": "Empresa, ubicación, membresía o asignación ajena/inexistente"},
        409: {"description": "Empresa/ubicación/miembro no aptos para asignar"},
        422: {"description": "Estado inválido o atributos protegidos"},
    },
    summary="Asignar, reactivar o revocar una asignación de sede sin borrar historial",
)
def set_location_assignment(
    business_id: UUID, location_id: UUID, membership_id: UUID,
    command: ChangeLocationAssignmentRequest,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> LocationAssignmentView:
    try:
        return LocationAssignmentService(db).set_status(
            context.user.id, context.auth_session.id,
            business_id, location_id, membership_id, command,
        )
    except LocationSessionInvalid:
        raise unauthorized() from None
    except (
        LocationBusinessUnavailable, LocationNotFound,
        LocationPermissionDenied, LocationBusinessSuspended, LocationConflict,
    ) as error:
        raise _assignment_http_error(error) from None
