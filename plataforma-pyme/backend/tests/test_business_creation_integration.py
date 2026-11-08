"""CU-03 E2-1.3B: crear empresa real y aislar lectura por membresía.

Todos los INSERT se revierten por transacción externa + SAVEPOINTs; las pruebas
nunca crean cuentas ni empresas persistentes en la DB local.
"""
import os
from collections.abc import Iterator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.infrastructure.db import get_engine
from app.infrastructure.models import Business, BusinessCreationRequest, Membership
from app.main import create_app
from app.modules.businesses import repository as repo_module


pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere RUN_DB_INTEGRATION=1, PostgreSQL migrado a e213b_business_creation",
    ),
]


@pytest.fixture
def isolated() -> Iterator[tuple[TestClient, object]]:
    with get_engine().connect() as connection:
        outer = connection.begin()
        app = create_app()

        def override_db() -> Iterator[Session]:
            with Session(
                bind=connection, join_transaction_mode="create_savepoint"
            ) as session:
                yield session

        app.dependency_overrides[get_db] = override_db
        try:
            with TestClient(app) as client:
                yield client, connection
        finally:
            app.dependency_overrides.clear()
            outer.rollback()


def actor(client: TestClient) -> tuple[dict[str, str], str]:
    email = f"biz-{uuid4().hex}@example.com"
    password = "Una frase de prueba suficientemente extensa"
    registration = client.post(
        "/api/v1/auth/register", json={
            "email": email, "password": password, "display_name": "Persona Prueba",
        }
    )
    assert registration.status_code == 201, registration.text
    login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200, login.text
    return {"Authorization": f"Bearer {login.json()['access_token']}"}, str(registration.json()["id"])


def cmd(name="Tienda de prueba", kind="PRODUCTOS") -> dict[str, str]:
    return {"name": name, "category": "Comercio y servicios", "activity_kind": kind}


def create(client: TestClient, headers: dict[str, str], data=None, key=None):
    return client.post(
        "/api/v1/businesses",
        headers={**headers, "Idempotency-Key": str(key or uuid4())},
        json=data or cmd(),
    )


@pytest.mark.parametrize("field", ["name", "category"])
def test_create_rejects_nul_without_company_or_idempotency_record(isolated, field):
    client, connection = isolated
    headers, user_id = actor(client)
    key = uuid4()
    response = create(client, headers, {**cmd(), field: "Texto\x00invalido"}, key)
    assert response.status_code == 422, response.text
    assert connection.execute(
        select(Business.id).where(Business.founder_user_id == user_id)
    ).first() is None
    assert connection.execute(
        select(BusinessCreationRequest.business_id).where(
            BusinessCreationRequest.actor_user_id == user_id,
            BusinessCreationRequest.idempotency_key == key,
        )
    ).first() is None


def test_atomic_create_owner_and_original_founder(isolated) -> None:
    client, connection = isolated
    headers, user_id = actor(client)
    result = create(client, headers, cmd(kind="SERVICIOS"))
    assert result.status_code == 201, result.text
    body = result.json()
    assert body["founder_user_id"] == user_id
    assert body["membership"]["user_id"] == user_id
    assert body["membership"]["role"] == "TITULAR_ADMINISTRATIVO"
    assert body["membership"]["status"] == "ACTIVA"
    assert body["status"] == "ACTIVA"
    assert body["activity_kind"] == "SERVICIOS"
    founder_id = connection.execute(
        select(Business.founder_user_id).where(Business.id == body["id"])
    ).scalar_one()
    assert str(founder_id) == body["founder_user_id"]
    assert connection.execute(
        select(Membership.role).where(Membership.business_id == body["id"])
    ).scalar_one() == "TITULAR_ADMINISTRATIVO"


def test_idempotency_same_request_returns_same_business_and_conflict_on_change(isolated) -> None:
    client, connection = isolated
    headers, _ = actor(client)
    key = uuid4()
    first = create(client, headers, key=key)
    repeated = create(client, headers, key=key)
    conflict = create(client, headers, cmd(name="Otra empresa"), key=key)
    assert first.status_code == 201, first.text
    assert repeated.status_code == 200, repeated.text
    assert repeated.json() == first.json()
    assert conflict.status_code == 409, conflict.text
    assert len(client.get("/api/v1/businesses", headers=headers).json()) == 1
    stored_business_id, stored_digest = connection.execute(
        select(
            BusinessCreationRequest.business_id,
            BusinessCreationRequest.request_sha256,
        ).where(BusinessCreationRequest.idempotency_key == key)
    ).one()
    assert str(stored_business_id) == first.json()["id"]
    assert len(stored_digest) == 64


def test_two_users_cannot_see_each_others_businesses(isolated) -> None:
    client, connection = isolated
    headers_a, _ = actor(client)
    headers_b, _ = actor(client)
    a = create(client, headers_a).json()
    b = create(client, headers_b).json()
    assert [item["id"] for item in client.get(
        "/api/v1/businesses", headers=headers_a
    ).json()] == [a["id"]]
    assert [item["id"] for item in client.get(
        "/api/v1/businesses", headers=headers_b
    ).json()] == [b["id"]]
    assert client.get(
        f"/api/v1/businesses/{a['id']}", headers=headers_b
    ).status_code == 404
    assert client.get(
        f"/api/v1/businesses/{a['id']}", headers=headers_a
    ).status_code == 200


def test_inactive_membership_disappears_from_list_and_details(isolated) -> None:
    client, connection = isolated
    headers, _ = actor(client)
    business_id = create(client, headers).json()["id"]
    connection.execute(
        update(Membership).where(Membership.business_id == business_id)
        .values(status="INACTIVA")
    )
    assert client.get("/api/v1/businesses", headers=headers).json() == []
    assert client.get(
        f"/api/v1/businesses/{business_id}", headers=headers
    ).status_code == 404


def test_logout_denies_business_creation_and_listing(isolated) -> None:
    client, _ = isolated
    headers, _ = actor(client)
    assert client.post("/api/v1/auth/logout", headers=headers).status_code == 204
    assert client.get("/api/v1/businesses", headers=headers).status_code == 401
    assert create(client, headers).status_code == 401


def test_no_orphan_business_if_membership_insert_fails(isolated, monkeypatch) -> None:
    client, connection = isolated
    headers, _ = actor(client)
    original_add = repo_module.BusinessRepository.add_membership

    def broken_add(self, member):
        raise RuntimeError("Simulated membership persistence failure")

    monkeypatch.setattr(repo_module.BusinessRepository, "add_membership", broken_add)
    # TestClient propaga excepciones, pero el servicio debe hacer rollback.
    with pytest.raises(RuntimeError, match="Simulated membership"):
        create(client, headers)
    monkeypatch.setattr(repo_module.BusinessRepository, "add_membership", original_add)
    assert not connection.execute(
        select(Business.id).where(Business.name == "Tienda de prueba")
    ).all()
