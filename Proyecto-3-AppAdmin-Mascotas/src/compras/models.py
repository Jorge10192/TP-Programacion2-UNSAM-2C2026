from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database.base import Base


class Proveedor(Base):
    __tablename__ = "proveedores"

    id: Mapped[int] = mapped_column(primary_key=True)

    nombre: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    activo: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    observaciones: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )


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

    activa: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    insumos: Mapped[list["Insumo"]] = relationship(
        back_populates="unidad_stock",
    )


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

    activo: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
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
    