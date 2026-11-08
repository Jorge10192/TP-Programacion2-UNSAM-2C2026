import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAppData } from '../../data/dataContext'

export function SessionPanel({ modal = false, onLogout }: { modal?: boolean; onLogout: () => void }) {
  const { session, loadState, error, runtime } = useAppData()
  const dialog = useRef<HTMLDialogElement>(null)
  const [email, setEmail] = useState(session?.user?.email ?? '')
  const [name, setName] = useState('')
  const [registering, setRegistering] = useState(false)
  const [registrationBusy, setRegistrationBusy] = useState(false)
  const [registrationError, setRegistrationError] = useState('')
  const [notice, setNotice] = useState('')
  const [password, setPassword] = useState('')
  const busy = registrationBusy || session?.status === 'authenticating' || session?.status === 'signing-out'
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
    setRegistrationError(''); setNotice('')
    if (registering) {
      setRegistrationBusy(true)
      try {
        await runtime.register(email.trim(), submitted, name.trim())
        setRegistering(false); setNotice('Cuenta creada. Ingresá con tu email y contraseña.')
      } catch (error) { setRegistrationError(error instanceof Error ? error.message : 'No se pudo crear la cuenta.') }
      finally { setRegistrationBusy(false) }
    } else await runtime.login(returning ? session!.user!.email : email.trim(), submitted)
  }
  const content = <section className="form-panel session-panel" aria-labelledby="session-title">
    <p className="eyebrow">ASISTENTE PYME</p>
    <h1 id="session-title">{checking ? 'Comprobando sesión…' : authenticated ? 'Acceso verificado' : returning ? 'Volvé a ingresar' : registering ? 'Crear tu cuenta' : 'Ingresá a tu espacio'}</h1>
    {returning && !authenticated && <p>Tu formulario sigue abierto. Ingresá con {session?.user?.name} para continuar sin perder los datos.</p>}
    {checking ? <p role="status">Consultando tu sesión de esta pestaña.</p> : authenticated ? <>
      <p>Sesión de {session?.user?.name}. Los datos de negocio se consultan exclusivamente al servidor.</p>
      {loadState === 'loading' && <p role="status">Cargando datos…</p>}
      {error && <p className="form-message error" role="alert">{error}</p>}
      {loadState === 'error' && <button type="button" className="button button-secondary" onClick={() => void runtime.refresh()}>Reintentar lectura</button>}
    </> : <form className="demo-form" onSubmit={submit}>
      {registering && <label className="form-field"><span>Nombre</span><input required minLength={2} maxLength={70} autoComplete="name" value={name} onChange={event=>setName(event.target.value)}/></label>}
      <label className="form-field"><span>Email</span><input required type="email" autoComplete="username" value={returning ? session!.user!.email : email} readOnly={returning} disabled={busy} onChange={(event) => setEmail(event.target.value)}/></label>
      <label className="form-field"><span>Contraseña</span><input required type="password" minLength={registering ? 15 : 1} maxLength={registering ? 128 : 1024} autoComplete={registering ? 'new-password' : 'current-password'} value={password} disabled={busy} onChange={(event) => setPassword(event.target.value)}/>{registering && <small>Usá una frase de al menos 15 caracteres.</small>}</label>
      {notice && <p role="status">{notice}</p>}
      {registrationError && <p className="form-message error" role="alert">{registrationError}</p>}
      {session?.error && <p className="form-message error" role="alert">{session.error}</p>}
      <button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Procesando…' : returning ? 'Volver a ingresar' : registering ? 'Crear cuenta' : 'Ingresar'}</button>
      {!returning && <button type="button" className="button button-secondary" disabled={busy} onClick={()=>{setRegistering(!registering);setPassword('');setRegistrationError('');setNotice('')}}>{registering ? 'Ya tengo cuenta' : 'Crear una cuenta'}</button>}
      {session?.status === 'unavailable' && <button type="button" className="button button-secondary" onClick={() => void runtime.retrySession()}>Reintentar sesión</button>}
    </form>}
    {(returning || authenticated) && <button type="button" className="button button-secondary session-signout" disabled={busy} onClick={onLogout}>{modal ? 'Descartar y cerrar sesión' : 'Cerrar sesión'}</button>}
  </section>
  return modal ? <dialog ref={dialog} className="session-dialog" aria-labelledby="session-title" onCancel={(event) => event.preventDefault()}>{content}</dialog>
    : <main className="session-page">{content}</main>
}
