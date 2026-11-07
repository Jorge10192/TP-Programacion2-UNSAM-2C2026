import { emptySnapshot } from '../models.ts'
import type { Snapshot, LegacyRecord, CatalogItem, Supplier, Purchase, Sale } from '../models.ts'
import type { PurchaseReceipt } from '../demo/purchasePolicy.ts'
import type { CatalogUnit, CatalogKind } from '../demo/catalogPolicy.ts'
import { catalogUnitLabels } from '../demo/catalogPolicy.ts'
import type { InventoryMovement, InventoryOperation, InventoryMovementType } from '../demo/inventoryPolicy.ts'
import { stockKey } from '../demo/inventoryPolicy.ts'
import type { CashSession, CashCloseSnapshot, Expense } from '../demo/cashPolicy.ts'
import type { SalePaymentMethod } from '../demo/salePolicy.ts'
import type { SessionUser } from './session.ts'
import { GatewayError } from './httpClient.ts'

export type Row = Record<string, unknown>
class ReadonlyHistory extends Error {}
export function object(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new GatewayError('server', 'La respuesta del servidor está incompleta.')
  return value as Row
}
export function text(value: unknown): string {
  if (typeof value !== 'string') throw new GatewayError('server', 'Falta un texto requerido del servidor.')
  return value
}
export function integer(value: unknown): number {
  if (!Number.isSafeInteger(value)) throw new GatewayError('server', 'El servidor devolvió un entero inválido.')
  return value as number
}
export function id(prefix: string, value: unknown): string {
  const number = integer(value)
  if (number <= 0) throw new GatewayError('server', 'El servidor devolvió un identificador inválido.')
  return prefix + ':' + number
}
export function list(value: unknown): Row[] {
  if (!Array.isArray(value)) throw new GatewayError('server', 'El snapshot no contiene todas sus listas.')
  return value.map(object)
}
function flag(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new GatewayError('server', 'Falta un estado requerido del servidor.')
  return value
}
function enumeration<T extends string>(value: unknown, choices: readonly T[]): T {
  if (typeof value !== 'string' || !choices.includes(value as T)) throw new GatewayError('server', 'El servidor devolvió un estado no reconocido.')
  return value as T
}
function cents(value: unknown): number {
  const result = integer(value)
  if (Math.abs(result) > 99_999_999_999) throw new GatewayError('server', 'Importe fuera del rango de la interfaz.')
  return result
}
function recorded(value: unknown, label: string): string {
  if (value === null) throw new ReadonlyHistory(label + ' no registrada en el histórico.')
  const result = text(value)
  if (!Number.isFinite(Date.parse(result))) throw new GatewayError('server', label + ' inválida.')
  return result
}
function knownText(value: unknown, label: string): string {
  if (value === null) throw new ReadonlyHistory(label + ' no conservado en el histórico.')
  return text(value)
}
export function quantityMilli(value: unknown): number {
  const decimal = text(value)
  if (!/^-?\d+\.\d{6}$/.test(decimal)) throw new GatewayError('server', 'La cantidad debe conservar seis decimales exactos.')
  const micro = BigInt(decimal.replace('.', ''))
  if (micro % 1000n !== 0n) throw new ReadonlyHistory('Cantidad con precisión histórica superior a milésimas; se conserva el texto original.')
  const milli = Number(micro / 1000n)
  if (!Number.isSafeInteger(milli)) throw new ReadonlyHistory('Cantidad fuera del rango exacto de esta interfaz.')
  return milli
}
export function unitCode(value: unknown): CatalogUnit {
  if (typeof value !== 'string' || value === 'SERVICIO' || !Object.hasOwn(catalogUnitLabels, value)) throw new ReadonlyHistory('Unidad sin homologación para el piloto.')
  return value as CatalogUnit
}
function historical(row: Row) {
  if (row.legacy_readonly === true) throw new ReadonlyHistory(Array.isArray(row.legacy_reasons) ? row.legacy_reasons.map(text).join(' ') : 'Registro histórico sólo lectura.')
}
function rawUnit(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') { const row = object(value); return typeof row.codigo_ui === 'string' ? row.codigo_ui : typeof row.nombre === 'string' ? row.nombre : 'Unidad no informada' }
  return 'Unidad no informada'
}
function readonlyRecord(kind: string, row: Row, reason: string): LegacyRecord {
  const label = [row.nombre, row.referencia_comercial, row.nombre_snapshot].find((value) => typeof value === 'string')
  const fields: LegacyRecord['fields'] = []
  if (typeof row.fecha_registrada_sin_zona === 'string') fields.push({ label: 'Fecha original (zona horaria no registrada)', value: row.fecha_registrada_sin_zona })
  if (typeof row.cantidad === 'string') fields.push({ label: 'Cantidad original', value: row.cantidad + ' ' + rawUnit(row.unidad ?? row.unidad_nombre) })
  if (Array.isArray(row.items)) row.items.forEach((value, index) => {
    const line = object(value)
    const name = typeof line.nombre_snapshot === 'string' ? line.nombre_snapshot : 'Nombre histórico no informado'
    fields.push({ label: 'Renglón ' + (index + 1), value: name })
    if (typeof line.cantidad === 'string') fields.push({ label: 'Cantidad comprada', value: line.cantidad + ' ' + rawUnit(line.unidad_compra ?? line.unidad) })
    if (typeof line.cantidad_stock === 'string') fields.push({ label: 'Cantidad incorporada', value: line.cantidad_stock + ' ' + rawUnit(line.unidad_stock) })
    if (line.costo_unitario_centavos === null) fields.push({ label: 'Costo unitario', value: 'No registrado en el histórico' })
    if (Number.isSafeInteger(line.total_centavos)) fields.push({ label: 'Total original ARS', value: (Number(line.total_centavos) / 100).toLocaleString('es-AR', { minimumFractionDigits: 2 }) })
  })
  return { id: kind + ':' + integer(row.id ?? row.insumo_id), kind, label: typeof label === 'string' ? label : kind + ' #' + (row.id ?? row.insumo_id), reasons: [reason.replaceAll('FECHA_ZONA_DESCONOCIDA', 'Zona horaria no registrada.')], fields }
}

export function mapReceipt(value: unknown): PurchaseReceipt {
  const row = object(value)
  const receiptId = text(row.id)
  if (!/^recepcion:\d+$/.test(receiptId)) throw new GatewayError('server', 'Identidad de recepción inválida.')
  return { id: receiptId, locationId: text(row.ubicacion_id), createdAt: recorded(row.creada_en, 'Fecha de recepción'),
    movements: list(row.movimientos).map((movement) => ({ id: id('movimiento', movement.id), purchaseLineId: id('item-compra', movement.item_compra_id),
      catalogItemId: id('insumo', movement.insumo_id), unit: unitCode(movement.unidad), quantityMilli: quantityMilli(movement.cantidad) })) }
}
export function mapPurchase(value: unknown): Purchase {
  const row = object(value)
  historical(row)
  return { id: id('compra', row.id), requestId: row.request_id === null ? '' : text(row.request_id), businessId: 'walos',
    supplierId: id('proveedor', row.proveedor_id), supplierNameSnapshot: knownText(row.nombre_proveedor_snapshot, 'Nombre del proveedor'),
    purchasedOn: text(row.fecha), reference: text(row.referencia_comercial ?? row.referencia_legacy), notes: text(row.observaciones),
    totalCents: cents(row.total_centavos), createdAt: recorded(row.creada_en, 'Fecha de compra'),
    serverStatus: enumeration<'BORRADOR' | 'CONFIRMADA' | 'ANULADA'>(row.estado, ['BORRADOR', 'CONFIRMADA', 'ANULADA']),
    receipt: row.recepcion === null ? null : mapReceipt(row.recepcion),
    lines: list(row.items).map((line) => {
      const bought = object(line.unidad_compra), stock = object(line.unidad_stock)
      if (bought.id !== stock.id) throw new ReadonlyHistory('Compra histórica con conversión: cantidades comprada e incorporada se muestran por separado.')
      if (line.costo_unitario_centavos === null) throw new ReadonlyHistory('Costo unitario histórico no registrado; no se reconstruye por división.')
      return { id: id('item-compra', line.id), catalogItemId: id('insumo', line.insumo_id), kind: enumeration(line.tipo_snapshot, ['BIEN']),
        description: knownText(line.nombre_snapshot, 'Nombre del artículo'), sku: line.sku_snapshot === null ? '' : text(line.sku_snapshot),
        unit: unitCode(bought.codigo_ui), quantityMilli: quantityMilli(line.cantidad), unitCostCents: cents(line.costo_unitario_centavos), totalCents: cents(line.total_centavos) }
    }) }
}
export function mapSale(value: unknown): Sale {
  const row = object(value)
  historical(row)
  return { id: id('venta', row.id), requestId: text(row.request_id), businessId: 'walos', locationId: text(row.ubicacion_id),
    cashSessionId: id('jornada', row.jornada_id), status: enumeration(row.estado, ['REGISTRADA']), notes: text(row.observaciones),
    createdAt: recorded(row.creada_en, 'Fecha de venta'), subtotalCents: cents(row.subtotal_centavos), discountCents: cents(row.descuento_centavos), totalCents: cents(row.total_centavos),
    lines: list(row.items).map((line) => ({ id: id('item-venta', line.id), catalogItemId: id('insumo', line.insumo_id),
      name: knownText(line.nombre_snapshot, 'Nombre del artículo'), sku: line.sku_snapshot === null ? '' : text(line.sku_snapshot),
      unit: unitCode(line.unidad), kind: enumeration(line.tipo_snapshot, ['BIEN']), quantityMilli: quantityMilli(line.cantidad),
      unitPriceCents: cents(line.precio_unitario_centavos), lineTotalCents: cents(line.total_centavos) })),
    payments: list(row.pagos).map((payment) => ({ method: enumeration<SalePaymentMethod>(payment.medio, ['EFECTIVO', 'TRANSFERENCIA', 'CUENTA_DNI', 'TARJETA', 'MERCADO_PAGO_DECLARADO']), amountCents: cents(payment.importe_centavos), financialAccountId: null })) }
}
export function mapExpense(value: unknown): Expense {
  const row = object(value)
  return { id: id('gasto', row.id), requestId: text(row.request_id), businessId: 'walos', locationId: text(row.ubicacion_id),
    cashSessionId: id('jornada', row.jornada_id), paidOn: text(row.fecha), createdAt: recorded(row.creada_en, 'Fecha del gasto'),
    category: enumeration(row.categoria, ['ALQUILER', 'INSUMOS', 'TRANSPORTE', 'PERSONAL', 'IMPUESTOS', 'MANTENIMIENTO', 'OTROS']),
    description: text(row.concepto), amountCents: cents(row.importe_centavos),
    paymentMethod: enumeration(row.medio, ['EFECTIVO', 'TRANSFERENCIA', 'CUENTA_DNI', 'TARJETA', 'MERCADO_PAGO_DECLARADO', 'OTRO_DECLARADO']),
    financialAccountId: null, notes: text(row.observaciones) }
}
export function mapCashSession(value: unknown): CashSession {
  const row = object(value), totals = object(row.totales)
  const close = row.cierre === null ? null : object(row.cierre)
  const ids = (values: unknown, prefix: string) => { if (!Array.isArray(values)) throw new GatewayError('server', 'Faltan documentos del arqueo.'); return values.map((value) => id(prefix, value)) }
  const closeSnapshot: CashCloseSnapshot | null = close ? {
    openingCashCents: cents(close.fondo_centavos), cashSalesCents: cents(close.ventas_efectivo_centavos), cashExpensesCents: cents(close.gastos_efectivo_centavos),
    expectedCashCents: cents(close.esperado_centavos), countedCashCents: cents(close.contado_centavos), differenceCents: cents(close.diferencia_centavos),
    saleIds: ids(close.venta_ids, 'venta'), expenseIds: ids(close.gasto_ids, 'gasto'),
    closedBy: id('user', close.cerrada_por_id), closedAt: recorded(close.cerrada_en, 'Fecha de cierre'), notes: text(close.motivo),
  } : null
  return { id: id('jornada', row.id), businessId: 'walos', locationId: text(row.ubicacion_id), openRequestId: text(row.request_id),
    closeRequestId: row.close_request_id === null ? null : text(row.close_request_id), status: enumeration(row.estado, ['ABIERTA', 'CERRADA']),
    openedBy: id('user', row.abierta_por_id), openedAt: recorded(row.abierta_en, 'Fecha de apertura'), openingCashCents: cents(row.fondo_centavos), closeSnapshot,
    serverTotals: { openingCashCents: cents(row.fondo_centavos), cashSalesCents: cents(totals.ventas_efectivo_centavos), cashExpensesCents: cents(totals.gastos_efectivo_centavos),
      expectedCashCents: cents(totals.esperado_centavos), saleIds: ids(totals.venta_ids, 'venta'), expenseIds: ids(totals.gasto_ids, 'gasto') } }
}
export function mapCount(value: unknown): InventoryOperation {
  const row = object(value)
  return { id: id('conteo', row.id), requestId: text(row.request_id), businessId: 'walos', kind: 'BATCH_COUNT', locationId: text(row.ubicacion_id),
    createdAt: recorded(row.creada_en, 'Fecha de conteo'), reason: text(row.motivo),
    lines: list(row.items).map((line) => ({ catalogItemId: id('insumo', line.insumo_id), itemNameSnapshot: knownText(line.nombre_snapshot, 'Nombre del artículo'),
      unit: unitCode(line.unidad), expectedMilli: quantityMilli(line.cantidad_anterior), countedMilli: quantityMilli(line.cantidad_contada), deltaMilli: quantityMilli(line.delta) })) }
}

export function mapSnapshot(value: unknown, user: SessionUser): Snapshot {
  const raw = object(value), context = object(raw.contexto), identity = object(context.user)
  if (raw.schema_version !== 1 || raw.complete !== true || context.businessId !== 'walos' || context.locationId !== 'principal' || context.currency !== 'ARS'
    || id('user', identity.id) !== user.id) throw new GatewayError('server', 'El snapshot no es completo o no corresponde a la sesión y contexto WALOS.')
  const arrays = Object.fromEntries(['unidades', 'categorias', 'catalogo', 'proveedores', 'compras', 'stock', 'movimientos', 'conteos', 'ventas', 'gastos', 'jornadas'].map((key) => [key, list(raw[key])]))
  const business = object(context.business), location = object(context.location)
  const snapshot: Snapshot = { ...emptySnapshot, mode: 'api',
    profile: { id: user.id, displayName: user.name, avatarInitials: '', email: '', contactPhone: '' },
    businessesById: { walos: { id: 'walos', name: text(business.name), category: '', kind: 'PRODUCTOS', description: '', slogan: '', taxId: '', initials: text(business.name).slice(0, 1),
      accent: 'blue', source: 'server', founderUserId: null, administrativeOwnerUserId: null } },
    locationsById: { principal: { id: 'principal', businessId: 'walos', name: text(location.name), kind: 'OTRO', address: '', mapUrl: '', canSell: flag(location.canSell), canStore: flag(location.canStore), isPrimary: true, status: enumeration(location.status, ['ACTIVA', 'PAUSADA']) } },
    catalogItemsById: {}, suppliersById: {}, purchasesById: {}, salesById: {}, expensesById: {}, cashSessionsById: {}, inventoryOperationsById: {},
    apiStockBalances: {}, apiStockVersions: {}, apiInventoryMovements: [], apiUnitIds: {}, apiCategoryIds: {}, apiCashVersions: {}, apiLegacyRecords: [],
    apiAsOf: recorded(raw.as_of, 'Fecha de actualización'), apiSourceCounts: Object.fromEntries(Object.entries(arrays).map(([key, rows]) => [key, rows.length])),
    apiCapabilities: Object.fromEntries(Object.entries(object(context.capabilities)).map(([key, enabled]) => [key, flag(enabled)])),
  }
  function readRows(kind: string, rows: Row[], apply: (row: Row) => void) {
    for (const row of rows) {
      try { apply(row) } catch (error) {
        if (!(error instanceof ReadonlyHistory)) throw error
        snapshot.apiLegacyRecords!.push(readonlyRecord(kind, row, error.message))
      }
    }
  }
  arrays.unidades.forEach((row) => { if (typeof row.codigo_ui === 'string') snapshot.apiUnitIds![row.codigo_ui] = integer(row.id) })
  arrays.categorias.forEach((row) => { if (row.activo === true) snapshot.apiCategoryIds![text(row.nombre)] = integer(row.id) })
  readRows('Catálogo', arrays.catalogo, (row) => {
    historical(row)
    const item: CatalogItem = { id: id('insumo', row.id), businessId: 'walos', name: text(row.nombre),
      kind: enumeration<CatalogKind>(row.tipo, ['INSUMO', 'ELABORADO', 'REVENTA']), sku: row.sku === null ? '' : text(row.sku), category: text(row.categoria_nombre),
      unit: unitCode(object(row.unidad).codigo_ui), sellable: flag(row.vendible), status: flag(row.activo) ? 'ACTIVO' : 'INACTIVO',
      priceCents: row.precio_centavos === null ? null : cents(row.precio_centavos), referenceCostCents: row.costo_referencia_centavos === null ? null : cents(row.costo_referencia_centavos),
      description: text(row.descripcion), observations: text(row.observaciones), createdAt: recorded(row.creada_en, 'Fecha del artículo'), updatedAt: recorded(row.actualizada_en, 'Actualización del artículo') }
    snapshot.catalogItemsById[item.id] = item
  })
  readRows('Proveedor', arrays.proveedores, (row) => {
    const supplier: Supplier = { id: id('proveedor', row.id), businessId: 'walos', name: text(row.nombre), status: flag(row.activo) ? 'ACTIVO' : 'INACTIVO',
      notes: row.observaciones === null ? '' : text(row.observaciones), createdAt: recorded(row.creada_en, 'Fecha del proveedor'), updatedAt: null,
      offerings: '', contactPerson: '', phone: '', whatsapp: '', email: '', address: '', mapsUrl: '', website: '', instagram: '', paymentMethods: [], promotions: [] }
    snapshot.suppliersById[supplier.id] = supplier
  })
  readRows('Compra', arrays.compras, row => { const item = mapPurchase(row); snapshot.purchasesById[item.id] = item })
  readRows('Venta', arrays.ventas, row => { const item = mapSale(row); snapshot.salesById[item.id] = item })
  readRows('Gasto', arrays.gastos, row => { const item = mapExpense(row); snapshot.expensesById[item.id] = item })
  readRows('Caja', arrays.jornadas, row => { const item = mapCashSession(row); snapshot.cashSessionsById[item.id] = item; snapshot.apiCashVersions![item.id] = integer(row.version) })
  readRows('Conteo', arrays.conteos, row => { const item = mapCount(row); snapshot.inventoryOperationsById[item.id] = item })
  readRows('Stock', arrays.stock, row => {
    const itemId = id('insumo', row.insumo_id), key = stockKey(text(row.ubicacion_id), itemId)
    snapshot.apiStockVersions![itemId] = integer(row.version)
    try { historical(row); unitCode(row.unidad); snapshot.apiStockBalances![key] = quantityMilli(row.cantidad) }
    catch (error) { if (error instanceof ReadonlyHistory && snapshot.catalogItemsById[itemId]) snapshot.catalogItemsById[itemId].readonlyReason = error.message; throw error }
  })
  const movementTypes: Record<string, InventoryMovementType> = { COMPRA: 'RECEPCION_COMPRA', VENTA: 'VENTA_SALIDA', CONTEO: 'AJUSTE_CONTEO', AJUSTE_MANUAL: 'AJUSTE_MANUAL', ANULACION: 'ANULACION_COMPRA' }
  readRows('Movimiento', arrays.movimientos, row => {
    historical(row)
    const origin = object(row.origen), source = text(origin.tipo), type = movementTypes[text(row.tipo)]
    if (!type) throw new ReadonlyHistory('Tipo de movimiento histórico no disponible para edición.')
    const itemId = id('insumo', row.insumo_id)
    const movement: InventoryMovement = { id: id('movimiento', row.id), businessId: 'walos', catalogItemId: itemId, locationId: text(row.ubicacion_id),
      operationId: id(source === 'CONTEO' ? 'conteo' : source === 'VENTA' ? 'venta' : source === 'COMPRA' ? 'compra' : 'movimiento', origin.id),
      itemNameSnapshot: typeof row.nombre_snapshot === 'string' ? row.nombre_snapshot : snapshot.catalogItemsById[itemId]?.name ?? 'Nombre histórico no informado',
      unit: unitCode(row.unidad), deltaMilli: quantityMilli(row.cantidad), type, createdAt: recorded(row.creada_en, 'Fecha de movimiento'), reason: text(row.motivo), reference: '' }
    snapshot.apiInventoryMovements!.push(movement)
  })
  return snapshot
}
