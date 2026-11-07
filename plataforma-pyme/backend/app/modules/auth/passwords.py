"""Proteccion de contraseñas con Argon2id; nunca guardar texto plano."""
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from argon2.low_level import Type

_hasher = PasswordHasher(
    time_cost=3, memory_cost=65536, parallelism=2,
    hash_len=32, salt_len=16, type=Type.ID,
)


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, encoded: str) -> bool:
    try:
        return bool(_hasher.verify(encoded, password))
    except (InvalidHashError, VerifyMismatchError, VerificationError):
        return False
