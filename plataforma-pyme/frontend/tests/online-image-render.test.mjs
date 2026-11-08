import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {runnerImport} from 'vite'

test('UI conectada muestra varias empresas y caja general sin tocar imágenes locales',async()=>{
  const fixture=JSON.parse(readFileSync(new URL('./fixtures/online-snapshot.http.json',import.meta.url),'utf8'))
  const {module}=await runnerImport(fileURLToPath(new URL('./online-image-render-harness.tsx',import.meta.url)),{configFile:false})
  const original=Object.getOwnPropertyDescriptor(globalThis,'indexedDB')
  Object.defineProperty(globalThis,'indexedDB',{configurable:true,get(){throw new Error('API no debe abrir IndexedDB')}})
  try{
    const html=module.renderOnlineFixture(fixture)
    for(const business of Object.values(fixture.snapshot.businessesById)){
      assert.ok(html.home.includes(business.name))
      assert.ok(html.topbar.includes(business.id))
    }
    assert.match(html.home,/Mis empresas|Crear empresa/)
    assert.doesNotMatch(html.home,/NEGOCIO PRINCIPAL|espacio DEMO/)
    assert.match(html.topbar,/Cambiar de empresa/)
    assert.match(html.supplier,/Nombre comercial/)
    assert.match(html.cash,/Caja general/)
    assert.match(html.secondInventory.replace(/<[^>]*>/g,''),/Artículos con stock\s*0/)
    assert.doesNotMatch(html.catalog,/SQL|<span>Sin autenticación/)
  }finally{
    if(original)Object.defineProperty(globalThis,'indexedDB',original)
    else delete globalThis.indexedDB
  }
})

test('una membresía de consulta no ofrece edición de catálogo',async()=>{
  const fixture=JSON.parse(readFileSync(new URL('./fixtures/online-snapshot.http.json',import.meta.url),'utf8'))
  for(const [id,member] of Object.entries(fixture.snapshot.membershipsByBusinessId)){
    member.role='TRABAJADOR'
    fixture.snapshot.apiCapabilitiesByBusiness[id].resources=false
    fixture.snapshot.apiCapabilitiesByBusiness[id].business=false
  }
  const {module}=await runnerImport(fileURLToPath(new URL('./online-image-render-harness.tsx',import.meta.url)),{configFile:false})
  const html=module.renderOnlineFixture(fixture)
  assert.match(html.catalog,/<button[^>]+disabled=""[^>]*>Editar<\/button>/)
})
