from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import BigInteger, Boolean, CheckConstraint, Date, DateTime, ForeignKey, LargeBinary, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database.base import Base


class Proveedor(Base):
    __tablename__ = "proveedores"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    nombre: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    activo: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )

    observaciones: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False
    )


class CategoriaInsumo(Base):
    __tablename__ = "categorias_insumo"
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150), unique=True)
    activo: Mapped[bool] = mapped_column(default=True)


class UnidadMedida(Base):
    __tablename__ = "unidades_medida"
    __table_args__ = (CheckConstraint("factor > 0", name="unidad_factor_positivo"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150), unique=True)
    dimension: Mapped[str] = mapped_column(String(30))
    factor: Mapped[Decimal] = mapped_column(Numeric(18, 6))
    activo: Mapped[bool] = mapped_column(default=True)


class Insumo(Base):
    __tablename__ = "insumos"
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150), unique=True)
    categoria_id: Mapped[int] = mapped_column(ForeignKey("categorias_insumo.id"))
    unidad_stock_id: Mapped[int] = mapped_column(ForeignKey("unidades_medida.id"))
    activo: Mapped[bool] = mapped_column(default=True)


class Compra(Base):
    __tablename__ = "compras"
    __table_args__ = (UniqueConstraint("usuario_id", "referencia", name="compra_referencia_unica"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    proveedor_id: Mapped[int] = mapped_column(ForeignKey("proveedores.id"))
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    referencia: Mapped[str] = mapped_column(String(80))
    huella: Mapped[str] = mapped_column(String(64))
    fecha: Mapped[date] = mapped_column(Date)
    estado: Mapped[str] = mapped_column(String(30), default="BORRADOR")
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)
    motivo_anulacion: Mapped[str | None] = mapped_column(Text, nullable=True)
    anulada_por_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    fecha_anulacion: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    items: Mapped[list["ItemCompra"]] = relationship(cascade="all, delete-orphan", lazy="selectin")

    @property
    def total(self) -> Decimal:
        return sum((item.precio_total for item in self.items), Decimal("0"))


class ItemCompra(Base):
    __tablename__ = "items_compra"
    __table_args__ = (
        UniqueConstraint("compra_id", "insumo_id", name="compra_insumo_unico"),
        CheckConstraint("cantidad_micro > 0", name="item_cantidad_positiva"),
        CheckConstraint("precio_centavos >= 0", name="item_precio_valido"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    compra_id: Mapped[int] = mapped_column(ForeignKey("compras.id"))
    insumo_id: Mapped[int] = mapped_column(ForeignKey("insumos.id"))
    cantidad: Mapped[Decimal] = mapped_column(Numeric(18, 6))
    unidad_compra_id: Mapped[int] = mapped_column(ForeignKey("unidades_medida.id"))
    contenido_por_unidad: Mapped[Decimal | None] = mapped_column(Numeric(18, 6), nullable=True)
    unidad_contenido_id: Mapped[int | None] = mapped_column(ForeignKey("unidades_medida.id"), nullable=True)
    unidad_stock_id: Mapped[int] = mapped_column(ForeignKey("unidades_medida.id"))
    cantidad_micro: Mapped[int] = mapped_column(BigInteger)
    precio_centavos: Mapped[int] = mapped_column(BigInteger)
    lote: Mapped[str | None] = mapped_column(String(100), nullable=True)
    vencimiento: Mapped[date | None] = mapped_column(Date, nullable=True)

    @property
    def cantidad_incorporada(self) -> Decimal:
        return Decimal(self.cantidad_micro) / 1_000_000

    @property
    def precio_total(self) -> Decimal:
        return Decimal(self.precio_centavos) / 100


class Comprobante(Base):
    __tablename__ = "comprobantes"
    __table_args__ = (UniqueConstraint("compra_id", "huella", name="comprobante_unico"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    compra_id: Mapped[int] = mapped_column(ForeignKey("compras.id"))
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    tipo: Mapped[str] = mapped_column(String(40))
    huella: Mapped[str] = mapped_column(String(64))
    contenido: Mapped[bytes] = mapped_column(LargeBinary)
