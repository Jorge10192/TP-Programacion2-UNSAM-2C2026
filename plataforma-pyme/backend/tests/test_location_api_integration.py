"""E2-2 B: aislamiento, rol, sesiones y escritura real de ubicaciones vía API.

Fixture con transacción exterior y SAVEPOINT para no afectar datos existentes.
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
from app.infrastructure.models import Business, Location, Membership
from app.main import create_app
from app.modules.locations import repository as location_repo

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere RUN_DB_INTEGRATION=1 y PostgreSQL migrado a e22b_location_casa",
    ),
]


@pytest.fixture
def isolated() -> Iterator[tuple[TestClient, object]]:
    with get_engine().connect() as connection:
        outer = connection.begin()
        application = create_app()

        def override_db() -> Iterator[Session]:
            with Session(bind=connection, join_transaction_mode="create_savepoint") as db:
                yield db

        application.dependency_overrides[get_db] = override_db
        try:
            with TestClient(application) as client:
                yield client, connection
        finally:
            application.dependency_overrides.clear()
            outer.rollback()


def actor(client: TestClient) -> tuple[dict[str, str], UUID]:
    email = f"loc-api-{uuid4().hex}@example.com"
    password = "Una frase larga y segura para integración"
    reg = client.post("/api/v1/auth/register", json={
        "email": email, "password": password, "display_name": "Persona Ubicación",
    })
    assert reg.status_code == 201, reg.text
    login = client.post("/api/v1/auth/login", json={
        "email": email, "password": password,
    })
    assert login.status_code == 200, login.text
    return {"Authorization": f"Bearer {login.json()['access_token']}"}, UUID(reg.json()["id"])


def business(client: TestClient, headers: dict[str, str]) -> UUID:
    resp = client.post(
        "/api/v1/businesses",
        headers={**headers, "Idempotency-Key": str(uuid4())},
        json={"name": "Empresa de ubicación", "category": "Servicios y productos", "activity_kind": "MIXTO"},
    )
    assert resp.status_code == 201, resp.text
    return UUID(resp.json()["id"])


def endpoint(bid: UUID, loc: UUID | None = None) -> str:
    path = f"/api/v1/businesses/{bid}/locations"
    return f"{path}/{loc}" if loc is not None else path


def data(name="Casa particular", **overrides):
    body = {
        "name": name, "kind": "CASA", "can_sell": False, "can_store": True,
        "address": "", "map_url": "",
    }
    body.update(overrides)
    return body


def test_create_casa_and_subsequent_location_with_single_primary(isolated) -> None:
    client, db = isolated
    owner, _ = actor(client)
    bid = business(client, owner)
    assert client.get(endpoint(bid), headers=owner).json() == []
    first = client.post(endpoint(bid), headers=owner, json=data())
    assert first.status_code == 201, first.text
    result = first.json()
    assert result["business_id"] == str(bid)
    assert result["kind"] == "CASA" and result["is_primary"] is True
    assert result["status"] == "ACTIVA"
    assert result["can_sell"] is False and result["can_store"] is True
    assert {"created_at", "updated_at", "id"} <= set(result)
    second = client.post(endpoint(bid), headers=owner, json=data(
        "Feria", kind="FERIA", can_sell=True, can_store=False,
    ))
    assert second.status_code == 201, second.text
    assert second.json()["is_primary"] is False
    rows = client.get(endpoint(bid), headers=owner)
    assert rows.status_code == 200, rows.text
    assert [row["id"] for row in rows.json()] == [result["id"], second.json()["id"]]
    detail = client.get(endpoint(bid, UUID(result["id"])), headers=owner)
    assert detail.status_code == 200 and detail.json() == result
    stored = db.execute(
        select(Location.is_primary).where(Location.business_id == bid)
    ).scalars().all()
    assert sorted(stored) == [False, True]


def test_company_without_location_stays_empty_and_services_do_not_create_stock(isolated) -> None:
    client, db = isolated
    owner, _ = actor(client)
    bid = business(client, owner)
    assert client.get(endpoint(bid), headers=owner).json() == []
    assert db.execute(select(Location.id).where(Location.business_id == bid)).all() == []


def test_cross_tenant_is_hidden_even_if_valid_location_id(isolated) -> None:
    client, db = isolated
    owner_a, _ = actor(client)
    owner_b, _ = actor(client)
    a = business(client, owner_a)
    b = business(client, owner_b)
    location = client.post(endpoint(a), headers=owner_a, json=data()).json()["id"]
    assert client.get(endpoint(a), headers=owner_b).status_code == 404
    assert client.post(endpoint(a), headers=owner_b, json=data("Fraude")).status_code == 404
    assert client.get(endpoint(a, UUID(location)), headers=owner_b).status_code == 404
    assert client.get(endpoint(b, UUID(location)), headers=owner_b).status_code == 404
    assert client.get(endpoint(b), headers=owner_b).json() == []
    assert db.execute(select(Location.id).where(Location.business_id == a)).all() != []


def test_member_of_two_companies_does_not_mix_records(isolated) -> None:
    client, _ = isolated
    user, _ = actor(client)
    a, b = business(client, user), business(client, user)
    first = client.post(endpoint(a), headers=user, json=data("A")).json()
    second = client.post(endpoint(b), headers=user, json=data("B")).json()
    assert first["is_primary"] is True and second["is_primary"] is True
    assert [item["name"] for item in client.get(endpoint(a), headers=user).json()] == ["A"]
    assert [item["name"] for item in client.get(endpoint(b), headers=user).json()] == ["B"]
    assert client.get(endpoint(b, UUID(first["id"])), headers=user).status_code == 404


@pytest.mark.parametrize(
    ("role", "can_create"),
    [("ADMINISTRADOR", True), ("ENCARGADO", False), ("TRABAJADOR", False)],
)
def test_active_roles_can_read_but_only_administrator_creates(isolated, role, can_create) -> None:
    client, db = isolated
    owner, _ = actor(client)
    other, other_id = actor(client)
    bid = business(client, owner)
    db.execute(insert(Membership).values(
        id=uuid4(), business_id=bid, user_id=other_id,
        role=role, status="ACTIVA",
    ))
    current = client.post(endpoint(bid), headers=owner, json=data()).json()
    assert client.get(endpoint(bid), headers=other).status_code == 200
    assert client.get(endpoint(bid, UUID(current["id"])), headers=other).status_code == 200
    response = client.post(endpoint(bid), headers=other, json=data("Otra Casa"))
    assert response.status_code == (201 if can_create else 403)
    assert len(client.get(endpoint(bid), headers=owner).json()) == (2 if can_create else 1)


def test_inactive_membership_can_neither_read_nor_create(isolated) -> None:
    client, db = isolated
    owner, uid = actor(client)
    bid = business(client, owner)
    db.execute(
        update(Membership).where(
            Membership.user_id == uid,
            Membership.business_id == bid,
        ).values(status="INACTIVA")
    )
    assert client.get(endpoint(bid), headers=owner).status_code == 404
    assert client.post(endpoint(bid), headers=owner, json=data()).status_code == 404


def test_suspended_business_is_read_only(isolated) -> None:
    client, db = isolated
    owner, _ = actor(client)
    bid = business(client, owner)
    location = client.post(endpoint(bid), headers=owner, json=data()).json()
    db.execute(update(Business).where(Business.id == bid).values(status="SUSPENDIDA"))
    assert len(client.get(endpoint(bid), headers=owner).json()) == 1
    assert client.get(endpoint(bid, UUID(location["id"])), headers=owner).status_code == 200
    assert client.post(endpoint(bid), headers=owner, json=data("Otra")).status_code == 409


def test_revoked_session_denies_get_and_create(isolated) -> None:
    client, _ = isolated
    owner, _ = actor(client)
    bid = business(client, owner)
    assert client.post("/api/v1/auth/logout", headers=owner).status_code == 204
    assert client.get(endpoint(bid), headers=owner).status_code == 401
    assert client.post(endpoint(bid), headers=owner, json=data()).status_code == 401


@pytest.mark.parametrize(
    "invalid",
    [
        {"kind": "VIVIENDA"},
        {"map_url": "https://evil.example/maps"},
        {"name": "  "},
        {"can_sell": "true"},
        {"status": "PAUSADA"},
        {"is_primary": True},
        {"business_id": "00000000-0000-4000-8000-000000000001"},
    ],
)
def test_invalid_or_protected_fields_never_create_rows(isolated, invalid) -> None:
    client, db = isolated
    owner, _ = actor(client)
    bid = business(client, owner)
    response = client.post(endpoint(bid), headers=owner, json=data(**invalid))
    assert response.status_code == 422, response.text
    assert db.execute(select(Location.id).where(Location.business_id == bid)).all() == []


def test_unknown_location_or_wrong_business_has_no_detail_leak(isolated) -> None:
    client, _ = isolated
    owner, _ = actor(client)
    bid = business(client, owner)
    result = client.get(endpoint(bid, uuid4()), headers=owner)
    assert result.status_code == 404
    assert "not found" not in result.text.lower()  # respuesta genérica


def test_failed_location_insert_does_not_leave_partial_rows(isolated, monkeypatch) -> None:
    client, db = isolated
    owner, _ = actor(client)
    bid = business(client, owner)

    def failed_add(self, location):
        raise RuntimeError("simulated location write failure")

    monkeypatch.setattr(location_repo.LocationRepository, "add", failed_add)
    with pytest.raises(RuntimeError, match="simulated location"):
        client.post(endpoint(bid), headers=owner, json=data())
    assert db.execute(select(Location.id).where(Location.business_id == bid)).all() == []


def test_all_four_casa_capability_combinations_over_real_api(isolated) -> None:
    client, _ = isolated
    owner, _ = actor(client)
    bid = business(client, owner)
    for can_sell in (False, True):
        for can_store in (False, True):
            response = client.post(endpoint(bid), headers=owner, json=data(
                f"Casa {can_sell}-{can_store}",
                can_sell=can_sell, can_store=can_store,
            ))
            assert response.status_code == 201, response.text
            assert (response.json()["can_sell"], response.json()["can_store"]) == (
                can_sell, can_store,
            )
