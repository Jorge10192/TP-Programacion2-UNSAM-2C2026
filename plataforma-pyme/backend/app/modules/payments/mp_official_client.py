"""B6 Mercado Pago Orders API — cliente oficial TEST, cifrado y verificación.

Modo cerrado por defecto. NO acepta credenciales/URLs desde navegador.
"""
import base64
import hashlib
import hmac
import os
import re
import secrets
import time
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from urllib.parse import urlencode

import httpx
from cryptography.fernet import Fernet, InvalidToken

API_ROOT = "https://api.mercadopago.com"
AUTH_ROOT = "https://auth.mercadopago.com/authorization"
ORDER_PATTERN = re.compile(r"^ORD[A-Za-z0-9]{12,84}$")
POS_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


class MpNotReady(Exception):
    pass


class MpProviderFailure(Exception):
    pass


class MpIntegrityError(Exception):
    pass


def is_enabled() -> bool:
    return (os.getenv("PYME_DISPOSABLE_QA") == "1" and
            os.getenv("PYME_MP_QR_TEST_ENABLED") == "1")


def config() -> tuple[str, str, str, Fernet]:
    if not is_enabled():
        raise MpNotReady()
    client_id = os.getenv("PYME_MP_CLIENT_ID", "")
    secret = os.getenv("PYME_MP_CLIENT_SECRET", "")
    redirect = os.getenv("PYME_MP_REDIRECT_URI", "")
    key = os.getenv("PYME_MP_FERNET_KEY", "")
    if not client_id.isdigit() or not secret or not redirect.startswith("https://") or not key:
        raise MpNotReady()
    try:
        cipher = Fernet(key.encode("ascii"))
    except (ValueError, TypeError):
        raise MpNotReady() from None
    return client_id, secret, redirect, cipher


def money(cents: int) -> str:
    if not isinstance(cents, int) or not 1 <= cents <= 99_999_999_999:
        raise MpIntegrityError()
    return f"{cents//100}.{cents%100:02d}"


def parse_money(value) -> int:
    try:
        amount = Decimal(str(value))
        if not amount.is_finite() or amount != amount.quantize(Decimal(".01")):
            raise MpIntegrityError()
        cents = int(amount * 100)
        if not 1 <= cents <= 99_999_999_999:
            raise MpIntegrityError()
        return cents
    except (InvalidOperation, ValueError, TypeError):
        raise MpIntegrityError() from None


def new_pkce() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(
        verifier.encode("ascii")).digest()).rstrip(b"=").decode("ascii")
    return verifier, challenge


def authorization_url(state: str, challenge: str, client_id: str, redirect: str) -> str:
    return AUTH_ROOT + "?" + urlencode({
        "response_type": "code", "client_id": client_id,
        "redirect_uri": redirect, "state": state,
        "code_challenge": challenge, "code_challenge_method": "S256",
    })


def hash_state(state: str) -> str:
    return hashlib.sha256(state.encode("utf-8")).hexdigest()


def signature_valid(*, secret: str, signature: str, request_id: str,
                    data_id: str, now: float | None = None) -> bool:
    """La notificación solo despierta GET; nunca acredita por su propio body."""
    if not secret or not request_id or not ORDER_PATTERN.fullmatch(data_id):
        return False
    parts = {}
    for part in signature.split(","):
        key, sep, val = part.strip().partition("=")
        if sep and key not in parts:
            parts[key] = val
    ts = parts.get("ts", "")
    actual = parts.get("v1", "")
    if not ts.isdigit() or len(ts) not in (10, 13) or not re.fullmatch(r"[0-9a-fA-F]{64}", actual):
        return False
    value = int(ts)
    timestamp = value / 1000 if len(ts) == 13 else value
    current = time.time() if now is None else now
    if abs(current - timestamp) > 300:
        return False
    manifest = f"id:{data_id};request-id:{request_id};ts:{ts};"
    expected = hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, actual.lower())


def render_official_test_qr(value: str) -> str:
    """PNG construido SOLO a partir de type_response.qr_data verificado."""
    import qrcode
    from io import BytesIO
    if not isinstance(value, str) or not 1 <= len(value) <= 6000 or any(
        ord(ch) < 32 or ord(ch) == 127 for ch in value
    ):
        raise MpIntegrityError()
    qr = qrcode.QRCode(box_size=5, border=4)
    qr.add_data(value)
    qr.make(fit=True)
    stream = BytesIO()
    qr.make_image(fill_color="black", back_color="white").save(stream, format="PNG")
    return "data:image/png;base64," + base64.b64encode(stream.getvalue()).decode("ascii")


class MercadoPagoTransport:
    """Único host fijo, timeouts, sin redirects; inyectable por tests offline."""
    def __init__(self, client: httpx.Client | None = None):
        self.client = client

    def _call(self, method: str, path: str, *, token: str | None = None,
              key: str | None = None, body: dict | None = None) -> dict:
        if not path.startswith("/") or "//" in path or "?" in path:
            raise MpIntegrityError()
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        if token:
            headers["Authorization"] = "Bearer " + token
        if key:
            headers["X-Idempotency-Key"] = key
        own = self.client is None
        client = self.client or httpx.Client(timeout=8, follow_redirects=False)
        try:
            result = client.request(method, API_ROOT + path, headers=headers, json=body)
            if result.status_code < 200 or result.status_code >= 300:
                raise MpProviderFailure()
            data = result.json()
            if not isinstance(data, dict):
                raise MpProviderFailure()
            return data
        except (httpx.HTTPError, ValueError):
            raise MpProviderFailure() from None
        finally:
            if own:
                client.close()

    def oauth(self, *, code: str, verifier: str) -> dict:
        client_id, secret, redirect, _ = config()
        return self._call("POST", "/oauth/token", body={
            "client_id": client_id, "client_secret": secret,
            "grant_type": "authorization_code", "code": code,
            "redirect_uri": redirect, "code_verifier": verifier, "test_token": "true",
        })

    def refresh(self, *, refresh_token: str) -> dict:
        client_id, secret, _, _ = config()
        return self._call("POST", "/oauth/token", body={
            "client_id": client_id, "client_secret": secret,
            "grant_type": "refresh_token", "refresh_token": refresh_token,
        })

    def create_order(self, *, token: str, key: str, amount_cents: int,
                     external_reference: str, external_pos_id: str,
                     description: str, items: list[dict] | None = None) -> dict:
        if not POS_PATTERN.fullmatch(external_pos_id) or not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", external_reference):
            raise MpIntegrityError()
        # Items son opcionales en Orders API, pero si se envían deben
        # representar exactamente el total (HALF_UP ya fue aplicado al snapshot).
        if items is not None:
            if not 1 <= len(items) <= 30:
                raise MpIntegrityError()
            if sum(parse_money(x["unit_price"]) * x["quantity"] for x in items) != amount_cents:
                raise MpIntegrityError()
        body = {
            "type": "qr", "total_amount": money(amount_cents),
            "external_reference": external_reference,
            "description": description[:150], "expiration_time": "PT15M",
            "config": {"qr": {"external_pos_id": external_pos_id, "mode": "dynamic"}},
            "transactions": {"payments": [{"amount": money(amount_cents)}]},
        }
        if items is not None:
            body["items"] = items
        return self._call("POST", "/v1/orders", token=token, key=key, body=body)

    def order(self, *, token: str, order_id: str) -> dict:
        if not ORDER_PATTERN.fullmatch(order_id):
            raise MpIntegrityError()
        return self._call("GET", "/v1/orders/" + order_id, token=token)


def validate_order(payload: dict, *, order_id: str | None,
                   external_reference: str, amount_cents: int,
                   merchant_id: str, pos_id: str) -> tuple[str, str | None, str | None, str | None]:
    """Todo dato financiero se valida contra backend; nunca contra webhook."""
    try:
        oid = payload.get("id")
        if not isinstance(oid, str) or not ORDER_PATTERN.fullmatch(oid) or (order_id and oid != order_id):
            raise MpIntegrityError()
        if payload.get("type") != "qr" or payload.get("external_reference") != external_reference:
            raise MpIntegrityError()
        if parse_money(payload.get("total_amount")) != amount_cents or payload.get("currency") != "ARS":
            raise MpIntegrityError()
        if str(payload.get("user_id")) != merchant_id:
            raise MpIntegrityError()
        qr = payload.get("config", {}).get("qr", {})
        if not isinstance(qr, dict) or qr.get("mode") != "dynamic" or qr.get("external_pos_id") != pos_id:
            raise MpIntegrityError()
        status = payload.get("status")
        if status not in {"created","processed","canceled","expired","refunded"}:
            raise MpIntegrityError()
        detail = payload.get("status_detail")
        if not isinstance(detail, str) or len(detail) > 60:
            raise MpIntegrityError()
        tx = payload.get("transactions", {}).get("payments", [])
        if not isinstance(tx, list) or len(tx) > 1:
            raise MpIntegrityError()
        pay_id = tx[0].get("id") if tx else None
        if pay_id is not None and (not isinstance(pay_id, str) or len(pay_id) > 90):
            raise MpIntegrityError()
        if tx and parse_money(tx[0].get("amount")) != amount_cents:
            raise MpIntegrityError()
        if status == "processed" and (not tx or tx[0].get("status") != "processed"):
            raise MpIntegrityError()
        data = payload.get("type_response")
        qr_data = data.get("qr_data") if isinstance(data, dict) else None
        if qr_data is not None and (not isinstance(qr_data, str) or not 1 <= len(qr_data) <= 6000):
            raise MpIntegrityError()
        return status, detail, pay_id, qr_data
    except (TypeError, KeyError, AttributeError, ValueError):
        raise MpIntegrityError() from None
