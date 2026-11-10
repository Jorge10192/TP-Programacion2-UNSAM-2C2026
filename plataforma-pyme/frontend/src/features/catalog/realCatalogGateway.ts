import { ApiHttpError, ApiTransportError, createApiClient } from '../../api/httpClient.ts'
import { UUID_PATTERN } from '../businesses/businessGateway.ts'

export type CatalogKind = 'ELABORADO'|'REVENTA'|'INSUMO'|'SERVICIO'
export type CatalogUnit = 'UNIDAD'|'GRAMO'|'KILOGRAMO'|'MILILITRO'|'LITRO'|'PAQUETE'|'CAJA'|'SERVICIO'
export type CatalogStatus = 'ACTIVO'|'INACTIVO'
export type CatalogItem = {
  id:string; business_id:string; name:string; kind:CatalogKind; item_type:'BIEN'|'SERVICIO'
  category:string; sku:string|null; unit:CatalogUnit; description:string; observations:string
  sellable:boolean; price_cents:number|null; reference_cost_cents:number|null
  status:CatalogStatus; created_at:string; updated_at:string
}
export type CatalogCreate = {
  name:string; kind:CatalogKind; category:string; sku:string|null; unit:CatalogUnit
  description:string; observations:string; sellable:boolean
  price_cents:number|null; reference_cost_cents:number|null
}
export type CatalogPatch = Partial<CatalogCreate>
export const CATALOG_PAGE_SIZE = 100
export const CATALOG_KINDS:CatalogKind[] = ['ELABORADO','REVENTA','INSUMO','SERVICIO']
export const CATALOG_UNITS:CatalogUnit[] = ['UNIDAD','GRAMO','KILOGRAMO','MILILITRO','LITRO','PAQUETE','CAJA','SERVICIO']
export const MAX_CENTS = 99_999_999_999
const kinds = new Set<string>(CATALOG_KINDS)
const units = new Set<string>(CATALOG_UNITS)
const integerCents = (v:unknown) => v === null || (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= MAX_CENTS)
const obj = (v:unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
function invalid():never { throw new ApiTransportError('invalid-response', false) }

export function parseCatalogItem(v:unknown, businessId:string):CatalogItem {
  if (!obj(v) || !UUID_PATTERN.test(String(v.id)) || v.business_id !== businessId
    || typeof v.name !== 'string' || v.name.trim().length < 2 || !kinds.has(String(v.kind))
    || !units.has(String(v.unit))
    || (v.item_type !== 'BIEN' && v.item_type !== 'SERVICIO')
    || (v.kind === 'SERVICIO') !== (v.unit === 'SERVICIO')
    || (v.item_type === 'SERVICIO') !== (v.kind === 'SERVICIO')
    || typeof v.category !== 'string' || typeof v.description !== 'string'
    || typeof v.observations !== 'string'
    || !(v.sku === null || typeof v.sku === 'string')
    || typeof v.sellable !== 'boolean'
    || !integerCents(v.price_cents) || !integerCents(v.reference_cost_cents)
    || (v.status !== 'ACTIVO' && v.status !== 'INACTIVO')
    || typeof v.created_at !== 'string' || !Number.isFinite(Date.parse(v.created_at))
    || typeof v.updated_at !== 'string' || !Number.isFinite(Date.parse(v.updated_at))) return invalid()
  return v as CatalogItem
}
export function parseCatalogPage(v:unknown, businessId:string):CatalogItem[] {
  if (!Array.isArray(v)) return invalid()
  const page = v.map((item) => parseCatalogItem(item, businessId))
  if (new Set(page.map((x)=>x.id)).size !== page.length) return invalid()
  return page
}

/** ARS decimal text -> integer cents, without floating-point multiplication. */
export function pesosToCents(input:string):number|null {
  const raw=input.trim()
  if (!raw) return null
  if (!/^(?:0|[1-9]\d*)(?:[.,]\d{1,2})?$/.test(raw)) throw new RangeError('Usá pesos sin separador de miles y hasta dos decimales.')
  const [whole,frac=''] = raw.replace(',','.').split('.')
  const result=Number(whole)*100+Number(frac.padEnd(2,'0'))
  if (!Number.isSafeInteger(result) || result>MAX_CENTS) throw new RangeError('El importe supera el máximo admitido.')
  return result
}
export function centsToPesos(cents:number|null):string {
  if (cents === null) return ''
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > MAX_CENTS) throw new RangeError('Centavos inválidos')
  return String(Math.floor(cents / 100)) + ',' + String(cents % 100).padStart(2,'0')
}
export function canManageCatalog(role:string,status:string,businessStatus:string):boolean {
  return status==='ACTIVA' && businessStatus==='ACTIVA' && (role==='TITULAR_ADMINISTRATIVO'||role==='ADMINISTRADOR')
}
export function validateCatalogDraft(v:CatalogCreate) {
  if (v.name.trim().length < 2 || v.name.trim().length>90) throw new RangeError('Nombre: 2 a 90 caracteres.')
  if (v.category.trim().length<2 || v.category.trim().length>60) throw new RangeError('Rubro: 2 a 60 caracteres.')
  if ((v.kind==='SERVICIO') !== (v.unit==='SERVICIO')) throw new RangeError('La unidad SERVICIO es exclusiva para servicios.')
  if (v.sku && !/^[A-Za-z0-9._-]{1,32}$/.test(v.sku)) throw new RangeError('SKU: hasta 32 caracteres, sin espacios.')
  if (v.description.length>450 || v.observations.length>600) throw new RangeError('Descripción u observaciones exceden el máximo.')
  if (!integerCents(v.price_cents) || !integerCents(v.reference_cost_cents)) throw new RangeError('Importes inválidos.')
}
export function createCatalogGateway(token:string, businessId:string, fetchImpl?:typeof fetch) {
  if (!token || !UUID_PATTERN.test(businessId)) throw new TypeError('Sesión o empresa no válida')
  const api=createApiClient({ getAccessToken:()=>token, fetchImpl })
  const root='/businesses/'+businessId+'/catalog'
  const at=(id:string) => { if (!UUID_PATTERN.test(id)) throw new TypeError('ID de artículo inválido'); return root+'/'+id }
  return {
    async page(offset:number,limit:number=CATALOG_PAGE_SIZE,signal?:AbortSignal):Promise<CatalogItem[]> {
      if (!Number.isSafeInteger(offset)||offset<0 || !Number.isSafeInteger(limit)||limit<1||limit>500) throw new RangeError('Paginación inválida')
      const raw=await api.request<unknown>(root+'?offset='+offset+'&limit='+limit,{signal})
      const result=parseCatalogPage(raw,businessId)
      if (result.length>limit) return invalid()
      return result
    },
    async get(id:string,signal?:AbortSignal):Promise<CatalogItem> {
      return parseCatalogItem(await api.request<unknown>(at(id),{signal}),businessId)
    },
    async create(input:CatalogCreate):Promise<CatalogItem> {
      validateCatalogDraft(input)
      return parseCatalogItem(await api.request<unknown>(root,{method:'POST',body:input}),businessId)
    },
    async update(id:string,changes:CatalogPatch):Promise<CatalogItem> {
      if (Object.keys(changes).length===0) throw new TypeError('PATCH vacío')
      return parseCatalogItem(await api.request<unknown>(at(id),{method:'PATCH',body:changes}),businessId)
    },
    async status(id:string,status:CatalogStatus):Promise<CatalogItem> {
      return parseCatalogItem(await api.request<unknown>(at(id)+'/status',{method:'PATCH',body:{status}}),businessId)
    },
  }
}
export function catalogErrorMessage(error:unknown):string {
  if (error instanceof ApiHttpError) {
    if (error.status===401) return 'La sesión venció o fue revocada. Iniciá sesión nuevamente.'
    if (error.status===403) return 'No tenés permisos para administrar este catálogo.'
    if (error.status===404) return 'Artículo o empresa no disponible para esta cuenta.'
    if (error.status===409) return 'Conflicto: nombre/SKU duplicado, empresa suspendida o cambios históricos protegidos.'
    if (error.status===422) return 'La API rechazó el formato o la combinación de tipo, unidad y campos.'
    return 'FastAPI no pudo completar la operación.'
  }
  if (error instanceof ApiTransportError) {
    return error.outcomeUnknown ? 'Resultado incierto: el cambio puede haberse confirmado. Volvé a consultar antes de repetir.'
      : 'No fue posible consultar FastAPI. Comprobá la conexión.'
  }
  if (error instanceof Error) return error.message
  return 'Operación no completada.'
}
