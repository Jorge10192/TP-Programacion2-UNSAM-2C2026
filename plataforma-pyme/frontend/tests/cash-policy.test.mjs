import test from 'node:test'
import assert from 'node:assert/strict'
import {
  cashCents, cashSessionTotals, makeCloseSnapshot, normalizeExpense, normalizeClose,
  validCalendarDate,
} from '../src/data/demo/cashPolicy.ts'

const session = {
  id: 'demo-cash-session-11111111-1111-4111-8111-111111111111',
  openRequestId: 'demo-cash-open-11111111-1111-4111-8111-111111111111',
  closeRequestId: null, businessId: 'walos-demo',
  locationId: 'demo-location-11111111-1111-4111-8111-111111111111',
  openingCashCents: 10000, openedAt: '2026-11-06T12:00:00.000Z',
  openedBy: 'demo-user', status: 'ABIERTA', closeSnapshot: null,
}
const sales = [
  { id: 's1', businessId: 'walos-demo', cashSessionId: session.id,
    payments: [{ method: 'EFECTIVO', amountCents: 6500 }, { method: 'TRANSFERENCIA', amountCents: 3000 }] },
  { id: 'old', businessId: 'walos-demo',
    payments: [{ method: 'EFECTIVO', amountCents: 999999 }] },
  { id: 'other', businessId: 'comercio-demo', cashSessionId: session.id,
    payments: [{ method: 'EFECTIVO', amountCents: 77777 }] },
]
const expenses = [
  { id: 'e1', businessId: 'walos-demo', cashSessionId: session.id, paymentMethod: 'EFECTIVO', amountCents: 1250 },
  { id: 'digital', businessId: 'walos-demo', cashSessionId: null, paymentMethod: 'TRANSFERENCIA', amountCents: 5000 },
  { id: 'old', businessId: 'walos-demo', cashSessionId: null, paymentMethod: 'EFECTIVO', amountCents: 15000 },
]

test('apertura de caja admite cero y rechazo de centavos inválidos', () => {
  assert.equal(cashCents(0, 'Fondo', true), 0)
  assert.throws(() => cashCents(0, 'Gasto'), /válido/)
  assert.throws(() => cashCents(12.5, 'Fondo', true), /válido/)
})

test('efectivo esperado = apertura + sólo cobros cash ligados − sólo gastos cash ligados', () => {
  const t = cashSessionTotals(session, sales, expenses)
  assert.equal(t.cashSalesCents, 6500)
  assert.equal(t.cashExpensesCents, 1250)
  assert.equal(t.expectedCashCents, 15250)
  assert.deepEqual(t.saleIds, ['s1'])
  assert.deepEqual(t.expenseIds, ['e1'])
})

test('una venta previa a la apertura o una digital no aumenta el efectivo', () => {
  assert.deepEqual(cashSessionTotals(session, [
    { id: 'bank', businessId: 'walos-demo', cashSessionId: session.id,
      payments: [{ method: 'MERCADO_PAGO_DECLARADO', amountCents: 100000 }] },
    { id: 'old', businessId: 'walos-demo',
      payments: [{ method: 'EFECTIVO', amountCents: 20000 }] },
  ], []), { cashSalesCents: 0, cashExpensesCents: 0, expectedCashCents: 10000, saleIds: [], expenseIds: [] })
})

test('gastos de otra empresa o de otra caja no afectan arqueo', () => {
  assert.equal(cashSessionTotals(session, [], [
    { id: 'other-tenant', businessId: 'comercio-demo', cashSessionId: session.id,
      paymentMethod: 'EFECTIVO', amountCents: 5000 },
    { id: 'other-cash', businessId: 'walos-demo', cashSessionId: 'other-session',
      paymentMethod: 'EFECTIVO', amountCents: 9000 },
  ]).expectedCashCents, 10000)
})

test('snapshot conserva apertura, esperado, contado, actor y referencias', () => {
  const snap = makeCloseSnapshot(session, sales, expenses, {
    countedCashCents: 15250, notes: '',
  }, '2026-11-06T20:00:00.000Z')
  assert.equal(snap.expectedCashCents, 15250)
  assert.equal(snap.countedCashCents, 15250)
  assert.equal(snap.differenceCents, 0)
  assert.equal(snap.openingCashCents, 10000)
  assert.equal(snap.closedBy, 'demo-user')
  assert.equal(snap.closedAt, '2026-11-06T20:00:00.000Z')
  assert.deepEqual(snap.saleIds, ['s1'])
  assert.deepEqual(snap.expenseIds, ['e1'])
})

test('cierre con diferencia requiere motivo; diferencia positiva y negativa permitidas con razón', () => {
  assert.throws(() => makeCloseSnapshot(session, sales, expenses,
    { countedCashCents: 14000, notes: '' }, '2026-11-06T20:00:00.000Z'), /Explicá/)
  assert.equal(makeCloseSnapshot(session, sales, expenses, {
    countedCashCents: 14000, notes: 'Faltante de efectivo',
  }, '2026-11-06T20:00:00.000Z').differenceCents, -1250)
  assert.equal(makeCloseSnapshot(session, sales, expenses, {
    countedCashCents: 16500, notes: 'Sobrante observado',
  }, '2026-11-06T20:00:00.000Z').differenceCents, 1250)
})

test('nunca se puede generar un segundo snapshot de jornada ya cerrada', () => {
  const alreadyClosed = { ...session, status: 'CERRADA',
    closeSnapshot: makeCloseSnapshot(session, [], [], { countedCashCents: 10000, notes: '' },
      '2026-11-06T20:00:00.000Z') }
  assert.throws(() => makeCloseSnapshot(alreadyClosed, [], [],
    { countedCashCents: 10000, notes: '' }, '2026-11-06T21:00:00.000Z'), /cerrada/)
})

test('gastos aceptan categorías y medios declarados, sin inventar cuentas bancarias', () => {
  const normalized = normalizeExpense({
    paidOn: '2026-11-06', locationId: null, category: 'TRANSPORTE',
    description: '  Flete  ', amountCents: 250000,
    paymentMethod: 'MERCADO_PAGO_DECLARADO', notes: 'Viaje de feria',
  })
  assert.equal(normalized.description, 'Flete')
  assert.equal(normalized.amountCents, 250000)
  assert.equal(normalized.paymentMethod, 'MERCADO_PAGO_DECLARADO')
  assert.equal(normalized.locationId, null)
})

test('fecha calendario válida y no se aceptan fechas ni categorías inexistentes', () => {
  assert.equal(validCalendarDate('2026-11-06'), true)
  assert.equal(validCalendarDate('2026-02-30'), false)
  assert.throws(() => normalizeExpense({
    paidOn: '2026-11-06', locationId: null, category: 'CRYPTO',
    description: 'Prueba', amountCents: 1000, paymentMethod: 'EFECTIVO', notes: '',
  }), /categoría/)
})

test('importe de gasto, medio de pago y concepto no pueden ser arbitrarios', () => {
  const good = { paidOn: '2026-11-06', locationId: null, category: 'OTROS',
    description: 'Movilidad', amountCents: 1000, paymentMethod: 'EFECTIVO', notes: '' }
  assert.throws(() => normalizeExpense({ ...good, amountCents: -100 }), /válido/)
  assert.throws(() => normalizeExpense({ ...good, paymentMethod: 'OTRO_FALSO' }), /Medio/)
  assert.throws(() => normalizeExpense({ ...good, description: ' ' }), /Concepto/)
})

test('un gasto en efectivo mayor que la disponibilidad no deja proyectar saldo negativo', () => {
  assert.throws(() => cashSessionTotals(session, [], [
    { id: 'too-much', businessId: 'walos-demo', cashSessionId: session.id,
      paymentMethod: 'EFECTIVO', amountCents: 10001 },
  ]), /negativo/)
})

test('normalización de arqueo: motivo opcional sólo cuando coincide', () => {
  assert.deepEqual(normalizeClose({ countedCashCents: 0, notes: ' Sin efectivo ' }),
    { countedCashCents: 0, notes: 'Sin efectivo' })
  assert.throws(() => normalizeClose({ countedCashCents: -1, notes: '' }), /válido/)
})
