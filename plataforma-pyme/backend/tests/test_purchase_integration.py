"""E2-4 C: pruebas reales PostgreSQL 16; siempre rollback de la transacción exterior.

Las inserciones directas ejercitan FKs/CHECK/UNIQUE del esquema; no son
endpoints de Compras. E2-4 D implementará el comando comercial atómico.
"""
import os
from collections.abc import Iterator
from datetime import date
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import insert, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.infrastructure.db import get_engine
from app.infrastructure.models import CatalogItem, Location, Purchase, PurchaseLine, Supplier
from app.main import create_app

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere PostgreSQL con migracion e24c_purchases y RUN_DB_INTEGRATION=1",
    ),
]


@pytest.fixture
def isolated() -> Iterator[tuple[TestClient, object]]:
    with get_engine().connect() as connection:
        outer = connection.begin()
        app = create_app()

        def override_db() -> Iterator[Session]:
            with Session(bind=connection, join_transaction_mode="create_savepoint") as db:
                yield db

        app.dependency_overrides[get_db] = override_db
        try:
            with TestClient(app) as client:
                yield client, connection
        finally:
            app.dependency_overrides.clear()
            outer.rollback()


def actor(client: TestClient) -> tuple[dict[str, str], UUID]:
    email = f"purchase-db-{uuid4().hex}@example.com"
    password = "Clave larga exclusiva de estas pruebas"
    registered = client.post("/api/v1/auth/register", json={
        "email": email, "password": password, "display_name": "Usuario compras",
    })
    assert registered.status_code == 201, registered.text
    logged = client.post("/api/v1/auth/login", json={
        "email": email, "password": password,
    })
    assert logged.status_code == 200, logged.text
    return {"Authorization": f"Bearer {logged.json()['access_token']}"}, UUID(registered.json()["id"])


def business(client: TestClient, auth: dict[str, str]) -> UUID:
    made = client.post("/api/v1/businesses", headers={
        **auth, "Idempotency-Key": str(uuid4()),
    }, json={
        "name": "Tienda de prueba compras", "category": "Multirrubro",
        "activity_kind": "MIXTO",
    })
    assert made.status_code == 201, made.text
    return UUID(made.json()["id"])


def supplier(client: TestClient, bid: UUID, auth: dict[str, str]) -> UUID:
    made = client.post(f"/api/v1/businesses/{bid}/suppliers", headers=auth,
                       json={"name": "Proveedor histórico"})
    assert made.status_code == 201, made.text
    return UUID(made.json()["id"])


def catalog(client: TestClient, bid: UUID, auth: dict[str, str],
            *, kind: str = "REVENTA", unit: str = "UNIDAD",
            name: str = "Artículo histórico") -> UUID:
    made = client.post(f"/api/v1/businesses/{bid}/catalog", headers=auth, json={
        "name": name, "kind": kind, "unit": unit, "sellable": True,
    })
    assert made.status_code == 201, made.text
    return UUID(made.json()["id"])


def purchase_values(bid: UUID, owner: UUID, **overrides):
    defaults = {
        "id": uuid4(), "business_id": bid, "request_id": uuid4(),
        "supplier_id": None, "supplier_name_snapshot": "",
        "purchased_on": date(2026, 11, 8), "status": "REGISTRADA",
        "total_cents": 101, "reference": "", "notes": "",
        "created_by_id": owner,
    }
    defaults.update(overrides)
    return defaults


def line_values(bid: UUID, purchase_id: UUID, item_id: UUID | None = None,
                **overrides):
    defaults = {
        "id": uuid4(), "business_id": bid, "purchase_id": purchase_id,
        "line_number": 1, "catalog_item_id": item_id,
        "description_snapshot": "Producto histórico",
        "kind_snapshot": "BIEN" if item_id else "CONCEPTO",
        "unit_snapshot": "UNIDAD" if item_id else "CONCEPTO",
        "sku_snapshot": "", "quantity_milli": 1000,
        "unit_cost_cents": 101, "line_total_cents": 101,
    }
    defaults.update(overrides)
    return defaults


def must_reject(db, table, values) -> None:
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.execute(insert(table).values(**values))


def test_mixed_purchase_snapshots_are_persistent_and_no_stock_is_created(isolated):
    client, db = isolated
    auth, owner = actor(client)
    bid = business(client, auth)
    sid = supplier(client, bid, auth)
    good = catalog(client, bid, auth, unit="KILOGRAMO", name="Harina")
    service = catalog(client, bid, auth, kind="SERVICIO",
                      unit="SERVICIO", name="Flete")
    pid = uuid4()
    db.execute(insert(Purchase).values(**purchase_values(
        bid, owner, id=pid, supplier_id=sid,
        supplier_name_snapshot="Proveedor histórico",
        status="REGISTRADA", total_cents=8403,
        reference="FACT-0001", notes="Compra antes de recepción",
    )))
    lines = [
        line_values(bid, pid, good, line_number=1, description_snapshot="Harina",
                    kind_snapshot="BIEN", unit_snapshot="KILOGRAMO",
                    quantity_milli=500, unit_cost_cents=12505, line_total_cents=6253),
        line_values(bid, pid, service, line_number=2, description_snapshot="Flete",
                    kind_snapshot="SERVICIO", unit_snapshot="SERVICIO",
                    quantity_milli=1000, unit_cost_cents=2000, line_total_cents=2000),
        line_values(bid, pid, line_number=3, description_snapshot="Impuesto libre",
                    kind_snapshot="CONCEPTO", unit_snapshot="CONCEPTO",
                    quantity_milli=1000, unit_cost_cents=150, line_total_cents=150),
    ]
    for item in lines:
        db.execute(insert(PurchaseLine).values(**item))

    purchase = db.execute(select(
        Purchase.total_cents, Purchase.status, Purchase.supplier_name_snapshot,
    ).where(Purchase.id == pid)).one()
    stored = db.execute(select(
        PurchaseLine.kind_snapshot, PurchaseLine.quantity_milli,
        PurchaseLine.unit_snapshot, PurchaseLine.catalog_item_id,
        PurchaseLine.line_total_cents,
    ).where(PurchaseLine.purchase_id == pid).order_by(PurchaseLine.line_number)).all()
    assert purchase.total_cents == sum(line.line_total_cents for line in stored) == 8403
    assert purchase.status == "REGISTRADA" and len(stored) == 3
    assert [l.kind_snapshot for l in stored] == ["BIEN", "SERVICIO", "CONCEPTO"]
    assert stored[0].quantity_milli == 500 and stored[0].unit_snapshot == "KILOGRAMO"
    assert stored[2].catalog_item_id is None
    assert purchase.supplier_name_snapshot == "Proveedor histórico"
    assert db.execute(select(Location.id).where(Location.business_id == bid)).all() == []

    changed_supplier = client.patch(f"/api/v1/businesses/{bid}/suppliers/{sid}",
                                    headers=auth, json={"name": "Proveedor nuevo"})
    changed_catalog = client.patch(f"/api/v1/businesses/{bid}/catalog/{good}",
                                   headers=auth, json={"name": "Harina nueva"})
    assert changed_supplier.status_code == 200, changed_supplier.text
    assert changed_catalog.status_code == 200, changed_catalog.text
    assert db.execute(select(Purchase.supplier_name_snapshot).where(
        Purchase.id == pid,
    )).scalar_one() == "Proveedor histórico"
    assert db.execute(select(PurchaseLine.description_snapshot).where(
        PurchaseLine.id == lines[0]["id"],
    )).scalar_one() == "Harina"


def test_concept_only_purchase_needs_no_supplier_catalog_or_location(isolated):
    client, db = isolated
    auth, owner = actor(client)
    bid = business(client, auth)
    values = purchase_values(bid, owner, status="CERRADA_SIN_RECEPCION", total_cents=250)
    db.execute(insert(Purchase).values(**values))
    db.execute(insert(PurchaseLine).values(**line_values(
        bid, values["id"], description_snapshot="Tasa administrativa",
        quantity_milli=1000, unit_cost_cents=250, line_total_cents=250,
    )))
    saved = db.execute(select(
        Purchase.supplier_id, Purchase.supplier_name_snapshot, Purchase.status,
    ).where(Purchase.id == values["id"])).one()
    assert saved.supplier_id is None and saved.supplier_name_snapshot == ""
    assert saved.status == "CERRADA_SIN_RECEPCION"
    assert db.execute(select(CatalogItem.id).where(CatalogItem.business_id == bid)).all() == []
    assert db.execute(select(Location.id).where(Location.business_id == bid)).all() == []


def test_purchase_rejects_supplier_or_creator_from_other_company(isolated):
    client, db = isolated
    auth_a, actor_a = actor(client)
    auth_b, actor_b = actor(client)
    a, b = business(client, auth_a), business(client, auth_b)
    foreign_supplier = supplier(client, b, auth_b)
    must_reject(db, Purchase, purchase_values(
        a, actor_a, supplier_id=foreign_supplier,
        supplier_name_snapshot="Proveedor histórico",
    ))
    must_reject(db, Purchase, purchase_values(a, actor_b))
    assert db.execute(select(Purchase.id).where(Purchase.business_id == a)).all() == []


def test_line_rejects_catalog_or_purchase_belonging_to_another_tenant(isolated):
    client, db = isolated
    auth, owner = actor(client)
    a, b = business(client, auth), business(client, auth)
    item_a = catalog(client, a, auth)
    item_b = catalog(client, b, auth)
    values = purchase_values(a, owner)
    db.execute(insert(Purchase).values(**values))
    must_reject(db, PurchaseLine, line_values(a, values["id"], item_b))
    must_reject(db, PurchaseLine, line_values(b, values["id"], item_b))
    db.execute(insert(PurchaseLine).values(**line_values(a, values["id"], item_a)))
    assert len(db.execute(select(PurchaseLine.id)).all()) == 1


@pytest.mark.parametrize("change", [
    {"line_number": 0}, {"line_number": 31},
    {"quantity_milli": 0}, {"quantity_milli": 500},
    {"unit_cost_cents": -1}, {"line_total_cents": 100},
    {"kind_snapshot": "SERVICIO"}, {"unit_snapshot": "CONCEPTO"},
    {"description_snapshot": "x"}, {"quantity_milli": 1000000000},
])
def test_line_check_constraints_reject_invalid_values(isolated, change):
    client, db = isolated
    auth, owner = actor(client)
    bid = business(client, auth)
    good = catalog(client, bid, auth)
    purchase = purchase_values(bid, owner)
    db.execute(insert(Purchase).values(**purchase))
    must_reject(db, PurchaseLine, line_values(bid, purchase["id"], good, **change))
    assert db.execute(select(PurchaseLine.id)).all() == []


def test_half_up_uses_numeric_scale_even_for_fractional_quantity(isolated):
    client, db = isolated
    auth, owner = actor(client)
    bid = business(client, auth)
    item = catalog(client, bid, auth, unit="KILOGRAMO")
    purchase = purchase_values(bid, owner, total_cents=2)
    db.execute(insert(Purchase).values(**purchase))
    half_up = line_values(bid, purchase["id"], item,
                          unit_snapshot="KILOGRAMO", quantity_milli=500,
                          unit_cost_cents=3, line_total_cents=2)
    db.execute(insert(PurchaseLine).values(**half_up))
    assert db.execute(select(PurchaseLine.line_total_cents)).scalar_one() == 2
    must_reject(db, PurchaseLine, {
        **half_up, "id": uuid4(), "line_number": 2, "line_total_cents": 1,
    })


def test_request_is_unique_inside_tenant_but_reusable_in_other_tenant(isolated):
    client, db = isolated
    auth, owner = actor(client)
    a, b = business(client, auth), business(client, auth)
    request_id = uuid4()
    first = purchase_values(a, owner, request_id=request_id)
    db.execute(insert(Purchase).values(**first))
    must_reject(db, Purchase, purchase_values(a, owner, request_id=request_id))
    second = purchase_values(b, owner, request_id=request_id)
    db.execute(insert(Purchase).values(**second))
    assert {row[0] for row in db.execute(select(Purchase.business_id)).all()} == {a, b}


def test_duplicate_line_number_is_rejected_without_losing_first_line(isolated):
    client, db = isolated
    auth, owner = actor(client)
    bid = business(client, auth)
    good = catalog(client, bid, auth)
    purchase = purchase_values(bid, owner)
    db.execute(insert(Purchase).values(**purchase))
    db.execute(insert(PurchaseLine).values(**line_values(bid, purchase["id"], good)))
    must_reject(db, PurchaseLine, line_values(bid, purchase["id"], good))
    assert len(db.execute(select(PurchaseLine.id)).all()) == 1


def test_invalid_header_values_cannot_be_persisted(isolated):
    client, db = isolated
    auth, owner = actor(client)
    bid = business(client, auth)
    for bad in (
        {"total_cents": -1},
        {"total_cents": 100000000000},
        {"status": "PARCIALMENTE_RECIBIDA"},
        {"purchased_on": date(1999, 12, 31)},
        {"supplier_name_snapshot": "Nombre sin proveedor"},
    ):
        must_reject(db, Purchase, purchase_values(bid, owner, **bad))
    assert db.execute(select(Purchase.id)).all() == []


def test_e24e_publishes_complete_receive_and_inventory_read_only() -> None:
    with TestClient(create_app()) as client:
        paths = client.get("/openapi.json").json()["paths"]
    assert any("/purchases" in path for path in paths)
    assert any("/receive" in path for path in paths)
    assert any("/inventory/balances" in path for path in paths)
    assert not any("/partial" in path for path in paths)
