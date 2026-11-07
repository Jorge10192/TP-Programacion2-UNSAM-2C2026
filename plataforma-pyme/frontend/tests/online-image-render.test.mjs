import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runnerImport } from 'vite'
import { demoImageKey } from '../src/data/demo/imagePolicy.ts'

test('histórico renderiza la fecha original sin zona ni conversión y conserva ambas filas', async () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/online-timestamp-legacy.http.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''))
  const { module } = await runnerImport(fileURLToPath(new URL('./online-image-render-harness.tsx', import.meta.url)), { configFile: false })
  const html = module.renderReadonlyFixture(fixture)
  assert.match(html, /Histórico de sólo lectura/)
  assert.match(html, /Zona horaria no registrada\./)
  assert.doesNotMatch(html, /FECHA_ZONA_DESCONOCIDA/)
  for (const row of fixture.movimientos.filter(value => value.fecha_fuente === 'LEGACY_SIN_ZONA')) {
    assert.ok(html.includes('Movimiento:' + row.id))
    assert.ok(html.includes('<dt>Fecha original (zona horaria no registrada)</dt><dd>' + row.fecha_registrada_sin_zona + '</dd>'))
  }
})

test('render online con IDs SQL conserva catálogo, proveedores, stock, venta y detalles sin validar imágenes demo', async () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/online-snapshot.http.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''))
  assert.throws(() => demoImageKey('catalog', 'walos', 'insumo:' + fixture.catalogo[0].id), /ficha existente/)
  const { module } = await runnerImport(fileURLToPath(new URL('./online-image-render-harness.tsx', import.meta.url)), { configFile: false })
  const original = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, get() { throw new Error('el render API no debe abrir IndexedDB') } })
  try {
    const rendered = module.renderOnlineFixture(fixture)
    assert.match(rendered.catalog, new RegExp(fixture.catalogo[0].nombre))
    assert.match(rendered.catalog, /Productos e insumos/)
    assert.doesNotMatch(rendered.catalog, /Agregar artículo o servicio|empresa de servicios|<small>Servicios<\/small>/)
    assert.match(rendered.suppliers, new RegExp(fixture.proveedores[0].nombre))
    assert.match(rendered.picker, new RegExp(fixture.catalogo.find(row => row.vendible).nombre))
    assert.match(rendered.placeholders, /Sin foto/)
    assert.match(rendered.placeholders, /fotos locales no están habilitadas/)
    assert.doesNotMatch(rendered.supplierDetail, /Medios y condiciones comerciales|Promociones informadas|Datos comerciales y contacto|navegador de demostración|Todavía no hay compras/)
    assert.match(rendered.supplierDetail, /El historial se consulta en Compras/)
    assert.match(rendered.supplierForm, /Nombre y observaciones/)
    assert.doesNotMatch(rendered.supplierForm, /1\. Identificación|5\. Observaciones/)
    assert.doesNotMatch(rendered.suppliers, /contactos son únicamente de demostración|Sin productos o servicios especificados/)
    assert.match(rendered.purchasesEmpty, /Registrá un proveedor y artículos físicos en Catálogo/)
    assert.doesNotMatch(rendered.purchasesEmpty, /concepto libre|Servicios y conceptos libres/)
    assert.doesNotMatch(rendered.salesEmpty, /venta de prueba|bienes o servicios/)
    assert.doesNotMatch(rendered.picker, /productos o servicios/)
    assert.doesNotMatch(rendered.saleForm, /Generar QR DEMO|Artículo o servicio|servicios no requieren/)
    assert.doesNotMatch(rendered.cash, /snapshots|snapshot inmutable/)
    assert.match(rendered.cash, /cierres/)
    assert.match(rendered.demoSupplierDetail, /Medios y condiciones comerciales/)
    assert.match(rendered.demoSupplierDetail, /Promociones informadas/)
    assert.match(rendered.demoSupplierForm, /1\. Identificación/)
    assert.match(rendered.demoSupplierForm, /5\. Observaciones/)
    assert.match(rendered.demoPurchasesEmpty, /concepto libre/)
    assert.match(rendered.demoSaleForm, /Generar QR DEMO/)
    assert.match(rendered.demoSaleForm, /Artículo o servicio/)
    for (const html of Object.values(rendered)) assert.ok(html.length > 30)
  } finally {
    if (original) Object.defineProperty(globalThis, 'indexedDB', original)
    else delete globalThis.indexedDB
  }
})
