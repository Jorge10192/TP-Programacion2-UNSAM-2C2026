"""E2-4 D: presencia y seguridad de rutas HTTP de Compras en OpenAPI."""
from fastapi.testclient import TestClient

from app.main import create_app


def test_purchases_openapi_three_routes_and_separate_receipt_endpoint():
    with TestClient(create_app()) as client:
        spec = client.get("/openapi.json").json()
        paths = spec["paths"]
    collection = "/api/v1/businesses/{business_id}/purchases"
    detail = collection + "/{purchase_id}"
    assert {"post", "get"} <= set(paths[collection])
    assert "get" in paths[detail]
    assert detail + "/receive" in paths
    assert detail + "/receipt" in paths
    for endpoint in (paths[collection]["post"], paths[collection]["get"],
                     paths[detail]["get"]):
        assert endpoint["security"]
    assert "Idempotency-Key" in {
        p["name"] for p in paths[collection]["post"]["parameters"]
    }
    assert {"200", "201", "401", "403", "404", "409", "422"} <= set(
        paths[collection]["post"]["responses"],
    )


def test_protected_purchase_routes_reject_anonymous_requests():
    from uuid import uuid4
    bid, pid = uuid4(), uuid4()
    with TestClient(create_app()) as client:
        assert client.get(f"/api/v1/businesses/{bid}/purchases").status_code == 401
        assert client.get(f"/api/v1/businesses/{bid}/purchases/{pid}").status_code == 401
        assert client.post(f"/api/v1/businesses/{bid}/purchases",
                           headers={"Idempotency-Key": str(uuid4())},
                           json={"purchased_on": "2026-11-08", "lines": [{
                               "catalog_item_id": None, "description": "Concepto libre",
                               "unit": "CONCEPTO", "quantity_milli": 1000,
                               "unit_cost_cents": 100,
                           }]}).status_code == 401


def test_purchase_input_prohibits_server_owned_fields():
    with TestClient(create_app()) as client:
        schemas = client.get("/openapi.json").json()["components"]["schemas"]
    command = schemas["CreatePurchaseRequest"]["properties"]
    line = schemas["PurchaseLineInput"]["properties"]
    assert "business_id" not in command
    assert "status" not in command
    assert "total_cents" not in command
    assert "request_sha256" not in command
    assert "sku_snapshot" not in line
    assert "kind_snapshot" not in line
    assert "line_total_cents" not in line
