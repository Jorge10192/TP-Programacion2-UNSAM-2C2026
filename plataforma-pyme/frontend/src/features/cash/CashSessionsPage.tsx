import { useOnlineDraft } from '../common/useOnlineDraft'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../app/Icon'
import { useAppData } from '../../data/dataContext'
import type { Business, Location, Sale } from '../../data/models'
import { moneyDisplay, parseMoneyCents } from '../../data/demo/catalogPolicy'
import { cashSessionTotals } from '../../data/demo/cashPolicy'
import type { CashSession, Expense } from '../../data/demo/cashPolicy'

export function CashSessionsPage({ business, locations, sessions, sales, expenses }: {
  business: Business
  locations: Location[]
  sessions: CashSession[]
  sales: Sale[]
  expenses: Expense[]
}) {
  const { gateway, mode, snapshot } = useAppData()
  const [scope, setScope] = useState(mode === 'api' ? 'principal' : '')
  const [openingAmount, setOpeningAmount] = useState('0')
  const [openId, setOpenId] = useState(() => 'demo-cash-open-' + crypto.randomUUID())
  const [closeId, setCloseId] = useState(() => 'demo-cash-close-' + crypto.randomUUID())
  const [toCloseId, setToCloseId] = useState<string | null>(null)
  const [countedAmount, setCountedAmount] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [closeError, setCloseError] = useState('')
  const [closeReasonInvalid, setCloseReasonInvalid] = useState(false)
  const closeNotesRef = useRef<HTMLTextAreaElement>(null)
  const closeErrorRef = useRef<HTMLParagraphElement>(null)
  const [notice, setNotice] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)

  const { markSaved } = useOnlineDraft(Boolean(toCloseId && (countedAmount || closeNotes)) || openingAmount !== '0', busy)
  const openSessions = sessions.filter(s => s.status === 'ABIERTA')
  const closedSessions = sessions.filter(s => s.status === 'CERRADA')
  const eligibleLocations = locations.filter(loc => loc.status === 'ACTIVA' && loc.canSell)
  const openAtSelected = openSessions.find(session => session.locationId === (scope || null))
  const closing = openSessions.find(session => session.id === toCloseId)
  const selectedDetail = sessions.find(session => session.id === detailId)

  useEffect(() => {
    if (!closeError) return
    const target = closeReasonInvalid ? closeNotesRef.current : closeErrorRef.current
    target?.focus()
    target?.scrollIntoView({ block: closeReasonInvalid ? 'center' : 'nearest' })
  }, [closeError, closeReasonInvalid])

  function scopeLabel(locationId: string | null) {
    return locations.find(location => location.id === locationId)?.name ?? 'Caja general · sin ubicación física'
  }
  function totals(session: CashSession) {
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
      const session = await gateway.openCashSession(business.id, scope || null, value, openId)
      setOpenId('demo-cash-open-' + crypto.randomUUID())
      setOpeningAmount('0')
      markSaved()
      setNotice('Jornada abierta para ' + scopeLabel(session.locationId) + '. Los cobros y gastos en efectivo nuevos se asociarán a esta caja.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo abrir la caja.')
    } finally { setBusy(false) }
  }
  async function closeSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !closing) return
    setBusy(true); setError(''); setCloseError(''); setCloseReasonInvalid(false); setNotice('')
    try {
      const value = parseMoneyCents(countedAmount)
      if (value === null) throw new Error('Ingresá el efectivo contado.')
      const closed = await gateway.closeCashSession(business.id, closing.id, {
        countedCashCents: value, notes: closeNotes,
      }, closeId)
      markSaved()
      setNotice((mode === 'api' ? 'Cierre guardado: ' : 'Cierre guardado con snapshot inmutable: ') + scopeLabel(closed.locationId) + '.')
      setToCloseId(null); setDetailId(closed.id); setCountedAmount(''); setCloseNotes('')
      setCloseId('demo-cash-close-' + crypto.randomUUID())
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'No se pudo cerrar la jornada.'
      setCloseError(message)
      // Classify the existing server/demo rejection for field feedback; the gateway still owns validation.
      setCloseReasonInvalid(message.startsWith('Explicá la diferencia entre el efectivo esperado y el contado'))
    } finally { setBusy(false) }
  }

  return <>
    <div className="page-heading"><div>
      <p className="eyebrow">JORNADA · EMPRESA</p><h1>Caja</h1>
      <p>Abrí la caja de {business.name} antes de vender y cerrala con el efectivo contado.</p>
    </div></div>
    <section className="sales-kpis">
      <div><span className="feature-icon mint"><Icon name="wallet"/></span><small>Jornadas abiertas</small><strong>{openSessions.length}</strong></div>
      <div><span className="feature-icon blue"><Icon name="receipt"/></span><small>Cierres guardados</small><strong>{closedSessions.length}</strong></div>
      <div><span className="feature-icon violet"><Icon name="building"/></span><small>Ubicaciones habilitadas para vender</small><strong>{eligibleLocations.length}</strong></div>
    </section>
    <div className="informational-note"><Icon name="shield" size={18}/><span><strong>Caja física.</strong>
      Fondo inicial + ventas en efectivo − gastos en efectivo. Los medios digitales no modifican este saldo.
    </span></div>
    {notice && <p className="form-message success" role="status">{notice}</p>}
    {error && <p className="form-message error" role="alert">{error}</p>}

    {(mode === 'demo' || openSessions.length === 0) && <details className="cash-opening-options" open={openSessions.length === 0}>
      <summary>{openSessions.length > 0 ? 'Abrir otra caja (opcional)' : 'Abrir la caja de esta jornada'}</summary>
    <section className="form-panel cash-form">
      <div className="business-section-heading"><div><Icon name="plus" size={21}/><h2>Fondo inicial</h2></div>
        <span>Una jornada abierta por ubicación</span></div>
      <form className="demo-form" onSubmit={(event) => void openSession(event)}>
        <div className="cash-form-grid">
          <label className="form-field"><span>Ubicación / caja *</span><select value={scope}
            onChange={event => { setScope(event.target.value); setError('') }}>
            {mode === 'demo' && <option value="">Caja general (sin ubicación física)</option>}
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
        <div className="form-actions"><button type="submit" disabled={busy || Boolean(openAtSelected) || (mode === 'api' && snapshot?.apiCapabilities?.cash !== true)} className="button button-primary">
          <Icon name="plus" size={17}/>{busy ? 'Guardando…' : 'Abrir caja'}
        </button></div>
      </form>
    </section>
    </details>}

    <section className="form-panel cash-history">
      <div className="business-section-heading"><div><Icon name="wallet" size={21}/><h2>Jornadas abiertas</h2></div>
        <span>{openSessions.length} activas</span></div>
      {openSessions.length ? <div className="cash-session-grid">{openSessions.map(session => {
        const summary = totals(session)
        return <article key={session.id} className="cash-session-card">
          <div className="cash-session-head"><span className="small-pill">ABIERTA</span><small>{new Date(session.openedAt).toLocaleString('es-AR', { hour12: false })}</small></div>
          <h3>{scopeLabel(session.locationId)}</h3>
          <div className="sales-receipt-totals">
            <span>Fondo inicial</span><strong>{moneyDisplay(session.openingCashCents)}</strong>
            <span>Ventas en efectivo</span><strong>+ {moneyDisplay(summary.cashSalesCents)}</strong>
            <span>Gastos en efectivo</span><strong>− {moneyDisplay(summary.cashExpensesCents)}</strong>
            <span>Efectivo esperado</span><strong>{moneyDisplay(summary.expectedCashCents)}</strong>
          </div>
          <p className="cash-quiet">{summary.saleIds.length} ventas en efectivo · {summary.expenseIds.length} gastos en efectivo vinculados</p>
          <button type="button" className="button button-primary" disabled={mode === 'api' && snapshot?.apiCapabilities?.cash !== true} onClick={() => {
            setToCloseId(session.id); setCountedAmount(''); setCloseNotes(''); setError(''); setCloseError(''); setCloseReasonInvalid(false); setNotice('');
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
        <button type="button" className="button button-secondary" onClick={() => { setToCloseId(null); setError(''); setCloseError(''); setCloseReasonInvalid(false) }}>
          <Icon name="close" size={16}/> Cancelar arqueo
        </button>
      </div>
      <p className="cash-quiet">Revisar el arqueo no bloquea las ventas. {mode === 'api' ? 'Al confirmar, se fija el corte y se guarda el cierre con los movimientos de esta caja.' : 'Al confirmar, se fija el corte y se guarda un snapshot inmutable con los movimientos de esta caja.'}</p>
      <div className="cash-close-preview">
        <div><small>Fondo inicial</small><strong>{moneyDisplay(closing.openingCashCents)}</strong></div>
        <div><small>Ingresos en efectivo</small><strong>{moneyDisplay(totals(closing).cashSalesCents)}</strong></div>
        <div><small>Egresos en efectivo</small><strong>{moneyDisplay(totals(closing).cashExpensesCents)}</strong></div>
        <div><small>Esperado</small><strong>{moneyDisplay(totals(closing).expectedCashCents)}</strong></div>
      </div>
      <form className="demo-form" aria-describedby={closeError && !closeReasonInvalid ? 'cash-close-error' : undefined} onSubmit={(event) => void closeSession(event)}>
        <div className="cash-form-grid">
          <label className="form-field"><span>Efectivo contado físicamente (ARS) *</span>
            <input required type="text" inputMode="decimal" value={countedAmount} onChange={event => { setCountedAmount(event.target.value); setCloseError(''); setCloseReasonInvalid(false) }}
              placeholder="Ingresá el importe contado, incluso si es 0"/>
          </label>
          <label className="form-field"><span id="cash-close-notes-label">Observación del cierre</span>
            <textarea ref={closeNotesRef} rows={2} maxLength={500} value={closeNotes} aria-labelledby="cash-close-notes-label" aria-invalid={closeReasonInvalid || undefined} aria-describedby={closeReasonInvalid ? 'cash-close-error' : undefined} onChange={event => { setCloseNotes(event.target.value); setCloseError(''); setCloseReasonInvalid(false) }}
              placeholder="Obligatoria si hay diferencia entre esperado y contado"/>
            {closeError && closeReasonInvalid && <span id="cash-close-error" className="form-message error" role="alert">{closeError}</span>}
          </label>
        </div>
        {(() => {
          try {
            const cents = parseMoneyCents(countedAmount)
            if (cents === null) return null
            const difference = cents - totals(closing).expectedCashCents
            return <p className={'cash-form-hint ' + (difference === 0 ? 'linked' : 'unlinked')}>
              <Icon name="receipt" size={17}/>
              Diferencia estimada: {moneyDisplay(difference)}. {difference === 0 ? 'Arqueo coincidente.' : 'Si confirmás una diferencia, explicá el motivo.'}
            </p>
          } catch {
            return <p className="cash-form-hint unlinked">Revisá el importe contado: no uses separadores de miles.</p>
          }
        })()}
        {closeError && !closeReasonInvalid && <p id="cash-close-error" ref={closeErrorRef} tabIndex={-1} className="form-message error" role="alert">{closeError}</p>}
        <div className="form-actions"><button type="submit" className="button button-primary" disabled={busy || (mode === 'api' && snapshot?.apiCapabilities?.cash !== true)}>
          <Icon name="shield" size={17}/>{busy ? 'Cerrando…' : 'Confirmar cierre y guardar arqueo'}
        </button></div>
      </form>
    </section>}

    <section className="form-panel cash-history">
      <div className="business-section-heading"><div><Icon name="receipt" size={21}/><h2>Historial de cierres</h2></div>
        <span>{closedSessions.length} {mode === 'api' ? 'cierres' : 'snapshots'}</span></div>
      {closedSessions.length ? <div className="cash-entry-list">{closedSessions.slice(0, 100).map(session => {
        const closed = session.closeSnapshot!
        return <div className="cash-entry" key={session.id}>
          <span className="feature-icon blue"><Icon name="shield"/></span>
          <div><strong>{scopeLabel(session.locationId)}</strong>
            <small>{new Date(closed.closedAt).toLocaleString('es-AR', { hour12: false })} · CERRADA · {closed.saleIds.length} ventas en efectivo · {closed.expenseIds.length} gastos en efectivo</small>
            <small>Diferencia del arqueo: {moneyDisplay(closed.differenceCents)}</small>
          </div>
          <strong>{moneyDisplay(closed.expectedCashCents)}</strong>
          <button type="button" className="button button-secondary" onClick={() => setDetailId(session.id)}>Ver cierre</button>
        </div>
      })}</div> : <div className="sales-empty"><Icon name="receipt" size={30}/><h3>Sin cierres registrados</h3><p>{mode === 'api' ? 'Cuando confirmes un arqueo, el cierre guardado quedará disponible aquí.' : 'Cuando confirmes un arqueo, el snapshot quedará disponible aquí.'}</p></div>}
    </section>

    {selectedDetail && selectedDetail.closeSnapshot && <section className="form-panel cash-close-panel" aria-label={mode === 'api' ? 'Detalle del cierre histórico' : 'Snapshot del cierre histórico'}>
      <div className="business-section-heading">
        <div><Icon name="shield" size={21}/><h2>Cierre guardado · {scopeLabel(selectedDetail.locationId)}</h2></div>
        <button className="button button-secondary" type="button" onClick={() => setDetailId(null)}><Icon name="close" size={16}/> Cerrar detalle</button>
      </div>
      <p className="cash-quiet">{mode === 'api' ? 'Cierre guardado del ' : 'Snapshot inmutable del '}{new Date(selectedDetail.closeSnapshot.closedAt).toLocaleString('es-AR', { hour12: false })} · Responsable: {mode === 'api' ? selectedDetail.closeSnapshot.closedBy.replace(/^user:([0-9]+)$/, 'Usuario $1') : selectedDetail.closeSnapshot.closedBy}</p>
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
      <div className="informational-note"><Icon name="shield" size={18}/><span>Este cierre no puede reabrirse ni editarse. No implica depósitos ni transferencias a cuentas bancarias.</span></div>
    </section>}
  </>
}
