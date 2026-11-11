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

    def invitation_business_id(self, token_hash: str, recipient_email: str) -> UUID | None:
        """Resolver el tenant por token y email sin bloquear; se revalida bajo lock."""
        return self.db.scalar(
            select(BusinessInvitation.business_id).where(
                BusinessInvitation.token_hash == token_hash,
                BusinessInvitation.email_normalizado == recipient_email,
            )
        )

    def invitation_for_update(self, token_hash: str) -> BusinessInvitation | None:
        """El secreto jamás se busca en texto claro. Bloqueo por token."""
        return self.db.scalar(
            select(BusinessInvitation)
            .where(BusinessInvitation.token_hash == token_hash)
            .with_for_update().execution_options(populate_existing=True)
        )

    def business_for_update(self, business_id: UUID) -> Business | None:
        """Bloqueo empresarial antes de crear/reactivar cualquier membresía."""
        return self.db.scalar(
            select(Business).where(Business.id == business_id)
            .with_for_update().execution_options(populate_existing=True)
        )

    def membership_for_update(
        self, business_id: UUID, user_id: UUID
    ) -> Membership | None:
        """Incluye membresías INACTIVAS: su clave (empresa, usuario) es única."""
        return self.db.scalar(
            select(Membership).where(
                Membership.business_id == business_id,
                Membership.user_id == user_id,
            ).with_for_update().execution_options(populate_existing=True)
        )

    def team_members(
        self, business_id: UUID,
    ) -> list[tuple[Membership, User]]:
        """Equipo de un tenant concreto, incluyendo miembros INACTIVOS."""
        statement = (
            select(Membership, User)
            .join(User, Membership.user_id == User.id)
            .where(Membership.business_id == business_id)
            .order_by(Membership.created_at, Membership.id)
        )
        return [(member, user) for member, user in self.db.execute(statement).all()]

    def team_member_for_update(
        self, business_id: UUID, membership_id: UUID,
    ) -> tuple[Membership, User] | None:
        """Bloquea la membresía identificada DENTRO del tenant solicitado."""
        statement = (
            select(Membership, User)
            .join(User, Membership.user_id == User.id)
            .where(
                Membership.business_id == business_id,
                Membership.id == membership_id,
            )
            .with_for_update(of=Membership)
            .execution_options(populate_existing=True)
        )
        row = self.db.execute(statement).first()
        return (row[0], row[1]) if row is not None else None
