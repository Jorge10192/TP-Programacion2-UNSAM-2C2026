from datetime import datetime
from uuid import UUID

from app.domain.organization._validation import (
    normalize_utc_datetime,
    require_uuid4,
    require_version,
)
from app.domain.organization.enums import EstadoMembresia, Rol
from app.domain.organization.errors import (
    MembresiaInactivaError,
    MembresiaInvalidaError,
    MembresiaYaActivaError,
    MembresiaYaInactivaError,
    RolReactivacionInvalidoError,
    RolSinCambiosError,
)


class UsuarioNegocio:
    """Historical membership linking one global user to one business."""

    __slots__ = (
        "_estado",
        "_fecha_incorporacion",
        "_id",
        "_negocio_id",
        "_rol",
        "_updated_at",
        "_usuario_id",
        "_version",
    )

    _ROLES_REACTIVACION = frozenset({Rol.ENCARGADO, Rol.TRABAJADOR})

    def __init__(
        self,
        *,
        id: UUID,
        usuario_id: UUID,
        negocio_id: UUID,
        rol: Rol,
        estado: EstadoMembresia,
        fecha_incorporacion: datetime,
        version: int,
        updated_at: datetime,
    ) -> None:
        self._id = require_uuid4(id, field_name="id")
        self._usuario_id = require_uuid4(usuario_id, field_name="usuario_id")
        self._negocio_id = require_uuid4(negocio_id, field_name="negocio_id")
        self._rol = self._require_rol(rol)
        self._estado = self._require_estado(estado)
        self._fecha_incorporacion = normalize_utc_datetime(
            fecha_incorporacion,
            field_name="fecha_incorporacion",
        )
        self._version = require_version(version)
        self._updated_at = normalize_utc_datetime(updated_at, field_name="updated_at")

    @staticmethod
    def _require_rol(rol: Rol) -> Rol:
        if not isinstance(rol, Rol):
            raise MembresiaInvalidaError("rol debe ser un valor válido de Rol.")
        return rol

    @staticmethod
    def _require_estado(estado: EstadoMembresia) -> EstadoMembresia:
        if not isinstance(estado, EstadoMembresia):
            raise MembresiaInvalidaError(
                "estado debe ser un valor válido de EstadoMembresia."
            )
        return estado

    def esta_activa(self) -> bool:
        """Return whether this membership currently grants operational participation."""
        return self._estado is EstadoMembresia.ACTIVO

    def es_propietario(self) -> bool:
        """Return whether the stored role is PROPIETARIO."""
        return self._rol is Rol.PROPIETARIO

    def _desactivar(self, *, actualizado_en: datetime) -> None:
        """Apply ACTIVO -> INACTIVO after aggregate-level guards have passed."""
        if not self.esta_activa():
            raise MembresiaYaInactivaError("La membresía ya está inactiva.")

        normalized_updated_at = normalize_utc_datetime(
            actualizado_en,
            field_name="actualizado_en",
        )
        self._estado = EstadoMembresia.INACTIVO
        self._updated_at = normalized_updated_at

    def _reactivar(self, *, nuevo_rol: Rol, actualizado_en: datetime) -> None:
        """Apply INACTIVO -> ACTIVO after incorporation guards have passed."""
        if self.esta_activa():
            raise MembresiaYaActivaError("La membresía ya está activa.")

        rol = self._require_rol(nuevo_rol)
        if rol not in self._ROLES_REACTIVACION:
            raise RolReactivacionInvalidoError(
                "La reactivación solo admite ENCARGADO o TRABAJADOR."
            )

        normalized_updated_at = normalize_utc_datetime(
            actualizado_en,
            field_name="actualizado_en",
        )
        self._rol = rol
        self._estado = EstadoMembresia.ACTIVO
        self._updated_at = normalized_updated_at

    def _cambiar_rol(self, *, nuevo_rol: Rol, actualizado_en: datetime) -> None:
        """Change the role after aggregate-level owner guards have passed."""
        if not self.esta_activa():
            raise MembresiaInactivaError(
                "No se puede cambiar el rol de una membresía inactiva."
            )

        rol = self._require_rol(nuevo_rol)
        if rol is self._rol:
            raise RolSinCambiosError("El nuevo rol debe ser diferente al rol actual.")

        normalized_updated_at = normalize_utc_datetime(
            actualizado_en,
            field_name="actualizado_en",
        )
        self._rol = rol
        self._updated_at = normalized_updated_at

    @property
    def id(self) -> UUID:
        return self._id

    @property
    def usuario_id(self) -> UUID:
        return self._usuario_id

    @property
    def negocio_id(self) -> UUID:
        return self._negocio_id

    @property
    def rol(self) -> Rol:
        return self._rol

    @property
    def estado(self) -> EstadoMembresia:
        return self._estado

    @property
    def fecha_incorporacion(self) -> datetime:
        return self._fecha_incorporacion

    @property
    def version(self) -> int:
        return self._version

    @property
    def updated_at(self) -> datetime:
        return self._updated_at
