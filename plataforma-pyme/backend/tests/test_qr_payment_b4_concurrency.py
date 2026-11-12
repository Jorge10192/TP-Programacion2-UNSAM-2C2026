"""B4: dos cierres QR concurrentes nunca pueden debitar dos veces el mismo stock.

Usa empresa/fondos de QA independientes y limpia SOLO el tenant efímero del test.
"""
import os
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete

from app.infrastructure.db import get_engine
from app.infrastructure.models import (
    MerchantPaymentConnection, QrPaymentEvent, QrPaymentIntentLine,
    QrPaymentIntent, QrPaymentSettlement,
)
from app.main import create_app
from test_sales_concurrency_integration import sales_company, stock_and_sales
from test_receipt_api_integration import physical, receive

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1",
                       reason="Requiere PostgreSQL QA y conexiones independientes"),
]


def test_two_concurrent_qr_finalizations_single_sale_and_single_stock_debit(sales_company, monkeypatch):
    monkeypatch.setenv("PYME_ENABLE_QR_DEMO_LAB", "1")
    monkeypatch.setenv("PYME_DISPOSABLE_QA", "1")
    auth, bid, loc, good = sales_company
    intent_id = None
    try:
        with TestClient(create_app()) as client:
            purchase_id = physical(client, bid, auth, good, amount=2000)
            assert receive(client, bid, purchase_id, loc, auth).status_code == 201
            linked = client.post(
                f"/api/v1/businesses/{bid}/payment-connections/mercadopago/demo",
                headers=auth,
            )
            assert linked.status_code == 200, linked.text
            path = f"/api/v1/businesses/{bid}/qr-payment-intents"
            body = {
                "location_id": str(loc),
                "lines": [
                    {"catalog_item_id": str(good), "quantity_milli": 1000,
                     "unit_price_cents": 900},
                ],
            }
            created = client.post(path, headers={**auth, "Idempotency-Key": str(uuid4())},
                                  json=body)
            assert created.status_code == 201, created.text
            intent_id = created.json()["id"]
            approved = client.post(
                path + f"/{intent_id}/simulate",
                headers={**auth, "Idempotency-Key": str(uuid4())},
                json={"action": "APROBAR"},
            )
            assert approved.status_code == 201, approved.text

        barrier = Barrier(2)
        def close():
            with TestClient(create_app()) as c:
                barrier.wait(timeout=15)
                result = c.post(
                    f"/api/v1/businesses/{bid}/qr-payment-intents/{intent_id}/finalize-demo",
                    headers=auth,
                )
                return result.status_code, result.json()

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: close(), range(2)))

        assert sorted(status for status, _ in results) == [200, 201], results
        assert results[0][1]["sale"]["id"] == results[1][1]["sale"]["id"]
        assert sorted(r["replayed"] for _, r in results) == [False, True]
        balance, sales, movements = stock_and_sales(bid, loc, good)
        assert balance == (1000, 2)
        assert len(sales) == 1
        assert movements == [(-1000, "VENTA_SALIDA")]
    finally:
        # El fixture sales_company quita Sales, y committed_company quita el tenant.
        # Primero eliminar nuestros vínculos y eventos, nunca registros ajenos.
        with get_engine().begin() as db:
            for model in (
                QrPaymentSettlement, QrPaymentEvent, QrPaymentIntentLine,
                QrPaymentIntent, MerchantPaymentConnection,
            ):
                db.execute(delete(model).where(model.business_id == bid))
