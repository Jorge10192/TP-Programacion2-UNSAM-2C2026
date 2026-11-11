"""E2-2 D2: asignación por sede sin ampliar privilegios empresariales.

El bloqueo del tenant en LocationService serializa los comandos; la FK
compuesta impide atribuir una membresía de otra empresa a una ubicación.
"""
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.models import Location, LocationAssignment
from app.modules.auth.tokens import now_utc
from app.modules.locations.assignment_repository import LocationAssignmentRepository
from app.modules.locations.assignment_schemas import (
    ChangeLocationAssignmentRequest, LocationAssignmentView,
)
from app.modules.locations.service import (
    LocationBusinessUnavailable, LocationConflict, LocationNotFound,
    LocationPermissionDenied, LocationService,
)


class LocationAssignmentService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.locations = LocationService(db)
        self.assignments = LocationAssignmentRepository(db)

    def _require_manager(
        self, actor_id: UUID, session_id: UUID, business_id: UUID,
        *, writing: bool,
    ) -> None:
        # Revalida identidad/sesión, empresa y membresía bajo bloqueos;
        # no agrega permisos nuevos a trabajadores/encargados.
        self.locations._authorize(actor_id, session_id, business_id, writing=writing)
        pair = self.locations.businesses.own_business(actor_id, business_id)
        if pair is None:
            raise LocationBusinessUnavailable()
        _, member = pair
        if member.role not in ("TITULAR_ADMINISTRATIVO", "ADMINISTRADOR"):
            raise LocationPermissionDenied()

    def list_for_location(
        self, actor_id: UUID, session_id: UUID,
        business_id: UUID, location_id: UUID,
    ) -> list[LocationAssignmentView]:
        try:
            self._require_manager(actor_id, session_id, business_id, writing=False)
            if self.locations.locations.get_in_business(business_id, location_id) is None:
                raise LocationNotFound()
            rows = self.assignments.list_for_location(business_id, location_id)
            result = [LocationAssignmentView.from_record(a, member_id)
                      for a, member_id in rows]
            self.db.rollback()
            return result
        except Exception:
            self.db.rollback()
            raise

    def set_status(
        self, actor_id: UUID, session_id: UUID,
        business_id: UUID, location_id: UUID,
        membership_id: UUID, command: ChangeLocationAssignmentRequest,
    ) -> LocationAssignmentView:
        try:
            self._require_manager(actor_id, session_id, business_id, writing=True)
            location = self.locations.locations.get_for_update(business_id, location_id)
            if location is None:
                raise LocationNotFound()
            row = self.locations.businesses.team_member_for_update(
                business_id, membership_id,
            )
            if row is None:
                raise LocationNotFound()
            member, _ = row
            # El rol de una membresía no se modifica a través de asignaciones.
            if command.status == "ACTIVA" and member.role not in ("ENCARGADO", "TRABAJADOR"):
                raise LocationConflict()
            assignment = self.assignments.get_for_update(
                business_id, location_id, member.user_id,
            )
            if command.status == "ACTIVA":
                if member.status != "ACTIVA" or location.status != "ACTIVA":
                    raise LocationConflict()
                if assignment is None:
                    assignment = LocationAssignment(
                        business_id=business_id, location_id=location_id,
                        user_id=member.user_id,
                        status="ACTIVA", revoked_at=None,
                    )
                    self.assignments.add(assignment)
                elif assignment.status != "ACTIVA":
                    assignment.status = "ACTIVA"
                    assignment.revoked_at = None
                    self.db.flush()
                else:
                    result = LocationAssignmentView.from_record(assignment, membership_id)
                    self.db.rollback()
                    return result
            else:
                # Revocación posible incluso si miembro/ubicación está inactivo.
                if assignment is None:
                    raise LocationNotFound()
                if assignment.status == "REVOCADA":
                    result = LocationAssignmentView.from_record(assignment, membership_id)
                    self.db.rollback()
                    return result
                assignment.status = "REVOCADA"
                assignment.revoked_at = now_utc()
                self.db.flush()
            result = LocationAssignmentView.from_record(assignment, membership_id)
            self.db.commit()
            return result
        except Exception:
            self.db.rollback()
            raise

    def list_my_active_location_ids(
        self, actor_id: UUID, session_id: UUID, business_id: UUID,
    ) -> list[UUID]:
        """Read only the authenticated actor's active assignments; no team data."""
        try:
            self.locations._authorize(actor_id, session_id, business_id, writing=False)
            rows = self.db.scalars(
                select(LocationAssignment.location_id)
                .join(
                    Location,
                    (Location.business_id == LocationAssignment.business_id)
                    & (Location.id == LocationAssignment.location_id),
                )
                .where(
                    LocationAssignment.business_id == business_id,
                    LocationAssignment.user_id == actor_id,
                    LocationAssignment.status == "ACTIVA",
                    Location.status == "ACTIVA",
                )
                .order_by(LocationAssignment.location_id)
            ).all()
            self.db.rollback()
            return list(rows)
        except Exception:
            self.db.rollback()
            raise
