from datetime import datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SqlEnum,
    ForeignKey,
    Numeric,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database.base import Base


# ============================================================
# ENUMS
# ============================================================


class MagnitudUnidad(str, Enum):
    MASA = "MASA"
    VOLUMEN = "VOLUMEN"
    SUPERFICIE = "SUPERFICIE"
    CANTIDAD = "CANTIDAD"


class TipoControlStock(str, Enum):
    CONTROL_MINIMO = "CONTROL_MINIMO"
    CONTROL_PERIODICO = "CONTROL_PERIODICO"
    SIN_CONTROL_DETALLADO = "SIN_CONTROL_DETALLADO"


# ============================================================
# PROVEEDOR
# ============================================================


class Proveedor(Base):
    __tablename__ = "proveedores"

    id: Mapped[int] = mapped_column(primary_key=True)

    nombre: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    direccion: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    observaciones: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    activo: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("1"),
        nullable=False,
    )

    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )


# ============================================================
# CATEGORIA DE INSUMO
# ============================================================


class CategoriaInsumo(Base):
    __tablename__ = "categorias_insumo"

    id: Mapped[int] = mapped_column(primary_key=True)

    nombre: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True,
    )

    descripcion: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    activa: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("1"),
        nullable=False,
    )

    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    insumos: Mapped[list["Insumo"]] = relationship(
        back_populates="categoria",
    )


# ============================================================
# UNIDAD DE MEDIDA
# ============================================================


class UnidadMedida(Base):
    __tablename__ = "unidades_medida"

    id: Mapped[int] = mapped_column(primary_key=True)

    nombre: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True,
    )

    simbolo: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    magnitud: Mapped[MagnitudUnidad | None] = mapped_column(
        SqlEnum(MagnitudUnidad),
        nullable=True,
    )

    factor_base: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 6),
        nullable=True,
    )

    activa: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("1"),
        nullable=False,
    )

    insumos: Mapped[list["Insumo"]] = relationship(
        back_populates="unidad_stock",
    )

    presentaciones_compra: Mapped[list["PresentacionInsumo"]] = relationship(
        foreign_keys="PresentacionInsumo.unidad_compra_id",
        back_populates="unidad_compra",
    )

    presentaciones_contenido: Mapped[list["PresentacionInsumo"]] = relationship(
        foreign_keys="PresentacionInsumo.unidad_contenido_id",
        back_populates="unidad_contenido",
    )


# ============================================================
# INSUMO
# ============================================================


class Insumo(Base):
    __tablename__ = "insumos"

    id: Mapped[int] = mapped_column(primary_key=True)

    nombre: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    categoria_id: Mapped[int] = mapped_column(
        ForeignKey("categorias_insumo.id"),
        nullable=False,
    )

    unidad_stock_id: Mapped[int] = mapped_column(
        ForeignKey("unidades_medida.id"),
        nullable=False,
    )

    tipo_control_stock: Mapped[TipoControlStock] = mapped_column(
        SqlEnum(TipoControlStock),
        default=TipoControlStock.CONTROL_PERIODICO,
        server_default=TipoControlStock.CONTROL_PERIODICO.value,
        nullable=False,
    )

    controla_vencimiento: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default=text("0"),
        nullable=False,
    )

    activo: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("1"),
        nullable=False,
    )

    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    categoria: Mapped["CategoriaInsumo"] = relationship(
        back_populates="insumos",
    )

    unidad_stock: Mapped["UnidadMedida"] = relationship(
        back_populates="insumos",
    )

    presentaciones: Mapped[list["PresentacionInsumo"]] = relationship(
        back_populates="insumo",
        cascade="all, delete-orphan",
    )

    imagenes: Mapped[list["ImagenInsumo"]] = relationship(
        back_populates="insumo",
        cascade="all, delete-orphan",
    )


# ============================================================
# PRESENTACION DE INSUMO
# ============================================================


class PresentacionInsumo(Base):
    __tablename__ = "presentaciones_insumo"

    id: Mapped[int] = mapped_column(primary_key=True)

    insumo_id: Mapped[int] = mapped_column(
        ForeignKey("insumos.id"),
        nullable=False,
    )

    nombre: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    marca: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    unidad_compra_id: Mapped[int] = mapped_column(
        ForeignKey("unidades_medida.id"),
        nullable=False,
    )

    contenido_por_unidad: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 4),
        nullable=True,
    )

    unidad_contenido_id: Mapped[int | None] = mapped_column(
        ForeignKey("unidades_medida.id"),
        nullable=True,
    )

    activa: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("1"),
        nullable=False,
    )

    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    insumo: Mapped["Insumo"] = relationship(
        back_populates="presentaciones",
    )

    unidad_compra: Mapped["UnidadMedida"] = relationship(
        foreign_keys=[unidad_compra_id],
        back_populates="presentaciones_compra",
    )

    unidad_contenido: Mapped["UnidadMedida | None"] = relationship(
        foreign_keys=[unidad_contenido_id],
        back_populates="presentaciones_contenido",
    )


# ============================================================
# IMAGEN DE INSUMO
# ============================================================


class ImagenInsumo(Base):
    __tablename__ = "imagenes_insumo"

    id: Mapped[int] = mapped_column(primary_key=True)

    insumo_id: Mapped[int] = mapped_column(
        ForeignKey("insumos.id"),
        nullable=False,
    )

    archivo: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    principal: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default=text("0"),
        nullable=False,
    )

    activa: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("1"),
        nullable=False,
    )

    insumo: Mapped["Insumo"] = relationship(
        back_populates="imagenes",
    )
