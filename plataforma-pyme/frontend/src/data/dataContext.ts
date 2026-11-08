import { createContext, useContext, useSyncExternalStore } from 'react'
import type { AppRuntime } from './appRuntime'
import { stockBalances } from './demo/inventoryPolicy'
import type { InventoryMovement } from './demo/inventoryPolicy'

export const DataContext = createContext<AppRuntime | null>(null)

export function useAppData() {
  const runtime = useContext(DataContext)
  if (!runtime) throw new Error('Falta el proveedor de datos de la aplicación.')
  const state = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, runtime.getSnapshot)
  const businessId = typeof window === 'undefined' ? undefined : /^\/b\/([^/]+)\//.exec(window.location.pathname)?.[1]
  const caps = businessId ? state.snapshot?.apiCapabilitiesByBusiness?.[businessId] : undefined
  const snapshot = state.snapshot && caps ? { ...state.snapshot, apiCapabilities: caps } : state.snapshot
  return { ...state, snapshot, runtime }
}

export function useStockBalances(movements: InventoryMovement[], businessId: string) {
  const { mode, snapshot } = useAppData()
  return mode === 'api' ? new Map(Object.entries(snapshot?.apiStockBalances ?? {}).filter(([key])=>{
    const [locationId,itemId]=JSON.parse(key) as string[]
    return snapshot?.locationsById[locationId]?.businessId===businessId && snapshot?.catalogItemsById[itemId]?.businessId===businessId
  })) : stockBalances(movements.filter(row=>row.businessId===businessId))
}

export function useBusinessPermissions(businessId: string) {
  const { mode, snapshot } = useAppData()
  const caps = snapshot?.apiCapabilitiesByBusiness?.[businessId]
  return {
    canManageResources: mode === 'demo' || caps?.resources === true,
    canEditBusiness: mode === 'demo' || caps?.business === true,
    canCountInventory: mode === 'demo' || caps?.count === true,
    canManageCash: mode === 'demo' || caps?.cash === true,
    canSell: mode === 'demo' || caps?.sale === true,
    canReceive: mode === 'demo' || caps?.receipt === true,
  }
}
