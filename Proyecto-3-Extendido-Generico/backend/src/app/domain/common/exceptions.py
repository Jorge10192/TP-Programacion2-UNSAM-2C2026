class DomainError(Exception):
    """Base exception for expected domain-rule violations across domain modules."""


class IdentificadorInvalidoError(DomainError):
    """Raised when an entity identifier does not satisfy the UUIDv4 contract."""


class NombreInvalidoError(DomainError):
    """Raised when a required domain text value is empty or invalid."""


class FechaInvalidaError(DomainError):
    """Raised when a domain instant is missing timezone information."""


class VersionInvalidaError(DomainError):
    """Raised when an optimistic concurrency version is lower than one."""
