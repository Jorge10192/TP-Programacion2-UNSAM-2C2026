"""DTOs públicos de CU-03. Sin rol global ni contexto DEMO."""
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


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
