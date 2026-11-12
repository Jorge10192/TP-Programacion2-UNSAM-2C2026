import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiHttpError } from '../../api/httpClient.ts'
import type { RealBusiness } from '../businesses/businessGateway.ts'
import { createOperationsGateway, operationsError } from '../businesses/realOperationsGateway.ts'
import type { LocationRecord } from '../businesses/realOperationsGateway.ts'
import { CATALOG_PAGE_SIZE, centsToPesos, createCatalogGateway, pesosToCents } from '../catalog/realCatalogGateway.ts'
import type { CatalogItem } from '../catalog/realCatalogGateway.ts'
import type { PosCartLine } from './realPosDraft.ts'
import { RealPosCheckout } from './RealPosCheckout.tsx'
import { canOverrideSalesPrice, parsePosQuantity, posLineTotalCents, posQuantityText, previewPosCart } from './realPosDraft.ts'

type Props = {
  token: string
  userId: string
  businessId: string
  onNavigate: (path: string) => void
  onUnauthorized: () => void
}

const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })
const money = (c: number) => ars.format(c / 100)

/**
 * T10-D: draft selection stays separate from the explicitly reviewed checkout.
 * The checkout holds/fails-closed the cart while inspecting any IndexedDB
 * pending attempt. No auto POST, no DEMO fallback.
 */
export function RealPosPage({ token, userId, businessId, onNavigate, onUnauthorized }: Props) {
  const companyApi = useMemo(() => createOperationsGateway(token, userId), [token, userId])
  const catalogApi = useMemo(() => createCatalogGateway(token, businessId), [token, businessId])
  const [company, setCompany] = useState<RealBusiness | null>(null)
  const [locations, setLocations] = useState<LocationRecord[]>([])
  const [assignedLocationIds, setAssignedLocationIds] = useState<string[]>([])
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState('')
  const [moreError, setMoreError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [moreLoading, setMoreLoading] = useState(false)
  const loadingPage = useRef(false)
  const [search, setSearch] = useState('')
  const [siteId, setSiteId] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [quantityText, setQuantityText] = useState('1')
  const [priceText, setPriceText] = useState('')
  const [priceOverride, setPriceOverride] = useState(false)
  const [discountText, setDiscountText] = useState('0')
  const [cart, setCart] = useState<PosCartLine[]>([])
  const [draftError, setDraftError] = useState('')
  const [checkoutLocked, setCheckoutLocked] = useState(true)
  const onDraftLock = useCallback((locked: boolean) => setCheckoutLocked(locked), [])
  const onSaleConfirmed = useCallback(() => {
    setCart([]); setDiscountText('0'); setSelectedId(''); setDraftError('')
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([
      companyApi.business(businessId, controller.signal),
      companyApi.locations(businessId, controller.signal),
      catalogApi.page(0, CATALOG_PAGE_SIZE, controller.signal),
    ]).then(async ([business, sites, first]) => {
      // No permisos por defecto: los roles no administrativos consultan su propia asignación.
      const assigned = canOverrideSalesPrice(business.membership.role)
        ? [] : await companyApi.myAssignedLocationIds(businessId, controller.signal)
      if (controller.signal.aborted) return
      setAssignedLocationIds(assigned)
      setCompany(business); setLocations(sites)
      setItems(first); setHasMore(first.length === CATALOG_PAGE_SIZE)
      setLoadState('ready'); setLoadError('')
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      if (error instanceof ApiHttpError && error.status === 401) { onUnauthorized(); return }
      setLoadState('error'); setLoadError(operationsError(error))
    })
    return () => { controller.abort() }
  }, [companyApi, catalogApi, businessId, onUnauthorized])

  const role = company?.membership.role ?? ''
  const manager = canOverrideSalesPrice(role)
  // Derivar una referencia estable para los cálculos del carrito y React Compiler.
  // La lista y la sede activa solo se recalculan al cambiar asignaciones/selección.
  const authorizedSites = useMemo(() => locations.filter(site =>
    canOverrideSalesPrice(role) || assignedLocationIds.includes(site.id)),
    [locations, role, assignedLocationIds])
  const location = useMemo(() =>
    authorizedSites.find(row => row.id === siteId) ?? null,
    [authorizedSites, siteId])
  const canWork = company?.status === 'ACTIVA' && company.membership.status === 'ACTIVA'
  const saleSites = authorizedSites.filter(site => site.status === 'ACTIVA' && site.can_sell)
  const selected = items.find(row => row.id === selectedId) ?? null
  const selectedInCart = selected ? cart.some(row => row.catalog_item_id === selected.id) : false
  const linePreview = useMemo(() => {
    if (!selected) return { subtotal: null as number | null, message: '' }
    try {
      const quantity = parsePosQuantity(quantityText, selected.unit)
      const price = manager && priceOverride ? pesosToCents(priceText) : selected.price_cents
      if (price === null) return { subtotal: null, message: 'Sin precio definido: un titular o administrador debe indicar un importe para cotizar.' }
      return { subtotal: posLineTotalCents(quantity, price), message: '' }
    } catch {
      return { subtotal: null, message: 'Ingresá cantidad y precio válidos para calcular el subtotal del producto.' }
    }
  }, [selected, quantityText, priceText, priceOverride, manager])
  const displayed = items.filter(item => {
    const term = search.trim().toLocaleLowerCase('es-AR')
    return item.status === 'ACTIVO' && item.sellable &&
      (!term || item.name.toLocaleLowerCase('es-AR').includes(term) ||
        (item.sku ?? '').toLocaleLowerCase('es-AR').includes(term))
  })

  const preview = useMemo(() => {
    if (!company || cart.length === 0) return { total: null, problem: '' }
    try {
      const discount = manager ? pesosToCents(discountText) : 0
      if (discount === null) throw new RangeError('Ingresá un descuento válido.')
      const calculation = previewPosCart(
        role, canWork, location, items, cart, discount,
      )
      return { total: calculation.totals, problem: '' }
    } catch (err) {
      return { total: null, problem: err instanceof Error ? err.message : 'Carrito inválido.' }
    }
  }, [company, cart, manager, discountText, role, canWork, location, items])

  const loadMore = useCallback(async () => {
    if (loadState !== 'ready' || loadingPage.current || !hasMore) return
    loadingPage.current = true
    setMoreLoading(true); setMoreError('')
    try {
      const next = await catalogApi.page(items.length, CATALOG_PAGE_SIZE)
      if (next.some(row => items.some(existing => existing.id === row.id))) {
        setMoreError('El catálogo cambió durante la carga. Volvé a abrir el POS para revisar todas las páginas.')
        setHasMore(false)
      } else {
        setItems(previous => [...previous, ...next])
        setHasMore(next.length === CATALOG_PAGE_SIZE)
      }
    } catch (err) {
      if (err instanceof ApiHttpError && err.status === 401) { onUnauthorized(); return }
      setMoreError(operationsError(err))
    } finally {
      loadingPage.current = false
      setMoreLoading(false)
    }
  }, [catalogApi, hasMore, items, loadState, onUnauthorized])

  function choose(item: CatalogItem) {
    const existing = cart.find(row => row.catalog_item_id === item.id)
    const hasCustomPrice = manager && existing !== undefined &&
      existing.unit_price_cents !== item.price_cents
    setSelectedId(item.id)
    setQuantityText(existing ? posQuantityText(existing.quantity_milli) : '1')
    setPriceOverride(hasCustomPrice)
    setPriceText(centsToPesos(hasCustomPrice && existing ? existing.unit_price_cents : item.price_cents))
    setDraftError('')
  }

  function addToCart() {
    setDraftError('')
    try {
      if (!selected || selected.status !== 'ACTIVO' || !selected.sellable)
        throw new RangeError('Seleccioná un artículo vendible.')
      const alreadyInCart = cart.some(row => row.catalog_item_id === selected.id)
      if (!alreadyInCart && cart.length >= 30)
        throw new RangeError('Máximo 30 artículos distintos por venta.')
      const quantity_milli = parsePosQuantity(quantityText, selected.unit)
      const unit_price_cents = manager && priceOverride ? pesosToCents(priceText) : selected.price_cents
      if (unit_price_cents === null)
        throw new RangeError('El artículo no tiene precio. Un administrador debe definirlo.')
      if (!siteId && (!manager || selected.item_type === 'BIEN'))
        throw new RangeError('Seleccioná una ubicación habilitada antes de agregar.')
      if (siteId && (!saleSites.some(site => site.id === siteId) || !location || location.status !== 'ACTIVA' || !location.can_sell ||
        (selected.item_type === 'BIEN' && !location.can_store)))
        throw new RangeError('La ubicación seleccionada no admite este artículo.')
      if (!canWork) throw new RangeError('La empresa o membresía no está activa.')
      // Validar también el subtotal individual; nunca redondear importes con floats.
      posLineTotalCents(quantity_milli, unit_price_cents)
      const updatedLine = { catalog_item_id: selected.id, quantity_milli, unit_price_cents }
      setCart(old => old.some(line => line.catalog_item_id === selected.id)
        ? old.map(line => line.catalog_item_id === selected.id ? updatedLine : line)
        : [...old, updatedLine])
      setSelectedId('')
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : 'No se pudo agregar el artículo.')
    }
  }

  return <section className="real-auth-card real-business-panel real-pos-panel" aria-label="Preparación de ventas REAL">
    <nav className="real-business-nav" aria-label="Navegación de empresa">
      <button className="real-auth-link" type="button" onClick={() => onNavigate('/real/empresas/' + businessId)}>Empresa</button>
      <button className="real-auth-link" type="button" onClick={() => onNavigate('/real/empresas/' + businessId + '/ventas')}>Historial de ventas</button>
      <button className="real-auth-link" type="button" onClick={() => onNavigate('/real/empresas/' + businessId + '/catalogo')}>Catálogo</button>
    </nav>
    <span className="real-auth-eyebrow">E2-7 · T10-D · POS REAL · pagos y revisión</span>
    <h1>Punto de venta</h1>
    <p>Armá el carrito con artículos y servicios de esta empresa. Los precios y permisos se comprobarán otra vez en FastAPI al confirmar una venta.</p>
    <p className="real-auth-note"><strong>Modo de validación T10-D.</strong> Podés preparar un carrito, declarar pagos y revisar la venta. El registro final sigue deshabilitado por defecto fuera de los ensayos aislados con PostgreSQL descartable. Nunca se acredita dinero externo automáticamente.</p>
    {loadState === 'loading' && <p role="status">Cargando empresa, sedes y catálogo REAL desde FastAPI…</p>}
    {loadState === 'error' && <p role="alert" className="real-auth-message real-auth-error">{loadError}</p>}
    {loadState === 'ready' && company && <>
      <div className="real-ops-toolbar">
        <strong>{company.name}</strong>
        <span>{role.replaceAll('_', ' ')} · {company.status}</span>
      </div>
      {!canWork && <p role="alert" className="real-auth-message real-ops-warning">La empresa o tu membresía no está activa. No podés preparar ventas.</p>}
      <fieldset className="real-pos-draft-fieldset" disabled={checkoutLocked}>
      <section className="real-ops-subpanel" aria-label="Ubicación para la venta">
        <h2>1. Ubicación de venta</h2>
        <label>Elegí la sede
          <select value={siteId} onChange={e => { setSiteId(e.target.value); setDraftError('') }}
            aria-label="Sede del punto de venta" disabled={!canWork}>
            <option value="">{manager ? 'Sin sede (solo servicios)' : 'Seleccionar sede asignada'}</option>
            {saleSites.map(site => <option key={site.id} value={site.id}>{site.name} {site.can_store ? '· ventas y stock' : '· solo servicios'}</option>)}
          </select>
        </label>
        {!manager && <p className="real-auth-note">Solo podés vender en sedes donde tengas asignación activa. FastAPI verifica la asignación al confirmar; elegir una sede acá no concede permisos.</p>}
      </section>
      <section className="real-ops-subpanel" aria-label="Catálogo disponible">
        <h2>2. Artículos y servicios</h2>
        <p className="real-auth-note">{items.length} fichas consultadas de PostgreSQL. {hasMore
          ? 'Hay más páginas sin consultar. La búsqueda solo abarca las fichas cargadas.'
          : 'Se llegó al final del catálogo consultado.'}</p>
        <label>Buscar entre fichas cargadas
          <input value={search} onChange={event => setSearch(event.target.value)}
            placeholder="Nombre o SKU" aria-label="Buscar artículos cargados"/>
        </label>
        <div className="real-pos-catalog">
          {displayed.map(item => <button type="button" key={item.id}
            className={'real-pos-product' + (selectedId === item.id ? ' real-pos-product-selected' : '')}
            disabled={!canWork} onClick={() => choose(item)}>
            <strong>{item.name}</strong>
            <small>{item.kind} · {item.unit} · {item.sku || 'Sin SKU'}</small>
            <span>{item.price_cents === null ? 'Sin precio definido' : money(item.price_cents)}</span>
            {cart.some(line => line.catalog_item_id === item.id) &&
              <small className="real-pos-in-cart">En carrito: {posQuantityText(cart.find(line => line.catalog_item_id === item.id)!.quantity_milli)} {item.unit}</small>}
          </button>)}
        </div>
        {displayed.length === 0 && <p className="real-business-empty">No hay artículos vendibles entre las fichas cargadas que coincidan con este filtro.</p>}
        {hasMore && <button className="real-auth-secondary" type="button" disabled={moreLoading}
          onClick={() => void loadMore()}>{moreLoading ? 'Consultando…' : 'Cargar más fichas de catálogo'}</button>}
        {moreError && <p role="alert" className="real-auth-message real-ops-warning">{moreError}</p>}
        {selected && <div className="real-pos-picker">
          <h3>Agregar: {selected.name}</h3>
          <div className="real-pos-fields">
            <label>Cantidad ({selected.unit})
              <input inputMode="decimal" aria-label="Cantidad del artículo" value={quantityText}
                onChange={e => setQuantityText(e.target.value)}/>
            </label>
            <label>Precio unitario (ARS)
              <input inputMode="decimal" aria-label="Precio unitario de la venta"
                value={manager && priceOverride ? priceText : centsToPesos(selected.price_cents)}
                disabled={!manager || !priceOverride}
                onChange={e => setPriceText(e.target.value)}/>
            </label>
          </div>
          {manager ? <button type="button" className="real-auth-link real-pos-price-override"
              aria-pressed={priceOverride}
              onClick={() => {
                setPriceOverride(previous => !previous)
                if (priceOverride) setPriceText(centsToPesos(selected.price_cents))
                setDraftError('')
              }}>
              {priceOverride ? 'Restablecer precio de catálogo' : 'Modificar precio excepcionalmente'}
            </button>
            : <p className="real-auth-note">Tu rol debe respetar el precio del catálogo y no puede aplicar descuentos.</p>}
          <div className="real-pos-line-preview" role="status">
            {linePreview.subtotal === null ? <span>{linePreview.message}</span>
              : <><span>Subtotal del producto ({quantityText} × precio unitario)</span>
                  <strong>{money(linePreview.subtotal)}</strong></>}
          </div>
          <button type="button" className="real-auth-primary" onClick={addToCart}>
            {selectedInCart ? 'Actualizar en carrito' : 'Agregar al carrito'}
          </button>
        </div>}
        {draftError && <p role="alert" className="real-auth-message real-auth-error">{draftError}</p>}
      </section>
      <section className="real-ops-subpanel" aria-label="Carrito de venta">
        <h2>3. Carrito · borrador</h2>
        {cart.length === 0 && <p className="real-business-empty">Aún no agregaste artículos. No se realizó ninguna venta.</p>}
        {cart.map(row => {
          const item = items.find(product => product.id === row.catalog_item_id)
          return <article key={row.catalog_item_id} className="real-pos-cart-row">
            <div><strong>{item?.name ?? 'Artículo no disponible'}</strong>
              <small>Cantidad: {posQuantityText(row.quantity_milli)} {item?.unit || ''} × Precio unitario: {money(row.unit_price_cents)}</small>
              <strong className="real-pos-line-total">Subtotal del producto: {money(posLineTotalCents(row.quantity_milli, row.unit_price_cents))}</strong>
            </div>
            <div className="real-pos-cart-actions">
              {item && <button className="real-auth-link" type="button" onClick={() => choose(item)}>Editar</button>}
              <button className="real-auth-link" type="button" onClick={() =>
                setCart(previous => previous.filter(line => line.catalog_item_id !== row.catalog_item_id))}>Quitar</button>
            </div>
          </article>
        })}
        {manager && <label>Descuento de la venta (ARS)
          <input inputMode="decimal" aria-label="Descuento de la venta" value={discountText}
            onChange={e => setDiscountText(e.target.value)}/>
        </label>}
        {preview.problem && <p role="alert" className="real-auth-message real-ops-warning">{preview.problem}</p>}
        {preview.total && <div className="real-pos-summary">
          <span>Subtotal <strong>{money(preview.total.subtotal_cents)}</strong></span>
          <span>Descuento <strong>−{money(preview.total.discount_cents)}</strong></span>
          <span>Total estimado <strong>{money(preview.total.total_cents)}</strong></span>
        </div>}
        <p className="real-auth-note">El carrito todavía no es una venta. La revisión de pagos y la confirmación quedan separadas en el paso siguiente. Si existe un intento pendiente, se bloquea la edición para evitar duplicados.</p>
      </section>
      </fieldset>
      <RealPosCheckout token={token} userId={userId} businessId={businessId}
        businessName={company.name} role={role} businessActive={canWork}
        location={location} items={items} cart={cart} discountText={discountText}
        onDraftLock={onDraftLock} onConfirmed={onSaleConfirmed}
        onUnauthorized={onUnauthorized} onNavigate={onNavigate}/>
    </>}
  </section>
}
