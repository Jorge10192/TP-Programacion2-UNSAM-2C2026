import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../app/Icon.tsx'
import '../catalog/realCatalogVisual.css'
import { ApiHttpError, ApiTransportError } from '../../api/httpClient.ts'
import { createOperationsGateway } from '../businesses/realOperationsGateway.ts'
import type { RealBusiness } from '../businesses/businessGateway.ts'
import { createSupplyGateway, SUPPLY_PAGE_SIZE, supplyErrorMessage } from '../purchases/realSupplyGateway.ts'
import type { Supplier } from '../purchases/realSupplyGateway.ts'
type Props={token:string;userId:string;businessId:string;onNavigate:(route:string)=>void;onUnauthorized:()=>void}
export function RealSuppliersPage({token,userId,businessId,onNavigate,onUnauthorized}:Props){
 const gateway=useMemo(()=>createSupplyGateway(token,businessId),[token,businessId])
 const companies=useMemo(()=>createOperationsGateway(token,userId),[token,userId])
 const alive=useRef(true)
 const backRef=useRef<HTMLButtonElement>(null)
 const listRef=useRef<HTMLHeadingElement>(null)
 const previousView=useRef<'list'|'create'|'detail'>('list')
 const [business,setBusiness]=useState<RealBusiness|null>(null)
 const [items,setItems]=useState<Supplier[]>([])
 const [hasMore,setHasMore]=useState(false)
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [name,setName]=useState('')
 const [unknown,setUnknown]=useState(false)
 const [creating,setCreating]=useState(false)
 const [detailId,setDetailId]=useState<string|null>(null)
 const [filter,setFilter]=useState('')
 const [statusFilter,setStatusFilter]=useState<'TODOS'|'ACTIVO'|'INACTIVO'>('TODOS')
 useEffect(()=>{
   const ctrl=new AbortController();alive.current=true
   void Promise.all([companies.business(businessId,ctrl.signal),gateway.suppliers(0,SUPPLY_PAGE_SIZE,ctrl.signal)])
     .then(([company,rows])=>{if(!ctrl.signal.aborted&&alive.current){
       setBusiness(company);setItems(rows);setHasMore(rows.length===SUPPLY_PAGE_SIZE)
     }}).catch(err=>{
       if(ctrl.signal.aborted||!alive.current)return
       if(err instanceof ApiHttpError&&err.status===401)onUnauthorized()
       else setError(supplyErrorMessage(err))
     }).finally(()=>{if(!ctrl.signal.aborted&&alive.current)setLoading(false)})
   return ()=>{ctrl.abort();alive.current=false}
 },[gateway,companies,businessId,onUnauthorized])
 const canWrite=business?.status==='ACTIVA'&&business.membership.status==='ACTIVA'
   &&['TITULAR_ADMINISTRATIVO','ADMINISTRADOR'].includes(business.membership.role)
 function fail(err:unknown,writing=false){
   if(!alive.current)return
   if(err instanceof ApiHttpError&&err.status===401){onUnauthorized();return}
   if(writing&&(err instanceof ApiTransportError||(err instanceof ApiHttpError&&err.status>=500)))setUnknown(true)
   setError(supplyErrorMessage(err))
 }
 async function reload(){
   if(busy||loading)return
   setLoading(true);setError('');setNotice('')
   try{
     const rows=await gateway.suppliers()
     if(!alive.current)return
     setItems(rows);setHasMore(rows.length===SUPPLY_PAGE_SIZE);setUnknown(false)
   }catch(err){fail(err)}finally{if(alive.current)setLoading(false)}
 }
 async function more(){
   if(busy||loading||!hasMore)return
   setLoading(true);setError('')
   try{
     const rows=await gateway.suppliers(items.length)
     if(!alive.current)return
     if(rows.some(x=>items.some(y=>y.id===x.id))){setHasMore(false);setError('El listado cambió. Actualizá antes de cargar más proveedores.');return}
     setItems(old=>[...old,...rows]);setHasMore(rows.length===SUPPLY_PAGE_SIZE)
   }catch(err){fail(err)}finally{if(alive.current)setLoading(false)}
 }
 async function create(e:FormEvent<HTMLFormElement>){
   e.preventDefault();if(!canWrite||busy||unknown)return
   setBusy(true);setError('');setNotice('')
   try{
     await gateway.createSupplier(name)
     if(!alive.current)return
     setName('')
     const rows=await gateway.suppliers()
     if(!alive.current)return
     setItems(rows);setHasMore(rows.length===SUPPLY_PAGE_SIZE)
     setCreating(false)
     setNotice('Proveedor registrado en PostgreSQL. No se realizó ninguna compra.')
   }catch(err){fail(err,true)}finally{if(alive.current)setBusy(false)}
 }
 async function status(s:Supplier){
   if(!canWrite||busy||unknown)return
   const next=s.status==='ACTIVO'?'INACTIVO':'ACTIVO'
   if(!window.confirm((next==='ACTIVO'?'Reactivar':'Desactivar')+' el proveedor «'+s.name+'»?'))return
   setBusy(true);setError('');setNotice('')
   try{
     const result=await gateway.changeSupplier(s.id,next)
     if(!alive.current)return
     setItems(old=>old.map(x=>x.id===result.id?result:x))
     setNotice('Estado confirmado en el servidor.')
   }catch(err){fail(err,true)}finally{if(alive.current)setBusy(false)}
 }

 const visible=items.filter(x=>(statusFilter==='TODOS'||x.status===statusFilter)
   &&[x.name,x.offerings,x.contact_person,x.email].some(value=>value.toLocaleLowerCase('es-AR').includes(filter.trim().toLocaleLowerCase('es-AR'))))
 const detail=items.find(x=>x.id===detailId)
 const view:'list'|'create'|'detail'=creating?'create':detail?'detail':'list'
 const activeCount=items.filter(x=>x.status==='ACTIVO').length
 function startCreate(){if(!canWrite||busy||unknown)return;setCreating(true);setDetailId(null);setName('');setError('');setNotice('')}
 function openDetail(supplier:Supplier){setDetailId(supplier.id);setCreating(false);setError('');setNotice('')}
 function closeSubview(){if(busy)return;setCreating(false);setDetailId(null);setName('');setError('')}
 useEffect(()=>{
   if(previousView.current===view)return
   if(view==='list')listRef.current?.focus()
   else backRef.current?.focus()
   previousView.current=view
 },[view])
 return <section className="real-auth-card real-business-panel e3-commerce-page e3-suppliers-page">
   {view==='list'&&<nav className="real-business-nav" aria-label="Navegación de empresa">
     <button type="button" className="real-auth-link" onClick={()=>onNavigate('/real/empresas/'+businessId)}>Empresa</button>
     <button type="button" className="real-auth-link" onClick={()=>onNavigate('/real/empresas/'+businessId+'/compras')}>Compras y recepciones</button>
     <button type="button" className="real-auth-link" onClick={()=>onNavigate('/real/empresas')}>Mis empresas</button>
   </nav>}
   {view!=='list'&&<div className="e3-commerce-backbar">
     <button type="button" ref={backRef} className="e3-commerce-back" disabled={busy} onClick={closeSubview}>
       <Icon name="arrow-left" size={18}/>Volver a proveedores
     </button>
     <span className="e3-commerce-view-label">{view==='create'?'Alta de proveedor':'Ficha de proveedor'}</span>
   </div>}
   <header className="e3-commerce-heading">
     <span className="e3-commerce-heading-icon"><Icon name="briefcase" size={28}/></span>
     <div className="e3-commerce-heading-copy">
       <span className="e3-commerce-eyebrow">{business?.name??'Empresa'} · Comercial</span>
       {view==='list'?<h1 tabIndex={-1} ref={listRef}>Proveedores</h1>
         :<h1>{view==='create'?'Nuevo proveedor':'Datos del proveedor'}</h1>}
       <p>{view==='list'?'Organizá los proveedores de tu empresa.':view==='create'?'Registrá un proveedor mediante la API REAL.':detail?.name??'Proveedor seleccionado'}</p>
     </div>
     {view==='list'&&canWrite&&<button type="button" className="real-auth-primary e3-commerce-top-action" disabled={busy||unknown||loading} onClick={startCreate}>
       <Icon name="plus" size={18}/>Agregar proveedor REAL
     </button>}
   </header>
   {unknown&&<div className="real-auth-message real-ops-warning" role="alert">
     La respuesta de la escritura se perdió. Como proveedores no tiene clave de replay, verificá el listado ANTES de repetir.
     <button className="real-auth-link" type="button" onClick={()=>void reload()}>Reconsultar proveedores</button>
   </div>}
   {notice&&<p className="real-auth-message" role="status">{notice}</p>}
   {error&&<p className="real-auth-message real-auth-error" role="alert">{error}</p>}
   {loading&&<p role="status">Consultando proveedores…</p>}
   {view==='list'&&<>
     <div className="e3-commerce-toolbar"><span>Empresa: <strong>{business?.name??'Sin verificar'}</strong></span>
       <button type="button" className="real-auth-secondary" disabled={loading||busy} onClick={()=>void reload()}>Actualizar</button>
     </div>
     {!loading&&<>
       <div className="e3-commerce-stats" aria-label="Resumen de proveedores cargados">
         <div><span>Proveedores cargados</span><strong>{items.length}</strong></div>
         <div><span>Activos cargados</span><strong>{activeCount}</strong></div>
         <div><span>Inactivos cargados</span><strong>{items.length-activeCount}</strong></div>
       </div>
       <p className="real-catalog-coverage" role="status">{items.length} {items.length===1?'proveedor cargado':'proveedores cargados'}.
         {hasMore?' Hay otras páginas posibles; la búsqueda y los contadores solo incluyen las cargadas.':' Se consultó la última página.'}
       </p>
       <div className="e3-commerce-filters">
         <label className="e3-commerce-search"><Icon name="search" size={18}/><span className="e3-sr-only">Buscar entre proveedores cargados</span>
           <input type="search" aria-label="Buscar entre proveedores cargados" placeholder="Buscar proveedor o contacto" value={filter} onChange={e=>setFilter(e.target.value)}/></label>
         <label>Estado<select aria-label="Filtrar proveedores por estado" value={statusFilter} onChange={e=>setStatusFilter(e.target.value as typeof statusFilter)}>
           <option value="TODOS">Todos</option><option value="ACTIVO">Activos</option><option value="INACTIVO">Inactivos</option>
         </select></label>
       </div>
       {items.length===0&&<div className="real-business-empty e3-commerce-empty"><strong>Todavía no hay proveedores</strong><p>Agregá tu primer proveedor para poder seleccionarlo al registrar una compra.</p></div>}
       {items.length>0&&visible.length===0&&<div className="real-business-empty e3-commerce-empty"><strong>Sin coincidencias entre los proveedores cargados</strong><p>Probá otro término o cargá las páginas pendientes.</p></div>}
       <div className="real-business-grid e3-commerce-grid">
         {visible.map(supplier=><article key={supplier.id} className="real-business-tile real-ops-tile e3-supplier-tile">
           <div className="e3-commerce-card-top"><span className="e3-commerce-card-icon"><Icon name="briefcase" size={22}/></span>
             <span className={'real-catalog-status '+(supplier.status==='ACTIVO'?'real-catalog-active':'')}>{supplier.status}</span>
           </div>
           <strong>{supplier.name}</strong>
           <p className="e3-supplier-offerings">{supplier.offerings||'Sin productos o servicios informados'}</p>
           <div className="e3-supplier-compact-fields">
             {supplier.contact_person&&<span><Icon name="user" size={15}/>{supplier.contact_person}</span>}
             {supplier.email&&<span><Icon name="user" size={15}/>{supplier.email}</span>}
             {supplier.phone&&<span><Icon name="credit" size={15}/>{supplier.phone}</span>}
           </div>
           <div className="real-auth-actions e3-commerce-card-actions">
             <button type="button" className="real-auth-secondary" onClick={()=>openDetail(supplier)}>Ver ficha</button>
             {canWrite&&<button type="button" className="real-auth-secondary" disabled={busy||unknown}
               onClick={()=>void status(supplier)}>{supplier.status==='ACTIVO'?'Desactivar':'Reactivar'}</button>}
           </div>
         </article>)}
       </div>
       {hasMore&&<button type="button" className="real-auth-secondary e3-commerce-loadmore" disabled={loading||busy} onClick={()=>void more()}>Cargar otros 100 proveedores</button>}
       {!canWrite&&<p className="real-auth-note">Tu rol permite consultar proveedores, pero no crearlos ni cambiar su estado.</p>}
     </>}
   </>}
   {view==='detail'&&detail&&<section className="e3-commerce-subsurface" aria-label="Detalle del proveedor">
     <div className="e3-commerce-detail-heading"><span className="e3-commerce-card-icon"><Icon name="briefcase" size={24}/></span>
       <div><h2>{detail.name}</h2><p>Proveedor registrado en esta empresa</p></div>
       <span className={'real-catalog-status '+(detail.status==='ACTIVO'?'real-catalog-active':'')}>{detail.status}</span>
     </div>
     <dl className="e3-commerce-fact-grid">
       <div><dt>Contacto</dt><dd>{detail.contact_person||'No informado'}</dd></div>
       <div><dt>Teléfono</dt><dd>{detail.phone||'No informado'}</dd></div>
       <div><dt>WhatsApp</dt><dd>{detail.whatsapp||'No informado'}</dd></div>
       <div><dt>Correo</dt><dd>{detail.email||'No informado'}</dd></div>
       <div><dt>Dirección</dt><dd>{detail.address||'No informada'}</dd></div>
       <div><dt>Página web</dt><dd>{detail.website||'No informada'}</dd></div>
       <div><dt>Instagram</dt><dd>{detail.instagram||'No informado'}</dd></div>
       <div><dt>Google Maps</dt><dd>{detail.maps_url||'No informado'}</dd></div>
     </dl>
     <div className="e3-commerce-note-grid">
       <div><h3>Qué ofrece</h3><p>{detail.offerings||'Sin información registrada.'}</p></div>
       <div><h3>Notas</h3><p>{detail.notes||'Sin observaciones registradas.'}</p></div>
     </div>
     {detail.payment_methods.length>0&&<section className="e3-supplier-payments" aria-label="Medios de pago informados">
       <h3>Medios de pago registrados</h3><div className="e3-commerce-chips">{detail.payment_methods.map((method,i)=><span key={method+i}>{method}</span>)}</div>
     </section>}
     <p className="e3-commerce-disclaimer">Estos datos son de solo lectura. La API actual de esta pantalla solo permite crear proveedores por nombre y cambiar su estado; la edición avanzada queda para una etapa posterior.</p>
   </section>}
   {view==='create'&&canWrite&&<section className="e3-commerce-subsurface e3-commerce-form-screen" aria-label="Formulario de proveedor">
     <div className="e3-commerce-section-head"><h2>Datos del proveedor</h2><p>Alta REAL: por ahora la API admite registrar únicamente el nombre comercial.</p></div>
     <form className="real-auth-form real-ops-form e3-commerce-form" onSubmit={e=>void create(e)}>
       <label>Nombre comercial<input required minLength={2} maxLength={90} value={name} onChange={e=>setName(e.target.value)}/></label>
       <div className="real-auth-actions e3-commerce-form-actions">
         <button className="real-auth-primary" type="submit" disabled={busy||unknown}>{busy?'Guardando…':'Crear proveedor'}</button>
         <button className="real-auth-secondary" type="button" disabled={busy} onClick={closeSubview}>Cancelar</button>
       </div>
     </form>
     <p className="e3-commerce-disclaimer">Registrar un proveedor no registra una compra ni modifica inventario. La edición de contacto, promociones y otros datos no está disponible todavía en REAL.</p>
   </section>}
 </section>
}
