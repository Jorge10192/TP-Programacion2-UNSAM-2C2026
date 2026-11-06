import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../app/Icon'
import { demoGateway, profileInitials } from '../../data/demo/demoStore'
import type { DemoBusiness, DemoInvitation, DemoMembership, DemoProfile, DemoTeamMember } from '../../data/demo/demoStore'
import { displayInvitationStatus, inviteRoleLabels } from '../../data/demo/teamPolicy'
import type { InvitationDisplayStatus, InviteRole } from '../../data/demo/teamPolicy'

const statusLabels: Record<InvitationDisplayStatus, string> = {
  PENDIENTE: 'Pendiente',
  ACEPTADA: 'Aceptada en DEMO',
  RECHAZADA: 'Rechazada en DEMO',
  CANCELADA: 'Cancelada',
  EXPIRADA: 'Vencida',
}

export function TeamPage({
  business,
  profile,
  owner,
  members,
  invitations,
}: {
  business: DemoBusiness
  profile: DemoProfile
  owner: DemoMembership
  members: DemoTeamMember[]
  invitations: DemoInvitation[]
}) {
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InviteRole>('TRABAJADOR')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [responseId, setResponseId] = useState<string | null>(null)

  const pending = invitations.filter((item) => displayInvitationStatus(item) === 'PENDIENTE')
  const activeMembers = 1 + members.length

  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await demoGateway.createInvitation(business.id, email, role)
      setEmail('')
      setRole('TRABAJADOR')
      setShowForm(false)
      setNotice('Invitación DEMO registrada como pendiente. No se envió ningún correo ni se concedió acceso.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible registrar la invitación.')
    } finally {
      setBusy(false)
    }
  }

  async function updateInvitation(invitation: DemoInvitation, action: 'ACEPTAR' | 'RECHAZAR' | 'CANCELAR') {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (action === 'CANCELAR') {
        await demoGateway.cancelInvitation(business.id, invitation.id)
        setNotice('Invitación DEMO cancelada. No se agregó ningún integrante.')
      } else {
        await demoGateway.simulateInvitationResponse(business.id, invitation.id, action)
        setNotice(action === 'ACEPTAR'
          ? 'Aceptación simulada: se creó un integrante ficticio en esta empresa, sin cuenta real ni permisos de servidor.'
          : 'Rechazo simulado: no se creó ninguna membresía.')
      }
      setResponseId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el estado de la invitación.')
    } finally {
      setBusy(false)
    }
  }

  return <>
    <div className="page-heading">
      <div><p className="eyebrow">ADMINISTRACIÓN · EMPRESA DEMO</p><h1>Equipo de trabajo</h1><p>Integrantes, funciones e invitaciones de «{business.name}».</p></div>
      <button type="button" className="button button-primary" onClick={() => { setShowForm((old) => !old); setResponseId(null); setError(''); setNotice('') }} disabled={busy}>
        <Icon name={showForm ? 'close' : 'plus'} size={18}/>{showForm ? 'Cerrar formulario' : 'Nueva invitación DEMO'}
      </button>
    </div>

    <section className="team-summary" aria-label="Resumen del equipo">
      <div><span className="feature-icon blue"><Icon name="users" size={21}/></span><span><small>Integrantes activos DEMO</small><strong>{activeMembers}</strong></span></div>
      <div><span className="feature-icon orange"><Icon name="clock" size={21}/></span><span><small>Invitaciones pendientes</small><strong>{pending.length}</strong></span></div>
      <div><span className="feature-icon mint"><Icon name="shield" size={21}/></span><span><small>Titular administrativo inicial</small><strong>1</strong></span></div>
    </section>

    <div className="informational-note team-info-note">
      <Icon name="shield" size={19}/>
      <span>Todo este módulo es una simulación local. No envía correos, no autentica colaboradores y no crea permisos reales. Una invitación pendiente <strong>no</strong> es una membresía activa. Para probar una aceptación, utilizá únicamente correos ficticios como <code>colaborador@ejemplo.invalid</code>.</span>
    </div>

    {error && <p className="form-message error team-feedback" role="alert">{error}</p>}
    {notice && <p className="form-message success team-feedback" role="status">{notice}</p>}

    {showForm && <section className="form-panel team-invite-form">
      <div className="form-panel-header"><span className="feature-icon violet"><Icon name="plus"/></span><div><h2>Preparar invitación nominativa</h2><p>Se registra en esta DEMO, pero no se envía a un correo real.</p></div></div>
      <form className="demo-form" onSubmit={createInvitation}>
        <div className="team-form-grid">
          <label className="form-field"><span>Correo ficticio del destinatario *</span>
            <input type="email" maxLength={120} required value={email} autoComplete="off" onChange={(event) => setEmail(event.target.value)} placeholder="colaborador@ejemplo.invalid"/>
          </label>
          <label className="form-field"><span>Rol propuesto *</span>
            <select value={role} onChange={(event) => setRole(event.target.value as InviteRole)}>
              <option value="TRABAJADOR">Trabajador</option>
              <option value="ENCARGADO">Encargado</option>
            </select>
          </label>
        </div>
        <p className="form-hint">No se puede invitar a un «Propietario» ni transferir la titularidad desde este formulario. La invitación vence a los 7 días (fecha de demostración); la respuesta también será simulada.</p>
        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={() => setShowForm(false)} disabled={busy}>Cancelar</button>
          <button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Registrando…' : 'Registrar invitación DEMO'}</button>
        </div>
      </form>
    </section>}

    <div className="team-content-layout">
      <div className="team-main">
        <section className="form-panel">
          <div className="business-section-heading"><div><Icon name="users" size={22}/><h2>Integrantes</h2></div><span>{activeMembers} activos en DEMO</span></div>

          <article className="team-person team-owner">
            <span className="team-avatar">{profileInitials(profile)}</span>
            <div className="team-person-details">
              <h3>{profile.displayName}</h3><p>Perfil personal DEMO · {profile.email || 'Sin correo DEMO'}</p>
              <span>Función laboral: {owner.jobTitle || 'No indicada'}</span>
            </div>
            <div className="team-person-status"><span className="small-pill">Titular administrativo</span><small>Responsable inicial</small></div>
          </article>

          {members.length === 0 && <div className="team-empty"><Icon name="users" size={23}/><span>Aún no hay colaboradores DEMO activos. Podés registrar una invitación y simular una respuesta para probar este recorrido.</span></div>}

          {members.map((member) => <article className="team-person" key={member.id}>
            <span className="team-avatar team-avatar-guest"><Icon name="user" size={21}/></span>
            <div className="team-person-details"><h3>Integrante DEMO</h3><p>{member.email}</p><span>Membresía ficticia · sin cuenta de usuario</span></div>
            <div className="team-person-status"><span className="small-pill">{inviteRoleLabels[member.role]}</span><small>Activa sólo en esta DEMO</small></div>
          </article>)}
        </section>

        <section className="form-panel">
          <div className="business-section-heading"><div><Icon name="clock" size={22}/><h2>Invitaciones nominativas</h2></div><span>{invitations.length} registradas</span></div>
          {invitations.length === 0 && <div className="team-empty"><Icon name="book" size={22}/><span>Todavía no hay invitaciones de demostración en esta empresa.</span></div>}
          <div className="team-invitation-list">
            {invitations.map((invitation) => {
              const status = displayInvitationStatus(invitation)
              return <article className="team-invitation" key={invitation.id}>
                <div className="team-invitation-top">
                  <span className="feature-icon violet"><Icon name="user" size={20}/></span>
                  <div className="team-invitation-identity"><strong>{invitation.email}</strong><span>{inviteRoleLabels[invitation.role]} · Registro DEMO</span></div>
                  <span className={'team-invite-status status-' + status.toLowerCase()}>{statusLabels[status]}</span>
                </div>
                <div className="team-invitation-meta"><span>Creada: {new Date(invitation.createdAt).toLocaleDateString('es-AR')}</span><span>Vence: {new Date(invitation.expiresAt).toLocaleDateString('es-AR')}</span></div>
                {status === 'PENDIENTE' && <div className="team-invitation-actions">
                  <button type="button" className="button button-secondary" onClick={() => setResponseId(responseId === invitation.id ? null : invitation.id)} disabled={busy}>Simular respuesta</button>
                  <button type="button" className="button button-secondary" onClick={() => updateInvitation(invitation, 'CANCELAR')} disabled={busy}>Cancelar invitación</button>
                </div>}
                {status === 'PENDIENTE' && responseId === invitation.id && <div className="team-response-box">
                  <p>Simulación local: elegí una respuesta ficticia del destinatario. <strong>No se enviará correo ni se concederá acceso real.</strong></p>
                  <div><button type="button" className="button button-primary" onClick={() => updateInvitation(invitation, 'ACEPTAR')} disabled={busy}>{busy ? 'Procesando…' : 'Simular aceptación'}</button>
                  <button type="button" className="button button-secondary" onClick={() => updateInvitation(invitation, 'RECHAZAR')} disabled={busy}>Simular rechazo</button>
                  <button type="button" className="button button-secondary" onClick={() => setResponseId(null)} disabled={busy}>Volver</button></div>
                </div>}
              </article>
            })}
          </div>
        </section>
      </div>

      <aside className="team-side">
        <section className="form-panel">
          <div className="business-aside-heading"><span className="feature-icon blue"><Icon name="shield" size={22}/></span><div><h2>Roles y responsabilidades</h2><p>Propuesta de estructura del negocio.</p></div></div>
          <div className="team-role-explain"><strong>Titular administrativo</strong><span>Responsabilidad inicial de la empresa. No se transfiere ni elimina desde la DEMO.</span></div>
          <div className="team-role-explain"><strong>Encargado</strong><span>Rol empresarial propuesto para futura autorización en el servidor.</span></div>
          <div className="team-role-explain"><strong>Trabajador</strong><span>Rol empresarial propuesto de menor alcance; todavía sin permisos efectivos.</span></div>
          <p className="business-aside-description">La función laboral (por ejemplo, «Programador») sigue siendo independiente del rol.</p>
        </section>
        <section className="form-panel">
          <div className="business-aside-heading"><span className="feature-icon orange"><Icon name="book" size={22}/></span><div><h2>Solicitud por enlace o QR</h2><p>Otro circuito de incorporación.</p></div></div>
          <span className="small-pill amber-pill">Próximamente</span>
          <p className="business-aside-description">Un futuro enlace permitirá solicitar acceso, pero nunca dará una membresía automáticamente. No se muestran enlaces ni QR falsos.</p>
        </section>
      </aside>
    </div>
  </>
}
