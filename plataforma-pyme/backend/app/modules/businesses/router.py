"""Rutas de empresa: autenticación global + membresía activa de tenant."""
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from pydantic import UUID4
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.modules.auth.dependencies import current_auth, unauthorized
from app.modules.auth.session_service import AuthContext
from app.modules.businesses.schemas import (
    BusinessView, CreateBusinessRequest, UpdateBusinessProfileRequest,
    CreateBusinessInvitationRequest, BusinessInvitationIssued,
    BusinessTeamMemberView, UpdateBusinessTeamMemberRequest,
)
from app.modules.businesses.service import (
    BusinessService, BusinessUnavailable, BusinessPermissionDenied,
    BusinessSuspended, CreationSessionInvalid, IdempotencyConflict,
    InvitationConflict, TeamMemberNotFound, ProtectedMembership,
)

router = APIRouter(prefix="/businesses", tags=["empresas"])


@router.post(
    "", response_model=BusinessView, status_code=201,
    responses={
        200: {"description": "Comando repetido sin duplicar empresa"},
        401: {"description": "Sesión requerida o inválida"},
        409: {"description": "Idempotency-Key usado para datos distintos"},
    },
    summary="Crear empresa y membresía inicial en una transacción",
)
def create_business(
    command: CreateBusinessRequest,
    response: Response,
    idempotency_key: UUID4 = Header(alias="Idempotency-Key"),
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> BusinessView:
    try:
        result = BusinessService(db).create(
            context.user.id, context.auth_session.id,
            command, idempotency_key,
        )
    except CreationSessionInvalid:
        raise unauthorized() from None
    except IdempotencyConflict:
        raise HTTPException(status_code=409, detail="Clave de solicitud reutilizada") from None
    except BusinessUnavailable:
        raise HTTPException(status_code=404, detail="Empresa no disponible") from None
    response.status_code = 200 if result.replayed else 201
    return result.body


@router.get(
    "", response_model=list[BusinessView],
    summary="Listar empresas con membresía activa de la cuenta",
)
def list_businesses(
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> list[BusinessView]:
    return BusinessService(db).list_mine(context.user.id)


@router.get(
    "/{business_id}", response_model=BusinessView,
    responses={404: {"description": "Empresa no disponible"}},
    summary="Consultar únicamente una empresa propia",
)
def get_business(
    business_id: UUID,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> BusinessView:
    try:
        return BusinessService(db).get_mine(context.user.id, business_id)
    except BusinessUnavailable:
        raise HTTPException(status_code=404, detail="Empresa no disponible") from None


@router.patch(
    "/{business_id}",
    response_model=BusinessView,
    responses={
        401: {"description": "Sesión inválida o revocada"},
        403: {"description": "Miembro activo sin permiso de edición"},
        404: {"description": "Empresa inexistente, ajena o sin membresía activa"},
        409: {"description": "Empresa suspendida: edición no disponible"},
        422: {"description": "Sin cambios o campos inválidos"},
    },
    summary="Editar perfil empresarial con autorización real por tenant y rol",
)
def update_business_profile(
    business_id: UUID,
    changes: UpdateBusinessProfileRequest,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> BusinessView:
    try:
        return BusinessService(db).update_profile(
            context.user.id, context.auth_session.id, business_id, changes,
        )
    except CreationSessionInvalid:
        raise unauthorized() from None
    except BusinessUnavailable:
        raise HTTPException(status_code=404, detail="Empresa no disponible") from None
    except BusinessPermissionDenied:
        raise HTTPException(status_code=403, detail="Operacion no permitida") from None
    except BusinessSuspended:
        raise HTTPException(
            status_code=409, detail="Empresa suspendida: no se puede editar"
        ) from None


@router.post(
    "/{business_id}/invitations",
    response_model=BusinessInvitationIssued,
    status_code=201,
    responses={
        401: {"description": "Sesión inválida o revocada"},
        403: {"description": "Miembro activo sin permiso de invitación"},
        404: {"description": "Empresa ajena o sin membresía activa"},
        409: {"description": "Empresa suspendida, miembro existente o invitación pendiente"},
        422: {"description": "Correo, rol o cuerpo inválido"},
    },
    summary="Emitir invitación empresarial segura; no crea membresía",
)
def issue_business_invitation(
    business_id: UUID,
    command: CreateBusinessInvitationRequest,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> BusinessInvitationIssued:
    try:
        return BusinessService(db).issue_invitation(
            context.user.id, context.auth_session.id, business_id, command,
        )
    except CreationSessionInvalid:
        raise unauthorized() from None
    except BusinessUnavailable:
        raise HTTPException(status_code=404, detail="Empresa no disponible") from None
    except BusinessPermissionDenied:
        raise HTTPException(status_code=403, detail="Operacion no permitida") from None
    except BusinessSuspended:
        raise HTTPException(
            status_code=409, detail="Empresa suspendida: no se pueden emitir invitaciones"
        ) from None
    except InvitationConflict:
        raise HTTPException(
            status_code=409, detail="El destinatario ya pertenece a la empresa o tiene invitacion pendiente"
        ) from None


@router.get(
    "/{business_id}/memberships",
    response_model=list[BusinessTeamMemberView],
    responses={
        401: {"description": "Sesión inválida"},
        403: {"description": "Miembro sin permiso de ver equipo"},
        404: {"description": "Empresa no disponible al solicitante"},
        409: {"description": "Equipo no visible mientras la empresa está suspendida"},
    },
    summary="Consultar equipo de la empresa con permiso members.read",
)
def list_business_team(
    business_id: UUID,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> list[BusinessTeamMemberView]:
    try:
        return BusinessService(db).list_team(
            context.user.id, context.auth_session.id, business_id,
        )
    except CreationSessionInvalid:
        raise unauthorized() from None
    except BusinessUnavailable:
        raise HTTPException(status_code=404, detail="Empresa no disponible") from None
    except BusinessPermissionDenied:
        raise HTTPException(status_code=403, detail="Operacion no permitida") from None
    except BusinessSuspended:
        raise HTTPException(status_code=409, detail="Empresa suspendida") from None


@router.patch(
    "/{business_id}/memberships/{membership_id}",
    response_model=BusinessTeamMemberView,
    responses={
        401: {"description": "Sesión inválida"},
        403: {"description": "Miembro sin permiso de gestionar el equipo"},
        404: {"description": "Empresa o membresía no disponible en este tenant"},
        409: {"description": "Empresa suspendida o membresía titular protegida"},
        422: {"description": "Rol/estado/campos inválidos o cuerpo vacío"},
    },
    summary="Modificar rol operativo o estado de colaborador, solo titular",
)
def update_business_team_member(
    business_id: UUID,
    membership_id: UUID,
    changes: UpdateBusinessTeamMemberRequest,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
) -> BusinessTeamMemberView:
    try:
        return BusinessService(db).update_team_member(
            context.user.id, context.auth_session.id,
            business_id, membership_id, changes,
        )
    except CreationSessionInvalid:
        raise unauthorized() from None
    except (BusinessUnavailable, TeamMemberNotFound):
        raise HTTPException(status_code=404, detail="Recurso no disponible") from None
    except BusinessPermissionDenied:
        raise HTTPException(status_code=403, detail="Operacion no permitida") from None
    except (BusinessSuspended, ProtectedMembership):
        raise HTTPException(status_code=409, detail="Operacion incompatible con el estado actual") from None
