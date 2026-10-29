from app.domain.common.exceptions import DomainError


class CatalogoError(DomainError):
    """Base exception for catalog-specific domain-rule violations."""


class CapacidadesInvalidasError(CatalogoError):
    """Raised when an article-capabilities configuration is internally invalid."""
