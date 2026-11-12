"""B6 — orquestación de OAuth, Orders QR dinámico TEST y conciliación.

Los QrPaymentIntent MOCK_QA nunca se modifican ni se aceptan como acreditación.
Un pedido de prueba conserva snapshot, idempotencia y tenant en su propia tabla.
"""
import hashlib
import re
import secrets
from datetime import timedelta
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.models import (
    MercadoPagoOAuthPending, MercadoPagoTestAccount, MercadoPagoTestOrder,
    QrPaymentIntent, QrPaymentIntentLine,
)
from app.modules.auth.tokens import now_utc
from app.modules.payments.mp_official_client import (
    MercadoPagoTransport, MpIntegrityError, MpNotReady, MpProviderFailure,
    POS_PATTERN, authorization_url, config, hash_state, new_pkce, money,
    validate_order, render_official_test_qr,
)
from app.modules.payments.qr_service import (
    QrIntentService, QrIntentForbidden, QrIntentConflict, QrIntentNotFound,
)

MANAGERS = frozenset({"TITULAR_ADMINISTRATIVO", "ADMINISTRADOR"})


class MpForbidden(Exception):
    pass


class MpConflict(Exception):
    pass


class MpMissing(Exception):
    pass


def _expiry(seconds: int):
    return now_utc() + timedelta(seconds=max(0, seconds))


class MpOfficialService:
    def __init__(self, db: Session, transport: MercadoPagoTransport | None = None):
        self.db = db
        self.transport = transport or MercadoPagoTransport()
        self.qr = QrIntentService(db)

    def authorize(self, actor: UUID, session: UUID, business: UUID, *, manager: bool):
        company, member = self.qr._authorize(actor, session, business)
        if company.status != "ACTIVA":
            raise MpConflict()
        if manager and member.role not in MANAGERS:
            raise MpForbidden()
        return member

    def account(self, business: UUID, *, lock: bool=False):
        query = select(MercadoPagoTestAccount).where(
            MercadoPagoTestAccount.business_id == business,
        )
        if lock:
            query = query.with_for_update().execution_options(populate_existing=True)
        return self.db.scalar(query)

    def status(self, actor: UUID, session: UUID, business: UUID) -> dict:
        try:
            self.authorize(actor,session,business,manager=False)
            acc = self.account(business)
            result = {
                "business_id": business, "enabled": bool(config_if_available()),
                "status": acc.status if acc else "NO_VINCULADA",
                "mp_user_id": acc.mp_user_id if acc else None,
                "external_pos_id": acc.external_pos_id if acc else None,
                "sandbox_only": True,
            }
            self.db.rollback()
            return result
        except Exception:
            self.db.rollback()
            raise

    def start_oauth(self, actor: UUID, session: UUID, business: UUID) -> str:
        try:
            client_id, _, redirect, cipher = config()
            self.authorize(actor,session,business,manager=True)
            state = secrets.token_urlsafe(36)
            verifier, challenge = new_pkce()
            pending=MercadoPagoOAuthPending(
                id=uuid4(),business_id=business,actor_id=actor,
                state_hash=hash_state(state),
                verifier_encrypted=cipher.encrypt(verifier.encode()).decode(),
                expires_at=_expiry(600),
            )
            self.db.add(pending)
            self.db.commit()
            return authorization_url(state,challenge,client_id,redirect)
        except Exception:
            self.db.rollback()
            raise

    def finish_oauth(self, state: str, code: str) -> UUID:
        try:
            _, _, _, cipher = config()
            if not (20 <= len(state) <= 200 and 2 <= len(code) <= 512):
                raise MpConflict()
            pending=self.db.scalar(select(MercadoPagoOAuthPending).where(
                MercadoPagoOAuthPending.state_hash == hash_state(state),
            ).with_for_update().execution_options(populate_existing=True))
            if pending is None or pending.used_at is not None or pending.expires_at <= now_utc():
                raise MpConflict()
            # Revalidar membresía ACTIVA sin confiar en el callback público.
            from app.modules.businesses.repository import BusinessRepository
            pair = BusinessRepository(self.db).lock_active_member_business(
                pending.actor_id,pending.business_id)
            if pair is None or pair[0].status != "ACTIVA" or pair[1].role not in MANAGERS:
                raise MpForbidden()
            verifier=cipher.decrypt(pending.verifier_encrypted.encode()).decode()
            # Consumir state ANTES de intercambio de code, tolera fallas sin replay.
            pending.used_at=now_utc()
            self.db.commit()
            token=self.transport.oauth(code=code,verifier=verifier)
            if (not isinstance(token.get("access_token"),str) or
                not isinstance(token.get("refresh_token"),str) or
                token.get("live_mode") is not False or
                not str(token.get("user_id","")).isdigit() or
                not isinstance(token.get("expires_in"),int) or
                token["expires_in"] <= 0):
                raise MpIntegrityError()
            merchant_id=str(token["user_id"])
            account=self.account(pending.business_id,lock=True)
            if account is not None and account.mp_user_id != merchant_id:
                # Otra cuenta MP exigiría desconexión/revisión explícita.
                raise MpConflict()
            if account is None:
                account=MercadoPagoTestAccount(
                    id=uuid4(), business_id=pending.business_id,
                    mp_user_id=merchant_id,status="ACTIVA",
                    access_encrypted="",refresh_encrypted="",
                    expires_at=now_utc(), updated_by_user_id=pending.actor_id,
                )
                self.db.add(account)
            account.access_encrypted=cipher.encrypt(token["access_token"].encode()).decode()
            account.refresh_encrypted=cipher.encrypt(token["refresh_token"].encode()).decode()
            account.expires_at=_expiry(token["expires_in"])
            account.status="ACTIVA"
            account.updated_by_user_id=pending.actor_id
            self.db.commit()
            return pending.business_id
        except Exception:
            self.db.rollback()
            raise

    def set_pos(self, actor: UUID, session: UUID, business: UUID, external_id: str) -> dict:
        try:
            config()
            self.authorize(actor,session,business,manager=True)
            if not POS_PATTERN.fullmatch(external_id):
                raise MpConflict()
            acc=self.account(business,lock=True)
            if acc is None or acc.status != "ACTIVA":
                raise MpMissing()
            pending = self.db.scalar(select(MercadoPagoTestOrder.id).where(
                MercadoPagoTestOrder.business_id == business,
                MercadoPagoTestOrder.status.in_(("PREPARANDO","INDETERMINADA","CREADA","PROCESADA","REQUIERE_REVISION")),
            ).limit(1))
            if pending:
                raise MpConflict()
            acc.external_pos_id=external_id
            acc.updated_by_user_id=actor
            self.db.commit()
            return {"business_id":business,"external_pos_id":external_id}
        except Exception:
            self.db.rollback()
            raise

    def token_for(self, acc: MercadoPagoTestAccount) -> str:
        _, _, _, cipher=config()
        if acc.status != "ACTIVA":
            raise MpMissing()
        if acc.expires_at > now_utc()+timedelta(minutes=2):
            return cipher.decrypt(acc.access_encrypted.encode()).decode()
        grant=self.transport.refresh(refresh_token=cipher.decrypt(acc.refresh_encrypted.encode()).decode())
        if (grant.get("live_mode") is not False or
            str(grant.get("user_id")) != acc.mp_user_id or
            not isinstance(grant.get("access_token"),str) or
            not isinstance(grant.get("refresh_token"),str) or
            not isinstance(grant.get("expires_in"),int) or grant["expires_in"] <= 0):
            raise MpIntegrityError()
        acc.access_encrypted=cipher.encrypt(grant["access_token"].encode()).decode()
        acc.refresh_encrypted=cipher.encrypt(grant["refresh_token"].encode()).decode()
        acc.expires_at=_expiry(grant["expires_in"])
        self.db.flush()
        return grant["access_token"]

    def _authorized_order(self, actor: UUID,session: UUID,business: UUID,order_id: UUID,*,manager=False):
        member=self.authorize(actor,session,business,manager=manager)
        row=self.db.scalar(select(MercadoPagoTestOrder).where(
            MercadoPagoTestOrder.business_id == business,
            MercadoPagoTestOrder.id == order_id,
        ))
        if row is None or (member.role not in MANAGERS and row.created_by_id != actor):
            raise MpMissing()
        return row

    def order_view(self, row: MercadoPagoTestOrder) -> dict:
        return {
            "id": row.id, "business_id": row.business_id,
            "source_intent_id": row.source_intent_id,
            "provider_order_id": row.provider_order_id,
            "status": row.status, "provider_status_detail": row.provider_status_detail,
            "external_reference": row.external_reference,
            "total_cents": row.total_cents,
            "created_at": row.created_at,
            "qr_png_data_uri": render_official_test_qr(row.qr_data) if row.qr_data else None,
            "test_only": True,
            "sale_registered": False,
        }

    def get_order(self,actor:UUID,session:UUID,business:UUID,order_id:UUID) -> dict:
        try:
            row=self._authorized_order(actor,session,business,order_id)
            result=self.order_view(row)
            self.db.rollback()
            return result
        except Exception:
            self.db.rollback()
            raise

    def _validate_source(self,actor: UUID,session: UUID,business:UUID,source_id:UUID):
        member=self.authorize(actor,session,business,manager=False)
        source=self.qr._lookup_by_id(business,source_id,lock=True)
        if source is None or (
            member.role not in MANAGERS and source.created_by_id != actor
        ):
            raise MpMissing()
        if source.provider != "MOCK_QA" or source.status != "ESPERANDO_PAGO" or source.expires_at <= now_utc():
            raise MpConflict()
        return source

    def create_order(self,actor:UUID,session:UUID,business:UUID,source_id:UUID,request_id:UUID) -> dict:
        # Punto exacto de reintento: siempre mismo QR, request_id y payload.
        try:
            config()
            source=self._validate_source(actor,session,business,source_id)
            existing=self.db.scalar(select(MercadoPagoTestOrder).where(
                MercadoPagoTestOrder.business_id == business,
                MercadoPagoTestOrder.source_intent_id == source_id,
            ).with_for_update().execution_options(populate_existing=True))
            if existing:
                if existing.request_id != request_id or existing.created_by_id != actor:
                    raise MpConflict()
                if existing.status not in ("INDETERMINADA",):
                    result=self.order_view(existing)
                    self.db.rollback()
                    return result
                # El usuario decide explícitamente repetir misma orden con misma clave.
                record=existing
            else:
                acc=self.account(business)
                if acc is None or acc.status!="ACTIVA" or not acc.external_pos_id:
                    raise MpMissing()
                # No permitir órdenes sobre QR que el laboratorio ya podría haber usado.
                record=MercadoPagoTestOrder(
                    id=uuid4(),business_id=business,source_intent_id=source.id,
                    account_id=acc.id,request_id=request_id,created_by_id=actor,
                    external_reference="PYME" + uuid4().hex.upper(),
                    external_pos_id=acc.external_pos_id,total_cents=source.total_cents,
                    status="PREPARANDO",
                )
                self.db.add(record)
                self.db.commit()
                # Detached: recuperar con nuevo bloqueo para token.
                record=self.db.scalar(select(MercadoPagoTestOrder).where(
                    MercadoPagoTestOrder.business_id==business,
                    MercadoPagoTestOrder.id==record.id,
                ))
            acc=self.account(business,lock=True)
            if acc is None or acc.id != record.account_id:
                raise MpIntegrityError()
            token=self.token_for(acc)
            # Preflight: no autorizar monto que difiera del QR original.
            if record.total_cents != source.total_cents:
                raise MpIntegrityError()
            # external_ref fija y X-Idempotency-Key siempre igual en replays.
            payload=self.transport.create_order(
                token=token,key=str(record.request_id),amount_cents=record.total_cents,
                external_reference=record.external_reference,
                external_pos_id=record.external_pos_id,
                description="Cobro PyME · " + str(record.id),
            )
            status,detail,pay_id,qr_data=validate_order(
                payload,order_id=record.provider_order_id,
                external_reference=record.external_reference,
                amount_cents=record.total_cents,merchant_id=acc.mp_user_id,
                pos_id=record.external_pos_id,
            )
            if not qr_data and not record.qr_data:
                raise MpIntegrityError()
            record.provider_order_id=payload["id"]
            record.payment_id=pay_id
            record.qr_data=qr_data or record.qr_data
            record.provider_status_detail=detail
            record.status={"created":"CREADA","processed":"PROCESADA",
                "canceled":"CANCELADA","expired":"EXPIRADA","refunded":"REEMBOLSADA"}[status]
            record.updated_at=now_utc()
            self.db.commit()
            return self.order_view(record)
        except (MpProviderFailure, MpIntegrityError):
            # Proveedor pudo registrar una orden: NO se borra ni crea otra clave.
            self.db.rollback()
            if "record" in locals():
                try:
                    locked=self.db.scalar(select(MercadoPagoTestOrder).where(
                        MercadoPagoTestOrder.id==record.id,
                    ).with_for_update())
                    if locked and locked.status in ("PREPARANDO","INDETERMINADA"):
                        locked.status="INDETERMINADA"
                        locked.updated_at=now_utc()
                        self.db.commit()
                except Exception:
                    self.db.rollback()
            raise
        except Exception:
            self.db.rollback()
            raise

    def _sync(self,row:MercadoPagoTestOrder) -> dict:
        if not row.provider_order_id:
            raise MpConflict()
        acc=self.account(row.business_id,lock=True)
        if acc is None or acc.id!=row.account_id:
            raise MpIntegrityError()
        token=self.token_for(acc)
        payload=self.transport.order(token=token,order_id=row.provider_order_id)
        status,detail,payment_id,_=validate_order(
            payload,order_id=row.provider_order_id,
            external_reference=row.external_reference,amount_cents=row.total_cents,
            merchant_id=acc.mp_user_id,pos_id=row.external_pos_id,
        )
        current={"created":"CREADA","processed":"PROCESADA",
            "canceled":"CANCELADA","expired":"EXPIRADA","refunded":"REEMBOLSADA"}[status]
        if row.status in ("REEMBOLSADA","CANCELADA","EXPIRADA") and current in ("CREADA","PROCESADA"):
            raise MpIntegrityError()
        row.status=current
        row.payment_id=payment_id or row.payment_id
        row.provider_status_detail=detail
        row.updated_at=now_utc()
        self.db.commit()
        return self.order_view(row)

    def reconcile(self,actor:UUID,session:UUID,business:UUID,order_id:UUID)->dict:
        try:
            config()
            self._authorized_order(actor,session,business,order_id,manager=False)
            row=self.db.scalar(select(MercadoPagoTestOrder).where(
                MercadoPagoTestOrder.business_id==business,
                MercadoPagoTestOrder.id==order_id,
            ).with_for_update().execution_options(populate_existing=True))
            return self._sync(row)
        except Exception:
            self.db.rollback()
            raise

    def webhook_reconcile(self,provider_order_id:str)->bool:
        try:
            config()
            row=self.db.scalar(select(MercadoPagoTestOrder).where(
                MercadoPagoTestOrder.provider_order_id==provider_order_id,
            ).with_for_update().execution_options(populate_existing=True))
            if row is None:
                self.db.rollback()
                return False
            self._sync(row)
            return True
        except Exception:
            self.db.rollback()
            raise


def config_if_available() -> bool:
    try:
        config()
        return True
    except MpNotReady:
        return False
