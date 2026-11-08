"""Regresión: resolver reintentos concurrentes por PK compuesta, no UNIQUE eliminado."""
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

from sqlalchemy.exc import IntegrityError

from app.modules.businesses.schemas import CreateBusinessRequest
from app.modules.businesses.service import BusinessService, _payload_digest


class _UniquePKViolation(Exception):
    diag = SimpleNamespace(constraint_name="pk_business_creation_requests")


class _FakeDB:
    def __init__(self) -> None:
        self.rollbacks = 0
        self.commits = 0

    def rollback(self) -> None:
        self.rollbacks += 1

    def commit(self) -> None:
        self.commits += 1


class _RaceRepository:
    def __init__(self, actor_id, key, digest) -> None:
        self.actor_id = actor_id
        self.key = key
        self.digest = digest
        self.calls = 0
        self.business = None
        self.member = None

    def creation_for(self, actor_id, key):
        assert (actor_id, key) == (self.actor_id, self.key)
        self.calls += 1
        if self.calls == 1:
            return None
        return SimpleNamespace(
            business_id=self.business.id, request_sha256=self.digest
        )

    def own_business(self, actor_id, business_id):
        assert actor_id == self.actor_id
        assert business_id == self.business.id
        return self.business, self.member

    def add_company(self, business) -> None:
        business.created_at = datetime.now(timezone.utc)
        self.business = business

    def add_membership(self, membership) -> None:
        self.member = membership

    def add_creation_record(self, record) -> None:
        raise IntegrityError("INSERT INTO business_creation_requests", {},
                             _UniquePKViolation())


def test_pk_race_replays_result_instead_of_raising_500() -> None:
    db = _FakeDB()
    actor, auth_session, key = uuid4(), uuid4(), uuid4()
    command = CreateBusinessRequest(
        name="Comercio Ejemplo", category="Comercio",
        activity_kind="MIXTO",
    )
    service = BusinessService(db)  # type: ignore[arg-type]
    service._revalidate_actor = lambda *_args: None  # type: ignore[method-assign]
    repository = _RaceRepository(actor, key, _payload_digest(command))
    service.repository = repository  # type: ignore[assignment]
    result = service.create(actor, auth_session, command, key)
    assert result.replayed is True
    assert result.body.id == repository.business.id
    assert result.body.membership.role == "TITULAR_ADMINISTRATIVO"
    assert repository.calls == 2
    assert db.rollbacks == 2
    assert db.commits == 0
