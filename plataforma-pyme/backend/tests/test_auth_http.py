"""Contrato /register sin escribir a PostgreSQL."""
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_db
from app.main import create_app
from app.modules.auth import router as auth_route
from app.modules.auth.service import DuplicateIdentityError


def _payload() -> dict[str, str]:
    return {
        "email": " Persona@EXAMPLE.COM ",
        "password": "Frase de acceso de prueba de longitud segura",
        "display_name": "Persona Ejemplo",
    }


def test_register_returns_public_fields_only(monkeypatch: pytest.MonkeyPatch) -> None:
    class Stub:
        def __init__(self, db: object) -> None:
            pass

        def register(self, payload: object) -> object:
            assert str(payload.email) == "persona@example.com"
            return SimpleNamespace(
                id=uuid4(), email_normalizado=str(payload.email),
                display_name=payload.display_name, contact_phone=None,
                status="ACTIVO", created_at=datetime.now(timezone.utc),
                password_hash="secret_not_for_http",
            )

    monkeypatch.setattr(auth_route, "RegistrationService", Stub)
    app = create_app()
    app.dependency_overrides[get_db] = lambda: object()
    with TestClient(app) as client:
        response = client.post("/api/v1/auth/register", json=_payload())
    assert response.status_code == 201, response.text
    assert response.json()["email"] == "persona@example.com"
    assert "password" not in response.json()
    assert "password_hash" not in response.json()
    assert "secret_not_for_http" not in response.text


def test_duplicate_returns_generic_conflict(monkeypatch: pytest.MonkeyPatch) -> None:
    class Stub:
        def __init__(self, db: object) -> None:
            pass

        def register(self, payload: object) -> object:
            raise DuplicateIdentityError()

    monkeypatch.setattr(auth_route, "RegistrationService", Stub)
    app = create_app()
    app.dependency_overrides[get_db] = lambda: object()
    with TestClient(app) as client:
        response = client.post("/api/v1/auth/register", json=_payload())
    assert response.status_code == 409
    assert response.json() == {"detail": "No se pudo completar el registro"}


def test_invalid_request_does_not_reach_database() -> None:
    app = create_app()
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/auth/register", json={**_payload(), "password": "short"}
        )
        openapi = client.get("/openapi.json").json()
    assert response.status_code == 422
    assert "/api/v1/auth/register" in openapi["paths"]
