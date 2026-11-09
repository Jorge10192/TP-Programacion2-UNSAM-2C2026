import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiHttpError, ApiTransportError } from '../../api/httpClient.ts'
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
    if (route.kind === 'create') {
      setLoading(false)
      return () => { controller.abort() }
    }
    setLoading(true)
    setError('')
    setItems(null)
    setSelected(null)
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
  }, [gateway, route.kind, businessId])

  function normalize(input: NewBusiness): NewBusiness {
    return { name: input.name.trim(), category: input.category.trim(), activity_kind: input.activity_kind }
  }

  async function createCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setError(''); setNotice('')
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
    setPendingCreation(pending)
    const mutationId = ++mutationGeneration.current
    setBusy(true)
    try {
      const business = await gateway.create(pending.body, pending.key)
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
      if (!ambiguous) setPendingCreation(null)
      setError(ambiguous
        ? 'No podemos confirmar el resultado de la creación. Primero revisá «Mis empresas»; si no aparece, podés reintentar con la MISMA clave y los MISMOS datos. No creamos otra clave automáticamente.'
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

  function dismissPending() {
    if (!pendingCreation) return
    const confirmed = window.confirm('Descartá el intento solo si verificaste en Mis empresas que la creación no existe. Si el servidor la confirmó y aún no figura, un nuevo intento podría crear otra empresa. ¿Descartar la clave?')
    if (confirmed) { setPendingCreation(null); setDraft(emptyNewBusiness); setError(''); setNotice('Intento anterior descartado manualmente.') }
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
      <form className="real-auth-form" onSubmit={(e) => void createCompany(e)}>
        {fields(draft, (field, value) => setDraft((old) => ({ ...old, [field]: value })))}
        <button className="real-auth-primary" type="submit" disabled={busy}>{busy ? 'Creando…' : pendingCreation ? 'Reintentar MISMO intento' : 'Crear empresa'}</button>
      </form>
      {pendingCreation && <div className="real-business-uncertain">
        <strong>Existe un intento de creación pendiente de confirmación.</strong>
        <p>Se conservaron la clave y los datos originales en memoria. Antes de reintentar, consultá el listado y buscá la empresa.</p>
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
        <p className="real-auth-note">Panel empresarial inicial. Todavía no hay cifras, inventario o ventas REAL: se integrarán en las próximas etapas.</p>
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
