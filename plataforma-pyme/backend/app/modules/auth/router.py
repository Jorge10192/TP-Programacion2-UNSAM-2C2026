"""API v1: registro; login y sesiones pendientes para E2-1.2B."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.modules.auth.schemas import RegisterRequest, UserPublic
from app.modules.auth.service import DuplicateIdentityError, RegistrationService

router = APIRouter(prefix="/auth", tags=["autenticacion"])


@router.post(
    "/register", status_code=status.HTTP_201_CREATED,
    response_model=UserPublic,
    responses={409: {"description": "No pudo completarse el registro"}},
)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> UserPublic:
    try:
        user = RegistrationService(db).register(payload)
    except DuplicateIdentityError:
        raise HTTPException(
            status_code=409, detail="No se pudo completar el registro"
        ) from None
    return UserPublic.from_user(user)
