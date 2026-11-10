import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiHttpError, ApiTransportError } from '../../api/httpClient.ts'
import { canManageLocations, createOperationsGateway, operationsError } from '../businesses/realOperationsGateway.ts'
import type { Assignment, LocationInput, LocationKind, LocationRecord, TeamMember } from '../businesses/realOperationsGateway.ts'
import type { RealBusiness } from '../businesses/businessGateway.ts'

const kinds: LocationKind[] = ['LOCAL', 'FERIA', 'DEPOSITO', 'OFICINA', 'CASA', 'OTRO']
const blank: LocationInput = { name: '', kind: 'LOCAL', address: '', map_url: '', can_sell: true, can_store: true }

type Props = { token: string; userId: string; businessId: string; onNavigate: (path: string) => void; onUnauthorized: () => void }

export function RealLocationsPage({ token, userId, businessId, onNavigate, onUnauthorized }: Props) {
  const gateway = useMemo(() => createOperationsGateway(token, userId), [token, userId])
  const active = useRef({ valid: true })
  const assignmentGeneration = useRef(0)
  const [business, setBusiness] = useState<RealBusiness | null>(null)
  const [rows, setRows] = useState<LocationRecord[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [locationForAssignments, setLocationForAssignments] = useState<string | null>(null)
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [draft, setDraft] = useState<LocationInput>(blank)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uncertain, setUncertain] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const gate = active.current
    gate.valid = true
    void Promise.all([
      gateway.business(businessId, controller.signal),
      gateway.locations(businessId, controller.signal),
    ]).then(([company, locations]) => {
      if (controller.signal.aborted || !gate.valid) return
      setBusiness(company); setRows(locations)
    }).catch((err: unknown) => {
      if (controller.signal.aborted || !gate.valid) return
      if (err instanceof ApiHttpError && err.status === 401) onUnauthorized()
      else setError(operationsError(err))
    }).finally(() => {
      if (gate.valid && !controller.signal.aborted) setLoading(false)
    })
    return () => { controller.abort(); gate.valid = false; assignmentGeneration.current += 1 }
  }, [gateway, businessId, onUnauthorized])

  const authorized = !!business && canManageLocations(business)
  const selected = rows.find((row) => row.id === locationForAssignments)
  const eligibleMembers = members.filter((m) =>
    m.status === 'ACTIVA' && (m.role === 'ENCARGADO' || m.role === 'TRABAJADOR'))

  function handleError(err: unknown) {
    if (!active.current.valid) return
    if (err instanceof ApiHttpError && err.status === 401) { onUnauthorized(); return }
    setError(operationsError(err))
    if (err instanceof ApiTransportError && err.outcomeUnknown) setUncertain(true)
  }

  async function refresh() {
    if (busy) return
    setError(''); setNotice('')
    setLoading(true)
    try {
      const [company, locations] = await Promise.all([
        gateway.business(businessId), gateway.locations(businessId),
      ])
      if (!active.current.valid) return
      setBusiness(company); setRows(locations); setUncertain(false)
      if (locationForAssignments) {
        setLocationForAssignments(null); setAssignments([]); setMembers([])
      }
    } catch (err) { handleError(err) }
    finally { if (active.current.valid) setLoading(false) }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!authorized || busy || uncertain) return
    setBusy(true); setError(''); setNotice('')
    const normalized: LocationInput = { ...draft, name: draft.name.trim(), address: draft.address.trim(), map_url: draft.map_url.trim() }
    try {
      const saved = editingId
        ? await gateway.updateLocation(businessId, editingId, normalized)
        : await gateway.createLocation(businessId, normalized)
      if (!active.current.valid) return
      setRows((old) => editingId ? old.map((item) => item.id === saved.id ? saved : item) : [...old, saved])
      setEditingId(null); setCreating(false); setDraft(blank)
      setNotice('Ubicación confirmada en PostgreSQL.')
    } catch (err) { handleError(err) }
    finally { if (active.current.valid) setBusy(false) }
  }

  async function mutateLocation(row: LocationRecord, command: 'primary' | 'status') {
    if (!authorized || busy || uncertain) return
    if (command === 'status' && !window.confirm(
      row.status === 'ACTIVA' ? 'Pausar esta ubicación puede impedir operaciones y quitar su condición principal. ¿Continuar?' : '¿Reactivar esta ubicación?'
    )) return
    setError(''); setNotice(''); setBusy(true)
    try {
      const saved = command === 'primary' ? await gateway.makePrimary(businessId, row.id)
        : await gateway.setLocationStatus(businessId, row.id, row.status === 'ACTIVA' ? 'PAUSADA' : 'ACTIVA')
      if (!active.current.valid) return
      // A change of primary affects the previous primary too. Re-read the full set.
      const updated = await gateway.locations(businessId)
      if (!active.current.valid) return
      setRows(updated)
      setNotice(saved.is_primary ? 'Sede principal actualizada.' : 'Estado de la sede actualizado.')
    } catch (err) { handleError(err) }
    finally { if (active.current.valid) setBusy(false) }
  }

  function openEdit(row: LocationRecord) {
    setDraft({ name: row.name, kind: row.kind, address: row.address, map_url: row.map_url,
      can_sell: row.can_sell, can_store: row.can_store })
    setEditingId(row.id); setCreating(true); setError(''); setNotice('')
  }

  async function openAssignments(location: LocationRecord) {
    if (!authorized) return
    const generation = ++assignmentGeneration.current
    setLocationForAssignments(location.id); setLoadingAssignments(true)
    setAssignments([]); setMembers([]); setError(''); setNotice('')
    try {
      const [assigned, team] = await Promise.all([
        gateway.assignments(businessId, location.id), gateway.team(businessId),
      ])
      if (!active.current.valid || generation !== assignmentGeneration.current) return
      setAssignments(assigned); setMembers(team)
    } catch (err) {
      if (generation === assignmentGeneration.current) handleError(err)
    } finally {
      if (active.current.valid && generation === assignmentGeneration.current) setLoadingAssignments(false)
    }
  }

  async function changeAssignment(member: TeamMember, status: 'ACTIVA'|'REVOCADA') {
    if (!selected || !authorized || busy) return
    const locationId = selected.id
    const generation = assignmentGeneration.current
    setError(''); setNotice(''); setBusy(true)
    try {
      const updated = await gateway.setAssignment(businessId, locationId, member.id, status)
      if (!active.current.valid || generation !== assignmentGeneration.current) return
      setAssignments((old) => [...old.filter((a) => a.membership_id !== updated.membership_id), updated])
      setNotice(status === 'ACTIVA' ? 'Asignación activada.' : 'Asignación revocada.')
    } catch (err) { if (generation === assignmentGeneration.current) handleError(err) }
    finally { if (active.current.valid) setBusy(false) }
  }

  return <section className="real-auth-card real-business-panel">
    <nav className="real-business-nav" aria-label="Navegación de empresa">
      <button type="button" className="real-auth-link" onClick={() => onNavigate('/real/empresas/' + businessId)}>Empresa</button>
      <button type="button" className="real-auth-link" onClick={() => onNavigate('/real/empresas/' + businessId + '/equipo')}>Equipo</button>
      <button type="button" className="real-auth-link" onClick={() => onNavigate('/real/empresas')}>Mis empresas</button>
    </nav>
    <span className="real-auth-eyebrow">E2-7 · T04 · Ubicaciones REAL</span>
    <h1>Ubicaciones</h1>
    <p>Datos consultados por empresa y membresía en PostgreSQL. No se utilizan ubicaciones DEMO.</p>
    {loading && <p role="status">Cargando ubicaciones…</p>}
    {!loading && business && <>
      <div className="real-ops-toolbar"><strong>{business.name}</strong><button className="real-auth-secondary" onClick={() => void refresh()} disabled={busy}>Actualizar listado</button></div>
      {rows.length === 0 && <div className="real-business-empty">Todavía no hay ubicaciones en esta empresa.</div>}
      <div className="real-business-grid">
        {rows.map((loc) => <article className="real-business-tile real-ops-tile" key={loc.id}>
          <strong>{loc.name} {loc.is_primary ? '· Principal' : ''}</strong>
          <span>{loc.kind} · {loc.status}</span>
          <span>{loc.address || 'Dirección sin informar'}</span>
          <small>{loc.can_sell ? 'Permite ventas' : 'Sin ventas'} · {loc.can_store ? 'Permite stock' : 'Sin stock'}</small>
          {loc.map_url && <a href={loc.map_url} target="_blank" rel="noopener noreferrer">Abrir Google Maps</a>}
          {authorized && <div className="real-auth-actions">
            <button className="real-auth-secondary" type="button" disabled={busy} onClick={() => openEdit(loc)}>Editar</button>
            <button className="real-auth-secondary" type="button" disabled={busy || uncertain} onClick={() => void mutateLocation(loc, 'status')}>{loc.status === 'ACTIVA' ? 'Pausar' : 'Reactivar'}</button>
            {loc.status === 'ACTIVA' && !loc.is_primary && <button className="real-auth-secondary" type="button" disabled={busy || uncertain} onClick={() => void mutateLocation(loc, 'primary')}>Hacer principal</button>}
            <button className="real-auth-secondary" type="button" disabled={busy} onClick={() => void openAssignments(loc)}>Asignaciones</button>
          </div>}
        </article>)}
      </div>
      {authorized && !creating && <button className="real-auth-primary" type="button" disabled={busy || uncertain} onClick={() => { setDraft(blank); setEditingId(null); setCreating(true); setError('') }}>Crear ubicación real</button>}
      {authorized && creating && <form className="real-auth-form real-ops-form" onSubmit={(e) => void save(e)}>
        <h2>{editingId ? 'Editar ubicación' : 'Nueva ubicación'}</h2>
        <label>Nombre<input required minLength={2} maxLength={80} value={draft.name} onChange={(e) => setDraft((old) => ({ ...old, name:e.target.value }))}/></label>
        <label>Tipo<select value={draft.kind} onChange={(e) => setDraft((old) => ({ ...old, kind:e.target.value as LocationKind }))}>{kinds.map(k=><option value={k} key={k}>{k}</option>)}</select></label>
        <label>Dirección<input maxLength={160} value={draft.address} onChange={(e) => setDraft((old) => ({ ...old, address:e.target.value }))}/></label>
        <label>Google Maps (URL HTTPS permitida)<input type="url" maxLength={2048} placeholder="https://www.google.com/maps/…" value={draft.map_url} onChange={(e) => setDraft((old) => ({ ...old, map_url:e.target.value }))}/></label>
        <label className="real-ops-check"><input type="checkbox" checked={draft.can_sell} onChange={(e) => setDraft((old) => ({ ...old, can_sell:e.target.checked }))}/> Permitir ventas</label>
        <label className="real-ops-check"><input type="checkbox" checked={draft.can_store} onChange={(e) => setDraft((old) => ({ ...old, can_store:e.target.checked }))}/> Permitir inventario</label>
        <div className="real-auth-actions">
          <button className="real-auth-primary" type="submit" disabled={busy || uncertain}>{busy ? 'Guardando…' : 'Guardar en PostgreSQL'}</button>
          <button className="real-auth-secondary" type="button" onClick={() => { setCreating(false); setEditingId(null) }} disabled={busy}>Cancelar</button>
        </div>
      </form>}
      {authorized && selected && <section className="real-ops-subpanel" aria-label="Asignaciones de sede">
        <h2>Asignaciones de {selected.name}</h2>
        {loadingAssignments ? <p role="status">Consultando asignaciones…</p> : <>
          <p>Solo se asignan miembros activos con rol Encargado o Trabajador.</p>
          {eligibleMembers.length === 0 && <p>Aún no hay trabajadores disponibles. Podés invitarlos desde Equipo.</p>}
          {eligibleMembers.map((member) => {
            const row = assignments.find((a) => a.membership_id === member.id)
            const activeAssignment = row?.status === 'ACTIVA'
            return <div className="real-ops-person" key={member.id}>
              <div><strong>{member.display_name}</strong><small>{member.role} · {activeAssignment ? 'ASIGNADO' : 'NO ASIGNADO'}</small></div>
              <button className="real-auth-secondary" type="button" disabled={busy} onClick={() => void changeAssignment(member, activeAssignment ? 'REVOCADA' : 'ACTIVA')}>{activeAssignment ? 'Revocar asignación' : 'Asignar a sede'}</button>
            </div>
          })}
        </>}
        <button className="real-auth-link" type="button" onClick={() => { assignmentGeneration.current++; setLocationForAssignments(null) }}>Cerrar asignaciones</button>
      </section>}
    </>}
    {uncertain && <p className="real-auth-message real-ops-warning" role="alert">Resultado de escritura incierto. Consultá el estado actualizado antes de repetir; no se enviará otra solicitud automáticamente. <button className="real-auth-link" type="button" onClick={() => void refresh()}>Reconsultar ubicaciones</button></p>}
    {notice && <p className="real-auth-message" role="status">{notice}</p>}
    {error && <p className="real-auth-message real-auth-error" role="alert">{error}</p>}
  </section>
}
