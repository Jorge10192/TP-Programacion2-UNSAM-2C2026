from datetime import datetime

from pydantic import BaseModel, ConfigDict

from src.compras.models import UnidadMedida


class ProveedorBase(BaseModel):
    nombre: str
    observaciones: str | None = None


class ProveedorCreate(ProveedorBase):
    pass


class ProveedorResponse(ProveedorBase):
    id: int
    activo: bool
    fecha_creacion: datetime

    model_config = ConfigDict(from_attributes=True)


class CategoriaInsumoBase(BaseModel):
    nombre: str
    descripcion: str | None = None


class CategoriaInsumoCreate(CategoriaInsumoBase):
    pass


class CategoriaInsumoResponse(CategoriaInsumoBase):
    id: int
    activa: bool
    es_sistema: bool
    fecha_creacion: datetime

    model_config = ConfigDict(from_attributes=True)


class InsumoBase(BaseModel):
    nombre: str
    categoria_id: int
    unidad_base: UnidadMedida


class InsumoCreate(InsumoBase):
    pass


class InsumoResponse(InsumoBase):
    id: int
    activo: bool
    fecha_creacion: datetime

    model_config = ConfigDict(from_attributes=True)
