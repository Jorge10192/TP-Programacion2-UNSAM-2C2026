"""CU-02 contra PostgreSQL; todas las escrituras se revierten al final."""
import os
from collections.abc import Iterator
from datetime import timedelta
from hashlib import sha256
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.infrastructure.db import get_engine
from app.infrastructure.models import AuthSession, User
from app.main import create_app
from app.modules.auth.tokens import now_utc

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere PostgreSQL migrado a e212b_sessions",
    ),
]


@pytest.fixture
def context() -> Iterator[tuple[TestClient, object]]:
    with get_engine().connect() as conn:
        outer = conn.begin()
        app = create_app()
        def override() -> Iterator[Session]:
            with Session(bind=conn, join_transaction_mode="create_savepoint") as db:
                yield db
        app.dependency_overrides[get_db] = override
        try:
            with TestClient(app) as client:
                yield client, conn
        finally:
            app.dependency_overrides.clear()
            outer.rollback()


def _register(client: TestClient) -> tuple[str, str]:
    email = f"session-{uuid4().hex}@example.com"
    password = "Frase de prueba extensa para iniciar sesion"
    result = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "display_name": "Prueba"}
    )
    assert result.status_code == 201, result.text
    return email, password


def _login(client: TestClient, email: str, password: str):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


def test_login_me_logout_and_db_stores_only_token_digest(context: tuple[TestClient, object]) -> None:
    client, connection = context
    email, password = _register(client)
    response = _login(client, email.upper(), password)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == email
    assert "password_hash" not in response.text
    token = body["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 200
    digest = sha256(token.encode("ascii")).hexdigest()
    assert connection.execute(
        select(AuthSession.token_hash).where(AuthSession.token_hash == digest)
    ).scalar_one() == digest
    assert digest != token
    assert client.post("/api/v1/auth/logout", headers=headers).status_code == 204
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401


def test_invalid_password_missing_user_disabled_same_error(context: tuple[TestClient, object]) -> None:
    client, conn = context
    email, password = _register(client)
    wrong = _login(client, email, "incorrecta").json()
    unknown = _login(client, f"none-{uuid4().hex}@example.com", password).json()
    assert wrong == unknown == {"detail": "Credenciales invalidas o sesion vencida"}
    conn.execute(update(User).where(User.email_normalizado == email).values(status="DESHABILITADO"))
    result = _login(client, email, password)
    assert result.status_code == 401
    assert result.json() == wrong


def test_expired_token_is_rejected(context: tuple[TestClient, object]) -> None:
    client, conn = context
    email, password = _register(client)
    response = _login(client, email, password)
    assert response.status_code == 200
    token = response.json()["access_token"]
    digest = sha256(token.encode("ascii")).hexdigest()
    conn.execute(
        update(AuthSession).where(AuthSession.token_hash == digest).values(
            created_at=now_utc() - timedelta(hours=24),
            expires_at=now_utc() - timedelta(hours=1),
        )
    )
    assert client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    ).status_code == 401


def test_logout_only_revokes_selected_session(context: tuple[TestClient, object]) -> None:
    client, _conn = context
    email, password = _register(client)
    a = _login(client, email, password).json()["access_token"]
    b = _login(client, email, password).json()["access_token"]
    assert a != b
    assert client.post(
        "/api/v1/auth/logout", headers={"Authorization": f"Bearer {a}"}
    ).status_code == 204
    assert client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {a}"}
    ).status_code == 401
    assert client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {b}"}
    ).status_code == 200
