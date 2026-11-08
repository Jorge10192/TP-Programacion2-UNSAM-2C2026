"""La API de asignaciones requiere token y no permite DELETE físico."""
from uuid import uuid4
from fastapi.testclient import TestClient
from app.main import create_app


def test_assignment_endpoints_require_authorization():
    bid, lid, mid = uuid4(), uuid4(), uuid4()
    base = f"/api/v1/businesses/{bid}/locations/{lid}/assignments"
    with TestClient(create_app()) as client:
        responses = [client.get(base), client.put(f"{base}/{mid}", json={"status":"ACTIVA"})]
        assert all(x.status_code == 401 for x in responses)
        assert all(x.headers.get("www-authenticate") == "Bearer" for x in responses)


def test_openapi_lists_assignment_contracts_without_delete():
    with TestClient(create_app()) as client:
        paths = client.get("/openapi.json").json()["paths"]
    a = paths["/api/v1/businesses/{business_id}/locations/{location_id}/assignments"]
    b = paths["/api/v1/businesses/{business_id}/locations/{location_id}/assignments/{membership_id}"]
    assert "get" in a and "delete" not in a
    assert "put" in b and "delete" not in b
    assert a["get"]["security"] and b["put"]["security"]
    assert {"200", "401", "403", "404"} <= set(a["get"]["responses"])
    assert {"200", "401", "403", "404", "409", "422"} <= set(b["put"]["responses"])
