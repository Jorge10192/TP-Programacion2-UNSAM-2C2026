"""Base declarativa para futuras entidades SQLAlchemy 2.x."""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Metadatos usados por Alembic para detectar cambios."""
