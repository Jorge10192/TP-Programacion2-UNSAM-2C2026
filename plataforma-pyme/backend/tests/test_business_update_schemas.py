"""Contrato PATCH: cambios parciales válidos, datos sensibles prohibidos."""
import pytest
from pydantic import ValidationError

from app.modules.businesses.schemas import UpdateBusinessProfileRequest


def test_patch_trims_and_keeps_explicit_fields_only() -> None:
    request = UpdateBusinessProfileRequest(name="  Empresa Actualizada  ")
    assert request.model_dump(exclude_unset=True) == {"name": "Empresa Actualizada"}


@pytest.mark.parametrize("payload", [
    {}, {"name": None}, {"category": None}, {"activity_kind": None},
    {"name": " "}, {"category": " x "},
    {"activity_kind": "OTRO"},
    {"status": "ACTIVA"}, {"founder_user_id": "abc"},
    {"role": "TITULAR_ADMINISTRATIVO"}, {"membership": {}},
    {"name": "x" * 121}, {"category": "x" * 121},
])
def test_patch_rejects_empty_null_invalid_or_privilege_fields(payload: dict) -> None:
    with pytest.raises(ValidationError):
        UpdateBusinessProfileRequest.model_validate(payload)


def test_patch_all_business_profile_fields() -> None:
    request = UpdateBusinessProfileRequest(
        name=" Negocio Nuevo ", category=" Servicios Profesionales ",
        activity_kind="MIXTO",
    )
    assert request.model_dump(exclude_unset=True) == {
        "name": "Negocio Nuevo",
        "category": "Servicios Profesionales",
        "activity_kind": "MIXTO",
    }
