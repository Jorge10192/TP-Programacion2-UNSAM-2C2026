from datetime import datetime, timezone
import hashlib
import hmac
import secrets

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from src.auth.models import Sesion, Usuario
from src.database.session import get_db


def ahora() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 600_000)
    return f"pbkdf2_sha256$600000${salt.hex()}${digest.hex()}"


def verificar_password(password: str, stored: str) -> bool:
    algorithm, iterations, salt, expected = stored.split("$")
    if algorithm != "pbkdf2_sha256":
        return False
    actual = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(iterations))
    return hmac.compare_digest(actual.hex(), expected)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


bearer = HTTPBearer(auto_error=False)


def usuario_actual(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> Usuario:
    error = HTTPException(401, "Sesión inválida o vencida", headers={"WWW-Authenticate": "Bearer"})
    if credentials is None:
        raise error
    session = db.get(Sesion, hash_token(credentials.credentials))
    if session is None or session.vence <= ahora():
        raise error
    user = db.get(Usuario, session.usuario_id)
    if user is None or not user.activo:
        raise error
    return user


def administrador(user: Usuario = Depends(usuario_actual)) -> Usuario:
    if user.rol != "administrador":
        raise HTTPException(403, "Requiere administrador")
    return user
