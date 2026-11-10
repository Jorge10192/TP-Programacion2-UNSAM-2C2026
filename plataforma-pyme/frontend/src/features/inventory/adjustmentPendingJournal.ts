import { UUID_PATTERN, UUID_V4_PATTERN } from '../businesses/businessGateway.ts'
import { validateAdjustment } from './realAdjustmentGateway.ts'
import type { AdjustmentCommand } from './realAdjustmentGateway.ts'

export type PendingAdjustment={
 scope:string;actorId:string;businessId:string;kind:'inventory.adjustment'
 key:string;body:AdjustmentCommand;createdAt:string
}
export type AdjustmentJournalPort={
 read(scope:string):Promise<unknown>
 reserve(row:PendingAdjustment):Promise<void>
 remove(scope:string,key:string):Promise<void>
}
export class AdjustmentJournalUnavailable extends Error{
 constructor(){super('IndexedDB no está disponible: no se enviará un ajuste sin clave recuperable.')}
}
export class AdjustmentJournalConflict extends Error{
 constructor(){super('Existe una operación pendiente diferente para este actor y empresa; no se sobrescribe.')}
}
export function adjustmentScope(actorId:string,businessId:string):string{
 if(!UUID_PATTERN.test(actorId)||!UUID_PATTERN.test(businessId))
   throw new TypeError('Actor o empresa inválida')
 return [actorId,businessId,'inventory.adjustment'].join(':')
}
export function parsePendingAdjustment(raw:unknown,scope:string):PendingAdjustment{
 if(typeof raw!=='object'||raw===null||Array.isArray(raw))throw new AdjustmentJournalConflict()
 const row=raw as Record<string,unknown>
 if(Object.keys(row).sort().join('|')!==[
   'scope','actorId','businessId','kind','key','body','createdAt',
 ].sort().join('|')
   ||row.scope!==scope||row.kind!=='inventory.adjustment'
   ||typeof row.actorId!=='string'||typeof row.businessId!=='string'
   ||scope!==adjustmentScope(row.actorId,row.businessId)
   ||typeof row.key!=='string'||!UUID_V4_PATTERN.test(row.key)
   ||typeof row.createdAt!=='string'||!Number.isFinite(Date.parse(row.createdAt)))
   throw new AdjustmentJournalConflict()
 try{validateAdjustment(row.body as AdjustmentCommand)}
 catch{throw new AdjustmentJournalConflict()}
 return structuredClone(row) as PendingAdjustment
}
export function newAdjustmentIntent(actorId:string,businessId:string,body:AdjustmentCommand):PendingAdjustment{
 validateAdjustment(body)
 return {
   scope:adjustmentScope(actorId,businessId),actorId,businessId,kind:'inventory.adjustment',
   key:crypto.randomUUID(),createdAt:new Date().toISOString(),body:structuredClone(body),
 }
}
export function createAdjustmentJournal(port:AdjustmentJournalPort){
 return {
   async load(scope:string):Promise<PendingAdjustment|null>{
     const saved=await port.read(scope)
     return saved==null?null:parsePendingAdjustment(saved,scope)
   },
   async reserve(row:PendingAdjustment):Promise<PendingAdjustment>{
     parsePendingAdjustment(row,row.scope)
     await port.reserve(row)
     const result=parsePendingAdjustment(await port.read(row.scope),row.scope)
     if(JSON.stringify(result)!==JSON.stringify(row))throw new AdjustmentJournalConflict()
     return result
   },
   async discard(scope:string,key:string):Promise<void>{
     if(!UUID_V4_PATTERN.test(key))throw new TypeError('Clave inválida')
     await port.remove(scope,key)
   },
 }
}
const DB='asistente-pyme-inventory-adjustment-v1'
const STORE='intents',MAX=40
function open():Promise<IDBDatabase>{
 if(typeof indexedDB==='undefined')return Promise.reject(new AdjustmentJournalUnavailable())
 return new Promise((resolve,reject)=>{
   const request=indexedDB.open(DB,1)
   request.onupgradeneeded=()=>{
     if(!request.result.objectStoreNames.contains(STORE))
       request.result.createObjectStore(STORE,{keyPath:'scope'})
   }
   request.onsuccess=()=>resolve(request.result)
   request.onerror=()=>reject(new AdjustmentJournalUnavailable())
   request.onblocked=()=>reject(new AdjustmentJournalUnavailable())
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
   tx.onerror=()=>{db.close();reject(new AdjustmentJournalUnavailable())}
   tx.onabort=()=>{db.close();reject(new AdjustmentJournalUnavailable())}
 })
}
async function reserve(row:PendingAdjustment):Promise<void>{
 const db=await open()
 return new Promise((resolve,reject)=>{
   let problem:Error=new AdjustmentJournalConflict()
   const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE)
   const req=store.get(row.scope)
   req.onsuccess=()=>{
     if(req.result!==undefined){
       try{if(JSON.stringify(parsePendingAdjustment(req.result,row.scope))!==JSON.stringify(row))tx.abort()}
       catch{tx.abort()}
       return
     }
     const count=store.count()
     count.onsuccess=()=>{
       if(count.result>=MAX){problem=new AdjustmentJournalUnavailable();tx.abort();return}
       store.add(row)
     }
   }
   req.onerror=()=>{problem=new AdjustmentJournalUnavailable();tx.abort()}
   tx.oncomplete=()=>{db.close();resolve()}
   tx.onerror=()=>{db.close();reject(problem)}
   tx.onabort=()=>{db.close();reject(problem)}
 })
}
async function remove(scope:string,key:string):Promise<void>{
 const db=await open()
 return new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE)
   const req=store.get(scope)
   req.onsuccess=()=>{
     if(req.result===undefined)return
     try{
       if(parsePendingAdjustment(req.result,scope).key!==key){tx.abort();return}
       store.delete(scope)
     }catch{tx.abort()}
   }
   tx.oncomplete=()=>{db.close();resolve()}
   tx.onerror=()=>{db.close();reject(new AdjustmentJournalConflict())}
   tx.onabort=()=>{db.close();reject(new AdjustmentJournalConflict())}
 })
}
export const adjustmentJournal=createAdjustmentJournal({read,reserve,remove})
