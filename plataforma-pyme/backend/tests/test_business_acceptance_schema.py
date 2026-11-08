"""C.4a: formato del token y exposición exclusiva de endpoint protegido."""
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import create_app
from app.modules.businesses.schemas import AcceptBusinessInvitationRequest


def test_acceptance_dto_requires_exact_opaque_token_shape() -> None:
    token = "a" * 43
    assert AcceptBusinessInvitationRequest(invitation_token=token).invitation_token == token


@pytest.mark.parametrize("payload", [
    {}, {"invitation_token": None}, {"invitation_token": ""},
    {"invitation_token": "abc"}, {"invitation_token": "a" * 44},
    {"invitation_token": "a" * 42 + "!"},
    {"invitation_token": "a" * 43, "user_id": str(uuid4())},
    {"invitation_token": "a" * 43, "role": "ADMINISTRADOR"},
    {"invitation_token": "a" * 43, "business_id": str(uuid4())},
])
def test_rejects_missing_extra_or_malformed_invitation_input(payload) -> None:
    with pytest.raises(ValidationError):
        AcceptBusinessInvitationRequest.model_validate(payload)


def test_acceptance_endpoint_requires_bearer() -> None:
    with TestClient(create_app()) as client:
        result = client.post(
            "/api/v1/invitations/accept",
            json={"invitation_token": "a" * 43},
        )
    assert result.status_code == 401


def test_openapi_exposes_one_protected_acceptance_operation() -> None:
    with TestClient(create_app()) as client:
        spec = client.get("/openapi.json").json()
    entry = spec["paths"]["/api/v1/invitations/accept"]
    assert set(entry) == {"post"}
    assert entry["post"]["security"]
    for code in ("200", "401", "404", "409", "422"):
        assert code in entry["post"]["responses"]
