"""E2-6 C: ventas concurrentes reales en conexiones HTTP independientes.

Se reutiliza el tenant temporal de las pruebas de recepcion; los comprobantes
de esta prueba se eliminan antes del teardown de ese tenant. No toca QA ajeno.
"""
import os
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from app.infrastructure.db import get_engine
from app.infrastructure.models import Sale, SaleLine, SalePayment, StockBalance, StockMovement
from app.main import create_app
from test_receipt_api_integration import physical, receive
from test_receipt_concurrency_integration import committed_company

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere PostgreSQL migrado y dos conexiones reales",
    ),
]


@pytest.fixture
def sales_company(committed_company):
    headers, bid, loc, iid = committed_company
    try:
        with TestClient(create_app()) as client:
            changed = client.patch(
                f"/api/v1/businesses/{bid}/locations/{loc}",
                headers=headers, json={"can_sell": True},
            )
            assert changed.status_code == 200, changed.text
        yield headers, bid, loc, iid
    finally:
        # El fixture de recepcion elimina su tenant DESPUES de este teardown.
        # Respetar FKs de SalePayment, StockMovement, SaleLine y Sale.
        with get_engine().begin() as db:
            db.execute(delete(SalePayment).where(SalePayment.business_id == bid))
            db.execute(delete(StockMovement).where(
                StockMovement.business_id == bid,
                StockMovement.sale_id.is_not(None),
            ))
            db.execute(delete(SaleLine).where(SaleLine.business_id == bid))
            db.execute(delete(Sale).where(Sale.business_id == bid))


def stock_and_sales(bid, loc, iid):
    with get_engine().connect() as db:
        balance = db.execute(select(
            StockBalance.quantity_milli, StockBalance.version,
        ).where(
            StockBalance.business_id == bid,
            StockBalance.location_id == loc,
            StockBalance.catalog_item_id == iid,
        )).one()
        sale_ids = db.execute(select(Sale.id).where(
            Sale.business_id == bid,
        )).scalars().all()
        movements = db.execute(select(
            StockMovement.delta_milli, StockMovement.event_type,
        ).where(
            StockMovement.business_id == bid,
            StockMovement.sale_id.is_not(None),
        )).all()
        return tuple(balance), sale_ids, movements


def sale_payload(loc, iid, amount=1000):
    return {
        "location_id": str(loc),
        "lines": [{
            "catalog_item_id": str(iid),
            "quantity_milli": amount,
            "unit_price_cents": 900,
        }],
        "payments": [{"method": "EFECTIVO", "amount_cents": amount * 900 // 1000}],
    }


def parallel_sales(headers, bid, specs):
    barrier = Barrier(len(specs))

    def send(spec):
        key, body = spec
        with TestClient(create_app()) as client:
            barrier.wait(timeout=15)
            response = client.post(
                f"/api/v1/businesses/{bid}/sales",
                headers={**headers, "Idempotency-Key": str(key)},
                json=body,
            )
            return response.status_code, response.json()

    with ThreadPoolExecutor(max_workers=len(specs)) as pool:
        return list(pool.map(send, specs))


def test_two_simultaneous_sales_only_one_can_sell_last_unit(sales_company):
    headers, bid, loc, iid = sales_company
    with TestClient(create_app()) as client:
        purchase_id = physical(client, bid, headers, iid, amount=1000)
        assert receive(client, bid, purchase_id, loc, headers).status_code == 201
    body = sale_payload(loc, iid)
    results = parallel_sales(headers, bid, [(uuid4(), body), (uuid4(), body)])
    assert sorted(code for code, _ in results) == [201, 409], results
    balance, sales, movements = stock_and_sales(bid, loc, iid)
    assert balance == (0, 2)
    assert len(sales) == 1
    assert movements == [(-1000, "VENTA_SALIDA")]


def test_concurrent_same_idempotency_key_returns_same_sale(sales_company):
    headers, bid, loc, iid = sales_company
    with TestClient(create_app()) as client:
        purchase_id = physical(client, bid, headers, iid, amount=2000)
        assert receive(client, bid, purchase_id, loc, headers).status_code == 201
    body = sale_payload(loc, iid, amount=1000)
    key = uuid4()
    results = parallel_sales(headers, bid, [(key, body), (key, body)])
    assert sorted(code for code, _ in results) == [200, 201], results
    assert results[0][1] == results[1][1]
    balance, sales, movements = stock_and_sales(bid, loc, iid)
    assert balance == (1000, 2)
    assert len(sales) == 1
    assert movements == [(-1000, "VENTA_SALIDA")]


def test_two_sales_for_two_distinct_items_preserve_stock(sales_company):
    headers, bid, loc, iid = sales_company
    with TestClient(create_app()) as client:
        purchase_id = physical(client, bid, headers, iid, amount=3000)
        assert receive(client, bid, purchase_id, loc, headers).status_code == 201
    results = parallel_sales(headers, bid, [
        (uuid4(), sale_payload(loc, iid, amount=1000)),
        (uuid4(), sale_payload(loc, iid, amount=1000)),
    ])
    assert sorted(code for code, _ in results) == [201, 201], results
    balance, sales, movements = stock_and_sales(bid, loc, iid)
    assert balance == (1000, 3)
    assert len(sales) == 2
    assert sorted(movements) == [(-1000, "VENTA_SALIDA")] * 2
