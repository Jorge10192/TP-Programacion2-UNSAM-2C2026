import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeQrSaleInput, validQrDemoIntent, demoQrVisualCells } from '../src/data/demo/qrDemoPolicy.ts'

const item = 'demo-catalog-11111111-1111-4111-8111-111111111111'
const sale = {
  locationId: null, lines: [{ catalogItemId: item, quantityMilli: 1000, unitPriceCents: 123456 }],
  discountCents: 456, notes: '', payments: [{ method: 'MERCADO_PAGO_DECLARADO', amountCents: 123000 }],
}
const intent = {
  id: 'demo-qr-intent-11111111-1111-4111-8111-111111111111',
  requestId: 'demo-qr-request-11111111-1111-4111-8111-111111111111',
  saleRequestId: 'demo-sale-request-11111111-1111-4111-8111-111111111111',
  businessId: 'walos-demo', input: sale, amountCents: 123000,
  status: 'PENDIENTE', saleId: null,
  createdAt: '2026-11-06T14:00:00Z', updatedAt: '2026-11-06T14:00:00Z',
}

test('QR DEMO requiere sólo Mercado Pago declarado conciliado al centavo', () => {
  assert.equal(normalizeQrSaleInput(sale).payments[0].amountCents, 123000)
  assert.throws(() => normalizeQrSaleInput({ ...sale, payments: [
    { method: 'EFECTIVO', amountCents: 123000 },
  ] }), /único medio Mercado Pago/)
  assert.throws(() => normalizeQrSaleInput({ ...sale, payments: [
    { method: 'MERCADO_PAGO_DECLARADO', amountCents: 123001 },
  ] }), /sumar exactamente/)
  assert.throws(() => normalizeQrSaleInput({ ...sale, payments: [
    { method: 'MERCADO_PAGO_DECLARADO', amountCents: 100000 },
    { method: 'EFECTIVO', amountCents: 23000 },
  ] }), /único medio Mercado Pago/)
})

test('intención pendiente se recupera sin venta y rechaza datos adulterados', () => {
  assert.equal(validQrDemoIntent(intent), true)
  assert.equal(validQrDemoIntent({ ...intent, businessId: '' }), false)
  assert.equal(validQrDemoIntent({ ...intent, amountCents: 900000 }), false)
  assert.equal(validQrDemoIntent({ ...intent, saleId: 'demo-sale-11111111-1111-4111-8111-111111111111' }), false)
  assert.equal(validQrDemoIntent({ ...intent, status: 'SIMULADO_APROBADO' }), false)
  assert.equal(validQrDemoIntent({ ...intent, status: 'CANCELADO' }), true)
})

test('aprobación simulada requiere venta asociada y patrón visual no se interpreta como cobro', () => {
  assert.equal(validQrDemoIntent({ ...intent, status: 'SIMULADO_APROBADO',
    saleId: 'demo-sale-11111111-1111-4111-8111-111111111111' }), true)
  const cells = demoQrVisualCells(intent.id)
  assert.ok(cells.length > 100)
  assert.deepEqual(cells, demoQrVisualCells(intent.id))
  assert.notDeepEqual(cells, demoQrVisualCells(intent.id + 'different'))
})
