export type PendingChanges = { dirty: boolean; busy: boolean }

const discardMessage = 'Tenés cambios sin guardar. ¿Querés descartarlos?\n\nAceptar: descartar los cambios y salir.\nCancelar: seguir editando sin perder los datos.'

export function createNavigationGuard(confirm: (message: string) => boolean, notifyBusy: (message: string) => void) {
  const pending = new Set<PendingChanges>()

  function requestDiscard(changes: PendingChanges[]): boolean {
    if (changes.some((change) => change.busy)) {
      notifyBusy('Hay una operación guardándose. Esperá a que termine antes de salir.')
      return false
    }
    return !changes.some((change) => change.dirty) || confirm(discardMessage)
  }

  return {
    register(change: PendingChanges): () => void {
      pending.add(change)
      return () => { pending.delete(change) }
    },
    requestLeave: () => requestDiscard([...pending]),
    requestDiscard: (change: PendingChanges) => requestDiscard([change]),
    shouldBlockUnload: () => [...pending].some((change) => change.dirty || change.busy),
  }
}

export type NavigationGuard = ReturnType<typeof createNavigationGuard>
