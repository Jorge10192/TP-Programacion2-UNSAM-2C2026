"""CU-07 E2-4 E: recepción real FastAPI/PostgreSQL, cero efectos parciales.

Rollback de transacción exterior: nunca elimina datos preexistentes del usuario.
"""
import os
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, insert, select, update
from sqlalchemy.exc import IntegrityError

from app.infrastructure.models import (
    Business, CatalogItem, Location, LocationAssignment, Membership, Purchase,
    PurchaseReceipt, StockBalance, StockMovement,
)
from app.modules.purchases.receipt_schemas import PurchaseReceiptView
from test_purchase_api_integration import (
    isolated, actor, business, item, line, payload, create, path,
)

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="PostgreSQL real e24e_receipt_stock + RUN_DB_INTEGRATION=1",
    ),
]


def location(client, bid, headers, *, can_store=True, can_sell=False, name="Deposito QA"):
    response = client.post(
        f"/api/v1/businesses/{bid}/locations",
        headers=headers, json={
            "name": name, "kind": "DEPOSITO",
            "address": "", "map_url": "",
            "can_store": can_store, "can_sell": can_sell,
        },
    )
    assert response.status_code == 201, response.text
    return UUID(response.json()["id"])


def receive(client, bid, pid, loc, headers, *, key=None, body=None):
    return client.post(
        f"/api/v1/businesses/{bid}/purchases/{pid}/receive",
        headers={**headers, "Idempotency-Key": str(key or uuid4())},
        json=body if body is not None else {"location_id": str(loc)},
    )


def physical(client, bid, headers, iid, *, amount=10000, desc="Articulo recibido"):
    created = create(client, bid, headers, payload(
        line(iid, description=desc, unit="UNIDAD",
             quantity_milli=amount, unit_cost_cents=500),
    ))
    assert created.status_code == 201, created.text
    return created.json()["id"]


def balances(client, bid, headers):
    response = client.get(f"/api/v1/businesses/{bid}/inventory/balances", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def movements(client, bid, headers):
    response = client.get(f"/api/v1/businesses/{bid}/inventory/movements", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def test_receive_first_stock_atomic_and_replay_exact(isolated):
    client, db = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    loc = location(client, bid, auth)
    iid = item(client, bid, auth)
    pid = physical(client, bid, auth, iid)
    assert balances(client, bid, auth) == []
    assert movements(client, bid, auth) == []
    key = uuid4()
    first = receive(client, bid, pid, loc, auth, key=key)
    assert first.status_code == 201, first.text
    rec = first.json()
    assert rec["purchase_id"] == pid
    assert rec["location_id"] == str(loc)
    assert rec["purchase_status"] == "RECIBIDA"
    assert rec["request_id"] == str(key)
    assert len(rec["movements"]) == 1
    movement = rec["movements"][0]
    assert movement["event_type"] == "COMPRA_RECEPCION"
    assert movement["delta_milli"] == 10000
    assert movement["catalog_item_id"] == str(iid)
    assert rec["balances_after"] == [{
        "catalog_item_id": str(iid), "quantity_milli": 10000, "version": 1,
    }]
    assert client.get(path(bid, pid), headers=auth).json()["status"] == "RECIBIDA"
    assert balances(client, bid, auth)[0]["quantity_milli"] == 10000
    assert balances(client, bid, auth)[0]["version"] == 1
    assert movements(client, bid, auth) == rec["movements"]
    assert client.get(f"{path(bid, pid)}/receipt", headers=auth).json() == rec

    repeat = receive(client, bid, pid, loc, auth, key=key)
    assert repeat.status_code == 200, repeat.text
    assert repeat.json() == rec
    assert len(movements(client, bid, auth)) == 1
    assert balances(client, bid, auth)[0]["quantity_milli"] == 10000

    rejected = receive(client, bid, pid, loc, auth)
    assert rejected.status_code == 409, rejected.text
    second_loc = location(client, bid, auth, name="Otro deposito")
    different_payload = receive(client, bid, pid, second_loc, auth, key=key)
    assert different_payload.status_code == 409, different_payload.text
    assert len(db.execute(select(PurchaseReceipt.id).where(
        PurchaseReceipt.business_id == bid,
    )).all()) == 1


def test_balance_after_snapshot_on_replay_does_not_follow_later_entries(isolated):
    client, _ = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    loc = location(client, bid, auth)
    iid = item(client, bid, auth)
    p1 = physical(client, bid, auth, iid, amount=2000)
    key = uuid4()
    first = receive(client, bid, p1, loc, auth, key=key)
    assert first.status_code == 201, first.text
    p2 = physical(client, bid, auth, iid, amount=3000)
    second = receive(client, bid, p2, loc, auth)
    assert second.status_code == 201, second.text
    assert second.json()["balances_after"][0]["quantity_milli"] == 5000
    assert second.json()["balances_after"][0]["version"] == 2
    assert balances(client, bid, auth)[0]["quantity_milli"] == 5000
    replay = receive(client, bid, p1, loc, auth, key=key)
    assert replay.status_code == 200
    assert replay.json() == first.json()
    assert first.json()["balances_after"][0]["quantity_milli"] == 2000
    assert len(movements(client, bid, auth)) == 2


def test_mixed_duplicate_physical_lines_aggregate_balance_not_history(isolated):
    client, _ = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    loc = location(client, bid, auth)
    iid = item(client, bid, auth)
    service = item(client, bid, auth, name="Flete", kind="SERVICIO", unit="SERVICIO", sku="S-5")
    created = create(client, bid, auth, payload(
        line(iid, description="Unidad A", unit="UNIDAD", quantity_milli=1000),
        line(iid, description="Unidad B", unit="UNIDAD", quantity_milli=2000),
        line(service, description="Flete", unit="SERVICIO", quantity_milli=1000),
        line(description="Concepto administrativo", quantity_milli=1000),
    ))
    assert created.status_code == 201, created.text
    result = receive(client, bid, created.json()["id"], loc, auth)
    assert result.status_code == 201, result.text
    rows = result.json()["movements"]
    assert len(rows) == 2
    assert [x["delta_milli"] for x in rows] == [1000, 2000]
    assert [x["purchase_line_id"] for x in rows] == [
        created.json()["lines"][0]["id"], created.json()["lines"][1]["id"],
    ]
    assert result.json()["balances_after"][0]["quantity_milli"] == 3000
    assert result.json()["balances_after"][0]["version"] == 1
    assert len(balances(client, bid, auth)) == 1


def test_receipt_requires_physical_pending_purchase(isolated):
    client, db = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    loc = location(client, bid, auth)
    no_physical = create(client, bid, auth).json()
    assert no_physical["status"] == "CERRADA_SIN_RECEPCION"
    denied = receive(client, bid, no_physical["id"], loc, auth)
    assert denied.status_code == 409, denied.text
    assert client.get(f"{path(bid, no_physical['id'])}/receipt", headers=auth).status_code == 404
    assert receive(client, bid, uuid4(), loc, auth).status_code == 404
    assert db.execute(select(PurchaseReceipt.id).where(
        PurchaseReceipt.business_id == bid,
    )).all() == []


def test_location_must_be_own_active_and_can_store(isolated):
    client, db = isolated
    auth, _ = actor(client)
    a, b = business(client, auth), business(client, auth)
    iid = item(client, a, auth)
    pid = physical(client, a, auth, iid)
    foreign = location(client, b, auth, name="Deposito ajeno")
    sell_only = location(client, a, auth, can_store=False, can_sell=True,
                         name="Punto de venta")
    pausable = location(client, a, auth, name="Deposito pausado")
    assert receive(client, a, pid, foreign, auth).status_code == 404
    assert receive(client, a, pid, sell_only, auth).status_code == 409
    assert client.patch(f"/api/v1/businesses/{a}/locations/{pausable}/status",
                        headers=auth, json={"status": "PAUSADA"}).status_code == 200
    assert receive(client, a, pid, pausable, auth).status_code == 409
    assert receive(client, a, pid, uuid4(), auth).status_code == 404
    assert client.get(path(a, pid), headers=auth).json()["status"] == "REGISTRADA"
    assert db.execute(select(PurchaseReceipt.id).where(
        PurchaseReceipt.business_id == a,
    )).all() == []
    assert balances(client, a, auth) == []


@pytest.mark.parametrize("changed", ["INACTIVO", "KILOGRAMO"])
def test_cannot_receive_inactive_item_or_changed_unit(isolated, changed):
    client, db = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    loc = location(client, bid, auth)
    iid = item(client, bid, auth)
    pid = physical(client, bid, auth, iid)
    if changed == "INACTIVO":
        result = client.patch(f"/api/v1/businesses/{bid}/catalog/{iid}/status",
                              headers=auth, json={"status": "INACTIVO"})
    else:
        result = client.patch(f"/api/v1/businesses/{bid}/catalog/{iid}",
                              headers=auth, json={"unit": "KILOGRAMO"})
    if changed == "INACTIVO":
        assert result.status_code == 200, result.text
    else:
        # La API ya protege unidad/tipo al existir una compra histórica.
        assert result.status_code == 409, result.text
        # Defensa adicional: si una intervención SQL fuera de API altera la
        # unidad, recepción también debe fallar cerrada (nunca crear stock).
        db.execute(update(CatalogItem).where(
            CatalogItem.business_id == bid, CatalogItem.id == iid,
        ).values(unit="KILOGRAMO"))
    denied = receive(client, bid, pid, loc, auth)
    assert denied.status_code == 409, denied.text
    assert balances(client, bid, auth) == []
    assert client.get(path(bid, pid), headers=auth).json()["status"] == "REGISTRADA"


def test_catalog_cannot_reinterpret_historical_kind_or_unit_but_can_rename(isolated):
    client, _ = isolated
    owner, _ = actor(client)
    bid = business(client, owner)
    loc = location(client, bid, owner)
    iid = item(client, bid, owner)
    pid = physical(client, bid, owner, iid)
    base = f"/api/v1/businesses/{bid}/catalog/{iid}"
    assert client.patch(base, headers=owner, json={"unit": "KILOGRAMO"}).status_code == 409
    assert client.patch(base, headers=owner, json={"kind": "INSUMO"}).status_code == 409
    assert client.patch(base, headers=owner, json={
        "name": "Nuevo nombre sin reescribir compra",
        "sku": "NEW-023",
    }).status_code == 200
    assert receive(client, bid, pid, loc, owner).status_code == 201
    assert client.patch(base, headers=owner, json={"unit": "GRAMO"}).status_code == 409
    assert client.get(path(bid, pid), headers=owner).json()["lines"][0]["sku_snapshot"] == "PRU-01"


def test_assigned_employee_can_store_and_unassigned_employee_cannot(isolated):
    client, db = isolated
    owner, _ = actor(client)
    employee, employee_id = actor(client)
    bid = business(client, owner)
    loc = location(client, bid, owner)
    iid = item(client, bid, owner)
    pid = physical(client, bid, owner, iid)
    db.execute(insert(Membership).values(
        id=uuid4(), business_id=bid, user_id=employee_id,
        role="ENCARGADO", status="ACTIVA",
    ))
    assert receive(client, bid, pid, loc, employee).status_code == 403
    db.execute(insert(LocationAssignment).values(
        business_id=bid, location_id=loc, user_id=employee_id, status="ACTIVA",
    ))
    accepted = receive(client, bid, pid, loc, employee)
    assert accepted.status_code == 201, accepted.text
    assert accepted.json()["confirmed_by_id"] == str(employee_id)
    assert client.get(f"{path(bid, pid)}/receipt", headers=employee).status_code == 200
    pid2 = physical(client, bid, owner, iid)
    db.execute(update(LocationAssignment).where(
        LocationAssignment.business_id == bid,
        LocationAssignment.location_id == loc,
        LocationAssignment.user_id == employee_id,
    ).values(status="REVOCADA", revoked_at=func.now()))
    assert receive(client, bid, pid2, loc, employee).status_code == 403
    assert receive(client, bid, pid2, loc, owner).status_code == 201


def test_foreign_actor_inactive_membership_and_suspension(isolated):
    client, db = isolated
    owner, owner_id = actor(client)
    stranger, _ = actor(client)
    bid = business(client, owner)
    loc = location(client, bid, owner)
    iid = item(client, bid, owner)
    pid = physical(client, bid, owner, iid)
    assert receive(client, bid, pid, loc, stranger).status_code == 404
    assert client.get(f"{path(bid, pid)}/receipt", headers=stranger).status_code == 404
    assert client.get(f"/api/v1/businesses/{bid}/inventory/balances", headers=stranger).status_code == 404
    db.execute(update(Business).where(Business.id == bid).values(status="SUSPENDIDA"))
    assert receive(client, bid, pid, loc, owner).status_code == 409
    assert balances(client, bid, owner) == []
    db.execute(update(Business).where(Business.id == bid).values(status="ACTIVA"))
    db.execute(update(Membership).where(
        Membership.business_id == bid, Membership.user_id == owner_id,
    ).values(status="INACTIVA"))
    assert receive(client, bid, pid, loc, owner).status_code == 404


def test_invalid_payload_or_key_does_not_create_any_stock(isolated):
    client, _ = isolated
    owner, _ = actor(client)
    bid = business(client, owner)
    loc = location(client, bid, owner)
    iid = item(client, bid, owner)
    pid = physical(client, bid, owner, iid)
    url = f"{path(bid, pid)}/receive"
    invalids = [
        {"location_id": str(loc), "quantity_milli": 1},
        {"location_id": str(loc), "partial": True},
        {"location_id": "not-a-uuid"},
        {"location_id": None},
    ]
    for invalid in invalids:
        assert receive(client, bid, pid, loc, owner, body=invalid).status_code == 422
    assert client.post(url, headers=owner, json={"location_id": str(loc)}).status_code == 422
    assert client.post(url, headers={**owner, "Idempotency-Key": "bad-uuid"},
                       json={"location_id": str(loc)}).status_code == 422
    assert balances(client, bid, owner) == []
    assert movements(client, bid, owner) == []
    assert client.get(path(bid, pid), headers=owner).json()["status"] == "REGISTRADA"


def test_rollback_after_ledger_balance_and_status_have_been_flushed(isolated, monkeypatch):
    client, db = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    loc = location(client, bid, auth)
    iid = item(client, bid, auth)
    pid = physical(client, bid, auth, iid)

    def fail(*_args):
        raise RuntimeError("Falló serialización tras actualización de saldos")

    with monkeypatch.context() as patch:
        patch.setattr(PurchaseReceiptView, "from_records", fail)
        with pytest.raises(RuntimeError, match="Falló serialización"):
            receive(client, bid, pid, loc, auth)
    assert db.execute(select(PurchaseReceipt.id).where(PurchaseReceipt.business_id == bid)).all() == []
    assert db.execute(select(StockMovement.id).where(StockMovement.business_id == bid)).all() == []
    assert db.execute(select(StockBalance.quantity_milli).where(StockBalance.business_id == bid)).all() == []
    assert db.execute(select(Purchase.status).where(
        Purchase.business_id == bid, Purchase.id == UUID(pid),
    )).scalar_one() == "REGISTRADA"


def test_database_constraints_no_negative_balance_and_no_duplicate_receipt(isolated):
    client, db = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    loc = location(client, bid, auth)
    iid = item(client, bid, auth)
    pid = physical(client, bid, auth, iid)
    completed = receive(client, bid, pid, loc, auth)
    assert completed.status_code == 201, completed.text
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.execute(update(StockBalance).where(
                StockBalance.business_id == bid,
                StockBalance.location_id == loc,
                StockBalance.catalog_item_id == iid,
            ).values(quantity_milli=-1))
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.execute(insert(PurchaseReceipt).values(
                id=uuid4(), business_id=bid, purchase_id=UUID(pid),
                location_id=loc, request_id=uuid4(), request_sha256="f" * 64,
                confirmed_by_id=UUID(completed.json()["confirmed_by_id"]),
                balances_after=[],
            ))
    assert balances(client, bid, auth)[0]["quantity_milli"] == 10000


def test_read_only_inventory_pagination_filters_and_tenant(isolated):
    client, _ = isolated
    auth, _ = actor(client)
    a, b = business(client, auth), business(client, auth)
    la = location(client, a, auth)
    lb = location(client, b, auth, name="Otro deposito")
    ia, ib = item(client, a, auth), item(client, b, auth)
    pa, pb = physical(client, a, auth, ia), physical(client, b, auth, ib)
    assert receive(client, a, pa, la, auth).status_code == 201
    assert receive(client, b, pb, lb, auth).status_code == 201
    prefix = f"/api/v1/businesses/{a}/inventory"
    for resource in ("balances", "movements"):
        one = client.get(prefix + "/" + resource, headers=auth)
        assert one.status_code == 200 and len(one.json()) == 1
        assert one.json()[0]["business_id"] == str(a)
        assert client.get(prefix + "/" + resource, headers=auth, params={
            "location_id": str(lb),
        }).json() == []
        assert client.get(prefix + "/" + resource, headers=auth, params={
            "catalog_item_id": str(ib),
        }).json() == []
        assert client.get(prefix + "/" + resource, headers=auth,
                          params={"offset": 1, "limit": 1}).json() == []
        for bad in ({"limit": 0}, {"limit": 501}, {"offset": -1},
                    {"offset": "9223372036854775808"}):
            assert client.get(prefix + "/" + resource, headers=auth,
                              params=bad).status_code == 422
