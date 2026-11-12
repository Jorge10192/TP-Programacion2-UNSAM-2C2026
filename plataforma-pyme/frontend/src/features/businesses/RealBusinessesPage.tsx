import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiHttpError, ApiTransportError } from '../../api/httpClient.ts'
import { businessIntentJournal, intentIsOld, JournalConflictError, JournalUnavailableError } from '../pending/businessIntentJournal.ts'
import {
  businessErrorMessage, canEditBusiness, createBusinessGateway,
} from './businessGateway.ts'
import type { ActivityKind, BusinessChanges, NewBusiness, RealBusiness } from './businessGateway.ts'
import './realBusinessDetails.css'
import '../auth/realPeopleBusiness.css'

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

// Rutas existentes del sistema REAL. No se agregan endpoints ni permisos.
const detailSections = [
  { title: 'Administración', description: 'Organizá las sedes, el equipo y los recursos de tu empresa.', actions: [
    { suffix: 'ubicaciones', title: 'Ubicaciones', detail: 'Sedes y disponibilidad para operar.' },
    { suffix: 'equipo', title: 'Equipo e invitaciones', detail: 'Integrantes, roles y acceso.' },
    { suffix: 'catalogo', title: 'Catálogo', detail: 'Productos, insumos y servicios.' },
    { suffix: 'proveedores', title: 'Proveedores', detail: 'Tus relaciones comerciales.' },
  ] },
  { title: 'Operaciones', description: 'Accedé a los movimientos disponibles para tu negocio.', actions: [
    { suffix: 'compras', title: 'Compras y recepciones', detail: 'Compras y recepción de mercadería.' },
    { suffix: 'inventario', title: 'Inventario', detail: 'Saldos y movimientos de stock.' },
    { suffix: 'pos', title: 'Punto de venta', detail: 'Prepará y revisá una venta.' },
    { suffix: 'ventas', title: 'Historial de ventas', detail: 'Comprobantes y consultas.' },
  ] },
] as const

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
      // H2: the first destination is the verified onboarding, not a second setup form.
      onNavigate('/real/empresas/' + business.id + '/inicio')
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
      // Preserve confirmed values when the user opens the editor again.
      setChanges({ name: current.name, category: current.category, activity_kind: current.activity_kind })
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

  return <section className={"real-auth-card real-business-panel" + (route.kind === "list" ? " e3-companies-page" : route.kind === "detail" ? " e3-business-detail" : "")} aria-label="Empresas reales">
    <div className="real-business-nav">
      <button className="real-auth-link" type="button" onClick={() => onNavigate('/real/perfil')}>Volver al perfil</button>
      <button className="real-auth-link" type="button" onClick={() => onNavigate('/real/empresas')}>Mis empresas</button>
      <button className="real-auth-link" type="button" onClick={() => onNavigate('/real/empresas/nueva')}>Crear empresa</button>
    </div>
    <span className="real-auth-eyebrow">{route.kind === 'list' ? 'Tu espacio de trabajo' : route.kind === 'create' ? 'Nueva organización' : 'Datos de la empresa'}</span>
    {route.kind === 'list' ? <>
      <div className="e3-company-heading">
        <div>
          <h1>Mis empresas</h1>
          <p>Elegí un negocio para gestionar sus datos y operaciones.</p>
        </div>
        {!loading && items && <span className="e3-company-count" role="status">{items.length} {items.length === 1 ? 'empresa vinculada' : 'empresas vinculadas'}</span>}
      </div>
      {loading && <p role="status">Consultando empresas en FastAPI…</p>}
      {!loading && items?.length === 0 && <div className="real-business-empty e3-company-empty">
        <strong>Tu primer negocio comienza acá</strong>
        <p>Creá una empresa y después seguí los primeros pasos desde Inicio. Podés completarlos de a poco; los servicios no necesitan stock físico.</p>
      </div>}
      {!loading && items && items.length > 0 && <div className="real-business-grid">
        {items.map((item) => <button key={item.id} className="real-business-tile e3-company-tile" type="button" onClick={() => onNavigate('/real/empresas/' + item.id)}>
          <span className="e3-company-icon" aria-hidden="true">▦</span>
          <strong>{item.name}</strong>
          <span>{item.category} · {item.activity_kind === 'MIXTO' ? 'Productos y servicios' : item.activity_kind === 'PRODUCTOS' ? 'Productos' : 'Servicios'}</span>
          <span className="e3-company-meta">
            <small className="e3-company-role">{item.membership.role.replaceAll('_', ' ')}</small>
            <small className={item.status === 'ACTIVA' ? 'e3-company-state e3-company-active' : 'e3-company-state'}>{item.status}</small>
          </span>
          <span className="real-business-tile-action">Abrir empresa</span>
        </button>)}
      </div>}
      <button type="button" className="real-auth-primary" onClick={() => onNavigate('/real/empresas/nueva')}>Crear nueva empresa</button>
    </> : route.kind === 'create' ? <>
      <h1>Nueva empresa real</h1>
      <p>Se creará una empresa y tu membresía de titular administrativo mediante una única operación en PostgreSQL.</p>
      <p className="real-auth-note">Al confirmar, vas a llegar a Inicio. Desde ahí podés preparar ubicaciones, artículos o servicios y, si vendés bienes físicos, su inventario. No hace falta completar todo ahora.</p>
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
      <div className="e3-detail-header">
        <div className="e3-detail-mark" aria-hidden="true">▦</div>
        <div className="e3-detail-heading">
          <h1>Datos de la empresa</h1>
          <p>Consultá los datos registrados y las herramientas de tu negocio.</p>
        </div>
        {!loading && selected && <div className="real-auth-actions">
          <button type="button" className="real-auth-primary"
            onClick={() => onNavigate('/real/empresas/'+selected.id+'/inicio')}>
            Inicio y primeros pasos
          </button>
          {canEditBusiness(selected) && !editing && <button
            type="button" className="real-auth-secondary e3-detail-edit-trigger"
            onClick={() => setEditing(true)}>Editar datos</button>}
        </div>}
      </div>
      {loading && <p role="status">Comprobando pertenencia a la empresa…</p>}
      {!loading && selected && <>
        <section className="e3-detail-overview" aria-label="Información de la empresa">
          <div className="e3-detail-overview-head">
            <div>
              <p className="e3-detail-kicker">Identidad empresarial</p>
              <h2 className="e3-detail-business-name">{selected.name}</h2>
              <p className="e3-detail-category">{selected.category}</p>
            </div>
            <span className={selected.status === 'ACTIVA' ? 'e3-detail-status e3-detail-status-active' : 'e3-detail-status'}>
              {selected.status === 'ACTIVA' ? 'Activa' : 'Suspendida'}
            </span>
          </div>
          <dl className="e3-detail-facts">
            <div><dt>Nombre comercial</dt><dd>{selected.name}</dd></div>
            <div><dt>Rubro</dt><dd>{selected.category}</dd></div>
            <div><dt>Actividad</dt><dd>{selected.activity_kind === 'MIXTO' ? 'Productos y servicios' : selected.activity_kind === 'PRODUCTOS' ? 'Productos' : 'Servicios'}</dd></div>
            <div><dt>Tu rol</dt><dd>{selected.membership.role.replaceAll('_', ' ')}</dd></div>
            <div><dt>Estado de membresía</dt><dd>{selected.membership.status}</dd></div>
          </dl>
          <details className="e3-detail-technical">
            <summary>Información técnica</summary>
            <dl>
              <div><dt>Identificador del negocio</dt><dd><code>{selected.id}</code></dd></div>
              <div><dt>Fecha de alta</dt><dd>{selected.created_at}</dd></div>
            </dl>
          </details>
        </section>
        {canEditBusiness(selected) && editing && <section className="e3-detail-edit-panel" aria-labelledby="e3-edit-heading">
          <h2 id="e3-edit-heading">Editar datos de la empresa</h2>
          <p>Revisá nombre, rubro y actividad. Los cambios se guardan solo cuando confirmás.</p>
          <form className="real-auth-form e3-detail-edit-form" aria-label="Formulario de edición de empresa" onSubmit={(e) => void updateCompany(e)}>
            {fields(changes, (field, value) => setChanges((old) => ({ ...old, [field]: value })))}
            <div className="real-auth-actions">
              <button className="real-auth-primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
              <button className="real-auth-secondary" type="button" disabled={busy} onClick={() => {
                setEditing(false)
                setChanges({ name: selected.name, category: selected.category, activity_kind: selected.activity_kind })
              }}>Cancelar</button>
            </div>
          </form>
        </section>}
        {!canEditBusiness(selected) && <p className="e3-detail-readonly" role="note">
          Esta información es de solo lectura para tu rol o el estado actual de la empresa.
        </p>}
        {detailSections.map((group) => <section className="e3-detail-section" key={group.title} aria-label={group.title}>
          <div className="e3-detail-section-head">
            <h2>{group.title}</h2>
            <p>{group.description}</p>
          </div>
          <div className="e3-detail-actions">
            {group.actions.map((action) => <button
              key={action.suffix} type="button" className="e3-detail-action"
              aria-label={'Abrir ' + action.title}
              onClick={() => onNavigate('/real/empresas/' + selected.id + '/' + action.suffix)}>
              <span className="e3-detail-action-icon" aria-hidden="true">{action.title.slice(0, 1)}</span>
              <span className="e3-detail-action-body">
                <strong>{action.title}</strong>
                <small aria-hidden="true">{action.detail}</small>
              </span>
              <span className="e3-detail-action-arrow" aria-hidden="true">›</span>
            </button>)}
          </div>
        </section>)}
        <p className="e3-detail-footnote">
          Cada operación se valida con los permisos de tu usuario y las reglas de la API.
        </p>
      </>}
    </>}
    {notice && <p className="real-auth-message" role="status">{notice}</p>}
    {error && <p className="real-auth-message real-auth-error" role="alert">{error}</p>}
  </section>
}
