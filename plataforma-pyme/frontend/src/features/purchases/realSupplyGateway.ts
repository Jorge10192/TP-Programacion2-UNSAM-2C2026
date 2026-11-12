import { ApiHttpError, ApiTransportError, createApiClient } from '../../api/httpClient.ts'
import { UUID_PATTERN, UUID_V4_PATTERN } from '../businesses/businessGateway.ts'
import { MAX_CENTS, pesosToCents } from '../catalog/realCatalogGateway.ts'

export type Supplier = {
  id:string; business_id:string; name:string; offerings:string; contact_person:string
  phone:string; whatsapp:string; email:string; address:string; maps_url:string
  website:string; instagram:string; notes:string; payment_methods:string[]
  promotions:SupplierPromotionRule[]; status:'ACTIVO'|'INACTIVO'; created_at:string; updated_at:string
}
/**
 * E3-1D2A: subconjunto editable del proveedor.
 * Campos comerciales de D2B (payment_methods/promotions), status y tenant NO se escriben aquí.
 */
export type SupplierContactDraft = Pick<Supplier,
  'name'|'offerings'|'contact_person'|'phone'|'whatsapp'|'email'|
  'address'|'maps_url'|'website'|'instagram'|'notes'>
export const emptySupplierContact:SupplierContactDraft={
  name:'',offerings:'',contact_person:'',phone:'',whatsapp:'',email:'',
  address:'',maps_url:'',website:'',instagram:'',notes:'',
}
const supplierContactLimits:Record<keyof SupplierContactDraft,number>={
  name:90,offerings:240,contact_person:100,phone:35,whatsapp:35,email:120,
  address:160,maps_url:2048,website:2048,instagram:31,notes:650,
}
export function validateSupplierContact(input:SupplierContactDraft):SupplierContactDraft{
  const values={...emptySupplierContact}
  for(const field of Object.keys(values) as (keyof SupplierContactDraft)[]){
    if(typeof input[field]!=='string')throw new RangeError(field+': requiere texto.')
    const cleaned=input[field].trim()
    if(cleaned.length>supplierContactLimits[field])throw new RangeError(field+': supera el máximo permitido.')
    values[field]=cleaned
  }
  if(values.name.length<2)throw new RangeError('Ingresá un nombre comercial de al menos dos caracteres.')
  if(values.phone&&!/^\+?[\d\s().-]{6,35}$/.test(values.phone))
    throw new RangeError('Teléfono comercial: usá solamente números y signos telefónicos.')
  if(values.whatsapp){
    if(!/^\+[1-9][\d\s().-]{6,22}$/.test(values.whatsapp) ||
      values.whatsapp.replace(/\D/g,'').length<8 ||
      values.whatsapp.replace(/\D/g,'').length>15)
      throw new RangeError('WhatsApp: usá el número completo con prefijo internacional (+54...).')
  }
  if(values.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
    throw new RangeError('Correo electrónico: dirección inválida.')
  if(values.instagram&&!/^@?[a-zA-Z0-9._]{1,30}$/.test(values.instagram))
    throw new RangeError('Instagram: usá un nombre de usuario, por ejemplo @proveedor.')
  for(const field of ['maps_url','website'] as const){
    if(!values[field])continue
    let url:URL
    try {url=new URL(values[field])}catch{throw new RangeError('Ingresá un enlace HTTPS válido.')}
    if(url.protocol!=='https:'||!url.hostname||url.username||url.password||url.port)
      throw new RangeError('Los enlaces deben ser HTTPS, sin usuario, contraseña ni puerto.')
    if(field==='maps_url'){
      const host=url.hostname.toLowerCase().replace(/\.$/,'')
      const ok=host==='maps.app.goo.gl'
        ||((host==='google.com'||host==='www.google.com')
          &&(url.pathname==='/maps'||url.pathname.startsWith('/maps/')))
        ||(host==='maps.google.com'&&(url.pathname!=='/'||url.searchParams.has('q')))
        ||(host==='goo.gl'&&url.pathname.startsWith('/maps/'))
      if(!ok)throw new RangeError('Google Maps: pegá un enlace oficial de Google Maps.')
    }
  }
  // Desestructuración explícita evita incluir state, tenant y arreglos de promociones.
  return values
}

/** Reglas informativas: no afectan importes ni descuentos de Compras. */
export const SUPPLIER_PAYMENT_METHODS=[
  'EFECTIVO','TRANSFERENCIA','MERCADO_PAGO','CUENTA_DNI',
  'TARJETA','CHEQUE','CUENTA_CORRIENTE',
] as const
export type SupplierPaymentMethod=typeof SUPPLIER_PAYMENT_METHODS[number]
export const SUPPLIER_PAYMENT_LABELS:Record<SupplierPaymentMethod,string>={
  EFECTIVO:'Efectivo',TRANSFERENCIA:'Transferencia',MERCADO_PAGO:'Mercado Pago',
  CUENTA_DNI:'Cuenta DNI',TARJETA:'Tarjeta',CHEQUE:'Cheque',
  CUENTA_CORRIENTE:'Cuenta corriente',
}
export const SUPPLIER_WEEKDAYS=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'] as const
export type SupplierPromotionRule={
  id:string
  days:number[] // 0=Lunes ... 6=Domingo; []=sin días específicos
  payment_method:SupplierPaymentMethod|null
  benefit:string
}
export type SupplierCommercialDraft=SupplierContactDraft&{
  payment_methods:SupplierPaymentMethod[]
  promotions:SupplierPromotionRule[]
}
export function newSupplierCommercialDraft():SupplierCommercialDraft{
  return {...emptySupplierContact,payment_methods:[],promotions:[]}
}
/** Whitelist explícita: no se envían estado, business_id ni identificadores de proveedor. */
export function validateSupplierCommercialDraft(input:SupplierCommercialDraft):SupplierCommercialDraft{
  const contact=validateSupplierContact(input)
  if(!Array.isArray(input.payment_methods)||input.payment_methods.length>SUPPLIER_PAYMENT_METHODS.length
    ||input.payment_methods.some(p=>!SUPPLIER_PAYMENT_METHODS.includes(p))
    ||new Set(input.payment_methods).size!==input.payment_methods.length)
    throw new RangeError('Seleccioná medios de pago válidos, sin duplicados.')
  if(!Array.isArray(input.promotions)||input.promotions.length>8)
    throw new RangeError('Podés registrar hasta ocho promociones informativas.')
  const ids=new Set<string>()
  const promotions:SupplierPromotionRule[]=input.promotions.map((rule,index)=>{
    if(!rule||typeof rule!=='object'||!uuid(rule.id)||ids.has(rule.id))
      throw new RangeError('Regla '+(index+1)+': identificador inválido o duplicado.')
    ids.add(rule.id)
    if(!Array.isArray(rule.days)||rule.days.length>7||
       rule.days.some(day=>!Number.isInteger(day)||day<0||day>6)||
       new Set(rule.days).size!==rule.days.length)
      throw new RangeError('Regla '+(index+1)+': días de la semana inválidos o repetidos.')
    if(rule.payment_method!==null&&!SUPPLIER_PAYMENT_METHODS.includes(rule.payment_method))
      throw new RangeError('Regla '+(index+1)+': medio de pago inválido.')
    if(typeof rule.benefit!=='string'||rule.benefit.trim().length<3||rule.benefit.trim().length>160)
      throw new RangeError('Regla '+(index+1)+': beneficio de 3 a 160 caracteres.')
    return {id:rule.id,days:[...rule.days].sort((a,b)=>a-b),
      payment_method:rule.payment_method,benefit:rule.benefit.trim()}
  })
  return {...contact,payment_methods:[...input.payment_methods],promotions}
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
/** The visual state reflects backend confirmation, not an optimistic frontend action. */
export function purchaseStatusPresentation(status:Purchase['status']):{
  label:string; tone:'pending'|'confirmed'|'neutral'
} {
  switch(status){
    case 'REGISTRADA': return {label:'REGISTRADA · RECEPCIÓN PENDIENTE',tone:'pending'}
    case 'RECIBIDA': return {label:'RECIBIDA',tone:'confirmed'}
    case 'CERRADA_SIN_RECEPCION': return {label:'CERRADA SIN RECEPCIÓN',tone:'neutral'}
    case 'CANCELADA': return {label:'CANCELADA',tone:'neutral'}
  }
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
    createSupplierDetailed:async(input:SupplierContactDraft)=>parseSupplier(
      await api.request<unknown>(suppliers,{method:'POST',body:validateSupplierContact(input)}),businessId),
    updateSupplierDetails:async(supplierId:string,input:SupplierContactDraft)=>parseSupplier(
      await api.request<unknown>(suppliers+'/'+id(supplierId),{
        method:'PATCH',body:validateSupplierContact(input),
      }),businessId),
    createSupplierCommercial:async(input:SupplierCommercialDraft)=>parseSupplier(
      await api.request<unknown>(suppliers,{
        method:'POST',body:validateSupplierCommercialDraft(input),
      }),businessId),
    updateSupplierCommercial:async(supplierId:string,input:SupplierCommercialDraft)=>parseSupplier(
      await api.request<unknown>(suppliers+'/'+id(supplierId),{
        method:'PATCH',body:validateSupplierCommercialDraft(input),
      }),businessId),
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
/**
 * GET /receipt returns 404 both when no receipt exists and when access is denied.
 * The caller must verify the purchase itself via GET /purchases/:id first.
 * Only a confirmed, readable REGISTRADA purchase permits this safe explanation.
 */
/**
 * Read-only receipt reconciliation. The backend returns 404 both for a
 * missing receipt and for a hidden resource, so confirm the purchase is
 * readable before interpreting 404 as 'not yet received'.
 */
export async function inspectReceipt(
  gateway:Pick<ReturnType<typeof createSupplyGateway>,'receipt'|'purchase'>,
  purchaseId:string,
):Promise<
 | {kind:'confirmed';receipt:PurchaseReceipt}
 | {kind:'pending';purchase:Purchase}
 | {kind:'inconsistent';purchase:Purchase}
>{
  try{
    return {kind:'confirmed',receipt:await gateway.receipt(purchaseId)}
  }catch(err){
    if(!(err instanceof ApiHttpError&&err.status===404))throw err
    const purchase=await gateway.purchase(purchaseId)
    if(purchase.status==='REGISTRADA')return {kind:'pending',purchase}
    return {kind:'inconsistent',purchase}
  }
}
export function missingReceiptMessage(status:Purchase['status']):string {
  if(status==='REGISTRADA')return 'Todavía no hay un comprobante de recepción confirmado para esta compra. La compra sigue REGISTRADA. Si tenés un intento pendiente guardado, se conserva la misma clave: no se envió ninguna nueva recepción. Antes de reintentar verificá tu asignación a la sede y sus permisos.'
  if(status==='RECIBIDA')return 'La compra figura RECIBIDA, pero la API no permitió consultar el comprobante. No repitas la recepción. Actualizá y revisá el acceso con el administrador.'
  return 'No se pudo consultar el comprobante para esta compra. No se realizó ninguna recepción adicional.'
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
