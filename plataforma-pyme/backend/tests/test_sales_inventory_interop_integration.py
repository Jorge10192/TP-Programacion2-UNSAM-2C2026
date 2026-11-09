"""E2-6 C: invariantes cruzadas entre recepcion, ventas, traslado y ajustes.

Fixture reversible de PostgreSQL: no muta datos permanentes de QA.
"""
import os
from uuid import uuid4

import pytest
from sqlalchemy import select

from app.infrastructure.models import Sale, SalePayment, StockBalance, StockMovement
from test_sales_api_integration import isolated, auth, business, item, location, post, payload
from test_receipt_api_integration import physical, receive
from test_transfer_api_integration import (
    request as transfer_request, transfer, view_balances, view_movements,
)
from test_adjustment_api_integration import command, adjust

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere PostgreSQL migrado, conexion y rollback externo",
    ),
]


def test_sale_after_receipt_before_transfer_and_adjustment(isolated):
    client, db = isolated
    headers = auth(client)
    bid = business(client, headers)
    src = location(client, bid, headers)
    dst = location(client, bid, headers)
    good = item(client, bid, headers, kind="REVENTA", name="Alimento")
    purchase_id = physical(client, bid, headers, good, amount=10000)
    receipt = receive(client, bid, purchase_id, src, headers)
    assert receipt.status_code == 201, receipt.text
    assert view_balances(client, bid, headers)[str(src), str(good)] == (10000, 1)

    sale_body = payload(good, quantity=3000, cents=250)
    sale_body["location_id"] = str(src)
    sale = post(client, bid, headers, sale_body)
    assert sale.status_code == 201, sale.text
    assert view_balances(client, bid, headers)[str(src), str(good)] == (7000, 2)
    assert sale.json()["balances_after"] == [{
        "catalog_item_id": str(good), "quantity_milli": 7000, "version": 2,
    }]

    move = transfer(client, bid, headers,
                    transfer_request(good, src, dst, amount=2000))
    assert move.status_code == 201, move.text
    assert view_balances(client, bid, headers) == {
        (str(src), str(good)): (5000, 3),
        (str(dst), str(good)): (2000, 1),
    }

    stale = adjust(client, bid, headers, command(
        good, src, amount=1000, version=2,
    ))
    assert stale.status_code == 409, stale.text
    fresh = adjust(client, bid, headers, command(
        good, src, amount=1000, version=3,
    ))
    assert fresh.status_code == 201, fresh.text
    assert view_balances(client, bid, headers) == {
        (str(src), str(good)): (6000, 4),
        (str(dst), str(good)): (2000, 1),
    }

    # Los hechos y las vistas historicas originales permanecen inmutables.
    events = view_movements(client, bid, headers)
    assert sorted((m["event_type"], m["delta_milli"]) for m in events) == sorted([
        ("COMPRA_RECEPCION", 10000),
        ("VENTA_SALIDA", -3000),
        ("TRASLADO_SALIDA", -2000),
        ("TRASLADO_ENTRADA", 2000),
        ("AJUSTE_ENTRADA", 1000),
    ])
    sold = [m for m in events if m["event_type"] == "VENTA_SALIDA"]
    assert len(sold) == 1
    assert sold[0]["sale_id"] == sale.json()["id"]
    assert sold[0]["sale_line_id"] == sale.json()["lines"][0]["id"]
    assert client.get(
        f"/api/v1/businesses/{bid}/sales/{sale.json()['id']}",
        headers=headers,
    ).json() == sale.json()
    assert client.get(
        f"/api/v1/businesses/{bid}/purchases/{purchase_id}/receipt",
        headers=headers,
    ).json() == receipt.json()


def test_missing_stock_sale_cannot_leave_payments_or_movements(isolated):
    client, db = isolated
    headers = auth(client)
    bid = business(client, headers)
    lid = location(client, bid, headers)
    good = item(client, bid, headers, kind="REVENTA", name="Caja")
    sale_body = payload(good)
    sale_body["location_id"] = str(lid)
    response = post(client, bid, headers, sale_body)
    assert response.status_code == 409, response.text
    for model in (Sale, SalePayment, StockMovement, StockBalance):
        assert db.execute(select(model.business_id).where(
            model.business_id == bid,
        )).first() is None
