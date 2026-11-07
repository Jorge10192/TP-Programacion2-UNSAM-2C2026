"""RF-01: alta, login, perfil personal protegido y revocación de sesión."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.modules.auth.dependencies import unauthorized, current_auth
from app.modules.auth.schemas import RegisterRequest, UserPublic, LoginRequest, LoginResponse
from app.modules.auth.service import DuplicateIdentityError, RegistrationService
from app.modules.auth.session_service import AuthContext, InvalidCredentials, SessionService

router = APIRouter(prefix="/auth", tags=["autenticacion"])


@router.post("/register", status_code=201, response_model=UserPublic,
             responses={409: {"description": "No pudo completarse el registro"}})
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> UserPublic:
    try:
        user = RegistrationService(db).register(payload)
    except DuplicateIdentityError:
        raise HTTPException(status_code=409, detail="No se pudo completar el registro") from None
    return UserPublic.from_user(user)


@router.post("/login", response_model=LoginResponse,
             responses={401: {"description": "Credenciales invalidas"}})
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    try:
        result = SessionService(db).login(
            str(payload.email), payload.password.get_secret_value()
        )
    except InvalidCredentials:
        raise unauthorized() from None
    return LoginResponse(
        access_token=result.access_token, expires_at=result.expires_at,
        user=UserPublic.from_user(result.user),
    )


@router.get("/me", response_model=UserPublic,
            responses={401: {"description": "Sesion requerida"}})
def me(context: AuthContext = Depends(current_auth)) -> UserPublic:
    return UserPublic.from_user(context.user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT,
             responses={401: {"description": "Sesion requerida"}})
def logout(context: AuthContext = Depends(current_auth),
           db: Session = Depends(get_db)) -> Response:
    SessionService(db).logout(context)
    return Response(status_code=204)
