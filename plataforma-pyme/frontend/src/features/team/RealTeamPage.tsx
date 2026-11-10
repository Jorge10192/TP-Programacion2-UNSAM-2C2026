import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiHttpError, ApiTransportError } from '../../api/httpClient.ts'
import { createOperationsGateway, operationsError, canReadTeam, canManageTeam, canManageLocations } from '../businesses/realOperationsGateway.ts'
import type { InvitationIssued, InvitationInput, TeamMember, MemberChanges } from '../businesses/realOperationsGateway.ts'
import type { RealBusiness } from '../businesses/businessGateway.ts'

const roles = ['ADMINISTRADOR', 'ENCARGADO', 'TRABAJADOR'] as const
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
  const [uncertain, setUncertain] = useState(false)

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
    const action = changes.status === 'INACTIVA' ? 'Desactivar la membresía de este usuario' : changes.role ? 'Cambiar el rol de este usuario' : 'Reactivar la membresía'
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

  return <section className="real-auth-card real-business-panel">
    <nav className="real-business-nav" aria-label="Navegación de empresa">
      <button type="button" className="real-auth-link" onClick={() => onNavigate('/real/empresas/' + businessId)}>Empresa</button>
      <button type="button" className="real-auth-link" onClick={() => onNavigate('/real/empresas/' + businessId + '/ubicaciones')}>Ubicaciones</button>
      <button type="button" className="real-auth-link" onClick={() => onNavigate('/real/empresas')}>Mis empresas</button>
    </nav>
    <span className="real-auth-eyebrow">E2-7 · T04 · Equipo REAL</span>
    <h1>Equipo e invitaciones</h1>
    <p>La identidad, roles y membresías provienen exclusivamente de la empresa REAL seleccionada.</p>
    {loading && <p role="status">Comprobando permisos del equipo…</p>}
    {!loading && company && <>
      <div className="real-ops-toolbar">
        <strong>{company.name}</strong>
        <button className="real-auth-secondary" type="button" disabled={busy} onClick={() => void reload()}>Actualizar equipo</button>
      </div>
      {!canReadTeam(company) ? <p className="real-auth-note">Tu rol permite consultar la empresa, pero no acceder al listado privado de su equipo. Los permisos se verifican en FastAPI.</p>
      : <>
        {members.length === 0 && <div className="real-business-empty">El servidor no devolvió integrantes del equipo.</div>}
        <div className="real-ops-list">
          {members.map((member) => <article className="real-ops-person" key={member.id}>
            <div className="real-ops-person-info">
              <strong>{member.display_name}</strong>
              <span>{member.email}</span>
              <small>{member.role.replaceAll('_', ' ')} · {member.status} {member.user_id === userId ? '(tu cuenta)' : ''}</small>
              {member.job_title && <small>Función: {member.job_title}</small>}
            </div>
            {canManage && member.user_id !== userId && member.role !== 'TITULAR_ADMINISTRATIVO' && <div className="real-ops-member-actions">
              <label>Rol
                <select disabled={busy || uncertain || member.status !== 'ACTIVA'} value={member.role} onChange={(e) => void changeMember(member, { role: e.target.value as MemberChanges['role'] })}>
                  {roles.map((role) => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}
                </select>
              </label>
              <button className="real-auth-secondary" type="button" disabled={busy || uncertain} onClick={() => void changeMember(member, { status: member.status === 'ACTIVA' ? 'INACTIVA' : 'ACTIVA' })}>{member.status === 'ACTIVA' ? 'Desactivar' : 'Reactivar'}</button>
            </div>}
          </article>)}
        </div>
      </>}
      {canInvite && <section className="real-ops-subpanel">
        <h2>Invitar a un colaborador</h2>
        <p>La API emite un código de uso único para el correo indicado. No envía automáticamente un email: compartilo de manera segura con el destinatario.</p>
        <form className="real-auth-form real-ops-form" onSubmit={(e) => void issue(e)}>
          <label>Correo del destinatario<input type="email" autoComplete="off" required value={invite.email} onChange={(e) => setInvite((old) => ({ ...old, email: e.target.value }))}/></label>
          <label>Rol propuesto<select value={invite.role} onChange={(e) => setInvite((old) => ({ ...old, role: e.target.value as InvitationInput['role'] }))}>
            <option value="TRABAJADOR">Trabajador</option><option value="ENCARGADO">Encargado</option>
          </select></label>
          <button className="real-auth-primary" type="submit" disabled={busy || uncertain}>{busy ? 'Emitiendo…' : 'Emitir invitación REAL'}</button>
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
          <p>El destinatario debe entrar con su propia cuenta y pegar el código en «Aceptar invitación».</p>
        </div>}
      </section>}
    </>}
    {uncertain && <p className="real-auth-message real-ops-warning" role="alert">La respuesta de la escritura se perdió o no pudo validarse. No repitas la operación automáticamente: consultá el estado actualizado. En una invitación podría haberse consumido el único código emitido. <button className="real-auth-link" type="button" onClick={() => void reload()}>Reconsultar equipo</button></p>}
    {notice && <p className="real-auth-message" role="status">{notice}</p>}
    {error && <p className="real-auth-message real-auth-error" role="alert">{error}</p>}
  </section>
}
