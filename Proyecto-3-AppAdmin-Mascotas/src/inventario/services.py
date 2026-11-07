from fastapi import HTTPException
from sqlalchemy import update

from src.auth.security import ahora
from src.inventario.models import Existencia, MovimientoStock


def mover_stock(db, insumo_id, cantidad, usuario_id, tipo, clave, motivo, compra_id=None, fingerprint=None,
                item_venta_id=None, fecha_utc=None):
    changed = db.execute(
        update(Existencia)
        .where(Existencia.insumo_id == insumo_id, Existencia.cantidad_micro + cantidad >= 0,
               Existencia.cantidad_micro + cantidad < 10**18)
        .values(cantidad_micro=Existencia.cantidad_micro + cantidad, version=Existencia.version + 1)
    ).rowcount
    if changed != 1:
        raise HTTPException(409, "Stock insuficiente o fuera de rango; requiere revisión")
    movement = MovimientoStock(insumo_id=insumo_id, cantidad_micro=cantidad, usuario_id=usuario_id,
                               tipo=tipo, clave=clave, motivo=motivo, compra_id=compra_id, huella=fingerprint,
                               item_venta_id=item_venta_id, fecha=fecha_utc if fecha_utc is not None else ahora(),
                               fecha_es_utc=True)
    db.add(movement)
    return movement
