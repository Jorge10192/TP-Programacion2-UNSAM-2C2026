"""Contrato HTTP /ready con dobles de DB; sin tocar PostgreSQL real."""
import pytest
from fastapi.testclient import TestClient

from app.main import create_app


class _Result:
    def scalar_one(self) -> int:
        return 1


class _Connection:
    def __enter__(self) -> "_Connection":
        return self

    def __exit__(self, *_args: object) -> None:
        return None

    def execute(self, _query: object) -> _Result:
        return _Result()


class _SuccessEngine:
    def connect(self) -> _Connection:
        return _Connection()


class _FailedEngine:
    def connect(self) -> None:
        raise OSError("Never expose credentials/internal details")


def test_ready_succeeds_when_db_responds(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.api.readiness.get_engine", lambda: _SuccessEngine())
    with TestClient(create_app()) as client:
        response = client.get("/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "database": "ok"}


def test_ready_returns_503_without_leaking_internal_details(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("app.api.readiness.get_engine", lambda: _FailedEngine())
    with TestClient(create_app()) as client:
        response = client.get("/ready")
    assert response.status_code == 503
    assert response.json() == {"detail": "Database unavailable"}
    assert "Never expose" not in response.text


def test_health_still_works_if_db_is_down(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.api.readiness.get_engine", lambda: _FailedEngine())
    with TestClient(create_app()) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_ready_is_documented() -> None:
    with TestClient(create_app()) as client:
        document = client.get("/openapi.json").json()
    assert "/ready" in document["paths"]
    assert "503" in document["paths"]["/ready"]["get"]["responses"]
