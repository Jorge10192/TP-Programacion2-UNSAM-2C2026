"""Contratos de edición en OpenAPI y accesos anónimos, sin PostgreSQL."""
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import create_app


def test_patch_requires_authentication() -> None:
    with TestClient(create_app()) as client:
        response = client.patch(
            f"/api/v1/businesses/{uuid4()}",
            json={"name": "Empresa Test"},
        )
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_patch_security_and_error_contracts_documented() -> None:
    with TestClient(create_app()) as client:
        api = client.get("/openapi.json").json()
    spec = api["paths"]["/api/v1/businesses/{business_id}"]["patch"]
    assert spec["security"]
    for code in ("200", "401", "403", "404", "409", "422"):
        assert code in spec["responses"]
