"""CU-03: alta Empresa + Membresía inicial + idempotencia en UN commit.

Revalida usuario y sesión con bloqueos de fila en la misma transacción,
para cerrar la ventana entre Depends(current_auth) y la escritura.
"""
import hashlib
import json
from dataclasses import dataclass
from datetime import timedelta
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.infrastructure.models import (
    AuthSession, Business, BusinessCreationRequest, BusinessInvitation, Membership, User,
)
from app.modules.auth.tokens import new_token, now_utc, token_digest
from app.modules.businesses.permissions import (
    BusinessPermission, has_business_permission,
)
from app.modules.businesses.repository import BusinessRepository
from app.modules.businesses.schemas import (
    BusinessView, CreateBusinessRequest, UpdateBusinessProfileRequest,
    CreateBusinessInvitationRequest, BusinessInvitationIssued,
    AcceptBusinessInvitationRequest,
)


class CreationSessionInvalid(Exception):
    """La identidad perdió validez antes de confirmar el comando."""


class IdempotencyConflict(Exception):
    """Misma clave para diferente contenido."""


class BusinessUnavailable(Exception):
    """La membresía ya no habilita consultar ese negocio."""




class InvitationConflict(Exception):
    """El destinatario ya es miembro o tiene invitación pendiente válida."""


class InvitationUnavailable(Exception):
    """Token inexistente o dirigido a otra cuenta (no revelar existencia)."""


class InvitationNotAcceptable(Exception):
    """Invitación vencida/consumida, o membresía incompatible."""


INVITATION_LIFETIME = timedelta(days=7)


class BusinessPermissionDenied(Exception):
    """Membresía vigente sin permiso para esta operación."""


class BusinessSuspended(Exception):
    """Empresa visible para el actor, pero no editable en su estado actual."""


@dataclass(frozen=True)
class CreationResult:
    body: BusinessView
    replayed: bool


def _payload_digest(command: CreateBusinessRequest) -> str:
    canonical = json.dumps(
        command.model_dump(mode="json"),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class BusinessService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = BusinessRepository(db)

    def _revalidate_actor(self, actor_id: UUID, auth_session_id: UUID) -> None:
        user = self.db.scalar(
            select(User).where(User.id == actor_id)
            .with_for_update().execution_options(populate_existing=True)
        )
        session = self.db.scalar(
            select(AuthSession)
            .where(
                AuthSession.id == auth_session_id,
                AuthSession.user_id == actor_id,
            )
            .with_for_update().execution_options(populate_existing=True)
        )
        if (
            user is None or user.status != "ACTIVO"
            or session is None or session.revoked_at is not None
            or session.expires_at <= now_utc()
        ):
            raise CreationSessionInvalid()

    def _replay(
        self, actor_id: UUID, key: UUID, digest: str
    ) -> CreationResult | None:
        existing = self.repository.creation_for(actor_id, key)
        if existing is None:
            return None
        if existing.request_sha256 != digest:
            raise IdempotencyConflict()
        pair = self.repository.own_business(actor_id, existing.business_id)
        if pair is None:
            raise BusinessUnavailable()
        return CreationResult(BusinessView.from_records(*pair), replayed=True)

    def create(
        self, actor_id: UUID, auth_session_id: UUID,
        command: CreateBusinessRequest, key: UUID,
    ) -> CreationResult:
        digest = _payload_digest(command)
        try:
            self._revalidate_actor(actor_id, auth_session_id)
            found = self._replay(actor_id, key, digest)
            if found is not None:
                self.db.rollback()  # libera bloqueos de lectura y no escribe
                return found

            company = Business(
                id=uuid4(), name=command.name, category=command.category,
                activity_kind=command.activity_kind,
                founder_user_id=actor_id, status="ACTIVA",
            )
            self.repository.add_company(company)
            member = Membership(
                id=uuid4(), business_id=company.id, user_id=actor_id,
                role="TITULAR_ADMINISTRATIVO", status="ACTIVA",
            )
            self.repository.add_membership(member)
            self.repository.add_creation_record(
                BusinessCreationRequest(
                    actor_user_id=actor_id, idempotency_key=key,
                    request_sha256=digest, business_id=company.id,
                )
            )
            body = BusinessView.from_records(company, member)
            self.db.commit()
            return CreationResult(body=body, replayed=False)
        except IntegrityError as error:
            self.db.rollback()
            name = getattr(getattr(error.orig, "diag", None), "constraint_name", None)
            if name != "pk_business_creation_requests":
                raise
            # La PK compuesta, no un UNIQUE redundante, resuelve la carrera.
            # Otra solicitud concurrente pudo completar el mismo comando.
            try:
                self._revalidate_actor(actor_id, auth_session_id)
                result = self._replay(actor_id, key, digest)
                if result is None:
                    raise
                self.db.rollback()
                return result
            except Exception:
                self.db.rollback()
                raise
        except Exception:
            self.db.rollback()
            raise


    def update_profile(
        self, actor_id: UUID, auth_session_id: UUID,
        business_id: UUID, changes: UpdateBusinessProfileRequest,
    ) -> BusinessView:
        """CU-03 extensión: editar solo perfil corporativo, con RBAC real.

        Un mismo límite transaccional protege identidad, sesión, membresía,
        empresa y escritura. No se aceptan user_id/role/status del cliente.
        """
        try:
            self._revalidate_actor(actor_id, auth_session_id)
            pair = self.repository.lock_active_member_business(actor_id, business_id)
            if pair is None:
                raise BusinessUnavailable()
            company, member = pair

            permission = BusinessPermission.EDIT_PROFILE
            permitted = has_business_permission(
                role=member.role, membership_status=member.status,
                business_status=company.status, permission=permission,
            )
            if not permitted:
                # Distinguir rol sin facultad (403) de un estado empresarial
                # suspendido (409), sin exponer nada a usuarios ajenos.
                capable_if_active = has_business_permission(
                    role=member.role, membership_status=member.status,
                    business_status="ACTIVA", permission=permission,
                )
                if company.status == "SUSPENDIDA" and capable_if_active:
                    raise BusinessSuspended()
                raise BusinessPermissionDenied()

            for field, value in changes.model_dump(exclude_unset=True).items():
                setattr(company, field, value)
            self.db.flush()
            response = BusinessView.from_records(company, member)
            self.db.commit()
            return response
        except Exception:
            self.db.rollback()
            raise


    def issue_invitation(
        self, actor_id: UUID, auth_session_id: UUID,
        business_id: UUID, command: CreateBusinessInvitationRequest,
    ) -> BusinessInvitationIssued:
        """CU-12a: emitir sin conceder membresía ni persistir el token claro.

        Toda creación de invitación usa el bloqueo de la empresa, además de
        la sesión y membresía del actor, para serializar duplicados por tenant.
        """
        try:
            self._revalidate_actor(actor_id, auth_session_id)
            pair = self.repository.lock_active_member_business(actor_id, business_id)
            if pair is None:
                raise BusinessUnavailable()
            company, member = pair
            permission = BusinessPermission.INVITE_MEMBERS
            permitted = has_business_permission(
                role=member.role, membership_status=member.status,
                business_status=company.status, permission=permission,
            )
            if not permitted:
                capable_if_active = has_business_permission(
                    role=member.role, membership_status=member.status,
                    business_status="ACTIVA", permission=permission,
                )
                if company.status == "SUSPENDIDA" and capable_if_active:
                    raise BusinessSuspended()
                raise BusinessPermissionDenied()

            if self.repository.active_membership_for_email(
                business_id, command.email,
            ) is not None:
                raise InvitationConflict()

            now = now_utc()
            previous = self.repository.pending_invitation_for_email(
                business_id, command.email,
            )
            if previous is not None:
                if previous.expires_at > now:
                    raise InvitationConflict()
                previous.status = "EXPIRADA"
                self.db.flush()  # libera la unicidad parcial de email pendiente

            secret = new_token()
            invitation = BusinessInvitation(
                id=uuid4(),
                business_id=business_id,
                invited_by_user_id=actor_id,
                email_normalizado=command.email,
                proposed_role=command.role,
                token_hash=token_digest(secret),
                status="PENDIENTE",
                expires_at=now + INVITATION_LIFETIME,
            )
            self.repository.add_invitation(invitation)
            response = BusinessInvitationIssued.from_record(invitation, secret)
            self.db.commit()
            return response
        except Exception:
            self.db.rollback()
            raise


    def accept_invitation(
        self, actor_id: UUID, auth_session_id: UUID,
        command: AcceptBusinessInvitationRequest,
    ) -> BusinessView:
        """CU-12b: aceptar una sola vez y crear/reactivar la membresía.

        Revalida la sesión. Bloquea la invitación por hash, la empresa y la
        membresía del destinatario antes de la escritura. Jamás usa un user_id
        o role recibido del cliente y no crea una empresa ni cuenta nueva.
        """
        try:
            self._revalidate_actor(actor_id, auth_session_id)
            invitation = self.repository.invitation_for_update(
                token_digest(command.invitation_token),
            )
            actor = self.db.get(User, actor_id)
            if (
                invitation is None or actor is None
                or invitation.email_normalizado != actor.email_normalizado
            ):
                raise InvitationUnavailable()

            now = now_utc()
            if invitation.status != "PENDIENTE" or invitation.expires_at <= now:
                raise InvitationNotAcceptable()
            if invitation.proposed_role not in ("ENCARGADO", "TRABAJADOR"):
                raise InvitationNotAcceptable()

            company = self.repository.business_for_update(invitation.business_id)
            if company is None or company.status != "ACTIVA":
                raise BusinessSuspended()

            member = self.repository.membership_for_update(
                invitation.business_id, actor_id,
            )
            if member is not None:
                if (
                    member.status != "INACTIVA"
                    or member.role == "TITULAR_ADMINISTRATIVO"
                ):
                    # No sobrescribir una membresía activa ni titularidad
                    # administrativa histórica con una invitación operativa.
                    raise InvitationNotAcceptable()
                member.status = "ACTIVA"
                member.role = invitation.proposed_role
                member.job_title = None
            else:
                member = Membership(
                    id=uuid4(), business_id=company.id,
                    user_id=actor_id, role=invitation.proposed_role,
                    status="ACTIVA",
                )
                self.repository.add_membership(member)

            invitation.status = "ACEPTADA"
            invitation.accepted_by_user_id = actor_id
            invitation.accepted_at = now
            self.db.flush()
            body = BusinessView.from_records(company, member)
            self.db.commit()
            return body
        except Exception:
            self.db.rollback()
            raise

    def list_mine(self, user_id: UUID) -> list[BusinessView]:
        return [
            BusinessView.from_records(business, member)
            for business, member in self.repository.own_businesses(user_id)
        ]

    def get_mine(self, user_id: UUID, business_id: UUID) -> BusinessView:
        pair = self.repository.own_business(user_id, business_id)
        if pair is None:
            raise BusinessUnavailable()
        return BusinessView.from_records(*pair)
