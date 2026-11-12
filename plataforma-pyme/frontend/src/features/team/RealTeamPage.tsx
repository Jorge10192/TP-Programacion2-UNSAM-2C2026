import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../app/Icon.tsx'
import '../locations/realPeopleOperations.css'
import { ApiHttpError, ApiTransportError } from '../../api/httpClient.ts'
import { createOperationsGateway, operationsError, canReadTeam, canManageTeam, canManageLocations } from '../businesses/realOperationsGateway.ts'
import type { InvitationIssued, InvitationInput, TeamMember, MemberChanges } from '../businesses/realOperationsGateway.ts'
import type { RealBusiness } from '../businesses/businessGateway.ts'
import { RealSetupGuide } from '../onboarding/RealSetupGuide.tsx'
import { teamSetupSuggestion } from '../onboarding/realSetupGuidance.ts'

const roles = ['ADMINISTRADOR', 'ENCARGADO', 'TRABAJADOR'] as const
const roleLabels: Record<(typeof roles)[number], string> = {
  ADMINISTRADOR: 'Administrador',
  ENCARGADO: 'Encargado',
  TRABAJADOR: 'Trabajador',
}
type Props = { token: string; userId: string; businessId: string; onNavigate: (route: string) => void; onUnauthorized: () => void }

export function RealTeamPage({ token, userId, businessId, onNavigate, onUnauthorized }: Props) {
  const gateway = useMemo(() => createOperationsGateway(token, userId), [token, userId])
  const active = useRef({ valid: true })
  const [company, setCompany] = useState<RealBusiness | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [invite, setInvite] = useState<InvitationInput>({ email: '', role: 'TRABAJADOR' })
  const [issued, setIssued] = useState<InvitationIssued | null>(null)
  // H3: visual disclosure only; issuing still requires submitting the explicit form.
  const [inviteOpen, setInviteOpen] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ACTIVA' | 'INACTIVA'>('TODOS')

  useEffect(() => {
    const controller = new AbortController()
    const gate = active.current
    gate.valid = true
    void gateway.business(businessId, controller.signal).then(async (business) => {
      if (controller.signal.aborted || !gate.valid) return
      setCompany(business)
      // Backend separately authorizes team.read: never request or display team for workers.
      if (canReadTeam(business)) {
        const list = await gateway.team(businessId, controller.signal)
        if (!controller.signal.aborted && gate.valid) setMembers(list)
      }
    }).catch((err: unknown) => {
      if (controller.signal.aborted || !gate.valid) return
      if (err instanceof ApiHttpError && err.status === 401) onUnauthorized()
      else setError(operationsError(err))
    }).finally(() => {
      if (!controller.signal.aborted && gate.valid) setLoading(false)
    })
    return () => { controller.abort(); gate.valid = false }
  }, [gateway, businessId, onUnauthorized])

  function problem(err: unknown) {
    if (!active.current.valid) return
    if (err instanceof ApiHttpError && err.status === 401) { onUnauthorized(); return }
    setError(operationsError(err))
    if (err instanceof ApiTransportError && err.outcomeUnknown) setUncertain(true)
  }

  async function reload() {
    if (busy) return
    setError(''); setNotice(''); setLoading(true)
    try {
      const business = await gateway.business(businessId)
      if (!active.current.valid) return
      setCompany(business)
      if (canReadTeam(business)) {
        const list = await gateway.team(businessId)
        if (!active.current.valid) return
        setMembers(list)
      } else setMembers([])
      setUncertain(false)
    } catch (err) { problem(err) }
    finally { if (active.current.valid) setLoading(false) }
  }

  async function issue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!company || !canManageLocations(company) || busy || uncertain) return
    setBusy(true); setIssued(null); setError(''); setNotice('')
    try {
      const result = await gateway.invite(businessId, { email: invite.email.trim(), role: invite.role })
      if (!active.current.valid) return
      setIssued(result)
      setInvite({ email: '', role: 'TRABAJADOR' })
      setNotice('Invitación emitida. Entregá el código al destinatario por un canal seguro. Este código no se podrá consultar nuevamente.')
    } catch (err) { problem(err) }
    finally { if (active.current.valid) setBusy(false) }
  }

  async function changeMember(member: TeamMember, changes: MemberChanges) {
    if (!company || !canManageTeam(company) || member.user_id === userId || busy || uncertain) return
    const action = changes.status === 'INACTIVA' ? 'Desactivar la membresía de este usuario' : changes.role ? 'Cambiar el rol de ' + member.display_name + ' a ' + roleLabels[changes.role] : 'Reactivar la membresía'
    if (!window.confirm(action + ' en ' + company.name + '?')) return
    setError(''); setNotice(''); setBusy(true)
    try {
      const updated = await gateway.changeMember(businessId, member.id, changes)
      if (!active.current.valid) return
      setMembers((old) => old.map((row) => row.id === updated.id ? updated : row))
      setNotice('Membresía actualizada en PostgreSQL.')
    } catch (err) { problem(err) }
    finally { if (active.current.valid) setBusy(false) }
  }

  const canInvite = !!company && canManageLocations(company)
  const canManage = !!company && canManageTeam(company)

  const visibleMembers = members.filter((member) =>
    (statusFilter === 'TODOS' || member.status === statusFilter)
    && [member.display_name, member.email, member.role, member.job_title ?? '']
      .some((value) => value.toLocaleLowerCase('es-AR').includes(search.trim().toLocaleLowerCase('es-AR'))))
  const activeMembers = members.filter((member) => member.status === 'ACTIVA').length
  const setupSuggestion = teamSetupSuggestion({
    verified: !loading && !error && !uncertain && !!company,
    canRead: !!company && canReadTeam(company),
    onlySelf: members.length === 1 && members[0].user_id === userId,
    canInvite,
  })

  return <section className="real-auth-card real-business-panel e3-ops-page e3-team-page">
    <nav className="real-business-nav" aria-label="Navegación de empresa">
      <button type="button" className="real-auth-link" onClick={() => onNavigate('/real/empresas/' + businessId)}>Empresa</button>
      <button type="button" className="real-auth-link" onClick={() => onNavigate('/real/empresas/' + businessId + '/ubicaciones')}>Ubicaciones</button>
      <button type="button" className="real-auth-link" onClick={() => onNavigate('/real/empresas/' + businessId + '/inicio')}>Primeros pasos</button>
      <button type="button" className="real-auth-link" onClick={() => onNavigate('/real/empresas')}>Mis empresas</button>
    </nav>
    <header className="e3-ops-heading">
      <div className="e3-ops-heading-icon"><Icon name="users" size={29}/></div>
      <div className="e3-ops-heading-copy">
        <span className="e3-ops-kicker">Organización · Personas</span>
        <h1>Equipo e invitaciones</h1>
        <p>Consultá integrantes, roles y accesos de esta empresa.</p>
      </div>
      {company && <button className="real-auth-secondary e3-ops-heading-cta" type="button" disabled={busy} onClick={() => void reload()}>Actualizar equipo</button>}
    </header>
    {loading && <p role="status">Comprobando permisos del equipo…</p>}
    {!loading && company && <>
      <div className="e3-ops-context"><span>Empresa: <strong>{company.name}</strong></span>
        <span className="e3-ops-context-note">Los permisos se verifican en FastAPI</span>
      </div>
      {!canReadTeam(company) ? <div className="e3-ops-restricted" role="status">
        <Icon name="shield" size={25}/><div><strong>El directorio de equipo es privado</strong>
        <p>Tu rol permite consultar la empresa, pero no acceder al listado de integrantes. Solicitá acceso a un administrador.</p></div>
      </div> : <>
        <RealSetupGuide suggestion={setupSuggestion} businessId={businessId} onNavigate={onNavigate}/>
        <div className="e3-ops-summary" aria-label="Resumen de equipo">
          <div className="e3-ops-stat"><span>Integrantes</span><strong>{members.length}</strong></div>
          <div className="e3-ops-stat"><span>Activos</span><strong>{activeMembers}</strong></div>
          <div className="e3-ops-stat"><span>Inactivos</span><strong>{members.length - activeMembers}</strong></div>
        </div>
        {members.length > 0 && <div className="e3-ops-filterbar">
          <label className="e3-ops-search"><Icon name="search" size={18}/><span className="e3-ops-visually-hidden">Buscar integrantes</span>
            <input type="search" aria-label="Buscar integrantes" placeholder="Buscar por nombre, correo o rol" value={search} onChange={(e) => setSearch(e.target.value)}/></label>
          <label className="e3-ops-filter-label">Estado
            <select aria-label="Filtrar integrantes por estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
              <option value="TODOS">Todos</option><option value="ACTIVA">Activos</option><option value="INACTIVA">Inactivos</option>
            </select>
          </label>
        </div>}
        {members.length === 0 && <div className="real-business-empty e3-ops-empty"><Icon name="users" size={30}/><strong>No hay integrantes para mostrar</strong><p>El servidor todavía no devolvió membresías de esta empresa.</p></div>}
        {members.length > 0 && visibleMembers.length === 0 && <div className="real-business-empty e3-ops-empty"><strong>No encontramos integrantes con esos filtros.</strong><p>Probá otra búsqueda o seleccioná «Todos».</p></div>}
        {canManage && <p className="e3-ops-role-guidance"><strong>Cambios internos:</strong> como titular administrativo podés modificar el rol de un integrante existente, incluso ascenderlo a Administrador. La operación solicita confirmación.</p>}
        <div className="real-ops-list e3-ops-directory">
          {visibleMembers.map((member) => <article className="real-ops-person e3-ops-member" key={member.id}>
            <div className="e3-ops-person-identity">
              <span className="e3-ops-avatar" aria-hidden="true">{member.display_name.slice(0, 1).toLocaleUpperCase('es-AR')}</span>
              <div className="real-ops-person-info">
                <div className="e3-ops-person-name"><strong>{member.display_name}</strong>
                  {member.user_id === userId && <span className="e3-ops-self">Tu cuenta</span>}
                </div>
                <span>{member.email}</span>
                {member.job_title && <small>Función: {member.job_title}</small>}
                <div className="e3-ops-person-flags">
                  <span className="e3-ops-pill e3-ops-pill-role">{member.role.replaceAll('_', ' ')}</span>
                  <span className={'e3-ops-pill ' + (member.status === 'ACTIVA' ? 'e3-ops-pill-active' : 'e3-ops-pill-paused')}>{member.status}</span>
                </div>
              </div>
            </div>
            {canManage && member.user_id !== userId && member.role !== 'TITULAR_ADMINISTRATIVO' && <div className="real-ops-member-actions e3-ops-member-actions">
              <label>Rol
                <select disabled={busy || uncertain || member.status !== 'ACTIVA'} value={member.role} onChange={(e) => void changeMember(member, { role: e.target.value as MemberChanges['role'] })}>
                  {roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
                </select>
              </label>
              <button className="real-auth-secondary" type="button" disabled={busy || uncertain} onClick={() => void changeMember(member, { status: member.status === 'ACTIVA' ? 'INACTIVA' : 'ACTIVA' })}>{member.status === 'ACTIVA' ? 'Desactivar' : 'Reactivar'}</button>
            </div>}
          </article>)}
        </div>
      </>}
      {canInvite && <section className="real-ops-subpanel e3-ops-invite" aria-label="Invitar a un colaborador">
        <div className="e3-ops-section-heading e3-ops-invite-heading">
          <h2><button type="button" className="e3-ops-invite-toggle"
            aria-expanded={inviteOpen} aria-controls="real-team-invite-content"
            disabled={busy} onClick={() => setInviteOpen(open => !open)}>
            <Icon name="plus" size={19}/>
            <span>Invitar a un colaborador</span>
            <Icon name="chevron" size={20} className={'e3-ops-invite-chevron' + (inviteOpen ? ' e3-ops-invite-chevron-open' : '')}/>
          </button></h2>
          <p>Generá un código de un solo uso. La plataforma no envía correos automáticamente: compartilo por un canal seguro.</p>
        </div>
        <div id="real-team-invite-content" className="e3-ops-invite-content" hidden={!inviteOpen}>
        <form className="real-auth-form real-ops-form e3-ops-form" onSubmit={(e) => void issue(e)}>
          <div className="e3-ops-form-grid">
            <label>Correo del destinatario<input type="email" autoComplete="off" required value={invite.email} onChange={(e) => setInvite((old) => ({ ...old, email: e.target.value }))}/></label>
            <label>Rol propuesto<select value={invite.role} onChange={(e) => setInvite((old) => ({ ...old, role: e.target.value as InvitationInput['role'] }))}>
              <option value="TRABAJADOR">Trabajador</option><option value="ENCARGADO">Encargado</option>
            </select></label>
          </div>
          <p className="e3-ops-role-guidance"><strong>Roles para nuevos colaboradores:</strong> Trabajador o Encargado. Si más adelante necesitás designarlo Administrador, el titular administrativo puede cambiar su rol una vez que haya aceptado la invitación.</p>
          <div className="real-auth-actions e3-ops-form-actions"><button className="real-auth-primary" type="submit" disabled={busy || uncertain}>{busy ? 'Emitiendo…' : 'Emitir invitación REAL'}</button></div>
        </form>
        {issued && <div className="real-ops-secret" role="status">
          <strong>Invitación emitida para {issued.email}</strong>
          <p>Expira: {new Date(issued.expires_at).toLocaleString('es-AR')}.</p>
          <label>Código de invitación — visible solo ahora<input aria-label="Código de invitación emitido" type="text" readOnly value={issued.invitation_token}/></label>
          <div className="real-auth-actions">
            <button className="real-auth-secondary" type="button" onClick={() => {
              void navigator.clipboard.writeText(issued.invitation_token).then(
                () => setNotice('Código copiado. Enviáselo solo al destinatario correspondiente.'),
                () => setError('No se pudo copiar automáticamente. Seleccioná el código para copiarlo manualmente.'),
              )
            }}>Copiar código</button>
            <button className="real-auth-secondary" type="button" onClick={() => setIssued(null)}>Ocultar código</button>
          </div>
          <p>El destinatario debe entrar con su propia cuenta y pegar el código desde «Ingresar código de invitación».</p>
        </div>}
        </div>
      </section>}
    </>}
    {uncertain && <p className="real-auth-message real-ops-warning" role="alert">La respuesta de la escritura se perdió o no pudo validarse. No repitas la operación automáticamente: consultá el estado actualizado. En una invitación podría haberse consumido el único código emitido. <button className="real-auth-link" type="button" onClick={() => void reload()}>Reconsultar equipo</button></p>}
    {notice && <p className="real-auth-message" role="status">{notice}</p>}
    {error && <p className="real-auth-message real-auth-error" role="alert">{error}</p>}
  </section>
}
