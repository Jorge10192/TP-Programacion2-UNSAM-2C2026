from fastapi import HTTPException
from sqlalchemy import update

from src.inventario.models import Existencia, MovimientoStock


def mover_stock(db, insumo_id, cantidad, usuario_id, tipo, clave, motivo, compra_id=None, fingerprint=None):
    changed = db.execute(
        update(Existencia)
        .where(Existencia.insumo_id == insumo_id, Existencia.cantidad_micro + cantidad >= 0,
               Existencia.cantidad_micro + cantidad < 10**18)
        .values(cantidad_micro=Existencia.cantidad_micro + cantidad)
    ).rowcount
    if changed != 1:
        raise HTTPException(409, "Stock insuficiente o fuera de rango; requiere revisión")
    movement = MovimientoStock(insumo_id=insumo_id, cantidad_micro=cantidad, usuario_id=usuario_id,
                               tipo=tipo, clave=clave, motivo=motivo, compra_id=compra_id, huella=fingerprint)
    db.add(movement)
    return movement
