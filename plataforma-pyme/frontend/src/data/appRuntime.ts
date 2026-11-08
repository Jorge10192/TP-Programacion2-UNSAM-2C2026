import type { AppMode } from './config.ts'
import { unavailableGateway } from './gateway.ts'
import type { AppGateway } from './gateway.ts'
import type { Snapshot } from './models.ts'
import { createSession } from './api/session.ts'
import type { SessionClient, SessionState } from './api/session.ts'
import { createApiGateway } from './api/apiGateway.ts'
import type { ApiConnection } from './api/apiGateway.ts'
import type { ApiEvents, RecoveryOperation } from './api/apiGateway.ts'

export type Capabilities = {
  multiBusiness: boolean; photos: boolean; team: boolean; qr: boolean; financialAccounts: boolean
  transfers: boolean; services: boolean; supplierRequired: boolean; cashRequired: boolean
}
export type AppState = {
  mode: AppMode
  snapshot: Snapshot | null
  gateway: AppGateway
  session: SessionState | null
  loadState: 'loading' | 'ready' | 'refreshing' | 'error'
  error: string | null
  recovery: RecoveryOperation | null
  capabilities: Capabilities
}

export function createAppRuntime(options: {
  mode: AppMode
  session?: SessionClient
  apiFactory?: (session: SessionClient, events?: ApiEvents) => ApiConnection
  loadDemo?: () => Promise<typeof import('./demo/demoStore')>
}) {
  const isDemo = options.mode === 'demo'
  const session = isDemo ? null : options.session ?? createSession()
  let api: ApiConnection | null = null
  let state: AppState = {
    mode: options.mode, snapshot: null, gateway: unavailableGateway(),
    session: session?.getSnapshot() ?? null, loadState: 'loading', error: null, recovery: null,
    capabilities: { multiBusiness: true, photos: isDemo, team: isDemo, qr: isDemo,
      financialAccounts: true, transfers: true, services: true,
      supplierRequired: false, cashRequired: !isDemo },
  }
  let running = false
  let unsubscribe: (() => void) | undefined
  let demoLoading: Promise<typeof import('./demo/demoStore')> | null = null
  let loadingGeneration: number | null = null
  let boundUserId: string | null = null
  const listeners = new Set<() => void>()
  const publish = (patch: Partial<AppState>) => { state = { ...state, ...patch }; listeners.forEach((listener) => listener()) }
  api = session ? (options.apiFactory ?? createApiGateway)(session, {
    snapshot: (snapshot) => { if (running) publish({ snapshot, loadState: 'ready', error: null }) },
    recovery: (recovery) => publish({ recovery }),
  }) : null
  state.gateway = api?.gateway ?? state.gateway

  async function refresh() {
    const current = session?.getSnapshot()
    if (!session || !api || current?.status !== 'authenticated' || !current.user) return
    const version = session.getGeneration()
    loadingGeneration = version
    publish({ loadState: state.snapshot ? 'refreshing' : 'loading', error: null })
    try {
      const snapshot = await api.loadSnapshot(current.user)
      if (!running || version !== session.getGeneration()) return
      if (snapshot.mode !== 'api' || snapshot.profile.id !== current.user.id) throw new Error('Los datos recibidos no corresponden a esta sesión.')
      boundUserId = current.user.id
      publish({ snapshot, loadState: 'ready', error: null })
    } catch (error) {
      if (!running || version !== session.getGeneration()) return
      publish({ loadState: 'error', error: error instanceof Error ? error.message : 'No se pudieron recuperar los datos del servidor.' })
    } finally {
      if (loadingGeneration === version) loadingGeneration = null
    }
  }

  function syncSession() {
    if (!session) return
    const next = session.getSnapshot()
    const previous = state.session
    if (next.status === 'anonymous') {
      api?.reset?.()
      boundUserId = null
      publish({ session: next, snapshot: null, error: null, loadState: 'loading' })
      return
    }
    if (next.user && boundUserId && next.user.id !== boundUserId) {
      boundUserId = null
      publish({ snapshot: null })
    }
    publish({ session: next })
    if (next.status === 'authenticated' && previous?.status !== 'authenticated'
      && loadingGeneration !== session.getGeneration()) void refresh()
  }

  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    async start() {
      if (running) return
      running = true
      if (isDemo) {
        try {
          demoLoading ??= (options.loadDemo ?? (() => import('./demo/demoStore')))()
          const demo = await demoLoading
          if (running && !unsubscribe) {
            publish({ snapshot: demo.demoStore.getSnapshot(), gateway: demo.demoGateway, loadState: 'ready' })
            unsubscribe = demo.demoStore.subscribe(() => publish({ snapshot: demo.demoStore.getSnapshot() }))
          }
        } catch (error) {
          demoLoading = null
          if (running) publish({ loadState: 'error', error: error instanceof Error ? error.message : 'No se pudo abrir la demo.' })
        }
      } else if (session) {
        unsubscribe = session.subscribe(syncSession)
        await session.start()
        if (running) {
          if (state.session !== session.getSnapshot()) syncSession()
          if (session.getSnapshot().status === 'authenticated' && !state.snapshot && loadingGeneration === null) void refresh()
        }
      }
    },
    stop() { running = false; unsubscribe?.(); unsubscribe = undefined },
    refresh,
    login: (nombre: string, password: string) => session?.login(nombre, password) ?? Promise.resolve(),
    register: (email: string, password: string, name: string) => session?.register(email, password, name) ?? Promise.resolve(),
    logout: () => session?.logout() ?? Promise.resolve(),
    retrySession: () => session?.retry() ?? Promise.resolve(),
    dispose() { running = false; unsubscribe?.(); session?.dispose(); listeners.clear() },
  }
}

export type AppRuntime = ReturnType<typeof createAppRuntime>
