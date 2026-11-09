"""E2-5 C: concurrencia real de ajustes e inicialización con sesiones HTTP separadas.

Fixture committed_company de E2-4/E2-5 B: tenant temporal comprometido solo
para estas pruebas; se borra exclusivamente lo creado por ese fixture.
"""
import os
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.infrastructure.db import get_engine
from app.infrastructure.models import InventoryOperation, StockBalance, StockMovement
from app.main import create_app
from test_adjustment_api_integration import command, endpoint
from test_receipt_api_integration import physical, receive
from test_receipt_concurrency_integration import committed_company

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="PostgreSQL e25a_inventory_ops: pruebas concurrentes reales",
    ),
]


def parallel_adjustments(headers, bid, specs):
    barrier = Barrier(len(specs))

    def send(spec):
        key, payload = spec
        with TestClient(create_app()) as client:
            barrier.wait(timeout=15)
            response = client.post(
                endpoint(bid),
                headers={**headers, "Idempotency-Key": str(key)},
                json=payload,
            )
            return response.status_code, response.json()

    with ThreadPoolExecutor(max_workers=len(specs)) as pool:
        return list(pool.map(send, specs))


def state(bid, loc, item_id):
    with get_engine().connect() as db:
        balance = db.execute(select(
            StockBalance.quantity_milli, StockBalance.version,
        ).where(
            StockBalance.business_id == bid,
            StockBalance.location_id == loc,
            StockBalance.catalog_item_id == item_id,
        )).one_or_none()
        operations = db.execute(select(InventoryOperation.id).where(
            InventoryOperation.business_id == bid,
        )).all()
        movements = db.execute(select(StockMovement.delta_milli).where(
            StockMovement.business_id == bid,
        )).scalars().all()
        return balance, len(operations), movements


def test_two_competing_adjustments_do_not_spend_same_version(committed_company):
    headers, bid, loc, iid = committed_company
    with TestClient(create_app()) as client:
        pid = physical(client, bid, headers, iid, amount=10000)
        assert receive(client, bid, pid, loc, headers).status_code == 201
    body = command(iid, loc, kind="AJUSTE_SALIDA", amount=7000, version=1)
    results = parallel_adjustments(
        headers, bid, [(uuid4(), body), (uuid4(), body)],
    )
    assert sorted(code for code, _ in results) == [201, 409], results
    bal, n, movements = state(bid, loc, iid)
    assert (bal.quantity_milli, bal.version) == (3000, 2)
    assert n == 1
    assert sorted(movements) == [-7000, 10000]


def test_identical_key_concurrent_replay_is_safe(committed_company):
    headers, bid, loc, iid = committed_company
    with TestClient(create_app()) as client:
        pid = physical(client, bid, headers, iid, amount=5000)
        assert receive(client, bid, pid, loc, headers).status_code == 201
    key = uuid4()
    body = command(iid, loc, amount=2000, version=1)
    results = parallel_adjustments(headers, bid, [(key, body), (key, body)])
    assert sorted(code for code, _ in results) == [200, 201], results
    assert results[0][1] == results[1][1]
    bal, n, movements = state(bid, loc, iid)
    assert (bal.quantity_milli, bal.version) == (7000, 2)
    assert n == 1
    assert sorted(movements) == [2000, 5000]


def test_concurrent_initial_stock_accepts_only_one_command(committed_company):
    headers, bid, loc, iid = committed_company
    initial = command(iid, loc, kind="STOCK_INICIAL", amount=4000, version=0)
    results = parallel_adjustments(headers, bid, [
        (uuid4(), initial), (uuid4(), initial),
    ])
    assert sorted(code for code, _ in results) == [201, 409], results
    bal, n, movements = state(bid, loc, iid)
    assert (bal.quantity_milli, bal.version) == (4000, 1)
    assert n == 1
    assert movements == [4000]
