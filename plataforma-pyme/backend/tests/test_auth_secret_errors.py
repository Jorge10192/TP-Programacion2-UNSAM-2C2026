"""Los errores de longitud tampoco deben devolver la contraseña del cliente."""
import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_db
from app.main import create_app


@pytest.mark.parametrize("endpoint,password", [
    ("register", "Xy7$z"), ("register", "private-" + "x" * 129),
    ("login", ""), ("login", "private-" + "x" * 1025),
])
def test_password_length_error_redacts_secret(endpoint, password):
    payload = {"email": "synthetic@example.com", "password": password}
    if endpoint == "register":
        payload["display_name"] = "Persona Prueba"
    application = create_app()
    application.dependency_overrides[get_db] = lambda: None
    with TestClient(application) as client:
        response = client.post(f"/api/v1/auth/{endpoint}", json=payload)
    assert response.status_code == 422
    password_errors = [
        error for error in response.json()["detail"]
        if error["loc"] == ["body", "password"]
    ]
    assert len(password_errors) == 1
    assert password_errors[0]["input"] == ("**********" if password else "")
    if password:
        assert password not in response.text
