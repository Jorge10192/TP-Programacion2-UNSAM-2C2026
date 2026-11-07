"""Entidad tenant: los datos operativos pertenecen a una empresa, no a User.

El fundador es un hecho histórico. El titular administrativo vigente se obtiene
de Membership (rol TITULAR_ADMINISTRATIVO + estado ACTIVA), sin duplicación.
"""
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Uuid, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base


class Business(Base):
    __tablename__ = "businesses"
    __table_args__ = (
        CheckConstraint("length(btrim(name)) BETWEEN 2 AND 120", name="ck_businesses_name_length"),
        CheckConstraint("length(btrim(category)) BETWEEN 2 AND 120", name="ck_businesses_category_length"),
        CheckConstraint(
            "activity_kind IN ('PRODUCTOS', 'SERVICIOS', 'MIXTO')",
            name="ck_businesses_activity_kind",
        ),
        CheckConstraint("status IN ('ACTIVA', 'SUSPENDIDA')", name="ck_businesses_status"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    category: Mapped[str] = mapped_column(String(120), nullable=False)
    activity_kind: Mapped[str] = mapped_column(String(16), nullable=False)
    founder_user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", name="fk_businesses_founder_user", ondelete="RESTRICT"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="ACTIVA", server_default=text("'ACTIVA'")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=func.now(), onupdate=func.now()
    )
