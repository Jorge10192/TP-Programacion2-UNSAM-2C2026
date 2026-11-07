from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.auth.security import administrador, usuario_actual
from src.compras.models import Compra, Insumo, Proveedor, UnidadMedida
from src.database.session import get_db
from src.inventario.models import Existencia, MovimientoStock
from src.operacion import services
from src.operacion.models import ConteoStock, Gasto, JornadaCaja, Venta
from src.operacion.projections import Projection, consistent_snapshot
from src.operacion.schemas import (CashClose, CashOpen, CatalogCreate, CountCreate, ExpenseCreate,
    Location, ProviderCreate, PurchaseCreate, SaleCreate, SnapshotResponse, UnitConfigure)


def no_cache(response: Response):
    response.headers['Cache-Control'] = 'no-store'


router = APIRouter(prefix='/api/v1', tags=['Operación WALOS'],
                   dependencies=[Depends(usuario_actual), Depends(no_cache)])


@router.get('/snapshot', response_model=SnapshotResponse)
def snapshot(user=Depends(usuario_actual), db: Session = Depends(get_db)):
    return consistent_snapshot(db, user.id)


@router.get('/contexto')
def context(user=Depends(usuario_actual), db: Session = Depends(get_db)):
    return Projection(db, user).context()


def created_result(db, user, response, result, renderer):
    row, created = result
    response.status_code = 201 if created else 200
    return getattr(Projection(db, user), renderer)(row)


@router.post('/proveedores', status_code=201)
def create_provider(data: ProviderCreate, response: Response, user=Depends(usuario_actual), db: Session = Depends(get_db)):
    return created_result(db, user, response, services.create_provider(db, data, user.id), 'provider')


@router.put('/unidades/{identifier}/codigo')
def configure_unit(identifier: int, data: UnitConfigure, user=Depends(administrador), db: Session = Depends(get_db)):
    return Projection(db, user).unit(services.configure_unit(db, identifier, data))


@router.post('/catalogo', status_code=201)
def create_catalog(data: CatalogCreate, response: Response, user=Depends(usuario_actual), db: Session = Depends(get_db)):
    return created_result(db, user, response, services.create_catalog(db, data, user.id), 'catalog_item')


@router.post('/compras', status_code=201)
def create_purchase(data: PurchaseCreate, response: Response, user=Depends(usuario_actual), db: Session = Depends(get_db)):
    return created_result(db, user, response, services.create_purchase(db, data, user.id), 'purchase')


@router.post('/compras/{identifier}/recibir')
def receive_purchase(identifier: int, data: Location, user=Depends(usuario_actual), db: Session = Depends(get_db)):
    row = services.receive_purchase(db, identifier, data, user.id)
    return Projection(db, user).receipt(row)


@router.post('/stock/conteos', status_code=201)
def count_stock(data: CountCreate, response: Response, user=Depends(administrador), db: Session = Depends(get_db)):
    return created_result(db, user, response, services.count_stock(db, data, user.id), 'count')


@router.post('/jornadas', status_code=201)
def open_cash(data: CashOpen, response: Response, user=Depends(administrador), db: Session = Depends(get_db)):
    return created_result(db, user, response, services.open_cash(db, data, user.id), 'cash_session')


@router.post('/jornadas/{identifier}/cerrar')
def close_cash(identifier: int, data: CashClose, user=Depends(administrador), db: Session = Depends(get_db)):
    return Projection(db, user).cash_session(services.close_cash(db, identifier, data, user.id))


@router.post('/ventas', status_code=201)
def create_sale(data: SaleCreate, response: Response, user=Depends(usuario_actual), db: Session = Depends(get_db)):
    return created_result(db, user, response, services.create_sale(db, data, user.id), 'sale')


@router.post('/gastos', status_code=201)
def create_expense(data: ExpenseCreate, response: Response, user=Depends(usuario_actual), db: Session = Depends(get_db)):
    return created_result(db, user, response, services.create_expense(db, data, user.id), 'expense')


def collection_endpoint(model, renderer, key):
    def handler(user=Depends(usuario_actual), db: Session = Depends(get_db),
                limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
        rows = list(db.scalars(select(model).order_by(key).offset(offset).limit(limit + 1)).unique())
        projection = Projection(db, user)
        return {'items': [getattr(projection, renderer)(row) for row in rows[:limit]],
                'next_offset': offset + limit if len(rows) > limit else None}
    return handler


def detail_endpoint(model, renderer):
    def handler(identifier: int, user=Depends(usuario_actual), db: Session = Depends(get_db)):
        row = services.obtain(db, model, identifier)
        return getattr(Projection(db, user), renderer)(row)
    return handler


for path, model, renderer in [
    ('proveedores', Proveedor, 'provider'), ('unidades', UnidadMedida, 'unit'),
    ('catalogo', Insumo, 'catalog_item'), ('compras', Compra, 'purchase'),
    ('stock/conteos', ConteoStock, 'count'), ('stock/movimientos', MovimientoStock, 'movement'),
    ('ventas', Venta, 'sale'), ('gastos', Gasto, 'expense'), ('jornadas', JornadaCaja, 'cash_session'),
]:
    router.add_api_route('/' + path, collection_endpoint(model, renderer, model.id),
                         methods=['GET'], name='listar_' + path.replace('/', '_'))
    router.add_api_route('/' + path + '/{identifier}', detail_endpoint(model, renderer),
                         methods=['GET'], name='detalle_' + path.replace('/', '_'))

router.add_api_route('/stock', collection_endpoint(Existencia, 'stock', Existencia.insumo_id),
                     methods=['GET'], name='stock_autoritativo')
