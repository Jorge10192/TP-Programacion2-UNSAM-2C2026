"""E2-3 B: tests HTTP/PostgreSQL con transacción exterior y aislamiento tenant.

No se crean ubicaciones ni movimientos de inventario por registrar una ficha.
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
from app.infrastructure.models import (
    Business, CatalogItem, Location, Membership,
)
from app.main import create_app

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere PostgreSQL migrado a e23a_catalog y RUN_DB_INTEGRATION=1",
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


def actor(client: TestClient) -> tuple[dict[str, str], UUID]:
    email = f"catalog-api-{uuid4().hex}@example.com"
    password = "Frase de autenticacion larga y exclusiva"
    registration = client.post("/api/v1/auth/register", json={
        "email": email, "password": password, "display_name": "Usuario Catálogo",
    })
    assert registration.status_code == 201, registration.text
    login = client.post("/api/v1/auth/login", json={
        "email": email, "password": password,
    })
    assert login.status_code == 200, login.text
    return {"Authorization": f"Bearer {login.json()['access_token']}"}, UUID(registration.json()["id"])


def business(client: TestClient, auth: dict[str, str]) -> UUID:
    response = client.post("/api/v1/businesses", headers={
        **auth, "Idempotency-Key": str(uuid4()),
    }, json={
        "name": "Comercio de prueba", "category": "Multirrubro",
        "activity_kind": "MIXTO",
    })
    assert response.status_code == 201, response.text
    return UUID(response.json()["id"])


def endpoint(bid: UUID, item: UUID | None = None) -> str:
    path = f"/api/v1/businesses/{bid}/catalog"
    return path if item is None else f"{path}/{item}"


def payload(name="Producto físico", **overrides):
    fields = {
        "name": name, "kind": "ELABORADO", "unit": "UNIDAD",
        "sellable": True, "category": "General",
        "description": "", "observations": "",
        "sku": None, "price_cents": None, "reference_cost_cents": None,
    }
    fields.update(overrides)
    return fields


def create(client, bid, auth, body=None):
    return client.post(endpoint(bid), headers=auth, json=body or payload())


def test_create_list_get_edit_persisted_and_no_stock_created(isolated):
    client, db = isolated
    owner, _ = actor(client)
    bid = business(client, owner)
    assert client.get(endpoint(bid), headers=owner).json() == []

    made = create(client, bid, owner, payload(
        "  Café   molido ", kind="REVENTA", unit="PAQUETE",
        sku="  abc-123 ", category="  Mercado    fresco ",
        price_cents=125099, reference_cost_cents=100000,
        observations="  Nota  interna ",
    ))
    assert made.status_code == 201, made.text
    v = made.json()
    assert v["business_id"] == str(bid)
    assert v["name"] == "Café molido"
    assert v["item_type"] == "BIEN"
    assert v["sku"] == "ABC-123"
    assert v["category"] == "Mercado fresco"
    assert v["observations"] == "Nota interna"
    assert v["price_cents"] == 125099
    assert v["status"] == "ACTIVO"
    assert v["id"] and v["created_at"] and v["updated_at"]
    item_id = UUID(v["id"])
    assert client.get(endpoint(bid), headers=owner).json() == [v]
    assert client.get(endpoint(bid, item_id), headers=owner).json() == v
    assert db.execute(
        select(CatalogItem.name_key).where(CatalogItem.id == item_id)
    ).scalar_one() == "café molido"

    patch = client.patch(endpoint(bid, item_id), headers=owner, json={
        "name": "  CAFÉ   Molido 250g  ",
        "sku": None, "reference_cost_cents": None,
        "price_cents": 0, "sellable": False,
    })
    assert patch.status_code == 200, patch.text
    changed = patch.json()
    assert changed["name"] == "CAFÉ Molido 250g"
    assert changed["sku"] is None
    assert changed["price_cents"] == 0
    assert changed["reference_cost_cents"] is None
    assert changed["sellable"] is False
    assert changed["status"] == "ACTIVO"
    assert db.execute(
        select(CatalogItem.name_key).where(CatalogItem.id == item_id)
    ).scalar_one() == "café molido 250g"
    assert db.execute(select(Location.id).where(Location.business_id == bid)).all() == []


def test_service_without_price_location_or_stock(isolated):
    client, db = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    result = create(client, bid, auth, payload(
        "Peluquería canina", kind="SERVICIO", unit="SERVICIO",
        sku="", price_cents=None, sellable=True,
    ))
    assert result.status_code == 201, result.text
    v = result.json()
    assert v["sku"] is None and v["price_cents"] is None
    assert v["item_type"] == "SERVICIO"
    assert db.execute(select(Location.id).where(Location.business_id == bid)).all() == []


def test_repeated_name_or_sku_in_same_business_returns_409_even_inactive(isolated):
    client, db = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    a = create(client, bid, auth, payload("  Taza   Verde  ", sku="VER-01"))
    assert a.status_code == 201, a.text
    item_id = UUID(a.json()["id"])
    db.execute(update(CatalogItem).where(
        CatalogItem.id == item_id,
    ).values(status="INACTIVO"))

    duplicate_name = create(client, bid, auth, payload("  TAZA VERDE ", sku="NUEVO-02"))
    assert duplicate_name.status_code == 409, duplicate_name.text
    duplicate_sku = create(client, bid, auth, payload("Otra taza", sku="ver-01"))
    assert duplicate_sku.status_code == 409, duplicate_sku.text
    assert [entry["status"] for entry in client.get(endpoint(bid), headers=auth).json()] == [
        "INACTIVO",
    ]
    assert db.execute(select(CatalogItem.id).where(
        CatalogItem.business_id == bid,
    )).scalars().all() == [item_id]


def test_edits_enforce_unique_name_sku_and_rollback_original(isolated):
    client, db = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    first = create(client, bid, auth, payload("Taza Azul", sku="AZUL-01")).json()
    second = create(client, bid, auth, payload("Taza Roja", sku="ROJA-02")).json()
    uid = UUID(second["id"])
    for patch in [{"name": "tAZa    AZUL"}, {"sku": "azul-01"}]:
        resp = client.patch(endpoint(bid, uid), headers=auth, json=patch)
        assert resp.status_code == 409, resp.text
        unchanged = client.get(endpoint(bid, uid), headers=auth).json()
        assert unchanged["name"] == "Taza Roja"
        assert unchanged["sku"] == "ROJA-02"
    assert len(client.get(endpoint(bid), headers=auth).json()) == 2
    assert db.execute(
        select(CatalogItem.name_key).where(CatalogItem.id == UUID(first["id"]))
    ).scalar_one() == "taza azul"


def test_same_name_and_sku_in_two_companies_are_independent(isolated):
    client, _ = isolated
    auth, _ = actor(client)
    a, b = business(client, auth), business(client, auth)
    first = create(client, a, auth, payload("Producto", sku="M-101"))
    second = create(client, b, auth, payload("Producto", sku="M-101"))
    assert first.status_code == 201 and second.status_code == 201
    assert first.json()["id"] != second.json()["id"]
    assert [v["id"] for v in client.get(endpoint(a), headers=auth).json()] == [
        first.json()["id"],
    ]
    assert client.get(endpoint(b, UUID(first.json()["id"])), headers=auth).status_code == 404
    assert client.patch(endpoint(b, UUID(first.json()["id"])), headers=auth,
                        json={"name": "No modificar"}).status_code == 404


def test_unauthorized_tenant_cannot_list_create_read_or_edit(isolated):
    client, db = isolated
    alice, _ = actor(client)
    bob, _ = actor(client)
    a, b = business(client, alice), business(client, bob)
    item_id = UUID(create(client, a, alice).json()["id"])
    assert client.get(endpoint(a), headers=bob).status_code == 404
    assert create(client, a, bob, payload("Intrusión")).status_code == 404
    assert client.get(endpoint(a, item_id), headers=bob).status_code == 404
    assert client.get(endpoint(b, item_id), headers=bob).status_code == 404
    assert client.patch(endpoint(a, item_id), headers=bob,
                        json={"name": "Secuestro"}).status_code == 404
    assert client.patch(endpoint(b, item_id), headers=bob,
                        json={"name": "Secuestro"}).status_code == 404
    assert db.execute(select(CatalogItem.name).where(
        CatalogItem.id == item_id
    )).scalar_one() == "Producto físico"


@pytest.mark.parametrize("role, expected", [
    ("ADMINISTRADOR", 201), ("ENCARGADO", 403), ("TRABAJADOR", 403),
])
def test_role_based_reads_and_writes(isolated, role, expected):
    client, db = isolated
    owner, _ = actor(client)
    colleague, uid = actor(client)
    bid = business(client, owner)
    db.execute(insert(Membership).values(
        id=uuid4(), business_id=bid, user_id=uid,
        role=role, status="ACTIVA",
    ))
    made = create(client, bid, owner)
    assert made.status_code == 201
    item_id = UUID(made.json()["id"])
    assert client.get(endpoint(bid), headers=colleague).status_code == 200
    assert client.get(endpoint(bid, item_id), headers=colleague).status_code == 200
    created = create(client, bid, colleague, payload("Nuevo artículo"))
    assert created.status_code == expected, created.text
    changed = client.patch(endpoint(bid, item_id), headers=colleague, json={
        "description": "Editado por miembro",
    })
    assert changed.status_code == (200 if expected == 201 else 403), changed.text
    if expected == 403:
        assert client.get(endpoint(bid, item_id), headers=owner).json()["description"] == ""


def test_suspended_business_allows_read_but_rejects_writes(isolated):
    client, db = isolated
    owner, _ = actor(client)
    bid = business(client, owner)
    item_id = UUID(create(client, bid, owner).json()["id"])
    db.execute(update(Business).where(
        Business.id == bid,
    ).values(status="SUSPENDIDA"))
    assert client.get(endpoint(bid), headers=owner).status_code == 200
    assert client.get(endpoint(bid, item_id), headers=owner).status_code == 200
    assert create(client, bid, owner, payload("Otro artículo")).status_code == 409
    assert client.patch(endpoint(bid, item_id), headers=owner,
                        json={"name": "No permitido"}).status_code == 409
    assert db.execute(select(CatalogItem.name).where(
        CatalogItem.id == item_id
    )).scalar_one() == "Producto físico"


def test_inactive_membership_and_revoked_session_deny_requests(isolated):
    client, db = isolated
    owner, uid = actor(client)
    bid = business(client, owner)
    item_id = UUID(create(client, bid, owner).json()["id"])
    db.execute(update(Membership).where(
        Membership.business_id == bid, Membership.user_id == uid,
    ).values(status="INACTIVA"))
    assert client.get(endpoint(bid), headers=owner).status_code == 404
    assert create(client, bid, owner, payload("Otro artículo")).status_code == 404
    assert client.patch(endpoint(bid, item_id), headers=owner,
                        json={"name": "No permitido"}).status_code == 404
    db.execute(update(Membership).where(
        Membership.business_id == bid, Membership.user_id == uid,
    ).values(status="ACTIVA"))
    assert client.post("/api/v1/auth/logout", headers=owner).status_code == 204
    assert client.get(endpoint(bid), headers=owner).status_code == 401
    assert create(client, bid, owner).status_code == 401
    assert client.patch(endpoint(bid, item_id), headers=owner,
                        json={"name": "No permitido"}).status_code == 401


@pytest.mark.parametrize("invalid", [
    {"id": str(uuid4())}, {"business_id": str(uuid4())},
    {"name_key": "hack"}, {"status": "INACTIVO"},
    {"price_cents": 1.5}, {"price_cents": "100"}, {"sellable": "true"},
    {"sku": "CÓDIGO CON ESPACIOS"},
    {"kind": "SERVICIO", "unit": "CAJA"},
])
def test_invalid_create_payloads_return_422_without_writes(isolated, invalid):
    client, db = isolated
    owner, _ = actor(client)
    bid = business(client, owner)
    response = create(client, bid, owner, payload(**invalid))
    assert response.status_code == 422, response.text
    assert db.execute(select(CatalogItem.id).where(
        CatalogItem.business_id == bid
    )).all() == []


@pytest.mark.parametrize("invalid", [
    {}, {"id": str(uuid4())}, {"business_id": str(uuid4())},
    {"status": "INACTIVO"}, {"name_key": "falso"},
    {"name": None}, {"unit": None}, {"price_cents": -1},
    {"kind": "SERVICIO"}, {"unit": "SERVICIO"},
])
def test_invalid_edit_payloads_return_422_and_keep_record(isolated, invalid):
    client, db = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    item_id = UUID(create(client, bid, auth).json()["id"])
    before = db.execute(
        select(CatalogItem.name, CatalogItem.kind, CatalogItem.unit).where(
            CatalogItem.id == item_id
        )
    ).one()
    r = client.patch(endpoint(bid, item_id), headers=auth, json=invalid)
    assert r.status_code == 422, r.text
    assert db.execute(
        select(CatalogItem.name, CatalogItem.kind, CatalogItem.unit).where(
            CatalogItem.id == item_id
        )
    ).one() == before


def test_complete_kind_unit_change_is_valid_without_commercial_history(isolated):
    client, _ = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    item_id = UUID(create(client, bid, auth).json()["id"])
    updated = client.patch(endpoint(bid, item_id), headers=auth, json={
        "kind": "SERVICIO", "unit": "SERVICIO",
    })
    assert updated.status_code == 200, updated.text
    assert updated.json()["item_type"] == "SERVICIO"
    assert updated.json()["unit"] == "SERVICIO"
    # La compatibilidad con snapshots se exigirá al implementar los módulos comerciales.


def test_list_pagination_is_stable_and_invalid_query_is_422(isolated):
    client, _ = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    for name in ["Abc", "Zeta", "Medio"]:
        assert create(client, bid, auth, payload(name)).status_code == 201
    part = client.get(endpoint(bid), headers=auth, params={"offset": 1, "limit": 1})
    assert part.status_code == 200
    assert [row["name"] for row in part.json()] == ["Medio"]
    assert client.get(endpoint(bid), headers=auth, params={"limit": 0}).status_code == 422
    assert client.get(endpoint(bid), headers=auth, params={"limit": 501}).status_code == 422
    assert client.get(endpoint(bid), headers=auth, params={"offset": -1}).status_code == 422


# E2-3 C — transición reversible de estado y efectos en el catálogo.
def set_status(client, bid, item_id, headers, status):
    return client.patch(
        endpoint(bid, item_id) + "/status",
        headers=headers, json={"status": status},
    )


def test_deactivate_reactivate_and_idempotent_status_does_not_delete(isolated):
    client, db = isolated
    owner, _ = actor(client)
    bid = business(client, owner)
    first = create(client, bid, owner, payload("Taza de vidrio", sku="TAZA-1"))
    assert first.status_code == 201
    original = first.json()
    item_id = UUID(original["id"])
    assert original["status"] == "ACTIVO"

    paused = set_status(client, bid, item_id, owner, "INACTIVO")
    assert paused.status_code == 200, paused.text
    disabled = paused.json()
    assert disabled["status"] == "INACTIVO"
    assert disabled["id"] == original["id"]
    assert disabled["sku"] == original["sku"]
    assert disabled["name"] == original["name"]
    assert db.execute(select(CatalogItem.status).where(
        CatalogItem.id == item_id, CatalogItem.business_id == bid,
    )).scalar_one() == "INACTIVO"

    again = set_status(client, bid, item_id, owner, "INACTIVO")
    assert again.status_code == 200, again.text
    assert again.json() == disabled
    listing = client.get(endpoint(bid), headers=owner)
    assert listing.status_code == 200
    assert listing.json() == [disabled]
    assert client.get(endpoint(bid, item_id), headers=owner).json() == disabled

    enabled = set_status(client, bid, item_id, owner, "ACTIVO")
    assert enabled.status_code == 200, enabled.text
    active = enabled.json()
    assert active["status"] == "ACTIVO" and active["id"] == original["id"]
    assert client.get(endpoint(bid), headers=owner).json() == [active]
    assert set_status(client, bid, item_id, owner, "ACTIVO").json() == active


def test_inactive_name_and_sku_stay_reserved_even_while_disabled(isolated):
    client, db = isolated
    owner, _ = actor(client)
    bid = business(client, owner)
    first = create(client, bid, owner, payload("Frasco verde", sku="FR-1"))
    item_id = UUID(first.json()["id"])
    assert set_status(client, bid, item_id, owner, "INACTIVO").status_code == 200
    assert create(client, bid, owner, payload("  FRASCO verde  ", sku="FR-2")).status_code == 409
    assert create(client, bid, owner, payload("Otra ficha", sku="fr-1")).status_code == 409
    assert db.execute(select(CatalogItem.sku).where(
        CatalogItem.id == item_id,
    )).scalar_one() == "FR-1"


def test_status_change_preserves_business_and_commercial_fields(isolated):
    client, db = isolated
    owner, _ = actor(client)
    bid = business(client, owner)
    created = create(client, bid, owner, payload(
        "Peluquería", kind="SERVICIO", unit="SERVICIO", sku="S-1",
        price_cents=25000, reference_cost_cents=5000,
        observations="Nota interna",
    )).json()
    item_id = UUID(created["id"])
    modified = set_status(client, bid, item_id, owner, "INACTIVO")
    assert modified.status_code == 200
    data = modified.json()
    for field in (
        "id", "business_id", "name", "kind", "item_type", "unit",
        "sku", "price_cents", "reference_cost_cents", "observations", "sellable",
    ):
        assert data[field] == created[field]
    assert db.execute(select(Location.id).where(
        Location.business_id == bid,
    )).all() == []


@pytest.mark.parametrize("role,allowed", [
    ("ADMINISTRADOR", True), ("ENCARGADO", False), ("TRABAJADOR", False),
])
def test_status_write_permission_is_company_scoped(isolated, role, allowed):
    client, db = isolated
    owner, _ = actor(client)
    colleague, uid = actor(client)
    bid = business(client, owner)
    db.execute(insert(Membership).values(
        id=uuid4(), business_id=bid, user_id=uid,
        role=role, status="ACTIVA",
    ))
    item_id = UUID(create(client, bid, owner).json()["id"])
    result = set_status(client, bid, item_id, colleague, "INACTIVO")
    assert result.status_code == (200 if allowed else 403), result.text
    assert client.get(endpoint(bid, item_id), headers=owner).json()["status"] == (
        "INACTIVO" if allowed else "ACTIVO"
    )


def test_status_command_cross_tenant_is_hidden_and_atomic(isolated):
    client, db = isolated
    alice, _ = actor(client)
    bob, _ = actor(client)
    a, b = business(client, alice), business(client, bob)
    item = UUID(create(client, a, alice).json()["id"])
    assert set_status(client, a, item, bob, "INACTIVO").status_code == 404
    assert set_status(client, b, item, bob, "INACTIVO").status_code == 404
    assert db.execute(select(CatalogItem.status).where(
        CatalogItem.id == item,
    )).scalar_one() == "ACTIVO"


def test_suspended_business_can_read_but_not_change_status(isolated):
    client, db = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    item = UUID(create(client, bid, auth).json()["id"])
    db.execute(update(Business).where(Business.id == bid).values(status="SUSPENDIDA"))
    assert client.get(endpoint(bid, item), headers=auth).status_code == 200
    assert set_status(client, bid, item, auth, "INACTIVO").status_code == 409
    assert db.execute(select(CatalogItem.status).where(
        CatalogItem.id == item,
    )).scalar_one() == "ACTIVO"


def test_inactive_membership_and_revoked_session_block_status_mutations(isolated):
    client, db = isolated
    auth, uid = actor(client)
    bid = business(client, auth)
    item = UUID(create(client, bid, auth).json()["id"])
    db.execute(update(Membership).where(
        Membership.business_id == bid, Membership.user_id == uid,
    ).values(status="INACTIVA"))
    assert set_status(client, bid, item, auth, "INACTIVO").status_code == 404
    db.execute(update(Membership).where(
        Membership.business_id == bid, Membership.user_id == uid,
    ).values(status="ACTIVA"))
    assert client.post("/api/v1/auth/logout", headers=auth).status_code == 204
    assert set_status(client, bid, item, auth, "INACTIVO").status_code == 401


@pytest.mark.parametrize("bad", [
    {}, {"status": None}, {"status": "PAUSADA"}, {"status": "BORRADO"},
    {"status": "activo"}, {"status": "INACTIVO", "sku": "FALSO"},
    {"status": "ACTIVO", "business_id": str(uuid4())},
    {"status": "INACTIVO", "kind": "SERVICIO"},
])
def test_invalid_status_payload_never_changes_existing_item(isolated, bad):
    client, db = isolated
    owner, _ = actor(client)
    bid = business(client, owner)
    item = UUID(create(client, bid, owner).json()["id"])
    result = client.patch(endpoint(bid, item) + "/status", headers=owner, json=bad)
    assert result.status_code == 422, result.text
    assert db.execute(select(CatalogItem.status).where(
        CatalogItem.id == item,
    )).scalar_one() == "ACTIVO"


def test_status_flush_exception_rollback_prevents_partial_update(isolated, monkeypatch):
    client, db = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    item = UUID(create(client, bid, auth).json()["id"])
    from app.modules.catalog.schemas import CatalogItemView
    original = CatalogItemView.from_record

    def explode_after_flush(row):
        raise RuntimeError("Fallo simulado posterior al flush de estado")

    monkeypatch.setattr(CatalogItemView, "from_record", explode_after_flush)
    with pytest.raises(RuntimeError, match="posterior al flush"):
        set_status(client, bid, item, auth, "INACTIVO")
    monkeypatch.setattr(CatalogItemView, "from_record", original)
    assert db.execute(select(CatalogItem.status).where(
        CatalogItem.id == item,
    )).scalar_one() == "ACTIVO"


# E2-3 D — regresiones de integridad y fallos transaccionales.
def test_unicode_name_and_sku_duplicates_are_atomic(isolated):
    client, db = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    made = create(client, bid, auth, payload("Straße", sku="ａｂｃ-１２３"))
    assert made.status_code == 201, made.text
    assert made.json()["sku"] == "ABC-123"
    assert create(client, bid, auth, payload(
        "STRASSE", sku="DISTINTO-1")).status_code == 409
    assert create(client, bid, auth, payload(
        "Otra ficha", sku="abc-123")).status_code == 409
    assert create(client, bid, auth, payload(
        "Sin conflicto", sku="OK-2")).status_code == 201
    assert len(client.get(endpoint(bid), headers=auth).json()) == 2
    assert db.execute(select(CatalogItem.sku).where(
        CatalogItem.id == UUID(made.json()["id"])
    )).scalar_one() == "ABC-123"


def test_inactive_unicode_names_remain_reserved_in_same_company(isolated):
    client, _ = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    item = create(client, bid, auth, payload("Café en grano", sku="CAF-01"))
    assert item.status_code == 201
    item_id = UUID(item.json()["id"])
    assert set_status(client, bid, item_id, auth, "INACTIVO").status_code == 200
    assert create(client, bid, auth, payload(
        "CAFE\u0301 EN GRANO", sku="CAF-02"
    )).status_code == 409
    assert create(client, bid, auth, payload(
        "Café tostado", sku="ｃａｆ-０１"
    )).status_code == 409
    assert client.get(endpoint(bid, item_id), headers=auth).json()["status"] == "INACTIVO"


def test_optional_fields_can_be_cleared_without_changing_item_identity(isolated):
    client, db = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    original = create(client, bid, auth, payload(
        "Mate de cerámica", sku="MAT-10",
        price_cents=1000, reference_cost_cents=600, sellable=True,
    ))
    assert original.status_code == 201
    item_id = UUID(original.json()["id"])
    changed = client.patch(endpoint(bid, item_id), headers=auth, json={
        "sku": None, "price_cents": None, "reference_cost_cents": None,
        "sellable": False,
    })
    assert changed.status_code == 200, changed.text
    record = changed.json()
    assert record["sku"] is None
    assert record["price_cents"] is None
    assert record["reference_cost_cents"] is None
    assert record["sellable"] is False
    for name in ("id", "business_id", "kind", "unit", "name", "status"):
        assert record[name] == original.json()[name]
    assert db.execute(select(CatalogItem.name_key).where(
        CatalogItem.id == item_id,
    )).scalar_one() == "mate de cerámica"


def test_incompatible_partial_type_changes_do_not_corrupt_service(isolated):
    client, db = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    result = create(client, bid, auth, payload(
        "Servicio técnico", kind="SERVICIO", unit="SERVICIO",
    ))
    assert result.status_code == 201
    item_id = UUID(result.json()["id"])
    for bad in ({"kind": "REVENTA"}, {"unit": "GRAMO"}):
        denied = client.patch(endpoint(bid, item_id), headers=auth, json=bad)
        assert denied.status_code == 422, denied.text
    assert client.get(endpoint(bid, item_id), headers=auth).json()["kind"] == "SERVICIO"
    good = client.patch(endpoint(bid, item_id), headers=auth, json={
        "kind": "INSUMO", "unit": "GRAMO",
    })
    assert good.status_code == 200, good.text
    assert good.json()["item_type"] == "BIEN"
    assert db.execute(select(CatalogItem.unit).where(
        CatalogItem.id == item_id,
    )).scalar_one() == "GRAMO"


def test_same_user_cannot_mix_artifacts_of_two_tenants(isolated):
    client, db = isolated
    auth, _ = actor(client)
    a, b = business(client, auth), business(client, auth)
    one = create(client, a, auth, payload("Producto", sku="SAME-1"))
    two = create(client, b, auth, payload("Producto", sku="SAME-1"))
    assert one.status_code == two.status_code == 201
    aid, bid = UUID(one.json()["id"]), UUID(two.json()["id"])
    assert client.get(endpoint(b, aid), headers=auth).status_code == 404
    assert client.patch(endpoint(b, aid), headers=auth,
                        json={"name": "Intrusión"}).status_code == 404
    assert set_status(client, b, aid, auth, "INACTIVO").status_code == 404
    assert client.get(endpoint(a, bid), headers=auth).status_code == 404
    for item_id in (aid, bid):
        assert db.execute(select(CatalogItem.status).where(
            CatalogItem.id == item_id,
        )).scalar_one() == "ACTIVO"


@pytest.mark.parametrize("operation", ["create", "edit"])
def test_failed_serialization_after_flush_rolls_back_operation(isolated, monkeypatch, operation):
    from app.modules.catalog.schemas import CatalogItemView

    client, db = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    first = create(client, bid, auth, payload("Original", sku="ORIG-1"))
    assert first.status_code == 201
    item_id = UUID(first.json()["id"])
    expected = client.get(endpoint(bid), headers=auth).json()

    def failure(row):
        raise RuntimeError("Error simulado tras flush")

    with monkeypatch.context() as patcher:
        patcher.setattr(CatalogItemView, "from_record", failure)
        with pytest.raises(RuntimeError, match="tras flush"):
            if operation == "create":
                create(client, bid, auth, payload("Nueva ficha", sku="NUEVA-1"))
            else:
                client.patch(endpoint(bid, item_id), headers=auth,
                             json={"name": "Nueva ficha", "sku": "NUEVA-1"})
    assert client.get(endpoint(bid), headers=auth).json() == expected
    assert db.execute(select(CatalogItem.name).where(
        CatalogItem.id == item_id,
    )).scalar_one() == "Original"


@pytest.mark.parametrize("status", ["ACTIVO", "INACTIVO"])
def test_status_repetition_is_idempotent_on_entire_response(isolated, status):
    client, _ = isolated
    auth, _ = actor(client)
    bid = business(client, auth)
    made = create(client, bid, auth)
    assert made.status_code == 201
    item_id = UUID(made.json()["id"])
    first = set_status(client, bid, item_id, auth, status)
    second = set_status(client, bid, item_id, auth, status)
    assert first.status_code == second.status_code == 200
    assert first.json() == second.json()
    assert first.json()["updated_at"] == second.json()["updated_at"]
