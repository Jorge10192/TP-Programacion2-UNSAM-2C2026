from datetime import UTC, datetime, timedelta, timezone
from uuid import UUID, uuid4

import pytest

from app.domain.catalog.categoria import Categoria
from app.domain.catalog.enums import EstadoCategoria
from app.domain.catalog.errors import (
    CategoriaInvalidaError,
    CategoriaYaActivaError,
    CategoriaYaInactivaError,
)
from app.domain.common.exceptions import (
    FechaInvalidaError,
    IdentificadorInvalidoError,
    NombreInvalidoError,
    VersionInvalidaError,
)

AHORA = datetime(2026, 10, 29, 12, 0, tzinfo=UTC)
DESPUES = datetime(2026, 10, 29, 13, 0, tzinfo=UTC)


def crear_categoria(**overrides: object) -> Categoria:
    data: dict[str, object] = {
        "id": uuid4(),
        "negocio_id": uuid4(),
        "nombre": "Snacks",
        "estado": EstadoCategoria.ACTIVA,
        "version": 1,
        "created_at": AHORA,
        "updated_at": AHORA,
    }
    data.update(overrides)
    return Categoria(**data)  # type: ignore[arg-type]


def test_categoria_crear_nace_activa_version_uno() -> None:
    categoria_id = uuid4()
    negocio_id = uuid4()

    categoria = Categoria.crear(
        id=categoria_id,
        negocio_id=negocio_id,
        nombre="  Snacks  ",
        creado_en=AHORA,
    )

    assert categoria.id == categoria_id
    assert categoria.negocio_id == negocio_id
    assert categoria.nombre == "Snacks"
    assert categoria.estado is EstadoCategoria.ACTIVA
    assert categoria.version == 1
    assert categoria.created_at == AHORA
    assert categoria.updated_at == AHORA


def test_constructor_permite_rehidratar_categoria_inactiva() -> None:
    categoria = crear_categoria(estado=EstadoCategoria.INACTIVA, version=7)

    assert categoria.estado is EstadoCategoria.INACTIVA
    assert categoria.version == 7
    assert categoria.esta_activa() is False


@pytest.mark.parametrize("field_name", ["id", "negocio_id"])
def test_categoria_rechaza_identificadores_que_no_son_uuid4(
    field_name: str,
) -> None:
    uuid_v1 = UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")

    with pytest.raises(IdentificadorInvalidoError):
        crear_categoria(**{field_name: uuid_v1})


@pytest.mark.parametrize("nombre", ["", "   ", 123])
def test_categoria_rechaza_nombre_invalido(nombre: object) -> None:
    with pytest.raises(NombreInvalidoError):
        crear_categoria(nombre=nombre)


def test_categoria_rechaza_estado_fuera_del_enum() -> None:
    with pytest.raises(CategoriaInvalidaError):
        crear_categoria(estado="ACTIVA")


@pytest.mark.parametrize("version", [0, -1, True])
def test_categoria_rechaza_version_invalida(version: object) -> None:
    with pytest.raises(VersionInvalidaError):
        crear_categoria(version=version)


@pytest.mark.parametrize("field_name", ["created_at", "updated_at"])
def test_categoria_rechaza_timestamps_sin_zona_horaria(field_name: str) -> None:
    with pytest.raises(FechaInvalidaError):
        crear_categoria(**{field_name: datetime(2026, 10, 29, 12, 0)})


def test_categoria_normaliza_timestamps_con_offset_a_utc() -> None:
    buenos_aires = timezone(timedelta(hours=-3))
    instante = datetime(2026, 10, 29, 9, 0, tzinfo=buenos_aires)

    categoria = crear_categoria(created_at=instante, updated_at=instante)

    assert categoria.created_at == AHORA
    assert categoria.updated_at == AHORA


@pytest.mark.parametrize(
    ("estado", "esperado"),
    [
        (EstadoCategoria.ACTIVA, True),
        (EstadoCategoria.INACTIVA, False),
    ],
)
def test_categoria_esta_activa_refleja_estado(
    estado: EstadoCategoria,
    esperado: bool,
) -> None:
    categoria = crear_categoria(estado=estado)

    assert categoria.esta_activa() is esperado


def test_categoria_cambiar_nombre_aplica_strip_y_conserva_estado() -> None:
    categoria = crear_categoria(estado=EstadoCategoria.INACTIVA, version=4)

    categoria.cambiar_nombre("  Alimentos secos  ", actualizado_en=DESPUES)

    assert categoria.nombre == "Alimentos secos"
    assert categoria.estado is EstadoCategoria.INACTIVA
    assert categoria.version == 4
    assert categoria.updated_at == DESPUES


def test_categoria_cambiar_nombre_invalido_no_muta() -> None:
    categoria = crear_categoria(nombre="Snacks")

    with pytest.raises(NombreInvalidoError):
        categoria.cambiar_nombre("   ", actualizado_en=DESPUES)

    assert categoria.nombre == "Snacks"
    assert categoria.updated_at == AHORA


def test_categoria_cambiar_nombre_rechaza_timestamp_naive_sin_mutar() -> None:
    categoria = crear_categoria(nombre="Snacks")

    with pytest.raises(FechaInvalidaError):
        categoria.cambiar_nombre(
            "Nuevo nombre",
            actualizado_en=datetime(2026, 10, 29, 13, 0),
        )

    assert categoria.nombre == "Snacks"
    assert categoria.updated_at == AHORA


def test_categoria_desactivar_conserva_identidad_nombre_y_version() -> None:
    categoria = crear_categoria(nombre="Snacks", version=5)
    identidad = categoria.id
    negocio_id = categoria.negocio_id
    created_at = categoria.created_at

    categoria.desactivar(actualizado_en=DESPUES)

    assert categoria.estado is EstadoCategoria.INACTIVA
    assert categoria.id == identidad
    assert categoria.negocio_id == negocio_id
    assert categoria.nombre == "Snacks"
    assert categoria.version == 5
    assert categoria.created_at == created_at
    assert categoria.updated_at == DESPUES


def test_categoria_desactivar_inactiva_rechaza_sin_mutar() -> None:
    categoria = crear_categoria(estado=EstadoCategoria.INACTIVA)

    with pytest.raises(CategoriaYaInactivaError):
        categoria.desactivar(actualizado_en=DESPUES)

    assert categoria.estado is EstadoCategoria.INACTIVA
    assert categoria.updated_at == AHORA


def test_categoria_reactivar_inactiva_conserva_identidad_y_version() -> None:
    categoria = crear_categoria(
        estado=EstadoCategoria.INACTIVA,
        nombre="Snacks",
        version=6,
    )
    identidad = categoria.id

    categoria.reactivar(actualizado_en=DESPUES)

    assert categoria.estado is EstadoCategoria.ACTIVA
    assert categoria.id == identidad
    assert categoria.nombre == "Snacks"
    assert categoria.version == 6
    assert categoria.updated_at == DESPUES


def test_categoria_reactivar_activa_rechaza_sin_mutar() -> None:
    categoria = crear_categoria()

    with pytest.raises(CategoriaYaActivaError):
        categoria.reactivar(actualizado_en=DESPUES)

    assert categoria.estado is EstadoCategoria.ACTIVA
    assert categoria.updated_at == AHORA


def test_categoria_transicion_normaliza_actualizado_en_a_utc() -> None:
    buenos_aires = timezone(timedelta(hours=-3))
    actualizado_en = datetime(2026, 10, 29, 10, 0, tzinfo=buenos_aires)
    categoria = crear_categoria()

    categoria.desactivar(actualizado_en=actualizado_en)

    assert categoria.updated_at == datetime(2026, 10, 29, 13, 0, tzinfo=UTC)


def test_categoria_identidad_y_tenant_no_tienen_setters_publicos() -> None:
    categoria = crear_categoria()

    with pytest.raises(AttributeError):
        categoria.id = uuid4()  # type: ignore[misc]

    with pytest.raises(AttributeError):
        categoria.negocio_id = uuid4()  # type: ignore[misc]

    with pytest.raises(AttributeError):
        categoria.created_at = DESPUES  # type: ignore[misc]
