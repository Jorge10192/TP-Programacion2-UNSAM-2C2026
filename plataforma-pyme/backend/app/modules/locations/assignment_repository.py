"""Acceso a asignaciones de sedes: siempre pertenencia al tenant explícita."""
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.infrastructure.models import LocationAssignment, Membership


class LocationAssignmentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_for_location(
        self, business_id: UUID, location_id: UUID,
    ) -> list[tuple[LocationAssignment, UUID]]:
        return [
            (assignment, member_id)
            for assignment, member_id in self.db.execute(
                select(LocationAssignment, Membership.id)
                .join(
                    Membership,
                    and_(
                        Membership.business_id == LocationAssignment.business_id,
                        Membership.user_id == LocationAssignment.user_id,
                    ),
                )
                .where(
                    LocationAssignment.business_id == business_id,
                    LocationAssignment.location_id == location_id,
                )
                .order_by(LocationAssignment.created_at, LocationAssignment.user_id)
            ).all()
        ]

    def get_for_update(
        self, business_id: UUID, location_id: UUID, user_id: UUID,
    ) -> LocationAssignment | None:
        return self.db.scalar(
            select(LocationAssignment)
            .where(
                LocationAssignment.business_id == business_id,
                LocationAssignment.location_id == location_id,
                LocationAssignment.user_id == user_id,
            )
            .with_for_update()
            .execution_options(populate_existing=True)
        )

    def add(self, record: LocationAssignment) -> None:
        self.db.add(record)
        self.db.flush()
