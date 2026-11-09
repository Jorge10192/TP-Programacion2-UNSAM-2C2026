"""E2-6 D: fallos tardios no deben persistir comprobantes ni debitos parciales.

Fixture aislado con transaccion exterior y savepoints. Sin datos QA afectados.
"""
import os
from uuid import uuid4

import pytest
from sqlalchemy import func, select

from app.infrastructure.models import Sale, SaleLine, SalePayment, StockBalance, StockMovement
from app.modules.sales.schemas import SaleView
from test_sales_api_integration import isolated, auth, business, item, location, post, seed_balance

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere PostgreSQL migrado y RUN_DB_INTEGRATION=1",
    ),
]


def counts(db, bid):
    return tuple(db.scalar(select(func.count()).select_from(model).where(
        model.business_id == bid,
    )) for model in (Sale, SaleLine, SalePayment, StockMovement))


def balance(db, bid, lid, iid):
    return tuple(db.execute(select(
        StockBalance.quantity_milli, StockBalance.version,
    ).where(
        StockBalance.business_id == bid,
        StockBalance.location_id == lid,
        StockBalance.catalog_item_id == iid,
    )).one())


def sale_body(loc, products):
    lines = [
        {"catalog_item_id": str(iid), "quantity_milli": qty, "unit_price_cents": 100}
        for iid, qty in products
    ]
    return {
        "location_id": str(loc), "lines": lines,
        "payments": [{
            "method": "EFECTIVO",
            "amount_cents": sum(qty * 100 // 1000 for _, qty in products),
        }],
    }


def test_second_item_insufficient_rolls_back_first_debit(isolated):
    client, db = isolated
    headers = auth(client)
    bid = business(client, headers)
    lid = location(client, bid, headers)
    products = [
        item(client, bid, headers, kind="REVENTA", name="Producto A"),
        item(client, bid, headers, kind="REVENTA", name="Producto B"),
    ]
    for iid in products:
        seed_balance(db, bid, lid, iid, milli=1000)
    body = sale_body(lid, [(iid, 1000) for iid in products])
    # Faltan unidades SOLO en el articulo que se procesa segundo.
    second = sorted(products, key=str)[1]
    from sqlalchemy import update
    db.execute(update(StockBalance).where(
        StockBalance.business_id == bid,
        StockBalance.location_id == lid,
        StockBalance.catalog_item_id == second,
    ).values(quantity_milli=0))
    before = {iid: balance(db, bid, lid, iid) for iid in products}
    resp = post(client, bid, headers, body, key=uuid4())
    assert resp.status_code == 409, resp.text
    assert counts(db, bid) == (0, 0, 0, 0)
    assert {iid: balance(db, bid, lid, iid) for iid in products} == before


def test_failure_after_debit_rolls_back_sale_payments_movements_and_balance(isolated, monkeypatch):
    client, db = isolated
    headers = auth(client)
    bid = business(client, headers)
    lid = location(client, bid, headers)
    iid = item(client, bid, headers, kind="REVENTA", name="Producto")
    seed_balance(db, bid, lid, iid, milli=3000)

    def fail_response(*args, **kwargs):
        raise RuntimeError("Fallo simulado despues del debit y flush del ledger")

    monkeypatch.setattr(SaleView, "from_records", fail_response)
    with pytest.raises(RuntimeError, match="Fallo simulado"):
        post(client, bid, headers, sale_body(lid, [(iid, 1000)]))
    assert counts(db, bid) == (0, 0, 0, 0)
    assert balance(db, bid, lid, iid) == (3000, 1)
