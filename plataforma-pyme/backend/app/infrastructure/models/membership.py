"""Membresía: identidad global autorizada dentro del contexto de una empresa.

La unicidad (business_id, user_id) evita permisos duplicados. El índice parcial
impide 2 titulares administrativos ACTIVOS. Una empresa SIEMPRE debe nacer con
su titular; esa atomicidad se implementará en el servicio E2-1.3B.
"""
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint, DateTime, ForeignKey, Index, String, UniqueConstraint,
    Uuid, func, text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base


class Membership(Base):
    __tablename__ = "memberships"
    __table_args__ = (
        UniqueConstraint("business_id", "user_id", name="uq_memberships_business_user"),
        CheckConstraint(
            "role IN ('TITULAR_ADMINISTRATIVO', 'ADMINISTRADOR', 'ENCARGADO', 'TRABAJADOR')",
            name="ck_memberships_role",
        ),
        CheckConstraint("status IN ('ACTIVA', 'INACTIVA')", name="ck_memberships_status"),
        Index("ix_memberships_user_id", "user_id"),
        Index(
            "uq_memberships_one_active_owner", "business_id", unique=True,
            postgresql_where=text("role = 'TITULAR_ADMINISTRATIVO' AND status = 'ACTIVA'"),
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("businesses.id", name="fk_memberships_business", ondelete="RESTRICT"),
        nullable=False,
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", name="fk_memberships_user", ondelete="RESTRICT"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="ACTIVA", server_default=text("'ACTIVA'")
    )
    job_title: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=func.now(), onupdate=func.now()
    )
