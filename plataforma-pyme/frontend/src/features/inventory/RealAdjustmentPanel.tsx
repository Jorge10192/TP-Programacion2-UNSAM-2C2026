import { useEffect, useMemo, useState } from 'react'
import { ApiHttpError } from '../../api/httpClient.ts'
import type { RealBusiness } from '../businesses/businessGateway.ts'
import type { LocationRecord } from '../businesses/realOperationsGateway.ts'
import type { CatalogItem } from '../catalog/realCatalogGateway.ts'
import { createInventoryGateway, formatDelta, formatMilli, inventoryErrorMessage } from './realInventoryGateway.ts'
import type { StockBalance } from './realInventoryGateway.ts'
import {
  adjustmentErrorMessage, adjustmentFromCount,
  adjustmentMilli, countedMilli, createAdjustmentGateway,
  mayAdjustInventory, mayInitializeInventory, MAX_STOCK_BALANCE_MILLI, validateAdjustment,
} from './realAdjustmentGateway.ts'
import type { AdjustmentCommand, AdjustmentKind, AdjustmentReceipt } from './realAdjustmentGateway.ts'
import { transferReason } from './realTransferGateway.ts'
import {
  adjustmentJournal, adjustmentScope, newAdjustmentIntent,
} from './adjustmentPendingJournal.ts'
import type { PendingAdjustment } from './adjustmentPendingJournal.ts'

type Mode=AdjustmentKind|'CONTEO'
type Props={
 token:string;actorId:string;business:RealBusiness
 locations:LocationRecord[];catalog:CatalogItem[]
 onUnauthorized:()=>void;onClose:()=>void;onConfirmed:()=>void;onReview:()=>void
}
function date(value:string):string {
 return new Intl.DateTimeFormat('es-AR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))
}
export function RealAdjustmentPanel({
 token,actorId,business,locations,catalog,onUnauthorized,onClose,onConfirmed,onReview,
}:Props){
 const api=useMemo(()=>createAdjustmentGateway(token,business.id),[token,business.id])
 const inventoryApi=useMemo(()=>createInventoryGateway(token,business.id),[token,business.id])
 const scope=useMemo(()=>adjustmentScope(actorId,business.id),[actorId,business.id])
 const canAdjust=mayAdjustInventory(business.membership.role,business.membership.status,business.status)
 const canInitial=mayInitializeInventory(business.membership.role,business.membership.status,business.status)
 const sites=locations.filter(x=>x.status==='ACTIVA'&&x.can_store)
 const items=catalog.filter(x=>x.item_type==='BIEN'&&x.status==='ACTIVO')
 const [itemId,setItemId]=useState('')
 const [locationId,setLocationId]=useState('')
 const [mode,setMode]=useState<Mode>('CONTEO')
 const [quantity,setQuantity]=useState('')
 const [reason,setReason]=useState('')
 const [consent,setConsent]=useState(false)
 const [balance,setBalance]=useState<StockBalance|null|undefined>(undefined)
 const [balanceLoading,setBalanceLoading]=useState(false)
 const [balanceError,setBalanceError]=useState('')
 const [balanceRefresh,setBalanceRefresh]=useState(0)
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [pending,setPending]=useState<PendingAdjustment|null>(null)
 const [confirmed,setConfirmed]=useState<AdjustmentReceipt|null>(null)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [checkedToDiscard,setCheckedToDiscard]=useState(false)
 const selectedItem=items.find(x=>x.id===itemId)
 const selectedLocation=sites.find(x=>x.id===locationId)
 const pendingItem=pending&&catalog.find(x=>x.id===pending.body.catalog_item_id)
 const pendingSite=pending&&locations.find(x=>x.id===pending.body.location_id)
 const currentMilli=balance?.quantity_milli??0
 const version=balance?.version??0
 const isInitial=mode==='STOCK_INICIAL'
 const isCount=mode==='CONTEO'
 const hasExisting=balance!==null&&balance!==undefined
 const roleAllowed=canAdjust&&(!isInitial||canInitial)
 let preview:{kind:AdjustmentKind;quantity_milli:number;next:number}|null=null
 let draftError=''
 if(quantity.trim()&&selectedItem&&balance!==undefined){
  try{
   const amount=isCount?countedMilli(quantity,selectedItem.unit):adjustmentMilli(quantity,selectedItem.unit)
   if(isCount){
    if(!balance)throw new RangeError('El conteo correctivo requiere un saldo existente. Para una ubicación sin historial usá Stock inicial.')
    const delta=adjustmentFromCount(amount,currentMilli,version)
    if(delta)preview={...delta,next:amount}
   }else{
    const kind=mode
    if(isInitial&&hasExisting)throw new RangeError('Esta combinación ya tiene stock histórico. No se puede inicializar de nuevo.')
    if(!isInitial&&!hasExisting)throw new RangeError('Para ajustar se requiere un saldo existente y su versión.')
    if(kind==='AJUSTE_SALIDA'&&amount>currentMilli)throw new RangeError('No podés descontar más de las existencias consultadas.')
    if(kind!=='AJUSTE_SALIDA'&&currentMilli+amount>MAX_STOCK_BALANCE_MILLI)
      throw new RangeError('La cantidad final supera el límite del backend.')
    preview={kind,quantity_milli:amount,next:isInitial?amount:currentMilli+(kind==='AJUSTE_SALIDA'?-amount:amount)}
   }
  }catch(e){draftError=e instanceof Error?e.message:'Cantidad inválida'}
 }
 useEffect(()=>{
  let alive=true
  void adjustmentJournal.load(scope).then(found=>{
    if(!alive)return
    setPending(found)
    if(found)setNotice('Recuperamos un ajuste pendiente del navegador. No se envió ninguna operación automáticamente.')
  }).catch((err:unknown)=>{if(alive)setError(adjustmentErrorMessage(err))})
    .finally(()=>{if(alive)setLoading(false)})
  return ()=>{alive=false}
 },[scope])
 useEffect(()=>{
  if(!itemId||!locationId||!selectedItem||!selectedLocation)return
  const abort=new AbortController()
  void inventoryApi.balances(0,2,{catalogItemId:itemId,locationId},abort.signal)
   .then(rows=>{
      if(abort.signal.aborted)return
      if(rows.length>1)throw new Error('La API devolvió más de un saldo para el mismo artículo/sede.')
      setBalance(rows[0]??null);setBalanceError('')
   }).catch((err:unknown)=>{
      if(abort.signal.aborted)return
      if(err instanceof ApiHttpError&&err.status===401){onUnauthorized();return}
      setBalance(undefined);setBalanceError(inventoryErrorMessage(err))
   }).finally(()=>{if(!abort.signal.aborted)setBalanceLoading(false)})
  return ()=>{abort.abort()}
 },[inventoryApi,itemId,locationId,selectedItem,selectedLocation,balanceRefresh,onUnauthorized])
 function changeItem(value:string){setItemId(value);setBalance(undefined);setBalanceLoading(!!value&&!!locationId);setBalanceError('');setQuantity('');setError('')}
 function changeSite(value:string){setLocationId(value);setBalance(undefined);setBalanceLoading(!!value&&!!itemId);setBalanceError('');setQuantity('');setError('')}
 function refreshBalance(){
   if(!itemId||!locationId)return
   setBalance(undefined);setBalanceLoading(true);setBalanceError('')
   setBalanceRefresh(x=>x+1)
 }
 function command():AdjustmentCommand{
  if(!selectedItem||!selectedLocation||balance===undefined||!preview)
    throw new RangeError('Revisá artículo, sede, saldo y cantidad antes de confirmar.')
  if(!roleAllowed)throw new RangeError('Tu rol no permite esta operación.')
  const cmd={
   ...preview, // Remove local projection below: backend accepts only the exact command contract.
   catalog_item_id:selectedItem.id,location_id:selectedLocation.id,
   expected_version:version,reason:transferReason(reason),
  }
  const {next: _next,...payload}=cmd
  void _next
  return validateAdjustment(payload)
 }
 async function send(row:PendingAdjustment){
  setBusy(true);setError('');setNotice('')
  try{
   const result=await api.create(row.body,row.key)
   setConfirmed(result)
   try {
    const got=await api.get(result.id)
    setConfirmed(got)
    setNotice('Operación confirmada y verificada mediante GET por su identificador. Inventario actualizado desde FastAPI.')
   }catch{
    setNotice('Operación confirmada por POST. La consulta de comprobación falló; NO la vuelvas a ejecutar.')
   }
   onConfirmed()
   try{
    await adjustmentJournal.discard(row.scope,row.key)
    setPending(null)
   }catch{
    setNotice('Operación confirmada, pero la identidad persistida no pudo limpiarse. Conservá el ID; no repitas el POST.')
   }
  }catch(err){
   setPending(row)
   if(err instanceof ApiHttpError&&err.status===401){onUnauthorized();return}
   setError(adjustmentErrorMessage(err))
  }finally{setBusy(false)}
 }
 async function submit(){
  if(busy||loading||pending||confirmed||balanceLoading||!consent||!roleAllowed)return
  try{
   const cmd=command()
   const action=cmd.kind==='STOCK_INICIAL'?'registrar STOCK INICIAL':
     cmd.kind==='AJUSTE_ENTRADA'?'AGREGAR':'QUITAR'
   const signed=cmd.kind==='AJUSTE_SALIDA'?'−':'+'
   const statement=[
    'Confirmar operación REAL: '+action+' '+formatMilli(cmd.quantity_milli)+' '+(selectedItem?.unit??'')+' ('+signed+')',
    'Artículo: '+(selectedItem?.name??cmd.catalog_item_id),
    'Ubicación: '+(selectedLocation?.name??cmd.location_id),
    'Saldo leído: '+(balance?formatMilli(balance.quantity_milli):'SIN SALDO REGISTRADO')+' · expected_version='+cmd.expected_version,
    'Saldo esperado si nadie opera antes: '+formatMilli(preview?.next??0),
    'Motivo: '+cmd.reason,
    'Se generará un movimiento histórico; no se modifican precios ni compras.',
   ].join('\n')
   if(!window.confirm(statement))return
   setBusy(true)
   const row=await adjustmentJournal.reserve(newAdjustmentIntent(actorId,business.id,cmd))
   setPending(row)
   await send(row)
  }catch(e){setError(e instanceof Error?e.message:'No se pudo preparar el ajuste; no se envió POST.')}
  finally{setBusy(false)}
 }
 async function discard(){
  if(!pending||busy||!checkedToDiscard)return
  if(!window.confirm('¿Confirmás que revisaste saldos e historial antes de descartar esta clave? Una clave nueva podría duplicar un ajuste confirmado.'))return
  setBusy(true);setError('')
  try{
   await adjustmentJournal.discard(scope,pending.key)
   setPending(null);setCheckedToDiscard(false)
   setBalance(undefined);setBalanceLoading(!!itemId&&!!locationId)
   setBalanceRefresh(x=>x+1)
   setNotice('Intento descartado tras verificación. Se vuelve a consultar la versión del saldo; no se envió un nuevo ajuste.')
  }catch(e){setError(e instanceof Error?e.message:'No se pudo descartar.')}
  finally{setBusy(false)}
 }
 const canSubmit=canAdjust&&roleAllowed&&!!selectedItem&&!!selectedLocation
   &&balance!==undefined&&!balanceLoading&&!loading&&!busy&&!pending&&!confirmed
   &&!!preview&&!draftError&&!!reason.trim()&&consent
 const pendingLabel=pending?.body.kind==='STOCK_INICIAL'?'Stock inicial':
   pending?.body.kind==='AJUSTE_ENTRADA'?'Ajuste de entrada':'Ajuste de salida'
 return <section className="real-transfer-panel real-adjustment-panel" aria-label="Stock inicial y ajustes REALES">
  <div className="real-transfer-top">
   <div><h2>Stock inicial y ajustes</h2>
    <p>Las operaciones se registran en FastAPI y PostgreSQL, con trazabilidad y versión de saldo. No sustituyen compras ni movimientos anteriores.</p>
   </div>
   <button type="button" className="real-auth-secondary" disabled={busy} onClick={onClose}>Volver a inventario</button>
  </div>
  <p className="real-auth-note">Solo titular y administrador pueden registrar stock inicial. Los encargados asignados pueden ajustar existencias. Trabajadores: solo lectura. La API comprueba el rol y permiso STORE en la sede.</p>
  <p className="real-auth-note">Si aceptás, la identidad del intento y sus datos comerciales (sin token ni contraseña) se guardan <strong>sin cifrar</strong> en IndexedDB de este navegador hasta resolverlos. Evitá dispositivos compartidos.</p>
  {loading&&<p role="status">Verificando intentos pendientes…</p>}
  {error&&<p role="alert" className="real-auth-error">{error}</p>}
  {notice&&<p role="status" className="real-auth-success">{notice}</p>}
  {!canAdjust&&!loading&&<p role="status" className="real-auth-note">Tu rol solo permite consultar saldos e historial. No se habilitan ajustes ni inicialización.</p>}
  {!loading&&confirmed&&<div className="real-transfer-confirmed">
   <h3>Operación confirmada: {confirmed.kind.replaceAll('_',' ')}</h3>
   <p>{catalog.find(x=>x.id===confirmed.catalog_item_id)?.name??confirmed.catalog_item_id} · {locations.find(x=>x.id===confirmed.location_id)?.name??confirmed.location_id}</p>
   <p>Motivo: {confirmed.reason}</p>
   <div className="real-transfer-movements">{confirmed.movements.map(m=><div key={m.id}>
    <span>{m.event_type.replaceAll('_',' ')}</span>
    <strong className={m.delta_milli<0?'real-inventory-negative':'real-inventory-positive'}>{formatDelta(m.delta_milli)} {confirmed.unit_snapshot}</strong>
   </div>)}</div>
   <p>Responsable: <code>{confirmed.actor_id}</code> · {date(confirmed.created_at)}</p>
   <details><summary>Identificadores de auditoría</summary><p>Operación: <code>{confirmed.id}</code></p>
    <p>Movimiento: <code>{confirmed.movements[0].id}</code></p></details>
   <button type="button" className="real-auth-primary" onClick={onReview}>Revisar saldos e historial desde API</button>
  </div>}
  {!loading&&!confirmed&&pending&&<div className="real-transfer-pending">
   <h3>Operación pendiente guardada: {pendingLabel}</h3>
   <p>{pendingItem?.name??pending.body.catalog_item_id} · {pendingSite?.name??pending.body.location_id}</p>
   <p>Variación: {pending.body.kind==='AJUSTE_SALIDA'?'−':'+'}{formatMilli(pending.body.quantity_milli)}
    {' '}· Versión original: <strong>{pending.body.expected_version}</strong></p>
   <p>Motivo: {pending.body.reason} · Fecha del intento: {date(pending.createdAt)}</p>
   <p className="real-auth-note">Primero consultá saldos e historial. Si recibiste 409 por versión obsoleta, revisá el estado nuevo; la MISMA clave siempre conserva la versión anterior. No se recalcula ni se reenvía automáticamente.</p>
   <div className="real-transfer-actions">
    <button type="button" className="real-auth-secondary" disabled={busy} onClick={onReview}>Consultar saldos e historial</button>
    <button type="button" className="real-auth-primary" disabled={busy} onClick={()=>{
      if(window.confirm('¿Reenviar exactamente la MISMA operación con la MISMA clave y expected_version? Verificá antes la existencia de un movimiento confirmado.'))void send(pending)
    }}>{busy?'Consultando…':'Reintentar MISMA operación'}</button>
   </div>
   <label className="real-transfer-accept"><input type="checkbox" checked={checkedToDiscard} disabled={busy}
     onChange={e=>setCheckedToDiscard(e.target.checked)}/>Verifiqué el historial y saldos y decido descartar este intento.</label>
   <button type="button" className="real-auth-secondary" disabled={!checkedToDiscard||busy} onClick={()=>void discard()}>Descartar tras verificar</button>
  </div>}
  {!loading&&!confirmed&&!pending&&canAdjust&&<div className="real-transfer-form">
   <div className="real-transfer-grid">
    <label>Artículo físico activo
     <select value={itemId} disabled={busy} onChange={e=>changeItem(e.target.value)}>
      <option value="">Elegir artículo</option>
      {items.map(x=><option key={x.id} value={x.id}>{x.name} · {x.unit}</option>)}
     </select>
    </label>
    <label>Ubicación con almacenamiento
     <select value={locationId} disabled={busy} onChange={e=>changeSite(e.target.value)}>
      <option value="">Elegir sede</option>
      {sites.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
     </select>
    </label>
    <label>Tipo de operación
     <select value={mode} disabled={busy} onChange={e=>{setMode(e.target.value as Mode);setQuantity('');setError('')}}>
      <option value="CONTEO">Conteo físico · indicar saldo final</option>
      <option value="AJUSTE_ENTRADA">Ajuste de entrada · sumar unidades</option>
      <option value="AJUSTE_SALIDA">Ajuste de salida · descontar unidades</option>
      {canInitial&&<option value="STOCK_INICIAL">Stock inicial · primera carga</option>}
     </select>
    </label>
    <label>{isCount?'Cantidad contada (saldo final)':isInitial?'Cantidad inicial':'Cantidad a '+(mode==='AJUSTE_SALIDA'?'quitar':'agregar')}
     <input inputMode="decimal" maxLength={18} value={quantity} disabled={busy} onChange={e=>setQuantity(e.target.value)}
       placeholder={isCount?'Ej.: 0 o 12,500':'Ej.: 1 o 0,500'}/>
    </label>
   </div>
   <div className="real-transfer-balance">
    <div><strong>Saldo actual desde API</strong><p>La versión se comprueba otra vez en FastAPI al confirmar. No es una reserva.</p></div>
    <div>{balanceLoading?'Consultando…':balance===undefined?'Seleccioná artículo y sede':
      balance===null?<strong>Sin saldo registrado · versión 0</strong>:
      <strong>{formatMilli(balance.quantity_milli)} {selectedItem?.unit} · versión {balance.version}</strong>}</div>
    <button type="button" className="real-auth-secondary" disabled={!itemId||!locationId||busy} onClick={refreshBalance}>Actualizar saldo</button>
   </div>
   {balanceError&&<p role="alert" className="real-auth-error">{balanceError}</p>}
   {isInitial&&<p className="real-auth-note">Stock inicial solo cuando NO existe saldo ni movimientos anteriores de este artículo en esta sede. Un listado vacío no garantiza que no haya historial: el backend comprobará ambas condiciones. No se puede usar sobre un saldo existente, ni aunque sea cero.</p>}
   {isCount&&<p className="real-auth-note">El conteo físico es el saldo final observado. La aplicación convierte la diferencia respecto del saldo consultado en una entrada o salida; no reemplaza movimientos históricos ni modifica el catálogo. Si coincide, no se envía operación.</p>}
   {draftError&&<p className="real-auth-error" role="alert">{draftError}</p>}
   {preview&&selectedItem&&<div className="real-adjustment-preview">
     <div><span>Saldo observado</span><strong>{balance?formatMilli(balance.quantity_milli):'Sin saldo'}</strong></div>
     <div><span>Movimiento a registrar</span>
       <strong className={preview.kind==='AJUSTE_SALIDA'?'real-inventory-negative':'real-inventory-positive'}>
        {preview.kind==='AJUSTE_SALIDA'?'−':'+'}{formatMilli(preview.quantity_milli)} {selectedItem.unit}</strong>
     </div>
     <div><span>Saldo esperado</span><strong>{formatMilli(preview.next)} {selectedItem.unit}</strong></div>
   </div>}
   {isCount&&quantity.trim()&&!draftError&&!preview&&balance!==undefined&&<p className="real-auth-note">El conteo coincide con el saldo actual: no hace falta registrar un movimiento.</p>}
   <label className="real-transfer-reason">Motivo obligatorio (3 a 500 caracteres)
    <textarea rows={3} maxLength={500} disabled={busy} value={reason} onChange={e=>setReason(e.target.value)}
      placeholder="Ej.: Conteo físico y corrección de faltante / inventario inicial en depósito"/>
   </label>
   <label className="real-transfer-accept"><input type="checkbox" disabled={busy} checked={consent}
    onChange={e=>setConsent(e.target.checked)}/>Acepto conservar este intento sin cifrar en este navegador hasta resolverlo.</label>
   <button type="button" className="real-auth-primary" disabled={!canSubmit} onClick={()=>void submit()}>
    {busy?'Confirmando…':'Confirmar operación REAL'}
   </button>
  </div>}
 </section>
}
