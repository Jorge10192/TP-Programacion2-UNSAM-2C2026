from enum import StrEnum


class TipoArticulo(StrEnum):
    """General nature of a catalog article."""

    BIEN = "BIEN"
    SERVICIO = "SERVICIO"


class EstadoArticulo(StrEnum):
    """Lifecycle states of a catalog article."""

    ACTIVO = "ACTIVO"
    INACTIVO = "INACTIVO"


class EstadoCategoria(StrEnum):
    """Lifecycle states of a catalog category."""

    ACTIVA = "ACTIVA"
    INACTIVA = "INACTIVA"


class UnidadMedida(StrEnum):
    """Canonical measurement units supported by the Block 1 catalog."""

    UNIDAD = "UNIDAD"
    KG = "KG"
    G = "G"
    L = "L"
    ML = "ML"
    M = "M"
    CM = "CM"
    HORA = "HORA"
