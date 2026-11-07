"""Protección HTTP del API multiempresa, sin consultar DB real."""
from fastapi.testclient import TestClient

from app.main import create_app


def test_anonymous_users_cannot_create_or_list_or_read_businesses() -> None:
    with TestClient(create_app()) as client:
        assert client.get("/api/v1/businesses").status_code == 401
        assert client.get("/api/v1/businesses/00000000-0000-4000-8000-000000000001").status_code == 401
        response = client.post(
            "/api/v1/businesses",
            headers={"Idempotency-Key": "00000000-0000-4000-8000-000000000002"},
            json={"name": "Empresa", "category": "Servicios", "activity_kind": "SERVICIOS"},
        )
    assert response.status_code == 401


def test_business_routes_documented_and_idempotency_header_required() -> None:
    with TestClient(create_app()) as client:
        paths = client.get("/openapi.json").json()["paths"]
    assert "/api/v1/businesses" in paths
    assert "post" in paths["/api/v1/businesses"]
    assert "get" in paths["/api/v1/businesses"]
    assert "/api/v1/businesses/{business_id}" in paths
    params = paths["/api/v1/businesses"]["post"]["parameters"]
    assert any(x["name"] == "Idempotency-Key" and x["required"] for x in params)
