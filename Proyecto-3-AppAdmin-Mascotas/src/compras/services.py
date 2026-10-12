import hashlib
import json

from fastapi import HTTPException
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.compras.conversiones import cantidad_micro
from src.compras.models import Compra, Insumo, ItemCompra, Proveedor, UnidadMedida
from src.compras.schemas import CompraCreate
from src.inventario.services import mover_stock
from src.inventario.models import MovimientoStock
from src.auth.security import ahora


def huella(datos) -> str:
    return hashlib.sha256(json.dumps(datos.model_dump(mode="json"), sort_keys=True).encode()).hexdigest()


def habilitado(db: Session, modelo, identificador):
    record = db.get(modelo, identificador)
    if record is None or not record.activo:
        raise HTTPException(422, f"{modelo.__name__} inexistente o inactivo")
    return record


def guardar(db: Session):
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Registro duplicado o incompatible con los datos existentes")


def crear_compra(db: Session, datos: CompraCreate, usuario_id: int) -> Compra:
    fingerprint = huella(datos)
    existing = db.query(Compra).filter_by(usuario_id=usuario_id, referencia=datos.referencia).first()
    if existing:
        if existing.huella != fingerprint:
            raise HTTPException(409, "Referencia reutilizada con otros datos")
        return existing
    habilitado(db, Proveedor, datos.proveedor_id)
    items = []
    for item in datos.items:
        insumo = habilitado(db, Insumo, item.insumo_id)
        unidad = habilitado(db, UnidadMedida, item.unidad_compra_id)
        stock = habilitado(db, UnidadMedida, insumo.unidad_stock_id)
        contenido = habilitado(db, UnidadMedida, item.unidad_contenido_id) if item.unidad_contenido_id else None
        try:
            micro = cantidad_micro(item.cantidad, unidad, stock, item.contenido_por_unidad, contenido)
        except ValueError as error:
            raise HTTPException(422, str(error))
        fields = item.model_dump(exclude={"precio_total"})
        items.append(ItemCompra(**fields, unidad_stock_id=stock.id, cantidad_micro=micro, precio_centavos=int(item.precio_total * 100)))
    compra = Compra(**datos.model_dump(exclude={"items"}), usuario_id=usuario_id, huella=fingerprint, items=items)
    db.add(compra)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # A concurrent retry may have inserted the same request first.
        existing = db.query(Compra).filter_by(usuario_id=usuario_id, referencia=datos.referencia).first()
        if existing and existing.huella == fingerprint:
            return existing
        raise HTTPException(409, "Referencia reutilizada con otros datos")
    return compra


def confirmar_compra(db: Session, compra: Compra, usuario_id: int) -> Compra:
    changed = db.execute(update(Compra).where(Compra.id == compra.id, Compra.estado == "BORRADOR")
                         .values(estado="CONFIRMADA")).rowcount
    if not changed:
        db.refresh(compra)
        if compra.estado == "CONFIRMADA":
            return compra
        raise HTTPException(409, "No se puede confirmar una compra anulada")
    habilitado(db, Proveedor, compra.proveedor_id)
    for item in sorted(compra.items, key=lambda i: i.insumo_id):
        habilitado(db, Insumo, item.insumo_id)
        habilitado(db, UnidadMedida, item.unidad_compra_id)
        habilitado(db, UnidadMedida, item.unidad_stock_id)
        if item.unidad_contenido_id:
            habilitado(db, UnidadMedida, item.unidad_contenido_id)
        mover_stock(db, item.insumo_id, item.cantidad_micro, usuario_id, "COMPRA",
                    f"compra:{compra.id}:{item.insumo_id}", "Recepción confirmada", compra.id)
    guardar(db)
    db.refresh(compra)
    return compra


def anular_compra(db: Session, compra: Compra, usuario_id: int, motivo: str) -> Compra:
    changed = db.execute(update(Compra).where(Compra.id == compra.id, Compra.estado.in_(["BORRADOR", "CONFIRMADA"]))
                         .values(estado="ANULADA", motivo_anulacion=motivo, anulada_por_id=usuario_id, fecha_anulacion=ahora()),
                         execution_options={"synchronize_session": False}).rowcount
    if not changed:
        db.refresh(compra)
        return compra
    # The conditional update may have waited for a concurrent confirmation.
    # Its committed ledger, rather than a previously loaded state, determines the reversal.
    if db.query(MovimientoStock.id).filter_by(compra_id=compra.id, tipo="COMPRA").first():
        for item in sorted(compra.items, key=lambda i: i.insumo_id):
            mover_stock(db, item.insumo_id, -item.cantidad_micro, usuario_id, "ANULACION",
                        f"anulacion:{compra.id}:{item.insumo_id}", motivo, compra.id)
    guardar(db)
    db.refresh(compra)
    return compra
