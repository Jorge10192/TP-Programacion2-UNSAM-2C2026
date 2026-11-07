import { createContext, useContext, useSyncExternalStore } from 'react'
import type { AppRuntime } from './appRuntime'
import { stockBalances } from './demo/inventoryPolicy'
import type { InventoryMovement } from './demo/inventoryPolicy'

export const DataContext = createContext<AppRuntime | null>(null)

export function useAppData() {
  const runtime = useContext(DataContext)
  if (!runtime) throw new Error('Falta el proveedor de datos de la aplicación.')
  const state = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, runtime.getSnapshot)
  return { ...state, runtime }
}

export function useStockBalances(movements: InventoryMovement[]) {
  const { mode, snapshot } = useAppData()
  return mode === 'api' ? new Map(Object.entries(snapshot?.apiStockBalances ?? {})) : stockBalances(movements)
}
