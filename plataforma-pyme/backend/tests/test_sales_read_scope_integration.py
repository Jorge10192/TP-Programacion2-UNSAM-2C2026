"""T09-C: visibilidad de ventas reales por tenant, rol y asignación de sede.

Pruebas con PostgreSQL efímero y transacción aislada por rollback.
No requieren cambios sobre empresas o stock del usuario.
"""
from datetime import datetime, timedelta, timezone
import os
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func, insert, select, update

from app.infrastructure.models import (
    Location, LocationAssignment, Membership, Sale,
)
from test_sales_api_integration import (
    auth, business, item, location, payload, post, isolated, sale_path,
)

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere PostgreSQL temporal migrado y RUN_DB_INTEGRATION=1",
    ),
]


def user(client):
    email = f"t09-reader-{uuid4().hex}@example.com"
    password = "Clave larga exclusiva para tests"
    registered = client.post("/api/v1/auth/register", json={
        "email": email, "password": password, "display_name": "Persona de sede",
    })
    assert registered.status_code == 201, registered.text
    logged = client.post("/api/v1/auth/login", json={
        "email": email, "password": password,
    })
    assert logged.status_code == 200, logged.text
    return {"Authorization": f"Bearer {logged.json()['access_token']}"}, UUID(registered.json()["id"])


def membership(db, business_id, user_id, role):
    db.execute(insert(Membership).values(
        id=uuid4(), business_id=business_id, user_id=user_id,
        role=role, status="ACTIVA",
    ))


def assign(db, business_id, location_id, user_id):
    db.execute(insert(LocationAssignment).values(
        business_id=business_id, location_id=location_id,
        user_id=user_id, status="ACTIVA",
    ))


def path(bid, suffix=""):
    return f"{sale_path(bid)}{suffix}"


def create(client, bid, headers, catalog_item_id, location_id=None, key=None):
    body = payload(catalog_item_id)
    if location_id is not None:
        body["location_id"] = str(location_id)
    key = key or uuid4()
    response = post(client, bid, headers, body, key=key)
    assert response.status_code == 201, response.text
    return response.json(), key, body


@pytest.mark.parametrize("role", ["TRABAJADOR", "ENCARGADO"])
def test_role_scopes_list_detail_request_and_no_location_sales(isolated, role):
    client, db = isolated
    owner = auth(client)
    bid = business(client, owner)
    a = location(client, bid, owner, name="Sede A T09")
    b = location(client, bid, owner, name="Sede B T09")
    product = item(client, bid, owner)
    sale_a, key_a, _ = create(client, bid, owner, product, a)
    sale_b, key_b, _ = create(client, bid, owner, product, b)
    sale_without_site, key_without_site, _ = create(client, bid, owner, product)

    employee, employee_id = user(client)
    membership(db, bid, employee_id, role)
    assign(db, bid, a, employee_id)

    visible = client.get(path(bid), headers=employee)
    assert visible.status_code == 200, visible.text
    assert [x["id"] for x in visible.json()] == [sale_a["id"]]
    assert "lines" not in visible.json()[0]
    assert "payments" not in visible.json()[0]

    assert client.get(path(bid, f"/{sale_a['id']}"), headers=employee).status_code == 200
    assert client.get(path(bid, f"/by-request/{key_a}"), headers=employee).json() == sale_a
    for sid, key in ((sale_b["id"], key_b), (sale_without_site["id"], key_without_site)):
        # Se oculta existencia de ventas sin derecho de lectura.
        assert client.get(path(bid, f"/{sid}"), headers=employee).status_code == 404
        assert client.get(path(bid, f"/by-request/{key}"), headers=employee).status_code == 404

    assert [x["id"] for x in client.get(
        path(bid, f"?location_id={a}"), headers=employee,
    ).json()] == [sale_a["id"]]
    assert client.get(path(bid, f"?location_id={b}"), headers=employee).json() == []

    # Titular ve todas las ventas, también las de servicios sin sede.
    all_owner = client.get(path(bid), headers=owner)
    assert all_owner.status_code == 200, all_owner.text
    assert {s["id"] for s in all_owner.json()} == {
        sale_a["id"], sale_b["id"], sale_without_site["id"],
    }


def test_admin_can_read_every_location_and_service_without_assignment(isolated):
    client, db = isolated
    owner = auth(client)
    bid = business(client, owner)
    a = location(client, bid, owner, name="Sede Admin A")
    b = location(client, bid, owner, name="Sede Admin B")
    product = item(client, bid, owner)
    records = [
        create(client, bid, owner, product, a)[0],
        create(client, bid, owner, product, b)[0],
        create(client, bid, owner, product)[0],
    ]
    admin, user_id = user(client)
    membership(db, bid, user_id, "ADMINISTRADOR")
    rows = client.get(path(bid), headers=admin)
    assert rows.status_code == 200
    assert {x["id"] for x in rows.json()} == {s["id"] for s in records}
    for s in records:
        assert client.get(path(bid, f"/{s['id']}"), headers=admin).status_code == 200
        assert client.get(path(bid, f"/by-request/{s['request_id']}"), headers=admin).status_code == 200


def test_assignment_revocation_denies_even_own_sale_and_its_original_key(isolated):
    client, db = isolated
    owner = auth(client)
    bid = business(client, owner)
    a = location(client, bid, owner, name="Sede revocación")
    product = item(client, bid, owner)
    set_price = client.patch(
        f"/api/v1/businesses/{bid}/catalog/{product}",
        headers=owner, json={"price_cents": 2000},
    )
    assert set_price.status_code == 200, set_price.text
    worker, worker_id = user(client)
    membership(db, bid, worker_id, "TRABAJADOR")
    assign(db, bid, a, worker_id)
    sale, key, original_body = create(client, bid, worker, product, a)

    db.execute(update(LocationAssignment).where(
        LocationAssignment.business_id == bid,
        LocationAssignment.location_id == a,
        LocationAssignment.user_id == worker_id,
    ).values(status="REVOCADA", revoked_at=func.now()))

    assert client.get(path(bid), headers=worker).json() == []
    assert client.get(path(bid, f"/{sale['id']}"), headers=worker).status_code == 404
    assert client.get(path(bid, f"/by-request/{key}"), headers=worker).status_code == 404
    # Replay POST conserva su política estricta previa: no hay acceso si perdió SELL.
    assert post(client, bid, worker, original_body, key=key).status_code == 403
    assert client.get(path(bid, f"/by-request/{key}"), headers=owner).status_code == 200
    assert db.scalar(select(func.count()).select_from(Sale).where(
        Sale.business_id == bid,
    )) == 1


def test_historical_read_survives_paused_location_but_not_revoked_assignment(isolated):
    client, db = isolated
    owner = auth(client)
    bid = business(client, owner)
    a = location(client, bid, owner, name="Sede pausada")
    product = item(client, bid, owner)
    sale, key, _ = create(client, bid, owner, product, a)
    worker, worker_id = user(client)
    membership(db, bid, worker_id, "TRABAJADOR")
    assign(db, bid, a, worker_id)

    db.execute(update(Location).where(Location.business_id == bid, Location.id == a)
               .values(status="PAUSADA", is_primary=False))
    # Una sede pausada no autoriza venta nueva, pero los documentos históricos
    # siguen visibles mientras la asignación continúe activa.
    assert client.get(path(bid, f"/by-request/{key}"), headers=worker).status_code == 200
    assert client.get(path(bid, f"/{sale['id']}"), headers=worker).status_code == 200
    assert post(client, bid, worker, payload(product) | {"location_id": str(a)}).status_code == 403


def test_revoked_membership_and_session_and_cross_tenant_are_denied(isolated):
    client, db = isolated
    owner = auth(client)
    bid = business(client, owner)
    foreign_company = business(client, owner)
    a = location(client, bid, owner, name="Sede aislada")
    product = item(client, bid, owner)
    sale, key, _ = create(client, bid, owner, product, a)
    worker, worker_id = user(client)
    membership(db, bid, worker_id, "ENCARGADO")
    assign(db, bid, a, worker_id)

    assert client.get(path(foreign_company), headers=worker).status_code == 404
    assert client.get(path(foreign_company, f"/{sale['id']}"), headers=owner).status_code == 404
    assert client.get(path(foreign_company, f"/by-request/{key}"), headers=owner).status_code == 404

    db.execute(update(Membership).where(
        Membership.business_id == bid, Membership.user_id == worker_id,
    ).values(status="INACTIVA"))
    assert client.get(path(bid), headers=worker).status_code == 404
    assert client.get(path(bid, f"/{sale['id']}"), headers=worker).status_code == 404
    assert client.get(path(bid, f"/by-request/{key}"), headers=worker).status_code == 404

    assert client.get(path(bid)).status_code == 401
    assert client.post("/api/v1/auth/logout", headers=owner).status_code in (200, 204)
    assert client.get(path(bid), headers=owner).status_code == 401


def test_pagination_filters_sql_before_offset_and_stable_tie_order(isolated):
    client, db = isolated
    owner = auth(client)
    bid = business(client, owner)
    a = location(client, bid, owner, name="Sede paginación")
    b = location(client, bid, owner, name="Sede no autorizada")
    product = item(client, bid, owner)
    initial_sale, _, _ = create(client, bid, owner, product, a)
    creator_id = UUID(initial_sale["created_by_id"])
    dt = datetime(2026, 11, 10, 12, 0, tzinfo=timezone.utc)

    rows = []
    for i in range(101):
        rows.append({
            "id": uuid4(), "business_id": bid, "location_id": a if i % 2 == 0 else b,
            "request_id": uuid4(), "request_sha256": "a" * 64,
            "status": "CONFIRMADA",
            "subtotal_cents": i + 1, "discount_cents": 0,
            "total_cents": i + 1, "notes": "", "created_by_id": creator_id,
            "created_at": dt + timedelta(seconds=i),
            "balances_after": [],
        })
    db.execute(insert(Sale), rows)

    worker, worker_id = user(client)
    membership(db, bid, worker_id, "TRABAJADOR")
    assign(db, bid, a, worker_id)

    visible = client.get(path(bid, "?offset=0&limit=100"), headers=worker)
    assert visible.status_code == 200, visible.text
    expected_count = 1 + sum(r["location_id"] == a for r in rows)
    assert len(visible.json()) == expected_count
    assert all(x["location_id"] == str(a) for x in visible.json())
    assert visible.json() == sorted(
        visible.json(), key=lambda x: (x["created_at"], x["id"]), reverse=True,
    )
    assert client.get(path(bid, "?offset=1&limit=2"), headers=worker).json() == visible.json()[1:3]
    assert client.get(path(bid, "?location_id=" + str(b)), headers=worker).json() == []

    first = client.get(path(bid, "?offset=0&limit=100"), headers=owner)
    second = client.get(path(bid, "?offset=100&limit=100"), headers=owner)
    assert first.status_code == 200 and second.status_code == 200
    assert len(first.json()) == 100
    assert len(second.json()) == 2
    ids = [s["id"] for s in first.json() + second.json()]
    assert len(ids) == len(set(ids)) == 102
    assert client.get(path(bid, "?offset=200&limit=100"), headers=owner).json() == []
    for bad in ("?offset=-1", "?limit=0", "?limit=101", "?location_id=DEMO"):
        assert client.get(path(bid, bad), headers=owner).status_code == 422
