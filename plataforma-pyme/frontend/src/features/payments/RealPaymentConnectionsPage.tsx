import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiHttpError } from '../../api/httpClient.ts'
import { createBusinessGateway, businessErrorMessage } from '../businesses/businessGateway.ts'
import type { RealBusiness } from '../businesses/businessGateway.ts'
import { createPaymentConnectionGateway } from './paymentConnectionGateway.ts'
import { createMpOfficialTestGateway } from './mpOfficialTestGateway.ts'
import type { MpTestConnection } from './mpOfficialTestGateway.ts'
import type { DemoPaymentConnection } from './paymentConnectionGateway.ts'
import './realPaymentConnections.css'
import './mpOfficialTest.css'

type Props = { token: string; userId: string; businessId: string; onNavigate: (path:string)=>void; onUnauthorized: () => void }

export function RealPaymentConnectionsPage({ token, userId, businessId, onNavigate, onUnauthorized }: Props) {
  const api = useMemo(() => createPaymentConnectionGateway(token, businessId), [token, businessId])
  const official = useMemo(() => createMpOfficialTestGateway(token,businessId), [token,businessId])
  const [officialConnection, setOfficialConnection] = useState<MpTestConnection | null>(null)
  const [posText, setPosText] = useState('')
  const [officialBusy, setOfficialBusy] = useState(false)
  const [officialError, setOfficialError] = useState('')
  const [officialNotice, setOfficialNotice] = useState('')
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
    void Promise.all([api.get(controller.signal), businessApi.get(businessId, controller.signal), official.connection()])
      .then(([linked, business, officialLinked]) => {
        if (!mounted.current || controller.signal.aborted) return
        setConnection(linked); setCompany(business)
        setOfficialConnection(officialLinked)
        setPosText(officialLinked.external_pos_id??'')
      })
      .catch(err => {
        if (!mounted.current || controller.signal.aborted) return
        if (err instanceof ApiHttpError && err.status === 401) onUnauthorized()
        else setError(businessErrorMessage(err))
      })
      .finally(() => { if (mounted.current && !controller.signal.aborted) setLoading(false) })
    return () => { mounted.current = false; controller.abort() }
  }, [api, official, businessId, token, userId, onUnauthorized])

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
        ? 'Cuenta DEMO vinculada. Ya podés generar QR de prueba desde el POS: no cobran dinero real.'
        : 'Cuenta de prueba desvinculada.')
    } catch (err) {
      if (!mounted.current) return
      if (err instanceof ApiHttpError && err.status === 401) onUnauthorized()
      else {
        setError(err instanceof ApiHttpError && err.status === 409 && action === 'disconnect'
          ? 'La cuenta tiene un QR vigente pendiente. Consultá Cobros QR, resolvé o cancelá ese intento y después intentá desvincular.'
          : businessErrorMessage(err) + ' Consultá el estado antes de volver a intentar.')
        // Nunca afirmar que la escritura falló en caso de timeout o error de red.
      }
    } finally { if (mounted.current) setBusy(false) }
  }

  async function beginOfficialOAuth() {
    if(!canManage||officialBusy||!officialConnection?.enabled)return
    setOfficialBusy(true);setOfficialError('');setOfficialNotice('')
    try{
      const url=await official.startOAuth()
      window.location.assign(url)
    }catch(err){
      if(err instanceof ApiHttpError&&err.status===401)onUnauthorized()
      else setOfficialError(businessErrorMessage(err))
      setOfficialBusy(false)
    }
  }
  async function saveOfficialPos() {
    if(!canManage||officialBusy||!officialConnection?.enabled)return
    setOfficialBusy(true);setOfficialError('');setOfficialNotice('')
    try{
      await official.setPos(posText.trim())
      const state=await official.connection()
      if(mounted.current){
        setOfficialConnection(state)
        setOfficialNotice('Caja TEST asociada. Se usará en las órdenes QR oficiales de prueba.')
      }
    }catch(err){
      if(err instanceof ApiHttpError&&err.status===401)onUnauthorized()
      else setOfficialError(businessErrorMessage(err))
    }finally{if(mounted.current)setOfficialBusy(false)}
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
      <div className="mp-actions" aria-label="Accesos al circuito QR de la empresa">
        <button type="button" className="mp-outline" onClick={() => onNavigate('/real/empresas/'+businessId+'/cobros-qr')}>
          Ver cobros QR
        </button>
        <button type="button" className="mp-outline" onClick={() => onNavigate('/real/empresas/'+businessId+'/pos')}>
          Ir al punto de venta
        </button>
      </div>
      {!canManage && <p className="mp-footnote">Tu rol permite consultar esta configuración, pero no modificarla.</p>}
      <p className="mp-footnote">Esta cuenta NO está conectada a Mercado Pago. Permite generar QR de identificación DEMO y simular eventos, pero no acredita fondos. En una base QA descartable, un cierre posterior y explícito puede registrar una venta interna y descontar stock.</p>
    </div>}
    {!loading && company && officialConnection && <div className="mp-official-card"
      aria-label="Mercado Pago oficial TEST">
      <div className="mp-connection-head">
        <div>
          <span className="mp-eyebrow">Integración B6 · Plataforma multinegocio</span>
          <h2>Mercado Pago oficial <small>SOLO TEST</small></h2>
          <p>Conectá una cuenta de vendedor de prueba por OAuth. Las órdenes se crean con la Orders API oficial, sin colocar credenciales en el navegador.</p>
        </div>
        <span className="mp-mode-pill">TEST · NO PRODUCCIÓN</span>
      </div>
      {!officialConnection.enabled&&<p className="mp-official-warning" role="note">
        El servidor todavía no está configurado para órdenes oficiales de prueba. El QR DEMO sigue funcionando sin credenciales. No ingreses tokens aquí.
      </p>}
      <dl className="mp-fields">
        <div><dt>Cuenta OAuth TEST</dt><dd>{officialConnection.status==='ACTIVA'?'Vinculada':'No vinculada'}</dd></div>
        <div><dt>Vendedor de prueba</dt><dd>{officialConnection.mp_user_id??'Sin cuenta asociada'}</dd></div>
        <div><dt>Caja Mercado Pago</dt><dd>{officialConnection.external_pos_id??'Pendiente de configurar'}</dd></div>
        <div><dt>Modo</dt><dd>Órdenes QR dinámicas · entorno de prueba</dd></div>
      </dl>
      <p className="mp-footnote">Antes de generar QR oficiales, creá una aplicación de Mercado Pago para pruebas, una cuenta Seller Test y su sucursal/caja en Developers. Los IDs de caja se verifican al crear la orden en el proveedor.</p>
      {officialError&&<p className="mp-message mp-error" role="alert">{officialError}</p>}
      {officialNotice&&<p className="mp-message" role="status">{officialNotice}</p>}
      <div className="mp-actions">
        {canManage&&officialConnection.enabled&&<button type="button"
          disabled={officialBusy} onClick={()=>void beginOfficialOAuth()}>
          {officialBusy?'Conectando…':'Vincular vendedor TEST por OAuth'}
        </button>}
        <button type="button" className="mp-outline"
          onClick={()=>void official.connection().then(state=>{
            setOfficialConnection(state);setPosText(state.external_pos_id??'')
          }).catch(err=>setOfficialError(businessErrorMessage(err)))}>
          Actualizar estado TEST
        </button>
      </div>
      {canManage&&officialConnection.enabled&&officialConnection.status==='ACTIVA'&&
        <div className="mp-official-pos">
          <label htmlFor="mp-official-pos-id">Identificador de caja externa (external_pos_id)</label>
          <p>Copiá el <code>external_id</code> de la caja creada en Mercado Pago Developers. No es la cuenta bancaria ni una credencial.</p>
          <div className="mp-official-pos-controls">
            <input id="mp-official-pos-id" value={posText} maxLength={64}
              autoComplete="off" placeholder="Ejemplo: LOCAL001CAJA001"
              onChange={event=>setPosText(event.target.value)}/>
            <button type="button" disabled={officialBusy||!/^[A-Za-z0-9_-]{1,64}$/.test(posText.trim())}
              onClick={()=>void saveOfficialPos()}>Guardar caja TEST</button>
          </div>
        </div>}
      <p className="mp-footnote"><strong>Seguridad:</strong> las credenciales permanecen cifradas en el backend. Nunca hay que copiarlas al POS, HTML o celular. Esta opción está bloqueada salvo configuración QA descartable.</p>
    </div>}
  </section>
}
