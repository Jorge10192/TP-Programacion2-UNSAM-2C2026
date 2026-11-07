"""Las contraseñas se almacenan mediante hashes Argon2id con sal."""
from app.modules.auth.passwords import hash_password, verify_password


def test_argon2id_roundtrip_and_bad_password() -> None:
    password = "una-frase-de-acceso-muy-larga"
    hashed = hash_password(password)
    assert hashed.startswith("$argon2id$")
    assert hashed != password
    assert password not in hashed
    assert verify_password(password, hashed)
    assert not verify_password("incorrecta", hashed)


def test_same_password_uses_fresh_salt() -> None:
    password = "otra-frase-de-acceso-muy-larga"
    assert hash_password(password) != hash_password(password)


def test_invalid_hash_is_rejected_safely() -> None:
    assert not verify_password("cualquier-valor", "not-an-argon2-hash")
