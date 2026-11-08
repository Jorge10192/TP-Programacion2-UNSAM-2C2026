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
)
from app.modules.businesses.service import (
    BusinessService, BusinessUnavailable, BusinessPermissionDenied,
    BusinessSuspended, CreationSessionInvalid, IdempotencyConflict,
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
