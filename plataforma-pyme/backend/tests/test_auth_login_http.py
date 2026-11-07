"""Contrato HTTP: requiere Bearer para endpoints protegidos."""
from fastapi.testclient import TestClient
from app.main import create_app


def test_me_requires_bearer() -> None:
    with TestClient(create_app()) as client:
        r = client.get("/api/v1/auth/me")
    assert r.status_code == 401
    assert r.headers["www-authenticate"] == "Bearer"


def test_logout_requires_bearer() -> None:
    with TestClient(create_app()) as client:
        assert client.post("/api/v1/auth/logout").status_code == 401


def test_malformed_token_is_rejected() -> None:
    with TestClient(create_app()) as client:
        r = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer short"})
    assert r.status_code == 401


def test_openapi_has_login_and_protected_routes() -> None:
    with TestClient(create_app()) as client:
        doc = client.get("/openapi.json").json()
    paths = doc["paths"]
    for suffix in ("login", "me", "logout"):
        assert "/api/v1/auth/" + suffix in paths
    assert paths["/api/v1/auth/me"]["get"]["security"]
    assert "HTTPBearer" in doc["components"]["securitySchemes"]
