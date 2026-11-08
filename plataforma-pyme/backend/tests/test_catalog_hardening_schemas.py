"""E2-3 D: límites canónicos que protegen unicidad y montos SQL."""
import pytest
from pydantic import ValidationError

from app.modules.catalog.schemas import (
    CreateCatalogItemRequest, UpdateCatalogItemRequest,
    ChangeCatalogStatusRequest, normalized_name_key, normalized_sku,
)


def valid(**changes):
    payload = {"name": "Producto seguro", "kind": "REVENTA",
               "unit": "UNIDAD", "sellable": True}
    payload.update(changes)
    return CreateCatalogItemRequest.model_validate(payload)


@pytest.mark.parametrize("a,b", [
    ("Straße", "STRASSE"),
    ("  Café   en grano  ", "CAFÉ EN GRANO"),
    ("Ｃａｊａ　ａｚｕｌ", "CAJA AZUL"),
    ("Kilo", "KILO"),
    ("ﬃ producto", "FFI PRODUCTO"),
])
def test_unicode_names_share_key(a, b):
    assert normalized_name_key(a) == normalized_name_key(b)


@pytest.mark.parametrize("source,expected", [
    ("  ａｂｃ-１２３ ", "ABC-123"),
    ("abc.01", "ABC.01"),
    (" _aZ-3 ", "_AZ-3"),
    ("", None), ("   ", None), (None, None),
])
def test_sku_canonicalization(source, expected):
    assert normalized_sku(source) == expected


@pytest.mark.parametrize("bad", [
    "DOS SKU", "ábc", "CAT/01", "a" * 33,
    "a\u202eb", "hello\nworld",
])
def test_invalid_sku_rejected(bad):
    with pytest.raises(ValueError):
        normalized_sku(bad)


def test_casefold_expansion_cannot_overflow_key():
    name = "ß" * 46
    assert len(name) == 46
    with pytest.raises(ValueError, match="normalizado"):
        normalized_name_key(name)
    with pytest.raises(ValidationError):
        valid(name=name)


@pytest.mark.parametrize("field,bad", [
    ("name", "X"),
    ("name", "A\u202eB"),
    ("category", "Zona\u202e"),
    ("description", "Texto\u202e"),
    ("observations", "Nota\u202e"),
])
def test_control_characters_and_short_names_rejected(field, bad):
    with pytest.raises(ValidationError):
        valid(**{field: bad})


@pytest.mark.parametrize("field", ["price_cents", "reference_cost_cents"])
@pytest.mark.parametrize("bad", [-1, 100_000_000_000, 2.5, True, "2500"])
def test_money_strict_and_bounded(field, bad):
    with pytest.raises(ValidationError):
        valid(**{field: bad})
    with pytest.raises(ValidationError):
        UpdateCatalogItemRequest.model_validate({field: bad})


def test_optional_field_omission_distinct_from_clearing():
    omitted = UpdateCatalogItemRequest.model_validate({"sellable": False})
    cleared = UpdateCatalogItemRequest.model_validate({
        "sku": None, "price_cents": None, "reference_cost_cents": None,
    })
    assert omitted.model_dump(exclude_unset=True) == {"sellable": False}
    assert cleared.model_dump(exclude_unset=True) == {
        "sku": None, "price_cents": None, "reference_cost_cents": None,
    }


@pytest.mark.parametrize("field", [
    "business_id", "id", "sku", "sellable", "name", "price_cents",
])
def test_status_route_rejects_all_unrelated_data(field):
    with pytest.raises(ValidationError):
        ChangeCatalogStatusRequest.model_validate({
            "status": "INACTIVO", field: None,
        })


@pytest.mark.parametrize("kind,unit", [
    ("SERVICIO", "PAQUETE"), ("SERVICIO", "UNIDAD"),
    ("INSUMO", "SERVICIO"), ("ELABORADO", "SERVICIO"),
])
def test_invalid_kind_unit_pairs_never_reach_sql(kind, unit):
    with pytest.raises(ValidationError):
        valid(kind=kind, unit=unit)
