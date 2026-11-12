"""E3-2B B4: venta QA atómica desde aprobación DEMO; PostgreSQL aislado."""
import os
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, update, insert

from app.infrastructure.models import (
    Membership, Sale, SaleLine, SalePayment, StockBalance, StockMovement,
    QrPaymentEvent, QrPaymentIntent, QrPaymentSettlement,
)
from app.modules.sales.schemas import SaleView
from test_qr_payment_b2 import isolated, account, create_business, create_item, base, body
from test_qr_payment_b3 import create_qr, simulate
from test_sales_api_integration import location, seed_balance


def finalize(client, headers, business, intent_id):
    return client.post(base(business) + "/" + str(intent_id) + "/finalize-demo", headers=headers)


def receipt(client, headers, business, intent_id):
    return client.get(base(business) + "/" + str(intent_id) + "/receipt", headers=headers)


def qa(monkeypatch):
    monkeypatch.setenv("PYME_ENABLE_QR_DEMO_LAB", "1")
    monkeypatch.setenv("PYME_DISPOSABLE_QA", "1")


def counts(db, business):
    return [db.scalar(select(func.count()).select_from(table).where(
        table.business_id == business,
    )) for table in (Sale, SaleLine, SalePayment, StockMovement, QrPaymentSettlement)]


def test_qr_finalization_auth_and_openapi():
    from app.main import create_app
    with TestClient(create_app()) as client:
        target = base(uuid4()) + "/" + str(uuid4())
        assert client.post(target + "/finalize-demo").status_code == 401
        assert client.get(target + "/receipt").status_code == 401
        paths = client.get("/openapi.json").json()["paths"]
        assert "/api/v1/businesses/{business_id}/qr-payment-intents/{intent_id}/finalize-demo" in paths
        assert "/api/v1/businesses/{business_id}/qr-payment-intents/{intent_id}/receipt" in paths


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="PostgreSQL QA")
def test_approved_service_finalize_only_once_and_receipt(isolated, monkeypatch):
    client, db = isolated
    qa(monkeypatch)
    owner, _ = account(client)
    bid = create_business(client, owner)
    qr = create_qr(client, owner, bid)
    assert finalize(client, owner, bid, qr["id"]).status_code == 409
    assert simulate(client, owner, bid, qr["id"], "APROBAR").status_code == 201
    made = finalize(client, owner, bid, qr["id"])
    assert made.status_code == 201, made.text
    first = made.json()
    assert first["replayed"] is False
    assert first["intent"]["status"] == "FINALIZADA"
    assert first["intent"]["sale_id"] == first["sale"]["id"]
    assert first["sale"]["status"] == "CONFIRMADA"
    assert first["sale"]["total_cents"] == qr["total_cents"]
    assert first["sale"]["lines"][0]["description_snapshot"] == qr["lines"][0]["description_snapshot"]
    assert first["sale"]["payments"] == [{
        **first["sale"]["payments"][0], "method": "MERCADO_PAGO_DEMO_QA",
        "reference": qr["reference"], "amount_cents": qr["total_cents"],
    }]
    assert UUID(first["sale"]["request_id"]).version == 4
    assert receipt(client, owner, bid, qr["id"]).json() == first["sale"]
    assert client.get(base(bid) + "/" + qr["id"], headers=owner).json()["sale_id"] == first["sale"]["id"]
    repeat = finalize(client, owner, bid, qr["id"])
    assert repeat.status_code == 200 and repeat.json()["replayed"] is True
    assert repeat.json()["sale"]["id"] == first["sale"]["id"]
    assert counts(db, bid) == [1, 1, 1, 0, 1]
    event_rows = client.get(base(bid) + "/" + qr["id"] + "/events", headers=owner).json()
    assert [e["action"] for e in event_rows] == ["CREAR", "APROBAR", "FINALIZAR"]
    # La ruta pública permite solo los cinco medios DECLARADOS, nunca QA interno.
    payload = {
        "location_id": None, "lines": [{
            "catalog_item_id": qr["lines"][0]["catalog_item_id"],
            "quantity_milli": 1000, "unit_price_cents": qr["total_cents"],
        }], "payments": [{
            "method": "MERCADO_PAGO_DEMO_QA", "amount_cents": qr["total_cents"],
        }],
    }
    assert client.post(f"/api/v1/businesses/{bid}/sales", headers={
        **owner, "Idempotency-Key": str(uuid4()),
    }, json=payload).status_code == 422


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="PostgreSQL QA")
def test_physical_qr_debits_once_and_leaves_stock_nonnegative(isolated, monkeypatch):
    client, db = isolated
    qa(monkeypatch)
    owner, _ = account(client)
    bid = create_business(client, owner)
    loc = location(client, bid, owner)
    product = create_item(client, owner, bid, "Servicio para combo")
    physical = create_item(client, owner, bid, "Servicio temporal")
    # Reemplazar por bienes REVENTA en la misma empresa.
    p = client.post(f"/api/v1/businesses/{bid}/catalog", headers=owner, json={
        "name": "Artículo para QR B4", "kind": "REVENTA", "unit": "UNIDAD",
        "sellable": True,
    })
    assert p.status_code == 201, p.text
    good = UUID(p.json()["id"])
    seed_balance(db, bid, loc, good, milli=3000)
    assert client.post(f"/api/v1/businesses/{bid}/payment-connections/mercadopago/demo",
                       headers=owner).status_code == 200
    payload = {
        "location_id": str(loc), "discount_cents": 100, "notes": "Venta QA mezcla",
        "lines": [
            {"catalog_item_id": str(good), "quantity_milli": 1000, "unit_price_cents": 2000},
            {"catalog_item_id": str(product), "quantity_milli": 1000, "unit_price_cents": 800},
        ],
    }
    intent = client.post(base(bid), headers={**owner, "Idempotency-Key": str(uuid4())},
                         json=payload)
    assert intent.status_code == 201, intent.text
    iid = intent.json()["id"]
    assert simulate(client, owner, bid, iid, "APROBAR").status_code == 201
    first = finalize(client, owner, bid, iid)
    assert first.status_code == 201, first.text
    sale = first.json()["sale"]
    assert sale["total_cents"] == 2700
    assert len(sale["balances_after"]) == 1
    balance = db.execute(select(StockBalance.quantity_milli, StockBalance.version).where(
        StockBalance.business_id == bid, StockBalance.location_id == loc,
        StockBalance.catalog_item_id == good,
    )).one()
    assert tuple(balance) == (2000, 2)
    assert db.scalar(select(func.count()).select_from(StockMovement).where(
        StockMovement.business_id == bid)) == 1
    assert finalize(client, owner, bid, iid).status_code == 200
    balance2 = db.execute(select(StockBalance.quantity_milli, StockBalance.version).where(
        StockBalance.business_id == bid, StockBalance.location_id == loc,
        StockBalance.catalog_item_id == good,
    )).one()
    assert tuple(balance2) == (2000, 2)
    assert counts(db, bid) == [1, 2, 1, 1, 1]


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="PostgreSQL QA")
def test_stock_shortage_after_approval_goes_to_review_without_partial_sale(isolated, monkeypatch):
    client, db = isolated
    qa(monkeypatch)
    owner, _ = account(client)
    bid = create_business(client, owner)
    loc = location(client, bid, owner)
    a = client.post(f"/api/v1/businesses/{bid}/catalog", headers=owner, json={
        "name": "Artículo B4 A", "kind": "REVENTA", "unit": "UNIDAD", "sellable": True,
    })
    b = client.post(f"/api/v1/businesses/{bid}/catalog", headers=owner, json={
        "name": "Artículo B4 B", "kind": "REVENTA", "unit": "UNIDAD", "sellable": True,
    })
    assert a.status_code == 201 and b.status_code == 201
    first, second = UUID(a.json()["id"]), UUID(b.json()["id"])
    seed_balance(db, bid, loc, first, 1000)
    seed_balance(db, bid, loc, second, 1000)
    client.post(f"/api/v1/businesses/{bid}/payment-connections/mercadopago/demo", headers=owner)
    command = {
        "location_id": str(loc), "lines": [
            {"catalog_item_id": str(first), "quantity_milli": 1000, "unit_price_cents": 400},
            {"catalog_item_id": str(second), "quantity_milli": 1000, "unit_price_cents": 600},
        ],
    }
    result = client.post(base(bid), headers={**owner, "Idempotency-Key": str(uuid4())}, json=command)
    assert result.status_code == 201, result.text
    iid = result.json()["id"]
    assert simulate(client, owner, bid, iid, "APROBAR").status_code == 201
    db.execute(update(StockBalance).where(
        StockBalance.business_id == bid, StockBalance.location_id == loc,
        StockBalance.catalog_item_id == second,
    ).values(quantity_milli=0))
    outcome = finalize(client, owner, bid, iid)
    assert outcome.status_code == 409, outcome.text
    assert client.get(base(bid) + "/" + iid, headers=owner).json()["status"] == "REQUIERE_REVISION"
    assert receipt(client, owner, bid, iid).status_code == 404
    assert db.scalar(select(func.count()).select_from(Sale).where(Sale.business_id == bid)) == 0
    assert db.scalar(select(func.count()).select_from(StockMovement).where(
        StockMovement.business_id == bid)) == 0
    assert db.scalar(select(func.count()).select_from(QrPaymentSettlement).where(
        QrPaymentSettlement.business_id == bid)) == 0
    assert db.execute(select(StockBalance.quantity_milli).where(
        StockBalance.business_id == bid, StockBalance.location_id == loc,
        StockBalance.catalog_item_id == first)).scalar_one() == 1000
    assert finalize(client, owner, bid, iid).status_code == 409
    assert [e["action"] for e in client.get(base(bid) + "/" + iid + "/events", headers=owner).json()] == [
        "CREAR", "APROBAR", "REVISION",
    ]


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="PostgreSQL QA")
def test_disabled_role_and_tenant_reject_finalization(isolated, monkeypatch):
    client, db = isolated
    qa(monkeypatch)
    owner, _ = account(client)
    first, second = create_business(client, owner), create_business(client, owner)
    qr = create_qr(client, owner, first)
    assert simulate(client, owner, first, qr["id"], "APROBAR").status_code == 201
    monkeypatch.delenv("PYME_DISPOSABLE_QA")
    assert finalize(client, owner, first, qr["id"]).status_code == 403
    monkeypatch.setenv("PYME_DISPOSABLE_QA", "1")
    assert finalize(client, owner, second, qr["id"]).status_code == 404
    stranger, user_id = account(client)
    assert finalize(client, stranger, first, qr["id"]).status_code == 404
    db.execute(insert(Membership).values(
        id=uuid4(), business_id=first, user_id=user_id, role="TRABAJADOR",
        status="ACTIVA"))
    assert finalize(client, stranger, first, qr["id"]).status_code == 403
    assert counts(db, first) == [0, 0, 0, 0, 0]


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="PostgreSQL QA")
def test_failure_after_sale_flush_rolls_back_qr_state_and_stock(isolated, monkeypatch):
    client, db = isolated
    qa(monkeypatch)
    owner, _ = account(client)
    bid = create_business(client, owner)
    qr = create_qr(client, owner, bid)
    assert simulate(client, owner, bid, qr["id"], "APROBAR").status_code == 201
    def late_error(*args, **kwargs):
        raise RuntimeError("QA: error antes del commit del settlement")
    monkeypatch.setattr(SaleView, "from_records", late_error)
    with pytest.raises(RuntimeError, match="antes del commit"):
        finalize(client, owner, bid, qr["id"])
    assert counts(db, bid) == [0, 0, 0, 0, 0]
    assert db.scalar(select(QrPaymentIntent.status).where(
        QrPaymentIntent.id == UUID(qr["id"]))) == "APROBADA_DEMO"
