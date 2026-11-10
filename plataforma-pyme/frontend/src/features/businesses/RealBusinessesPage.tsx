import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiHttpError, ApiTransportError } from '../../api/httpClient.ts'
import { businessIntentJournal, intentIsOld, JournalConflictError, JournalUnavailableError } from '../pending/businessIntentJournal.ts'
import {
  businessErrorMessage, canEditBusiness, createBusinessGateway,
} from './businessGateway.ts'
import type { ActivityKind, BusinessChanges, NewBusiness, RealBusiness } from './businessGateway.ts'

export type BusinessRoute = { kind: 'list' } | { kind: 'create' } | { kind: 'detail'; businessId: string }
export type PendingBusinessCreation = { key: string; body: NewBusiness }
type Props = {
  token: string
  userId: string
  route: BusinessRoute
  onNavigate: (route: string) => void
  onUnauthorized: () => void
  pendingCreation: PendingBusinessCreation | null
  setPendingCreation: (pending: PendingBusinessCreation | null) => void
}

const activityKinds: ActivityKind[] = ['PRODUCTOS', 'SERVICIOS', 'MIXTO']
const emptyNewBusiness: NewBusiness = { name: '', category: '', activity_kind: 'PRODUCTOS' }

export function RealBusinessesPage({
  token, userId, route, onNavigate, onUnauthorized, pendingCreation, setPendingCreation,
}: Props) {
  const [items, setItems] = useState<RealBusiness[] | null>(null)
  const [selected, setSelected] = useState<RealBusiness | null>(null)
  const [loading, setLoading] = useState(route.kind !== 'create')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [draft, setDraft] = useState<NewBusiness>(() => pendingCreation?.body ?? emptyNewBusiness)
  const [journalState, setJournalState] = useState<'loading' | 'ready' | 'error'>(route.kind === 'create' ? 'loading' : 'ready')
  const [journalNote, setJournalNote] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [intentOld, setIntentOld] = useState(false)
  const [editing, setEditing] = useState(false)
  const [changes, setChanges] = useState<NewBusiness>(emptyNewBusiness)
  const requestGeneration = useRef(0)
  const mutationGeneration = useRef(0)
  const gateway = useMemo(() => createBusinessGateway(token, userId), [token, userId])
  const businessId = route.kind === 'detail' ? route.businessId : null

  useEffect(() => {
    // Changing tenant, route or session must not let an old POST/PATCH alter this page.
    const invalidateMutations = () => { mutationGeneration.current += 1 }
    return () => { invalidateMutations() }
  }, [])

  useEffect(() => {
    // Abort reads on tenant change; ignore late responses from the previous tenant.
    const controller = new AbortController()
    const runId = ++requestGeneration.current
    if (route.kind === 'create') return () => { controller.abort() }
    const promise = businessId === null
      ? gateway.list(controller.signal)
      : gateway.get(businessId, controller.signal)
    void promise.then((result) => {
      if (controller.signal.aborted || runId !== requestGeneration.current) return
      if (Array.isArray(result)) setItems(result)
      else {
        setSelected(result)
        setChanges({ name: result.name, category: result.category, activity_kind: result.activity_kind })
      }
    }).catch((err: unknown) => {
      if (controller.signal.aborted || runId !== requestGeneration.current) return
      if (err instanceof ApiHttpError && err.status === 401) { onUnauthorized(); return }
      setError(businessErrorMessage(err))
    }).finally(() => {
      if (!controller.signal.aborted && runId === requestGeneration.current) setLoading(false)
    })
    return () => { controller.abort() }
  }, [gateway, route.kind, businessId, onUnauthorized])

  useEffect(() => {
    if (route.kind !== 'create') return
    let active = true
    void businessIntentJournal.load(userId).then((record) => {
      if (!active) return
      const restored = record ? { key: record.key, body: record.body } : null
      setPendingCreation(restored)
      if (record) {
        setDraft(record.body)
        setAcknowledged(true) // the original attempt was already persisted explicitly
        setIntentOld(intentIsOld(record))
        setJournalNote('Se recuperó un intento guardado en este navegador. No se reenviará automáticamente.')
      } else {
        setDraft(emptyNewBusiness)
        setIntentOld(false)
        setJournalNote('')
      }
      setJournalState('ready')
    }).catch(() => {
      if (!active) return
      setJournalState('error')
      setJournalNote('No se pudo abrir o validar el registro del navegador. Por seguridad no se permitirá crear una empresa sin conservar antes su clave.')
    })
    return () => { active = false }
  }, [route.kind, userId, setPendingCreation])

  function normalize(input: NewBusiness): NewBusiness {
    return { name: input.name.trim(), category: input.category.trim(), activity_kind: input.activity_kind }
  }

  async function createCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || journalState !== 'ready') return
    setError(''); setNotice('')
    if (!acknowledged) {
      setError('Para crear una empresa, aceptá conservar temporalmente el intento en este navegador. No se guardan tokens ni contraseñas.')
      return
    }
    const desired = normalize(draft)
    if (desired.name.length < 2 || desired.category.length < 2) {
      setError('Nombre y rubro deben tener al menos dos caracteres.')
      return
    }
    if (pendingCreation && JSON.stringify(pendingCreation.body) !== JSON.stringify(desired)) {
      setError('Existe un intento anterior sin confirmar. Conservamos el cuerpo original para no reutilizar su clave con otros datos.')
      return
    }
    const pending = pendingCreation ?? { key: crypto.randomUUID(), body: desired }
    const mutationId = ++mutationGeneration.current
    setBusy(true)
    try {
      // Strict ordering: durable commit FIRST, business POST SECOND.
      // If persistence is denied or corrupted, do not send any POST.
      const saved = await businessIntentJournal.reserve(userId, pending.body, pending.key)
      if (mutationId !== mutationGeneration.current) return
      setPendingCreation({ key: saved.key, body: saved.body })
      const business = await gateway.create(saved.body, saved.key)
      if (mutationId !== mutationGeneration.current) return
      try {
        await businessIntentJournal.discard(userId, saved.key)
      } catch {
        setError('La empresa se confirmó en FastAPI, pero no se pudo limpiar su intento local. Consultá Mis empresas y descartá manualmente el registro cuando vuelva a estar disponible.')
        return
      }
      if (mutationId !== mutationGeneration.current) return
      setPendingCreation(null)
      setDraft(emptyNewBusiness)
      onNavigate('/real/empresas/' + business.id)
    } catch (err) {
      if (mutationId !== mutationGeneration.current) return
      if (err instanceof ApiHttpError && err.status === 401) { onUnauthorized(); return }
      // Even a malformed 201 response can follow a successful database commit.
      const ambiguous = err instanceof ApiTransportError
        || (err instanceof ApiHttpError && (err.status === 409 || err.status >= 500))
      setError(err instanceof JournalUnavailableError
        ? 'No se pudo guardar el intento en este navegador: NO enviamos la creación a FastAPI. Revisá la disponibilidad de IndexedDB.'
        : err instanceof JournalConflictError
          ? 'Ya existe un intento guardado con otra clave o contenido. No enviamos un POST nuevo: revisá la solicitud pendiente.'
          : ambiguous
            ? 'No podemos confirmar el resultado. Revisá «Mis empresas» antes de repetir. Si corresponde, reintentá con la MISMA clave y los MISMOS datos, incluso después de F5.'
            : businessErrorMessage(err))
    } finally {
      if (mutationId === mutationGeneration.current) setBusy(false)
    }
  }

  async function updateCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || !canEditBusiness(selected) || busy) return
    setError(''); setNotice(''); setBusy(true)
    const mutationId = ++mutationGeneration.current
    const updated = normalize(changes)
    const patch: BusinessChanges = {}
    if (updated.name !== selected.name) patch.name = updated.name
    if (updated.category !== selected.category) patch.category = updated.category
    if (updated.activity_kind !== selected.activity_kind) patch.activity_kind = updated.activity_kind
    if (Object.keys(patch).length === 0) {
      setEditing(false); setBusy(false)
      return
    }
    try {
      const current = await gateway.update(selected.id, patch)
      if (mutationId !== mutationGeneration.current) return
      setSelected((old) => old?.id === current.id ? current : old)
      setEditing(false)
      setNotice('Datos de la empresa actualizados en PostgreSQL.')
    } catch (err) {
      if (mutationId !== mutationGeneration.current) return
      if (err instanceof ApiHttpError && err.status === 401) { onUnauthorized(); return }
      setError(businessErrorMessage(err))
    } finally {
      if (mutationId === mutationGeneration.current) setBusy(false)
    }
  }

  async function dismissPending() {
    if (!pendingCreation || busy) return
    const confirmed = window.confirm('Descartá el intento solo después de verificar Mis empresas. Si el servidor ya confirmó la creación, otra clave puede crear una empresa duplicada. ¿Eliminar el registro local?')
    if (!confirmed) return
    setBusy(true)
    try {
      await businessIntentJournal.discard(userId, pendingCreation.key)
      setPendingCreation(null)
      setDraft(emptyNewBusiness)
      setIntentOld(false)
      setAcknowledged(false)
      setError('')
      setJournalNote('')
      setNotice('Registro local descartado por tu decisión. No se modificó nada en FastAPI.')
    } catch {
      setError('No se pudo eliminar el registro local. No se descartó su identidad de intento.')
    } finally { setBusy(false) }
  }

  function fields(value: NewBusiness, update: (field: keyof NewBusiness, value: string) => void) {
    return <>
      <label>Nombre comercial<input required minLength={2} maxLength={120} autoComplete="organization" value={value.name} onChange={(e) => update('name', e.target.value)}/></label>
      <label>Rubro<input required minLength={2} maxLength={120} placeholder="Ej.: comercio, gastronomía, consultoría" value={value.category} onChange={(e) => update('category', e.target.value)}/></label>
      <label>Actividad<select value={value.activity_kind} onChange={(e) => update('activity_kind', e.target.value)}>
        {activityKinds.map((item) => <option key={item} value={item}>{item === 'MIXTO' ? 'Productos y servicios' : item === 'PRODUCTOS' ? 'Productos' : 'Servicios'}</option>)}
      </select></label>
    </>
  }

  return <section className="real-auth-card real-business-panel" aria-label="Empresas reales">
    <div className="real-business-nav">
      <button className="real-auth-link" type="button" onClick={() => onNavigate('/real/perfil')}>Mi perfil real</button>
      <button className="real-auth-link" type="button" onClick={() => onNavigate('/real/empresas')}>Mis empresas</button>
      <button className="real-auth-link" type="button" onClick={() => onNavigate('/real/empresas/nueva')}>Crear empresa</button>
    </div>
    <span className="real-auth-eyebrow">E2-7 · T03 · PostgreSQL</span>
    {route.kind === 'list' ? <>
      <h1>Mis empresas reales</h1>
      <p>Solo aparecen negocios con una membresía activa de tu usuario autenticado. Las empresas DEMO no forman parte de este listado.</p>
      {loading && <p role="status">Consultando empresas en FastAPI…</p>}
      {!loading && items?.length === 0 && <div className="real-business-empty">Aún no tenés empresas reales asociadas. Podés crear la primera.</div>}
      {!loading && items && items.length > 0 && <div className="real-business-grid">
        {items.map((item) => <button key={item.id} className="real-business-tile" type="button" onClick={() => onNavigate('/real/empresas/' + item.id)}>
          <strong>{item.name}</strong>
          <span>{item.category} · {item.activity_kind}</span>
          <small>{item.membership.role.replaceAll('_', ' ')} · {item.status}</small>
          <span className="real-business-tile-action">Abrir empresa</span>
        </button>)}
      </div>}
      <button type="button" className="real-auth-primary" onClick={() => onNavigate('/real/empresas/nueva')}>Crear nueva empresa</button>
    </> : route.kind === 'create' ? <>
      <h1>Nueva empresa real</h1>
      <p>Se creará una empresa y tu membresía de titular administrativo mediante una única operación en PostgreSQL.</p>
      <p className="real-auth-note">El registro de recuperación guarda únicamente nombre, rubro, actividad, clave UUID y fecha en IndexedDB de este navegador. No cifra esos datos ni guarda credenciales: evitá utilizar dispositivos compartidos.</p>
      {journalState === 'loading' && <p role="status">Verificando intentos guardados…</p>}
      {journalNote && <p role={journalState === 'error' ? 'alert' : 'status'} className={journalState === 'error' ? 'real-auth-message real-auth-error' : 'real-auth-note'}>{journalNote}</p>}
      {intentOld && <p className="real-auth-message real-ops-warning">Este intento tiene más de 30 días. Comprobá su estado con especial cuidado antes de reintentarlo. No se elimina automáticamente.</p>}
      <form className="real-auth-form" onSubmit={(e) => void createCompany(e)}>
        <fieldset disabled={busy || journalState !== 'ready' || !!pendingCreation} className="real-intent-fields">
          {fields(draft, (field, value) => setDraft((old) => ({ ...old, [field]: value })))}
        </fieldset>
        {!pendingCreation && <label className="real-ops-check"><input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)}/> Acepto conservar los datos de esta solicitud en este navegador hasta resolverla. No usar en dispositivos compartidos.</label>}
        <button className="real-auth-primary" type="submit" disabled={busy || journalState !== 'ready' || (!pendingCreation && !acknowledged)}>{busy ? 'Procesando…' : pendingCreation ? 'Reintentar MISMO intento' : 'Crear empresa'}</button>
      </form>
      {pendingCreation && <div className="real-business-uncertain">
        <strong>Existe un intento de creación guardado para esta cuenta.</strong>
        <p>El registro persistió en IndexedDB y se recuperará después de F5 cuando vuelvas a iniciar sesión con la misma cuenta. Primero revisá el listado, porque el servidor podría haber confirmado la creación.</p>
        <div className="real-auth-actions">
          <button className="real-auth-secondary" type="button" onClick={() => onNavigate('/real/empresas')}>Consultar mis empresas</button>
          <button className="real-auth-secondary" type="button" onClick={dismissPending}>Descartar tras verificar</button>
        </div>
      </div>}
    </> : <>
      <h1>Empresa real</h1>
      {loading && <p role="status">Comprobando pertenencia a la empresa…</p>}
      {!loading && selected && <>
        <h2 className="real-business-name">{selected.name}</h2>
        <dl className="real-auth-profile">
          <div><dt>Rubro</dt><dd>{selected.category}</dd></div>
          <div><dt>Actividad</dt><dd>{selected.activity_kind}</dd></div>
          <div><dt>Estado</dt><dd>{selected.status}</dd></div>
          <div><dt>Tu rol en esta empresa</dt><dd>{selected.membership.role.replaceAll('_', ' ')}</dd></div>
          <div><dt>Tu membresía</dt><dd>{selected.membership.status}</dd></div>
          <div><dt>Identificador del negocio</dt><dd className="real-auth-id">{selected.id}</dd></div>
        </dl>
        <p className="real-auth-note">Ya podés consultar el inventario REAL, además de empresas, ubicaciones, catálogo, proveedores y compras. Los reportes y las ventas REAL se integrarán en próximos incrementos.</p>
        <div className="real-auth-actions">
          <button className="real-auth-primary" type="button" onClick={() => onNavigate('/real/empresas/' + selected.id + '/ubicaciones')}>Ubicaciones reales</button>
          <button className="real-auth-secondary" type="button" onClick={() => onNavigate('/real/empresas/' + selected.id + '/equipo')}>Equipo e invitaciones</button>
          <button className="real-auth-secondary" type="button" onClick={() => onNavigate('/real/empresas/' + selected.id + '/catalogo')}>Catálogo REAL</button>
          <button className="real-auth-secondary" type="button" onClick={() => onNavigate('/real/empresas/' + selected.id + '/proveedores')}>Proveedores REAL</button>
          <button className="real-auth-secondary" type="button" onClick={() => onNavigate('/real/empresas/' + selected.id + '/compras')}>Compras y recepciones REAL</button>
          <button className="real-auth-secondary" type="button" onClick={() => onNavigate('/real/empresas/' + selected.id + '/inventario')}>Inventario REAL</button>
        </div>
        {canEditBusiness(selected) && !editing && <button className="real-auth-secondary" type="button" onClick={() => setEditing(true)}>Editar perfil empresarial</button>}
        {canEditBusiness(selected) && editing && <form className="real-auth-form" onSubmit={(e) => void updateCompany(e)}>
          {fields(changes, (field, value) => setChanges((old) => ({ ...old, [field]: value })))}
          <div className="real-auth-actions">
            <button className="real-auth-primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
            <button className="real-auth-secondary" type="button" disabled={busy} onClick={() => { setEditing(false); setChanges({ name: selected.name, category: selected.category, activity_kind: selected.activity_kind }) }}>Cancelar</button>
          </div>
        </form>}
        {!canEditBusiness(selected) && <p className="real-auth-note">La edición no está habilitada para tu rol o el estado actual de la empresa.</p>}
      </>}
    </>}
    {notice && <p className="real-auth-message" role="status">{notice}</p>}
    {error && <p className="real-auth-message real-auth-error" role="alert">{error}</p>}
  </section>
}
