import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../app/Icon.tsx'
import './realPeopleOperations.css'
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
  const backButtonRef = useRef<HTMLButtonElement>(null)
  const listHeadingRef = useRef<HTMLHeadingElement>(null)
  const previousView = useRef<'list' | 'editor' | 'assignments'>('list')
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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'TODAS' | 'ACTIVA' | 'PAUSADA'>('TODAS')

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
    return () => { controller.abort(); gate.valid = false }
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
      assignmentGeneration.current += 1
      setLocationForAssignments(null); setAssignments([]); setMembers([]); setLoadingAssignments(false)
      setCreating(false); setEditingId(null); setDraft(blank)
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

  function openCreate() {
    if (!authorized || busy || uncertain) return
    setDraft(blank); setEditingId(null); setCreating(true); setError(''); setNotice('')
  }

  function closeSubview() {
    if (busy) return
    assignmentGeneration.current += 1
    setCreating(false); setEditingId(null); setDraft(blank)
    setLocationForAssignments(null); setAssignments([]); setMembers([]); setLoadingAssignments(false)
    setError(''); setNotice('')
  }

  function openEdit(row: LocationRecord) {
    if (!authorized || busy || uncertain) return
    assignmentGeneration.current += 1
    setLocationForAssignments(null)
    setDraft({ name: row.name, kind: row.kind, address: row.address, map_url: row.map_url,
      can_sell: row.can_sell, can_store: row.can_store })
    setEditingId(row.id); setCreating(true); setError(''); setNotice('')
  }

  async function openAssignments(location: LocationRecord) {
    if (!authorized || busy) return
    setCreating(false); setEditingId(null); setDraft(blank)
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

  const visibleRows = rows.filter((loc) =>
    (statusFilter === 'TODAS' || loc.status === statusFilter)
    && [loc.name, loc.kind, loc.address].some((value) => value.toLocaleLowerCase('es-AR').includes(search.trim().toLocaleLowerCase('es-AR'))))
  const activeCount = rows.filter((loc) => loc.status === 'ACTIVA').length

  const locationView = creating ? 'editor' : locationForAssignments ? 'assignments' : 'list'
  const focusLocation = rows.find((row) => row.id === (editingId ?? locationForAssignments))
  useEffect(() => {
    if (locationView === previousView.current) return
    if (locationView === 'list') listHeadingRef.current?.focus()
    else backButtonRef.current?.focus()
    previousView.current = locationView
  }, [locationView])

  return <section className="real-auth-card real-business-panel e3-ops-page e3-locations-page e3-location-workspace">
    {locationView === 'list' && <>
    <nav className="real-business-nav" aria-label="Navegación de empresa">
      <button type="button" className="real-auth-link" onClick={() => onNavigate('/real/empresas/' + businessId)}>Empresa</button>
      <button type="button" className="real-auth-link" onClick={() => onNavigate('/real/empresas/' + businessId + '/equipo')}>Equipo</button>
      <button type="button" className="real-auth-link" onClick={() => onNavigate('/real/empresas')}>Mis empresas</button>
    </nav>
    </>}
    {locationView !== 'list' && <div className="e3-location-subview-backbar">
      <button ref={backButtonRef} type="button" className="e3-location-back-button" onClick={closeSubview} disabled={busy}>
        <Icon name="arrow-left" size={19}/>Volver a ubicaciones
      </button>
      <span className="e3-location-view-badge">{locationView === 'editor' ? 'Edición de sede' : 'Personal y accesos'}</span>
    </div>}
    {locationView === 'list' ? <header className="e3-ops-heading">
      <div className="e3-ops-heading-icon"><Icon name="pin" size={29}/></div>
      <div className="e3-ops-heading-copy">
        <span className="e3-ops-kicker">Organización · Sedes</span>
        <h1 ref={listHeadingRef} tabIndex={-1}>Ubicaciones</h1>
        <p>Administrá los lugares donde vendés y guardás mercadería.</p>
      </div>
      {authorized && <button className="real-auth-primary e3-ops-heading-cta" type="button" disabled={busy || uncertain} onClick={openCreate}><Icon name="plus" size={17}/>Crear ubicación real</button>}
    </header> : <header className="e3-ops-heading e3-location-subview-header">
      <div className="e3-ops-heading-icon"><Icon name={locationView === 'editor' ? 'pin' : 'users'} size={29}/></div>
      <div className="e3-ops-heading-copy">
        <span className="e3-ops-kicker">{business?.name ?? 'Empresa'} · Ubicaciones</span>
        <h1>{locationView === 'editor' ? (editingId ? 'Editar ubicación' : 'Nueva ubicación') : 'Asignaciones de sede'}</h1>
        <p>{locationView === 'editor' ? (focusLocation?.name ?? 'Nueva sede') : (selected?.name ?? 'Sede seleccionada')}</p>
      </div>
    </header>}
    {loading && <p role="status">Cargando ubicaciones…</p>}
    {uncertain && <p className="real-auth-message real-ops-warning" role="alert">Resultado de escritura incierto. Consultá el estado actualizado antes de repetir; no se enviará otra solicitud automáticamente. <button className="real-auth-link" type="button" onClick={() => void refresh()}>Reconsultar ubicaciones</button></p>}
    {notice && <p className="real-auth-message" role="status">{notice}</p>}
    {error && <p className="real-auth-message real-auth-error" role="alert">{error}</p>}
    {!loading && business && <>
      {locationView === 'list' && <>
      <div className="e3-ops-context">
        <span>Empresa: <strong>{business.name}</strong></span>
        <button className="real-auth-secondary" type="button" onClick={() => void refresh()} disabled={busy}>Actualizar listado</button>
      </div>
      <div className="e3-ops-summary" aria-label="Resumen de ubicaciones">
        <div className="e3-ops-stat"><span>Total de sedes</span><strong>{rows.length}</strong></div>
        <div className="e3-ops-stat"><span>Activas</span><strong>{activeCount}</strong></div>
        <div className="e3-ops-stat"><span>Pausadas</span><strong>{rows.length - activeCount}</strong></div>
        <div className="e3-ops-stat"><span>Sede principal</span><strong className="e3-ops-stat-name">{rows.find((loc) => loc.is_primary)?.name ?? 'Sin definir'}</strong></div>
      </div>
      {rows.length > 0 && <div className="e3-ops-filterbar">
        <label className="e3-ops-search"><Icon name="search" size={18}/><span className="e3-ops-visually-hidden">Buscar ubicaciones</span>
          <input type="search" aria-label="Buscar ubicaciones" placeholder="Buscar por nombre, tipo o dirección" value={search} onChange={(e) => setSearch(e.target.value)}/></label>
        <label className="e3-ops-filter-label">Estado
          <select aria-label="Filtrar ubicaciones por estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="TODAS">Todas</option><option value="ACTIVA">Activas</option><option value="PAUSADA">Pausadas</option>
          </select>
        </label>
      </div>}
      {rows.length === 0 && <div className="real-business-empty e3-ops-empty"><Icon name="pin" size={30}/><strong>Tu empresa todavía no tiene ubicaciones</strong><p>Creá una sede para empezar a organizar ventas e inventario, según sus permisos.</p></div>}
      {rows.length > 0 && visibleRows.length === 0 && <div className="real-business-empty e3-ops-empty"><strong>No encontramos sedes con esos filtros.</strong><p>Probá otra búsqueda o seleccioná «Todas».</p></div>}
      <div className="real-business-grid e3-ops-card-grid">
        {visibleRows.map((loc) => <article className="real-business-tile real-ops-tile e3-ops-location-card" key={loc.id}>
          <div className="e3-ops-card-top">
            <span className="e3-ops-location-icon"><Icon name="pin" size={21}/></span>
            <div className="e3-ops-card-flags">
              {loc.is_primary && <span className="e3-ops-pill e3-ops-pill-primary">Principal</span>}
              <span className={'e3-ops-pill ' + (loc.status === 'ACTIVA' ? 'e3-ops-pill-active' : 'e3-ops-pill-paused')}>{loc.status}</span>
            </div>
          </div>
          <div className="e3-ops-card-title"><strong>{loc.name}</strong><span>{loc.kind.replaceAll('_', ' ')}</span></div>
          <p className="e3-ops-address">{loc.address || 'Dirección sin informar'}</p>
          <div className="e3-ops-capabilities">
            <span className={loc.can_sell ? 'e3-ops-capability-on' : ''}><Icon name="receipt" size={15}/>{loc.can_sell ? 'Ventas habilitadas' : 'Sin ventas'}</span>
            <span className={loc.can_store ? 'e3-ops-capability-on' : ''}><Icon name="boxes" size={15}/>{loc.can_store ? 'Inventario habilitado' : 'Sin inventario'}</span>
          </div>
          {loc.map_url && <a className="e3-ops-map-link" href={loc.map_url} target="_blank" rel="noopener noreferrer">Ver ubicación en Maps</a>}
          {authorized && <div className="real-auth-actions e3-ops-card-actions">
            <button className="real-auth-secondary" type="button" disabled={busy || uncertain} onClick={() => openEdit(loc)}>Editar</button>
            <button className="real-auth-secondary" type="button" disabled={busy || uncertain} onClick={() => void mutateLocation(loc, 'status')}>{loc.status === 'ACTIVA' ? 'Pausar' : 'Reactivar'}</button>
            {loc.status === 'ACTIVA' && !loc.is_primary && <button className="real-auth-secondary" type="button" disabled={busy || uncertain} onClick={() => void mutateLocation(loc, 'primary')}>Hacer principal</button>}
            <button className="real-auth-secondary" type="button" disabled={busy} onClick={() => void openAssignments(loc)}>Asignaciones</button>
          </div>}
        </article>)}
      </div>
      </>}
      {locationView === 'editor' && authorized && (
        <section className="e3-ops-editor e3-ops-editor-screen" aria-label="Formulario de ubicación">
        <div className="e3-ops-section-heading"><h2>Información de la ubicación</h2><p>Completá los datos de esta sede. Los cambios se guardarán únicamente en la empresa seleccionada.</p></div>
        <form className="real-auth-form real-ops-form e3-ops-form" onSubmit={(e) => void save(e)}>
          <div className="e3-ops-form-grid">
            <label>Nombre<input required minLength={2} maxLength={80} value={draft.name} onChange={(e) => setDraft((old) => ({ ...old, name:e.target.value }))}/></label>
            <label>Tipo<select value={draft.kind} onChange={(e) => setDraft((old) => ({ ...old, kind:e.target.value as LocationKind }))}>{kinds.map(k=><option value={k} key={k}>{k}</option>)}</select></label>
            <label className="e3-ops-wide">Dirección<input maxLength={160} value={draft.address} onChange={(e) => setDraft((old) => ({ ...old, address:e.target.value }))}/></label>
            <label className="e3-ops-wide">Google Maps (URL HTTPS permitida)<input type="url" maxLength={2048} placeholder="https://www.google.com/maps/…" value={draft.map_url} onChange={(e) => setDraft((old) => ({ ...old, map_url:e.target.value }))}/></label>
          </div>
          <div className="e3-ops-toggle-group" aria-label="Capacidades de la sede">
            <label className="real-ops-check"><input type="checkbox" checked={draft.can_sell} onChange={(e) => setDraft((old) => ({ ...old, can_sell:e.target.checked }))}/> Permitir ventas</label>
            <label className="real-ops-check"><input type="checkbox" checked={draft.can_store} onChange={(e) => setDraft((old) => ({ ...old, can_store:e.target.checked }))}/> Permitir inventario</label>
          </div>
          <div className="real-auth-actions e3-ops-form-actions">
            <button className="real-auth-primary" type="submit" disabled={busy || uncertain}>{busy ? 'Guardando…' : 'Guardar en PostgreSQL'}</button>
            <button className="real-auth-secondary" type="button" onClick={closeSubview} disabled={busy}>Cancelar</button>
          </div>
        </form>
      </section>
      )}
      {locationView === 'assignments' && authorized && selected && (
        <section className="real-ops-subpanel e3-ops-assignments e3-ops-assignments-screen" aria-label="Asignaciones de sede">
        <div className="e3-ops-section-heading"><h2>Personal asignado</h2><p>Solo Encargados y Trabajadores activos pueden asignarse a una sede.</p></div>
        {loadingAssignments ? <p role="status">Consultando asignaciones…</p> : <>
          {eligibleMembers.length === 0 && <p>Aún no hay trabajadores disponibles. Podés invitarlos desde Equipo.</p>}
          {eligibleMembers.map((member) => {
            const row = assignments.find((a) => a.membership_id === member.id)
            const activeAssignment = row?.status === 'ACTIVA'
            return <div className="real-ops-person" key={member.id}>
              <div className="e3-ops-person-identity">
                <span className="e3-ops-avatar" aria-hidden="true">{member.display_name.slice(0, 1).toLocaleUpperCase('es-AR')}</span>
                <div><strong>{member.display_name}</strong><small>{member.role.replaceAll('_', ' ')} · {activeAssignment ? 'ASIGNADO' : 'NO ASIGNADO'}</small></div>
              </div>
              <button className="real-auth-secondary" type="button" disabled={busy} onClick={() => void changeAssignment(member, activeAssignment ? 'REVOCADA' : 'ACTIVA')}>{activeAssignment ? 'Revocar asignación' : 'Asignar a sede'}</button>
            </div>
          })}
        </>}
      </section>
      )}
    </>}
  </section>
}
