import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../app/Icon.tsx'
import '../catalog/realCatalogVisual.css'
import { ApiHttpError, ApiTransportError } from '../../api/httpClient.ts'
import { createOperationsGateway } from '../businesses/realOperationsGateway.ts'
import type { RealBusiness } from '../businesses/businessGateway.ts'
import { createSupplyGateway, SUPPLY_PAGE_SIZE, supplyErrorMessage, emptySupplierContact, validateSupplierContact } from '../purchases/realSupplyGateway.ts'
import type { Supplier, SupplierContactDraft } from '../purchases/realSupplyGateway.ts'
type Props={token:string;userId:string;businessId:string;onNavigate:(route:string)=>void;onUnauthorized:()=>void}
export function RealSuppliersPage({token,userId,businessId,onNavigate,onUnauthorized}:Props){
 const gateway=useMemo(()=>createSupplyGateway(token,businessId),[token,businessId])
 const companies=useMemo(()=>createOperationsGateway(token,userId),[token,userId])
 const alive=useRef(true)
 const backRef=useRef<HTMLButtonElement>(null)
 const listRef=useRef<HTMLHeadingElement>(null)
 const previousView=useRef<'list'|'form'|'detail'>('list')
 const [business,setBusiness]=useState<RealBusiness|null>(null)
 const [items,setItems]=useState<Supplier[]>([])
 const [hasMore,setHasMore]=useState(false)
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [draft,setDraft]=useState<SupplierContactDraft>(emptySupplierContact)
 const [editingId,setEditingId]=useState<string|null>(null)
 const [sameWhatsapp,setSameWhatsapp]=useState(false)
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
 async function save(e:FormEvent<HTMLFormElement>){
   e.preventDefault()
   if(!canWrite||busy||unknown)return
   setError('');setNotice('')
   let payload:SupplierContactDraft
   try {payload=validateSupplierContact(draft)}
   catch(err){setError(err instanceof Error?err.message:'Revisá los datos del proveedor.');return}
   setBusy(true)
   let saved:Supplier
   try {
     saved=editingId
       ?await gateway.updateSupplierDetails(editingId,payload)
       :await gateway.createSupplierDetailed(payload)
   }catch(err){
     fail(err,true)
     if(alive.current)setBusy(false)
     return
   }
   if(!alive.current)return
   setCreating(false);setEditingId(null);setSameWhatsapp(false);setDraft(emptySupplierContact)
   setItems(old=>editingId
     ?old.map(x=>x.id===saved.id?saved:x)
     :[saved,...old])
   setNotice(editingId?'Cambios del proveedor confirmados en PostgreSQL.':'Proveedor registrado en PostgreSQL. No se realizó ninguna compra.')
   // La escritura ya está confirmada: fallar el GET posterior NO autoriza reintentar POST/PATCH.
   try{
     const rows=await gateway.suppliers()
     if(!alive.current)return
     setItems(rows);setHasMore(rows.length===SUPPLY_PAGE_SIZE)
   }catch(err){
     fail(err,false)
     if(alive.current)setError('El proveedor se guardó correctamente, pero no se pudo actualizar el listado. Usá «Actualizar» para reconsultar; no repitas el guardado.')
   }finally{if(alive.current)setBusy(false)}
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
 const view:'list'|'form'|'detail'=creating?'form':detail?'detail':'list'
 const activeCount=items.filter(x=>x.status==='ACTIVO').length
 function startCreate(){
   if(!canWrite||busy||unknown)return
   setDraft({...emptySupplierContact});setSameWhatsapp(false);setEditingId(null)
   setCreating(true);setDetailId(null);setError('');setNotice('')
 }
 function startEdit(supplier:Supplier){
   if(!canWrite||busy||unknown)return
   setDraft({
     name:supplier.name,offerings:supplier.offerings,contact_person:supplier.contact_person,
     phone:supplier.phone,whatsapp:supplier.whatsapp,email:supplier.email,
     address:supplier.address,maps_url:supplier.maps_url,website:supplier.website,
     instagram:supplier.instagram,notes:supplier.notes,
   })
   setSameWhatsapp(false);setEditingId(supplier.id);setDetailId(null)
   setCreating(true);setError('');setNotice('')
 }
 function openDetail(supplier:Supplier){
   setDetailId(supplier.id);setCreating(false);setEditingId(null);setError('');setNotice('')
 }
 function closeSubview(){
   if(busy)return
   setCreating(false);setEditingId(null);setDetailId(null)
   setSameWhatsapp(false);setDraft({...emptySupplierContact});setError('')
 }
 const setField=<K extends keyof SupplierContactDraft>(key:K,value:SupplierContactDraft[K])=>
   setDraft(old=>({...old,[key]:value}))
 const addressSearchUrl=draft.address.trim()
   ?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(draft.address.trim()):null
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
     <span className="e3-commerce-view-label">{view==='form'?(editingId?'Edición de proveedor':'Alta de proveedor'):'Ficha de proveedor'}</span>
   </div>}
   <header className="e3-commerce-heading">
     <span className="e3-commerce-heading-icon"><Icon name="briefcase" size={28}/></span>
     <div className="e3-commerce-heading-copy">
       <span className="e3-commerce-eyebrow">{business?.name??'Empresa'} · Comercial</span>
       {view==='list'?<h1 tabIndex={-1} ref={listRef}>Proveedores</h1>
         :<h1>{view==='form'?(editingId?'Editar proveedor':'Nuevo proveedor'):'Datos del proveedor'}</h1>}
       <p>{view==='list'?'Organizá los proveedores de tu empresa.':view==='form'?(editingId?'Actualizá la información comercial de esta empresa.':'Registrá un proveedor mediante la API REAL.'):detail?.name??'Proveedor seleccionado'}</p>
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
           <input type="search" aria-label="Buscar entre proveedores cargados" placeholder="Buscar por nombre, contacto o rubro" value={filter} onChange={e=>setFilter(e.target.value)}/></label>
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
               onClick={()=>startEdit(supplier)}>Editar</button>}
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
     {canWrite&&<div className="real-auth-actions e3-supplier-detail-actions">
       <button className="real-auth-primary" type="button" disabled={busy||unknown} onClick={()=>startEdit(detail)}>
         <Icon name="user" size={17}/>Editar proveedor</button>
     </div>}
     <p className="e3-commerce-disclaimer">Los datos de contacto son editables por usuarios autorizados. Los medios de pago y las promociones se incorporarán a la edición en E3-1D2B.</p>
   </section>}
   {view==='form'&&canWrite&&<section className="e3-commerce-subsurface e3-commerce-form-screen e3-supplier-contact-editor" aria-label="Formulario de proveedor">
     <div className="e3-commerce-section-head">
       <h2>{editingId?'Editar datos del proveedor':'Registrar datos del proveedor'}</h2>
       <p>Solo el nombre comercial es obligatorio. La información se guarda únicamente dentro de {business?.name??'la empresa seleccionada'}.</p>
     </div>
     <form className="real-auth-form real-ops-form e3-commerce-form" onSubmit={e=>void save(e)}>
       <fieldset className="e3-supplier-form-section">
         <legend>1. Identificación comercial</legend>
         <div className="e3-commerce-form-grid">
           <label>Nombre comercial *<input required minLength={2} maxLength={90} autoComplete="organization"
             value={draft.name} onChange={e=>setField('name',e.target.value)} placeholder="Ej.: Distribuidora del Sur"/></label>
           <label>Persona de contacto (opcional)<input maxLength={100} autoComplete="off"
             value={draft.contact_person} onChange={e=>setField('contact_person',e.target.value)} placeholder="Ej.: Responsable comercial"/></label>
           <label className="e3-commerce-span-all">Productos o servicios que ofrece (opcional)
             <input maxLength={240} value={draft.offerings} onChange={e=>setField('offerings',e.target.value)}
               placeholder="Ej.: Alimentos, envases, logística…"/></label>
         </div>
       </fieldset>
       <fieldset className="e3-supplier-form-section">
         <legend>2. Contacto y ubicación</legend>
         <div className="e3-commerce-form-grid">
           <label>Teléfono comercial (opcional)<input type="tel" maxLength={35} inputMode="tel"
             value={draft.phone} onChange={e=>setDraft(old=>({...old,phone:e.target.value,
               ...(sameWhatsapp?{whatsapp:e.target.value}:{} )}))} placeholder="+5491112345678"/></label>
           <div className="e3-supplier-whatsapp-control">
             <label htmlFor="real-supplier-whatsapp">WhatsApp (con prefijo internacional)</label>
             <input id="real-supplier-whatsapp" type="tel" maxLength={35} inputMode="tel"
               value={draft.whatsapp} disabled={sameWhatsapp} onChange={e=>setField('whatsapp',e.target.value)} placeholder="+5491112345678"/>
             <label className="e3-supplier-same-phone">
               <input type="checkbox" checked={sameWhatsapp} onChange={e=>{
                 setSameWhatsapp(e.target.checked)
                 if(e.target.checked)setField('whatsapp',draft.phone)
               }}/>Usar el teléfono comercial
             </label>
           </div>
           <label>Correo electrónico (opcional)<input type="email" maxLength={120} autoComplete="off"
             value={draft.email} onChange={e=>setField('email',e.target.value)} placeholder="ventas@proveedor.com"/></label>
           <label>Dirección o referencia (opcional)<input maxLength={160} autoComplete="street-address"
             value={draft.address} onChange={e=>setField('address',e.target.value)} placeholder="Ej.: Av. Principal 123"/></label>
           <div className="e3-supplier-link-field">
             <label htmlFor="real-supplier-maps-url">Google Maps (enlace HTTPS, opcional)</label>
             <input id="real-supplier-maps-url" type="url" maxLength={2048}
               value={draft.maps_url} onChange={e=>setField('maps_url',e.target.value)} placeholder="https://maps.app.goo.gl/…"/>
             {addressSearchUrl&&<a className="e3-supplier-map-search" href={addressSearchUrl} target="_blank" rel="noopener noreferrer">
               Buscar esta dirección en Google Maps <span>(no verifica el punto exacto)</span>
             </a>}
           </div>
           <label>Sitio web / catálogo digital (HTTPS, opcional)<input type="url" maxLength={2048}
             value={draft.website} onChange={e=>setField('website',e.target.value)} placeholder="https://ejemplo.com"/></label>
           <label>Instagram (usuario, opcional)<input maxLength={31}
             value={draft.instagram} onChange={e=>setField('instagram',e.target.value)} placeholder="@empresa"/></label>
         </div>
       </fieldset>
       <fieldset className="e3-supplier-form-section">
         <legend>3. Observaciones comerciales</legend>
         <label>Notas (opcional)<textarea rows={4} maxLength={650} value={draft.notes}
           onChange={e=>setField('notes',e.target.value)} placeholder="Ej.: Horarios de entrega, condiciones de pedido y retiro…"/></label>
       </fieldset>
       <div className="real-auth-actions e3-commerce-form-actions">
         <button className="real-auth-primary" type="submit" disabled={busy||unknown}>{busy?'Guardando…':editingId?'Guardar cambios':'Crear proveedor'}</button>
         <button className="real-auth-secondary" type="button" disabled={busy} onClick={closeSubview}>Cancelar</button>
       </div>
     </form>
     <p className="e3-commerce-disclaimer">Los medios de pago y las promociones son informativos y se editarán en E3-1D2B. Este formulario no modifica esos datos ni registra compras o movimientos de inventario.</p>
   </section>}
 </section>
}
