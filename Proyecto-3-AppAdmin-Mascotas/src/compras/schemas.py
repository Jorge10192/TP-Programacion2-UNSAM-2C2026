from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from src.compras.models import (
    EstadoCompra,
    EstadoConsistencia,
    MagnitudUnidad,
    TipoActividadCompra,
    TipoControlStock,
)


# ---------------------------------------------------------------------------
# Proveedores
# ---------------------------------------------------------------------------


class ProveedorBase(BaseModel):
    nombre: str = Field(
        min_length=1,
        max_length=150,
    )

    direccion: str | None = Field(
        default=None,
        max_length=255,
    )

    observaciones: str | None = None


class ProveedorCreate(ProveedorBase):
    pass


class ProveedorUpdate(BaseModel):
    nombre: str = Field(
        min_length=1,
        max_length=150,
    )

    direccion: str | None = Field(
        default=None,
        max_length=255,
    )

    observaciones: str | None = None


class ProveedorResponse(ProveedorBase):
    id: int
    activo: bool
    fecha_creacion: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Categorias de insumos
# ---------------------------------------------------------------------------


class CategoriaInsumoBase(BaseModel):
    nombre: str = Field(
        min_length=1,
        max_length=100,
    )

    descripcion: str | None = None


class CategoriaInsumoCreate(CategoriaInsumoBase):
    pass


class CategoriaInsumoUpdate(BaseModel):
    nombre: str = Field(
        min_length=1,
        max_length=100,
    )

    descripcion: str | None = None


class CategoriaInsumoResponse(CategoriaInsumoBase):
    id: int
    activa: bool
    fecha_creacion: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Unidades de medida
# ---------------------------------------------------------------------------


class UnidadMedidaBase(BaseModel):
    nombre: str = Field(
        min_length=1,
        max_length=100,
    )

    simbolo: str | None = Field(
        default=None,
        max_length=20,
    )

    magnitud: MagnitudUnidad | None = None

    factor_base: Decimal | None = Field(
        default=None,
        gt=0,
    )


class UnidadMedidaCreate(UnidadMedidaBase):
    pass


class UnidadMedidaUpdate(BaseModel):
    nombre: str = Field(
        min_length=1,
        max_length=100,
    )

    simbolo: str | None = Field(
        default=None,
        max_length=20,
    )

    magnitud: MagnitudUnidad | None = None

    factor_base: Decimal | None = Field(
        default=None,
        gt=0,
    )


class UnidadMedidaResponse(UnidadMedidaBase):
    id: int
    activa: bool

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Insumos
# ---------------------------------------------------------------------------


class InsumoBase(BaseModel):
    nombre: str = Field(
        min_length=1,
        max_length=150,
    )

    categoria_id: int
    unidad_stock_id: int

    tipo_control_stock: TipoControlStock = (
        TipoControlStock.CONTROL_PERIODICO
    )

    controla_vencimiento: bool = False


class InsumoCreate(InsumoBase):
    pass


class InsumoUpdate(BaseModel):
    nombre: str = Field(
        min_length=1,
        max_length=150,
    )

    categoria_id: int
    unidad_stock_id: int

    tipo_control_stock: TipoControlStock

    controla_vencimiento: bool


class InsumoResponse(InsumoBase):
    id: int
    activo: bool
    fecha_creacion: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Presentaciones de insumos
# ---------------------------------------------------------------------------


class PresentacionInsumoBase(BaseModel):
    nombre: str = Field(
        min_length=1,
        max_length=150,
    )

    marca: str | None = Field(
        default=None,
        max_length=150,
    )

    unidad_compra_id: int

    contenido_por_unidad: Decimal | None = Field(
        default=None,
        gt=0,
    )

    unidad_contenido_id: int | None = None


class PresentacionInsumoCreate(PresentacionInsumoBase):
    insumo_id: int


class PresentacionInsumoUpdate(PresentacionInsumoBase):
    pass


class PresentacionInsumoResponse(PresentacionInsumoBase):
    id: int
    insumo_id: int
    activa: bool
    fecha_creacion: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Imagenes de insumos
# ---------------------------------------------------------------------------


class ImagenInsumoBase(BaseModel):
    archivo: str = Field(
        min_length=1,
        max_length=500,
    )

    principal: bool = False


class ImagenInsumoCreate(ImagenInsumoBase):
    insumo_id: int


class ImagenInsumoUpdate(BaseModel):
    archivo: str = Field(
        min_length=1,
        max_length=500,
    )

    principal: bool


class ImagenInsumoResponse(ImagenInsumoBase):
    id: int
    insumo_id: int
    activa: bool

    model_config = ConfigDict(from_attributes=True)


# ===========================================================================
# NUCLEO TRANSACCIONAL DE COMPRAS
# ===========================================================================


# ---------------------------------------------------------------------------
# Items de compra
# ---------------------------------------------------------------------------


class ItemCompraBase(BaseModel):
    insumo_id: int

    presentacion_id: int | None = None

    cantidad: Decimal = Field(
        gt=0,
    )

    unidad_compra_id: int

    contenido_por_unidad: Decimal | None = Field(
        default=None,
        gt=0,
    )

    unidad_contenido_id: int | None = None

    precio_total: Decimal = Field(
        gt=0,
        max_digits=14,
        decimal_places=2,
    )


class ItemCompraCreate(ItemCompraBase):
    pass


class ItemCompraUpdate(ItemCompraBase):
    pass


class ItemCompraResponse(ItemCompraBase):
    id: int
    compra_id: int
    cantidad_incorporada: Decimal

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Comprobantes
# ---------------------------------------------------------------------------


class ComprobanteBase(BaseModel):
    archivo: str = Field(
        min_length=1,
        max_length=500,
    )

    tipo: str | None = Field(
        default=None,
        max_length=100,
    )


class ComprobanteCreate(ComprobanteBase):
    pass


class ComprobanteUpdate(BaseModel):
    archivo: str = Field(
        min_length=1,
        max_length=500,
    )

    tipo: str | None = Field(
        default=None,
        max_length=100,
    )


class ComprobanteResponse(ComprobanteBase):
    id: int
    compra_id: int
    fecha_creacion: datetime
    activo: bool

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Registro de actividad
# ---------------------------------------------------------------------------


class RegistroActividadCompraResponse(BaseModel):
    id: int
    compra_id: int
    usuario_id: int | None

    fecha: datetime
    tipo: TipoActividadCompra
    descripcion: str

    datos_anteriores: dict | None
    datos_nuevos: dict | None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Compras
# ---------------------------------------------------------------------------


class CompraCreate(BaseModel):
    proveedor_id: int | None = None

    fecha_compra: date | None = None

    observaciones: str | None = None


class CompraUpdate(BaseModel):
    proveedor_id: int | None = None

    fecha_compra: date

    observaciones: str | None = None


class CompraResumenResponse(BaseModel):
    id: int

    proveedor_id: int | None
    creado_por_usuario_id: int | None

    fecha_compra: date

    estado: EstadoCompra
    estado_consistencia: EstadoConsistencia

    observaciones: str | None

    fecha_creacion: datetime
    fecha_confirmacion: datetime | None
    fecha_ultima_modificacion: datetime

    total: Decimal = Decimal("0")

    model_config = ConfigDict(from_attributes=True)


class CompraResponse(CompraResumenResponse):
    items: list[ItemCompraResponse] = Field(
        default_factory=list,
    )

    comprobantes: list[ComprobanteResponse] = Field(
        default_factory=list,
    )


class CompraDetalleResponse(CompraResponse):
    historial: list[RegistroActividadCompraResponse] = Field(
        default_factory=list,
    )
