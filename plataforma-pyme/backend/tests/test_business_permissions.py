"""Matriz RBAC pura de E2-1.3C.1; no necesita PostgreSQL."""
import pytest

from app.modules.businesses.permissions import (
    BusinessPermission, BusinessRole, ROLE_PERMISSIONS, has_business_permission,
)


@pytest.mark.parametrize(
    ("role", "expected"),
    [
        (
            BusinessRole.TITULAR_ADMINISTRATIVO,
            frozenset(BusinessPermission),
        ),
        (
            BusinessRole.ADMINISTRADOR,
            frozenset({
                BusinessPermission.VIEW,
                BusinessPermission.EDIT_PROFILE,
                BusinessPermission.INVITE_MEMBERS,
                BusinessPermission.READ_MEMBERS,
            }),
        ),
        (BusinessRole.ENCARGADO, frozenset({BusinessPermission.VIEW})),
        (BusinessRole.TRABAJADOR, frozenset({BusinessPermission.VIEW})),
    ],
)
def test_all_roles_match_exact_permission_matrix(role, expected) -> None:
    assert ROLE_PERMISSIONS[role] == expected
    for permission in BusinessPermission:
        assert has_business_permission(
            role=role.value, membership_status="ACTIVA",
            business_status="ACTIVA", permission=permission,
        ) == (permission in expected)


@pytest.mark.parametrize("role", list(BusinessRole))
def test_inactive_membership_is_denied_even_for_owner(role) -> None:
    for permission in BusinessPermission:
        assert not has_business_permission(
            role=role.value, membership_status="INACTIVA",
            business_status="ACTIVA", permission=permission,
        )


@pytest.mark.parametrize("role", list(BusinessRole))
def test_suspended_company_is_read_only_for_active_members(role) -> None:
    for permission in BusinessPermission:
        assert has_business_permission(
            role=role.value, membership_status="ACTIVA",
            business_status="SUSPENDIDA", permission=permission,
        ) == (permission == BusinessPermission.VIEW)


@pytest.mark.parametrize(
    ("role", "member_status", "company_status"),
    [
        ("SUPERADMIN", "ACTIVA", "ACTIVA"),
        ("", "ACTIVA", "ACTIVA"),
        ("ADMINISTRADOR", "PENDIENTE", "ACTIVA"),
        ("ADMINISTRADOR", "ACTIVA", "ELIMINADA"),
    ],
)
def test_unknown_roles_or_states_always_deny(
    role: str, member_status: str, company_status: str,
) -> None:
    assert not has_business_permission(
        role=role, membership_status=member_status,
        business_status=company_status, permission=BusinessPermission.VIEW,
    )


def test_unknown_permission_is_never_granted() -> None:
    assert not has_business_permission(
        role="TITULAR_ADMINISTRATIVO", membership_status="ACTIVA",
        business_status="ACTIVA", permission="business.delete",  # type: ignore[arg-type]
    )
