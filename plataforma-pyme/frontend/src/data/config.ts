export type AppMode = 'demo' | 'api'

export function parseAppMode(value: unknown): AppMode {
  if (value === undefined || value === '') return 'demo'
  if (value === 'demo' || value === 'api') return value
  throw new Error('VITE_APP_MODE no es válido. Usá demo o api; no se eligió otro modo automáticamente.')
}
