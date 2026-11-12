import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiHttpError } from '../../api/httpClient.ts'
import type { RealBusiness } from '../businesses/businessGateway.ts'
import { createOperationsGateway, operationsError } from '../businesses/realOperationsGateway.ts'
import type { LocationRecord } from '../businesses/realOperationsGateway.ts'
import { CATALOG_PAGE_SIZE, centsToPesos, createCatalogGateway, pesosToCents } from '../catalog/realCatalogGateway.ts'
import type { CatalogItem } from '../catalog/realCatalogGateway.ts'
import type { PosCartLine } from './realPosDraft.ts'
import { RealPosCheckout } from './RealPosCheckout.tsx'
import type { PosCheckoutStage } from './RealPosCheckout.tsx'
import { Icon } from '../../app/Icon.tsx'
import { RealPhotoPreview } from '../photos/RealPhotos.tsx'
import { createInventoryGateway, formatMilli, inventoryErrorMessage } from '../inventory/realInventoryGateway.ts'
import './realSalesVisual.css'
import { addOnePosCartUnit, canOverrideSalesPrice, parsePosQuantity, posLineTotalCents, posQuantityText, previewPosCart } from './realPosDraft.ts'

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
  const inventoryApi = useMemo(() => createInventoryGateway(token,businessId),[token,businessId])
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
  const [cartNotice,setCartNotice]=useState('')
  const [stockRead,setStockRead]=useState<{
    siteId:string;itemId:string;quantityMilli:number;updatedAt:string|null
  }|null>(null)
  const [stockLoading,setStockLoading]=useState(false)
  const [stockError,setStockError]=useState('')
  const [stockRefresh,setStockRefresh]=useState(0)
  const [siteStock,setSiteStock]=useState<{
    siteId:string;balances:Record<string,number>;complete:boolean;error:string
  }|null>(null)
  const [checkoutLocked, setCheckoutLocked] = useState(true)
  const [checkoutStage,setCheckoutStage]=useState<PosCheckoutStage>('checking')
  const onCheckoutStageChange=useCallback((stage:PosCheckoutStage)=>setCheckoutStage(stage),[])
  const isDedicatedCheckout=['review','sending','pending','confirmed'].includes(checkoutStage)
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
  const scopedSiteStock=siteId&&siteStock?.siteId===siteId?siteStock:null
  function cardStock(item:CatalogItem):number|null {
    if(item.item_type!=='BIEN'||!scopedSiteStock)return null
    const known=scopedSiteStock.balances[item.id]
    return known!==undefined?known:scopedSiteStock.complete?0:null
  }
  const siteStockPending=Boolean(siteId&&location?.can_store&&!scopedSiteStock)
  const stockForSelected=selected?.item_type==='BIEN' && stockRead?.siteId===siteId
    && stockRead.itemId===selected.id?stockRead:null
  const requestedMilli=useMemo(()=>{
    if(!selected||selected.item_type!=='BIEN')return null
    try{return parsePosQuantity(quantityText,selected.unit)}
    catch{return null}
  },[selected,quantityText])
  const overAvailable=stockForSelected!==null&&requestedMilli!==null
    &&requestedMilli>stockForSelected.quantityMilli

  // IDs primitivos: el efecto solo cambia cuando cambia la selección,
  // la sede autorizada o se solicita actualizar; sin referencias incompletas.
  const stockItemId=selected?.item_type==='BIEN'?selected.id:null
  const stockSiteId=location?.can_store?location.id:null
  // Saldo real por artículo/sede. No se inventa el stock para productos sin
  // historial, y no se permite confirmar desde una lectura fallida/desactualizada.
  useEffect(()=>{
    if(!stockItemId||!stockSiteId)return
    const itemId=stockItemId
    const currentSiteId=stockSiteId
    const controller=new AbortController()
    void inventoryApi.balances(0,1,{locationId:currentSiteId,catalogItemId:itemId},controller.signal)
      .then(rows=>{
        if(controller.signal.aborted)return
        setStockRead({
          siteId:currentSiteId,itemId,
          quantityMilli:rows[0]?.quantity_milli??0,
          updatedAt:rows[0]?.updated_at??null,
        })
        setStockError('')
      }).catch(err=>{
        if(controller.signal.aborted)return
        if(err instanceof ApiHttpError&&err.status===401){onUnauthorized();return}
        setStockRead(null)
        setStockError(inventoryErrorMessage(err))
      }).finally(()=>{
        if(!controller.signal.aborted)setStockLoading(false)
      })
    return ()=>controller.abort()
  },[inventoryApi,stockItemId,stockSiteId,stockRefresh,onUnauthorized])
  // Consulta el inventario de la sede, paginado y acotado. No sumamos
  // unidades heterogéneas ni tomamos una página incompleta como stock cero.
  useEffect(()=>{
    if(!location?.can_store)return
    const controller=new AbortController()
    const activeId=location.id
    async function loadSiteStocks(){
      const balances:Record<string,number>={}
      let complete=false
      try{
        for(let page=0;page<20;page++){
          const result=await inventoryApi.balances(page*500,500,
            {locationId:activeId},controller.signal)
          for(const row of result)balances[row.catalog_item_id]=row.quantity_milli
          if(result.length<500){complete=true;break}
        }
        if(!controller.signal.aborted)
          setSiteStock({siteId:activeId,balances,complete,error:''})
      }catch(error){
        if(controller.signal.aborted)return
        if(error instanceof ApiHttpError&&error.status===401){onUnauthorized();return}
        setSiteStock({siteId:activeId,balances:{},complete:false,
          error:inventoryErrorMessage(error)})
      }
    }
    void loadSiteStocks()
    return ()=>controller.abort()
  },[inventoryApi,location?.id,location?.can_store,stockRefresh,onUnauthorized])

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
    setCartNotice('')
    const existing = cart.find(row => row.catalog_item_id === item.id)
    const hasCustomPrice = manager && existing !== undefined &&
      existing.unit_price_cents !== item.price_cents
    setSelectedId(item.id)
    setStockRead(null);setStockError('')
    setStockLoading(item.item_type==='BIEN'&&Boolean(siteId))
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
      if(selected.item_type==='BIEN'){
        if(stockLoading||!stockForSelected||stockError)
          throw new RangeError('No se pudo verificar el saldo de esta sede. Actualizá la disponibilidad antes de agregar.')
        if(quantity_milli>stockForSelected.quantityMilli)
          throw new RangeError('La cantidad supera el saldo disponible ('+
            formatMilli(stockForSelected.quantityMilli)+' '+selected.unit+').')
      }
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
      setCartNotice('Se guardó el artículo en el detalle de venta.')
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : 'No se pudo agregar el artículo.')
    }
  }

  function addProductFromCatalog(item:CatalogItem){
    setCartNotice('')
    try{
      if(checkoutLocked||!canWork)throw new RangeError('No podés preparar una venta en este momento.')
      if(!siteId&&(!manager||item.item_type==='BIEN'))
        throw new RangeError('Elegí una sede autorizada antes de agregar este artículo.')
      if(siteId&&(!location||location.status!=='ACTIVA'||!location.can_sell||
          (item.item_type==='BIEN'&&!location.can_store)))
        throw new RangeError('La sede seleccionada no está habilitada para vender este artículo.')
      if(item.price_cents===null&&!cart.some(line=>line.catalog_item_id===item.id)){
        if(manager){
          choose(item)
          throw new RangeError('Definí el precio en el detalle de venta antes de incorporar este artículo.')
        }
        throw new RangeError('El artículo no tiene precio. Consultá al administrador.')
      }
      setCart(addOnePosCartUnit(cart,item,cardStock(item)))
      setSelectedId('')
      setDraftError('')
      setCartNotice('Se agregó 1 '+item.unit+' de '+item.name+' al detalle de venta. Editá las cantidades allí.')
    }catch(error){
      setDraftError(error instanceof Error?error.message:'No se pudo agregar el artículo al carrito.')
    }
  }

  function changeCartByUnit(line:PosCartLine,direction:1|-1){
    const item=items.find(product=>product.id===line.catalog_item_id)
    if(!item)return
    const next=line.quantity_milli+direction*1000
    if(next<1000||next>999_999_999){
      setDraftError('La cantidad debe permanecer dentro del rango de unidades permitidas.')
      return
    }
    // No hacer cambios rápidos cuando el saldo de esa sede no fue consultado.
    if(item.item_type==='BIEN'){
      const available=cardStock(item)
      if(available===null){
        setDraftError('Primero consultá el stock en esta sede antes de añadir unidades.')
        choose(item)
        return
      }
      if(next>available){
        setDraftError('No se pueden agregar más unidades que el saldo consultado en esta sede ('+
          formatMilli(available)+' '+item.unit+').')
        return
      }
    }
    setDraftError('')
    setCartNotice('')
    setCart(previous=>previous.map(row=>row.catalog_item_id===line.catalog_item_id
      ? {...row,quantity_milli:next}:row))
  }

  return <section className="real-auth-card real-business-panel real-pos-panel e3-pos-page" aria-label="Preparación de ventas REAL">
    {!isDedicatedCheckout&&<nav className="real-business-nav" aria-label="Navegación de empresa">
      <button className="real-auth-link" type="button" onClick={() => onNavigate('/real/empresas/' + businessId)}>Empresa</button>
      <button className="real-auth-link" type="button" onClick={() => onNavigate('/real/empresas/' + businessId + '/ventas')}>Historial de ventas</button>
      <button className="real-auth-link" type="button" onClick={() => onNavigate('/real/empresas/' + businessId + '/catalogo')}>Catálogo</button>
    </nav>}
    <header className="e3-sales-heading">
      <span className="e3-sales-heading-icon"><Icon name="shopping" size={27}/></span>
      <div className="e3-sales-heading-copy">
        <span className="e3-sales-eyebrow">{company?.name??'Empresa'} · Ventas REAL</span>
        <h1>{checkoutStage==='review'?'Revisión y confirmación'
          :checkoutStage==='sending'?'Procesando venta'
          :checkoutStage==='pending'?'Recuperación de venta'
          :checkoutStage==='confirmed'?'Venta confirmada'
          :'Punto de venta'}</h1>
        <p>{isDedicatedCheckout
          ?'Comprobá la solicitud y su estado antes de iniciar otra venta. No se enviará ninguna operación automáticamente.'
          :'Armá el carrito y declará los pagos de la venta. FastAPI volverá a validar permisos, precios y stock al confirmar.'}</p>
      </div>
      {isDedicatedCheckout&&<span className="e3-sales-mode-indicator">{checkoutStage==='review'?'Paso 2 · Revisión':checkoutStage==='confirmed'?'Confirmada':checkoutStage==='pending'?'Recuperación':'Verificando'}</span>}
    </header>
    <p className="real-auth-note"><strong>Modo de validación T10-D.</strong> Podés preparar un carrito, declarar pagos y revisar la venta. El registro final sigue deshabilitado por defecto fuera de los ensayos aislados con PostgreSQL descartable. Nunca se acredita dinero externo automáticamente.</p>
    {loadState === 'loading' && <p role="status">Cargando empresa, sedes y catálogo REAL desde FastAPI…</p>}
    {loadState === 'error' && <p role="alert" className="real-auth-message real-auth-error">{loadError}</p>}
    {loadState === 'ready' && company && <>
      <div className="real-ops-toolbar e3-pos-tenant-strip">
        <strong>{company.name}</strong>
        <span>{role.replaceAll('_', ' ')} · {company.status}</span>
      </div>
      {!canWork && <p role="alert" className="real-auth-message real-ops-warning">La empresa o tu membresía no está activa. No podés preparar ventas.</p>}
      <fieldset className={'real-pos-draft-fieldset e3-pos-draft-fieldset'+(isDedicatedCheckout?' e3-pos-draft-hidden':'')} disabled={checkoutLocked}>
      <section className="real-ops-subpanel" aria-label="Ubicación para la venta">
        <h2>1. Ubicación de venta</h2>
        <label>Elegí la sede
          <select value={siteId} onChange={e => {
            setSiteId(e.target.value);setDraftError('')
            setStockRead(null);setStockError('')
            setStockLoading(selected?.item_type==='BIEN'&&Boolean(e.target.value))
          }}
            aria-label="Sede del punto de venta" disabled={!canWork}>
            <option value="">{manager ? 'Sin sede (solo servicios)' : 'Seleccionar sede asignada'}</option>
            {saleSites.map(site => <option key={site.id} value={site.id}>{site.name} {site.can_store ? '· ventas y stock' : '· solo servicios'}</option>)}
          </select>
        </label>
        {!manager && <p className="real-auth-note">Solo podés vender en sedes donde tengas asignación activa. FastAPI verifica la asignación al confirmar; elegir una sede acá no concede permisos.</p>}
      </section>
      {draftError&&<p role="alert" className="real-auth-message real-auth-error e3-pos-global-error">{draftError}</p>}
      <div className="e3-pos-workspace-grid">
      <section className="real-ops-subpanel e3-pos-catalog-section" aria-label="Catálogo disponible">
        <h2>2. Artículos y servicios</h2>
        <p className="real-auth-note">{items.length} fichas consultadas de PostgreSQL. {hasMore
          ? 'Hay más páginas sin consultar. La búsqueda solo abarca las fichas cargadas.'
          : 'Se llegó al final del catálogo consultado.'}</p>
        <label>Buscar entre fichas cargadas
          <input value={search} onChange={event => setSearch(event.target.value)}
            placeholder="Nombre o SKU" aria-label="Buscar artículos cargados"/>
        </label>
        <p className="e3-pos-catalog-instruction">«Agregar unidades» suma 1 unidad al detalle de venta. Editá las cantidades en el carrito.</p>
        <div className="real-pos-catalog e3-pos-card-catalog">
          {displayed.map(item => {
            const existing=cart.find(line=>line.catalog_item_id===item.id)
            const available=cardStock(item)
            const requiresStock=item.item_type==='BIEN'
            const siteReady=Boolean(location&&location.status==='ACTIVA'&&location.can_sell&&
              (!requiresStock||location.can_store))
            const missingPrice=item.price_cents===null&&!existing
            const canQuickAdd=Boolean(canWork&&!checkoutLocked&&
              (siteReady||(!siteId&&manager&&!requiresStock))&&
              (!requiresStock||(available!==null&&available>=(existing?.quantity_milli??0)+1000)))
            return <article key={item.id}
              className={'real-pos-product e3-pos-product-card'+
                (existing?' e3-pos-card-in-cart':'')} aria-label={'Artículo '+item.name}>
              <RealPhotoPreview token={token} owner={{kind:'CATALOG',businessId,resourceId:item.id}}
                alt={"Foto de "+item.name} className="e3-pos-card-image" fallbackIcon={item.item_type==='SERVICIO'?'briefcase':'package'}/>
              <span className="e3-pos-card-category">{item.category||item.kind}</span>
              <strong>{item.name}</strong>
              <small>SKU: {item.sku||'Sin SKU'} · {item.unit}</small>
              <span className="e3-pos-card-availability">
                {item.item_type==='SERVICIO'?'Servicio · no consume inventario'
                :!location?.can_store?'Seleccioná una sede con depósito'
                :siteStockPending?'Consultando disponibilidad…'
                :scopedSiteStock?.error?'No se pudo consultar stock'
                :available===null?'Stock sin verificar'
                :'Disponible en '+location.name+': '+formatMilli(available)+' '+item.unit}
              </span>
              {existing&&<small className="real-pos-in-cart">En detalle: {posQuantityText(existing.quantity_milli)} {item.unit}</small>}
              <div className="e3-pos-card-footer">
                <b>{item.price_cents===null?'Precio a definir':money(item.price_cents)}</b>
                <button type="button" className="e3-pos-card-add"
                  disabled={missingPrice?!manager||!canWork||checkoutLocked:!canQuickAdd}
                  aria-label={missingPrice?'Definir precio de '+item.name:'Agregar una unidad de '+item.name+' al detalle de venta'}
                  onClick={()=>addProductFromCatalog(item)}>
                  <Icon name="plus" size={15}/>
                  {missingPrice?'Definir precio':'Agregar unidades'}
                </button>
              </div>
              {requiresStock&&siteReady&&available===null&&<button
                type="button" className="real-auth-link e3-pos-verify-stock"
                onClick={()=>choose(item)}>Verificar disponibilidad</button>}
            </article>
          })}
        </div>
        {displayed.length === 0 && <p className="real-business-empty">No hay artículos vendibles entre las fichas cargadas que coincidan con este filtro.</p>}
        {hasMore && <button className="real-auth-secondary" type="button" disabled={moreLoading}
          onClick={() => void loadMore()}>{moreLoading ? 'Consultando…' : 'Cargar más fichas de catálogo'}</button>}
        {moreError && <p role="alert" className="real-auth-message real-ops-warning">{moreError}</p>}
      </section>
      <section className="real-ops-subpanel e3-pos-cart-section" aria-label="Carrito de venta">
        <div className="e3-pos-cart-header">
          <h2>3. Detalle de venta · borrador</h2>
          <span className="e3-pos-cart-count">{cart.length} artículos distintos</span>
        </div>
        {cartNotice&&<p role="status" className="e3-pos-cart-notice">{cartNotice}</p>}
        {cart.length === 0 && <p className="real-business-empty">Aún no agregaste artículos. No se realizó ninguna venta.</p>}
        <div className="e3-pos-ticket-lines" aria-label="Productos y cantidades de esta venta">
        {cart.map((row,index) => {
          const item = items.find(product => product.id === row.catalog_item_id)
          return <article key={row.catalog_item_id} className="real-pos-cart-row">
            <span className="e3-pos-line-number" aria-hidden="true">{index+1}</span>
            <div className="e3-pos-cart-line-info"><strong>{item?.name ?? 'Artículo no disponible'}</strong>
              <small>Cantidad: {posQuantityText(row.quantity_milli)} {item?.unit || ''} × Precio unitario: {money(row.unit_price_cents)}</small>
              <strong className="real-pos-line-total">Subtotal del producto: {money(posLineTotalCents(row.quantity_milli, row.unit_price_cents))}</strong>
            </div>
            <div className="real-pos-cart-actions e3-pos-cart-actions">
              {item&&<div className="e3-pos-cart-quantity" role="group" aria-label={'Unidades de '+item.name}>
                <button type="button" aria-label={'Quitar una unidad de '+item.name}
                  disabled={row.quantity_milli<=1000}
                  onClick={()=>changeCartByUnit(row,-1)}>−</button>
                <strong>{posQuantityText(row.quantity_milli)}</strong>
                <button type="button" aria-label={'Agregar una unidad de '+item.name}
                  onClick={()=>changeCartByUnit(row,1)}>+</button>
              </div>}
              {item && <button className="real-auth-link" type="button" onClick={() => choose(item)}>Editar cantidad</button>}
              <button className="real-auth-link" type="button" onClick={()=>{
                setCart(previous=>previous.filter(line=>line.catalog_item_id!==row.catalog_item_id))
                if(selectedId===row.catalog_item_id)setSelectedId('')
                setDraftError('');setCartNotice('')
              }}>Quitar</button>
            </div>
          </article>
        })}
        </div>
        {selected && <div className="real-pos-picker">
          <div className="e3-pos-picker-head">
              <h3>{selectedInCart?'Editar artículo: ':'Definir artículo: '}{selected.name}</h3>
              <button type="button" className="real-auth-link"
                onClick={()=>setSelectedId('')}>Cerrar edición</button>
            </div>
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
          {selected.item_type==='BIEN'&&<div className="e3-pos-stock-hint" aria-label="Disponibilidad de stock REAL">
            {!location?.can_store?<p>Elegí una sede habilitada para almacenar y vender este producto.</p>
              :stockLoading?<p role="status">Consultando saldo real en {location.name}…</p>
              :stockError?<p role="alert">{stockError}</p>
              :stockForSelected?<p><strong>Disponible en {location.name}:
                {' '}{formatMilli(stockForSelected.quantityMilli)} {selected.unit}</strong>
                {stockForSelected.updatedAt&&<small>Saldo registrado: {new Date(stockForSelected.updatedAt).toLocaleString('es-AR')}</small>}
              </p>:<p>Seleccioná una sede para consultar el saldo real.</p>}
            {overAvailable&&<p role="alert" className="e3-pos-stock-warning">
              La cantidad supera el stock disponible de esta sede. Ingresá una cantidad igual o menor.</p>}
            <button type="button" className="real-auth-link"
              disabled={!location?.can_store||stockLoading}
              onClick={()=>{
                setStockRead(null);setStockError('');setStockLoading(true)
                setStockRefresh(value=>value+1)
              }}>Actualizar disponibilidad</button>
            <small>Consulta orientativa: no reserva mercadería. FastAPI vuelve a comprobar el stock al confirmar.</small>
          </div>}
          <div className="real-pos-line-preview" role="status">
            {linePreview.subtotal === null ? <span>{linePreview.message}</span>
              : <><span>Subtotal del producto ({quantityText} × precio unitario)</span>
                  <strong>{money(linePreview.subtotal)}</strong></>}
          </div>
          <button type="button" className="real-auth-primary" onClick={addToCart}
            disabled={selected.item_type==='BIEN'&&
              (stockLoading||!stockForSelected||Boolean(stockError)||overAvailable)}>
            {selectedInCart ? 'Guardar cambios en detalle' : 'Agregar al detalle con este precio'}
          </button>
        </div>}

        <div className="real-pos-summary e3-pos-cart-totals" aria-label="Desglose del total de compra">
          <span>Subtotal de artículos <strong>{preview.total?money(preview.total.subtotal_cents):cart.length===0?money(0):'—'}</strong></span>
          {manager&&<label className="e3-pos-cart-discount">Descuento de la venta (ARS)
            <input inputMode="decimal" aria-label="Descuento de la venta" value={discountText}
              onChange={e => setDiscountText(e.target.value)}/>
          </label>}
          <span>Descuento aplicado <strong>{preview.total?'−'+money(preview.total.discount_cents):'—'}</strong></span>
          <span className="e3-pos-cart-total">Total a cobrar <strong>{preview.total?money(preview.total.total_cents):'—'}</strong></span>
          {cart.length===0&&<small>Agregá artículos para calcular el descuento y el total.</small>}
          {cart.length>0&&!preview.total&&<small>Corregí el carrito o el descuento para obtener un total válido.</small>}
        </div>
        {preview.problem&&cart.length>0&&<p role="alert" className="real-auth-message real-ops-warning">{preview.problem}</p>}
        <p className="real-auth-note">Este detalle es un borrador. «Finalizar venta» abre la revisión completa; solo una confirmación explícita registra la operación y afecta el inventario.</p>
      </section>
      </div>
      </fieldset>
      <RealPosCheckout token={token} userId={userId} businessId={businessId}
        businessName={company.name} role={role} businessActive={canWork}
        location={location} items={items} cart={cart} discountText={discountText}
        onDraftLock={onDraftLock} onStageChange={onCheckoutStageChange} onConfirmed={onSaleConfirmed}
        onUnauthorized={onUnauthorized} onNavigate={onNavigate}/>
    </>}
  </section>
}
