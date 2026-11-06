import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseQuantityMilli, lineTotalCents, sumLineTotals, normalizePurchaseInput,
  validPurchaseDate, physicalPurchaseLines, quantityText,
} from '../src/data/demo/purchasePolicy.ts'

const base = {
  purchasedOn: '2026-11-06',
  supplierId: null,
  reference: ' FACT-A-001 ',
  notes: '',
  lines: [{
    catalogItemId: null,
    description: ' Material libre ',
    unit: 'CONCEPTO',
    quantityMilli: 2000,
    unitCostCents: 125050,
  }],
}

test('cantidades enteras para unidad, caja, paquete y concepto', () => {
  for (const unit of ['UNIDAD', 'CAJA', 'PAQUETE', 'SERVICIO', 'CONCEPTO']) {
    assert.equal(parseQuantityMilli('12', unit), 12000)
    assert.throws(() => parseQuantityMilli('0,5', unit))
  }
  for (const invalid of ['0', '-1', '1.234,5', '2,1234', '1e5', 'abc']) {
    assert.throws(() => parseQuantityMilli(invalid, 'UNIDAD'), invalid)
  }
})

test('cantidades fraccionarias precisas de unidades medidas', () => {
  assert.equal(parseQuantityMilli('0,125', 'KILOGRAMO'), 125)
  assert.equal(parseQuantityMilli('1.5', 'LITRO'), 1500)
  assert.equal(parseQuantityMilli('0,001', 'GRAMO'), 1)
  assert.equal(quantityText(1500, 'KILOGRAMO').includes('1,5'), true)
  assert.throws(() => parseQuantityMilli('0,0001', 'LITRO'))
})

test('aritmética exacta con redondeo HALF_UP por renglón', () => {
  assert.equal(lineTotalCents(1000, 125050), 125050)
  assert.equal(lineTotalCents(1500, 1001), 1502)
  assert.equal(lineTotalCents(500, 1), 1)
  assert.equal(lineTotalCents(250, 2), 1)
  assert.equal(sumLineTotals([{ totalCents: 101 }, { totalCents: 250 }]), 351)
  assert.throws(() => lineTotalCents(1_000_000_000, 1))
  assert.throws(() => lineTotalCents(1000, -1))
})

test('no confunde registro con recepción ni proveedor opcional', () => {
  const valid = normalizePurchaseInput(base)
  assert.equal(valid.supplierId, null)
  assert.equal(valid.reference, 'FACT-A-001')
  assert.equal(valid.lines[0].description, 'Material libre')
  assert.equal(valid.lines[0].quantityMilli, 2000)
  assert.equal(valid.receipt, undefined)
})

test('sólo conceptos libres usan la unidad CONCEPTO', () => {
  assert.throws(() => normalizePurchaseInput({ ...base, lines: [{ ...base.lines[0], unit: 'UNIDAD' }] }))
  assert.throws(() => normalizePurchaseInput({ ...base, lines: [{ ...base.lines[0], catalogItemId: 'demo-catalog-11111111-1111-4111-8111-111111111111' }] }))
})

test('fechas validas, no febrero 30 ni año fuera de política DEMO', () => {
  assert.equal(validPurchaseDate('2026-11-06'), true)
  assert.equal(validPurchaseDate('2024-02-29'), true)
  assert.equal(validPurchaseDate('2026-02-30'), false)
  assert.equal(validPurchaseDate('2026-99-20'), false)
  assert.equal(validPurchaseDate('1999-12-31'), false)
})

test('recibe sólo bienes físicos del catálogo, nunca servicios ni líneas libres', () => {
  const physical = { id: 'line-1', kind: 'BIEN', catalogItemId: 'catalog-1', unit: 'UNIDAD', quantityMilli: 3000 }
  const service = { id: 'line-2', kind: 'SERVICIO', catalogItemId: 'catalog-2', unit: 'SERVICIO', quantityMilli: 1000 }
  const free = { id: 'line-3', kind: 'CONCEPTO', catalogItemId: null, unit: 'CONCEPTO', quantityMilli: 1000 }
  assert.deepEqual(physicalPurchaseLines([physical, service, free]), [physical])
})

test('rechaza importes imposibles y demasiados renglones', () => {
  assert.throws(() => normalizePurchaseInput({ ...base, lines: [] }))
  assert.throws(() => normalizePurchaseInput({ ...base, lines: Array.from({ length: 31 }, () => base.lines[0]) }))
  assert.throws(() => normalizePurchaseInput({
    ...base, lines: [{ ...base.lines[0], quantityMilli: 2001 }],
  }))
  assert.throws(() => normalizePurchaseInput({
    ...base, lines: [{ ...base.lines[0], unitCostCents: -1 }],
  }))
})
