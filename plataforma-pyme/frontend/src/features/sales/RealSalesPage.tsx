import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiHttpError } from '../../api/httpClient.ts'
import type { RealBusiness } from '../businesses/businessGateway.ts'
import { UUID_V4_PATTERN } from '../businesses/businessGateway.ts'
import { createOperationsGateway } from '../businesses/realOperationsGateway.ts'
import type { LocationRecord } from '../businesses/realOperationsGateway.ts'
import {
  createSalesReadGateway, SALES_PAGE_SIZE, salesReadErrorMessage,
} from './realSalesReadGateway.ts'
import type { SaleReceipt, SaleSummary } from './realSalesReadGateway.ts'

type Props = {
  token: string
  userId: string
  businessId: string
  onNavigate: (path: string) => void
  onUnauthorized: () => void
}

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })
function cents(value: number): string { return money.format(value / 100) }
function date(value: string): string {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' })
    .format(new Date(value))
}
function qty(value: number): string {
  const main = Math.trunc(value / 1000)
  const fraction = String(value % 1000).padStart(3, '0').replace(/0+$/, '')
  return fraction ? main + ',' + fraction : String(main)
}
function short(value: string): string { return value.slice(0, 8) + '…' }

/** T09-D is intentionally READ-ONLY: no sale creation, no DEMO or payment accreditation. */
export function RealSalesPage({ token, userId, businessId, onNavigate, onUnauthorized }: Props) {
  const companyApi = useMemo(() => createOperationsGateway(token, userId), [token, userId])
  const salesApi = useMemo(() => createSalesReadGateway(token, businessId), [token, businessId])
  const [company, setCompany] = useState<RealBusiness | null>(null)
  const [locations, setLocations] = useState<LocationRecord[]>([])
  const [metadataError, setMetadataError] = useState('')
  const [locationId, setLocationId] = useState('')
  const [refreshCount, setRefreshCount] = useState(0)
  const [rows, setRows] = useState<SaleSummary[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [hasMore, setHasMore] = useState(false)
  const [moreLoading, setMoreLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [pageError, setPageError] = useState('')
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [requestInput, setRequestInput] = useState('')
  const listEpoch = useRef(0)
  const pageController = useRef<AbortController | null>(null)
  const detailEpoch = useRef(0)
  const detailController = useRef<AbortController | null>(null)

  const locationName = useCallback((id: string | null) => {
    if (id === null) return 'Venta sin sede (servicios)'
    return locations.find(item => item.id === id)?.name ?? 'Sede ' + short(id)
  }, [locations])

  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([
      companyApi.business(businessId, controller.signal),
      companyApi.locations(businessId, controller.signal),
    ]).then(([business, sites]) => {
      if (controller.signal.aborted) return
      setCompany(business); setLocations(sites); setMetadataError('')
    }).catch((err: unknown) => {
      if (controller.signal.aborted) return
      if (err instanceof ApiHttpError && err.status === 401) { onUnauthorized(); return }
      setMetadataError('No se pudieron consultar nombres de empresa o sedes. El historial sigue siendo independiente.')
    })
    return () => { controller.abort() }
  }, [companyApi, businessId, onUnauthorized])

  useEffect(() => {
    const controller = new AbortController()
    const epoch = ++listEpoch.current
    pageController.current?.abort()
    pageController.current = null
    detailController.current?.abort()
    detailEpoch.current++
    // The scope of an opened receipt is invalid after changing filters or refreshing.
    // Don't keep an old detail while showing rows from a different query.
    const filters = locationId ? { locationId } : {}
    void salesApi.list(0, SALES_PAGE_SIZE, filters, controller.signal).then(data => {
      if (controller.signal.aborted || epoch !== listEpoch.current) return
      setRows(data); setHasMore(data.length === SALES_PAGE_SIZE)
      setListError(''); setStatus('ready')
    }).catch((err: unknown) => {
      if (controller.signal.aborted || epoch !== listEpoch.current) return
      if (err instanceof ApiHttpError && err.status === 401) { onUnauthorized(); return }
      setListError(salesReadErrorMessage(err)); setStatus('error')
    })
    // Clear old data synchronously in cleanup/effect via keyed page on navigation.
    return () => { controller.abort(); pageController.current?.abort() }
  }, [salesApi, locationId, refreshCount, onUnauthorized])

  const effectiveFilters = useMemo(() => locationId ? { locationId } : {}, [locationId])

  async function loadMore() {
    if (status !== 'ready' || !hasMore || moreLoading) return
    const epoch = listEpoch.current
    const controller = new AbortController()
    pageController.current = controller
    setMoreLoading(true); setPageError('')
    try {
      const next = await salesApi.list(rows.length, SALES_PAGE_SIZE, effectiveFilters, controller.signal)
      if (controller.signal.aborted || epoch !== listEpoch.current) return
      const known = new Set(rows.map(row => row.id))
      if (next.some(row => known.has(row.id))) {
        setPageError('El historial cambió entre páginas. Actualizá desde la primera página para evitar duplicados u omisiones.')
        setHasMore(false)
        return
      }
      setRows(previous => [...previous, ...next])
      setHasMore(next.length === SALES_PAGE_SIZE)
    } catch (err) {
      if (controller.signal.aborted || epoch !== listEpoch.current) return
      if (err instanceof ApiHttpError && err.status === 401) { onUnauthorized(); return }
      setPageError('No se pudo cargar la página siguiente. El listado es parcial: ' + salesReadErrorMessage(err))
    } finally {
      if (epoch === listEpoch.current) {
        pageController.current = null
        setMoreLoading(false)
      }
    }
  }

  async function readDetail(mode: 'id' | 'request', value: string) {
    detailController.current?.abort()
    const controller = new AbortController()
    detailController.current = controller
    const epoch = ++detailEpoch.current
    setReceipt(null); setDetailError(''); setDetailLoading(true)
    try {
      const response = mode === 'id'
        ? await salesApi.get(value, controller.signal)
        : await salesApi.byRequest(value, controller.signal)
      if (controller.signal.aborted || epoch !== detailEpoch.current) return
      setReceipt(response)
    } catch (err) {
      if (controller.signal.aborted || epoch !== detailEpoch.current) return
      if (err instanceof ApiHttpError && err.status === 401) { onUnauthorized(); return }
      setDetailError(salesReadErrorMessage(err))
    } finally {
      if (epoch === detailEpoch.current) setDetailLoading(false)
    }
  }

  function requestSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const id = requestInput.trim()
    if (!UUID_V4_PATTERN.test(id)) {
      // Invalid input invalidates a previous in-flight lookup too.
      detailController.current?.abort()
      detailEpoch.current++
      setDetailLoading(false)
      setReceipt(null); setDetailError('Ingresá una clave de solicitud UUID4 válida.')
      return
    }
    void readDetail('request', id)
  }

  function refresh() {
    listEpoch.current++
    pageController.current?.abort()
    detailController.current?.abort()
    detailEpoch.current++
    setRows([]); setHasMore(false); setStatus('loading')
    setMoreLoading(false); setPageError(''); setListError('')
    setReceipt(null); setDetailError(''); setDetailLoading(false)
    setRefreshCount(value => value + 1)
  }

  return <section className="real-auth-card real-business-panel real-sales-panel" aria-label="Historial de ventas REALES">
    <nav className="real-business-nav" aria-label="Navegación de empresa">
      <button className="real-auth-link" type="button" onClick={() => onNavigate('/real/empresas/' + businessId)}>Empresa</button>
      <button className="real-auth-link" type="button" onClick={() => onNavigate('/real/empresas/' + businessId + '/inventario')}>Inventario</button>
      <button className="real-auth-link" type="button" onClick={() => onNavigate('/real/empresas')}>Mis empresas</button>
    </nav>
    <span className="real-auth-eyebrow">E2-7 · T09-D · Consulta REAL</span>
    <h1>Historial de ventas</h1>
    <p>Comprobantes confirmados en PostgreSQL. Solo se muestran las ventas de esta empresa para las que tenés permiso; los trabajadores y encargados ven exclusivamente las sedes asignadas.</p>
    <p className="real-auth-note"><strong>Solo lectura.</strong> Acá no se registran ventas, no se modifica stock ni se acreditan pagos. Los medios de pago del comprobante son declaraciones, no confirmaciones de bancos o Mercado Pago.</p>
    {company && <div className="real-ops-toolbar"><strong>{company.name}</strong><span>{company.membership.role.replaceAll('_', ' ')}</span></div>}
    {metadataError && <p role="status" className="real-auth-message real-ops-warning">{metadataError}</p>}
    <div className="real-sales-filters">
      <label>Ubicación
        <select aria-label="Filtrar ventas por ubicación" value={locationId}
          onChange={event => {
            listEpoch.current++; pageController.current?.abort()
            detailController.current?.abort(); detailEpoch.current++
            setLocationId(event.target.value); setRows([]); setStatus('loading')
            setHasMore(false); setMoreLoading(false); setReceipt(null)
            setDetailLoading(false); setDetailError(''); setPageError(''); setListError('')
          }}>
          <option value="">Todas las sedes autorizadas</option>
          {locations.map(loc => <option value={loc.id} key={loc.id}>{loc.name} · {loc.status}</option>)}
        </select>
      </label>
      <button type="button" className="real-auth-secondary" onClick={refresh} disabled={status === 'loading'}>
        Actualizar desde API
      </button>
    </div>
    <section aria-label="Ventas confirmadas">
      <div className="real-sales-list-title"><h2>Ventas confirmadas</h2>
        <small>{status === 'ready' ? rows.length + ' cargadas · ' + (hasMore ? 'Listado parcial' : 'Fin del listado consultado') : 'Consultando…'}</small>
      </div>
      {status === 'loading' && <p role="status">Consultando ventas autorizadas desde FastAPI…</p>}
      {status === 'error' && <p role="alert" className="real-auth-message real-auth-error">{listError} <button type="button" className="real-auth-link" onClick={refresh}>Reintentar consulta</button></p>}
      {status === 'ready' && rows.length === 0 && <div className="real-business-empty">No hay ventas accesibles con el filtro elegido. Esto no significa que otras sedes no tengan ventas.</div>}
      {status === 'ready' && rows.length > 0 && <div className="real-sales-list">
        {rows.map(row => <article className="real-sales-row" key={row.id}>
          <div className="real-sales-row-main">
            <strong>{cents(row.total_cents)}</strong>
            <span>{date(row.created_at)} · {locationName(row.location_id)}</span>
            <small>Venta {short(row.id)} · CONFIRMADA</small>
          </div>
          <button className="real-auth-secondary" type="button" onClick={() => void readDetail('id', row.id)}>Ver comprobante</button>
        </article>)}
      </div>}
      {status === 'ready' && hasMore && <button type="button" className="real-auth-secondary"
        disabled={moreLoading} onClick={() => void loadMore()}>{moreLoading ? 'Cargando…' : 'Cargar más ventas'}</button>}
      {pageError && <p role="alert" className="real-auth-message real-ops-warning">{pageError} <button type="button" className="real-auth-link" onClick={refresh}>Actualizar desde el inicio</button></p>}
    </section>
    <section className="real-ops-subpanel" aria-label="Recuperación de comprobantes">
      <h2>Recuperar comprobante por solicitud</h2>
      <p>Si conservaste el `request_id` de una venta confirmada, podés consultarla sin realizar otra venta. Un 404 no prueba que el POST original nunca haya llegado.</p>
      <form className="real-sales-request-form" onSubmit={requestSearch}>
        <label>Clave original de solicitud (UUID4)
          <input value={requestInput} onChange={event => setRequestInput(event.target.value)}
            placeholder="xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx" spellCheck={false} maxLength={36}/>
        </label>
        <button type="submit" className="real-auth-primary" disabled={detailLoading}>
          {detailLoading ? 'Consultando…' : 'Consultar solicitud'}
        </button>
      </form>
    </section>
    {detailLoading && <p role="status">Cargando comprobante histórico…</p>}
    {detailError && <p role="alert" className="real-auth-message real-auth-error">{detailError}</p>}
    {receipt && <section className="real-sales-receipt" aria-label="Comprobante de venta REAL">
      <div className="real-sales-receipt-head">
        <div><span className="real-auth-eyebrow">Comprobante histórico REAL</span><h2>Venta confirmada</h2></div>
        <strong>{cents(receipt.total_cents)}</strong>
      </div>
      <dl className="real-auth-profile">
        <div><dt>ID de venta</dt><dd className="real-auth-id">{receipt.id}</dd></div>
        <div><dt>Solicitud original</dt><dd className="real-auth-id">{receipt.request_id}</dd></div>
        <div><dt>Fecha</dt><dd>{date(receipt.created_at)}</dd></div>
        <div><dt>Sede</dt><dd>{locationName(receipt.location_id)}</dd></div>
        <div><dt>Responsable (ID)</dt><dd className="real-auth-id">{receipt.created_by_id}</dd></div>
      </dl>
      <h3>Artículos y servicios</h3>
      <div className="real-sales-receipt-lines">
        {receipt.lines.map(line => <div key={line.id}>
          <div><strong>{line.description_snapshot}</strong><small>{line.kind_snapshot} · {qty(line.quantity_milli)} {line.unit_snapshot} · {cents(line.unit_price_cents)} por unidad</small></div>
          <strong>{cents(line.line_total_cents)}</strong>
        </div>)}
      </div>
      <div className="real-sales-totals">
        <span>Subtotal <strong>{cents(receipt.subtotal_cents)}</strong></span>
        <span>Descuento <strong>−{cents(receipt.discount_cents)}</strong></span>
        <span>Total <strong>{cents(receipt.total_cents)}</strong></span>
      </div>
      <h3>Pagos declarados (sin acreditación externa)</h3>
      <div className="real-sales-receipt-lines">
        {receipt.payments.map(payment => <div key={payment.id}>
          <div><strong>{payment.method.replaceAll('_', ' ')}</strong>
            {payment.reference && <small>Referencia declarada: {payment.reference}</small>}</div>
          <strong>{cents(payment.amount_cents)}</strong>
        </div>)}
      </div>
      {receipt.balances_after.length > 0 && <>
        <h3>Saldos históricos posteriores a la venta</h3>
        <div className="real-sales-receipt-lines">
          {receipt.balances_after.map(snap => <div key={snap.catalog_item_id}>
            <small>Artículo {short(snap.catalog_item_id)}</small>
            <strong>{qty(snap.quantity_milli)} · versión {snap.version}</strong>
          </div>)}
        </div>
        <p className="real-auth-note">Estos saldos son snapshots históricos; para conocer el stock actual, consultá Inventario REAL.</p>
      </>}
      {receipt.notes && <p>Observaciones: {receipt.notes}</p>}
      <button type="button" className="real-auth-link" onClick={() => {
        detailController.current?.abort(); detailEpoch.current++
        setReceipt(null); setDetailError(''); setDetailLoading(false)
      }}>Cerrar comprobante</button>
    </section>}
  </section>
}
