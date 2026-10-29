from dataclasses import FrozenInstanceError

import pytest

from app.domain.catalog.capacidades import CapacidadesArticulo
from app.domain.catalog.enums import (
    EstadoArticulo,
    EstadoCategoria,
    TipoArticulo,
    UnidadMedida,
)
from app.domain.catalog.errors import CapacidadesInvalidasError


def crear_capacidades(**overrides: object) -> CapacidadesArticulo:
    data: dict[str, object] = {
        "es_comprable": False,
        "es_vendible": False,
        "controla_stock": False,
        "puede_usarse_en_produccion": False,
        "controla_vencimiento": False,
        "permite_descuento": False,
    }
    data.update(overrides)
    return CapacidadesArticulo(**data)  # type: ignore[arg-type]


def test_enums_m02_conservan_valores_canonicos() -> None:
    assert list(TipoArticulo) == [TipoArticulo.BIEN, TipoArticulo.SERVICIO]
    assert list(EstadoArticulo) == [EstadoArticulo.ACTIVO, EstadoArticulo.INACTIVO]
    assert list(EstadoCategoria) == [EstadoCategoria.ACTIVA, EstadoCategoria.INACTIVA]
    assert list(UnidadMedida) == [
        UnidadMedida.UNIDAD,
        UnidadMedida.KG,
        UnidadMedida.G,
        UnidadMedida.L,
        UnidadMedida.ML,
        UnidadMedida.M,
        UnidadMedida.CM,
        UnidadMedida.HORA,
    ]


def test_capacidades_bien_coherente_acepta_configuracion_completa() -> None:
    capacidades = crear_capacidades(
        es_comprable=True,
        es_vendible=True,
        controla_stock=True,
        puede_usarse_en_produccion=True,
        controla_vencimiento=True,
        permite_descuento=True,
    )

    assert capacidades.es_coherente_con(TipoArticulo.BIEN) is True
    assert capacidades.tiene_al_menos_un_uso_operativo() is True


def test_capacidades_servicio_vendible_con_descuento_es_coherente() -> None:
    capacidades = crear_capacidades(
        es_vendible=True,
        permite_descuento=True,
    )

    assert capacidades.es_coherente_con(TipoArticulo.SERVICIO) is True
    assert capacidades.tiene_al_menos_un_uso_operativo() is True


@pytest.mark.parametrize(
    "overrides",
    [
        {"controla_vencimiento": True, "controla_stock": False},
        {"puede_usarse_en_produccion": True, "controla_stock": False},
        {"permite_descuento": True, "es_vendible": False},
    ],
)
def test_capacidades_rechaza_dependencias_internas_invalidas(
    overrides: dict[str, bool],
) -> None:
    with pytest.raises(CapacidadesInvalidasError):
        crear_capacidades(**overrides)


@pytest.mark.parametrize(
    "overrides",
    [
        {"controla_stock": True},
        {"controla_stock": True, "controla_vencimiento": True},
        {"controla_stock": True, "puede_usarse_en_produccion": True},
    ],
)
def test_capacidades_detecta_configuracion_incompatible_con_servicio(
    overrides: dict[str, bool],
) -> None:
    capacidades = crear_capacidades(**overrides)

    assert capacidades.es_coherente_con(TipoArticulo.SERVICIO) is False


def test_capacidades_sin_usos_es_valida_como_value_object() -> None:
    capacidades = crear_capacidades()

    assert capacidades.es_coherente_con(TipoArticulo.BIEN) is True
    assert capacidades.es_coherente_con(TipoArticulo.SERVICIO) is True
    assert capacidades.tiene_al_menos_un_uso_operativo() is False


@pytest.mark.parametrize(
    ("campo", "valor"),
    [
        ("es_comprable", 1),
        ("es_vendible", "true"),
        ("controla_stock", None),
        ("puede_usarse_en_produccion", 0),
        ("controla_vencimiento", "false"),
        ("permite_descuento", []),
    ],
)
def test_capacidades_rechaza_valores_que_no_son_booleanos(
    campo: str,
    valor: object,
) -> None:
    with pytest.raises(CapacidadesInvalidasError):
        crear_capacidades(**{campo: valor})


def test_capacidades_es_coherente_con_rechaza_tipo_fuera_del_enum() -> None:
    capacidades = crear_capacidades()

    assert capacidades.es_coherente_con("BIEN") is False  # type: ignore[arg-type]


def test_capacidades_es_inmutable() -> None:
    capacidades = crear_capacidades(es_comprable=True)

    with pytest.raises(FrozenInstanceError):
        capacidades.es_comprable = False  # type: ignore[misc]


def test_capacidades_tiene_hash_semantico() -> None:
    una = crear_capacidades(es_comprable=True)
    otra = crear_capacidades(es_comprable=True)

    assert una == otra
    assert hash(una) == hash(otra)
