import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'

// PostgreSQL efímero: jamás usar la base habitual para confirmar recepciones.
const api='http://127.0.0.1:18001/api/v1'
test.beforeAll(()=>{
  if(process.env.PYME_DISPOSABLE_QA!=='1')
    throw new Error('E3-1E2 exige PYME_DISPOSABLE_QA=1 y PostgreSQL descartable')
})

test('E3-1E2: recepción en pantalla exclusiva, comprobante, regreso y un solo movimiento',async({request,page})=>{
  const email='e3-1e2-'+randomUUID()+'@example.com'
  const password='Recepción QA descartable 2026!'
  const registration=await request.post(api+'/auth/register',{
    data:{email,password,display_name:'Titular E3 Recepciones'},
  })
  expect(registration.status(),await registration.text()).toBe(201)
  const login=await request.post(api+'/auth/login',{data:{email,password}})
  expect(login.status(),await login.text()).toBe(200)
  const headers={Authorization:'Bearer '+(await login.json()).access_token}
  async function post(path:string,data:object){
    const res=await request.post(api+path,{headers:{...headers,'Idempotency-Key':randomUUID()},data})
    expect(res.status(),await res.text()).toBe(201)
    return res.json()
  }
  async function get(path:string){
    const res=await request.get(api+path,{headers})
    expect(res.status(),await res.text()).toBe(200)
    return res.json()
  }
  const business=await post('/businesses',{
    name:'Empresa recepciones E3 descartable',category:'QA',activity_kind:'MIXTO',
  })
  const root='/businesses/'+business.id
  const location=await post(root+'/locations',{
    name:'Depósito E3-1E2',kind:'DEPOSITO',can_sell:false,can_store:true,address:'',map_url:'',
  })
  const item=await post(root+'/catalog',{
    name:'Insumo E3-1E2',kind:'REVENTA',unit:'UNIDAD',sellable:true,sku:'E3-1E2-QA',
  })
  const purchase=await post(root+'/purchases',{
    purchased_on:'2026-11-12',reference:'Compra física E3-1E2',
    lines:[
      {catalog_item_id:item.id,description:item.name,unit:'UNIDAD',
        quantity_milli:3000,unit_cost_cents:10000},
      {catalog_item_id:null,description:'Servicio sin stock',unit:'CONCEPTO',
        quantity_milli:1000,unit_cost_cents:1200},
    ],
  })
  const initialMoves=await get(root+'/inventory/movements')
  expect(initialMoves).toEqual([])
  await page.setViewportSize({width:390,height:844})
  await page.goto('/real/empresas/'+business.id+'/compras')
  await page.getByLabel('Correo electrónico',{exact:true}).fill(email)
  await page.getByLabel('Contraseña',{exact:true}).fill(password)
  await page.getByRole('button',{name:'Ingresar',exact:true}).click()
  const cards=page.locator('article.real-supply-card')
  await expect(cards).toHaveCount(1)
  await cards.first().getByRole('button',{name:'Pendiente · Confirmar recepción en ubicación'}).click()
  await expect(page.getByRole('heading',{name:'Recepción de compra',exact:true})).toBeVisible()
  await expect(cards).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Volver a compras'}).first()).toBeFocused()
  await expect(page.getByLabel('Resumen de compra a recibir')).toContainText('Importe registrado')
  await expect(page.getByLabel('Pantalla de recepción')).toContainText('Concepto: no genera stock físico')

  let postCount=0
  page.on('request',req=>{
    if(req.method()==='POST'&&new URL(req.url()).pathname.endsWith(
      '/businesses/'+business.id+'/purchases/'+purchase.id+'/receive'))postCount++
  })
  await page.getByRole('button',{name:'Volver a compras'}).first().click()
  await expect(cards).toHaveCount(1)
  expect(postCount).toBe(0)
  expect(await get(root+'/inventory/movements')).toEqual([])

  await cards.first().getByRole('button',{name:'Pendiente · Confirmar recepción en ubicación'}).click()
  await page.getByLabel('Destino con almacenamiento activo').selectOption(location.id)
  page.once('dialog',dialog=>void dialog.accept())
  await page.getByRole('button',{name:'Confirmar recepción REAL'}).click()
  await expect(page.getByRole('heading',{name:'Comprobante de recepción',exact:true})).toBeVisible()
  await expect(cards).toHaveCount(0)
  await expect(page.getByLabel('Detalle de recepción confirmada')).toContainText('Insumo E3-1E2')
  await expect(page.getByLabel('Detalle de recepción confirmada')).toContainText('+3 UNIDAD')
  await expect(page.getByLabel('Detalle de recepción confirmada')).toContainText('Titular E3 Recepciones')
  expect(postCount,'Solo un POST receive al confirmar').toBe(1)
  const balances=await get(root+'/inventory/balances')
  expect(balances).toHaveLength(1)
  expect(balances[0]).toMatchObject({
    location_id:location.id,catalog_item_id:item.id,quantity_milli:3000,version:1,
  })
  const movements=await get(root+'/inventory/movements')
  expect(movements).toHaveLength(1)
  expect(movements[0]).toMatchObject({
    catalog_item_id:item.id,delta_milli:3000,event_type:'COMPRA_RECEPCION',
  })
  await page.getByRole('button',{name:'Volver a compras'}).first().click()
  await expect(cards).toHaveCount(1)
  await expect(cards.first().getByRole('button',{name:'Consultar comprobante'})).toBeVisible()
  await cards.first().getByRole('button',{name:'Consultar comprobante'}).click()
  await expect(page.getByRole('heading',{name:'Comprobante de recepción'})).toBeVisible()
  expect(postCount,'Consultar comprobante solo realiza GET').toBe(1)
  await page.getByRole('button',{name:'Volver a compras'}).first().click()
  await page.reload()
  await page.getByLabel('Correo electrónico',{exact:true}).fill(email)
  await page.getByLabel('Contraseña',{exact:true}).fill(password)
  await page.getByRole('button',{name:'Ingresar',exact:true}).click()
  await expect(page.locator('article.real-supply-card').getByRole('button',{name:'Consultar comprobante'})).toBeVisible()
  expect(await get(root+'/inventory/movements')).toEqual(movements)
  const width=await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth))
  expect(width,'Vista adaptada a 390px').toBeLessThanOrEqual(391)
})
