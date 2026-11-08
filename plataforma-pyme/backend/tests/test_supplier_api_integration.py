"""E2-4 B: pruebas HTTP reales con PostgreSQL 16 y transacciones reversibles."""
import os
from collections.abc import Iterator
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import insert, select, update
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.infrastructure.db import get_engine
from app.infrastructure.models import Business, Location, Membership, Supplier
from app.main import create_app

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere PostgreSQL e24a_suppliers y RUN_DB_INTEGRATION=1",
    ),
]


@pytest.fixture
def isolated() -> Iterator[tuple[TestClient, object]]:
    with get_engine().connect() as connection:
        outer = connection.begin()
        app = create_app()

        def override_db() -> Iterator[Session]:
            with Session(bind=connection, join_transaction_mode="create_savepoint") as db:
                yield db

        app.dependency_overrides[get_db] = override_db
        try:
            with TestClient(app) as client:
                yield client, connection
        finally:
            app.dependency_overrides.clear()
            outer.rollback()


def actor(client):
    email = f"suppliers-api-{uuid4().hex}@example.com"
    password = "Frase suficientemente larga para autenticacion"
    registered = client.post("/api/v1/auth/register", json={
        "email": email, "password": password, "display_name": "Miembro proveedor",
    })
    assert registered.status_code == 201, registered.text
    logged = client.post("/api/v1/auth/login", json={
        "email": email, "password": password,
    })
    assert logged.status_code == 200, logged.text
    return {"Authorization": f"Bearer {logged.json()['access_token']}"}, UUID(registered.json()["id"])


def business(client, headers):
    registered = client.post("/api/v1/businesses", headers={
        **headers, "Idempotency-Key": str(uuid4()),
    }, json={
        "name": "Comercio proveedor", "category": "Multirrubro", "activity_kind": "MIXTO",
    })
    assert registered.status_code == 201, registered.text
    return UUID(registered.json()["id"])


def url(company, supplier=None):
    prefix = f"/api/v1/businesses/{company}/suppliers"
    return prefix if supplier is None else f"{prefix}/{supplier}"


def create(client, company, headers, name="Proveedor Norte", **fields):
    return client.post(url(company), headers=headers, json={"name": name, **fields})


def status(client, company, supplier, headers, value):
    return client.patch(url(company, supplier) + "/status", headers=headers, json={"status": value})


def test_create_get_list_update_full_contact_and_no_inventory(isolated):
    client, db = isolated
    headers, _ = actor(client)
    company = business(client, headers)
    assert client.get(url(company), headers=headers).json() == []
    promo_id = str(uuid4())
    created = create(
        client, company, headers, "  Repuestos   DEL Sur ",
        offerings="Artículos para motos", contact_person="Mariela",
        whatsapp="+54 (9) 11 2233-4455", email="VENTAS@EXAMPLE.COM",
        website="https://example.com/catalog",
        maps_url="https://www.google.com/maps/place/Recoleta",
        payment_methods=["TRANSFERENCIA", "EFECTIVO"],
        promotions=[{"id": promo_id, "days": [4, 1],
                     "payment_method": "TRANSFERENCIA", "benefit": "5% informativo"}],
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["business_id"] == str(company)
    assert body["name"] == "Repuestos DEL Sur"
    assert body["email"] == "ventas@example.com"
    assert body["whatsapp"] == "+5491122334455"
    assert body["promotions"][0]["days"] == [1, 4]
    assert body["status"] == "ACTIVO"
    supplier = UUID(body["id"])
    assert body["created_at"] and body["updated_at"]
    assert client.get(url(company, supplier), headers=headers).json() == body
    assert client.get(url(company), headers=headers).json() == [body]
    assert db.execute(select(Supplier.name_key).where(
        Supplier.id == supplier,
    )).scalar_one() == "repuestos del sur"
    assert db.execute(select(Location.id).where(Location.business_id == company)).all() == []
    modified = client.patch(url(company, supplier), headers=headers, json={
        "name": "Repuestos Central", "offerings": "", "whatsapp": "",
        "payment_methods": ["CUENTA_DNI"], "promotions": [],
    })
    assert modified.status_code == 200, modified.text
    data = modified.json()
    assert data["name"] == "Repuestos Central"
    assert data["offerings"] == "" and data["whatsapp"] == ""
    assert data["promotions"] == [] and data["payment_methods"] == ["CUENTA_DNI"]
    assert data["contact_person"] == "Mariela"
    assert db.execute(select(Supplier.name_key).where(
        Supplier.id == supplier,
    )).scalar_one() == "repuestos central"
    assert client.get(url(company, supplier), headers=headers).json() == data


def test_name_collisions_include_inactive_and_recovery_after_409(isolated):
    client, db = isolated
    owner, _ = actor(client)
    company = business(client, owner)
    initial = create(client, company, owner, "Tienda  CAFÉ")
    assert initial.status_code == 201, initial.text
    first = UUID(initial.json()["id"])
    assert status(client, company, first, owner, "INACTIVO").status_code == 200
    clash = create(client, company, owner, "  TIENDA café ")
    assert clash.status_code == 409, clash.text
    another = create(client, company, owner, "Distribuidora Segundo")
    assert another.status_code == 201, another.text
    attempted = client.patch(url(company, UUID(another.json()["id"])), headers=owner, json={
        "name": "tienda CAFÉ",
    })
    assert attempted.status_code == 409
    assert client.get(url(company, UUID(another.json()["id"])), headers=owner).json()["name"] == "Distribuidora Segundo"
    assert db.execute(select(Supplier.id).where(Supplier.business_id == company)).all()
    assert len(client.get(url(company), headers=owner).json()) == 2


def test_same_name_is_valid_in_two_tenants_and_foreign_id_is_hidden(isolated):
    client, _ = isolated
    owner, _ = actor(client)
    a, b = business(client, owner), business(client, owner)
    one = create(client, a, owner, "Repuestos").json()
    two = create(client, b, owner, "Repuestos").json()
    assert one["id"] != two["id"]
    assert client.get(url(b, one["id"]), headers=owner).status_code == 404
    assert client.patch(url(b, one["id"]), headers=owner, json={"name": "Secuestro"}).status_code == 404
    assert status(client, b, one["id"], owner, "INACTIVO").status_code == 404
    assert client.get(url(a, one["id"]), headers=owner).json()["name"] == "Repuestos"


def test_wrong_actor_cannot_access_any_supplier_operation(isolated):
    client, _ = isolated
    alice, _ = actor(client)
    bob, _ = actor(client)
    a, b = business(client, alice), business(client, bob)
    supplier = create(client, a, alice).json()["id"]
    assert client.get(url(a), headers=bob).status_code == 404
    assert create(client, a, bob, "Ajeno").status_code == 404
    assert client.get(url(a, supplier), headers=bob).status_code == 404
    assert client.get(url(b, supplier), headers=bob).status_code == 404
    assert client.patch(url(a, supplier), headers=bob, json={"name": "Ajeno"}).status_code == 404
    assert status(client, a, supplier, bob, "INACTIVO").status_code == 404


@pytest.mark.parametrize("role,can_write", [
    ("ADMINISTRADOR", True), ("ENCARGADO", False), ("TRABAJADOR", False),
])
def test_roles_read_and_only_administrators_write(isolated, role, can_write):
    client, db = isolated
    owner, _ = actor(client)
    colleague, colleague_id = actor(client)
    company = business(client, owner)
    db.execute(insert(Membership).values(
        id=uuid4(), business_id=company, user_id=colleague_id,
        role=role, status="ACTIVA",
    ))
    item = create(client, company, owner).json()["id"]
    assert client.get(url(company), headers=colleague).status_code == 200
    assert client.get(url(company, item), headers=colleague).status_code == 200
    assert create(client, company, colleague, "Distinto").status_code == (201 if can_write else 403)
    assert client.patch(url(company, item), headers=colleague, json={
        "offerings": "Proveedor modificado",
    }).status_code == (200 if can_write else 403)
    assert status(client, company, item, colleague, "INACTIVO").status_code == (
        200 if can_write else 403
    )


def test_suspended_company_can_read_but_cannot_write(isolated):
    client, db = isolated
    owner, _ = actor(client)
    company = business(client, owner)
    item = create(client, company, owner).json()["id"]
    db.execute(update(Business).where(Business.id == company).values(status="SUSPENDIDA"))
    assert client.get(url(company), headers=owner).status_code == 200
    assert client.get(url(company, item), headers=owner).status_code == 200
    assert create(client, company, owner, "Nuevo").status_code == 409
    assert client.patch(url(company, item), headers=owner, json={"offerings": "Cambio"}).status_code == 409
    assert status(client, company, item, owner, "INACTIVO").status_code == 409


def test_inactive_membership_and_revoked_token_are_rejected(isolated):
    client, db = isolated
    owner, user_id = actor(client)
    company = business(client, owner)
    item = create(client, company, owner).json()["id"]
    db.execute(update(Membership).where(
        Membership.business_id == company, Membership.user_id == user_id,
    ).values(status="INACTIVA"))
    assert client.get(url(company), headers=owner).status_code == 404
    assert create(client, company, owner, "Nuevo").status_code == 404
    assert status(client, company, item, owner, "INACTIVO").status_code == 404
    db.execute(update(Membership).where(
        Membership.business_id == company, Membership.user_id == user_id,
    ).values(status="ACTIVA"))
    assert client.post("/api/v1/auth/logout", headers=owner).status_code == 204
    assert client.get(url(company), headers=owner).status_code == 401
    assert create(client, company, owner, "Nuevo").status_code == 401
    assert status(client, company, item, owner, "INACTIVO").status_code == 401


@pytest.mark.parametrize("invalid", [
    {"status": "INACTIVO"}, {"name_key": "fake"}, {"business_id": str(uuid4())},
    {"id": str(uuid4())}, {"name": "x"}, {"phone": "NO TELEFONO"},
    {"website": "https://127.0.0.1/private"},
    {"maps_url": "https://google.com.evil.net/maps"},
    {"payment_methods": ["EFECTIVO", "EFECTIVO"]},
    {"promotions": [{"id": str(uuid4()), "days": [0, 0], "benefit": "descuento"}]},
])
def test_invalid_create_does_not_persist(isolated, invalid):
    client, db = isolated
    owner, _ = actor(client)
    company = business(client, owner)
    response = create(client, company, owner, **invalid)
    assert response.status_code == 422, response.text
    assert db.execute(select(Supplier.id).where(Supplier.business_id == company)).all() == []


@pytest.mark.parametrize("invalid", [
    {}, {"status": "INACTIVO"}, {"name": None}, {"email": None},
    {"payment_methods": None}, {"promotions": None}, {"name_key": "fake"},
    {"business_id": str(uuid4())}, {"website": "javascript:alert(1)"},
])
def test_invalid_patch_does_not_modify(isolated, invalid):
    client, _ = isolated
    owner, _ = actor(client)
    company = business(client, owner)
    supplier = create(client, company, owner).json()["id"]
    before = client.get(url(company, supplier), headers=owner).json()
    response = client.patch(url(company, supplier), headers=owner, json=invalid)
    assert response.status_code == 422, response.text
    assert client.get(url(company, supplier), headers=owner).json() == before


def test_status_is_idempotent_and_preserves_supplier_history(isolated):
    client, db = isolated
    owner, _ = actor(client)
    company = business(client, owner)
    created = create(client, company, owner, "Distribuidora Uno")
    item = created.json()["id"]
    initial = created.json()
    first = status(client, company, item, owner, "INACTIVO")
    second = status(client, company, item, owner, "INACTIVO")
    assert first.status_code == second.status_code == 200
    assert first.json() == second.json()
    assert first.json()["name"] == initial["name"]
    assert first.json()["business_id"] == initial["business_id"]
    assert create(client, company, owner, " DISTRIBUIDORA  UNO ").status_code == 409
    assert status(client, company, item, owner, "ACTIVO").status_code == 200
    assert db.execute(select(Supplier.id).where(Supplier.business_id == company)).all()


def test_pagination_order_and_bigint_offset(isolated):
    client, _ = isolated
    owner, _ = actor(client)
    company = business(client, owner)
    for label in ("Zeta", "Alfa", "Medio"):
        assert create(client, company, owner, label).status_code == 201
    window = client.get(url(company), headers=owner, params={"offset": 1, "limit": 1})
    assert [item["name"] for item in window.json()] == ["Medio"]
    for params in (
        {"limit": 0}, {"limit": 501}, {"offset": -1},
        {"offset": "9223372036854775808"},
    ):
        assert client.get(url(company), headers=owner, params=params).status_code == 422


def test_noop_edit_preserves_timestamps(isolated):
    client, _ = isolated
    owner, _ = actor(client)
    company = business(client, owner)
    item = create(client, company, owner).json()
    second = client.patch(url(company, item["id"]), headers=owner, json={"name": item["name"]})
    assert second.status_code == 200
    assert second.json() == item


@pytest.mark.parametrize("operation", ["create", "update"])
def test_failure_after_flush_rolls_back(isolated, monkeypatch, operation):
    from app.modules.suppliers.schemas import SupplierView

    client, db = isolated
    owner, _ = actor(client)
    company = business(client, owner)
    initial = create(client, company, owner).json()
    before = client.get(url(company), headers=owner).json()

    def fail(_row):
        raise RuntimeError("Falló la serialización tras flush")

    with monkeypatch.context() as patcher:
        patcher.setattr(SupplierView, "from_record", fail)
        with pytest.raises(RuntimeError, match="tras flush"):
            if operation == "create":
                create(client, company, owner, "Nuevo proveedor")
            else:
                client.patch(url(company, initial["id"]), headers=owner, json={
                    "offerings": "Nueva oferta",
                })
    assert client.get(url(company), headers=owner).json() == before
    assert db.execute(select(Supplier.offerings).where(
        Supplier.id == UUID(initial["id"]),
    )).scalar_one() == ""
