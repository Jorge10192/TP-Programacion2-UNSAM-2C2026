import test from 'node:test'
import assert from 'node:assert/strict'
import {
  catalogSetupSuggestion, inventorySetupSuggestion, locationSetupSuggestion,
  teamSetupSuggestion,
} from '../src/features/onboarding/realSetupGuidance.ts'

test('H3: ubicaciones solo sugieren cuando la lectura fue comprobada y no ofrecen escrituras a lectores', () => {
  assert.equal(locationSetupSuggestion({verified:false,count:0,activeCount:0,canManage:true}),null)
  assert.equal(locationSetupSuggestion({verified:true,count:1,activeCount:1,canManage:true}),null)
  const empty=locationSetupSuggestion({verified:true,count:0,activeCount:0,canManage:false})
  assert.equal(empty?.id,'locations-empty')
  assert.match(empty.detail,/no habilita/)
  assert.equal(empty?.route,'inicio')
  assert.equal(locationSetupSuggestion({verified:true,count:2,activeCount:0,canManage:true})?.id,'locations-paused')
})

test('H3: equipo solo cuando el directorio es visible y el usuario está solo', () => {
  assert.equal(teamSetupSuggestion({verified:true,canRead:false,onlySelf:true,canInvite:true}),null)
  assert.equal(teamSetupSuggestion({verified:false,canRead:true,onlySelf:true,canInvite:true}),null)
  assert.equal(teamSetupSuggestion({verified:true,canRead:true,onlySelf:false,canInvite:true}),null)
  const solo=teamSetupSuggestion({verified:true,canRead:true,onlySelf:true,canInvite:false})
  assert.equal(solo?.id,'team-solo')
  assert.match(solo.detail,/persona con permisos/)
})

test('H3: catálogo distingue error, vacío y acceso de solo lectura', () => {
  assert.equal(catalogSetupSuggestion({verified:false,count:0,canWrite:true}),null)
  assert.equal(catalogSetupSuggestion({verified:true,count:1,canWrite:true}),null)
  const empty=catalogSetupSuggestion({verified:true,count:0,canWrite:false})
  assert.equal(empty?.id,'catalog-empty')
  assert.match(empty.detail,/persona autorizada/)
})

const inventory={
  verified:true,locationsCount:1,catalogCount:1,catalogComplete:true,physicalCount:1,
  balancesLoaded:true,balancesCount:0,unfiltered:true,
}
test('H3: inventario no inventa stock por falla, filtro o catálogo parcial', () => {
  assert.equal(inventorySetupSuggestion({...inventory,verified:false}),null)
  assert.equal(inventorySetupSuggestion({...inventory,unfiltered:false}),null)
  assert.equal(inventorySetupSuggestion({...inventory,catalogComplete:false}),null)
  assert.equal(inventorySetupSuggestion({...inventory,balancesLoaded:false}),null)
  assert.equal(inventorySetupSuggestion({...inventory,balancesCount:2}),null)
  assert.equal(inventorySetupSuggestion(inventory)?.id,'inventory-no-balances')
})

test('H3: inventario da prioridad a sedes y trata servicios como no físicos', () => {
  assert.equal(inventorySetupSuggestion({...inventory,locationsCount:0})?.id,'inventory-locations')
  assert.equal(inventorySetupSuggestion({...inventory,catalogCount:0,physicalCount:0})?.id,'inventory-catalog')
  assert.equal(inventorySetupSuggestion({...inventory,physicalCount:0})?.id,'inventory-services')
  assert.equal(inventorySetupSuggestion({...inventory,physicalCount:0,catalogComplete:false}),null)
})
