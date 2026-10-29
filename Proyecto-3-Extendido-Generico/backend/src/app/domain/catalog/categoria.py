from datetime import datetime
from typing import Self
from uuid import UUID

from app.domain.catalog.enums import EstadoCategoria
from app.domain.catalog.errors import (
    CategoriaInvalidaError,
    CategoriaYaActivaError,
    CategoriaYaInactivaError,
)
from app.domain.common.validation import (
    normalize_required_text,
    normalize_utc_datetime,
    require_uuid4,
    require_version,
)


class Categoria:
    """Catalog category belonging to exactly one business."""

    __slots__ = (
        "_created_at",
        "_estado",
        "_id",
        "_negocio_id",
        "_nombre",
        "_updated_at",
        "_version",
    )

    def __init__(
        self,
        *,
        id: UUID,
        negocio_id: UUID,
        nombre: str,
        estado: EstadoCategoria,
        version: int,
        created_at: datetime,
        updated_at: datetime,
    ) -> None:
        self._id = require_uuid4(id, field_name="id")
        self._negocio_id = require_uuid4(negocio_id, field_name="negocio_id")
        self._nombre = normalize_required_text(nombre, field_name="nombre")
        self._estado = self._require_estado(estado)
        self._version = require_version(version)
        self._created_at = normalize_utc_datetime(created_at, field_name="created_at")
        self._updated_at = normalize_utc_datetime(updated_at, field_name="updated_at")

    @classmethod
    def crear(
        cls,
        *,
        id: UUID,
        negocio_id: UUID,
        nombre: str,
        creado_en: datetime,
    ) -> Self:
        """Create a new active category with version one."""
        return cls(
            id=id,
            negocio_id=negocio_id,
            nombre=nombre,
            estado=EstadoCategoria.ACTIVA,
            version=1,
            created_at=creado_en,
            updated_at=creado_en,
        )

    @staticmethod
    def _require_estado(estado: EstadoCategoria) -> EstadoCategoria:
        if not isinstance(estado, EstadoCategoria):
            raise CategoriaInvalidaError(
                "estado debe ser un valor válido de EstadoCategoria."
            )
        return estado

    def esta_activa(self) -> bool:
        """Return whether this category currently accepts new associations."""
        return self._estado is EstadoCategoria.ACTIVA

    def cambiar_nombre(
        self,
        nuevo_nombre: str,
        *,
        actualizado_en: datetime,
    ) -> None:
        """Replace the visible name without deciding contextual uniqueness."""
        nombre = normalize_required_text(nuevo_nombre, field_name="nuevo_nombre")
        ahora = normalize_utc_datetime(actualizado_en, field_name="actualizado_en")

        self._nombre = nombre
        self._updated_at = ahora

    def desactivar(self, *, actualizado_en: datetime) -> None:
        """Apply ACTIVA -> INACTIVA without affecting associated articles."""
        if not self.esta_activa():
            raise CategoriaYaInactivaError("La categoría ya está inactiva.")

        ahora = normalize_utc_datetime(actualizado_en, field_name="actualizado_en")
        self._estado = EstadoCategoria.INACTIVA
        self._updated_at = ahora

    def reactivar(self, *, actualizado_en: datetime) -> None:
        """Apply INACTIVA -> ACTIVA while preserving category identity."""
        if self.esta_activa():
            raise CategoriaYaActivaError("La categoría ya está activa.")

        ahora = normalize_utc_datetime(actualizado_en, field_name="actualizado_en")
        self._estado = EstadoCategoria.ACTIVA
        self._updated_at = ahora

    @property
    def id(self) -> UUID:
        return self._id

    @property
    def negocio_id(self) -> UUID:
        return self._negocio_id

    @property
    def nombre(self) -> str:
        return self._nombre

    @property
    def estado(self) -> EstadoCategoria:
        return self._estado

    @property
    def version(self) -> int:
        return self._version

    @property
    def created_at(self) -> datetime:
        return self._created_at

    @property
    def updated_at(self) -> datetime:
        return self._updated_at
