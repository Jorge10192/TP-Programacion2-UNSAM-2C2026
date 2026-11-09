"""Carreras reales de nombre/SKU por tenant, tanto SQL como HTTP."""
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, func, insert, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.infrastructure.db import get_engine
from app.infrastructure.models import (
    AuthSession, Business, CatalogItem, Membership, User,
)
from app.main import create_app
from app.modules.auth.passwords import hash_password
from app.modules.auth.tokens import new_token, now_utc, token_digest

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere PostgreSQL de desarrollo migrado y RUN_DB_INTEGRATION=1",
    ),
]


@pytest.fixture
def scenario():
    """Filas propias confirmadas: cada contendiente usa otra transacción."""
    engine = get_engine()
    bids = [uuid4(), uuid4()]
    users = [uuid4(), uuid4()]
    tokens = [new_token(), new_token()]
    encoded = hash_password("Una frase de prueba para carreras del catalogo")
    try:
        with Session(engine) as db:
            for uid in users:
                db.add(User(
                    id=uid, email_normalizado=f"catalog-race-{uid.hex}@example.com",
                    display_name="Persona de prueba", password_hash=encoded, status="ACTIVO",
                ))
            db.flush()
            for bid, uid in zip(bids, users):
                db.add(Business(
                    id=bid, name="Empresa de prueba", category="Multirrubro",
                    activity_kind="MIXTO", founder_user_id=uid, status="ACTIVA",
                ))
            db.flush()
            for bid, uid, role in (
                (bids[0], users[0], "TITULAR_ADMINISTRATIVO"),
                (bids[0], users[1], "ADMINISTRADOR"),
                (bids[1], users[1], "TITULAR_ADMINISTRATIVO"),
            ):
                db.add(Membership(
                    id=uuid4(), business_id=bid, user_id=uid,
                    role=role, status="ACTIVA",
                ))
            for uid, token in zip(users, tokens):
                db.add(AuthSession(
                    user_id=uid, token_hash=token_digest(token),
                    expires_at=now_utc() + timedelta(hours=1),
                ))
            db.commit()
        yield SimpleNamespace(engine=engine, bids=bids, tokens=tokens)
    finally:
        with engine.begin() as conn:
            conn.execute(delete(CatalogItem).where(CatalogItem.business_id.in_(bids)))
            conn.execute(delete(Membership).where(Membership.business_id.in_(bids)))
            conn.execute(delete(Business).where(Business.id.in_(bids)))
            conn.execute(delete(AuthSession).where(AuthSession.user_id.in_(users)))
            conn.execute(delete(User).where(User.id.in_(users)))


def parallel(actions):
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(action) for action in actions]
        return [future.result(timeout=20) for future in futures]


@pytest.mark.parametrize("key,constraint", [
    ("name", "uq_catalog_items_business_name"),
    ("sku", "uq_catalog_items_business_sku"),
])
def test_simultaneous_sql_inserts_preserve_unique_keys(scenario, key, constraint):
    barrier = Barrier(2)

    def attempt(index):
        with scenario.engine.connect() as conn:
            pid = conn.scalar(select(func.pg_backend_pid()))
            conn.exec_driver_sql("SET LOCAL statement_timeout = '8s'")
            values = dict(
                id=uuid4(), business_id=scenario.bids[0],
                name="Artículo compartido" if key == "name" else f"Artículo {index}",
                name_key="artículo compartido" if key == "name" else f"artículo {index}",
                sku="SHARED-1" if key == "sku" else f"SKU-{index}",
                kind="REVENTA", unit="UNIDAD", sellable=True,
            )
            barrier.wait(timeout=5)
            try:
                conn.execute(insert(CatalogItem).values(**values))
                conn.commit()
                return pid, "inserted", None
            except IntegrityError as error:
                conn.rollback()
                return pid, error.orig.sqlstate, error.orig.diag.constraint_name

    results = parallel([lambda: attempt(0), lambda: attempt(1)])
    assert len({result[0] for result in results}) == 2
    assert sorted(result[1] for result in results) == ["23505", "inserted"]
    assert [result[2] for result in results if result[1] == "23505"] == [constraint]
    with scenario.engine.connect() as conn:
        assert conn.scalar(select(func.count()).select_from(CatalogItem).where(
            CatalogItem.business_id == scenario.bids[0],
        )) == 1


def simultaneous_posts(scenario, bids, payloads):
    barrier = Barrier(2)

    def attempt(index):
        app = create_app()
        with Session(scenario.engine) as db:
            pid = db.scalar(select(func.pg_backend_pid()))
            db.connection().exec_driver_sql("SET LOCAL statement_timeout = '8s'")

            def override_db():
                yield db

            app.dependency_overrides[get_db] = override_db
            with TestClient(app) as client:
                barrier.wait(timeout=5)
                response = client.post(
                    f"/api/v1/businesses/{bids[index]}/catalog",
                    headers={"Authorization": f"Bearer {scenario.tokens[index]}"},
                    json=payloads[index],
                )
            return pid, response

    results = parallel([lambda: attempt(0), lambda: attempt(1)])
    assert len({result[0] for result in results}) == 2
    return [result[1] for result in results]


@pytest.mark.parametrize("key", ["name", "sku"])
def test_concurrent_normalized_http_duplicates_return_201_and_409(scenario, key):
    payloads = [dict(name=f"Producto {i}", sku=f"SKU-{i}", kind="REVENTA",
                     unit="UNIDAD", sellable=True) for i in range(2)]
    variants = ["  Café   molido ", "ＣＡＦÉ MOLIDO"] if key == "name" else [" abc-123 ", "ＡＢＣ-１２３"]
    for payload, value in zip(payloads, variants):
        payload[key] = value
    responses = simultaneous_posts(scenario, [scenario.bids[0]] * 2, payloads)
    assert sorted(response.status_code for response in responses) == [201, 409]
    with scenario.engine.connect() as conn:
        assert conn.scalar(select(func.count()).select_from(CatalogItem).where(
            CatalogItem.business_id == scenario.bids[0],
        )) == 1


def test_concurrent_same_keys_in_separate_tenants_both_succeed(scenario):
    payload = dict(name="Producto compartido", sku="SHARED", kind="REVENTA",
                   unit="UNIDAD", sellable=True)
    responses = simultaneous_posts(scenario, scenario.bids, [payload, payload])
    assert [response.status_code for response in responses] == [201, 201]
    assert {response.json()["business_id"] for response in responses} == {
        str(bid) for bid in scenario.bids
    }
    assert len({response.json()["id"] for response in responses}) == 2
