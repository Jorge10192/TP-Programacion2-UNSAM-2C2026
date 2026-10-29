from datetime import UTC, datetime, timedelta, timezone
from uuid import UUID, uuid4

import pytest

from app.domain.organization.enums import ModalidadOperativa, Moneda
from app.domain.organization.errors import (
    FechaInvalidaError,
    IdentificadorInvalidoError,
    ModalidadesInvalidasError,
    NombreInvalidoError,
    VersionInvalidaError,
)
from app.domain.organization.negocio import Negocio


AHORA = datetime(2026, 10, 29, 12, 0, tzinfo=UTC)


def crear_negocio(**overrides: object) -> Negocio:
    data: dict[str, object] = {
        "id": uuid4(),
        "nombre": "Mi Negocio",
        "rubro": None,
        "moneda_base": Moneda.ARS,
        "modalidades": {ModalidadOperativa.REVENTA},
        "version": 1,
        "created_at": AHORA,
        "updated_at": AHORA,
    }
    data.update(overrides)
    return Negocio(**data)  # type: ignore[arg-type]


@pytest.mark.parametrize(
    "modalidades",
    [
        {ModalidadOperativa.REVENTA},
        {ModalidadOperativa.REVENTA, ModalidadOperativa.PRODUCCION},
        {
            ModalidadOperativa.REVENTA,
            ModalidadOperativa.PRODUCCION,
            ModalidadOperativa.SERVICIOS,
        },
    ],
)
def test_negocio_acepta_entre_una_y_tres_modalidades(
    modalidades: set[ModalidadOperativa],
) -> None:
    negocio = crear_negocio(modalidades=modalidades)

    assert negocio.modalidades == frozenset(modalidades)


def test_negocio_normaliza_nombre_y_rubro() -> None:
    negocio = crear_negocio(nombre="  Taller Norte  ", rubro="  Mascotas  ")

    assert negocio.nombre == "Taller Norte"
    assert negocio.rubro == "Mascotas"


def test_negocio_normaliza_rubro_vacio_a_none() -> None:
    negocio = crear_negocio(rubro="   ")

    assert negocio.rubro is None


@pytest.mark.parametrize("nombre", ["", "   "])
def test_negocio_rechaza_nombre_vacio(nombre: str) -> None:
    with pytest.raises(NombreInvalidoError):
        crear_negocio(nombre=nombre)


def test_negocio_rechaza_conjunto_vacio_de_modalidades() -> None:
    with pytest.raises(ModalidadesInvalidasError):
        crear_negocio(modalidades=set())


def test_negocio_rechaza_modalidad_que_no_pertenece_al_enum() -> None:
    with pytest.raises(ModalidadesInvalidasError):
        crear_negocio(modalidades={"REVENTA"})


def test_negocio_reemplaza_modalidades_de_forma_atomica() -> None:
    negocio = crear_negocio(modalidades={ModalidadOperativa.REVENTA}, version=4)

    negocio.configurar_modalidades(
        {ModalidadOperativa.PRODUCCION, ModalidadOperativa.SERVICIOS}
    )

    assert negocio.modalidades == frozenset(
        {ModalidadOperativa.PRODUCCION, ModalidadOperativa.SERVICIOS}
    )
    assert negocio.version == 4


def test_negocio_no_cambia_modalidades_si_la_nueva_configuracion_es_invalida() -> None:
    negocio = crear_negocio(modalidades={ModalidadOperativa.REVENTA})

    with pytest.raises(ModalidadesInvalidasError):
        negocio.configurar_modalidades(set())

    assert negocio.modalidades == frozenset({ModalidadOperativa.REVENTA})


@pytest.mark.parametrize("version", [0, -1, True])
def test_negocio_rechaza_version_invalida(version: object) -> None:
    with pytest.raises(VersionInvalidaError):
        crear_negocio(version=version)


def test_negocio_rechaza_identificador_que_no_es_uuid4() -> None:
    uuid_v1 = UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")

    with pytest.raises(IdentificadorInvalidoError):
        crear_negocio(id=uuid_v1)


def test_negocio_rechaza_timestamp_sin_zona_horaria() -> None:
    with pytest.raises(FechaInvalidaError):
        crear_negocio(created_at=datetime(2026, 10, 29, 12, 0))


def test_negocio_normaliza_timestamp_con_offset_a_utc() -> None:
    buenos_aires = timezone(timedelta(hours=-3))
    created_at = datetime(2026, 10, 29, 9, 0, tzinfo=buenos_aires)

    negocio = crear_negocio(created_at=created_at)

    assert negocio.created_at == datetime(2026, 10, 29, 12, 0, tzinfo=UTC)


def test_negocio_no_permite_reemplazar_id_publicamente() -> None:
    negocio = crear_negocio()

    with pytest.raises(AttributeError):
        negocio.id = uuid4()  # type: ignore[misc]
