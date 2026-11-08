"""CU-03: alta Empresa + Membresía inicial + idempotencia en UN commit.

Revalida usuario y sesión con bloqueos de fila en la misma transacción,
para cerrar la ventana entre Depends(current_auth) y la escritura.
"""
import hashlib
import json
from dataclasses import dataclass
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.infrastructure.models import (
    AuthSession, Business, BusinessCreationRequest, Membership, User,
)
from app.modules.auth.tokens import now_utc
from app.modules.businesses.repository import BusinessRepository
from app.modules.businesses.schemas import BusinessView, CreateBusinessRequest


class CreationSessionInvalid(Exception):
    """La identidad perdió validez antes de confirmar el comando."""


class IdempotencyConflict(Exception):
    """Misma clave para diferente contenido."""


class BusinessUnavailable(Exception):
    """La membresía ya no habilita consultar ese negocio."""


@dataclass(frozen=True)
class CreationResult:
    body: BusinessView
    replayed: bool


def _payload_digest(command: CreateBusinessRequest) -> str:
    canonical = json.dumps(
        command.model_dump(mode="json", exclude={"description"} if not command.description else set()),
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
            if command.description:
                from app.infrastructure.models.commerce import BusinessSettings
                self.db.add(BusinessSettings(business_id=company.id, description=command.description))
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
