"""CU-12b: aceptación real en PostgreSQL, datos de tests reversibles.

Las peticiones se ejecutan en SAVEPOINT sobre una transacción exterior
que se revierte. Nunca usar un token real del usuario en estas pruebas.
"""
import os
from collections.abc import Iterator
from datetime import timedelta
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, insert, select, update
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.infrastructure.db import get_engine
from app.infrastructure.models import Business, BusinessInvitation, Membership
from app.main import create_app
from app.modules.auth.tokens import now_utc, new_token
from app.modules.businesses.schemas import BusinessView


pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere PostgreSQL y migración e213c4_acceptance",
    ),
]


@pytest.fixture
def isolated() -> Iterator[tuple[TestClient, object]]:
    with get_engine().connect() as connection:
        outer = connection.begin()
        app = create_app()

        def override_db() -> Iterator[Session]:
            with Session(
                bind=connection, join_transaction_mode="create_savepoint",
            ) as session:
                yield session

        app.dependency_overrides[get_db] = override_db
        try:
            with TestClient(app) as client:
                yield client, connection
        finally:
            app.dependency_overrides.clear()
            outer.rollback()


def actor(client: TestClient, email: str | None = None):
    email = email or f"accept-{uuid4().hex}@example.com"
    password = "Frase de contrasena extensa para una prueba segura"
    r = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "display_name": "Usuario Prueba"},
    )
    assert r.status_code == 201, r.text
    login = client.post(
        "/api/v1/auth/login", json={"email": email, "password": password},
    )
    assert login.status_code == 200, login.text
    return {"Authorization": f"Bearer {login.json()['access_token']}"}, UUID(r.json()["id"]), email


def company(client, auth):
    r = client.post(
        "/api/v1/businesses",
        headers={**auth, "Idempotency-Key": str(uuid4())},
        json={"name": "Empresa Prueba", "category": "Servicios", "activity_kind": "MIXTO"},
    )
    assert r.status_code == 201, r.text
    return UUID(r.json()["id"])


def issue(client, auth, business_id, email, role="TRABAJADOR"):
    r = client.post(
        f"/api/v1/businesses/{business_id}/invitations",
        headers=auth, json={"email": email, "role": role},
    )
    assert r.status_code == 201, r.text
    return r.json()["invitation_token"]


def accept(client, auth, token):
    return client.post(
        "/api/v1/invitations/accept",
        headers=auth, json={"invitation_token": token},
    )


def memberships(connection, business_id):
    return connection.execute(
        select(Membership.id, Membership.user_id, Membership.role, Membership.status)
        .where(Membership.business_id == business_id),
    ).all()


def invitation_audit(connection, token_hash):
    return connection.execute(
        select(
            BusinessInvitation.status, BusinessInvitation.accepted_by_user_id,
            BusinessInvitation.accepted_at,
        ).where(BusinessInvitation.token_hash == token_hash),
    ).one()


def test_recipient_accepts_only_once_gets_business_without_role_escalation(isolated):
    from app.modules.auth.tokens import token_digest
    client, conn = isolated
    owner, _, _ = actor(client)
    b = company(client, owner)
    invited, invited_id, email = actor(client)
    token = issue(client, owner, b, email, "ENCARGADO")
    assert len(memberships(conn, b)) == 1
    r = accept(client, invited, token)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["id"] == str(b)
    assert data["membership"]["user_id"] == str(invited_id)
    assert data["membership"]["role"] == "ENCARGADO"
    assert data["membership"]["status"] == "ACTIVA"
    assert "invitation_token" not in data
    assert len(memberships(conn, b)) == 2
    state, acceptor, accepted_at = invitation_audit(conn, token_digest(token))
    assert state == "ACEPTADA"
    assert acceptor == invited_id
    assert accepted_at is not None
    assert client.get(f"/api/v1/businesses/{b}", headers=invited).status_code == 200
    second = accept(client, invited, token)
    assert second.status_code == 409
    assert len(memberships(conn, b)) == 2


def test_invite_can_precede_registration_and_is_only_for_matching_email(isolated):
    client, conn = isolated
    owner, _, _ = actor(client)
    b = company(client, owner)
    email = f"new-{uuid4().hex}@example.com"
    token = issue(client, owner, b, email)
    wrong, _, _ = actor(client)
    hidden = accept(client, wrong, token)
    assert hidden.status_code == 404
    assert len(memberships(conn, b)) == 1
    recipient, _, _ = actor(client, email.upper())
    accepted = accept(client, recipient, token)
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["membership"]["role"] == "TRABAJADOR"


def test_mismatched_and_unknown_tokens_have_same_404(isolated):
    client, conn = isolated
    owner, _, _ = actor(client)
    b = company(client, owner)
    invited, _, email = actor(client)
    token = issue(client, owner, b, email)
    other, _, _ = actor(client)
    r1 = accept(client, other, token)
    r2 = accept(client, other, new_token())
    assert r1.status_code == r2.status_code == 404
    assert r1.json() == r2.json()
    assert len(memberships(conn, b)) == 1
    assert accept(client, invited, token).status_code == 200


def test_expired_token_does_not_activate_a_member(isolated):
    from app.modules.auth.tokens import token_digest
    client, conn = isolated
    owner, _, _ = actor(client)
    b = company(client, owner)
    recipient, _, email = actor(client)
    token = issue(client, owner, b, email)
    past = now_utc() - timedelta(days=10)
    conn.execute(
        update(BusinessInvitation)
        .where(BusinessInvitation.token_hash == token_digest(token))
        .values(created_at=past, expires_at=past + timedelta(days=7))
    )
    denied = accept(client, recipient, token)
    assert denied.status_code == 409
    assert len(memberships(conn, b)) == 1
    assert invitation_audit(conn, token_digest(token))[0] == "PENDIENTE"


def test_suspended_company_does_not_accept_invitation(isolated):
    client, conn = isolated
    owner, _, _ = actor(client)
    b = company(client, owner)
    recipient, _, email = actor(client)
    token = issue(client, owner, b, email)
    conn.execute(
        update(Business).where(Business.id == b).values(status="SUSPENDIDA")
    )
    result = accept(client, recipient, token)
    assert result.status_code == 409
    assert len(memberships(conn, b)) == 1


def test_inactive_member_is_reactivated_no_duplicate_and_role_from_invitation(isolated):
    client, conn = isolated
    owner, _, _ = actor(client)
    b = company(client, owner)
    recipient, user_id, email = actor(client)
    old_id = uuid4()
    conn.execute(
        insert(Membership).values(
            id=old_id, user_id=user_id, business_id=b,
            role="ADMINISTRADOR", status="INACTIVA", job_title="Cargo anterior",
        )
    )
    token = issue(client, owner, b, email, "TRABAJADOR")
    result = accept(client, recipient, token)
    assert result.status_code == 200, result.text
    assert result.json()["membership"]["id"] == str(old_id)
    assert result.json()["membership"]["role"] == "TRABAJADOR"
    assert len(memberships(conn, b)) == 2
    row = conn.execute(
        select(Membership.status, Membership.role, Membership.job_title)
        .where(Membership.id == old_id),
    ).one()
    assert row == ("ACTIVA", "TRABAJADOR", None)


def test_inactive_owner_role_is_not_overwritten_by_operational_invitation(isolated):
    client, conn = isolated
    owner, _, _ = actor(client)
    b = company(client, owner)
    recipient, uid, email = actor(client)
    conn.execute(
        insert(Membership).values(
            id=uuid4(), user_id=uid, business_id=b,
            role="TITULAR_ADMINISTRATIVO", status="INACTIVA",
        )
    )
    token = issue(client, owner, b, email, "TRABAJADOR")
    assert accept(client, recipient, token).status_code == 409
    existing = conn.execute(
        select(Membership.role, Membership.status)
        .where(Membership.business_id == b, Membership.user_id == uid),
    ).one()
    assert existing == ("TITULAR_ADMINISTRATIVO", "INACTIVA")


def test_becoming_active_member_between_invite_and_accept_is_conflict(isolated):
    client, conn = isolated
    owner, _, _ = actor(client)
    b = company(client, owner)
    recipient, uid, email = actor(client)
    token = issue(client, owner, b, email)
    conn.execute(
        insert(Membership).values(
            id=uuid4(), user_id=uid, business_id=b,
            role="ENCARGADO", status="ACTIVA",
        )
    )
    assert accept(client, recipient, token).status_code == 409
    assert len(memberships(conn, b)) == 2


def test_revoked_session_cannot_accept(isolated):
    client, conn = isolated
    owner, _, _ = actor(client)
    b = company(client, owner)
    recipient, _, email = actor(client)
    token = issue(client, owner, b, email)
    assert client.post("/api/v1/auth/logout", headers=recipient).status_code == 204
    assert accept(client, recipient, token).status_code == 401
    assert len(memberships(conn, b)) == 1


def test_other_company_membership_is_unchanged_on_accept(isolated):
    client, conn = isolated
    owner, _, _ = actor(client)
    first = company(client, owner)
    other = company(client, owner)
    recipient, uid, email = actor(client)
    conn.execute(
        insert(Membership).values(
            id=uuid4(), user_id=uid, business_id=other,
            role="ADMINISTRADOR", status="ACTIVA",
        )
    )
    token = issue(client, owner, first, email)
    result = accept(client, recipient, token)
    assert result.status_code == 200, result.text
    assert result.json()["membership"]["role"] == "TRABAJADOR"
    existing = conn.execute(
        select(Membership.role, Membership.status)
        .where(Membership.business_id == other, Membership.user_id == uid),
    ).one()
    assert existing == ("ADMINISTRADOR", "ACTIVA")


def test_rollback_after_flush_keeps_invitation_pending_and_no_membership(isolated, monkeypatch):
    from app.modules.auth.tokens import token_digest
    client, conn = isolated
    owner, _, _ = actor(client)
    b = company(client, owner)
    recipient, _, email = actor(client)
    token = issue(client, owner, b, email)

    def fail(cls, business, member):
        raise RuntimeError("Simulated response failure after SQL flush")

    monkeypatch.setattr(BusinessView, "from_records", classmethod(fail))
    with pytest.raises(RuntimeError, match="response failure"):
        accept(client, recipient, token)
    assert len(memberships(conn, b)) == 1
    assert invitation_audit(conn, token_digest(token)) == ("PENDIENTE", None, None)


def test_invalid_body_is_422_without_side_effects(isolated):
    client, conn = isolated
    owner, _, _ = actor(client)
    b = company(client, owner)
    recipient, _, email = actor(client)
    token = issue(client, owner, b, email)
    for body in ({}, {"invitation_token": "invalid"}, {
        "invitation_token": token, "role": "TITULAR_ADMINISTRATIVO",
    }):
        r = client.post("/api/v1/invitations/accept", headers=recipient, json=body)
        assert r.status_code == 422
    assert len(memberships(conn, b)) == 1
