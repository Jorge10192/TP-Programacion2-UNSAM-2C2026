class DomainError(Exception):
    """Base exception for expected domain-rule violations."""


class EmailInvalidoError(DomainError):
    """Raised when an email cannot be represented as a valid Email value object."""
