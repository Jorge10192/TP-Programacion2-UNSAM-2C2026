"""E2-6 B: rutas HTTP registradas y contrato protegido."""
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import create_app


def test_sales_openapi_routes_are_secured():
    with TestClient(create_app()) as client:
        paths = client.get("/openapi.json").json()["paths"]
    base = "/api/v1/businesses/{business_id}/sales"
    assert "post" in paths[base]
    assert "get" in paths[base + "/{sale_id}"]
    assert paths[base]["post"]["security"]
    assert paths[base + "/{sale_id}"]["get"]["security"]
    assert "Idempotency-Key" in {
        p["name"] for p in paths[base]["post"]["parameters"]
    }
    assert {"200", "201", "401", "403", "404", "409", "422"} <= set(
        paths[base]["post"]["responses"]
    )


def test_sales_reject_anonymous_access():
    bid, sid = uuid4(), uuid4()
    path = f"/api/v1/businesses/{bid}/sales"
    with TestClient(create_app()) as client:
        assert client.get(f"{path}/{sid}").status_code == 401
        response = client.post(path, headers={"Idempotency-Key": str(uuid4())}, json={
            "lines": [{"catalog_item_id": str(uuid4()),
                       "quantity_milli": 1000, "unit_price_cents": 500}],
            "payments": [{"method": "EFECTIVO", "amount_cents": 500}],
        })
        assert response.status_code == 401


def test_sales_input_excludes_server_owned_fields():
    with TestClient(create_app()) as client:
        components = client.get("/openapi.json").json()["components"]["schemas"]
    command = components["CreateSaleRequest"]["properties"]
    line = components["SaleLineInput"]["properties"]
    payment = components["SalePaymentInput"]["properties"]
    for field in ("business_id", "status", "subtotal_cents", "total_cents",
                  "created_by_id", "request_sha256", "balances_after"):
        assert field not in command
    for field in ("kind_snapshot", "line_total_cents", "sku_snapshot"):
        assert field not in line
    assert "credited" not in payment and "confirmed" not in payment


def test_sales_openapi_describes_balance_snapshot_fields():
    with TestClient(create_app()) as client:
        schemas = client.get("/openapi.json").json()["components"]["schemas"]
    snapshot = schemas["SaleView"]["properties"]["balances_after"]["items"]
    assert "$ref" in snapshot
    fields = schemas[snapshot["$ref"].rsplit("/", 1)[-1]]["properties"]
    assert fields["catalog_item_id"]["format"] == "uuid"
    assert fields["quantity_milli"]["minimum"] == 0
    assert fields["version"]["minimum"] == 1
