"""Consultas de ubicaciones: siempre filtrar por business_id; sin commits."""
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.models import Location


class LocationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_for_business(self, business_id: UUID) -> list[Location]:
        statement = (
            select(Location)
            .where(Location.business_id == business_id)
            .order_by(Location.is_primary.desc(), Location.name, Location.id)
        )
        return list(self.db.scalars(statement).all())

    def get_in_business(self, business_id: UUID, location_id: UUID) -> Location | None:
        return self.db.scalar(
            select(Location).where(
                Location.id == location_id, Location.business_id == business_id,
            )
        )

    def has_active_primary(self, business_id: UUID) -> bool:
        return self.db.scalar(
            select(Location.id).where(
                Location.business_id == business_id,
                Location.is_primary.is_(True),
                Location.status == "ACTIVA",
            ).limit(1)
        ) is not None

    def add(self, location: Location) -> None:
        self.db.add(location)
        self.db.flush()
