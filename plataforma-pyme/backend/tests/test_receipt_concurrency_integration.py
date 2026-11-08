"""Concurrencia real: dos conexiones/solicitudes HTTP contra PostgreSQL 16.

Los recursos de la prueba se crean como un tenant temporal comprometido
para que ambas conexiones los vean y se eliminan selectivamente al finalizar.
Nunca se hacen TRUNCATE, DROP, reset de DB ni borrados de datos ajenos.
"""
import os
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from app.infrastructure.db import get_engine
from app.infrastructure.models import (
    AuthSession, Business, BusinessCreationRequest, CatalogItem, Location,
    LocationAssignment, Membership, Purchase, PurchaseLine, PurchaseReceipt,
    StockBalance, StockMovement, Supplier, User,
)
from app.main import create_app
from test_purchase_api_integration import actor, business, item
from test_receipt_api_integration import location, physical

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Prueba simultanea contra PostgreSQL migrado y RUN_DB_INTEGRATION=1",
    ),
]


@pytest.fixture
def committed_company():
    user_id = None
    bid = None
    with TestClient(create_app()) as client:
        try:
            headers, user_id = actor(client)
            bid = business(client, headers)
            loc = location(client, bid, headers)
            iid = item(client, bid, headers)
            yield headers, bid, loc, iid
        finally:
            # Limpieza quirúrgica del TENANT/usuario creado solamente por esta prueba.
            # Las filas de trabajo persistente del usuario quedan intactas.
            with get_engine().begin() as db:
                if bid is not None:
                    for model in (
                        StockMovement, StockBalance, PurchaseReceipt, PurchaseLine,
                        Purchase, CatalogItem, LocationAssignment, Location, Supplier,
                        BusinessCreationRequest, Membership, Business,
                    ):
                        db.execute(delete(model).where(model.business_id == bid))
                if user_id is not None:
                    db.execute(delete(AuthSession).where(AuthSession.user_id == user_id))
                    db.execute(delete(User).where(User.id == user_id))


def parallel_requests(headers, bid, loc, specs):
    barrier = Barrier(len(specs))

    def post(spec):
        pid, key = spec
        with TestClient(create_app()) as client:
            barrier.wait(timeout=15)
            response = client.post(
                f"/api/v1/businesses/{bid}/purchases/{pid}/receive",
                headers={**headers, "Idempotency-Key": str(key)},
                json={"location_id": str(loc)},
            )
            return response.status_code, response.json()

    with ThreadPoolExecutor(max_workers=len(specs)) as pool:
        return list(pool.map(post, specs))


def test_two_simultaneous_first_entries_sum_on_absent_balance(committed_company):
    headers, bid, loc, iid = committed_company
    with TestClient(create_app()) as client:
        p1 = physical(client, bid, headers, iid, amount=10000)
        p2 = physical(client, bid, headers, iid, amount=20000)
    responses = parallel_requests(headers, bid, loc, [(p1, uuid4()), (p2, uuid4())])
    assert sorted(code for code, _ in responses) == [201, 201], responses
    with get_engine().connect() as db:
        rows = db.execute(select(StockBalance).where(
            StockBalance.business_id == bid,
            StockBalance.location_id == loc,
            StockBalance.catalog_item_id == iid,
        )).all()
        assert len(rows) == 1
        balance = rows[0][0]
        assert balance.quantity_milli == 30000
        assert balance.version == 2
        moves = db.execute(select(StockMovement).where(
            StockMovement.business_id == bid,
        )).scalars().all()
        assert len(moves) == 2
        assert sum(x.delta_milli for x in moves) == 30000
        receipts = db.execute(select(PurchaseReceipt).where(
            PurchaseReceipt.business_id == bid,
        )).scalars().all()
        assert len(receipts) == 2


def test_two_simultaneous_keys_same_purchase_allow_only_one_receipt(committed_company):
    headers, bid, loc, iid = committed_company
    with TestClient(create_app()) as client:
        purchase_id = physical(client, bid, headers, iid, amount=7000)
    results = parallel_requests(
        headers, bid, loc, [(purchase_id, uuid4()), (purchase_id, uuid4())],
    )
    assert sorted(code for code, _ in results) == [201, 409], results
    with get_engine().connect() as db:
        assert db.execute(select(StockBalance.quantity_milli).where(
            StockBalance.business_id == bid,
        )).scalar_one() == 7000
        assert len(db.execute(select(StockMovement.id).where(
            StockMovement.business_id == bid,
        )).all()) == 1
        assert len(db.execute(select(PurchaseReceipt.id).where(
            PurchaseReceipt.business_id == bid,
        )).all()) == 1


def test_two_simultaneous_same_key_return_created_and_replayed(committed_company):
    headers, bid, loc, iid = committed_company
    with TestClient(create_app()) as client:
        purchase_id = physical(client, bid, headers, iid, amount=4000)
    key = uuid4()
    results = parallel_requests(headers, bid, loc, [(purchase_id, key), (purchase_id, key)])
    assert sorted(code for code, _ in results) == [200, 201], results
    assert results[0][1] == results[1][1]
    with get_engine().connect() as db:
        assert db.execute(select(StockBalance.quantity_milli).where(
            StockBalance.business_id == bid,
        )).scalar_one() == 4000
        assert len(db.execute(select(StockMovement.id).where(
            StockMovement.business_id == bid,
        )).all()) == 1
