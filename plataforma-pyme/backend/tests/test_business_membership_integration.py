"""Integridad de empresas y membresías contra PostgreSQL 16 real.

Las transacciones exteriores revierten todos los INSERT; no quedan empresas
ni membresías de prueba y no se modifica el frontend.
"""
import os
from uuid import uuid4

import pytest
from sqlalchemy import insert, select
from sqlalchemy.exc import IntegrityError

from app.infrastructure.db import get_engine
from app.infrastructure.models import Business, Membership, User


pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere RUN_DB_INTEGRATION=1 y migracion e213a_business_members",
    ),
]


def _make_user(connection) -> object:
    user_id = uuid4()
    connection.execute(
        insert(User).values(
            id=user_id, email_normalizado=f"tenant-{uuid4().hex}@example.invalid",
            password_hash="dummy_hash_for_rolled_back_constraints_only",
            display_name="Usuario de integración", status="ACTIVO",
        )
    )
    return user_id


def _make_business(connection, founder_id) -> object:
    business_id = uuid4()
    connection.execute(
        insert(Business).values(
            id=business_id, name="Empresa de prueba",
            category="Servicios de prueba", activity_kind="SERVICIOS",
            founder_user_id=founder_id, status="ACTIVA",
        )
    )
    return business_id


def _make_membership(connection, business_id, user_id, role="TRABAJADOR"):
    connection.execute(
        insert(Membership).values(
            id=uuid4(), business_id=business_id, user_id=user_id,
            role=role, status="ACTIVA",
        )
    )


def _check_rejected(connection, stmt) -> None:
    savepoint = connection.begin_nested()
    try:
        with pytest.raises(IntegrityError):
            connection.execute(stmt)
    finally:
        savepoint.rollback()


def test_one_user_can_join_multiple_businesses_with_distinct_roles() -> None:
    with get_engine().connect() as conn:
        transaction = conn.begin()
        try:
            user = _make_user(conn)
            first = _make_business(conn, user)
            second = _make_business(conn, user)
            _make_membership(conn, first, user, "TITULAR_ADMINISTRATIVO")
            _make_membership(conn, second, user, "ENCARGADO")
            roles = conn.execute(
                select(Membership.role).where(Membership.user_id == user)
            ).scalars().all()
            assert sorted(roles) == ["ENCARGADO", "TITULAR_ADMINISTRATIVO"]
        finally:
            transaction.rollback()


def test_unique_business_user_membership_and_two_owners_forbidden() -> None:
    with get_engine().connect() as conn:
        transaction = conn.begin()
        try:
            first_user = _make_user(conn)
            other_user = _make_user(conn)
            company = _make_business(conn, first_user)
            _make_membership(conn, company, first_user, "TITULAR_ADMINISTRATIVO")
            _check_rejected(
                conn,
                insert(Membership).values(
                    id=uuid4(), business_id=company, user_id=first_user,
                    role="TRABAJADOR", status="ACTIVA",
                ),
            )
            _check_rejected(
                conn,
                insert(Membership).values(
                    id=uuid4(), business_id=company, user_id=other_user,
                    role="TITULAR_ADMINISTRATIVO", status="ACTIVA",
                ),
            )
        finally:
            transaction.rollback()


@pytest.mark.parametrize(
    ("table", "column", "invalid"),
    [
        ("business", "activity_kind", "ALIMENTOS"),
        ("business", "status", "BORRADA"),
        ("membership", "role", "DUEÑO"),
        ("membership", "status", "PENDIENTE"),
    ],
)
def test_database_enforces_valid_states_and_roles(
    table: str, column: str, invalid: str,
) -> None:
    with get_engine().connect() as conn:
        transaction = conn.begin()
        try:
            user = _make_user(conn)
            business = _make_business(conn, user)
            if table == "business":
                query = insert(Business).values(
                    id=uuid4(), name="Empresa inválida",
                    category="Servicios", activity_kind="SERVICIOS",
                    founder_user_id=user, status="ACTIVA",
                    **{column: invalid},
                )
            else:
                query = insert(Membership).values(
                    id=uuid4(), business_id=business, user_id=user,
                    role="TRABAJADOR", status="ACTIVA",
                    **{column: invalid},
                )
            _check_rejected(conn, query)
        finally:
            transaction.rollback()


def test_rejects_nonexistent_founder_or_wrong_tenant_foreign_keys() -> None:
    with get_engine().connect() as conn:
        transaction = conn.begin()
        try:
            user = _make_user(conn)
            business = _make_business(conn, user)
            _check_rejected(
                conn,
                insert(Business).values(
                    id=uuid4(), name="Sin fundador", category="Servicios",
                    activity_kind="SERVICIOS", founder_user_id=uuid4(),
                ),
            )
            _check_rejected(
                conn,
                insert(Membership).values(
                    id=uuid4(), business_id=uuid4(), user_id=user,
                    role="TRABAJADOR",
                ),
            )
            _check_rejected(
                conn,
                insert(Membership).values(
                    id=uuid4(), business_id=business, user_id=uuid4(),
                    role="TRABAJADOR",
                ),
            )
        finally:
            transaction.rollback()


def test_one_business_can_have_multiple_non_owner_members() -> None:
    with get_engine().connect() as conn:
        transaction = conn.begin()
        try:
            user = _make_user(conn)
            other = _make_user(conn)
            third = _make_user(conn)
            company = _make_business(conn, user)
            _make_membership(conn, company, user, "TITULAR_ADMINISTRATIVO")
            _make_membership(conn, company, other, "ADMINISTRADOR")
            _make_membership(conn, company, third, "TRABAJADOR")
            assert len(conn.execute(
                select(Membership.user_id).where(Membership.business_id == company)
            ).all()) == 3
        finally:
            transaction.rollback()
