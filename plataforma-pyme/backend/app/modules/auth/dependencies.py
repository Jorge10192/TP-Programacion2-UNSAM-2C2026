"""Dependency de autorización: Bearer token, status y vencimiento verificados en DB."""
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.modules.auth.session_service import AuthContext, InvalidCredentials, SessionService

bearer = HTTPBearer(auto_error=False)


def unauthorized() -> HTTPException:
    return HTTPException(
        status_code=401,
        detail="Credenciales invalidas o sesion vencida",
        headers={"WWW-Authenticate": "Bearer"},
    )


def current_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> AuthContext:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized()
    try:
        return SessionService(db).authenticate(credentials.credentials)
    except InvalidCredentials:
        raise unauthorized() from None
