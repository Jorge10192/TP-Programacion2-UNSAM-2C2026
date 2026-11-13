import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiHttpError, ApiTransportError } from '../../api/httpClient.ts'
import { RealPhotoPreview } from '../photos/RealPhotos.tsx'
import { createOperationsGateway } from '../businesses/realOperationsGateway.ts'
import { createQrIntentGateway, qrIntentError } from './qrIntentGateway.ts'
import type { QrIntent, QrPaymentEvent, QrSimAction } from './qrIntentGateway.ts'
import type { SaleReceipt } from '../sales/realSalesReadGateway.ts'
import { qrEffectiveStatus, qrStatusPresentation } from './qrUx.ts'
import { createMpOfficialTestGateway } from './mpOfficialTestGateway.ts'
import type { MpTestConnection, MpTestOrder } from './mpOfficialTestGateway.ts'
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
const FINALIZE_QA_ENABLED = LAB_UI_ENABLED && import.meta.env.VITE_PYME_ENABLE_QR_FINALIZATION_QA === '1'
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
  const officialApi = useMemo(()=>createMpOfficialTestGateway(token,businessId),[token,businessId])
  const operations = useMemo(() => createOperationsGateway(token, userId), [token, userId])
  const [intent, setIntent] = useState<QrIntent | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [siteName, setSiteName] = useState('')
  const [isManager, setIsManager] = useState(false)
  const [events, setEvents] = useState<QrPaymentEvent[]>([])
  const [officialConnection, setOfficialConnection] = useState<MpTestConnection|null>(null)
  const [officialOrder, setOfficialOrder] = useState<MpTestOrder|null>(null)
  const [officialBusy, setOfficialBusy] = useState(false)
  const [officialError, setOfficialError] = useState('')
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null)
  const [saleOutcomeUnknown, setSaleOutcomeUnknown] = useState(false)
  const [saleRecoveryChecked, setSaleRecoveryChecked] = useState(false)
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
      officialApi.connection(),
      officialApi.bySource(intentId),
      operations.business(businessId, ctrl.signal),
      operations.locations(businessId, ctrl.signal),
    ]).then(([qr, history, officialState, officialSaved, company, sites]) => {
      if (ctrl.signal.aborted) return
      setIntent(qr)
      setEvents(history)
      setOfficialConnection(officialState)
      setOfficialOrder(officialSaved)
      if (qr.status === 'FINALIZADA') {
        void api.receipt(intentId, ctrl.signal).then(sale=>{
          if (!ctrl.signal.aborted && qr.sale_id === sale.id) setReceipt(sale)
        }).catch(err=>{ if (!ctrl.signal.aborted) setError(qrIntentError(err)) })
      }
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
  }, [api, officialApi, intentId, businessId, operations, onUnauthorized])

  async function refreshOfficial() {
    if (officialBusy) return
    setOfficialBusy(true);setOfficialError('')
    try {
      const [link,order]=await Promise.all([
        officialApi.connection(),officialApi.bySource(intentId),
      ])
      setOfficialConnection(link)
      setOfficialOrder(order)
    } catch(err) {
      if(err instanceof ApiHttpError&&err.status===401)onUnauthorized()
      else setOfficialError(qrIntentError(err))
    } finally{setOfficialBusy(false)}
  }

  async function makeOfficialTestOrder() {
    if(!intent||!officialConnection?.enabled||officialConnection.status!=='ACTIVA'||
       !officialConnection.external_pos_id||officialBusy||
       (officialOrder!==null && !['INDETERMINADA','PREPARANDO'].includes(officialOrder.status)))return
    if(!window.confirm('¿Crear una orden QR en Mercado Pago TEST? Usará la cuenta de prueba y la caja de esta empresa. No es un pago de producción.'))return
    setOfficialBusy(true);setOfficialError('')
    try{
      // Se conserva el UUID4 original del QR como clave remota idempotente.
      const result=await officialApi.create(intentId,intent.request_id)
      setOfficialOrder(result)
    }catch(err){
      if(err instanceof ApiHttpError&&err.status===401)onUnauthorized()
      else setOfficialError(qrIntentError(err)+
        ' Consultá la orden original antes de volver a enviarla.')
      void officialApi.bySource(intentId).then(setOfficialOrder).catch(()=>{})
    }finally{setOfficialBusy(false)}
  }

  async function reconcileOfficial() {
    if(!officialOrder||officialBusy)return
    setOfficialBusy(true);setOfficialError('')
    try{
      const result=await officialApi.reconcile(officialOrder.id)
      setOfficialOrder(result)
    }catch(err){
      if(err instanceof ApiHttpError&&err.status===401)onUnauthorized()
      else setOfficialError(qrIntentError(err))
    }finally{setOfficialBusy(false)}
  }

  async function settleOfficialSale() {
    if(!officialOrder||officialOrder.status!=='PROCESADA'||officialBusy||!isManager)return
    if(!window.confirm('¿Registrar una sola venta QA a partir del pago procesado por Mercado Pago TEST? No mueve dinero real.'))return
    setOfficialBusy(true);setOfficialError('')
    try{
      const result=await officialApi.settle(officialOrder.id)
      setOfficialOrder(result.order)
    }catch(err){
      if(err instanceof ApiHttpError&&err.status===401)onUnauthorized()
      else setOfficialError(qrIntentError(err)+
        ' Consultá orden y comprobante: no generes otro QR.')
      void officialApi.bySource(intentId).then(setOfficialOrder).catch(()=>{})
    }finally{setOfficialBusy(false)}
  }

  const secondsRemaining = intent ? Math.max(0, Math.ceil((Date.parse(intent.expires_at) - now) / 1000)) : 0
  const displayStatus = intent ? qrEffectiveStatus(intent.status, intent.expires_at, now) : null
  const presentation = displayStatus ? qrStatusPresentation(displayStatus) : null
  async function refresh() {

    if (busy || !intent) return
    setBusy(true); setError('')
    try {
      const [current, history] = await Promise.all([api.get(intentId), api.events(intentId)])
      setIntent(current); setEvents(history)
      if (current.status === 'FINALIZADA') {
        const sale = await api.receipt(intentId)
        if (current.sale_id !== sale.id) throw new Error('Comprobante QR incompatible')
        setReceipt(sale)
        setSaleOutcomeUnknown(false)
        setSaleRecoveryChecked(false)
      } else {
        setReceipt(null)
        if (saleOutcomeUnknown && current.status === 'APROBADA_DEMO') {
          // GET resolvió que no se creó venta: mismo QR/endpoint idempotente.
          setSaleRecoveryChecked(true)
        } else {
          setSaleOutcomeUnknown(false)
          setSaleRecoveryChecked(false)
        }
      }
      if (actionRef.current && (
        history.some(event => event.event_key === actionRef.current?.key) ||
        !['ESPERANDO_PAGO','INDETERMINADA'].includes(current.status)
      )) {
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

  async function finalizeDemoSale(retryAfterCheck = false) {
    if (!FINALIZE_QA_ENABLED || !isManager || busy || intent?.status !== 'APROBADA_DEMO') return
    if (saleOutcomeUnknown && (!retryAfterCheck || !saleRecoveryChecked)) return
    if (!retryAfterCheck && !window.confirm('¿Registrar UNA venta interna en la base de pruebas? Se descontará stock QA. Esta operación NO acredita dinero real.')) return
    setBusy(true); setError('')
    try {
      const done = await api.finalize(intentId)
      setIntent(done.intent); setReceipt(done.sale)
      setEvents(await api.events(intentId))
      setSaleOutcomeUnknown(false)
      setSaleRecoveryChecked(false)
    } catch (err) {
      if (err instanceof ApiTransportError || (err instanceof ApiHttpError && err.status >= 500)) {
        setSaleOutcomeUnknown(true)
        setSaleRecoveryChecked(false)
      }
      if (err instanceof ApiHttpError && err.status === 401) onUnauthorized()
      else setError(qrIntentError(err) +
        ' Antes de repetir el cierre consultá el estado de la venta por GET.')
    } finally { setBusy(false) }
  }

  return <section className="real-auth-card real-business-panel e3-qr-page" aria-label="Cobro Mercado Pago QR DEMO">
    <div className="e3-qr-heading">
      <div>
        <p className="e3-qr-eyebrow">Punto de venta · Cobro individual</p>
        <h1>Mercado Pago QR <span>DEMO</span></h1>
        <p>Desglose completo del importe de esta venta, almacenado en PostgreSQL.</p>
      </div>
      <div className="e3-qr-heading-actions">
        <button type="button" className="real-auth-secondary" disabled={busy}
          onClick={() => onNavigate('/real/empresas/' + businessId + '/cobros-qr')}>Ver cobros QR</button>
        <button type="button" className="real-auth-secondary" disabled={busy}
          onClick={() => onNavigate('/real/empresas/' + businessId + '/pos')}>Volver al POS</button>
      </div>
    </div>

    <p className="e3-qr-warning" role="note">
      {officialOrder
        ? <><strong>ORDEN OFICIAL · SOLO ENTORNO TEST.</strong> Este QR procede de Orders API y puede probarse con cuentas de comprador de prueba. No lo uses para cobrar fondos reales. La venta QA se registra por separado tras conciliación.</>
        : <><strong>SIMULACIÓN · NO COBRABLE.</strong> El QR DEMO solo contiene una referencia ficticia. No es una orden de Mercado Pago ni recibe dinero real.</>}
    </p>
    {!officialOrder && presentation && <div className={'e3-qr-explainer e3-qr-tone-'+presentation.tone} role="status">
      <strong>{presentation.title}</strong>
      <p>{presentation.description}</p>
      <small><strong>Próximo paso:</strong> {presentation.nextStep}</small>
    </div>}
    {loading && <p role="status">Cargando QR y detalle original desde la API…</p>}
    {error && <p className="real-auth-message real-auth-error" role="alert">{error}</p>}
    {intent && !loading && <div className="e3-qr-layout">
      <div className="e3-qr-visual-panel">
        <div className="e3-qr-status" role="status">
          {officialOrder ? 'Mercado Pago TEST · '+officialOrder.status : presentation?.title ?? 'Estado QR'}
        </div>
        {officialOrder?.qr_png_data_uri
          ? <img src={officialOrder.qr_png_data_uri}
              alt="QR oficial de una orden Mercado Pago en entorno TEST"
              className="e3-qr-image" width="320" height="320"/>
          : !officialOrder&&<img src={intent.qr_png_data_uri}
              alt="QR de identificación ficticia DEMO, no cobrable"
              className="e3-qr-image" width="320" height="320"/>}
        <strong className="e3-qr-not-payable">
          {officialOrder ? 'MERCADO PAGO · CUENTA TEST · NO PRODUCCIÓN'
            : 'QR DE PRUEBA · NO COBRABLE'}
        </strong>
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
          {!officialOrder && displayStatus === 'ESPERANDO_PAGO' &&
            <button type="button" className="real-auth-secondary" disabled={busy}
              onClick={() => void cancel()}>Cancelar QR</button>}
        </div>
      </div>
      <div className="e3-qr-details">
        <section className="e3-qr-official" aria-label="Integración oficial Mercado Pago TEST">
          <div className="e3-qr-official-head">
            <h2>Mercado Pago oficial · TEST</h2>
            <span className="e3-qr-test-pill">SIN PRODUCCIÓN</span>
          </div>
          <p>Separa el QR ficticio de una orden oficial de prueba. El importe y los artículos permanecen congelados desde el POS; las credenciales se usan exclusivamente en FastAPI.</p>
          {officialConnection && !officialConnection.enabled &&
            <p role="note">El backend aún no está configurado para conectarse con el proveedor TEST. La DEMO sigue disponible sin esa conexión.</p>}
          {officialConnection?.enabled && officialConnection.status!=='ACTIVA' &&
            <p role="note">Vinculá primero una cuenta Seller TEST desde Medios de cobro.</p>}
          {officialConnection?.enabled && officialConnection.status==='ACTIVA' &&
            !officialConnection.external_pos_id &&
            <p role="note">Configurá una caja de Mercado Pago TEST en Medios de cobro antes de emitir la orden.</p>}
          {officialError&&<p role="alert" className="real-auth-message real-auth-error">{officialError}</p>}
          <div className="e3-qr-official-actions">
            {!officialOrder && officialConnection?.enabled && officialConnection.status==='ACTIVA' &&
              officialConnection.external_pos_id && displayStatus==='ESPERANDO_PAGO' &&
              <button type="button" className="real-auth-primary" disabled={officialBusy||busy}
                onClick={()=>void makeOfficialTestOrder()}>
                {officialBusy?'Generando…':'Crear QR oficial en Mercado Pago TEST'}
              </button>}
            {officialOrder && <button type="button" className="real-auth-secondary"
              disabled={officialBusy||busy} onClick={()=>void refreshOfficial()}>
              Consultar orden guardada
            </button>}
            {['INDETERMINADA','PREPARANDO'].includes(officialOrder?.status??'') && officialOrder && <button type="button"
              className="real-auth-secondary" disabled={officialBusy}
              onClick={()=>void makeOfficialTestOrder()}>
              Reintentar la misma orden y clave
            </button>}
            {officialOrder?.provider_order_id && <button type="button"
              className="real-auth-secondary" disabled={officialBusy}
              onClick={()=>void reconcileOfficial()}>
              Verificar pago en Mercado Pago
            </button>}
            <button type="button" className="real-auth-secondary"
              onClick={()=>onNavigate('/real/empresas/'+businessId+'/medios-de-cobro')}>
              Cuenta y caja TEST
            </button>
          </div>
          {officialOrder && <>
            <p><strong>Estado de la orden:</strong> {officialOrder.status}</p>
            <p><strong>Referencia:</strong> <code>{officialOrder.external_reference}</code></p>
            {officialOrder.provider_order_id &&
              <p><strong>Order ID:</strong> <code>{officialOrder.provider_order_id}</code></p>}
            {officialOrder.status==='CREADA' &&
              <p role="status">Esperando pago con cuenta de comprador TEST. Usá «Verificar pago» para conciliar con Orders API.</p>}
            {officialOrder.status==='INDETERMINADA' &&
              <p role="alert">La respuesta de Mercado Pago fue incierta. Se mantiene la clave original; no generes otro cobro.</p>}
            {officialOrder.status==='PROCESADA' && !officialOrder.sale_registered &&
              <div className="e3-qr-official-processed">
                <p><strong>Pago TEST verificado con proveedor.</strong> La venta de prueba aún no se registró ni se descontó stock.</p>
                {isManager&&<button type="button" className="real-auth-primary"
                  disabled={officialBusy} onClick={()=>void settleOfficialSale()}>
                  Registrar venta QA verificada y descontar stock
                </button>}
              </div>}
            {officialOrder.sale_registered &&
              <p role="status"><strong>Venta QA registrada.</strong> Comprobante: <code>{officialOrder.sale_id}</code>. No volverá a descontar stock con esta orden.</p>}
            {officialOrder.status==='REQUIERE_REVISION' &&
              <p role="alert">El proveedor TEST reportó cobro pero el registro comercial requiere revisión. No se asentó stock parcial.</p>}
            {officialOrder.status==='REEMBOLSADA' &&
              <p role="alert">La orden figura reembolsada en TEST. Revisá el comprobante y la compensación de inventario si hubo venta.</p>}
          </>}
        </section>
        {!officialOrder && LAB_UI_ENABLED && isManager && <div className="e3-qr-lab" aria-label="Laboratorio de cobros ficticios">
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
        {!officialOrder && FINALIZE_QA_ENABLED && isManager && intent.status === 'APROBADA_DEMO' &&
          <section className="e3-qr-finalize" aria-label="Registrar venta QA">
            <h2>Confirmar venta de prueba</h2>
            <p>El pago fue aprobado únicamente por el simulador. Este botón registra UNA venta en PostgreSQL QA y descuenta stock de forma transaccional, sin mover dinero real.</p>
            <button type="button" className="real-auth-primary" disabled={busy || saleOutcomeUnknown}
              onClick={()=>void finalizeDemoSale()}>
              {busy ? 'Registrando…' : 'Registrar venta QA y descontar stock'}
            </button>
            {saleOutcomeUnknown && <p role="alert">Resultado incierto: consultá el QR y el comprobante original mediante GET. No generes otro QR.</p>}
            {saleOutcomeUnknown && saleRecoveryChecked && <button type="button"
              className="real-auth-secondary" disabled={busy}
              onClick={()=>void finalizeDemoSale(true)}>
              Reintentar el mismo cierre QA
            </button>}
          </section>}
        {intent.status === 'REQUIERE_REVISION' &&
          <p className="e3-qr-warning" role="alert"><strong>Requiere revisión:</strong> la venta no fue registrada. El stock, la sede o el catálogo deben verificarse. No hubo un débito parcial.</p>}
        {intent.status === 'FINALIZADA' && <section className="e3-qr-finalize" aria-label="Venta QA confirmada">
          <h2>Venta de prueba confirmada</h2>
          <p><strong>Registro QA, no dinero real.</strong> El comprobante está vinculado a este QR. No se puede registrar otra venta con el mismo intento.</p>
          {receipt ? <div>
              <p>Comprobante: <code>{receipt.id}</code></p>
              <p>Total: <strong>{pesos(receipt.total_cents)}</strong> · Medio: Mercado Pago DEMO QA</p>
              <p>Renglones: {receipt.lines.length} · Movimientos de inventario: {receipt.balances_after.length} saldos actualizados</p>
              <details className="e3-qr-receipt">
                <summary>Ver comprobante QA completo</summary>
                <div className="e3-qr-receipt-body" aria-label="Detalle del comprobante QA">
                  <p><strong>Fecha:</strong> {new Date(receipt.created_at).toLocaleString('es-AR')}</p>
                  <p><strong>ID de venta:</strong> <code>{receipt.id}</code></p>
                  <p><strong>Referencia ficticia:</strong> <code>{receipt.payments[0]?.reference}</code></p>
                  <div className="e3-qr-receipt-lines">
                    {receipt.lines.map(line=><div className="e3-qr-receipt-line" key={line.id}>
                      <span>{line.description_snapshot} · {qty(line.quantity_milli)} {line.unit_snapshot} × {pesos(line.unit_price_cents)}</span>
                      <strong>{pesos(line.line_total_cents)}</strong>
                    </div>)}
                  </div>
                  <p>Subtotal <strong>{pesos(receipt.subtotal_cents)}</strong></p>
                  <p>Descuento <strong>−{pesos(receipt.discount_cents)}</strong></p>
                  <p className="e3-qr-receipt-grand">Total de la venta QA <strong>{pesos(receipt.total_cents)}</strong></p>
                  <p><strong>Medio:</strong> Mercado Pago DEMO QA (sin acreditación real)</p>
                  <button type="button" className="real-auth-secondary" onClick={()=>
                    onNavigate('/real/empresas/'+businessId+'/ventas')}>Ver historial de ventas</button>
                </div>
              </details>
            </div> : <button type="button" className="real-auth-secondary" disabled={busy}
                onClick={()=>void refresh()}>Consultar comprobante</button>}
        </section>}
        {saleOutcomeUnknown && <button type="button" className="real-auth-secondary"
          disabled={busy} onClick={()=>void refresh()}>
          {saleRecoveryChecked ? 'Volver a consultar el cierre QA' : 'Consultar resultado original del cierre'}
        </button>}
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
        <p className="e3-qr-footnote">Las imágenes son vistas actuales del catálogo; nombre, cantidad, precio e importes pertenecen al snapshot original. El laboratorio de B3 registra resultados ficticios. El cierre de B4, disponible solo en QA descartable, crea una venta interna; Mercado Pago no acredita fondos.</p>
      </div>
    </div>}
  </section>
}
