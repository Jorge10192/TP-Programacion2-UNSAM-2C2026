"""Catalog domain primitives, value objects and entities."""

from app.domain.catalog.articulo import ArticuloCatalogo
from app.domain.catalog.capacidades import CapacidadesArticulo
from app.domain.catalog.categoria import Categoria
from app.domain.catalog.enums import (
    EstadoArticulo,
    EstadoCategoria,
    TipoArticulo,
    UnidadMedida,
)
from app.domain.catalog.errors import (
    ArticuloActivoSinUsoError,
    ArticuloError,
    ArticuloInvalidoError,
    ArticuloYaActivoError,
    ArticuloYaInactivoError,
    CapacidadesInvalidasError,
    CatalogoError,
    CategoriaError,
    CategoriaInvalidaError,
    CategoriaYaActivaError,
    CategoriaYaInactivaError,
    PrecioInvalidoError,
)
from app.domain.catalog.propuesta import PropuestaEdicionPreparada

__all__ = [
    "ArticuloActivoSinUsoError",
    "ArticuloCatalogo",
    "ArticuloError",
    "ArticuloInvalidoError",
    "ArticuloYaActivoError",
    "ArticuloYaInactivoError",
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
    "PrecioInvalidoError",
    "PropuestaEdicionPreparada",
    "TipoArticulo",
    "UnidadMedida",
]
