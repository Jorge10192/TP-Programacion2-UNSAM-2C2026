import test from 'node:test'
import assert from 'node:assert/strict'
import { completeLastPosPayment, composePosCheckout, POS_PAYMENT_LABELS } from '../src/features/sales/realPosCheckoutDraft.ts'
import { SALE_PAYMENT_METHODS } from '../src/features/sales/realSaleCommand.ts'

const product = '74f29998-41f4-4eba-b960-b1578146a9bb'
const service = 'b404fe24-e988-4b7f-aa33-c6cf91b1b070'
const site = 'df548df5-b087-44ce-8c80-f0e3c3b74f2d'
const lines = () => [
  { catalog_item_id: product, quantity_milli: 5000, unit_price_cents: 200000 },
  { catalog_item_id: service, quantity_milli: 4000, unit_price_cents: 100000 },
]
const payments = () => [
  { method: 'EFECTIVO', amountText: '8000,00', reference: '' },
  { method: 'MERCADO_PAGO_DECLARADO', amountText: '4000,00', reference: ' QR cobro declarado  ' },
]
const make = (override = {}) => {
  const options = {
    location: site, rows: lines(), discount: 200000,
    notes: '  ＶＥＮＴＡ   prueba  ', pays: payments(), ...override,
  }
  return composePosCheckout(options.location, options.rows, options.discount,
    options.notes, options.pays)
}

test('T10-D total mixto exacto: 5x2000 + 4x1000 - 2000 = 12000', () => {
  const { body, totals } = make()
  assert.deepEqual(totals, {
    subtotal_cents: 1400000, discount_cents: 200000, total_cents: 1200000,
    line_totals_cents: [1000000, 400000],
  })
  assert.equal(body.payments[0].amount_cents, 800000)
  assert.equal(body.payments[1].amount_cents, 400000)
  assert.equal(body.payments[1].method, 'MERCADO_PAGO_DECLARADO')
  assert.equal(body.payments[1].reference, 'QR cobro declarado')
  assert.equal(body.notes, 'VENTA prueba')
  assert.equal(body.location_id, site)
})

test('T10-D pagos en pesos se convierten a centavos sin floats', () => {
  const { body } = make({ pays: [
    { method: 'TRANSFERENCIA', amountText: '5999,99', reference: '' },
    { method: 'EFECTIVO', amountText: '6000,01', reference: '' },
  ] })
  assert.deepEqual(body.payments.map(x => x.amount_cents), [599999, 600001])
})

test('T10-D pago parcial insuficiente o exceso se rechaza antes de reservar', () => {
  for (const amountText of ['11999,99', '12000,01', '0', '-5', '12.000,00',
    '', '12000,001', '12000,00abc']) {
    assert.throws(() => make({ pays: [
      { method: 'EFECTIVO', amountText, reference: '' },
    ] }), RangeError)
  }
})

test('T10-D valida 1..6 medios y métodos, sin permitir confirmación de banco', () => {
  assert.equal(SALE_PAYMENT_METHODS.length, 5)
  assert.equal(Object.keys(POS_PAYMENT_LABELS).length, 5)
  const one = [{ method: 'EFECTIVO', amountText: '12000', reference: '' }]
  assert.equal(make({ pays: one }).totals.total_cents, 1200000)
  for (const pays of [
    [], Array.from({ length: 7 }, () => ({ method: 'EFECTIVO', amountText: '1', reference: '' })),
    [{ method: 'MERCADO_PAGO_ACREDITADO', amountText: '12000', reference: '' }],
    [{ method: 'TARJETA', amountText: '0', reference: '' }],
  ]) assert.throws(() => make({ pays }), RangeError)
})

test('T10-D no modifica entradas: copia y normaliza el comando de revisión', () => {
  const source = lines()
  const originalPayments = payments()
  const { body } = make({ rows: source, pays: originalPayments })
  assert.notStrictEqual(body.lines, source)
  assert.notStrictEqual(body.payments, originalPayments)
  assert.deepEqual(source, lines())
  assert.equal(originalPayments[1].reference, ' QR cobro declarado  ')
})

test('T10-D valida servicios sin sede solo en el contrato; RBAC sigue en FastAPI', () => {
  const { body } = make({ location: null })
  assert.equal(body.location_id, null)
})

test('T10-D referencias normalizadas o inválidas no se envían', () => {
  assert.equal(make({ pays: [
    { method: 'EFECTIVO', amountText: '12000', reference: '  comprobante   A  ' },
  ] }).body.payments[0].reference, 'comprobante A')
  for (const reference of ['X'.repeat(121), '\u202e', '\u200b']) {
    assert.throws(() => make({ pays: [
      { method: 'EFECTIVO', amountText: '12000', reference },
    ] }), RangeError)
  }
})

test('T10-D importe individual requiere total positivo e íntegro', () => {
  for (const bad of [
    { ...make().body, discount_cents: 1400000 },
    { ...make().body, discount_cents: -1 },
  ]) {
    const { lines: rows, payments: pays, discount_cents: discount, notes, location_id: location } = bad
    assert.throws(() => composePosCheckout(location, rows, discount, notes,
      pays.map(x => ({ method: x.method, amountText: '12000', reference: x.reference }))), RangeError)
  }
})

test('E3-1G descuento sobre total y botón de completar el último pago con centavos exactos',()=>{
  const original=[
    {method:'EFECTIVO',amountText:'5000,01',reference:'adelanto'},
    {method:'TRANSFERENCIA',amountText:'',reference:'operación QA'},
  ]
  const completed=completeLastPosPayment(1200000,original)
  assert.deepEqual(completed.map(x=>x.amountText),['5000,01','6999,99'])
  assert.equal(completed[1].reference,'operación QA')
  assert.deepEqual(original.map(x=>x.amountText),['5000,01',''])
  const result=composePosCheckout(site,lines(),200000,'',completed)
  assert.equal(result.totals.subtotal_cents,1400000)
  assert.equal(result.totals.discount_cents,200000)
  assert.equal(result.totals.total_cents,1200000)
  assert.deepEqual(result.body.payments.map(x=>x.amount_cents),[500001,699999])
})

test('E3-1G saldo de pago sigue el nuevo descuento sin alterar métodos previos',()=>{
  const pays=[
    {method:'EFECTIVO',amountText:'8000,00',reference:''},
    {method:'TARJETA',amountText:'4000,00',reference:'ref'},
  ]
  assert.equal(completeLastPosPayment(1000000,pays)[1].amountText,'2000,00')
  assert.equal(completeLastPosPayment(1400000,pays)[1].amountText,'6000,00')
  assert.equal(completeLastPosPayment(150000,[{...pays[0],amountText:''}])[0].amountText,'1500,00')
})

test('E3-1G último medio debe ser positivo; no admite previos inválidos ni pagos inventados',()=>{
  const pays=[
    {method:'EFECTIVO',amountText:'100,00',reference:''},
    {method:'TRANSFERENCIA',amountText:'',reference:''},
  ]
  assert.throws(()=>completeLastPosPayment(10000,pays),RangeError)
  assert.throws(()=>completeLastPosPayment(9000,pays),RangeError)
  for(const bad of ['','0','-1','4.000,00','cien','1,234']){
    assert.throws(()=>completeLastPosPayment(10000,[{...pays[0],amountText:bad},pays[1]]),RangeError)
  }
  assert.throws(()=>completeLastPosPayment(0,pays),RangeError)
  assert.throws(()=>completeLastPosPayment(10000,[]),RangeError)
})
