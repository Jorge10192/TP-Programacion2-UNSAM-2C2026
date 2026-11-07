"""DTO de alta: recortar texto, validar tipos, excluir datos administrativos."""
import pytest
from pydantic import ValidationError

from app.modules.businesses.schemas import BusinessView, CreateBusinessRequest


def test_business_input_is_normalized_and_multirubro() -> None:
    command = CreateBusinessRequest(
        name="  Empresa Ejemplo ", category="  Servicios  ",
        activity_kind="MIXTO",
    )
    assert command.name == "Empresa Ejemplo"
    assert command.category == "Servicios"
    assert command.activity_kind == "MIXTO"


@pytest.mark.parametrize("data", [
    {"name": " ", "category": "Servicios", "activity_kind": "SERVICIOS"},
    {"name": "Empresa", "category": " ", "activity_kind": "SERVICIOS"},
    {"name": "Empresa", "category": "Servicios", "activity_kind": "OTROS"},
    {"name": "Empresa", "category": "Servicios", "activity_kind": "PRODUCTOS", "founder_user_id": "fake"},
])
def test_business_input_rejects_invalid_or_spoofed_fields(data: dict) -> None:
    with pytest.raises(ValidationError):
        CreateBusinessRequest.model_validate(data)


def test_business_public_contract_never_contains_auth_secrets() -> None:
    assert "password_hash" not in BusinessView.model_fields
    assert "access_token" not in BusinessView.model_fields
    assert "membership" in BusinessView.model_fields
