from collections.abc import Set
from datetime import datetime
from uuid import UUID

from app.domain.organization._validation import (
    normalize_optional_text,
    normalize_required_text,
    normalize_utc_datetime,
    require_uuid4,
    require_version,
)
from app.domain.organization.enums import ModalidadOperativa, Moneda
from app.domain.organization.errors import ModalidadesInvalidasError, MonedaInvalidaError


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
