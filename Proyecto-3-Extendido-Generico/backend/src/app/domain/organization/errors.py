class DomainError(Exception):
    """Base exception for expected domain-rule violations."""


class EmailInvalidoError(DomainError):
    """Raised when an email cannot be represented as a valid Email value object."""


class IdentificadorInvalidoError(DomainError):
    """Raised when an entity identifier does not satisfy the UUIDv4 contract."""


class NombreInvalidoError(DomainError):
    """Raised when a required domain name is empty or invalid."""


class FechaInvalidaError(DomainError):
    """Raised when a domain instant is missing timezone information."""


class ModalidadesInvalidasError(DomainError):
    """Raised when a business receives an invalid set of operational modalities."""


class VersionInvalidaError(DomainError):
    """Raised when an optimistic concurrency version is lower than one."""


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
