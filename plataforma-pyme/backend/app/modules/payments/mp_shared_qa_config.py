"""Una sola caja existente, QA descartable. Nada de credenciales en código."""
import os

from app.modules.payments.mp_official_client import MpNotReady

MERCHANT_ID = "3837129107"
STORE_ID = "89968780"
POS_ID = "140776986"
EXTERNAL_POS_ID = "PYMEQA001POS001"
STATIC_QR = (
    "00020101021143540016com.mercadolibre0130https://mpago.la/pos/"
    "1407769865011000711111115204970053030325802AR5909Test Test6004CABA63040182"
)


def shared_qa_enabled() -> bool:
    return (os.getenv("PYME_DISPOSABLE_QA") == "1"
            and os.getenv("PYME_MP_QR_SHARED_QA_ENABLED") == "1")


def shared_qa_remote_enabled() -> bool:
    return shared_qa_enabled() and os.getenv("PYME_MP_SHARED_QA_ORDERS_ENABLED") == "1"


def qa_token() -> str:
    if not shared_qa_remote_enabled():
        raise MpNotReady()
    value = os.getenv("PYME_MP_SHARED_QA_ACCESS_TOKEN", "")
    if len(value) < 30 or len(value) > 4096 or any(ord(c) < 33 or ord(c) > 126 for c in value):
        raise MpNotReady()
    return value
