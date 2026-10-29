from dataclasses import dataclass
from uuid import UUID

from app.domain.catalog.errors import ImagenesInvalidasError
from app.domain.common.validation import require_uuid4


@dataclass(frozen=True, slots=True, eq=False)
class ArticuloImagen:
    """Immutable structural child entity belonging to one catalog article.

    Technical persistence timestamps are intentionally kept outside Domain.
    """

    id: UUID
    negocio_id: UUID
    articulo_id: UUID
    referencia_storage: str
    posicion: int
    es_principal: bool

    def __post_init__(self) -> None:
        object.__setattr__(self, "id", require_uuid4(self.id, field_name="id"))
        object.__setattr__(
            self,
            "negocio_id",
            require_uuid4(self.negocio_id, field_name="negocio_id"),
        )
        object.__setattr__(
            self,
            "articulo_id",
            require_uuid4(self.articulo_id, field_name="articulo_id"),
        )

        if (
            not isinstance(self.referencia_storage, str)
            or not self.referencia_storage.strip()
        ):
            raise ImagenesInvalidasError(
                "referencia_storage debe ser texto funcional no vacío."
            )

        if (
            isinstance(self.posicion, bool)
            or not isinstance(self.posicion, int)
            or self.posicion not in {1, 2, 3}
        ):
            raise ImagenesInvalidasError("posicion debe ser 1, 2 o 3.")

        if not isinstance(self.es_principal, bool):
            raise ImagenesInvalidasError("es_principal debe ser booleano.")

