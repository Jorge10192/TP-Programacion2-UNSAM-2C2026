"""Consultas y operaciones SQLAlchemy: repositorio sin commit."""
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.models import (
    Business, BusinessCreationRequest, BusinessInvitation, Membership, User,
)


class BusinessRepository:
    def __init__(self, session: Session) -> None:
        self.db = session

    def add_company(self, company: Business) -> None:
        self.db.add(company)
        self.db.flush()

    def add_membership(self, membership: Membership) -> None:
        self.db.add(membership)
        self.db.flush()

    def add_creation_record(self, record: BusinessCreationRequest) -> None:
        self.db.add(record)
        self.db.flush()

    def creation_for(self, user_id: UUID, key: UUID) -> BusinessCreationRequest | None:
        return self.db.get(BusinessCreationRequest, (user_id, key))

    def own_businesses(self, user_id: UUID) -> list[tuple[Business, Membership]]:
        statement = (
            select(Business, Membership)
            .join(Membership, Membership.business_id == Business.id)
            .where(Membership.user_id == user_id, Membership.status == "ACTIVA")
            .order_by(Business.created_at, Business.id)
        )
        return [(business, member) for business, member in self.db.execute(statement).all()]

    def own_business(
        self, user_id: UUID, business_id: UUID
    ) -> tuple[Business, Membership] | None:
        statement = (
            select(Business, Membership)
            .join(Membership, Membership.business_id == Business.id)
            .where(
                Membership.user_id == user_id, Membership.status == "ACTIVA",
                Business.id == business_id,
            )
        )
        result = self.db.execute(statement).first()
        if result is None:
            return None
        return result[0], result[1]

    def lock_active_member_business(
        self, user_id: UUID, business_id: UUID
    ) -> tuple[Business, Membership] | None:
        """Bloquea empresa y membresía del MISMO tenant dentro de la transacción.

        La unión filtra el usuario activo antes de conceder cualquier permiso.
        populate_existing impide reutilizar valores de identidad cacheados.
        """
        statement = (
            select(Business, Membership)
            .join(Membership, Membership.business_id == Business.id)
            .where(
                Business.id == business_id,
                Membership.user_id == user_id,
                Membership.status == "ACTIVA",
            )
            .with_for_update(of=[Business, Membership])
            .execution_options(populate_existing=True)
        )
        row = self.db.execute(statement).first()
        if row is None:
            return None
        return row[0], row[1]

    def active_membership_for_email(
        self, business_id: UUID, email_normalizado: str,
    ) -> Membership | None:
        """Nunca buscar un membership de otra empresa por el email global."""
        return self.db.scalar(
            select(Membership)
            .join(User, User.id == Membership.user_id)
            .where(
                Membership.business_id == business_id,
                Membership.status == "ACTIVA",
                User.email_normalizado == email_normalizado,
            )
        )

    def pending_invitation_for_email(
        self, business_id: UUID, email_normalizado: str,
    ) -> BusinessInvitation | None:
        return self.db.scalar(
            select(BusinessInvitation).where(
                BusinessInvitation.business_id == business_id,
                BusinessInvitation.email_normalizado == email_normalizado,
                BusinessInvitation.status == "PENDIENTE",
            )
        )

    def add_invitation(self, invitation: BusinessInvitation) -> None:
        self.db.add(invitation)
        self.db.flush()
