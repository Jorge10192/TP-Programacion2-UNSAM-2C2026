from datetime import datetime
from decimal import Decimal

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from src.database.base import Base


class Existencia(Base):
    __tablename__ = "existencias"
    __table_args__ = (CheckConstraint("cantidad_micro >= 0", name="stock_no_negativo"),)
    insumo_id: Mapped[int] = mapped_column(ForeignKey("insumos.id"), primary_key=True)
    cantidad_micro: Mapped[int] = mapped_column(BigInteger, default=0)

    @property
    def cantidad(self) -> Decimal:
        return Decimal(self.cantidad_micro) / 1_000_000


class MovimientoStock(Base):
    __tablename__ = "movimientos_stock"
    __table_args__ = (CheckConstraint("cantidad_micro != 0", name="movimiento_no_vacio"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    insumo_id: Mapped[int] = mapped_column(ForeignKey("insumos.id"))
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    compra_id: Mapped[int | None] = mapped_column(ForeignKey("compras.id"), nullable=True)
    clave: Mapped[str] = mapped_column(String(150), unique=True)
    huella: Mapped[str | None] = mapped_column(String(64), nullable=True)
    tipo: Mapped[str] = mapped_column(String(20))
    cantidad_micro: Mapped[int] = mapped_column(BigInteger)
    motivo: Mapped[str] = mapped_column(Text)
    fecha: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    @property
    def cantidad(self) -> Decimal:
        return Decimal(self.cantidad_micro) / 1_000_000
