"""Autorización de ubicaciones, separada de E2-1 para no alterar su RBAC.

E2-2 B/C: cualquier miembro activo lee; titular/admin gestiona.
Las asignaciones por ubicación operativa quedan fuera de este corte.
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


def can_operate_at_location(
    *, role: str, membership_status: str, business_status: str,
    location_status: str, can_sell: bool, can_store: bool,
    assignment_status: str | None, operation: str,
) -> bool:
    """Política pura para comandos futuros: no concede permisos HTTP por sí sola.

    ADMINISTRADOR y TITULAR no necesitan asignación para operar a nivel empresa,
    ENCARGADO/TRABAJADOR requieren asignación ACTIVA a esa ubicación.
    Nunca se autoriza un tenant/miembro/ubicación inactivo o capacidad ausente.
    """
    if membership_status != "ACTIVA" or business_status != "ACTIVA":
        return False
    if location_status != "ACTIVA":
        return False
    if operation == "SELL":
        if can_sell is not True:
            return False
    elif operation == "STORE":
        if can_store is not True:
            return False
    else:
        return False
    if role in ("TITULAR_ADMINISTRATIVO", "ADMINISTRADOR"):
        return True
    if role in ("ENCARGADO", "TRABAJADOR"):
        return assignment_status == "ACTIVA"
    return False
