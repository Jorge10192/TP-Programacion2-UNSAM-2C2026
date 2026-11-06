import test from 'node:test'
import assert from 'node:assert/strict'
import {
  blankSupplier, normalizeSupplierInput, supplierNameKey,
  validateSupplierWebsite, whatsappUrl, instagramUrl, supplierShareText,
} from '../src/data/demo/supplierPolicy.ts'

const base = { ...blankSupplier, name: 'Proveedor de prueba', paymentMethods: [], promotions: [] }
const promotion = {
  id: 'demo-promo-11111111-1111-4111-8111-111111111111',
  days: [1, 3], paymentMethod: 'TRANSFERENCIA',
  benefit: '10% informado los martes y jueves',
}

test('alta de proveedor sólo requiere nombre', () => {
  const result = normalizeSupplierInput(base)
  assert.equal(result.name, 'Proveedor de prueba')
  assert.equal(result.website, '')
  assert.equal(result.promotions.length, 0)
  assert.throws(() => normalizeSupplierInput({ ...base, name: 'a' }))
})
test('nombre normalizado, pagos y promoción declarativa', () => {
  assert.equal(supplierNameKey('  AVÍCOLA   DEL SUR '), supplierNameKey('avícola del sur'))
  const input = normalizeSupplierInput({
    ...base, paymentMethods: ['EFECTIVO', 'TRANSFERENCIA'],
    promotions: [promotion],
  })
  assert.deepEqual(input.promotions[0].days, [1, 3])
  assert.equal(input.promotions[0].paymentMethod, 'TRANSFERENCIA')
  assert.throws(() => normalizeSupplierInput({ ...base, paymentMethods: ['EFECTIVO', 'EFECTIVO'] }))
  assert.throws(() => normalizeSupplierInput({ ...base, promotions: [{ ...promotion, benefit: '' }] }))
  assert.throws(() => normalizeSupplierInput({ ...base, promotions: [{ ...promotion, days: [1, 1] }] }))
})
test('URLs seguras y sin credenciales', () => {
  assert.equal(validateSupplierWebsite('https://ejemplo.com/catalogo').startsWith('https://'), true)
  for (const invalid of ['javascript:alert(1)', 'http://ejemplo.com', 'https://user:pass@ejemplo.com', 'https://localhost/']) {
    assert.throws(() => validateSupplierWebsite(invalid), invalid)
  }
  assert.throws(() => normalizeSupplierInput({ ...base, mapsUrl: 'https://google.com.evil.com/maps/' }))
  assert.equal(normalizeSupplierInput({ ...base, mapsUrl: 'https://maps.app.goo.gl/abc' }).mapsUrl.startsWith('https://'), true)
})
test('WhatsApp internacional, enlaces telefónicos y usuario de Instagram', () => {
  assert.equal(whatsappUrl('+5491112345678'), 'https://wa.me/5491112345678')
  assert.equal(whatsappUrl('11 1234-5678'), null)
  assert.equal(instagramUrl('@empresa.ejemplo'), 'https://www.instagram.com/empresa.ejemplo/')
  assert.equal(instagramUrl('https://malicioso.com'), null)
  assert.throws(() => normalizeSupplierInput({ ...base, whatsapp: '1112345678' }))
})
test('compartir solo datos de contacto, no notas ni condiciones privadas', () => {
  const supplier = normalizeSupplierInput({
    ...base, phone: '+5491112345678', email: 'ventas@ejemplo.invalid', notes: 'SÓLO USO INTERNO',
    promotions: [promotion],
  })
  const shared = supplierShareText('Empresa A', supplier)
  assert.match(shared, /Empresa A/)
  assert.match(shared, /Proveedor de prueba/)
  assert.ok(!shared.includes('SÓLO USO INTERNO'))
  assert.ok(!shared.includes(promotion.benefit))
})
