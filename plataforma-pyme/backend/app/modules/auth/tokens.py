"""Bearer opaco de 256 bits; hash para indexarlo en DB (no para passwords)."""
import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone

SESSION_LIFETIME = timedelta(hours=12)
_SHAPE = re.compile(r"^[a-zA-Z0-9_-]{43}$")


def new_token() -> str:
    return secrets.token_urlsafe(32)


def token_valid_shape(token: str) -> bool:
    return bool(_SHAPE.fullmatch(token))


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode("ascii")).hexdigest()


def now_utc() -> datetime:
    return datetime.now(timezone.utc)
