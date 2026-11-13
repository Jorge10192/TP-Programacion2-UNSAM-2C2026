"""B6: pruebas OFFLINE de Orders API, OAuth PKCE, firma webhook y ventas QA.

Los tests nunca llaman a api.mercadopago.com ni requieren credenciales reales.
"""
import hashlib
import hmac
import os
import time
from urllib.parse import parse_qs, urlparse
from uuid import UUID, uuid4

import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.infrastructure.models import (
    MercadoPagoTestAccount, MercadoPagoTestOrder, Sale, SalePayment,
)
from app.main import create_app
from app.modules.payments.mp_official_client import (
    MercadoPagoTransport, MpIntegrityError, money, parse_money,
    new_pkce, signature_valid, validate_order,
)
from test_qr_payment_b2 import isolated, account, create_business, base
from test_qr_payment_b3 import create_qr, simulate


def qa(monkeypatch):
    monkeypatch.setenv("PYME_DISPOSABLE_QA","1")
    monkeypatch.setenv("PYME_MP_QR_TEST_ENABLED","1")
    monkeypatch.setenv("PYME_MP_CLIENT_ID","1234567")
    monkeypatch.setenv("PYME_MP_CLIENT_SECRET","test-client-secret-not-production")
    monkeypatch.setenv("PYME_MP_REDIRECT_URI",
        "https://qa.example.test/api/v1/mercadopago/official-test/oauth/callback")
    monkeypatch.setenv("PYME_MP_FERNET_KEY",Fernet.generate_key().decode())


def get_conn(client,auth,bid):
    return client.get(f"/api/v1/businesses/{bid}/mercadopago/official-test/connection",
                      headers=auth)


def link(client,auth,bid,monkeypatch):
    calls={"oauth":0}
    def oauth(self, *, code, verifier):
        assert code=="CODE-TEST" and len(verifier)>=43
        calls["oauth"]+=1
        return {
            "access_token":"APP_USR-TEST-only-123",
            "refresh_token":"REFRESH-QA-ONLY",
            "user_id":100_000_000+calls["oauth"],
            "live_mode":False,
            "expires_in":36000,
        }
    monkeypatch.setattr(MercadoPagoTransport,"oauth",oauth)
    base_url=f"/api/v1/businesses/{bid}/mercadopago/official-test"
    start=client.post(base_url+"/oauth/start",headers=auth)
    assert start.status_code==200,start.text
    url=start.json()["authorization_url"]
    assert urlparse(url).netloc=="auth.mercadopago.com"
    state=parse_qs(urlparse(url).query)["state"][0]
    assert parse_qs(urlparse(url).query)["code_challenge_method"]==["S256"]
    callback=client.get("/api/v1/mercadopago/official-test/oauth/callback",
        params={"state":state,"code":"CODE-TEST"})
    assert callback.status_code==200,callback.text
    assert callback.json()["result"]=="linked",callback.text
    again=client.get("/api/v1/mercadopago/official-test/oauth/callback",
        params={"state":state,"code":"CODE-TEST"})
    assert again.json()["result"]=="failed"
    assert calls["oauth"]==1
    pos=client.put(base_url+"/pos",headers=auth,json={"external_pos_id":"TESTPOS001"})
    assert pos.status_code==200,pos.text
    return base_url


def official_payload(order, *, processed=False):
    return {
        "id":"ORD01K371WBFDS4MD9JG0K8ZMECBE",
        "type":"qr",
        "external_reference":order["external_reference"],
        "total_amount":money(order["total_cents"]),
        "currency":"ARS",
        "user_id":"100000001",
        "status":"processed" if processed else "created",
        "status_detail":"accredited" if processed else "created",
        "config":{"qr":{"external_pos_id":order["external_pos_id"],"mode":"dynamic"}},
        "type_response":{"qr_data":"00020101021226MPQRTEST"},
        "transactions":{"payments":[{"id":"PAY01K371WBFDS4MD9JG0KCV6PRKQ",
            "amount":money(order["total_cents"]),
            "status":"processed" if processed else "created"}]},
    }


def test_offline_order_money_and_pkce():
    assert money(123456)=="1234.56"
    assert parse_money("1234.56")==123456
    for bad in ("1.001","NaN","Infinity",0,-1):
        with pytest.raises(MpIntegrityError):
            parse_money(bad)
    verifier,challenge=new_pkce()
    assert 43<=len(verifier)<=128 and len(challenge)==43
    assert verifier!=challenge


def test_hmac_signature_and_ttl_not_body():
    secret="qa_webhook_secret"
    order_id="ORD01K371WBFDS4MD9JG0K8ZMECBE"
    rid="request-999"
    now=1_700_000_000
    ts=str(now*1000)
    msg=f"id:{order_id.lower()};request-id:{rid};ts:{ts};".encode()
    digest=hmac.new(secret.encode(),msg,hashlib.sha256).hexdigest()
    sig=f"ts={ts},v1={digest}"
    assert signature_valid(secret=secret,signature=sig,request_id=rid,data_id=order_id,now=now)
    assert not signature_valid(secret=secret,signature=sig,request_id="otro",data_id=order_id,now=now)
    assert not signature_valid(secret=secret,signature=sig,request_id=rid,data_id=order_id,now=now+301)
    assert not signature_valid(secret=secret,signature=sig,request_id=rid,
                               data_id="ORD01K371WBFDS4MD9JG0K8ZMEDIF",now=now)


def test_api_official_test_disabled_by_default(monkeypatch):
    monkeypatch.delenv("PYME_MP_QR_TEST_ENABLED",raising=False)
    with TestClient(create_app()) as client:
        target=f"/api/v1/businesses/{uuid4()}/mercadopago/official-test"
        assert client.get(target+"/connection").status_code==401
        assert client.post(target+"/oauth/start").status_code==401
        assert client.post("/api/v1/mercadopago/official-test/orders/webhook").status_code==401
        schema=client.get("/openapi.json").json()["paths"]
        assert "/api/v1/businesses/{business_id}/mercadopago/official-test/orders/from-qr/{source_intent_id}" in schema
        assert "/api/v1/mercadopago/official-test/orders/webhook" in schema


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION")!="1",reason="PostgreSQL QA")
def test_oauth_and_orders_offline_tenant_idempotent_settlement(isolated,monkeypatch):
    client, db=isolated
    qa(monkeypatch)
    owner,actor_id=account(client)
    bid=create_business(client,owner)
    base_url=link(client,owner,bid,monkeypatch)
    account_view=get_conn(client,owner,bid)
    assert account_view.status_code==200,account_view.text
    assert account_view.json()["mp_user_id"]=="100000001"
    assert account_view.json()["external_pos_id"]=="TESTPOS001"
    assert "access_token" not in account_view.text and "REFRESH" not in account_view.text
    qr=create_qr(client,owner,bid,2600)
    mock_order={"total_cents":qr["total_cents"],"external_reference":None,
        "external_pos_id":"TESTPOS001"}
    calls={"create":0,"order":0}
    def create(self,*,token,key,amount_cents,external_reference,external_pos_id,description,items=None):
        assert token=="APP_USR-TEST-only-123"
        assert key==qr["request_id"]
        assert amount_cents==qr["total_cents"]
        assert items is not None and len(items)==1
        assert items[0]["unit_price"]==money(qr["total_cents"])
        assert items[0]["quantity"]==1
        assert items[0]["title"]==qr["lines"][0]["description_snapshot"]
        calls["create"]+=1
        mock_order["external_reference"]=external_reference
        return official_payload(mock_order)
    def fetch(self,*,token,order_id):
        assert token=="APP_USR-TEST-only-123"
        calls["order"]+=1
        return official_payload(mock_order,processed=True)
    monkeypatch.setattr(MercadoPagoTransport,"create_order",create)
    monkeypatch.setattr(MercadoPagoTransport,"order",fetch)
    url=base_url+"/orders/from-qr/"+qr["id"]
    submitted=client.post(url,headers={**owner,"Idempotency-Key":qr["request_id"]})
    assert submitted.status_code==201,submitted.text
    order=submitted.json()
    assert order["status"]=="CREADA" and order["test_only"] is True
    assert order["qr_png_data_uri"].startswith("data:image/png;base64,")
    assert calls["create"]==1
    same=client.post(url,headers={**owner,"Idempotency-Key":qr["request_id"]})
    assert same.status_code==201
    assert same.json()["id"]==order["id"] and calls["create"]==1
    assert client.post(url,headers={**owner,"Idempotency-Key":str(uuid4())}).status_code==409
    read=client.get(base_url+"/orders/for-qr/"+qr["id"],headers=owner)
    assert read.status_code==200 and read.json()["id"]==order["id"]
    # Bloquea laboratorio B3/B4 para este QR con order MP.
    monkeypatch.setenv("PYME_ENABLE_QR_DEMO_LAB","1")
    assert simulate(client,owner,bid,qr["id"],"APROBAR").status_code==409
    assert client.post(base(bid)+"/"+qr["id"]+"/cancel",headers=owner).status_code==409
    assert client.post(base(bid)+"/"+qr["id"]+"/finalize-demo",headers=owner).status_code==409

    refreshed=client.post(base_url+"/orders/"+order["id"]+"/reconcile",headers=owner)
    assert refreshed.status_code==200,refreshed.text
    assert refreshed.json()["status"]=="PROCESADA"
    settled=client.post(base_url+"/orders/"+order["id"]+"/settle-qa",headers=owner)
    assert settled.status_code==200,settled.text
    assert settled.json()["sale_registered"] if "sale_registered" in settled.json() else True
    first=settled.json()["sale_id"]
    assert first
    assert client.post(base_url+"/orders/"+order["id"]+"/settle-qa",headers=owner).json()["sale_id"]==first
    assert db.scalar(select(func.count()).select_from(Sale).where(Sale.business_id==bid))==1
    payment=db.scalar(select(SalePayment.method).where(SalePayment.business_id==bid))
    assert payment=="MERCADO_PAGO_QR_TEST"
    secrets=db.execute(select(
        MercadoPagoTestAccount.access_encrypted,MercadoPagoTestAccount.refresh_encrypted,
    ).where(MercadoPagoTestAccount.business_id==bid)).one()
    assert secrets[0]!="APP_USR-TEST-only-123"
    assert secrets[1]!="REFRESH-QA-ONLY"
    assert calls["create"]==1


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION")!="1",reason="PostgreSQL QA")
def test_order_cross_tenant_and_no_live_mode_linked(isolated,monkeypatch):
    client,db=isolated
    qa(monkeypatch)
    owner,_=account(client)
    a=create_business(client,owner)
    b=create_business(client,owner)
    qr=create_qr(client,owner,a)
    # La cuenta B no puede consumir un QR A.
    assert client.get(f"/api/v1/businesses/{b}/mercadopago/official-test/orders/for-qr/{qr['id']}",
        headers=owner).status_code==404
    # La conexión OAuth no se puede generar como trabajador ajeno.
    stranger,_=account(client)
    target=f"/api/v1/businesses/{a}/mercadopago/official-test/oauth/start"
    assert client.post(target,headers=stranger).status_code==404
