/** E3-2A: blobs privados autenticados. Nunca se guardan fotos o Bearer en storage. */
import { ApiHttpError, ApiTransportError } from '../../api/httpClient.ts'
import { UUID_PATTERN } from '../businesses/businessGateway.ts'

export type PhotoOwner =
  | { kind: 'PROFILE' }
  | { kind: 'BUSINESS'; businessId: string }
  | { kind: 'CATALOG'; businessId: string; resourceId: string }
  | { kind: 'SUPPLIER'; businessId: string; resourceId: string }

export type PhotoRecord = {
  id: string; owner_type: PhotoOwner['kind']; position: number
  width: number; height: number; byte_size: number; created_at: string
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const MAX_CATALOG_PHOTOS = 8
export const PHOTO_TYPES = ['image/jpeg','image/png','image/webp'] as const

export function photoCollectionPath(owner: PhotoOwner): string {
  if (owner.kind === 'PROFILE') return '/me'
  if (!UUID_PATTERN.test(owner.businessId)) throw new TypeError('Empresa no válida')
  const root = '/businesses/' + owner.businessId
  if (owner.kind === 'BUSINESS') return root
  if (!UUID_PATTERN.test(owner.resourceId)) throw new TypeError('Recurso no válido')
  return root + (owner.kind === 'CATALOG' ? '/catalog/' : '/suppliers/') + owner.resourceId
}

function parsePhoto(value: unknown, kind: PhotoOwner['kind']): PhotoRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new ApiTransportError('invalid-response', false)
  const v = value as Record<string, unknown>
  if (typeof v.id !== 'string' || !UUID_PATTERN.test(v.id) || v.owner_type !== kind
    || typeof v.position !== 'number' || !Number.isInteger(v.position)
    || v.position < 0 || v.position > 7
    || typeof v.width !== 'number' || !Number.isInteger(v.width) || v.width < 1 || v.width > 1280
    || typeof v.height !== 'number' || !Number.isInteger(v.height) || v.height < 1 || v.height > 1280
    || typeof v.byte_size !== 'number' || !Number.isInteger(v.byte_size)
    || v.byte_size < 1 || v.byte_size > 2 * 1024 * 1024
    || typeof v.created_at !== 'string' || !Number.isFinite(Date.parse(v.created_at))) {
    throw new ApiTransportError('invalid-response', false)
  }
  return v as PhotoRecord
}

export function createPhotoGateway(token: string, owner: PhotoOwner, fetchImpl: typeof fetch = fetch) {
  if (!token) throw new TypeError('Se necesita una sesión REAL')
  const collection = photoCollectionPath(owner)
  async function raw(path: string, method = 'GET', file?: File, signal?: AbortSignal): Promise<Response> {
    const controller = new AbortController()
    let timedOut = false
    const abortCaller = () => controller.abort()
    if (signal?.aborted) controller.abort()
    else signal?.addEventListener('abort', abortCaller, {once:true})
    const timer = setTimeout(() => { timedOut = true; controller.abort() }, 30000)
    try {
      const form = file === undefined ? undefined : new FormData()
      if (form && file) form.set('file', file, file.name)
      const response = await fetchImpl('/api/v1/photos' + path, {
        method, headers: { Authorization: 'Bearer ' + token,
          Accept: path.endsWith('/content') ? 'image/webp' : 'application/json' },
        body: form, signal: controller.signal, redirect:'error',
        cache:'no-store', credentials:'omit',
      })
      if (!response.ok) {
        let detail: unknown = null
        try {
          const payload: unknown = await response.json()
          if (typeof payload === 'object' && payload !== null && 'detail' in payload)
            detail = (payload as {detail: unknown}).detail
        } catch { /* errors may be non-JSON */ }
        throw new ApiHttpError(response.status, detail)
      }
      return response
    } catch (error) {
      if (error instanceof ApiHttpError || error instanceof ApiTransportError) throw error
      if (controller.signal.aborted)
        throw new ApiTransportError(timedOut ? 'timeout':'aborted', method !== 'GET')
      throw new ApiTransportError('network', method !== 'GET')
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort',abortCaller)
    }
  }
  return {
    async list(signal?: AbortSignal): Promise<PhotoRecord[]> {
      const response=await raw(collection,'GET',undefined,signal)
      const data: unknown = await response.json()
      if (!Array.isArray(data) || data.length > (owner.kind === 'CATALOG' ? 8 : 1))
        throw new ApiTransportError('invalid-response',false)
      const records=data.map(photo=>parsePhoto(photo,owner.kind))
      if (new Set(records.map(p=>p.id)).size!==records.length)
        throw new ApiTransportError('invalid-response',false)
      return records.sort((a,b)=>a.position-b.position)
    },
    async upload(file: File): Promise<PhotoRecord> {
      if (!PHOTO_TYPES.includes(file.type as typeof PHOTO_TYPES[number]))
        throw new RangeError('Seleccioná una foto JPG, PNG o WebP.')
      if (!file.size || file.size>MAX_UPLOAD_BYTES)
        throw new RangeError('Cada foto debe pesar hasta 5 MB.')
      const response=await raw(collection,'POST',file)
      return parsePhoto(await response.json(),owner.kind)
    },
    async content(id: string, signal?: AbortSignal): Promise<Blob> {
      if (!UUID_PATTERN.test(id)) throw new TypeError('ID de foto inválido')
      const response=await raw('/'+id+'/content','GET',undefined,signal)
      if (!(response.headers.get('content-type')??'').toLowerCase().startsWith('image/webp'))
        throw new ApiTransportError('invalid-response',false)
      const blob=await response.blob()
      if (!blob.size || blob.size>2*1024*1024)
        throw new ApiTransportError('invalid-response',false)
      return blob
    },
    async remove(id: string): Promise<void> {
      if (!UUID_PATTERN.test(id)) throw new TypeError('ID de foto inválido')
      const response=await raw('/'+id,'DELETE')
      if (response.status!==204) throw new ApiTransportError('invalid-response',true)
    },
  }
}

export function photoErrorMessage(error: unknown): string {
  if (error instanceof ApiHttpError) {
    if (error.status===401) return 'La sesión venció. Volvé a ingresar.'
    if (error.status===403) return 'Tu cuenta no tiene permiso para cambiar estas fotos.'
    if (error.status===404) return 'La foto o el recurso no están disponibles en esta empresa.'
    if (error.status===409) return 'No se pudo agregar otra foto: revisá el límite de imágenes o el estado de la empresa.'
    if (error.status===413) return 'La foto supera el tamaño o la resolución permitidos.'
    if (error.status===415 || error.status===422) return 'El archivo no es una imagen JPG, PNG o WebP válida.'
    return 'La API no pudo completar la carga de imágenes.'
  }
  if (error instanceof ApiTransportError) {
    return error.outcomeUnknown ? 'Resultado incierto. Actualizá la galería para comprobar si la foto se guardó antes de reintentar.'
      : 'No se pudo consultar la imagen. Verificá la conexión.'
  }
  return error instanceof Error ? error.message : 'No se pudo completar la operación.'
}
