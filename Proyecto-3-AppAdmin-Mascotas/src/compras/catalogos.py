from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, update
from sqlalchemy.orm import Session

from src.auth.security import administrador, usuario_actual
from src.compras.conversiones import cantidad_micro
from src.compras.models import (CategoriaInsumo, ImagenInsumo, Insumo, ItemCompra,
                               PresentacionInsumo, Proveedor, UnidadMedida)
from src.compras.schemas import (CategoriaCreate, CategoriaResponse, ImagenBase, ImagenCreate,
                                ImagenResponse, InsumoCreate, InsumoResponse, PresentacionBase,
                                PresentacionCreate, PresentacionResponse, ProveedorResponse,
                                UnidadCreate, UnidadResponse)
from src.compras.services import guardar, habilitado
from src.database.session import get_db

router = APIRouter(tags=["Catálogos"], dependencies=[Depends(usuario_actual)])


def obtener(db, modelo, id):
    registro = db.get(modelo, id)
    if registro is None:
        raise HTTPException(404, "Registro inexistente")
    return registro


def actualizar(db, registro, datos):
    for field, value in datos.model_dump().items():
        setattr(registro, field, value)
    guardar(db)
    return registro


def activar(db, modelo, id):
    registro = obtener(db, modelo, id)
    registro.activo = True
    guardar(db)
    return registro


@router.get("/proveedores/{id}", response_model=ProveedorResponse)
def proveedor(id: int, db: Session = Depends(get_db)):
    return obtener(db, Proveedor, id)


@router.patch("/proveedores/{id}/activar", response_model=ProveedorResponse)
def activar_proveedor(id: int, _=Depends(administrador), db: Session = Depends(get_db)):
    return activar(db, Proveedor, id)


@router.get("/categorias/{id}", response_model=CategoriaResponse)
def categoria(id: int, db: Session = Depends(get_db)):
    return obtener(db, CategoriaInsumo, id)


@router.put("/categorias/{id}", response_model=CategoriaResponse)
def editar_categoria(id: int, datos: CategoriaCreate, _=Depends(administrador), db: Session = Depends(get_db)):
    return actualizar(db, obtener(db, CategoriaInsumo, id), datos)


@router.patch("/categorias/{id}/activar", response_model=CategoriaResponse)
def activar_categoria(id: int, _=Depends(administrador), db: Session = Depends(get_db)):
    return activar(db, CategoriaInsumo, id)


@router.get("/unidades/{id}", response_model=UnidadResponse)
def unidad(id: int, db: Session = Depends(get_db)):
    return obtener(db, UnidadMedida, id)


@router.put("/unidades/{id}", response_model=UnidadResponse)
def editar_unidad(id: int, datos: UnidadCreate, _=Depends(administrador), db: Session = Depends(get_db)):
    # Serialize changes to conversion definitions; history always keeps its original unit.
    db.execute(update(UnidadMedida).where(UnidadMedida.id == id).values(factor=UnidadMedida.factor))
    registro = obtener(db, UnidadMedida, id)
    db.refresh(registro)
    if (registro.dimension, registro.factor) != (datos.dimension, datos.factor):
        usada = (db.query(Insumo.id).filter_by(unidad_stock_id=id).first()
                 or db.query(PresentacionInsumo.id).filter(or_(PresentacionInsumo.unidad_compra_id == id,
                                                             PresentacionInsumo.unidad_contenido_id == id)).first()
                 or db.query(ItemCompra.id).filter(or_(ItemCompra.unidad_compra_id == id,
                                                      ItemCompra.unidad_contenido_id == id,
                                                      ItemCompra.unidad_stock_id == id)).first())
        if usada:
            raise HTTPException(409, "No se puede cambiar la conversión de una unidad utilizada")
    return actualizar(db, registro, datos)


@router.patch("/unidades/{id}/activar", response_model=UnidadResponse)
def activar_unidad(id: int, _=Depends(administrador), db: Session = Depends(get_db)):
    return activar(db, UnidadMedida, id)


@router.get("/insumos/{id}", response_model=InsumoResponse)
def insumo(id: int, db: Session = Depends(get_db)):
    return obtener(db, Insumo, id)


@router.put("/insumos/{id}", response_model=InsumoResponse)
def editar_insumo(id: int, datos: InsumoCreate, _=Depends(administrador), db: Session = Depends(get_db)):
    registro = obtener(db, Insumo, id)
    if registro.unidad_stock_id != datos.unidad_stock_id:
        raise HTTPException(409, "La unidad de stock del insumo es inmutable")
    habilitado(db, CategoriaInsumo, datos.categoria_id)
    habilitado(db, UnidadMedida, datos.unidad_stock_id)
    return actualizar(db, registro, datos)


@router.patch("/insumos/{id}/activar", response_model=InsumoResponse)
def activar_insumo(id: int, _=Depends(administrador), db: Session = Depends(get_db)):
    registro = obtener(db, Insumo, id)
    habilitado(db, CategoriaInsumo, registro.categoria_id)
    habilitado(db, UnidadMedida, registro.unidad_stock_id)
    return activar(db, Insumo, id)


def validar_presentacion(db, insumo_id, datos):
    insumo = habilitado(db, Insumo, insumo_id)
    compra = habilitado(db, UnidadMedida, datos.unidad_compra_id)
    stock = habilitado(db, UnidadMedida, insumo.unidad_stock_id)
    contenido = habilitado(db, UnidadMedida, datos.unidad_contenido_id) if datos.unidad_contenido_id else None
    try:
        cantidad_micro(Decimal("1"), compra, stock, datos.contenido_por_unidad, contenido)
    except ValueError as error:
        raise HTTPException(422, str(error))


@router.post("/presentaciones-insumos", response_model=PresentacionResponse, status_code=201)
def crear_presentacion(datos: PresentacionCreate, db: Session = Depends(get_db)):
    validar_presentacion(db, datos.insumo_id, datos)
    registro = PresentacionInsumo(**datos.model_dump())
    db.add(registro)
    guardar(db)
    return registro


@router.get("/presentaciones-insumos", response_model=list[PresentacionResponse])
def listar_presentaciones(insumo_id: int | None = Query(None, gt=0), db: Session = Depends(get_db),
                          limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
    query = db.query(PresentacionInsumo)
    if insumo_id is not None:
        query = query.filter_by(insumo_id=insumo_id)
    return query.order_by(PresentacionInsumo.id).offset(offset).limit(limit).all()


@router.get("/presentaciones-insumos/{id}", response_model=PresentacionResponse)
def presentacion(id: int, db: Session = Depends(get_db)):
    return obtener(db, PresentacionInsumo, id)


@router.put("/presentaciones-insumos/{id}", response_model=PresentacionResponse)
def editar_presentacion(id: int, datos: PresentacionBase, _=Depends(administrador), db: Session = Depends(get_db)):
    registro = obtener(db, PresentacionInsumo, id)
    validar_presentacion(db, registro.insumo_id, datos)
    return actualizar(db, registro, datos)


@router.patch("/presentaciones-insumos/{id}/desactivar", response_model=PresentacionResponse)
def desactivar_presentacion(id: int, _=Depends(administrador), db: Session = Depends(get_db)):
    registro = obtener(db, PresentacionInsumo, id)
    registro.activo = False
    guardar(db)
    return registro


@router.patch("/presentaciones-insumos/{id}/activar", response_model=PresentacionResponse)
def activar_presentacion(id: int, _=Depends(administrador), db: Session = Depends(get_db)):
    registro = obtener(db, PresentacionInsumo, id)
    validar_presentacion(db, registro.insumo_id, registro)
    return activar(db, PresentacionInsumo, id)


def seleccionar_principal(db, insumo_id, principal, imagen_id=None):
    # Lock the parent so concurrent selections cannot leave two primary images.
    db.execute(update(Insumo).where(Insumo.id == insumo_id).values(activo=Insumo.activo))
    habilitado(db, Insumo, insumo_id)
    if principal:
        db.execute(update(ImagenInsumo).where(ImagenInsumo.insumo_id == insumo_id,
                                            ImagenInsumo.id != imagen_id if imagen_id else True)
                   .values(principal=False))


@router.post("/imagenes-insumos", response_model=ImagenResponse, status_code=201)
def crear_imagen(datos: ImagenCreate, db: Session = Depends(get_db)):
    seleccionar_principal(db, datos.insumo_id, datos.principal)
    registro = ImagenInsumo(**datos.model_dump())
    db.add(registro)
    guardar(db)
    return registro


@router.get("/imagenes-insumos", response_model=list[ImagenResponse])
def listar_imagenes(insumo_id: int | None = Query(None, gt=0), db: Session = Depends(get_db),
                    limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
    query = db.query(ImagenInsumo)
    if insumo_id is not None:
        query = query.filter_by(insumo_id=insumo_id)
    return query.order_by(ImagenInsumo.id).offset(offset).limit(limit).all()


@router.get("/imagenes-insumos/{id}", response_model=ImagenResponse)
def imagen(id: int, db: Session = Depends(get_db)):
    return obtener(db, ImagenInsumo, id)


@router.put("/imagenes-insumos/{id}", response_model=ImagenResponse)
def editar_imagen(id: int, datos: ImagenBase, _=Depends(administrador), db: Session = Depends(get_db)):
    registro = obtener(db, ImagenInsumo, id)
    seleccionar_principal(db, registro.insumo_id, datos.principal, id)
    return actualizar(db, registro, datos)


@router.patch("/imagenes-insumos/{id}/desactivar", response_model=ImagenResponse)
def desactivar_imagen(id: int, _=Depends(administrador), db: Session = Depends(get_db)):
    registro = obtener(db, ImagenInsumo, id)
    registro.activo = False
    registro.principal = False
    guardar(db)
    return registro


@router.patch("/imagenes-insumos/{id}/activar", response_model=ImagenResponse)
def activar_imagen(id: int, _=Depends(administrador), db: Session = Depends(get_db)):
    registro = obtener(db, ImagenInsumo, id)
    seleccionar_principal(db, registro.insumo_id, registro.principal, id)
    return activar(db, ImagenInsumo, id)
