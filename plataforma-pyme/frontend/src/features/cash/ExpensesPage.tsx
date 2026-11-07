import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../app/Icon'
import { demoGateway, activeCashSession } from '../../data/demo/demoStore'
import type { DemoBusiness, DemoLocation, DemoSnapshot } from '../../data/demo/demoStore'
import { moneyDisplay, parseMoneyCents } from '../../data/demo/catalogPolicy'
import { expenseCategories, expensePaymentLabels } from '../../data/demo/cashPolicy'
import type { DemoExpense, ExpenseCategory, ExpensePaymentMethod } from '../../data/demo/cashPolicy'
import { accountSupportsDeclaredPayment } from '../../data/demo/financialAccountPolicy'
import { listDemoFinancialAccounts } from '../../data/demo/demoStore'

const today = () => {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function ExpensesPage({ business, locations, expenses, snapshot }: {
  business: DemoBusiness; locations: DemoLocation[]; expenses: DemoExpense[]; snapshot: DemoSnapshot
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [requestId, setRequestId] = useState(() => 'demo-expense-request-' + crypto.randomUUID())
  const [paidOn, setPaidOn] = useState(today)
  const [category, setCategory] = useState<ExpenseCategory>('OTROS')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>('EFECTIVO')
  const [financialAccountId, setFinancialAccountId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [methodFilter, setMethodFilter] = useState('TODOS')
  const accounts = listDemoFinancialAccounts(snapshot, business.id)
  const sum = expenses.reduce((total, entry) => total + entry.amountCents, 0)
  const cash = expenses.filter(entry => entry.paymentMethod === 'EFECTIVO')
    .reduce((total, entry) => total + entry.amountCents, 0)
  const selectedSession = activeCashSession(snapshot, business.id, locationId || null)
  const filtered = expenses.filter((entry) =>
    (methodFilter === 'TODOS' || entry.paymentMethod === methodFilter) &&
    (!query.trim() || [entry.description, entry.notes, entry.category]
      .join(' ').toLocaleLowerCase('es-AR').includes(query.trim().toLocaleLowerCase('es-AR'))))

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const cents = parseMoneyCents(amount)
      if (cents === null) throw new Error('Ingresá un importe válido en pesos.')
      const record = await demoGateway.registerExpense(business.id, {
        paidOn, category, description, amountCents: cents, paymentMethod,
        financialAccountId: financialAccountId || null,
        locationId: locationId || null, notes,
      }, requestId)
      setNotice('Gasto DEMO registrado: ' + record.description +
        (record.cashSessionId ? '. Efectivo vinculado a la jornada abierta.' :
          '. No se actualizó ninguna cuenta bancaria ni saldo de caja fuera de jornada.'))
      setFormOpen(false)
      setRequestId('demo-expense-request-' + crypto.randomUUID())
      setDescription(''); setAmount(''); setNotes(''); setFinancialAccountId('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo registrar el gasto.')
    } finally { setBusy(false) }
  }

  return <>
    <div className="page-heading">
      <div><p className="eyebrow">FINANZAS · EMPRESA DEMO</p><h1>Gastos</h1>
        <p>Registrá egresos operativos de {business.name} y su medio de pago declarado.</p>
      </div>
      <button className="button button-primary" type="button" onClick={() => { setFormOpen((open) => !open); setError(''); setNotice('') }}>
        <Icon name={formOpen ? 'close' : 'plus'} size={18}/>{formOpen ? 'Cerrar formulario' : 'Registrar gasto'}
      </button>
    </div>
    <section className="sales-kpis">
      <div><span className="feature-icon blue"><Icon name="receipt"/></span><small>Egresos registrados</small><strong>{expenses.length}</strong></div>
      <div><span className="feature-icon violet"><Icon name="wallet"/></span><small>Total declarado (histórico)</small><strong>{moneyDisplay(sum)}</strong></div>
      <div><span className="feature-icon mint"><Icon name="credit"/></span><small>Pagos en efectivo declarados</small><strong>{moneyDisplay(cash)}</strong></div>
    </section>
    <div className="informational-note"><Icon name="shield" size={18}/><span>
      <strong>Registro DEMO, no conciliación bancaria.</strong> Una compra en Compras no representa automáticamente un gasto pagado.
      Los egresos se registran una sola vez aquí; sólo los gastos en efectivo asociados a una jornada abierta integran el arqueo de esa caja.
    </span></div>
    {notice && <p className="form-message success" role="status">{notice}</p>}
    {formOpen && <section className="form-panel cash-form">
      <div className="business-section-heading"><div><Icon name="wallet" size={21}/><h2>Nuevo gasto operativo</h2></div><span>Importes en ARS · sin desembolso real</span></div>
      <form className="demo-form" onSubmit={(event) => void submit(event)}>
        <div className="cash-form-grid">
          <label className="form-field"><span>Fecha del gasto *</span><input type="date" required value={paidOn} onChange={(e) => setPaidOn(e.target.value)}/></label>
          <label className="form-field"><span>Categoría *</span><select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
            {Object.entries(expenseCategories).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select></label>
          <label className="form-field"><span>Concepto *</span><input type="text" maxLength={140} required value={description}
            onChange={(e) => setDescription(e.target.value)} placeholder="Ej.: Bolsas, alquiler de puesto, flete…"/></label>
          <label className="form-field"><span>Importe (ARS) *</span><input type="text" inputMode="decimal" required value={amount}
            onChange={(e) => setAmount(e.target.value)} placeholder="Ej.: 12500,00"/></label>
          <label className="form-field"><span>Medio de pago declarado *</span><select value={paymentMethod}
            onChange={(e) => { setPaymentMethod(e.target.value as ExpensePaymentMethod); setFinancialAccountId('') }}>
            {Object.entries(expensePaymentLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select></label>
          {paymentMethod !== 'EFECTIVO' && paymentMethod !== 'TARJETA' && <label className="form-field">
            <span>Cuenta de origen declarada (opcional)</span>
            <select value={financialAccountId} onChange={event => setFinancialAccountId(event.target.value)}>
              <option value="">Sin asociar a cuenta</option>
              {accounts.filter(a => accountSupportsDeclaredPayment(a, paymentMethod)).map(a =>
                <option key={a.id} value={a.id}>{a.label} · {a.kind === 'BANCARIA' ? 'Banco' : 'Billetera'}{a.isPrimary ? ' · Principal' : ''}</option>)}
            </select>
            {paymentMethod === 'TRANSFERENCIA' && <small>También podés declarar una transferencia desde una billetera virtual.</small>}
          </label>
          <label className="form-field"><span>Ubicación (opcional, gasto general si se omite)</span>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">Gasto general de la empresa</option>
              {locations.filter(l => l.status === 'ACTIVA').map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select></label>
        </div>
        {paymentMethod === 'EFECTIVO' && <p className={'cash-form-hint ' + (selectedSession ? 'linked' : 'unlinked')}>
          <Icon name={selectedSession ? 'shield' : 'clock'} size={17}/>
          {selectedSession
            ? 'Este efectivo se asociará a la jornada abierta de esta ubicación y descontará del saldo esperado de caja.'
            : 'No hay jornada abierta para este destino. El gasto quedará registrado fuera de caja y no modificará ningún arqueo.'}
        </p>}
        {paymentMethod !== 'EFECTIVO' && <p className="cash-form-hint">
          <Icon name="credit" size={17}/> El medio digital se registra como declaración interna. Podés asociar una cuenta declarada de esta empresa. No se transfiere dinero ni se verifica el saldo bancario.
        </p>}
        <label className="form-field"><span>Observaciones (opcional)</span>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500}/>
        </label>
        {error && <p className="form-message error" role="alert">{error}</p>}
        <div className="form-actions"><button type="button" disabled={busy} className="button button-secondary"
          onClick={() => setFormOpen(false)}>Cancelar</button>
          <button type="submit" className="button button-primary" disabled={busy}>
            <Icon name="receipt" size={17}/>{busy ? 'Guardando…' : 'Registrar gasto DEMO'}
          </button>
        </div>
      </form>
    </section>}

    <section className="form-panel cash-history">
      <div className="business-section-heading"><div><Icon name="receipt" size={21}/><h2>Historial de gastos</h2></div>
        <span>{filtered.length} de {expenses.length}</span></div>
      <div className="cash-filters">
        <label className="form-field"><span>Buscar concepto o descripción</span><input type="search" value={query}
          onChange={e => setQuery(e.target.value)} placeholder="Buscar gastos…"/></label>
        <label className="form-field"><span>Medio de pago</span><select value={methodFilter} onChange={e => setMethodFilter(e.target.value)}>
          <option value="TODOS">Todos los medios</option>
          {Object.entries(expensePaymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
      </div>
      {filtered.length ? <div className="cash-entry-list">{filtered.slice(0, 100).map((entry) => <article key={entry.id} className="cash-entry">
        <span className="feature-icon blue"><Icon name="wallet"/></span>
        <div><strong>{entry.description}</strong><small>{entry.paidOn} · {expenseCategories[entry.category]} · {expensePaymentLabels[entry.paymentMethod]}</small>
          <small>{locations.find(l => l.id === entry.locationId)?.name ?? 'Gasto general'} · {entry.cashSessionId ? 'Asociado a caja' : 'Sin movimiento de caja'} · {new Date(entry.createdAt).toLocaleString('es-AR')}</small>
          {entry.financialAccountLabelSnapshot && <small>Cuenta de origen declarada: {entry.financialAccountLabelSnapshot}</small>}
          {entry.notes && <small>{entry.notes}</small>}</div>
        <strong>{moneyDisplay(entry.amountCents)}</strong>
      </article>)}</div> : <div className="sales-empty"><Icon name="wallet" size={30}/>
        <h3>{expenses.length ? 'Sin resultados para estos filtros' : 'Todavía no hay gastos'}</h3>
        <p>Los egresos de la empresa aparecerán acá, sin afectar el inventario.</p>
      </div>}
      {filtered.length > 100 && <p className="inventory-limit">Mostrando 100. Utilizá el buscador.</p>}
    </section>
  </>
}
