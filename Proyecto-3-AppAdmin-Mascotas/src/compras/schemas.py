from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, StringConstraints, field_validator, model_validator

Nombre = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]
Cantidad = Annotated[Decimal, Field(gt=0, le=1_000_000_000, max_digits=18, decimal_places=6)]
Referencia = Annotated[str, StringConstraints(strip_whitespace=True, min_length=8, max_length=80)]


class Entrada(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Salida(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ProveedorCreate(Entrada):
    nombre: Nombre
    direccion: str | None = Field(default=None, max_length=255)
    observaciones: str | None = Field(default=None, max_length=2000)


class ProveedorResponse(Salida):
    id: int
    nombre: str
    activo: bool
    observaciones: str | None
    direccion: str | None
    fecha_creacion: datetime


class CategoriaCreate(Entrada):
    nombre: Nombre
    descripcion: str | None = Field(default=None, max_length=2000)


class CategoriaResponse(Salida):
    id: int
    nombre: str
    activo: bool
    descripcion: str | None
    fecha_creacion: datetime


class UnidadCreate(Entrada):
    nombre: Nombre
    simbolo: str | None = Field(default=None, max_length=20)
    dimension: Literal["masa", "volumen", "superficie", "conteo", "comercial"] = Field(validation_alias=AliasChoices("dimension", "magnitud"))
    factor: Cantidad = Field(default=Decimal("1"), validation_alias=AliasChoices("factor", "factor_base"))

    @field_validator("dimension", mode="before")
    @classmethod
    def normalizar_dimension(cls, value):
        if isinstance(value, str):
            return {"MASA": "masa", "VOLUMEN": "volumen", "SUPERFICIE": "superficie", "CANTIDAD": "conteo"}.get(value, value)
        return value

    @model_validator(mode="after")
    def unidad_comercial(self):
        if self.dimension == "comercial" and self.factor != 1:
            raise ValueError("Una presentación comercial usa factor 1 y contenido explícito en la compra")
        return self


class UnidadResponse(Salida):
    id: int
    nombre: str
    simbolo: str | None
    activo: bool
    dimension: str
    factor: Decimal


class InsumoCreate(Entrada):
    nombre: Nombre
    categoria_id: int = Field(gt=0)
    unidad_stock_id: int = Field(gt=0)
    tipo_control_stock: Literal["CONTROL_MINIMO", "CONTROL_PERIODICO", "SIN_CONTROL_DETALLADO"] = "CONTROL_PERIODICO"
    controla_vencimiento: bool = False


class InsumoResponse(Salida):
    id: int
    nombre: str
    activo: bool
    categoria_id: int
    unidad_stock_id: int
    tipo_control_stock: str
    controla_vencimiento: bool
    fecha_creacion: datetime


class PresentacionBase(Entrada):
    nombre: Nombre
    marca: str | None = Field(default=None, max_length=150)
    unidad_compra_id: int = Field(gt=0)
    contenido_por_unidad: Cantidad | None = None
    unidad_contenido_id: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def contenido_completo(self):
        if (self.contenido_por_unidad is None) != (self.unidad_contenido_id is None):
            raise ValueError("Contenido y unidad de contenido deben indicarse juntos")
        return self


class PresentacionCreate(PresentacionBase):
    insumo_id: int = Field(gt=0)


class PresentacionResponse(Salida):
    id: int
    insumo_id: int
    nombre: str
    marca: str | None
    unidad_compra_id: int
    contenido_por_unidad: Decimal | None
    unidad_contenido_id: int | None
    activo: bool
    fecha_creacion: datetime


class ImagenBase(Entrada):
    archivo: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
    principal: bool = False


class ImagenCreate(ImagenBase):
    insumo_id: int = Field(gt=0)


class ImagenResponse(Salida):
    id: int
    insumo_id: int
    archivo: str
    principal: bool
    activo: bool


class ItemCreate(Entrada):
    insumo_id: int = Field(gt=0)
    presentacion_id: int | None = Field(default=None, gt=0)
    cantidad: Cantidad
    unidad_compra_id: int | None = Field(default=None, gt=0)
    contenido_por_unidad: Cantidad | None = None
    unidad_contenido_id: int | None = Field(default=None, gt=0)
    precio_total: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    lote: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)] | None = None
    vencimiento: date | None = None

    @model_validator(mode="after")
    def contenido_completo(self):
        if self.unidad_compra_id is None and self.presentacion_id is None:
            raise ValueError("Indique unidad de compra o presentación")
        if (self.contenido_por_unidad is None) != (self.unidad_contenido_id is None):
            raise ValueError("Contenido y unidad de contenido deben indicarse juntos")
        return self


class CompraCreate(Entrada):
    referencia: Referencia
    proveedor_id: int | None = Field(default=None, gt=0)
    fecha: date = Field(default_factory=date.today, validation_alias=AliasChoices("fecha", "fecha_compra"))
    observaciones: str | None = Field(default=None, max_length=2000)
    items: list[ItemCreate] = Field(default_factory=list, max_length=100)

    @model_validator(mode="after")
    def sin_repetidos(self):
        ids = [item.insumo_id for item in self.items]
        if len(ids) != len(set(ids)):
            raise ValueError("Agrupe cada insumo en un único ítem")
        return self


class ItemResponse(Salida):
    id: int
    insumo_id: int
    presentacion_id: int | None
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
    proveedor_id: int | None
    usuario_id: int
    referencia: str
    fecha: date
    estado: str
    observaciones: str | None
    motivo_anulacion: str | None
    anulada_por_id: int | None
    fecha_anulacion: datetime | None
    fecha_creacion: datetime
    fecha_confirmacion: datetime | None
    fecha_ultima_modificacion: datetime
    total: Decimal
    items: list[ItemResponse]


class CompraUpdate(Entrada):
    proveedor_id: int | None = Field(default=None, gt=0)
    fecha: date = Field(validation_alias=AliasChoices("fecha", "fecha_compra"))
    observaciones: str | None = Field(default=None, max_length=2000)


class ActividadResponse(Salida):
    id: int
    compra_id: int
    usuario_id: int
    fecha: datetime
    tipo: str
    descripcion: str
    datos_anteriores: dict | None
    datos_nuevos: dict | None


class CompraDetalleResponse(CompraResponse):
    historial: list[ActividadResponse]


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
