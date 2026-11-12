import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiHttpError, ApiTransportError } from '../../api/httpClient.ts'
import { RealPhotoPreview } from '../photos/RealPhotos.tsx'
import { createOperationsGateway } from '../businesses/realOperationsGateway.ts'
import { createQrIntentGateway, qrIntentError } from './qrIntentGateway.ts'
import type { QrIntent, QrPaymentEvent, QrSimAction } from './qrIntentGateway.ts'
import './realQrIntent.css'

type Props = {
  token: string
  userId: string
  businessId: string
  intentId: string
  onNavigate: (path: string) => void
  onUnauthorized: () => void
}

const LAB_UI_ENABLED = import.meta.env.VITE_PYME_ENABLE_QR_DEMO_LAB === '1'
const ACTIONS: { action: QrSimAction; label: string }[] = [
  { action: 'APROBAR', label: 'Simular aprobación' },
  { action: 'RECHAZAR', label: 'Simular rechazo' },
  { action: 'EXPIRAR', label: 'Simular vencimiento' },
  { action: 'INDETERMINAR', label: 'Simular resultado incierto' },
]
const pesos = (c: number) => new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS',
}).format(c / 100)

function qty(milli: number): string {
  const i = Math.floor(milli / 1000)
  const fraction = String(milli % 1000).padStart(3, '0').replace(/0+$/, '')
  return fraction ? i + ',' + fraction : String(i)
}

export function RealQrIntentPage({
  token, userId, businessId, intentId, onNavigate, onUnauthorized,
}: Props) {
  const api = useMemo(() => createQrIntentGateway(token, businessId), [token, businessId])
  const operations = useMemo(() => createOperationsGateway(token, userId), [token, userId])
  const [intent, setIntent] = useState<QrIntent | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [siteName, setSiteName] = useState('')
  const [isManager, setIsManager] = useState(false)
  const [events, setEvents] = useState<QrPaymentEvent[]>([])
  const [uncertain, setUncertain] = useState(false)
  const actionRef = useRef<{action: QrSimAction; key: string} | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true); setError(''); setIntent(null)
    void Promise.all([
      api.get(intentId, ctrl.signal),
      api.events(intentId, ctrl.signal),
      operations.business(businessId, ctrl.signal),
      operations.locations(businessId, ctrl.signal),
    ]).then(([qr, history, company, sites]) => {
      if (ctrl.signal.aborted) return
      setIntent(qr)
      setEvents(history)
      setIsManager(['TITULAR_ADMINISTRATIVO','ADMINISTRADOR'].includes(company.membership.role) &&
        company.status === 'ACTIVA')
      setCompanyName(company.name)
      setSiteName(sites.find(site => site.id === qr.location_id)?.name ?? '')
    }).catch(err => {
      if (ctrl.signal.aborted) return
      if (err instanceof ApiHttpError && err.status === 401) onUnauthorized()
      else setError(qrIntentError(err))
    }).finally(() => { if (!ctrl.signal.aborted) setLoading(false) })
    return () => ctrl.abort()
  }, [api, intentId, businessId, operations, onUnauthorized])

  const secondsRemaining = intent ? Math.max(0, Math.ceil((Date.parse(intent.expires_at) - now) / 1000)) : 0
  const displayStatus = intent && intent.status === 'ESPERANDO_PAGO' && secondsRemaining === 0
    ? 'EXPIRADA' : intent?.status
  async function refresh() {

    if (busy || !intent) return
    setBusy(true); setError('')
    try {
      const [current, history] = await Promise.all([api.get(intentId), api.events(intentId)])
      setIntent(current); setEvents(history)
      if (actionRef.current && history.some(event => event.event_key === actionRef.current?.key)) {
        setUncertain(false); actionRef.current = null
      }
    } catch (err) {
      if (err instanceof ApiHttpError && err.status === 401) onUnauthorized()
      else setError(qrIntentError(err))
    } finally { setBusy(false) }
  }
  async function cancel() {
    if (busy || displayStatus !== 'ESPERANDO_PAGO') return
    if (!window.confirm('¿Cancelar este intento QR de prueba? No se generó una venta.')) return
    setBusy(true); setError('')
    try {
      const result = await api.cancel(intentId)
      setIntent(result)
      setEvents(await api.events(intentId))
    }
    catch (err) {
      if (err instanceof ApiHttpError && err.status === 401) onUnauthorized()
      else setError(qrIntentError(err))
    } finally { setBusy(false) }
  }

  async function simulate(action: QrSimAction, replay = false) {
    if (!LAB_UI_ENABLED || !isManager || busy || !intent ||
        !['ESPERANDO_PAGO','INDETERMINADA'].includes(intent.status) ||
        (secondsRemaining === 0 && action !== 'EXPIRAR')) return
    if (uncertain && !replay) return
    if (!replay) actionRef.current = { action, key: crypto.randomUUID() }
    const original = actionRef.current
    if (!original) return
    setBusy(true); setError('')
    try {
      const result = await api.simulate(intentId, original.action, original.key)
      const history = await api.events(intentId)
      setIntent(result); setEvents(history)
      setUncertain(false); actionRef.current = null
    } catch (err) {
      const unknown = err instanceof ApiTransportError || (err instanceof ApiHttpError && err.status >= 500)
      if (unknown) setUncertain(true)
      else { actionRef.current = null; setUncertain(false) }
      if (err instanceof ApiHttpError && err.status === 401) onUnauthorized()
      else setError(qrIntentError(err))
    } finally { setBusy(false) }
  }

  return <section className="real-auth-card real-business-panel e3-qr-page" aria-label="Cobro Mercado Pago QR DEMO">
    <div className="e3-qr-heading">
      <div>
        <p className="e3-qr-eyebrow">Punto de venta · Cobro individual</p>
        <h1>Mercado Pago QR <span>DEMO</span></h1>
        <p>Desglose completo del importe de esta venta, almacenado en PostgreSQL.</p>
      </div>
      <button type="button" className="real-auth-secondary" disabled={busy}
        onClick={() => onNavigate('/real/empresas/' + businessId + '/pos')}>Volver al POS</button>
    </div>

    <p className="e3-qr-warning" role="note"><strong>SIMULACIÓN · NO COBRABLE.</strong> Este QR solo codifica una referencia de prueba. No es una orden de Mercado Pago y no se recibe dinero real. Tampoco se registra una venta ni se reserva/descuenta stock al generarlo.</p>
    {loading && <p role="status">Cargando QR y detalle original desde la API…</p>}
    {error && <p className="real-auth-message real-auth-error" role="alert">{error}</p>}
    {intent && !loading && <div className="e3-qr-layout">
      <div className="e3-qr-visual-panel">
        <div className="e3-qr-status" role="status">
          {displayStatus === 'ESPERANDO_PAGO' ? 'Esperando pago de prueba' :
            displayStatus === 'EXPIRADA' ? 'QR vencido' :
            displayStatus === 'CANCELADA' ? 'QR cancelado' : displayStatus}
        </div>
        <img src={intent.qr_png_data_uri} alt="QR escaneable de identificación DEMO, no se puede pagar"
          className="e3-qr-image" width="320" height="320"/>
        <strong className="e3-qr-not-payable">QR DE PRUEBA · NO COBRABLE</strong>
        <p className="e3-qr-total">{pesos(intent.total_cents)}</p>
        <p className="e3-qr-clock">{
          displayStatus === 'ESPERANDO_PAGO'
            ? 'Vence en ' + Math.floor(secondsRemaining / 60) + ':' +
              String(secondsRemaining % 60).padStart(2, '0')
            : 'Vencimiento: ' + new Date(intent.expires_at).toLocaleString('es-AR')
        }</p>
        <p className="e3-qr-reference">Referencia de prueba: <code>{intent.reference}</code></p>
        <div className="e3-qr-buttons">
          <button type="button" className="real-auth-secondary" disabled={busy}
            onClick={() => void refresh()}>{busy ? 'Consultando…' : 'Consultar estado'}</button>
          {displayStatus === 'ESPERANDO_PAGO' &&
            <button type="button" className="real-auth-secondary" disabled={busy}
              onClick={() => void cancel()}>Cancelar QR</button>}
        </div>
      </div>
      <div className="e3-qr-details">
        {LAB_UI_ENABLED && isManager && <div className="e3-qr-lab" aria-label="Laboratorio de cobros ficticios">
          <h2>Laboratorio QR · Solo pruebas</h2>
          <p><strong>Este laboratorio NO valida un cobro Mercado Pago.</strong> Solo cambia el estado DEMO del intento y registra un evento auditado. No crea ventas ni modifica stock.</p>
          {intent.status === 'ESPERANDO_PAGO' || intent.status === 'INDETERMINADA'
            ? <div className="e3-qr-lab-actions">
              {!uncertain && ACTIONS.filter(row =>
                (secondsRemaining > 0 || row.action === 'EXPIRAR') &&
                (row.action !== 'INDETERMINAR' || intent.status === 'ESPERANDO_PAGO')
              ).map(({action,label})=>
                <button key={action} type="button" className="real-auth-secondary"
                  disabled={busy}
                  onClick={()=>void simulate(action)}>{label}</button>)}
              {uncertain && <>
                <p role="alert">Resultado incierto: consultá el estado antes de intentar otra acción.</p>
                <button type="button" className="real-auth-secondary" disabled={busy}
                  onClick={()=>void refresh()}>Consultar estado y eventos</button>
                <button type="button" className="real-auth-secondary" disabled={busy || !actionRef.current}
                  onClick={()=>{ if(actionRef.current) void simulate(actionRef.current.action,true) }}>
                  Reintentar mismo evento y clave
                </button>
              </>}
            </div>
            : <p role="status">El intento ya está resuelto; no pueden simularse nuevas transiciones.</p>}
        </div>}
        <div className="e3-qr-history">
          <h2>Historial de eventos</h2>
          <p>Registros del servidor, ordenados por secuencia. Ningún evento representa acreditación externa.</p>
          {events.length === 0 ? <p>Aún no hay eventos registrados para este intento.</p> :
            <ol>{events.map(e=><li key={e.id}>
              <strong>{e.action}</strong> · {e.from_status} → {e.to_status}
              <small>{new Date(e.created_at).toLocaleString('es-AR')} · Evento {e.sequence}</small>
            </li>)}</ol>}
        </div>
        <h2>Detalle de la venta</h2>
        <p><strong>Empresa:</strong> {companyName || 'Empresa activa'}</p>
        <p><strong>Ubicación:</strong> {intent.location_id ? siteName || 'Sede de venta' : 'Servicios sin sede'}</p>
        <div className="e3-qr-lines" aria-label="Renglones congelados del intento">
          {intent.lines.map(line => <div className="e3-qr-line" key={line.catalog_item_id}>
            <RealPhotoPreview token={token}
              owner={{kind: 'CATALOG', businessId, resourceId: line.catalog_item_id}}
              alt={'Foto actual de ' + line.description_snapshot} className="e3-qr-photo"/>
            <div className="e3-qr-line-body">
              <strong>{line.description_snapshot}</strong>
              <small>{qty(line.quantity_milli)} {line.unit_snapshot} × {pesos(line.unit_price_cents)}</small>
              {line.sku_snapshot && <small>SKU {line.sku_snapshot}</small>}
            </div>
            <strong>{pesos(line.line_total_cents)}</strong>
          </div>)}
        </div>
        <div className="e3-qr-totals">
          <p>Subtotal <strong>{pesos(intent.subtotal_cents)}</strong></p>
          <p>Descuento <strong>−{pesos(intent.discount_cents)}</strong></p>
          <p className="e3-qr-grand-total">Total a cobrar <strong>{pesos(intent.total_cents)}</strong></p>
        </div>
        {intent.notes && <p className="e3-qr-note"><strong>Nota interna:</strong> {intent.notes}</p>}
        <p className="e3-qr-footnote">Las imágenes son vistas actuales del catálogo; nombre, cantidad, precio e importes pertenecen al snapshot original. El laboratorio de B3 solo registra estados ficticios; el cierre de venta con control transaccional corresponde a B4.</p>
      </div>
    </div>}
  </section>
}
