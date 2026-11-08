"""E2-4 E: publicación OpenAPI de recepción única y consultas read-only."""
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import create_app
from app.modules.purchases.receipt_schemas import ReceivePurchaseRequest


def test_receive_input_only_accepts_location_and_digest_includes_purchase():
    a, b = uuid4(), uuid4()
    command = ReceivePurchaseRequest(location_id=a)
    assert len(command.digest_for(b)) == 64
    assert command.digest_for(b) != command.digest_for(uuid4())
    assert command.digest_for(b) == ReceivePurchaseRequest(location_id=a).digest_for(b)
    assert command.digest_for(b) != ReceivePurchaseRequest(location_id=b).digest_for(b)
    with pytest.raises(ValidationError):
        ReceivePurchaseRequest.model_validate({"location_id": str(a), "quantity_milli": 1})
    with pytest.raises(ValidationError):
        ReceivePurchaseRequest.model_validate({"location_id": "not-a-uuid"})


def test_receive_inventory_http_routes_security_and_no_partial_receipts():
    with TestClient(create_app()) as client:
        paths = client.get("/openapi.json").json()["paths"]
    prefix = "/api/v1/businesses/{business_id}/purchases/{purchase_id}"
    assert "post" in paths[prefix + "/receive"]
    assert "get" in paths[prefix + "/receipt"]
    assert "get" in paths["/api/v1/businesses/{business_id}/inventory/balances"]
    assert "get" in paths["/api/v1/businesses/{business_id}/inventory/movements"]
    assert all("post" not in paths[p] for p in (
        "/api/v1/businesses/{business_id}/inventory/balances",
        "/api/v1/businesses/{business_id}/inventory/movements",
    ))
    assert paths[prefix + "/receive"]["post"]["security"]
    assert any(p["name"] == "Idempotency-Key"
               for p in paths[prefix + "/receive"]["post"]["parameters"])
    assert not any("/partial" in p or "/split" in p for p in paths)


def test_all_new_routes_reject_unauthenticated_http():
    b, p = uuid4(), uuid4()
    with TestClient(create_app()) as client:
        assert client.post(
            f"/api/v1/businesses/{b}/purchases/{p}/receive",
            headers={"Idempotency-Key": str(uuid4())},
            json={"location_id": str(uuid4())},
        ).status_code == 401
        for url in (
            f"/api/v1/businesses/{b}/purchases/{p}/receipt",
            f"/api/v1/businesses/{b}/inventory/balances",
            f"/api/v1/businesses/{b}/inventory/movements",
        ):
            assert client.get(url).status_code == 401
