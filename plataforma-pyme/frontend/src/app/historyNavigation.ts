function entryState(state: unknown): Record<string, unknown> {
  return state !== null && typeof state === 'object' ? state as Record<string, unknown> : {}
}

function entryIndex(state: unknown): number | null {
  const index = entryState(state).assistantPymeIndex
  return typeof index === 'number' && Number.isSafeInteger(index) ? index : null
}

/** Keep the current screen mounted until leaving is approved, including browser Back/Forward. */
export function installHistoryNavigation(browser: Window, requestLeave: () => boolean, onNavigate: (pathname: string) => void) {
  const { history, location } = browser
  let current = { pathname: location.pathname, url: location.href, index: entryIndex(history.state) ?? 0 }
  let restoring = false
  history.replaceState({ ...entryState(history.state), assistantPymeIndex: current.index }, '')

  function handlePopState(event: PopStateEvent) {
    if (restoring) {
      restoring = false
      return
    }
    const nextIndex = entryIndex(event.state)
    if (location.pathname !== current.pathname && !requestLeave()) {
      const delta = nextIndex === null ? 0 : current.index - nextIndex
      if (delta !== 0) {
        restoring = true
        history.go(delta)
      } else {
        // Entries made before this navigator existed have no position to traverse back to.
        history.replaceState({ ...entryState(event.state), assistantPymeIndex: current.index }, '', current.url)
      }
      return
    }
    current = { pathname: location.pathname, url: location.href, index: nextIndex ?? current.index }
    onNavigate(current.pathname)
  }
  browser.addEventListener('popstate', handlePopState)

  return {
    navigate(to: string): boolean {
      if (restoring || (to !== current.pathname && !requestLeave())) return false
      if (to !== current.pathname) {
        const index = current.index + 1
        history.pushState({ assistantPymeFrom: current.pathname, assistantPymeIndex: index }, '', to)
        current = { pathname: location.pathname, url: location.href, index }
      }
      onNavigate(current.pathname)
      return true
    },
    dispose: () => browser.removeEventListener('popstate', handlePopState),
  }
}
