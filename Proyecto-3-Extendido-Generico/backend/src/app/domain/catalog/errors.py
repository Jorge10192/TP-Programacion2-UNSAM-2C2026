from app.domain.common.exceptions import DomainError


class CatalogoError(DomainError):
    """Base exception for catalog-specific domain-rule violations."""


class CapacidadesInvalidasError(CatalogoError):
    """Raised when an article-capabilities configuration is internally invalid."""


class CategoriaError(CatalogoError):
    """Base exception for category-specific domain-rule violations."""


class CategoriaInvalidaError(CategoriaError):
    """Raised when a category is built with invalid structural data."""


class CategoriaYaActivaError(CategoriaError):
    """Raised when attempting to reactivate an already active category."""


class CategoriaYaInactivaError(CategoriaError):
    """Raised when attempting to deactivate an already inactive category."""
