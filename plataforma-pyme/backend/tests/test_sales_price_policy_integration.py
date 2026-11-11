"""T10-P01: RBAC de precios y descuentos impuesto por FastAPI.

Los tests corren con rollback sobre PostgreSQL temporal; nunca generan ventas
en la cuenta real del usuario. No basta esconder controles de precio en React.
"""
import os
from uuid import uuid4

import pytest
from sqlalchemy import func, select

from app.infrastructure.models import Sale, SaleLine, SalePayment, StockMovement
from test_sales_api_integration import auth, business, item, isolated, location, payload, post
from test_sales_read_scope_integration import assign, membership, user

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        os.environ.get("RUN_DB_INTEGRATION") != "1",
        reason="Requiere PostgreSQL efímero migrado y RUN_DB_INTEGRATION=1",
    ),
]


def price(client, bid, owner, iid, cents):
    response = client.patch(
        f"/api/v1/businesses/{bid}/catalog/{iid}",
        headers=owner, json={"price_cents": cents},
    )
    assert response.status_code == 200, response.text


def count(db, bid, model):
    return db.scalar(select(func.count()).select_from(model).where(
        model.business_id == bid,
    ))


@pytest.mark.parametrize("role", ["TRABAJADOR", "ENCARGADO"])
def test_operator_requires_catalog_price_and_cannot_change_price_or_discount(isolated, role):
    client, db = isolated
    owner = auth(client)
    bid = business(client, owner)
    lid = location(client, bid, owner)
    iid = item(client, bid, owner)

    employee, uid = user(client)
    membership(db, bid, uid, role)
    assign(db, bid, lid, uid)

    body = payload(iid, cents=2000)
    body["location_id"] = str(lid)
    # Sin precio de catálogo, el operario no puede inventar un importe.
    missing = post(client, bid, employee, body)
    assert missing.status_code == 422, missing.text
    assert "precio" in missing.json()["detail"].lower()

    price(client, bid, owner, iid, 2000)
    for candidate in (
        payload(iid, cents=1900),
        payload(iid, cents=2100),
    ):
        candidate["location_id"] = str(lid)
        denied = post(client, bid, employee, candidate)
        assert denied.status_code == 403, denied.text
    discounted = payload(iid, cents=2000)
    discounted["location_id"] = str(lid)
    discounted["discount_cents"] = 100
    discounted["payments"] = [{"method": "EFECTIVO", "amount_cents": 1900}]
    response = post(client, bid, employee, discounted)
    assert response.status_code == 403, response.text
    assert count(db, bid, Sale) == 0
    assert count(db, bid, SaleLine) == 0
    assert count(db, bid, SalePayment) == 0
    assert count(db, bid, StockMovement) == 0

    key = uuid4()
    first = post(client, bid, employee, body, key=key)
    assert first.status_code == 201, first.text
    assert first.json()["total_cents"] == 2000
    assert count(db, bid, Sale) == 1

    # La edición posterior de precio no invalida un replay YA confirmado,
    # pero sí impide que el trabajador haga una segunda venta con precio viejo.
    price(client, bid, owner, iid, 2400)
    replay = post(client, bid, employee, body, key=key)
    assert replay.status_code == 200, replay.text
    assert replay.json() == first.json()
    assert post(client, bid, employee, body).status_code == 403
    assert count(db, bid, Sale) == 1
    assert count(db, bid, SalePayment) == 1


@pytest.mark.parametrize("role", ["TITULAR_ADMINISTRATIVO", "ADMINISTRADOR"])
def test_management_can_override_price_and_discount(isolated, role):
    client, db = isolated
    owner = auth(client)
    bid = business(client, owner)
    lid = location(client, bid, owner)
    iid = item(client, bid, owner)

    if role == "ADMINISTRADOR":
        who, uid = user(client)
        membership(db, bid, uid, role)
    else:
        who = owner

    # No hay precio de catálogo. Titular y administrador pueden cotizar
    # explícitamente, aplicar descuentos y declarar pagos mixtos.
    body = payload(iid, cents=2700)
    body["location_id"] = str(lid)
    body["discount_cents"] = 300
    body["payments"] = [
        {"method": "EFECTIVO", "amount_cents": 1400},
        {"method": "TRANSFERENCIA", "amount_cents": 1000},
    ]
    created = post(client, bid, who, body)
    assert created.status_code == 201, created.text
    assert created.json()["total_cents"] == 2400

    price(client, bid, owner, iid, 1800)
    amended = payload(iid, cents=2800)
    amended["location_id"] = str(lid)
    assert post(client, bid, who, amended).status_code == 201
    assert count(db, bid, Sale) == 2


def test_prices_checked_per_line_even_if_one_line_matches_catalog(isolated):
    client, db = isolated
    owner = auth(client)
    bid = business(client, owner)
    lid = location(client, bid, owner)
    one = item(client, bid, owner, name="Servicio uno")
    two = item(client, bid, owner, name="Servicio dos")
    price(client, bid, owner, one, 1500)
    price(client, bid, owner, two, 2200)

    employee, uid = user(client)
    membership(db, bid, uid, "ENCARGADO")
    assign(db, bid, lid, uid)

    sale = {
        "location_id": str(lid),
        "lines": [
            {"catalog_item_id": str(one), "quantity_milli": 1000, "unit_price_cents": 1500},
            {"catalog_item_id": str(two), "quantity_milli": 1000, "unit_price_cents": 2100},
        ],
        "payments": [{"method": "EFECTIVO", "amount_cents": 3600}],
    }
    assert post(client, bid, employee, sale).status_code == 403
    assert count(db, bid, Sale) == 0
    sale["lines"][1]["unit_price_cents"] = 2200
    sale["payments"][0]["amount_cents"] = 3700
    assert post(client, bid, employee, sale).status_code == 201
    assert count(db, bid, Sale) == 1


def test_price_policy_does_not_grant_access_to_unassigned_location(isolated):
    client, db = isolated
    owner = auth(client)
    bid = business(client, owner)
    lid = location(client, bid, owner)
    iid = item(client, bid, owner)
    price(client, bid, owner, iid, 2000)
    worker, uid = user(client)
    membership(db, bid, uid, "TRABAJADOR")
    body = payload(iid)
    body["location_id"] = str(lid)
    assert post(client, bid, worker, body).status_code == 403
    assert count(db, bid, Sale) == 0
