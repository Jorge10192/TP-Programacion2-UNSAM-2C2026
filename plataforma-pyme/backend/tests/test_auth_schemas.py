"""Politicas basicas del contrato de registro."""
import pytest
from pydantic import ValidationError
from app.modules.auth.schemas import RegisterRequest, UserPublic


def _data(**overrides: object) -> dict[str, object]:
    data: dict[str, object] = {
        "email": " Persona.Ejemplo@EXAMPLE.COM ",
        "password": "Esta es una frase de acceso muy larga",
        "display_name": " Persona Ejemplo ",
        "contact_phone": " +54 11 1234-5678 ",
    }
    data.update(overrides)
    return data


def test_canonicalization_and_secret_redaction() -> None:
    model = RegisterRequest.model_validate(_data())
    assert str(model.email) == "persona.ejemplo@example.com"
    assert model.display_name == "Persona Ejemplo"
    assert model.contact_phone == "+54 11 1234-5678"
    assert "Esta es una frase" not in repr(model)


@pytest.mark.parametrize("password", ["short", "x" * 129])
def test_password_limits(password: str) -> None:
    with pytest.raises(ValidationError):
        RegisterRequest.model_validate(_data(password=password))


def test_invalid_email_and_phone() -> None:
    with pytest.raises(ValidationError):
        RegisterRequest.model_validate(_data(email="invalido"))
    with pytest.raises(ValidationError):
        RegisterRequest.model_validate(_data(contact_phone="abc"))


def test_public_schema_omits_password() -> None:
    assert "password" not in UserPublic.model_fields
    assert "password_hash" not in UserPublic.model_fields
