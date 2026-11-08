"""Autorización de ubicaciones, separada de E2-1 para no alterar su RBAC.

E2-2 B: cualquier miembro activo lee; titular/admin crea.
Las asignaciones de usuarios a ubicaciones se definirán en E2-2 C.
"""
from app.modules.businesses.permissions import BusinessPermission, has_business_permission


def can_read_locations(role: str, membership_status: str, business_status: str) -> bool:
    return has_business_permission(
        role=role, membership_status=membership_status,
        business_status=business_status, permission=BusinessPermission.VIEW,
    )


def can_create_locations(role: str, membership_status: str, business_status: str) -> bool:
    return (
        membership_status == "ACTIVA"
        and business_status == "ACTIVA"
        and role in ("TITULAR_ADMINISTRATIVO", "ADMINISTRADOR")
    )
