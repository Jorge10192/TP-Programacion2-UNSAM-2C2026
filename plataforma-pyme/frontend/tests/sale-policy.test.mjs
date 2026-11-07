import test from 'node:test'
import assert from 'node:assert/strict'
import { saleAmounts, normalizeSaleInput, saleInventoryMovements, validateSalePayments, validSaleQuantity, remainingLastSalePaymentCents } from '../src/data/demo/salePolicy.ts'
import { lineTotalCents } from '../src/data/demo/purchasePolicy.ts'
import { requireTransferStock } from '../src/data/demo/inventoryPolicy.ts'

const goodId = 'demo-catalog-11111111-1111-4111-8111-111111111111'
const locationId = 'demo-location-11111111-1111-4111-8111-111111111111'
const payment = (method, amountCents) => ({ method, amountCents })
const line = (quantityMilli, unitPriceCents = 125050) =>
  ({ catalogItemId: goodId, quantityMilli, unitPriceCents })

test('subtotal y descuento: centavos enteros sin floats', () => {
  const amounts = saleAmounts([line(2000)], 50_000)
  assert.equal(amounts.subtotalCents, 250100)
  assert.equal(amounts.discountCents, 50000)
  assert.equal(amounts.totalCents, 200100)
})

test('dos medios concilian exactamente al centavo', () => {
  assert.doesNotThrow(() => validateSalePayments([
    payment('EFECTIVO', 100001), payment('TRANSFERENCIA', 100099),
  ], 200100))
  assert.throws(() => validateSalePayments([
    payment('EFECTIVO', 100000), payment('TRANSFERENCIA', 100099),
  ], 200100), /sumar exactamente/)
  assert.throws(() => validateSalePayments([
    payment('EFECTIVO', 100001), payment('TRANSFERENCIA', 100100),
  ], 200100), /sumar exactamente/)
})

test('un pago digital es declarado, no una acreditación confirmada', () => {
  const result = normalizeSaleInput({
    locationId: null, lines: [line(1000)], discountCents: 0,
    payments: [payment('MERCADO_PAGO_DECLARADO', 125050)], notes: 'Servicio DEMO',
  })
  assert.equal(result.payments[0].method, 'MERCADO_PAGO_DECLARADO')
  assert.equal(result.locationId, null)
})

test('el descuento nunca puede igualar o superar el subtotal', () => {
  assert.throws(() => saleAmounts([line(1000)], 125050), /descuento/)
  assert.throws(() => saleAmounts([line(1000)], 125051), /descuento/)
  assert.throws(() => saleAmounts([line(1000)], -1), /descuento/)
})

test('las cantidades discretas no aceptan fracciones', () => {
  assert.doesNotThrow(() => validSaleQuantity(2000, 'UNIDAD'))
  assert.throws(() => validSaleQuantity(500, 'CAJA'), /Cantidad inválida/)
  assert.throws(() => validSaleQuantity(-1000, 'UNIDAD'), /Cantidad inválida/)
  assert.doesNotThrow(() => validSaleQuantity(250, 'KILOGRAMO'))
})

test('stock insuficiente impide una salida', () => {
  assert.doesNotThrow(() => requireTransferStock(3000, 2000, 'UNIDAD'))
  assert.throws(() => requireTransferStock(1000, 2000, 'UNIDAD'), /insuficiente/)
})

test('entrada de venta valida pago, precio y cantidad sin separadores inconsistentes', () => {
  const normalized = normalizeSaleInput({
    locationId, lines: [line(2000)], discountCents: 100,
    payments: [payment('EFECTIVO', 250000)], notes: 'Venta de prueba',
  })
  assert.equal(normalized.lines.length, 1)
  assert.equal(normalized.locationId, locationId)
  assert.equal(normalized.discountCents, 100)
  assert.throws(() => normalizeSaleInput({
    locationId, lines: [line(2000)], discountCents: 100,
    payments: [payment('EFECTIVO', 250000), payment('TARJETA', 100)], notes: '',
  }), /sumar exactamente/)
})

test('el importe por cantidad medida se redondea HALF_UP al centavo', () => {
  assert.equal(lineTotalCents(1250, 101), 126)
  assert.equal(lineTotalCents(250, 101), 25)
})

test('no admite nombres o importes arbitrarios en pagos', () => {
  assert.throws(() => validateSalePayments([payment('CRYPTO', 100)], 100), /inválido/)
  assert.throws(() => validateSalePayments([payment('EFECTIVO', 0)], 100), /inválido/)
  assert.throws(() => validateSalePayments([], 100), /entre 1 y 6/)
})

test('no admite una venta sin renglones ni una total cero', () => {
  assert.throws(() => saleAmounts([], 0), /renglones/)
  assert.throws(() => saleAmounts([line(1000, 0)], 0), /total mayor a cero/)
})

test('una venta mixta genera exactamente una salida por producto físico', () => {
  const sale = {
    id: 'demo-sale-11111111-1111-4111-8111-111111111111',
    businessId: 'walos-demo',
    locationId, createdAt: '2026-11-06T16:00:00.000Z',
    lines: [
      { id: 'demo-sale-line-11111111-1111-4111-8111-111111111111', catalogItemId: goodId,
        name: 'Shampoo', sku: 'SHA-001', unit: 'UNIDAD', kind: 'BIEN',
        quantityMilli: 2000, unitPriceCents: 125050, lineTotalCents: 250100 },
      { id: 'demo-sale-line-22222222-2222-4222-8222-222222222222',
        catalogItemId: 'demo-catalog-22222222-2222-4222-8222-222222222222',
        name: 'Corte', sku: 'CORTE-1', unit: 'SERVICIO', kind: 'SERVICIO',
        quantityMilli: 1000, unitPriceCents: 100000, lineTotalCents: 100000 },
    ],
  }
  const events = saleInventoryMovements(sale)
  assert.equal(events.length, 1)
  assert.equal(events[0].deltaMilli, -2000)
  assert.equal(events[0].type, 'VENTA_SALIDA')
  assert.equal(events[0].locationId, locationId)
  assert.equal(events[0].operationId, sale.id)
  assert.deepEqual(saleInventoryMovements(sale), events)
})

test('venta de servicios sin ubicación no crea salidas de inventario', () => {
  const events = saleInventoryMovements({
    id: 'demo-sale-service', businessId: 'servicios-demo', locationId: null,
    createdAt: '2026-11-06T18:00:00.000Z',
    lines: [{ id: 'demo-sale-line-service', catalogItemId: goodId, name: 'Asesoría',
      sku: '', unit: 'SERVICIO', kind: 'SERVICIO', quantityMilli: 1000,
      unitPriceCents: 100000, lineTotalCents: 100000 }],
  })
  assert.equal(events.length, 0)
})

test('cuenta opcional por pago se valida sin modificar el total de venta', () => {
  const input = { locationId: null, lines: [line(1000)], discountCents: 0,
    payments: [{ method: 'TRANSFERENCIA', amountCents: 125050, financialAccountId: 'demo-financial-account-11111111-1111-4111-8111-111111111111' }], notes: '' }
  const normalized = normalizeSaleInput(input)
  assert.equal(normalized.payments[0].financialAccountId, 'demo-financial-account-11111111-1111-4111-8111-111111111111')
  assert.throws(() => normalizeSaleInput({ ...input, payments: [
    { method: 'TRANSFERENCIA', amountCents: 125050, financialAccountId: 'otro-negocio' },
  ] }), /cuenta DEMO válida/)
  assert.equal(normalizeSaleInput({ ...input, payments: [
    { method: 'TRANSFERENCIA', amountCents: 125050 },
  ] }).payments[0].financialAccountId, null)
})

test('completar saldo apunta al último medio y conserva importes previos', () => {
  const payments = [85000, 200000, null]
  assert.equal(remainingLastSalePaymentCents(385000, payments), 100000)
  assert.deepEqual(payments, [85000, 200000, null])
  assert.equal(remainingLastSalePaymentCents(380000, [null]), 380000)
  assert.throws(() => remainingLastSalePaymentCents(100000, [null, null]), /Completá primero/)
  assert.throws(() => remainingLastSalePaymentCents(100000, [100000, null]), /cubren o superan/)
})
