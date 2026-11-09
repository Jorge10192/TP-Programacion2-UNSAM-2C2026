"""CU-09 E2-5 B: traslado real FastAPI/PostgreSQL 16, rollback y tenant.

El fixture isolated crea datos dentro de una transacción exterior reversible,
sin tocar compras ni saldos de QA creados manualmente por el usuario.
"""
import os
from uuid import uuid4

import pytest
from sqlalchemy import insert, select

from app.infrastructure.models import (
    InventoryOperation, LocationAssignment, Membership, StockBalance, StockMovement,
)
from test_purchase_api_integration import isolated, actor, business, item
from test_receipt_api_integration import location, physical, receive

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="PostgreSQL e25a_inventory_ops + RUN_DB_INTEGRATION=1",
    ),
]


def endpoint(bid, tid=None):
    base = f"/api/v1/businesses/{bid}/inventory/transfers"
    return base + (f"/{tid}" if tid else "")


def request(product, source, target, *, amount=4000, reason="Traslado de mercaderia QA"):
    return {
        "catalog_item_id": str(product),
        "source_location_id": str(source),
        "destination_location_id": str(target),
        "quantity_milli": amount,
        "reason": reason,
    }


def transfer(client, bid, headers, body, *, key=None):
    return client.post(
        endpoint(bid),
        headers={**headers, "Idempotency-Key": str(key or uuid4())},
        json=body,
    )


def view_balances(client, bid, headers):
    response = client.get(f"/api/v1/businesses/{bid}/inventory/balances", headers=headers)
    assert response.status_code == 200, response.text
    return {
        (row["location_id"], row["catalog_item_id"]): (row["quantity_milli"], row["version"])
        for row in response.json()
    }


def view_movements(client, bid, headers):
    response = client.get(f"/api/v1/businesses/{bid}/inventory/movements", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def seeded(client, headers, bid, *, amount=10000):
    src = location(client, bid, headers, name="Deposito origen")
    dst = location(client, bid, headers, name="Deposito destino")
    product = item(client, bid, headers)
    pid = physical(client, bid, headers, product, amount=amount)
    receipt = receive(client, bid, pid, src, headers)
    assert receipt.status_code == 201, receipt.text
    return src, dst, product, receipt.json()


def test_transfer_atomic_two_movements_same_total_and_replay(isolated):
    client, db = isolated
    headers, actor_id = actor(client)
    bid = business(client, headers)
    src, dst, product, rec = seeded(client, headers, bid)
    key = uuid4()
    body = request(product, src, dst)
    first = transfer(client, bid, headers, body, key=key)
    assert first.status_code == 201, first.text
    row = first.json()
    assert row["business_id"] == str(bid)
    assert row["actor_id"] == str(actor_id)
    assert row["unit_snapshot"] == "UNIDAD"
    assert row["quantity_milli"] == 4000
    assert [m["event_type"] for m in row["movements"]] == [
        "TRASLADO_SALIDA", "TRASLADO_ENTRADA",
    ]
    assert [m["delta_milli"] for m in row["movements"]] == [-4000, 4000]
    assert {m["inventory_operation_id"] for m in row["movements"]} == {row["id"]}
    assert all("receipt_id" not in m and "purchase_line_id" not in m
               for m in row["movements"])
    assert view_balances(client, bid, headers) == {
        (str(src), str(product)): (6000, 2),
        (str(dst), str(product)): (4000, 1),
    }
    assert client.get(endpoint(bid, row["id"]), headers=headers).json() == row

    # Misma clave y contenido, mismo resultado estable: cero mutaciones.
    repeat = transfer(client, bid, headers, body, key=key)
    assert repeat.status_code == 200, repeat.text
    assert repeat.json() == row
    assert view_balances(client, bid, headers)[str(src), str(product)] == (6000, 2)
    assert len(view_movements(client, bid, headers)) == 3
    assert len(db.execute(select(InventoryOperation.id).where(
        InventoryOperation.business_id == bid,
    )).all()) == 1

    # La clave no puede reutilizarse con otra cantidad/destino.
    bad = transfer(client, bid, headers, request(product, src, dst, amount=1000), key=key)
    assert bad.status_code == 409, bad.text
    assert len(view_movements(client, bid, headers)) == 3
    assert len(rec["movements"]) == 1
    assert client.get(
        f"/api/v1/businesses/{bid}/purchases/{rec['purchase_id']}/receipt",
        headers=headers,
    ).json() == rec


def test_transfer_movements_visible_in_general_ledger_and_old_receipt_unchanged(isolated):
    client, _ = isolated
    headers, _ = actor(client)
    bid = business(client, headers)
    src, dst, product, rec = seeded(client, headers, bid)
    tr = transfer(client, bid, headers, request(product, src, dst))
    assert tr.status_code == 201
    moves = view_movements(client, bid, headers)
    assert {m["event_type"] for m in moves} == {
        "COMPRA_RECEPCION", "TRASLADO_SALIDA", "TRASLADO_ENTRADA",
    }
    original = [m for m in moves if m["event_type"] == "COMPRA_RECEPCION"]
    assert original == rec["movements"]
    assert "inventory_operation_id" not in original[0]
    manual = [m for m in moves if m["event_type"].startswith("TRASLADO_")]
    assert len(manual) == 2
    assert all(m["operation_kind"] == "TRASLADO" for m in manual)


def test_transfer_rejects_insufficient_stock_without_partial_mutation(isolated):
    client, db = isolated
    headers, _ = actor(client)
    bid = business(client, headers)
    src, dst, product, _ = seeded(client, headers, bid)
    denied = transfer(client, bid, headers, request(product, src, dst, amount=11000))
    assert denied.status_code == 409
    assert "Stock insuficiente" in denied.text
    assert view_balances(client, bid, headers) == {(str(src), str(product)): (10000, 1)}
    assert len(view_movements(client, bid, headers)) == 1
    assert db.execute(select(InventoryOperation.id).where(
        InventoryOperation.business_id == bid,
    )).all() == []


def test_transfer_allows_only_valid_items_and_quantities(isolated):
    client, _ = isolated
    headers, _ = actor(client)
    bid = business(client, headers)
    src, dst, product, _ = seeded(client, headers, bid)
    base = request(product, src, dst)
    assert transfer(client, bid, headers, {**base, "quantity_milli": 1500}).status_code == 422
    assert transfer(client, bid, headers, {**base, "quantity_milli": 0}).status_code == 422
    assert transfer(client, bid, headers, {**base, "quantity_milli": True}).status_code == 422
    assert transfer(client, bid, headers, {**base, "source_location_id": str(dst)}).status_code == 422
    assert transfer(client, bid, headers, {**base, "unexpected": "field"}).status_code == 422
    assert transfer(client, bid, headers, {**base, "catalog_item_id": str(uuid4())}).status_code == 404
    service = item(client, bid, headers, name="Servicio externo", kind="SERVICIO",
                   unit="SERVICIO", sku="SVC-TF")
    assert transfer(client, bid, headers, request(service, src, dst)).status_code == 404
    assert view_balances(client, bid, headers)[str(src), str(product)] == (10000, 1)


def test_location_status_store_and_foreign_tenant(isolated):
    client, _ = isolated
    headers, _ = actor(client)
    a, b = business(client, headers), business(client, headers)
    src, dst, product, _ = seeded(client, headers, a)
    foreign = location(client, b, headers, name="Deposito externo")
    selling = location(client, a, headers, can_store=False, can_sell=True,
                       name="Solo venta")
    assert transfer(client, a, headers, request(product, src, foreign)).status_code == 404
    assert transfer(client, a, headers, request(product, src, selling)).status_code == 409
    assert client.patch(f"/api/v1/businesses/{a}/locations/{dst}/status",
                        json={"status": "PAUSADA"}, headers=headers).status_code == 200
    assert transfer(client, a, headers, request(product, src, dst)).status_code == 409
    assert view_balances(client, a, headers)[str(src), str(product)] == (10000, 1)


def test_employee_requires_store_assignment_at_both_locations(isolated):
    client, db = isolated
    owner, _ = actor(client)
    employee, employee_id = actor(client)
    bid = business(client, owner)
    src, dst, product, _ = seeded(client, owner, bid)
    db.execute(insert(Membership).values(
        id=uuid4(), business_id=bid, user_id=employee_id,
        role="TRABAJADOR", status="ACTIVA",
    ))
    body = request(product, src, dst)
    assert transfer(client, bid, employee, body).status_code == 403
    db.execute(insert(LocationAssignment).values(
        business_id=bid, location_id=src, user_id=employee_id, status="ACTIVA",
    ))
    assert transfer(client, bid, employee, body).status_code == 403
    db.execute(insert(LocationAssignment).values(
        business_id=bid, location_id=dst, user_id=employee_id, status="ACTIVA",
    ))
    good = transfer(client, bid, employee, body)
    assert good.status_code == 201, good.text
    assert good.json()["actor_id"] == str(employee_id)
    assert client.get(endpoint(bid, good.json()["id"]), headers=employee).status_code == 200


def test_transfer_denied_on_invalid_token_and_foreign_operation(isolated):
    client, _ = isolated
    headers, _ = actor(client)
    a, b = business(client, headers), business(client, headers)
    src, dst, product, _ = seeded(client, headers, a)
    payload = request(product, src, dst)
    assert transfer(client, a, {}, payload).status_code == 401
    good = transfer(client, a, headers, payload)
    assert good.status_code == 201
    assert client.get(endpoint(b, good.json()["id"]), headers=headers).status_code == 404
    assert client.get(endpoint(a, uuid4()), headers=headers).status_code == 404
