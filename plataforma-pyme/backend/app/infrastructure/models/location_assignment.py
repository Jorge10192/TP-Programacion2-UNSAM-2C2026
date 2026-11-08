"""Asignación operativa de un miembro a una ubicación del MISMO tenant.

La FK compuesta a memberships(business_id,user_id) reutiliza UNIQUE existente.
La FK compuesta a locations(business_id,id) impide referencias cruzadas,
incluso por SQL directo. No es una segunda membresía ni crea roles.
"""
from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    CheckConstraint, DateTime, ForeignKeyConstraint, Index, String, Uuid, func, text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base


class LocationAssignment(Base):
    __tablename__ = "location_assignments"
    __table_args__ = (
        ForeignKeyConstraint(
            ["business_id", "location_id"], ["locations.business_id", "locations.id"],
            name="fk_location_assignments_location_tenant", ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["business_id", "user_id"], ["memberships.business_id", "memberships.user_id"],
            name="fk_location_assignments_membership_tenant", ondelete="RESTRICT",
        ),
        CheckConstraint(
            "(status = 'ACTIVA' AND revoked_at IS NULL) OR "
            "(status = 'REVOCADA' AND revoked_at IS NOT NULL)",
            name="ck_location_assignments_status_revocation",
        ),
        Index("ix_location_assignments_business_user", "business_id", "user_id"),
    )

    business_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    location_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="ACTIVA", server_default=text("'ACTIVA'")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
        onupdate=func.now(),
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
