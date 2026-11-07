import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createAppRuntime } from './appRuntime'
import { createSession } from './api/session'
import { parseAppMode } from './config'
import { DataContext } from './dataContext'

export function DataProvider({ children }: { children: ReactNode }) {
  const [setup] = useState(() => {
    try {
      const mode = parseAppMode(import.meta.env.VITE_APP_MODE)
      let storage: Storage | undefined
      if (mode === 'api') { try { storage = window.sessionStorage } catch { /* Session can remain in memory. */ } }
      return { runtime: createAppRuntime({ mode, session: mode === 'api' ? createSession({ storage }) : undefined }), error: null }
    } catch (error) {
      return { runtime: null, error: error instanceof Error ? error.message : 'Configuración inválida.' }
    }
  })
  useEffect(() => {
    void setup.runtime?.start()
    return () => setup.runtime?.stop()
  }, [setup])
  if (!setup.runtime) return <main className="session-page"><section className="form-panel"><h1>No se pudo abrir WALOS</h1><p role="alert">{setup.error}</p></section></main>
  return <DataContext.Provider value={setup.runtime}>{children}</DataContext.Provider>
}
