"""B7: el QR de la caja QA es único, inmutable y no prueba un pago."""
import os
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.modules.payments.mp_shared_qa_router import shared_qa_enabled, QR_RAW
from test_qr_payment_b2 import isolated, account, create_business


def test_shared_qa_flag_requires_both_guards(monkeypatch):
    monkeypatch.delenv("PYME_DISPOSABLE_QA", raising=False)
    monkeypatch.setenv("PYME_MP_QR_SHARED_QA_ENABLED", "1")
    assert not shared_qa_enabled()
    monkeypatch.setenv("PYME_DISPOSABLE_QA", "1")
    assert shared_qa_enabled()
    assert "mpago.la/pos/140776986" in QR_RAW
    assert "APP_USR" not in QR_RAW


def test_shared_qa_connection_requires_auth():
    with TestClient(create_app()) as client:
        r = client.get(f"/api/v1/businesses/{uuid4()}/mercadopago/qa-shared/connection")
        assert r.status_code == 401
        assert "/api/v1/businesses/{business_id}/mercadopago/qa-shared/connection" in (
            client.get("/openapi.json").json()["paths"]
        )


@pytest.mark.integration
@pytest.mark.skipif(os.getenv("RUN_DB_INTEGRATION") != "1", reason="PostgreSQL QA")
def test_shared_qa_is_virtual_tenant_scoped_and_never_creates_pos(isolated, monkeypatch):
    client, _db = isolated
    owner, _ = account(client)
    other, _ = account(client)
    a = create_business(client, owner)
    b = create_business(client, owner)
    path = lambda bid: f"/api/v1/businesses/{bid}/mercadopago/qa-shared/connection"
    monkeypatch.delenv("PYME_MP_QR_SHARED_QA_ENABLED", raising=False)
    disabled = client.get(path(a), headers=owner)
    assert disabled.status_code == 200
    assert disabled.json()["qr_png_data_uri"] is None
    assert disabled.json()["mp_user_id"] is None
    monkeypatch.setenv("PYME_DISPOSABLE_QA", "1")
    monkeypatch.setenv("PYME_MP_QR_SHARED_QA_ENABLED", "1")
    first = client.get(path(a), headers=owner)
    second = client.get(path(b), headers=owner)
    assert first.status_code == second.status_code == 200
    x, y = first.json(), second.json()
    assert x["qr_png_data_uri"].startswith("data:image/png;base64,")
    assert x["qr_png_data_uri"] == y["qr_png_data_uri"]
    assert x["pos_id"] == y["pos_id"] == "140776986"
    assert x["external_pos_id"] == y["external_pos_id"] == "PYMEQA001POS001"
    assert x["orders_integrated"] is False and x["remote_verified"] is False
    assert "token" not in first.text.lower()
    assert client.get(path(a), headers=other).status_code == 404
    assert client.get(path(uuid4()), headers=owner).status_code == 404
