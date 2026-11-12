"""B6: OAuth y Orders oficiales TEST con webhook firmado. Sin producción."""
import os
from datetime import datetime
from uuid import UUID
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, ConfigDict, Field, UUID4
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.modules.auth.dependencies import current_auth, unauthorized
from app.modules.auth.session_service import AuthContext
from app.modules.payments.mp_official_client import (
    MpNotReady, MpIntegrityError, MpProviderFailure, signature_valid,
)
from app.modules.payments.mp_official_service import MpOfficialService, MpConflict, MpForbidden, MpMissing
from app.modules.purchases.service import PurchaseSessionInvalid, PurchaseBusinessUnavailable
from app.modules.payments.qr_service import QrIntentConflict, QrIntentNotFound, QrIntentForbidden

router=APIRouter(prefix="/businesses/{business_id}/mercadopago/official-test",
                 tags=["Mercado Pago TEST · OAuth y QR"])
public_router=APIRouter(prefix="/mercadopago/official-test",
                        tags=["Mercado Pago TEST · callbacks"])

class PosInput(BaseModel):
    model_config=ConfigDict(extra="forbid")
    external_pos_id: str = Field(min_length=1,max_length=64)

class OrderView(BaseModel):
    id: UUID
    business_id: UUID
    source_intent_id: UUID
    provider_order_id: str | None
    status: str
    provider_status_detail: str | None
    external_reference: str
    total_cents: int
    created_at: datetime
    qr_png_data_uri: str | None
    test_only: bool
    sale_registered: bool
    sale_id: UUID | None

def _errors(exc: Exception):
    if isinstance(exc,PurchaseSessionInvalid):
        raise unauthorized() from None
    if isinstance(exc,(PurchaseBusinessUnavailable,QrIntentNotFound,MpMissing)):
        raise HTTPException(404,detail="Empresa u orden TEST no disponible") from None
    if isinstance(exc,(MpForbidden,QrIntentForbidden)):
        raise HTTPException(403,detail="Sin autorización para esta empresa") from None
    if isinstance(exc,MpNotReady):
        raise HTTPException(503,detail="Integración TEST deshabilitada o incompleta") from None
    if isinstance(exc,(MpConflict,QrIntentConflict)):
        raise HTTPException(409,detail="Conflicto: consultá el intento antes de reintentar") from None
    if isinstance(exc,(MpProviderFailure,MpIntegrityError)):
        raise HTTPException(503,detail="Mercado Pago no confirmó una orden válida; mantené la misma clave") from None
    raise exc

@router.get("/connection",summary="Estado de cuenta OAuth TEST, sin secretos")
def connection(business_id:UUID,context:AuthContext=Depends(current_auth),
               db:Session=Depends(get_db)):
    try:
        return MpOfficialService(db).status(context.user.id,context.auth_session.id,business_id)
    except Exception as e:
        _errors(e)

@router.post("/oauth/start",summary="Iniciar OAuth PKCE TEST para una empresa")
def oauth_start(business_id:UUID,context:AuthContext=Depends(current_auth),
                db:Session=Depends(get_db)):
    try:
        return {"authorization_url":MpOfficialService(db).start_oauth(
            context.user.id,context.auth_session.id,business_id)}
    except Exception as e:
        _errors(e)

@public_router.get("/oauth/callback",summary="Callback OAuth con state de un solo uso")
def oauth_callback(state:str=Query(min_length=20,max_length=200),
                   code:str=Query(min_length=2,max_length=512),
                   db:Session=Depends(get_db)):
    try:
        MpOfficialService(db).finish_oauth(state,code)
        result="linked"
    except Exception:
        result="failed"
    target=os.getenv("PYME_MP_FRONTEND_RETURN_URL","")
    if not (target.startswith("https://") or target.startswith("http://127.0.0.1:")):
        return {"result":result,"message":"Consultá Medios de cobro"}
    return RedirectResponse(target+("?" if "?" not in target else "&")+
        urlencode({"mp_test_oauth":result}),status_code=303)

@router.put("/pos",summary="Configurar caja externa MP TEST del negocio")
def save_pos(business_id:UUID,command:PosInput,context:AuthContext=Depends(current_auth),
             db:Session=Depends(get_db)):
    try:
        return MpOfficialService(db).set_pos(
            context.user.id,context.auth_session.id,business_id,command.external_pos_id)
    except Exception as e:
        _errors(e)

@router.post("/orders/from-qr/{source_intent_id}",response_model=OrderView,
    status_code=201,summary="Crear order dinámica oficial TEST idempotente")
def create_order(business_id:UUID,source_intent_id:UUID,
                 idempotency_key:UUID4=Header(alias="Idempotency-Key"),
                 context:AuthContext=Depends(current_auth),db:Session=Depends(get_db)):
    try:
        return MpOfficialService(db).create_order(context.user.id,
            context.auth_session.id,business_id,source_intent_id,idempotency_key)
    except Exception as e:
        _errors(e)

@router.get("/orders/for-qr/{source_intent_id}",response_model=OrderView | None,
    summary="Recuperar order TEST por QR original tras F5 o respuesta incierta")
def find_by_source(business_id:UUID,source_intent_id:UUID,
                   context:AuthContext=Depends(current_auth),db:Session=Depends(get_db)):
    try:
        return MpOfficialService(db).by_source(
            context.user.id,context.auth_session.id,business_id,source_intent_id)
    except Exception as e:
        _errors(e)

@router.post("/orders/{order_id}/settle-qa",
    summary="Asentar UNA venta QA solo tras verificar accredited en Orders API")
def settle_official_test(business_id:UUID,order_id:UUID,
                        context:AuthContext=Depends(current_auth),db:Session=Depends(get_db)):
    try:
        return MpOfficialService(db).settle_qa(
            context.user.id,context.auth_session.id,business_id,order_id)
    except Exception as e:
        _errors(e)

@router.get("/orders/{order_id}",response_model=OrderView,
    summary="Consultar order QR TEST local")
def read_order(business_id:UUID,order_id:UUID,context:AuthContext=Depends(current_auth),
               db:Session=Depends(get_db)):
    try:
        return MpOfficialService(db).get_order(context.user.id,
            context.auth_session.id,business_id,order_id)
    except Exception as e:
        _errors(e)

@router.post("/orders/{order_id}/reconcile",response_model=OrderView,
    summary="Consultar resultado de pago en Orders API con token del vendedor")
def reconcile_order(business_id:UUID,order_id:UUID,
                    context:AuthContext=Depends(current_auth),db:Session=Depends(get_db)):
    try:
        return MpOfficialService(db).reconcile(context.user.id,
            context.auth_session.id,business_id,order_id)
    except Exception as e:
        _errors(e)

@public_router.post("/orders/webhook",status_code=200,
    summary="Webhook firmado Orders: HMAC y conciliación contra API oficial")
async def order_webhook(request:Request,db:Session=Depends(get_db),
                        x_signature:str | None=Header(None,alias="x-signature"),
                        x_request_id:str | None=Header(None,alias="x-request-id")):
    secret=os.getenv("PYME_MP_WEBHOOK_SECRET","")
    order_id=request.query_params.get("data.id","")
    if not secret or not x_signature or not x_request_id or not signature_valid(
        secret=secret,signature=x_signature,request_id=x_request_id,data_id=order_id):
        raise HTTPException(401,detail="Firma inválida")
    try:
        payload=await request.json()
    except ValueError:
        raise HTTPException(400,detail="Notificación inválida") from None
    if not isinstance(payload,dict) or payload.get("type") not in ("order","orders") or (
        isinstance(payload.get("data"),dict) and str(payload["data"].get("id"))!=order_id
    ):
        raise HTTPException(400,detail="Orden incompatible")
    try:
        MpOfficialService(db).webhook_reconcile(order_id)
    except (MpProviderFailure,MpIntegrityError,MpNotReady):
        raise HTTPException(503,detail="No se pudo verificar estado en Orders API") from None
    return {"accepted":True}
