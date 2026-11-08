"""Contratos públicos OpenAPI y autenticación obligatoria del catálogo."""
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import create_app


def test_catalog_endpoints_require_bearer_token():
    bid, item = uuid4(), uuid4()
    base = f"/api/v1/businesses/{bid}/catalog"
    with TestClient(create_app()) as client:
        for result in (
            client.get(base),
            client.get(f"{base}/{item}"),
            client.post(base, json={
                "name": "Producto", "kind": "ELABORADO",
                "unit": "UNIDAD", "sellable": True,
            }),
            client.patch(f"{base}/{item}", json={"name": "Otro nombre"}),
            client.patch(f"{base}/{item}/status", json={"status": "INACTIVO"}),
        ):
            assert result.status_code == 401
            assert result.headers["www-authenticate"] == "Bearer"


def test_catalog_openapi_exposes_status_management_without_delete():
    with TestClient(create_app()) as client:
        paths = client.get("/openapi.json").json()["paths"]
    main = paths["/api/v1/businesses/{business_id}/catalog"]
    detail = paths["/api/v1/businesses/{business_id}/catalog/{item_id}"]
    assert {"get", "post"} <= set(main)
    assert {"get", "patch"} <= set(detail)
    assert "delete" not in main and "delete" not in detail
    status = paths["/api/v1/businesses/{business_id}/catalog/{item_id}/status"]
    assert "patch" in status and "delete" not in status
    assert status["patch"]["security"]
    assert {"200", "401", "403", "404", "409", "422"} <= set(status["patch"]["responses"])
    assert "put" not in detail
    assert main["get"]["security"] and main["post"]["security"]
    assert detail["get"]["security"] and detail["patch"]["security"]
    for command in [main["post"], detail["patch"]]:
        assert {"401", "403", "404", "409", "422"} <= set(command["responses"])
    assert "201" in main["post"]["responses"]
    assert "200" in detail["patch"]["responses"]


def test_catalog_openapi_uses_pagination_limits():
    with TestClient(create_app()) as client:
        specs = client.get("/openapi.json").json()["paths"]
    params = specs["/api/v1/businesses/{business_id}/catalog"]["get"]["parameters"]
    names = {param["name"] for param in params}
    assert {"business_id", "offset", "limit"} <= names
