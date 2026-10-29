from enum import StrEnum


class RolNegocio(StrEnum):
    """Roles supported by an organization membership."""

    PROPIETARIO = "PROPIETARIO"
    ENCARGADO = "ENCARGADO"
    TRABAJADOR = "TRABAJADOR"


class EstadoMembresia(StrEnum):
    """Lifecycle states of a user membership in a business."""

    ACTIVO = "ACTIVO"
    INACTIVO = "INACTIVO"


class EstadoInvitacion(StrEnum):
    """Lifecycle states of an invitation to join a business."""

    PENDIENTE = "PENDIENTE"
    ACEPTADA = "ACEPTADA"
    RECHAZADA = "RECHAZADA"
    CANCELADA = "CANCELADA"
    EXPIRADA = "EXPIRADA"
