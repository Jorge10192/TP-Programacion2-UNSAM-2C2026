"""Transacciones independientes: vigencia, bloqueos y reintentos reales en PostgreSQL."""
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier, Event
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.infrastructure.db import get_engine
from app.infrastructure.models import (
    AuthSession, Business, BusinessCreationRequest, BusinessInvitation, Membership, User,
)
from app.main import create_app
from app.modules.auth.passwords import hash_password
from app.modules.auth.tokens import new_token, now_utc, token_digest
from app.modules.businesses import service as service_module
from app.modules.businesses.repository import BusinessRepository

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere PostgreSQL aislado y RUN_DB_INTEGRATION=1",
    ),
]


@pytest.fixture
def scenario():
    """Solo datos ficticios propios; las conexiones concurrentes necesitan commits reales."""
    owner_id, recipient_id, business_id = uuid4(), uuid4(), uuid4()
    owner_token, recipient_token, invitation_token = new_token(), new_token(), new_token()
    recipient_email = f"race-{recipient_id.hex}@example.com"
    started_at = now_utc()
    password_hash = hash_password("Una frase de prueba larga para concurrencia")
    engine = get_engine()
    try:
        with Session(engine) as db:
            db.add_all([
                User(id=owner_id, email_normalizado=f"race-{owner_id.hex}@example.com",
                     display_name="Titular Prueba", password_hash=password_hash, status="ACTIVO"),
                User(id=recipient_id, email_normalizado=recipient_email,
                     display_name="Invitado Prueba", password_hash=password_hash, status="ACTIVO"),
            ])
            db.flush()
            db.add_all([
                AuthSession(user_id=owner_id, token_hash=token_digest(owner_token),
                            expires_at=started_at + timedelta(hours=12)),
                AuthSession(user_id=recipient_id, token_hash=token_digest(recipient_token),
                            expires_at=started_at + timedelta(hours=12)),
                Business(id=business_id, name="Empresa Concurrencia", category="Servicios",
                         activity_kind="SERVICIOS", founder_user_id=owner_id, status="ACTIVA"),
            ])
            db.flush()
            db.add_all([
                Membership(business_id=business_id, user_id=owner_id,
                           role="TITULAR_ADMINISTRATIVO", status="ACTIVA"),
                BusinessInvitation(
                    business_id=business_id, invited_by_user_id=owner_id,
                    email_normalizado=recipient_email, proposed_role="TRABAJADOR",
                    token_hash=token_digest(invitation_token), status="PENDIENTE",
                    expires_at=started_at + timedelta(hours=1),
                ),
            ])
            db.commit()
        yield SimpleNamespace(
            engine=engine, owner_id=owner_id, recipient_id=recipient_id,
            business_id=business_id, recipient_email=recipient_email,
            owner_headers={"Authorization": f"Bearer {owner_token}"},
            recipient_headers={"Authorization": f"Bearer {recipient_token}"},
            invitation_token=invitation_token, started_at=started_at,
        )
    finally:
        # Limpiar exclusivamente las filas creadas por esta prueba, en orden de FK.
        with engine.begin() as conn:
            business_ids = select(Business.id).where(Business.founder_user_id == owner_id)
            conn.execute(delete(BusinessInvitation).where(BusinessInvitation.business_id.in_(business_ids)))
            conn.execute(delete(BusinessCreationRequest).where(BusinessCreationRequest.actor_user_id == owner_id))
            conn.execute(delete(Membership).where(Membership.business_id.in_(business_ids)))
            conn.execute(delete(Business).where(Business.founder_user_id == owner_id))
            conn.execute(delete(AuthSession).where(AuthSession.user_id.in_([owner_id, recipient_id])))
            conn.execute(delete(User).where(User.id.in_([owner_id, recipient_id])))


def post(path, headers, payload):
    # Cada hilo tiene su cliente y cada petición obtiene su propia sesión SQLAlchemy.
    with TestClient(create_app()) as client:
        return client.post(path, headers=headers, json=payload)


def accept(scenario):
    return post(
        "/api/v1/invitations/accept", scenario.recipient_headers,
        {"invitation_token": scenario.invitation_token},
    )


def assert_pending_without_access(scenario):
    with scenario.engine.connect() as conn:
        assert conn.execute(select(Membership.id).where(
            Membership.business_id == scenario.business_id,
            Membership.user_id == scenario.recipient_id,
            Membership.status == "ACTIVA",
        )).first() is None
        assert conn.execute(select(
            BusinessInvitation.status, BusinessInvitation.accepted_at,
        ).where(BusinessInvitation.token_hash == token_digest(scenario.invitation_token))).one() == (
            "PENDIENTE", None,
        )


def test_invitation_expiring_while_waiting_for_business_cannot_grant_access(scenario, monkeypatch):
    clock = {"now": scenario.started_at}
    monkeypatch.setattr(service_module, "now_utc", lambda: clock["now"])
    reached_business = Event()
    original = BusinessRepository.business_for_update

    def observed_lock(repository, business_id):
        reached_business.set()
        return original(repository, business_id)

    monkeypatch.setattr(BusinessRepository, "business_for_update", observed_lock)
    with scenario.engine.connect() as blocker:
        transaction = blocker.begin()
        blocker.execute(select(Business).where(Business.id == scenario.business_id).with_for_update())
        with ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(accept, scenario)
            try:
                assert reached_business.wait(5), "La aceptación no llegó al bloqueo empresarial"
                clock["now"] = scenario.started_at + timedelta(hours=2)
            finally:
                transaction.rollback()
            response = future.result(timeout=10)
    assert response.status_code == 409, response.text
    assert_pending_without_access(scenario)


def test_replacing_expired_invitation_during_acceptance_has_no_deadlock(scenario, monkeypatch):
    clock = {"now": scenario.started_at}
    monkeypatch.setattr(service_module, "now_utc", lambda: clock["now"])
    accepting_ready, issuer_has_business, release_acceptance = Event(), Event(), Event()
    original_business = BusinessRepository.business_for_update
    original_pending = BusinessRepository.pending_invitation_for_email

    def pause_acceptance(repository, business_id):
        accepting_ready.set()
        assert release_acceptance.wait(5), "No se liberó la aceptación"
        return original_business(repository, business_id)

    def observe_issuer(repository, business_id, email):
        previous = original_pending(repository, business_id, email)
        issuer_has_business.set()
        return previous

    monkeypatch.setattr(BusinessRepository, "business_for_update", pause_acceptance)
    monkeypatch.setattr(BusinessRepository, "pending_invitation_for_email", observe_issuer)
    with ThreadPoolExecutor(max_workers=2) as pool:
        acceptance = pool.submit(accept, scenario)
        try:
            assert accepting_ready.wait(5)
            clock["now"] = scenario.started_at + timedelta(hours=2)
            issuance = pool.submit(
                post, f"/api/v1/businesses/{scenario.business_id}/invitations",
                scenario.owner_headers,
                {"email": scenario.recipient_email, "role": "TRABAJADOR"},
            )
            assert issuer_has_business.wait(5)
        finally:
            release_acceptance.set()
        issued, accepted = issuance.result(timeout=10), acceptance.result(timeout=10)
    assert issued.status_code == 201, issued.text
    assert accepted.status_code == 409, accepted.text
    with scenario.engine.connect() as conn:
        assert conn.scalar(select(func.count()).select_from(Membership).where(
            Membership.business_id == scenario.business_id,
            Membership.user_id == scenario.recipient_id,
        )) == 0


def test_two_simultaneous_acceptances_create_only_one_membership(scenario):
    barrier = Barrier(2)

    def attempt():
        barrier.wait(timeout=5)
        return accept(scenario)

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = [pool.submit(attempt) for _ in range(2)]
        responses = [future.result(timeout=10) for future in results]
    assert sorted(response.status_code for response in responses) == [200, 409]
    with scenario.engine.connect() as conn:
        assert conn.scalar(select(func.count()).select_from(Membership).where(
            Membership.business_id == scenario.business_id,
            Membership.user_id == scenario.recipient_id,
        )) == 1


def test_simultaneous_business_creation_replays_without_duplicate_owner(scenario):
    key, barrier = uuid4(), Barrier(2)

    def attempt():
        barrier.wait(timeout=5)
        return post(
            "/api/v1/businesses", {**scenario.owner_headers, "Idempotency-Key": str(key)},
            {"name": "Empresa Reintentada", "category": "Servicios", "activity_kind": "SERVICIOS"},
        )

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = [pool.submit(attempt) for _ in range(2)]
        responses = [future.result(timeout=10) for future in results]
    assert sorted(response.status_code for response in responses) == [200, 201]
    assert responses[0].json()["id"] == responses[1].json()["id"]
    with scenario.engine.connect() as conn:
        business_id = responses[0].json()["id"]
        assert conn.scalar(select(func.count()).select_from(Membership).where(
            Membership.business_id == business_id,
            Membership.role == "TITULAR_ADMINISTRATIVO",
            Membership.status == "ACTIVA",
        )) == 1
