"""E2-4 D: aritmética exacta y validación estricta de Compras."""
from datetime import date
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.modules.purchases.schemas import (
    CreatePurchaseRequest, PurchaseLineInput, line_total_cents,
)


def payload(**overrides):
    data = {
        "purchased_on": "2026-11-08",
        "supplier_id": None,
        "reference": "  FC  001 ",
        "notes": "  Observacion   simple ",
        "lines": [{
            "catalog_item_id": None, "description": "  Insumo   libre ",
            "unit": "CONCEPTO", "quantity_milli": 1000, "unit_cost_cents": 12505,
        }],
    }
    data.update(overrides)
    return data


def test_purchase_input_normalizes_and_hashes_deterministically():
    a = CreatePurchaseRequest.model_validate(payload())
    b = CreatePurchaseRequest.model_validate(payload(reference="FC 001", notes="Observacion simple"))
    assert a.reference == "FC 001" and a.notes == "Observacion simple"
    assert a.lines[0].description == "Insumo libre"
    assert a.purchased_on == date(2026, 11, 8)
    assert a.payload_digest() == b.payload_digest()
    assert len(a.payload_digest()) == 64
    c = CreatePurchaseRequest.model_validate(payload(notes="Otro"))
    assert c.payload_digest() != a.payload_digest()


@pytest.mark.parametrize("quantity,cost,expected", [
    (500, 3, 2), (500, 1, 1), (500, 0, 0),
    (999, 1, 1), (1, 1, 0), (1000, 12505, 12505),
    (1500, 101, 152), (1000, 99_999_999_999, 99_999_999_999),
])
def test_line_total_half_up_no_float(quantity, cost, expected):
    assert line_total_cents(quantity, cost) == expected


def test_fractional_unit_and_cost_are_preserved():
    item = str(uuid4())
    x = PurchaseLineInput.model_validate({
        "catalog_item_id": item, "description": "Harina",
        "unit": "KILOGRAMO", "quantity_milli": 500, "unit_cost_cents": 3,
    })
    assert line_total_cents(x.quantity_milli, x.unit_cost_cents) == 2


@pytest.mark.parametrize("changes", [
    {"lines": []},
    {"lines": [payload()["lines"][0]] * 31},
    {"purchased_on": "1999-01-01"},
    {"purchased_on": "2101-01-01"},
    {"purchased_on": "2026-02-30"},
    {"status": "REGISTRADA"},
    {"business_id": str(uuid4())},
    {"total_cents": 1},
    {"lines": [{**payload()["lines"][0], "quantity_milli": 500}]},
    {"lines": [{**payload()["lines"][0], "unit": "UNIDAD"}]},
    {"lines": [{**payload()["lines"][0], "quantity_milli": True}]},
    {"lines": [{**payload()["lines"][0], "unit_cost_cents": 1.5}]},
    {"lines": [{**payload()["lines"][0], "unit_cost_cents": -1}]},
    {"lines": [{**payload()["lines"][0], "quantity_milli": 0}]},
    {"lines": [{**payload()["lines"][0], "id": str(uuid4())}]},
    {"lines": [{**payload()["lines"][0], "catalog_item_id": str(uuid4())}]},
    {"lines": [{**payload()["lines"][0], "unit_cost_cents": 99_999_999_999,
                "quantity_milli": 2000}]},
    {"reference": "A" * 71},
    {"notes": "\u0007control"},
])
def test_invalid_payload_fails_strictly(changes):
    with pytest.raises(ValidationError):
        CreatePurchaseRequest.model_validate(payload(**changes))


def test_total_purchase_cannot_exceed_max():
    item = str(uuid4())
    with pytest.raises(ValidationError):
        CreatePurchaseRequest.model_validate(payload(lines=[
            {"catalog_item_id": item, "description": "Artículo",
             "unit": "UNIDAD", "quantity_milli": 1000,
             "unit_cost_cents": 60_000_000_000},
            {"catalog_item_id": item, "description": "Artículo",
             "unit": "UNIDAD", "quantity_milli": 1000,
             "unit_cost_cents": 60_000_000_000},
        ]))
