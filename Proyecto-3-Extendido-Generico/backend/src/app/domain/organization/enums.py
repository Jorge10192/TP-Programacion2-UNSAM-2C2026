from enum import StrEnum


class Rol(StrEnum):
    """Roles supported by an organization membership."""

    PROPIETARIO = "PROPIETARIO"
    ENCARGADO = "ENCARGADO"
    TRABAJADOR = "TRABAJADOR"


class EstadoMembresia(StrEnum):
    """Lifecycle states of a user membership in a business."""

    ACTIVO = "ACTIVO"
    INACTIVO = "INACTIVO"


class ModalidadOperativa(StrEnum):
    """Operational modalities configured for a business."""

    REVENTA = "REVENTA"
    PRODUCCION = "PRODUCCION"
    SERVICIOS = "SERVICIOS"


class EstadoInvitacion(StrEnum):
    """Lifecycle states of an invitation to join a business."""

    PENDIENTE = "PENDIENTE"
    ACEPTADA = "ACEPTADA"
    RECHAZADA = "RECHAZADA"
    CANCELADA = "CANCELADA"
    EXPIRADA = "EXPIRADA"


class Moneda(StrEnum):
    """Currencies supported as a business base currency in the MVP."""

    ARS = "ARS"
