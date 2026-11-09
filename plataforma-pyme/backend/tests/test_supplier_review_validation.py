"""Direcciones IPv4 alternativas tampoco son sitios web públicos de proveedor."""
import os

import pytest
from pydantic import ValidationError

from app.modules.suppliers.schemas import CreateSupplierRequest, UpdateSupplierRequest
from test_supplier_api_integration import actor, business, create, isolated, url


@pytest.mark.parametrize("schema", [CreateSupplierRequest, UpdateSupplierRequest])
@pytest.mark.parametrize("host", ["127.1", "127.0.1", "0177.0.0.1", "0x7f.1"])
def test_website_rejects_alternative_ipv4_notation(schema, host):
    with pytest.raises(ValidationError):
        schema.model_validate({"name": "Proveedor", "website": f"https://{host}/"})


@pytest.mark.parametrize("host", ["3m.com", "0x7f.example.com"])
def test_website_keeps_public_domain_with_numeric_looking_label(host):
    obj = CreateSupplierRequest(name="Proveedor", website=f"https://{host}/catalog")
    assert obj.website == f"https://{host}/catalog"


@pytest.mark.integration
@pytest.mark.skipif(os.environ.get("RUN_DB_INTEGRATION") != "1", reason="PostgreSQL aislado")
@pytest.mark.parametrize("method", ["POST", "PATCH"])
def test_alternative_ip_website_is_422_without_partial_write(isolated, method):
    client, _ = isolated
    headers, _ = actor(client)
    bid = business(client, headers)
    if method == "POST":
        response = client.post(url(bid), headers=headers, json={
            "name": "Proveedor", "website": "https://127.1/",
        })
        assert response.status_code == 422
        assert client.get(url(bid), headers=headers).json() == []
    else:
        made = create(client, bid, headers, website="https://example.com/")
        assert made.status_code == 201
        original = made.json()
        path = url(bid, original["id"])
        response = client.patch(path, headers=headers, json={
            "name": "Nombre que no debe guardarse", "website": "https://127.1/",
        })
        assert response.status_code == 422
        assert client.get(path, headers=headers).json() == original
