import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiHttpError } from '../../api/httpClient'
import { RealBusinessesPage } from '../businesses/RealBusinessesPage'
import type { BusinessRoute, PendingBusinessCreation } from '../businesses/RealBusinessesPage'
import { UUID_PATTERN } from '../businesses/businessGateway'
import { RealLocationsPage } from '../locations/RealLocationsPage'
import { RealCatalogPage } from '../catalog/RealCatalogPage'
import { RealSuppliersPage } from '../suppliers/RealSuppliersPage'
import { RealPurchasesPage } from '../purchases/RealPurchasesPage'
import { RealInventoryPage } from '../inventory/RealInventoryPage'
import { RealTeamPage } from '../team/RealTeamPage'
import { RealAcceptInvitationPage } from '../team/RealAcceptInvitationPage'
import { authErrorMessage, createAuthGateway } from './authGateway'
import type { AuthUser, LoginInput, RegisterInput } from './authGateway'
import './auth.css'

type Session = { token: string; expiresAt: string; user: AuthUser }
type Route = '/real/login' | '/real/registro' | '/real/perfil' | '/real/empresas' | '/real/empresas/nueva' | '/real/invitaciones/aceptar' | `/real/empresas/${string}`

const gateway = createAuthGateway()

function routeFromPath(path: string): Route {
  if (path === '/real/perfil') return '/real/perfil'
  if (path === '/real/registro') return '/real/registro'
  if (path === '/real/empresas' || path === '/real/empresas/nueva'
    || path === '/real/invitaciones/aceptar') return path
  const detailMatch = /^\/real\/empresas\/([^/]+)(?:\/(ubicaciones|equipo|catalogo|proveedores|compras|inventario))?$/.exec(path)
  if (detailMatch && UUID_PATTERN.test(detailMatch[1])) return path as Route
  return '/real/login'
}

/** Independent from E1's demoStore, fixtures and commercial navigation. */
export function RealAuthApp() {
  const [path, setPath] = useState<Route>(() => routeFromPath(window.location.pathname))
  const [session, setSession] = useState<Session | null>(null)
  const [pendingCreation, setPendingCreation] = useState<PendingBusinessCreation | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [warning, setWarning] = useState(false)
  const [loginInput, setLoginInput] = useState<LoginInput>({ email: '', password: '' })
  const [registration, setRegistration] = useState<RegisterInput>({
    email: '', password: '', display_name: '', contact_phone: null,
  })
  const generation = useRef(0)

  useEffect(() => {
    // Invalidate requests both on navigation and when the component unmounts.
    const invalidatePendingRequests = () => { generation.current += 1 }
    const back = () => {
      invalidatePendingRequests()
      setBusy(false)
      setMessage('')
      setPath(routeFromPath(window.location.pathname))
    }
    window.addEventListener('popstate', back)
    return () => {
      window.removeEventListener('popstate', back)
      invalidatePendingRequests()
    }
  }, [])

  useEffect(() => {
    document.title = 'Acceso real · Asistente PyME'
  }, [])

  useEffect(() => {
    if (!session) return
    const remaining = Date.parse(session.expiresAt) - Date.now()
    if (remaining <= 0) {
      // Expiration will be enforced by FastAPI; discard UI access too.
      const task = window.setTimeout(() => {
        generation.current++; setSession(null); setMessage('Tu sesión venció. Iniciá sesión nuevamente.'); setWarning(true)
      }, 0)
      return () => window.clearTimeout(task)
    }
    const task = window.setTimeout(() => {
      generation.current++; setSession(null); setMessage('Tu sesión venció. Iniciá sesión nuevamente.'); setWarning(true)
    }, Math.min(remaining, 2_147_483_647))
    return () => window.clearTimeout(task)
  }, [session])

  const go = useCallback((next: Route, replace = false) => {
    generation.current++
    setBusy(false)
    setMessage('')
    setWarning(false)
    if (window.location.pathname !== next) {
      if (replace) window.history.replaceState({}, '', next)
      else window.history.pushState({}, '', next)
    }
    setPath(next)
  }, [])

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const current = ++generation.current
    setBusy(true); setMessage(''); setWarning(false)
    try {
      // Register does not create a session. Login returns a truly opaque bearer token.
      const result = await gateway.login(loginInput)
      const user = await gateway.me(result.access_token)
      if (current !== generation.current) return
      if (user.id !== result.user.id || user.status !== 'ACTIVO') {
        setMessage('No fue posible validar esta sesión.'); setWarning(true)
        return
      }
      setPendingCreation(null)
      setSession({ token: result.access_token, expiresAt: result.expires_at, user })
      setLoginInput((old) => ({ ...old, password: '' }))
      // Preserve only a safe destination after F5. Never restore a pending create
      // form automatically because its in-memory idempotency key may be lost.
      const safeDestination: Route = path === '/real/empresas' || path === '/real/perfil'
        || path === '/real/empresas/nueva' // safe: journal is reloaded before any manual POST
        || path === '/real/invitaciones/aceptar'
        || (path.startsWith('/real/empresas/') && path !== '/real/empresas/nueva')
        ? path : '/real/perfil'
      go(safeDestination, true)
    } catch (error) {
      if (current !== generation.current) return
      setMessage(authErrorMessage(error, 'login'))
      setWarning(true)
    } finally {
      if (current === generation.current) setBusy(false)
    }
  }

  async function onRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const current = ++generation.current
    setBusy(true); setMessage(''); setWarning(false)
    try {
      await gateway.register(registration)
      if (current !== generation.current) return
      setLoginInput({ email: registration.email, password: '' })
      setRegistration((old) => ({ ...old, password: '' }))
      go('/real/login', true)
      setMessage('Cuenta registrada. Iniciá sesión con tu correo y contraseña.')
    } catch (error) {
      if (current !== generation.current) return
      setMessage(authErrorMessage(error, 'register')); setWarning(true)
    } finally {
      if (current === generation.current) setBusy(false)
    }
  }

  async function onRefreshProfile() {
    if (!session || busy) return
    const current = ++generation.current
    setBusy(true); setMessage(''); setWarning(false)
    try {
      const user = await gateway.me(session.token)
      if (current !== generation.current) return
      setSession((old) => old?.token === session.token ? { ...old, user } : old)
      setMessage('Perfil actualizado desde FastAPI.')
    } catch (error) {
      if (current !== generation.current) return
      if (error instanceof ApiHttpError && error.status === 401) {
        setSession(null)
      }
      setMessage(authErrorMessage(error, 'me')); setWarning(true)
    } finally {
      if (current === generation.current) setBusy(false)
    }
  }

  function onLogout() {
    if (!session) return
    const token = session.token
    const current = ++generation.current
    setSession(null)
    setPendingCreation(null)
    setBusy(false)
    setMessage('')
    go('/real/login', true)
    // Invalidate locally immediately, but never claim remote revocation on network failure.
    void gateway.logout(token).catch(() => {
      if (current + 1 !== generation.current) return
      setMessage('Sesión cerrada en este navegador. No se pudo confirmar la revocación remota.')
      setWarning(true)
    })
  }

  const onBusinessAuthLost = useCallback(() => {
    generation.current++
    setSession(null)
    setPendingCreation(null)
    go('/real/login', true)
    setMessage('La sesión ya no es válida. Iniciá sesión nuevamente.')
    setWarning(true)
  }, [go])

  const businessRoute: BusinessRoute | null =
    path === '/real/empresas' ? { kind: 'list' }
    : path === '/real/empresas/nueva' ? { kind: 'create' }
    : path.startsWith('/real/empresas/') ? { kind: 'detail', businessId: path.slice('/real/empresas/'.length) }
    : null
  const operationsMatch = /^\/real\/empresas\/([^/]+)\/(ubicaciones|equipo|catalogo|proveedores|compras|inventario)$/.exec(path)
  const operationBusinessId = operationsMatch && UUID_PATTERN.test(operationsMatch[1]) ? operationsMatch[1] : null
  const operationsKind = operationBusinessId ? operationsMatch?.[2] : null
  const showInvitation = session !== null && path === '/real/invitaciones/aceptar'
  const showOperations = session !== null && (operationBusinessId !== null || showInvitation)
  const showBusinesses = session !== null && businessRoute !== null && !showOperations

  // A valid session never reveals the login form, even if browser Back changes the URL.
  const isProfile = session !== null && !showBusinesses && !showOperations
  const isRegistration = path === '/real/registro' && !session
  const showLogin = !session && !isRegistration

  return <div className="real-auth-layout">
    <header className="real-auth-header">
      <div className="real-auth-brand"><span className="real-auth-logo" aria-hidden="true">▦</span><div><strong>Asistente PyME</strong><small>Acceso conectado a FastAPI</small></div></div>
      <div className="real-auth-header-actions"><span className="real-auth-badge">REAL · Identidad</span><a href="/inicio">Entrar a DEMO</a></div>
    </header>
    <main className={'real-auth-main' + (showBusinesses || showOperations ? ' real-business-main' : '')}>
      {showOperations && session
        ? showInvitation
          ? <RealAcceptInvitationPage key={session.user.id + ':invite'} token={session.token}
              userId={session.user.id} onNavigate={(next) => go(next as Route)} onUnauthorized={onBusinessAuthLost}/>
          : operationBusinessId && operationsKind === 'ubicaciones'
            ? <RealLocationsPage key={session.user.id + ':' + path} token={session.token}
                userId={session.user.id} businessId={operationBusinessId}
                onNavigate={(next) => go(next as Route)} onUnauthorized={onBusinessAuthLost}/>
            : operationBusinessId && operationsKind === 'equipo'
              ? <RealTeamPage key={session.user.id + ':' + path} token={session.token}
                  userId={session.user.id} businessId={operationBusinessId}
                  onNavigate={(next) => go(next as Route)} onUnauthorized={onBusinessAuthLost}/>
              : operationBusinessId && operationsKind === 'catalogo'
                ? <RealCatalogPage key={session.user.id + ':' + path} token={session.token}
                    userId={session.user.id} businessId={operationBusinessId}
                    onNavigate={(next) => go(next as Route)} onUnauthorized={onBusinessAuthLost}/>
                : operationBusinessId && operationsKind === 'proveedores'
                  ? <RealSuppliersPage key={session.user.id + ':' + path} token={session.token}
                      userId={session.user.id} businessId={operationBusinessId}
                      onNavigate={(next) => go(next as Route)} onUnauthorized={onBusinessAuthLost}/>
                  : operationBusinessId && operationsKind === 'compras'
                    ? <RealPurchasesPage key={session.user.id + ':' + path} token={session.token}
                        userId={session.user.id} userDisplayName={session.user.display_name} businessId={operationBusinessId}
                        onNavigate={(next) => go(next as Route)} onUnauthorized={onBusinessAuthLost}/>
                    : operationBusinessId && operationsKind === 'inventario'
                     ? <RealInventoryPage key={session.user.id + ':' + path} token={session.token}
                         userId={session.user.id} businessId={operationBusinessId}
                         onNavigate={(next) => go(next as Route)} onUnauthorized={onBusinessAuthLost}/>
                     : null
        : showBusinesses && session && businessRoute
        ? <RealBusinessesPage
          key={session.user.id + ':' + path}
          token={session.token}
          userId={session.user.id}
          route={businessRoute}
          onNavigate={(next) => go(next as Route)}
          onUnauthorized={onBusinessAuthLost}
          pendingCreation={pendingCreation}
          setPendingCreation={setPendingCreation}
        />
        : <section className="real-auth-card" aria-label="Autenticación real">
        <span className="real-auth-eyebrow">E2-7 · T02</span>
        {isProfile ? <>
          <h1>Mi perfil real</h1>
          <p>Identidad obtenida desde FastAPI y PostgreSQL. Ahora podés gestionar tus empresas REAL, sin mezclar datos de demostración.</p>
          <dl className="real-auth-profile">
            <div><dt>Nombre</dt><dd>{session.user.display_name}</dd></div>
            <div><dt>Correo</dt><dd>{session.user.email}</dd></div>
            <div><dt>Teléfono</dt><dd>{session.user.contact_phone || 'No informado'}</dd></div>
            <div><dt>Estado</dt><dd>{session.user.status}</dd></div>
            <div><dt>ID de usuario</dt><dd className="real-auth-id">{session.user.id}</dd></div>
          </dl>
          <p className="real-auth-note">La sesión se guarda solo en memoria. Si actualizás la página con F5, tendrás que volver a ingresar.</p>
          <div className="real-auth-actions">
            <button type="button" className="real-auth-primary" onClick={() => go('/real/empresas')}>Mis empresas reales</button>
            <button type="button" className="real-auth-secondary" onClick={() => go('/real/invitaciones/aceptar')}>Aceptar invitación</button>
            <button type="button" className="real-auth-secondary" onClick={() => void onRefreshProfile()} disabled={busy}>{busy ? 'Consultando…' : 'Actualizar desde API'}</button>
            <button type="button" className="real-auth-secondary" onClick={onLogout}>Cerrar sesión</button>
          </div>
        </> : isRegistration ? <>
          <h1>Crear cuenta real</h1>
          <p>El registro crea un usuario en PostgreSQL, pero no inicia sesión automáticamente.</p>
          <form className="real-auth-form" onSubmit={(event) => void onRegister(event)}>
            <label>Nombre visible<input required minLength={2} maxLength={70} autoComplete="name" value={registration.display_name} onChange={(e) => setRegistration((old) => ({ ...old, display_name: e.target.value }))}/></label>
            <label>Correo electrónico<input required type="email" autoComplete="email" value={registration.email} onChange={(e) => setRegistration((old) => ({ ...old, email: e.target.value }))}/></label>
            <label>Teléfono (opcional)<input maxLength={30} type="tel" autoComplete="tel" value={registration.contact_phone ?? ''} onChange={(e) => setRegistration((old) => ({ ...old, contact_phone: e.target.value || null }))}/></label>
            <label>Contraseña (mínimo 15 caracteres)<input required type="password" autoComplete="new-password" minLength={15} maxLength={128} value={registration.password} onChange={(e) => setRegistration((old) => ({ ...old, password: e.target.value }))}/></label>
            <button type="submit" className="real-auth-primary" disabled={busy}>{busy ? 'Registrando…' : 'Registrarme'}</button>
          </form>
          <button type="button" className="real-auth-link" onClick={() => go('/real/login')}>Ya tengo una cuenta</button>
        </> : showLogin ? <>
          <h1>Iniciar sesión real</h1>
          <p>Ingresá con un usuario registrado en FastAPI. Este acceso no utiliza cuentas ni datos DEMO.</p>
          {path === '/real/perfil' && <p className="real-auth-note">La sesión se conserva solo en memoria: después de recargar la página es necesario volver a ingresar.</p>}
          <form className="real-auth-form" onSubmit={(event) => void onLogin(event)}>
            <label>Correo electrónico<input required type="email" autoComplete="username" value={loginInput.email} onChange={(e) => setLoginInput((old) => ({ ...old, email: e.target.value }))}/></label>
            <label>Contraseña<input required type="password" minLength={1} maxLength={1024} autoComplete="current-password" value={loginInput.password} onChange={(e) => setLoginInput((old) => ({ ...old, password: e.target.value }))}/></label>
            <button type="submit" className="real-auth-primary" disabled={busy}>{busy ? 'Validando con FastAPI…' : 'Ingresar'}</button>
          </form>
          <button type="button" className="real-auth-link" onClick={() => go('/real/registro')}>Crear una cuenta nueva</button>
        </> : null}
        {message && <p role={warning ? 'alert' : 'status'} className={warning ? 'real-auth-message real-auth-error' : 'real-auth-message'}>{message}</p>}
      </section>}
      <aside className="real-auth-aside">
        <h2>Una plataforma, diferentes negocios</h2>
        <p>Tu identidad, empresas, ubicaciones, equipo, catálogo, proveedores y compras se consultan desde FastAPI y PostgreSQL. Stock de recepciones se confirma en backend; ventas se integrarán posteriormente.</p>
        <div className="real-auth-state">Esta vista no accede a `demoStore`, cuentas, caja ni stock ficticio.</div>
      </aside>
    </main>
    <footer className="real-auth-footer">Modo REAL · E2-7 T07 · Token solo en memoria · Compras y recepciones por empresa</footer>
  </div>
}
