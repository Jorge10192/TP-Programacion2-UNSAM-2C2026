"""Repositorio sin confirmacion de transacciones."""
from sqlalchemy.orm import Session
from app.infrastructure.models import User


class UserRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, user: User) -> None:
        self.session.add(user)
        self.session.flush()
