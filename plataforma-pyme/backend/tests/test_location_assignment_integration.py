"""Pruebas PostgreSQL reales E2-2 D: aislamiento, roles, revocación y rollback."""
import os
from collections.abc import Iterator
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import insert, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.infrastructure.db import get_engine
from app.infrastructure.models import Business, LocationAssignment, Membership
from app.main import create_app
from app.modules.locations import assignment_repository

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.getenv("RUN_DB_INTEGRATION") != "1",
        reason="Requiere PostgreSQL migrado a e22d_assignments y RUN_DB_INTEGRATION=1",
    ),
]


@pytest.fixture
def ctx() -> Iterator[tuple[TestClient, object]]:
    with get_engine().connect() as conn:
        outer = conn.begin()
        app = create_app()
        def db_override():
            with Session(bind=conn, join_transaction_mode="create_savepoint") as session:
                yield session
        app.dependency_overrides[get_db] = db_override
        try:
            with TestClient(app) as client:
                yield client, conn
        finally:
            app.dependency_overrides.clear()
            outer.rollback()


def actor(client):
    email = f"assign-{uuid4().hex}@example.com"
    password = "Una contraseña segura para integración"
    reg = client.post("/api/v1/auth/register", json={
        "email": email, "password": password, "display_name": "Persona de prueba",
    })
    assert reg.status_code == 201, reg.text
    login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200, login.text
    return {"Authorization": f"Bearer {login.json()['access_token']}"}, UUID(reg.json()["id"])


def business(client, auth):
    r = client.post("/api/v1/businesses", headers={
        **auth, "Idempotency-Key": str(uuid4()),
    }, json={"name": "Empresa prueba", "category": "Multirrubro", "activity_kind": "MIXTO"})
    assert r.status_code == 201, r.text
    return UUID(r.json()["id"])


def location(client, bid, auth):
    r = client.post(f"/api/v1/businesses/{bid}/locations", headers=auth, json={
        "name": "Casa Central", "kind": "CASA", "can_sell": True, "can_store": True,
    })
    assert r.status_code == 201, r.text
    return UUID(r.json()["id"])


def member(conn, bid, uid, role="TRABAJADOR", status="ACTIVA"):
    mid = uuid4()
    conn.execute(insert(Membership).values(
        id=mid, business_id=bid, user_id=uid, role=role, status=status,
    ))
    return mid


def url(bid, lid, mid=None):
    path = f"/api/v1/businesses/{bid}/locations/{lid}/assignments"
    return path if mid is None else f"{path}/{mid}"


def change(client, bid, lid, mid, auth, status="ACTIVA"):
    return client.put(url(bid, lid, mid), headers=auth, json={"status": status})


def rejected_sql(conn, query):
    sp = conn.begin_nested()
    try:
        with pytest.raises(IntegrityError):
            conn.execute(query)
    finally:
        sp.rollback()


def test_assign_list_idempotent_revoke_reactivate(ctx):
    client, conn = ctx
    owner, _ = actor(client)
    _, worker = actor(client)
    bid = business(client, owner)
    lid = location(client, bid, owner)
    mid = member(conn, bid, worker)
    assert client.get(url(bid, lid), headers=owner).json() == []
    first = change(client, bid, lid, mid, owner)
    assert first.status_code == 200, first.text
    row = first.json()
    assert row["membership_id"] == str(mid)
    assert row["user_id"] == str(worker) and row["business_id"] == str(bid)
    assert row["location_id"] == str(lid)
    assert row["status"] == "ACTIVA" and row["revoked_at"] is None
    assert row["created_at"] and row["updated_at"]
    assert change(client, bid, lid, mid, owner).json() == row
    assert client.get(url(bid, lid), headers=owner).json() == [row]
    revoked = change(client, bid, lid, mid, owner, "REVOCADA")
    assert revoked.status_code == 200 and revoked.json()["revoked_at"]
    assert revoked.json()["status"] == "REVOCADA"
    assert change(client, bid, lid, mid, owner, "REVOCADA").json() == revoked.json()
    restored = change(client, bid, lid, mid, owner)
    assert restored.status_code == 200
    assert restored.json()["status"] == "ACTIVA"
    assert restored.json()["revoked_at"] is None
    assert conn.execute(select(LocationAssignment.status)).scalar_one() == "ACTIVA"


@pytest.mark.parametrize("role,expected", [
    ("ADMINISTRADOR", 200), ("ENCARGADO", 403), ("TRABAJADOR", 403),
])
def test_company_role_controls_assignment_admin(ctx, role, expected):
    client, conn = ctx
    owner, _ = actor(client)
    colleague, uid = actor(client)
    _, worker = actor(client)
    bid = business(client, owner)
    lid = location(client, bid, owner)
    member(conn, bid, uid, role=role)
    mid = member(conn, bid, worker)
    assert client.get(url(bid, lid), headers=colleague).status_code == expected
    assert change(client, bid, lid, mid, colleague).status_code == expected
    if expected == 403:
        assert client.get(url(bid, lid), headers=owner).json() == []


def test_cross_tenant_ids_are_hidden_from_http_and_sql(ctx):
    client, conn = ctx
    auth_a, _ = actor(client)
    auth_b, user_b = actor(client)
    bid_a, bid_b = business(client, auth_a), business(client, auth_b)
    lid_a, lid_b = location(client, bid_a, auth_a), location(client, bid_b, auth_b)
    _, user_a = actor(client)
    mid_a = member(conn, bid_a, user_a)
    _, other_worker = actor(client)
    mid_b = member(conn, bid_b, other_worker)
    assert change(client, bid_a, lid_a, mid_b, auth_a).status_code == 404
    assert change(client, bid_b, lid_a, mid_b, auth_b).status_code == 404
    assert client.get(url(bid_a, lid_b), headers=auth_a).status_code == 404
    rejected_sql(conn, insert(LocationAssignment).values(
        business_id=bid_a, location_id=lid_b, user_id=user_a,
    ))
    rejected_sql(conn, insert(LocationAssignment).values(
        business_id=bid_a, location_id=lid_a, user_id=other_worker,
    ))
    assert conn.execute(select(LocationAssignment.user_id)).all() == []


def test_inactive_membership_and_paused_location_prevent_activation(ctx):
    client, conn = ctx
    owner, _ = actor(client)
    _, uid = actor(client)
    bid = business(client, owner)
    lid = location(client, bid, owner)
    mid = member(conn, bid, uid)
    assert change(client, bid, lid, mid, owner).status_code == 200
    conn.execute(update(Membership).where(Membership.id == mid).values(status="INACTIVA"))
    assert change(client, bid, lid, mid, owner).status_code == 409
    assert change(client, bid, lid, mid, owner, "REVOCADA").status_code == 200
    conn.execute(update(Membership).where(Membership.id == mid).values(status="ACTIVA"))
    paused = client.patch(
        f"/api/v1/businesses/{bid}/locations/{lid}/status",
        headers=owner, json={"status": "PAUSADA"},
    )
    assert paused.status_code == 200
    assert change(client, bid, lid, mid, owner).status_code == 409
    assert client.get(url(bid, lid), headers=owner).status_code == 200


def test_suspended_business_read_only_for_assignment(ctx):
    client, conn = ctx
    owner, _ = actor(client)
    _, uid = actor(client)
    bid = business(client, owner)
    lid = location(client, bid, owner)
    mid = member(conn, bid, uid)
    conn.execute(update(Business).where(Business.id == bid).values(status="SUSPENDIDA"))
    assert client.get(url(bid, lid), headers=owner).status_code == 200
    assert change(client, bid, lid, mid, owner).status_code == 409


def test_revoked_session_and_inactive_manager_cannot_access(ctx):
    client, conn = ctx
    owner, owner_uid = actor(client)
    _, worker = actor(client)
    bid = business(client, owner)
    lid = location(client, bid, owner)
    mid = member(conn, bid, worker)
    conn.execute(update(Membership).where(
        Membership.business_id == bid, Membership.user_id == owner_uid,
    ).values(status="INACTIVA"))
    assert client.get(url(bid, lid), headers=owner).status_code == 404
    assert change(client, bid, lid, mid, owner).status_code == 404
    conn.execute(update(Membership).where(
        Membership.business_id == bid, Membership.user_id == owner_uid,
    ).values(status="ACTIVA"))
    assert client.post("/api/v1/auth/logout", headers=owner).status_code == 204
    assert client.get(url(bid, lid), headers=owner).status_code == 401
    assert change(client, bid, lid, mid, owner).status_code == 401


def test_only_operational_roles_can_be_granted_but_admin_can_be_revoked(ctx):
    client, conn = ctx
    owner, _ = actor(client)
    _, worker = actor(client)
    bid = business(client, owner)
    lid = location(client, bid, owner)
    mid = member(conn, bid, worker)
    assert change(client, bid, lid, mid, owner).status_code == 200
    conn.execute(update(Membership).where(Membership.id == mid).values(role="ADMINISTRADOR"))
    assert change(client, bid, lid, mid, owner).status_code == 409
    assert change(client, bid, lid, mid, owner, "REVOCADA").status_code == 200
    assert change(client, bid, lid, mid, owner, "ACTIVA").status_code == 409


@pytest.mark.parametrize("payload", [
    {}, {"status": "PENDIENTE"},
    {"status": "ACTIVA", "role": "ADMINISTRADOR"},
    {"status": "REVOCADA", "location_id": str(uuid4())},
])
def test_bad_payloads_do_not_create_assignments(ctx, payload):
    client, conn = ctx
    owner, _ = actor(client)
    _, worker = actor(client)
    bid = business(client, owner)
    lid = location(client, bid, owner)
    mid = member(conn, bid, worker)
    assert client.put(url(bid, lid, mid), headers=owner, json=payload).status_code == 422
    assert conn.execute(select(LocationAssignment.business_id)).all() == []


def test_sql_check_unique_and_missing_assignment_revoke(ctx):
    client, conn = ctx
    owner, _ = actor(client)
    _, worker = actor(client)
    bid = business(client, owner)
    lid = location(client, bid, owner)
    mid = member(conn, bid, worker)
    assert change(client, bid, lid, mid, owner, "REVOCADA").status_code == 404
    assert change(client, bid, lid, mid, owner).status_code == 200
    rejected_sql(conn, insert(LocationAssignment).values(
        business_id=bid, location_id=lid, user_id=worker,
    ))
    rejected_sql(conn, update(LocationAssignment).where(
        LocationAssignment.business_id == bid,
        LocationAssignment.location_id == lid,
        LocationAssignment.user_id == worker,
    ).values(status="REVOCADA", revoked_at=None))
    assert conn.execute(select(LocationAssignment.status)).scalar_one() == "ACTIVA"


def test_rollback_after_flush_restores_empty_assignments(ctx, monkeypatch):
    client, conn = ctx
    owner, _ = actor(client)
    _, worker = actor(client)
    bid = business(client, owner)
    lid = location(client, bid, owner)
    mid = member(conn, bid, worker)
    original = assignment_repository.LocationAssignmentRepository.add
    def fail_after_flush(self, record):
        original(self, record)
        raise RuntimeError("Error simulado después de insertar")
    monkeypatch.setattr(assignment_repository.LocationAssignmentRepository, "add", fail_after_flush)
    with pytest.raises(RuntimeError, match="Error simulado"):
        change(client, bid, lid, mid, owner)
    assert conn.execute(select(LocationAssignment.business_id)).all() == []
