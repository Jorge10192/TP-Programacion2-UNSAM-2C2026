"""OpenAPI y accesos no autenticados para el módulo de ubicaciones."""
from uuid import uuid4

from fastapi.testclient import TestClient
from app.main import create_app


def test_location_routes_require_bearer_auth() -> None:
    business, location = uuid4(), uuid4()
    base = f"/api/v1/businesses/{business}/locations"
    with TestClient(create_app()) as client:
        for response in (
            client.get(base),
            client.get(f"{base}/{location}"),
            client.post(base, json={"name": "Casa", "kind": "CASA", "can_sell": True, "can_store": False}),
            client.patch(f"{base}/{location}", json={"name": "Casa nueva"}),
            client.patch(f"{base}/{location}/status", json={"status": "PAUSADA"}),
            client.put(f"{base}/{location}/primary"),
        ):
            assert response.status_code == 401
            assert response.headers["www-authenticate"] == "Bearer"


def test_location_routes_include_management_operations_without_delete() -> None:
    with TestClient(create_app()) as client:
        paths = client.get("/openapi.json").json()["paths"]
    collection = paths["/api/v1/businesses/{business_id}/locations"]
    detail = paths["/api/v1/businesses/{business_id}/locations/{location_id}"]
    assert {"get", "post"} <= set(collection)
    assert "get" in detail
    assert "patch" not in collection and "delete" not in collection
    status = paths["/api/v1/businesses/{business_id}/locations/{location_id}/status"]
    primary = paths["/api/v1/businesses/{business_id}/locations/{location_id}/primary"]
    assert "patch" in detail and "delete" not in detail
    assert "patch" in status and "put" in primary
    assert detail["patch"]["security"] and status["patch"]["security"] and primary["put"]["security"]
    for spec in (detail["patch"], status["patch"]):
        assert {"200", "401", "403", "404", "409", "422"} <= set(spec["responses"])
    assert {"200", "401", "403", "404", "409"} <= set(primary["put"]["responses"])
    assert collection["get"]["security"] and collection["post"]["security"]
    assert detail["get"]["security"]
    assert {"201", "401", "403", "404", "409", "422"} <= set(collection["post"]["responses"])
