import hashlib
import json

from fastapi import HTTPException
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.compras.conversiones import cantidad_micro
from src.compras.models import Compra, Insumo, ItemCompra, PresentacionInsumo, Proveedor, RegistroActividadCompra, UnidadMedida
from src.compras.schemas import CompraCreate, ItemResponse
from src.inventario.services import mover_stock
from src.inventario.models import MovimientoStock
from src.auth.security import ahora


def huella(datos) -> str:
    payload = datos.model_dump(mode="json")
    if isinstance(datos, CompraCreate):
        # Keep fingerprints from main valid when the new optional field is unused.
        for item in payload["items"]:
            if item["presentacion_id"] is None:
                item.pop("presentacion_id")
        if "fecha" not in datos.model_fields_set:
            payload.pop("fecha")
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


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


def registrar_actividad(db, compra, usuario_id, tipo, descripcion, anterior=None, nuevo=None):
    db.add(RegistroActividadCompra(compra_id=compra.id, usuario_id=usuario_id, tipo=tipo,
                                  descripcion=descripcion, datos_anteriores=anterior, datos_nuevos=nuevo))


def construir_item(db, datos):
    insumo = habilitado(db, Insumo, datos.insumo_id)
    fields = datos.model_dump(exclude={"precio_total"})
    if datos.presentacion_id:
        presentacion = habilitado(db, PresentacionInsumo, datos.presentacion_id)
        if presentacion.insumo_id != insumo.id:
            raise HTTPException(422, "La presentación no corresponde al insumo")
        for field in ("unidad_compra_id", "contenido_por_unidad", "unidad_contenido_id"):
            valor = getattr(presentacion, field)
            if fields[field] is not None and fields[field] != valor:
                raise HTTPException(422, "La cantidad declarada no coincide con la presentación")
            fields[field] = valor
    unidad = habilitado(db, UnidadMedida, fields["unidad_compra_id"])
    stock = habilitado(db, UnidadMedida, insumo.unidad_stock_id)
    contenido = habilitado(db, UnidadMedida, fields["unidad_contenido_id"]) if fields["unidad_contenido_id"] else None
    if insumo.controla_vencimiento and datos.vencimiento is None:
        raise HTTPException(422, "El insumo requiere fecha de vencimiento")
    try:
        micro = cantidad_micro(datos.cantidad, unidad, stock, fields["contenido_por_unidad"], contenido)
    except ValueError as error:
        raise HTTPException(422, str(error))
    return ItemCompra(**fields, unidad_stock_id=stock.id, cantidad_micro=micro, precio_centavos=int(datos.precio_total * 100))


def bloquear_borrador(db, compra):
    # This write serializes item edits with confirmation and cancellation on both databases.
    changed = db.execute(update(Compra).where(Compra.id == compra.id, Compra.estado == "BORRADOR")
                         .values(fecha_ultima_modificacion=ahora()),
                         execution_options={"synchronize_session": False}).rowcount
    if not changed:
        raise HTTPException(409, "Solo se pueden editar compras en borrador")
    db.expire(compra)
    db.refresh(compra)


def resumen(compra):
    return {"proveedor_id": compra.proveedor_id, "fecha": compra.fecha.isoformat(), "observaciones": compra.observaciones}


def editar_compra(db, compra, datos, usuario_id):
    bloquear_borrador(db, compra)
    if datos.proveedor_id:
        habilitado(db, Proveedor, datos.proveedor_id)
    anterior = resumen(compra)
    for field, value in datos.model_dump().items():
        setattr(compra, field, value)
    registrar_actividad(db, compra, usuario_id, "EDICION", "Datos del borrador actualizados", anterior, resumen(compra))
    guardar(db)
    db.refresh(compra)
    return compra


def agregar_item(db, compra, datos, usuario_id):
    bloquear_borrador(db, compra)
    if len(compra.items) >= 100:
        raise HTTPException(422, "Máximo 100 ítems por compra")
    if any(item.insumo_id == datos.insumo_id for item in compra.items):
        raise HTTPException(409, "Agrupe cada insumo en un único ítem")
    item = construir_item(db, datos)
    compra.items.append(item)
    db.flush()
    registrar_actividad(db, compra, usuario_id, "EDICION", "Ítem agregado", nuevo=ItemResponse.model_validate(item).model_dump(mode="json"))
    guardar(db)
    db.refresh(compra)
    return compra


def buscar_item(compra, item_id):
    item = next((item for item in compra.items if item.id == item_id), None)
    if item is None:
        raise HTTPException(404, "Ítem inexistente en esta compra")
    return item


def editar_item(db, compra, item_id, datos, usuario_id):
    bloquear_borrador(db, compra)
    item = buscar_item(compra, item_id)
    if any(other.id != item_id and other.insumo_id == datos.insumo_id for other in compra.items):
        raise HTTPException(409, "Agrupe cada insumo en un único ítem")
    anterior = ItemResponse.model_validate(item).model_dump(mode="json")
    reemplazo = construir_item(db, datos)
    for column in ItemCompra.__table__.columns:
        if column.name not in {"id", "compra_id"}:
            setattr(item, column.name, getattr(reemplazo, column.name))
    registrar_actividad(db, compra, usuario_id, "EDICION", "Ítem actualizado", anterior,
                       ItemResponse.model_validate(item).model_dump(mode="json"))
    guardar(db)
    db.refresh(compra)
    return compra


def eliminar_item(db, compra, item_id, usuario_id):
    bloquear_borrador(db, compra)
    item = buscar_item(compra, item_id)
    anterior = ItemResponse.model_validate(item).model_dump(mode="json")
    compra.items.remove(item)
    registrar_actividad(db, compra, usuario_id, "EDICION", "Ítem eliminado", anterior=anterior)
    guardar(db)
    db.refresh(compra)
    return compra


def crear_compra(db: Session, datos: CompraCreate, usuario_id: int) -> Compra:
    fingerprint = huella(datos)
    existing = db.query(Compra).filter_by(usuario_id=usuario_id, referencia=datos.referencia).first()
    if existing:
        if existing.huella != fingerprint:
            raise HTTPException(409, "Referencia reutilizada con otros datos")
        return existing
    if datos.proveedor_id:
        habilitado(db, Proveedor, datos.proveedor_id)
    items = [construir_item(db, item) for item in datos.items]
    compra = Compra(**datos.model_dump(exclude={"items"}), usuario_id=usuario_id, huella=fingerprint, items=items)
    db.add(compra)
    try:
        db.flush()
        registrar_actividad(db, compra, usuario_id, "CREACION", "Borrador creado")
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
                         .values(estado="CONFIRMADA", fecha_confirmacion=ahora(), fecha_ultima_modificacion=ahora()),
                         execution_options={"synchronize_session": False}).rowcount
    if not changed:
        db.refresh(compra)
        if compra.estado == "CONFIRMADA":
            return compra
        raise HTTPException(409, "No se puede confirmar una compra anulada")
    # Another worker may have edited items while this request waited for the lock.
    db.expire(compra)
    db.refresh(compra)
    if not compra.items or compra.proveedor_id is None:
        raise HTTPException(422, "La confirmación requiere proveedor y al menos un ítem")
    habilitado(db, Proveedor, compra.proveedor_id)
    for item in sorted(compra.items, key=lambda i: i.insumo_id):
        insumo = habilitado(db, Insumo, item.insumo_id)
        if insumo.controla_vencimiento and item.vencimiento is None:
            raise HTTPException(422, "El insumo requiere fecha de vencimiento")
        habilitado(db, UnidadMedida, item.unidad_compra_id)
        habilitado(db, UnidadMedida, item.unidad_stock_id)
        if item.unidad_contenido_id:
            habilitado(db, UnidadMedida, item.unidad_contenido_id)
        mover_stock(db, item.insumo_id, item.cantidad_micro, usuario_id, "COMPRA",
                    f"compra:{compra.id}:{item.insumo_id}", "Recepción confirmada", compra.id)
    registrar_actividad(db, compra, usuario_id, "CONFIRMACION", "Compra recibida y stock ingresado")
    guardar(db)
    db.refresh(compra)
    return compra


def anular_compra(db: Session, compra: Compra, usuario_id: int, motivo: str) -> Compra:
    changed = db.execute(update(Compra).where(Compra.id == compra.id, Compra.estado.in_(["BORRADOR", "CONFIRMADA"]))
                         .values(estado="ANULADA", motivo_anulacion=motivo, anulada_por_id=usuario_id,
                                 fecha_anulacion=ahora(), fecha_ultima_modificacion=ahora()),
                         execution_options={"synchronize_session": False}).rowcount
    if not changed:
        db.refresh(compra)
        return compra
    db.expire(compra)
    db.refresh(compra)
    # The conditional update may have waited for a concurrent confirmation.
    # Its committed ledger, rather than a previously loaded state, determines the reversal.
    if db.query(MovimientoStock.id).filter_by(compra_id=compra.id, tipo="COMPRA").first():
        for item in sorted(compra.items, key=lambda i: i.insumo_id):
            mover_stock(db, item.insumo_id, -item.cantidad_micro, usuario_id, "ANULACION",
                        f"anulacion:{compra.id}:{item.insumo_id}", motivo, compra.id)
    registrar_actividad(db, compra, usuario_id, "ANULACION", motivo)
    guardar(db)
    db.refresh(compra)
    return compra
