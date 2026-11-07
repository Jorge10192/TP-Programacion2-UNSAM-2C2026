"""Repositorio de sesiones sin commit."""
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.infrastructure.models import AuthSession


class AuthSessionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, item: AuthSession) -> None:
        self.db.add(item)

    def by_digest(self, digest: str) -> AuthSession | None:
        return self.db.scalar(select(AuthSession).where(AuthSession.token_hash == digest))
