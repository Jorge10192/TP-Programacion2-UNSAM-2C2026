from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum as SqlEnum,
    ForeignKey,
    Integer,
    JSON,
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


class EstadoCompra(str, Enum):
    BORRADOR = "BORRADOR"
    CONFIRMADA = "CONFIRMADA"
    ANULADA = "ANULADA"


class EstadoConsistencia(str, Enum):
    CONSISTENTE = "CONSISTENTE"
    REQUIERE_REVISION = "REQUIERE_REVISION"


class TipoActividadCompra(str, Enum):
    CREACION = "CREACION"
    EDICION = "EDICION"
    CONFIRMACION = "CONFIRMACION"
    ANULACION = "ANULACION"


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

    compras: Mapped[list["Compra"]] = relationship(
        back_populates="proveedor",
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

    items_compra_unidad: Mapped[list["ItemCompra"]] = relationship(
        foreign_keys="ItemCompra.unidad_compra_id",
        back_populates="unidad_compra",
    )

    items_compra_contenido: Mapped[list["ItemCompra"]] = relationship(
        foreign_keys="ItemCompra.unidad_contenido_id",
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

    items_compra: Mapped[list["ItemCompra"]] = relationship(
        back_populates="insumo",
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

    items_compra: Mapped[list["ItemCompra"]] = relationship(
        back_populates="presentacion",
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


# ============================================================
# COMPRA
# ============================================================


class Compra(Base):
    __tablename__ = "compras"

    id: Mapped[int] = mapped_column(primary_key=True)

    proveedor_id: Mapped[int | None] = mapped_column(
        ForeignKey("proveedores.id"),
        nullable=True,
    )

    # Temporal:
    # cuando se integre el módulo de autenticación este campo
    # tendrá ForeignKey hacia la tabla de usuarios.
    creado_por_usuario_id: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    fecha_compra: Mapped[date] = mapped_column(
        Date,
        default=date.today,
        server_default=text("CURRENT_DATE"),
        nullable=False,
    )

    estado: Mapped[EstadoCompra] = mapped_column(
        SqlEnum(EstadoCompra),
        default=EstadoCompra.BORRADOR,
        server_default=EstadoCompra.BORRADOR.value,
        nullable=False,
    )

    estado_consistencia: Mapped[EstadoConsistencia] = mapped_column(
        SqlEnum(EstadoConsistencia),
        default=EstadoConsistencia.CONSISTENTE,
        server_default=EstadoConsistencia.CONSISTENTE.value,
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

    fecha_confirmacion: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    fecha_ultima_modificacion: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    proveedor: Mapped["Proveedor | None"] = relationship(
        back_populates="compras",
    )

    items: Mapped[list["ItemCompra"]] = relationship(
        back_populates="compra",
        cascade="all, delete-orphan",
    )

    comprobantes: Mapped[list["Comprobante"]] = relationship(
        back_populates="compra",
        cascade="all, delete-orphan",
    )

    historial: Mapped[list["RegistroActividadCompra"]] = relationship(
        back_populates="compra",
        cascade="all, delete-orphan",
    )

    def calcular_total(self) -> Decimal:
        return sum(
            (
                item.precio_total
                for item in self.items
                if item.precio_total is not None
            ),
            Decimal("0"),
        )


# ============================================================
# ITEM DE COMPRA
# ============================================================


class ItemCompra(Base):
    __tablename__ = "items_compra"

    id: Mapped[int] = mapped_column(primary_key=True)

    compra_id: Mapped[int] = mapped_column(
        ForeignKey("compras.id"),
        nullable=False,
    )

    insumo_id: Mapped[int] = mapped_column(
        ForeignKey("insumos.id"),
        nullable=False,
    )

    presentacion_id: Mapped[int | None] = mapped_column(
        ForeignKey("presentaciones_insumo.id"),
        nullable=True,
    )

    cantidad: Mapped[Decimal] = mapped_column(
        Numeric(12, 4),
        nullable=False,
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

    precio_total: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
    )

    cantidad_incorporada: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        nullable=False,
    )

    compra: Mapped["Compra"] = relationship(
        back_populates="items",
    )

    insumo: Mapped["Insumo"] = relationship(
        back_populates="items_compra",
    )

    presentacion: Mapped["PresentacionInsumo | None"] = relationship(
        back_populates="items_compra",
    )

    unidad_compra: Mapped["UnidadMedida"] = relationship(
        foreign_keys=[unidad_compra_id],
        back_populates="items_compra_unidad",
    )

    unidad_contenido: Mapped["UnidadMedida | None"] = relationship(
        foreign_keys=[unidad_contenido_id],
        back_populates="items_compra_contenido",
    )

    def calcular_cantidad_incorporada(self) -> Decimal:
        if self.contenido_por_unidad is None:
            return self.cantidad

        return self.cantidad * self.contenido_por_unidad

    def calcular_precio_por_unidad(self) -> Decimal:
        if self.cantidad == 0:
            return Decimal("0")

        return self.precio_total / self.cantidad

    def calcular_precio_normalizado(self) -> Decimal:
        cantidad_incorporada = self.calcular_cantidad_incorporada()

        if cantidad_incorporada == 0:
            return Decimal("0")

        return self.precio_total / cantidad_incorporada


# ============================================================
# COMPROBANTE
# ============================================================


class Comprobante(Base):
    __tablename__ = "comprobantes_compra"

    id: Mapped[int] = mapped_column(primary_key=True)

    compra_id: Mapped[int] = mapped_column(
        ForeignKey("compras.id"),
        nullable=False,
    )

    archivo: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    tipo: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    activo: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("1"),
        nullable=False,
    )

    compra: Mapped["Compra"] = relationship(
        back_populates="comprobantes",
    )


# ============================================================
# REGISTRO DE ACTIVIDAD DE COMPRA
# ============================================================


class RegistroActividadCompra(Base):
    __tablename__ = "registros_actividad_compra"

    id: Mapped[int] = mapped_column(primary_key=True)

    compra_id: Mapped[int] = mapped_column(
        ForeignKey("compras.id"),
        nullable=False,
    )

    # Temporal:
    # se conectará mediante ForeignKey cuando se integre auth.
    usuario_id: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    fecha: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    tipo: Mapped[TipoActividadCompra] = mapped_column(
        SqlEnum(TipoActividadCompra),
        nullable=False,
    )

    descripcion: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    datos_anteriores: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    datos_nuevos: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    compra: Mapped["Compra"] = relationship(
        back_populates="historial",
    )
