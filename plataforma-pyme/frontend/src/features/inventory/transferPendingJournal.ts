import { UUID_PATTERN, UUID_V4_PATTERN } from '../businesses/businessGateway.ts'
import { validateTransfer } from './realTransferGateway.ts'
import type { TransferCommand } from './realTransferGateway.ts'

/** Durable intent identity; no Bearer token, password, email, customer data or credentials. */
export type PendingTransfer={
 scope:string;actorId:string;businessId:string;kind:'inventory.transfer'
 key:string;body:TransferCommand;createdAt:string
}
export type TransferPendingPort={
 read(scope:string):Promise<unknown>
 reserve(intent:PendingTransfer):Promise<void>
 remove(scope:string,key:string):Promise<void>
}
export class TransferPendingUnavailable extends Error{
 constructor(){super('IndexedDB no está disponible; no se enviará un traslado sin identidad recuperable.')}
}
export class TransferPendingConflict extends Error{
 constructor(){super('Existe un traslado pendiente diferente para esta cuenta y empresa; no se sobrescribe.')}
}
export function transferPendingScope(actorId:string,businessId:string):string {
 if(!UUID_PATTERN.test(actorId)||!UUID_PATTERN.test(businessId))throw new TypeError('Cuenta o empresa inválidas.')
 return [actorId,businessId,'inventory.transfer'].join(':')
}
export function parsePendingTransfer(value:unknown,scope:string):PendingTransfer{
 if(typeof value!=='object'||value===null||Array.isArray(value))throw new TransferPendingConflict()
 const v=value as Record<string,unknown>
 if(Object.keys(v).sort().join('|')!==
   ['scope','actorId','businessId','kind','key','body','createdAt'].sort().join('|')
   ||v.scope!==scope||v.kind!=='inventory.transfer'
   ||typeof v.actorId!=='string'||typeof v.businessId!=='string'
   ||scope!==transferPendingScope(v.actorId,v.businessId)
   ||typeof v.key!=='string'||!UUID_V4_PATTERN.test(v.key)
   ||typeof v.createdAt!=='string'||!Number.isFinite(Date.parse(v.createdAt)))
   throw new TransferPendingConflict()
 try{validateTransfer(v.body as TransferCommand)}catch{throw new TransferPendingConflict()}
 return structuredClone(v) as PendingTransfer
}
/** Call only within the human confirm handler, never during component render. */
export function newTransferIntent(actorId:string,businessId:string,body:TransferCommand):PendingTransfer{
 validateTransfer(body)
 return {
   scope:transferPendingScope(actorId,businessId),actorId,businessId,
   kind:'inventory.transfer',key:crypto.randomUUID(),body:structuredClone(body),
   createdAt:new Date().toISOString(),
 }
}
export function createTransferJournal(port:TransferPendingPort){
 return {
   async load(scope:string):Promise<PendingTransfer|null>{
     const value=await port.read(scope)
     return value===undefined||value===null?null:parsePendingTransfer(value,scope)
   },
   async reserve(row:PendingTransfer):Promise<PendingTransfer>{
     parsePendingTransfer(row,row.scope)
     await port.reserve(row)
     const restored=await port.read(row.scope)
     const checked=parsePendingTransfer(restored,row.scope)
     if(JSON.stringify(checked)!==JSON.stringify(row))throw new TransferPendingConflict()
     return checked
   },
   async discard(scope:string,key:string):Promise<void>{
     if(!UUID_V4_PATTERN.test(key))throw new TypeError('Clave inválida')
     await port.remove(scope,key)
   },
 }
}
const DB='asistente-pyme-inventory-transfer-v1',STORE='intents',MAX=40
function openDb():Promise<IDBDatabase>{
 if(typeof indexedDB==='undefined')return Promise.reject(new TransferPendingUnavailable())
 return new Promise((resolve,reject)=>{
   const req=indexedDB.open(DB,1)
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'scope'})}
   req.onsuccess=()=>resolve(req.result)
   req.onerror=()=>reject(new TransferPendingUnavailable())
   req.onblocked=()=>reject(new TransferPendingUnavailable())
 })
}
async function read(scope:string):Promise<unknown>{
 const db=await openDb()
 return new Promise((resolve,reject)=>{
   let result:unknown
   const tx=db.transaction(STORE,'readonly')
   const request=tx.objectStore(STORE).get(scope)
   request.onsuccess=()=>{result=request.result}
   tx.oncomplete=()=>{db.close();resolve(result)}
   tx.onerror=()=>{db.close();reject(new TransferPendingUnavailable())}
   tx.onabort=()=>{db.close();reject(new TransferPendingUnavailable())}
 })
}
async function reserve(row:PendingTransfer):Promise<void>{
 const db=await openDb()
 return new Promise((resolve,reject)=>{
   let failure:Error=new TransferPendingConflict()
   const tx=db.transaction(STORE,'readwrite')
   const store=tx.objectStore(STORE)
   const request=store.get(row.scope)
   request.onsuccess=()=>{
     if(request.result!==undefined){
       try{if(JSON.stringify(parsePendingTransfer(request.result,row.scope))!==JSON.stringify(row))tx.abort()}
       catch{tx.abort()}
       return
     }
     const count=store.count()
     count.onsuccess=()=>{
       if(count.result>=MAX){failure=new TransferPendingUnavailable();tx.abort();return}
       store.add(row)
     }
   }
   request.onerror=()=>{failure=new TransferPendingUnavailable();tx.abort()}
   tx.oncomplete=()=>{db.close();resolve()}
   tx.onerror=()=>{db.close();reject(failure)}
   tx.onabort=()=>{db.close();reject(failure)}
 })
}
async function remove(scope:string,key:string):Promise<void>{
 const db=await openDb()
 return new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite')
   const store=tx.objectStore(STORE)
   const request=store.get(scope)
   request.onsuccess=()=>{
     if(request.result===undefined)return
     try{
       if(parsePendingTransfer(request.result,scope).key!==key){tx.abort();return}
       store.delete(scope)
     }catch{tx.abort()}
   }
   tx.oncomplete=()=>{db.close();resolve()}
   tx.onerror=()=>{db.close();reject(new TransferPendingConflict())}
   tx.onabort=()=>{db.close();reject(new TransferPendingConflict())}
 })
}
export const transferJournal=createTransferJournal({read,reserve,remove})
