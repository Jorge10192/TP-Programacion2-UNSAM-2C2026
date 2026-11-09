"""E2-6 B: ventas reales de servicios contra PostgreSQL aislado por rollback."""
import os
from collections.abc import Iterator
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, insert, select
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.infrastructure.db import get_engine
from app.infrastructure.models import Sale, SaleLine, SalePayment, StockMovement, StockBalance
from app.main import create_app

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere PostgreSQL migrado a e26a_sales_foundation",
    ),
]


@pytest.fixture
def isolated() -> Iterator[tuple[TestClient, object]]:
    with get_engine().connect() as connection:
        outer = connection.begin()
        app = create_app()

        def override_db() -> Iterator[Session]:
            with Session(bind=connection, join_transaction_mode="create_savepoint") as session:
                yield session

        app.dependency_overrides[get_db] = override_db
        try:
            with TestClient(app) as client:
                yield client, connection
        finally:
            app.dependency_overrides.clear()
            outer.rollback()


def auth(client):
    email = f"sales-api-{uuid4().hex}@example.com"
    password = "Clave exclusiva larga para pruebas"
    reg = client.post("/api/v1/auth/register", json={
        "email": email, "password": password, "display_name": "Operador ventas",
    })
    assert reg.status_code == 201, reg.text
    login = client.post("/api/v1/auth/login", json={
        "email": email, "password": password,
    })
    assert login.status_code == 200, login.text
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def business(client, headers):
    resp = client.post("/api/v1/businesses", headers={
        **headers, "Idempotency-Key": str(uuid4()),
    }, json={"name": "Empresa de ventas", "category": "Servicios", "activity_kind": "MIXTO"})
    assert resp.status_code == 201, resp.text
    return UUID(resp.json()["id"])


def item(client, bid, headers, *, kind="SERVICIO", name="Consultoria"):
    resp = client.post(f"/api/v1/businesses/{bid}/catalog", headers=headers, json={
        "name": name, "kind": kind,
        "unit": "SERVICIO" if kind == "SERVICIO" else "UNIDAD",
        "sellable": True,
    })
    assert resp.status_code == 201, resp.text
    return UUID(resp.json()["id"])


def payload(iid, *, quantity=1000, cents=2000):
    return {"lines": [{
        "catalog_item_id": str(iid), "quantity_milli": quantity,
        "unit_price_cents": cents,
    }], "payments": [{"method": "EFECTIVO", "amount_cents": quantity * cents // 1000}]}


def sale_path(bid, sid=None):
    path = f"/api/v1/businesses/{bid}/sales"
    return f"{path}/{sid}" if sid else path


def post(client, bid, headers, body, *, key=None):
    return client.post(sale_path(bid), headers={
        **headers, "Idempotency-Key": str(key or uuid4()),
    }, json=body)


def test_service_sale_replay_snapshot_and_zero_inventory(isolated):
    client, db = isolated
    headers = auth(client)
    bid = business(client, headers)
    iid = item(client, bid, headers)
    key = uuid4()
    body = payload(iid)
    made = post(client, bid, headers, body, key=key)
    assert made.status_code == 201, made.text
    data = made.json()
    assert data["status"] == "CONFIRMADA"
    assert data["total_cents"] == 2000
    assert data["balances_after"] == [] and data["location_id"] is None
    assert data["lines"][0]["description_snapshot"] == "Consultoria"
    assert data["lines"][0]["kind_snapshot"] == "SERVICIO"
    assert data["payments"][0]["method"] == "EFECTIVO"
    assert post(client, bid, headers, body, key=key).status_code == 200
    assert post(client, bid, headers, body, key=key).json() == data
    assert client.get(sale_path(bid, data["id"]), headers=headers).json() == data
    changed = payload(iid, cents=3000)
    assert post(client, bid, headers, changed, key=key).status_code == 409
    for model, count in [(Sale, 1), (SaleLine, 1), (SalePayment, 1),
                         (StockMovement, 0), (StockBalance, 0)]:
        assert db.scalar(select(func.count()).select_from(model).where(
            model.business_id == bid,
        )) == count


def test_cross_tenant_and_physical_item_rejected(isolated):
    client, db = isolated
    headers = auth(client)
    first, second = business(client, headers), business(client, headers)
    service = item(client, first, headers)
    physical = item(client, first, headers, kind="REVENTA", name="Producto")
    assert post(client, second, headers, payload(service)).status_code == 422
    assert post(client, first, headers, payload(physical)).status_code == 409
    assert post(client, first, headers, {**payload(service),
        "location_id": str(uuid4())}).status_code == 409
    assert db.scalar(select(func.count()).select_from(Sale)) == 0


def test_split_payment_discount_and_isolation(isolated):
    client, _ = isolated
    headers = auth(client)
    a, b = business(client, headers), business(client, headers)
    one = item(client, a, headers)
    two = item(client, b, headers)
    body = payload(one)
    body["discount_cents"] = 200
    body["payments"] = [
        {"method": "EFECTIVO", "amount_cents": 1000},
        {"method": "TRANSFERENCIA", "amount_cents": 800, "reference": "  BCO  "},
    ]
    key = uuid4()
    first = post(client, a, headers, body, key=key)
    assert first.status_code == 201, first.text
    assert first.json()["payments"][1]["reference"] == "BCO"
    assert first.json()["total_cents"] == 1800
    second = post(client, b, headers, payload(two), key=key)
    assert second.status_code == 201, second.text
    assert first.json()["id"] != second.json()["id"]
    assert client.get(sale_path(a, second.json()["id"]), headers=headers).status_code == 404
    assert client.get(sale_path(b, first.json()["id"]), headers=headers).status_code == 404


def test_invalid_amount_does_not_persist(isolated):
    client, db = isolated
    headers = auth(client)
    bid = business(client, headers)
    iid = item(client, bid, headers)
    body = payload(iid)
    body["payments"][0]["amount_cents"] = 1
    assert post(client, bid, headers, body).status_code == 422
    assert db.scalar(select(func.count()).select_from(Sale).where(
        Sale.business_id == bid,
    )) == 0


def location(client, bid, headers, *, can_sell=True, can_store=True):
    response = client.post(f"/api/v1/businesses/{bid}/locations",
        headers=headers, json={
            "name": "Local Ventas", "kind": "LOCAL",
            "can_sell": can_sell, "can_store": can_store,
        })
    assert response.status_code == 201, response.text
    return UUID(response.json()["id"])


def seed_balance(db, bid, lid, iid, milli=3000):
    db.execute(insert(StockBalance).values(
        business_id=bid, location_id=lid, catalog_item_id=iid,
        quantity_milli=milli, version=1,
    ))


def test_physical_and_service_mixed_sale_debits_once(isolated):
    client, db = isolated
    headers = auth(client)
    bid = business(client, headers)
    lid = location(client, bid, headers)
    good = item(client, bid, headers, kind="REVENTA", name="Bolsa")
    service = item(client, bid, headers, kind="SERVICIO", name="Entrega")
    seed_balance(db, bid, lid, good, milli=5000)
    body = {
        "location_id": str(lid),
        "lines": [
            {"catalog_item_id": str(good), "quantity_milli": 1000, "unit_price_cents": 900},
            {"catalog_item_id": str(service), "quantity_milli": 1000, "unit_price_cents": 100},
            {"catalog_item_id": str(good), "quantity_milli": 2000, "unit_price_cents": 900},
        ],
        "payments": [{"method": "EFECTIVO", "amount_cents": 2800}],
    }
    key = uuid4()
    first = post(client, bid, headers, body, key=key)
    assert first.status_code == 201, first.text
    data = first.json()
    assert data["total_cents"] == 2800
    assert [line["kind_snapshot"] for line in data["lines"]] == [
        "BIEN", "SERVICIO", "BIEN",
    ]
    assert len(data["balances_after"]) == 1
    assert data["balances_after"][0]["quantity_milli"] == 2000
    assert data["balances_after"][0]["version"] == 2
    quantity, version = db.execute(select(
        StockBalance.quantity_milli, StockBalance.version,
    ).where(
        StockBalance.business_id == bid,
        StockBalance.location_id == lid,
        StockBalance.catalog_item_id == good,
    )).one()
    assert (quantity, version) == (2000, 2)
    moves = db.execute(select(StockMovement).where(
        StockMovement.business_id == bid,
        StockMovement.sale_id == UUID(data["id"]),
    ).order_by(StockMovement.delta_milli)).scalars().all()
    assert [m.delta_milli for m in moves] == [-2000, -1000]
    assert all(m.event_type == "VENTA_SALIDA" for m in moves)
    replay = post(client, bid, headers, body, key=key)
    assert replay.status_code == 200
    assert replay.json() == data
    quantity, version = db.execute(select(
        StockBalance.quantity_milli, StockBalance.version,
    ).where(
        StockBalance.business_id == bid, StockBalance.location_id == lid,
        StockBalance.catalog_item_id == good,
    )).one()
    assert (quantity, version) == (2000, 2)


def test_insufficient_stock_rolls_back_everything(isolated):
    client, db = isolated
    headers = auth(client)
    bid = business(client, headers)
    lid = location(client, bid, headers)
    good = item(client, bid, headers, kind="REVENTA", name="Producto")
    seed_balance(db, bid, lid, good, milli=1000)
    body = payload(good, quantity=2000, cents=150)
    body["location_id"] = str(lid)
    failed = post(client, bid, headers, body)
    assert failed.status_code == 409, failed.text
    assert db.scalar(select(func.count()).select_from(Sale).where(
        Sale.business_id == bid)) == 0
    assert db.scalar(select(func.count()).select_from(SalePayment).where(
        SalePayment.business_id == bid)) == 0
    assert db.scalar(select(func.count()).select_from(StockMovement).where(
        StockMovement.business_id == bid)) == 0
    quantity, version = db.execute(select(
        StockBalance.quantity_milli, StockBalance.version,
    ).where(
        StockBalance.business_id == bid, StockBalance.location_id == lid,
        StockBalance.catalog_item_id == good,
    )).one()
    assert (quantity, version) == (1000, 1)


def test_physical_requires_sell_and_store(isolated):
    client, db = isolated
    headers = auth(client)
    bid = business(client, headers)
    sell_only = location(client, bid, headers, can_sell=True, can_store=False)
    good = item(client, bid, headers, kind="REVENTA", name="Producto")
    seed_balance(db, bid, sell_only, good)
    body = payload(good)
    body["location_id"] = str(sell_only)
    assert post(client, bid, headers, body).status_code == 409
    assert db.scalar(select(func.count()).select_from(Sale).where(
        Sale.business_id == bid)) == 0
