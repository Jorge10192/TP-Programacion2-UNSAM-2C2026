from dataclasses import dataclass

from app.domain.catalog.enums import TipoArticulo
from app.domain.catalog.errors import CapacidadesInvalidasError


@dataclass(frozen=True, slots=True)
class CapacidadesArticulo:
    """Immutable operational capabilities configured for a catalog article."""

    es_comprable: bool
    es_vendible: bool
    controla_stock: bool
    puede_usarse_en_produccion: bool
    controla_vencimiento: bool
    permite_descuento: bool

    def __post_init__(self) -> None:
        self._validar_booleanos()
        self._validar_dependencias_internas()

    def _validar_booleanos(self) -> None:
        campos = (
            "es_comprable",
            "es_vendible",
            "controla_stock",
            "puede_usarse_en_produccion",
            "controla_vencimiento",
            "permite_descuento",
        )
        for campo in campos:
            if not isinstance(getattr(self, campo), bool):
                raise CapacidadesInvalidasError(
                    f"{campo} debe ser un valor booleano."
                )

    def _validar_dependencias_internas(self) -> None:
        if self.controla_vencimiento and not self.controla_stock:
            raise CapacidadesInvalidasError(
                "controla_vencimiento requiere controla_stock."
            )
        if self.puede_usarse_en_produccion and not self.controla_stock:
            raise CapacidadesInvalidasError(
                "puede_usarse_en_produccion requiere controla_stock."
            )
        if self.permite_descuento and not self.es_vendible:
            raise CapacidadesInvalidasError(
                "permite_descuento requiere es_vendible."
            )

    def es_coherente_con(self, tipo: TipoArticulo) -> bool:
        """Return whether these capabilities are coherent with the article type."""
        if not isinstance(tipo, TipoArticulo):
            return False

        if tipo is TipoArticulo.SERVICIO:
            return not (
                self.controla_stock
                or self.controla_vencimiento
                or self.puede_usarse_en_produccion
            )

        return True

    def tiene_al_menos_un_uso_operativo(self) -> bool:
        """Return whether the configuration enables at least one operational use."""
        return (
            self.es_comprable
            or self.es_vendible
            or self.puede_usarse_en_produccion
        )
