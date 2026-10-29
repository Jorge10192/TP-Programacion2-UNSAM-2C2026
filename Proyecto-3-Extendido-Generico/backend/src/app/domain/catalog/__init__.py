"""Catalog domain primitives and value objects."""

from app.domain.catalog.capacidades import CapacidadesArticulo
from app.domain.catalog.enums import (
    EstadoArticulo,
    EstadoCategoria,
    TipoArticulo,
    UnidadMedida,
)
from app.domain.catalog.errors import CapacidadesInvalidasError, CatalogoError

__all__ = [
    "CapacidadesArticulo",
    "CapacidadesInvalidasError",
    "CatalogoError",
    "EstadoArticulo",
    "EstadoCategoria",
    "TipoArticulo",
    "UnidadMedida",
]
