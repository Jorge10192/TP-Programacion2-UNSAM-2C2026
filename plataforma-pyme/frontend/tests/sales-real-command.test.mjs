import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateSaleTotals, validateSaleCommand, SALE_PAYMENT_METHODS,
} from '../src/features/sales/realSaleCommand.ts'

const site = 'c8397984-6c3e-4393-a7d9-d9b6c14a6111'
const item = '64bd9c38-f6e1-4a27-b880-2b6b27c6fb9f'
const service = '8d59c5d6-2f39-4f1d-8f51-9df83218747d'

function sample() {
  return {
    location_id: site, discount_cents: 30, notes: 'Venta REAL',
    lines: [
      { catalog_item_id: item, quantity_milli: 500, unit_price_cents: 3 },
      { catalog_item_id: service, quantity_milli: 1000, unit_price_cents: 1078 },
    ],
    payments: [
      { method: 'EFECTIVO', amount_cents: 1000, reference: '' },
      { method: 'MERCADO_PAGO_DECLARADO', amount_cents: 50, reference: 'Declarado por vendedor' },
    ],
  }
}

test('T10-A HALF_UP exacto por renglón y total mixto, sin floating point', () => {
  const original = sample()
  const result = validateSaleCommand(original)
  assert.deepEqual(result.totals, {
    line_totals_cents: [2, 1078], subtotal_cents: 1080,
    discount_cents: 30, total_cents: 1050,
  })
  assert.deepEqual(result.body, original)
  assert.notStrictEqual(result.body, original)
  assert.notStrictEqual(result.body.lines, original.lines)
  assert.notStrictEqual(result.body.payments, original.payments)
})

test('T10-A HALF_UP se calcula antes de sumar y es exacto con montos grandes', () => {
  const lines = Array.from({ length: 3 }, (_, i) => ({
    catalog_item_id: i % 2 ? service : item, quantity_milli: 500, unit_price_cents: 1,
  }))
  assert.deepEqual(calculateSaleTotals(lines, 0), {
    line_totals_cents: [1, 1, 1], subtotal_cents: 3,
    discount_cents: 0, total_cents: 3,
  })
  assert.equal(calculateSaleTotals(
    [{ catalog_item_id: item, quantity_milli: 1000, unit_price_cents: 99_999_999_999 }],
    99_999_999_998,
  ).total_cents, 1)
})

test('T10-A notas y referencias normalizadas como backend NFKC sin modificar entrada', () => {
  const row = sample()
  row.notes = '  Servicio\t   Ａ   confirmado  '
  row.payments[1].reference = '  Pago\n \t declarado  '
  const result = validateSaleCommand(row)
  assert.equal(result.body.notes, 'Servicio A confirmado')
  assert.equal(result.body.payments[1].reference, 'Pago declarado')
  assert.equal(row.notes, '  Servicio\t   Ａ   confirmado  ')
})

test('T10-A acepta servicio sin sede, pero no concede permiso de operarlo', () => {
  const row = sample()
  row.location_id = null
  assert.equal(validateSaleCommand(row).body.location_id, null)
  // Determinar quién puede usar null es responsabilidad exclusiva de FastAPI.
})

test('T10-A acepta cinco medios declarados válidos sin acreditar nada', () => {
  const row = sample()
  row.payments = SALE_PAYMENT_METHODS.map((method, i) => ({
    method, amount_cents: i === 0 ? 1046 : 1, reference: '',
  }))
  assert.equal(validateSaleCommand(row).totals.total_cents, 1050)
  assert.equal(SALE_PAYMENT_METHODS.length, 5)
})

test('T10-A rechaza claves extras en venta, renglón y pago antes del journal', () => {
  const bad = [
    { ...sample(), token: 'Bearer secreto' },
    { ...sample(), lines: [{ ...sample().lines[0], price_pesos: 150 }] },
    { ...sample(), payments: [{ ...sample().payments[0], approved: true }] },
  ]
  for (const row of bad) assert.throws(() => validateSaleCommand(row), RangeError)
})

test('T10-A rechaza monedas y cantidades fraccionarias, signos y totales fuera de rango', () => {
  for (const row of [
    { ...sample(), discount_cents: 30.5 },
    { ...sample(), discount_cents: -1 },
    { ...sample(), discount_cents: 1080 },
    { ...sample(), discount_cents: 1090 },
    { ...sample(), lines: [{ ...sample().lines[0], quantity_milli: 0 }] },
    { ...sample(), lines: [{ ...sample().lines[0], quantity_milli: 1.5 }] },
    { ...sample(), lines: [{ ...sample().lines[0], quantity_milli: 1_000_000_000 }] },
    { ...sample(), lines: [{ ...sample().lines[0], unit_price_cents: 100_000_000_000 }] },
    { ...sample(), lines: [{ ...sample().lines[0], unit_price_cents: NaN }] },
    { ...sample(), lines: [{ ...sample().lines[0], unit_price_cents: '20' }] },
    { ...sample(), lines: [{ ...sample().lines[0], unit_price_cents: -1 }] },
    { ...sample(), lines: [{ ...sample().lines[0], unit_price_cents: 0 }] },
  ]) assert.throws(() => validateSaleCommand(row), RangeError)
})

test('T10-A rechaza pagos declarados que no cierran, métodos inválidos y cantidades > 6', () => {
  for (const row of [
    { ...sample(), payments: [{ method: 'EFECTIVO', amount_cents: 1051, reference: '' }] },
    { ...sample(), payments: [{ method: 'MERCADO_PAGO_ACREDITADO', amount_cents: 1050, reference: '' }] },
    { ...sample(), payments: [{ method: 'EFECTIVO', amount_cents: 0, reference: '' }] },
    { ...sample(), payments: [{ method: 'EFECTIVO', amount_cents: 1050.5, reference: '' }] },
    { ...sample(), payments: [] },
    { ...sample(), payments: Array.from({ length: 7 }, () => ({ method: 'EFECTIVO', amount_cents: 150, reference: '' })) },
  ]) assert.throws(() => validateSaleCommand(row), RangeError)
})

test('T10-A límites de renglones y subtotal: 30 máximos y 99.999.999.999 centavos', () => {
  const maxRows = Array.from({ length: 30 }, () => ({
    catalog_item_id: item, quantity_milli: 1000, unit_price_cents: 1,
  }))
  assert.equal(calculateSaleTotals(maxRows, 0).total_cents, 30)
  assert.throws(() => calculateSaleTotals(maxRows.concat(maxRows[0]), 0), RangeError)
  assert.throws(() => calculateSaleTotals([], 0), RangeError)
  assert.throws(() => calculateSaleTotals([
    { catalog_item_id: item, quantity_milli: 2000, unit_price_cents: 99_999_999_999 },
  ], 0), RangeError)
})

test('T10-A no acepta identificación ajena a UUID, texto de control ni campos mal formados', () => {
  for (const row of [
    { ...sample(), location_id: 'DEMO-1' },
    { ...sample(), lines: [{ ...sample().lines[0], catalog_item_id: 'ARTICULO-DEMO' }] },
    { ...sample(), notes: 'a'.repeat(501) },
    { ...sample(), notes: 'Operación\u200boculta' },
    { ...sample(), payments: [{ method: 'EFECTIVO', amount_cents: 1050, reference: 'x'.repeat(121) }] },
    { ...sample(), payments: [{ method: 'EFECTIVO', amount_cents: 1050, reference: '\u202e' }] },
    null,
  ]) assert.throws(() => validateSaleCommand(row), RangeError)
})

test('T10-A valida número íntegro tras 500 milésimas y descuento sin caer en precio flotante', () => {
  const row = sample()
  row.lines = [{ catalog_item_id: item, quantity_milli: 500, unit_price_cents: 3 }]
  row.discount_cents = 1
  row.payments = [{ method: 'TRANSFERENCIA', amount_cents: 1, reference: '' }]
  assert.equal(validateSaleCommand(row).totals.total_cents, 1)
  assert.throws(() => validateSaleCommand({ ...row, discount_cents: 2 }), RangeError)
})
