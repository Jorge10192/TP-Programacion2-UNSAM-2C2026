"""Identidad personal global, independiente de empresas.

E2-1.1 es SOLO persistencia: el hash Argon2id y el login llegan en E2-1.2.
"""
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, String, UniqueConstraint, Uuid, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base


class User(Base):
    """Cuenta global; los roles dependerán de membresías, no de users."""

    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("email_normalizado", name="uq_users_email_normalizado"),
        CheckConstraint(
            "length(email_normalizado) BETWEEN 3 AND 254",
            name="ck_users_email_length",
        ),
        CheckConstraint(
            "email_normalizado = lower(btrim(email_normalizado))",
            name="ck_users_email_normalized",
        ),
        CheckConstraint(
            "length(btrim(display_name)) BETWEEN 2 AND 70",
            name="ck_users_display_name_length",
        ),
        CheckConstraint(
            "length(password_hash) >= 20",
            name="ck_users_password_hash_length",
        ),
        CheckConstraint(
            "status IN ('ACTIVO', 'DESHABILITADO')",
            name="ck_users_status",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    email_normalizado: Mapped[str] = mapped_column(String(254), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    display_name: Mapped[str] = mapped_column(String(70), nullable=False)
    contact_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    status: Mapped[str] = mapped_column(
        String(24), nullable=False,
        default="ACTIVO", server_default=text("'ACTIVO'")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=func.now(), onupdate=func.now()
    )
