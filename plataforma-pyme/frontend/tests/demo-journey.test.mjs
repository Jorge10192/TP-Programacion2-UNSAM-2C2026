import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

// Integration of the real local gateway and its persistence. No browser UI,
// HTTP API, database, production exports or external storage are involved.
class MemoryLocalStorage {
  #values = new Map()
  reads = 0
  writes = 0

  get length() { return this.#values.size }
  key(index) { return [...this.#values.keys()][index] ?? null }
  getItem(key) {
    this.reads++
    return this.#values.get(String(key)) ?? null
  }
  setItem(key, value) {
    this.writes++
    this.#values.set(String(key), String(value))
  }
  removeItem(key) { this.#values.delete(String(key)) }
  clear() { this.#values.clear() }
  serialized() { return JSON.stringify([...this.#values]) }
}

const copy = (value) => JSON.parse(JSON.stringify(value))
const requestId = (prefix) => `${prefix}-${randomUUID()}`

async function createHarness(t) {
  const storage = new MemoryLocalStorage()
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', {
    configurable: true, value: { localStorage: storage },
  })
  // Logical consecutive days on one calendar date, with distinct human steps.
  // Advancing Date avoids real sleeps and makes historical reconstruction exact.
  t.mock.timers.enable({ apis: ['Date'], now: Date.UTC(2026, 10, 6, 12) })
  let server
  let modules
  t.after(async () => {
    try { await server?.close() } finally {
      if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
      else delete globalThis.window
    }
  })

  async function reload() {
    await server?.close()
    server = await createServer({
      root: fileURLToPath(new URL('../', import.meta.url)),
      configFile: false,
      logLevel: 'silent',
      appType: 'custom',
      server: { middlewareMode: true, hmr: false, watch: null },
      optimizeDeps: { noDiscovery: true, include: [] },
    })
    const gateway = await server.ssrLoadModule('/src/data/demo/demoStore.ts')
    const cash = await server.ssrLoadModule('/src/data/demo/cashPolicy.ts')
    modules = { ...gateway, ...cash }
  }

  await reload()
  return {
    storage,
    reload,
    get api() { return modules },
    snapshot: () => copy(modules.demoStore.getSnapshot()),
    async invoke(method, args) {
      t.mock.timers.tick(1000)
      const payload = copy(args)
      const result = await modules.demoGateway[method](...payload)
      assert.deepEqual(payload, args, `${method} must not mutate the submitted payload`)
      return result
    },
  }
}

const days = [
  {
    name: 'J1: recorrido normal, cierre exacto y protocolo R',
    number: 1, purchaseReference: 'QA-C01', purchasedMilli: 5000,
    purchaseCents: 600000, flourBefore: 0, flourAfter: 5000,
    bagsBefore: 0, countedBagsMilli: 12000, countDelta: 12000,
    countReason: 'Carga inicial QA de bolsas terminadas', openingCents: 1000000,
    sales: [{ label: 'QA-J1-V1', quantityMilli: 3000, totalCents: 750150,
      method: 'EFECTIVO', bagsAfter: 9000, cashAfter: 1750150 }],
    expenseLabel: 'QA-J1-G1', category: 'TRANSPORTE', expenseCents: 150000,
    cashSalesCents: 750150, transferCents: 0, totalSalesCents: 750150,
    expectedCents: 1600150, countedCents: 1600150, differenceCents: 0, closeNotes: '',
    counts: { purchases: 1, receipts: 1, counts: 1, sales: 1, expenses: 1, closed: 1, movements: 3 },
    bagsAfter: 9000,
  },
  {
    name: 'J2: fondo nuevo, transferencia y faltante explicado, sin alterar J1',
    number: 2, purchaseReference: 'QA-C02', purchasedMilli: 2000,
    purchaseCents: 240000, flourBefore: 5000, flourAfter: 7000,
    bagsBefore: 9000, countedBagsMilli: 15000, countDelta: 6000,
    countReason: 'Carga QA de seis bolsas terminadas', openingCents: 500000,
    sales: [
      { label: 'QA-J2-V1', quantityMilli: 4000, totalCents: 1000200,
        method: 'TRANSFERENCIA', bagsAfter: 11000, cashAfter: 500000 },
      { label: 'QA-J2-V2', quantityMilli: 2000, totalCents: 500100,
        method: 'EFECTIVO', bagsAfter: 9000, cashAfter: 1000100 },
    ],
    expenseLabel: 'QA-J2-G1', category: 'ALQUILER', expenseCents: 50000,
    cashSalesCents: 500100, transferCents: 1000200, totalSalesCents: 1500300,
    expectedCents: 950100, countedCents: 940100, differenceCents: -10000,
    closeNotes: 'Faltante ficticio QA de 100 pesos',
    counts: { purchases: 2, receipts: 2, counts: 2, sales: 3, expenses: 2, closed: 2, movements: 7 },
    bagsAfter: 9000,
  },
  {
    name: 'J3: rechazo sin stock, agotamiento, cierre exacto y tres cierres intactos',
    number: 3, purchaseReference: 'QA-C03', purchasedMilli: 1000,
    purchaseCents: 120000, flourBefore: 7000, flourAfter: 8000,
    bagsBefore: 9000, countedBagsMilli: null, openingCents: 200000,
    sales: [{ label: 'QA-J3-V1', quantityMilli: 9000, totalCents: 2250450,
      method: 'EFECTIVO', bagsAfter: 0, cashAfter: 2450450 }],
    expenseLabel: 'QA-J3-G1', category: 'TRANSPORTE', expenseCents: 450450,
    cashSalesCents: 2250450, transferCents: 0, totalSalesCents: 2250450,
    expectedCents: 2000000, countedCents: 2000000, differenceCents: 0, closeNotes: '',
    counts: { purchases: 3, receipts: 3, counts: 2, sales: 4, expenses: 3, closed: 3, movements: 9 },
    bagsAfter: 0,
  },
]

test('demoGateway real: jornadas consecutivas J1 → J2 → J3, persistencia y reintentos', async (t) => {
  const h = await createHarness(t)
  assert.equal(h.storage.length, 0, 'only the explicit empty fake storage is used')
  assert.ok(h.storage.reads > 0, 'module initialization must read localStorage')
  const business = await h.invoke('createBusiness', [{
    name: 'WALOS QA Jornadas', category: 'Pruebas ficticias', kind: 'PRODUCTOS', description: '',
  }])
  const businessId = business.id
  const location = await h.invoke('createLocation', [businessId, {
    name: 'Puesto QA', kind: 'LOCAL', address: '', mapUrl: '', canSell: true, canStore: true,
  }])
  const supplier = await h.invoke('createSupplier', [businessId, {
    name: 'Proveedor QA', offerings: '', contactPerson: '', phone: '', whatsapp: '', email: '',
    address: '', mapsUrl: '', website: '', instagram: '', paymentMethods: [], promotions: [], notes: '',
  }])
  const catalog = {
    category: 'QA', description: '', observations: '', referenceCostCents: null,
  }
  const flour = await h.invoke('createCatalogItem', [businessId, {
    ...catalog, name: 'Harina QA', sku: 'QA-HAR', kind: 'INSUMO', unit: 'KILOGRAMO',
    sellable: false, priceCents: null, referenceCostCents: 120000,
  }])
  const bags = await h.invoke('createCatalogItem', [businessId, {
    ...catalog, name: 'Bocaditos QA, bolsa terminada', sku: 'QA-BOC', kind: 'ELABORADO',
    unit: 'UNIDAD', sellable: true, priceCents: 250050,
  }])
  const closedSessions = new Map()
  const prefix = (kind) => requestId(`demo-${kind}`)
  const state = () => h.api.demoStore.getSnapshot()
  const scoped = (map) => Object.values(state()[map]).filter((item) => item.businessId === businessId)
  const ledger = () => h.api.listDemoInventoryMovements(state(), businessId)

  function assertStock(flourMilli, bagsMilli) {
    assert.equal(h.api.inventoryBalanceMilli(state(), businessId, flour.id, location.id), flourMilli, 'Harina QA')
    assert.equal(h.api.inventoryBalanceMilli(state(), businessId, bags.id, location.id), bagsMilli, 'Bocaditos QA')
    const movements = ledger()
    assert.ok(movements.every((m) => m.businessId === businessId && m.locationId === location.id))
    for (const [item, expected] of [[flour, flourMilli], [bags, bagsMilli]]) {
      assert.equal(movements.filter((m) => m.catalogItemId === item.id)
        .reduce((total, m) => total + m.deltaMilli, 0), expected, 'ledger and balance must agree')
    }
  }

  function assertOldCloses() {
    for (const [id, frozen] of closedSessions) {
      assert.deepEqual(state().cashSessionsById[id], frozen, 'historical close changed')
    }
  }

  function cashTotals(sessionId) {
    return h.api.cashSessionTotals(state().cashSessionsById[sessionId],
      scoped('salesById'), scoped('expensesById'))
  }

  function assertCounts(expected) {
    assert.deepEqual({
      purchases: scoped('purchasesById').length,
      receipts: scoped('purchasesById').filter((p) => p.receipt !== null).length,
      counts: scoped('inventoryOperationsById').filter((op) => op.kind === 'COUNT').length,
      sales: scoped('salesById').length,
      expenses: scoped('expensesById').length,
      closed: scoped('cashSessionsById').filter((s) => s.status === 'CERRADA').length,
      movements: ledger().length,
    }, expected, 'PO cumulative document and movement oracle')
    assert.equal(scoped('inventoryOperationsById').length, expected.counts, 'no implicit production or other stock operations')
    assert.equal(scoped('cashSessionsById').length, expected.closed, 'no duplicate or reopened cash session')
    assert.equal(new Set(ledger().map((m) => m.id)).size, expected.movements)
  }

  async function assertRejectedWithoutWrite(method, args, error) {
    const before = h.snapshot()
    const persisted = h.storage.serialized()
    const writes = h.storage.writes
    await assert.rejects(() => h.invoke(method, args), error)
    assert.deepEqual(h.snapshot(), before, `${method}: rejected operation persisted state`)
    assert.equal(h.storage.serialized(), persisted)
    assert.equal(h.storage.writes, writes, 'rejected command must not write localStorage')
  }

  assertStock(0, 0)
  let completedDays = 0
  for (const day of days) {
    await t.test(day.name, async (step) => {
      if (completedDays !== day.number - 1) {
        step.skip('A previous dependent journey failed; do not reset or force balances')
        return
      }
      const commands = []
      async function command(method, args) {
        const original = copy(args)
        const result = await h.invoke(method, args)
        commands.push({ method, args: original, id: result.id })
        return result
      }
      assertStock(day.flourBefore, day.bagsBefore)
      assert.equal(h.api.activeCashSession(state(), businessId, location.id), undefined)
      assertOldCloses()
      const moneyBeforePurchase = copy({
        sessions: state().cashSessionsById, sales: state().salesById, expenses: state().expensesById,
      })

      const purchase = await command('registerPurchase', [businessId, {
        purchasedOn: '2026-11-06', supplierId: supplier.id, reference: day.purchaseReference, notes: '',
        lines: [{ catalogItemId: flour.id, description: flour.name, unit: 'KILOGRAMO',
          quantityMilli: day.purchasedMilli, unitCostCents: 120000 }],
      }, prefix('request')])
      assert.equal(purchase.totalCents, day.purchaseCents)
      assert.equal(purchase.receipt, null, 'registering a purchase is not receiving it')
      assertStock(day.flourBefore, day.bagsBefore)

      const receipt = await command('receivePurchase', [businessId, purchase.id, location.id])
      assert.equal(receipt.locationId, location.id)
      assert.equal(receipt.movements.length, 1)
      assert.equal(receipt.movements[0].quantityMilli, day.purchasedMilli)
      assert.equal(receipt.movements[0].catalogItemId, flour.id)
      assert.equal(receipt.movements[0].purchaseLineId, purchase.lines[0].id)
      assertStock(day.flourAfter, day.bagsBefore)
      assert.deepEqual({ sessions: state().cashSessionsById, sales: state().salesById,
        expenses: state().expensesById }, moneyBeforePurchase, 'purchase/receipt do not disburse cash')

      if (day.countedBagsMilli !== null) {
        const counted = await command('countInventory', [businessId, bags.id, location.id,
          day.countedBagsMilli, day.countReason, prefix('inventory-request')])
        assert.equal(counted.countedMilli, day.countedBagsMilli, 'count is absolute, not an increment')
        assert.equal(counted.deltaMilli, day.countDelta)
        assert.equal(counted.reason, day.countReason)
        assertStock(day.flourAfter, day.countedBagsMilli)
      }

      const session = await command('openCashSession', [businessId, location.id, day.openingCents, prefix('cash-open')])
      assert.equal(session.status, 'ABIERTA')
      assert.equal(session.closeSnapshot, null)
      assert.equal(session.locationId, location.id)
      assert.equal(session.openedBy, 'demo-user')
      assert.deepEqual(cashTotals(session.id), {
        cashSalesCents: 0, cashExpensesCents: 0, expectedCashCents: day.openingCents,
        saleIds: [], expenseIds: [],
      }, 'each opening declares its own fund and excludes earlier days')

      function saleInput(quantityMilli, totalCents, method, notes) {
        return { locationId: location.id, lines: [{ catalogItemId: bags.id, quantityMilli,
          unitPriceCents: 250050 }], discountCents: 0,
        payments: [{ method, amountCents: totalCents }], notes }
      }
      let rejectedSaleRequest
      if (day.number === 3) {
        rejectedSaleRequest = prefix('sale-request')
        await assertRejectedWithoutWrite('registerSale', [businessId,
          saleInput(10000, 2500500, 'EFECTIVO', 'QA-J3-RECHAZADA'), rejectedSaleRequest], /insuficiente/i)
        assertStock(8000, 9000)
        assert.equal(cashTotals(session.id).expectedCashCents, 200000)
      }

      const sales = []
      for (const sale of day.sales) {
        const sold = await command('registerSale', [businessId,
          saleInput(sale.quantityMilli, sale.totalCents, sale.method, sale.label), prefix('sale-request')])
        sales.push(sold)
        assert.equal(sold.notes, sale.label)
        assert.equal(sold.totalCents, sale.totalCents)
        assert.equal(sold.cashSessionId, session.id)
        assert.deepEqual(sold.payments, [{ method: sale.method, amountCents: sale.totalCents }])
        const out = ledger().filter((m) => m.operationId === sold.id)
        assert.equal(out.length, 1)
        assert.equal(out[0].type, 'VENTA_SALIDA')
        assert.equal(out[0].deltaMilli, -sale.quantityMilli)
        assertStock(day.flourAfter, sale.bagsAfter)
        assert.equal(cashTotals(session.id).expectedCashCents, sale.cashAfter)
      }
      assert.equal(sales.reduce((sum, sale) => sum + sale.totalCents, 0), day.totalSalesCents)
      assert.equal(sales.flatMap((sale) => sale.payments).filter((p) => p.method === 'TRANSFERENCIA')
        .reduce((sum, payment) => sum + payment.amountCents, 0), day.transferCents)

      const expense = await command('registerExpense', [businessId, {
        paidOn: '2026-11-06', locationId: location.id, category: day.category,
        description: day.expenseLabel, amountCents: day.expenseCents, paymentMethod: 'EFECTIVO', notes: '',
      }, prefix('expense-request')])
      assert.equal(expense.cashSessionId, session.id)
      assert.equal(expense.description, day.expenseLabel)
      assert.equal(expense.amountCents, day.expenseCents)
      assertStock(day.flourAfter, day.bagsAfter)
      const cashSaleIds = sales.filter((sale) => sale.payments.some((p) => p.method === 'EFECTIVO')).map((sale) => sale.id)
      assert.deepEqual(cashTotals(session.id), {
        cashSalesCents: day.cashSalesCents, cashExpensesCents: day.expenseCents,
        expectedCashCents: day.expectedCents, saleIds: cashSaleIds, expenseIds: [expense.id],
      })

      const closeRequestId = prefix('cash-close')
      if (day.differenceCents !== 0) {
        await assertRejectedWithoutWrite('closeCashSession', [businessId, session.id,
          { countedCashCents: day.countedCents, notes: '' }, closeRequestId], /Explicá la diferencia/)
        assert.equal(state().cashSessionsById[session.id].status, 'ABIERTA')
        assert.equal(state().cashSessionsById[session.id].closeSnapshot, null)
        assert.equal(state().cashSessionsById[session.id].closeRequestId, null)
      }
      const closed = await command('closeCashSession', [businessId, session.id,
        { countedCashCents: day.countedCents, notes: day.closeNotes }, closeRequestId])
      assert.equal(closed.status, 'CERRADA')
      assert.equal(closed.closeRequestId, closeRequestId)
      assert.deepEqual(closed.closeSnapshot, {
        openingCashCents: day.openingCents, cashSalesCents: day.cashSalesCents,
        cashExpensesCents: day.expenseCents, expectedCashCents: day.expectedCents,
        countedCashCents: day.countedCents, differenceCents: day.differenceCents,
        saleIds: cashSaleIds, expenseIds: [expense.id], closedBy: 'demo-user',
        closedAt: new Date().toISOString(), notes: day.closeNotes,
      })
      closedSessions.set(closed.id, copy(closed))
      assertStock(day.flourAfter, day.bagsAfter)
      assertCounts(day.counts)
      assertOldCloses()

      // R: discard the Vite module instance; hydrate only from the fake Storage.
      const beforeReload = h.snapshot()
      const previousGateway = h.api.demoGateway
      const reads = h.storage.reads
      const persisted = h.storage.serialized()
      const writes = h.storage.writes
      await h.reload()
      assert.notEqual(h.api.demoGateway, previousGateway, 'reload must execute fresh module initialization')
      assert.ok(h.storage.reads > reads)
      assert.deepEqual(h.snapshot(), beforeReload, 'reload must preserve every ID, relationship and close snapshot')
      assert.equal(h.storage.serialized(), persisted)

      for (const saved of commands) {
        let expected
        if (saved.method === 'receivePurchase') expected = beforeReload.purchasesById[saved.args[1]].receipt
        else {
          const map = { registerPurchase: 'purchasesById', countInventory: 'inventoryOperationsById',
            openCashSession: 'cashSessionsById', closeCashSession: 'cashSessionsById',
            registerSale: 'salesById', registerExpense: 'expensesById' }[saved.method]
          expected = beforeReload[map][saved.id]
        }
        const retried = await h.invoke(saved.method, saved.args)
        assert.equal(retried.id, saved.id, `${saved.method}: retry must return the original ID`)
        assert.deepEqual(copy(retried), expected, `${saved.method}: resource changed on identical retry`)
        assert.deepEqual(h.snapshot(), beforeReload, `${saved.method}: retry changed stock, cash or documents`)
      }
      await assertRejectedWithoutWrite('closeCashSession', [businessId, session.id,
        { countedCashCents: day.countedCents, notes: day.closeNotes }, prefix('cash-close')], /ya está cerrada/)
      assert.equal(h.storage.writes, writes, 'hydration/retries must not rewrite successful operations')
      assert.equal(h.storage.serialized(), persisted)
      assert.equal(h.api.activeCashSession(state(), businessId, location.id), undefined)
      assertStock(day.flourAfter, day.bagsAfter)
      assertCounts(day.counts)
      assertOldCloses()
      if (rejectedSaleRequest) {
        assert.ok(!scoped('salesById').some((sale) => sale.requestId === rejectedSaleRequest))
        assert.ok(!ledger().some((m) => m.reason.includes('RECHAZADA')))
      }
      completedDays++
    })
  }
  assert.equal(completedDays, 3, 'all dependent PO journeys must have executed')
})
