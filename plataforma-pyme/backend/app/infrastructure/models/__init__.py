"""Todos los modelos reales: registro explícito para metadatos Alembic."""
from app.infrastructure.models.user import User
from app.infrastructure.models.auth_session import AuthSession
from app.infrastructure.models.business import Business
from app.infrastructure.models.membership import Membership
from app.infrastructure.models.business_creation_request import BusinessCreationRequest
from app.infrastructure.models.business_invitation import BusinessInvitation
from app.infrastructure.models.location import Location
from app.infrastructure.models.location_assignment import LocationAssignment

__all__ = ["User", "AuthSession", "Business", "Membership", "BusinessCreationRequest", "BusinessInvitation", "Location", "LocationAssignment"]
