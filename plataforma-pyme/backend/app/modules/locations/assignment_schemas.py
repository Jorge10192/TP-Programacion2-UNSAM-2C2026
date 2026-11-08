"""DTO de asignaciones: el usuario solo elige estado en contexto tenant.

La identidad de la membresía y ubicación proviene de la ruta, nunca del body.
"""
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


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

    @classmethod
    def from_record(cls, record: object, membership_id: UUID) -> "LocationAssignmentView":
        return cls(
            business_id=record.business_id, location_id=record.location_id,
            membership_id=membership_id, user_id=record.user_id, status=record.status,
            created_at=record.created_at, updated_at=record.updated_at,
            revoked_at=(
                record.revoked_at.astimezone(timezone.utc)
                if record.revoked_at is not None else None
            ),
        )
