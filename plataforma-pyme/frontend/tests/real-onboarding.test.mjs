import test from 'node:test'
import assert from 'node:assert/strict'
import { assessBusinessSetup } from '../src/features/onboarding/realOnboardingModel.ts'

const biz='a4444444-4444-4444-8444-444444444444'
const site='b5555555-5555-4555-8555-555555555555'
const item='c6666666-6666-4666-8666-666666666666'
const business={id:biz,name:'Empresa de pruebas',status:'ACTIVA',
  membership:{role:'TITULAR_ADMINISTRATIVO',status:'ACTIVA'}}
const loc={id:site,business_id:biz,status:'ACTIVA',can_sell:true,can_store:true}
const goods={id:item,business_id:biz,status:'ACTIVO',sellable:true,item_type:'BIEN'}
const service={...goods,item_type:'SERVICIO'}
const balances={business_id:biz,location_id:site,catalog_item_id:item,quantity_milli:5000}
const ready=(data)=>({state:'ready',data})
const records=(items,complete=true)=>ready({items,complete})
function facts(patch={}){
  return {business,locations:ready([]),catalog:records([]),balances:records([]),...patch}
}
const byId=(result,id)=>result.steps.find(step=>step.id===id).status

test('E3-1H1: una empresa nueva no recibe estadísticas falsas ni progreso ficticio',()=>{
  const result=assessBusinessSetup(facts())
  assert.equal(result.completed,0)
  assert.equal(result.required,3)
  assert.deepEqual(result.steps.map(x=>x.status),['todo','todo','todo'])
  assert.equal(result.suggested.id,'location')
  assert.equal(result.verified,true)
})

test('E3-1H1: empresas exclusivamente de servicios no requieren stock físico',()=>{
  const result=assessBusinessSetup(facts({locations:ready([loc]),catalog:records([service])}))
  assert.deepEqual(result.steps.map(x=>x.status),['done','done','not-required'])
  assert.equal(result.completed,2)
  assert.equal(result.required,2)
  assert.equal(result.suggested,null)
})

test('E3-1H1: bienes físicos con stock positivo en una sede habilitada están preparados',()=>{
  const result=assessBusinessSetup(facts({
    locations:ready([loc]),catalog:records([goods]),balances:records([balances]),
  }))
  assert.deepEqual(result.steps.map(x=>x.status),['done','done','done'])
  assert.equal(result.completed,3)
  assert.equal(result.required,3)
})

test('E3-1H1: stock de una sede pausada o sin depósito no da progreso',()=>{
  for(const changed of [{status:'PAUSADA'},{can_store:false}]){
    const result=assessBusinessSetup(facts({
      locations:ready([{...loc,...changed}]),catalog:records([goods]),balances:records([balances]),
    }))
    assert.equal(byId(result,'stock'),'todo')
  }
})

test('E3-1H1: consulta parcial o 403 se marca no verificada, jamás vacío',()=>{
  const noInventory=assessBusinessSetup(facts({
    locations:ready([loc]),catalog:records([goods]),
    balances:{state:'unavailable',message:'Acceso restringido'},
  }))
  assert.equal(byId(noInventory,'stock'),'unknown')
  assert.equal(noInventory.verified,false)
  const partialCatalog=assessBusinessSetup(facts({catalog:records([],false)}))
  assert.equal(byId(partialCatalog,'catalog'),'unknown')
  assert.equal(byId(partialCatalog,'stock'),'unknown')
  const partialBalances=assessBusinessSetup(facts({
    locations:ready([loc]),catalog:records([goods]),balances:records([],false),
  }))
  assert.equal(byId(partialBalances,'stock'),'unknown')
})

test('E3-1H1: balance cero no es stock suficiente para vender',()=>{
 const result=assessBusinessSetup(facts({
   locations:ready([loc]),catalog:records([goods]),
   balances:records([{...balances,quantity_milli:0}]),
 }))
 assert.equal(byId(result,'stock'),'todo')
})
