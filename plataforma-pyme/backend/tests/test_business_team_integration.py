"""C.4b: equipo real por tenant; tests HTTP + PostgreSQL con rollback externo."""
import os
from collections.abc import Iterator
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import insert, select, update
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.infrastructure.db import get_engine
from app.infrastructure.models import Business, Membership
from app.main import create_app
from app.modules.businesses.schemas import BusinessTeamMemberView

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere RUN_DB_INTEGRATION=1 y PostgreSQL e213c4_acceptance",
    ),
]


@pytest.fixture
def isolated() -> Iterator[tuple[TestClient, object]]:
    with get_engine().connect() as connection:
        outer = connection.begin()
        application = create_app()

        def override_db() -> Iterator[Session]:
            with Session(
                bind=connection, join_transaction_mode="create_savepoint",
            ) as db:
                yield db

        application.dependency_overrides[get_db] = override_db
        try:
            with TestClient(application) as client:
                yield client, connection
        finally:
            application.dependency_overrides.clear()
            outer.rollback()


def actor(client: TestClient) -> tuple[dict[str, str], UUID, str]:
    email = f"team-{uuid4().hex}@example.com"
    password = "Contraseña de integración larga y segura para pruebas"
    registration = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "display_name": "Persona Prueba"},
    )
    assert registration.status_code == 201, registration.text
    login = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login.status_code == 200, login.text
    return (
        {"Authorization": f"Bearer {login.json()['access_token']}"},
        UUID(registration.json()["id"]), email,
    )


def company(client: TestClient, headers: dict[str, str]) -> tuple[UUID, UUID]:
    r = client.post(
        "/api/v1/businesses",
        headers={**headers, "Idempotency-Key": str(uuid4())},
        json={"name": "Empresa Equipo", "category": "Comercio", "activity_kind": "MIXTO"},
    )
    assert r.status_code == 201, r.text
    return UUID(r.json()["id"]), UUID(r.json()["membership"]["id"])


def member(connection, bid, uid, role="TRABAJADOR", status="ACTIVA", job_title=None):
    membership_id = uuid4()
    connection.execute(
        insert(Membership).values(
            id=membership_id, business_id=bid, user_id=uid,
            role=role, status=status, job_title=job_title,
        )
    )
    return membership_id


def list_team(client, headers, bid):
    return client.get(f"/api/v1/businesses/{bid}/memberships", headers=headers)


def patch(client, headers, bid, mid, payload):
    return client.patch(
        f"/api/v1/businesses/{bid}/memberships/{mid}",
        headers=headers, json=payload,
    )


def membership_snapshot(connection, mid):
    return connection.execute(
        select(Membership.role, Membership.status, Membership.job_title)
        .where(Membership.id == mid),
    ).one()


def test_owner_lists_team_including_inactive_and_only_public_member_fields(isolated):
    client, conn = isolated
    owner, owner_id, owner_email = actor(client)
    bid, owner_mid = company(client, owner)
    member_auth, user_id, email = actor(client)
    mid = member(conn, bid, user_id, "ENCARGADO", "INACTIVA", "Atención al cliente")
    result = list_team(client, owner, bid)
    assert result.status_code == 200, result.text
    rows = result.json()
    assert len(rows) == 2
    assert {r["id"] for r in rows} == {str(owner_mid), str(mid)}
    found = next(x for x in rows if x["id"] == str(mid))
    assert found["email"] == email
    assert found["display_name"] == "Persona Prueba"
    assert found["status"] == "INACTIVA"
    assert found["job_title"] == "Atención al cliente"
    assert "password_hash" not in str(rows)
    assert "contact_phone" not in str(rows)
    assert "token_hash" not in str(rows)
    assert next(x for x in rows if x["id"] == str(owner_mid))["user_id"] == str(owner_id)


def test_administrator_can_view_team_but_cannot_modify_roles(isolated):
    client, conn = isolated
    owner, _, _ = actor(client)
    bid, owner_mid = company(client, owner)
    admin, uid, _ = actor(client)
    mid = member(conn, bid, uid, "ADMINISTRADOR")
    assert list_team(client, admin, bid).status_code == 200
    before = membership_snapshot(conn, mid)
    denied = patch(client, admin, bid, mid, {"status": "INACTIVA"})
    assert denied.status_code == 403, denied.text
    assert membership_snapshot(conn, mid) == before


@pytest.mark.parametrize("role", ["ENCARGADO", "TRABAJADOR"])
def test_regular_members_cannot_inspect_roster_or_manage_members(isolated, role):
    client, conn = isolated
    owner, _, _ = actor(client)
    bid, owner_mid = company(client, owner)
    user_auth, uid, _ = actor(client)
    mid = member(conn, bid, uid, role)
    assert client.get(f"/api/v1/businesses/{bid}", headers=user_auth).status_code == 200
    assert list_team(client, user_auth, bid).status_code == 403
    assert patch(client, user_auth, bid, mid, {"role": "ADMINISTRADOR"}).status_code == 403
    assert membership_snapshot(conn, mid)[0] == role


def test_owner_can_promote_demote_and_deactivate_and_reactivate_collaborator(isolated):
    client, conn = isolated
    owner, _, _ = actor(client)
    bid, _ = company(client, owner)
    staff, uid, email = actor(client)
    mid = member(conn, bid, uid)
    updated = patch(client, owner, bid, mid, {"role": "ADMINISTRADOR"})
    assert updated.status_code == 200, updated.text
    assert updated.json()["role"] == "ADMINISTRADOR"
    assert list_team(client, staff, bid).status_code == 200

    deactivated = patch(client, owner, bid, mid, {"status": "INACTIVA"})
    assert deactivated.status_code == 200, deactivated.text
    assert deactivated.json()["status"] == "INACTIVA"
    assert client.get(f"/api/v1/businesses/{bid}", headers=staff).status_code == 404
    assert list_team(client, staff, bid).status_code == 404

    revived = patch(
        client, owner, bid, mid, {"role": "ENCARGADO", "status": "ACTIVA"},
    )
    assert revived.status_code == 200, revived.text
    assert revived.json()["role"] == "ENCARGADO"
    assert list_team(client, staff, bid).status_code == 403
    assert membership_snapshot(conn, mid) == ("ENCARGADO", "ACTIVA", None)
    rows = list_team(client, owner, bid).json()
    assert len(rows) == 2


def test_owner_cannot_edit_self_or_historical_owner_membership(isolated):
    client, conn = isolated
    owner, _, _ = actor(client)
    bid, own_mid = company(client, owner)
    before = membership_snapshot(conn, own_mid)
    assert patch(
        client, owner, bid, own_mid, {"status": "INACTIVA"},
    ).status_code == 409
    assert patch(
        client, owner, bid, own_mid, {"role": "ADMINISTRADOR"},
    ).status_code == 409
    assert membership_snapshot(conn, own_mid) == before

    other, uid, _ = actor(client)
    old_owner_id = member(
        conn, bid, uid, "TITULAR_ADMINISTRATIVO", "INACTIVA",
    )
    assert patch(
        client, owner, bid, old_owner_id, {"role": "TRABAJADOR"},
    ).status_code == 409
    assert membership_snapshot(conn, old_owner_id) == (
        "TITULAR_ADMINISTRATIVO", "INACTIVA", None,
    )


def test_target_of_another_tenant_is_hidden_and_preserved(isolated):
    client, conn = isolated
    owner, _, _ = actor(client)
    first, _ = company(client, owner)
    second, _ = company(client, owner)
    staff, uid, _ = actor(client)
    mid = member(conn, second, uid)
    before = membership_snapshot(conn, mid)
    response = patch(client, owner, first, mid, {"status": "INACTIVA"})
    unknown = patch(client, owner, first, uuid4(), {"status": "INACTIVA"})
    assert response.status_code == unknown.status_code == 404
    assert response.json() == unknown.json()
    assert membership_snapshot(conn, mid) == before
    first_ids = {x["id"] for x in list_team(client, owner, first).json()}
    assert str(mid) not in first_ids


def test_foreign_company_and_inactive_caller_both_hidden(isolated):
    client, conn = isolated
    owner, _, _ = actor(client)
    bid, owner_mid = company(client, owner)
    outsider, uid, _ = actor(client)
    own = list_team(client, outsider, bid)
    unknown = list_team(client, outsider, uuid4())
    assert own.status_code == unknown.status_code == 404
    assert own.json() == unknown.json()
    assert patch(client, outsider, bid, owner_mid, {"status": "INACTIVA"}).status_code == 404
    inactive = member(conn, bid, uid, "ADMINISTRADOR", "INACTIVA")
    assert list_team(client, outsider, bid).status_code == 404
    assert patch(client, outsider, bid, inactive, {"role": "ENCARGADO"}).status_code == 404


def test_suspended_company_denies_roster_and_mutations(isolated):
    client, conn = isolated
    owner, _, _ = actor(client)
    bid, _ = company(client, owner)
    staff, uid, _ = actor(client)
    mid = member(conn, bid, uid)
    before = membership_snapshot(conn, mid)
    conn.execute(update(Business).where(Business.id == bid).values(status="SUSPENDIDA"))
    assert client.get(f"/api/v1/businesses/{bid}", headers=owner).status_code == 200
    assert list_team(client, owner, bid).status_code == 409
    assert patch(client, owner, bid, mid, {"role": "ADMINISTRADOR"}).status_code == 409
    assert membership_snapshot(conn, mid) == before


def test_logout_token_cannot_read_or_mutate_roster(isolated):
    client, conn = isolated
    owner, _, _ = actor(client)
    bid, _ = company(client, owner)
    staff, uid, _ = actor(client)
    mid = member(conn, bid, uid)
    assert client.post("/api/v1/auth/logout", headers=owner).status_code == 204
    assert list_team(client, owner, bid).status_code == 401
    assert patch(client, owner, bid, mid, {"status": "INACTIVA"}).status_code == 401
    assert membership_snapshot(conn, mid)[1] == "ACTIVA"


def test_invalid_change_rejected_without_member_update(isolated):
    client, conn = isolated
    owner, _, _ = actor(client)
    bid, _ = company(client, owner)
    staff, uid, _ = actor(client)
    mid = member(conn, bid, uid)
    before = membership_snapshot(conn, mid)
    for payload in ({}, {"status": None}, {"role": "TITULAR_ADMINISTRATIVO"},
                    {"role": "ENCARGADO", "user_id": str(uuid4())}):
        assert patch(client, owner, bid, mid, payload).status_code == 422
    assert membership_snapshot(conn, mid) == before


def test_rollback_after_flush_keeps_original_membership(isolated, monkeypatch):
    client, conn = isolated
    owner, _, _ = actor(client)
    bid, _ = company(client, owner)
    staff, uid, _ = actor(client)
    mid = member(conn, bid, uid, "TRABAJADOR")
    before = membership_snapshot(conn, mid)

    def broken(cls, member_record, user_record):
        raise RuntimeError("Simulated failure building team response")
    monkeypatch.setattr(
        BusinessTeamMemberView, "from_records", classmethod(broken),
    )
    with pytest.raises(RuntimeError, match="building team response"):
        patch(client, owner, bid, mid, {"role": "ENCARGADO"})
    assert membership_snapshot(conn, mid) == before
