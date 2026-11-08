"""E2-1.3C.2: autorización real de edición empresarial, aislada por tenant.

Pruebas HTTP con SQLAlchemy/PostgreSQL 16 real. Las sesiones de prueba usan
SAVEPOINT y una transacción exterior que SIEMPRE se revierte al terminar.
"""
import os
from collections.abc import Iterator
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import insert, select, update
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.infrastructure.db import get_engine
from app.infrastructure.models import Business, Membership, User
from app.main import create_app
from app.modules.businesses.schemas import BusinessView


pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere RUN_DB_INTEGRATION=1 y PostgreSQL e213b_business_creation",
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


def actor(client: TestClient) -> tuple[dict[str, str], UUID]:
    email = f"edit-{uuid4().hex}@example.com"
    password = "Una contrasena segura de prueba para editar"
    registration = client.post(
        "/api/v1/auth/register",
        json={
            "email": email, "password": password,
            "display_name": "Persona de Prueba",
        },
    )
    assert registration.status_code == 201, registration.text
    login = client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, UUID(registration.json()["id"])


def company(client: TestClient, headers: dict[str, str]) -> UUID:
    created = client.post(
        "/api/v1/businesses",
        headers={**headers, "Idempotency-Key": str(uuid4())},
        json={
            "name": "Empresa Inicial",
            "category": "Comercio Minorista",
            "activity_kind": "PRODUCTOS",
        },
    )
    assert created.status_code == 201, created.text
    return UUID(created.json()["id"])


def patch(
    client: TestClient, headers: dict[str, str],
    business_id: UUID, data: dict[str, object],
):
    return client.patch(
        f"/api/v1/businesses/{business_id}", headers=headers, json=data,
    )


def add_member(connection, business_id: UUID, user_id: UUID, role: str) -> None:
    connection.execute(
        insert(Membership).values(
            id=uuid4(), business_id=business_id, user_id=user_id,
            role=role, status="ACTIVA",
        )
    )


def saved_profile(connection, business_id: UUID) -> tuple[str, str, str]:
    return connection.execute(
        select(Business.name, Business.category, Business.activity_kind)
        .where(Business.id == business_id)
    ).one()._tuple()


def test_owner_can_edit_all_profile_fields_and_get_reflects_changes(isolated) -> None:
    client, connection = isolated
    auth, user_id = actor(client)
    business_id = company(client, auth)
    result = patch(
        client, auth, business_id,
        {
            "name": "  Empresa Actualizada ",
            "category": " Servicios Empresariales ",
            "activity_kind": "MIXTO",
        },
    )
    assert result.status_code == 200, result.text
    body = result.json()
    assert body["name"] == "Empresa Actualizada"
    assert body["category"] == "Servicios Empresariales"
    assert body["activity_kind"] == "MIXTO"
    assert body["membership"]["role"] == "TITULAR_ADMINISTRATIVO"
    assert body["founder_user_id"] == str(user_id)
    assert saved_profile(connection, business_id) == (
        "Empresa Actualizada", "Servicios Empresariales", "MIXTO",
    )
    visible = client.get(f"/api/v1/businesses/{business_id}", headers=auth)
    assert visible.status_code == 200
    assert visible.json()["name"] == "Empresa Actualizada"


def test_administrator_can_edit_but_permissions_are_tenant_specific(isolated) -> None:
    client, connection = isolated
    owner, _ = actor(client)
    business_id = company(client, owner)
    admin, admin_id = actor(client)
    add_member(connection, business_id, admin_id, "ADMINISTRADOR")
    result = patch(
        client, admin, business_id, {"category": "Nueva Categoría"},
    )
    assert result.status_code == 200, result.text
    assert saved_profile(connection, business_id) == (
        "Empresa Inicial", "Nueva Categoría", "PRODUCTOS"
    )
    other_id = company(client, owner)
    # El rol ADMINISTRADOR pertenece solo a business_id, no a other_id.
    assert patch(
        client, admin, other_id, {"name": "No autorizado"},
    ).status_code == 404


@pytest.mark.parametrize("role", ["ENCARGADO", "TRABAJADOR"])
def test_non_editing_roles_get_403_without_mutating_data(isolated, role: str) -> None:
    client, connection = isolated
    owner, _ = actor(client)
    business_id = company(client, owner)
    member_headers, member_id = actor(client)
    add_member(connection, business_id, member_id, role)
    before = saved_profile(connection, business_id)
    assert client.get(
        f"/api/v1/businesses/{business_id}", headers=member_headers
    ).status_code == 200
    response = patch(
        client, member_headers, business_id, {"name": "Cambio indebido"}
    )
    assert response.status_code == 403, response.text
    assert saved_profile(connection, business_id) == before


def test_foreign_or_nonexistent_business_is_404_without_leak(isolated) -> None:
    client, connection = isolated
    owner, _ = actor(client)
    business_id = company(client, owner)
    unrelated, _ = actor(client)
    before = saved_profile(connection, business_id)
    r1 = patch(client, unrelated, business_id, {"name": "Intento ajeno"})
    r2 = patch(client, unrelated, uuid4(), {"name": "Intento ajeno"})
    assert r1.status_code == 404
    assert r2.status_code == 404
    assert r1.json() == r2.json()
    assert saved_profile(connection, business_id) == before


def test_inactive_membership_returns_404_and_keeps_business_unchanged(isolated) -> None:
    client, connection = isolated
    owner, _ = actor(client)
    business_id = company(client, owner)
    collaborator, collaborator_id = actor(client)
    add_member(connection, business_id, collaborator_id, "ADMINISTRADOR")
    connection.execute(
        update(Membership)
        .where(
            Membership.business_id == business_id,
            Membership.user_id == collaborator_id,
        )
        .values(status="INACTIVA")
    )
    before = saved_profile(connection, business_id)
    response = patch(
        client, collaborator, business_id, {"name": "Intento inactivo"}
    )
    assert response.status_code == 404
    assert saved_profile(connection, business_id) == before


def test_suspended_business_is_readable_but_owner_cannot_edit(isolated) -> None:
    client, connection = isolated
    owner, _ = actor(client)
    business_id = company(client, owner)
    connection.execute(
        update(Business).where(Business.id == business_id).values(status="SUSPENDIDA")
    )
    before = saved_profile(connection, business_id)
    assert client.get(
        f"/api/v1/businesses/{business_id}", headers=owner
    ).status_code == 200
    response = patch(client, owner, business_id, {"name": "No editable"})
    assert response.status_code == 409, response.text
    assert saved_profile(connection, business_id) == before


def test_revoked_session_and_disabled_user_are_denied(isolated) -> None:
    client, connection = isolated
    owner, user_id = actor(client)
    business_id = company(client, owner)
    before = saved_profile(connection, business_id)
    assert client.post("/api/v1/auth/logout", headers=owner).status_code == 204
    assert patch(
        client, owner, business_id, {"name": "Luego de logout"}
    ).status_code == 401
    still_active, other_user_id = actor(client)
    company_id = company(client, still_active)
    connection.execute(
        update(User).where(User.id == other_user_id).values(status="DESHABILITADO")
    )
    assert patch(
        client, still_active, company_id, {"name": "Cuenta deshabilitada"}
    ).status_code == 401
    assert saved_profile(connection, business_id) == before


def test_invalid_patch_is_422_and_does_not_change_persistence(isolated) -> None:
    client, connection = isolated
    owner, _ = actor(client)
    business_id = company(client, owner)
    before = saved_profile(connection, business_id)
    for payload in ({}, {"name": None}, {"status": "SUSPENDIDA"}):
        response = patch(client, owner, business_id, payload)
        assert response.status_code == 422, response.text
    assert saved_profile(connection, business_id) == before


def test_rollback_on_error_after_sql_flush(isolated, monkeypatch) -> None:
    client, connection = isolated
    owner, _ = actor(client)
    business_id = company(client, owner)
    before = saved_profile(connection, business_id)

    def fail_serialization(cls, company_obj, member_obj):
        raise RuntimeError("Simulated failure after SQL flush")

    monkeypatch.setattr(BusinessView, "from_records", classmethod(fail_serialization))
    with pytest.raises(RuntimeError, match="failure after SQL flush"):
        patch(client, owner, business_id, {"name": "Cambio revertido"})
    assert saved_profile(connection, business_id) == before
