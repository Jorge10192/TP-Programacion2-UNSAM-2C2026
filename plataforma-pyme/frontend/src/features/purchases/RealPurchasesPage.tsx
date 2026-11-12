import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiHttpError } from '../../api/httpClient.ts'
import { createOperationsGateway } from '../businesses/realOperationsGateway.ts'
import type { RealBusiness } from '../businesses/businessGateway.ts'
import type { LocationRecord } from '../businesses/realOperationsGateway.ts'
import { createCatalogGateway, centsToPesos } from '../catalog/realCatalogGateway.ts'
import type { CatalogItem } from '../catalog/realCatalogGateway.ts'
import { createSupplyGateway, decimalToMilli, milliToDecimal, priceInputCents, purchaseStatusPresentation, missingReceiptMessage, inspectReceipt,
  supplyErrorMessage, validatePurchase } from './realSupplyGateway.ts'
import type { Purchase, PurchaseReceipt, NewPurchase, Supplier, PurchaseLineInput } from './realSupplyGateway.ts'
import { RealReceiptDetail } from './RealReceiptDetail.tsx'
import { Icon } from '../../app/Icon.tsx'
import './realPurchasesVisual.css'
import { pendingScope, supplyJournal, PendingConflictError, PendingStorageError, newPurchaseIntent, newReceiptIntent } from './supplyPendingJournal.ts'
import { suggestedUnitCost, costExceedsSalePrice, previewLineTotalCents, previewPurchaseTotalCents, unitCostFromExactLineTotal } from './purchaseCostProposal.ts'
import type { SupplyPending } from './supplyPendingJournal.ts'
type Props={token:string;userId:string;userDisplayName:string;businessId:string;onNavigate:(path:string)=>void;onUnauthorized:()=>void}
type DraftLine={catalogId:string;description:string;quantity:string;unitCost:string;totalDraft:string|null}
type Draft={date:string;supplierId:string;reference:string;notes:string;lines:DraftLine[]}
const emptyLine=():DraftLine=>({catalogId:'concept',description:'Concepto de compra',quantity:'1',unitCost:'0',totalDraft:null})
function todayLocal():string{
 const date=new Date()
 return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-')
}
const emptyDraft=():Draft=>({date:todayLocal(),supplierId:'',reference:'',notes:'',lines:[emptyLine()]})
const money=(n:number)=>'$ '+centsToPesos(n)
export function RealPurchasesPage({token,userId,userDisplayName,businessId,onNavigate,onUnauthorized}:Props){
 const api=useMemo(()=>createSupplyGateway(token,businessId),[token,businessId])
 const catalogApi=useMemo(()=>createCatalogGateway(token,businessId),[token,businessId])
 const companies=useMemo(()=>createOperationsGateway(token,userId),[token,userId])
 const alive=useRef(true)
 const receiptLookup=useRef(false)
 const receiptDetailRef=useRef<HTMLDivElement|null>(null)
 const backButtonRef=useRef<HTMLButtonElement|null>(null)
 const listHeadingRef=useRef<HTMLHeadingElement|null>(null)
 const previousForm=useRef(false)
 const [business,setBusiness]=useState<RealBusiness|null>(null)
 const [purchases,setPurchases]=useState<Purchase[]>([])
 const [suppliers,setSuppliers]=useState<Supplier[]>([])
 const [catalog,setCatalog]=useState<CatalogItem[]>([])
 const [locations,setLocations]=useState<LocationRecord[]>([])
 const [hasMore,setHasMore]=useState(false)
 const [catalogMore,setCatalogMore]=useState(false)
 const [suppliersMore,setSuppliersMore]=useState(false)
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [form,setForm]=useState(false)
 const [search,setSearch]=useState('')
 const [statusFilter,setStatusFilter]=useState('TODOS')
 const [draft,setDraft]=useState<Draft>(emptyDraft)
 const [consent,setConsent]=useState(false)
 const [pending,setPending]=useState<Extract<SupplyPending,{kind:'purchase.create'}>|null>(null)
 const [pendingReceipt,setPendingReceipt]=useState<Extract<SupplyPending,{kind:'purchase.receive'}>|null>(null)
 const [shownReceipt,setShownReceipt]=useState<PurchaseReceipt|null>(null)
 useEffect(()=>{
   if(!shownReceipt)return
   const detail=receiptDetailRef.current
   detail?.focus({preventScroll:true})
   detail?.scrollIntoView({block:'nearest',behavior:'smooth'})
 },[shownReceipt])
 const [receiptFor,setReceiptFor]=useState<string|null>(null)
 const [locationId,setLocationId]=useState('')
 const [journalReady,setJournalReady]=useState(false)
 const purchaseScope=useMemo(()=>pendingScope(userId,businessId,'purchase.create'),[userId,businessId])
 useEffect(()=>{
   alive.current=true
   const ctrl=new AbortController()
   void Promise.all([
     companies.business(businessId,ctrl.signal),
     api.purchases(0,100,ctrl.signal),
     api.suppliers(0,100,ctrl.signal),
     catalogApi.page(0,100,ctrl.signal),
     companies.locations(businessId,ctrl.signal),
     supplyJournal.load(purchaseScope),
   ]).then(([company,docs,providers,items,sites,saved])=>{
     if(ctrl.signal.aborted||!alive.current)return
     setBusiness(company);setPurchases(docs);setSuppliers(providers);setCatalog(items);setLocations(sites)
     setHasMore(docs.length===100);setCatalogMore(items.length===100);setSuppliersMore(providers.length===100)
     if(saved){
       if(saved.kind!=='purchase.create')throw new PendingConflictError()
       setPending(saved);setForm(true);setConsent(true)
       setDraft({
         date:saved.body.purchased_on,supplierId:saved.body.supplier_id??'',
         reference:saved.body.reference,notes:saved.body.notes,
         lines:saved.body.lines.map(line=>({
           catalogId:line.catalog_item_id??'concept',description:line.description,
           quantity:milliToDecimal(line.quantity_milli),unitCost:centsToPesos(line.unit_cost_cents),totalDraft:null,
         })),
       })
       setNotice('Compra pendiente recuperada. Revisá el listado antes de reintentar. No se enviará automáticamente.')
     }
     setJournalReady(true)
   }).catch(err=>{
     if(ctrl.signal.aborted||!alive.current)return
     if(err instanceof ApiHttpError&&err.status===401)onUnauthorized()
     else setError(err instanceof PendingConflictError||err instanceof PendingStorageError?err.message:supplyErrorMessage(err))
   }).finally(()=>{if(!ctrl.signal.aborted&&alive.current)setLoading(false)})
   return ()=>{ctrl.abort();alive.current=false}
 },[api,catalogApi,companies,businessId,purchaseScope,onUnauthorized])
 const canWrite=business?.status==='ACTIVA'&&business.membership.status==='ACTIVA'
  &&['TITULAR_ADMINISTRATIVO','ADMINISTRADOR'].includes(business.membership.role)
 const canReceive=business?.status==='ACTIVA'&&business.membership.status==='ACTIVA'
 const activeSites=locations.filter(x=>x.status==='ACTIVA'&&x.can_store)
 const activeItems=catalog.filter(x=>x.status==='ACTIVO')
 const activeSuppliers=suppliers.filter(x=>x.status==='ACTIVO')
 const totalPreview=draft.lines.some(x=>x.totalDraft!==null)?null:previewPurchaseTotalCents(draft.lines)
 const selected=purchases.find(x=>x.id===receiptFor)
 function failed(err:unknown){
   if(!alive.current)return
   if(err instanceof ApiHttpError&&err.status===401){onUnauthorized();return}
   setError(supplyErrorMessage(err))
 }
 async function refresh(){
   if(busy||loading)return
   setLoading(true);setError('');setNotice('')
   try{
     const [docs,providers,items,sites]=await Promise.all([api.purchases(),api.suppliers(),catalogApi.page(0),companies.locations(businessId)])
     if(!alive.current)return
     setPurchases(docs);setHasMore(docs.length===100)
     setSuppliers(providers);setSuppliersMore(providers.length===100)
     setCatalog(items);setCatalogMore(items.length===100)
     setLocations(sites)
   }catch(err){failed(err)}finally{if(alive.current)setLoading(false)}
 }
 async function more(which:'purchases'|'suppliers'|'catalog'){
   if(busy||loading)return
   setLoading(true);setError('')
   try{
     if(which==='purchases'){
       const newRows=await api.purchases(purchases.length)
       if(!alive.current)return
       if(newRows.some(x=>purchases.some(y=>y.id===x.id))){setHasMore(false);setError('El historial cambió. Actualizá desde la primera página.');return}
       setPurchases(old=>[...old,...newRows]);setHasMore(newRows.length===100)
     }else if(which==='suppliers'){
       const newRows=await api.suppliers(suppliers.length)
       if(!alive.current)return
       if(newRows.some(x=>suppliers.some(y=>y.id===x.id))){setSuppliersMore(false);setError('Proveedores modificados durante paginación. Actualizá.');return}
       setSuppliers(old=>[...old,...newRows]);setSuppliersMore(newRows.length===100)
     }else{
       const newRows=await catalogApi.page(catalog.length)
       if(!alive.current)return
       if(newRows.some(x=>catalog.some(y=>y.id===x.id))){setCatalogMore(false);setError('Catálogo modificado durante paginación. Actualizá.');return}
       setCatalog(old=>[...old,...newRows]);setCatalogMore(newRows.length===100)
     }
   }catch(err){failed(err)}finally{if(alive.current)setLoading(false)}
 }
 function buildPurchase():NewPurchase{
   if(draft.lines.some(x=>x.totalDraft!==null))throw new RangeError('Primero aplicá o cancelá la edición del costo total de cada renglón.')
   const lines:PurchaseLineInput[]=draft.lines.map(x=>{
     const article=catalog.find(item=>item.id===x.catalogId)
     if(x.catalogId!=='concept'&&(!article||article.status!=='ACTIVO'))
       throw new RangeError('Seleccioná un artículo activo del catálogo REAL.')
     return {catalog_item_id:article?.id??null,
       description:article?.name??x.description.trim(),
       unit:article?.unit??'CONCEPTO',
       quantity_milli:decimalToMilli(x.quantity),unit_cost_cents:priceInputCents(x.unitCost)}
   })
   const body:NewPurchase={purchased_on:draft.date,supplier_id:draft.supplierId||null,
     reference:draft.reference.trim(),notes:draft.notes.trim(),lines}
   validatePurchase(body)
   if(body.supplier_id&&!activeSuppliers.some(x=>x.id===body.supplier_id))
     throw new RangeError('Elegí un proveedor activo de esta empresa.')
   return body
 }
 async function savePurchase(e:FormEvent<HTMLFormElement>){
   e.preventDefault()
   if(!canWrite||busy||loading||!journalReady)return
   if(!consent){setError('Debés autorizar guardar la intención comercial en IndexedDB.');return}
   let body:NewPurchase
   try{body=pending?.body??buildPurchase()}catch(err){failed(err);return}
   const intent:Extract<SupplyPending,{kind:'purchase.create'}>=pending??newPurchaseIntent(userId,businessId,body)
   setBusy(true);setError('');setNotice('')
   try{
     await supplyJournal.reserve(intent)
     if(!alive.current)return
     setPending(intent)
     const result=await api.createPurchase(intent.body,intent.key)
     if(!alive.current)return
     await supplyJournal.discard(intent.scope,intent.key)
     if(!alive.current)return
     setPending(null);setConsent(false);setForm(false);setDraft(emptyDraft())
     setNotice('Compra '+result.id+' confirmada. La compra NO agregó stock: para eso tenés que confirmar su recepción.')
     const rows=await api.purchases()
     if(alive.current){setPurchases(rows);setHasMore(rows.length===100)}
   }catch(err){
     if(!alive.current)return
     if(err instanceof ApiHttpError&&err.status===401){onUnauthorized();return}
     setError(err instanceof PendingStorageError||err instanceof PendingConflictError?err.message:
       'No confirmamos la creación. Revisá el historial y, si corresponde, reintentá solo con la MISMA clave/cuerpo. '+supplyErrorMessage(err))
   }finally{if(alive.current)setBusy(false)}
 }
 async function beginReceipt(purchaseId:string){
   if(busy||loading||receiptLookup.current)return
   receiptLookup.current=true
   setBusy(true)
   setError('');setNotice('');setShownReceipt(null);setReceiptFor(purchaseId);setPendingReceipt(null);setLocationId('')
   try{
     const scope=pendingScope(userId,businessId,'purchase.receive',purchaseId)
     const restored=await supplyJournal.load(scope)
     if(!alive.current)return
     if(restored){
       if(restored.kind!=='purchase.receive')throw new PendingConflictError()
       setPendingReceipt(restored);setLocationId(restored.body.location_id)
       setNotice('Recepción pendiente recuperada: comprobá primero si existe un comprobante.')
     }
   }catch(err){failed(err)}
   finally{receiptLookup.current=false;if(alive.current)setBusy(false)}
 }
 async function sendReceipt(){
   if(!receiptFor||!canReceive||busy||loading||receiptLookup.current)return
   if(pendingReceipt&&pendingReceipt.purchaseId!==receiptFor){
     setError('La recepción recuperada corresponde a otra compra. Cerrá la selección y volvé a abrirla.');return
   }
   if(!window.confirm('Confirmar recepción COMPLETA de la compra en la ubicación elegida. Esta acción incrementa stock real en PostgreSQL y no admite recepción parcial. ¿Continuar?'))return
   const intent:Extract<SupplyPending,{kind:'purchase.receive'}>=pendingReceipt??newReceiptIntent(userId,businessId,receiptFor,locationId)
   if(!activeSites.some(x=>x.id===intent.body.location_id)){
     setError('La sede elegida está pausada, fuera del tenant o no permite stock.');return
   }
   setBusy(true);setError('');setNotice('')
   try{
     await supplyJournal.reserve(intent)
     if(!alive.current)return
     setPendingReceipt(intent)
     const result=await api.receive(intent.purchaseId,intent.body.location_id,intent.key)
     if(!alive.current)return
     await supplyJournal.discard(intent.scope,intent.key)
     if(!alive.current)return
     setPendingReceipt(null);setReceiptFor(null);setShownReceipt(result)
     setNotice('Recepción confirmada; el detalle muestra los movimientos de stock REAL. No repetir.')
     const rows=await api.purchases()
     if(alive.current){setPurchases(rows);setHasMore(rows.length===100)}
   }catch(err){
     if(!alive.current)return
     if(err instanceof ApiHttpError&&err.status===401){onUnauthorized();return}
     setError(err instanceof PendingStorageError||err instanceof PendingConflictError?err.message:
       'Resultado incierto o rechazado. Consultá primero el comprobante, luego reintentá solo la MISMA clave. '+supplyErrorMessage(err))
   }finally{if(alive.current)setBusy(false)}
 }
 async function checkReceipt(purchaseId?:string){
   const target=purchaseId??receiptFor
   if(!target||busy||loading)return
   setBusy(true);setError('');setNotice('');setShownReceipt(null)
   try{
     const scope=pendingScope(userId,businessId,'purchase.receive',target)
     const fromDisk=await supplyJournal.load(scope)
     if(fromDisk&&fromDisk.kind!=='purchase.receive')throw new PendingConflictError()
     const inspected=await inspectReceipt(api,target)
     if(!alive.current)return
     if(inspected.kind!=='confirmed'){
       setPurchases(old=>old.map(p=>p.id===inspected.purchase.id?inspected.purchase:p))
       if(inspected.kind==='pending')setNotice(missingReceiptMessage(inspected.purchase.status))
       else setError(missingReceiptMessage(inspected.purchase.status))
       return
     }
     const receipt=inspected.receipt
     setShownReceipt(receipt)
     if(fromDisk&&receipt.request_id===fromDisk.key){
       await supplyJournal.discard(fromDisk.scope,fromDisk.key)
       if(!alive.current)return
       setPendingReceipt(null);setReceiptFor(null)
       setNotice('Recepción ya confirmada con la misma clave; pendiente limpiado sin duplicar stock.')
     }else{
       setNotice('')
     }
     const rows=await api.purchases()
     if(alive.current){setPurchases(rows);setHasMore(rows.length===100)}
   }catch(err){failed(err)}
   finally{if(alive.current)setBusy(false)}
 }
 async function discardPurchase(){
   if(!pending||busy)return
   if(!window.confirm('Solo descartá si verificaste el historial. Si la compra ya existe, otra clave puede duplicarla. ¿Eliminar pendiente local?'))return
   setBusy(true)
   try{await supplyJournal.discard(pending.scope,pending.key);if(alive.current){setPending(null);setDraft(emptyDraft());setConsent(false);setNotice('Pendiente local descartado; no borramos documentos en FastAPI.')}}
   catch(err){failed(err)}finally{if(alive.current)setBusy(false)}
 }
 // Sólo cambiar la vista: nunca descartar una intención durable de IndexedDB.
 function closePurchaseForm(){if(!busy)setForm(false)}
 function openPurchaseForm(){if(canWrite&&!busy&&!loading&&journalReady){setForm(true);setError('')}}
 useEffect(()=>{
   if(previousForm.current===form)return
   if(form)backButtonRef.current?.focus()
   else listHeadingRef.current?.focus()
   previousForm.current=form
 },[form])
 const visiblePurchases=purchases.filter(p=>
   (statusFilter==='TODOS'||p.status===statusFilter)&&
   [p.reference,p.supplier_name_snapshot||'',p.id].some(value=>
     value.toLocaleLowerCase('es-AR').includes(search.trim().toLocaleLowerCase('es-AR'))))
 const loadedPending=purchases.filter(p=>p.status==='REGISTRADA').length
 const loadedReceived=purchases.filter(p=>p.status==='RECIBIDA').length
 const statuses=[...new Set(purchases.map(p=>p.status))]
 function changeLine(index:number,patch:Partial<DraftLine>){
   setDraft(old=>({...old,lines:old.lines.map((x,i)=>i===index?{...x,...patch}:x)}))
 }
 function applyLineTotal(index:number) {
   const line=draft.lines[index]
   if(!line||line.totalDraft===null)return
   try {
     const calculatedUnit=unitCostFromExactLineTotal(line.quantity,line.totalDraft)
     changeLine(index,{unitCost:calculatedUnit,totalDraft:null})
     setError('')
   } catch(err) {
     setError(err instanceof Error?err.message:'El importe total del renglón no es válido.')
   }
 }
 return <section className="real-auth-card real-business-panel e3-purchases-page">
   {!form&&<>
     <nav className="real-business-nav" aria-label="Operaciones REAL">
     <button className="real-auth-link" type="button" onClick={()=>onNavigate('/real/empresas/'+businessId)}>Empresa</button>
     <button className="real-auth-link" type="button" onClick={()=>onNavigate('/real/empresas/'+businessId+'/proveedores')}>Proveedores</button>
     <button className="real-auth-link" type="button" onClick={()=>onNavigate('/real/empresas/'+businessId+'/catalogo')}>Catálogo</button>
     <button className="real-auth-link" type="button" onClick={()=>onNavigate('/real/empresas/'+businessId+'/ubicaciones')}>Ubicaciones</button>
   </nav>
   </>}
   {form&&<div className="e3-purchase-backbar">
     <button ref={backButtonRef} type="button" className="e3-purchase-back" disabled={busy} onClick={closePurchaseForm}>
       <Icon name="arrow-left" size={18}/>Volver a compras
     </button>
     <span className="e3-purchase-view-tag">{pending?'Intención pendiente':'Registrar compra'}</span>
   </div>}
   <header className="e3-purchase-heading">
     <span className="e3-purchase-heading-icon"><Icon name="shopping" size={26}/></span>
     <div className="e3-purchase-heading-copy">
       <span className="e3-purchase-eyebrow">{business?.name??'Empresa'} · Compras</span>
       {form?<h1>{pending?'Compra pendiente recuperada':'Nueva compra'}</h1>
         :<h1 ref={listHeadingRef} tabIndex={-1}>Compras y recepción</h1>}
       <p>{form?'Registrar una compra no aumenta inventario. La recepción es una operación separada.':
         'Consultá tus compras y su estado de recepción por sede.'}</p>
     </div>
     {!form&&canWrite&&<button type="button" className="real-auth-primary e3-purchase-new-action"
       disabled={busy||loading||!journalReady} onClick={openPurchaseForm}>
       <Icon name="plus" size={17}/>Registrar compra REAL</button>}
   </header>
   {notice&&<p className="real-auth-message" role="status">{notice}</p>}
   {error&&<p className="real-auth-message real-auth-error" role="alert">{error}</p>}
   {!form&&<>
     <div className="e3-purchase-stats" aria-label="Resumen de compras cargadas">
       <div><span>Compras cargadas</span><strong>{purchases.length}</strong></div>
       <div><span>Pendientes de recepción</span><strong>{loadedPending}</strong></div>
       <div><span>Recibidas</span><strong>{loadedReceived}</strong></div>
     </div>
     <div className="e3-purchase-filters">
       <label className="e3-purchase-search"><Icon name="search" size={18}/>
         <span className="e3-purchase-visually-hidden">Buscar compras cargadas</span>
         <input type="search" aria-label="Buscar compras cargadas" placeholder="Buscar referencia, proveedor o ID"
           value={search} onChange={e=>setSearch(e.target.value)}/>
       </label>
       <label>Estado
         <select aria-label="Filtrar compras por estado" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
           <option value="TODOS">Todos</option>
           {statuses.map(state=><option key={state} value={state}>{purchaseStatusPresentation(state).label}</option>)}
         </select>
       </label>
     </div>
     <p className="e3-purchase-scope-note">{purchases.length} compras cargadas.
       {hasMore?' Hay más páginas; filtros y contadores sólo aplican a las cargadas.':' Se consultó la última página.'}
       Registrar una compra no agrega stock; sólo una recepción confirmada lo modifica.</p>
<div className="real-ops-toolbar e3-purchase-toolbar"><strong>{purchases.length} compras cargadas{hasMore?' (no es todo el historial)':''}</strong>
     <button type="button" className="real-auth-secondary" disabled={busy||loading} onClick={()=>void refresh()}>Actualizar datos</button>
   </div>
   {loading&&<p role="status">Consultando proveedores, catálogo, compras y ubicaciones…</p>}
   {!loading&&purchases.length===0&&<div className="real-business-empty">Todavía no hay compras reales en esta empresa.</div>}
   {!loading&&purchases.length>0&&visiblePurchases.length===0&&<div className="real-business-empty">No hay compras con esos filtros dentro de las páginas cargadas.</div>}
   <div className="real-supply-list e3-purchases-grid">
     {visiblePurchases.map(p=>{const visualState=purchaseStatusPresentation(p.status);return <article key={p.id} className="real-supply-card">
       <div className="real-catalog-tile-header"><strong>{p.reference||'Compra '+p.id.slice(0,8)}</strong><span className={"real-catalog-status "+(visualState.tone==="pending"?"real-supply-pending-status":visualState.tone==="confirmed"?"real-catalog-active":"real-supply-neutral-status")}>{visualState.label}</span></div>
       <small>{p.purchased_on} · Proveedor: {p.supplier_name_snapshot||'Sin proveedor'} · {p.lines.length} {p.lines.length === 1 ? 'renglón' : 'renglones'}</small>
       <strong className="real-supply-total">{money(p.total_cents)}</strong>
       <ul>{p.lines.map(l=><li key={l.id}>{l.description_snapshot} — {milliToDecimal(l.quantity_milli)} {l.unit_snapshot} × {money(l.unit_cost_cents)} = {money(l.line_total_cents)}</li>)}</ul>
       {p.status==='REGISTRADA'&&canReceive&&<button className="real-auth-secondary real-supply-pending-action" type="button" disabled={busy||loading} onClick={()=>void beginReceipt(p.id)}>Pendiente · Confirmar recepción en ubicación</button>}
       {p.status==='RECIBIDA'&&<button className="real-auth-secondary" type="button" disabled={busy||loading} onClick={()=>void checkReceipt(p.id)}>Consultar comprobante</button>}
       {shownReceipt?.purchase_id===p.id&&<div ref={receiptDetailRef} tabIndex={-1} className="real-supply-receipt-focus" aria-label="Comprobante de recepción consultado">
         <RealReceiptDetail receipt={shownReceipt} purchase={p}
           locations={locations} viewer={{id:userId,displayName:userDisplayName}}
           onClose={()=>setShownReceipt(null)}/>
       </div>}

     </article>})}
   </div>
   {hasMore&&<button type="button" className="real-auth-secondary" disabled={loading||busy} onClick={()=>void more('purchases')}>Cargar 100 compras más</button>}
   {receiptFor&&selected&&<section className="real-ops-subpanel">
     <h2>Recepción completa de compra {selected.reference||selected.id.slice(0,8)}</h2>
     <p>La recepción se confirma de una sola vez, en una única sede. No se pueden modificar cantidades aquí.</p>
     <label className="real-supply-label">Destino con almacenamiento activo
       <select disabled={busy||!!pendingReceipt} value={locationId} onChange={e=>setLocationId(e.target.value)}>
         <option value="">Seleccionar sede</option>
         {activeSites.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
       </select>
     </label>
     {pendingReceipt&&<p className="real-ops-warning">Recepción pendiente recuperada con clave original. Consultá primero si se confirmó antes de repetir.</p>}
     <div className="real-auth-actions">
       <button className="real-auth-primary real-supply-confirm-action" type="button" disabled={busy||!locationId} onClick={()=>void sendReceipt()}>{busy?'Procesando…':pendingReceipt?'Reintentar MISMA recepción':'Confirmar recepción REAL'}</button>
       <button className="real-auth-secondary" type="button" disabled={busy} onClick={()=>void checkReceipt()}>Consultar comprobante</button>
       <button className="real-auth-secondary" type="button" disabled={busy} onClick={()=>setReceiptFor(null)}>Cerrar</button>
     </div>
   </section>}
   
      </>}
   {canWrite&&form&&<form className="real-auth-form real-ops-form" onSubmit={e=>void savePurchase(e)}>
     <h2>{pending?'Compra pendiente recuperada':'Nueva compra sin recepción'}</h2>
     <p>La identidad de cada compra y sus renglones se guarda en IndexedDB antes del POST. No guarda tokens, pero los datos comerciales NO están cifrados. Evitá dispositivos compartidos.</p>
     <fieldset className="real-intent-fields" disabled={busy||!!pending||!journalReady}>
       <label>Fecha de compra<input type="date" required value={draft.date} onChange={e=>setDraft(old=>({...old,date:e.target.value}))}/></label>
       <label>Proveedor (opcional)
         <select value={draft.supplierId} onChange={e=>setDraft(old=>({...old,supplierId:e.target.value}))}>
           <option value="">Sin proveedor</option>{activeSuppliers.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
         </select>
       </label>
       {suppliersMore&&<p>Hay proveedores aún no cargados. Cargá más páginas antes de elegir uno.</p>}
       <label>Referencia<input maxLength={70} value={draft.reference} onChange={e=>setDraft(old=>({...old,reference:e.target.value}))}/></label>
       <label>Notas<textarea rows={2} maxLength={500} value={draft.notes} onChange={e=>setDraft(old=>({...old,notes:e.target.value}))}/></label>
       {draft.lines.map((line,i)=>{const selectedArticle=activeItems.find(x=>x.id===line.catalogId);const calculatedLineTotal=previewLineTotalCents(line.quantity,line.unitCost);return <div className="real-supply-line" key={i}>
         <strong>Renglón {i+1}</strong>
         <label>Artículo del catálogo o concepto libre
           <select value={line.catalogId} onChange={e=>{const selected=activeItems.find(x=>x.id===e.target.value);changeLine(i,{catalogId:e.target.value,unitCost:suggestedUnitCost(selected),totalDraft:null})}}>
             <option value="concept">Concepto libre (no genera stock)</option>
             {activeItems.map(x=><option key={x.id} value={x.id}>{x.name} · {x.unit}</option>)}
           </select>
         </label>
         {line.catalogId==='concept'&&<label>Descripción<input required minLength={2} maxLength={140} value={line.description} onChange={e=>changeLine(i,{description:e.target.value})}/></label>}
         <div className="real-supply-amounts">
           <label>Cantidad (hasta 3 decimales)
             <input required inputMode="decimal" value={line.quantity} disabled={line.totalDraft!==null}
               onChange={e=>changeLine(i,{quantity:e.target.value})}/>
           </label>
           <label>Costo unitario ($)
             <input required inputMode="decimal" value={line.unitCost} disabled={line.totalDraft!==null}
               onChange={e=>changeLine(i,{unitCost:e.target.value})}/>
           </label>
           <div className="real-supply-total-field">
             <label htmlFor={'real-line-total-'+i}>Costo total ($)</label>
             <div className="real-supply-total-control">
               <input id={'real-line-total-'+i} inputMode="decimal" aria-label={'Costo total del renglón '+(i+1)}
                 value={line.totalDraft??(calculatedLineTotal===null?'':centsToPesos(calculatedLineTotal))}
                 readOnly={line.totalDraft===null} aria-readonly={line.totalDraft===null}
                 onChange={e=>changeLine(i,{totalDraft:e.target.value})}
                 placeholder={calculatedLineTotal===null?'Completá cantidad y costo':'0,00'}/>
               {line.totalDraft===null&&<button type="button" className="real-supply-total-edit"
                 disabled={busy||!journalReady||calculatedLineTotal===null}
                 aria-label={'Editar costo total del renglón '+(i+1)}
                 title="Editar costo total" onClick={()=>changeLine(i,{totalDraft:centsToPesos(calculatedLineTotal)})}>Editar</button>}
             </div>
           </div>
         </div>
         {line.totalDraft!==null&&<div className="real-supply-total-actions">
           <span>Para modificar el total se recalculará el costo unitario solo si los centavos coinciden exactamente.</span>
           <button type="button" className="real-auth-secondary" onClick={()=>applyLineTotal(i)}>Aplicar total</button>
           <button type="button" className="real-auth-secondary" onClick={()=>changeLine(i,{totalDraft:null})}>Cancelar</button>
         </div>}
         {selectedArticle&&<p className="real-supply-cost-hint">Costo de referencia en catálogo: <strong>{selectedArticle.reference_cost_cents===null?'sin informar':money(selectedArticle.reference_cost_cents)}</strong>. Se propone al seleccionar el artículo, pero podés editarlo según el comprobante del proveedor. No se modifica el costo de referencia del catálogo.</p>}
         {selectedArticle&&costExceedsSalePrice(line.unitCost,selectedArticle)&&<p className="real-supply-cost-warning" role="status">Atención: el costo unitario de compra supera el precio de venta actual del catálogo ({selectedArticle.price_cents===null?'no informado':money(selectedArticle.price_cents)}). Revisá el margen; podés continuar con la compra.</p>}
         {draft.lines.length>1&&<button type="button" className="real-auth-secondary" onClick={()=>setDraft(old=>({...old,lines:old.lines.filter((_,j)=>j!==i)}))}>Quitar renglón</button>}
       </div>})}
       <button type="button" className="real-auth-secondary" disabled={draft.lines.length>=30} onClick={()=>setDraft(old=>({...old,lines:[...old.lines,emptyLine()]}))}>Agregar renglón</button>
       <div className="real-supply-grand-total" aria-live="polite">
         <span>Total de la compra</span>
         <strong>{totalPreview===null?'Completá importes válidos':money(totalPreview)}</strong>
       </div>
     </fieldset>
     {pending&&<p className="real-ops-warning">El cuerpo original quedó bloqueado. Primero comprobá el historial y luego reintentá con la misma clave. F5 no envía nada automáticamente.</p>}
     {!pending&&<label className="real-ops-check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Acepto guardar temporalmente los datos de esta compra en este navegador.</label>}
     <div className="real-auth-actions">
       <button type="submit" className="real-auth-primary" disabled={busy||!journalReady||draft.lines.some(x=>x.totalDraft!==null)||(!pending&&!consent)}>{busy?'Procesando…':pending?'Reintentar MISMA compra':'Registrar compra sin stock'}</button>
       {pending&&<button type="button" className="real-auth-secondary" disabled={busy} onClick={()=>void discardPurchase()}>Descartar tras verificar</button>}
       <button type="button" className="real-auth-secondary" disabled={busy} onClick={closePurchaseForm}>Cerrar formulario</button>
     </div>
   </form>}
      {form&&catalogMore&&<button type="button" className="real-auth-secondary" disabled={busy||loading} onClick={()=>void more('catalog')}>Cargar 100 artículos más para compras</button>}
   {form&&suppliersMore&&<button type="button" className="real-auth-secondary" disabled={busy||loading} onClick={()=>void more('suppliers')}>Cargar 100 proveedores más</button>}
   
   
 </section>
}
