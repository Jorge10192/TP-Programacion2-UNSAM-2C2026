from app.domain.common.exceptions import (
    DomainError as DomainError,
    FechaInvalidaError as FechaInvalidaError,
    IdentificadorInvalidoError as IdentificadorInvalidoError,
    NombreInvalidoError as NombreInvalidoError,
    VersionInvalidaError as VersionInvalidaError,
)


class EmailInvalidoError(DomainError):
    """Raised when an email cannot be represented as a valid Email value object."""


class ModalidadesInvalidasError(DomainError):
    """Raised when a business receives an invalid set of operational modalities."""


class MonedaInvalidaError(DomainError):
    """Raised when a business uses a currency not supported by the MVP."""


class MembresiaError(DomainError):
    """Base exception for membership-specific domain-rule violations."""


class MembresiaInvalidaError(MembresiaError):
    """Raised when a membership is built with an invalid role or state."""


class MembresiaYaActivaError(MembresiaError):
    """Raised when attempting to reactivate an already active membership."""


class MembresiaYaInactivaError(MembresiaError):
    """Raised when attempting to deactivate an already inactive membership."""


class MembresiaInactivaError(MembresiaError):
    """Raised when an operation requires an active membership."""


class RolReactivacionInvalidoError(MembresiaError):
    """Raised when reactivation attempts to assign a role outside its whitelist."""


class RolSinCambiosError(MembresiaError):
    """Raised when a role change would be a silent no-op."""


class InvitacionError(DomainError):
    """Base exception for invitation-specific domain-rule violations."""


class InvitacionInvalidaError(InvitacionError):
    """Raised when an invitation is built with invalid structural data."""


class RolInvitacionInvalidoError(InvitacionError):
    """Raised when an invitation proposes a role outside its allowed whitelist."""


class PeriodoInvitacionInvalidoError(InvitacionError):
    """Raised when expiration is not strictly later than emission."""


class InvitacionEstadoTerminalError(InvitacionError):
    """Raised when attempting a transition from a terminal invitation state."""


class InvitacionNoVigenteError(InvitacionError):
    """Raised when accepting or rejecting an invitation outside its validity window."""


class InvitacionEmailIncorrectoError(InvitacionError):
    """Raised when an action is attempted by an email other than the recipient."""


class InvitacionAunVigenteError(InvitacionError):
    """Raised when attempting to materialize expiration before it is due."""


class CoordinacionNegocioError(DomainError):
    """Base exception for membership coordination rules owned by Negocio."""


class UltimoPropietarioError(CoordinacionNegocioError):
    """Raised when an operation would leave a business without an active owner."""


class MembresiaNoPerteneceNegocioError(CoordinacionNegocioError):
    """Raised when a membership belongs to a different business."""


class MembresiaNoPerteneceUsuarioError(CoordinacionNegocioError):
    """Raised when a historical membership belongs to a different user."""


class RolIncorporacionInvalidoError(CoordinacionNegocioError):
    """Raised when normal incorporation attempts to assign a forbidden role."""


class IdentificadorNuevaMembresiaRequeridoError(CoordinacionNegocioError):
    """Raised when creating a membership without an application-supplied UUID."""
