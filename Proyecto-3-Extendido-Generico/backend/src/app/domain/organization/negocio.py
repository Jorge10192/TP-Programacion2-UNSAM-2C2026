from collections.abc import Iterable, Set
from datetime import datetime
from uuid import UUID

from app.domain.organization._validation import (
    normalize_optional_text,
    normalize_required_text,
    normalize_utc_datetime,
    require_uuid4,
    require_version,
)
from app.domain.organization.enums import (
    EstadoMembresia,
    ModalidadOperativa,
    Moneda,
    Rol,
)
from app.domain.organization.errors import (
    CoordinacionNegocioError,
    IdentificadorNuevaMembresiaRequeridoError,
    MembresiaInvalidaError,
    MembresiaNoPerteneceNegocioError,
    MembresiaNoPerteneceUsuarioError,
    MembresiaYaActivaError,
    ModalidadesInvalidasError,
    MonedaInvalidaError,
    RolIncorporacionInvalidoError,
    UltimoPropietarioError,
)
from app.domain.organization.membresia import UsuarioNegocio
from app.domain.organization.usuario import Usuario


class Negocio:
    """Organization administered by the platform and tenant boundary for business data."""

    __slots__ = (
        "_created_at",
        "_id",
        "_modalidades",
        "_moneda_base",
        "_nombre",
        "_rubro",
        "_updated_at",
        "_version",
    )

    _ROLES_INCORPORACION = frozenset({Rol.ENCARGADO, Rol.TRABAJADOR})

    def __init__(
        self,
        *,
        id: UUID,
        nombre: str,
        rubro: str | None,
        moneda_base: Moneda,
        modalidades: Set[ModalidadOperativa],
        version: int,
        created_at: datetime,
        updated_at: datetime,
    ) -> None:
        self._id = require_uuid4(id, field_name="id")
        self._nombre = normalize_required_text(nombre, field_name="nombre")
        self._rubro = normalize_optional_text(rubro, field_name="rubro")
        self._moneda_base = self._validate_moneda(moneda_base)
        self._modalidades = self._normalize_modalidades(modalidades)
        self._version = require_version(version)
        self._created_at = normalize_utc_datetime(created_at, field_name="created_at")
        self._updated_at = normalize_utc_datetime(updated_at, field_name="updated_at")

    @staticmethod
    def _validate_moneda(moneda: Moneda) -> Moneda:
        if moneda is not Moneda.ARS:
            raise MonedaInvalidaError("La moneda base soportada por el MVP es ARS.")
        return moneda

    @staticmethod
    def _normalize_modalidades(
        modalidades: Set[ModalidadOperativa],
    ) -> frozenset[ModalidadOperativa]:
        if not isinstance(modalidades, Set):
            raise ModalidadesInvalidasError("modalidades debe ser un conjunto.")

        normalized = frozenset(modalidades)
        if not 1 <= len(normalized) <= 3:
            raise ModalidadesInvalidasError("Un negocio debe tener entre 1 y 3 modalidades.")
        if any(not isinstance(modalidad, ModalidadOperativa) for modalidad in normalized):
            raise ModalidadesInvalidasError("Todas las modalidades deben ser ModalidadOperativa.")
        return normalized

    def configurar_modalidades(self, nuevas: Set[ModalidadOperativa]) -> None:
        """Replace the complete modality set after validating the resulting configuration."""
        self._modalidades = self._normalize_modalidades(nuevas)

    def tiene_propietario_activo(
        self,
        membresias_contexto: Iterable[UsuarioNegocio],
    ) -> bool:
        """Return whether the supplied business context contains an active owner."""
        return any(
            membresia.negocio_id == self._id
            and membresia.esta_activa()
            and membresia.es_propietario()
            for membresia in membresias_contexto
        )

    def incorporar_o_reactivar_miembro(
        self,
        *,
        usuario: Usuario,
        rol_inicial: Rol,
        membresia_historica: UsuarioNegocio | None,
        nueva_membresia_id: UUID | None,
        actualizado_en: datetime,
    ) -> UsuarioNegocio:
        """Create or reactivate the single historical membership for a user."""
        if not isinstance(usuario, Usuario):
            raise CoordinacionNegocioError("usuario debe ser una entidad Usuario válida.")

        rol = self._require_rol_incorporacion(rol_inicial)
        ahora = normalize_utc_datetime(actualizado_en, field_name="actualizado_en")

        if membresia_historica is not None:
            self._require_membresia_del_negocio(membresia_historica)
            if membresia_historica.usuario_id != usuario.id:
                raise MembresiaNoPerteneceUsuarioError(
                    "La membresía histórica no pertenece al Usuario indicado."
                )
            if membresia_historica.esta_activa():
                raise MembresiaYaActivaError("La membresía histórica ya está activa.")

            membresia_historica._reactivar(
                nuevo_rol=rol,
                actualizado_en=ahora,
            )
            return membresia_historica

        if nueva_membresia_id is None:
            raise IdentificadorNuevaMembresiaRequeridoError(
                "Se requiere un UUID para crear una nueva membresía."
            )

        return UsuarioNegocio(
            id=nueva_membresia_id,
            usuario_id=usuario.id,
            negocio_id=self._id,
            rol=rol,
            estado=EstadoMembresia.ACTIVO,
            fecha_incorporacion=ahora,
            version=1,
            updated_at=ahora,
        )

    def desactivar_miembro(
        self,
        miembro: UsuarioNegocio,
        *,
        membresias_contexto: Iterable[UsuarioNegocio],
        actualizado_en: datetime,
    ) -> None:
        """Deactivate a member while preserving the active-owner invariant."""
        self._require_membresia_del_negocio(miembro)
        ahora = normalize_utc_datetime(actualizado_en, field_name="actualizado_en")

        if (
            miembro.esta_activa()
            and miembro.es_propietario()
            and not self._existe_otro_propietario_activo(
                objetivo=miembro,
                membresias_contexto=membresias_contexto,
            )
        ):
            raise UltimoPropietarioError(
                "No se puede desactivar al último propietario activo."
            )

        miembro._desactivar(actualizado_en=ahora)

    def cambiar_rol_miembro(
        self,
        miembro: UsuarioNegocio,
        nuevo_rol: Rol,
        *,
        membresias_contexto: Iterable[UsuarioNegocio],
        actualizado_en: datetime,
    ) -> None:
        """Change an active member's role while preserving the owner invariant."""
        self._require_membresia_del_negocio(miembro)
        if not isinstance(nuevo_rol, Rol):
            raise MembresiaInvalidaError("nuevo_rol debe ser un valor válido de Rol.")

        ahora = normalize_utc_datetime(actualizado_en, field_name="actualizado_en")

        if (
            miembro.esta_activa()
            and miembro.es_propietario()
            and nuevo_rol is not Rol.PROPIETARIO
            and not self._existe_otro_propietario_activo(
                objetivo=miembro,
                membresias_contexto=membresias_contexto,
            )
        ):
            raise UltimoPropietarioError(
                "No se puede degradar al último propietario activo."
            )

        miembro._cambiar_rol(nuevo_rol=nuevo_rol, actualizado_en=ahora)

    @classmethod
    def _require_rol_incorporacion(cls, rol: Rol) -> Rol:
        if not isinstance(rol, Rol) or rol not in cls._ROLES_INCORPORACION:
            raise RolIncorporacionInvalidoError(
                "La incorporación solo admite ENCARGADO o TRABAJADOR."
            )
        return rol

    def _require_membresia_del_negocio(self, membresia: UsuarioNegocio) -> None:
        if not isinstance(membresia, UsuarioNegocio):
            raise CoordinacionNegocioError(
                "La operación requiere una entidad UsuarioNegocio válida."
            )
        if membresia.negocio_id != self._id:
            raise MembresiaNoPerteneceNegocioError(
                "La membresía no pertenece a este Negocio."
            )

    def _existe_otro_propietario_activo(
        self,
        *,
        objetivo: UsuarioNegocio,
        membresias_contexto: Iterable[UsuarioNegocio],
    ) -> bool:
        return any(
            isinstance(membresia, UsuarioNegocio)
            and membresia.id != objetivo.id
            and membresia.negocio_id == self._id
            and membresia.esta_activa()
            and membresia.es_propietario()
            for membresia in membresias_contexto
        )

    @property
    def id(self) -> UUID:
        return self._id

    @property
    def nombre(self) -> str:
        return self._nombre

    @property
    def rubro(self) -> str | None:
        return self._rubro

    @property
    def moneda_base(self) -> Moneda:
        return self._moneda_base

    @property
    def modalidades(self) -> frozenset[ModalidadOperativa]:
        return self._modalidades

    @property
    def version(self) -> int:
        return self._version

    @property
    def created_at(self) -> datetime:
        return self._created_at

    @property
    def updated_at(self) -> datetime:
        return self._updated_at
