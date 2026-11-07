from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from src.frontend import install_frontend


def test_built_frontend_supports_refresh_without_shadowing_api(tmp_path):
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text('<html><div id="root"></div></html>')
    (tmp_path / "assets" / "app.js").write_text('console.log("WALOS")')
    (tmp_path / "private.txt").write_text("never public")
    app = FastAPI()

    @app.get("/stock")
    def stock():
        raise HTTPException(401)

    @app.post("/auth/login")
    def login():
        return {"ok": True}

    install_frontend(app, tmp_path)
    client = TestClient(app)
    for path in ("/", "/inicio", "/perfil", "/login", "/b/walos/inicio", "/b/walos/compras"):
        response = client.get(path)
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/html")
        assert response.headers["cache-control"] == "no-cache"
    assert client.get("/assets/app.js").status_code == 200
    assert client.get("/stock").status_code == 401
    assert client.post("/auth/login").json() == {"ok": True}
    assert client.get("/auth/login").status_code == 405
    for path in ("/private.txt", "/.env", "/auth/missing", "/assets/missing.js"):
        assert client.get(path).status_code == 404
    assert "/b/{business_id}/{section}" not in client.get("/openapi.json").json()["paths"]


def test_api_alone_still_runs_without_frontend_build(tmp_path):
    app = FastAPI()
    install_frontend(app, tmp_path)
    client = TestClient(app)
    assert client.get("/").status_code == 404
    assert client.get("/openapi.json").status_code == 200
