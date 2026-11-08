"""C.3: validación de invitación sin DB y contrato HTTP protegido."""
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import create_app
from app.modules.businesses.schemas import CreateBusinessInvitationRequest


def test_email_is_stripped_and_normalized() -> None:
    cmd = CreateBusinessInvitationRequest(
        email="  Persona.Example@EXAMPLE.COM  ", role="TRABAJADOR",
    )
    assert cmd.email == "persona.example@example.com"
    assert cmd.role == "TRABAJADOR"


@pytest.mark.parametrize("payload", [
    {},
    {"email": "not-an-email", "role": "TRABAJADOR"},
    {"email": "worker@example.com", "role": "ADMINISTRADOR"},
    {"email": "worker@example.com", "role": "TITULAR_ADMINISTRATIVO"},
    {"email": "worker@example.com", "role": "invalido"},
    {"email": "worker@example.com", "role": "ENCARGADO", "status": "ACEPTADA"},
    {"email": "worker@example.com", "role": "TRABAJADOR", "business_id": str(uuid4())},
])
def test_rejects_invalid_or_excessive_invite_payloads(payload: dict) -> None:
    with pytest.raises(ValidationError):
        CreateBusinessInvitationRequest.model_validate(payload)


def test_invitation_endpoint_requires_bearer() -> None:
    with TestClient(create_app()) as client:
        response = client.post(
            f"/api/v1/businesses/{uuid4()}/invitations",
            json={"email": "worker@example.com", "role": "TRABAJADOR"},
        )
    assert response.status_code == 401


def test_invitations_documented_only_as_issuance() -> None:
    with TestClient(create_app()) as client:
        spec = client.get("/openapi.json").json()
    path = "/api/v1/businesses/{business_id}/invitations"
    assert "post" in spec["paths"][path]
    assert "get" not in spec["paths"][path]
    operation = spec["paths"][path]["post"]
    assert operation["security"]
    for code in ("201", "401", "403", "404", "409", "422"):
        assert code in operation["responses"]
