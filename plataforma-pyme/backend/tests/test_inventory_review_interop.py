"""Carreras cruzadas E2-4/E2-5 con actores y conexiones diferentes."""
import os
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.infrastructure.db import get_engine
from app.infrastructure.models import AuthSession, InventoryOperation, Membership, StockBalance, StockMovement, User
from app.main import create_app
from test_purchase_api_integration import actor
from test_receipt_concurrency_integration import committed_company
from test_receipt_api_integration import location, physical, receive
from test_transfer_api_integration import endpoint as transfer_path, request as transfer_body
from test_adjustment_api_integration import endpoint as adjust_path, command as adjust_body

pytestmark = [pytest.mark.integration, pytest.mark.skipif(
    os.environ.get("RUN_DB_INTEGRATION") != "1", reason="PostgreSQL aislado",
)]


@pytest.fixture
def two_actors(committed_company):
    owner, bid, loc, iid = committed_company
    with TestClient(create_app()) as client:
        administrator, uid = actor(client)
    try:
        with Session(get_engine()) as db:
            db.add(Membership(id=uuid4(), business_id=bid, user_id=uid,
                              role="ADMINISTRADOR", status="ACTIVA"))
            db.commit()
        yield owner, administrator, bid, loc, iid
    finally:
        with get_engine().begin() as db:
            # El fixture padre elimina después el resto de su tenant.
            # Liberar primero las referencias del actor agregado aquí.
            db.execute(delete(StockMovement).where(StockMovement.business_id == bid, StockMovement.actor_id == uid))
            db.execute(delete(InventoryOperation).where(InventoryOperation.business_id == bid, InventoryOperation.actor_id == uid))
            db.execute(delete(Membership).where(Membership.business_id == bid, Membership.user_id == uid))
            db.execute(delete(AuthSession).where(AuthSession.user_id == uid))
            db.execute(delete(User).where(User.id == uid))


def simultaneously(specs):
    barrier = Barrier(2)

    def send(spec):
        path, headers, body, key = spec
        app = create_app()
        with Session(get_engine()) as db:
            pid = db.scalar(select(func.pg_backend_pid()))
            db.connection().exec_driver_sql("SET LOCAL statement_timeout = '8s'")

            def override_db():
                yield db

            app.dependency_overrides[get_db] = override_db
            with TestClient(app) as client:
                barrier.wait(timeout=5)
                response = client.post(path, headers={**headers, "Idempotency-Key": str(key)}, json=body)
            return pid, response

    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(send, spec) for spec in specs]
        results = [future.result(timeout=20) for future in futures]
    assert len({pid for pid, _ in results}) == 2
    return [response for _, response in results]


def reconciled(bid, iid):
    with get_engine().connect() as db:
        balances = dict(db.execute(select(StockBalance.location_id, StockBalance.quantity_milli).where(
            StockBalance.business_id == bid, StockBalance.catalog_item_id == iid,
        )).all())
        ledger = dict(db.execute(select(StockMovement.location_id, func.sum(StockMovement.delta_milli)).where(
            StockMovement.business_id == bid, StockMovement.catalog_item_id == iid,
        ).group_by(StockMovement.location_id)).all())
        operations = db.scalar(select(func.count()).select_from(InventoryOperation).where(
            InventoryOperation.business_id == bid,
        ))
    assert balances == ledger
    return balances, operations


def test_transfer_and_adjustment_cannot_both_spend_same_stock(two_actors):
    owner, admin, bid, source, iid = two_actors
    with TestClient(create_app()) as client:
        target = location(client, bid, owner, name="Destino revisión")
        pid = physical(client, bid, owner, iid, amount=10000)
        assert receive(client, bid, pid, source, owner).status_code == 201
    results = simultaneously([
        (transfer_path(bid), owner, transfer_body(iid, source, target, amount=4000), uuid4()),
        (adjust_path(bid), admin, adjust_body(iid, source, kind="AJUSTE_SALIDA", amount=7000, version=1), uuid4()),
    ])
    assert sorted(response.status_code for response in results) == [201, 409]
    balances, operations = reconciled(bid, iid)
    assert operations == 1
    assert balances == ({source: 6000, target: 4000} if results[0].status_code == 201 else {source: 3000})


def test_receipt_and_initial_stock_preserve_first_balance(two_actors):
    owner, admin, bid, loc, iid = two_actors
    with TestClient(create_app()) as client:
        pid = physical(client, bid, owner, iid, amount=2000)
    results = simultaneously([
        (f"/api/v1/businesses/{bid}/purchases/{pid}/receive", owner, {"location_id": str(loc)}, uuid4()),
        (adjust_path(bid), admin, adjust_body(iid, loc, kind="STOCK_INICIAL", amount=4000, version=0), uuid4()),
    ])
    assert results[0].status_code == 201
    assert results[1].status_code in (201, 409)
    balances, operations = reconciled(bid, iid)
    initialized = results[1].status_code == 201
    assert balances == {loc: 6000 if initialized else 2000}
    assert operations == int(initialized)
    with get_engine().connect() as db:
        version = db.scalar(select(StockBalance.version).where(
            StockBalance.business_id == bid, StockBalance.location_id == loc,
            StockBalance.catalog_item_id == iid,
        ))
    assert version == (2 if initialized else 1)


def test_same_key_across_inventory_command_kinds_creates_one_operation(two_actors):
    owner, admin, bid, source, iid = two_actors
    with TestClient(create_app()) as client:
        target = location(client, bid, owner, name="Destino clave compartida")
        pid = physical(client, bid, owner, iid, amount=3000)
        assert receive(client, bid, pid, source, owner).status_code == 201
    key = uuid4()
    results = simultaneously([
        (transfer_path(bid), owner, transfer_body(iid, source, target, amount=1000), key),
        (adjust_path(bid), admin, adjust_body(iid, source, amount=1000, version=1), key),
    ])
    assert sorted(response.status_code for response in results) == [201, 409]
    balances, operations = reconciled(bid, iid)
    assert operations == 1
    assert sum(balances.values()) == (3000 if results[0].status_code == 201 else 4000)
