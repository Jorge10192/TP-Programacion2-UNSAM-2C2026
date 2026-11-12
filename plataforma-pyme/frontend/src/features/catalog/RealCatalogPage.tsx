import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../app/Icon.tsx'
import './realCatalogVisual.css'
import { ApiHttpError, ApiTransportError } from '../../api/httpClient.ts'
import { createOperationsGateway } from '../businesses/realOperationsGateway.ts'
import type { RealBusiness } from '../businesses/businessGateway.ts'
import {
  CATALOG_KINDS, CATALOG_PAGE_SIZE, CATALOG_UNITS,
  canManageCatalog, catalogErrorMessage, centsToPesos, createCatalogGateway,
  pesosToCents, validateCatalogDraft,
} from './realCatalogGateway.ts'
import type { CatalogCreate, CatalogItem, CatalogKind, CatalogUnit } from './realCatalogGateway.ts'
import { RealSetupGuide } from '../onboarding/RealSetupGuide.tsx'
import { catalogSetupSuggestion } from '../onboarding/realSetupGuidance.ts'

type Props={token:string;userId:string;businessId:string;onNavigate:(path:string)=>void;onUnauthorized:()=>void}
type Draft = Omit<CatalogCreate,'price_cents'|'reference_cost_cents'> & {price:string;cost:string}
const emptyDraft:Draft={name:'',kind:'REVENTA',category:'General',sku:null,unit:'UNIDAD',description:'',
  observations:'',sellable:true,price:'',cost:''}
const formatMoney=(n:number|null)=>n===null?'No informado':'$ '+centsToPesos(n)
const label=(kind:string)=>({ELABORADO:'Elaborado',REVENTA:'Reventa',INSUMO:'Insumo',SERVICIO:'Servicio'}[kind]??kind)

export function RealCatalogPage({token,userId,businessId,onNavigate,onUnauthorized}:Props) {
  const gateway=useMemo(()=>createCatalogGateway(token,businessId),[token,businessId])
  const companies=useMemo(()=>createOperationsGateway(token,userId),[token,userId])
  const mounted=useRef({active:true})
  const backRef=useRef<HTMLButtonElement>(null)
  const listTitleRef=useRef<HTMLHeadingElement>(null)
  const previousView=useRef<'list'|'form'|'detail'>('list')
  const [business,setBusiness]=useState<RealBusiness|null>(null)
  const [items,setItems]=useState<CatalogItem[]>([])
  const [hasMore,setHasMore]=useState(false)
  const [loaded,setLoaded]=useState(false)
  const [loading,setLoading]=useState(true)
  const [moreLoading,setMoreLoading]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [uncertain,setUncertain]=useState(false)
  const [form,setForm]=useState(false)
  const [editing,setEditing]=useState<string|null>(null)
  const [draft,setDraft]=useState<Draft>(emptyDraft)
  const [filter,setFilter]=useState('')
  const [statusFilter,setStatusFilter]=useState<'TODOS'|'ACTIVO'|'INACTIVO'>('TODOS')
  const [kindFilter,setKindFilter]=useState<'TODOS'|CatalogKind>('TODOS')
  const [detailId,setDetailId]=useState<string|null>(null)

  useEffect(()=>{
    const controller=new AbortController()
    const gate=mounted.current
    gate.active=true
    void Promise.all([
      companies.business(businessId,controller.signal),
      gateway.page(0,CATALOG_PAGE_SIZE,controller.signal),
    ]).then(([business,first])=>{
      if(controller.signal.aborted||!gate.active)return
      setBusiness(business);setItems(first);setHasMore(first.length===CATALOG_PAGE_SIZE);setLoaded(true)
    }).catch((err:unknown)=>{
      if(controller.signal.aborted||!gate.active)return
      if(err instanceof ApiHttpError&&err.status===401)onUnauthorized()
      else setError(catalogErrorMessage(err))
    }).finally(()=>{
      if(!controller.signal.aborted&&gate.active)setLoading(false)
    })
    return ()=>{controller.abort();gate.active=false}
  },[businessId,companies,gateway,onUnauthorized])

  const canWrite=business!==null&&canManageCatalog(
    business.membership.role,business.membership.status,business.status)
  const visible=items.filter(x=>(statusFilter==='TODOS'||x.status===statusFilter)
    &&(kindFilter==='TODOS'||x.kind===kindFilter)
    &&(x.name.toLocaleLowerCase('es-AR').includes(filter.toLocaleLowerCase('es-AR'))
       ||(x.sku??'').toLocaleLowerCase('es-AR').includes(filter.toLocaleLowerCase('es-AR'))))

  function handle(err:unknown,mutation:boolean) {
    if(!mounted.current.active)return
    if(err instanceof ApiHttpError&&err.status===401){onUnauthorized();return}
    // POST may have committed even when a valid JSON response was lost.
    if(mutation&&(err instanceof ApiTransportError||(err instanceof ApiHttpError&&err.status>=500)))setUncertain(true)
    setError(catalogErrorMessage(err))
  }

  async function refresh(){
    if(busy||moreLoading||loading)return
    setError('');setNotice('');setLoading(true)
    try{
      const [business,first]=await Promise.all([companies.business(businessId),gateway.page(0)])
      if(!mounted.current.active)return
      setBusiness(business);setItems(first);setHasMore(first.length===CATALOG_PAGE_SIZE)
      setLoaded(true);setUncertain(false)
    }catch(err){handle(err,false)}
    finally{if(mounted.current.active)setLoading(false)}
  }

  async function next(){
    if(loading||moreLoading||busy||!hasMore)return
    setMoreLoading(true);setError('')
    try{
      const page=await gateway.page(items.length)
      if(!mounted.current.active)return
      // The source is ordered by normalized name then ID. If insertions/edits
      // moved rows while browsing, force reload rather than misrepresent coverage.
      const seen=new Set(items.map(x=>x.id))
      if(page.some(x=>seen.has(x.id))){
        setHasMore(false)
        setError('El catálogo cambió durante la paginación. Actualizá desde la primera página para evitar resultados duplicados.')
        return
      }
      setItems(old=>[...old,...page])
      setHasMore(page.length===CATALOG_PAGE_SIZE)
    }catch(err){handle(err,false)}
    finally{if(mounted.current.active)setMoreLoading(false)}
  }

  function startCreate(){
    if(!canWrite||busy||uncertain)return
    setDraft(emptyDraft);setEditing(null);setDetailId(null);setForm(true);setError('');setNotice('')
  }
  function openDetail(item:CatalogItem){
    setDetailId(item.id);setForm(false);setEditing(null);setError('');setNotice('')
  }
  function closeSubview(){
    if(busy)return
    setForm(false);setEditing(null);setDetailId(null);setDraft(emptyDraft);setError('')
  }
  function startEdit(item:CatalogItem){
    if(!canWrite||busy||uncertain)return
    setDetailId(null)
    setDraft({
      name:item.name,kind:item.kind,category:item.category,sku:item.sku,unit:item.unit,
      description:item.description,observations:item.observations,sellable:item.sellable,
      price:centsToPesos(item.price_cents),cost:centsToPesos(item.reference_cost_cents),
    })
    setEditing(item.id);setForm(true);setError('');setNotice('')
  }
  function changeKind(kind:CatalogKind){
    setDraft(old=>({...old,kind,unit:kind==='SERVICIO'?'SERVICIO':old.unit==='SERVICIO'?'UNIDAD':old.unit,
      sellable:kind==='INSUMO'?false:old.sellable}))
  }
  function getBody():CatalogCreate {
    const body:CatalogCreate={
      name:draft.name.trim(),kind:draft.kind,category:draft.category.trim(),
      sku:draft.sku?.trim().toUpperCase()||null,unit:draft.unit,
      description:draft.description.trim(),observations:draft.observations.trim(),
      sellable:draft.sellable,
      price_cents:pesosToCents(draft.price),
      reference_cost_cents:pesosToCents(draft.cost),
    }
    validateCatalogDraft(body)
    return body
  }
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    if(!canWrite||busy||uncertain)return
    setError('');setNotice('')
    let body:CatalogCreate
    try{body=getBody()}catch(err){setError(catalogErrorMessage(err));return}
    setBusy(true)
    try{
      if(editing)await gateway.update(editing,body)
      else await gateway.create(body)
      if(!mounted.current.active)return
      // Name edits change backend sort order: reload instead of adjusting offset blindly.
      setForm(false);setEditing(null)
      const first=await gateway.page(0)
      if(!mounted.current.active)return
      setItems(first);setHasMore(first.length===CATALOG_PAGE_SIZE);setLoaded(true)
      setNotice(editing?'Ficha actualizada en PostgreSQL.':'Artículo creado en PostgreSQL.')
    }catch(err){handle(err,true)}
    finally{if(mounted.current.active)setBusy(false)}
  }

  async function changeStatus(item:CatalogItem){
    if(!canWrite||busy||uncertain)return
    const next=item.status==='ACTIVO'?'INACTIVO':'ACTIVO'
    if(!window.confirm((next==='INACTIVO'?'Desactivar':'Reactivar')+' «'+item.name+'» para esta empresa?'))return
    setBusy(true);setError('');setNotice('')
    try{
      await gateway.status(item.id,next)
      if(!mounted.current.active)return
      const first=await gateway.page(0)
      if(!mounted.current.active)return
      setItems(first);setHasMore(first.length===CATALOG_PAGE_SIZE)
      setNotice('Estado actualizado en PostgreSQL.')
    }catch(err){handle(err,true)}
    finally{if(mounted.current.active)setBusy(false)}
  }

  const updateField=<K extends keyof Draft>(key:K,value:Draft[K])=>setDraft(old=>({...old,[key]:value}))
  const selected=items.find(item=>item.id===detailId)
  const view:'list'|'form'|'detail'=form?'form':selected?'detail':'list'
  const loadedActive=items.filter(item=>item.status==='ACTIVO').length
  const setupSuggestion=catalogSetupSuggestion({
    verified:view==='list'&&!loading&&loaded&&!error&&!uncertain&&!!business,
    count:items.length,canWrite,
  })
  useEffect(()=>{
    if(previousView.current===view)return
    if(view==='list')listTitleRef.current?.focus()
    else backRef.current?.focus()
    previousView.current=view
  },[view])
  return <section className="real-auth-card real-business-panel e3-commerce-page e3-catalog-page">
    {view==='list'&&<nav className="real-business-nav" aria-label="Navegación de empresa">
      <button className="real-auth-link" type="button" onClick={()=>onNavigate('/real/empresas/'+businessId)}>Empresa</button>
      <button className="real-auth-link" type="button" onClick={()=>onNavigate('/real/empresas/'+businessId+'/ubicaciones')}>Ubicaciones</button>
      <button className="real-auth-link" type="button" onClick={()=>onNavigate('/real/empresas/'+businessId+'/inicio')}>Primeros pasos</button>
      <button className="real-auth-link" type="button" onClick={()=>onNavigate('/real/empresas')}>Mis empresas</button>
    </nav>}
    {view!=='list'&&<div className="e3-commerce-backbar">
      <button ref={backRef} type="button" className="e3-commerce-back" disabled={busy} onClick={closeSubview}>
        <Icon name="arrow-left" size={18}/>Volver al catálogo
      </button>
      <span className="e3-commerce-view-label">{view==='form'?'Edición de artículo':'Ficha de artículo'}</span>
    </div>}
    <header className="e3-commerce-heading">
      <span className="e3-commerce-heading-icon"><Icon name={view==='detail'?'book':'package'} size={28}/></span>
      <div className="e3-commerce-heading-copy">
        <span className="e3-commerce-eyebrow">{business?.name??'Empresa'} · Comercial</span>
        {view==='list'
          ? <h1 ref={listTitleRef} tabIndex={-1}>Catálogo de artículos</h1>
          : <h1>{view==='form'?(editing?'Editar artículo':'Nuevo artículo'):'Ficha del artículo'}</h1>}
        <p>{view==='list'?'Organizá lo que vendés y los insumos que utilizás.':view==='detail'?(selected?.name??'Ficha de artículo'):'Completá los datos de la ficha seleccionada.'}</p>
      </div>
      {view==='list'&&canWrite&&<button className="real-auth-primary e3-commerce-top-action" type="button"
        disabled={busy||uncertain||loading} onClick={startCreate}><Icon name="plus" size={18}/>Crear artículo REAL</button>}
    </header>
    {uncertain&&<div className="real-auth-message real-ops-warning" role="alert">La operación podría haberse confirmado en el servidor. No la reintentes sin verificar primero.
      <button type="button" className="real-auth-link" onClick={()=>void refresh()}>Reconsultar catálogo</button>
    </div>}
    {notice&&<p className="real-auth-message" role="status">{notice}</p>}
    {error&&<p className="real-auth-message real-auth-error" role="alert">{error}</p>}
    {loading&&<p role="status">Consultando catálogo de PostgreSQL…</p>}
    {view==='list'&&<>
      {business&&<div className="e3-commerce-toolbar"><span>Empresa: <strong>{business.name}</strong></span>
        <button type="button" className="real-auth-secondary" disabled={loading||busy||moreLoading} onClick={()=>void refresh()}>Actualizar catálogo</button>
      </div>}
      {!loading&&loaded&&<>
        <RealSetupGuide suggestion={setupSuggestion} businessId={businessId} onNavigate={onNavigate}/>
        <div className="e3-commerce-stats" aria-label="Resumen del catálogo cargado">
          <div><span>Fichas cargadas</span><strong>{items.length}</strong></div>
          <div><span>Activas cargadas</span><strong>{loadedActive}</strong></div>
          <div><span>Inactivas cargadas</span><strong>{items.length-loadedActive}</strong></div>
        </div>
        <p className="real-catalog-coverage" role="status">
          {items.length} ficha{items.length===1?'':'s'} cargada{items.length===1?'':'s'}.
          {hasMore?' Hay más páginas posibles: los filtros solo abarcan lo cargado.':' Se consultó la última página.'}
        </p>
        <div className="e3-commerce-filters">
          <label className="e3-commerce-search"><Icon name="search" size={18}/><span className="e3-sr-only">Buscar entre páginas cargadas</span>
            <input type="search" aria-label="Buscar entre páginas cargadas" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Buscar por nombre o SKU"/></label>
          <label>Tipo<select aria-label="Filtrar catálogo por tipo" value={kindFilter} onChange={e=>setKindFilter(e.target.value as typeof kindFilter)}>
            <option value="TODOS">Todos</option>{CATALOG_KINDS.map(k=><option value={k} key={k}>{label(k)}</option>)}
          </select></label>
          <label>Estado<select aria-label="Filtrar catálogo por estado" value={statusFilter} onChange={e=>setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="TODOS">Todos</option><option value="ACTIVO">Activos</option><option value="INACTIVO">Inactivos</option>
          </select></label>
        </div>
        {items.length===0&&<div className="real-business-empty e3-commerce-empty"><strong>Tu catálogo todavía está vacío</strong><p>Creá tu primera ficha para comenzar a registrar productos, insumos o servicios.</p></div>}
        {items.length>0&&visible.length===0&&<div className="real-business-empty e3-commerce-empty"><strong>Sin coincidencias en las páginas cargadas</strong><p>Probá otra búsqueda o cargá más artículos si hay páginas pendientes.</p></div>}
        <div className="real-catalog-grid e3-commerce-grid">
          {visible.map(item=><article key={item.id} className="real-catalog-tile e3-catalog-tile">
            <div className="e3-commerce-card-top">
              <span className="e3-commerce-card-icon"><Icon name={item.kind==='SERVICIO'?'briefcase':item.kind==='INSUMO'?'boxes':'package'} size={22}/></span>
              <span className={'real-catalog-status '+(item.status==='ACTIVO'?'real-catalog-active':'')}>{item.status}</span>
            </div>
            <div className="e3-commerce-card-name"><strong>{item.name}</strong><span>{label(item.kind)} · {item.category}</span></div>
            <div className="e3-commerce-chips"><span>{item.unit}</span><span>{item.sellable?'Vendible':'No vendible'}</span></div>
            <small className="e3-commerce-sku">SKU: {item.sku??'Sin SKU'}</small>
            <div className="real-catalog-prices e3-commerce-prices">
              <span>Precio de venta <b>{formatMoney(item.price_cents)}</b></span>
              <span>Costo de referencia <b>{formatMoney(item.reference_cost_cents)}</b></span>
            </div>
            <div className="real-auth-actions e3-commerce-card-actions">
              <button type="button" className="real-auth-secondary" onClick={()=>openDetail(item)}>Ver ficha</button>
              {canWrite&&<button type="button" className="real-auth-secondary" disabled={busy||uncertain} onClick={()=>startEdit(item)}>Editar</button>}
              {canWrite&&<button type="button" className="real-auth-secondary" disabled={busy||uncertain}
                onClick={()=>void changeStatus(item)}>{item.status==='ACTIVO'?'Desactivar':'Reactivar'}</button>}
            </div>
          </article>)}
        </div>
        {hasMore&&<button type="button" className="real-auth-secondary e3-commerce-loadmore" disabled={moreLoading||busy||loading}
          onClick={()=>void next()}>{moreLoading?'Cargando página siguiente…':'Cargar los siguientes 100'}</button>}
        {!canWrite&&<p className="real-auth-note">Tu membresía puede consultar el catálogo, pero no crear, editar o cambiar el estado de artículos.</p>}
      </>}
    </>}
    {view==='detail'&&selected&&<section className="e3-commerce-subsurface" aria-label="Detalle del artículo">
      <div className="e3-commerce-detail-heading"><span className="e3-commerce-card-icon"><Icon name="package" size={24}/></span>
        <div><h2>{selected.name}</h2><p>{label(selected.kind)} · {selected.category}</p></div>
        <span className={'real-catalog-status '+(selected.status==='ACTIVO'?'real-catalog-active':'')}>{selected.status}</span>
      </div>
      <dl className="e3-commerce-fact-grid">
        <div><dt>Tipo de artículo</dt><dd>{label(selected.kind)}</dd></div>
        <div><dt>Unidad</dt><dd>{selected.unit}</dd></div>
        <div><dt>SKU</dt><dd>{selected.sku??'No asignado'}</dd></div>
        <div><dt>Disponible para venta</dt><dd>{selected.sellable?'Sí':'No'}</dd></div>
        <div><dt>Precio de venta</dt><dd>{formatMoney(selected.price_cents)}</dd></div>
        <div><dt>Costo de referencia</dt><dd>{formatMoney(selected.reference_cost_cents)}</dd></div>
      </dl>
      <div className="e3-commerce-note-grid">
        <div><h3>Descripción</h3><p>{selected.description||'Sin descripción registrada.'}</p></div>
        <div><h3>Observaciones</h3><p>{selected.observations||'Sin observaciones.'}</p></div>
      </div>
      <p className="e3-commerce-disclaimer">La ficha describe el artículo. El stock y sus movimientos se consultan exclusivamente en Inventario REAL.</p>
      {canWrite&&<div className="real-auth-actions">
        <button className="real-auth-primary" type="button" disabled={busy||uncertain} onClick={()=>startEdit(selected)}>Editar artículo</button>
      </div>}
    </section>}
    {view==='form'&&canWrite&&<section className="e3-commerce-subsurface e3-commerce-form-screen" aria-label="Formulario de artículo">
      <div className="e3-commerce-section-head"><h2>Datos del artículo</h2><p>La información se guardará únicamente en la empresa seleccionada.</p></div>
      {draft.kind==='SERVICIO'&&<p className="real-auth-note" role="note">Los servicios no requieren stock inicial ni movimientos de inventario. Su precio y disponibilidad comercial se registran en esta ficha.</p>}
      <form className="real-auth-form real-ops-form e3-commerce-form" onSubmit={e=>void save(e)}>
        <div className="e3-commerce-form-grid">
          <label>Nombre<input required minLength={2} maxLength={90} value={draft.name} onChange={e=>updateField('name',e.target.value)}/></label>
          <label>Tipo<select value={draft.kind} onChange={e=>changeKind(e.target.value as CatalogKind)}>
            {CATALOG_KINDS.map(k=><option value={k} key={k}>{label(k)}</option>)}</select></label>
          <label>Rubro o categoría<input required minLength={2} maxLength={60} value={draft.category} onChange={e=>updateField('category',e.target.value)}/></label>
          <label>Unidad<select value={draft.unit} onChange={e=>updateField('unit',e.target.value as CatalogUnit)}>
            {CATALOG_UNITS.filter(u=>draft.kind==='SERVICIO'?u==='SERVICIO':u!=='SERVICIO').map(u=><option key={u} value={u}>{u}</option>)}</select></label>
          <label>SKU (opcional)<input maxLength={32} placeholder="Ej.: PRODUCTO-001" value={draft.sku??''}
            onChange={e=>updateField('sku',e.target.value||null)}/></label>
          <div className="e3-commerce-sellable"><label className="real-ops-check"><input type="checkbox" checked={draft.sellable}
            onChange={e=>updateField('sellable',e.target.checked)}/> Artículo vendible</label></div>
          <label>Precio (pesos, opcional)<input inputMode="decimal" placeholder="1250,50" value={draft.price}
            onChange={e=>updateField('price',e.target.value)}/></label>
          <label>Costo de referencia (pesos, opcional)<input inputMode="decimal" placeholder="800,00" value={draft.cost}
            onChange={e=>updateField('cost',e.target.value)}/></label>
          <label className="e3-commerce-span-all">Descripción<textarea rows={3} maxLength={450} value={draft.description}
            onChange={e=>updateField('description',e.target.value)}/></label>
          <label className="e3-commerce-span-all">Observaciones<textarea rows={3} maxLength={600} value={draft.observations}
            onChange={e=>updateField('observations',e.target.value)}/></label>
        </div>
        <div className="real-auth-actions e3-commerce-form-actions">
          <button type="submit" className="real-auth-primary" disabled={busy||uncertain}>{busy?'Guardando…':'Guardar artículo'}</button>
          <button type="button" className="real-auth-secondary" disabled={busy} onClick={closeSubview}>Cancelar</button>
        </div>
      </form>
      <p className="e3-commerce-disclaimer">Las fotografías de artículos y su carga REAL se implementarán en una etapa posterior; no se guardan imágenes ficticias.</p>
    </section>}
  </section>
}
