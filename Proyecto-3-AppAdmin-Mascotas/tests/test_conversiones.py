from decimal import Decimal as D

import pytest

from src.compras.conversiones import cantidad_micro
from src.compras.models import UnidadMedida


def unidad(id, dimension, factor):
    return UnidadMedida(id=id, nombre=str(id), dimension=dimension, factor=D(factor))


@pytest.mark.parametrize("qty,origin,destination,content,content_unit,expected", [
    ("2", (1,"masa","1000"), (1,"masa","1000"), None, None, 2_000_000),
    ("500", (2,"masa","1"), (1,"masa","1000"), None, None, 500_000),
    ("1.25", (1,"masa","1000"), (2,"masa","1"), None, None, 1_250_000_000),
    ("750", (3,"volumen","1"), (4,"volumen","1000"), None, None, 750_000),
    ("2.5", (4,"volumen","1000"), (3,"volumen","1"), None, None, 2_500_000_000),
    ("10", (5,"conteo","1"), (5,"conteo","1"), None, None, 10_000_000),
    ("10", (6,"comercial","1"), (6,"comercial","1"), None, None, 10_000_000),
    ("2", (6,"comercial","1"), (1,"masa","1000"), "5", (1,"masa","1000"), 10_000_000),
    ("3", (6,"comercial","1"), (1,"masa","1000"), "250", (2,"masa","1"), 750_000),
    ("2", (6,"comercial","1"), (5,"conteo","1"), "12", (5,"conteo","1"), 24_000_000),
    ("0.000001", (1,"masa","1000"), (1,"masa","1000"), None, None, 1),
])
def test_conversion_exacta(qty, origin, destination, content, content_unit, expected):
    assert cantidad_micro(D(qty), unidad(*origin), unidad(*destination),
                          D(content) if content else None, unidad(*content_unit) if content_unit else None) == expected


@pytest.mark.parametrize("origin,destination,qty", [
    ((1,"masa","1"), (2,"volumen","1"), "2"),
    ((1,"comercial","1"), (2,"comercial","1"), "2"),
    ((1,"conteo","1"), (2,"masa","1"), "2"),
    ((1,"masa","1"), (2,"masa","1000"), "0.000001"),
    ((1,"masa","1"), (1,"masa","1"), "0"),
    ((1,"masa","1"), (1,"masa","1"), "-1"),
    ((1,"masa","1"), (1,"masa","1"), "1000000000000"),
])
def test_rechaza_conversion_invalida(origin, destination, qty):
    with pytest.raises(ValueError):
        cantidad_micro(D(qty), unidad(*origin), unidad(*destination))
