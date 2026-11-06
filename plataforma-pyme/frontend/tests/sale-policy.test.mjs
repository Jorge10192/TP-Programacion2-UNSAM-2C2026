import test from 'node:test'
import assert from 'node:assert/strict'
import { saleAmounts, normalizeSaleInput, validateSalePayments, validSaleQuantity } from '../src/data/demo/salePolicy.ts'
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
