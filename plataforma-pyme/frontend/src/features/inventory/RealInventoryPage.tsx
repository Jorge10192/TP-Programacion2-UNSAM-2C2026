import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiHttpError } from '../../api/httpClient.ts'
import type { RealBusiness } from '../businesses/businessGateway.ts'
import { createOperationsGateway } from '../businesses/realOperationsGateway.ts'
import type { LocationRecord } from '../businesses/realOperationsGateway.ts'
import { createCatalogGateway, CATALOG_PAGE_SIZE } from '../catalog/realCatalogGateway.ts'
import type { CatalogItem } from '../catalog/realCatalogGateway.ts'
import {
  createInventoryGateway, formatDelta, formatMilli, INVENTORY_EVENTS,
  INVENTORY_PAGE_SIZE, inventoryErrorMessage,
} from './realInventoryGateway.ts'
import type { StockBalance, InventoryMovement, InventoryQuery } from './realInventoryGateway.ts'

type Props = {
  token:string;userId:string;businessId:string
  onNavigate:(path:string)=>void;onUnauthorized:()=>void
}
type Tab = 'balances'|'movements'
function formatDate(v:string):string {
  return new Intl.DateTimeFormat('es-AR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v))
}
function shortId(v:string):string { return v.slice(0,8)+'…' }

/** E2-7/T08-1: read only, no journal, no stock calculations from frontend purchases. */
export function RealInventoryPage({token,userId,businessId,onNavigate,onUnauthorized}:Props) {
  const companyApi=useMemo(()=>createOperationsGateway(token,userId),[token,userId])
  const catalogApi=useMemo(()=>createCatalogGateway(token,businessId),[token,businessId])
  const inventoryApi=useMemo(()=>createInventoryGateway(token,businessId),[token,businessId])
  const [company,setCompany]=useState<RealBusiness|null>(null)
  const [locations,setLocations]=useState<LocationRecord[]>([])
  const [catalog,setCatalog]=useState<CatalogItem[]>([])
  const [catalogHasMore,setCatalogHasMore]=useState(false)
  const [metadataLoading,setMetadataLoading]=useState(true)
  const [catalogLoading,setCatalogLoading]=useState(false)
  const [metadataError,setMetadataError]=useState('')
  const [locationId,setLocationId]=useState('')
  const [catalogItemId,setCatalogItemId]=useState('')
  const [tab,setTab]=useState<Tab>('balances')
  const [balances,setBalances]=useState<StockBalance[]>([])
  const [movements,setMovements]=useState<InventoryMovement[]>([])
  const [balancesHasMore,setBalancesHasMore]=useState(false)
  const [movementsHasMore,setMovementsHasMore]=useState(false)
  const [dataLoading,setDataLoading]=useState(true)
  const [balancesMoreLoading,setBalancesMoreLoading]=useState(false)
  const [movementsMoreLoading,setMovementsMoreLoading]=useState(false)
  const [dataLoaded,setDataLoaded]=useState(false)
  const [dataError,setDataError]=useState('')
  const [pageError,setPageError]=useState('')
  const [refreshVersion,setRefreshVersion]=useState(0)
  const metadataEpoch=useRef(0)
  const dataEpoch=useRef(0)
  const moreControllers=useRef<AbortController[]>([])

  useEffect(()=>{
    const controller=new AbortController()
    const epoch=++metadataEpoch.current
    void Promise.all([
      companyApi.business(businessId,controller.signal),
      companyApi.locations(businessId,controller.signal),
      catalogApi.page(0,CATALOG_PAGE_SIZE,controller.signal),
    ]).then(([business,sites,items])=>{
      if(controller.signal.aborted||epoch!==metadataEpoch.current)return
      setCompany(business);setLocations(sites);setCatalog(items)
      setCatalogHasMore(items.length===CATALOG_PAGE_SIZE)
      setMetadataError('')
    }).catch((err:unknown)=>{
      if(controller.signal.aborted||epoch!==metadataEpoch.current)return
      if(err instanceof ApiHttpError&&err.status===401){onUnauthorized();return}
      setCompany(null);setMetadataError(inventoryErrorMessage(err))
    }).finally(()=>{
      if(!controller.signal.aborted&&epoch===metadataEpoch.current)setMetadataLoading(false)
    })
    return ()=>{controller.abort();metadataEpoch.current++}
  },[businessId,companyApi,catalogApi,onUnauthorized,refreshVersion])

  const query=useMemo<InventoryQuery>(()=>({
    ...(locationId?{locationId}:{}),...(catalogItemId?{catalogItemId}:{}),
  }),[locationId,catalogItemId])

  useEffect(()=>{
    const controller=new AbortController()
    const epoch=++dataEpoch.current
    moreControllers.current.forEach(c=>c.abort())
    moreControllers.current=[]
    setDataLoading(true);setDataLoaded(false);setDataError('');setPageError('')
    setBalances([]);setMovements([]);setBalancesHasMore(false);setMovementsHasMore(false)
    setBalancesMoreLoading(false);setMovementsMoreLoading(false)
    void Promise.all([
      inventoryApi.balances(0,INVENTORY_PAGE_SIZE,query,controller.signal),
      inventoryApi.movements(0,INVENTORY_PAGE_SIZE,query,controller.signal),
    ]).then(([balancePage,movementPage])=>{
      if(controller.signal.aborted||epoch!==dataEpoch.current)return
      setBalances(balancePage);setMovements(movementPage)
      setBalancesHasMore(balancePage.length===INVENTORY_PAGE_SIZE)
      setMovementsHasMore(movementPage.length===INVENTORY_PAGE_SIZE)
      setDataLoaded(true)
    }).catch((err:unknown)=>{
      if(controller.signal.aborted||epoch!==dataEpoch.current)return
      if(err instanceof ApiHttpError&&err.status===401){onUnauthorized();return}
      setDataError(inventoryErrorMessage(err))
    }).finally(()=>{
      if(!controller.signal.aborted&&epoch===dataEpoch.current)setDataLoading(false)
    })
    return ()=>{
      controller.abort()
      moreControllers.current.forEach(c=>c.abort())
      moreControllers.current=[]
      dataEpoch.current++
    }
  },[inventoryApi,query,refreshVersion,onUnauthorized])

  async function nextPage(which:Tab) {
    if(!dataLoaded||dataLoading||balancesMoreLoading||movementsMoreLoading)return
    if(which==='balances'&&!balancesHasMore)return
    if(which==='movements'&&!movementsHasMore)return
    const epoch=dataEpoch.current
    const controller=new AbortController()
    moreControllers.current.push(controller)
    const existing=which==='balances'?balances:movements
    setPageError('')
    if(which==='balances')setBalancesMoreLoading(true)
    else setMovementsMoreLoading(true)
    try{
      if(which==='balances'){
        const next=await inventoryApi.balances(existing.length,INVENTORY_PAGE_SIZE,query,controller.signal)
        if(controller.signal.aborted||epoch!==dataEpoch.current)return
        const keys=new Set((existing as StockBalance[]).map(x=>x.location_id+':'+x.catalog_item_id))
        if(next.some(x=>keys.has(x.location_id+':'+x.catalog_item_id))){
          setBalancesHasMore(false)
          setPageError('Los saldos cambiaron entre páginas. Actualizá el listado para evitar duplicados.')
          return
        }
        setBalances(old=>[...old,...next]);setBalancesHasMore(next.length===INVENTORY_PAGE_SIZE)
      }else{
        const next=await inventoryApi.movements(existing.length,INVENTORY_PAGE_SIZE,query,controller.signal)
        if(controller.signal.aborted||epoch!==dataEpoch.current)return
        const keys=new Set((existing as InventoryMovement[]).map(x=>x.id))
        if(next.some(x=>keys.has(x.id))){
          setMovementsHasMore(false)
          setPageError('El historial cambió mientras se paginaba. Actualizá para evitar movimientos repetidos.')
          return
        }
        setMovements(old=>[...old,...next]);setMovementsHasMore(next.length===INVENTORY_PAGE_SIZE)
      }
    }catch(err){
      if(controller.signal.aborted||epoch!==dataEpoch.current)return
      if(err instanceof ApiHttpError&&err.status===401){onUnauthorized();return}
      setPageError(inventoryErrorMessage(err))
    }finally{
      moreControllers.current=moreControllers.current.filter(c=>c!==controller)
      if(epoch===dataEpoch.current){
        if(which==='balances')setBalancesMoreLoading(false)
        else setMovementsMoreLoading(false)
      }
    }
  }

  async function loadMoreCatalog() {
    if(!company||catalogLoading||metadataLoading||!catalogHasMore)return
    const epoch=metadataEpoch.current
    const controller=new AbortController()
    setCatalogLoading(true);setMetadataError('')
    try{
      const next=await catalogApi.page(catalog.length,CATALOG_PAGE_SIZE,controller.signal)
      if(epoch!==metadataEpoch.current)return
      const oldIds=new Set(catalog.map(x=>x.id))
      if(next.some(x=>oldIds.has(x.id))){
        setCatalogHasMore(false)
        setMetadataError('El catálogo cambió entre páginas. Actualizá para volver a consultarlo desde el inicio.')
        return
      }
      setCatalog(old=>[...old,...next]);setCatalogHasMore(next.length===CATALOG_PAGE_SIZE)
    }catch(err){
      if(epoch!==metadataEpoch.current)return
      if(err instanceof ApiHttpError&&err.status===401){onUnauthorized();return}
      setMetadataError(inventoryErrorMessage(err))
    }finally{if(epoch===metadataEpoch.current)setCatalogLoading(false)}
  }

  const itemLabels=useMemo(()=>new Map(catalog.map(x=>[x.id,x])),[catalog])
  const locationLabels=useMemo(()=>new Map(locations.map(x=>[x.id,x])),[locations])
  const itemName=(id:string)=>itemLabels.get(id)?.name??'Artículo '+shortId(id)
  const siteName=(id:string)=>locationLabels.get(id)?.name??'Ubicación '+shortId(id)
  const unitName=(id:string)=>itemLabels.get(id)?.unit??'unidad no disponible'
  const activePage=tab==='balances'?balances:movements
  const hasMore=tab==='balances'?balancesHasMore:movementsHasMore
  const fetchingMore=tab==='balances'?balancesMoreLoading:movementsMoreLoading

  return <section className="real-auth-card real-business-panel real-inventory" aria-label="Inventario real">
    <nav className="real-business-nav" aria-label="Navegación del inventario REAL">
      <button className="real-auth-link" type="button" onClick={()=>onNavigate('/real/empresas/'+businessId)}>Empresa</button>
      <button className="real-auth-link" type="button" onClick={()=>onNavigate('/real/empresas/'+businessId+'/catalogo')}>Catálogo</button>
      <button className="real-auth-link" type="button" onClick={()=>onNavigate('/real/empresas/'+businessId+'/compras')}>Compras y recepciones</button>
      <button className="real-auth-link" type="button" onClick={()=>onNavigate('/real/empresas')}>Mis empresas</button>
    </nav>
    <span className="real-auth-eyebrow">E2-7 · T08-1 · INVENTARIO REAL</span>
    <h1>Inventario</h1>
    <p>Saldos y movimientos confirmados en FastAPI y PostgreSQL, por empresa y ubicación. Este panel es de solo lectura: no utiliza existencias de DEMO.</p>
    {metadataLoading&&<p role="status">Comprobando empresa, ubicaciones y catálogo REAL…</p>}
    {metadataError&&<p className="real-auth-error" role="alert">{metadataError}</p>}
    {!metadataLoading&&company&&<>
      <h2 className="real-inventory-business">{company.name}</h2>
      <div className="real-inventory-controls">
        <label>Ubicación
          <select value={locationId} disabled={dataLoading||balancesMoreLoading||movementsMoreLoading} onChange={e=>setLocationId(e.target.value)}>
            <option value="">Todas las ubicaciones</option>
            {locations.map(x=><option key={x.id} value={x.id}>{x.name} · {x.status}</option>)}
          </select>
        </label>
        <label>Artículo del catálogo cargado
          <select value={catalogItemId} disabled={dataLoading||balancesMoreLoading||movementsMoreLoading} onChange={e=>setCatalogItemId(e.target.value)}>
            <option value="">Todos los artículos</option>
            {catalog.filter(x=>x.item_type==='BIEN').map(x=><option key={x.id} value={x.id}>{x.name} · {x.unit} · {x.status}</option>)}
          </select>
        </label>
        <button type="button" className="real-auth-secondary" disabled={dataLoading||metadataLoading||balancesMoreLoading||movementsMoreLoading} onClick={()=>setRefreshVersion(x=>x+1)}>
          Actualizar desde API
        </button>
      </div>
      {catalogHasMore&&<div className="real-inventory-catalog-hint">
        El selector contiene {catalog.length} fichas cargadas. Puede haber más artículos.
        <button type="button" className="real-auth-link" disabled={catalogLoading} onClick={()=>void loadMoreCatalog()}>
          {catalogLoading?'Consultando…':'Cargar más fichas'}
        </button>
      </div>}
      <div className="real-inventory-tabs" role="group" aria-label="Vista de inventario">
        <button type="button" className={tab==='balances'?'real-auth-primary':'real-auth-secondary'}
          aria-pressed={tab==='balances'} onClick={()=>{setTab('balances');setPageError('')}}>Existencias</button>
        <button type="button" className={tab==='movements'?'real-auth-primary':'real-auth-secondary'}
          aria-pressed={tab==='movements'} onClick={()=>{setTab('movements');setPageError('')}}>Historial de movimientos</button>
      </div>
      {dataLoading&&<p role="status">Consultando inventario confirmado…</p>}
      {dataError&&<p className="real-auth-error" role="alert">{dataError}</p>}
      {dataLoaded&&!dataLoading&&<>
        <p className="real-auth-note">{activePage.length} {tab==='balances'?'combinaciones artículo/sede':'movimientos'} cargados{hasMore?' · Puede haber más páginas':' · Última página consultada'}.
          Las cantidades son las registradas por el servidor, no estimaciones desde compras.</p>
        {tab==='balances'?
          balances.length===0?<p className="real-inventory-empty">No hay saldos registrados para los filtros seleccionados. Esto no significa que todo el catálogo tenga saldo cero.</p>
          :<div className="real-inventory-balances">{balances.map(x=><article className="real-inventory-balance" key={x.location_id+':'+x.catalog_item_id}>
            <div><h3>{itemName(x.catalog_item_id)}</h3>
              <p>{siteName(x.location_id)} · {unitName(x.catalog_item_id)}{!itemLabels.has(x.catalog_item_id)?' (ficha no cargada)':''}</p>
              <small>Versión de saldo: {x.version} · Actualizado: {formatDate(x.updated_at)}</small>
            </div>
            <strong className={x.quantity_milli===0?'real-inventory-zero':'real-inventory-positive'}>{formatMilli(x.quantity_milli)}</strong>
          </article>)}</div>
          : movements.length===0?<p className="real-inventory-empty">No hay movimientos registrados para los filtros seleccionados.</p>
          :<div className="real-inventory-movements">{movements.map(x=><article className="real-inventory-movement" key={x.id}>
            <div><h3>{itemName(x.catalog_item_id)}</h3>
              <p>{INVENTORY_EVENTS[x.event_type]} · {siteName(x.location_id)}</p>
              <small>{formatDate(x.occurred_at)} · {unitName(x.catalog_item_id)} · Movimiento {shortId(x.id)}</small>
            </div>
            <strong className={x.delta_milli>0?'real-inventory-positive':'real-inventory-negative'}>{formatDelta(x.delta_milli)}</strong>
          </article>)}</div>
        }
        {pageError&&<p className="real-auth-error" role="alert">{pageError}</p>}
        {hasMore&&<button type="button" className="real-auth-secondary" disabled={fetchingMore} onClick={()=>void nextPage(tab)}>
          {fetchingMore?'Consultando siguiente página…':'Cargar más '+(tab==='balances'?'saldos':'movimientos')}
        </button>}
      </>}
      <p className="real-inventory-disclaimer">Los nombres y unidades se muestran según el catálogo actual cargado para esta empresa. Los movimientos conservan su cantidad firmada y fecha histórica del ledger; no se calcula stock sumando compras. Las transferencias y los ajustes se incorporarán en T08-3 y T08-4.</p>
    </>}
  </section>
}
