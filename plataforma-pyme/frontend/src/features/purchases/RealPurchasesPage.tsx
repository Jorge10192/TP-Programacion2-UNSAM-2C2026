import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiHttpError } from '../../api/httpClient.ts'
import { createOperationsGateway } from '../businesses/realOperationsGateway.ts'
import type { RealBusiness } from '../businesses/businessGateway.ts'
import type { LocationRecord } from '../businesses/realOperationsGateway.ts'
import { createCatalogGateway, centsToPesos } from '../catalog/realCatalogGateway.ts'
import type { CatalogItem } from '../catalog/realCatalogGateway.ts'
import { createSupplyGateway, decimalToMilli, milliToDecimal, priceInputCents,
  supplyErrorMessage, validatePurchase } from './realSupplyGateway.ts'
import type { Purchase, NewPurchase, Supplier, PurchaseLineInput } from './realSupplyGateway.ts'
import { pendingScope, supplyJournal, PendingConflictError, PendingStorageError, newPurchaseIntent, newReceiptIntent } from './supplyPendingJournal.ts'
import { suggestedUnitCost, costExceedsSalePrice, previewLineTotalCents, previewPurchaseTotalCents, unitCostFromExactLineTotal } from './purchaseCostProposal.ts'
import type { SupplyPending } from './supplyPendingJournal.ts'
type Props={token:string;userId:string;businessId:string;onNavigate:(path:string)=>void;onUnauthorized:()=>void}
type DraftLine={catalogId:string;description:string;quantity:string;unitCost:string;totalDraft:string|null}
type Draft={date:string;supplierId:string;reference:string;notes:string;lines:DraftLine[]}
const emptyLine=():DraftLine=>({catalogId:'concept',description:'Concepto de compra',quantity:'1',unitCost:'0',totalDraft:null})
const emptyDraft=():Draft=>({date:new Date().toISOString().slice(0,10),supplierId:'',reference:'',notes:'',lines:[emptyLine()]})
const money=(n:number)=>'$ '+centsToPesos(n)
export function RealPurchasesPage({token,userId,businessId,onNavigate,onUnauthorized}:Props){
 const api=useMemo(()=>createSupplyGateway(token,businessId),[token,businessId])
 const catalogApi=useMemo(()=>createCatalogGateway(token,businessId),[token,businessId])
 const companies=useMemo(()=>createOperationsGateway(token,userId),[token,userId])
 const alive=useRef(true)
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
 const [draft,setDraft]=useState<Draft>(emptyDraft)
 const [consent,setConsent]=useState(false)
 const [pending,setPending]=useState<Extract<SupplyPending,{kind:'purchase.create'}>|null>(null)
 const [pendingReceipt,setPendingReceipt]=useState<Extract<SupplyPending,{kind:'purchase.receive'}>|null>(null)
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
   if(busy||loading)return
   setError('');setNotice('');setReceiptFor(purchaseId);setPendingReceipt(null);setLocationId('')
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
 }
 async function sendReceipt(){
   if(!receiptFor||!canReceive||busy||loading)return
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
     setPendingReceipt(null);setReceiptFor(null)
     setNotice('Recepción confirmada: '+result.movements.length+' movimientos de stock REAL registrados. No repetir.')
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
   if(!target)return
   try{
     const scope=pendingScope(userId,businessId,'purchase.receive',target)
     const fromDisk=await supplyJournal.load(scope)
     if(fromDisk&&fromDisk.kind!=='purchase.receive')throw new PendingConflictError()
     const receipt=await api.receipt(target)
     if(!alive.current)return
     if(fromDisk&&receipt.request_id===fromDisk.key){
       await supplyJournal.discard(fromDisk.scope,fromDisk.key)
       if(!alive.current)return
       setPendingReceipt(null);setReceiptFor(null)
       setNotice('Recepción ya confirmada con la misma clave; pendiente limpiado sin duplicar stock.')
     }else{
       setNotice('Existe recepción confirmada en sede '+receipt.location_id+' con '+receipt.movements.length+' movimientos. No la repitas.')
     }
     const rows=await api.purchases()
     if(alive.current){setPurchases(rows);setHasMore(rows.length===100)}
   }catch(err){failed(err)}
 }
 async function discardPurchase(){
   if(!pending||busy)return
   if(!window.confirm('Solo descartá si verificaste el historial. Si la compra ya existe, otra clave puede duplicarla. ¿Eliminar pendiente local?'))return
   setBusy(true)
   try{await supplyJournal.discard(pending.scope,pending.key);if(alive.current){setPending(null);setDraft(emptyDraft());setConsent(false);setNotice('Pendiente local descartado; no borramos documentos en FastAPI.')}}
   catch(err){failed(err)}finally{if(alive.current)setBusy(false)}
 }
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
 return <section className="real-auth-card real-business-panel">
   <nav className="real-business-nav" aria-label="Operaciones REAL">
     <button className="real-auth-link" type="button" onClick={()=>onNavigate('/real/empresas/'+businessId)}>Empresa</button>
     <button className="real-auth-link" type="button" onClick={()=>onNavigate('/real/empresas/'+businessId+'/proveedores')}>Proveedores</button>
     <button className="real-auth-link" type="button" onClick={()=>onNavigate('/real/empresas/'+businessId+'/catalogo')}>Catálogo</button>
     <button className="real-auth-link" type="button" onClick={()=>onNavigate('/real/empresas/'+businessId+'/ubicaciones')}>Ubicaciones</button>
   </nav>
   <span className="real-auth-eyebrow">E2-7 · T07 · Compras REAL</span>
   <h1>Compras y recepción</h1>
   <p>Empresa: <strong>{business?.name??'Cargando'}</strong>. Registrar una compra no aumenta inventario. Solo una recepción confirmada agrega stock.</p>
   <div className="real-ops-toolbar"><strong>{purchases.length} compras cargadas{hasMore?' (no es todo el historial)':''}</strong>
     <button type="button" className="real-auth-secondary" disabled={busy||loading} onClick={()=>void refresh()}>Actualizar datos</button>
   </div>
   {loading&&<p role="status">Consultando proveedores, catálogo, compras y ubicaciones…</p>}
   {!loading&&purchases.length===0&&<div className="real-business-empty">Todavía no hay compras reales en esta empresa.</div>}
   <div className="real-supply-list">
     {purchases.map(p=><article key={p.id} className="real-supply-card">
       <div className="real-catalog-tile-header"><strong>{p.reference||'Compra '+p.id.slice(0,8)}</strong><span className="real-catalog-status real-catalog-active">{p.status.replaceAll('_',' ')}</span></div>
       <small>{p.purchased_on} · Proveedor: {p.supplier_name_snapshot||'Sin proveedor'} · {p.lines.length} renglones</small>
       <strong className="real-supply-total">{money(p.total_cents)}</strong>
       <ul>{p.lines.map(l=><li key={l.id}>{l.description_snapshot} — {milliToDecimal(l.quantity_milli)} {l.unit_snapshot} × {money(l.unit_cost_cents)} = {money(l.line_total_cents)}</li>)}</ul>
       {p.status==='REGISTRADA'&&canReceive&&<button className="real-auth-secondary" type="button" disabled={busy||loading} onClick={()=>void beginReceipt(p.id)}>Confirmar recepción en ubicación</button>}
       {p.status==='RECIBIDA'&&<button className="real-auth-secondary" type="button" disabled={busy||loading} onClick={()=>void checkReceipt(p.id)}>Consultar comprobante</button>}
     </article>)}
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
       <button className="real-auth-primary" type="button" disabled={busy||!locationId} onClick={()=>void sendReceipt()}>{busy?'Procesando…':pendingReceipt?'Reintentar MISMA recepción':'Confirmar recepción REAL'}</button>
       <button className="real-auth-secondary" type="button" disabled={busy} onClick={()=>void checkReceipt()}>Consultar comprobante</button>
       <button className="real-auth-secondary" type="button" disabled={busy} onClick={()=>setReceiptFor(null)}>Cerrar</button>
     </div>
   </section>}
   {canWrite&&!form&&<div className="real-auth-actions"><button type="button" className="real-auth-primary" disabled={busy||loading||!journalReady} onClick={()=>setForm(true)}>Registrar compra REAL</button></div>}
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
       <button type="button" className="real-auth-secondary" disabled={busy} onClick={()=>setForm(false)}>Cerrar formulario</button>
     </div>
   </form>}
   {catalogMore&&<button type="button" className="real-auth-secondary" disabled={busy||loading} onClick={()=>void more('catalog')}>Cargar 100 artículos más para compras</button>}
   {suppliersMore&&<button type="button" className="real-auth-secondary" disabled={busy||loading} onClick={()=>void more('suppliers')}>Cargar 100 proveedores más</button>}
   {notice&&<p className="real-auth-message" role="status">{notice}</p>}
   {error&&<p className="real-auth-message real-auth-error" role="alert">{error}</p>}
 </section>
}
