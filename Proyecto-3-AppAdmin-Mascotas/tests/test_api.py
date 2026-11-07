from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from decimal import Decimal

from src.auth.models import Sesion, Usuario
from src.auth.security import ahora
from src.inventario.models import Existencia, MovimientoStock

PASSWORD = "Walos-prueba-2026"


def registrar(api, compra):
    response = api.post("/compras", json=compra)
    assert response.status_code == 201, response.text
    return response.json()["id"]


def cantidad(api):
    return Decimal(api.get("/stock").json()[0]["cantidad"])


def test_acceso_sin_sesion(client):
    assert client.get("/proveedores").status_code == 401
    assert client.post("/proveedores", json={"nombre": "Inválido"}).status_code == 401
    assert client.get("/stock").status_code == 401


def test_salud_migrada(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_validacion_nombre(api):
    for name in ["", "   ", "\t\n", "x" * 151]:
        assert api.post("/proveedores", json={"nombre": name}).status_code == 422
    assert api.post("/proveedores", json={"nombre": "  Proveedor  "}).json()["nombre"] == "Proveedor"


def test_roles_y_passwords(client):
    result = client.post("/auth/login", json={"nombre": "operador", "password": PASSWORD})
    client.headers["Authorization"] = f"Bearer {result.json()['access_token']}"
    assert client.post("/auth/usuarios", json={"nombre": "otro", "password": PASSWORD}).status_code == 403
    assert client.post("/stock/ajustes", json={"referencia": "ajuste-001", "insumo_id": 1, "cantidad": 1, "motivo": "Inventario"}).status_code == 403
    with client.sessions() as db:
        assert db.query(Usuario).first().password_hash != PASSWORD
        assert len(db.query(Sesion).first().token_hash) == 64


def test_sesion_vencida_y_logout(api):
    with api.sessions() as db:
        session = db.query(Sesion).first()
        session.vence = ahora() - timedelta(seconds=1)
        db.commit()
    assert api.get("/auth/me").status_code == 401
    result = api.post("/auth/login", json={"nombre": "admin", "password": PASSWORD})
    api.headers["Authorization"] = f"Bearer {result.json()['access_token']}"
    assert api.post("/auth/logout").status_code == 204
    assert api.get("/auth/me").status_code == 401


def test_bloqueo_login(client):
    for _ in range(5):
        assert client.post("/auth/login", json={"nombre": "admin", "password": "incorrecta"}).status_code == 401
    assert client.post("/auth/login", json={"nombre": "admin", "password": PASSWORD}).status_code == 401


def test_desactivar_usuario_invalida_sesion(api):
    token = api.post("/auth/login", json={"nombre": "operador", "password": PASSWORD}).json()["access_token"]
    assert api.patch("/auth/usuarios/2/desactivar").status_code == 200
    assert api.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401
    assert api.patch("/auth/usuarios/1/desactivar").status_code == 409


def test_confirmacion_y_anulacion_sin_duplicados(api, compra):
    id = registrar(api, compra)
    assert cantidad(api) == 0
    assert registrar(api, compra) == id
    for _ in range(2):
        response = api.post(f"/compras/{id}/confirmar")
        assert response.status_code == 200, response.text
        assert response.json()["total"] == "2000.5"
    assert cantidad(api) == 10
    assert len(api.get("/stock/movimientos").json()) == 1
    for _ in range(2):
        assert api.post(f"/compras/{id}/anular", json={"motivo": "Compra duplicada"}).status_code == 200
    assert cantidad(api) == 0
    assert len(api.get("/stock/movimientos").json()) == 2
    assert api.get(f"/compras/{id}").json()["anulada_por_id"] == 1
    assert api.post(f"/compras/{id}/confirmar").status_code == 409


def test_referencia_no_admite_otro_contenido(api, compra):
    registrar(api, compra)
    compra["items"][0]["precio_total"] = "900"
    assert api.post("/compras", json=compra).status_code == 409
    assert len(api.get("/compras").json()) == 1


def test_borrador_vacio_e_insumos_no_repetidos(api, compra):
    compra["items"] *= 2
    assert api.post("/compras", json=compra).status_code == 422
    compra["items"] = []
    borrador = api.post("/compras", json=compra)
    assert borrador.status_code == 201
    assert api.post(f"/compras/{borrador.json()['id']}/confirmar").status_code == 422
    assert api.get(f"/compras/{borrador.json()['id']}").json()["estado"] == "BORRADOR"


def test_cantidad_incompatible_o_contenido_incompleto(api, compra, catalogo):
    compra["items"][0].pop("contenido_por_unidad")
    assert api.post("/compras", json=compra).status_code == 422
    compra["items"][0].pop("unidad_contenido_id")
    assert api.post("/compras", json=compra).status_code == 422


def test_confirmacion_atomica(api, compra, catalogo):
    second = api.post("/insumos", json={"nombre": "Avena", "categoria_id": catalogo["categoria"], "unidad_stock_id": catalogo["kg"]}).json()["id"]
    compra["items"].append({"insumo_id": second, "cantidad": "1", "unidad_compra_id": catalogo["kg"], "precio_total": "100"})
    id = registrar(api, compra)
    api.patch(f"/insumos/{second}/desactivar")
    assert api.post(f"/compras/{id}/confirmar").status_code == 422
    assert api.get(f"/compras/{id}").json()["estado"] == "BORRADOR"
    assert all(Decimal(item["cantidad"]) == 0 for item in api.get("/stock").json())
    assert api.get("/stock/movimientos").json() == []


def test_anulacion_no_deja_stock_negativo(api, compra):
    id = registrar(api, compra)
    api.post(f"/compras/{id}/confirmar")
    ajuste = {"referencia": "ajuste-prueba-001", "insumo_id": compra["items"][0]["insumo_id"], "cantidad": "-1", "motivo": "Consumo registrado"}
    assert api.post("/stock/ajustes", json=ajuste).status_code == 201
    assert api.post(f"/compras/{id}/anular", json={"motivo": "Registro incorrecto"}).status_code == 409
    assert cantidad(api) == 9
    assert api.get(f"/compras/{id}").json()["estado"] == "CONFIRMADA"
    assert len(api.get("/stock/movimientos").json()) == 2


def test_ajustes_idempotentes_y_no_negativos(api, catalogo):
    data = {"referencia": "ajuste-prueba-002", "insumo_id": catalogo["insumo"], "cantidad": "0.000001", "motivo": "Inventario inicial"}
    first = api.post("/stock/ajustes", json=data)
    assert first.status_code == 201
    assert api.post("/stock/ajustes", json=data).json()["id"] == first.json()["id"]
    assert cantidad(api) == Decimal("0.000001")
    data.update(referencia="ajuste-prueba-003", cantidad="-1")
    assert api.post("/stock/ajustes", json=data).status_code == 409
    assert cantidad(api) == Decimal("0.000001")


def test_confirmaciones_concurrentes(api, compra):
    id = registrar(api, compra)
    with ThreadPoolExecutor(max_workers=2) as workers:
        responses = list(workers.map(lambda _: api.post(f"/compras/{id}/confirmar"), range(2)))
    assert [r.status_code for r in responses] == [200, 200]
    assert cantidad(api) == 10
    assert len(api.get("/stock/movimientos").json()) == 1


def test_confirmar_y_anular_concurrentemente(api, compra):
    id = registrar(api, compra)
    with ThreadPoolExecutor(max_workers=2) as workers:
        confirmation = workers.submit(api.post, f"/compras/{id}/confirmar")
        cancellation = workers.submit(api.post, f"/compras/{id}/anular", json={"motivo": "Corrección concurrente"})
        assert confirmation.result().status_code in [200, 409]
        assert cancellation.result().status_code == 200
    assert cantidad(api) == 0
    assert api.get(f"/compras/{id}").json()["estado"] == "ANULADA"
    assert len(api.get("/stock/movimientos").json()) in [0, 2]


def test_compra_desactivada_y_no_existente(api, compra, catalogo):
    api.patch(f"/proveedores/{catalogo['proveedor']}/desactivar")
    assert api.post("/compras", json=compra).status_code == 422
    assert api.get("/compras/999").status_code == 404


def test_comprobantes_protegidos_conservados_al_anular(api, compra):
    id = registrar(api, compra)
    data = b"%PDF-1.7\ncomprobante de prueba"
    url = f"/compras/{id}/comprobantes"
    result = api.post(url, content=data, headers={"Content-Type": "application/octet-stream"})
    assert result.status_code == 201, result.text
    file_id = result.json()["id"]
    assert api.post(url, content=data).json()["id"] == file_id
    assert len(api.get(url).json()) == 1
    api.post(f"/compras/{id}/anular", json={"motivo": "Anulación de prueba"})
    assert api.get(f"{url}/{file_id}").content == data
    assert api.get(f"{url}/{file_id}", headers={"Authorization": "Bearer incorrecto"}).status_code == 401
    assert api.post(url, content=b"archivo.exe").status_code == 415
    assert api.post(url, content=b"%PDF-" + b"x" * (5 * 1024 * 1024)).status_code == 413
