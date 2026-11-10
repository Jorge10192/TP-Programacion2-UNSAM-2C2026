import { ApiHttpError, ApiTransportError, createApiClient } from '../../api/httpClient.ts'
import { UUID_PATTERN, UUID_V4_PATTERN } from '../businesses/businessGateway.ts'
import { MAX_CENTS, pesosToCents } from '../catalog/realCatalogGateway.ts'

export type Supplier = {
  id:string; business_id:string; name:string; offerings:string; contact_person:string
  phone:string; whatsapp:string; email:string; address:string; maps_url:string
  website:string; instagram:string; notes:string; payment_methods:string[]
  promotions:unknown[]; status:'ACTIVO'|'INACTIVO'; created_at:string; updated_at:string
}
export type PurchaseLineInput = {
  catalog_item_id:string|null; description:string; unit:string
  quantity_milli:number; unit_cost_cents:number
}
export type NewPurchase = {
  purchased_on:string; supplier_id:string|null; reference:string; notes:string
  lines:PurchaseLineInput[]
}
export type PurchaseLine = {
  id:string; line_number:number; catalog_item_id:string|null; description_snapshot:string
  kind_snapshot:'BIEN'|'SERVICIO'|'CONCEPTO'; unit_snapshot:string; sku_snapshot:string
  quantity_milli:number; unit_cost_cents:number; line_total_cents:number
}
export type Purchase = {
  id:string; business_id:string; request_id:string; supplier_id:string|null
  supplier_name_snapshot:string; purchased_on:string
  status:'REGISTRADA'|'RECIBIDA'|'CERRADA_SIN_RECEPCION'|'CANCELADA'
  total_cents:number; reference:string; notes:string; created_by_id:string
  created_at:string; lines:PurchaseLine[]
}
export type PurchaseReceipt = {
  id:string; business_id:string; purchase_id:string; location_id:string
  request_id:string; confirmed_by_id:string; confirmed_at:string
  purchase_status:'RECIBIDA'; movements:{id:string;catalog_item_id:string;delta_milli:number;location_id:string}[]
  balances_after:{catalog_item_id:string;quantity_milli:number;version:number}[]
}
const record=(v:unknown): v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v)
const money=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=MAX_CENTS
const qty=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0&&v<=999_999_999
const date=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)
function invalid():never {throw new ApiTransportError('invalid-response',false)}
function uuid(v:unknown):v is string{return typeof v==='string'&&UUID_PATTERN.test(v)}
export function parseSupplier(v:unknown,businessId:string):Supplier {
  if(!record(v)||!uuid(v.id)||v.business_id!==businessId||typeof v.name!=='string'
    ||v.name.trim().length<2||!['ACTIVO','INACTIVO'].includes(String(v.status))
    ||!['offerings','contact_person','phone','whatsapp','email','address','maps_url',
      'website','instagram','notes'].every(k=>typeof v[k]==='string')
    ||!Array.isArray(v.payment_methods)||!v.payment_methods.every(x=>typeof x==='string')
    ||!Array.isArray(v.promotions)||typeof v.created_at!=='string'||typeof v.updated_at!=='string')
    return invalid()
  return v as Supplier
}
export function parsePurchase(v:unknown,businessId:string):Purchase {
  if(!record(v)||!uuid(v.id)||v.business_id!==businessId||!uuid(v.request_id)
    ||!(v.supplier_id===null||uuid(v.supplier_id))
    ||typeof v.supplier_name_snapshot!=='string'||!date(v.purchased_on)
    ||!['REGISTRADA','RECIBIDA','CERRADA_SIN_RECEPCION','CANCELADA'].includes(String(v.status))
    ||!money(v.total_cents)||typeof v.reference!=='string'||typeof v.notes!=='string'
    ||!uuid(v.created_by_id)||typeof v.created_at!=='string'||!Array.isArray(v.lines))return invalid()
  for(const line of v.lines){
    if(!record(line)||!uuid(line.id)||!Number.isSafeInteger(line.line_number)
      ||!(line.catalog_item_id===null||uuid(line.catalog_item_id))
      ||typeof line.description_snapshot!=='string'
      ||!['BIEN','SERVICIO','CONCEPTO'].includes(String(line.kind_snapshot))
      ||typeof line.unit_snapshot!=='string'||typeof line.sku_snapshot!=='string'
      ||!qty(line.quantity_milli)||!money(line.unit_cost_cents)||!money(line.line_total_cents))return invalid()
  }
  return v as Purchase
}
export function parseReceipt(v:unknown,businessId:string,purchaseId:string):PurchaseReceipt {
  if(!record(v)||!uuid(v.id)||v.business_id!==businessId||v.purchase_id!==purchaseId
    ||!uuid(v.location_id)||!uuid(v.request_id)||!uuid(v.confirmed_by_id)
    ||typeof v.confirmed_at!=='string'||v.purchase_status!=='RECIBIDA'
    ||!Array.isArray(v.movements)||!Array.isArray(v.balances_after))return invalid()
  for(const m of v.movements)if(!record(m)||!uuid(m.id)||!uuid(m.catalog_item_id)
    ||m.location_id!==v.location_id||!qty(m.delta_milli))return invalid()
  for(const k of v.balances_after)if(!record(k)||!uuid(k.catalog_item_id)
    ||typeof k.quantity_milli!=='number'||!Number.isSafeInteger(k.quantity_milli)
    ||k.quantity_milli<0||typeof k.version!=='number'||!Number.isSafeInteger(k.version)||k.version<1)return invalid()
  return v as PurchaseReceipt
}
function page<T>(v:unknown,limit:number,parse:(x:unknown)=>T):T[]{
  if(!Array.isArray(v)||v.length>limit)return invalid()
  const items=v.map(parse)
  if(new Set(items.map(x=>(x as {id:string}).id)).size!==items.length)return invalid()
  return items
}
export function decimalToMilli(input:string):number{
  const raw=input.trim()
  if(!/^(?:0|[1-9]\d*)(?:[.,]\d{1,3})?$/.test(raw))throw new RangeError('Cantidad: hasta tres decimales, sin separadores de miles.')
  const [whole,fraction='']=raw.replace(',','.').split('.')
  const value=Number(whole)*1000+Number(fraction.padEnd(3,'0'))
  if(!qty(value))throw new RangeError('Cantidad fuera de rango (mínimo 0,001).')
  return value
}
export function milliToDecimal(v:number):string{
  if(!Number.isSafeInteger(v)||v<0)throw new RangeError('Cantidad inválida')
  return `${Math.floor(v/1000)}`+(v%1000===0?'':','+String(v%1000).padStart(3,'0').replace(/0+$/,''))
}
export function lineTotalCents(quantity_milli:number,unit_cost_cents:number):number{
  if(!qty(quantity_milli)||!money(unit_cost_cents))throw new RangeError('Cantidad o costo inválido')
  // Match Python's HALF_UP per line with exact integer arithmetic.
  const computed=(BigInt(quantity_milli)*BigInt(unit_cost_cents)+500n)/1000n
  if(computed>BigInt(MAX_CENTS))throw new RangeError('Total fuera de rango')
  return Number(computed)
}
export function validatePurchase(v:NewPurchase){
  if(!record(v)||Object.keys(v).sort().join('|')!==['lines','notes','purchased_on','reference','supplier_id'].join('|'))
    throw new RangeError('Campos de compra no permitidos.')
  if(!Array.isArray(v.lines))throw new RangeError('Renglones inválidos.')
  if(!date(v.purchased_on)||v.purchased_on<'2000-01-01'||v.purchased_on>'2100-12-31')throw new RangeError('Fecha de compra inválida.')
  if(v.supplier_id!==null&&!uuid(v.supplier_id))throw new RangeError('Proveedor inválido')
  if(v.reference.trim().length>70||v.notes.trim().length>500
    ||v.lines.length<1||v.lines.length>30)throw new RangeError('Máximo 30 renglones, referencia de 70 y notas de 500 caracteres.')
  let total=0
  for(const l of v.lines){
    if(!record(l)||Object.keys(l).sort().join('|')!==['catalog_item_id','description','quantity_milli','unit','unit_cost_cents'].join('|'))
      throw new RangeError('Campos de renglón no permitidos.')
    if(typeof l.description!=='string'||l.description.trim().length<2||l.description.trim().length>140
      ||!qty(l.quantity_milli)||!money(l.unit_cost_cents))throw new RangeError('Renglón inválido.')
    if((l.catalog_item_id===null)!==(l.unit==='CONCEPTO')
      ||(l.catalog_item_id!==null&&!uuid(l.catalog_item_id)))throw new RangeError('Concepto libre exige unidad CONCEPTO; artículos requieren ID.')
    if(['UNIDAD','PAQUETE','CAJA','SERVICIO','CONCEPTO'].includes(l.unit)&&l.quantity_milli%1000!==0)
      throw new RangeError('Esta unidad solo admite cantidades enteras.')
    total+=lineTotalCents(l.quantity_milli,l.unit_cost_cents)
  }
  if(total>MAX_CENTS)throw new RangeError('Total de compra excede el máximo.')
}
export const SUPPLY_PAGE_SIZE=100
export function createSupplyGateway(token:string,businessId:string,fetchImpl?:typeof fetch){
  if(!token||!uuid(businessId))throw new TypeError('Sesión/empresa inválida')
  const api=createApiClient({getAccessToken:()=>token,fetchImpl})
  const suppliers='/businesses/'+businessId+'/suppliers'
  const purchases='/businesses/'+businessId+'/purchases'
  const validKey=(key:string)=>{if(!UUID_V4_PATTERN.test(key))throw new TypeError('Clave idempotente UUID4 inválida');return key}
  const id=(id:string)=>{if(!uuid(id))throw new TypeError('ID inválido');return id}
  const list=(base:string,offset:number,limit:number)=>{
    if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>500)
      throw new TypeError('Paginación fuera de rango')
    return base+'?offset='+offset+'&limit='+limit
  }
  return {
    suppliers:async(offset=0,limit=SUPPLY_PAGE_SIZE,signal?:AbortSignal)=>page(
      await api.request<unknown>(list(suppliers,offset,limit),{signal}),limit,
      x=>parseSupplier(x,businessId)),
    createSupplier:async(name:string)=>parseSupplier(await api.request<unknown>(suppliers,{
      method:'POST',body:{name:name.trim()}}),businessId),
    changeSupplier:async(supplierId:string,status:'ACTIVO'|'INACTIVO')=>parseSupplier(
      await api.request<unknown>(suppliers+'/'+id(supplierId)+'/status',{
        method:'PATCH',body:{status}}),businessId),
    purchases:async(offset=0,limit=SUPPLY_PAGE_SIZE,signal?:AbortSignal)=>page(
      await api.request<unknown>(list(purchases,offset,limit),{signal}),limit,
      x=>parsePurchase(x,businessId)),
    purchase:async(purchaseId:string,signal?:AbortSignal)=>parsePurchase(
      await api.request<unknown>(purchases+'/'+id(purchaseId),{signal}),businessId),
    createPurchase:async(body:NewPurchase,key:string)=>{
      validatePurchase(body)
      return parsePurchase(await api.request<unknown>(purchases,{
        method:'POST',body,idempotencyKey:validKey(key)}),businessId)
    },
    receive:async(purchaseId:string,locationId:string,key:string)=>parseReceipt(
      await api.request<unknown>(purchases+'/'+id(purchaseId)+'/receive',{
        method:'POST',body:{location_id:id(locationId)},idempotencyKey:validKey(key)}),businessId,purchaseId),
    receipt:async(purchaseId:string,signal?:AbortSignal)=>parseReceipt(
      await api.request<unknown>(purchases+'/'+id(purchaseId)+'/receipt',{signal}),businessId,purchaseId),
  }
}
export function supplyErrorMessage(err:unknown):string{
  if(err instanceof ApiHttpError){
    if(err.status===401)return 'Sesión vencida. Iniciá sesión nuevamente.'
    if(err.status===403)return 'No tenés permisos para esta operación.'
    if(err.status===404)return 'Proveedor, compra, sede o empresa no disponible para esta cuenta.'
    if(err.status===409)return 'Conflicto: revisá el estado y el historial antes de continuar.'
    if(err.status===422)return 'Datos inválidos. Revisá las unidades, los artículos y el destino.'
    return 'La API no pudo completar la operación.'
  }
  if(err instanceof ApiTransportError)return err.outcomeUnknown
    ? 'Resultado incierto: revisá compras/recepciones antes de reintentar la misma operación.'
    : 'Error de conexión a FastAPI. Reintentá solo lecturas.'
  return err instanceof Error?err.message:'Operación no completada.'
}
export function priceInputCents(s:string):number{
  const value=pesosToCents(s)
  if(value===null)throw new RangeError('El costo unitario es obligatorio')
  return value
}
