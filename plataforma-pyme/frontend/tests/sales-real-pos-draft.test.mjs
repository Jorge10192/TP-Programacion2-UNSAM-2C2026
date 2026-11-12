import test from 'node:test'
import assert from 'node:assert/strict'
import {
  addOnePosCartUnit, canOverrideSalesPrice, canOperateSales, parsePosQuantity,
  posLineTotalCents, posQuantityText, previewPosCart,
} from '../src/features/sales/realPosDraft.ts'

const itemId = '7d6ab8a4-bcab-4e28-bb99-60a35dd0c9d1'
const otherId = '6dc6a4fb-8df4-437e-a3a6-55b08fdb8b24'
const location = {
  id: 'b155c3a6-226c-4bd9-b5b9-36509ad0316c',
  business_id: 'e1041691-a3b6-4625-865d-6c24916fcfad',
  name: 'Sede A', status: 'ACTIVA',
  can_sell: true, can_store: true,
}
const catalog = [
  { id: itemId, item_type: 'BIEN', name: 'Producto', unit: 'UNIDAD', status: 'ACTIVO',
    sellable: true, price_cents: 1750 },
  { id: otherId, item_type: 'SERVICIO', name: 'Servicio', unit: 'SERVICIO', status: 'ACTIVO',
    sellable: true, price_cents: null },
]
const cart = () => [{ catalog_item_id: itemId, quantity_milli: 2000, unit_price_cents: 1750 }]

test('T10-C cantidades fraccionables y enteras sin usar floats', () => {
  assert.equal(parsePosQuantity('1,250', 'KILOGRAMO'), 1250)
  assert.equal(parsePosQuantity('0.001', 'GRAMO'), 1)
  assert.equal(parsePosQuantity('2', 'UNIDAD'), 2000)
  assert.equal(parsePosQuantity('2,000', 'PAQUETE'), 2000)
  assert.equal(posQuantityText(1250), '1,25')
  assert.equal(posQuantityText(1000), '1')
  assert.equal(parsePosQuantity('999999,999', 'LITRO'), 999999999)
})

test('T10-C unidades enteras rechazan fracciones y límites indebidos', () => {
  for (const unit of ['UNIDAD', 'SERVICIO', 'PAQUETE', 'CAJA']) {
    assert.throws(() => parsePosQuantity('1,5', unit), RangeError)
  }
  for (const bad of ['0', '-1', '1,1234', '1.000,5', '1000000', '3e2', '', '1,', ',5']) {
    assert.throws(() => parsePosQuantity(bad, 'KILOGRAMO'), RangeError)
  }
  assert.throws(() => posQuantityText(0), RangeError)
})

test('T10-C solo titular y administrador pueden modificar importes y descuentos', () => {
  assert.equal(canOverrideSalesPrice('TITULAR_ADMINISTRATIVO'), true)
  assert.equal(canOverrideSalesPrice('ADMINISTRADOR'), true)
  assert.equal(canOverrideSalesPrice('ENCARGADO'), false)
  assert.equal(canOverrideSalesPrice('TRABAJADOR'), false)
  assert.equal(canOperateSales('DESCONOCIDO'), false)
  for (const role of ['TITULAR_ADMINISTRATIVO', 'ADMINISTRADOR']) {
    assert.equal(previewPosCart(role, true, location, catalog,
      [{ ...cart()[0], unit_price_cents: 2100 }], 100).totals.total_cents, 4100)
  }
  for (const role of ['ENCARGADO', 'TRABAJADOR']) {
    assert.throws(() => previewPosCart(role, true, location, catalog,
      [{ ...cart()[0], unit_price_cents: 2100 }], 0), /precio del catálogo/)
    assert.throws(() => previewPosCart(role, true, location, catalog, cart(), 100),
      /no puede aplicar descuentos/)
    assert.equal(previewPosCart(role, true, location, catalog, cart(), 0).totals.total_cents, 3500)
  }
})

test('T10-C trabajadores requieren sede, administradores pueden preparar servicio sin sede', () => {
  assert.throws(() => previewPosCart('TRABAJADOR', true, null, catalog, cart(), 0), /sede/)
  assert.throws(() => previewPosCart('TRABAJADOR', true, location, catalog,
    [{ catalog_item_id: otherId, quantity_milli: 1000, unit_price_cents: 1500 }], 0), /sin precio/)
  assert.equal(previewPosCart('ADMINISTRADOR', true, null, catalog, [
    { catalog_item_id: otherId, quantity_milli: 1000, unit_price_cents: 1500 },
  ], 0).totals.total_cents, 1500)
  assert.throws(() => previewPosCart('ADMINISTRADOR', true, null, catalog, cart(), 0),
    /bienes físicos/)
})

test('T10-C solo sedes activas que venden, y con depósito para bienes', () => {
  const closed = { ...location, status: 'PAUSADA' }
  const noSell = { ...location, can_sell: false }
  const noStore = { ...location, can_store: false }
  for (const site of [closed, noSell]) {
    assert.throws(() => previewPosCart('ADMINISTRADOR', true, site, catalog, cart(), 0), RangeError)
  }
  assert.throws(() => previewPosCart('ADMINISTRADOR', true, noStore, catalog, cart(), 0),
    /gestione stock/)
  assert.equal(previewPosCart('ADMINISTRADOR', true, noStore, catalog,
    [{ catalog_item_id: otherId, quantity_milli: 1000, unit_price_cents: 1500 }], 0).totals.total_cents, 1500)
})

test('T10-C deniega empresa inactiva, artículos no vendibles y líneas repetidas', () => {
  assert.throws(() => previewPosCart('ADMINISTRADOR', false, location, catalog, cart(), 0),
    /autorización/)
  assert.throws(() => previewPosCart('NO_MEMBER', true, location, catalog, cart(), 0),
    /autorización/)
  assert.throws(() => previewPosCart('ADMINISTRADOR', true, location, catalog,
    cart().concat(cart()), 0), /dupliques/)
  const disabled = catalog.map(x => ({ ...x, status: 'INACTIVO' }))
  assert.throws(() => previewPosCart('ADMINISTRADOR', true, location, disabled, cart(), 0), RangeError)
  assert.throws(() => previewPosCart('ADMINISTRADOR', true, location, catalog, [
    { catalog_item_id: '6f292514-4d3c-4917-b765-85c4d84dbf4b', quantity_milli: 1000, unit_price_cents: 1 },
  ], 0), RangeError)
})

test('T10-C carrito puro no crea solicitudes, conserva montos y snapshots de preview', () => {
  const original = cart()
  const result = previewPosCart('TRABAJADOR', true, location, catalog, original, 0)
  assert.deepEqual(result.totals, {
    subtotal_cents: 3500, discount_cents: 0, total_cents: 3500, line_totals_cents: [3500],
  })
  assert.notStrictEqual(result.lines[0], original[0])
  assert.deepEqual(original, cart())
})

test('T10-C subtotal por producto distingue precio unitario de cantidad y aplica HALF_UP', () => {
  assert.equal(posLineTotalCents(4000, 150000), 600000)
  assert.equal(posLineTotalCents(5000, 200000), 1000000)
  assert.equal(posLineTotalCents(4000, 100000), 400000)
  assert.equal(posLineTotalCents(500, 3), 2)
  assert.equal(posLineTotalCents(1, 500), 1)
  assert.equal(posLineTotalCents(1, 1), 0)
})

test('T10-C subtotales de 2 artículos coinciden con subtotal de venta', () => {
  const lines = [
    { catalog_item_id: itemId, quantity_milli: 5000, unit_price_cents: 200000 },
    { catalog_item_id: otherId, quantity_milli: 4000, unit_price_cents: 100000 },
  ]
  const calculated = previewPosCart('TITULAR_ADMINISTRATIVO', true, location, catalog, lines, 200000)
  assert.deepEqual(calculated.totals.line_totals_cents,
    lines.map(line => posLineTotalCents(line.quantity_milli, line.unit_price_cents)))
  assert.equal(calculated.totals.subtotal_cents, 1400000)
  assert.equal(calculated.totals.discount_cents, 200000)
  assert.equal(calculated.totals.total_cents, 1200000)
})

test('T10-C subtotal por producto rechaza montos fuera de rango sin floats', () => {
  for (const [quantity, unit] of [
    [0, 150000], [1000, -1], [1000.5, 150000], [1000, NaN],
    [1000, Number.MAX_SAFE_INTEGER], [1000000000, 1], [2000, 99999999999],
  ]) assert.throws(() => posLineTotalCents(quantity, unit), RangeError)
})

test('E3-1G: Agregar unidades desde la tarjeta incorpora artículos distintos y no cambia la selección',()=>{
 const service={...catalog[1],price_cents:100000}
 const original=cart()
 const updated=addOnePosCartUnit(original,service,null)
 assert.equal(updated.length,2)
 assert.deepEqual(updated[0],original[0])
 assert.deepEqual(updated[1],{catalog_item_id:otherId,quantity_milli:1000,unit_price_cents:100000})
 const again=addOnePosCartUnit(updated,service,null)
 assert.equal(again.length,2)
 assert.equal(again[1].quantity_milli,2000)
 assert.deepEqual(original,cart(),'Nunca muta las líneas anteriores')
})

test('E3-1G: la acción rápida no supera el stock por sede ni duplica artículos',()=>{
 const original=cart()
 assert.equal(addOnePosCartUnit(original,catalog[0],3000)[0].quantity_milli,3000)
 assert.throws(()=>addOnePosCartUnit(original,catalog[0],2000),/existencias/)
 assert.throws(()=>addOnePosCartUnit([],catalog[0],null),/Consultá las existencias/)
 assert.throws(()=>addOnePosCartUnit([],catalog[0],0),/existencias/)
})

test('E3-1G: conserva precio excepcional en carrito y exige precio definido al agregar',()=>{
 const custom=[{catalog_item_id:itemId,quantity_milli:1000,unit_price_cents:9900}]
 const updated=addOnePosCartUnit(custom,catalog[0],5000)
 assert.equal(updated[0].unit_price_cents,9900)
 assert.equal(updated[0].quantity_milli,2000)
 assert.throws(()=>addOnePosCartUnit([],catalog[1],null),/precio definido/)
 assert.throws(()=>addOnePosCartUnit([],{...catalog[0],status:'INACTIVO'},1000),/no está habilitado/)
})
