"""Tokens opacos de 256 bits y huellas unidireccionales."""
from datetime import timedelta
from app.modules.auth.tokens import SESSION_LIFETIME, new_token, token_digest, token_valid_shape


def test_tokens_random_urlsafe_and_valid_shape() -> None:
    token = new_token()
    assert len(token) == 43
    assert token_valid_shape(token)
    assert SESSION_LIFETIME == timedelta(hours=12)
    assert not token_valid_shape("bad token")


def test_tokens_have_unique_hashes_and_no_plaintext_storage() -> None:
    first, second = new_token(), new_token()
    assert first != second
    assert token_digest(first) != token_digest(second)
    assert len(token_digest(first)) == 64
    assert first != token_digest(first)
