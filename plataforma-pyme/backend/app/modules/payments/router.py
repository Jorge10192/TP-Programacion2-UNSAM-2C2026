"""B1: conexión persistente simulada, no autorización real con Mercado Pago."""
from datetime import datetime
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.infrastructure.models import MerchantPaymentConnection, QrPaymentIntent
from app.modules.auth.tokens import now_utc
from app.modules.payments.mp_shared_qa_config import shared_qa_enabled
from app.modules.auth.dependencies import current_auth, unauthorized
from app.modules.auth.session_service import AuthContext
from app.modules.businesses.repository import BusinessRepository
from app.modules.businesses.service import BusinessService, CreationSessionInvalid

router = APIRouter(prefix="/businesses/{business_id}/payment-connections/mercadopago", tags=["medios de cobro"])


class PaymentConnectionView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    business_id: UUID
    provider: str = "MERCADO_PAGO"
    mode: str = "DEMO"
    status: str = "NO_VINCULADA"
    mock_merchant_name: str | None = None
    mock_merchant_ref: str | None = None
    updated_at: datetime | None = None


def _view(business_id: UUID, connection: MerchantPaymentConnection | None) -> PaymentConnectionView:
    if connection is None:
        return PaymentConnectionView(business_id=business_id)
    return PaymentConnectionView.model_validate(connection)


def _authorize(db: Session, context: AuthContext, business_id: UUID, *, write: bool):
    if write:
        try:
            BusinessService(db)._revalidate_actor(context.user.id, context.auth_session.id)
        except CreationSessionInvalid:
            raise unauthorized() from None
        pair = BusinessRepository(db).lock_active_member_business(context.user.id, business_id)
    else:
        pair = BusinessRepository(db).own_business(context.user.id, business_id)
    if pair is None:
        raise HTTPException(404, detail="Empresa no disponible")
    company, membership = pair
    if write:
        if company.status != "ACTIVA":
            raise HTTPException(409, detail="Empresa suspendida")
        if membership.role not in ("TITULAR_ADMINISTRATIVO", "ADMINISTRADOR"):
            raise HTTPException(403, detail="No tenés permiso para gestionar medios de cobro")
    return company


def _lookup(db: Session, business_id: UUID) -> MerchantPaymentConnection | None:
    return db.scalar(select(MerchantPaymentConnection).where(
        MerchantPaymentConnection.business_id == business_id,
        MerchantPaymentConnection.provider == "MERCADO_PAGO",
        MerchantPaymentConnection.mode == "DEMO",
    ))


@router.get("", response_model=PaymentConnectionView, summary="Estado de cuenta Mercado Pago ficticia del negocio")
def get_connection(
    business_id: UUID, context: AuthContext = Depends(current_auth), db: Session = Depends(get_db),
) -> PaymentConnectionView:
    _authorize(db, context, business_id, write=False)
    if shared_qa_enabled():
        return PaymentConnectionView(business_id=business_id, status="ACTIVA",
            mock_merchant_name="Mercado Pago QA compartido",
            mock_merchant_ref="MP-QA-SHARED")
    return _view(business_id, _lookup(db, business_id))


@router.post("/demo", response_model=PaymentConnectionView, summary="Vincular o reactivar cuenta ficticia del negocio")
def connect_demo(
    business_id: UUID, context: AuthContext = Depends(current_auth), db: Session = Depends(get_db),
) -> PaymentConnectionView:
    try:
        company = _authorize(db, context, business_id, write=True)
        if shared_qa_enabled():
            raise HTTPException(409, detail="La caja QA compartida se vincula automáticamente")
        connection = _lookup(db, business_id)
        if connection is None:
            connection = MerchantPaymentConnection(
                id=uuid4(), business_id=business_id, provider="MERCADO_PAGO", mode="DEMO",
                status="ACTIVA", mock_merchant_name=f"Cuenta demo · {company.name[:100]}",
                mock_merchant_ref="MP-DEMO-" + uuid4().hex.upper(),
                updated_by_user_id=context.user.id,
            )
            db.add(connection)
        elif connection.status != "ACTIVA":
            connection.status = "ACTIVA"
            connection.updated_by_user_id = context.user.id
        # El mismo comando repetido mantiene una única fila; lock de empresa serializa escrituras.
        db.commit()
        db.refresh(connection)
        return _view(business_id, connection)
    except Exception:
        db.rollback()
        raise


@router.delete("/demo", response_model=PaymentConnectionView, summary="Desvincular cuenta ficticia sin borrar historial")
def disconnect_demo(
    business_id: UUID, context: AuthContext = Depends(current_auth), db: Session = Depends(get_db),
) -> PaymentConnectionView:
    try:
        _authorize(db, context, business_id, write=True)
        if shared_qa_enabled():
            raise HTTPException(409, detail="No se desvincula la caja QA compartida")
        connection = _lookup(db, business_id)
        if connection is not None and connection.status != "INACTIVA":
            pending = db.scalar(select(QrPaymentIntent.id).where(
                QrPaymentIntent.business_id == business_id,
                QrPaymentIntent.merchant_connection_id == connection.id,
                QrPaymentIntent.status == "ESPERANDO_PAGO",
                QrPaymentIntent.expires_at > now_utc(),
            ).limit(1))
            if pending is not None:
                raise HTTPException(409, detail="Cancelá el QR DEMO pendiente antes de desvincular la cuenta")
            connection.status = "INACTIVA"
            connection.updated_by_user_id = context.user.id
        db.commit()
        return _view(business_id, connection)
    except Exception:
        db.rollback()
        raise
