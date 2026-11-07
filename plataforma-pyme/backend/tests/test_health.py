"""Contrato de salud del proceso (sin base de datos)."""

from fastapi.testclient import TestClient

from app.main import create_app


def test_health_is_ok() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "asistente-pyme-api"}


def test_health_is_documented_in_openapi() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/openapi.json")

    assert response.status_code == 200
    document = response.json()
    assert document["info"]["title"] == "Asistente PyME — API"
    assert "/health" in document["paths"]
    assert document["paths"]["/health"]["get"]["responses"]["200"]


def test_unknown_route_returns_404() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/api/v1/sales")

    assert response.status_code == 404
