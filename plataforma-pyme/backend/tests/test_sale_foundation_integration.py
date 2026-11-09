"""E2-6 A: integridad SQL real de ventas, sin API comercial todavía.

Reutiliza el fixture aislado por rollback de E2-4: ningún test borra datos
existentes del desarrollador. No representa una venta confirmada por servicio;
esa transacción y los permisos llegan en E2-6 B/C.
"""
import os
from uuid import uuid4

import pytest
from sqlalchemy import insert, select
from sqlalchemy.exc import IntegrityError

from app.infrastructure.models import Sale, SaleLine, SalePayment, StockMovement
from test_purchase_api_integration import isolated, actor, business, item
from test_receipt_api_integration import location

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="PostgreSQL migrado a e26a_sales_foundation y RUN_DB_INTEGRATION=1",
    ),
]


def sale_values(business_id, actor_id, *, sale_id=None, location_id=None,
                request_id=None, subtotal=1050, discount=50, total=1000):
    return {
        "id": sale_id or uuid4(),
        "business_id": business_id,
        "location_id": location_id,
        "request_id": request_id or uuid4(),
        "request_sha256": "a" * 64,
        "status": "CONFIRMADA",
        "subtotal_cents": subtotal,
        "discount_cents": discount,
        "total_cents": total,
        "notes": "Venta interna de prueba E2-6 A",
        "created_by_id": actor_id,
    }


def line_values(business_id, sale_id, item_id, *, line_id=None, n=1,
                kind="BIEN", unit="UNIDAD", qty=1000,
                price=1050, amount=1050):
    return {
        "id": line_id or uuid4(),
        "business_id": business_id, "sale_id": sale_id, "line_number": n,
        "catalog_item_id": item_id,
        "description_snapshot": "Articulo vendido" if kind == "BIEN" else "Servicio vendido",
        "kind_snapshot": kind, "unit_snapshot": unit, "sku_snapshot": "E26-TEST",
        "quantity_milli": qty, "unit_price_cents": price,
        "line_total_cents": amount,
    }


def payment_values(business_id, sale_id, *, n=1, method="EFECTIVO", amount=1000):
    return {
        "id": uuid4(), "business_id": business_id, "sale_id": sale_id,
        "payment_number": n, "method": method,
        "amount_cents": amount, "reference": "Declarado, no acreditado",
    }


def movement_values(business_id, actor_id, item_id, location_id, sale_id, line_id,
                    *, delta=-1000):
    return {
        "id": uuid4(), "business_id": business_id, "location_id": location_id,
        "catalog_item_id": item_id,
        "receipt_id": None, "purchase_line_id": None,
        "inventory_operation_id": None, "operation_kind": None,
        "sale_id": sale_id, "sale_line_id": line_id,
        "actor_id": actor_id, "event_type": "VENTA_SALIDA",
        "delta_milli": delta,
    }


def rejects(db, model, values):
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.execute(insert(model).values(**values))


def test_service_only_sale_header_lines_and_payments_have_no_stock(isolated):
    client, db = isolated
    auth, actor_id = actor(client)
    tenant = business(client, auth)
    service = item(client, tenant, auth, name="Corte de pelo", kind="SERVICIO",
                   unit="SERVICIO", sku="S-26")
    sale = sale_values(tenant, actor_id, location_id=None, subtotal=2500,
                       discount=50, total=2450)
    db.execute(insert(Sale).values(**sale))
    db.execute(insert(SaleLine).values(**line_values(
        tenant, sale["id"], service, kind="SERVICIO", unit="SERVICIO",
        price=2500, amount=2500,
    )))
    for payment in (
        payment_values(tenant, sale["id"], n=1, amount=1000),
        payment_values(tenant, sale["id"], n=2, method="TRANSFERENCIA", amount=1450),
    ):
        db.execute(insert(SalePayment).values(**payment))
    assert db.execute(select(Sale.total_cents).where(Sale.id == sale["id"])).scalar_one() == 2450
    assert sum(db.execute(select(SalePayment.amount_cents).where(
        SalePayment.sale_id == sale["id"],
    )).scalars()) == 2450
    assert db.execute(select(StockMovement.id).where(
        StockMovement.business_id == tenant,
    )).all() == []


def test_sql_rejects_foreign_tenant_references_and_duplicate_request(isolated):
    client, db = isolated
    auth, actor_id = actor(client)
    a, b = business(client, auth), business(client, auth)
    foreign_catalog = item(client, b, auth, name="Producto B", sku="B-26")
    foreign_location = location(client, b, auth, name="Otro negocio")
    first = sale_values(a, actor_id)
    db.execute(insert(Sale).values(**first))
    rejects(db, Sale, {**first, "id": uuid4()})
    rejects(db, Sale, sale_values(a, actor_id, location_id=foreign_location))
    rejects(db, SaleLine, line_values(a, first["id"], foreign_catalog))
    rejects(db, SalePayment, payment_values(b, first["id"]))
    assert db.execute(select(Sale.id).where(Sale.business_id == a)).scalars().all() == [
        first["id"],
    ]


def test_money_and_discrete_quantity_constraints_reject_bad_sql(isolated):
    client, db = isolated
    auth, actor_id = actor(client)
    tenant = business(client, auth)
    physical = item(client, tenant, auth, name="Galletita QA E26", sku="GAL-E26")
    for subtotal, discount, total in ((1000, 1000, 0), (1000, 900, 200),
                                      (1000, -1, 1001)):
        rejects(db, Sale, sale_values(tenant, actor_id,
                                     subtotal=subtotal, discount=discount, total=total))
    sale = sale_values(tenant, actor_id)
    db.execute(insert(Sale).values(**sale))
    rejects(db, SaleLine, line_values(tenant, sale["id"], physical, qty=1500))
    rejects(db, SaleLine, line_values(tenant, sale["id"], physical, amount=1049))
    rejects(db, SalePayment, payment_values(tenant, sale["id"], amount=0))
    rejects(db, SalePayment, payment_values(tenant, sale["id"], method="ACREDITADO"))
    db.execute(insert(SaleLine).values(**line_values(tenant, sale["id"], physical)))
    db.execute(insert(SalePayment).values(**payment_values(tenant, sale["id"])))
    rejects(db, SalePayment, payment_values(tenant, sale["id"], method="EFECTIVO"))
    assert db.execute(select(SaleLine.id).where(SaleLine.business_id == tenant)).all()


def test_line_total_half_up_is_enforced_by_postgresql(isolated):
    client, db = isolated
    auth, actor_id = actor(client)
    tenant = business(client, auth)
    item_id = item(client, tenant, auth, name="Harina por peso", unit="KILOGRAMO",
                   sku="KG-E26")
    sale = sale_values(tenant, actor_id, subtotal=350, discount=0, total=350)
    db.execute(insert(Sale).values(**sale))
    line = line_values(tenant, sale["id"], item_id, unit="KILOGRAMO",
                       qty=333, price=1050, amount=350)
    db.execute(insert(SaleLine).values(**line))
    rejects(db, SaleLine, {**line, "id": uuid4(), "line_number": 2, "line_total_cents": 349})
    assert db.execute(select(SaleLine.line_total_cents).where(
        SaleLine.id == line["id"],
    )).scalar_one() == 350


def test_sale_movement_must_be_negative_one_per_line_and_same_sale(isolated):
    client, db = isolated
    auth, actor_id = actor(client)
    tenant = business(client, auth)
    warehouse = location(client, tenant, auth, can_sell=True, can_store=True)
    physical = item(client, tenant, auth, name="Alimento para vender", sku="VTA-E26")
    first = sale_values(tenant, actor_id, location_id=warehouse)
    second = sale_values(tenant, actor_id, location_id=warehouse)
    db.execute(insert(Sale).values(**first))
    db.execute(insert(Sale).values(**second))
    line1 = line_values(tenant, first["id"], physical)
    line2 = line_values(tenant, second["id"], physical)
    db.execute(insert(SaleLine).values(**line1))
    db.execute(insert(SaleLine).values(**line2))
    event = movement_values(tenant, actor_id, physical, warehouse,
                            first["id"], line1["id"])
    rejects(db, StockMovement, {**event, "delta_milli": 1000})
    rejects(db, StockMovement, {**event, "sale_id": second["id"]})
    rejects(db, StockMovement, {**event, "receipt_id": uuid4()})
    rejects(db, StockMovement, {**event, "sale_line_id": uuid4()})
    db.execute(insert(StockMovement).values(**event))
    rejects(db, StockMovement, {**event, "id": uuid4()})
    stored = db.execute(select(StockMovement.event_type, StockMovement.delta_milli).where(
        StockMovement.id == event["id"],
    )).one()
    assert (stored.event_type, stored.delta_milli) == ("VENTA_SALIDA", -1000)
