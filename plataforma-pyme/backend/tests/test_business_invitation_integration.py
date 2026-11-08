"""E2-1.3C.3: invitaciones reales en PostgreSQL reversible (CU-12a).

Emisión NO crea membresía, el secreto solo se entrega una vez, nunca queda
almacenado. Todos los INSERT se revierten con la transacción externa.
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
from app.modules.auth.tokens import new_token, now_utc, token_digest, token_valid_shape
from app.modules.businesses.schemas import BusinessInvitationIssued

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere RUN_DB_INTEGRATION=1 y PostgreSQL e213c3_invitations",
    ),
]


@pytest.fixture
def isolated() -> Iterator[tuple[TestClient, object]]:
    with get_engine().connect() as connection:
        outer = connection.begin()
        app = create_app()

        def override_db() -> Iterator[Session]:
            with Session(
                bind=connection, join_transaction_mode="create_savepoint"
            ) as session:
                yield session

        app.dependency_overrides[get_db] = override_db
        try:
            with TestClient(app) as client:
                yield client, connection
        finally:
            app.dependency_overrides.clear()
            outer.rollback()


def actor(client: TestClient) -> tuple[dict[str, str], UUID, str]:
    email = f"inv-{uuid4().hex}@example.com"
    password = "Una frase de prueba suficientemente extensa"
    registration = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "display_name": "Colaborador Prueba"},
    )
    assert registration.status_code == 201, registration.text
    login = client.post(
        "/api/v1/auth/login", json={"email": email, "password": password},
    )
    assert login.status_code == 200, login.text
    return (
        {"Authorization": f"Bearer {login.json()['access_token']}"},
        UUID(registration.json()["id"]),
        email,
    )


def company(client: TestClient, auth: dict[str, str]) -> UUID:
    result = client.post(
        "/api/v1/businesses",
        headers={**auth, "Idempotency-Key": str(uuid4())},
        json={"name": "Empresa Prueba", "category": "Comercio", "activity_kind": "MIXTO"},
    )
    assert result.status_code == 201, result.text
    return UUID(result.json()["id"])


def invite(
    client: TestClient, auth: dict[str, str], business_id: UUID,
    email: str = "invitado@example.com", role: str = "TRABAJADOR",
):
    return client.post(
        f"/api/v1/businesses/{business_id}/invitations",
        headers=auth, json={"email": email, "role": role},
    )


def add_member(connection, business_id: UUID, user_id: UUID, role: str, status="ACTIVA"):
    connection.execute(
        insert(Membership).values(
            id=uuid4(), business_id=business_id, user_id=user_id,
            role=role, status=status,
        )
    )


def count_invitations(connection, business_id: UUID) -> int:
    return connection.execute(
        select(func.count(BusinessInvitation.id))
        .where(BusinessInvitation.business_id == business_id)
    ).scalar_one()


def test_owner_issues_secure_invitation_without_creating_membership(isolated) -> None:
    client, connection = isolated
    auth, owner_id, _ = actor(client)
    business_id = company(client, auth)
    initial_members = connection.execute(
        select(func.count(Membership.id))
        .where(Membership.business_id == business_id)
    ).scalar_one()
    assert initial_members == 1
    issued = invite(
        client, auth, business_id, email="  Worker@EXAMPLE.COM  ",
        role="ENCARGADO",
    )
    assert issued.status_code == 201, issued.text
    body = issued.json()
    token = body["invitation_token"]
    assert token_valid_shape(token)
    assert body["business_id"] == str(business_id)
    assert body["email"] == "worker@example.com"
    assert body["role"] == "ENCARGADO"
    assert body["status"] == "PENDIENTE"
    assert 6 < (BusinessInvitationExpiry(body) - now_utc()).total_seconds() / 86400 < 8
    record = connection.execute(
        select(BusinessInvitation).where(BusinessInvitation.id == UUID(body["id"]))
    ).scalar_one()
    assert record.invited_by_user_id == owner_id
    assert record.token_hash == token_digest(token)
    assert token != record.token_hash
    assert len(record.token_hash) == 64
    assert count_invitations(connection, business_id) == 1
    after_members = connection.execute(
        select(func.count(Membership.id))
        .where(Membership.business_id == business_id)
    ).scalar_one()
    assert after_members == initial_members


def BusinessInvitationExpiry(payload: dict):
    from datetime import datetime
    return datetime.fromisoformat(payload["expires_at"].replace("Z", "+00:00"))


def test_admin_can_invite_but_worker_cannot(isolated) -> None:
    client, connection = isolated
    owner, _, _ = actor(client)
    business_id = company(client, owner)
    admin_auth, admin_id, _ = actor(client)
    worker_auth, worker_id, _ = actor(client)
    add_member(connection, business_id, admin_id, "ADMINISTRADOR")
    add_member(connection, business_id, worker_id, "TRABAJADOR")
    issued = invite(client, admin_auth, business_id, "alguien@example.com")
    denied = invite(client, worker_auth, business_id, "otro@example.com")
    assert issued.status_code == 201, issued.text
    assert denied.status_code == 403, denied.text
    assert count_invitations(connection, business_id) == 1


def test_encargado_cannot_invite_and_inactive_admin_cannot_even_view(isolated) -> None:
    client, connection = isolated
    owner, _, _ = actor(client)
    business_id = company(client, owner)
    worker_auth, worker_id, _ = actor(client)
    admin_auth, admin_id, _ = actor(client)
    add_member(connection, business_id, worker_id, "ENCARGADO")
    add_member(connection, business_id, admin_id, "ADMINISTRADOR", "INACTIVA")
    assert invite(client, worker_auth, business_id).status_code == 403
    assert invite(client, admin_auth, business_id).status_code == 404
    assert count_invitations(connection, business_id) == 0


def test_foreign_and_nonexistent_business_have_same_404(isolated) -> None:
    client, connection = isolated
    owner, _, _ = actor(client)
    business_id = company(client, owner)
    outsider, _, _ = actor(client)
    response_a = invite(client, outsider, business_id)
    response_b = invite(client, outsider, uuid4())
    assert response_a.status_code == response_b.status_code == 404
    assert response_a.json() == response_b.json()
    assert count_invitations(connection, business_id) == 0


def test_suspended_business_is_not_invitable(isolated) -> None:
    client, connection = isolated
    auth, _, _ = actor(client)
    business_id = company(client, auth)
    connection.execute(
        update(Business).where(Business.id == business_id).values(status="SUSPENDIDA")
    )
    response = invite(client, auth, business_id)
    assert response.status_code == 409
    assert count_invitations(connection, business_id) == 0


def test_duplicate_pending_and_normalized_email_return_409(isolated) -> None:
    client, connection = isolated
    auth, _, _ = actor(client)
    business_id = company(client, auth)
    first = invite(client, auth, business_id, "Person@Example.com")
    second = invite(client, auth, business_id, " person@example.com ", role="ENCARGADO")
    assert first.status_code == 201
    assert second.status_code == 409
    assert count_invitations(connection, business_id) == 1


def test_existing_active_membership_conflicts_but_inactive_may_be_reinvited(isolated) -> None:
    client, connection = isolated
    auth, _, _ = actor(client)
    business_id = company(client, auth)
    colleague_auth, colleague_id, colleague_email = actor(client)
    add_member(connection, business_id, colleague_id, "TRABAJADOR")
    assert invite(client, auth, business_id, colleague_email).status_code == 409
    connection.execute(
        update(Membership)
        .where(Membership.business_id == business_id, Membership.user_id == colleague_id)
        .values(status="INACTIVA")
    )
    assert invite(client, auth, business_id, colleague_email).status_code == 201
    assert count_invitations(connection, business_id) == 1


def test_same_email_can_be_invited_separately_into_two_tenants(isolated) -> None:
    client, connection = isolated
    auth, _, _ = actor(client)
    first_business = company(client, auth)
    second_business = company(client, auth)
    first = invite(client, auth, first_business, "same@example.com")
    second = invite(client, auth, second_business, "same@example.com")
    assert first.status_code == second.status_code == 201
    assert first.json()["invitation_token"] != second.json()["invitation_token"]
    assert count_invitations(connection, first_business) == 1
    assert count_invitations(connection, second_business) == 1


def test_expired_pending_gets_expired_and_new_token_issued(isolated) -> None:
    client, connection = isolated
    auth, owner_id, _ = actor(client)
    business_id = company(client, auth)
    old_id = uuid4()
    past = now_utc() - timedelta(days=10)
    connection.execute(
        insert(BusinessInvitation).values(
            id=old_id, business_id=business_id, invited_by_user_id=owner_id,
            email_normalizado="repeat@example.com", proposed_role="TRABAJADOR",
            token_hash=token_digest(new_token()), status="PENDIENTE",
            created_at=past, expires_at=past + timedelta(days=7),
        )
    )
    new_issued = invite(client, auth, business_id, "repeat@example.com")
    assert new_issued.status_code == 201, new_issued.text
    old_record = connection.execute(
        select(BusinessInvitation).where(BusinessInvitation.id == old_id)
    ).scalar_one()
    assert old_record.status == "EXPIRADA"
    assert count_invitations(connection, business_id) == 2


def test_unauthenticated_or_revoked_session_cannot_issue(isolated) -> None:
    client, connection = isolated
    auth, _, _ = actor(client)
    business_id = company(client, auth)
    assert invite(client, {}, business_id).status_code == 401
    assert client.post("/api/v1/auth/logout", headers=auth).status_code == 204
    assert invite(client, auth, business_id).status_code == 401
    assert count_invitations(connection, business_id) == 0


def test_wrong_roles_are_rejected_before_persistence(isolated) -> None:
    client, connection = isolated
    auth, _, _ = actor(client)
    business_id = company(client, auth)
    assert invite(client, auth, business_id, role="ADMINISTRADOR").status_code == 422
    assert invite(client, auth, business_id, role="TITULAR_ADMINISTRATIVO").status_code == 422
    assert count_invitations(connection, business_id) == 0


def test_rollback_if_response_serialization_fails_after_flush(isolated, monkeypatch) -> None:
    client, connection = isolated
    auth, _, _ = actor(client)
    business_id = company(client, auth)

    def broken(cls, record, token):
        raise RuntimeError("Simulated invitation response failure")

    monkeypatch.setattr(BusinessInvitationIssued, "from_record", classmethod(broken))
    with pytest.raises(RuntimeError, match="invitation response failure"):
        invite(client, auth, business_id)
    assert count_invitations(connection, business_id) == 0
