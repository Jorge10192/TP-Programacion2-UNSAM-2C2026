"""E2-6 C: permisos y revocaciones en venta sin mutaciones ajenas al tenant.

Las pruebas usan la transaccion aislada de E2-6 B.
"""
import os
from uuid import uuid4

import pytest
from sqlalchemy import func, insert, select, update

from app.infrastructure.models import LocationAssignment, Membership, Sale
from test_sales_api_integration import isolated, auth, business, item, location, payload, post

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere PostgreSQL migrado y RUN_DB_INTEGRATION=1",
    ),
]


def count_sales(db, business_id):
    return db.scalar(select(func.count()).select_from(Sale).where(
        Sale.business_id == business_id,
    ))


@pytest.mark.parametrize("role", ["TRABAJADOR", "ENCARGADO"])
def test_operational_role_requires_active_location_assignment(isolated, role):
    client, db = isolated
    owner = auth(client)
    # Crear operador con ID comprobable y sesion propia.
    from uuid import UUID
    email = f"sales-operator-{uuid4().hex}@example.com"
    password = "Clave exclusiva larga para pruebas"
    made = client.post("/api/v1/auth/register", json={
        "email": email, "password": password, "display_name": "Operador de prueba",
    })
    assert made.status_code == 201, made.text
    operator_id = UUID(made.json()["id"])
    login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200, login.text
    employee = {"Authorization": f"Bearer {login.json()['access_token']}"}

    bid = business(client, owner)
    lid = location(client, bid, owner)
    iid = item(client, bid, owner)
    # T10-P01: el operador vende exclusivamente al precio del catálogo.
    priced = client.patch(f"/api/v1/businesses/{bid}/catalog/{iid}",
                          headers=owner, json={"price_cents": 2000})
    assert priced.status_code == 200, priced.text
    body = payload(iid)
    body["location_id"] = str(lid)

    db.execute(insert(Membership).values(
        id=uuid4(), business_id=bid, user_id=operator_id,
        role=role, status="ACTIVA",
    ))
    assert post(client, bid, employee, body).status_code == 403
    db.execute(insert(LocationAssignment).values(
        business_id=bid, location_id=lid, user_id=operator_id, status="ACTIVA",
    ))
    sale_key = uuid4()
    created = post(client, bid, employee, body, key=sale_key)
    assert created.status_code == 201, created.text
    assert created.json()["location_id"] == str(lid)
    assert post(client, bid, employee, payload(iid)).status_code == 403

    db.execute(update(LocationAssignment).where(
        LocationAssignment.business_id == bid,
        LocationAssignment.location_id == lid,
        LocationAssignment.user_id == operator_id,
    ).values(status="REVOCADA", revoked_at=func.now()))
    denied_new = post(client, bid, employee, body, key=uuid4())
    assert denied_new.status_code == 403
    denied_replay = post(client, bid, employee, body, key=sale_key)
    assert denied_replay.status_code == 403
    assert count_sales(db, bid) == 1


def test_revoked_membership_cannot_replay_previously_created_sale(isolated):
    client, db = isolated
    owner = auth(client)
    bid = business(client, owner)
    iid = item(client, bid, owner)
    # Primero crear la venta, luego revocar la membresia del actor.
    key = uuid4()
    body = payload(iid)
    first = post(client, bid, owner, body, key=key)
    assert first.status_code == 201, first.text
    actor_id = db.scalar(select(Membership.user_id).where(
        Membership.business_id == bid, Membership.role == "TITULAR_ADMINISTRATIVO",
    ))
    db.execute(update(Membership).where(
        Membership.business_id == bid, Membership.user_id == actor_id,
    ).values(status="INACTIVA"))
    assert post(client, bid, owner, body, key=key).status_code == 404
    assert count_sales(db, bid) == 1


def test_revoked_session_rejects_sale_without_side_effects(isolated):
    client, db = isolated
    owner = auth(client)
    bid = business(client, owner)
    iid = item(client, bid, owner)
    assert client.post("/api/v1/auth/logout", headers=owner).status_code in (200, 204)
    response = post(client, bid, owner, payload(iid))
    assert response.status_code == 401
    assert count_sales(db, bid) == 0
