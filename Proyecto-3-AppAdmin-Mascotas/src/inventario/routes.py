from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.auth.security import administrador, usuario_actual
from src.compras.models import Insumo
from src.compras.schemas import AjusteCreate, MovimientoResponse, StockResponse
from src.compras.services import huella
from src.database.session import get_db
from src.inventario.models import Existencia, MovimientoStock
from src.inventario.services import mover_stock

router = APIRouter(prefix="/stock", tags=["Inventario"], dependencies=[Depends(usuario_actual)])


@router.get("", response_model=list[StockResponse])
def listar_stock(db: Session = Depends(get_db), limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
    return db.query(Existencia).order_by(Existencia.insumo_id).offset(offset).limit(limit).all()


@router.get("/movimientos", response_model=list[MovimientoResponse])
def movimientos(db: Session = Depends(get_db), limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
    return db.query(MovimientoStock).order_by(MovimientoStock.id).offset(offset).limit(limit).all()


@router.post("/ajustes", response_model=MovimientoResponse, status_code=201)
def ajustar(datos: AjusteCreate, user=Depends(administrador), db: Session = Depends(get_db)):
    key = f"ajuste:{user.id}:{datos.referencia}"
    fingerprint = huella(datos)
    existing = db.query(MovimientoStock).filter_by(clave=key).first()
    if existing:
        if existing.huella != fingerprint:
            raise HTTPException(409, "Referencia reutilizada con otros datos")
        return existing
    if db.get(Insumo, datos.insumo_id) is None:
        raise HTTPException(404, "Insumo inexistente")
    movement = mover_stock(db, datos.insumo_id, int(datos.cantidad * 1_000_000), user.id,
                          "AJUSTE", key, datos.motivo, fingerprint=fingerprint)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.query(MovimientoStock).filter_by(clave=key).first()
        if existing and existing.huella == fingerprint:
            return existing
        raise HTTPException(409, "Referencia reutilizada con otros datos")
    return movement
