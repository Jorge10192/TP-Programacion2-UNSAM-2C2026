"""E3-2C / B7: vínculo virtual de una sola caja Mercado Pago QA.

Solo expone el QR estático ya obtenido desde Mercado Pago; NO crea Orders,
no modifica sucursales/POS y no afirma que un pago fue acreditado.
El Access Token jamás se registra en este módulo ni sale al navegador.
"""
import os
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.modules.auth.dependencies import current_auth
from app.modules.auth.session_service import AuthContext
from app.modules.payments.qr_service import QrIntentService
from app.modules.payments.mp_official_client import render_official_test_qr
from app.modules.payments.mp_official_router import _errors, MpConflict

router = APIRouter(
    prefix="/businesses/{business_id}/mercadopago/qa-shared",
    tags=["Mercado Pago · caja QA compartida"],
)

# Datos públicos del QR de la caja TEST creada el 13/11/2026.
# No son tokens ni credenciales. Este recurso es SOLO de prueba.
QR_RAW = (
    "00020101021143540016com.mercadolibre0130https://mpago.la/pos/"
    "1407769865011000711111115204970053030325802AR5909Test Test6004CABA63040182"
)


def shared_qa_enabled() -> bool:
    return (
        os.getenv("PYME_DISPOSABLE_QA") == "1"
        and os.getenv("PYME_MP_QR_SHARED_QA_ENABLED") == "1"
    )


@router.get("/connection", summary="Consulta el QR QA único sin crear recursos en Mercado Pago")
def shared_qa_connection(
    business_id: UUID,
    context: AuthContext = Depends(current_auth),
    db: Session = Depends(get_db),
):
    try:
        # Se evalúa la membresía real del usuario. Nunca mostrar a empresas ajenas.
        business, _member = QrIntentService(db)._authorize(
            context.user.id, context.auth_session.id, business_id
        )
        if business.status != "ACTIVA":
            raise MpConflict()
        enabled = shared_qa_enabled()
        return {
            "business_id": business_id,
            "enabled": enabled,
            # Asociación lógica de lectura: sin OAuth ni nueva fila en PostgreSQL.
            "virtual_link": enabled,
            "status": "DISPONIBLE_QA" if enabled else "DESHABILITADA",
            "mp_user_id": "3837129107" if enabled else None,
            "store_id": "89968780" if enabled else None,
            "pos_id": "140776986" if enabled else None,
            "external_pos_id": "PYMEQA001POS001" if enabled else None,
            "qr_png_data_uri": render_official_test_qr(QR_RAW) if enabled else None,
            "orders_integrated": False,
            "remote_verified": False,
            "sandbox_only": True,
        }
    except Exception as exc:
        _errors(exc)
    finally:
        db.rollback()
