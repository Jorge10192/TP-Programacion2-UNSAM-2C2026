"""Login, validación, expiración y cierre de sesión; sin permisos de empresa."""
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
from sqlalchemy.orm import Session

from app.infrastructure.models import User, AuthSession
from app.modules.auth.passwords import hash_password, verify_password
from app.modules.auth.repository import UserRepository
from app.modules.auth.session_repository import AuthSessionRepository
from app.modules.auth.tokens import (
    SESSION_LIFETIME, new_token, token_digest, token_valid_shape, now_utc,
)


class InvalidCredentials(Exception):
    """401 genérico para email, contraseña, cuenta o token inválidos."""


@dataclass(frozen=True)
class LoginResult:
    access_token: str
    expires_at: datetime
    user: User


@dataclass(frozen=True)
class AuthContext:
    user: User
    auth_session: AuthSession


@lru_cache(maxsize=1)
def _dummy_hash() -> str:
    return hash_password("no-user-dummy-password-never-authenticates")


class SessionService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)
        self.sessions = AuthSessionRepository(db)

    def login(self, email: str, password: str) -> LoginResult:
        user = self.users.by_normalized_email(email)
        correct = verify_password(password, user.password_hash if user else _dummy_hash())
        if user is None or user.status != "ACTIVO" or not correct:
            raise InvalidCredentials()
        secret = new_token()
        expires = now_utc() + SESSION_LIFETIME
        auth_session = AuthSession(
            user_id=user.id, token_hash=token_digest(secret), expires_at=expires
        )
        try:
            self.sessions.add(auth_session)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        return LoginResult(secret, expires, user)

    def authenticate(self, token: str) -> AuthContext:
        if not token_valid_shape(token):
            raise InvalidCredentials()
        auth_session = self.sessions.by_digest(token_digest(token))
        if (
            auth_session is None or auth_session.revoked_at is not None
            or auth_session.expires_at <= now_utc()
        ):
            raise InvalidCredentials()
        user = self.db.get(User, auth_session.user_id)
        if user is None or user.status != "ACTIVO":
            raise InvalidCredentials()
        return AuthContext(user, auth_session)

    def logout(self, context: AuthContext) -> None:
        context.auth_session.revoked_at = now_utc()
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
