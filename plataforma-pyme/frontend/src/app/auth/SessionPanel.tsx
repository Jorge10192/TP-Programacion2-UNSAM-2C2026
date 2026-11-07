import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAppData } from '../../data/dataContext'

export function SessionPanel({ modal = false, onLogout }: { modal?: boolean; onLogout: () => void }) {
  const { session, loadState, error, runtime } = useAppData()
  const dialog = useRef<HTMLDialogElement>(null)
  const [nombre, setNombre] = useState(session?.user?.name ?? '')
  const [password, setPassword] = useState('')
  const busy = session?.status === 'authenticating' || session?.status === 'signing-out'
  const checking = session?.status === 'checking'
  const authenticated = session?.status === 'authenticated'
  const returning = !!session?.user
  useEffect(() => {
    if (!modal || !dialog.current) return
    const element = dialog.current
    if (!element.open) element.showModal()
    return () => { if (element.open) element.close() }
  }, [modal])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const submitted = password
    setPassword('')
    await runtime.login(returning ? session!.user!.name : nombre.trim(), submitted)
  }
  const content = <section className="form-panel session-panel" aria-labelledby="session-title">
    <p className="eyebrow">WALOS · CONEXIÓN AL SERVIDOR</p>
    <h1 id="session-title">{checking ? 'Comprobando sesión…' : authenticated ? 'Acceso verificado' : returning ? 'Volvé a ingresar' : 'Ingresá a WALOS'}</h1>
    {returning && !authenticated && <p>Tu formulario sigue abierto. Ingresá con {session?.user?.name} para continuar sin perder los datos.</p>}
    {checking ? <p role="status">Consultando tu sesión de esta pestaña.</p> : authenticated ? <>
      <p>Sesión de {session?.user?.name}. Los datos de negocio se consultan exclusivamente al servidor.</p>
      {loadState === 'loading' && <p role="status">Cargando datos…</p>}
      {error && <p className="form-message error" role="alert">{error}</p>}
      {loadState === 'error' && <button type="button" className="button button-secondary" onClick={() => void runtime.refresh()}>Reintentar lectura</button>}
    </> : <form className="demo-form" onSubmit={submit}>
      <label className="form-field"><span>Usuario</span><input required autoComplete="username" value={returning ? session!.user!.name : nombre} readOnly={returning} disabled={busy} onChange={(event) => setNombre(event.target.value)}/></label>
      <label className="form-field"><span>Contraseña</span><input required type="password" autoComplete="current-password" value={password} disabled={busy} onChange={(event) => setPassword(event.target.value)}/></label>
      {session?.error && <p className="form-message error" role="alert">{session.error}</p>}
      <button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Ingresando…' : returning ? 'Volver a ingresar' : 'Ingresar'}</button>
      {session?.status === 'unavailable' && <button type="button" className="button button-secondary" onClick={() => void runtime.retrySession()}>Reintentar sesión</button>}
    </form>}
    {(returning || authenticated) && <button type="button" className="button button-secondary session-signout" disabled={busy} onClick={onLogout}>{modal ? 'Descartar y cerrar sesión' : 'Cerrar sesión'}</button>}
  </section>
  return modal ? <dialog ref={dialog} className="session-dialog" aria-labelledby="session-title" onCancel={(event) => event.preventDefault()}>{content}</dialog>
    : <main className="session-page">{content}</main>
}
