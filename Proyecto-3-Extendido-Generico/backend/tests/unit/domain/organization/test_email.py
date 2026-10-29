from dataclasses import FrozenInstanceError

import pytest

from app.domain.organization.email import Email
from app.domain.organization.errors import EmailInvalidoError


def test_email_normalizes_whitespace_and_case() -> None:
    email = Email("  Usuario.B@Example.COM  ")

    assert email.value == "usuario.b@example.com"
    assert str(email) == "usuario.b@example.com"


def test_email_equality_is_semantic_after_normalization() -> None:
    assert Email("Usuario.B@Example.com") == Email("usuario.b@example.com")


@pytest.mark.parametrize(
    "raw_email",
    [
        "",
        "   ",
        "usuario.example.com",
        "usuario@@example.com",
        "@example.com",
        "usuario@",
        "usuario @example.com",
        ".usuario@example.com",
        "usuario.@example.com",
        "usuario..dos@example.com",
        "usuario@.example.com",
        "usuario@example..com",
    ],
)
def test_email_rejects_invalid_values(raw_email: str) -> None:
    with pytest.raises(EmailInvalidoError):
        Email(raw_email)


def test_email_rejects_non_string_values() -> None:
    with pytest.raises(EmailInvalidoError):
        Email(None)  # type: ignore[arg-type]


def test_email_is_immutable() -> None:
    email = Email("usuario@example.com")

    with pytest.raises(FrozenInstanceError):
        email.value = "otro@example.com"  # type: ignore[misc]
