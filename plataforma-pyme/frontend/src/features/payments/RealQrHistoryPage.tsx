import { useEffect, useMemo, useState } from 'react'
import { ApiHttpError } from '../../api/httpClient.ts'
import { createQrIntentGateway, QR_HISTORY_PAGE_SIZE, qrIntentError } from './qrIntentGateway.ts'
import type { QrIntentSummary } from './qrIntentGateway.ts'
import { qrStatusPresentation } from './qrUx.ts'
import './realQrHistory.css'

type Props = {
  token: string
  businessId: string
  onNavigate: (path: string) => void
  onUnauthorized: () => void
}
const pesos = (amount: number): string => new Intl.NumberFormat('es-AR', {
  style:'currency', currency:'ARS',
}).format(amount / 100)

export function RealQrHistoryPage({ token, businessId, onNavigate, onUnauthorized }:Props) {
  const api = useMemo(() => createQrIntentGateway(token, businessId), [token,businessId])
  const [page, setPage] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [rows, setRows] = useState<QrIntentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const base = '/real/empresas/' + businessId

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError('')
    void api.list(page*QR_HISTORY_PAGE_SIZE, QR_HISTORY_PAGE_SIZE, ctrl.signal)
      .then(result=>{if(!ctrl.signal.aborted)setRows(result)})
      .catch(err=>{
        if(ctrl.signal.aborted)return
        setRows([])
        if(err instanceof ApiHttpError && err.status===401) onUnauthorized()
        else setError(qrIntentError(err))
      }).finally(()=>{if(!ctrl.signal.aborted)setLoading(false)})
    return ()=>ctrl.abort()
  },[api,page,refreshKey,onUnauthorized])

  return <section className="e3-qr-history-page" aria-label="Cobros QR de la empresa">
    <header className="e3-qr-history-head">
      <div>
        <span className="e3-qr-history-eyebrow">Operaciones · Mercado Pago DEMO</span>
        <h1>Cobros QR</h1>
        <p>Consultá intentos guardados en PostgreSQL, su estado y sus comprobantes de prueba. Los permisos se aplican desde la API de tu empresa.</p>
      </div>
      <div className="e3-qr-history-actions">
        <button type="button" className="real-auth-primary"
          onClick={()=>onNavigate(base+'/pos')}>Nueva venta en POS</button>
        <button type="button" className="real-auth-secondary"
          onClick={()=>onNavigate(base+'/medios-de-cobro')}>Medios de cobro</button>
      </div>
    </header>
    <p className="e3-qr-history-disclaimer" role="note">
      <strong>Modo DEMO.</strong> Estos QR no permiten pagar ni acreditar dinero real. Un estado «Aprobado» solo refleja el laboratorio; la venta QA se confirma por separado.
    </p>
    <div className="e3-qr-history-toolbar">
      <h2>Historial de intentos</h2>
      <button type="button" className="real-auth-secondary"
        disabled={loading} onClick={()=>setRefreshKey(x=>x+1)}>Actualizar listado</button>
    </div>
    {loading && <p role="status">Consultando cobros QR…</p>}
    {error && <div className="real-auth-message real-auth-error" role="alert">
      {error}
      <button type="button" className="real-auth-secondary" onClick={()=>setRefreshKey(x=>x+1)}>Reintentar consulta</button>
    </div>}
    {!loading && !error && rows.length===0 && <div className="e3-qr-history-empty">
      <strong>{page===0?'Todavía no hay cobros QR registrados':'No hay más resultados en esta página'}</strong>
      <p>{page===0?'Generá un QR desde el punto de venta. Lo verás aquí incluso después de recargar la sesión.':'Volvé a la página anterior para continuar la consulta.'}</p>
      <button type="button" className="real-auth-secondary"
        onClick={()=>page===0?onNavigate(base+'/pos'):setPage(p=>p-1)}>
        {page===0?'Ir al punto de venta':'Página anterior'}
      </button>
    </div>}
    {!loading && !error && rows.length>0 &&
      <div className="e3-qr-history-list" aria-label="Lista de cobros QR DEMO">
        {rows.map(qr=>{
          const state=qrStatusPresentation(qr.status)
          return <article key={qr.id} className="e3-qr-history-card">
            <div className="e3-qr-history-row">
              <span className="e3-qr-history-time">
                <strong>{new Date(qr.created_at).toLocaleDateString('es-AR')}</strong>
                <small>{new Date(qr.created_at).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}</small>
              </span>
              <div className="e3-qr-history-info">
                <strong className="e3-qr-history-amount">{pesos(qr.total_cents)}</strong>
                <span className="e3-qr-history-reference">{qr.reference}</span>
                <span className="e3-qr-history-description">{state.description}</span>
              </div>
              <div className="e3-qr-history-side">
                <span className={'e3-qr-state-pill e3-qr-tone-'+state.tone}>{state.title}</span>
                {qr.sale_id&&<small className="e3-qr-history-linked">Comprobante QA asociado</small>}
                <button type="button" className="real-auth-secondary"
                  onClick={()=>onNavigate(base+'/qr-cobros/'+qr.id)}>
                  Ver QR y detalle
                </button>
              </div>
            </div>
          </article>
        })}
      </div>}
    <nav className="e3-qr-history-pagination" aria-label="Paginación de cobros QR">
      <button type="button" className="real-auth-secondary"
        disabled={loading || page===0} onClick={()=>setPage(p=>p-1)}>Anterior</button>
      <span aria-live="polite">Página {page+1}</span>
      <button type="button" className="real-auth-secondary"
        disabled={loading || Boolean(error) || rows.length<QR_HISTORY_PAGE_SIZE}
        onClick={()=>setPage(p=>p+1)}>Siguiente</button>
    </nav>
  </section>
}
