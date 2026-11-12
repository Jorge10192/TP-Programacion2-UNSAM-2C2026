"""E3-2B B1: permisos, aislamiento y persistencia de conexión ficticia."""
import os
from collections.abc import Iterator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import insert, select, update
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.infrastructure.db import get_engine
from app.infrastructure.models import Business, Membership, MerchantPaymentConnection
from app.main import create_app


PATH = "/api/v1/businesses/{}/payment-connections/mercadopago"


def test_contract_requires_login_and_is_visible_in_openapi() -> None:
    with TestClient(create_app()) as client:
        endpoint = PATH.format(uuid4())
        assert client.get(endpoint).status_code == 401
        assert client.post(endpoint + "/demo").status_code == 401
        assert client.delete(endpoint + "/demo").status_code == 401
        spec = client.get("/openapi.json").json()["paths"]
        assert "/api/v1/businesses/{business_id}/payment-connections/mercadopago" in spec
        assert "/api/v1/businesses/{business_id}/payment-connections/mercadopago/demo" in spec


@pytest.fixture
def isolated() -> Iterator[tuple[TestClient, object]]:
    with get_engine().connect() as connection:
        outer = connection.begin()
        app = create_app()
        def override() -> Iterator[Session]:
            with Session(bind=connection, join_transaction_mode="create_savepoint") as session:
                yield session
        app.dependency_overrides[get_db] = override
        try:
            with TestClient(app) as client:
                yield client, connection
        finally:
            app.dependency_overrides.clear()
            outer.rollback()


def account(client: TestClient) -> tuple[dict[str, str], str]:
    email = "pay-" + uuid4().hex + "@example.com"
    password = "Clave muy segura para probar pagos ficticios"
    response = client.post("/api/v1/auth/register", json={
        "email": email, "password": password, "display_name": "Cuenta Prueba",
    })
    assert response.status_code == 201, response.text
    auth = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert auth.status_code == 200, auth.text
    return {"Authorization": "Bearer " + auth.json()["access_token"]}, response.json()["id"]


def business(client: TestClient, auth: dict[str, str]) -> str:
    result = client.post("/api/v1/businesses", headers={
        **auth, "Idempotency-Key": str(uuid4()),
    }, json={
        "name": "Negocio QR Prueba", "category": "Servicios", "activity_kind": "MIXTO",
    })
    assert result.status_code == 201, result.text
    return result.json()["id"]


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="Requiere PostgreSQL QA")
def test_connect_replay_disconnect_reconnect_scoped_by_company(isolated) -> None:
    client, connection = isolated
    owner, _ = account(client)
    a = business(client, owner)
    b = business(client, owner)
    path_a, path_b = PATH.format(a), PATH.format(b)
    empty = client.get(path_a, headers=owner)
    assert empty.status_code == 200 and empty.json()["status"] == "NO_VINCULADA"
    linked = client.post(path_a + "/demo", headers=owner)
    assert linked.status_code == 200, linked.text
    assert linked.json()["status"] == "ACTIVA" and linked.json()["mode"] == "DEMO"
    repeated = client.post(path_a + "/demo", headers=owner)
    assert repeated.status_code == 200 and repeated.json()["mock_merchant_ref"] == linked.json()["mock_merchant_ref"]
    assert client.get(path_b, headers=owner).json()["status"] == "NO_VINCULADA"
    assert connection.execute(select(MerchantPaymentConnection).where(
        MerchantPaymentConnection.business_id == a,
    )).scalars().all().__len__() == 1
    unlinked = client.delete(path_a + "/demo", headers=owner)
    assert unlinked.status_code == 200 and unlinked.json()["status"] == "INACTIVA"
    assert client.get(path_a, headers=owner).json()["status"] == "INACTIVA"
    reconnected = client.post(path_a + "/demo", headers=owner)
    assert reconnected.status_code == 200
    assert reconnected.json()["mock_merchant_ref"] == linked.json()["mock_merchant_ref"]


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="Requiere PostgreSQL QA")
def test_foreign_tenant_and_worker_permissions_and_suspension(isolated) -> None:
    client, connection = isolated
    owner, _ = account(client)
    business_id = business(client, owner)
    url = PATH.format(business_id)
    stranger, _ = account(client)
    assert client.get(url, headers=stranger).status_code == 404
    assert client.post(url + "/demo", headers=stranger).status_code == 404
    worker, worker_id = account(client)
    connection.execute(insert(Membership).values(
        id=uuid4(), business_id=business_id, user_id=worker_id,
        role="TRABAJADOR", status="ACTIVA",
    ))
    assert client.get(url, headers=worker).status_code == 200
    assert client.post(url + "/demo", headers=worker).status_code == 403
    assert client.delete(url + "/demo", headers=worker).status_code == 403
    connection.execute(update(Business).where(Business.id == business_id).values(status="SUSPENDIDA"))
    assert client.get(url, headers=owner).status_code == 200
    assert client.post(url + "/demo", headers=owner).status_code == 409
    assert client.delete(url + "/demo", headers=owner).status_code == 409
