"""Read-only DTOs. SQL rows are the authority; no stored JSON snapshot."""
from decimal import Decimal
from functools import cached_property

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.auth.models import Usuario
from src.auth.security import ahora
from src.compras.models import CategoriaInsumo, Compra, Insumo, Proveedor, UnidadMedida
from src.inventario.models import Existencia, MovimientoStock
from src.operacion.models import ConteoStock, Gasto, JornadaCaja, Venta
from src.operacion.services import error


def decimal_text(value):
    return format(Decimal(value), '.6f')


def micro_text(value):
    return decimal_text(Decimal(value) / 1_000_000)


def utc(value):
    return value.isoformat(timespec='microseconds') + 'Z' if value is not None else None


def recorded_time(value, source, raw=None):
    return {'creada_en': utc(value), 'fecha_fuente': source,
            'fecha_registrada_sin_zona': raw.isoformat(timespec='microseconds') if raw is not None else None}


def legacy(reasons):
    return {'legacy_readonly': bool(reasons), 'legacy_reasons': sorted(set(reasons))}


class Projection:
    def __init__(self, db, user):
        self.db, self.user = db, user

    def rows(self, model):
        return {row.id: row for row in self.db.scalars(select(model).order_by(model.id)).unique()}

    @cached_property
    def units(self): return self.rows(UnidadMedida)
    @cached_property
    def categories(self): return self.rows(CategoriaInsumo)
    @cached_property
    def catalog(self): return self.rows(Insumo)
    @cached_property
    def providers(self): return self.rows(Proveedor)
    @cached_property
    def purchases(self): return self.rows(Compra)
    @cached_property
    def movements(self): return self.rows(MovimientoStock)
    @cached_property
    def counts(self): return self.rows(ConteoStock)
    @cached_property
    def sales(self): return self.rows(Venta)
    @cached_property
    def expenses(self): return self.rows(Gasto)
    @cached_property
    def sessions(self): return self.rows(JornadaCaja)
    @cached_property
    def stocks(self): return {row.insumo_id: row for row in self.db.scalars(select(Existencia).order_by(Existencia.insumo_id))}

    @cached_property
    def count_lines(self):
        return {line.movimiento_id: (row, line) for row in self.counts.values()
                for line in row.items if line.movimiento_id is not None}

    @cached_property
    def sale_lines(self):
        return {line.id: (row, line) for row in self.sales.values() for line in row.items}

    def context(self):
        admin = self.user.rol == 'administrador'
        return {'businessId': 'walos', 'locationId': 'principal', 'currency': 'ARS',
                'user': {'id': self.user.id, 'nombre': self.user.nombre, 'rol': self.user.rol, 'activo': self.user.activo},
                'business': {'id': 'walos', 'name': 'WALOS', 'source': 'server'},
                'location': {'id': 'principal', 'businessId': 'walos', 'name': 'Principal',
                             'canSell': True, 'canStore': True, 'status': 'ACTIVA'},
                'capabilities': {'purchase': True, 'receipt': True, 'count': admin, 'sale': True,
                    'expense': True, 'cash': admin, 'multiBusiness': False, 'multiLocation': False,
                    'services': False, 'splitPayments': True, 'discounts': True, 'batchCount': admin,
                    'qr': False, 'financialAccounts': False}}

    def unit(self, row):
        return {'id': row.id, 'nombre': row.nombre, 'dimension': row.dimension,
                'factor': decimal_text(row.factor), 'codigo_ui': row.codigo_ui,
                **legacy([] if row.codigo_ui else ['UNIDAD_NO_MAPEADA'])}

    def category(self, row):
        return {'id': row.id, 'nombre': row.nombre, 'activo': row.activo}

    def provider(self, row):
        return {'id': row.id, 'nombre': row.nombre, 'observaciones': row.observaciones,
                'activo': row.activo, 'creada_en': utc(row.fecha_creacion), **legacy([])}

    def catalog_item(self, row):
        unit = self.units[row.unidad_stock_id]
        reasons = [] if unit.codigo_ui else ['UNIDAD_NO_MAPEADA']
        if row.id not in self.stocks:
            reasons.append('STOCK_AUSENTE')
        elif self.stocks[row.id].cantidad_micro % 1000:
            reasons.append('PRECISION_HISTORICA')
        return {'id': row.id, 'nombre': row.nombre, 'tipo': row.tipo, 'sku': row.sku,
                'categoria_id': row.categoria_id, 'categoria_nombre': self.categories[row.categoria_id].nombre,
                'unidad_stock_id': row.unidad_stock_id, 'unidad': self.unit(unit), 'vendible': row.vendible,
                'precio_centavos': row.precio_centavos, 'costo_referencia_centavos': row.costo_referencia_centavos,
                'descripcion': row.descripcion, 'observaciones': row.observaciones, 'activo': row.activo,
                'creada_en': utc(row.creada_en), 'actualizada_en': utc(row.actualizada_en), **legacy(reasons)}

    def receipt(self, row):
        movements = [m for m in self.movements.values() if m.compra_id == row.id and m.tipo == 'COMPRA']
        if not movements:
            return None
        first = min(movements, key=lambda m: m.id)
        items = {line.insumo_id: line for line in row.items}
        if row.fecha_recepcion is not None:
            recorded = recorded_time(row.fecha_recepcion, 'RECEPCION_UTC')
        else:
            recorded = self.movement_time(first)
        return {'id': f'recepcion:{row.id}', 'compra_id': row.id, 'ubicacion_id': 'principal',
                **recorded,
                'actor_id': row.recibida_por_id if row.recibida_por_id is not None else first.usuario_id,
                'movimientos': [{'id': m.id, 'item_compra_id': items[m.insumo_id].id,
                    'insumo_id': m.insumo_id, 'cantidad': micro_text(m.cantidad_micro),
                    'unidad': self.units[items[m.insumo_id].unidad_stock_id].codigo_ui}
                    for m in movements]}

    def purchase(self, row):
        reasons, items = [], []
        for line in sorted(row.items, key=lambda item: item.id):
            buy_unit, stock_unit = self.units[line.unidad_compra_id], self.units[line.unidad_stock_id]
            if line.nombre_snapshot is None:
                reasons.append('SNAPSHOT_HISTORICO_DESCONOCIDO')
            if line.costo_unitario_centavos is None:
                reasons.append('COSTO_UNITARIO_DESCONOCIDO')
            if not buy_unit.codigo_ui or not stock_unit.codigo_ui:
                reasons.append('UNIDAD_NO_MAPEADA')
            if line.unidad_compra_id != line.unidad_stock_id:
                reasons.append('CONVERSION_HISTORICA')
            if line.cantidad_micro % 1000 or (line.cantidad * 1000) != (line.cantidad * 1000).to_integral_value():
                reasons.append('PRECISION_HISTORICA')
            items.append({'id': line.id, 'insumo_id': line.insumo_id,
                'nombre_snapshot': line.nombre_snapshot, 'sku_snapshot': line.sku_snapshot,
                'tipo_snapshot': line.tipo_snapshot, 'cantidad': decimal_text(line.cantidad),
                'unidad_compra': self.unit(buy_unit), 'cantidad_stock': micro_text(line.cantidad_micro),
                'unidad_stock': self.unit(stock_unit), 'costo_unitario_centavos': line.costo_unitario_centavos,
                'total_centavos': line.precio_centavos, 'lote': line.lote,
                'vencimiento': line.vencimiento.isoformat() if line.vencimiento else None})
        return {'id': row.id, 'request_id': row.request_id, 'referencia_comercial': row.referencia_comercial,
                'referencia_legacy': row.referencia, 'proveedor_id': row.proveedor_id,
                'nombre_proveedor_snapshot': row.nombre_proveedor_snapshot, 'fecha': row.fecha.isoformat(),
                'creada_en': utc(row.fecha_creacion), 'observaciones': row.observaciones, 'estado': row.estado,
                'total_centavos': sum(item.precio_centavos for item in row.items), 'items': items,
                'recepcion': self.receipt(row), **legacy(reasons)}

    def stock(self, row):
        item = self.catalog[row.insumo_id]
        unit = self.units[item.unidad_stock_id]
        reasons = [] if unit.codigo_ui else ['UNIDAD_NO_MAPEADA']
        if row.cantidad_micro % 1000:
            reasons.append('PRECISION_HISTORICA')
        return {'insumo_id': row.insumo_id, 'ubicacion_id': 'principal', 'unidad': unit.codigo_ui,
                'unidad_nombre': unit.nombre, 'cantidad': micro_text(row.cantidad_micro),
                'version': row.version, **legacy(reasons)}

    def movement_time(self, row):
        if row.fecha_es_utc:
            return recorded_time(row.fecha, 'MOVIMIENTO_UTC')
        # These immutable event fields were explicitly written in UTC from their
        # introduction. Use only their actual FK relation, never a guessed offset.
        if row.item_venta_id in self.sale_lines:
            sale, _ = self.sale_lines[row.item_venta_id]
            return recorded_time(sale.creada_en, 'VENTA_UTC', row.fecha)
        if row.id in self.count_lines:
            count, _ = self.count_lines[row.id]
            return recorded_time(count.creada_en, 'CONTEO_UTC', row.fecha)
        if row.tipo == 'COMPRA' and row.compra_id in self.purchases:
            purchase = self.purchases[row.compra_id]
            if purchase.fecha_recepcion is not None:
                return recorded_time(purchase.fecha_recepcion, 'RECEPCION_UTC', row.fecha)
        return recorded_time(None, 'LEGACY_SIN_ZONA', row.fecha)

    def movement(self, row):
        item = self.catalog[row.insumo_id]
        unit = self.units[item.unidad_stock_id]
        origin = {'tipo': 'AJUSTE_MANUAL', 'id': row.id}
        name, sku, code = None, None, unit.codigo_ui
        if row.item_venta_id in self.sale_lines:
            sale, line = self.sale_lines[row.item_venta_id]
            origin = {'tipo': 'VENTA', 'id': sale.id}
            name, sku, code = line.nombre_snapshot, line.sku_snapshot, line.unidad_snapshot
        elif row.id in self.count_lines:
            count, line = self.count_lines[row.id]
            origin = {'tipo': 'CONTEO', 'id': count.id}
            name, code = line.nombre_snapshot, line.unidad_snapshot
        elif row.compra_id is not None:
            origin = {'tipo': 'ANULACION' if row.tipo == 'ANULACION' else 'COMPRA', 'id': row.compra_id}
            purchase = self.purchases.get(row.compra_id)
            line = next((line for line in purchase.items if line.insumo_id == item.id), None) if purchase else None
            if line:
                name, sku, code = line.nombre_snapshot, line.sku_snapshot, self.units[line.unidad_stock_id].codigo_ui
        reasons = [] if name is not None else ['SNAPSHOT_HISTORICO_DESCONOCIDO']
        if code is None:
            reasons.append('UNIDAD_NO_MAPEADA')
        if row.cantidad_micro % 1000:
            reasons.append('PRECISION_HISTORICA')
        recorded = self.movement_time(row)
        if recorded['creada_en'] is None:
            reasons.append('FECHA_ZONA_DESCONOCIDA')
        return {'id': row.id, 'tipo': origin['tipo'], 'origen': origin, 'insumo_id': item.id,
                'ubicacion_id': 'principal', 'cantidad': micro_text(row.cantidad_micro), 'unidad': code,
                'unidad_nombre': unit.nombre, 'nombre_snapshot': name, 'nombre_actual': item.nombre,
                'sku_snapshot': sku, 'usuario_id': row.usuario_id, **recorded,
                'motivo': row.motivo, **legacy(reasons)}

    def count(self, row):
        return {'id': row.id, 'request_id': row.request_id, 'ubicacion_id': 'principal',
                'motivo': row.motivo, 'usuario_id': row.usuario_id, 'creada_en': utc(row.creada_en),
                'items': [{'id': item.id, 'insumo_id': item.insumo_id, 'nombre_snapshot': item.nombre_snapshot,
                    'unidad': item.unidad_snapshot, 'cantidad_anterior': micro_text(item.cantidad_anterior_micro),
                    'cantidad_contada': micro_text(item.cantidad_contada_micro),
                    'delta': micro_text(item.cantidad_contada_micro - item.cantidad_anterior_micro),
                    'version_anterior': item.version_anterior, 'version': item.version_resultante,
                    'movimiento_id': item.movimiento_id} for item in row.items]}

    def sale(self, row):
        return {'id': row.id, 'request_id': row.request_id, 'jornada_id': row.jornada_id,
                'ubicacion_id': 'principal', 'usuario_id': row.usuario_id, 'creada_en': utc(row.creada_en),
                'estado': 'REGISTRADA', 'observaciones': row.observaciones,
                'subtotal_centavos': row.subtotal_centavos, 'descuento_centavos': row.descuento_centavos,
                'total_centavos': row.total_centavos,
                'items': [{'id': item.id, 'insumo_id': item.insumo_id, 'cantidad': micro_text(item.cantidad_micro),
                    'unidad': item.unidad_snapshot, 'nombre_snapshot': item.nombre_snapshot,
                    'sku_snapshot': item.sku_snapshot, 'tipo_snapshot': 'BIEN',
                    'precio_unitario_centavos': item.precio_unitario_centavos,
                    'total_centavos': item.total_centavos} for item in row.items],
                'pagos': [{'id': p.id, 'orden': p.orden, 'medio': p.medio, 'importe_centavos': p.importe_centavos,
                    'cuenta_financiera_id': None, 'cuenta_nombre_snapshot': None} for p in row.pagos]}

    def expense(self, row):
        return {'id': row.id, 'request_id': row.request_id, 'jornada_id': row.jornada_id,
                'ubicacion_id': 'principal', 'usuario_id': row.usuario_id, 'fecha': row.fecha.isoformat(),
                'creada_en': utc(row.creada_en), 'categoria': row.categoria, 'concepto': row.concepto,
                'importe_centavos': row.importe_centavos, 'medio': row.medio, 'observaciones': row.observaciones,
                'cuenta_financiera_id': None, 'cuenta_nombre_snapshot': None}

    @cached_property
    def cash_by_session(self):
        result = {sid: {'ventas_efectivo_centavos': 0, 'gastos_efectivo_centavos': 0,
                        'esperado_centavos': row.fondo_centavos, 'venta_ids': [], 'gasto_ids': []}
                  for sid, row in self.sessions.items()}
        for sale in self.sales.values():
            amount = sum(p.importe_centavos for p in sale.pagos if p.medio == 'EFECTIVO')
            target = result[sale.jornada_id]
            target['ventas_efectivo_centavos'] += amount
            target['esperado_centavos'] += amount
            if amount:
                target['venta_ids'].append(sale.id)
        for expense in self.expenses.values():
            if expense.medio != 'EFECTIVO':
                continue
            target = result[expense.jornada_id]
            target['gastos_efectivo_centavos'] += expense.importe_centavos
            target['esperado_centavos'] -= expense.importe_centavos
            target['gasto_ids'].append(expense.id)
        return result

    def cash_session(self, row):
        totals = dict(self.cash_by_session[row.id])
        closed = None
        if row.estado == 'CERRADA':
            totals.update(ventas_efectivo_centavos=row.ventas_efectivo_centavos,
                          gastos_efectivo_centavos=row.gastos_efectivo_centavos,
                          esperado_centavos=row.esperado_centavos)
            closed = {**totals, 'fondo_centavos': row.fondo_centavos, 'contado_centavos': row.contado_centavos,
                      'diferencia_centavos': row.diferencia_centavos, 'cerrada_por_id': row.cerrada_por_id,
                      'cerrada_en': utc(row.cerrada_en), 'motivo': row.motivo}
        return {'id': row.id, 'request_id': row.request_id, 'close_request_id': row.close_request_id,
                'ubicacion_id': 'principal', 'estado': row.estado, 'version': row.version,
                'fondo_centavos': row.fondo_centavos, 'abierta_por_id': row.abierta_por_id,
                'abierta_en': utc(row.abierta_en), 'totales': totals, 'cierre': closed}

    def snapshot(self):
        return {'schema_version': 1, 'as_of': utc(ahora()), 'complete': True, 'contexto': self.context(),
                'unidades': [self.unit(row) for row in self.units.values()],
                'categorias': [self.category(row) for row in self.categories.values()],
                'catalogo': [self.catalog_item(row) for row in self.catalog.values()],
                'proveedores': [self.provider(row) for row in self.providers.values()],
                'compras': [self.purchase(row) for row in self.purchases.values()],
                'stock': [self.stock(row) for row in self.stocks.values()],
                'movimientos': [self.movement(row) for row in self.movements.values()],
                'conteos': [self.count(row) for row in self.counts.values()],
                'ventas': [self.sale(row) for row in self.sales.values()],
                'gastos': [self.expense(row) for row in self.expenses.values()],
                'jornadas': [self.cash_session(row) for row in self.sessions.values()]}


def consistent_snapshot(db, user_id):
    bind = db.get_bind()
    engine = bind.engine if hasattr(bind, 'engine') else bind
    with engine.connect() as connection:
        if connection.dialect.name == 'postgresql':
            connection = connection.execution_options(isolation_level='REPEATABLE READ')
        elif connection.dialect.name == 'sqlite':
            connection.exec_driver_sql('BEGIN')
        with Session(bind=connection, autoflush=False) as read:
            user = read.get(Usuario, user_id)
            if user is None or not user.activo:
                error(401, 'SESION_INVALIDA', 'Sesión inválida o vencida')
            return Projection(read, user).snapshot()
