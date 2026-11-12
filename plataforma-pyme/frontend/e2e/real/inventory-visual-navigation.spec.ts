import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const api='http://127.0.0.1:18001/api/v1'
test.beforeAll(()=>{
  if(process.env.PYME_DISPOSABLE_QA!=='1')
    throw new Error('E3-1F1 requiere base PostgreSQL descartable y PYME_DISPOSABLE_QA=1')
})

test('E3-1F1: inventario y operaciones aisladas, volver sin escrituras y diseño móvil',async({request,page})=>{
  const email='e3-1f1-'+randomUUID()+'@example.com'
  const password='Clave inventario descartable E3!'
  const reg=await request.post(api+'/auth/register',{
    data:{email,password,display_name:'Inventario E3 QA'},
  })
  expect(reg.status(),await reg.text()).toBe(201)
  const auth=await request.post(api+'/auth/login',{data:{email,password}})
  expect(auth.status(),await auth.text()).toBe(200)
  const headers={Authorization:'Bearer '+(await auth.json()).access_token}
  async function post(path:string,data:object){
    const response=await request.post(api+path,{
      headers:{...headers,'Idempotency-Key':randomUUID()},data,
    })
    expect(response.status(),await response.text()).toBe(201)
    return response.json()
  }
  const company=await post('/businesses',{
    name:'E3 inventario descartable',category:'QA',activity_kind:'MIXTO',
  })
  const root='/businesses/'+company.id
  const origin=await post(root+'/locations',{
    name:'Depósito principal QA',kind:'DEPOSITO',address:'',map_url:'',can_store:true,can_sell:false,
  })
  await post(root+'/locations',{
    name:'Depósito secundario QA',kind:'DEPOSITO',address:'',map_url:'',can_store:true,can_sell:false,
  })
  const item=await post(root+'/catalog',{
    name:'Artículo inventario E3',kind:'REVENTA',unit:'UNIDAD',sellable:true,sku:'E3F1-001',
  })
  await post(root+'/inventory/adjustments',{
    kind:'STOCK_INICIAL',catalog_item_id:item.id,location_id:origin.id,
    quantity_milli:9000,expected_version:0,reason:'Saldo aislado inicial E3-1F1',
  })
  const movements=await request.get(api+root+'/inventory/movements',{headers})
  expect(movements.status(),await movements.text()).toBe(200)
  expect(await movements.json()).toHaveLength(1)

  await page.setViewportSize({width:390,height:844})
  await page.goto('/real/empresas/'+company.id+'/inventario')
  await page.getByLabel('Correo electrónico',{exact:true}).fill(email)
  await page.getByLabel('Contraseña',{exact:true}).fill(password)
  await page.getByRole('button',{name:'Ingresar',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Inventario',exact:true})).toBeVisible()
  await expect(page.getByLabel('Resumen de inventario cargado')).toContainText('Existencias cargadas')
  const balances=page.locator('article.real-inventory-balance')
  await expect(balances).toHaveCount(1)
  await expect(balances.first()).toContainText('Artículo inventario E3')
  const postBefore:string[]=[]
  page.on('request',req=>{
    if(req.method()==='POST'&&/\/inventory\/(adjustments|transfers)$/.test(new URL(req.url()).pathname))
      postBefore.push(req.url())
  })
  await page.getByRole('button',{name:'Transferir entre ubicaciones'}).click()
  await expect(page.getByRole('heading',{name:'Transferir entre ubicaciones',exact:true,level:1})).toBeVisible()
  await expect(balances).toHaveCount(0)
  await expect(page.getByRole('heading',{name:'Transferir entre ubicaciones',exact:true,level:1})).toBeFocused()
  await page.getByRole('region',{name:'Transferencia real entre sedes'})
    .getByRole('button',{name:'Volver a inventario'}).click()
  await expect(page.getByRole('heading',{name:'Inventario',exact:true})).toBeVisible()
  await expect(balances).toHaveCount(1)

  await page.getByRole('button',{name:'Stock inicial y ajustes'}).click()
  await expect(page.getByRole('heading',{name:'Stock inicial y ajustes',exact:true,level:1})).toBeVisible()
  await expect(balances).toHaveCount(0)
  await page.getByRole('region',{name:'Stock inicial y ajustes REALES'})
    .getByRole('button',{name:'Volver a inventario'}).click()
  await expect(balances).toHaveCount(1)

  await page.getByRole('button',{name:'Historial de movimientos'}).click()
  const history=page.locator('article.real-inventory-movement')
  await expect(history).toHaveCount(1)
  await expect(history.first().locator('.e3-inventory-actor')).toContainText('Realizó el movimiento:')
  await expect(history.first().locator('.e3-inventory-actor')).toContainText('Inventario E3 QA')
  await history.first().getByText('Ver trazabilidad').click()
  await expect(history.first().locator('.real-inventory-trace')).toContainText('Responsable (ID)')
  const ledgerRow=(await movements.json())[0]
  await expect(history.first().locator('.real-inventory-trace')).toContainText(ledgerRow.actor_id)
  await page.getByLabel('Ubicación',{exact:true}).selectOption(origin.id)
  await expect(history).toHaveCount(1)
  expect(postBefore,'Cambiar vistas no genera ajustes ni traslados').toHaveLength(0)
  const after=await request.get(api+root+'/inventory/movements',{headers})
  expect(after.status(),await after.text()).toBe(200)
  expect(await after.json()).toHaveLength(1)
  const width=await page.evaluate(()=>Math.max(
    document.documentElement.scrollWidth,document.body.scrollWidth))
  expect(width,'Sin desplazamiento horizontal a 390px').toBeLessThanOrEqual(391)
})
