"""Caso de uso registro: commit unico y mapeo preciso de colision UNIQUE."""
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.infrastructure.models import User
from app.modules.auth.passwords import hash_password
from app.modules.auth.repository import UserRepository
from app.modules.auth.schemas import RegisterRequest


class DuplicateIdentityError(Exception):
    """Correo normalizado ya existente."""


class RegistrationService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.repository = UserRepository(session)

    def register(self, payload: RegisterRequest) -> User:
        user = User(
            email_normalizado=str(payload.email),
            password_hash=hash_password(payload.password.get_secret_value()),
            display_name=payload.display_name,
            contact_phone=payload.contact_phone,
            status="ACTIVO",
        )
        try:
            self.repository.add(user)
            self.session.commit()
            self.session.refresh(user)
        except IntegrityError as error:
            self.session.rollback()
            name = getattr(getattr(error.orig, "diag", None), "constraint_name", None)
            if name == "uq_users_email_normalizado":
                raise DuplicateIdentityError() from None
            raise
        except Exception:
            self.session.rollback()
            raise
        return user
