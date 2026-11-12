import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const api='http://127.0.0.1:18001/api/v1'
test.beforeAll(()=>{
  if(process.env.PYME_DISPOSABLE_QA!=='1')
    throw new Error('E3-1E1 requiere PostgreSQL descartable y PYME_DISPOSABLE_QA=1')
})

test('E3-1E1: listado y alta de compra separados, cancelación sin escritura y móvil',async({request,page})=>{
  const email='e3-1e1-'+randomUUID()+'@example.com',password='Clave compras QA 2026!'
  const registered=await request.post(api+'/auth/register',{data:{email,password,display_name:'Titular E3 Compras'}})
  expect(registered.status(),await registered.text()).toBe(201)
  const login=await request.post(api+'/auth/login',{data:{email,password}})
  expect(login.status(),await login.text()).toBe(200)
  const headers={Authorization:'Bearer '+(await login.json()).access_token,'Idempotency-Key':randomUUID()}
  const company=await request.post(api+'/businesses',{headers,data:{name:'Empresa E3-1E1 descartable',category:'Pruebas',activity_kind:'MIXTO'}})
  expect(company.status(),await company.text()).toBe(201)
  const businessId=(await company.json()).id
  const supplier=await request.post(api+'/businesses/'+businessId+'/suppliers',{headers:{...headers,'Idempotency-Key':randomUUID()},data:{name:'Proveedor E3-1E1'}})
  expect(supplier.status(),await supplier.text()).toBe(201)
  const supplierId=(await supplier.json()).id
  const created=await request.post(api+'/businesses/'+businessId+'/purchases',{
    headers:{...headers,'Idempotency-Key':randomUUID()},
    data:{purchased_on:'2026-11-12',supplier_id:supplierId,reference:'Compra de referencia E3-1E1',
      notes:'QA sin recepción',lines:[{catalog_item_id:null,description:'Servicios contratados',unit:'CONCEPTO',
        quantity_milli:1000,unit_cost_cents:125000}]},
  })
  expect(created.status(),await created.text()).toBe(201)
  await page.setViewportSize({width:390,height:844})
  await page.goto('/real/empresas/'+businessId+'/compras')
  await page.getByLabel('Correo electrónico',{exact:true}).fill(email)
  await page.getByLabel('Contraseña',{exact:true}).fill(password)
  await page.getByRole('button',{name:'Ingresar',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Compras y recepción'})).toBeVisible()
  const cards=page.locator('article.real-supply-card')
  await expect(cards).toHaveCount(1)
  await expect(page.getByLabel('Resumen de compras cargadas')).toContainText('1')
  await page.getByLabel('Buscar compras cargadas').fill('Sin coincidencias')
  await expect(cards).toHaveCount(0)
  await page.getByLabel('Buscar compras cargadas').clear()
  await page.getByLabel('Filtrar compras por estado').selectOption('RECIBIDA')
  await expect(cards).toHaveCount(0)
  await page.getByLabel('Filtrar compras por estado').selectOption('TODAS')
  await expect(cards).toHaveCount(1)

  let uiWrites=0
  page.on('request',req=>{
    if(req.method()==='POST'&&req.url().includes('/businesses/'+businessId+'/purchases'))uiWrites++
  })
  await page.getByRole('button',{name:'Registrar compra REAL'}).click()
  await expect(page.getByRole('heading',{name:'Nueva compra'})).toBeVisible()
  await expect(page.getByRole('button',{name:'Registrar compra',exact:true})).toBeVisible()
  await expect(page.getByText('Al registrar la compra, quedará pendiente de recepción.',{exact:false})).toBeVisible()
  await expect(page.getByRole('button',{name:'Volver a compras'})).toBeFocused()
  await expect(cards).toHaveCount(0)
  await page.getByLabel('Referencia').fill('Borrador no registrado')
  await page.getByRole('button',{name:'Cancelar',exact:true}).click()
  await expect(cards).toHaveCount(1)
  await expect(page.getByRole('heading',{name:'Compras y recepción'})).toBeFocused()
  await page.getByRole('button',{name:'Registrar compra REAL'}).click()
  await expect(page.getByLabel('Referencia')).toHaveValue('')
  await page.getByRole('button',{name:'Volver a compras'}).click()
  expect(uiWrites).toBe(0)
  const existing=await request.get(api+'/businesses/'+businessId+'/purchases',{headers})
  expect(existing.status(),await existing.text()).toBe(200)
  expect(await existing.json()).toHaveLength(1)
  const width=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth))
  expect(width,'No hay desplazamiento horizontal a 390px').toBeLessThanOrEqual(391)
})
