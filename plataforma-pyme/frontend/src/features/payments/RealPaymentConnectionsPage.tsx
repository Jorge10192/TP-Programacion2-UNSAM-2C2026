import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiHttpError } from '../../api/httpClient.ts'
import { createBusinessGateway, businessErrorMessage } from '../businesses/businessGateway.ts'
import type { RealBusiness } from '../businesses/businessGateway.ts'
import { createPaymentConnectionGateway } from './paymentConnectionGateway.ts'
import type { DemoPaymentConnection } from './paymentConnectionGateway.ts'
import './realPaymentConnections.css'

type Props = { token: string; userId: string; businessId: string; onUnauthorized: () => void }

export function RealPaymentConnectionsPage({ token, userId, businessId, onUnauthorized }: Props) {
  const api = useMemo(() => createPaymentConnectionGateway(token, businessId), [token, businessId])
  const [company, setCompany] = useState<RealBusiness | null>(null)
  const [connection, setConnection] = useState<DemoPaymentConnection | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    const controller = new AbortController()
    setLoading(true); setError(''); setConnection(null); setCompany(null)
    const businessApi = createBusinessGateway(token, userId)
    // Se obtiene la empresa del endpoint autenticado; sin estado global ni demoStore.
    void Promise.all([api.get(controller.signal), businessApi.get(businessId, controller.signal)])
      .then(([linked, business]) => {
        if (!mounted.current || controller.signal.aborted) return
        setConnection(linked); setCompany(business)
      })
      .catch(err => {
        if (!mounted.current || controller.signal.aborted) return
        if (err instanceof ApiHttpError && err.status === 401) onUnauthorized()
        else setError(businessErrorMessage(err))
      })
      .finally(() => { if (mounted.current && !controller.signal.aborted) setLoading(false) })
    return () => { mounted.current = false; controller.abort() }
  }, [api, businessId, token, userId, onUnauthorized])

  const canManage = company?.status === 'ACTIVA'
    && ['TITULAR_ADMINISTRATIVO', 'ADMINISTRADOR'].includes(company.membership.role)
  async function change(action: 'connect' | 'disconnect') {
    if (!canManage || busy || !connection) return
    if (action === 'disconnect' && !window.confirm('¿Desvincular la cuenta DEMO de esta empresa?')) return
    setBusy(true); setError(''); setNotice('')
    try {
      const result = action === 'connect' ? await api.connect() : await api.disconnect()
      if (!mounted.current) return
      setConnection(result)
      setNotice(action === 'connect'
        ? 'Cuenta de prueba vinculada. Todavía no se pueden realizar cobros QR.'
        : 'Cuenta de prueba desvinculada.')
    } catch (err) {
      if (!mounted.current) return
      if (err instanceof ApiHttpError && err.status === 401) onUnauthorized()
      else {
        setError(businessErrorMessage(err) + ' Consultá el estado antes de volver a intentar.')
        // Nunca afirmar que la escritura falló en caso de timeout o error de red.
      }
    } finally { if (mounted.current) setBusy(false) }
  }

  return <section className="mp-connection-page" aria-label="Medios de cobro REAL">
    <div className="mp-connection-head">
      <div><span className="mp-eyebrow">Administración · Medios de cobro</span>
        <h1>Medios de cobro</h1>
        <p>Configurá cómo querés cobrar en tu empresa. La integración con Mercado Pago empieza en modo de prueba.</p>
      </div>
      <span className="mp-mode-pill">SIMULACIÓN</span>
    </div>
    {loading && <p role="status">Consultando empresa y medios de cobro…</p>}
    {error && <p className="mp-message mp-error" role="alert">{error}</p>}
    {notice && <p className="mp-message" role="status">{notice}</p>}
    {!loading && company && connection && <div className="mp-connection-card">
      <div className="mp-connection-title">
        <span className="mp-symbol" aria-hidden="true">MP</span>
        <div><h2>Mercado Pago <small>DEMO</small></h2>
          <p>{company.name} · Cuenta asociada únicamente a esta empresa</p></div>
        <span className={'mp-state ' + (connection.status === 'ACTIVA' ? 'mp-active' : '')}>
          {connection.status === 'ACTIVA' ? 'Vinculada' : 'No vinculada'}
        </span>
      </div>
      <dl className="mp-fields">
        <div><dt>Tipo de conexión</dt><dd>Cuenta ficticia · sin dinero real</dd></div>
        <div><dt>Titular de prueba</dt><dd>{connection.mock_merchant_name ?? 'Sin configurar'}</dd></div>
        <div><dt>Referencia DEMO</dt><dd>{connection.mock_merchant_ref ?? '—'}</dd></div>
        <div><dt>Estado</dt><dd>{connection.status === 'ACTIVA' ? 'Activa para futuras pruebas QR' : 'Sin vinculación activa'}</dd></div>
      </dl>
      <div className="mp-actions">
        {canManage && connection.status !== 'ACTIVA' &&
          <button type="button" disabled={busy} onClick={() => void change('connect')}>
            {busy ? 'Procesando…' : 'Vincular cuenta demo'}
          </button>}
        {canManage && connection.status === 'ACTIVA' &&
          <button type="button" className="mp-outline" disabled={busy} onClick={() => void change('disconnect')}>
            {busy ? 'Procesando…' : 'Desvincular cuenta demo'}
          </button>}
        <button type="button" className="mp-outline" disabled={busy}
          onClick={() => { setLoading(true); setError(''); void api.get().then(setConnection).catch(err => {
            if (err instanceof ApiHttpError && err.status === 401) onUnauthorized()
            else setError(businessErrorMessage(err))
          }).finally(() => setLoading(false)) }}>Consultar estado</button>
      </div>
      {!canManage && <p className="mp-footnote">Tu rol permite consultar esta configuración, pero no modificarla.</p>}
      <p className="mp-footnote">Esta cuenta NO está conectada a Mercado Pago. No solicita credenciales, no genera cobros, no acredita fondos y no modifica caja ni stock.</p>
    </div>}
  </section>
}
