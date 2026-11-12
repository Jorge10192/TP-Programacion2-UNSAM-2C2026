"""E2-2 D2: contratos DTO y política de autorización por sede."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from pydantic import ValidationError
from app.modules.locations.assignment_schemas import (
    ChangeLocationAssignmentRequest, LocationAssignmentView,
)
from app.modules.locations.permissions import can_operate_at_location


@pytest.mark.parametrize("offset", [timedelta(0), timedelta(hours=-3), timedelta(hours=5, minutes=45)])
@pytest.mark.parametrize("revoked", [False, True])
def test_assignment_response_has_stable_utc_timestamps(offset, revoked):
    instant = datetime(2026, 11, 12, 22, 59, 27, 287406, tzinfo=timezone.utc)
    local = instant.astimezone(timezone(offset))
    view = LocationAssignmentView(
        business_id=uuid4(), location_id=uuid4(), membership_id=uuid4(), user_id=uuid4(),
        status="REVOCADA" if revoked else "ACTIVA",
        created_at=local, updated_at=local, revoked_at=local if revoked else None,
    )
    data = view.model_dump(mode="json")
    assert data["created_at"] == data["updated_at"] == "2026-11-12T22:59:27.287406Z"
    assert data["revoked_at"] == (data["created_at"] if revoked else None)
    assert view.created_at == instant


@pytest.mark.parametrize("state", ["ACTIVA", "REVOCADA"])
def test_status_valid(state):
    assert ChangeLocationAssignmentRequest.model_validate({"status": state}).status == state


@pytest.mark.parametrize("data", [
    {}, {"status": "PENDIENTE"}, {"status": None}, {"status": True},
    {"status": "ACTIVA", "business_id": "otro"}, {"status": "REVOCADA", "role": "ADMINISTRADOR"},
])
def test_invalid_fields_denied(data):
    with pytest.raises(ValidationError):
        ChangeLocationAssignmentRequest.model_validate(data)


@pytest.mark.parametrize("role", ["TITULAR_ADMINISTRATIVO", "ADMINISTRADOR"])
@pytest.mark.parametrize("operation", ["SELL", "STORE"])
def test_managers_have_business_authority_but_need_capacity(role, operation):
    p = dict(role=role, membership_status="ACTIVA", business_status="ACTIVA",
             location_status="ACTIVA", can_sell=True, can_store=True,
             assignment_status=None, operation=operation)
    assert can_operate_at_location(**p)
    p["can_sell" if operation == "SELL" else "can_store"] = False
    assert not can_operate_at_location(**p)


@pytest.mark.parametrize("role", ["ENCARGADO", "TRABAJADOR"])
@pytest.mark.parametrize("operation", ["SELL", "STORE"])
def test_workers_require_active_assignment(role, operation):
    p = dict(role=role, membership_status="ACTIVA", business_status="ACTIVA",
             location_status="ACTIVA", can_sell=True, can_store=True, operation=operation)
    assert can_operate_at_location(**p, assignment_status="ACTIVA")
    assert not can_operate_at_location(**p, assignment_status="REVOCADA")
    assert not can_operate_at_location(**p, assignment_status=None)


@pytest.mark.parametrize("overrides,operation", [
    ({"membership_status": "INACTIVA"}, "SELL"),
    ({"business_status": "SUSPENDIDA"}, "SELL"),
    ({"location_status": "PAUSADA"}, "STORE"),
    ({"can_sell": False}, "SELL"), ({"can_store": False}, "STORE"),
    ({"role": "ROL_FALSO"}, "STORE"), ({}, "UNSUPPORTED"),
])
def test_policy_denies_invalid_conditions(overrides, operation):
    p = dict(role="ENCARGADO", membership_status="ACTIVA", business_status="ACTIVA",
             location_status="ACTIVA", can_sell=True, can_store=True,
             assignment_status="ACTIVA", operation=operation)
    p.update(overrides)
    assert not can_operate_at_location(**p)
