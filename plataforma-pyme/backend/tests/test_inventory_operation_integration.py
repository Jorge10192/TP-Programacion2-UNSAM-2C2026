"""E2-5 A: pruebas SQL PostgreSQL del nuevo origen, sin ejecutar transferencias reales.

Se utiliza el fixture `isolated` con transacción exterior que SIEMPRE se
revierte. Las pruebas de traslado/ajuste completos e idempotencia HTTP serán
implementadas en E2-5 B/C. No se modifica ninguna compra QA persistida.
"""
import os
from uuid import uuid4

import pytest
from sqlalchemy import insert, select
from sqlalchemy.exc import IntegrityError

from app.infrastructure.models import InventoryOperation, StockMovement, StockBalance
from test_purchase_api_integration import isolated, actor, business, item
from test_receipt_api_integration import location, physical, receive

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere PostgreSQL migrado a e25a_inventory_ops",
    ),
]


def operation_values(*, business_id, actor_id, item_id, source=None, destination=None,
                     kind="TRASLADO", quantity=1000, request_id=None, unit="UNIDAD"):
    return {
        "id": uuid4(),
        "business_id": business_id,
        "request_id": request_id or uuid4(),
        "request_sha256": "a" * 64,
        "kind": kind,
        "catalog_item_id": item_id,
        "unit_snapshot": unit,
        "quantity_milli": quantity,
        "source_location_id": source,
        "destination_location_id": destination,
        "reason": "Prueba de modelo E2-5 A",
        "actor_id": actor_id,
    }


def movement_values(*, business_id, actor_id, item_id, location_id,
                    operation_id, event_type, operation_kind="TRASLADO", delta=1000):
    return {
        "id": uuid4(),
        "business_id": business_id,
        "location_id": location_id,
        "catalog_item_id": item_id,
        "receipt_id": None,
        "purchase_line_id": None,
        "inventory_operation_id": operation_id,
        "operation_kind": operation_kind,
        "actor_id": actor_id,
        "event_type": event_type,
        "delta_milli": delta,
    }


def test_receipt_http_and_historical_movement_remain_unchanged(isolated):
    client, db = isolated
    headers, user_id = actor(client)
    tenant = business(client, headers)
    warehouse = location(client, tenant, headers)
    product = item(client, tenant, headers)
    purchase_id = physical(client, tenant, headers, product, amount=10000)
    first = receive(client, tenant, purchase_id, warehouse, headers)
    assert first.status_code == 201, first.text
    result = first.json()
    assert result["purchase_status"] == "RECIBIDA"
    assert result["movements"][0]["event_type"] == "COMPRA_RECEPCION"
    assert result["movements"][0]["delta_milli"] == 10000
    stored = db.execute(select(
        StockMovement.receipt_id, StockMovement.purchase_line_id,
        StockMovement.inventory_operation_id, StockMovement.operation_kind,
    ).where(StockMovement.business_id == tenant)).one()
    assert stored.receipt_id is not None
    assert stored.purchase_line_id is not None
    assert stored.inventory_operation_id is None
    assert stored.operation_kind is None
    stock = db.execute(select(StockBalance.quantity_milli).where(
        StockBalance.business_id == tenant,
        StockBalance.location_id == warehouse,
        StockBalance.catalog_item_id == product,
    )).scalar_one()
    assert stock == 10000
    assert client.get(
        f"/api/v1/businesses/{tenant}/purchases/{purchase_id}/receipt",
        headers=headers,
    ).json() == result
    assert user_id == stored_actor(db, tenant)


def stored_actor(db, tenant):
    return db.execute(select(StockMovement.actor_id).where(
        StockMovement.business_id == tenant,
    )).scalar_one()


def test_transfer_operation_references_two_signed_events_without_duplicate_side(isolated):
    client, db = isolated
    auth, actor_id = actor(client)
    tenant = business(client, auth)
    source = location(client, tenant, auth, name="Origen de prueba")
    target = location(client, tenant, auth, name="Destino de prueba")
    product = item(client, tenant, auth)
    op = operation_values(
        business_id=tenant, actor_id=actor_id, item_id=product,
        source=source, destination=target,
    )
    db.execute(insert(InventoryOperation).values(**op))
    outbound = movement_values(
        business_id=tenant, actor_id=actor_id, item_id=product,
        location_id=source, operation_id=op["id"],
        event_type="TRASLADO_SALIDA", delta=-1000,
    )
    inbound = movement_values(
        business_id=tenant, actor_id=actor_id, item_id=product,
        location_id=target, operation_id=op["id"],
        event_type="TRASLADO_ENTRADA", delta=1000,
    )
    db.execute(insert(StockMovement).values(**outbound))
    db.execute(insert(StockMovement).values(**inbound))
    rows = db.execute(select(StockMovement.event_type, StockMovement.delta_milli).where(
        StockMovement.business_id == tenant,
        StockMovement.inventory_operation_id == op["id"],
    )).all()
    assert len(rows) == 2
    assert sum(row.delta_milli for row in rows) == 0
    assert {row.event_type for row in rows} == {
        "TRASLADO_SALIDA", "TRASLADO_ENTRADA",
    }
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.execute(insert(StockMovement).values(**{
                **outbound, "id": uuid4(),
            }))
    # Estos INSERT solo prueban restricciones SQL, NO constituyen un traslado
    # comercial real: el test se revierte y E2-5 B realizará ambos saldos.


@pytest.mark.parametrize("kind,source_set,target_set", [
    ("TRASLADO", True, False),
    ("TRASLADO", False, True),
    ("AJUSTE_SALIDA", False, True),
    ("AJUSTE_ENTRADA", True, False),
    ("STOCK_INICIAL", True, True),
])
def test_db_denies_operation_with_invalid_location_direction(
        isolated, kind, source_set, target_set):
    client, db = isolated
    auth, actor_id = actor(client)
    tenant = business(client, auth)
    warehouse = location(client, tenant, auth)
    product = item(client, tenant, auth)
    values = operation_values(
        business_id=tenant, actor_id=actor_id, item_id=product,
        source=warehouse if source_set else None,
        destination=warehouse if target_set else None,
        kind=kind,
    )
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.execute(insert(InventoryOperation).values(**values))


def test_db_denies_same_location_transfer_and_fraction_of_discrete_unit(isolated):
    client, db = isolated
    auth, actor_id = actor(client)
    tenant = business(client, auth)
    warehouse = location(client, tenant, auth)
    product = item(client, tenant, auth)
    equal_places = operation_values(
        business_id=tenant, actor_id=actor_id, item_id=product,
        source=warehouse, destination=warehouse,
    )
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.execute(insert(InventoryOperation).values(**equal_places))
    fractional = operation_values(
        business_id=tenant, actor_id=actor_id, item_id=product,
        destination=warehouse, source=None,
        kind="STOCK_INICIAL", quantity=1500,
    )
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.execute(insert(InventoryOperation).values(**fractional))


def test_tenant_foreign_key_and_business_scoped_idempotency(isolated):
    client, db = isolated
    auth, actor_id = actor(client)
    a, b = business(client, auth), business(client, auth)
    src_a = location(client, a, auth)
    dst_a = location(client, a, auth, name="Segundo origen")
    loc_b = location(client, b, auth)
    product = item(client, a, auth)
    bad = operation_values(
        business_id=a, actor_id=actor_id, item_id=product,
        source=src_a, destination=loc_b,
    )
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.execute(insert(InventoryOperation).values(**bad))
    request_id = uuid4()
    good = operation_values(
        business_id=a, actor_id=actor_id, item_id=product,
        source=src_a, destination=dst_a, request_id=request_id,
    )
    db.execute(insert(InventoryOperation).values(**good))
    duplicate = {**good, "id": uuid4()}
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.execute(insert(InventoryOperation).values(**duplicate))
    assert db.execute(select(InventoryOperation.id).where(
        InventoryOperation.business_id == a,
    )).scalars().all() == [good["id"]]


@pytest.mark.parametrize("event_type,kind,delta,should_fail", [
    ("TRASLADO_SALIDA", "TRASLADO", 1000, True),
    ("TRASLADO_ENTRADA", "TRASLADO", -1000, True),
    ("AJUSTE_SALIDA", "TRASLADO", -1000, True),
    ("TRASLADO_ENTRADA", None, 1000, True),
    ("TRASLADO_SALIDA", "TRASLADO", -1000, False),
])
def test_signed_origin_kind_is_enforced_in_postgres(
        isolated, event_type, kind, delta, should_fail):
    client, db = isolated
    auth, actor_id = actor(client)
    tenant = business(client, auth)
    src = location(client, tenant, auth)
    dst = location(client, tenant, auth, name="Destino secundario")
    product = item(client, tenant, auth)
    op = operation_values(
        business_id=tenant, actor_id=actor_id, item_id=product,
        source=src, destination=dst,
    )
    db.execute(insert(InventoryOperation).values(**op))
    movement = movement_values(
        business_id=tenant, actor_id=actor_id, item_id=product,
        location_id=src, operation_id=op["id"],
        operation_kind=kind,
        event_type=event_type, delta=delta,
    )
    if should_fail:
        with pytest.raises(IntegrityError):
            with db.begin_nested():
                db.execute(insert(StockMovement).values(**movement))
    else:
        db.execute(insert(StockMovement).values(**movement))
