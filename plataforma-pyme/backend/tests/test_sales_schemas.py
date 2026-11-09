"""E2-6 B: pruebas puras de contratos sin necesidad de base de datos."""
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.modules.sales.schemas import CreateSaleRequest


def valid_sale():
    return {
        "lines": [{"catalog_item_id": str(uuid4()),
                   "quantity_milli": 1000, "unit_price_cents": 1050}],
        "payments": [{"method": "EFECTIVO", "amount_cents": 1050}],
    }


def test_sale_valid_split_payment_and_discount():
    payload = valid_sale()
    payload["discount_cents"] = 50
    payload["payments"] = [
        {"method": "EFECTIVO", "amount_cents": 600},
        {"method": "MERCADO_PAGO_DECLARADO", "amount_cents": 400},
    ]
    sale = CreateSaleRequest.model_validate(payload)
    assert sale.discount_cents == 50
    assert sale.payments[1].method == "MERCADO_PAGO_DECLARADO"


def test_sale_rejects_payment_not_matching_total():
    payload = valid_sale()
    payload["payments"][0]["amount_cents"] = 1049
    with pytest.raises(ValidationError):
        CreateSaleRequest.model_validate(payload)


def test_sale_rejects_zero_total_and_nonpositive_payments():
    payload = valid_sale()
    payload["discount_cents"] = 1050
    with pytest.raises(ValidationError):
        CreateSaleRequest.model_validate(payload)
    payload = valid_sale()
    payload["payments"][0]["amount_cents"] = 0
    with pytest.raises(ValidationError):
        CreateSaleRequest.model_validate(payload)


def test_sale_rejects_floats_and_extra_fields():
    payload = valid_sale()
    payload["lines"][0]["quantity_milli"] = 1000.0
    with pytest.raises(ValidationError):
        CreateSaleRequest.model_validate(payload)
    payload = valid_sale()
    payload["manual_stock_debit"] = True
    with pytest.raises(ValidationError):
        CreateSaleRequest.model_validate(payload)


def test_sale_half_up_per_line_not_after_aggregation():
    payload = valid_sale()
    payload["lines"] = [
        {"catalog_item_id": str(uuid4()), "quantity_milli": 333,
         "unit_price_cents": 1050}
        for _ in range(3)
    ]
    payload["payments"][0]["amount_cents"] = 1050
    assert CreateSaleRequest.model_validate(payload)


def test_sale_digest_stable_and_sensitive_to_change():
    payload = valid_sale()
    first = CreateSaleRequest.model_validate(payload)
    second = CreateSaleRequest.model_validate(dict(reversed(list(payload.items()))))
    assert first.payload_digest() == second.payload_digest()
    payload["payments"][0]["method"] = "TRANSFERENCIA"
    third = CreateSaleRequest.model_validate(payload)
    assert third.payload_digest() != first.payload_digest()


def test_sale_rejects_too_many_lines_or_payments():
    payload = valid_sale()
    payload["lines"] = payload["lines"] * 31
    with pytest.raises(ValidationError):
        CreateSaleRequest.model_validate(payload)
    payload = valid_sale()
    payload["payments"] = [
        {"method": "EFECTIVO", "amount_cents": 150}
        for _ in range(7)
    ]
    with pytest.raises(ValidationError):
        CreateSaleRequest.model_validate(payload)
