from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from decimal import Decimal

import pytest

PASSWORD = "Walos-prueba-2026"


def crear(api, path, datos):
    response = api.post(path, json=datos)
    assert response.status_code == 201, response.text
    return response.json()


def presentacion(api, catalogo):
    return crear(api, "/presentaciones-insumos", {
        "insumo_id": catalogo["insumo"], "nombre": "Bolsa 5 kg", "marca": "Proveedor",
        "unidad_compra_id": catalogo["bolsa"], "contenido_por_unidad": "5",
        "unidad_contenido_id": catalogo["kg"],
    })


@pytest.mark.parametrize("path", ["/presentaciones-insumos", "/imagenes-insumos", "/proveedores/1",
                                    "/categorias/1", "/unidades/1", "/insumos/1", "/compras/1/historial"])
def test_nuevas_consultas_requieren_login(client, path):
    assert client.get(path).status_code == 401


def test_catalogos_editables_sin_cambiar_unidad_de_stock(api, catalogo):
    proveedor = {"nombre": "Distribuidora nueva", "direccion": "Calle 123", "observaciones": "Entrega"}
    assert api.put(f"/proveedores/{catalogo['proveedor']}", json=proveedor).status_code == 200
    assert api.get(f"/proveedores/{catalogo['proveedor']}").json()["direccion"] == "Calle 123"
    category = {"nombre": "Ingredientes", "descripcion": "Para elaboración"}
    assert api.put(f"/categorias/{catalogo['categoria']}", json=category).json()["descripcion"] == "Para elaboración"
    for path, id in [("proveedores", catalogo["proveedor"]), ("categorias", catalogo["categoria"]),
                     ("unidades", catalogo["g"]), ("insumos", catalogo["insumo"])]:
        assert api.patch(f"/{path}/{id}/desactivar").status_code == 200
        assert api.patch(f"/{path}/{id}/activar").json()["activo"] is True
        assert api.get(f"/{path}/{id}").status_code == 200
    datos = {"nombre": "Harina integral", "categoria_id": catalogo["categoria"], "unidad_stock_id": catalogo["g"]}
    assert api.put(f"/insumos/{catalogo['insumo']}", json=datos).status_code == 409
    datos["unidad_stock_id"] = catalogo["kg"]
    assert api.put(f"/insumos/{catalogo['insumo']}", json=datos).status_code == 200
    assert Decimal(api.get("/stock").json()[0]["cantidad"]) == 0


def test_unidad_utilizada_no_cambia_conversion(api, catalogo):
    assert api.post("/unidades", json={"nombre": "Inválida", "dimension": []}).status_code == 422
    datos = {"nombre": "Kilogramo", "simbolo": "kg", "magnitud": "MASA", "factor_base": "1000"}
    result = api.put(f"/unidades/{catalogo['kg']}", json=datos)
    assert result.status_code == 200, result.text
    datos["factor_base"] = "1"
    assert api.put(f"/unidades/{catalogo['kg']}", json=datos).status_code == 409
    assert Decimal(api.get(f"/unidades/{catalogo['kg']}").json()["factor"]) == 1000


def test_presentacion_valida_contenido_y_unidades(api, catalogo):
    datos = {"insumo_id": catalogo["insumo"], "nombre": "Bolsa", "unidad_compra_id": catalogo["bolsa"]}
    assert api.post("/presentaciones-insumos", json=datos).status_code == 422
    datos["contenido_por_unidad"] = "5"
    assert api.post("/presentaciones-insumos", json=datos).status_code == 422
    litro = crear(api, "/unidades", {"nombre": "Litro", "dimension": "volumen"})["id"]
    datos["unidad_contenido_id"] = litro
    assert api.post("/presentaciones-insumos", json=datos).status_code == 422
    datos["unidad_contenido_id"] = catalogo["kg"]
    registro = crear(api, "/presentaciones-insumos", datos)
    assert api.get(f"/presentaciones-insumos/{registro['id']}").status_code == 200
    assert len(api.get("/presentaciones-insumos", params={"insumo_id": catalogo["insumo"]}).json()) == 1
    assert api.get("/presentaciones-insumos", params={"limit": 101}).status_code == 422
    assert api.patch(f"/presentaciones-insumos/{registro['id']}/desactivar").status_code == 200
    assert api.patch(f"/presentaciones-insumos/{registro['id']}/activar").json()["activo"] is True


def test_presentacion_es_snapshot_y_confirmacion_sigue_idempotente(api, catalogo, compra):
    registro = presentacion(api, catalogo)
    compra["items"] = [{"insumo_id": catalogo["insumo"], "presentacion_id": registro["id"],
                        "cantidad": "2", "precio_total": "100"}]
    borrador = crear(api, "/compras", compra)
    datos = {key: registro[key] for key in ["nombre", "marca", "unidad_compra_id", "contenido_por_unidad", "unidad_contenido_id"]}
    datos["contenido_por_unidad"] = "3"
    assert api.put(f"/presentaciones-insumos/{registro['id']}", json=datos).status_code == 200
    for _ in range(2):
        response = api.patch(f"/compras/{borrador['id']}/confirmar")
        assert response.status_code == 200, response.text
    assert Decimal(response.json()["items"][0]["cantidad_incorporada"]) == 10
    assert Decimal(api.get("/stock").json()[0]["cantidad"]) == 10
    assert len(api.get("/stock/movimientos").json()) == 1
    history = api.get(f"/compras/{borrador['id']}/historial").json()
    assert [row["tipo"] for row in history] == ["CREACION", "CONFIRMACION"]
    assert all(row["usuario_id"] == 1 for row in history)


def test_borrador_sin_proveedor_edicion_items_y_anulacion(api, catalogo):
    borrador = crear(api, "/compras", {"referencia": "borrador-editable"})
    url = f"/compras/{borrador['id']}"
    assert api.post(f"{url}/confirmar").status_code == 422
    assert api.put(url, json={"proveedor_id": catalogo["proveedor"], "fecha_compra": "2026-10-24", "observaciones": "Editada"}).status_code == 200
    datos = {"insumo_id": catalogo["insumo"], "cantidad": "2", "unidad_compra_id": catalogo["kg"], "precio_total": "20"}
    agregado = api.post(f"{url}/items", json=datos)
    assert agregado.status_code == 201, agregado.text
    id = agregado.json()["items"][0]["id"]
    assert api.post(f"{url}/items", json=datos).status_code == 409
    datos["cantidad"] = "3"
    editada = api.put(f"{url}/items/{id}", json=datos)
    assert editada.status_code == 200, editada.text
    assert Decimal(editada.json()["total"]) == 20
    assert api.delete(f"{url}/items/{id}").json()["items"] == []
    assert api.post(f"{url}/confirmar").status_code == 422
    assert api.post(f"{url}/items", json=datos).status_code == 201
    assert api.post(f"{url}/confirmar").status_code == 200
    assert Decimal(api.get("/stock").json()[0]["cantidad"]) == 3
    assert api.put(url, json={"fecha": "2026-10-25"}).status_code == 409
    assert api.post(f"{url}/items", json=datos).status_code == 409
    assert api.post(f"{url}/anular", json={"motivo": "Corregir compra"}).status_code == 200
    assert Decimal(api.get("/stock").json()[0]["cantidad"]) == 0
    history = api.get(url).json()["historial"]
    assert [row["tipo"] for row in history] == ["CREACION", "EDICION", "EDICION", "EDICION", "EDICION", "EDICION", "CONFIRMACION", "ANULACION"]
    assert history[3]["datos_anteriores"]["cantidad"] == "2.000000"
    assert history[3]["datos_nuevos"]["cantidad"] == "3"


def test_no_puede_editar_item_de_otra_compra(api, compra):
    primera = crear(api, "/compras", compra)
    compra["referencia"] = "otra-compra-prueba"
    segunda = crear(api, "/compras", compra)
    item_id = primera["items"][0]["id"]
    assert api.put(f"/compras/{segunda['id']}/items/{item_id}", json=compra["items"][0]).status_code == 404
    assert api.delete(f"/compras/{segunda['id']}/items/{item_id}").status_code == 404
    assert len(api.get(f"/compras/{segunda['id']}/historial").json()) == 1


def test_operador_edita_borrador_y_no_catalogos_admin(api, catalogo, compra):
    registro = presentacion(api, catalogo)
    token = api.post("/auth/login", json={"nombre": "operador", "password": PASSWORD}).json()["access_token"]
    api.headers["Authorization"] = f"Bearer {token}"
    borrador = crear(api, "/compras", compra)
    datos = {"proveedor_id": catalogo["proveedor"], "fecha": "2026-10-24"}
    result = api.put(f"/compras/{borrador['id']}", json=datos)
    assert result.status_code == 200, result.text
    assert [row["usuario_id"] for row in result.json()["historial"]] == [2, 2]
    assert api.patch(f"/proveedores/{catalogo['proveedor']}/activar").status_code == 403
    assert api.put(f"/categorias/{catalogo['categoria']}", json={"nombre": "Nueva"}).status_code == 403
    assert api.patch(f"/presentaciones-insumos/{registro['id']}/desactivar").status_code == 403
    assert api.post(f"/compras/{borrador['id']}/anular", json={"motivo": "Sin permisos"}).status_code == 403


def test_vencimiento_y_presentacion_de_otro_insumo(api, catalogo, compra):
    registro = presentacion(api, catalogo)
    segundo = crear(api, "/insumos", {"nombre": "Leche", "categoria_id": catalogo["categoria"],
                                     "unidad_stock_id": catalogo["kg"], "controla_vencimiento": True})["id"]
    datos = {"referencia": "vencimiento-prueba", "proveedor_id": catalogo["proveedor"],
             "items": [{"insumo_id": segundo, "cantidad": "1", "unidad_compra_id": catalogo["kg"], "precio_total": "10"}]}
    assert api.post("/compras", json=datos).status_code == 422
    datos["items"][0]["vencimiento"] = "2027-01-01"
    assert api.post("/compras", json=datos).status_code == 201
    compra["items"][0].update(insumo_id=segundo, presentacion_id=registro["id"])
    assert api.post("/compras", json=compra).status_code == 422


def test_imagenes_principal_y_edicion(api, catalogo):
    datos = {"insumo_id": catalogo["insumo"], "archivo": "harina.jpg", "principal": True}
    primera = crear(api, "/imagenes-insumos", datos)
    datos["archivo"] = "harina-2.jpg"
    segunda = crear(api, "/imagenes-insumos", datos)
    url = f"/imagenes-insumos/{primera['id']}"
    assert api.get(url).json()["principal"] is False
    assert api.put(url, json={"archivo": "harina-3.jpg", "principal": True}).status_code == 200
    assert api.get(f"/imagenes-insumos/{segunda['id']}").json()["principal"] is False
    assert len(api.get("/imagenes-insumos", params={"insumo_id": catalogo["insumo"]}).json()) == 2
    assert api.patch(f"{url}/desactivar").json()["principal"] is False
    assert api.patch(f"{url}/activar").json()["activo"] is True


def test_imagenes_principales_concurrentes(api, catalogo):
    def create(numero):
        return api.post("/imagenes-insumos", json={"insumo_id": catalogo["insumo"],
                                                  "archivo": f"foto-{numero}.png", "principal": True})
    with ThreadPoolExecutor(max_workers=2) as workers:
        responses = list(workers.map(create, range(2)))
    assert [r.status_code for r in responses] == [201, 201]
    assert sum(row["principal"] for row in api.get("/imagenes-insumos").json()) == 1


def test_editar_y_confirmar_concurrentemente(api, compra):
    borrador = crear(api, "/compras", compra)
    url = f"/compras/{borrador['id']}"
    datos = deepcopy(compra["items"][0])
    datos["cantidad"] = "1"
    with ThreadPoolExecutor(max_workers=2) as workers:
        edicion = workers.submit(api.put, f"{url}/items/{borrador['items'][0]['id']}", json=datos)
        confirmacion = workers.submit(api.post, f"{url}/confirmar")
        assert edicion.result().status_code in [200, 409]
        assert confirmacion.result().status_code == 200
    compra_final = api.get(url).json()
    incorporado = Decimal(compra_final["items"][0]["cantidad_incorporada"])
    assert incorporado in [5, 10]
    assert Decimal(api.get("/stock").json()[0]["cantidad"]) == incorporado
    assert len(api.get("/stock/movimientos").json()) == 1
