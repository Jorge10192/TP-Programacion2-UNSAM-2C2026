import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.modules.commerce.schemas import CatalogInput, LocationInput, PurchaseInput, SaleInput, CashClose
from app.modules.commerce.service import line_total, quantity


@pytest.mark.parametrize('qty,price,expected',[(1000,100,100),(1500,101,152),(500,1,1),(1000,0,0),(1250,12345,15431)])
def test_line_money_rounds_half_up_without_binary_float(qty,price,expected):
    assert line_total(qty,price)==expected


@pytest.mark.parametrize('qty,unit,zero',[(1500,'UNIDAD',False),(1,'PAQUETE',False),(-1,'KILOGRAMO',True),(0,'UNIDAD',False),(True,'UNIDAD',True)])
def test_invalid_stock_quantities_rejected(qty,unit,zero):
    with pytest.raises(HTTPException):
        quantity(qty,unit,zero)


def test_exact_zero_count_and_fractional_weight_are_supported():
    assert quantity(0,'UNIDAD',True)==0
    assert quantity(1234,'KILOGRAMO')==1234


@pytest.mark.parametrize('value',[1.5,True,'1000',-1])
def test_money_contract_rejects_float_bool_coercion_and_negative(value):
    with pytest.raises(ValidationError):
        CashClose(countedCashCents=value)


def test_service_cannot_use_physical_unit_and_links_do_not_accept_javascript():
    with pytest.raises(ValidationError):
        CatalogInput(name='Servicio',kind='SERVICIO',unit='UNIDAD',category='General',sellable=True)
    with pytest.raises(ValidationError):
        LocationInput(name='Local',kind='LOCAL',canSell=True,canStore=True,mapUrl='javascript:alert(1)')


def test_validation_does_not_echo_submitted_password():
    from fastapi.testclient import TestClient
    from app.main import create_app
    with TestClient(create_app()) as client:
        result=client.post('/api/v1/auth/register',json=dict(email='test@example.com',display_name='Prueba',password='short-private'))
        assert result.status_code==422
        assert 'short-private' not in result.text
        assert result.headers['Cache-Control']=='no-store'
