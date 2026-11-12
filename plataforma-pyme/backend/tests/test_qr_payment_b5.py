"""E3-2B B5: historial paginado por empresa, rol, expiración y tamaño de respuesta."""
import os
from datetime import timedelta
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import insert, update, select

from app.infrastructure.models import Membership, QrPaymentIntent
from app.main import create_app
from app.modules.auth.tokens import now_utc
from test_qr_payment_b2 import isolated, account, create_business, base
from test_qr_payment_b3 import create_qr, simulate


def test_qr_list_endpoint_requires_session_and_declares_paginacion():
    with TestClient(create_app()) as client:
        path = base(uuid4())
        assert client.get(path).status_code == 401
        schema = client.get("/openapi.json").json()
        assert "get" in schema["paths"]["/api/v1/businesses/{business_id}/qr-payment-intents"]


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="PostgreSQL QA")
def test_qr_list_pagination_and_tenant_isolation(isolated, monkeypatch):
    client, db = isolated
    owner, _ = account(client)
    company_a, company_b = create_business(client, owner), create_business(client, owner)
    first = create_qr(client, owner, company_a, 1300)
    second = create_qr(client, owner, company_a, 2600)
    third = create_qr(client, owner, company_b, 3700)
    path = base(company_a)
    full = client.get(path, headers=owner)
    assert full.status_code == 200, full.text
    rows = full.json()
    assert {x["id"] for x in rows} == {first["id"], second["id"]}
    assert all("qr_png_data_uri" not in x and "lines" not in x and "notes" not in x for x in rows)
    assert all(x["business_id"] == str(company_a) and x["provider"] == "MOCK_QA" for x in rows)
    first_page = client.get(path + "?offset=0&limit=1", headers=owner).json()
    second_page = client.get(path + "?offset=1&limit=1", headers=owner).json()
    assert len(first_page) == len(second_page) == 1
    assert first_page[0]["id"] != second_page[0]["id"]
    assert client.get(path + "?offset=2&limit=1", headers=owner).json() == []
    assert client.get(path + "?limit=51", headers=owner).status_code == 422
    assert client.get(path + "?offset=-1", headers=owner).status_code == 422
    assert {x["id"] for x in client.get(base(company_b), headers=owner).json()} == {third["id"]}

    outsider, outsider_id = account(client)
    assert client.get(path, headers=outsider).status_code == 404
    db.execute(insert(Membership).values(
        id=uuid4(), business_id=company_a, user_id=outsider_id,
        role="TRABAJADOR", status="ACTIVA",
    ))
    assert client.get(path, headers=outsider).json() == []


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="PostgreSQL QA")
def test_qr_list_reports_expiration_without_mutating_intent(isolated, monkeypatch):
    client, db = isolated
    owner, _ = account(client)
    bid = create_business(client, owner)
    qr = create_qr(client, owner, bid)
    db.execute(update(QrPaymentIntent).where(
        QrPaymentIntent.id == UUID(qr["id"]),
    ).values(
        created_at=now_utc()-timedelta(minutes=45),
        expires_at=now_utc()-timedelta(minutes=15),
    ))
    summary = client.get(base(bid), headers=owner).json()
    assert len(summary) == 1 and summary[0]["status"] == "EXPIRADA"
    assert summary[0]["sale_id"] is None
    original_status = db.scalar(select(QrPaymentIntent.status).where(
        QrPaymentIntent.id == UUID(qr["id"])))
    assert original_status == "ESPERANDO_PAGO"


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="PostgreSQL QA")
def test_qr_list_approved_and_finalized_visible_only_in_own_company(isolated, monkeypatch):
    client, _ = isolated
    monkeypatch.setenv("PYME_ENABLE_QR_DEMO_LAB","1")
    monkeypatch.setenv("PYME_DISPOSABLE_QA","1")
    owner, _ = account(client)
    bid = create_business(client,owner)
    qr = create_qr(client,owner,bid)
    assert simulate(client,owner,bid,qr["id"],"APROBAR").status_code == 201
    before = client.get(base(bid), headers=owner).json()
    assert before[0]["status"] == "APROBADA_DEMO" and before[0]["sale_id"] is None
    finalize = client.post(base(bid)+"/"+qr["id"]+"/finalize-demo",headers=owner)
    assert finalize.status_code == 201,finalize.text
    after = client.get(base(bid),headers=owner).json()
    assert after[0]["status"] == "FINALIZADA"
    assert after[0]["sale_id"] == finalize.json()["sale"]["id"]
