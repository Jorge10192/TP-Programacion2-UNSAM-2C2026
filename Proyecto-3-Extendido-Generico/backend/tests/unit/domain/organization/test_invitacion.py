from datetime import UTC, datetime, timedelta, timezone
from uuid import UUID, uuid4

import pytest

from app.domain.organization.email import Email
from app.domain.organization.enums import EstadoInvitacion, Rol
from app.domain.organization.errors import (
    EmailInvalidoError,
    FechaInvalidaError,
    IdentificadorInvalidoError,
    InvitacionAunVigenteError,
    InvitacionEmailIncorrectoError,
    InvitacionEstadoTerminalError,
    InvitacionInvalidaError,
    InvitacionNoVigenteError,
    PeriodoInvitacionInvalidoError,
    RolInvitacionInvalidoError,
    VersionInvalidaError,
)
from app.domain.organization.invitacion import InvitacionNegocio

EMISION = datetime(2026, 10, 29, 12, 0, tzinfo=UTC)
EXPIRACION = datetime(2026, 11, 1, 12, 0, tzinfo=UTC)
ANTES_DE_EXPIRAR = datetime(2026, 11, 1, 11, 59, tzinfo=UTC)
DESPUES_DE_EXPIRAR = datetime(2026, 11, 1, 12, 1, tzinfo=UTC)
EMAIL = Email("persona@example.com")


def crear_invitacion(**overrides: object) -> InvitacionNegocio:
    data: dict[str, object] = {
        "id": uuid4(),
        "negocio_id": uuid4(),
        "email_destino": EMAIL,
        "rol_propuesto": Rol.TRABAJADOR,
        "emisor_usuario_negocio_id": uuid4(),
        "estado": EstadoInvitacion.PENDIENTE,
        "fecha_emision": EMISION,
        "fecha_expiracion": EXPIRACION,
        "version": 1,
        "updated_at": EMISION,
    }
    data.update(overrides)
    return InvitacionNegocio(**data)  # type: ignore[arg-type]


def test_emitir_crea_invitacion_pendiente_version_uno() -> None:
    invitacion = InvitacionNegocio.emitir(
        id=uuid4(),
        negocio_id=uuid4(),
        email_destino=EMAIL,
        rol_propuesto=Rol.ENCARGADO,
        emisor_usuario_negocio_id=uuid4(),
        fecha_emision=EMISION,
        fecha_expiracion=EXPIRACION,
    )

    assert invitacion.estado is EstadoInvitacion.PENDIENTE
    assert invitacion.rol_propuesto is Rol.ENCARGADO
    assert invitacion.version == 1
    assert invitacion.updated_at == EMISION


@pytest.mark.parametrize(
    "estado",
    [
        EstadoInvitacion.ACEPTADA,
        EstadoInvitacion.RECHAZADA,
        EstadoInvitacion.CANCELADA,
        EstadoInvitacion.EXPIRADA,
    ],
)
def test_constructor_permite_rehidratar_estados_terminales(
    estado: EstadoInvitacion,
) -> None:
    invitacion = crear_invitacion(estado=estado)

    assert invitacion.estado is estado


@pytest.mark.parametrize("rol", [Rol.PROPIETARIO, "TRABAJADOR"])
def test_invitacion_rechaza_rol_propuesto_no_permitido(rol: object) -> None:
    with pytest.raises(RolInvitacionInvalidoError):
        crear_invitacion(rol_propuesto=rol)


def test_invitacion_rechaza_estado_fuera_del_enum() -> None:
    with pytest.raises(InvitacionInvalidaError):
        crear_invitacion(estado="PENDIENTE")


def test_invitacion_rechaza_email_que_no_es_value_object() -> None:
    with pytest.raises(EmailInvalidoError):
        crear_invitacion(email_destino="persona@example.com")


@pytest.mark.parametrize("field_name", ["id", "negocio_id", "emisor_usuario_negocio_id"])
def test_invitacion_rechaza_identificadores_que_no_son_uuid4(
    field_name: str,
) -> None:
    uuid_v1 = UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")

    with pytest.raises(IdentificadorInvalidoError):
        crear_invitacion(**{field_name: uuid_v1})


@pytest.mark.parametrize(
    "field_name",
    ["fecha_emision", "fecha_expiracion", "updated_at"],
)
def test_invitacion_rechaza_fechas_sin_zona_horaria(field_name: str) -> None:
    with pytest.raises(FechaInvalidaError):
        crear_invitacion(**{field_name: datetime(2026, 10, 29, 12, 0)})


@pytest.mark.parametrize("version", [0, -1, True])
def test_invitacion_rechaza_version_invalida(version: object) -> None:
    with pytest.raises(VersionInvalidaError):
        crear_invitacion(version=version)


@pytest.mark.parametrize(
    "fecha_expiracion",
    [
        EMISION,
        EMISION - timedelta(seconds=1),
    ],
)
def test_invitacion_rechaza_expiracion_no_posterior_a_emision(
    fecha_expiracion: datetime,
) -> None:
    with pytest.raises(PeriodoInvitacionInvalidoError):
        crear_invitacion(fecha_expiracion=fecha_expiracion)


def test_invitacion_normaliza_fechas_con_offset_a_utc() -> None:
    buenos_aires = timezone(timedelta(hours=-3))
    emision = datetime(2026, 10, 29, 9, 0, tzinfo=buenos_aires)
    expiracion = datetime(2026, 11, 1, 9, 0, tzinfo=buenos_aires)

    invitacion = crear_invitacion(
        fecha_emision=emision,
        fecha_expiracion=expiracion,
        updated_at=emision,
    )

    assert invitacion.fecha_emision == EMISION
    assert invitacion.fecha_expiracion == EXPIRACION
    assert invitacion.updated_at == EMISION


def test_esta_vigente_es_verdadero_antes_de_expiracion() -> None:
    invitacion = crear_invitacion()

    assert invitacion.esta_vigente(ANTES_DE_EXPIRAR) is True


@pytest.mark.parametrize("ahora", [EXPIRACION, DESPUES_DE_EXPIRAR])
def test_esta_vigente_es_falso_desde_el_limite_de_expiracion(
    ahora: datetime,
) -> None:
    invitacion = crear_invitacion()

    assert invitacion.esta_vigente(ahora) is False


def test_vigencia_temporal_es_independiente_del_estado_persistido() -> None:
    invitacion = crear_invitacion(estado=EstadoInvitacion.ACEPTADA)

    assert invitacion.esta_vigente(ANTES_DE_EXPIRAR) is True
    assert invitacion.puede_ser_aceptada_por(EMAIL, ANTES_DE_EXPIRAR) is False


def test_puede_ser_aceptada_por_usa_equivalencia_semantica_de_email() -> None:
    invitacion = crear_invitacion(
        email_destino=Email("Persona@Example.com"),
    )

    assert (
        invitacion.puede_ser_aceptada_por(
            Email(" persona@example.com "),
            ANTES_DE_EXPIRAR,
        )
        is True
    )


def test_puede_ser_aceptada_por_rechaza_email_distinto() -> None:
    invitacion = crear_invitacion()

    assert (
        invitacion.puede_ser_aceptada_por(
            Email("otra@example.com"),
            ANTES_DE_EXPIRAR,
        )
        is False
    )


def test_aceptar_valida_email_y_vigencia_y_actualiza_estado() -> None:
    invitacion = crear_invitacion(version=4)

    invitacion.aceptar_para(
        Email(" PERSONA@example.com "),
        ANTES_DE_EXPIRAR,
    )

    assert invitacion.estado is EstadoInvitacion.ACEPTADA
    assert invitacion.updated_at == ANTES_DE_EXPIRAR
    assert invitacion.version == 4


def test_aceptar_email_incorrecto_no_muta() -> None:
    invitacion = crear_invitacion()

    with pytest.raises(InvitacionEmailIncorrectoError):
        invitacion.aceptar_para(
            Email("otra@example.com"),
            ANTES_DE_EXPIRAR,
        )

    assert invitacion.estado is EstadoInvitacion.PENDIENTE
    assert invitacion.updated_at == EMISION


@pytest.mark.parametrize("ahora", [EXPIRACION, DESPUES_DE_EXPIRAR])
def test_aceptar_invitacion_no_vigente_no_muta(ahora: datetime) -> None:
    invitacion = crear_invitacion()

    with pytest.raises(InvitacionNoVigenteError):
        invitacion.aceptar_para(EMAIL, ahora)

    assert invitacion.estado is EstadoInvitacion.PENDIENTE
    assert invitacion.updated_at == EMISION


def test_rechazar_valida_email_y_vigencia_y_actualiza_estado() -> None:
    invitacion = crear_invitacion()

    invitacion.rechazar_para(EMAIL, ANTES_DE_EXPIRAR)

    assert invitacion.estado is EstadoInvitacion.RECHAZADA
    assert invitacion.updated_at == ANTES_DE_EXPIRAR


def test_rechazar_email_incorrecto_no_muta() -> None:
    invitacion = crear_invitacion()

    with pytest.raises(InvitacionEmailIncorrectoError):
        invitacion.rechazar_para(
            Email("otra@example.com"),
            ANTES_DE_EXPIRAR,
        )

    assert invitacion.estado is EstadoInvitacion.PENDIENTE
    assert invitacion.updated_at == EMISION


def test_rechazar_invitacion_vencida_no_muta() -> None:
    invitacion = crear_invitacion()

    with pytest.raises(InvitacionNoVigenteError):
        invitacion.rechazar_para(EMAIL, EXPIRACION)

    assert invitacion.estado is EstadoInvitacion.PENDIENTE
    assert invitacion.updated_at == EMISION


def test_cancelar_permite_pendiente_vencida_no_materializada() -> None:
    invitacion = crear_invitacion()

    invitacion.cancelar(DESPUES_DE_EXPIRAR)

    assert invitacion.estado is EstadoInvitacion.CANCELADA
    assert invitacion.updated_at == DESPUES_DE_EXPIRAR


@pytest.mark.parametrize("ahora", [EXPIRACION, DESPUES_DE_EXPIRAR])
def test_expirar_materializa_perdida_de_vigencia(ahora: datetime) -> None:
    invitacion = crear_invitacion()

    invitacion.expirar(ahora)

    assert invitacion.estado is EstadoInvitacion.EXPIRADA
    assert invitacion.updated_at == ahora


def test_expirar_antes_del_limite_rechaza_sin_mutar() -> None:
    invitacion = crear_invitacion()

    with pytest.raises(InvitacionAunVigenteError):
        invitacion.expirar(ANTES_DE_EXPIRAR)

    assert invitacion.estado is EstadoInvitacion.PENDIENTE
    assert invitacion.updated_at == EMISION


@pytest.mark.parametrize(
    "estado",
    [
        EstadoInvitacion.ACEPTADA,
        EstadoInvitacion.RECHAZADA,
        EstadoInvitacion.CANCELADA,
        EstadoInvitacion.EXPIRADA,
    ],
)
@pytest.mark.parametrize(
    "operacion",
    ["aceptar", "rechazar", "cancelar", "expirar"],
)
def test_estados_terminales_no_admiten_transiciones(
    estado: EstadoInvitacion,
    operacion: str,
) -> None:
    invitacion = crear_invitacion(estado=estado)
    estado_original = invitacion.estado

    with pytest.raises(InvitacionEstadoTerminalError):
        if operacion == "aceptar":
            invitacion.aceptar_para(EMAIL, ANTES_DE_EXPIRAR)
        elif operacion == "rechazar":
            invitacion.rechazar_para(EMAIL, ANTES_DE_EXPIRAR)
        elif operacion == "cancelar":
            invitacion.cancelar(ANTES_DE_EXPIRAR)
        else:
            invitacion.expirar(EXPIRACION)

    assert invitacion.estado is estado_original
    assert invitacion.updated_at == EMISION


def test_transicion_normaliza_ahora_a_utc() -> None:
    buenos_aires = timezone(timedelta(hours=-3))
    ahora = datetime(2026, 10, 29, 10, 0, tzinfo=buenos_aires)
    invitacion = crear_invitacion()

    invitacion.cancelar(ahora)

    assert invitacion.updated_at == datetime(2026, 10, 29, 13, 0, tzinfo=UTC)


def test_consulta_temporal_rechaza_ahora_sin_zona_horaria() -> None:
    invitacion = crear_invitacion()

    with pytest.raises(FechaInvalidaError):
        invitacion.esta_vigente(datetime(2026, 10, 29, 13, 0))


def test_atributos_estructurales_no_tienen_setters_publicos() -> None:
    invitacion = crear_invitacion()

    with pytest.raises(AttributeError):
        invitacion.id = uuid4()  # type: ignore[misc]

    with pytest.raises(AttributeError):
        invitacion.negocio_id = uuid4()  # type: ignore[misc]

    with pytest.raises(AttributeError):
        invitacion.email_destino = Email("otra@example.com")  # type: ignore[misc]

    with pytest.raises(AttributeError):
        invitacion.rol_propuesto = Rol.ENCARGADO  # type: ignore[misc]

    with pytest.raises(AttributeError):
        invitacion.fecha_expiracion = DESPUES_DE_EXPIRAR  # type: ignore[misc]
