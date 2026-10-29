from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.persistence.models.base import Base


class AuditoriaCambioModel(Base):
    """Append-only technical audit row for tenant-scoped changes."""

    __tablename__ = "auditoria_cambio"
    __table_args__ = (
        CheckConstraint(
            "btrim(entidad_tipo) <> ''",
            name="entidad_tipo_no_vacio",
        ),
        CheckConstraint(
            "btrim(accion) <> ''",
            name="accion_no_vacio",
        ),
        CheckConstraint(
            "jsonb_typeof(cambios) = 'object'",
            name="cambios_objeto",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    negocio_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("negocio.id", ondelete="RESTRICT"),
        nullable=False,
    )
    actor_usuario_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("usuario.id", ondelete="RESTRICT"),
        nullable=False,
    )
    entidad_tipo: Mapped[str] = mapped_column(Text, nullable=False)
    entidad_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    accion: Mapped[str] = mapped_column(Text, nullable=False)
    cambios: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False)
    ocurrido_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )


Index(
    "ix_auditoria_cambio_negocio_entidad_ocurrido",
    AuditoriaCambioModel.negocio_id,
    AuditoriaCambioModel.entidad_tipo,
    AuditoriaCambioModel.entidad_id,
    AuditoriaCambioModel.ocurrido_en.desc(),
)
