from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest

from app.domain.organization.email import Email
from app.domain.organization.errors import (
    FechaInvalidaError,
    IdentificadorInvalidoError,
    NombreInvalidoError,
)
from app.domain.organization.usuario import Usuario


AHORA = datetime(2026, 10, 29, 12, 0, tzinfo=UTC)


def crear_usuario(**overrides: object) -> Usuario:
    data: dict[str, object] = {
        "id": uuid4(),
        "email": Email("usuario@example.com"),
        "nombre": "Usuario Ejemplo",
        "fecha_registro": AHORA,
        "updated_at": AHORA,
    }
    data.update(overrides)
    return Usuario(**data)  # type: ignore[arg-type]


def test_usuario_se_crea_con_identidad_global_valida() -> None:
    usuario = crear_usuario(nombre="  Jorge  ", email=Email("JORGE@Example.com"))

    assert usuario.nombre == "Jorge"
    assert usuario.email == Email("jorge@example.com")
    assert usuario.fecha_registro == AHORA
    assert usuario.updated_at == AHORA


@pytest.mark.parametrize("nombre", ["", "   "])
def test_usuario_rechaza_nombre_vacio(nombre: str) -> None:
    with pytest.raises(NombreInvalidoError):
        crear_usuario(nombre=nombre)


def test_usuario_rechaza_identificador_que_no_es_uuid4() -> None:
    uuid_v1 = UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")

    with pytest.raises(IdentificadorInvalidoError):
        crear_usuario(id=uuid_v1)


def test_usuario_rechaza_fecha_sin_zona_horaria() -> None:
    with pytest.raises(FechaInvalidaError):
        crear_usuario(fecha_registro=datetime(2026, 10, 29, 12, 0))


def test_usuario_no_permite_reemplazar_su_identidad_publicamente() -> None:
    usuario = crear_usuario()

    with pytest.raises(AttributeError):
        usuario.id = uuid4()  # type: ignore[misc]

    with pytest.raises(AttributeError):
        usuario.email = Email("otro@example.com")  # type: ignore[misc]
