import test from 'node:test'
import assert from 'node:assert/strict'
import {
  catalogNameKey, normalizeCatalogInput, parseMoneyCents, moneyInput, moneyDisplay,
} from '../src/data/demo/catalogPolicy.ts'

const base = {
  name: ' Servicio de prueba ', kind: 'SERVICIO', category: 'Servicios',
  sku: '', unit: 'SERVICIO', description: '', observations: '', sellable: true,
  priceCents: null, referenceCostCents: null,
}

test('convierte importes ARS a centavos sin decimales binarios', () => {
  assert.equal(parseMoneyCents('1250,50'), 125050)
  assert.equal(parseMoneyCents('1250.50'), 125050)
  assert.equal(parseMoneyCents('0,01'), 1)
  assert.equal(parseMoneyCents('100'), 10000)
  assert.equal(parseMoneyCents(''), null)
  assert.equal(moneyInput(125050), '1250,50')
  assert.match(moneyDisplay(125050), /1\.250,50/)
})
test('rechaza formatos ambiguos, montos negativos y más de dos decimales', () => {
  for (const input of ['1.250,50', '-1', '1,234', '1e5', 'NaN', '1.2.3', '1234567890', ' 1 2 ']) {
    assert.throws(() => parseMoneyCents(input), input)
  }
})
test('servicios tienen unidad propia y no se interpretan como stock físico', () => {
  const service = normalizeCatalogInput(base)
  assert.equal(service.unit, 'SERVICIO')
  assert.equal(service.priceCents, null)
  assert.throws(() => normalizeCatalogInput({ ...base, unit: 'UNIDAD' }))
  assert.throws(() => normalizeCatalogInput({ ...base, kind: 'REVENTA' }))
  assert.equal(normalizeCatalogInput({ ...base, kind: 'REVENTA', unit: 'UNIDAD' }).unit, 'UNIDAD')
})
test('SKU opcional, normalizado y con caracteres controlados', () => {
  assert.equal(normalizeCatalogInput({ ...base, sku: '  int_01-2.3  ' }).sku, 'INT_01-2.3')
  assert.equal(normalizeCatalogInput(base).sku, '')
  for (const sku of ['../script?', 'A B', '@', 'a'.repeat(33)]) {
    assert.throws(() => normalizeCatalogInput({ ...base, sku }), sku)
  }
})
test('nombre normalizado para unicidad por empresa y validación de centavos', () => {
  assert.equal(catalogNameKey('  Avena   Premium  '), catalogNameKey('avena premium'))
  assert.equal(normalizeCatalogInput(base).name, 'Servicio de prueba')
  assert.throws(() => normalizeCatalogInput({ ...base, name: 'x' }))
  assert.throws(() => normalizeCatalogInput({ ...base, priceCents: 1.5 }))
  assert.throws(() => normalizeCatalogInput({ ...base, referenceCostCents: -1 }))
})

test('mantiene separadas la descripción y las observaciones internas', () => {
  const saved = normalizeCatalogInput({
    ...base,
    description: '  Información pública para clientes.  ',
    observations: '  Controlar lote antes de entregar.  ',
  })
  assert.equal(saved.description, 'Información pública para clientes.')
  assert.equal(saved.observations, 'Controlar lote antes de entregar.')
  assert.throws(() => normalizeCatalogInput({ ...base, observations: 'x'.repeat(601) }))
})

test('acepta fichas anteriores sin observaciones (migración no destructiva)', () => {
  const oldEntry = { ...base }
  delete oldEntry.observations
  const restored = normalizeCatalogInput(oldEntry)
  assert.equal(restored.observations, '')
  assert.equal(restored.name, base.name.trim())
})
