from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

Nombre = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]
Cantidad = Annotated[Decimal, Field(gt=0, le=1_000_000_000, max_digits=18, decimal_places=6)]
Referencia = Annotated[str, StringConstraints(strip_whitespace=True, min_length=8, max_length=80)]


class Entrada(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Salida(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ProveedorCreate(Entrada):
    nombre: Nombre
    observaciones: str | None = Field(default=None, max_length=2000)


class ProveedorResponse(Salida):
    id: int
    nombre: str
    activo: bool
    observaciones: str | None
    fecha_creacion: datetime


class CategoriaCreate(Entrada):
    nombre: Nombre


class CategoriaResponse(Salida):
    id: int
    nombre: str
    activo: bool


class UnidadCreate(CategoriaCreate):
    dimension: Literal["masa", "volumen", "conteo", "comercial"]
    factor: Cantidad = Decimal("1")

    @model_validator(mode="after")
    def unidad_comercial(self):
        if self.dimension == "comercial" and self.factor != 1:
            raise ValueError("Una presentación comercial usa factor 1 y contenido explícito en la compra")
        return self


class UnidadResponse(CategoriaResponse):
    dimension: str
    factor: Decimal


class InsumoCreate(CategoriaCreate):
    categoria_id: int = Field(gt=0)
    unidad_stock_id: int = Field(gt=0)


class InsumoResponse(CategoriaResponse):
    categoria_id: int
    unidad_stock_id: int


class ItemCreate(Entrada):
    insumo_id: int = Field(gt=0)
    cantidad: Cantidad
    unidad_compra_id: int = Field(gt=0)
    contenido_por_unidad: Cantidad | None = None
    unidad_contenido_id: int | None = Field(default=None, gt=0)
    precio_total: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    lote: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)] | None = None
    vencimiento: date | None = None

    @model_validator(mode="after")
    def contenido_completo(self):
        if (self.contenido_por_unidad is None) != (self.unidad_contenido_id is None):
            raise ValueError("Contenido y unidad de contenido deben indicarse juntos")
        return self


class CompraCreate(Entrada):
    referencia: Referencia
    proveedor_id: int = Field(gt=0)
    fecha: date
    observaciones: str | None = Field(default=None, max_length=2000)
    items: list[ItemCreate] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def sin_repetidos(self):
        ids = [item.insumo_id for item in self.items]
        if len(ids) != len(set(ids)):
            raise ValueError("Agrupe cada insumo en un único ítem")
        return self


class ItemResponse(Salida):
    id: int
    insumo_id: int
    cantidad: Decimal
    unidad_compra_id: int
    contenido_por_unidad: Decimal | None
    unidad_contenido_id: int | None
    unidad_stock_id: int
    cantidad_incorporada: Decimal
    precio_total: Decimal
    lote: str | None
    vencimiento: date | None


class CompraResponse(Salida):
    id: int
    proveedor_id: int
    usuario_id: int
    referencia: str
    fecha: date
    estado: str
    observaciones: str | None
    motivo_anulacion: str | None
    anulada_por_id: int | None
    fecha_anulacion: datetime | None
    total: Decimal
    items: list[ItemResponse]


class Motivo(Entrada):
    motivo: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=2000)]


class AjusteCreate(Motivo):
    referencia: Referencia
    insumo_id: int = Field(gt=0)
    cantidad: Decimal = Field(ge=-1_000_000_000, le=1_000_000_000, max_digits=18, decimal_places=6)

    @model_validator(mode="after")
    def no_cero(self):
        if self.cantidad == 0:
            raise ValueError("El ajuste no puede ser cero")
        return self


class StockResponse(Salida):
    insumo_id: int
    cantidad: Decimal


class MovimientoResponse(StockResponse):
    id: int
    usuario_id: int
    compra_id: int | None
    tipo: str
    motivo: str
    fecha: datetime
