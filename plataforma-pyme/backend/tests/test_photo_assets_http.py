"""E3-2A: archivos, permisos y aislamiento REAL sobre PostgreSQL descartable."""
import os
from collections.abc import Iterator
from io import BytesIO
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import insert
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.infrastructure.db import get_engine
from app.infrastructure.models import Membership
from app.main import create_app


def png() -> bytes:
    output = BytesIO()
    Image.new("RGB", (34, 25), (20, 80, 210)).save(output, "PNG")
    return output.getvalue()


def test_untrusted_uploads_are_rejected_without_database():
    from fastapi import HTTPException, UploadFile
    from app.modules.media.codec import clean_photo
    import asyncio

    async def probe(payload: bytes, mime: str):
        return await clean_photo(UploadFile(file=BytesIO(payload), filename="foto.png", headers={
            "content-type": mime,
        }))

    # No image parser is reachable for deliberately disallowed content types.
    with pytest.raises(HTTPException) as rejected:
        asyncio.run(probe(b"<svg onload=alert(1)>", "image/svg+xml"))
    assert rejected.value.status_code == 415

    with pytest.raises(HTTPException) as invalid:
        asyncio.run(probe(b"<script>not-png</script>", "image/png"))
    assert invalid.value.status_code == 422

    with pytest.raises(HTTPException) as too_big:
        asyncio.run(probe(b"x" * (5 * 1024 * 1024 + 1), "image/png"))
    assert too_big.value.status_code == 413

    data, width, height = asyncio.run(probe(png(), "image/png"))
    assert data.startswith(b"RIFF") and data[8:12] == b"WEBP"
    assert (width, height) == (34, 25)

    # Un logo transparente debe conservar su canal alfa en la versión WebP.
    transparent = BytesIO()
    Image.new("RGBA", (34, 25), (255, 255, 255, 0)).save(transparent, "PNG")
    logo, _, _ = asyncio.run(probe(transparent.getvalue(), "image/png"))
    with Image.open(BytesIO(logo)) as saved:
        assert saved.mode == "RGBA"
        assert saved.getpixel((0, 0))[3] == 0


def test_photo_endpoints_require_bearer():
    with TestClient(create_app()) as client:
        bid, rid, pid = uuid4(), uuid4(), uuid4()
        paths = (
            "/api/v1/photos/me",
            f"/api/v1/photos/businesses/{bid}",
            f"/api/v1/photos/businesses/{bid}/catalog/{rid}",
            f"/api/v1/photos/businesses/{bid}/suppliers/{rid}",
        )
        for path in paths:
            assert client.get(path).status_code == 401
            assert client.post(path, files={"file": ("a.png", png(), "image/png")}).status_code == 401
        assert client.get(f"/api/v1/photos/{pid}/content").status_code == 401
        assert client.delete(f"/api/v1/photos/{pid}").status_code == 401


@pytest.fixture
def isolated() -> Iterator[tuple[TestClient, object]]:
    with get_engine().connect() as connection:
        outer = connection.begin()
        app = create_app()

        def override_db() -> Iterator[Session]:
            with Session(bind=connection, join_transaction_mode="create_savepoint") as db:
                yield db

        app.dependency_overrides[get_db] = override_db
        try:
            with TestClient(app) as client:
                yield client, connection
        finally:
            app.dependency_overrides.clear()
            outer.rollback()


def actor(client: TestClient) -> tuple[dict[str, str], UUID]:
    email = f"photo-{uuid4().hex}@example.com"
    password = "Frase larga exclusiva de pruebas de fotos"
    reg = client.post("/api/v1/auth/register", json={
        "email": email, "password": password, "display_name": "Persona con foto",
    })
    assert reg.status_code == 201, reg.text
    login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200, login.text
    return {"Authorization": "Bearer " + login.json()["access_token"]}, UUID(reg.json()["id"])


def company(client: TestClient, auth: dict[str, str]) -> UUID:
    response = client.post("/api/v1/businesses", headers={
        **auth, "Idempotency-Key": str(uuid4()),
    }, json={
        "name": "Pyme con imágenes", "category": "Servicios", "activity_kind": "MIXTO",
    })
    assert response.status_code == 201, response.text
    return UUID(response.json()["id"])


def upload(client: TestClient, path: str, auth: dict[str, str]):
    return client.post(path, headers=auth, files={"file": ("foto.png", png(), "image/png")})


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="PostgreSQL QA obligatorio")
def test_real_photos_all_owners_and_tenant_isolation(isolated):
    client, connection = isolated
    owner, _ = actor(client)
    outsider, outsider_id = actor(client)
    bid = company(client, owner)
    other_bid = company(client, outsider)
    catalog = client.post(f"/api/v1/businesses/{bid}/catalog", headers=owner, json={
        "name": "Consultoría visual", "kind": "SERVICIO", "unit": "SERVICIO",
        "sellable": True, "price_cents": 230000,
    })
    assert catalog.status_code == 201, catalog.text
    item_id = catalog.json()["id"]
    supplier = client.post(f"/api/v1/businesses/{bid}/suppliers", headers=owner, json={
        "name": "Proveedor fotográfico",
    })
    assert supplier.status_code == 201, supplier.text
    sid = supplier.json()["id"]

    me = "/api/v1/photos/me"
    company_url = f"/api/v1/photos/businesses/{bid}"
    catalog_url = company_url + f"/catalog/{item_id}"
    supplier_url = company_url + f"/suppliers/{sid}"
    assert client.get(me, headers=owner).json() == []
    assert client.get(company_url, headers=owner).json() == []
    for path in (me, company_url, catalog_url, supplier_url):
        response = upload(client, path, owner)
        assert response.status_code == 201, response.text
        assert response.json()["width"] == 34
        assert response.json()["height"] == 25
        photo_id = response.json()["id"]
        assert len(client.get(path, headers=owner).json()) == 1
        photo = client.get(f"/api/v1/photos/{photo_id}/content", headers=owner)
        assert photo.status_code == 200 and photo.headers["content-type"] == "image/webp"
        assert photo.content.startswith(b"RIFF")
        assert photo.headers["cache-control"] == "private, no-store"
        assert client.get(f"/api/v1/photos/{photo_id}/content", headers=outsider).status_code == 404
        assert client.delete(f"/api/v1/photos/{photo_id}", headers=outsider).status_code == 404
    for path in (company_url, catalog_url, supplier_url):
        assert client.get(path, headers=outsider).status_code == 404

    # No se puede subir a otra empresa ni a un item del otro tenant.
    assert upload(client, f"/api/v1/photos/businesses/{other_bid}/catalog/{item_id}", outsider).status_code == 404
    assert upload(client, catalog_url, outsider).status_code == 404

    # Una sola foto: la segunda reemplaza y la primera deja de existir.
    before = client.get(me, headers=owner).json()[0]["id"]
    assert upload(client, me, owner).status_code == 201
    after = client.get(me, headers=owner).json()[0]["id"]
    assert before != after
    assert client.get(f"/api/v1/photos/{before}/content", headers=owner).status_code == 404

    # Catálogo: hasta ocho fotos; eliminar una recupera capacidad.
    for _ in range(7):
        assert upload(client, catalog_url, owner).status_code == 201
    assert len(client.get(catalog_url, headers=owner).json()) == 8
    assert upload(client, catalog_url, owner).status_code == 409
    photos = client.get(catalog_url, headers=owner).json()
    deletion = client.delete(f"/api/v1/photos/{photos[0]['id']}", headers=owner)
    assert deletion.status_code == 204
    assert len(client.get(catalog_url, headers=owner).json()) == 7
    assert upload(client, catalog_url, owner).status_code == 201

    # Trabajador puede consultar fotos, pero no alterarlas.
    connection.execute(insert(Membership).values(
        id=uuid4(), business_id=bid, user_id=outsider_id,
        role="TRABAJADOR", status="ACTIVA",
    ))
    assert client.get(company_url, headers=outsider).status_code == 200
    assert upload(client, company_url, outsider).status_code == 403
    company_photo_id = client.get(company_url, headers=outsider).json()[0]["id"]
    assert client.get(f"/api/v1/photos/{company_photo_id}/content", headers=outsider).status_code == 200
    assert client.delete(f"/api/v1/photos/{company_photo_id}", headers=outsider).status_code == 403
    assert client.get(f"/api/v1/photos/businesses/{other_bid}", headers=owner).status_code == 404
