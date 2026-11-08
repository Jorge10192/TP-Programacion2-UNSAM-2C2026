"""E2-4 B: OpenAPI público, autenticación y rutas sin DELETE."""
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import create_app


def test_supplier_routes_require_authentication():
    company, supplier = uuid4(), uuid4()
    base = f"/api/v1/businesses/{company}/suppliers"
    with TestClient(create_app()) as client:
        actions = (
            client.get(base),
            client.get(f"{base}/{supplier}"),
            client.post(base, json={"name": "Proveedor"}),
            client.patch(f"{base}/{supplier}", json={"name": "Nuevo nombre"}),
            client.patch(f"{base}/{supplier}/status", json={"status": "INACTIVO"}),
        )
        for response in actions:
            assert response.status_code == 401, response.text
            assert response.headers.get("www-authenticate") == "Bearer"


def test_supplier_openapi_has_five_operations_and_no_delete():
    with TestClient(create_app()) as client:
        paths = client.get("/openapi.json").json()["paths"]
    main = paths["/api/v1/businesses/{business_id}/suppliers"]
    detail = paths["/api/v1/businesses/{business_id}/suppliers/{supplier_id}"]
    status = paths["/api/v1/businesses/{business_id}/suppliers/{supplier_id}/status"]
    assert {"get", "post"} == set(main)
    assert {"get", "patch"} == set(detail)
    assert {"patch"} == set(status)
    assert main["post"]["responses"]["201"]
    for action in (main["post"], detail["patch"], status["patch"]):
        assert {"401", "403", "404", "409", "422"} <= set(action["responses"])
    for action in (main["get"], main["post"], detail["get"], detail["patch"], status["patch"]):
        assert action["security"]


def test_supplier_openapi_has_safe_pagination_and_public_validation_contracts():
    with TestClient(create_app()) as client:
        spec = client.get("/openapi.json").json()
    path = "/api/v1/businesses/{business_id}/suppliers"
    params = spec["paths"][path]["get"]["parameters"]
    assert {"business_id", "offset", "limit"} <= {p["name"] for p in params}
    schemas = spec["components"]["schemas"]
    create = schemas["CreateSupplierRequest"]["properties"]
    update = schemas["UpdateSupplierRequest"]["properties"]
    status = schemas["ChangeSupplierStatusRequest"]["properties"]
    assert "name" in schemas["CreateSupplierRequest"]["required"]
    assert "business_id" not in create and "status" not in create
    assert "business_id" not in update and "status" not in update
    assert set(status) == {"status"}
