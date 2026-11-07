import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createNavigationGuard } from './navigationGuard'
import type { NavigationGuard, PendingChanges } from './navigationGuard'

export const NavigationGuardContext = createContext<NavigationGuard | null>(null)

export function useNavigationGuard(): NavigationGuard {
  const [guard] = useState(() => createNavigationGuard(
    (message) => window.confirm(message), (message) => window.alert(message),
  ))

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!guard.shouldBlockUnload()) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [guard])

  return guard
}

export function useLeaveConfirmation(): NavigationGuard['requestLeave'] {
  const guard = useContext(NavigationGuardContext)
  if (!guard) throw new Error('Falta la protección de navegación de Compras.')
  return guard.requestLeave
}

export function useUnsavedChanges(dirty: boolean, busy = false) {
  const guard = useContext(NavigationGuardContext)
  if (!guard) throw new Error('Falta la protección de navegación de Compras.')
  const changes = useRef<PendingChanges>({ dirty, busy })

  useLayoutEffect(() => {
    changes.current.dirty = dirty
    changes.current.busy = busy
  }, [dirty, busy])
  useLayoutEffect(() => guard.register(changes.current), [guard])

  return {
    confirmDiscard: () => guard.requestDiscard(changes.current),
    markSaved: () => { changes.current.dirty = false; changes.current.busy = false },
  }
}
