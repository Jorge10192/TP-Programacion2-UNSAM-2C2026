"""HTTP contra PostgreSQL real; commit de servicio revierte con transaccion exterior."""
import os
from collections.abc import Iterator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.infrastructure.db import get_engine
from app.infrastructure.models import User
from app.main import create_app
from app.modules.auth.passwords import verify_password

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere PostgreSQL y RUN_DB_INTEGRATION=1",
    ),
]


@pytest.fixture
def isolated_client() -> Iterator[tuple[TestClient, object]]:
    with get_engine().connect() as conn:
        outer = conn.begin()
        app = create_app()

        def db_override() -> Iterator[Session]:
            with Session(bind=conn, join_transaction_mode="create_savepoint") as session:
                yield session

        app.dependency_overrides[get_db] = db_override
        try:
            with TestClient(app) as client:
                yield client, conn
        finally:
            app.dependency_overrides.clear()
            outer.rollback()


def _payload(email: str) -> dict[str, str]:
    return {
        "email": email,
        "password": "Una contrasena de prueba realmente larga",
        "display_name": "Cuenta de integracion",
    }


def test_register_creates_user_with_argon2id_in_transaction(
    isolated_client: tuple[TestClient, object],
) -> None:
    client, conn = isolated_client
    email = f"e2a-{uuid4().hex}@example.com"
    response = client.post("/api/v1/auth/register", json=_payload(email.upper()))
    assert response.status_code == 201, response.text
    assert response.json()["email"] == email
    assert "password_hash" not in response.json()
    encoded = conn.execute(
        select(User.password_hash).where(User.email_normalizado == email)
    ).scalar_one()
    assert encoded.startswith("$argon2id$")
    assert verify_password(_payload(email)["password"], encoded)


def test_register_rejects_same_normalized_email(
    isolated_client: tuple[TestClient, object],
) -> None:
    client, _conn = isolated_client
    email = f"e2b-{uuid4().hex}@example.com"
    assert client.post("/api/v1/auth/register", json=_payload(email)).status_code == 201
    duplicate = client.post("/api/v1/auth/register", json=_payload(email.upper()))
    assert duplicate.status_code == 409
    assert duplicate.json() == {"detail": "No se pudo completar el registro"}
