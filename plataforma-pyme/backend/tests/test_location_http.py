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
        ):
            assert response.status_code == 401
            assert response.headers["www-authenticate"] == "Bearer"


def test_location_routes_are_documented_without_patch_or_delete() -> None:
    with TestClient(create_app()) as client:
        paths = client.get("/openapi.json").json()["paths"]
    collection = paths["/api/v1/businesses/{business_id}/locations"]
    detail = paths["/api/v1/businesses/{business_id}/locations/{location_id}"]
    assert {"get", "post"} <= set(collection)
    assert "get" in detail
    assert "patch" not in collection and "delete" not in collection
    assert "patch" not in detail and "delete" not in detail
    assert collection["get"]["security"] and collection["post"]["security"]
    assert detail["get"]["security"]
    assert {"201", "401", "403", "404", "409", "422"} <= set(collection["post"]["responses"])
