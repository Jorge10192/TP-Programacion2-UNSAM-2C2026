"""E3-3C: public exhibition simulation is isolated from MP and legacy lab.

All integration tests run inside a rollback transaction on the CI QA DB.
"""
import os
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, select

from app.infrastructure.models import (
    MercadoPagoTestOrder, MpSharedQaOrder, QrPaymentEvent,
    QrPaymentSettlement, Sale, SaleLine, SalePayment, StockMovement,
)
from test_qr_exhibition_integration import isolated, new_account, new_company, new_service


def setup_exhibition(monkeypatch):
    monkeypatch.setenv("PYME_QR_EXHIBITION_ENABLED", "1")
    monkeypatch.setenv("PYME_QR_EXHIBITION_SIMULATION_ENABLED", "1")
    for flag in (
        "PYME_DISPOSABLE_QA", "PYME_MP_QR_SHARED_QA_ENABLED",
        "PYME_MP_SHARED_QA_ORDERS_ENABLED", "PYME_MP_QR_TEST_ENABLED",
        "PYME_ENABLE_QR_DEMO_LAB", "PYME_ENABLE_QR_FINALIZATION_QA",
    ):
        monkeypatch.setenv(flag, "0")


def create_qr(client, h, b, item, price=2500):
    response = client.post(
        f"/api/v1/businesses/{b}/qr-payment-intents",
        headers={**h, "Idempotency-Key": str(uuid4())},
        json={"location_id": None, "discount_cents": 500,
              "notes": "Simulacion de exhibicion",
              "lines": [{"catalog_item_id": item, "quantity_milli": 1000,
                         "unit_price_cents": price}]},
    )
    assert response.status_code == 201, response.text
    return response.json()


def decision(client, h, b, qr, action, key):
    return client.post(
        f"/api/v1/businesses/{b}/qr-payment-intents/{qr}/exhibition-simulation",
        headers={**h, "Idempotency-Key": key}, json={"action": action},
    )


def count(db, model, b):
    return db.scalar(select(func.count()).select_from(model).where(model.business_id == b))


def test_exhibition_simulation_auth_validation_and_openapi():
    from fastapi.testclient import TestClient
    from app.main import create_app

    with TestClient(create_app()) as client:
        url = f"/api/v1/businesses/{uuid4()}/qr-payment-intents/{uuid4()}/exhibition-simulation"
        assert client.post(url, json={"action": "COBRAR"}, headers={
            "Idempotency-Key": str(uuid4()),
        }).status_code == 401
        paths = client.get("/openapi.json").json()["paths"]
        assert "/api/v1/businesses/{business_id}/qr-payment-intents/{intent_id}/exhibition-simulation" in paths


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="PostgreSQL CI QA")
def test_simulated_charge_creates_one_sale_and_never_calls_provider(isolated, monkeypatch):
    setup_exhibition(monkeypatch)
    client, db = isolated
    a = new_account(client, "charge")
    b = new_company(client, a, "Prueba QR cobro ficticio")
    item = new_service(client, a, b)
    qr = create_qr(client, a, b, item)
    key = str(uuid4())

    assert client.post(
        f"/api/v1/businesses/{b}/qr-payment-intents/{qr['id']}/simulate",
        headers={**a, "Idempotency-Key": str(uuid4())}, json={"action": "APROBAR"},
    ).status_code == 403
    assert client.post(
        f"/api/v1/businesses/{b}/qr-payment-intents/{qr['id']}/finalize-demo",
        headers=a,
    ).status_code == 403

    first = decision(client, a, b, qr["id"], "COBRAR", key)
    assert first.status_code == 201, first.text
    body = first.json()
    assert body["replayed"] is False
    assert body["intent"]["status"] == "FINALIZADA"
    assert body["intent"]["sale_id"] == body["sale"]["id"]
    assert body["sale"]["total_cents"] == 2000
    assert body["sale"]["status"] == "CONFIRMADA"
    assert body["sale"]["payments"][0]["method"] == "MERCADO_PAGO_DEMO_QA"
    assert body["sale"]["payments"][0]["amount_cents"] == 2000

    replay = decision(client, a, b, qr["id"], "COBRAR", key)
    assert replay.status_code == 200, replay.text
    assert replay.json()["sale"]["id"] == body["sale"]["id"]
    assert decision(client, a, b, qr["id"], "RECHAZAR", str(uuid4())).status_code == 409

    for model, expected in (
        (Sale, 1), (SaleLine, 1), (SalePayment, 1),
        (QrPaymentSettlement, 1), (StockMovement, 0),
        (MercadoPagoTestOrder, 0), (MpSharedQaOrder, 0),
    ):
        assert count(db, model, b) == expected, model.__name__
    assert [e.action for e in db.scalars(
        select(QrPaymentEvent).where(QrPaymentEvent.business_id == b)
        .order_by(QrPaymentEvent.sequence)
    )] == ["CREAR", "APROBAR", "FINALIZAR"]


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="PostgreSQL CI QA")
def test_simulated_reject_does_not_create_sale_and_blocks_later_approval(isolated, monkeypatch):
    setup_exhibition(monkeypatch)
    client, db = isolated
    a = new_account(client, "reject")
    b = new_company(client, a, "Prueba QR rechazo")
    item = new_service(client, a, b)
    qr = create_qr(client, a, b, item)
    key = str(uuid4())

    rejected = decision(client, a, b, qr["id"], "RECHAZAR", key)
    assert rejected.status_code == 201, rejected.text
    assert rejected.json()["intent"]["status"] == "RECHAZADA"
    assert rejected.json()["sale"] is None
    assert decision(client, a, b, qr["id"], "RECHAZAR", key).status_code == 200
    assert decision(client, a, b, qr["id"], "COBRAR", str(uuid4())).status_code == 409
    for model in (Sale, SaleLine, StockMovement, QrPaymentSettlement,
                  MercadoPagoTestOrder, MpSharedQaOrder):
        assert count(db, model, b) == 0


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="PostgreSQL CI QA")
def test_public_simulation_requires_enablement_and_cannot_access_other_tenant(isolated, monkeypatch):
    setup_exhibition(monkeypatch)
    client, db = isolated
    a = new_account(client, "owner")
    stranger = new_account(client, "other")
    b = new_company(client, a, "Comercio ajeno")
    item = new_service(client, a, b)
    qr = create_qr(client, a, b, item)
    key = str(uuid4())

    assert decision(client, stranger, b, qr["id"], "COBRAR", key).status_code == 404
    monkeypatch.setenv("PYME_QR_EXHIBITION_SIMULATION_ENABLED", "0")
    assert decision(client, a, b, qr["id"], "COBRAR", key).status_code == 403
    monkeypatch.setenv("PYME_QR_EXHIBITION_SIMULATION_ENABLED", "1")
    monkeypatch.setenv("PYME_QR_EXHIBITION_ENABLED", "0")
    assert decision(client, a, b, qr["id"], "RECHAZAR", key).status_code == 403
    assert count(db, Sale, b) == 0


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="PostgreSQL CI QA")
def test_exhibition_charge_reduces_physical_stock_once(isolated, monkeypatch):
    from sqlalchemy import select
    from app.infrastructure.models import StockBalance
    from test_sales_api_integration import location, seed_balance

    setup_exhibition(monkeypatch)
    client, db = isolated
    owner = new_account(client, "stock")
    company = new_company(client, owner, "Prueba QR inventario")
    site = location(client, company, owner)
    product = client.post(
        f"/api/v1/businesses/{company}/catalog", headers=owner, json={
            "name": "Producto fisico QR", "kind": "REVENTA",
            "unit": "UNIDAD", "sellable": True,
        },
    )
    assert product.status_code == 201, product.text
    item_id = product.json()["id"]
    seed_balance(db, UUID(company), site, UUID(item_id), milli=3000)
    qr = client.post(
        f"/api/v1/businesses/{company}/qr-payment-intents",
        headers={**owner, "Idempotency-Key": str(uuid4())},
        json={"location_id": str(site), "discount_cents": 100,
              "lines": [{
                  "catalog_item_id": item_id, "quantity_milli": 1000,
                  "unit_price_cents": 2500,
              }]},
    )
    assert qr.status_code == 201, qr.text
    key = str(uuid4())
    result = decision(client, owner, company, qr.json()["id"], "COBRAR", key)
    assert result.status_code == 201, result.text
    assert result.json()["sale"]["total_cents"] == 2400
    assert count(db, StockMovement, company) == 1
    stock = db.scalar(select(StockBalance.quantity_milli).where(
        StockBalance.business_id == company,
        StockBalance.location_id == site,
        StockBalance.catalog_item_id == item_id,
    ))
    assert stock == 2000
    assert decision(client, owner, company, qr.json()["id"], "COBRAR", key).status_code == 200
    assert count(db, StockMovement, company) == 1
    assert db.scalar(select(StockBalance.quantity_milli).where(
        StockBalance.business_id == company,
        StockBalance.location_id == site,
        StockBalance.catalog_item_id == item_id,
    )) == 2000


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="PostgreSQL CI QA")
def test_failed_stock_charge_rolls_back_simulated_approval(isolated, monkeypatch):
    from test_sales_api_integration import location, seed_balance

    setup_exhibition(monkeypatch)
    client, db = isolated
    owner = new_account(client, "no-stock")
    company = new_company(client, owner, "Prueba QR sin stock")
    site = location(client, company, owner)
    product = client.post(
        f"/api/v1/businesses/{company}/catalog", headers=owner, json={
            "name": "Producto QR sin stock", "kind": "REVENTA",
            "unit": "UNIDAD", "sellable": True,
        },
    )
    assert product.status_code == 201, product.text
    item_id = product.json()["id"]
    seed_balance(db, UUID(company), site, UUID(item_id), milli=1000)
    qr = client.post(
        f"/api/v1/businesses/{company}/qr-payment-intents",
        headers={**owner, "Idempotency-Key": str(uuid4())},
        json={"location_id": str(site), "lines": [{
            "catalog_item_id": item_id, "quantity_milli": 2000,
            "unit_price_cents": 1000,
        }]},
    )
    assert qr.status_code in (201, 409), qr.text
    # If QR creation itself enforces stock availability, rejection is equally safe.
    if qr.status_code == 409:
        assert count(db, Sale, company) == 0
        assert count(db, StockMovement, company) == 0
        return
    result = decision(client, owner, company, qr.json()["id"], "COBRAR", str(uuid4()))
    assert result.status_code == 409, result.text
    assert count(db, Sale, company) == 0
    assert count(db, StockMovement, company) == 0
    state = client.get(
        f"/api/v1/businesses/{company}/qr-payment-intents/{qr.json()['id']}",
        headers=owner,
    )
    assert state.status_code == 200, state.text
    assert state.json()["status"] == "ESPERANDO_PAGO"
