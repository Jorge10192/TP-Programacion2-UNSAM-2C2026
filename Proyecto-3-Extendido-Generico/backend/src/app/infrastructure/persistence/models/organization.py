from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.persistence.models.base import Base


class UsuarioModel(Base):
    """Relational representation of the global user identity."""

    __tablename__ = "usuario"
    __table_args__ = (
        UniqueConstraint("email_normalizado", name="uq_usuario_email_normalizado"),
        CheckConstraint("btrim(nombre) <> ''", name="usuario_nombre_no_vacio"),
        CheckConstraint("btrim(email) <> ''", name="usuario_email_no_vacio"),
        CheckConstraint(
            "btrim(email_normalizado) <> ''",
            name="usuario_email_normalizado_no_vacio",
        ),
        CheckConstraint(
            "btrim(password_hash) <> ''",
            name="usuario_password_hash_no_vacio",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    nombre: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    email_normalizado: Mapped[str] = mapped_column(Text, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    fecha_registro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )


class NegocioModel(Base):
    """Relational representation of the tenant root."""

    __tablename__ = "negocio"
    __table_args__ = (
        CheckConstraint("btrim(nombre) <> ''", name="negocio_nombre_no_vacio"),
        CheckConstraint(
            "rubro IS NULL OR btrim(rubro) <> ''",
            name="negocio_rubro_funcional",
        ),
        CheckConstraint(
            "moneda_base IN ('ARS')",
            name="negocio_moneda_base_valida",
        ),
        CheckConstraint("version >= 1", name="negocio_version_positiva"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    nombre: Mapped[str] = mapped_column(Text, nullable=False)
    rubro: Mapped[str | None] = mapped_column(Text, nullable=True)
    moneda_base: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        server_default=text("'ARS'"),
    )
    version: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        server_default=text("1"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    __mapper_args__ = {"version_id_col": version}


class NegocioModalidadModel(Base):
    """Structural persistence row for the 1..N modality set of a business."""

    __tablename__ = "negocio_modalidad"
    __table_args__ = (
        CheckConstraint(
            "modalidad IN ('REVENTA', 'PRODUCCION', 'SERVICIOS')",
            name="negocio_modalidad_valida",
        ),
    )

    negocio_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("negocio.id", ondelete="CASCADE"),
        primary_key=True,
    )
    modalidad: Mapped[str] = mapped_column(
        String,
        primary_key=True,
    )


class UsuarioNegocioModel(Base):
    """Historical membership joining one user to one tenant."""

    __tablename__ = "usuario_negocio"
    __table_args__ = (
        UniqueConstraint(
            "usuario_id",
            "negocio_id",
            name="uq_usuario_negocio_usuario_negocio",
        ),
        UniqueConstraint(
            "id",
            "negocio_id",
            name="uq_usuario_negocio_id_negocio",
        ),
        CheckConstraint(
            "rol IN ('PROPIETARIO', 'ENCARGADO', 'TRABAJADOR')",
            name="usuario_negocio_rol_valido",
        ),
        CheckConstraint(
            "estado IN ('ACTIVO', 'INACTIVO')",
            name="usuario_negocio_estado_valido",
        ),
        CheckConstraint(
            "version >= 1",
            name="usuario_negocio_version_positiva",
        ),
        Index(
            "ix_usuario_negocio_negocio_estado_rol",
            "negocio_id",
            "estado",
            "rol",
        ),
        Index(
            "ix_usuario_negocio_usuario_estado",
            "usuario_id",
            "estado",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    usuario_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("usuario.id", ondelete="RESTRICT"),
        nullable=False,
    )
    negocio_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("negocio.id", ondelete="RESTRICT"),
        nullable=False,
    )
    rol: Mapped[str] = mapped_column(String, nullable=False)
    estado: Mapped[str] = mapped_column(String, nullable=False)
    fecha_incorporacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    version: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        server_default=text("1"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    __mapper_args__ = {"version_id_col": version}


class InvitacionNegocioModel(Base):
    """Historical invitation with tenant-safe issuer reference."""

    __tablename__ = "invitacion_negocio"
    __table_args__ = (
        ForeignKeyConstraint(
            ["emisor_usuario_negocio_id", "negocio_id"],
            ["usuario_negocio.id", "usuario_negocio.negocio_id"],
            name="fk_invitacion_negocio_emisor_mismo_negocio",
            ondelete="RESTRICT",
        ),
        UniqueConstraint("token_hash", name="uq_invitacion_negocio_token_hash"),
        CheckConstraint(
            "btrim(email_destino) <> ''",
            name="invitacion_email_destino_no_vacio",
        ),
        CheckConstraint(
            "btrim(email_destino_normalizado) <> ''",
            name="invitacion_email_destino_normalizado_no_vacio",
        ),
        CheckConstraint(
            "btrim(token_hash) <> ''",
            name="invitacion_token_hash_no_vacio",
        ),
        CheckConstraint(
            "rol_propuesto IN ('ENCARGADO', 'TRABAJADOR')",
            name="invitacion_rol_propuesto_valido",
        ),
        CheckConstraint(
            "estado IN ('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA', 'EXPIRADA')",
            name="invitacion_estado_valido",
        ),
        CheckConstraint(
            "fecha_expiracion > fecha_emision",
            name="invitacion_periodo_valido",
        ),
        CheckConstraint(
            "version >= 1",
            name="invitacion_version_positiva",
        ),
        Index(
            "uq_invitacion_pendiente",
            "negocio_id",
            "email_destino_normalizado",
            unique=True,
            postgresql_where=text("estado = 'PENDIENTE'"),
        ),
        Index(
            "ix_invitacion_negocio_estado_expiracion",
            "negocio_id",
            "estado",
            "fecha_expiracion",
        ),
        Index(
            "ix_invitacion_email_estado",
            "email_destino_normalizado",
            "estado",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    negocio_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("negocio.id", ondelete="RESTRICT"),
        nullable=False,
    )
    email_destino: Mapped[str] = mapped_column(Text, nullable=False)
    email_destino_normalizado: Mapped[str] = mapped_column(Text, nullable=False)
    rol_propuesto: Mapped[str] = mapped_column(String, nullable=False)
    emisor_usuario_negocio_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
    )
    token_hash: Mapped[str] = mapped_column(Text, nullable=False)
    estado: Mapped[str] = mapped_column(String, nullable=False)
    fecha_emision: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    fecha_expiracion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    version: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        server_default=text("1"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    __mapper_args__ = {"version_id_col": version}
