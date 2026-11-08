"""E2-4 B: validaciones de entrada sin conexión a PostgreSQL."""
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.modules.suppliers.schemas import (
    ChangeSupplierStatusRequest, CreateSupplierRequest, SupplierPromotion,
    UpdateSupplierRequest, normalized_name_key,
)


def promotion(**changes):
    obj = {
        "id": str(uuid4()), "days": [0, 4],
        "payment_method": "TRANSFERENCIA", "benefit": "10% informativo",
    }
    obj.update(changes)
    return obj


def test_minimal_supplier_requires_only_name():
    item = CreateSupplierRequest.model_validate({"name": " Distribuidora  Norte "})
    assert item.name == "Distribuidora Norte"
    assert item.payment_methods == []
    assert item.promotions == []
    assert item.model_dump()["website"] == ""


def test_canonical_name_equivalence_and_maximum():
    for name in (" Café  DEL  SUR ", "Café del sur", "Ｃａｆé del sur"):
        assert normalized_name_key(name) == "café del sur"
    assert normalized_name_key("Straße") == "strasse"


@pytest.mark.parametrize("bad", [
    "x", " ", "☕", "\u0000Empresa", "Empresa\u200b", "A" * 91, "ß" * 60,
])
def test_invalid_supplier_names_are_rejected(bad):
    with pytest.raises((ValueError, ValidationError)):
        CreateSupplierRequest(name=bad)


def test_contact_normalization_and_safe_links():
    item = CreateSupplierRequest(
        name="Repuestos",
        phone=" +54 11 4422-0000 ",
        whatsapp=" +54 (9) 11 2345-6789 ",
        email=" COMPRAS@EXAMPLE.COM ",
        website="https://www.example.com/catalogo",
        maps_url="https://www.google.com/maps/place/Recoleta",
        instagram="@proveedor.azul",
    )
    assert item.whatsapp == "+5491123456789"
    assert item.email == "compras@example.com"
    assert item.website == "https://www.example.com/catalogo"
    assert item.maps_url == "https://www.google.com/maps/place/Recoleta"
    assert item.instagram == "proveedor.azul"


@pytest.mark.parametrize("field,value", [
    ("phone", "NO ES TELEFONO"),
    ("whatsapp", "1123456789"),
    ("whatsapp", "+123"),
    ("email", "sin-arroba"),
    ("website", "http://example.com"),
    ("website", "https://localhost/private"),
    ("website", "https://127.0.0.1/admin"),
    ("website", "https://user:pass@example.com"),
    ("website", "https://example.com:443"),
    ("website", "https://example.com.invalid"),
    ("maps_url", "http://www.google.com/maps"),
    ("maps_url", "https://google.com.evil.test/maps"),
    ("maps_url", "https://www.google.com.evil.net/maps"),
    ("maps_url", "https://www.google.com.evil.net/"),
    ("maps_url", "https://google.com/"),
    ("maps_url", "https://www.google.com:443/maps"),
    ("instagram", "usuario/inválido"),
])
def test_malformed_contacts_and_urls_are_rejected(field, value):
    with pytest.raises(ValidationError):
        CreateSupplierRequest.model_validate({"name": "Proveedor", field: value})


@pytest.mark.parametrize("name", ["id", "business_id", "name_key", "status", "created_at"])
def test_cannot_override_protected_create_fields(name):
    with pytest.raises(ValidationError):
        CreateSupplierRequest.model_validate({"name": "Proveedor", name: "hack"})


@pytest.mark.parametrize("bad", [
    {"payment_methods": ["EFECTIVO", "EFECTIVO"]},
    {"payment_methods": ["NO_EXISTE"]},
    {"payment_methods": ["EFECTIVO"] * 8},
    {"promotions": [promotion(days=[0, 0])]},
    {"promotions": [promotion(days=[0, True])]},
    {"promotions": [promotion(days=[7])]},
    {"promotions": [promotion(payment_method="CRIPTOMONEDA")]},
    {"promotions": [promotion(benefit="x")]},
    {"promotions": [promotion(id="no-uuid")]},
    {"promotions": [promotion()] * 2},
    {"promotions": [promotion() for _ in range(9)]},
])
def test_invalid_payment_methods_and_promotions(bad):
    with pytest.raises(ValidationError):
        CreateSupplierRequest.model_validate({"name": "Proveedor", **bad})


def test_payment_methods_are_informational_and_promotion_ids_round_trip():
    obj = CreateSupplierRequest.model_validate({
        "name": "Proveedor", "payment_methods": ["EFECTIVO", "TRANSFERENCIA"],
        "promotions": [promotion(days=[4, 0], payment_method=None)],
    })
    assert obj.promotions[0].days == [0, 4]
    wire = obj.model_dump(mode="json")
    assert wire["promotions"][0]["id"]
    assert SupplierPromotion.model_validate(wire["promotions"][0]).days == [0, 4]


@pytest.mark.parametrize("bad", [
    {}, {"name": None}, {"email": None}, {"name": ""}, {"status": "INACTIVO"},
    {"business_id": str(uuid4())}, {"promotions": None},
    {"payment_methods": None}, {"name_key": "override"},
])
def test_patch_requires_non_null_editable_field(bad):
    with pytest.raises(ValidationError):
        UpdateSupplierRequest.model_validate(bad)


def test_patch_can_clear_and_replace_information_explicitly():
    changed = UpdateSupplierRequest.model_validate({
        "phone": "", "promotions": [], "payment_methods": ["CUENTA_DNI"],
    })
    assert changed.model_dump(mode="json", exclude_unset=True) == {
        "phone": "", "promotions": [], "payment_methods": ["CUENTA_DNI"],
    }


@pytest.mark.parametrize("bad", [
    {}, {"status": None}, {"status": "BORRADO"},
    {"status": "ACTIVO", "name": "Inyección"},
])
def test_status_command_has_exclusive_fields(bad):
    with pytest.raises(ValidationError):
        ChangeSupplierStatusRequest.model_validate(bad)


def test_change_status_explicit():
    assert ChangeSupplierStatusRequest(status="INACTIVO").status == "INACTIVO"
