import { useMemo, useRef, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiHttpError, ApiTransportError } from '../../api/httpClient.ts'
import { canAcceptInvitationToken, createOperationsGateway, operationsError } from '../businesses/realOperationsGateway.ts'

type Props = { token: string; userId: string; onNavigate: (path: string) => void; onUnauthorized: () => void }

/** Invitation tokens are never placed in URLs, localStorage or browser history. */
export function RealAcceptInvitationPage({ token, userId, onNavigate, onUnauthorized }: Props) {
  const gateway = useMemo(() => createOperationsGateway(token, userId), [token, userId])
  const current = useRef({ valid: true })
  const [secret, setSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [uncertain, setUncertain] = useState(false)

  useEffect(() => {
    const gate = current.current
    gate.valid = true
    return () => { gate.valid = false }
  }, [])

  async function accept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canAcceptInvitationToken(secret.trim()) || busy || uncertain) {
      if (!busy && !uncertain) setError('El código debe tener 43 caracteres válidos.')
      return
    }
    setBusy(true); setError('')
    try {
      const business = await gateway.acceptInvitation(secret.trim())
      if (!current.current.valid) return
      setSecret('')
      onNavigate('/real/empresas/' + business.id)
    } catch (err) {
      if (!current.current.valid) return
      if (err instanceof ApiHttpError && err.status === 401) { setSecret(''); onUnauthorized(); return }
      if (err instanceof ApiTransportError && err.outcomeUnknown) {
        setUncertain(true)
        setError('No se pudo confirmar si la invitación fue aceptada. Consultá «Mis empresas» antes de repetir. Se conserva el código solo en esta pantalla.')
      } else {
        setError(operationsError(err))
      }
    } finally {
      if (current.current.valid) setBusy(false)
    }
  }

  return <section className="real-auth-card real-business-panel">
    <nav className="real-business-nav" aria-label="Navegación real">
      <button type="button" className="real-auth-link" onClick={() => onNavigate('/real/perfil')}>Mi perfil real</button>
      <button type="button" className="real-auth-link" onClick={() => onNavigate('/real/empresas')}>Mis empresas</button>
    </nav>
    <span className="real-auth-eyebrow">E2-7 · T04 · Invitaciones</span>
    <h1>Aceptar invitación</h1>
    <p>Ingresá con el usuario REAL cuyo correo fue invitado. Si te compartieron un código de invitación, pegalo aquí. El secreto no quedará en la URL ni en el almacenamiento local.</p>
    <form className="real-auth-form" onSubmit={(event) => void accept(event)}>
      <label>Código de 43 caracteres
        <input type="password" required autoComplete="off" minLength={43} maxLength={43}
          value={secret} onChange={(e) => setSecret(e.target.value.trim())}
          aria-describedby="real-invite-help"/>
      </label>
      <p id="real-invite-help" className="real-auth-note">La invitación debe corresponder al correo de tu sesión. No publiques ni compartas el código en capturas.</p>
      <button className="real-auth-primary" type="submit" disabled={busy || uncertain || !canAcceptInvitationToken(secret)}>
        {busy ? 'Aceptando en FastAPI…' : 'Aceptar invitación'}
      </button>
    </form>
    {uncertain && <div className="real-ops-warning real-auth-message">
      <p>Primero revisá si la empresa ya aparece entre tus negocios. No enviaremos el código automáticamente otra vez.</p>
      <div className="real-auth-actions">
        <button type="button" className="real-auth-secondary" onClick={() => onNavigate('/real/empresas')}>Consultar mis empresas</button>
        <button type="button" className="real-auth-secondary" onClick={() => {
          if (window.confirm('¿Confirmaste que la empresa no figura y querés reintentar con el MISMO código?')) {
            setUncertain(false); setError('')
          }
        }}>Habilitar reintento manual</button>
      </div>
    </div>}
    {error && <p className="real-auth-message real-auth-error" role="alert">{error}</p>}
  </section>
}
