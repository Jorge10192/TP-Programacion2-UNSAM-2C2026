"""CU-11 E2-5 C: ajustes e inicial real sobre PostgreSQL sin modificar QA persistente.

Cada caso emplea el fixture isolated: registros de prueba creados dentro
de una transacción exterior que siempre se revierte.
"""
import os
from uuid import UUID, uuid4

import pytest
from sqlalchemy import insert, select

from app.infrastructure.models import (
    InventoryOperation, LocationAssignment, Membership, StockBalance, StockMovement,
)
from test_purchase_api_integration import isolated, actor, business, item
from test_receipt_api_integration import location, physical, receive
from test_transfer_api_integration import (
    request as transfer_request, transfer, view_balances, view_movements,
)

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere PostgreSQL migrado a e25a_inventory_ops",
    ),
]


def endpoint(bid, op_id=None):
    base = f"/api/v1/businesses/{bid}/inventory/adjustments"
    return base + (f"/{op_id}" if op_id else "")


def command(product, loc, *, kind="AJUSTE_ENTRADA", amount=1000, version=1,
            reason="Ajuste justificado de inventario"):
    return {
        "kind": kind,
        "catalog_item_id": str(product),
        "location_id": str(loc),
        "quantity_milli": amount,
        "expected_version": version,
        "reason": reason,
    }


def adjust(client, bid, headers, body, *, key=None):
    return client.post(endpoint(bid), headers={
        **headers, "Idempotency-Key": str(key or uuid4()),
    }, json=body)


def seeded(client, bid, auth, *, qty=10000):
    loc = location(client, bid, auth)
    iid = item(client, bid, auth)
    pid = physical(client, bid, auth, iid, amount=qty)
    rec = receive(client, bid, pid, loc, auth)
    assert rec.status_code == 201, rec.text
    return loc, iid, rec.json()


def test_initial_stock_on_new_pair_and_exact_idempotent_replay(isolated):
    client, db = isolated
    auth, actor_id = actor(client)
    bid = business(client, auth)
    loc = location(client, bid, auth)
    iid = item(client, bid, auth)
    assert view_balances(client, bid, auth) == {}
    body = command(
        iid, loc, kind="STOCK_INICIAL", amount=7000, version=0,
        reason="Conteo inicial de siete unidades",
    )
    key = uuid4()
    first = adjust(client, bid, auth, body, key=key)
    assert first.status_code == 201, first.text
    result = first.json()
    assert result["kind"] == "STOCK_INICIAL"
    assert result["quantity_milli"] == 7000
    assert result["actor_id"] == str(actor_id)
    assert result["location_id"] == str(loc)
    assert len(result["movements"]) == 1
    assert result["movements"][0]["event_type"] == "STOCK_INICIAL"
    assert result["movements"][0]["delta_milli"] == 7000
    assert view_balances(client, bid, auth)[str(loc), str(iid)] == (7000, 1)
    assert client.get(endpoint(bid, result["id"]), headers=auth).json() == result
    replay = adjust(client, bid, auth, body, key=key)
    assert replay.status_code == 200
    assert replay.json() == result
    assert view_balances(client, bid, auth)[str(loc), str(iid)] == (7000, 1)
    assert len(view_movements(client, bid, auth)) == 1
    assert len(db.execute(select(InventoryOperation.id).where(
        InventoryOperation.business_id == bid,
    )).all()) == 1
    # La misma clave con otro contenido no puede aceptar un segundo ajuste.
    assert adjust(client, bid, auth, {
        **body, "quantity_milli": 8000,
    }, key=key).status_code == 409


def test_adjust_increase_decrease_and_history_are_signed(isolated):
    client, db = isolated
    auth, actor_id = actor(client)
    bid = business(client, auth)
    loc, iid, receipt = seeded(client, bid, auth)
    plus = adjust(client, bid, auth, command(iid, loc, amount=2000, version=1))
    assert plus.status_code == 201, plus.text
    assert plus.json()["kind"] == "AJUSTE_ENTRADA"
    assert plus.json()["movements"][0]["delta_milli"] == 2000
    assert view_balances(client, bid, auth)[str(loc), str(iid)] == (12000, 2)
    minus = adjust(client, bid, auth, command(
        iid, loc, kind="AJUSTE_SALIDA", amount=3000, version=2,
        reason="Merma por producto danado",
    ))
    assert minus.status_code == 201, minus.text
    assert minus.json()["movements"][0]["delta_milli"] == -3000
    assert view_balances(client, bid, auth)[str(loc), str(iid)] == (9000, 3)
    rows = view_movements(client, bid, auth)
    assert sorted(m["delta_milli"] for m in rows) == [-3000, 2000, 10000]
    assert len(rows) == 3
    assert client.get(
        f"/api/v1/businesses/{bid}/purchases/{receipt['purchase_id']}/receipt",
        headers=auth,
    ).json() == receipt
    assert len(db.execute(select(InventoryOperation.id).where(
        InventoryOperation.business_id == bid,
    )).all()) == 2
    assert all(m["actor_id"] == str(actor_id) for m in plus.json()["movements"])


def test_insufficient_stock_and_stale_version_do_not_change_ledger(isolated):
    client, db = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    loc, iid, _ = seeded(client, bid, auth)
    too_many = adjust(client, bid, auth, command(
        iid, loc, kind="AJUSTE_SALIDA", amount=11000, version=1,
    ))
    assert too_many.status_code == 409, too_many.text
    assert "insuficiente" in too_many.text
    assert view_balances(client, bid, auth)[str(loc), str(iid)] == (10000, 1)
    assert len(view_movements(client, bid, auth)) == 1

    success = adjust(client, bid, auth, command(
        iid, loc, kind="AJUSTE_SALIDA", amount=2000, version=1,
    ))
    assert success.status_code == 201
    stale = adjust(client, bid, auth, command(iid, loc, amount=1000, version=1))
    assert stale.status_code == 409
    assert "obsoleta" in stale.text
    assert view_balances(client, bid, auth)[str(loc), str(iid)] == (8000, 2)
    assert len(view_movements(client, bid, auth)) == 2
    assert len(db.execute(select(InventoryOperation.id).where(
        InventoryOperation.business_id == bid,
    )).all()) == 1


def test_initial_is_forbidden_after_receipt_or_previous_initial_even_when_empty(isolated):
    client, db = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    loc, iid, _ = seeded(client, bid, auth, qty=4000)
    initial = command(iid, loc, kind="STOCK_INICIAL", amount=5000, version=0)
    assert adjust(client, bid, auth, initial).status_code == 409
    full_exit = adjust(client, bid, auth, command(
        iid, loc, kind="AJUSTE_SALIDA", amount=4000, version=1,
    ))
    assert full_exit.status_code == 201
    assert view_balances(client, bid, auth)[str(loc), str(iid)] == (0, 2)
    assert adjust(client, bid, auth, initial).status_code == 409
    assert view_balances(client, bid, auth)[str(loc), str(iid)] == (0, 2)
    assert len(db.execute(select(StockMovement.id).where(
        StockMovement.business_id == bid,
    )).all()) == 2


def test_initial_twice_on_pair_and_replay_after_later_adjustment(isolated):
    client, _ = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    loc = location(client, bid, auth)
    iid = item(client, bid, auth)
    key = uuid4()
    initial = command(iid, loc, kind="STOCK_INICIAL", amount=3000, version=0)
    response = adjust(client, bid, auth, initial, key=key)
    assert response.status_code == 201
    assert adjust(client, bid, auth, initial).status_code == 409
    later = adjust(client, bid, auth, command(iid, loc, amount=1000, version=1))
    assert later.status_code == 201
    assert view_balances(client, bid, auth)[str(loc), str(iid)] == (4000, 2)
    replay = adjust(client, bid, auth, initial, key=key)
    assert replay.status_code == 200
    assert replay.json() == response.json()
    assert view_balances(client, bid, auth)[str(loc), str(iid)] == (4000, 2)


def test_version_invalid_after_an_actual_transfer(isolated):
    client, _ = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    loc, iid, _ = seeded(client, bid, auth)
    dst = location(client, bid, auth, name="Deposito destino")
    outcome = transfer(client, bid, auth, transfer_request(iid, loc, dst, amount=3000))
    assert outcome.status_code == 201, outcome.text
    stale = adjust(client, bid, auth, command(iid, loc, amount=1000, version=1))
    assert stale.status_code == 409, stale.text
    assert view_balances(client, bid, auth)[str(loc), str(iid)] == (7000, 2)
    fresh = adjust(client, bid, auth, command(iid, loc, amount=1000, version=2))
    assert fresh.status_code == 201
    assert view_balances(client, bid, auth)[str(loc), str(iid)] == (8000, 3)


def test_schema_rejects_discrete_fraction_bad_reason_boolean_or_extra(isolated):
    client, _ = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    loc, iid, _ = seeded(client, bid, auth)
    base = command(iid, loc)
    assert adjust(client, bid, auth, {**base, "quantity_milli": 1500}).status_code == 422
    assert adjust(client, bid, auth, {**base, "quantity_milli": True}).status_code == 422
    assert adjust(client, bid, auth, {**base, "expected_version": True}).status_code == 422
    assert adjust(client, bid, auth, {**base, "expected_version": -1}).status_code == 422
    assert adjust(client, bid, auth, {**base, "reason": "a"}).status_code == 422
    assert adjust(client, bid, auth, {**base, "unexpected": "field"}).status_code == 422
    assert adjust(client, bid, auth, {**base, "kind": "TRASLADO"}).status_code == 422
    assert adjust(client, bid, auth, {**base, "catalog_item_id": str(uuid4())}).status_code == 404
    svc = item(client, bid, auth, name="Servicio no fisico", kind="SERVICIO",
               unit="SERVICIO", sku="SERV-AJ")
    assert adjust(client, bid, auth, {**base, "catalog_item_id": str(svc)}).status_code == 404


def test_permissions_employee_and_manager_location_assignment(isolated):
    client, db = isolated
    owner, _ = actor(client)
    employee, employee_id = actor(client)
    manager, manager_id = actor(client)
    bid = business(client, owner)
    loc, iid, _ = seeded(client, bid, owner)
    for uid, role in [(employee_id, "TRABAJADOR"), (manager_id, "ENCARGADO")]:
        db.execute(insert(Membership).values(
            id=uuid4(), business_id=bid, user_id=uid,
            role=role, status="ACTIVA",
        ))
        db.execute(insert(LocationAssignment).values(
            business_id=bid, location_id=loc, user_id=uid, status="ACTIVA",
        ))
    body = command(iid, loc, amount=1000)
    assert adjust(client, bid, employee, body).status_code == 403
    manager_plus = adjust(client, bid, manager, body)
    assert manager_plus.status_code == 201, manager_plus.text
    assert view_balances(client, bid, owner)[str(loc), str(iid)] == (11000, 2)
    # Encargado no puede usar STOCK_INICIAL, ni aunque esté asignado.
    newloc = location(client, bid, owner, name="Deposito nuevo")
    db.execute(insert(LocationAssignment).values(
        business_id=bid, location_id=newloc, user_id=manager_id, status="ACTIVA",
    ))
    initial = command(iid, newloc, kind="STOCK_INICIAL", version=0)
    assert adjust(client, bid, manager, initial).status_code == 403
    assert adjust(client, bid, owner, initial).status_code == 201


def test_foreign_company_or_location_incompatible_never_creates_stock(isolated):
    client, _ = isolated
    auth, _ = actor(client)
    a, b = business(client, auth), business(client, auth)
    loc, iid, _ = seeded(client, a, auth)
    foreign = location(client, b, auth, name="Casa empresa ajena")
    no_store = location(client, a, auth, name="Local solo venta",
                        can_store=False, can_sell=True)
    body = command(iid, loc, kind="AJUSTE_ENTRADA")
    assert adjust(client, a, auth, {**body, "location_id": str(foreign)}).status_code == 404
    assert adjust(client, a, auth, {**body, "location_id": str(no_store)}).status_code == 409
    assert adjust(client, b, auth, body).status_code == 404
    assert client.patch(
        f"/api/v1/businesses/{a}/locations/{loc}/status",
        headers=auth, json={"status": "PAUSADA"},
    ).status_code == 200
    assert adjust(client, a, auth, body).status_code == 409
    assert view_balances(client, a, auth)[str(loc), str(iid)] == (10000, 1)


def test_adjustment_key_cannot_be_reused_after_transfer(isolated):
    client, _ = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    src, iid, _ = seeded(client, bid, auth)
    dst = location(client, bid, auth, name="Destino alternativo")
    key = uuid4()
    tr = transfer(client, bid, auth,
                  transfer_request(iid, src, dst, amount=2000), key=key)
    assert tr.status_code == 201
    denied = adjust(client, bid, auth, command(iid, src, amount=1000, version=2),
                    key=key)
    assert denied.status_code == 409
    assert view_balances(client, bid, auth)[str(src), str(iid)] == (8000, 2)
    assert len(view_movements(client, bid, auth)) == 3


def test_no_prior_balance_cannot_be_adjusted_without_stock_initial(isolated):
    client, _ = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    loc = location(client, bid, auth)
    iid = item(client, bid, auth)
    plus = adjust(client, bid, auth, command(iid, loc, version=0))
    minus = adjust(client, bid, auth, command(
        iid, loc, kind="AJUSTE_SALIDA", version=0,
    ))
    assert plus.status_code == minus.status_code == 409
    assert view_balances(client, bid, auth) == {}
    assert view_movements(client, bid, auth) == []
