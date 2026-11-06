import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../app/Icon'
import { demoGateway } from '../../data/demo/demoStore'
import type { DemoBusiness, DemoLocation, DemoSale } from '../../data/demo/demoStore'
import { moneyDisplay, parseMoneyCents } from '../../data/demo/catalogPolicy'
import { cashSessionTotals } from '../../data/demo/cashPolicy'
import type { DemoCashSession, DemoExpense } from '../../data/demo/cashPolicy'

export function CashSessionsPage({ business, locations, sessions, sales, expenses }: {
  business: DemoBusiness
  locations: DemoLocation[]
  sessions: DemoCashSession[]
  sales: DemoSale[]
  expenses: DemoExpense[]
}) {
  const [scope, setScope] = useState('')
  const [openingAmount, setOpeningAmount] = useState('0')
  const [openId, setOpenId] = useState(() => 'demo-cash-open-' + crypto.randomUUID())
  const [closeId, setCloseId] = useState(() => 'demo-cash-close-' + crypto.randomUUID())
  const [toCloseId, setToCloseId] = useState<string | null>(null)
  const [countedAmount, setCountedAmount] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)

  const openSessions = sessions.filter(s => s.status === 'ABIERTA')
  const closedSessions = sessions.filter(s => s.status === 'CERRADA')
  const eligibleLocations = locations.filter(loc => loc.status === 'ACTIVA' && loc.canSell)
  const openAtSelected = openSessions.find(session => session.locationId === (scope || null))
  const closing = openSessions.find(session => session.id === toCloseId)
  const selectedDetail = sessions.find(session => session.id === detailId)

  function scopeLabel(locationId: string | null) {
    return locations.find(location => location.id === locationId)?.name ?? 'Caja general · sin ubicación física'
  }
  function totals(session: DemoCashSession) {
    return session.status === 'CERRADA' && session.closeSnapshot ?
      session.closeSnapshot : cashSessionTotals(session, sales, expenses)
  }
  async function openSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      const value = parseMoneyCents(openingAmount)
      if (value === null) throw new Error('Ingresá un fondo inicial en pesos. Podés usar 0.')
      const session = await demoGateway.openCashSession(business.id, scope || null, value, openId)
      setOpenId('demo-cash-open-' + crypto.randomUUID())
      setNotice('Jornada DEMO abierta para ' + scopeLabel(session.locationId) + '. Los cobros y gastos en efectivo nuevos se asociarán a esta caja.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo abrir la caja.')
    } finally { setBusy(false) }
  }
  async function closeSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !closing) return
    setBusy(true); setError(''); setNotice('')
    try {
      const value = parseMoneyCents(countedAmount)
      if (value === null) throw new Error('Ingresá el efectivo contado.')
      const closed = await demoGateway.closeCashSession(business.id, closing.id, {
        countedCashCents: value, notes: closeNotes,
      }, closeId)
      setNotice('Cierre DEMO guardado con snapshot inmutable: ' + scopeLabel(closed.locationId) + '.')
      setToCloseId(null); setDetailId(closed.id); setCountedAmount(''); setCloseNotes('')
      setCloseId('demo-cash-close-' + crypto.randomUUID())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo cerrar la jornada.')
    } finally { setBusy(false) }
  }

  return <>
    <div className="page-heading"><div>
      <p className="eyebrow">CAJA · EMPRESA DEMO</p><h1>Apertura y cierre</h1>
      <p>Controlá el efectivo de las jornadas de {business.name}, por ubicación y con arqueo obligatorio.</p>
    </div></div>
    <section className="sales-kpis">
      <div><span className="feature-icon mint"><Icon name="wallet"/></span><small>Jornadas abiertas</small><strong>{openSessions.length}</strong></div>
      <div><span className="feature-icon blue"><Icon name="receipt"/></span><small>Cierres guardados</small><strong>{closedSessions.length}</strong></div>
      <div><span className="feature-icon violet"><Icon name="building"/></span><small>Ubicaciones habilitadas para vender</small><strong>{eligibleLocations.length}</strong></div>
    </section>
    <div className="informational-note"><Icon name="shield" size={18}/><span><strong>Caja física DEMO.</strong>
      Sólo se incluyen los pagos de ventas en efectivo y los gastos en efectivo registrados mientras esta jornada estaba abierta.
      Las ventas anteriores a la apertura, las compras sin pago y los medios digitales no son efectivo de caja.
      Los cierres no mueven inventario ni saldos bancarios.
    </span></div>
    {notice && <p className="form-message success" role="status">{notice}</p>}
    {error && <p className="form-message error" role="alert">{error}</p>}

    <section className="form-panel cash-form">
      <div className="business-section-heading"><div><Icon name="plus" size={21}/><h2>Abrir una jornada</h2></div>
        <span>Una jornada abierta por ubicación</span></div>
      <form className="demo-form" onSubmit={(event) => void openSession(event)}>
        <div className="cash-form-grid">
          <label className="form-field"><span>Ubicación / caja *</span><select value={scope}
            onChange={event => { setScope(event.target.value); setError('') }}>
            <option value="">Caja general (sin ubicación física)</option>
            {eligibleLocations.map(location => <option value={location.id} key={location.id}>{location.name}</option>)}
          </select></label>
          <label className="form-field"><span>Fondo inicial contado (ARS) *</span>
            <input type="text" inputMode="decimal" value={openingAmount} required onChange={event => setOpeningAmount(event.target.value)} placeholder="Ej.: 5000,00"/>
          </label>
        </div>
        <p className="cash-form-hint">
          <Icon name="clock" size={17}/>{openAtSelected
            ? 'Ya existe una jornada abierta para esta caja. Primero cerrala con su arqueo para iniciar otra.'
            : 'La apertura registra el fondo físico inicial. Los medios digitales son independientes.'}
        </p>
        <div className="form-actions"><button type="submit" disabled={busy || Boolean(openAtSelected)} className="button button-primary">
          <Icon name="plus" size={17}/>{busy ? 'Guardando…' : 'Abrir caja DEMO'}
        </button></div>
      </form>
    </section>

    <section className="form-panel cash-history">
      <div className="business-section-heading"><div><Icon name="wallet" size={21}/><h2>Jornadas abiertas</h2></div>
        <span>{openSessions.length} activas</span></div>
      {openSessions.length ? <div className="cash-session-grid">{openSessions.map(session => {
        const summary = totals(session)
        return <article key={session.id} className="cash-session-card">
          <div className="cash-session-head"><span className="small-pill">ABIERTA</span><small>{new Date(session.openedAt).toLocaleString('es-AR')}</small></div>
          <h3>{scopeLabel(session.locationId)}</h3>
          <div className="sales-receipt-totals">
            <span>Fondo inicial</span><strong>{moneyDisplay(session.openingCashCents)}</strong>
            <span>Ventas en efectivo</span><strong>+ {moneyDisplay(summary.cashSalesCents)}</strong>
            <span>Gastos en efectivo</span><strong>− {moneyDisplay(summary.cashExpensesCents)}</strong>
            <span>Efectivo esperado</span><strong>{moneyDisplay(summary.expectedCashCents)}</strong>
          </div>
          <p className="cash-quiet">{summary.saleIds.length} ventas en efectivo · {summary.expenseIds.length} gastos en efectivo vinculados</p>
          <button type="button" className="button button-primary" onClick={() => {
            setToCloseId(session.id); setCountedAmount(''); setCloseNotes(''); setError(''); setNotice('');
            setCloseId('demo-cash-close-' + crypto.randomUUID())
          }}>Realizar arqueo y cerrar</button>
        </article>
      })}</div> : <div className="sales-empty"><Icon name="clock" size={31}/>
        <h3>No hay ninguna jornada abierta</h3><p>Podés comenzar una jornada cargando un fondo de efectivo.</p>
      </div>}
    </section>

    {closing && <section className="form-panel cash-close-panel" aria-label="Arqueo y cierre de jornada">
      <div className="business-section-heading">
        <div><Icon name="wallet" size={21}/><h2>Arqueo · {scopeLabel(closing.locationId)}</h2></div>
        <button type="button" className="button button-secondary" onClick={() => { setToCloseId(null); setError('') }}>
          <Icon name="close" size={16}/> Cancelar arqueo
        </button>
      </div>
      <p className="cash-quiet">Revisar el arqueo no bloquea las ventas. Al confirmar, se fija el corte y se guarda un snapshot inmutable con los movimientos de esta caja.</p>
      <div className="cash-close-preview">
        <div><small>Fondo inicial</small><strong>{moneyDisplay(closing.openingCashCents)}</strong></div>
        <div><small>Ingresos en efectivo</small><strong>{moneyDisplay(totals(closing).cashSalesCents)}</strong></div>
        <div><small>Egresos en efectivo</small><strong>{moneyDisplay(totals(closing).cashExpensesCents)}</strong></div>
        <div><small>Esperado</small><strong>{moneyDisplay(totals(closing).expectedCashCents)}</strong></div>
      </div>
      <form className="demo-form" onSubmit={(event) => void closeSession(event)}>
        <div className="cash-form-grid">
          <label className="form-field"><span>Efectivo contado físicamente (ARS) *</span>
            <input required type="text" inputMode="decimal" value={countedAmount} onChange={event => setCountedAmount(event.target.value)}
              placeholder="Ingresá el importe contado, incluso si es 0"/>
          </label>
          <label className="form-field"><span>Observación del cierre</span>
            <textarea rows={2} maxLength={500} value={closeNotes} onChange={event => setCloseNotes(event.target.value)}
              placeholder="Obligatoria si hay diferencia entre esperado y contado"/>
          </label>
        </div>
        {(() => {
          const cents = parseMoneyCents(countedAmount)
          if (cents === null) return null
          const difference = cents - totals(closing).expectedCashCents
          return <p className={'cash-form-hint ' + (difference === 0 ? 'linked' : 'unlinked')}>
            <Icon name="receipt" size={17}/>
            Diferencia estimada: {moneyDisplay(difference)}. {difference === 0 ? 'Arqueo coincidente.' : 'Si confirmás una diferencia, explicá el motivo.'}
          </p>
        })()}
        <div className="form-actions"><button type="submit" className="button button-primary" disabled={busy}>
          <Icon name="shield" size={17}/>{busy ? 'Cerrando…' : 'Confirmar cierre y guardar arqueo DEMO'}
        </button></div>
      </form>
    </section>}

    <section className="form-panel cash-history">
      <div className="business-section-heading"><div><Icon name="receipt" size={21}/><h2>Historial de cierres</h2></div>
        <span>{closedSessions.length} snapshots</span></div>
      {closedSessions.length ? <div className="cash-entry-list">{closedSessions.slice(0, 100).map(session => {
        const closed = session.closeSnapshot!
        return <div className="cash-entry" key={session.id}>
          <span className="feature-icon blue"><Icon name="shield"/></span>
          <div><strong>{scopeLabel(session.locationId)}</strong>
            <small>{new Date(closed.closedAt).toLocaleString('es-AR')} · CERRADA · {closed.saleIds.length} ventas · {closed.expenseIds.length} gastos en efectivo</small>
            <small>Diferencia del arqueo: {moneyDisplay(closed.differenceCents)}</small>
          </div>
          <strong>{moneyDisplay(closed.expectedCashCents)}</strong>
          <button type="button" className="button button-secondary" onClick={() => setDetailId(session.id)}>Ver cierre</button>
        </div>
      })}</div> : <div className="sales-empty"><Icon name="receipt" size={30}/><h3>Sin cierres registrados</h3><p>Cuando confirmes un arqueo, el snapshot quedará disponible aquí.</p></div>}
    </section>

    {selectedDetail && selectedDetail.closeSnapshot && <section className="form-panel cash-close-panel" aria-label="Snapshot del cierre histórico">
      <div className="business-section-heading">
        <div><Icon name="shield" size={21}/><h2>Cierre guardado · {scopeLabel(selectedDetail.locationId)}</h2></div>
        <button className="button button-secondary" type="button" onClick={() => setDetailId(null)}><Icon name="close" size={16}/> Cerrar detalle</button>
      </div>
      <p className="cash-quiet">Snapshot inmutable del {new Date(selectedDetail.closeSnapshot.closedAt).toLocaleString('es-AR')} · Responsable: Usuario DEMO</p>
      <div className="cash-close-preview">
        <div><small>Fondo inicial</small><strong>{moneyDisplay(selectedDetail.closeSnapshot.openingCashCents)}</strong></div>
        <div><small>Ventas en efectivo</small><strong>{moneyDisplay(selectedDetail.closeSnapshot.cashSalesCents)}</strong></div>
        <div><small>Gastos en efectivo</small><strong>{moneyDisplay(selectedDetail.closeSnapshot.cashExpensesCents)}</strong></div>
        <div><small>Efectivo esperado</small><strong>{moneyDisplay(selectedDetail.closeSnapshot.expectedCashCents)}</strong></div>
        <div><small>Efectivo contado</small><strong>{moneyDisplay(selectedDetail.closeSnapshot.countedCashCents)}</strong></div>
        <div><small>Diferencia</small><strong>{moneyDisplay(selectedDetail.closeSnapshot.differenceCents)}</strong></div>
      </div>
      <p>Observaciones: {selectedDetail.closeSnapshot.notes || 'Sin diferencia informada.'}</p>
      <details className="cash-detail-refs"><summary>Operaciones incluidas en el arqueo</summary>
        <strong>Ventas: {selectedDetail.closeSnapshot.saleIds.length}</strong>
        <div>{selectedDetail.closeSnapshot.saleIds.length ? selectedDetail.closeSnapshot.saleIds.map(id => <code key={id}>{id} </code>) : 'Sin ventas en efectivo'}</div>
        <strong>Gastos: {selectedDetail.closeSnapshot.expenseIds.length}</strong>
        <div>{selectedDetail.closeSnapshot.expenseIds.length ? selectedDetail.closeSnapshot.expenseIds.map(id => <code key={id}>{id} </code>) : 'Sin gastos en efectivo'}</div>
      </details>
      <div className="informational-note"><Icon name="shield" size={18}/><span>Este cierre no puede reabrirse ni editarse desde la DEMO. No implica depósitos ni transferencias a cuentas bancarias.</span></div>
    </section>}
  </>
}
