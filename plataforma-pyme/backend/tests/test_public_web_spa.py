"""Public site packaging must not expose API errors as a React index page."""
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.web_spa import attach_spa


def test_no_static_files_keeps_local_api_only(tmp_path):
    app = FastAPI()
    assert attach_spa(app, tmp_path) is False
    assert TestClient(app).get("/real/login").status_code == 404


def test_public_site_supports_deep_links_and_not_api_misses(tmp_path):
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text("<h1>Plataforma PyME</h1>", encoding="utf-8")
    (tmp_path / "assets" / "main.js").write_text("console.log('ok')", encoding="utf-8")
    (tmp_path / "favicon.svg").write_text("<svg/>", encoding="utf-8")

    app = FastAPI()

    @app.get("/api/v1/ping")
    def ping():
        return {"ok": True}

    assert attach_spa(app, tmp_path) is True
    client = TestClient(app)
    for route in ("/", "/real/login", "/real/registro", "/real/empresas/123/pos"):
        response = client.get(route)
        assert response.status_code == 200
        assert "Plataforma PyME" in response.text
        assert response.headers["cache-control"].startswith("no-cache")

    assert client.get("/assets/main.js").status_code == 200
    assert client.get("/favicon.svg").status_code == 200
    assert client.get("/api/v1/ping").json() == {"ok": True}
    for route in ("/api/v1/missing", "/api", "/ready/invalid", "/undefined.css"):
        response = client.get(route)
        assert response.status_code == 404
        assert "Plataforma PyME" not in response.text
