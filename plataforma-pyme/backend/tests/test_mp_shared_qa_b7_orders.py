"""B7-B: pruebas offline y sobre PostgreSQL QA; nunca llaman a Mercado Pago."""
import json
import os
from uuid import UUID, uuid4

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.infrastructure.models import MpSharedQaBox, MpSharedQaOrder, Sale, SalePayment
from app.main import create_app
from app.modules.payments.mp_official_client import (
    MercadoPagoTransport, MpIntegrityError, MpProviderFailure,
    validate_order, money,
)
from app.modules.payments.mp_shared_qa_config import MERCHANT_ID, EXTERNAL_POS_ID
from test_qr_payment_b2 import isolated, account, create_business, create_item, body, base


def enabled(monkeypatch):
    monkeypatch.setenv("PYME_DISPOSABLE_QA", "1")
    monkeypatch.setenv("PYME_MP_QR_SHARED_QA_ENABLED", "1")
    monkeypatch.setenv("PYME_MP_SHARED_QA_ORDERS_ENABLED", "1")
    monkeypatch.setenv("PYME_MP_SHARED_QA_ACCESS_TOKEN", "APP_USR-" + "a" * 45)


def payload(info, status="created"):
    detail = {"created":"created","processed":"accredited",
              "canceled":"canceled","expired":"expired"}[status]
    tx_detail = "accredited" if status == "processed" else (
        "ready_to_process" if status == "created" else detail)
    return {
        "id": info["id"], "type": "qr", "user_id": MERCHANT_ID,
        "external_reference": info["external_reference"],
        "total_amount": money(info["total_cents"]),
        "currency": "ARS", "status": status, "status_detail": detail,
        "config":{"qr":{"external_pos_id":EXTERNAL_POS_ID,"mode":"static"}},
        "transactions":{"payments":[{
            "id":"PAY01K371WBFDS4MD9JG0KCV6PRKQ",
            "amount": money(info["total_cents"]),
            "status": status,
            "status_detail": tx_detail,
        }]},
    }


def test_static_order_http_contract_and_token_never_in_json():
    calls=[]
    def handler(req):
        calls.append(req)
        assert str(req.url)=="https://api.mercadopago.com/v1/orders"
        assert req.headers["Authorization"]=="Bearer secret-qa"
        assert req.headers["X-Idempotency-Key"]=="same-key"
        data=json.loads(req.content)
        assert data["config"]["qr"]=={
            "external_pos_id":EXTERNAL_POS_ID, "mode":"static"}
        assert data["total_amount"]=="50.00"
        assert data["transactions"]["payments"]==[{"amount":"50.00"}]
        assert "secret-qa" not in req.content.decode()
        return httpx.Response(201,json={"id":"ORD01K371WBFDS4MD9JG0K8ZMECBE"})
    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        MercadoPagoTransport(client).create_order(
            token="secret-qa",key="same-key",amount_cents=5000,
            external_reference="PYME"+"A"*32,
            external_pos_id=EXTERNAL_POS_ID, description="test",
            items=[{"title":"Servicio","unit_price":"50.00",
                    "quantity":1,"unit_measure":"unit"}],mode="static",
        )
    assert len(calls)==1
    record={"id":"ORD01K371WBFDS4MD9JG0K8ZMECBE",
            "external_reference":"PYME"+"A"*32,"total_cents":5000}
    assert validate_order(payload(record),order_id=None,
        external_reference=record["external_reference"], amount_cents=5000,
        merchant_id=MERCHANT_ID,pos_id=EXTERNAL_POS_ID,mode="static")[0]=="created"
    with pytest.raises(MpIntegrityError):
        validate_order(payload(record),order_id=None,
            external_reference=record["external_reference"], amount_cents=5000,
            merchant_id=MERCHANT_ID,pos_id=EXTERNAL_POS_ID,mode="dynamic")


def test_shared_orders_endpoint_rejects_anonymous():
    with TestClient(create_app()) as client:
        path=f"/api/v1/businesses/{uuid4()}/mercadopago/qa-shared"
        assert client.post(path+"/orders/from-qr/"+str(uuid4())).status_code==401
        assert client.get(path+"/orders/for-qr/"+str(uuid4())).status_code==401


@pytest.mark.integration
@pytest.mark.skipif(os.getenv("RUN_DB_INTEGRATION")!="1",reason="PostgreSQL QA migrado")
def test_shared_single_box_replay_cancel_other_business_and_no_access(isolated,monkeypatch):
    client,db=isolated
    enabled(monkeypatch)
    owner,_=account(client)
    foreign,_=account(client)
    a=create_business(client,owner)
    b=create_business(client,owner)
    info={}
    calls={"create":0}
    def seller(self, *, token):
        assert token.startswith("APP_USR-")
        return {"id":MERCHANT_ID,"site_id":"MLA"}
    def create(self, *, token,key,amount_cents,external_reference,external_pos_id,
               description,items=None,mode="dynamic"):
        assert mode=="static" and external_pos_id==EXTERNAL_POS_ID
        assert items and amount_cents>=1
        calls["create"]+=1
        info[external_reference]={
            "id":"ORD01K371WBFDS4MD9JG0K8ZME"+("CBE" if calls["create"]==1 else "CBF"),
            "total_cents":amount_cents,"external_reference":external_reference,
        }
        return payload(info[external_reference])
    def cancel(self, *, token,order_id,key):
        row=next(x for x in info.values() if x["id"]==order_id)
        return payload(row,"canceled")
    monkeypatch.setattr(MercadoPagoTransport,"seller",seller)
    monkeypatch.setattr(MercadoPagoTransport,"create_order",create)
    monkeypatch.setattr(MercadoPagoTransport,"cancel",cancel)

    def make_qr(bid, amount):
        item=create_item(client,owner,bid,"Servicio prueba "+uuid4().hex[:6])
        response=client.post(base(bid),headers={
            **owner,"Idempotency-Key":str(uuid4())},json=body([(item,amount)]))
        assert response.status_code==201,response.text
        return response.json()
    qa=make_qr(a,1700)  # sin POST /demo; conexión automática.
    qb=make_qr(b,2300)
    assert client.get(f"/api/v1/businesses/{a}/payment-connections/mercadopago",
                      headers=owner).json()["status"]=="ACTIVA"
    endpoint=lambda bid,qr:f"/api/v1/businesses/{bid}/mercadopago/qa-shared/orders/from-qr/{qr['id']}"
    first=client.post(endpoint(a,qa),headers={**owner,"Idempotency-Key":qa["request_id"]})
    assert first.status_code==201,first.text
    order=first.json()
    assert order["status"]=="CREADA" and order["shared_box"] is True
    assert order["qr_png_data_uri"].startswith("data:image/png;base64,")
    assert calls["create"]==1
    blocked=client.post(endpoint(b,qb),headers={**owner,"Idempotency-Key":qb["request_id"]})
    assert blocked.status_code==409,blocked.text
    same=client.post(endpoint(a,qa),headers={**owner,"Idempotency-Key":qa["request_id"]})
    assert same.status_code==201 and same.json()["id"]==order["id"]
    assert calls["create"]==1
    assert client.get(f"/api/v1/businesses/{a}/mercadopago/qa-shared/orders/{order['id']}",
                      headers=foreign).status_code==404
    assert client.post(base(a)+"/"+qa["id"]+"/cancel",headers=owner).status_code==409
    canceled=client.post(f"/api/v1/businesses/{a}/mercadopago/qa-shared/orders/{order['id']}/cancel",
                         headers=owner)
    assert canceled.status_code==200,canceled.text
    assert canceled.json()["status"]=="CANCELADA"
    second=client.post(endpoint(b,qb),headers={**owner,"Idempotency-Key":qb["request_id"]})
    assert second.status_code==201,second.text
    assert calls["create"]==2
    assert second.json()["external_reference"]!=order["external_reference"]
    assert db.scalar(select(MpSharedQaBox.active_order_id).where(MpSharedQaBox.id==1))==UUID(second.json()["id"])
    assert db.scalar(select(func.count()).select_from(MpSharedQaOrder))==2
    assert db.scalar(select(func.count()).select_from(Sale))==0


@pytest.mark.integration
@pytest.mark.skipif(os.getenv("RUN_DB_INTEGRATION")!="1",reason="PostgreSQL QA migrado")
def test_shared_remote_payment_settlement_idempotent_and_wrong_seller(isolated,monkeypatch):
    client,db=isolated
    enabled(monkeypatch)
    owner,_=account(client)
    bid=create_business(client,owner)
    item=create_item(client,owner,bid,"Servicio QA")
    qr_response=client.post(base(bid),headers={**owner,"Idempotency-Key":str(uuid4())},
        json=body([(item,3600)]))
    assert qr_response.status_code==201,qr_response.text
    qr=qr_response.json()
    state={}
    def bad_seller(self, *, token):
        return {"id":"999999999","site_id":"MLA"}
    monkeypatch.setattr(MercadoPagoTransport,"seller",bad_seller)
    path=f"/api/v1/businesses/{bid}/mercadopago/qa-shared/orders/from-qr/{qr['id']}"
    rejected=client.post(path,headers={**owner,"Idempotency-Key":qr["request_id"]})
    assert rejected.status_code==503
    assert db.scalar(select(MpSharedQaBox.active_order_id).where(MpSharedQaBox.id==1)) is None

    def seller(self, *, token):return {"id":MERCHANT_ID,"site_id":"MLA"}
    def create(self, **kwargs):
        state.update({"id":"ORD01K371WBFDS4MD9JG0K8ZMECBE",
            "total_cents":kwargs["amount_cents"],
            "external_reference":kwargs["external_reference"]})
        return payload(state)
    def order(self, *, token,order_id):
        assert order_id==state["id"]
        return payload(state,"processed")
    monkeypatch.setattr(MercadoPagoTransport,"seller",seller)
    monkeypatch.setattr(MercadoPagoTransport,"create_order",create)
    monkeypatch.setattr(MercadoPagoTransport,"order",order)
    generated=client.post(path,headers={**owner,"Idempotency-Key":qr["request_id"]})
    assert generated.status_code==201,generated.text
    record=generated.json()
    baseurl=f"/api/v1/businesses/{bid}/mercadopago/qa-shared/orders/{record['id']}"
    checked=client.post(baseurl+"/reconcile",headers=owner)
    assert checked.status_code==200,checked.text
    assert checked.json()["status"]=="PROCESADA"
    assert db.scalar(select(MpSharedQaBox.active_order_id).where(MpSharedQaBox.id==1)) is None
    done=client.post(baseurl+"/settle-qa",headers=owner)
    assert done.status_code==200,done.text
    assert done.json()["order"]["sale_registered"] is True
    sale_id=done.json()["sale_id"]
    repeated=client.post(baseurl+"/settle-qa",headers=owner)
    assert repeated.status_code==200 and repeated.json()["sale_id"]==sale_id
    assert repeated.json()["replayed"] is True
    assert db.scalar(select(func.count()).select_from(Sale).where(Sale.business_id==bid))==1
    assert db.scalar(select(SalePayment.method).where(SalePayment.business_id==bid))=="MERCADO_PAGO_QR_TEST"
