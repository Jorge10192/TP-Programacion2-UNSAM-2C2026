from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
import hashlib
from fastapi import Request, Response
from sqlalchemy.exc import IntegrityError

from src.auth.security import administrador, usuario_actual
from src.compras.models import CategoriaInsumo, Comprobante, Compra, Insumo, Proveedor, UnidadMedida
from src.compras.schemas import (CategoriaCreate, CategoriaResponse, CompraCreate, CompraResponse,
                                InsumoCreate, InsumoResponse, Motivo, ProveedorCreate, ProveedorResponse,
                                UnidadCreate, UnidadResponse)
from src.compras.services import anular_compra, confirmar_compra, crear_compra, guardar, habilitado
from src.database.session import get_db
from src.inventario.models import Existencia


router = APIRouter(tags=["Compras"], dependencies=[Depends(usuario_actual)])


@router.post(
    "/proveedores",
    response_model=ProveedorResponse,
    status_code=status.HTTP_201_CREATED,
)
def crear_proveedor(
    datos: ProveedorCreate,
    db: Session = Depends(get_db),
) -> Proveedor:
    proveedor = Proveedor(
        nombre=datos.nombre,
        observaciones=datos.observaciones,
    )

    db.add(proveedor)
    guardar(db)
    db.refresh(proveedor)

    return proveedor


@router.get(
    "/proveedores",
    response_model=list[ProveedorResponse],
)
def listar_proveedores(
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> list[Proveedor]:
    proveedores = db.query(Proveedor).order_by(Proveedor.id).offset(offset).limit(limit).all()

    return proveedores


def obtener(db, modelo, id):
    registro = db.get(modelo, id)
    if registro is None:
        raise HTTPException(404, "Registro inexistente")
    return registro


@router.put("/proveedores/{id}", response_model=ProveedorResponse)
def editar_proveedor(id: int, datos: ProveedorCreate, _=Depends(administrador), db: Session = Depends(get_db)):
    proveedor = obtener(db, Proveedor, id)
    proveedor.nombre = datos.nombre
    proveedor.observaciones = datos.observaciones
    guardar(db)
    return proveedor


@router.patch("/proveedores/{id}/desactivar", response_model=ProveedorResponse)
def desactivar_proveedor(id: int, _=Depends(administrador), db: Session = Depends(get_db)):
    proveedor = obtener(db, Proveedor, id)
    proveedor.activo = False
    guardar(db)
    return proveedor


@router.post("/categorias", response_model=CategoriaResponse, status_code=201)
def crear_categoria(datos: CategoriaCreate, db: Session = Depends(get_db)):
    categoria = CategoriaInsumo(**datos.model_dump())
    db.add(categoria)
    guardar(db)
    return categoria


@router.get("/categorias", response_model=list[CategoriaResponse])
def listar_categorias(db: Session = Depends(get_db), limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
    return db.query(CategoriaInsumo).order_by(CategoriaInsumo.id).offset(offset).limit(limit).all()


@router.patch("/categorias/{id}/desactivar", response_model=CategoriaResponse)
def desactivar_categoria(id: int, _=Depends(administrador), db: Session = Depends(get_db)):
    categoria = obtener(db, CategoriaInsumo, id)
    categoria.activo = False
    guardar(db)
    return categoria


@router.post("/unidades", response_model=UnidadResponse, status_code=201)
def crear_unidad(datos: UnidadCreate, db: Session = Depends(get_db)):
    unidad = UnidadMedida(**datos.model_dump())
    db.add(unidad)
    guardar(db)
    return unidad


@router.get("/unidades", response_model=list[UnidadResponse])
def listar_unidades(db: Session = Depends(get_db), limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
    return db.query(UnidadMedida).order_by(UnidadMedida.id).offset(offset).limit(limit).all()


@router.patch("/unidades/{id}/desactivar", response_model=UnidadResponse)
def desactivar_unidad(id: int, _=Depends(administrador), db: Session = Depends(get_db)):
    unidad = obtener(db, UnidadMedida, id)
    unidad.activo = False
    guardar(db)
    return unidad


@router.post("/insumos", response_model=InsumoResponse, status_code=201)
def crear_insumo(datos: InsumoCreate, db: Session = Depends(get_db)):
    habilitado(db, CategoriaInsumo, datos.categoria_id)
    habilitado(db, UnidadMedida, datos.unidad_stock_id)
    insumo = Insumo(**datos.model_dump())
    db.add(insumo)
    db.flush()
    db.add(Existencia(insumo_id=insumo.id, cantidad_micro=0))
    guardar(db)
    return insumo


@router.get("/insumos", response_model=list[InsumoResponse])
def listar_insumos(db: Session = Depends(get_db), limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
    return db.query(Insumo).order_by(Insumo.id).offset(offset).limit(limit).all()


@router.patch("/insumos/{id}/desactivar", response_model=InsumoResponse)
def desactivar_insumo(id: int, _=Depends(administrador), db: Session = Depends(get_db)):
    insumo = obtener(db, Insumo, id)
    insumo.activo = False
    guardar(db)
    return insumo


@router.post("/compras", response_model=CompraResponse, status_code=201)
def registrar_compra(datos: CompraCreate, user=Depends(usuario_actual), db: Session = Depends(get_db)):
    return crear_compra(db, datos, user.id)


@router.get("/compras", response_model=list[CompraResponse])
def listar_compras(db: Session = Depends(get_db), limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
    return db.query(Compra).order_by(Compra.id).offset(offset).limit(limit).all()


@router.get("/compras/{id}", response_model=CompraResponse)
def consultar_compra(id: int, db: Session = Depends(get_db)):
    return obtener(db, Compra, id)


@router.post("/compras/{id}/confirmar", response_model=CompraResponse)
def confirmar(id: int, user=Depends(usuario_actual), db: Session = Depends(get_db)):
    return confirmar_compra(db, obtener(db, Compra, id), user.id)


@router.post("/compras/{id}/anular", response_model=CompraResponse)
def anular(id: int, datos: Motivo, user=Depends(administrador), db: Session = Depends(get_db)):
    return anular_compra(db, obtener(db, Compra, id), user.id, datos.motivo)


@router.post("/compras/{id}/comprobantes", status_code=201, openapi_extra={
    "requestBody": {"required": True, "content": {"application/octet-stream": {"schema": {"type": "string", "format": "binary"}}}}
})
async def adjuntar_comprobante(id: int, request: Request, user=Depends(usuario_actual), db: Session = Depends(get_db)):
    obtener(db, Compra, id)
    data = bytearray()
    async for chunk in request.stream():
        if len(data) + len(chunk) > 5 * 1024 * 1024:
            raise HTTPException(413, "Máximo 5 MB")
        data.extend(chunk)
    if data.startswith(b"%PDF-"):
        tipo = "application/pdf"
    elif data.startswith(b"\x89PNG\r\n\x1a\n"):
        tipo = "image/png"
    elif data.startswith(b"\xff\xd8\xff"):
        tipo = "image/jpeg"
    else:
        raise HTTPException(415, "Se admite PDF, PNG o JPEG")
    fingerprint = hashlib.sha256(data).hexdigest()
    existing = db.query(Comprobante).filter_by(compra_id=id, huella=fingerprint).first()
    if existing:
        return {"id": existing.id}
    file = Comprobante(compra_id=id, usuario_id=user.id, tipo=tipo, huella=fingerprint, contenido=bytes(data))
    db.add(file)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.query(Comprobante).filter_by(compra_id=id, huella=fingerprint).one()
        return {"id": existing.id}
    return {"id": file.id}


@router.get("/compras/{id}/comprobantes")
def listar_comprobantes(id: int, db: Session = Depends(get_db)):
    obtener(db, Compra, id)
    return [{"id": row.id, "tipo": row.tipo} for row in db.query(Comprobante.id, Comprobante.tipo).filter_by(compra_id=id).all()]


@router.get("/compras/{id}/comprobantes/{comprobante_id}")
def descargar_comprobante(id: int, comprobante_id: int, db: Session = Depends(get_db)):
    file = obtener(db, Comprobante, comprobante_id)
    if file.compra_id != id:
        raise HTTPException(404, "Comprobante inexistente")
    return Response(file.contenido, media_type=file.tipo, headers={"Content-Disposition": f'attachment; filename="comprobante-{file.id}"', "X-Content-Type-Options": "nosniff"})
