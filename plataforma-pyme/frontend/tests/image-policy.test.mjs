import test from 'node:test'
import assert from 'node:assert/strict'
import {
  demoImageKey, scaledImageSize, validateDemoImageFile,
  MAX_IMAGE_FILE_BYTES, MAX_IMAGE_SIDE,
} from '../src/data/demo/imagePolicy.ts'

test('perfil usa una sola imagen global en todas las empresas', () => {
  assert.equal(demoImageKey('profile'), JSON.stringify(['profile', 'demo-user']))
  assert.equal(demoImageKey('profile', 'walos-demo', 'cualquiera'), demoImageKey('profile'))
})

test('fotos de catálogo, proveedor y ubicación tienen claves diferentes por empresa', () => {
  const a = demoImageKey('catalog', 'walos-demo', 'demo-catalog-1')
  const b = demoImageKey('catalog', 'comercio-demo', 'demo-catalog-1')
  const c = demoImageKey('supplier', 'walos-demo', 'demo-catalog-1')
  const d = demoImageKey('location', 'walos-demo', 'demo-catalog-1')
  const e = demoImageKey('business', 'walos-demo', 'logo')
  assert.equal(new Set([a, b, c, d, e]).size, 5)
  assert.equal(a, JSON.stringify(['catalog', 'walos-demo', 'demo-catalog-1']))
})

test('fichas nuevas sin ID no pueden asociar imágenes', () => {
  assert.throws(() => demoImageKey('catalog', 'walos-demo', ''), /ficha existente/)
  assert.throws(() => demoImageKey('supplier', '', 'demo-supplier-1'), /ficha existente/)
  assert.throws(() => demoImageKey('location', 'walos/demo', 'loc-1'), /ficha existente/)
})

test('acepta únicamente JPG, PNG y WebP con tamaño limitado', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
    assert.doesNotThrow(() => validateDemoImageFile({ type, size: 124_000 }))
  }
  for (const type of ['image/svg+xml', 'image/gif', 'application/pdf', 'text/html', '']) {
    assert.throws(() => validateDemoImageFile({ type, size: 2000 }), /JPG, PNG o WebP/)
  }
})

test('rechaza archivos vacíos y mayores a 8 MB', () => {
  assert.throws(() => validateDemoImageFile({ type: 'image/jpeg', size: 0 }), /8 MB/)
  assert.throws(() => validateDemoImageFile({ type: 'image/png', size: MAX_IMAGE_FILE_BYTES + 1 }), /8 MB/)
  assert.doesNotThrow(() => validateDemoImageFile({ type: 'image/png', size: MAX_IMAGE_FILE_BYTES }))
})

test('dimensiona fotos horizontales y verticales sin estirarlas', () => {
  assert.deepEqual(scaledImageSize(2048, 1024), { width: MAX_IMAGE_SIDE, height: MAX_IMAGE_SIDE / 2 })
  assert.deepEqual(scaledImageSize(1024, 2048), { width: MAX_IMAGE_SIDE / 2, height: MAX_IMAGE_SIDE })
  assert.deepEqual(scaledImageSize(256, 128), { width: 256, height: 128 })
  assert.throws(() => scaledImageSize(0, 500), /dimensiones inválidas/)
  assert.throws(() => scaledImageSize(40_000, 10), /dimensiones inválidas/)
})
