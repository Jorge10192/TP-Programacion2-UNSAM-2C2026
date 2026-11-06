import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validateGoogleMapsLink,
  mapsSearchUrl,
  getLocationMapsLink,
  locationShareText,
} from '../src/data/demo/mapsLinks.ts'

test('acepta enlaces oficiales con https', () => {
  assert.equal(validateGoogleMapsLink('https://maps.app.goo.gl/abc123'), 'https://maps.app.goo.gl/abc123')
  assert.equal(validateGoogleMapsLink('https://www.google.com/maps/place/ejemplo'), 'https://www.google.com/maps/place/ejemplo')
  assert.equal(validateGoogleMapsLink(''), '')
})

test('rechaza enlaces no Maps y protocolos inseguros', () => {
  for (const url of [
    'javascript:alert(1)',
    'http://www.google.com/maps/place/ejemplo',
    'https://google.com.evil.example/maps',
    'https://www.google.com/url?q=https://otro.example',
    'https://example.com',
    'https://bad@www.google.com/maps',
    'https://www.google.com:444/maps',
    'https://www.google.com/maps/ejemplo'.padEnd(2050, 'X'),
  ]) assert.throws(() => validateGoogleMapsLink(url))
})

test('construye búsqueda oficial con codificación URL de dirección', () => {
  const url = mapsSearchUrl('  Avenida Ficticia 123, Ciudad  ')
  assert.ok(url)
  const parsed = new URL(url)
  assert.equal(parsed.hostname, 'www.google.com')
  assert.equal(parsed.pathname, '/maps/search/')
  assert.equal(parsed.searchParams.get('api'), '1')
  assert.equal(parsed.searchParams.get('query'), 'Avenida Ficticia 123, Ciudad')
})

test('prioriza link compartido; si falta usa búsqueda no verificada', () => {
  const shared = getLocationMapsLink({ address: 'Dirección de prueba', mapUrl: 'https://maps.app.goo.gl/test' })
  assert.equal(shared?.source, 'shared')
  const search = getLocationMapsLink({ address: 'Dirección de prueba', mapUrl: '' })
  assert.equal(search?.source, 'search')
  assert.equal(getLocationMapsLink({ address: '', mapUrl: '' }), null)
})

test('el texto de compartir indica si se trata de una búsqueda', () => {
  const message = locationShareText('Empresa DEMO', { name: 'Sucursal', address: 'Dirección simulada', mapUrl: '' })
  assert.match(message ?? '', /Empresa DEMO · Sucursal/)
  assert.match(message ?? '', /sin verificar/)
  assert.equal(locationShareText('Empresa DEMO', { name: 'Sin mapa', address: '', mapUrl: '' }), null)
})
