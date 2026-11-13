"""E3-2B B3: eventos QR auditables, reintentos y seguridad contra aprobaciones duplicadas."""
import os
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, insert, select, update

from app.infrastructure.models import Membership, QrPaymentEvent, QrPaymentIntent, Sale, StockMovement
from app.modules.auth.tokens import now_utc
from test_qr_payment_b2 import isolated, account, create_business, create_item, base, body


def create_qr(client, headers, bid, amount=2600):
    item = create_item(client, headers, bid, "Servicio evento " + uuid4().hex[:8])
    assert client.post(f"/api/v1/businesses/{bid}/payment-connections/mercadopago/demo",
                       headers=headers).status_code == 200
    result = client.post(base(bid), headers={**headers, "Idempotency-Key": str(uuid4())},
                         json=body([(item, amount)]))
    assert result.status_code == 201, result.text
    return result.json()


def simulate(client, headers, bid, intent_id, action, key=None):
    return client.post(base(bid) + f"/{intent_id}/simulate",
                       headers={**headers, "Idempotency-Key": str(key or uuid4())},
                       json={"action": action})


def events(client, headers, bid, intent_id):
    return client.get(base(bid) + f"/{intent_id}/events", headers=headers)


def test_simulator_routes_require_authentication():
    with TestClient(__import__("app.main", fromlist=["create_app"]).create_app()) as client:
        target = base(uuid4()) + "/" + str(uuid4())
        assert client.get(target + "/events").status_code == 401
        assert client.post(target + "/simulate", json={"action": "APROBAR"}).status_code == 401
        spec = client.get("/openapi.json").json()["paths"]
        assert "/api/v1/businesses/{business_id}/qr-payment-intents/{intent_id}/events" in spec
        assert "/api/v1/businesses/{business_id}/qr-payment-intents/{intent_id}/simulate" in spec


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="Requiere PostgreSQL QA")
def test_lab_disabled_by_default_and_approval_idempotent(isolated, monkeypatch):
    client, db = isolated
    auth, _ = account(client)
    bid = create_business(client, auth)
    intent = create_qr(client, auth, bid)
    iid = intent["id"]
    history = events(client, auth, bid, iid)
    assert history.status_code == 200, history.text
    assert [row["action"] for row in history.json()] == ["CREAR"]
    monkeypatch.delenv("PYME_ENABLE_QR_DEMO_LAB", raising=False)
    assert simulate(client, auth, bid, iid, "APROBAR").status_code == 403
    assert events(client, auth, bid, iid).json()[0]["to_status"] == "ESPERANDO_PAGO"

    monkeypatch.setenv("PYME_ENABLE_QR_DEMO_LAB", "1")
    key = uuid4()
    result = simulate(client, auth, bid, iid, "APROBAR", key)
    assert result.status_code == 201, result.text
    assert result.json()["status"] == "APROBADA_DEMO"
    assert simulate(client, auth, bid, iid, "APROBAR", key).status_code == 200
    assert simulate(client, auth, bid, iid, "RECHAZAR", key).status_code == 409
    assert simulate(client, auth, bid, iid, "RECHAZAR").status_code == 409
    history = events(client, auth, bid, iid).json()
    assert [row["action"] for row in history] == ["CREAR", "APROBAR"]
    assert [row["sequence"] for row in history] == [1, 2]
    assert history[1]["from_status"] == "ESPERANDO_PAGO"
    assert history[1]["to_status"] == "APROBADA_DEMO"
    assert db.scalar(select(func.count()).select_from(QrPaymentEvent).where(
        QrPaymentEvent.intent_id == UUID(iid))) == 2
    assert db.scalar(select(func.count()).select_from(Sale)) == 0
    assert db.scalar(select(func.count()).select_from(StockMovement)) == 0


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="Requiere PostgreSQL QA")
def test_rejection_cancel_and_expiration_never_create_sales(isolated, monkeypatch):
    client, db = isolated
    monkeypatch.setenv("PYME_ENABLE_QR_DEMO_LAB", "1")
    auth, _ = account(client)
    bid = create_business(client, auth)
    rejected = create_qr(client, auth, bid)
    assert simulate(client, auth, bid, rejected["id"], "RECHAZAR").json()["status"] == "RECHAZADA"
    assert simulate(client, auth, bid, rejected["id"], "APROBAR").status_code == 409

    canceled = create_qr(client, auth, bid)
    response = client.post(base(bid) + f"/{canceled['id']}/cancel", headers=auth)
    assert response.status_code == 200
    assert simulate(client, auth, bid, canceled["id"], "APROBAR").status_code == 409
    assert [e["action"] for e in events(client, auth, bid, canceled["id"]).json()] == ["CREAR", "CANCELAR"]

    expired = create_qr(client, auth, bid)
    assert simulate(client, auth, bid, expired["id"], "EXPIRAR").json()["status"] == "EXPIRADA"
    assert simulate(client, auth, bid, expired["id"], "APROBAR").status_code == 409

    unknown = create_qr(client, auth, bid)
    assert simulate(client, auth, bid, unknown["id"], "INDETERMINAR").json()["status"] == "INDETERMINADA"
    assert simulate(client, auth, bid, unknown["id"], "INDETERMINAR").status_code == 409
    assert simulate(client, auth, bid, unknown["id"], "RECHAZAR").json()["status"] == "RECHAZADA"
    assert [e["action"] for e in events(client, auth, bid, unknown["id"]).json()] == [
        "CREAR", "INDETERMINAR", "RECHAZAR"]
    assert db.scalar(select(func.count()).select_from(Sale)) == 0
    assert db.scalar(select(func.count()).select_from(StockMovement)) == 0


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="Requiere PostgreSQL QA")
def test_expired_intent_cannot_be_approved_and_foreign_tenant_is_invisible(isolated, monkeypatch):
    client, db = isolated
    monkeypatch.setenv("PYME_ENABLE_QR_DEMO_LAB", "1")
    owner, _ = account(client)
    a, b = create_business(client, owner), create_business(client, owner)
    intent = create_qr(client, owner, a)
    iid = UUID(intent["id"])
    from datetime import timedelta
    db.execute(update(QrPaymentIntent).where(QrPaymentIntent.id == iid).values(
        expires_at=now_utc() - timedelta(seconds=1),
        created_at=now_utc() - timedelta(minutes=30)))
    assert simulate(client, owner, a, iid, "APROBAR").status_code == 409
    assert simulate(client, owner, a, iid, "EXPIRAR").json()["status"] == "EXPIRADA"
    assert events(client, owner, b, iid).status_code == 404
    assert simulate(client, owner, b, iid, "APROBAR").status_code == 404
    outsider, outsider_id = account(client)
    assert events(client, outsider, a, iid).status_code == 404
    assert simulate(client, outsider, a, iid, "APROBAR").status_code == 404
    db.execute(insert(Membership).values(
        id=uuid4(), business_id=a, user_id=outsider_id, role="TRABAJADOR", status="ACTIVA"))
    assert events(client, outsider, a, iid).status_code == 404
    assert simulate(client, outsider, a, iid, "APROBAR").status_code == 403
    assert db.scalar(select(func.count()).select_from(Sale)) == 0
