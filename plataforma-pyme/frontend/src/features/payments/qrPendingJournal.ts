/** B3: diario duradero de intención QR (sin credenciales ni tokens). */
import { UUID_PATTERN, UUID_V4_PATTERN } from '../businesses/businessGateway.ts'
import { makeQrIntentCommand } from './qrIntentGateway.ts'
import type { QrIntent, QrIntentCommand } from './qrIntentGateway.ts'

export type QrPending = {
  scope: string
  actorId: string
  businessId: string
  kind: 'qr.create'
  key: string
  body: QrIntentCommand
  createdAt: string
}
export type QrPendingPort = {
  read(scope: string): Promise<unknown>
  reserve(entry: QrPending): Promise<void>
  remove(scope: string, key: string): Promise<void>
}
export class QrPendingConflict extends Error {
  constructor(){super('Existe un QR pendiente diferente: no se generó otro intento.')}
}
export class QrPendingUnavailable extends Error {
  constructor(){super('IndexedDB no está disponible: no se generó otro intento QR.')}
}
const same=(a: unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b)
const keys=(row:Record<string,unknown>,fields:string[])=>
  Object.keys(row).sort().join('|')===fields.slice().sort().join('|')
export function qrPendingScope(actorId:string,businessId:string):string{
  if(!UUID_PATTERN.test(actorId)||!UUID_PATTERN.test(businessId))throw new TypeError('Actor o negocio inválidos')
  return actorId+':'+businessId+':qr.create'
}
export function newQrPending(actorId:string,businessId:string,body:QrIntentCommand,key=crypto.randomUUID()):QrPending{
  if(!UUID_V4_PATTERN.test(key))throw new TypeError('Clave de intento inválida')
  const validated=makeQrIntentCommand(body.location_id,body.lines,body.discount_cents,body.notes)
  return {scope:qrPendingScope(actorId,businessId),actorId,businessId,kind:'qr.create',
    key,body:validated,createdAt:new Date().toISOString()}
}
export function parseQrPending(value:unknown,scope:string):QrPending{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new QrPendingConflict()
  const row=value as Record<string,unknown>
  if(!keys(row,['scope','actorId','businessId','kind','key','body','createdAt'])||
      row.kind!=='qr.create'||typeof row.actorId!=='string'||typeof row.businessId!=='string'||
      typeof row.scope!=='string'||row.scope!==scope||
      row.scope!==qrPendingScope(row.actorId,row.businessId)||
      typeof row.key!=='string'||!UUID_V4_PATTERN.test(row.key)||
      typeof row.createdAt!=='string'||!Number.isFinite(Date.parse(row.createdAt))||
      !row.body||typeof row.body!=='object'||Array.isArray(row.body))
    throw new QrPendingConflict()
  try{
    const body=row.body as QrIntentCommand
    const normalized=makeQrIntentCommand(body.location_id,body.lines,body.discount_cents,body.notes)
    if(!keys(body as unknown as Record<string,unknown>,['location_id','lines','discount_cents','notes'])||
        !same(body,normalized))throw new QrPendingConflict()
    return structuredClone(row) as QrPending
  }catch{throw new QrPendingConflict()}
}
export function qrIntentMatchesPending(entry:QrPending,qr:QrIntent):boolean{
  const pending=parseQrPending(entry,entry.scope)
  if(qr.business_id!==pending.businessId||qr.request_id!==pending.key||
    qr.location_id!==pending.body.location_id||qr.notes!==pending.body.notes||
    qr.discount_cents!==pending.body.discount_cents||qr.lines.length!==pending.body.lines.length)return false
  let subtotal=0n
  for(let i=0;i<qr.lines.length;i++){
    const line=qr.lines[i], original=pending.body.lines[i]
    const amount=(BigInt(original.quantity_milli)*BigInt(original.unit_price_cents)+500n)/1000n
    if(line.line_number!==i+1||line.catalog_item_id!==original.catalog_item_id||
      line.quantity_milli!==original.quantity_milli||line.unit_price_cents!==original.unit_price_cents||
      BigInt(line.line_total_cents)!==amount)return false
    subtotal+=amount
  }
  return BigInt(qr.subtotal_cents)===subtotal &&
    BigInt(qr.total_cents)===subtotal-BigInt(pending.body.discount_cents)
}
export function createQrPendingJournal(port:QrPendingPort){
  return {
    async load(scope:string):Promise<QrPending|null>{
      const value=await port.read(scope)
      return value==null?null:parseQrPending(value,scope)
    },
    async reserve(entry:QrPending):Promise<QrPending>{
      const checked=parseQrPending(entry,entry.scope)
      await port.reserve(checked)
      const saved=parseQrPending(await port.read(checked.scope),checked.scope)
      if(!same(saved,checked))throw new QrPendingConflict()
      return saved
    },
    async close(entry:QrPending,response:QrIntent):Promise<void>{
      const saved=parseQrPending(await port.read(entry.scope),entry.scope)
      if(saved.key!==entry.key||!qrIntentMatchesPending(saved,response))throw new QrPendingConflict()
      await port.remove(saved.scope,saved.key)
    },
  }
}
const DATABASE='asistente-pyme-real-qr-v1'
const STORE='pending'
function open():Promise<IDBDatabase>{
  if(typeof indexedDB==='undefined')return Promise.reject(new QrPendingUnavailable())
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DATABASE,1)
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))
      req.result.createObjectStore(STORE,{keyPath:'scope'})}
    req.onsuccess=()=>resolve(req.result)
    req.onerror=()=>reject(new QrPendingUnavailable())
    req.onblocked=()=>reject(new QrPendingUnavailable())
  })
}
async function read(scope:string):Promise<unknown>{
  const db=await open()
  return new Promise((resolve,reject)=>{
    let result:unknown
    const tx=db.transaction(STORE,'readonly')
    const request=tx.objectStore(STORE).get(scope)
    request.onsuccess=()=>{result=request.result}
    tx.oncomplete=()=>{db.close();resolve(result)}
    tx.onabort=()=>{db.close();reject(new QrPendingUnavailable())}
    tx.onerror=()=>{db.close();reject(new QrPendingUnavailable())}
  })
}
async function reserve(entry:QrPending):Promise<void>{
  const db=await open()
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite')
    const store=tx.objectStore(STORE)
    const req=store.get(entry.scope)
    req.onsuccess=()=>{
      if(req.result!==undefined){
        try{if(!same(parseQrPending(req.result,entry.scope),entry))tx.abort()}
        catch{tx.abort()}
      }else store.add(entry)
    }
    req.onerror=()=>tx.abort()
    tx.oncomplete=()=>{db.close();resolve()}
    tx.onabort=()=>{db.close();reject(new QrPendingConflict())}
    tx.onerror=()=>{db.close();reject(new QrPendingUnavailable())}
  })
}
async function remove(scope:string,key:string):Promise<void>{
  const db=await open()
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite')
    const store=tx.objectStore(STORE)
    const req=store.get(scope)
    req.onsuccess=()=>{
      try{
        if(req.result===undefined||parseQrPending(req.result,scope).key!==key)tx.abort()
        else store.delete(scope)
      }catch{tx.abort()}
    }
    req.onerror=()=>tx.abort()
    tx.oncomplete=()=>{db.close();resolve()}
    tx.onabort=()=>{db.close();reject(new QrPendingConflict())}
    tx.onerror=()=>{db.close();reject(new QrPendingUnavailable())}
  })
}
export const qrPendingJournal=createQrPendingJournal({read,reserve,remove})
