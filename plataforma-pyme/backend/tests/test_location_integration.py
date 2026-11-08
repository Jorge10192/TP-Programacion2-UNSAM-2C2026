"""E2-2 A: restricciones SQL de ubicaciones contra PostgreSQL 16 real.

Pruebas opt-in; todos los INSERT/UPDATE se revierten con transacción exterior.
No crea empresa, ubicación, stock ni ventas persistentes.
"""
import os
from uuid import uuid4

import pytest
from sqlalchemy import insert, select, update
from sqlalchemy.exc import IntegrityError

from app.infrastructure.db import get_engine
from app.infrastructure.models import Business, Location, User

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere RUN_DB_INTEGRATION=1 y migración e22a_locations",
    ),
]


def _user(conn):
    ident = uuid4()
    conn.execute(
        insert(User).values(
            id=ident, email_normalizado=f"location-{uuid4().hex}@example.invalid",
            password_hash="dummy_hash_for_rolled_back_constraints_only",
            display_name="Integración de ubicaciones", status="ACTIVO",
        )
    )
    return ident


def _business(conn, user):
    ident = uuid4()
    conn.execute(
        insert(Business).values(
            id=ident, name="Empresa ubicación test", category="Mixto",
            activity_kind="MIXTO", founder_user_id=user,
        )
    )
    return ident


def _location(conn, business, **overrides):
    values = {
        "id": uuid4(), "business_id": business, "name": "Sede de prueba",
        "kind": "LOCAL", "can_sell": True, "can_store": False,
    }
    values.update(overrides)
    conn.execute(insert(Location).values(**values))
    return values["id"]


def _reject(conn, query):
    savepoint = conn.begin_nested()
    try:
        with pytest.raises(IntegrityError):
            conn.execute(query)
    finally:
        savepoint.rollback()


def test_new_business_starts_with_zero_locations_and_no_fake_stock() -> None:
    with get_engine().connect() as conn:
        tx = conn.begin()
        try:
            owner = _user(conn)
            business = _business(conn, owner)
            assert conn.execute(
                select(Location.id).where(Location.business_id == business)
            ).all() == []
        finally:
            tx.rollback()


def test_independent_capabilities_kind_and_optional_fields_persist() -> None:
    with get_engine().connect() as conn:
        tx = conn.begin()
        try:
            company = _business(conn, _user(conn))
            sell = _location(conn, company, kind="FERIA", can_sell=True, can_store=False)
            store = _location(conn, company, name="Depósito", kind="DEPOSITO",
                              can_sell=False, can_store=True)
            office = _location(conn, company, name="Oficina", kind="OFICINA",
                               can_sell=False, can_store=False)
            rows = {
                row.id: row for row in conn.execute(
                    select(Location).where(Location.business_id == company)
                ).scalars()
            }
            assert (rows[sell].can_sell, rows[sell].can_store) == (True, False)
            assert (rows[store].can_sell, rows[store].can_store) == (False, True)
            assert (rows[office].can_sell, rows[office].can_store) == (False, False)
            assert rows[sell].address == "" and rows[sell].map_url == ""
            assert rows[sell].status == "ACTIVA"
            assert rows[sell].is_primary is False
        finally:
            tx.rollback()


def test_primary_uniqueness_is_tenant_scoped_and_can_be_transferred() -> None:
    with get_engine().connect() as conn:
        tx = conn.begin()
        try:
            user = _user(conn)
            a, b = _business(conn, user), _business(conn, user)
            initial = _location(conn, a, is_primary=True)
            _location(conn, b, name="Sede B", is_primary=True)
            _reject(conn, insert(Location).values(
                id=uuid4(), business_id=a, name="Duplicada",
                kind="FERIA", can_sell=True, can_store=True, is_primary=True,
            ))
            conn.execute(
                update(Location).where(Location.id == initial).values(is_primary=False)
            )
            second = _location(conn, a, name="Nueva principal", is_primary=True)
            assert conn.execute(
                select(Location.is_primary).where(Location.id == second)
            ).scalar_one() is True
        finally:
            tx.rollback()


def test_cannot_pause_primary_without_revoking_primary_and_resume_is_not_automatic() -> None:
    with get_engine().connect() as conn:
        tx = conn.begin()
        try:
            business = _business(conn, _user(conn))
            location = _location(conn, business, is_primary=True)
            _reject(conn, update(Location).where(Location.id == location).values(
                status="PAUSADA"
            ))
            conn.execute(update(Location).where(Location.id == location).values(
                status="PAUSADA", is_primary=False,
            ))
            assert conn.execute(
                select(Location.is_primary, Location.status).where(Location.id == location)
            ).one() == (False, "PAUSADA")
            conn.execute(update(Location).where(Location.id == location).values(
                status="ACTIVA"
            ))
            assert conn.execute(
                select(Location.is_primary).where(Location.id == location)
            ).scalar_one() is False
        finally:
            tx.rollback()


def test_unknown_business_foreign_key_is_rejected() -> None:
    with get_engine().connect() as conn:
        tx = conn.begin()
        try:
            _reject(conn, insert(Location).values(
                id=uuid4(), business_id=uuid4(), name="Huérfana",
                kind="DEPOSITO", can_sell=False, can_store=True,
            ))
        finally:
            tx.rollback()


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("name", " "),
        ("name", "x"),
        ("kind", "BODEGA"),
        ("status", "ELIMINADA"),
    ],
)
def test_invalid_location_name_kind_and_status_rejected(field, value) -> None:
    with get_engine().connect() as conn:
        tx = conn.begin()
        try:
            business = _business(conn, _user(conn))
            values = {
                "id": uuid4(), "business_id": business, "name": "Sede válida",
                "kind": "LOCAL", "can_sell": True, "can_store": True,
            }
            values[field] = value
            _reject(conn, insert(Location).values(**values))
        finally:
            tx.rollback()


def test_location_ids_are_not_visible_in_other_tenant_queries() -> None:
    with get_engine().connect() as conn:
        tx = conn.begin()
        try:
            owner = _user(conn)
            a, b = _business(conn, owner), _business(conn, owner)
            loc_a = _location(conn, a, name="Sucursal A")
            _location(conn, b, name="Sucursal B")
            assert conn.execute(
                select(Location.id).where(
                    Location.id == loc_a, Location.business_id == b
                )
            ).scalar_one_or_none() is None
            assert conn.execute(
                select(Location.id).where(Location.business_id == a)
            ).scalars().all() == [loc_a]
        finally:
            tx.rollback()


def test_inserted_locations_are_rolled_back_with_outer_transaction() -> None:
    location_id = uuid4()
    with get_engine().connect() as conn:
        tx = conn.begin()
        try:
            business = _business(conn, _user(conn))
            _location(conn, business, id=location_id)
            assert conn.execute(
                select(Location.id).where(Location.id == location_id)
            ).scalar_one() == location_id
        finally:
            tx.rollback()
    with get_engine().connect() as conn:
        assert conn.execute(
            select(Location.id).where(Location.id == location_id)
        ).scalar_one_or_none() is None
