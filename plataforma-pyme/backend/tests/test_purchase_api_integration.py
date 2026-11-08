"""E2-4 D: pruebas REST reales sobre PostgreSQL 16, aisladas por rollback."""
import os
from collections.abc import Iterator
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, insert, select, update
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.infrastructure.db import get_engine
from app.infrastructure.models import (
    AuthSession, Business, CatalogItem, Location, Membership, Purchase, PurchaseLine, Supplier, StockBalance, StockMovement,
)
from app.main import create_app

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere PostgreSQL e24d_purchase_hash migrado y RUN_DB_INTEGRATION=1",
    ),
]


@pytest.fixture
def isolated() -> Iterator[tuple[TestClient, object]]:
    with get_engine().connect() as db:
        outer = db.begin()
        app = create_app()

        def override_db() -> Iterator[Session]:
            with Session(bind=db, join_transaction_mode="create_savepoint") as session:
                yield session

        app.dependency_overrides[get_db] = override_db
        try:
            with TestClient(app) as client:
                yield client, db
        finally:
            app.dependency_overrides.clear()
            outer.rollback()


def actor(client):
    email = f"purchases-api-{uuid4().hex}@example.com"
    password = "Clave exclusiva larga para pruebas"
    reg = client.post("/api/v1/auth/register", json={
        "email": email, "password": password, "display_name": "Usuario de compras",
    })
    assert reg.status_code == 201, reg.text
    login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200, login.text
    return {"Authorization": f"Bearer {login.json()['access_token']}"}, UUID(reg.json()["id"])


def business(client, headers):
    made = client.post("/api/v1/businesses", headers={
        **headers, "Idempotency-Key": str(uuid4()),
    }, json={"name": "Negocio compra", "category": "Multirrubro", "activity_kind": "MIXTO"})
    assert made.status_code == 201, made.text
    return UUID(made.json()["id"])


def supplier(client, bid, headers):
    made = client.post(f"/api/v1/businesses/{bid}/suppliers", headers=headers,
                       json={"name": "Proveedor original"})
    assert made.status_code == 201, made.text
    return UUID(made.json()["id"])


def item(client, bid, headers, *, name="Artículo original", kind="REVENTA",
         unit="UNIDAD", sku="PRU-01"):
    made = client.post(f"/api/v1/businesses/{bid}/catalog", headers=headers, json={
        "name": name, "kind": kind, "unit": unit, "sku": sku, "sellable": True,
    })
    assert made.status_code == 201, made.text
    return UUID(made.json()["id"])


def path(bid, pid=None):
    return f"/api/v1/businesses/{bid}/purchases" + (f"/{pid}" if pid else "")


def line(item_id=None, *, description="Concepto libre", unit="CONCEPTO",
         quantity_milli=1000, unit_cost_cents=155):
    return {
        "catalog_item_id": str(item_id) if item_id else None,
        "description": description, "unit": unit,
        "quantity_milli": quantity_milli, "unit_cost_cents": unit_cost_cents,
    }


def payload(*lines, supplier_id=None, **kwargs):
    d = {
        "purchased_on": "2026-11-08",
        "supplier_id": str(supplier_id) if supplier_id else None,
        "reference": "FC-001", "notes": "Compra de prueba",
        "lines": list(lines) if lines else [line()],
    }
    d.update(kwargs)
    return d


def create(client, bid, headers, body=None, *, key=None):
    return client.post(path(bid), headers={
        **headers, "Idempotency-Key": str(key or uuid4()),
    }, json=body if body is not None else payload())


def test_mixed_purchase_and_snapshots_survive_catalog_supplier_edits(isolated):
    client, db = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    sid = supplier(client, bid, auth)
    physical = item(client, bid, auth, unit="KILOGRAMO")
    service = item(client, bid, auth, name="Flete", kind="SERVICIO", unit="SERVICIO", sku="SRV-1")
    response = create(client, bid, auth, payload(
        line(physical, description="Entrada con nombre de cliente ignorado",
             unit="KILOGRAMO", quantity_milli=500, unit_cost_cents=12505),
        line(service, description="Costo flete", unit="SERVICIO", unit_cost_cents=2000),
        line(description="Impuestos varios", quantity_milli=1000, unit_cost_cents=150),
        supplier_id=sid,
    ))
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["business_id"] == str(bid)
    assert data["supplier_id"] == str(sid)
    assert data["supplier_name_snapshot"] == "Proveedor original"
    assert data["status"] == "REGISTRADA" and data["total_cents"] == 8403
    assert [(x["kind_snapshot"], x["unit_snapshot"]) for x in data["lines"]] == [
        ("BIEN", "KILOGRAMO"), ("SERVICIO", "SERVICIO"), ("CONCEPTO", "CONCEPTO"),
    ]
    assert [x["line_total_cents"] for x in data["lines"]] == [6253, 2000, 150]
    assert data["lines"][0]["description_snapshot"] == "Artículo original"
    assert data["lines"][0]["sku_snapshot"] == "PRU-01"
    assert data["lines"][2]["catalog_item_id"] is None
    assert db.execute(select(Location.id).where(Location.business_id == bid)).all() == []
    assert db.execute(select(StockBalance).where(StockBalance.business_id == bid)).all() == []
    assert db.execute(select(StockMovement).where(StockMovement.business_id == bid)).all() == []
    assert client.get(path(bid, data["id"]), headers=auth).json() == data
    assert client.get(path(bid), headers=auth).json() == [data]
    changed = client.patch(f"/api/v1/businesses/{bid}/suppliers/{sid}",
                           headers=auth, json={"name": "Proveedor nuevo"})
    assert changed.status_code == 200, changed.text
    changed_item = client.patch(f"/api/v1/businesses/{bid}/catalog/{physical}",
                                headers=auth, json={"name": "Producto nuevo", "sku": "CAMBIO"})
    assert changed_item.status_code == 200, changed_item.text
    preserved = client.get(path(bid, data["id"]), headers=auth).json()
    assert preserved == data


def test_concept_only_does_not_require_location_catalog_or_supplier(isolated):
    client, db = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    made = create(client, bid, auth, payload(line(
        description="Servicio externo libre", quantity_milli=2000, unit_cost_cents=300,
    )))
    assert made.status_code == 201, made.text
    doc = made.json()
    assert doc["total_cents"] == 600
    assert doc["status"] == "CERRADA_SIN_RECEPCION"
    assert doc["supplier_id"] is None and doc["supplier_name_snapshot"] == ""
    assert len(doc["lines"]) == 1 and doc["lines"][0]["kind_snapshot"] == "CONCEPTO"
    assert db.execute(select(Location.id).where(Location.business_id == bid)).all() == []


def test_service_only_is_closed_and_does_not_create_stock(isolated):
    client, db = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    sid = item(client, bid, auth, kind="SERVICIO", unit="SERVICIO")
    made = create(client, bid, auth, payload(line(
        sid, description="Servicio original", unit="SERVICIO",
    )))
    assert made.status_code == 201, made.text
    assert made.json()["status"] == "CERRADA_SIN_RECEPCION"
    assert db.execute(select(Location.id).where(Location.business_id == bid)).all() == []


def test_retries_return_same_purchase_and_reused_key_with_new_data_conflicts(isolated):
    client, db = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    rid = uuid4()
    body = payload(line(description="Impuesto", quantity_milli=1000))
    first = create(client, bid, auth, body, key=rid)
    assert first.status_code == 201, first.text
    replay = create(client, bid, auth, body, key=rid)
    assert replay.status_code == 200, replay.text
    assert first.json() == replay.json()
    clash = create(client, bid, auth, payload(line(description="Otro concepto")), key=rid)
    assert clash.status_code == 409, clash.text
    assert db.execute(select(func.count()).select_from(Purchase).where(
        Purchase.business_id == bid,
    )).scalar_one() == 1
    assert db.execute(select(func.count()).select_from(PurchaseLine).where(
        PurchaseLine.business_id == bid,
    )).scalar_one() == 1
    assert len(db.execute(select(Purchase.request_sha256).where(
        Purchase.business_id == bid,
    )).scalar_one()) == 64


def test_same_key_in_different_tenants_is_legal_and_isolated(isolated):
    client, _ = isolated
    auth, _ = actor(client)
    a, b = business(client, auth), business(client, auth)
    key = uuid4()
    first = create(client, a, auth, key=key)
    second = create(client, b, auth, key=key)
    assert first.status_code == second.status_code == 201
    assert first.json()["id"] != second.json()["id"]
    assert client.get(path(a, second.json()["id"]), headers=auth).status_code == 404
    assert client.get(path(b, first.json()["id"]), headers=auth).status_code == 404


def test_cannot_use_another_tenants_supplier_or_item(isolated):
    client, db = isolated
    auth, _ = actor(client)
    a, b = business(client, auth), business(client, auth)
    foreign_supplier = supplier(client, b, auth)
    foreign_item = item(client, b, auth)
    for body in (
        payload(supplier_id=foreign_supplier),
        payload(line(foreign_item, unit="UNIDAD")),
    ):
        denied = create(client, a, auth, body)
        assert denied.status_code == 422, denied.text
    assert db.execute(select(Purchase.id).where(Purchase.business_id == a)).all() == []


@pytest.mark.parametrize("which", ["supplier", "item", "unit"])
def test_inactive_reference_or_mismatched_unit_is_rejected(isolated, which):
    client, db = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    sid = supplier(client, bid, auth)
    iid = item(client, bid, auth)
    if which == "supplier":
        assert client.patch(f"/api/v1/businesses/{bid}/suppliers/{sid}/status",
                            headers=auth, json={"status": "INACTIVO"}).status_code == 200
        body = payload(supplier_id=sid)
    elif which == "item":
        assert client.patch(f"/api/v1/businesses/{bid}/catalog/{iid}/status",
                            headers=auth, json={"status": "INACTIVO"}).status_code == 200
        body = payload(line(iid, unit="UNIDAD"))
    else:
        body = payload(line(iid, unit="KILOGRAMO"))
    invalid = create(client, bid, auth, body)
    assert invalid.status_code == 422, invalid.text
    assert db.execute(select(Purchase.id).where(Purchase.business_id == bid)).all() == []


def test_role_permissions_and_business_suspension(isolated):
    client, db = isolated
    owner, _ = actor(client)
    colleague, user_id = actor(client)
    bid = business(client, owner)
    purchase_id = create(client, bid, owner).json()["id"]
    for role, allowed in (("ADMINISTRADOR", True), ("ENCARGADO", False),
                          ("TRABAJADOR", False)):
        existing = db.execute(select(Membership.id).where(
            Membership.business_id == bid, Membership.user_id == user_id,
        )).scalar_one_or_none()
        if existing is None:
            db.execute(insert(Membership).values(
                id=uuid4(), business_id=bid, user_id=user_id,
                role=role, status="ACTIVA",
            ))
        else:
            db.execute(update(Membership).where(Membership.id == existing).values(role=role))
        assert client.get(path(bid), headers=colleague).status_code == 200
        assert client.get(path(bid, purchase_id), headers=colleague).status_code == 200
        made = create(client, bid, colleague, payload(
            line(description=f"Compra por {role}"),
        ))
        assert made.status_code == (201 if allowed else 403), made.text
    db.execute(update(Business).where(Business.id == bid).values(status="SUSPENDIDA"))
    assert client.get(path(bid), headers=owner).status_code == 200
    assert create(client, bid, owner).status_code == 409


def test_foreign_actor_and_inactive_membership_rejected(isolated):
    client, db = isolated
    alice, alice_id = actor(client)
    bob, _ = actor(client)
    bid = business(client, alice)
    pid = create(client, bid, alice).json()["id"]
    assert client.get(path(bid), headers=bob).status_code == 404
    assert client.get(path(bid, pid), headers=bob).status_code == 404
    assert create(client, bid, bob).status_code == 404
    db.execute(update(Membership).where(
        Membership.user_id == alice_id, Membership.business_id == bid,
    ).values(status="INACTIVA"))
    assert client.get(path(bid), headers=alice).status_code == 404
    assert create(client, bid, alice).status_code == 404


def test_revoked_session_cannot_access_purchase_routes(isolated):
    client, _ = isolated
    owner, _ = actor(client)
    bid = business(client, owner)
    pid = create(client, bid, owner).json()["id"]
    assert client.post("/api/v1/auth/logout", headers=owner).status_code == 204
    assert client.get(path(bid), headers=owner).status_code == 401
    assert client.get(path(bid, pid), headers=owner).status_code == 401
    assert create(client, bid, owner).status_code == 401


@pytest.mark.parametrize("invalid", [
    {"lines": []},
    {"lines": [{"catalog_item_id": None, "description": "Algo",
                "unit": "CONCEPTO", "quantity_milli": 500, "unit_cost_cents": 1}]},
    {"status": "RECIBIDA"},
    {"location_id": str(uuid4())},
    {"total_cents": 50},
    {"lines": [{"catalog_item_id": None, "description": "Concepto",
                "unit": "CONCEPTO", "quantity_milli": 1000, "unit_cost_cents": -1}]},
])
def test_invalid_request_no_purchase_insert(isolated, invalid):
    client, db = isolated
    owner, _ = actor(client)
    bid = business(client, owner)
    req = payload(**invalid)
    denied = create(client, bid, owner, req)
    assert denied.status_code == 422, denied.text
    assert db.execute(select(Purchase.id).where(Purchase.business_id == bid)).all() == []


def test_missing_or_malformed_idempotency_header_is_rejected(isolated):
    client, db = isolated
    owner, _ = actor(client)
    bid = business(client, owner)
    resp = client.post(path(bid), headers=owner, json=payload())
    assert resp.status_code == 422
    resp = client.post(path(bid), headers={
        **owner, "Idempotency-Key": "not-a-uuid",
    }, json=payload())
    assert resp.status_code == 422
    assert db.execute(select(Purchase.id).where(Purchase.business_id == bid)).all() == []


def test_read_pagination_safety(isolated):
    client, _ = isolated
    owner, _ = actor(client)
    bid = business(client, owner)
    for title in ("A", "B", "C"):
        assert create(client, bid, owner, payload(line(description=f"Concepto {title}"))).status_code == 201
    response = client.get(path(bid), headers=owner, params={"offset": 1, "limit": 1})
    assert response.status_code == 200
    assert len(response.json()) == 1
    for params in (
        {"offset": -1}, {"offset": "9223372036854775808"}, {"limit": 0}, {"limit": 501},
    ):
        assert client.get(path(bid), headers=owner, params=params).status_code == 422


def test_rollback_after_lines_flush_if_view_serialization_fails(isolated, monkeypatch):
    from app.modules.purchases.schemas import PurchaseView

    client, db = isolated
    owner, _ = actor(client)
    bid = business(client, owner)

    def fail(*_args):
        raise RuntimeError("Error de serialización tras flush")

    with monkeypatch.context() as patch:
        patch.setattr(PurchaseView, "from_records", fail)
        with pytest.raises(RuntimeError, match="tras flush"):
            create(client, bid, owner)
    assert db.execute(select(Purchase.id).where(Purchase.business_id == bid)).all() == []
    assert db.execute(select(PurchaseLine.id).where(PurchaseLine.business_id == bid)).all() == []


def test_replay_is_not_available_for_different_actor_even_if_same_payload(isolated):
    client, db = isolated
    owner, _ = actor(client)
    colleague, colleague_id = actor(client)
    bid = business(client, owner)
    db.execute(insert(Membership).values(
        id=uuid4(), business_id=bid, user_id=colleague_id,
        role="ADMINISTRADOR", status="ACTIVA",
    ))
    key = uuid4()
    assert create(client, bid, owner, key=key).status_code == 201
    assert create(client, bid, colleague, key=key).status_code == 409
    assert len(db.execute(select(Purchase.id).where(Purchase.business_id == bid)).all()) == 1
