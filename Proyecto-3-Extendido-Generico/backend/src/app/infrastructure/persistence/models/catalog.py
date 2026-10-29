from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.persistence.models.base import Base


class CategoriaModel(Base):
    """Relational representation of one tenant-scoped catalog category."""

    __tablename__ = "categoria"
    __table_args__ = (
        UniqueConstraint(
            "negocio_id",
            "nombre_normalizado",
            name="uq_categoria_negocio_nombre_normalizado",
        ),
        UniqueConstraint(
            "id",
            "negocio_id",
            name="uq_categoria_id_negocio",
        ),
        CheckConstraint(
            "btrim(nombre) <> ''",
            name="nombre_no_vacio",
        ),
        CheckConstraint(
            "btrim(nombre_normalizado) <> ''",
            name="nombre_normalizado_no_vacio",
        ),
        CheckConstraint(
            "estado IN ('ACTIVA', 'INACTIVA')",
            name="estado_valido",
        ),
        CheckConstraint(
            "version >= 1",
            name="version_positiva",
        ),
        Index(
            "ix_categoria_negocio_estado",
            "negocio_id",
            "estado",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    negocio_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("negocio.id", ondelete="RESTRICT"),
        nullable=False,
    )
    nombre: Mapped[str] = mapped_column(Text, nullable=False)
    nombre_normalizado: Mapped[str] = mapped_column(Text, nullable=False)
    estado: Mapped[str] = mapped_column(String, nullable=False)
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


class ArticuloCatalogoModel(Base):
    """Relational representation of the current catalog article configuration."""

    __tablename__ = "articulo_catalogo"
    __table_args__ = (
        ForeignKeyConstraint(
            ["categoria_id", "negocio_id"],
            ["categoria.id", "categoria.negocio_id"],
            name="fk_articulo_catalogo_categoria_mismo_negocio",
            ondelete="RESTRICT",
            match="SIMPLE",
        ),
        UniqueConstraint(
            "negocio_id",
            "nombre_normalizado",
            name="uq_articulo_catalogo_negocio_nombre_normalizado",
        ),
        UniqueConstraint(
            "id",
            "negocio_id",
            name="uq_articulo_catalogo_id_negocio",
        ),
        CheckConstraint(
            "btrim(nombre) <> ''",
            name="nombre_no_vacio",
        ),
        CheckConstraint(
            "btrim(nombre_normalizado) <> ''",
            name="nombre_normalizado_no_vacio",
        ),
        CheckConstraint(
            "descripcion IS NULL OR btrim(descripcion) <> ''",
            name="descripcion_funcional",
        ),
        CheckConstraint(
            "sku IS NULL OR btrim(sku) <> ''",
            name="sku_funcional",
        ),
        CheckConstraint(
            "sku_normalizado IS NULL OR btrim(sku_normalizado) <> ''",
            name="sku_normalizado_funcional",
        ),
        CheckConstraint(
            "(sku IS NULL) = (sku_normalizado IS NULL)",
            name="sku_presencia_coherente",
        ),
        CheckConstraint(
            "tipo IN ('BIEN', 'SERVICIO')",
            name="tipo_valido",
        ),
        CheckConstraint(
            "estado IN ('ACTIVO', 'INACTIVO')",
            name="estado_valido",
        ),
        CheckConstraint(
            "unidad_medida IN ('UNIDAD', 'KG', 'G', 'L', 'ML', 'M', 'CM', 'HORA')",
            name="unidad_medida_valida",
        ),
        CheckConstraint(
            "precio_base IS NULL OR precio_base >= 0",
            name="precio_base_no_negativo",
        ),
        CheckConstraint(
            "costo_referencia IS NULL OR costo_referencia >= 0",
            name="costo_referencia_no_negativo",
        ),
        CheckConstraint(
            "version >= 1",
            name="version_positiva",
        ),
        CheckConstraint(
            "tipo <> 'SERVICIO' OR "
            "(controla_stock = FALSE "
            "AND controla_vencimiento = FALSE "
            "AND puede_usarse_en_produccion = FALSE)",
            name="servicio_sin_capacidades_fisicas",
        ),
        CheckConstraint(
            "controla_vencimiento = FALSE OR "
            "(tipo = 'BIEN' AND controla_stock = TRUE)",
            name="vencimiento_requiere_bien_stock",
        ),
        CheckConstraint(
            "puede_usarse_en_produccion = FALSE OR "
            "(tipo = 'BIEN' AND controla_stock = TRUE)",
            name="produccion_requiere_bien_stock",
        ),
        CheckConstraint(
            "permite_descuento = FALSE OR es_vendible = TRUE",
            name="descuento_requiere_vendible",
        ),
        CheckConstraint(
            "estado <> 'ACTIVO' OR "
            "(es_comprable = TRUE "
            "OR es_vendible = TRUE "
            "OR puede_usarse_en_produccion = TRUE)",
            name="activo_con_uso_operativo",
        ),
        CheckConstraint(
            "es_vendible = FALSE OR "
            "(precio_base IS NOT NULL AND precio_base >= 0)",
            name="vendible_con_precio",
        ),
        Index(
            "uq_articulo_sku_negocio",
            "negocio_id",
            "sku_normalizado",
            unique=True,
            postgresql_where=text("sku_normalizado IS NOT NULL"),
        ),
        Index(
            "ix_articulo_catalogo_negocio_estado",
            "negocio_id",
            "estado",
        ),
        Index(
            "ix_articulo_catalogo_negocio_tipo_estado",
            "negocio_id",
            "tipo",
            "estado",
        ),
        Index(
            "ix_articulo_catalogo_negocio_categoria_estado",
            "negocio_id",
            "categoria_id",
            "estado",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    negocio_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("negocio.id", ondelete="RESTRICT"),
        nullable=False,
    )
    categoria_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        nullable=True,
    )
    nombre: Mapped[str] = mapped_column(Text, nullable=False)
    nombre_normalizado: Mapped[str] = mapped_column(Text, nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    tipo: Mapped[str] = mapped_column(String, nullable=False)
    unidad_medida: Mapped[str] = mapped_column(String, nullable=False)
    sku: Mapped[str | None] = mapped_column(Text, nullable=True)
    sku_normalizado: Mapped[str | None] = mapped_column(Text, nullable=True)
    precio_base: Mapped[Decimal | None] = mapped_column(
        Numeric(19, 4),
        nullable=True,
    )
    costo_referencia: Mapped[Decimal | None] = mapped_column(
        Numeric(19, 4),
        nullable=True,
    )
    es_comprable: Mapped[bool] = mapped_column(Boolean, nullable=False)
    es_vendible: Mapped[bool] = mapped_column(Boolean, nullable=False)
    controla_stock: Mapped[bool] = mapped_column(Boolean, nullable=False)
    puede_usarse_en_produccion: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
    )
    controla_vencimiento: Mapped[bool] = mapped_column(Boolean, nullable=False)
    permite_descuento: Mapped[bool] = mapped_column(Boolean, nullable=False)
    estado: Mapped[str] = mapped_column(String, nullable=False)
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


class ArticuloImagenModel(Base):
    """Relational child row for one article image reference."""

    __tablename__ = "articulo_imagen"
    __table_args__ = (
        ForeignKeyConstraint(
            ["articulo_id", "negocio_id"],
            ["articulo_catalogo.id", "articulo_catalogo.negocio_id"],
            name="fk_articulo_imagen_articulo_mismo_negocio",
            ondelete="CASCADE",
        ),
        UniqueConstraint(
            "articulo_id",
            "posicion",
            name="uq_articulo_imagen_articulo_posicion",
            deferrable=True,
            initially="DEFERRED",
        ),
        CheckConstraint(
            "posicion BETWEEN 1 AND 3",
            name="posicion_valida",
        ),
        CheckConstraint(
            "btrim(referencia_storage) <> ''",
            name="referencia_storage_no_vacia",
        ),
        Index(
            "uq_articulo_imagen_principal",
            "articulo_id",
            unique=True,
            postgresql_where=text("es_principal = TRUE"),
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    negocio_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    articulo_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    referencia_storage: Mapped[str] = mapped_column(Text, nullable=False)
    posicion: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    es_principal: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )
