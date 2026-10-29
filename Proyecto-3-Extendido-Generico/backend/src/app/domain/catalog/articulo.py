from collections.abc import Sequence
from datetime import datetime
from decimal import Decimal
from typing import Self
from uuid import UUID

from app.domain.catalog.capacidades import CapacidadesArticulo
from app.domain.catalog.enums import EstadoArticulo, TipoArticulo, UnidadMedida
from app.domain.catalog.errors import (
    ArticuloActivoSinUsoError,
    ArticuloInvalidoError,
    ArticuloYaActivoError,
    ArticuloYaInactivoError,
    CapacidadesInvalidasError,
    ImagenesInvalidasError,
    PrecioInvalidoError,
)
from app.domain.catalog.imagen import ArticuloImagen
from app.domain.catalog.propuesta import PropuestaEdicionPreparada
from app.domain.common.validation import (
    normalize_required_text,
    normalize_utc_datetime,
    require_uuid4,
    require_version,
)


class ArticuloCatalogo:
    """Current catalog configuration for one good or service."""

    __slots__ = (
        "_capacidades",
        "_categoria_id",
        "_costo_referencia",
        "_created_at",
        "_descripcion",
        "_estado",
        "_id",
        "_imagenes",
        "_negocio_id",
        "_nombre",
        "_precio_base",
        "_sku",
        "_tipo",
        "_unidad_medida",
        "_updated_at",
        "_version",
    )

    def __init__(
        self,
        *,
        id: UUID,
        negocio_id: UUID,
        categoria_id: UUID | None,
        nombre: str,
        descripcion: str | None,
        tipo: TipoArticulo,
        unidad_medida: UnidadMedida,
        sku: str | None,
        precio_base: Decimal | None,
        costo_referencia: Decimal | None,
        capacidades: CapacidadesArticulo,
        estado: EstadoArticulo,
        version: int,
        created_at: datetime,
        updated_at: datetime,
        imagenes: Sequence[ArticuloImagen] = (),
    ) -> None:
        articulo_id = require_uuid4(id, field_name="id")
        tenant_id = require_uuid4(negocio_id, field_name="negocio_id")
        categoria = self._require_optional_uuid4(
            categoria_id,
            field_name="categoria_id",
        )
        nombre_validado = normalize_required_text(nombre, field_name="nombre")
        descripcion_validada = self._require_optional_functional_text(
            descripcion,
            field_name="descripcion",
        )
        tipo_validado = self._require_tipo(tipo)
        unidad_validada = self._require_unidad_medida(unidad_medida)
        sku_validado = self._require_optional_functional_text(
            sku,
            field_name="sku",
        )
        precio_validado = self._require_money(precio_base, field_name="precio_base")
        costo_validado = self._require_money(
            costo_referencia,
            field_name="costo_referencia",
        )
        capacidades_validadas = self._require_capacidades(capacidades)
        estado_validado = self._require_estado(estado)
        version_validada = require_version(version)
        created_at_utc = normalize_utc_datetime(created_at, field_name="created_at")
        updated_at_utc = normalize_utc_datetime(updated_at, field_name="updated_at")
        imagenes_validadas = self._validar_imagenes_candidatas(
            imagenes,
            articulo_id=articulo_id,
            negocio_id=tenant_id,
        )

        self._validar_configuracion(
            tipo=tipo_validado,
            precio_base=precio_validado,
            capacidades=capacidades_validadas,
            estado=estado_validado,
        )

        self._id = articulo_id
        self._imagenes = imagenes_validadas
        self._negocio_id = tenant_id
        self._categoria_id = categoria
        self._nombre = nombre_validado
        self._descripcion = descripcion_validada
        self._tipo = tipo_validado
        self._unidad_medida = unidad_validada
        self._sku = sku_validado
        self._precio_base = precio_validado
        self._costo_referencia = costo_validado
        self._capacidades = capacidades_validadas
        self._estado = estado_validado
        self._version = version_validada
        self._created_at = created_at_utc
        self._updated_at = updated_at_utc

    @classmethod
    def crear(
        cls,
        *,
        id: UUID,
        negocio_id: UUID,
        categoria_id: UUID | None,
        nombre: str,
        descripcion: str | None,
        tipo: TipoArticulo,
        unidad_medida: UnidadMedida,
        sku: str | None,
        precio_base: Decimal | None,
        costo_referencia: Decimal | None,
        capacidades: CapacidadesArticulo,
        creado_en: datetime,
        imagenes: Sequence[ArticuloImagen] = (),
    ) -> Self:
        """Create a new active article with version one."""
        return cls(
            id=id,
            negocio_id=negocio_id,
            categoria_id=categoria_id,
            nombre=nombre,
            descripcion=descripcion,
            tipo=tipo,
            unidad_medida=unidad_medida,
            sku=sku,
            precio_base=precio_base,
            costo_referencia=costo_referencia,
            capacidades=capacidades,
            estado=EstadoArticulo.ACTIVO,
            version=1,
            created_at=creado_en,
            updated_at=creado_en,
            imagenes=imagenes,
        )

    @staticmethod
    def _require_optional_uuid4(
        value: UUID | None,
        *,
        field_name: str,
    ) -> UUID | None:
        if value is None:
            return None
        return require_uuid4(value, field_name=field_name)

    @staticmethod
    def _require_optional_functional_text(
        value: str | None,
        *,
        field_name: str,
    ) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            raise ArticuloInvalidoError(f"{field_name} debe ser texto o None.")
        if not value.strip():
            raise ArticuloInvalidoError(
                f"{field_name} no puede usar texto vacío como ausencia."
            )
        return value

    @staticmethod
    def _require_tipo(tipo: TipoArticulo) -> TipoArticulo:
        if not isinstance(tipo, TipoArticulo):
            raise ArticuloInvalidoError(
                "tipo debe ser un valor válido de TipoArticulo."
            )
        return tipo

    @staticmethod
    def _require_unidad_medida(unidad: UnidadMedida) -> UnidadMedida:
        if not isinstance(unidad, UnidadMedida):
            raise ArticuloInvalidoError(
                "unidad_medida debe ser un valor válido de UnidadMedida."
            )
        return unidad

    @staticmethod
    def _require_estado(estado: EstadoArticulo) -> EstadoArticulo:
        if not isinstance(estado, EstadoArticulo):
            raise ArticuloInvalidoError(
                "estado debe ser un valor válido de EstadoArticulo."
            )
        return estado

    @staticmethod
    def _require_capacidades(
        capacidades: CapacidadesArticulo,
    ) -> CapacidadesArticulo:
        if not isinstance(capacidades, CapacidadesArticulo):
            raise ArticuloInvalidoError(
                "capacidades debe ser un CapacidadesArticulo válido."
            )
        return capacidades

    @staticmethod
    def _require_money(
        value: Decimal | None,
        *,
        field_name: str,
    ) -> Decimal | None:
        if value is None:
            return None
        if not isinstance(value, Decimal):
            raise PrecioInvalidoError(
                f"{field_name} debe ser Decimal o None."
            )
        if not value.is_finite() or value < Decimal("0"):
            raise PrecioInvalidoError(
                f"{field_name} debe ser un Decimal finito mayor o igual a cero."
            )
        return value

    @staticmethod
    def _validar_imagenes_candidatas(
        imagenes: Sequence[ArticuloImagen],
        *,
        articulo_id: UUID,
        negocio_id: UUID,
    ) -> tuple[ArticuloImagen, ...]:
        if (
            isinstance(imagenes, (str, bytes))
            or not isinstance(imagenes, Sequence)
        ):
            raise ImagenesInvalidasError(
                "imagenes debe ser una secuencia de ArticuloImagen."
            )

        candidatas = tuple(imagenes)

        if len(candidatas) > 3:
            raise ImagenesInvalidasError(
                "Un artículo admite como máximo tres imágenes."
            )

        posiciones: set[int] = set()
        principales = 0

        for imagen in candidatas:
            if not isinstance(imagen, ArticuloImagen):
                raise ImagenesInvalidasError(
                    "Todas las imágenes deben ser ArticuloImagen."
                )
            if imagen.articulo_id != articulo_id:
                raise ImagenesInvalidasError(
                    "La imagen no pertenece al artículo."
                )
            if imagen.negocio_id != negocio_id:
                raise ImagenesInvalidasError(
                    "La imagen no pertenece al Negocio del artículo."
                )
            if imagen.posicion in posiciones:
                raise ImagenesInvalidasError(
                    "Las posiciones de imágenes deben ser únicas."
                )

            posiciones.add(imagen.posicion)
            principales += int(imagen.es_principal)

        if candidatas and principales != 1:
            raise ImagenesInvalidasError(
                "Si existen imágenes debe haber exactamente una principal."
            )

        return candidatas

    @staticmethod
    def _validar_configuracion(
        *,
        tipo: TipoArticulo,
        precio_base: Decimal | None,
        capacidades: CapacidadesArticulo,
        estado: EstadoArticulo,
    ) -> None:
        if not capacidades.es_coherente_con(tipo):
            raise CapacidadesInvalidasError(
                "Las capacidades no son coherentes con el TipoArticulo."
            )

        if capacidades.es_vendible and precio_base is None:
            raise PrecioInvalidoError(
                "Un artículo vendible requiere precio_base."
            )

        if (
            estado is EstadoArticulo.ACTIVO
            and not capacidades.tiene_al_menos_un_uso_operativo()
        ):
            raise ArticuloActivoSinUsoError(
                "Un artículo activo debe tener al menos un uso operativo."
            )

    def aplicar_edicion(
        self,
        propuesta: PropuestaEdicionPreparada,
        *,
        actualizado_en: datetime,
    ) -> None:
        """Apply a complete prepared edit atomically after validating final state."""
        if not isinstance(propuesta, PropuestaEdicionPreparada):
            raise ArticuloInvalidoError(
                "propuesta debe ser una PropuestaEdicionPreparada válida."
            )

        nombre = normalize_required_text(propuesta.nombre, field_name="nombre")
        descripcion = self._require_optional_functional_text(
            propuesta.descripcion,
            field_name="descripcion",
        )
        categoria_id = self._require_optional_uuid4(
            propuesta.categoria_id,
            field_name="categoria_id",
        )
        sku = self._require_optional_functional_text(
            propuesta.sku,
            field_name="sku",
        )
        unidad_medida = self._require_unidad_medida(propuesta.unidad_medida)
        precio_base = self._require_money(
            propuesta.precio_base,
            field_name="precio_base",
        )
        costo_referencia = self._require_money(
            propuesta.costo_referencia,
            field_name="costo_referencia",
        )
        capacidades = self._require_capacidades(propuesta.capacidades)
        imagenes = self._validar_imagenes_candidatas(
            propuesta.imagenes,
            articulo_id=self._id,
            negocio_id=self._negocio_id,
        )
        ahora = normalize_utc_datetime(
            actualizado_en,
            field_name="actualizado_en",
        )

        self._validar_configuracion(
            tipo=self._tipo,
            precio_base=precio_base,
            capacidades=capacidades,
            estado=self._estado,
        )

        self._nombre = nombre
        self._descripcion = descripcion
        self._categoria_id = categoria_id
        self._sku = sku
        self._unidad_medida = unidad_medida
        self._precio_base = precio_base
        self._costo_referencia = costo_referencia
        self._capacidades = capacidades
        self._imagenes = imagenes
        self._updated_at = ahora

    def reemplazar_imagenes(
        self,
        nuevas_imagenes: Sequence[ArticuloImagen],
        *,
        actualizado_en: datetime,
    ) -> None:
        """Replace the complete image collection atomically."""
        candidatas = self._validar_imagenes_candidatas(
            nuevas_imagenes,
            articulo_id=self._id,
            negocio_id=self._negocio_id,
        )
        ahora = normalize_utc_datetime(
            actualizado_en,
            field_name="actualizado_en",
        )

        self._imagenes = candidatas
        self._updated_at = ahora

    def desactivar(self, *, actualizado_en: datetime) -> None:
        """Apply ACTIVO -> INACTIVO while preserving the current configuration."""
        if self._estado is EstadoArticulo.INACTIVO:
            raise ArticuloYaInactivoError("El artículo ya está inactivo.")

        ahora = normalize_utc_datetime(
            actualizado_en,
            field_name="actualizado_en",
        )
        self._estado = EstadoArticulo.INACTIVO
        self._updated_at = ahora

    def reactivar(self, *, actualizado_en: datetime) -> None:
        """Apply INACTIVO -> ACTIVO only if current configuration is active-valid."""
        if self._estado is EstadoArticulo.ACTIVO:
            raise ArticuloYaActivoError("El artículo ya está activo.")

        ahora = normalize_utc_datetime(
            actualizado_en,
            field_name="actualizado_en",
        )

        self._validar_configuracion(
            tipo=self._tipo,
            precio_base=self._precio_base,
            capacidades=self._capacidades,
            estado=EstadoArticulo.ACTIVO,
        )

        self._estado = EstadoArticulo.ACTIVO
        self._updated_at = ahora

    def esta_activo(self) -> bool:
        """Return whether the article participates in new compatible operations."""
        return self._estado is EstadoArticulo.ACTIVO

    @property
    def imagenes(self) -> tuple[ArticuloImagen, ...]:
        return self._imagenes

    @property
    def id(self) -> UUID:
        return self._id

    @property
    def negocio_id(self) -> UUID:
        return self._negocio_id

    @property
    def categoria_id(self) -> UUID | None:
        return self._categoria_id

    @property
    def nombre(self) -> str:
        return self._nombre

    @property
    def descripcion(self) -> str | None:
        return self._descripcion

    @property
    def tipo(self) -> TipoArticulo:
        return self._tipo

    @property
    def unidad_medida(self) -> UnidadMedida:
        return self._unidad_medida

    @property
    def sku(self) -> str | None:
        return self._sku

    @property
    def precio_base(self) -> Decimal | None:
        return self._precio_base

    @property
    def costo_referencia(self) -> Decimal | None:
        return self._costo_referencia

    @property
    def capacidades(self) -> CapacidadesArticulo:
        return self._capacidades

    @property
    def estado(self) -> EstadoArticulo:
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
