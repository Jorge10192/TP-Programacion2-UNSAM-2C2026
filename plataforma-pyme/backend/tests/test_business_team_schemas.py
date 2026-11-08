"""C.4b — DTOs de equipo: sin campos de titularidad ni saltos de privilegio."""
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import create_app
from app.modules.businesses.schemas import UpdateBusinessTeamMemberRequest


def test_partial_update_supports_role_or_status_without_defaults_overwriting() -> None:
    role = UpdateBusinessTeamMemberRequest(role="ADMINISTRADOR")
    assert role.model_dump(exclude_unset=True) == {"role": "ADMINISTRADOR"}
    status = UpdateBusinessTeamMemberRequest(status="INACTIVA")
    assert status.model_dump(exclude_unset=True) == {"status": "INACTIVA"}
    both = UpdateBusinessTeamMemberRequest(role="TRABAJADOR", status="ACTIVA")
    assert both.model_dump(exclude_unset=True) == {
        "role": "TRABAJADOR", "status": "ACTIVA",
    }


@pytest.mark.parametrize("payload", [
    {}, {"role": None}, {"status": None},
    {"role": "TITULAR_ADMINISTRATIVO"},
    {"role": "SUPERADMIN"}, {"status": "PENDIENTE"},
    {"role": "ADMINISTRADOR", "job_title": "Gerente"},
    {"user_id": str(uuid4())}, {"business_id": str(uuid4())},
    {"status": "ACTIVA", "id": str(uuid4())},
])
def test_rejects_empty_null_forbidden_or_invalid_team_updates(payload) -> None:
    with pytest.raises(ValidationError):
        UpdateBusinessTeamMemberRequest.model_validate(payload)


def test_roster_and_patch_require_session_and_document_errors() -> None:
    bid, mid = uuid4(), uuid4()
    with TestClient(create_app()) as client:
        base = f"/api/v1/businesses/{bid}/memberships"
        assert client.get(base).status_code == 401
        assert client.patch(
            f"{base}/{mid}", json={"role": "ENCARGADO"},
        ).status_code == 401
        paths = client.get("/openapi.json").json()["paths"]
    roster = paths["/api/v1/businesses/{business_id}/memberships"]["get"]
    mutation = paths[
        "/api/v1/businesses/{business_id}/memberships/{membership_id}"
    ]["patch"]
    for endpoint in (roster, mutation):
        assert endpoint["security"]
        for code in ("200", "401", "403", "404", "409"):
            assert code in endpoint["responses"]
    assert "422" in mutation["responses"]
