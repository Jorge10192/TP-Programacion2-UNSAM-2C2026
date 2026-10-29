from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from app.domain.catalog.capacidades import CapacidadesArticulo
from app.domain.catalog.enums import UnidadMedida


@dataclass(frozen=True, slots=True)
class PropuestaEdicionPreparada:
    """Complete final editable state prepared by Application for domain validation."""

    nombre: str
    descripcion: str | None
    categoria_id: UUID | None
    sku: str | None
    unidad_medida: UnidadMedida
    precio_base: Decimal | None
    costo_referencia: Decimal | None
    capacidades: CapacidadesArticulo
