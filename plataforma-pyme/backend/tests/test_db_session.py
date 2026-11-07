"""Las sesiones se cierran y no confirman operaciones automaticamente."""
import pytest

from app.infrastructure import db


class _FakeSession:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0
        self.closed = False

    def __enter__(self) -> "_FakeSession":
        return self

    def __exit__(self, *_args: object) -> None:
        self.closed = True

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


def test_session_scope_closes_without_commit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = _FakeSession()
    monkeypatch.setattr(db, "get_session_factory", lambda: lambda: session)
    with db.session_scope() as opened:
        assert opened is session
    assert session.closed
    assert session.commits == 0
    assert session.rollbacks == 0


def test_session_scope_rolls_back_exception(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = _FakeSession()
    monkeypatch.setattr(db, "get_session_factory", lambda: lambda: session)
    with pytest.raises(RuntimeError, match="rollback-case"):
        with db.session_scope():
            raise RuntimeError("rollback-case")
    assert session.closed
    assert session.commits == 0
    assert session.rollbacks == 1
