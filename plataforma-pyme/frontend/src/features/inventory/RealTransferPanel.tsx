import { useEffect, useMemo, useState } from 'react'
import { ApiHttpError } from '../../api/httpClient.ts'
import type { RealBusiness } from '../businesses/businessGateway.ts'
import type { LocationRecord } from '../businesses/realOperationsGateway.ts'
import type { CatalogItem } from '../catalog/realCatalogGateway.ts'
import { createInventoryGateway, formatDelta, formatMilli, inventoryErrorMessage } from './realInventoryGateway.ts'
import { createTransferGateway, transferErrorMessage, transferMilli, transferReason } from './realTransferGateway.ts'
import type { TransferCommand, TransferRecord } from './realTransferGateway.ts'
import {
  newTransferIntent, transferJournal, transferPendingScope,
} from './transferPendingJournal.ts'
import type { PendingTransfer } from './transferPendingJournal.ts'

type Props={
 token:string;actorId:string;business:RealBusiness
 locations:LocationRecord[];assignedLocationIds:string[];catalog:CatalogItem[]
 onUnauthorized:()=>void;onClose:()=>void;onConfirmed:()=>void;onReview:()=>void
}
function when(value:string):string{return new Intl.DateTimeFormat('es-AR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}
export function RealTransferPanel({token,actorId,business,locations,assignedLocationIds,catalog,onUnauthorized,onClose,onConfirmed,onReview}:Props){
 const gateway=useMemo(()=>createTransferGateway(token,business.id),[token,business.id])
 const balanceGateway=useMemo(()=>createInventoryGateway(token,business.id),[token,business.id])
 const scope=useMemo(()=>transferPendingScope(actorId,business.id),[actorId,business.id])
 const [article,setArticle]=useState('')
 const [source,setSource]=useState('')
 const [destination,setDestination]=useState('')
 const [quantity,setQuantity]=useState('1')
 const [reason,setReason]=useState('')
 const [consent,setConsent]=useState(false)
 const [pending,setPending]=useState<PendingTransfer|null>(null)
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [confirmed,setConfirmed]=useState<TransferRecord|null>(null)
 const [checkedBeforeDiscard,setCheckedBeforeDiscard]=useState(false)
 const [balance,setBalance]=useState<number|null>(null)
 const [balanceLoading,setBalanceLoading]=useState(false)
 const [balanceError,setBalanceError]=useState('')
 const [balanceRefresh,setBalanceRefresh]=useState(0)
 const isManager=['TITULAR_ADMINISTRATIVO','ADMINISTRADOR'].includes(business.membership.role)
 const eligibleSites=locations.filter(x=>x.status==='ACTIVA'&&x.can_store
  &&(isManager||assignedLocationIds.includes(x.id)))
 const eligibleItems=catalog.filter(x=>x.item_type==='BIEN'&&x.status==='ACTIVO')
 const selectedItem=eligibleItems.find(x=>x.id===article)
 const selectedSource=eligibleSites.find(x=>x.id===source)
 const selectedDestination=eligibleSites.find(x=>x.id===destination)
 const pendingItem=pending&&catalog.find(x=>x.id===pending.body.catalog_item_id)
 const pendingSource=pending&&locations.find(x=>x.id===pending.body.source_location_id)
 const pendingDest=pending&&locations.find(x=>x.id===pending.body.destination_location_id)

 useEffect(()=>{
  let active=true
  void transferJournal.load(scope).then(found=>{
   if(!active)return
   setPending(found)
   if(found)setNotice('Se recuperó un traslado pendiente de este usuario y empresa. No se envió ninguna operación automáticamente.')
  }).catch((err:unknown)=>{if(active)setError(transferErrorMessage(err))})
   .finally(()=>{if(active)setLoading(false)})
  return ()=>{active=false}
 },[scope])

 useEffect(()=>{
  if(!source||!article||!selectedSource||!selectedItem){
   return
  }
  const controller=new AbortController()
  void balanceGateway.balances(0,2,{locationId:source,catalogItemId:article},controller.signal)
   .then(rows=>{
     if(controller.signal.aborted)return
     if(rows.length>1)throw new Error('La API devolvió más de un saldo para artículo y sede.')
     setBalance(rows.length===0?0:rows[0].quantity_milli)
     setBalanceError('')
   }).catch((err:unknown)=>{
     if(controller.signal.aborted)return
     if(err instanceof ApiHttpError&&err.status===401){onUnauthorized();return}
     setBalance(null);setBalanceError(inventoryErrorMessage(err))
   }).finally(()=>{if(!controller.signal.aborted)setBalanceLoading(false)})
  return ()=>{controller.abort()}
 },[balanceGateway,source,article,selectedSource,selectedItem,onUnauthorized,balanceRefresh])

 function changeArticle(id:string){setArticle(id);setBalance(null);setBalanceLoading(!!id&&!!source);setBalanceError('');setNotice('')}
 function changeSource(id:string){setSource(id);setDestination('');setBalance(null);setBalanceLoading(!!id&&!!article);setBalanceError('');setNotice('')}
 function refreshBalance(){
  setBalance(null);setBalanceLoading(true);setBalanceError('')
  setBalanceRefresh(x=>x+1)
 }
 function command():TransferCommand{
  if(!selectedItem||!selectedSource||!selectedDestination)
   throw new RangeError('Elegí artículo físico y ambas ubicaciones con almacenamiento activo.')
  return {
   catalog_item_id:selectedItem.id,source_location_id:selectedSource.id,
   destination_location_id:selectedDestination.id,
   quantity_milli:transferMilli(quantity,selectedItem.unit),
   reason:transferReason(reason),
  }
 }
 async function sendIntent(row:PendingTransfer){
  setBusy(true);setError('');setNotice('')
  try {
   const result=await gateway.create(row.body,row.key)
   setConfirmed(result)
   // Safe GET detail: the server has returned an operation ID; no extra POST.
   try{
    const checked=await gateway.get(result.id)
    setConfirmed(checked)
    setNotice('Transferencia confirmada. Se verificó la operación por su ID. Saldos e historial se están consultando desde FastAPI.')
   }catch{
    setNotice('Transferencia confirmada por POST; el GET de detalle no pudo verificarse. No repitas la operación.')
   }
   onConfirmed()
   try{
    await transferJournal.discard(row.scope,row.key)
    setPending(null)
   }catch{
    setNotice('Transferencia confirmada, pero no se pudo limpiar el registro del navegador. No crees otra clave ni repitas la operación; verificá su ID.')
   }
  }catch(err){
   if(err instanceof ApiHttpError&&err.status===401){onUnauthorized();return}
   setError(transferErrorMessage(err))
   setPending(row) // Keep same key and body for explicit replay or later investigation.
  }finally{setBusy(false)}
 }
 async function create(){
  if(busy||loading||pending||confirmed||!consent||balance===null||balanceLoading)return
  try{
   const cmd=command()
   if(cmd.quantity_milli>balance){setError('El saldo consultado es insuficiente. Actualizá antes de continuar.');return}
   const label=selectedItem?.name??'Artículo'
   const sourceName=selectedSource?.name??'Origen'
   const destName=selectedDestination?.name??'Destino'
   if(!window.confirm(
     'Confirmar traslado REAL de '+formatMilli(cmd.quantity_milli)+' '+(selectedItem?.unit??'')+
     ' de '+label+' desde '+sourceName+' hacia '+destName+'?\n\nEl backend descontará stock en origen y lo sumará en destino en una única operación.'
   ))return
   setBusy(true) // Block a second click while IndexedDB reserves identity before POST.
   const row=newTransferIntent(actorId,business.id,cmd)
   const saved=await transferJournal.reserve(row)
   setPending(saved)
   await sendIntent(saved)
  }catch(err){
   setError(err instanceof Error?err.message:'No se pudo preparar la operación. No se envió POST.')
  }finally{setBusy(false)}
 }
 async function discard(){
  if(!pending||busy||!checkedBeforeDiscard)return
  if(!window.confirm('Confirmá que YA verificaste los saldos e historial y que querés descartar la identidad de este traslado. Si estaba confirmado, una nueva clave podría duplicar el traslado. ¿Descartar?'))return
  setBusy(true);setError('')
  try{
   await transferJournal.discard(scope,pending.key)
   setPending(null);setCheckedBeforeDiscard(false)
   setNotice('Intento descartado por decisión explícita. No se envió una transferencia.')
  }catch(err){setError(err instanceof Error?err.message:'No se pudo descartar.')}
  finally{setBusy(false)}
 }
 const active=business.status==='ACTIVA'&&business.membership.status==='ACTIVA'
 const canSubmit=active&&eligibleSites.length>=2&&eligibleItems.length>0&&!busy&&!loading&&!pending
  &&!confirmed&&consent&&!!selectedItem&&!!selectedSource&&!!selectedDestination
  &&source!==destination&&balance!==null&&!balanceLoading&&balance>0

 return <section className="real-transfer-panel" aria-label="Transferencia real entre sedes">
  <div className="real-transfer-top">
   <div>
    <h2>Trasladar stock entre ubicaciones</h2>
    <p>Una transferencia REAL genera una salida y una entrada atómicas en PostgreSQL. No crea compras, ventas ni movimientos de dinero.</p>
   </div>
   <button type="button" className="real-auth-secondary" onClick={onClose} disabled={busy}>Cerrar</button>
  </div>
  <p className="real-auth-note">El servidor exige permiso <strong>STORE en ambas ubicaciones</strong>. Si sos Encargado o Trabajador, necesitás asignación activa a origen y destino. La interfaz no sustituye esa autorización.</p>
  <p className="real-auth-note">La identidad de la solicitud (UUID4, artículo, sedes, cantidad, motivo y fecha) se conserva sin cifrar en IndexedDB hasta confirmar o resolverla. No se guardan tokens ni contraseñas. Evitá dispositivos compartidos.</p>
  {loading&&<p role="status">Revisando si existe una transferencia pendiente en este navegador…</p>}
  {error&&<p role="alert" className="real-auth-error">{error}</p>}
  {notice&&<p role="status" className="real-auth-success">{notice}</p>}

  {!loading&&confirmed&&<div className="real-transfer-confirmed">
   <h3>Traslado confirmado</h3>
   <p><strong>{formatMilli(confirmed.quantity_milli)} {confirmed.unit_snapshot}</strong> · {catalog.find(x=>x.id===confirmed.catalog_item_id)?.name??'Artículo '+confirmed.catalog_item_id}</p>
   <p>{locations.find(x=>x.id===confirmed.source_location_id)?.name??confirmed.source_location_id} → {locations.find(x=>x.id===confirmed.destination_location_id)?.name??confirmed.destination_location_id}</p>
   <p>Responsable ID: <code>{confirmed.actor_id}</code> · {when(confirmed.created_at)}</p>
   <div className="real-transfer-movements">{confirmed.movements.map(m=><div key={m.id}>
    <span>{m.event_type==='TRASLADO_SALIDA'?'Salida en origen':'Entrada en destino'}</span>
    <strong className={m.delta_milli<0?'real-inventory-negative':'real-inventory-positive'}>{formatDelta(m.delta_milli)} {confirmed.unit_snapshot}</strong>
   </div>)}</div>
   <details><summary>Ver identificadores del traslado</summary>
    <p>ID operación: <code>{confirmed.id}</code></p>
    {confirmed.movements.map(x=><p key={x.id}>{x.event_type}: <code>{x.id}</code></p>)}
   </details>
   <button type="button" className="real-auth-primary" onClick={onReview}>Revisar saldos e historial actualizados</button>
  </div>}

  {!loading&&!confirmed&&pending&&<div className="real-transfer-pending">
   <h3>Existe un intento de traslado guardado</h3>
   <p><strong>{pendingItem?.name??pending.body.catalog_item_id}</strong> · {formatMilli(pending.body.quantity_milli)} {pendingItem?.unit??'unidades según catálogo'}</p>
   <p>{pendingSource?.name??pending.body.source_location_id} → {pendingDest?.name??pending.body.destination_location_id}</p>
   <p>Motivo: {pending.body.reason}</p>
   <p>Creado: {when(pending.createdAt)}. Misma clave y mismo cuerpo guardados para recuperar después de F5.</p>
   <p className="real-auth-note">Primero consultá el historial y los saldos. Si no encontrás el traslado, podés repetir exclusivamente esta misma intención. Repetir con una clave nueva puede duplicar la operación.</p>
   <div className="real-transfer-actions">
    <button type="button" className="real-auth-secondary" disabled={busy} onClick={onReview}>Consultar saldos e historial</button>
    <button type="button" className="real-auth-primary" disabled={busy} onClick={()=>{
     if(window.confirm('¿Reenviar exactamente el MISMO traslado con la MISMA clave idempotente? Se verificó antes el estado del inventario.'))void sendIntent(pending)
    }}>{busy?'Procesando…':'Reintentar MISMO traslado'}</button>
   </div>
   <label className="real-transfer-accept"><input type="checkbox" checked={checkedBeforeDiscard}
    disabled={busy} onChange={e=>setCheckedBeforeDiscard(e.target.checked)}/>
    Ya verifiqué el historial y los saldos; asumo la decisión de descartar este intento.</label>
   <button type="button" className="real-auth-secondary" disabled={busy||!checkedBeforeDiscard}
    onClick={()=>void discard()}>Descartar tras verificar</button>
  </div>}

  {!loading&&!confirmed&&!pending&&<div className="real-transfer-form">
   {(!active||eligibleSites.length<2||eligibleItems.length===0)&&<p className="real-auth-note">Para trasladar necesitás una empresa activa, dos sedes activas con almacenamiento autorizadas para tu rol y al menos un artículo físico activo en el catálogo cargado.</p>}
   <div className="real-transfer-grid">
    <label>Artículo físico activo
     <select value={article} disabled={busy||!active} onChange={e=>changeArticle(e.target.value)}>
      <option value="">Seleccionar artículo</option>
      {eligibleItems.map(x=><option key={x.id} value={x.id}>{x.name} · {x.unit}</option>)}
     </select>
    </label>
    <label>Ubicación de origen
     <select value={source} disabled={busy||!active} onChange={e=>changeSource(e.target.value)}>
      <option value="">Seleccionar origen</option>
      {eligibleSites.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
     </select>
    </label>
    <label>Ubicación de destino
     <select value={destination} disabled={busy||!active} onChange={e=>{setDestination(e.target.value);setNotice('')}}>
      <option value="">Seleccionar destino</option>
      {eligibleSites.filter(x=>x.id!==source).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
     </select>
    </label>
    <label>Cantidad de traslado
     <input inputMode="decimal" value={quantity} maxLength={18} disabled={busy||!active}
      onChange={e=>setQuantity(e.target.value)} placeholder="1 (unidad) o 0,500 (fraccionable)"/>
    </label>
   </div>
   <div className="real-transfer-balance">
    <div><strong>Saldo consultado del origen</strong><p>Es una lectura de FastAPI, no una reserva de stock.</p></div>
    <div>{balanceLoading?'Consultando…':balance===null?'Seleccioná artículo y origen':<strong>{formatMilli(balance)} {selectedItem?.unit}</strong>}</div>
    <button type="button" className="real-auth-secondary" disabled={busy||!article||!source}
      onClick={refreshBalance}>Actualizar saldo</button>
   </div>
   {balanceError&&<p className="real-auth-error" role="alert">{balanceError}</p>}
   <label className="real-transfer-reason">Motivo del traslado
    <textarea value={reason} maxLength={500} rows={3} disabled={busy||!active}
     onChange={e=>setReason(e.target.value)} placeholder="Ej.: Reposición de mercadería en otra sede"/>
   </label>
   <label className="real-transfer-accept"><input type="checkbox" checked={consent} disabled={busy}
    onChange={e=>setConsent(e.target.checked)}/>
    Acepto conservar este intento en este navegador para recuperarlo ante cortes de conexión o F5.</label>
   <button type="button" className="real-auth-primary" disabled={!canSubmit}
     onClick={()=>void create()}>{busy?'Confirmando…':'Confirmar transferencia REAL'}</button>
  </div>}
 </section>
}
