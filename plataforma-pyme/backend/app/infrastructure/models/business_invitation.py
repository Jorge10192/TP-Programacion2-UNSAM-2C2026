"""Invitación a empresa: credencial efímera, sin acceso hasta la aceptación.

Un token en claro se entrega únicamente al emitir. PostgreSQL conserva su
SHA-256; índice parcial impide dos invitaciones pendientes al mismo email y
tenant. Estados vencidos pueden persistir como PENDIENTE hasta reevaluación:
expires_at prevalece sobre el estado en validaciones de aceptación.
"""
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint, DateTime, ForeignKey, Index, String, UniqueConstraint,
    Uuid, func, text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base


class BusinessInvitation(Base):
    __tablename__ = "business_invitations"
    __table_args__ = (
        UniqueConstraint("token_hash", name="uq_business_invitations_token_hash"),
        CheckConstraint(
            "length(email_normalizado) BETWEEN 3 AND 254",
            name="ck_business_invitation_email_length",
        ),
        CheckConstraint(
            "email_normalizado = lower(btrim(email_normalizado))",
            name="ck_business_invitation_email_normalized",
        ),
        CheckConstraint(
            "proposed_role IN ('ENCARGADO', 'TRABAJADOR')",
            name="ck_business_invitation_proposed_role",
        ),
        CheckConstraint(
            "status IN ('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA', 'EXPIRADA')",
            name="ck_business_invitation_status",
        ),
        CheckConstraint(
            "length(token_hash) = 64",
            name="ck_business_invitation_token_length",
        ),
        CheckConstraint(
            "expires_at > created_at",
            name="ck_business_invitation_expiration",
        ),
        Index("ix_business_invitations_business_id", "business_id"),
        Index(
            "uq_business_invitations_pending_email",
            "business_id", "email_normalizado", unique=True,
            postgresql_where=text("status = 'PENDIENTE'"),
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4,
    )
    business_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("businesses.id", name="fk_business_invitation_business", ondelete="RESTRICT"),
        nullable=False,
    )
    invited_by_user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", name="fk_business_invitation_inviter", ondelete="RESTRICT"),
        nullable=False,
    )
    email_normalizado: Mapped[str] = mapped_column(String(254), nullable=False)
    proposed_role: Mapped[str] = mapped_column(String(32), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="PENDIENTE",
        server_default=text("'PENDIENTE'"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=func.now(), onupdate=func.now(),
    )
