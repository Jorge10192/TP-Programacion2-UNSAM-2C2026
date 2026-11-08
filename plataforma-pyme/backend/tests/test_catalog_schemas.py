"""Contratos RF-04: validación, Unicode, SKU, centavos y PATCH parcial."""
import pytest
from pydantic import ValidationError

from app.modules.catalog.schemas import (
    CreateCatalogItemRequest, UpdateCatalogItemRequest,
    normalized_name_key, normalized_sku,
)


def sample(**overrides):
    body = {
        "name": "  Producto  ejemplo  ",
        "kind": "REVENTA", "unit": "UNIDAD", "sellable": True,
    }
    body.update(overrides)
    return body


def test_valid_creation_normalizes_text_and_sku():
    model = CreateCatalogItemRequest.model_validate(sample(
        category="  Insumos   varios ", sku=" abc-001 ",
        description="  Artículo  en   venta ", observations="  Nota   interna ",
        price_cents=0, reference_cost_cents=99999999999,
    ))
    assert model.name == "Producto ejemplo"
    assert model.category == "Insumos varios"
    assert model.sku == "ABC-001"
    assert model.description == "Artículo en venta"
    assert model.observations == "Nota interna"
    assert model.price_cents == 0
    assert model.reference_cost_cents == 99999999999


def test_name_normalization_collapses_unicode_and_whitespace():
    assert normalized_name_key("  ＣＡＦÉ    fuerte  ") == "café fuerte"
    assert normalized_name_key("Straße") == "strasse"
    assert normalized_sku("  ａｂｃ.01  ") == "ABC.01"
    assert normalized_sku("") is None
    assert normalized_sku(None) is None


@pytest.mark.parametrize("kind,unit", [
    ("ELABORADO", "UNIDAD"), ("REVENTA", "CAJA"),
    ("INSUMO", "KILOGRAMO"), ("SERVICIO", "SERVICIO"),
])
def test_kind_and_unit_pairs_accepted(kind, unit):
    assert CreateCatalogItemRequest.model_validate(sample(kind=kind, unit=unit)).kind == kind


@pytest.mark.parametrize("fields", [
    {"name": "x"}, {"name": "  "},
    {"kind": "SERVICIO", "unit": "UNIDAD"},
    {"kind": "INSUMO", "unit": "SERVICIO"},
    {"kind": "OTRO"}, {"unit": "PALET"},
    {"sellable": "true"}, {"sellable": None},
    {"sku": "DOS SKU"}, {"sku": "áé"}, {"sku": "a" * 33},
    {"price_cents": -1}, {"price_cents": 100000000000},
    {"price_cents": 1.5}, {"price_cents": True},
    {"price_cents": "100"}, {"reference_cost_cents": "22"},
    {"category": "x"}, {"description": "d" * 451},
    {"observations": "a" * 601},
    {"business_id": "fraude"}, {"id": "fraude"}, {"status": "ACTIVO"},
    {"name_key": "falso"}, {"created_at": "2026-01-01"},
])
def test_create_rejects_invalid_or_protected_values(fields):
    with pytest.raises(ValidationError):
        CreateCatalogItemRequest.model_validate(sample(**fields))


def test_creation_optional_price_sku_and_category_default():
    created = CreateCatalogItemRequest.model_validate(sample())
    assert created.sku is None
    assert created.category == "General"
    assert created.price_cents is None and created.reference_cost_cents is None
    assert created.description == created.observations == ""


@pytest.mark.parametrize("payload", [
    {"name": "  Otro nombre "}, {"unit": "GRAMO"},
    {"price_cents": None}, {"price_cents": 99},
    {"sku": None}, {"sku": ""}, {"sku": " abc_4 "},
    {"sellable": False}, {"reference_cost_cents": 0},
    {"description": ""}, {"observations": ""},
])
def test_update_accepts_partial_changes(payload):
    command = UpdateCatalogItemRequest.model_validate(payload)
    assert command.model_fields_set == set(payload)


@pytest.mark.parametrize("payload", [
    {}, {"name": None}, {"kind": None}, {"unit": None},
    {"category": None}, {"description": None}, {"sellable": None},
    {"price_cents": -1}, {"reference_cost_cents": 1.1},
    {"kind": "DESCONOCIDO"}, {"status": "INACTIVO"},
    {"business_id": "no"}, {"id": "no"},
])
def test_patch_rejects_invalid_or_protected_values(payload):
    with pytest.raises(ValidationError):
        UpdateCatalogItemRequest.model_validate(payload)
