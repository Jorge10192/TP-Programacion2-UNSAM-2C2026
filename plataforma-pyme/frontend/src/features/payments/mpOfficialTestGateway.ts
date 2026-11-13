/** B6 — Mercado Pago Orders API SOLO TEST. No almacena credenciales. */
import { ApiTransportError, createApiClient } from '../../api/httpClient.ts'
import { UUID_PATTERN, UUID_V4_PATTERN } from '../businesses/businessGateway.ts'

export type MpTestConnection={
  business_id:string
  enabled:boolean
  status:'NO_VINCULADA'|'ACTIVA'|'INACTIVA'
  mp_user_id:string|null
  external_pos_id:string|null
  sandbox_only:true
}
export type MpTestOrder={
  id:string
  business_id:string
  source_intent_id:string
  provider_order_id:string|null
  status:'PREPARANDO'|'INDETERMINADA'|'CREADA'|'PROCESADA'|'CANCELADA'|'EXPIRADA'|'REEMBOLSADA'|'REQUIERE_REVISION'
  provider_status_detail:string|null
  external_reference:string
  total_cents:number
  created_at:string
  qr_png_data_uri:string|null
  test_only:true
  sale_registered:boolean
  sale_id:string|null
}
const isObject=(v:unknown):v is Record<string,unknown>=>
  Boolean(v)&&typeof v==='object'&&!Array.isArray(v)
const CURRENCY_LIMIT=99_999_999_999
export function parseMpTestConnection(raw:unknown,businessId:string):MpTestConnection{
  if(!isObject(raw)||raw.business_id!==businessId||typeof raw.enabled!=='boolean'||
      !['NO_VINCULADA','ACTIVA','INACTIVA'].includes(String(raw.status))||
      raw.sandbox_only!==true||
      !(raw.mp_user_id===null||(typeof raw.mp_user_id==='string'&&/^\d+$/.test(raw.mp_user_id)))||
      !(raw.external_pos_id===null||(typeof raw.external_pos_id==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(raw.external_pos_id))))
    throw new ApiTransportError('invalid-response',false)
  return raw as MpTestConnection
}
export function parseMpTestOrder(raw:unknown,businessId:string,sourceId?:string):MpTestOrder{
  if(!isObject(raw)||!UUID_PATTERN.test(String(raw.id))||raw.business_id!==businessId||
      !UUID_PATTERN.test(String(raw.source_intent_id))||
      (sourceId!==undefined&&raw.source_intent_id!==sourceId)||
      !(raw.provider_order_id===null||(typeof raw.provider_order_id==='string'&&
        /^ORD[A-Za-z0-9]{12,84}$/.test(raw.provider_order_id)))||
      !['PREPARANDO','INDETERMINADA','CREADA','PROCESADA','CANCELADA','EXPIRADA',
        'REEMBOLSADA','REQUIERE_REVISION'].includes(String(raw.status))||
      !(raw.provider_status_detail===null||(typeof raw.provider_status_detail==='string'&&raw.provider_status_detail.length<=60))||
      typeof raw.external_reference!=='string'||!/^PYME[A-F0-9]{32}$/.test(raw.external_reference)||
      !Number.isSafeInteger(raw.total_cents)||(raw.total_cents as number)<1||
      (raw.total_cents as number)>CURRENCY_LIMIT||
      !Number.isFinite(Date.parse(String(raw.created_at)))||
      raw.test_only!==true||typeof raw.sale_registered!=='boolean'||
      !(raw.sale_id===null||UUID_PATTERN.test(String(raw.sale_id)))||
      raw.sale_registered!==(raw.sale_id!==null)||
      !(raw.qr_png_data_uri===null||(typeof raw.qr_png_data_uri==='string'&&
        /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(raw.qr_png_data_uri)))||
      (raw.status==='CREADA' && !raw.qr_png_data_uri))
    throw new ApiTransportError('invalid-response',false)
  return raw as MpTestOrder
}
export function createMpOfficialTestGateway(token:string,businessId:string,transport?:typeof fetch){
  if(!token||!UUID_PATTERN.test(businessId))throw new TypeError('Token/empresa inválidos')
  const http=createApiClient({getAccessToken:()=>token,fetchImpl:transport})
  const root='/businesses/'+businessId+'/mercadopago/official-test'
  return {
    connection:()=>http.request<unknown>(root+'/connection').then(r=>parseMpTestConnection(r,businessId)),
    async startOAuth():Promise<string>{
      const result=await http.request<unknown>(root+'/oauth/start',{method:'POST'})
      if(!isObject(result)||typeof result.authorization_url!=='string'){
        throw new ApiTransportError('invalid-response',false)
      }
      const url=new URL(result.authorization_url)
      if(url.protocol!=='https:'||url.host!=='auth.mercadopago.com'||
          url.pathname!=='/authorization'||url.searchParams.get('response_type')!=='code'||
          url.searchParams.get('code_challenge_method')!=='S256'||
          !url.searchParams.get('state'))
        throw new ApiTransportError('invalid-response',false)
      return url.toString()
    },
    setPos:(externalId:string)=>{
      if(!/^[A-Za-z0-9_-]{1,64}$/.test(externalId))throw new TypeError('Caja TEST inválida')
      return http.request<unknown>(root+'/pos',{
        method:'PUT',body:{external_pos_id:externalId},
      }).then(r=>{
        if(!isObject(r)||r.business_id!==businessId||r.external_pos_id!==externalId)
          throw new ApiTransportError('invalid-response',false)
        return r
      })
    },
    bySource:(sourceId:string)=>{
      if(!UUID_PATTERN.test(sourceId))throw new TypeError('QR inválido')
      return http.request<unknown>(root+'/orders/for-qr/'+sourceId)
        .then(r=>r===null?null:parseMpTestOrder(r,businessId,sourceId))
    },
    create:(sourceId:string,key:string)=>{
      if(!UUID_PATTERN.test(sourceId)||!UUID_V4_PATTERN.test(key))
        throw new TypeError('QR o clave inválidos')
      return http.request<unknown>(root+'/orders/from-qr/'+sourceId,{
        method:'POST',idempotencyKey:key,
      }).then(r=>parseMpTestOrder(r,businessId,sourceId))
    },
    order:(id:string)=>{
      if(!UUID_PATTERN.test(id))throw new TypeError('Orden inválida')
      return http.request<unknown>(root+'/orders/'+id)
        .then(r=>parseMpTestOrder(r,businessId))
    },
    reconcile:(id:string)=>{
      if(!UUID_PATTERN.test(id))throw new TypeError('Orden inválida')
      return http.request<unknown>(root+'/orders/'+id+'/reconcile',{method:'POST'})
        .then(r=>parseMpTestOrder(r,businessId))
    },
    settle:(id:string)=>{
      if(!UUID_PATTERN.test(id))throw new TypeError('Orden inválida')
      return http.request<unknown>(root+'/orders/'+id+'/settle-qa',{method:'POST'})
        .then(r=>{
          if(!isObject(r)||!isObject(r.order)||!UUID_PATTERN.test(String(r.sale_id))||
              typeof r.replayed!=='boolean')throw new ApiTransportError('invalid-response',true)
          const order=parseMpTestOrder(r.order,businessId)
          if(order.id!==id||order.sale_id!==r.sale_id||!order.sale_registered)
            throw new ApiTransportError('invalid-response',true)
          return {order,sale_id:r.sale_id as string,replayed:r.replayed}
        })
    },
  }
}
