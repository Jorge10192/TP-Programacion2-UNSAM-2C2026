import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
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
 const [business,setBusiness]=useState<RealBusiness|null>(null)
 const [items,setItems]=useState<Supplier[]>([])
 const [hasMore,setHasMore]=useState(false)
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [name,setName]=useState('')
 const [unknown,setUnknown]=useState(false)
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
 return <section className="real-auth-card real-business-panel">
   <nav className="real-business-nav" aria-label="Empresa">
     <button type="button" className="real-auth-link" onClick={()=>onNavigate('/real/empresas/'+businessId)}>Empresa</button>
     <button type="button" className="real-auth-link" onClick={()=>onNavigate('/real/empresas/'+businessId+'/compras')}>Compras y recepciones</button>
     <button type="button" className="real-auth-link" onClick={()=>onNavigate('/real/empresas')}>Mis empresas</button>
   </nav>
   <span className="real-auth-eyebrow">E2-7 · T07 · Proveedores REAL</span>
   <h1>Proveedores</h1>
   <p>Proveedores de {business?.name??'la empresa'} consultados en FastAPI y PostgreSQL. Sin datos DEMO.</p>
   {loading&&<p role="status">Consultando proveedores…</p>}
   <div className="real-ops-toolbar"><strong>{items.length} {items.length === 1 ? 'proveedor cargado' : 'proveedores cargados'}{hasMore?' (hay más páginas posibles)':''}</strong>
     <button type="button" className="real-auth-secondary" disabled={loading||busy} onClick={()=>void reload()}>Actualizar</button></div>
   {!loading&&items.length===0&&<div className="real-business-empty">No hay proveedores registrados en esta empresa.</div>}
   <div className="real-business-grid">
     {items.map(x=><article key={x.id} className="real-business-tile real-ops-tile">
       <strong>{x.name}</strong><small>{x.status}</small>
       {x.offerings&&<span>{x.offerings}</span>}
       {x.contact_person&&<span>Contacto: {x.contact_person}</span>}
       {x.phone&&<span>{x.phone}</span>}
       {canWrite&&<button type="button" className="real-auth-secondary" disabled={busy||unknown}
         onClick={()=>void status(x)}>{x.status==='ACTIVO'?'Desactivar':'Reactivar'}</button>}
     </article>)}
   </div>
   {hasMore&&<button type="button" className="real-auth-secondary" disabled={loading||busy} onClick={()=>void more()}>Cargar otros 100 proveedores</button>}
   {canWrite&&<form className="real-auth-form real-ops-form" onSubmit={e=>void create(e)}>
     <h2>Agregar proveedor REAL</h2>
     <p>Primera integración: alta con nombre. Contacto y promociones avanzadas no se editan todavía desde esta vista.</p>
     <label>Nombre comercial<input required minLength={2} maxLength={90} value={name}
       onChange={e=>setName(e.target.value)}/></label>
     <button className="real-auth-primary" type="submit" disabled={busy||unknown}>{busy?'Guardando…':'Crear proveedor'}</button>
   </form>}
   {unknown&&<div className="real-auth-message real-ops-warning" role="alert">
     La respuesta de la escritura se perdió. Como proveedores no tiene clave de replay, verificá el listado ANTES de repetir.
     <button className="real-auth-link" type="button" onClick={()=>void reload()}>Reconsultar proveedores</button>
   </div>}
   {notice&&<p className="real-auth-message" role="status">{notice}</p>}
   {error&&<p className="real-auth-message real-auth-error" role="alert">{error}</p>}
 </section>
}
