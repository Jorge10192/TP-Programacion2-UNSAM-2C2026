"""Comprueba una API desplegada sin crear usuarios ni modificar datos."""

import argparse
import json
import sys
from urllib.error import HTTPError, URLError
from urllib.request import urlopen


REQUIRED = {
    "/auth/usuarios": "post",
    "/auth/login": "post",
    "/auth/me": "get",
    "/auth/logout": "post",
    "/proveedores": "post",
    "/proveedores/{id}": "put",
    "/proveedores/{id}/desactivar": "patch",
    "/categorias": "post",
    "/unidades": "post",
    "/insumos": "post",
    "/compras": "post",
    "/compras/{id}/confirmar": "post",
    "/compras/{id}/anular": "post",
    "/compras/{id}/comprobantes": "post",
    "/stock": "get",
    "/stock/movimientos": "get",
    "/stock/ajustes": "post",
}


def check(base_url):
    base_url = base_url.rstrip("/")

    def read(path):
        with urlopen(base_url + path, timeout=90) as response:
            return json.load(response)

    if read("/health") != {"status": "ok"}:
        raise ValueError("La API no informa salud correcta")
    schema = read("/openapi.json")
    if schema.get("info", {}).get("title") != "WALOS API":
        raise ValueError("La URL no corresponde a WALOS API")
    for path, method in REQUIRED.items():
        if method not in schema.get("paths", {}).get(path, {}):
            raise ValueError(f"Falta el contrato {method.upper()} {path}")
    try:
        with urlopen(base_url + "/stock", timeout=90):
            pass
    except HTTPError as error:
        if error.code != 401:
            raise ValueError("Stock no devuelve 401 al acceso sin sesión") from None
    else:
        raise ValueError("Stock permite acceso sin sesión")
    print("OK: salud, contratos de RF01-RF05 y stock protegido")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url", help="URL base, sin /docs")
    args = parser.parse_args()
    try:
        check(args.url)
    except (HTTPError, URLError, ValueError, TimeoutError, OSError) as error:
        # No imprimir URLs ni excepciones de red que puedan incluir credenciales.
        message = str(error) if isinstance(error, ValueError) else type(error).__name__
        print(f"ERROR: {message}", file=sys.stderr)
        raise SystemExit(1)
