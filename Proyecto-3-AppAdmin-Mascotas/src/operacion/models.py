from datetime import date, datetime

from sqlalchemy import BigInteger, CheckConstraint, Date, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database.base import Base


class JornadaCaja(Base):
    __tablename__ = "jornadas_caja"
    __table_args__ = (
        CheckConstraint("fondo_centavos >= 0", name="jornada_fondo_valido"),
        CheckConstraint("(estado='ABIERTA' AND abierta_guard IS NOT NULL AND abierta_guard=1 AND cerrada_en IS NULL) OR "
                        "(estado='CERRADA' AND abierta_guard IS NULL AND cerrada_en IS NOT NULL)",
                        name="jornada_estado_coherente"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    request_id: Mapped[str] = mapped_column(String(36), unique=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    close_request_id: Mapped[str | None] = mapped_column(String(36), unique=True, nullable=True)
    close_request_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    fondo_centavos: Mapped[int] = mapped_column(BigInteger)
    estado: Mapped[str] = mapped_column(String(10), default="ABIERTA")
    abierta_guard: Mapped[int | None] = mapped_column(unique=True, nullable=True, default=1)
    version: Mapped[int] = mapped_column(BigInteger, default=0)
    abierta_por_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    abierta_en: Mapped[datetime] = mapped_column(DateTime)
    cerrada_por_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    cerrada_en: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    motivo: Mapped[str | None] = mapped_column(Text, nullable=True)
    contado_centavos: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    esperado_centavos: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    diferencia_centavos: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    ventas_efectivo_centavos: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    gastos_efectivo_centavos: Mapped[int | None] = mapped_column(BigInteger, nullable=True)


class Venta(Base):
    __tablename__ = "ventas"
    __table_args__ = (
        CheckConstraint("subtotal_centavos > 0 AND descuento_centavos >= 0 AND "
                        "descuento_centavos < subtotal_centavos AND "
                        "total_centavos=subtotal_centavos-descuento_centavos", name="venta_importes_validos"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    request_id: Mapped[str] = mapped_column(String(36), unique=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    jornada_id: Mapped[int] = mapped_column(ForeignKey("jornadas_caja.id"), index=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    creada_en: Mapped[datetime] = mapped_column(DateTime)
    observaciones: Mapped[str] = mapped_column(Text)
    subtotal_centavos: Mapped[int] = mapped_column(BigInteger)
    descuento_centavos: Mapped[int] = mapped_column(BigInteger)
    total_centavos: Mapped[int] = mapped_column(BigInteger)
    items: Mapped[list["ItemVenta"]] = relationship(lazy="selectin", order_by="ItemVenta.orden")
    pagos: Mapped[list["PagoVenta"]] = relationship(lazy="selectin", order_by="PagoVenta.orden")


class ItemVenta(Base):
    __tablename__ = "items_venta"
    __table_args__ = (
        UniqueConstraint("venta_id", "insumo_id", name="venta_insumo_unico"),
        UniqueConstraint("venta_id", "orden", name="venta_item_orden_unico"),
        CheckConstraint("cantidad_micro > 0 AND precio_unitario_centavos >= 0 AND total_centavos >= 0",
                        name="venta_item_valido"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    venta_id: Mapped[int] = mapped_column(ForeignKey("ventas.id"))
    orden: Mapped[int] = mapped_column()
    insumo_id: Mapped[int] = mapped_column(ForeignKey("insumos.id"))
    cantidad_micro: Mapped[int] = mapped_column(BigInteger)
    precio_unitario_centavos: Mapped[int] = mapped_column(BigInteger)
    total_centavos: Mapped[int] = mapped_column(BigInteger)
    nombre_snapshot: Mapped[str] = mapped_column(String(150))
    sku_snapshot: Mapped[str | None] = mapped_column(String(32), nullable=True)
    unidad_snapshot: Mapped[str] = mapped_column(String(20))


class PagoVenta(Base):
    __tablename__ = "pagos_venta"
    __table_args__ = (
        UniqueConstraint("venta_id", "orden", name="pago_venta_orden_unico"),
        CheckConstraint("importe_centavos > 0", name="pago_importe_positivo"),
        CheckConstraint("medio IN ('EFECTIVO','TRANSFERENCIA','CUENTA_DNI','TARJETA','MERCADO_PAGO_DECLARADO')",
                        name="pago_medio_declarado"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    venta_id: Mapped[int] = mapped_column(ForeignKey("ventas.id"), index=True)
    orden: Mapped[int] = mapped_column()
    medio: Mapped[str] = mapped_column(String(30))
    importe_centavos: Mapped[int] = mapped_column(BigInteger)


class Gasto(Base):
    __tablename__ = "gastos"
    __table_args__ = (CheckConstraint("importe_centavos > 0", name="gasto_importe_positivo"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    request_id: Mapped[str] = mapped_column(String(36), unique=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    jornada_id: Mapped[int] = mapped_column(ForeignKey("jornadas_caja.id"), index=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    fecha: Mapped[date] = mapped_column(Date)
    creada_en: Mapped[datetime] = mapped_column(DateTime)
    categoria: Mapped[str] = mapped_column(String(30))
    concepto: Mapped[str] = mapped_column(String(140))
    importe_centavos: Mapped[int] = mapped_column(BigInteger)
    medio: Mapped[str] = mapped_column(String(30))
    observaciones: Mapped[str] = mapped_column(Text)


class ConteoStock(Base):
    __tablename__ = "conteos_stock"
    id: Mapped[int] = mapped_column(primary_key=True)
    request_id: Mapped[str] = mapped_column(String(36), unique=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    motivo: Mapped[str] = mapped_column(String(180))
    creada_en: Mapped[datetime] = mapped_column(DateTime)
    items: Mapped[list["ItemConteoStock"]] = relationship(lazy="selectin", order_by="ItemConteoStock.orden")


class ItemConteoStock(Base):
    __tablename__ = "items_conteo_stock"
    __table_args__ = (
        UniqueConstraint("conteo_id", "insumo_id", name="conteo_insumo_unico"),
        UniqueConstraint("conteo_id", "orden", name="conteo_orden_unico"),
        CheckConstraint("cantidad_anterior_micro >= 0 AND cantidad_contada_micro >= 0", name="conteo_no_negativo"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    conteo_id: Mapped[int] = mapped_column(ForeignKey("conteos_stock.id"))
    insumo_id: Mapped[int] = mapped_column(ForeignKey("insumos.id"))
    orden: Mapped[int] = mapped_column()
    cantidad_anterior_micro: Mapped[int] = mapped_column(BigInteger)
    cantidad_contada_micro: Mapped[int] = mapped_column(BigInteger)
    version_anterior: Mapped[int] = mapped_column(BigInteger)
    version_resultante: Mapped[int] = mapped_column(BigInteger)
    nombre_snapshot: Mapped[str] = mapped_column(String(150))
    unidad_snapshot: Mapped[str] = mapped_column(String(20))
    movimiento_id: Mapped[int | None] = mapped_column(ForeignKey("movimientos_stock.id"), unique=True, nullable=True)
