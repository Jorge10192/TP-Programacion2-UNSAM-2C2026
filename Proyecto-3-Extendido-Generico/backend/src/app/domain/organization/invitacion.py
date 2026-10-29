from datetime import datetime
from typing import Self
from uuid import UUID

from app.domain.organization._validation import (
    normalize_utc_datetime,
    require_uuid4,
    require_version,
)
from app.domain.organization.email import Email
from app.domain.organization.enums import EstadoInvitacion, Rol
from app.domain.organization.errors import (
    EmailInvalidoError,
    InvitacionAunVigenteError,
    InvitacionEmailIncorrectoError,
    InvitacionEstadoTerminalError,
    InvitacionInvalidaError,
    InvitacionNoVigenteError,
    PeriodoInvitacionInvalidoError,
    RolInvitacionInvalidoError,
)


class InvitacionNegocio:
    """Invitation to join a business with an explicit temporal state machine."""

    __slots__ = (
        "_email_destino",
        "_emisor_usuario_negocio_id",
        "_estado",
        "_fecha_emision",
        "_fecha_expiracion",
        "_id",
        "_negocio_id",
        "_rol_propuesto",
        "_updated_at",
        "_version",
    )

    _ROLES_PERMITIDOS = frozenset({Rol.ENCARGADO, Rol.TRABAJADOR})

    def __init__(
        self,
        *,
        id: UUID,
        negocio_id: UUID,
        email_destino: Email,
        rol_propuesto: Rol,
        emisor_usuario_negocio_id: UUID,
        estado: EstadoInvitacion,
        fecha_emision: datetime,
        fecha_expiracion: datetime,
        version: int,
        updated_at: datetime,
    ) -> None:
        self._id = require_uuid4(id, field_name="id")
        self._negocio_id = require_uuid4(negocio_id, field_name="negocio_id")
        self._email_destino = self._require_email(email_destino)
        self._rol_propuesto = self._require_rol_propuesto(rol_propuesto)
        self._emisor_usuario_negocio_id = require_uuid4(
            emisor_usuario_negocio_id,
            field_name="emisor_usuario_negocio_id",
        )
        self._estado = self._require_estado(estado)
        self._fecha_emision = normalize_utc_datetime(
            fecha_emision,
            field_name="fecha_emision",
        )
        self._fecha_expiracion = normalize_utc_datetime(
            fecha_expiracion,
            field_name="fecha_expiracion",
        )
        if self._fecha_expiracion <= self._fecha_emision:
            raise PeriodoInvitacionInvalidoError(
                "fecha_expiracion debe ser posterior a fecha_emision."
            )
        self._version = require_version(version)
        self._updated_at = normalize_utc_datetime(updated_at, field_name="updated_at")

    @classmethod
    def emitir(
        cls,
        *,
        id: UUID,
        negocio_id: UUID,
        email_destino: Email,
        rol_propuesto: Rol,
        emisor_usuario_negocio_id: UUID,
        fecha_emision: datetime,
        fecha_expiracion: datetime,
    ) -> Self:
        """Create a newly issued invitation in its only valid initial state."""
        return cls(
            id=id,
            negocio_id=negocio_id,
            email_destino=email_destino,
            rol_propuesto=rol_propuesto,
            emisor_usuario_negocio_id=emisor_usuario_negocio_id,
            estado=EstadoInvitacion.PENDIENTE,
            fecha_emision=fecha_emision,
            fecha_expiracion=fecha_expiracion,
            version=1,
            updated_at=fecha_emision,
        )

    @staticmethod
    def _require_email(email: Email) -> Email:
        if not isinstance(email, Email):
            raise EmailInvalidoError("email_destino debe ser un Email válido.")
        return email

    @classmethod
    def _require_rol_propuesto(cls, rol: Rol) -> Rol:
        if not isinstance(rol, Rol) or rol not in cls._ROLES_PERMITIDOS:
            raise RolInvitacionInvalidoError(
                "La invitación solo admite ENCARGADO o TRABAJADOR."
            )
        return rol

    @staticmethod
    def _require_estado(estado: EstadoInvitacion) -> EstadoInvitacion:
        if not isinstance(estado, EstadoInvitacion):
            raise InvitacionInvalidaError(
                "estado debe ser un valor válido de EstadoInvitacion."
            )
        return estado

    def esta_vigente(self, ahora: datetime) -> bool:
        """Return temporal validity independently from the persisted lifecycle state."""
        ahora_utc = normalize_utc_datetime(ahora, field_name="ahora")
        return ahora_utc < self._fecha_expiracion

    def puede_ser_aceptada_por(self, email: Email, ahora: datetime) -> bool:
        """Evaluate local acceptance guards without acting as final authorization."""
        return (
            self._estado is EstadoInvitacion.PENDIENTE
            and email == self._email_destino
            and self.esta_vigente(ahora)
        )

    def aceptar_para(self, email: Email, ahora: datetime) -> None:
        """Apply PENDIENTE -> ACEPTADA after revalidating all local guards."""
        self._require_pendiente()
        self._require_email_destinatario(email)
        ahora_utc = normalize_utc_datetime(ahora, field_name="ahora")
        if ahora_utc >= self._fecha_expiracion:
            raise InvitacionNoVigenteError("La invitación ya no está vigente.")

        self._estado = EstadoInvitacion.ACEPTADA
        self._updated_at = ahora_utc

    def rechazar_para(self, email: Email, ahora: datetime) -> None:
        """Apply PENDIENTE -> RECHAZADA after revalidating all local guards."""
        self._require_pendiente()
        self._require_email_destinatario(email)
        ahora_utc = normalize_utc_datetime(ahora, field_name="ahora")
        if ahora_utc >= self._fecha_expiracion:
            raise InvitacionNoVigenteError("La invitación ya no está vigente.")

        self._estado = EstadoInvitacion.RECHAZADA
        self._updated_at = ahora_utc

    def cancelar(self, ahora: datetime) -> None:
        """Apply PENDIENTE -> CANCELADA even when temporal validity was already lost."""
        self._require_pendiente()
        ahora_utc = normalize_utc_datetime(ahora, field_name="ahora")

        self._estado = EstadoInvitacion.CANCELADA
        self._updated_at = ahora_utc

    def expirar(self, ahora: datetime) -> None:
        """Materialize temporal expiration as PENDIENTE -> EXPIRADA."""
        self._require_pendiente()
        ahora_utc = normalize_utc_datetime(ahora, field_name="ahora")
        if ahora_utc < self._fecha_expiracion:
            raise InvitacionAunVigenteError(
                "La invitación todavía no alcanzó su fecha de expiración."
            )

        self._estado = EstadoInvitacion.EXPIRADA
        self._updated_at = ahora_utc

    def _require_pendiente(self) -> None:
        if self._estado is not EstadoInvitacion.PENDIENTE:
            raise InvitacionEstadoTerminalError(
                "Una invitación en estado terminal no admite nuevas transiciones."
            )

    def _require_email_destinatario(self, email: Email) -> None:
        if not isinstance(email, Email) or email != self._email_destino:
            raise InvitacionEmailIncorrectoError(
                "El email autenticado no coincide con el destinatario."
            )

    @property
    def id(self) -> UUID:
        return self._id

    @property
    def negocio_id(self) -> UUID:
        return self._negocio_id

    @property
    def email_destino(self) -> Email:
        return self._email_destino

    @property
    def rol_propuesto(self) -> Rol:
        return self._rol_propuesto

    @property
    def emisor_usuario_negocio_id(self) -> UUID:
        return self._emisor_usuario_negocio_id

    @property
    def estado(self) -> EstadoInvitacion:
        return self._estado

    @property
    def fecha_emision(self) -> datetime:
        return self._fecha_emision

    @property
    def fecha_expiracion(self) -> datetime:
        return self._fecha_expiracion

    @property
    def version(self) -> int:
        return self._version

    @property
    def updated_at(self) -> datetime:
        return self._updated_at
