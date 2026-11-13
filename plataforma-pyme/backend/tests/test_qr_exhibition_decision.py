"""E3-3E: add only fictional accept/reject to the original main QR exhibition.

CI integration uses an isolated rollback transaction, never shared Supabase.
"""
import os
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.infrastructure.models import (
    MercadoPagoTestOrder, MpSharedQaOrder,
    QrPaymentEvent, QrPaymentSettlement, Sale, StockMovement,
)
from app.main import create_app
from test_qr_exhibition_integration import isolated, new_account, new_company, new_service


def setup(monkeypatch):
    monkeypatch.setenv("PYME_QR_EXHIBITION_ENABLED", "1")
    for flag in (
        "PYME_DISPOSABLE_QA", "PYME_ENABLE_QR_DEMO_LAB",
        "PYME_ENABLE_QR_FINALIZATION_QA", "PYME_MP_QR_TEST_ENABLED",
        "PYME_MP_QR_SHARED_QA_ENABLED", "PYME_MP_SHARED_QA_ORDERS_ENABLED",
    ):
        monkeypatch.setenv(flag, "0")


def make_qr(client, owner, business, item):
    response = client.post(
        f"/api/v1/businesses/{business}/qr-payment-intents",
        headers={**owner, "Idempotency-Key": str(uuid4())},
        json={"location_id": None, "discount_cents": 200,
              "lines": [{"catalog_item_id": item, "quantity_milli": 1000,
                         "unit_price_cents": 7000}]},
    )
    assert response.status_code == 201, response.text
    return response.json()


def decide(client, owner, business, qr_id, action, key=None):
    return client.post(
        f"/api/v1/businesses/{business}/qr-payment-intents/{qr_id}/exhibition-decision",
        headers={**owner, "Idempotency-Key": key or str(uuid4())},
        json={"action": action},
    )


def total(db, cls):
    return db.scalar(select(func.count()).select_from(cls))


def test_public_qr_decision_requires_session_and_only_two_actions():
    with TestClient(create_app()) as client:
        path = f"/api/v1/businesses/{uuid4()}/qr-payment-intents/{uuid4()}/exhibition-decision"
        assert client.post(path, headers={"Idempotency-Key": str(uuid4())},
                           json={"action": "APROBAR"}).status_code == 401
        assert client.post(path, headers={"Idempotency-Key": str(uuid4())},
                           json={"action": "EXPIRAR"}).status_code in (401, 422)
        assert "/api/v1/businesses/{business_id}/qr-payment-intents/{intent_id}/exhibition-decision" in (
            client.get("/openapi.json").json()["paths"]
        )


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="PostgreSQL QA CI")
def test_public_qr_accepted_keeps_png_and_never_creates_sale(isolated, monkeypatch):
    setup(monkeypatch)
    client, db = isolated
    owner = new_account(client, "simple-approval")
    stranger = new_account(client, "simple-stranger")
    business = new_company(client, owner, "Aprobacion exhibicion main")
    product = new_service(client, owner, business)
    qr = make_qr(client, owner, business, product)

    key = str(uuid4())
    url = f"/api/v1/businesses/{business}/qr-payment-intents/{qr['id']}"
    assert decide(client, stranger, business, qr["id"], "APROBAR", key).status_code == 404
    assert client.post(url + "/simulate", headers={
        **owner, "Idempotency-Key": str(uuid4()),
    }, json={"action": "APROBAR"}).status_code == 403
    assert client.post(url + "/finalize-demo", headers=owner).status_code == 403

    approved = decide(client, owner, business, qr["id"], "APROBAR", key)
    assert approved.status_code == 201, approved.text
    assert approved.json()["status"] == "APROBADA_DEMO"
    assert approved.json()["total_cents"] == qr["total_cents"] == 6800
    assert approved.json()["qr_png_data_uri"] == qr["qr_png_data_uri"]
    assert approved.json()["sale_id"] is None
    replay = decide(client, owner, business, qr["id"], "APROBAR", key)
    assert replay.status_code == 200, replay.text
    assert replay.json()["status"] == "APROBADA_DEMO"
    assert decide(client, owner, business, qr["id"], "RECHAZAR").status_code == 409
    assert decide(client, owner, business, qr["id"], "EXPIRAR").status_code == 422

    for cls in (Sale, StockMovement, QrPaymentSettlement, MercadoPagoTestOrder, MpSharedQaOrder):
        assert total(db, cls) == 0, cls.__name__
    events = db.scalars(select(QrPaymentEvent).where(
        QrPaymentEvent.business_id == business).order_by(QrPaymentEvent.sequence)).all()
    assert [event.action for event in events] == ["CREAR", "APROBAR"]


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="PostgreSQL QA CI")
def test_public_qr_rejected_is_audited_and_isolation_enforced(isolated, monkeypatch):
    setup(monkeypatch)
    client, db = isolated
    owner = new_account(client, "simple-reject")
    business = new_company(client, owner, "Rechazo exhibicion main")
    product = new_service(client, owner, business)
    qr = make_qr(client, owner, business, product)
    key = str(uuid4())

    rejected = decide(client, owner, business, qr["id"], "RECHAZAR", key)
    assert rejected.status_code == 201, rejected.text
    assert rejected.json()["status"] == "RECHAZADA"
    assert rejected.json()["qr_png_data_uri"] == qr["qr_png_data_uri"]
    assert rejected.json()["sale_id"] is None
    assert decide(client, owner, business, qr["id"], "RECHAZAR", key).status_code == 200
    assert decide(client, owner, business, qr["id"], "APROBAR").status_code == 409
    assert total(db, Sale) == 0
    assert total(db, StockMovement) == 0
    assert [event.action for event in db.scalars(
        select(QrPaymentEvent).where(QrPaymentEvent.business_id == business)
        .order_by(QrPaymentEvent.sequence),
    ).all()] == ["CREAR", "RECHAZAR"]

    monkeypatch.setenv("PYME_QR_EXHIBITION_ENABLED", "0")
    new_key = str(uuid4())
    assert decide(client, owner, business, qr["id"], "RECHAZAR", new_key).status_code == 403
