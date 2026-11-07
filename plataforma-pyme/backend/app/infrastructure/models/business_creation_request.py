"""Registro duradero del comando idempotente de alta de Empresa.

El usuario aún no dispone de business_id cuando inicia el comando. Por eso la
clave primaria compuesta es (actor_user_id, idempotency_key) y ya garantiza
unicidad. No agregar UNIQUE redundante: PostgreSQL descarta esa restricción
duplicada y Alembic la reportaría como cambio pendiente.
"""
from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    CheckConstraint, DateTime, ForeignKey, String, UniqueConstraint, Uuid, func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base


class BusinessCreationRequest(Base):
    __tablename__ = "business_creation_requests"
    __table_args__ = (
        UniqueConstraint("business_id", name="uq_business_creation_business"),
        CheckConstraint(
            "length(request_sha256) = 64",
            name="ck_business_creation_request_digest",
        ),
    )

    actor_user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", name="fk_business_creation_actor", ondelete="RESTRICT"),
        primary_key=True,
    )
    idempotency_key: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True
    )
    request_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    business_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("businesses.id", name="fk_business_creation_business", ondelete="RESTRICT"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
