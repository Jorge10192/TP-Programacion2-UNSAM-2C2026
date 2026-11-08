"""Punto de montaje para los recursos de negocio de la API v1.

Los endpoints del dominio se incorporan desde E2-1, sin crear recursos
ficticios ni mezclar la ruta tecnica /health con /api/v1.
"""

from fastapi import APIRouter

from app.modules.auth.router import router as auth_router
from app.modules.businesses.router import router as businesses_router
from app.modules.businesses.invitations_router import router as invitations_router
from app.modules.locations.router import router as locations_router
from app.modules.locations.assignment_router import router as location_assignments_router
from app.modules.catalog.router import router as catalog_router
from app.modules.suppliers.router import router as suppliers_router
from app.modules.purchases.router import router as purchases_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(auth_router)
api_v1_router.include_router(businesses_router)

api_v1_router.include_router(invitations_router)
api_v1_router.include_router(locations_router)
api_v1_router.include_router(location_assignments_router)
api_v1_router.include_router(catalog_router)
api_v1_router.include_router(suppliers_router)
api_v1_router.include_router(purchases_router)
