/**
 * Almacenamiento de fotos DEMO en IndexedDB. Nunca se agregan blobs a
 * localStorage ni al estado global de compras/inventario.
 */
import { MAX_STORED_IMAGE_BYTES, scaledImageSize, validateDemoImageFile } from './imagePolicy'

const DB_NAME = 'asistente-pyme-demo-images'
const STORE_NAME = 'images'
export const DEMO_IMAGE_CHANGED = 'asistente-pyme-demo-image-changed'

type PhotoRecord = { key: string; blob: Blob; updatedAt: number }

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('Tu navegador no permite guardar imágenes locales en este contexto.')
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: 'key' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('No se pudo abrir el almacenamiento de fotos del navegador.'))
    request.onblocked = () => reject(new Error('Otra pestaña bloquea la actualización del almacenamiento de imágenes.'))
  })
}

async function transact<T>(
  mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    let result!: T
    try {
      const transaction = db.transaction(STORE_NAME, mode)
      const request = run(transaction.objectStore(STORE_NAME))
      request.onsuccess = () => { result = request.result }
      transaction.oncomplete = () => { db.close(); resolve(result) }
      transaction.onerror = () => { db.close(); reject(new Error('No se pudieron guardar o consultar imágenes locales.')) }
      transaction.onabort = () => { db.close(); reject(new Error('La operación de imágenes fue cancelada por el navegador.')) }
    } catch {
      db.close()
      reject(new Error('No se pudo completar la operación de imágenes.'))
    }
  })
}

export async function readDemoImage(key: string): Promise<Blob | null> {
  const record = await transact<PhotoRecord | undefined>('readonly', (store) => store.get(key))
  return record?.blob instanceof Blob ? record.blob : null
}

export async function writeDemoImage(key: string, blob: Blob): Promise<void> {
  if (blob.size <= 0 || blob.size > MAX_STORED_IMAGE_BYTES ||
      (blob.type !== 'image/webp' && blob.type !== 'image/jpeg')) {
    throw new Error('La imagen optimizada supera el tamaño permitido.')
  }
  await transact<IDBValidKey>('readwrite',
    (store) => store.put({ key, blob, updatedAt: Date.now() } satisfies PhotoRecord))
  window.dispatchEvent(new CustomEvent(DEMO_IMAGE_CHANGED, { detail: key }))
}

export async function removeDemoImage(key: string): Promise<void> {
  await transact<undefined>('readwrite', (store) => store.delete(key))
  window.dispatchEvent(new CustomEvent(DEMO_IMAGE_CHANGED, { detail: key }))
}

/** Corrige orientación EXIF al decodificar y comprime a WebP cuando el navegador lo permite. */
export async function optimizeDemoImage(file: File): Promise<Blob> {
  validateDemoImageFile(file)
  if (typeof createImageBitmap !== 'function') throw new Error('Este navegador no permite optimizar imágenes.')
  let bitmap: ImageBitmap
  try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }) }
  catch { throw new Error('No se pudo abrir la imagen. Revisá que el archivo no esté dañado.') }
  try {
    const { width, height } = scaledImageSize(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No se pudo preparar el procesador de imágenes.')
    ctx.drawImage(bitmap, 0, 0, width, height)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error('No se pudo optimizar la imagen.')), 'image/webp', 0.76)
    })
    if (blob.size <= 0 || blob.size > MAX_STORED_IMAGE_BYTES) {
      throw new Error('La imagen optimizada sigue siendo demasiado grande. Probá con otra foto.')
    }
    return blob
  } finally {
    bitmap.close()
  }
}
