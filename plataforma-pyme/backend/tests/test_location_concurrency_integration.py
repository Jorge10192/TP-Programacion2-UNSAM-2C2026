"""Concurrencia real por sede y eficacia de asignaciones tras reactivaciones."""
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.infrastructure.db import get_engine
from app.infrastructure.models import (
    AuthSession, Business, BusinessCreationRequest, Location, LocationAssignment,
    Membership, User,
)
from app.main import create_app
from app.modules.auth.passwords import hash_password
from app.modules.auth.tokens import new_token, now_utc, token_digest
from app.modules.locations.permissions import can_operate_at_location

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere PostgreSQL aislado con e22d_assignments y RUN_DB_INTEGRATION=1",
    ),
]


@pytest.fixture
def scenario():
    """Datos ficticios propios; los hilos necesitan transacciones independientes."""
    engine = get_engine()
    business_id = uuid4()
    user_ids, membership_ids = [uuid4() for _ in range(3)], [uuid4() for _ in range(3)]
    tokens = [new_token() for _ in range(3)]
    roles = ["TITULAR_ADMINISTRATIVO", "ADMINISTRADOR", "TRABAJADOR"]
    encoded = hash_password("Una frase de prueba larga para concurrencia de sedes")
    try:
        with Session(engine) as db:
            for user_id in user_ids:
                db.add(User(
                    id=user_id, email_normalizado=f"loc-race-{user_id.hex}@example.com",
                    display_name="Persona de prueba", password_hash=encoded, status="ACTIVO",
                ))
            db.flush()
            db.add(Business(
                id=business_id, name="Empresa Concurrencia", category="Multirrubro",
                activity_kind="MIXTO", founder_user_id=user_ids[0], status="ACTIVA",
            ))
            db.flush()
            for user_id, membership_id, token, role in zip(user_ids, membership_ids, tokens, roles):
                db.add(Membership(
                    id=membership_id, business_id=business_id, user_id=user_id,
                    role=role, status="ACTIVA",
                ))
                db.add(AuthSession(
                    user_id=user_id, token_hash=token_digest(token),
                    expires_at=now_utc() + timedelta(hours=1),
                ))
            db.commit()
        yield SimpleNamespace(
            engine=engine, business_id=business_id,
            owner={"Authorization": f"Bearer {tokens[0]}"},
            administrator={"Authorization": f"Bearer {tokens[1]}"},
            worker_id=user_ids[2], worker_membership_id=membership_ids[2],
            path=f"/api/v1/businesses/{business_id}/locations",
        )
    finally:
        with engine.begin() as conn:
            conn.execute(delete(LocationAssignment).where(LocationAssignment.business_id == business_id))
            conn.execute(delete(Location).where(Location.business_id == business_id))
            conn.execute(delete(BusinessCreationRequest).where(BusinessCreationRequest.business_id == business_id))
            conn.execute(delete(Membership).where(Membership.business_id == business_id))
            conn.execute(delete(Business).where(Business.id == business_id))
            conn.execute(delete(AuthSession).where(AuthSession.user_id.in_(user_ids)))
            conn.execute(delete(User).where(User.id.in_(user_ids)))


def request(method, path, headers, payload=None):
    with TestClient(create_app()) as client:
        return client.request(method, path, headers=headers, json=payload)


def create_location(scenario, headers, name):
    return request("POST", scenario.path, headers, {
        "name": name, "kind": "CASA", "can_sell": True, "can_store": True,
    })


def concurrently(*actions):
    barrier = Barrier(len(actions))

    def attempt(action):
        barrier.wait(timeout=5)
        return action()

    with ThreadPoolExecutor(max_workers=len(actions)) as pool:
        futures = [pool.submit(attempt, action) for action in actions]
        return [future.result(timeout=10) for future in futures]


def test_simultaneous_first_locations_have_exactly_one_primary(scenario):
    responses = concurrently(
        lambda: create_location(scenario, scenario.owner, "Sede Titular"),
        lambda: create_location(scenario, scenario.administrator, "Sede Administrador"),
    )
    assert [response.status_code for response in responses] == [201, 201]
    with scenario.engine.connect() as conn:
        rows = conn.execute(select(Location.id, Location.is_primary).where(
            Location.business_id == scenario.business_id,
        )).all()
    assert len(rows) == 2
    assert sum(row.is_primary for row in rows) == 1


def test_simultaneous_primary_changes_keep_one_of_the_requested_locations(scenario):
    original = create_location(scenario, scenario.owner, "Sede Original")
    first = create_location(scenario, scenario.owner, "Sede Primera")
    second = create_location(scenario, scenario.owner, "Sede Segunda")
    assert original.status_code == first.status_code == second.status_code == 201
    target_ids = [first.json()["id"], second.json()["id"]]
    responses = concurrently(
        lambda: request("PUT", f"{scenario.path}/{target_ids[0]}/primary", scenario.owner),
        lambda: request("PUT", f"{scenario.path}/{target_ids[1]}/primary", scenario.administrator),
    )
    assert [response.status_code for response in responses] == [200, 200]
    with scenario.engine.connect() as conn:
        primary = conn.execute(select(Location.id).where(
            Location.business_id == scenario.business_id, Location.is_primary.is_(True),
        )).scalars().all()
    assert len(primary) == 1
    assert str(primary[0]) in target_ids


def test_simultaneous_assignment_activation_reuses_one_row(scenario):
    created = create_location(scenario, scenario.owner, "Sede Asignacion")
    assert created.status_code == 201
    location_id = created.json()["id"]
    path = f"{scenario.path}/{location_id}/assignments/{scenario.worker_membership_id}"
    responses = concurrently(
        lambda: request("PUT", path, scenario.owner, {"status": "ACTIVA"}),
        lambda: request("PUT", path, scenario.administrator, {"status": "ACTIVA"}),
    )
    assert [response.status_code for response in responses] == [200, 200]
    assert responses[0].json() == responses[1].json()
    with scenario.engine.connect() as conn:
        rows = conn.execute(select(LocationAssignment.status).where(
            LocationAssignment.business_id == scenario.business_id,
            LocationAssignment.location_id == UUID(location_id),
            LocationAssignment.user_id == scenario.worker_id,
        )).all()
    assert rows == [("ACTIVA",)]


def effective_worker_permission(scenario, location_id):
    # Verifica la política con estado SQL real; no simula una venta existente.
    with Session(scenario.engine) as db:
        business = db.get(Business, scenario.business_id)
        membership = db.get(Membership, scenario.worker_membership_id)
        location = db.get(Location, UUID(location_id))
        assignment = db.get(LocationAssignment, (
            scenario.business_id, UUID(location_id), scenario.worker_id,
        ))
        return can_operate_at_location(
            role=membership.role, membership_status=membership.status,
            business_status=business.status, location_status=location.status,
            can_sell=location.can_sell, can_store=location.can_store,
            assignment_status=assignment.status, operation="SELL",
        )


def test_pause_and_membership_reactivation_preserve_existing_assignment_policy(scenario):
    created = create_location(scenario, scenario.owner, "Sede Reactivacion")
    assert created.status_code == 201
    location_id = created.json()["id"]
    assignment_path = f"{scenario.path}/{location_id}/assignments/{scenario.worker_membership_id}"
    assert request("PUT", assignment_path, scenario.owner, {"status": "ACTIVA"}).status_code == 200
    assert effective_worker_permission(scenario, location_id)
    status_path = f"{scenario.path}/{location_id}/status"
    assert request("PATCH", status_path, scenario.owner, {"status": "PAUSADA"}).status_code == 200
    assert not effective_worker_permission(scenario, location_id)
    assert request("PATCH", status_path, scenario.owner, {"status": "ACTIVA"}).status_code == 200
    assert effective_worker_permission(scenario, location_id)
    membership_path = f"/api/v1/businesses/{scenario.business_id}/memberships/{scenario.worker_membership_id}"
    assert request("PATCH", membership_path, scenario.owner, {"status": "INACTIVA"}).status_code == 200
    assert not effective_worker_permission(scenario, location_id)
    assert request("PATCH", membership_path, scenario.owner, {"status": "ACTIVA"}).status_code == 200
    assert effective_worker_permission(scenario, location_id)
    assert request("PUT", assignment_path, scenario.owner, {"status": "REVOCADA"}).status_code == 200
    assert not effective_worker_permission(scenario, location_id)
