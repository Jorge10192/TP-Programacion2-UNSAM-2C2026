import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiHttpError, ApiTransportError } from '../../api/httpClient.ts'
import { createOperationsGateway } from '../businesses/realOperationsGateway.ts'
import type { RealBusiness } from '../businesses/businessGateway.ts'
import {
  CATALOG_KINDS, CATALOG_PAGE_SIZE, CATALOG_UNITS,
  canManageCatalog, catalogErrorMessage, centsToPesos, createCatalogGateway,
  pesosToCents, validateCatalogDraft,
} from './realCatalogGateway.ts'
import type { CatalogCreate, CatalogItem, CatalogKind, CatalogUnit } from './realCatalogGateway.ts'

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

  function startCreate(){setDraft(emptyDraft);setEditing(null);setForm(true);setError('');setNotice('')}
  function startEdit(item:CatalogItem){
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
  return <section className="real-auth-card real-business-panel">
    <nav className="real-business-nav">
      <button className="real-auth-link" type="button" onClick={()=>onNavigate('/real/empresas/'+businessId)}>Empresa</button>
      <button className="real-auth-link" type="button" onClick={()=>onNavigate('/real/empresas/'+businessId+'/ubicaciones')}>Ubicaciones</button>
      <button className="real-auth-link" type="button" onClick={()=>onNavigate('/real/empresas')}>Mis empresas</button>
    </nav>
    <span className="real-auth-eyebrow">E2-7 · T05 · Catálogo REAL</span>
    <h1>Catálogo de artículos</h1>
    <p>Productos elaborados, reventa, insumos y servicios desde FastAPI. No se consultan artículos DEMO ni se administran existencias desde este módulo.</p>
    {loading&&<p role="status">Consultando catálogo de PostgreSQL…</p>}
    {business&&<div className="real-ops-toolbar">
      <strong>{business.name}</strong>
      <button type="button" className="real-auth-secondary" disabled={loading||busy||moreLoading} onClick={()=>void refresh()}>Actualizar catálogo</button>
    </div>}
    {!loading&&loaded&&<>
      <p className="real-catalog-coverage" role="status">
        {items.length} ficha{items.length===1?'':'s'} cargada{items.length===1?'':'s'}.
        {hasMore?' Existen potencialmente más páginas: todavía NO se consultó el catálogo completo.':' La última página fue consultada.'}
      </p>
      <div className="real-catalog-filters">
        <label>Buscar entre páginas cargadas<input type="search" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Nombre o SKU (búsqueda local)"/></label>
        <label>Estado<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as typeof statusFilter)}>
          <option value="TODOS">Todos</option><option value="ACTIVO">Activos</option><option value="INACTIVO">Inactivos</option>
        </select></label>
      </div>
      {items.length===0&&<div className="real-business-empty">Esta empresa no tiene fichas registradas.</div>}
      {items.length>0&&visible.length===0&&<div className="real-business-empty">Sin coincidencias entre las páginas ya cargadas. No es una búsqueda global.</div>}
      <div className="real-catalog-grid">
        {visible.map(item=><article key={item.id} className="real-catalog-tile">
          <div className="real-catalog-tile-header">
            <strong>{item.name}</strong>
            <span className={'real-catalog-status '+(item.status==='ACTIVO'?'real-catalog-active':'')}>{item.status}</span>
          </div>
          <small>{label(item.kind)} · {item.unit} · {item.category}</small>
          <small>SKU: {item.sku??'Sin SKU'} · {item.sellable?'A la venta':'No vendible'}</small>
          <div className="real-catalog-prices"><span>Precio <b>{formatMoney(item.price_cents)}</b></span>
            <span>Costo ref. <b>{formatMoney(item.reference_cost_cents)}</b></span></div>
          {item.description&&<p>{item.description}</p>}
          {canWrite&&<div className="real-auth-actions">
            <button type="button" className="real-auth-secondary" disabled={busy||uncertain}
              onClick={()=>startEdit(item)}>Editar</button>
            <button type="button" className="real-auth-secondary" disabled={busy||uncertain}
              onClick={()=>void changeStatus(item)}>{item.status==='ACTIVO'?'Desactivar':'Reactivar'}</button>
          </div>}
        </article>)}
      </div>
      {hasMore&&<button type="button" className="real-auth-secondary" disabled={moreLoading||busy||loading}
        onClick={()=>void next()}>{moreLoading?'Cargando página siguiente…':'Cargar los siguientes 100'}</button>}
      {canWrite&&!form&&<div className="real-auth-actions">
        <button className="real-auth-primary" type="button" disabled={busy||uncertain} onClick={startCreate}>Crear artículo REAL</button>
      </div>}
      {canWrite&&form&&<form className="real-auth-form real-ops-form" onSubmit={e=>void save(e)}>
        <h2>{editing?'Editar artículo':'Nuevo artículo'}</h2>
        <label>Nombre<input required minLength={2} maxLength={90} value={draft.name} onChange={e=>updateField('name',e.target.value)}/></label>
        <label>Tipo<select value={draft.kind} onChange={e=>changeKind(e.target.value as CatalogKind)}>
          {CATALOG_KINDS.map(k=><option value={k} key={k}>{label(k)}</option>)}</select></label>
        <label>Rubro o categoría<input required minLength={2} maxLength={60} value={draft.category} onChange={e=>updateField('category',e.target.value)}/></label>
        <label>Unidad<select value={draft.unit} onChange={e=>updateField('unit',e.target.value as CatalogUnit)}>
          {CATALOG_UNITS.filter(u=>draft.kind==='SERVICIO'?u==='SERVICIO':u!=='SERVICIO').map(u=><option key={u} value={u}>{u}</option>)}</select></label>
        <label>SKU (opcional)<input maxLength={32} placeholder="Ej.: PRODUCTO-001" value={draft.sku??''}
          onChange={e=>updateField('sku',e.target.value||null)}/></label>
        <label className="real-ops-check"><input type="checkbox" checked={draft.sellable}
          onChange={e=>updateField('sellable',e.target.checked)}/> Artículo vendible</label>
        <label>Precio (pesos, opcional)<input inputMode="decimal" placeholder="1250,50" value={draft.price}
          onChange={e=>updateField('price',e.target.value)}/></label>
        <label>Costo de referencia (pesos, opcional)<input inputMode="decimal" placeholder="800,00" value={draft.cost}
          onChange={e=>updateField('cost',e.target.value)}/></label>
        <label>Descripción<textarea rows={3} maxLength={450} value={draft.description}
          onChange={e=>updateField('description',e.target.value)}/></label>
        <label>Observaciones<textarea rows={3} maxLength={600} value={draft.observations}
          onChange={e=>updateField('observations',e.target.value)}/></label>
        <div className="real-auth-actions">
          <button type="submit" className="real-auth-primary" disabled={busy||uncertain}>{busy?'Guardando…':'Guardar artículo'}</button>
          <button type="button" className="real-auth-secondary" disabled={busy} onClick={()=>{setForm(false);setEditing(null)}}>Cancelar</button>
        </div>
      </form>}
      {!canWrite&&<p className="real-auth-note">Tu membresía puede consultar el catálogo, pero no crear, editar o cambiar el estado de artículos.</p>}
    </>}
    {uncertain&&<div className="real-auth-message real-ops-warning" role="alert">La operación podría haberse confirmado en el servidor. No la reintentes sin verificar primero.
      <button type="button" className="real-auth-link" onClick={()=>void refresh()}>Reconsultar catálogo</button>
    </div>}
    {notice&&<p className="real-auth-message" role="status">{notice}</p>}
    {error&&<p className="real-auth-message real-auth-error" role="alert">{error}</p>}
  </section>
}
