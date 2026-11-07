"""Restricciones SQL PostgreSQL para identidad; se revierte toda inserción.

Solo se activa con RUN_DB_INTEGRATION=1 y base migrada a e2101_users.
"""
import os
from uuid import uuid4

import pytest
from sqlalchemy import insert, select
from sqlalchemy.exc import IntegrityError

from app.infrastructure.db import get_engine
from app.infrastructure.models import User


pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere RUN_DB_INTEGRATION=1 y migracion e2101_users",
    ),
]


def _values(**overrides: str) -> dict[str, object]:
    data: dict[str, object] = {
        "id": uuid4(),
        "email_normalizado": f"db-test-{uuid4().hex}@example.invalid",
        # Fixture falso; NO es un hash para autenticar y nunca se confirma.
        "password_hash": "placeholder_for_sql_constraint_tests_only",
        "display_name": "Usuario de prueba",
        "status": "ACTIVO",
    }
    data.update(overrides)
    return data


def test_insertion_is_visible_in_transaction_and_rolled_back() -> None:
    values = _values()
    with get_engine().connect() as conn:
        transaction = conn.begin()
        try:
            conn.execute(insert(User).values(**values))
            assert conn.execute(
                select(User.id).where(User.id == values["id"])
            ).scalar_one() == values["id"]
        finally:
            transaction.rollback()
        assert conn.execute(
            select(User.id).where(User.id == values["id"])
        ).scalar_one_or_none() is None


def test_duplicate_normalized_email_rejected() -> None:
    values = _values()
    with get_engine().connect() as conn:
        transaction = conn.begin()
        try:
            conn.execute(insert(User).values(**values))
            savepoint = conn.begin_nested()
            try:
                with pytest.raises(IntegrityError):
                    conn.execute(
                        insert(User).values(**{**values, "id": uuid4()})
                    )
            finally:
                savepoint.rollback()
        finally:
            transaction.rollback()


@pytest.mark.parametrize(
    ("field", "invalid_value"),
    [
        ("email_normalizado", "UpperCase@example.invalid"),
        ("email_normalizado", " leading-space@example.invalid"),
        ("display_name", " "),
        ("password_hash", "short"),
        ("status", "ADMINISTRADOR"),
    ],
)
def test_postgres_rejects_invalid_user_values(
    field: str, invalid_value: str,
) -> None:
    values = _values(**{field: invalid_value})
    with get_engine().connect() as conn:
        transaction = conn.begin()
        try:
            with pytest.raises(IntegrityError):
                conn.execute(insert(User).values(**values))
        finally:
            transaction.rollback()
