"""DTO de asignaciones: el usuario solo elige estado en contexto tenant.

La identidad de la membresía y ubicación proviene de la ruta, nunca del body.
"""
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator


class ChangeLocationAssignmentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["ACTIVA", "REVOCADA"]


class LocationAssignmentView(BaseModel):
    business_id: UUID
    location_id: UUID
    membership_id: UUID
    user_id: UUID
    status: Literal["ACTIVA", "REVOCADA"]
    created_at: datetime
    updated_at: datetime
    revoked_at: datetime | None

    @field_validator("created_at", "updated_at", "revoked_at")
    @classmethod
    def canonical_utc(cls, value: datetime | None) -> datetime | None:
        # Timestamptz reads and freshly assigned UTC values describe the same instant.
        # Keep the API representation stable without changing stored timestamps.
        if value is not None and value.utcoffset() is not None:
            return value.astimezone(timezone.utc)
        return value

    @classmethod
    def from_record(cls, record: object, membership_id: UUID) -> "LocationAssignmentView":
        return cls(
            business_id=record.business_id, location_id=record.location_id,
            membership_id=membership_id, user_id=record.user_id, status=record.status,
            created_at=record.created_at, updated_at=record.updated_at,
            revoked_at=record.revoked_at,
        )
