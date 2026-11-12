"""E3-2B B2: QR tenant scoped, idempotencia, snapshots y ausencia de ventas."""
import os
from collections.abc import Iterator
from datetime import timedelta
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, insert, select, update
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.infrastructure.db import get_engine
from app.infrastructure.models import (
    Business, CatalogItem, Membership, QrPaymentIntent, QrPaymentIntentLine,
    Sale, StockMovement,
)
from app.main import create_app
from app.modules.auth.tokens import now_utc


def test_qr_api_requires_session_and_documents_security():
    with TestClient(create_app()) as client:
        base = f"/api/v1/businesses/{uuid4()}/qr-payment-intents"
        assert client.post(base, json={}).status_code == 401
        assert client.get(base + "/" + str(uuid4())).status_code == 401
        assert client.post(base + "/" + str(uuid4()) + "/cancel").status_code == 401
        spec = client.get("/openapi.json").json()["paths"]
        assert "/api/v1/businesses/{business_id}/qr-payment-intents" in spec
        assert "/api/v1/businesses/{business_id}/qr-payment-intents/{intent_id}" in spec
        assert "/api/v1/businesses/{business_id}/qr-payment-intents/by-request/{request_id}" in spec


@pytest.fixture
def isolated() -> Iterator[tuple[TestClient, object]]:
    with get_engine().connect() as connection:
        outer = connection.begin()
        app = create_app()
        def override() -> Iterator[Session]:
            with Session(bind=connection, join_transaction_mode="create_savepoint") as db:
                yield db
        app.dependency_overrides[get_db] = override
        try:
            with TestClient(app) as client:
                yield client, connection
        finally:
            app.dependency_overrides.clear()
            outer.rollback()


def account(client: TestClient):
    email = "b2qr-" + uuid4().hex + "@example.com"
    password = "Clave larga para pruebas de cobro QR"
    r = client.post("/api/v1/auth/register", json={
        "email": email, "password": password, "display_name": "QA QR",
    })
    assert r.status_code == 201, r.text
    login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200
    return {"Authorization": "Bearer " + login.json()["access_token"]}, UUID(r.json()["id"])


def create_business(client, headers):
    r = client.post("/api/v1/businesses", headers={
        **headers, "Idempotency-Key": str(uuid4()),
    }, json={"name": "Comercio QR", "category": "Servicios", "activity_kind": "MIXTO"})
    assert r.status_code == 201, r.text
    return UUID(r.json()["id"])


def create_item(client, headers, bid, name):
    r = client.post(f"/api/v1/businesses/{bid}/catalog", headers=headers, json={
        "name": name, "kind": "SERVICIO", "unit": "SERVICIO", "sellable": True,
    })
    assert r.status_code == 201, r.text
    return UUID(r.json()["id"])


def base(bid):
    return f"/api/v1/businesses/{bid}/qr-payment-intents"


def body(items, discount=0):
    return {"location_id": None, "discount_cents": discount, "notes": "Venta por QR",
            "lines": [
                {"catalog_item_id": str(iid), "quantity_milli": 1000,
                 "unit_price_cents": price} for iid, price in items
            ]}




@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="Requiere PostgreSQL QA migrado")
def test_create_replay_snapshot_no_sale_and_cancel(isolated):
    client, db = isolated
    owner, _ = account(client)
    bid = create_business(client, owner)
    first = create_item(client, owner, bid, "Servicio uno")
    second = create_item(client, owner, bid, "Servicio dos")
    # Sin conexión nunca se crea una intención.
    key = uuid4()
    payload = body([(first, 2500), (second, 4500)], discount=500)
    assert client.post(base(bid), headers={**owner, "Idempotency-Key": str(key)}, json=payload).status_code == 409
    assert db.scalar(select(func.count()).select_from(QrPaymentIntent)) == 0
    link = f"/api/v1/businesses/{bid}/payment-connections/mercadopago/demo"
    assert client.post(link, headers=owner).status_code == 200

    made = client.post(base(bid), headers={**owner, "Idempotency-Key": str(key)}, json=payload)
    assert made.status_code == 201, made.text
    qr = made.json()
    assert qr["provider"] == "MOCK_QA" and qr["status"] == "ESPERANDO_PAGO"
    assert qr["subtotal_cents"] == 7000 and qr["discount_cents"] == 500
    assert qr["total_cents"] == 6500 and qr["currency"] == "ARS"
    assert qr["lines"][0]["description_snapshot"] == "Servicio uno"
    assert qr["lines"][1]["description_snapshot"] == "Servicio dos"
    assert qr["qr_png_data_uri"].startswith("data:image/png;base64,")
    assert qr["reference"].startswith("PYME-DEMO-")
    assert client.get(base(bid) + "/" + qr["id"], headers=owner).json() == qr
    assert client.get(base(bid) + "/by-request/" + str(key), headers=owner).json() == qr
    replay = client.post(base(bid), headers={**owner, "Idempotency-Key": str(key)}, json=payload)
    assert replay.status_code == 200 and replay.json()["id"] == qr["id"]
    assert client.post(base(bid), headers={**owner, "Idempotency-Key": str(key)},
                       json=body([(first, 2700), (second, 4500)], discount=500)).status_code == 409

    # Edición posterior no altera snapshot ni importes QR.
    db.execute(update(CatalogItem).where(CatalogItem.id == first).values(
        name="Servicio modificado", name_key="servicio modificado", price_cents=9900))
    after = client.get(base(bid) + "/" + qr["id"], headers=owner).json()
    assert after["lines"][0]["description_snapshot"] == "Servicio uno"
    assert after["total_cents"] == 6500
    assert db.scalar(select(func.count()).select_from(QrPaymentIntent)) == 1
    assert db.scalar(select(func.count()).select_from(QrPaymentIntentLine)) == 2
    assert db.scalar(select(func.count()).select_from(Sale)) == 0
    assert db.scalar(select(func.count()).select_from(StockMovement)) == 0

    # No se puede desvincular una conexión con QR pendiente vigente.
    assert client.delete(link, headers=owner).status_code == 409
    canceled = client.post(base(bid) + "/" + qr["id"] + "/cancel", headers=owner)
    assert canceled.status_code == 200 and canceled.json()["status"] == "CANCELADA"
    assert client.post(base(bid) + "/" + qr["id"] + "/cancel", headers=owner).status_code == 200
    assert client.delete(link, headers=owner).status_code == 200
    assert db.scalar(select(func.count()).select_from(Sale)) == 0


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="Requiere PostgreSQL QA migrado")
def test_tenant_and_role_boundaries_and_expiration(isolated):
    client, db = isolated
    owner, _ = account(client)
    a = create_business(client, owner)
    b = create_business(client, owner)
    first = create_item(client, owner, a, "Servicio protegido")
    client.post(f"/api/v1/businesses/{a}/payment-connections/mercadopago/demo", headers=owner)
    key = uuid4()
    made = client.post(base(a), headers={**owner, "Idempotency-Key": str(key)},
                       json=body([(first, 3500)]))
    assert made.status_code == 201, made.text
    iid = made.json()["id"]
    assert client.get(base(b) + "/" + iid, headers=owner).status_code == 404
    assert client.get(base(b) + "/by-request/" + str(key), headers=owner).status_code == 404

    foreign, worker_id = account(client)
    assert client.get(base(a) + "/" + iid, headers=foreign).status_code == 404
    assert client.post(base(a), headers={**foreign, "Idempotency-Key": str(uuid4())},
                       json=body([(first, 3500)])).status_code == 404
    db.execute(insert(Membership).values(
        id=uuid4(), business_id=a, user_id=worker_id, role="TRABAJADOR", status="ACTIVA"))
    assert client.get(base(a) + "/" + iid, headers=foreign).status_code == 404
    assert client.post(base(a), headers={**foreign, "Idempotency-Key": str(uuid4())},
                       json=body([(first, 3500)])).status_code == 403

    # El GET devuelve estado vencido sin confirmar venta ni escribir movimientos.
    db.execute(update(QrPaymentIntent).where(QrPaymentIntent.id == UUID(iid)).values(
        created_at=now_utc() - timedelta(minutes=30),
        expires_at=now_utc() - timedelta(minutes=15),
    ))
    assert client.get(base(a) + "/" + iid, headers=owner).json()["status"] == "EXPIRADA"
    assert client.post(base(a) + "/" + iid + "/cancel", headers=owner).status_code == 409
    assert db.scalar(select(func.count()).select_from(Sale)) == 0
