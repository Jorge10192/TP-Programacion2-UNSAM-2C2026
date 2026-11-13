"""E3-3B: POS público crea QR no pagable sin vinculación con Mercado Pago.

Ejecutar sobre DB QA migrada, jamás en una base de producción.
"""
import os
from collections.abc import Iterator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.infrastructure.db import get_engine
from app.infrastructure.models import (
    MerchantPaymentConnection, QrPaymentIntent, Sale, StockMovement,
    MercadoPagoTestOrder, MpSharedQaOrder,
)
from app.main import create_app


@pytest.fixture
def isolated() -> Iterator[tuple[TestClient, Session]]:
    with get_engine().connect() as conn:
        outer = conn.begin()
        app = create_app()

        def override():
            with Session(bind=conn, join_transaction_mode="create_savepoint") as db:
                yield db

        app.dependency_overrides[get_db] = override
        try:
            with TestClient(app) as client, Session(bind=conn, join_transaction_mode="create_savepoint") as db:
                yield client, db
        finally:
            app.dependency_overrides.clear()
            outer.rollback()


def new_account(client, n):
    email = f"exhibicion-{n}-{uuid4().hex}@example.com"
    password = "Password-EXHIBICION-2026-PRUEBA"
    res = client.post("/api/v1/auth/register", json={
        "email": email, "password": password, "display_name": "Usuario exhibición",
    })
    assert res.status_code == 201, res.text
    login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200, login.text
    return {"Authorization": "Bearer " + login.json()["access_token"]}


def new_company(client, headers, name):
    res = client.post("/api/v1/businesses", headers={
        **headers, "Idempotency-Key": str(uuid4()),
    }, json={"name": name, "category": "Servicios", "activity_kind": "MIXTO"})
    assert res.status_code == 201, res.text
    return res.json()["id"]


def new_service(client, headers, business):
    res = client.post(f"/api/v1/businesses/{business}/catalog", headers=headers, json={
        "name": "Asesoría", "kind": "SERVICIO", "unit": "SERVICIO", "sellable": True,
    })
    assert res.status_code == 201, res.text
    return res.json()["id"]


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="PostgreSQL QA migrado")
def test_public_exhibition_is_unlinked_tenant_scoped_and_not_paid(isolated, monkeypatch):
    monkeypatch.setenv("PYME_QR_EXHIBITION_ENABLED", "1")
    for flag in (
        "PYME_DISPOSABLE_QA", "PYME_MP_QR_SHARED_QA_ENABLED",
        "PYME_MP_SHARED_QA_ORDERS_ENABLED", "PYME_MP_QR_TEST_ENABLED",
        "PYME_ENABLE_QR_DEMO_LAB", "PYME_ENABLE_QR_FINALIZATION_QA",
    ):
        monkeypatch.setenv(flag, "0")

    client, db = isolated
    owner_a = new_account(client, "a")
    owner_b = new_account(client, "b")
    business_a = new_company(client, owner_a, "Comercio A Exhibición")
    business_b = new_company(client, owner_b, "Comercio B Exhibición")
    item_a = new_service(client, owner_a, business_a)
    item_b = new_service(client, owner_b, business_b)

    def exhibit(headers, business, item, price):
        return client.post(
            f"/api/v1/businesses/{business}/qr-payment-intents",
            headers={**headers, "Idempotency-Key": str(uuid4())},
            json={"location_id": None, "discount_cents": 0, "notes": "No pagable",
                  "lines": [{"catalog_item_id": item, "quantity_milli": 1000,
                             "unit_price_cents": price}]},
        )

    a = exhibit(owner_a, business_a, item_a, 12000)
    b = exhibit(owner_b, business_b, item_b, 9500)
    assert a.status_code == 201, a.text
    assert b.status_code == 201, b.text
    assert a.json()["total_cents"] == 12000
    assert b.json()["total_cents"] == 9500
    assert a.json()["qr_png_data_uri"].startswith("data:image/png;base64,")
    assert a.json()["provider"] == "MOCK_QA"
    assert a.json()["reference"].startswith("PYME-DEMO-")
    assert a.json()["lines"][0]["description_snapshot"] == "Asesoría"

    assert client.get(
        f"/api/v1/businesses/{business_a}/qr-payment-intents/{a.json()['id']}",
        headers=owner_b,
    ).status_code == 404

    assert db.scalar(select(func.count()).select_from(MerchantPaymentConnection)) == 2
    assert db.scalar(select(func.count()).select_from(QrPaymentIntent)) == 2
    assert db.scalar(select(func.count()).select_from(MercadoPagoTestOrder)) == 0
    assert db.scalar(select(func.count()).select_from(MpSharedQaOrder)) == 0
    assert db.scalar(select(func.count()).select_from(Sale)) == 0
    assert db.scalar(select(func.count()).select_from(StockMovement)) == 0
