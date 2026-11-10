import { UUID_PATTERN, UUID_V4_PATTERN } from '../businesses/businessGateway.ts'
import type { NewBusiness } from '../businesses/businessGateway.ts'

/** Never store opaque Bearer tokens, passwords, email, invitations or sensitive commercial data. */
export type BusinessCreationIntent = {
  actorId: string
  kind: 'business.create'
  key: string
  body: NewBusiness
  createdAt: string
}
export type JournalPort = {
  read(actorId: string): Promise<unknown>
  reserve(record: BusinessCreationIntent): Promise<void>
  remove(actorId: string, key: string): Promise<void>
}
export class JournalUnavailableError extends Error {
  constructor() { super('El registro de pendientes no está disponible en este navegador.') }
}
export class JournalConflictError extends Error {
  constructor() { super('Existe un intento anterior del mismo usuario. No se sobrescribe.') }
}
const validBody = (body: unknown): body is NewBusiness => {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return false
  const b = body as Record<string, unknown>
  return typeof b.name === 'string' && b.name.trim().length >= 2 && b.name.length <= 120
    && typeof b.category === 'string' && b.category.trim().length >= 2 && b.category.length <= 120
    && ['PRODUCTOS', 'SERVICIOS', 'MIXTO'].includes(String(b.activity_kind))
    && Object.keys(b).length === 3
}
function checkActor(actorId: string) {
  if (!UUID_PATTERN.test(actorId)) throw new TypeError('Actor inválido')
}
export function parseBusinessIntent(value: unknown, actorId: string): BusinessCreationIntent {
  checkActor(actorId)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new JournalConflictError()
  const rec = value as Record<string, unknown>
  if (rec.actorId !== actorId || rec.kind !== 'business.create'
    || typeof rec.key !== 'string' || !UUID_V4_PATTERN.test(rec.key)
    || !validBody(rec.body) || typeof rec.createdAt !== 'string'
    || !Number.isFinite(Date.parse(rec.createdAt))
    || Object.keys(rec).length !== 5) throw new JournalConflictError()
  return {
    actorId, kind: 'business.create', key: rec.key, body: { ...rec.body }, createdAt: rec.createdAt,
  }
}
export function makeBusinessIntentJournal(port: JournalPort) {
  return {
    async load(actorId: string): Promise<BusinessCreationIntent | null> {
      checkActor(actorId)
      const value = await port.read(actorId)
      return value === undefined || value === null ? null : parseBusinessIntent(value, actorId)
    },
    async reserve(actorId: string, body: NewBusiness, key: string): Promise<BusinessCreationIntent> {
      checkActor(actorId)
      if (!UUID_V4_PATTERN.test(key) || !validBody(body)) throw new TypeError('Intento inválido')
      const record: BusinessCreationIntent = {
        actorId, kind: 'business.create', key, body: { ...body }, createdAt: new Date().toISOString(),
      }
      await port.reserve(record)
      // The record must be committed before the HTTP POST begins.
      const persisted = await port.read(actorId)
      const checked = parseBusinessIntent(persisted, actorId)
      if (checked.key !== key || JSON.stringify(checked.body) !== JSON.stringify(body)) throw new JournalConflictError()
      return checked
    },
    async discard(actorId: string, key: string) {
      checkActor(actorId)
      if (!UUID_V4_PATTERN.test(key)) throw new TypeError('Clave inválida')
      await port.remove(actorId, key)
    },
  }
}

const DB_NAME = 'asistente-pyme-real-intentos-v1'
const STORE = 'business_create'
const MAX_ACTORS = 20

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new JournalUnavailableError())
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'actorId' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(new JournalUnavailableError())
    req.onblocked = () => reject(new JournalUnavailableError())
  })
}
async function read(actorId: string): Promise<unknown> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    let row: unknown
    const tx = db.transaction(STORE, 'readonly')
    const request = tx.objectStore(STORE).get(actorId)
    request.onsuccess = () => { row = request.result }
    tx.oncomplete = () => { db.close(); resolve(row) }
    tx.onerror = () => { db.close(); reject(new JournalUnavailableError()) }
    tx.onabort = () => { db.close(); reject(new JournalUnavailableError()) }
  })
}
async function reserve(record: BusinessCreationIntent): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    let problem: Error = new JournalConflictError()
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const get = store.get(record.actorId)
    get.onsuccess = () => {
      if (get.result !== undefined) {
        // Identical attempt can be recovered; never overwrite changed body or key.
        try {
          const saved = parseBusinessIntent(get.result, record.actorId)
          if (saved.key !== record.key || JSON.stringify(saved.body) !== JSON.stringify(record.body)) tx.abort()
        } catch { tx.abort() }
        return
      }
      const count = store.count()
      count.onsuccess = () => {
        if (count.result >= MAX_ACTORS) {
          problem = new JournalUnavailableError()
          tx.abort()
          return
        }
        store.add(record)
      }
    }
    get.onerror = () => { problem = new JournalUnavailableError(); tx.abort() }
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onabort = () => { db.close(); reject(problem) }
    tx.onerror = () => { db.close(); reject(problem) }
  })
}
async function remove(actorId: string, key: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    let problem: Error = new JournalConflictError()
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const get = store.get(actorId)
    get.onsuccess = () => {
      if (get.result === undefined) return
      try {
        const saved = parseBusinessIntent(get.result, actorId)
        if (saved.key !== key) { tx.abort(); return }
        store.delete(actorId)
      } catch { tx.abort() }
    }
    get.onerror = () => { problem = new JournalUnavailableError(); tx.abort() }
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onabort = () => { db.close(); reject(problem) }
    tx.onerror = () => { db.close(); reject(problem) }
  })
}
export const businessIntentJournal = makeBusinessIntentJournal({ read, reserve, remove })
export function intentIsOld(record: BusinessCreationIntent): boolean {
  return Date.now() - Date.parse(record.createdAt) > 30 * 86400_000
}
