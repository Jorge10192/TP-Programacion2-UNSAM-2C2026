from datetime import UTC, datetime, timedelta, timezone
from uuid import UUID, uuid4

import pytest

from app.domain.organization.enums import EstadoMembresia, Rol
from app.domain.organization.errors import (
    FechaInvalidaError,
    IdentificadorInvalidoError,
    MembresiaInactivaError,
    MembresiaInvalidaError,
    MembresiaYaActivaError,
    MembresiaYaInactivaError,
    RolReactivacionInvalidoError,
    RolSinCambiosError,
    VersionInvalidaError,
)
from app.domain.organization.membresia import UsuarioNegocio

AHORA = datetime(2026, 10, 29, 12, 0, tzinfo=UTC)
DESPUES = datetime(2026, 10, 29, 13, 0, tzinfo=UTC)


def crear_membresia(**overrides: object) -> UsuarioNegocio:
    data: dict[str, object] = {
        "id": uuid4(),
        "usuario_id": uuid4(),
        "negocio_id": uuid4(),
        "rol": Rol.TRABAJADOR,
        "estado": EstadoMembresia.ACTIVO,
        "fecha_incorporacion": AHORA,
        "version": 1,
        "updated_at": AHORA,
    }
    data.update(overrides)
    return UsuarioNegocio(**data)  # type: ignore[arg-type]


def test_membresia_se_crea_con_identidad_y_estado_validos() -> None:
    usuario_id = uuid4()
    negocio_id = uuid4()

    membresia = crear_membresia(
        usuario_id=usuario_id,
        negocio_id=negocio_id,
        rol=Rol.ENCARGADO,
    )

    assert membresia.usuario_id == usuario_id
    assert membresia.negocio_id == negocio_id
    assert membresia.rol is Rol.ENCARGADO
    assert membresia.estado is EstadoMembresia.ACTIVO
    assert membresia.fecha_incorporacion == AHORA
    assert membresia.version == 1
    assert membresia.updated_at == AHORA


@pytest.mark.parametrize("field_name", ["id", "usuario_id", "negocio_id"])
def test_membresia_rechaza_identificadores_que_no_son_uuid4(field_name: str) -> None:
    uuid_v1 = UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")

    with pytest.raises(IdentificadorInvalidoError):
        crear_membresia(**{field_name: uuid_v1})


@pytest.mark.parametrize("field_name", ["fecha_incorporacion", "updated_at"])
def test_membresia_rechaza_fechas_sin_zona_horaria(field_name: str) -> None:
    with pytest.raises(FechaInvalidaError):
        crear_membresia(**{field_name: datetime(2026, 10, 29, 12, 0)})


@pytest.mark.parametrize("version", [0, -1, True])
def test_membresia_rechaza_version_invalida(version: object) -> None:
    with pytest.raises(VersionInvalidaError):
        crear_membresia(version=version)


@pytest.mark.parametrize(
    ("field_name", "value"),
    [
        ("rol", "TRABAJADOR"),
        ("estado", "ACTIVO"),
    ],
)
def test_membresia_rechaza_rol_o_estado_fuera_de_sus_enums(
    field_name: str,
    value: str,
) -> None:
    with pytest.raises(MembresiaInvalidaError):
        crear_membresia(**{field_name: value})


@pytest.mark.parametrize(
    ("rol", "estado", "activa", "propietario"),
    [
        (Rol.PROPIETARIO, EstadoMembresia.ACTIVO, True, True),
        (Rol.ENCARGADO, EstadoMembresia.ACTIVO, True, False),
        (Rol.PROPIETARIO, EstadoMembresia.INACTIVO, False, True),
        (Rol.TRABAJADOR, EstadoMembresia.INACTIVO, False, False),
    ],
)
def test_membresia_consultas_locales_reflejan_estado_y_rol(
    rol: Rol,
    estado: EstadoMembresia,
    activa: bool,
    propietario: bool,
) -> None:
    membresia = crear_membresia(rol=rol, estado=estado)

    assert membresia.esta_activa() is activa
    assert membresia.es_propietario() is propietario


def test_membresia_no_expone_mutaciones_peligrosas_como_api_publica() -> None:
    membresia = crear_membresia()

    assert not hasattr(membresia, "desactivar")
    assert not hasattr(membresia, "reactivar")
    assert not hasattr(membresia, "cambiar_rol")


def test_desactivacion_interna_conserva_rol_e_incorporacion() -> None:
    membresia = crear_membresia(rol=Rol.PROPIETARIO)
    fecha_original = membresia.fecha_incorporacion

    membresia._desactivar(actualizado_en=DESPUES)

    assert membresia.estado is EstadoMembresia.INACTIVO
    assert membresia.rol is Rol.PROPIETARIO
    assert membresia.fecha_incorporacion == fecha_original
    assert membresia.updated_at == DESPUES
    assert membresia.version == 1


def test_desactivacion_interna_rechaza_membresia_ya_inactiva_sin_mutar() -> None:
    membresia = crear_membresia(
        estado=EstadoMembresia.INACTIVO,
        rol=Rol.ENCARGADO,
    )

    with pytest.raises(MembresiaYaInactivaError):
        membresia._desactivar(actualizado_en=DESPUES)

    assert membresia.estado is EstadoMembresia.INACTIVO
    assert membresia.rol is Rol.ENCARGADO
    assert membresia.updated_at == AHORA


@pytest.mark.parametrize("nuevo_rol", [Rol.ENCARGADO, Rol.TRABAJADOR])
def test_reactivacion_interna_reutiliza_misma_membresia_con_rol_operativo(
    nuevo_rol: Rol,
) -> None:
    membresia = crear_membresia(
        estado=EstadoMembresia.INACTIVO,
        rol=Rol.PROPIETARIO,
        version=7,
    )
    identidad = membresia.id
    fecha_original = membresia.fecha_incorporacion

    membresia._reactivar(nuevo_rol=nuevo_rol, actualizado_en=DESPUES)

    assert membresia.id == identidad
    assert membresia.estado is EstadoMembresia.ACTIVO
    assert membresia.rol is nuevo_rol
    assert membresia.fecha_incorporacion == fecha_original
    assert membresia.updated_at == DESPUES
    assert membresia.version == 7


def test_reactivacion_interna_rechaza_membresia_ya_activa_sin_mutar() -> None:
    membresia = crear_membresia(rol=Rol.TRABAJADOR)

    with pytest.raises(MembresiaYaActivaError):
        membresia._reactivar(nuevo_rol=Rol.ENCARGADO, actualizado_en=DESPUES)

    assert membresia.estado is EstadoMembresia.ACTIVO
    assert membresia.rol is Rol.TRABAJADOR
    assert membresia.updated_at == AHORA


def test_reactivacion_interna_no_permite_propietario() -> None:
    membresia = crear_membresia(
        estado=EstadoMembresia.INACTIVO,
        rol=Rol.TRABAJADOR,
    )

    with pytest.raises(RolReactivacionInvalidoError):
        membresia._reactivar(nuevo_rol=Rol.PROPIETARIO, actualizado_en=DESPUES)

    assert membresia.estado is EstadoMembresia.INACTIVO
    assert membresia.rol is Rol.TRABAJADOR
    assert membresia.updated_at == AHORA


def test_cambio_rol_interno_requiere_membresia_activa() -> None:
    membresia = crear_membresia(
        estado=EstadoMembresia.INACTIVO,
        rol=Rol.TRABAJADOR,
    )

    with pytest.raises(MembresiaInactivaError):
        membresia._cambiar_rol(nuevo_rol=Rol.ENCARGADO, actualizado_en=DESPUES)

    assert membresia.rol is Rol.TRABAJADOR
    assert membresia.updated_at == AHORA


def test_cambio_rol_interno_rechaza_no_op_sin_mutar() -> None:
    membresia = crear_membresia(rol=Rol.ENCARGADO)

    with pytest.raises(RolSinCambiosError):
        membresia._cambiar_rol(nuevo_rol=Rol.ENCARGADO, actualizado_en=DESPUES)

    assert membresia.rol is Rol.ENCARGADO
    assert membresia.updated_at == AHORA


def test_cambio_rol_interno_aplica_nuevo_rol_sin_incrementar_version() -> None:
    membresia = crear_membresia(rol=Rol.TRABAJADOR, version=5)

    membresia._cambiar_rol(nuevo_rol=Rol.PROPIETARIO, actualizado_en=DESPUES)

    assert membresia.rol is Rol.PROPIETARIO
    assert membresia.estado is EstadoMembresia.ACTIVO
    assert membresia.updated_at == DESPUES
    assert membresia.version == 5


def test_transicion_interna_normaliza_actualizado_en_a_utc() -> None:
    buenos_aires = timezone(timedelta(hours=-3))
    actualizado_en = datetime(2026, 10, 29, 10, 0, tzinfo=buenos_aires)
    membresia = crear_membresia()

    membresia._desactivar(actualizado_en=actualizado_en)

    assert membresia.updated_at == datetime(2026, 10, 29, 13, 0, tzinfo=UTC)


def test_identidad_e_incorporacion_no_tienen_setters_publicos() -> None:
    membresia = crear_membresia()

    with pytest.raises(AttributeError):
        membresia.id = uuid4()  # type: ignore[misc]

    with pytest.raises(AttributeError):
        membresia.usuario_id = uuid4()  # type: ignore[misc]

    with pytest.raises(AttributeError):
        membresia.negocio_id = uuid4()  # type: ignore[misc]

    with pytest.raises(AttributeError):
        membresia.fecha_incorporacion = DESPUES  # type: ignore[misc]
