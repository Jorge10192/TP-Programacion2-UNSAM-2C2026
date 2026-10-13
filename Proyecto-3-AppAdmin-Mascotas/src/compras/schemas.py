from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Proveedores
# ---------------------------------------------------------------------------

class ProveedorBase(BaseModel):
    nombre: str = Field(
        min_length=1,
        max_length=150,
    )
    observaciones: str | None = None


class ProveedorCreate(ProveedorBase):
    pass


class ProveedorUpdate(BaseModel):
    nombre: str = Field(
        min_length=1,
        max_length=150,
    )
    observaciones: str | None = None


class ProveedorResponse(ProveedorBase):
    id: int
    activo: bool
    fecha_creacion: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Categorías de insumos
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


class InsumoCreate(InsumoBase):
    pass


class InsumoUpdate(BaseModel):
    nombre: str = Field(
        min_length=1,
        max_length=150,
    )

    categoria_id: int
    unidad_stock_id: int


class InsumoResponse(InsumoBase):
    id: int
    activo: bool
    fecha_creacion: datetime

    model_config = ConfigDict(from_attributes=True)
