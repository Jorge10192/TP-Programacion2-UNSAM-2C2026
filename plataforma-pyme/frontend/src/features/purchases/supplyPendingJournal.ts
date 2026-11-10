import { UUID_PATTERN, UUID_V4_PATTERN } from '../businesses/businessGateway.ts'
import { validatePurchase } from './realSupplyGateway.ts'
import type { NewPurchase } from './realSupplyGateway.ts'

export type SupplyPending =
  | {scope:string; actorId:string; businessId:string;kind:'purchase.create'; key:string;body:NewPurchase;createdAt:string}
  | {scope:string; actorId:string; businessId:string;kind:'purchase.receive';purchaseId:string;key:string;body:{location_id:string};createdAt:string}
export type PendingPort = {
  read(scope:string):Promise<unknown>
  reserve(row:SupplyPending):Promise<void>
  remove(scope:string,key:string):Promise<void>
}
export class PendingStorageError extends Error {
  constructor(){super('IndexedDB no disponible: no se envió ninguna escritura')}
}
export class PendingConflictError extends Error {
  constructor(){super('Ya existe un intento pendiente incompatible; no se envió ningún POST')}
}
const uuid=(x:string)=>UUID_PATTERN.test(x)
export function pendingScope(actorId:string,businessId:string,kind:'purchase.create'|'purchase.receive',purchaseId?:string):string {
  if(!uuid(actorId)||!uuid(businessId)||(kind==='purchase.receive'&&!purchaseId)
     ||(purchaseId!==undefined&&!uuid(purchaseId)))throw new TypeError('Identificadores inválidos')
  return [actorId,businessId,kind,purchaseId??'new'].join(':')
}
export function parsePending(row:unknown,scope:string):SupplyPending{
  if(typeof row!=='object'||row===null||Array.isArray(row))throw new PendingConflictError()
  const x=row as Record<string,unknown>
  if(x.scope!==scope||typeof x.actorId!=='string'||typeof x.businessId!=='string'
    ||!uuid(x.actorId)||!uuid(x.businessId)||!['purchase.create','purchase.receive'].includes(String(x.kind))
    ||!UUID_V4_PATTERN.test(String(x.key))||typeof x.createdAt!=='string'
    ||!Number.isFinite(Date.parse(x.createdAt)))throw new PendingConflictError()
  if(x.kind==='purchase.create'){
    if(Object.keys(x).length!==7||scope!==pendingScope(x.actorId,x.businessId,'purchase.create')
       ||typeof x.body!=='object'||!x.body||Array.isArray(x.body))throw new PendingConflictError()
    try{validatePurchase(x.body as NewPurchase)}catch{throw new PendingConflictError()}
    return structuredClone(x) as SupplyPending
  }
  if(typeof x.purchaseId!=='string'||!uuid(x.purchaseId)||Object.keys(x).length!==8
    ||scope!==pendingScope(x.actorId,x.businessId,'purchase.receive',x.purchaseId)
    ||typeof x.body!=='object'||!x.body||Array.isArray(x.body)
    ||Object.keys(x.body).length!==1||!uuid(String((x.body as Record<string,unknown>).location_id)))
    throw new PendingConflictError()
  return structuredClone(x) as SupplyPending
}
export function createPendingJournal(port:PendingPort){
  return {
    async load(scope:string):Promise<SupplyPending|null>{
      const found=await port.read(scope)
      return found==null?null:parsePending(found,scope)
    },
    async reserve(row:SupplyPending):Promise<void>{
      if(!UUID_V4_PATTERN.test(row.key))throw new TypeError('Clave UUID4 requerida')
      parsePending(row,row.scope)
      await port.reserve(row)
      const read=await port.read(row.scope)
      if(JSON.stringify(parsePending(read,row.scope))!==JSON.stringify(row))throw new PendingConflictError()
    },
    async discard(scope:string,key:string):Promise<void>{
      if(!UUID_V4_PATTERN.test(key))throw new TypeError('Clave inválida')
      await port.remove(scope,key)
    },
  }
}
const DATABASE='asistente-pyme-real-purchases-v1', STORE='pending',MAX_ROWS=60
function open():Promise<IDBDatabase>{
  if(typeof indexedDB==='undefined')return Promise.reject(new PendingStorageError())
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DATABASE,1)
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'scope'})}
    req.onsuccess=()=>resolve(req.result)
    req.onerror=()=>reject(new PendingStorageError())
    req.onblocked=()=>reject(new PendingStorageError())
  })
}
async function read(scope:string):Promise<unknown>{
  const db=await open()
  return new Promise((resolve,reject)=>{
    let result:unknown
    const tx=db.transaction(STORE,'readonly')
    const req=tx.objectStore(STORE).get(scope)
    req.onsuccess=()=>{result=req.result}
    tx.oncomplete=()=>{db.close();resolve(result)}
    tx.onerror=()=>{db.close();reject(new PendingStorageError())}
    tx.onabort=()=>{db.close();reject(new PendingStorageError())}
  })
}
async function reserve(row:SupplyPending):Promise<void>{
  const db=await open()
  return new Promise((resolve,reject)=>{
    let reason:Error=new PendingConflictError()
    const tx=db.transaction(STORE,'readwrite')
    const store=tx.objectStore(STORE)
    const req=store.get(row.scope)
    req.onsuccess=()=>{
      if(req.result!==undefined){
        try{if(JSON.stringify(parsePending(req.result,row.scope))!==JSON.stringify(row))tx.abort()}
        catch{tx.abort()}
        return
      }
      const count=store.count()
      count.onsuccess=()=>{
        if(count.result>=MAX_ROWS){reason=new PendingStorageError();tx.abort();return}
        store.add(row)
      }
    }
    req.onerror=()=>{reason=new PendingStorageError();tx.abort()}
    tx.oncomplete=()=>{db.close();resolve()}
    tx.onerror=()=>{db.close();reject(reason)}
    tx.onabort=()=>{db.close();reject(reason)}
  })
}
async function remove(scope:string,key:string):Promise<void>{
  const db=await open()
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite')
    const store=tx.objectStore(STORE)
    const req=store.get(scope)
    req.onsuccess=()=>{
      if(req.result===undefined)return
      try{if(parsePending(req.result,scope).key!==key){tx.abort();return}}
      catch{tx.abort();return}
      store.delete(scope)
    }
    tx.oncomplete=()=>{db.close();resolve()}
    tx.onerror=()=>{db.close();reject(new PendingConflictError())}
    tx.onabort=()=>{db.close();reject(new PendingConflictError())}
  })
}
export const supplyJournal=createPendingJournal({read,reserve,remove})
export function pendingOld(row:SupplyPending){return Date.now()-Date.parse(row.createdAt)>30*86400_000}
