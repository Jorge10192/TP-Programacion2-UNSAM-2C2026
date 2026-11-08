"""DTOs públicos de CU-03. Sin rol global ni contexto DEMO."""
from datetime import datetime
from typing import Literal, Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class CreateBusinessRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=2, max_length=120)
    category: str = Field(min_length=2, max_length=120)
    activity_kind: Literal["PRODUCTOS", "SERVICIOS", "MIXTO"]

    @field_validator("name", "category")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Se necesitan al menos dos caracteres")
        return value


class MembershipView(BaseModel):
    id: UUID
    user_id: UUID
    role: str
    status: str
    job_title: str | None

    @classmethod
    def from_record(cls, member: object) -> "MembershipView":
        return cls(
            id=member.id, user_id=member.user_id,
            role=member.role, status=member.status,
            job_title=member.job_title,
        )


class BusinessView(BaseModel):
    id: UUID
    name: str
    category: str
    activity_kind: str
    status: str
    founder_user_id: UUID
    created_at: datetime
    membership: MembershipView

    @classmethod
    def from_records(cls, company: object, member: object) -> "BusinessView":
        return cls(
            id=company.id, name=company.name,
            category=company.category, activity_kind=company.activity_kind,
            status=company.status, founder_user_id=company.founder_user_id,
            created_at=company.created_at,
            membership=MembershipView.from_record(member),
        )


class UpdateBusinessProfileRequest(BaseModel):
    """PATCH de perfil: al menos un campo, sin null explícitos.

    Prohibido actualizar founder_user_id, status, membresía o titularidad.
    Los campos omitidos se conservan y los espacios exteriores se recortan.
    """
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=2, max_length=120)
    category: str | None = Field(default=None, min_length=2, max_length=120)
    activity_kind: Literal["PRODUCTOS", "SERVICIOS", "MIXTO"] | None = None

    @field_validator("name", "category")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        result = value.strip()
        if len(result) < 2:
            raise ValueError("Se necesitan al menos dos caracteres")
        return result

    @model_validator(mode="after")
    def require_explicit_non_null_change(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Se requiere al menos un campo para actualizar")
        for field in self.model_fields_set:
            if getattr(self, field) is None:
                raise ValueError("No se permiten valores null en la edición")
        return self


class CreateBusinessInvitationRequest(BaseModel):
    """Emisión C.3: rol acotado, correo normalizado, sin otros datos del tenant."""
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    role: Literal["ENCARGADO", "TRABAJADOR"]

    @field_validator("email", mode="before")
    @classmethod
    def strip_recipient(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("email")
    @classmethod
    def normalize_recipient(cls, value: EmailStr) -> str:
        result = str(value).lower()
        if not result.isascii() or len(result) > 254:
            raise ValueError("Se requiere un correo ASCII valido")
        return result


class BusinessInvitationIssued(BaseModel):
    """Solo respuesta de emisión: el secreto NO puede recuperarse por GET."""
    id: UUID
    business_id: UUID
    email: str
    role: str
    status: Literal["PENDIENTE"]
    expires_at: datetime
    invitation_token: str

    @classmethod
    def from_record(cls, record: object, token: str) -> "BusinessInvitationIssued":
        return cls(
            id=record.id, business_id=record.business_id,
            email=record.email_normalizado, role=record.proposed_role,
            status="PENDIENTE", expires_at=record.expires_at,
            invitation_token=token,
        )


class AcceptBusinessInvitationRequest(BaseModel):
    """Un solo secreto opaco. La identidad se deriva del Bearer autenticado."""
    model_config = ConfigDict(extra="forbid")

    invitation_token: str = Field(
        min_length=43,
        max_length=43,
        pattern=r"^[a-zA-Z0-9_-]{43}$",
    )
