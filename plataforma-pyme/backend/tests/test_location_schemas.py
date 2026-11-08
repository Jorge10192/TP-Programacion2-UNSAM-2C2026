"""Contrato E2-2 B: cuerpos seguros, tipo CASA y enlaces sin esquemas peligrosos."""
import pytest
from pydantic import ValidationError

from app.modules.locations.permissions import can_create_locations, can_read_locations
from app.modules.locations.schemas import CreateLocationRequest, validate_maps_link


def command(**kwargs):
    data = {
        "name": "  Casa central  ", "kind": "CASA",
        "can_sell": False, "can_store": False,
    }
    data.update(kwargs)
    return data


def test_casa_normalization_with_independent_capabilities() -> None:
    result = CreateLocationRequest.model_validate(command(address="  Referencia  "))
    assert (result.name, result.address, result.kind) == ("Casa central", "Referencia", "CASA")
    assert result.can_sell is False and result.can_store is False
    assert result.map_url == ""


@pytest.mark.parametrize("kind", ["LOCAL", "FERIA", "DEPOSITO", "OFICINA", "CASA", "OTRO"])
def test_all_location_types_accepted(kind: str) -> None:
    assert CreateLocationRequest.model_validate(command(kind=kind)).kind == kind


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("name", " "),
        ("name", "x"),
        ("kind", "BODEGA"),
        ("can_sell", "true"),
        ("can_store", 1),
        ("can_store", None),
        ("address", "x" * 161),
    ],
)
def test_invalid_fields_rejected_by_schema(field: str, value: object) -> None:
    with pytest.raises(ValidationError):
        CreateLocationRequest.model_validate(command(**{field: value}))


@pytest.mark.parametrize("field", ["business_id", "id", "is_primary", "status", "created_at"])
def test_protected_fields_are_not_client_writable(field: str) -> None:
    with pytest.raises(ValidationError):
        CreateLocationRequest.model_validate(command(**{field: "ignored"}))


@pytest.mark.parametrize(
    "value",
    [
        "https://www.google.com/maps/place/Casa",
        "https://maps.app.goo.gl/abc123",
        "https://maps.google.com/?q=Buenos+Aires",
        "https://goo.gl/maps/abc",
    ],
)
def test_allowed_google_maps_links(value: str) -> None:
    assert validate_maps_link("  " + value + " ") == value


@pytest.mark.parametrize(
    "value",
    [
        "http://www.google.com/maps/",
        "javascript:alert(1)",
        "https://maps.google.com/",
        "https://evil.example/maps/",
        "https://google.com.evil.example/maps/",
        "https://user:pass@www.google.com/maps/",
        "https://www.google.com:444/maps/",
        "https://www.google.com/maps.evil",
        "https://maps.app.goo.gl/abc\nhttps://evil.example/",
        "x" * 2049,
    ],
)
def test_rejected_google_maps_links(value: str) -> None:
    with pytest.raises(ValueError):
        validate_maps_link(value)


@pytest.mark.parametrize(
    ("role", "can_create"),
    [
        ("TITULAR_ADMINISTRATIVO", True),
        ("ADMINISTRADOR", True),
        ("ENCARGADO", False),
        ("TRABAJADOR", False),
        ("OTRO", False),
    ],
)
def test_location_permissions_are_independent_from_e2_1_roles(role: str, can_create: bool) -> None:
    assert can_create_locations(role, "ACTIVA", "ACTIVA") == can_create
    assert can_read_locations(role, "ACTIVA", "ACTIVA") == (role != "OTRO")
    assert not can_create_locations(role, "ACTIVA", "SUSPENDIDA")
    assert not can_create_locations(role, "INACTIVA", "ACTIVA")
    assert not can_read_locations(role, "INACTIVA", "ACTIVA")
