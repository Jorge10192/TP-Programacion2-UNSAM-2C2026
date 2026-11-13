import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const pos = read('../src/features/sales/RealPosCheckout.tsx')
const qr = read('../src/features/payments/RealQrIntentPage.tsx')
const connections = read('../src/features/payments/RealPaymentConnectionsPage.tsx')
const docker = read('../../Dockerfile.public')

test('QR público tiene etiqueta inequívoca NO PAGABLE y botón para exhibir', () => {
  assert.match(pos, /QR de exhibición · NO PAGABLE/)
  assert.match(pos, /Generar QR de exhibición/)
  assert.match(qr, /EXHIBICIÓN · NO PAGABLE/)
  assert.match(qr, /sin proveedor financiero/)
  assert.match(qr, /no genera órdenes/i)
})

test('La ruta pública no consulta ni exige conexión con Mercado Pago', () => {
  assert.match(pos, /if \(EXHIBITION_UI\) return/)
  assert.match(qr, /EXHIBITION_UI \? Promise\.resolve\(null\) : officialApi\.connection\(\)/)
  assert.match(qr, /EXHIBITION_UI \? Promise\.resolve\(null\) : officialApi\.sharedConnection\(\)/)
  assert.match(connections, /EXHIBITION_UI \? Promise\.resolve\(null\) : official\.connection\(\)/)
  assert.match(connections, /No hay cuenta ni caja vinculada/)
})

test('El build público tiene exhibición encendida y laboratorios apagados', () => {
  assert.match(docker, /VITE_PYME_QR_EXHIBITION=1/)
  assert.match(docker, /VITE_PYME_ENABLE_QR_DEMO_LAB=0/)
  assert.match(docker, /VITE_PYME_ENABLE_QR_FINALIZATION_QA=0/)
})
