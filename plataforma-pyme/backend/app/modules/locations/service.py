"""RF-03 E2-2 B/C: administración de ubicaciones con autorización real por tenant.

Se bloquea la sesión y el usuario (como E2-1) en cada operación y la
empresa+membresía en una misma transacción. El bloqueo empresarial serializa
la elección de primera principal; el índice SQL sigue siendo última defensa.
"""
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.models import AuthSession, Location, User
from app.modules.auth.tokens import now_utc
from app.modules.businesses.repository import BusinessRepository
from app.modules.locations.permissions import can_create_locations, can_read_locations
from app.modules.locations.repository import LocationRepository
from app.modules.locations.schemas import (
    CreateLocationRequest, LocationView, UpdateLocationRequest,
    ChangeLocationStatusRequest,
)


class LocationSessionInvalid(Exception):
    """Sesión revocada o identidad inactiva entre autorización y ejecución."""


class LocationBusinessUnavailable(Exception):
    """Empresa inexistente, ajena o sin membresía activa."""


class LocationNotFound(Exception):
    """Ubicación fuera del tenant autorizado o inexistente."""


class LocationPermissionDenied(Exception):
    """Membresía activa sin facultad para el comando."""


class LocationBusinessSuspended(Exception):
    """Empresa suspendida; se permite la consulta pero no su modificación."""


class LocationConflict(Exception):
    """Ubicación PAUSADA no puede ser principal u otro estado incompatible."""


class LocationService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.businesses = BusinessRepository(db)
        self.locations = LocationRepository(db)

    def _require_actor(self, actor_id: UUID, session_id: UUID) -> None:
        user = self.db.scalar(
            select(User).where(User.id == actor_id)
            .with_for_update().execution_options(populate_existing=True)
        )
        session = self.db.scalar(
            select(AuthSession).where(
                AuthSession.id == session_id,
                AuthSession.user_id == actor_id,
            ).with_for_update().execution_options(populate_existing=True)
        )
        if (user is None or user.status != "ACTIVO"
                or session is None or session.revoked_at is not None
                or session.expires_at <= now_utc()):
            raise LocationSessionInvalid()

    def _authorize(
        self, actor_id: UUID, session_id: UUID,
        business_id: UUID, *, writing: bool,
    ) -> None:
        self._require_actor(actor_id, session_id)
        pair = self.businesses.lock_active_member_business(actor_id, business_id)
        if pair is None:
            raise LocationBusinessUnavailable()
        company, member = pair
        if not can_read_locations(member.role, member.status, company.status):
            raise LocationPermissionDenied()
        if writing:
            if member.role not in ("TITULAR_ADMINISTRATIVO", "ADMINISTRADOR"):
                raise LocationPermissionDenied()
            if company.status == "SUSPENDIDA":
                raise LocationBusinessSuspended()
            if not can_create_locations(member.role, member.status, company.status):
                raise LocationPermissionDenied()

    def list_for_business(
        self, actor_id: UUID, session_id: UUID, business_id: UUID,
    ) -> list[LocationView]:
        try:
            self._authorize(actor_id, session_id, business_id, writing=False)
            body = [
                LocationView.from_record(item)
                for item in self.locations.list_for_business(business_id)
            ]
            self.db.rollback()  # lectura: liberar bloqueos sin commit
            return body
        except Exception:
            self.db.rollback()
            raise

    def get_for_business(
        self, actor_id: UUID, session_id: UUID,
        business_id: UUID, location_id: UUID,
    ) -> LocationView:
        try:
            self._authorize(actor_id, session_id, business_id, writing=False)
            item = self.locations.get_in_business(business_id, location_id)
            if item is None:
                raise LocationNotFound()
            body = LocationView.from_record(item)
            self.db.rollback()
            return body
        except Exception:
            self.db.rollback()
            raise

    def create(
        self, actor_id: UUID, session_id: UUID,
        business_id: UUID, command: CreateLocationRequest,
    ) -> LocationView:
        try:
            self._authorize(actor_id, session_id, business_id, writing=True)
            # La empresa está bloqueada: una sola creación elige la principal.
            primary = not self.locations.has_active_primary(business_id)
            item = Location(
                id=uuid4(), business_id=business_id,
                name=command.name, kind=command.kind,
                address=command.address, map_url=command.map_url,
                can_sell=command.can_sell, can_store=command.can_store,
                is_primary=primary, status="ACTIVA",
            )
            self.locations.add(item)
            body = LocationView.from_record(item)
            self.db.commit()
            return body
        except Exception:
            self.db.rollback()
            raise

    def update(
        self, actor_id: UUID, session_id: UUID, business_id: UUID,
        location_id: UUID, changes: UpdateLocationRequest,
    ) -> LocationView:
        """Editar atributos operativos; no modifica estado, principal ni tenant."""
        try:
            self._authorize(actor_id, session_id, business_id, writing=True)
            item = self.locations.get_for_update(business_id, location_id)
            if item is None:
                raise LocationNotFound()
            for key, value in changes.model_dump(exclude_unset=True).items():
                setattr(item, key, value)
            self.db.flush()
            view = LocationView.from_record(item)
            self.db.commit()
            return view
        except Exception:
            self.db.rollback()
            raise

    def change_status(
        self, actor_id: UUID, session_id: UUID, business_id: UUID,
        location_id: UUID, command: ChangeLocationStatusRequest,
    ) -> LocationView:
        """PAUSADA revoca principal; reactivar no restaura principal anterior."""
        try:
            self._authorize(actor_id, session_id, business_id, writing=True)
            item = self.locations.get_for_update(business_id, location_id)
            if item is None:
                raise LocationNotFound()
            if item.status != command.status:
                if command.status == "PAUSADA":
                    item.is_primary = False
                item.status = command.status
                self.db.flush()
                view = LocationView.from_record(item)
                self.db.commit()
            else:
                view = LocationView.from_record(item)
                self.db.rollback()  # no-op idempotente, sin updated_at artificial
            return view
        except Exception:
            self.db.rollback()
            raise

    def designate_primary(
        self, actor_id: UUID, session_id: UUID, business_id: UUID,
        location_id: UUID,
    ) -> LocationView:
        """Cambio de principal serializado por bloqueo de empresa.

        El índice parcial único de PostgreSQL es la última defensa. Nunca se
        promueve una ubicación PAUSADA ni se toca una empresa diferente.
        """
        try:
            self._authorize(actor_id, session_id, business_id, writing=True)
            item = self.locations.get_for_update(business_id, location_id)
            if item is None:
                raise LocationNotFound()
            if item.status != "ACTIVA":
                raise LocationConflict()
            if item.is_primary:
                result = LocationView.from_record(item)
                self.db.rollback()  # idempotente
                return result
            self.locations.clear_primary(business_id)
            item.is_primary = True
            self.db.flush()
            result = LocationView.from_record(item)
            self.db.commit()
            return result
        except Exception:
            self.db.rollback()
            raise
