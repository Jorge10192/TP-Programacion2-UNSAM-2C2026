"""E2-3 A: SQL real PostgreSQL 16: unicidad tenant, catálogo sin stock y CHECKs.

Opt-in mediante RUN_DB_INTEGRATION=1; cada prueba usa transacción exterior
y SAVEPOINT para evitar contaminación de datos ajenos.
"""
import os
from uuid import uuid4

import pytest
from sqlalchemy import insert, select, update
from sqlalchemy.exc import IntegrityError

from app.infrastructure.db import get_engine
from app.infrastructure.models import Business, CatalogItem, Location, User

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere RUN_DB_INTEGRATION=1 y migración e23a_catalog",
    ),
]


def user(conn):
    uid = uuid4()
    conn.execute(insert(User).values(
        id=uid, email_normalizado=f"cat-{uuid4().hex}@example.invalid",
        password_hash="hash_dummy_only_for_rollback", display_name="Catálogo test",
        status="ACTIVO",
    ))
    return uid


def business(conn, uid):
    bid = uuid4()
    conn.execute(insert(Business).values(
        id=bid, name="Empresa catálogo test", category="Multirrubro",
        activity_kind="MIXTO", founder_user_id=uid,
    ))
    return bid


def article(conn, bid, **changes):
    values = {
        "id": uuid4(), "business_id": bid, "name": "Artículo ejemplo",
        "name_key": "artículo ejemplo", "kind": "ELABORADO",
        "unit": "UNIDAD", "sku": None, "sellable": True,
        "price_cents": None, "reference_cost_cents": None,
    }
    values.update(changes)
    conn.execute(insert(CatalogItem).values(**values))
    return values["id"]


def reject(conn, sql):
    point = conn.begin_nested()
    try:
        with pytest.raises(IntegrityError):
            conn.execute(sql)
    finally:
        point.rollback()


def test_new_business_has_zero_catalog_items_and_zero_locations() -> None:
    with get_engine().connect() as conn:
        outer = conn.begin()
        try:
            bid = business(conn, user(conn))
            assert conn.execute(
                select(CatalogItem.id).where(CatalogItem.business_id == bid)
            ).all() == []
            assert conn.execute(
                select(Location.id).where(Location.business_id == bid)
            ).all() == []
        finally:
            outer.rollback()


@pytest.mark.parametrize(
    ("kind", "unit", "expected_type"),
    [
        ("ELABORADO", "UNIDAD", "BIEN"),
        ("REVENTA", "PAQUETE", "BIEN"),
        ("INSUMO", "GRAMO", "BIEN"),
        ("SERVICIO", "SERVICIO", "SERVICIO"),
    ],
)
def test_four_kinds_persist_without_creating_inventory(kind, unit, expected_type) -> None:
    with get_engine().connect() as conn:
        tx = conn.begin()
        try:
            bid = business(conn, user(conn))
            item_id = article(conn, bid, kind=kind, unit=unit)
            result = conn.execute(
                select(CatalogItem.kind, CatalogItem.unit, CatalogItem.price_cents)
                .where(CatalogItem.business_id == bid, CatalogItem.id == item_id)
            ).one()
            assert result == (kind, unit, None)
            assert ("SERVICIO" if result.kind == "SERVICIO" else "BIEN") == expected_type
            assert conn.execute(
                select(Location.id).where(Location.business_id == bid)
            ).all() == []
        finally:
            tx.rollback()


def test_sku_unique_per_company_even_if_item_is_inactive() -> None:
    with get_engine().connect() as conn:
        tx = conn.begin()
        try:
            uid = user(conn)
            a, b = business(conn, uid), business(conn, uid)
            first = article(conn, a, sku="ABC-001")
            conn.execute(update(CatalogItem).where(CatalogItem.id == first).values(
                status="INACTIVO",
            ))
            reject(conn, insert(CatalogItem).values(
                id=uuid4(), business_id=a, name="Otro artículo",
                name_key="otro artículo", kind="REVENTA", unit="UNIDAD",
                sellable=True, sku="ABC-001",
            ))
            other = article(conn, b, sku="ABC-001")
            assert conn.execute(select(CatalogItem.sku).where(
                CatalogItem.id == other
            )).scalar_one() == "ABC-001"
        finally:
            tx.rollback()


def test_normalized_name_key_unique_per_company_including_inactive() -> None:
    with get_engine().connect() as conn:
        tx = conn.begin()
        try:
            uid = user(conn)
            a, b = business(conn, uid), business(conn, uid)
            first = article(conn, a, name="  Taza  Azul  ", name_key="taza azul")
            conn.execute(update(CatalogItem).where(CatalogItem.id == first).values(
                status="INACTIVO",
            ))
            reject(conn, insert(CatalogItem).values(
                id=uuid4(), business_id=a, name="TAZA AZUL",
                name_key="taza azul", kind="REVENTA",
                unit="UNIDAD", sellable=True,
            ))
            article(conn, b, name="Taza Azul", name_key="taza azul")
            assert conn.execute(select(CatalogItem.id).where(
                CatalogItem.business_id == b
            )).scalars().all()
        finally:
            tx.rollback()


def test_multiple_null_skus_allowed_in_one_company() -> None:
    with get_engine().connect() as conn:
        tx = conn.begin()
        try:
            bid = business(conn, user(conn))
            one = article(conn, bid)
            two = article(conn, bid, name="Otro", name_key="otro")
            assert one != two
            assert conn.execute(select(CatalogItem.sku).where(
                CatalogItem.business_id == bid
            )).scalars().all() == [None, None]
        finally:
            tx.rollback()


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("kind", "UNKNOWN"),
        ("unit", "DOCENA"),
        ("status", "BORRADO"),
        ("sku", "minúsculas"),
        ("sku", "SKU CON ESPACIOS"),
        ("sku", ""),
        ("name", "X"),
        ("name_key", " "),
        ("category", "X"),
        ("price_cents", -1),
        ("price_cents", 100000000000),
        ("reference_cost_cents", -1),
        ("reference_cost_cents", 100000000000),
    ],
)
def test_postgres_rejects_invalid_values(field, value) -> None:
    with get_engine().connect() as conn:
        tx = conn.begin()
        try:
            bid = business(conn, user(conn))
            values = {
                "id": uuid4(), "business_id": bid, "name": "Artículo",
                "name_key": "artículo", "kind": "ELABORADO",
                "unit": "UNIDAD", "sellable": False,
            }
            values[field] = value
            reject(conn, insert(CatalogItem).values(**values))
        finally:
            tx.rollback()


@pytest.mark.parametrize(
    ("kind", "unit"),
    [("SERVICIO", "UNIDAD"), ("SERVICIO", "GRAMO"), ("INSUMO", "SERVICIO"),
     ("REVENTA", "SERVICIO")],
)
def test_service_unit_invariants_are_enforced_by_db(kind, unit) -> None:
    with get_engine().connect() as conn:
        tx = conn.begin()
        try:
            bid = business(conn, user(conn))
            reject(conn, insert(CatalogItem).values(
                id=uuid4(), business_id=bid, name="Artículo",
                name_key="artículo", kind=kind, unit=unit, sellable=True,
            ))
        finally:
            tx.rollback()


def test_price_zero_null_and_max_are_legal_exact_integers() -> None:
    with get_engine().connect() as conn:
        tx = conn.begin()
        try:
            bid = business(conn, user(conn))
            a = article(conn, bid, price_cents=0, reference_cost_cents=0)
            b = article(conn, bid, name="Precio máximo", name_key="precio máximo",
                        price_cents=99999999999, reference_cost_cents=99999999999)
            assert conn.execute(select(CatalogItem.price_cents).where(
                CatalogItem.id == a
            )).scalar_one() == 0
            assert conn.execute(select(CatalogItem.price_cents).where(
                CatalogItem.id == b
            )).scalar_one() == 99999999999
        finally:
            tx.rollback()


def test_sku_belongs_to_existing_company_and_no_orphan_is_accepted() -> None:
    with get_engine().connect() as conn:
        tx = conn.begin()
        try:
            reject(conn, insert(CatalogItem).values(
                id=uuid4(), business_id=uuid4(), name="Huérfano",
                name_key="huérfano", kind="INSUMO", unit="GRAMO",
                sellable=False,
            ))
        finally:
            tx.rollback()


def test_catalog_query_filtered_by_tenant_prevents_uuid_leak() -> None:
    with get_engine().connect() as conn:
        tx = conn.begin()
        try:
            uid = user(conn)
            a, b = business(conn, uid), business(conn, uid)
            item_id = article(conn, a)
            article(conn, b)
            assert conn.execute(select(CatalogItem.id).where(
                CatalogItem.id == item_id, CatalogItem.business_id == b
            )).scalar_one_or_none() is None
            assert conn.execute(select(CatalogItem.id).where(
                CatalogItem.business_id == a
            )).scalars().all() == [item_id]
        finally:
            tx.rollback()


def test_inserted_catalog_item_is_rolled_back_after_outer_transaction() -> None:
    item_id = uuid4()
    with get_engine().connect() as conn:
        tx = conn.begin()
        try:
            bid = business(conn, user(conn))
            article(conn, bid, id=item_id)
            assert conn.execute(select(CatalogItem.id).where(
                CatalogItem.id == item_id
            )).scalar_one() == item_id
        finally:
            tx.rollback()
    with get_engine().connect() as conn:
        assert conn.execute(select(CatalogItem.id).where(
            CatalogItem.id == item_id
        )).scalar_one_or_none() is None
