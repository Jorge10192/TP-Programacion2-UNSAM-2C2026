"""Catalog domain primitives, value objects and entities."""

from app.domain.catalog.capacidades import CapacidadesArticulo
from app.domain.catalog.categoria import Categoria
from app.domain.catalog.enums import (
    EstadoArticulo,
    EstadoCategoria,
    TipoArticulo,
    UnidadMedida,
)
from app.domain.catalog.errors import (
    CapacidadesInvalidasError,
    CatalogoError,
    CategoriaError,
    CategoriaInvalidaError,
    CategoriaYaActivaError,
    CategoriaYaInactivaError,
)

__all__ = [
    "CapacidadesArticulo",
    "CapacidadesInvalidasError",
    "CatalogoError",
    "Categoria",
    "CategoriaError",
    "CategoriaInvalidaError",
    "CategoriaYaActivaError",
    "CategoriaYaInactivaError",
    "EstadoArticulo",
    "EstadoCategoria",
    "TipoArticulo",
    "UnidadMedida",
]
