"""Schemas de registro y proyeccion publica de Usuario."""
import re
from datetime import datetime
from uuid import UUID
from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, EmailStr, Field, SecretStr, field_validator

_PHONE = re.compile(r"^[+()\d\s.\-]+$")


def _protect_password_input(value: object) -> object:
    """Ocultar el string antes de validar longitud, también en errores HTTP 422."""
    return SecretStr(value) if isinstance(value, str) else value


PasswordInput = Annotated[SecretStr, BeforeValidator(_protect_password_input)]


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: PasswordInput = Field(min_length=15, max_length=128)
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
        if "\x00" in value:
            raise ValueError("El nombre no puede contener caracteres nulos")
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


class LoginRequest(BaseModel):
    """Login: credenciales incorrectas reciben 401, sin regla de alta."""
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: PasswordInput = Field(min_length=1, max_length=1024)

    @field_validator("email", mode="before")
    @classmethod
    def strip_email(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        result = str(value).lower()
        if not result.isascii() or len(result) > 254:
            raise ValueError("Se requiere un email ASCII valido")
        return result


class LoginResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_at: datetime
    user: UserPublic
