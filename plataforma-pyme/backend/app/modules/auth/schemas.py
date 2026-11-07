"""Schemas de registro y proyeccion publica de Usuario."""
import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr, field_validator

_PHONE = re.compile(r"^[+()\d\s.\-]+$")


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: SecretStr = Field(min_length=15, max_length=128)
    display_name: str = Field(min_length=2, max_length=70)
    contact_phone: str | None = Field(default=None, max_length=30)

    @field_validator("email", mode="before")
    @classmethod
    def strip_email(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        email = str(value).lower()
        if not email.isascii() or len(email) > 254:
            raise ValueError("Se requiere una direccion de correo ASCII valida")
        return email

    @field_validator("display_name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("El nombre debe tener al menos dos caracteres")
        return value

    @field_validator("contact_phone")
    @classmethod
    def normalize_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            return None
        if not _PHONE.fullmatch(value):
            raise ValueError("Formato de telefono invalido")
        return value


class UserPublic(BaseModel):
    """Contrato que nunca incluye contraseña ni hash."""

    id: UUID
    email: str
    display_name: str
    contact_phone: str | None
    status: str
    created_at: datetime

    @classmethod
    def from_user(cls, user: object) -> "UserPublic":
        return cls(
            id=user.id, email=user.email_normalizado,
            display_name=user.display_name,
            contact_phone=user.contact_phone, status=user.status,
            created_at=user.created_at,
        )
