"""Ubicación empresarial: espacio operativo con capacidades independientes.

E2-2 A registra configuración; no crea stock, recepciones ni ventas.
El servicio de E2-2 B validará membresía, tenant y cambios de principal.
"""
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean, CheckConstraint, DateTime, ForeignKey, Index, String, UniqueConstraint, Uuid, func, text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base


class Location(Base):
    __tablename__ = "locations"
    __table_args__ = (
        CheckConstraint(
            "length(btrim(name)) BETWEEN 2 AND 80",
            name="ck_locations_name_length",
        ),
        CheckConstraint(
            "kind IN ('LOCAL', 'FERIA', 'DEPOSITO', 'OFICINA', 'CASA', 'OTRO')",
            name="ck_locations_kind",
        ),
        CheckConstraint(
            "status IN ('ACTIVA', 'PAUSADA')",
            name="ck_locations_status",
        ),
        CheckConstraint(
            "NOT is_primary OR status = 'ACTIVA'",
            name="ck_locations_primary_active",
        ),
        UniqueConstraint("business_id", "id", name="uq_locations_business_id_id"),
        Index("ix_locations_business_id", "business_id"),
        Index(
            "uq_locations_one_active_primary",
            "business_id",
            unique=True,
            postgresql_where=text("is_primary AND status = 'ACTIVA'"),
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    business_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("businesses.id", name="fk_locations_business", ondelete="RESTRICT"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    address: Mapped[str] = mapped_column(
        String(160), nullable=False, default="", server_default=text("''")
    )
    map_url: Mapped[str] = mapped_column(
        String(2048), nullable=False, default="", server_default=text("''")
    )
    can_sell: Mapped[bool] = mapped_column(Boolean, nullable=False)
    can_store: Mapped[bool] = mapped_column(Boolean, nullable=False)
    is_primary: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
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
