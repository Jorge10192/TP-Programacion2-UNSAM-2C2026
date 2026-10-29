from dataclasses import dataclass

from app.domain.organization.errors import EmailInvalidoError


@dataclass(frozen=True, slots=True)
class Email:
    """Normalized email value object used as a semantic identity value."""

    value: str

    def __post_init__(self) -> None:
        normalized = self._normalize(self.value)
        self._validate(normalized)
        object.__setattr__(self, "value", normalized)

    @staticmethod
    def _normalize(raw: str) -> str:
        if not isinstance(raw, str):
            raise EmailInvalidoError("El email debe ser texto.")
        return raw.strip().lower()

    @staticmethod
    def _validate(value: str) -> None:
        if not value:
            raise EmailInvalidoError("El email no puede estar vacío.")
        if len(value) > 254:
            raise EmailInvalidoError("El email supera la longitud máxima admitida.")
        if any(character.isspace() for character in value):
            raise EmailInvalidoError("El email no puede contener espacios.")
        if value.count("@") != 1:
            raise EmailInvalidoError("El email debe contener exactamente un '@'.")

        local_part, domain = value.split("@", maxsplit=1)
        if not local_part or not domain:
            raise EmailInvalidoError("El email debe tener parte local y dominio.")
        if len(local_part) > 64:
            raise EmailInvalidoError("La parte local del email supera la longitud máxima admitida.")
        if local_part.startswith(".") or local_part.endswith(".") or ".." in local_part:
            raise EmailInvalidoError("La parte local del email tiene un formato inválido.")
        if domain.startswith(".") or domain.endswith(".") or ".." in domain:
            raise EmailInvalidoError("El dominio del email tiene un formato inválido.")

    def __str__(self) -> str:
        return self.value
