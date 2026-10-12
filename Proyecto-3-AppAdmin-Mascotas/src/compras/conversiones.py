from abc import ABC, abstractmethod
from decimal import Decimal

from src.compras.models import UnidadMedida


def convertir(cantidad: Decimal, origen: UnidadMedida, destino: UnidadMedida) -> Decimal:
    if origen.id == destino.id:
        return cantidad
    if origen.dimension != destino.dimension or origen.dimension == "comercial":
        raise ValueError("Unidades incompatibles; indique el contenido de la presentación")
    return cantidad * origen.factor / destino.factor


class EstrategiaCantidad(ABC):
    @abstractmethod
    def calcular(self, cantidad, compra, stock, contenido=None, unidad_contenido=None) -> Decimal:
        pass


class CantidadDirecta(EstrategiaCantidad):
    def calcular(self, cantidad, compra, stock, contenido=None, unidad_contenido=None):
        return convertir(cantidad, compra, stock)


class CantidadPorContenido(EstrategiaCantidad):
    def calcular(self, cantidad, compra, stock, contenido=None, unidad_contenido=None):
        return convertir(cantidad * contenido, unidad_contenido, stock)


def cantidad_micro(cantidad, compra, stock, contenido=None, unidad_contenido=None) -> int:
    strategy = CantidadDirecta() if contenido is None else CantidadPorContenido()
    result = strategy.calcular(cantidad, compra, stock, contenido, unidad_contenido) * 1_000_000
    if result <= 0 or result >= 10**18 or result != result.to_integral_value():
        raise ValueError("Cantidad fuera de rango o con más de seis decimales en la unidad de stock")
    return int(result)
