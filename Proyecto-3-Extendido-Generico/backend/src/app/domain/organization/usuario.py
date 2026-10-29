from datetime import datetime
from uuid import UUID

from app.domain.organization._validation import (
    normalize_required_text,
    normalize_utc_datetime,
    require_uuid4,
)
from app.domain.organization.email import Email
from app.domain.organization.errors import EmailInvalidoError


class Usuario:
    """Global user identity, independent from any business membership."""

    __slots__ = ("_email", "_fecha_registro", "_id", "_nombre", "_updated_at")

    def __init__(
        self,
        *,
        id: UUID,
        email: Email,
        nombre: str,
        fecha_registro: datetime,
        updated_at: datetime,
    ) -> None:
        if not isinstance(email, Email):
            raise EmailInvalidoError("email debe ser un Email válido.")

        self._id = require_uuid4(id, field_name="id")
        self._email = email
        self._nombre = normalize_required_text(nombre, field_name="nombre")
        self._fecha_registro = normalize_utc_datetime(
            fecha_registro,
            field_name="fecha_registro",
        )
        self._updated_at = normalize_utc_datetime(updated_at, field_name="updated_at")

    @property
    def id(self) -> UUID:
        return self._id

    @property
    def email(self) -> Email:
        return self._email

    @property
    def nombre(self) -> str:
        return self._nombre

    @property
    def fecha_registro(self) -> datetime:
        return self._fecha_registro

    @property
    def updated_at(self) -> datetime:
        return self._updated_at
