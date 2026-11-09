"""CU-09: carreras simultáneas con sesiones/conexiones HTTP separadas.

El fixture committed_company crea SOLO el tenant temporal de este test y
borra sus propios registros al salir. Jamás TRUNCATE/DROP ni datos QA ajenos.
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
from test_receipt_api_integration import location, physical, receive
from test_receipt_concurrency_integration import committed_company
from test_transfer_api_integration import endpoint, request

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Concurrencia real contra PostgreSQL e25a_inventory_ops",
    ),
]


def concurrent_transfers(headers, bid, specs):
    """Cada solicitud tiene TestClient y conexión; lanza a la vez por barrera."""
    barrier = Barrier(len(specs))

    def run_one(spec):
        key, body = spec
        with TestClient(create_app()) as client:
            barrier.wait(timeout=15)
            resp = client.post(
                endpoint(bid),
                headers={**headers, "Idempotency-Key": str(key)},
                json=body,
            )
            return resp.status_code, resp.json()

    with ThreadPoolExecutor(max_workers=len(specs)) as pool:
        return list(pool.map(run_one, specs))


def balances(bid, item_id):
    with get_engine().connect() as db:
        return dict(db.execute(select(
            StockBalance.location_id, StockBalance.quantity_milli,
        ).where(
            StockBalance.business_id == bid,
            StockBalance.catalog_item_id == item_id,
        )).all())


def test_two_simultaneous_transfers_compete_for_same_ten_units(committed_company):
    headers, bid, source, item_id = committed_company
    with TestClient(create_app()) as client:
        target = location(client, bid, headers, name="Segundo deposito B")
        purchase = physical(client, bid, headers, item_id, amount=10000)
        assert receive(client, bid, purchase, source, headers).status_code == 201
    body = request(item_id, source, target, amount=7000)
    responses = concurrent_transfers(headers, bid, [
        (uuid4(), body), (uuid4(), body),
    ])
    assert sorted(status for status, _ in responses) == [201, 409], responses
    assert balances(bid, item_id) == {source: 3000, target: 7000}
    with get_engine().connect() as db:
        assert len(db.execute(select(InventoryOperation.id).where(
            InventoryOperation.business_id == bid,
        )).all()) == 1
        moves = db.execute(select(StockMovement.delta_milli).where(
            StockMovement.business_id == bid,
        )).scalars().all()
        assert sorted(moves) == [-7000, 7000, 10000]


def test_concurrent_replay_same_key_does_not_duplicate_stock(committed_company):
    headers, bid, source, item_id = committed_company
    with TestClient(create_app()) as client:
        target = location(client, bid, headers, name="Segundo deposito C")
        purchase = physical(client, bid, headers, item_id, amount=5000)
        assert receive(client, bid, purchase, source, headers).status_code == 201
    key = uuid4()
    body = request(item_id, source, target, amount=2000)
    responses = concurrent_transfers(headers, bid, [(key, body), (key, body)])
    assert sorted(status for status, _ in responses) == [200, 201], responses
    assert responses[0][1] == responses[1][1]
    assert balances(bid, item_id) == {source: 3000, target: 2000}
    with get_engine().connect() as db:
        assert len(db.execute(select(InventoryOperation.id).where(
            InventoryOperation.business_id == bid,
        )).all()) == 1


def test_opposite_direction_transfers_lock_locations_in_stable_order(committed_company):
    headers, bid, a, item_id = committed_company
    with TestClient(create_app()) as client:
        b = location(client, bid, headers, name="Segundo deposito D")
        p1 = physical(client, bid, headers, item_id, amount=10000)
        p2 = physical(client, bid, headers, item_id, amount=5000)
        assert receive(client, bid, p1, a, headers).status_code == 201
        assert receive(client, bid, p2, b, headers).status_code == 201
    responses = concurrent_transfers(headers, bid, [
        (uuid4(), request(item_id, a, b, amount=4000)),
        (uuid4(), request(item_id, b, a, amount=3000)),
    ])
    assert [status for status, _ in responses] == [201, 201], responses
    assert balances(bid, item_id) == {a: 9000, b: 6000}
    with get_engine().connect() as db:
        assert len(db.execute(select(InventoryOperation.id).where(
            InventoryOperation.business_id == bid,
        )).all()) == 2
        deltas = db.execute(select(StockMovement.delta_milli).where(
            StockMovement.business_id == bid,
        )).scalars().all()
        assert sum(deltas) == 15000
