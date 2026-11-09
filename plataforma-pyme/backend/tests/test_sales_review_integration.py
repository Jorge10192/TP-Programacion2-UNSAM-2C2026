"""Límite legal de versión: conflicto controlado y rollback completo de la venta."""
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, update

from app.infrastructure.models import Sale, SaleLine, SalePayment, StockBalance, StockMovement
from test_sales_api_integration import (
    isolated, auth, business, item, location, payload, post, seed_balance,
)

pytestmark = [pytest.mark.integration, pytest.mark.skipif(
    os.environ.get("RUN_DB_INTEGRATION") != "1", reason="PostgreSQL aislado",
)]


@pytest.mark.parametrize("version,expected_status", [
    (9_223_372_036_854_775_806, 201),
    (9_223_372_036_854_775_807, 409),
])
def test_sale_balance_version_limit_is_atomic(isolated, version, expected_status):
    client, db = isolated
    headers = auth(client)
    bid = business(client, headers)
    lid = location(client, bid, headers)
    iid = item(client, bid, headers, kind="REVENTA", name="Bien con version agotada")
    seed_balance(db, bid, lid, iid, milli=3000)
    maximum = 9_223_372_036_854_775_807
    db.execute(update(StockBalance).where(
        StockBalance.business_id == bid, StockBalance.location_id == lid,
        StockBalance.catalog_item_id == iid,
    ).values(version=version))
    body = payload(iid)
    body["location_id"] = str(lid)
    with TestClient(client.app, raise_server_exceptions=False) as server_client:
        response = post(server_client, bid, headers, body)
    if expected_status == 201:
        assert response.status_code == 201, response.text
        assert response.json()["balances_after"] == [{
            "catalog_item_id": str(iid), "quantity_milli": 2000, "version": maximum,
        }]
        return
    for model in (Sale, SaleLine, SalePayment, StockMovement):
        assert db.scalar(select(func.count()).select_from(model).where(
            model.business_id == bid,
        )) == 0
    assert db.execute(select(StockBalance.quantity_milli, StockBalance.version).where(
        StockBalance.business_id == bid, StockBalance.location_id == lid,
        StockBalance.catalog_item_id == iid,
    )).one() == (3000, maximum)
    assert response.status_code == 409, response.text
