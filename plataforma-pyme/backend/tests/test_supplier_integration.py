"""E2-4 A: pruebas reales con transacciones reversibles en PostgreSQL 16.

Activar RUN_DB_INTEGRATION=1 únicamente después de migrar e24a_suppliers.
No se persisten proveedores, usuarios ni empresas de prueba.
"""
import os
from uuid import uuid4

import pytest
from sqlalchemy import insert, select, update
from sqlalchemy.exc import IntegrityError

from app.infrastructure.db import get_engine
from app.infrastructure.models import Business, Supplier, User

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere RUN_DB_INTEGRATION=1 y migración e24a_suppliers",
    ),
]


def seed_business(conn, user_id=None):
    if user_id is None:
        user_id = uuid4()
        conn.execute(insert(User).values(
            id=user_id,
            email_normalizado=f"prov-{uuid4().hex}@example.invalid",
            password_hash="hash_dummy_only_for_rollback",
            display_name="Proveedor prueba", status="ACTIVO",
        ))
    business_id = uuid4()
    conn.execute(insert(Business).values(
        id=business_id, name="Comercio prueba", category="Multirrubro",
        activity_kind="MIXTO", founder_user_id=user_id,
    ))
    return business_id, user_id


def seed_supplier(conn, business_id, **changes):
    values = {
        "id": uuid4(), "business_id": business_id,
        "name": "Proveedor Uno", "name_key": "proveedor uno",
    }
    values.update(changes)
    conn.execute(insert(Supplier).values(**values))
    return values["id"]


def reject(conn, statement):
    point = conn.begin_nested()
    try:
        with pytest.raises(IntegrityError):
            conn.execute(statement)
    finally:
        point.rollback()


def test_new_business_starts_with_zero_suppliers() -> None:
    with get_engine().connect() as conn:
        outer = conn.begin()
        try:
            business_id, _ = seed_business(conn)
            assert conn.execute(
                select(Supplier.id).where(Supplier.business_id == business_id)
            ).all() == []
        finally:
            outer.rollback()


def test_default_contacts_json_and_status_are_persisted() -> None:
    with get_engine().connect() as conn:
        outer = conn.begin()
        try:
            business_id, _ = seed_business(conn)
            supplier_id = seed_supplier(conn, business_id)
            result = conn.execute(
                select(Supplier.status, Supplier.offerings, Supplier.contact_person,
                       Supplier.phone, Supplier.payment_methods, Supplier.promotions)
                .where(Supplier.id == supplier_id)
            ).one()
            assert result == ("ACTIVO", "", "", "", [], [])
        finally:
            outer.rollback()


def test_same_name_across_businesses_but_not_within_even_inactive() -> None:
    with get_engine().connect() as conn:
        outer = conn.begin()
        try:
            a, user_id = seed_business(conn)
            b, _ = seed_business(conn, user_id)
            first_id = seed_supplier(conn, a)
            conn.execute(update(Supplier).where(Supplier.id == first_id).values(
                status="INACTIVO",
            ))
            reject(conn, insert(Supplier).values(
                id=uuid4(), business_id=a, name="  PROVEEDOR UNO ",
                name_key="proveedor uno",
            ))
            second_id = seed_supplier(conn, b)
            assert conn.execute(select(Supplier.status).where(
                Supplier.id == first_id
            )).scalar_one() == "INACTIVO"
            assert second_id != first_id
            assert conn.execute(select(Supplier.id).where(
                Supplier.business_id == b, Supplier.id == first_id
            )).scalar_one_or_none() is None
        finally:
            outer.rollback()


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("name", "A"),
        ("name_key", " "),
        ("status", "BORRADO"),
        ("payment_methods", {"EFECTIVO": True}),
        ("promotions", {"benefit": "desc"}),
        ("payment_methods", ["EFECTIVO"] * 8),
        ("promotions", [{"benefit": "x"}] * 9),
    ],
)
def test_invalid_direct_sql_supplier_values_are_rejected(field, value) -> None:
    with get_engine().connect() as conn:
        outer = conn.begin()
        try:
            business_id, _ = seed_business(conn)
            values = {
                "id": uuid4(), "business_id": business_id,
                "name": "Proveedor válido", "name_key": "proveedor válido",
            }
            values[field] = value
            reject(conn, insert(Supplier).values(**values))
        finally:
            outer.rollback()


def test_unknown_business_cannot_be_referenced() -> None:
    with get_engine().connect() as conn:
        outer = conn.begin()
        try:
            reject(conn, insert(Supplier).values(
                id=uuid4(), business_id=uuid4(),
                name="Sin empresa", name_key="sin empresa",
            ))
        finally:
            outer.rollback()


def test_allowed_payment_methods_and_promotions_round_trip() -> None:
    with get_engine().connect() as conn:
        outer = conn.begin()
        try:
            business_id, _ = seed_business(conn)
            promotions = [{"id": "promo", "days": [0, 3],
                           "paymentMethod": "TRANSFERENCIA",
                           "benefit": "Descuento informativo"}]
            supplier_id = seed_supplier(
                conn, business_id, payment_methods=["EFECTIVO", "TRANSFERENCIA"],
                promotions=promotions,
            )
            row = conn.execute(
                select(Supplier.payment_methods, Supplier.promotions)
                .where(Supplier.id == supplier_id)
            ).one()
            assert row.payment_methods == ["EFECTIVO", "TRANSFERENCIA"]
            assert row.promotions == promotions
        finally:
            outer.rollback()


def test_outer_rollback_leaves_no_supplier() -> None:
    supplier_id = uuid4()
    with get_engine().connect() as conn:
        outer = conn.begin()
        try:
            business_id, _ = seed_business(conn)
            seed_supplier(conn, business_id, id=supplier_id)
            assert conn.execute(
                select(Supplier.id).where(Supplier.id == supplier_id)
            ).scalar_one() == supplier_id
        finally:
            outer.rollback()
    with get_engine().connect() as conn:
        assert conn.execute(select(Supplier.id).where(
            Supplier.id == supplier_id
        )).scalar_one_or_none() is None
