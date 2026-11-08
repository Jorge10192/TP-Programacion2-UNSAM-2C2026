"""Matriz de autorización empresarial E2-1.3C.1.

Política pura (sin SQL, FastAPI ni efectos secundarios). NO es un control
de acceso efectivo por sí sola: cada endpoint deberá consultar en PostgreSQL
la membresía del actor en esa empresa y aplicar esta política en su transacción.
Solo se definen capacidades corporativas; catálogo/stock/ventas se detallarán
cuando exista cada caso de uso real.
"""
from enum import StrEnum
from typing import Final


class BusinessRole(StrEnum):
    TITULAR_ADMINISTRATIVO = "TITULAR_ADMINISTRATIVO"
    ADMINISTRADOR = "ADMINISTRADOR"
    ENCARGADO = "ENCARGADO"
    TRABAJADOR = "TRABAJADOR"


class BusinessPermission(StrEnum):
    VIEW = "business.view"
    EDIT_PROFILE = "business.profile.edit"
    INVITE_MEMBERS = "members.invite"
    READ_MEMBERS = "members.read"
    MANAGE_MEMBERS = "members.manage"


ROLE_PERMISSIONS: Final[dict[BusinessRole, frozenset[BusinessPermission]]] = {
    BusinessRole.TITULAR_ADMINISTRATIVO: frozenset(BusinessPermission),
    BusinessRole.ADMINISTRADOR: frozenset({
        BusinessPermission.VIEW,
        BusinessPermission.EDIT_PROFILE,
        BusinessPermission.INVITE_MEMBERS,
        BusinessPermission.READ_MEMBERS,
    }),
    BusinessRole.ENCARGADO: frozenset({BusinessPermission.VIEW}),
    BusinessRole.TRABAJADOR: frozenset({BusinessPermission.VIEW}),
}


def has_business_permission(
    *,
    role: str,
    membership_status: str,
    business_status: str,
    permission: BusinessPermission,
) -> bool:
    """Fail-closed: solo miembros ACTIVOS, roles conocidos y empresas conocidas.

    Empresas SUSPENDIDAS se pueden consultar para mostrar su estado, pero
    ninguna escritura de configuración ni gestión de equipo queda habilitada.
    La pertenencia de la membresía al business_id solicitante se comprueba
    obligatoriamente en el repositorio/servicio de la API.
    """
    if membership_status != "ACTIVA":
        return False
    if business_status not in ("ACTIVA", "SUSPENDIDA"):
        return False
    try:
        known_role = BusinessRole(role)
        known_permission = BusinessPermission(permission)
    except ValueError:
        return False
    if business_status == "SUSPENDIDA" and known_permission != BusinessPermission.VIEW:
        return False
    return known_permission in ROLE_PERMISSIONS[known_role]
