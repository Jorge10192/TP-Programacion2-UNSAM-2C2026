import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const api='http://127.0.0.1:18001/api/v1'
test.beforeAll(()=>{
  if(process.env.PYME_DISPOSABLE_QA!=='1')
    throw new Error('E3-2B B5 usa únicamente PostgreSQL QA descartable')
})

test('B5: historial QR móvil→detalle→estado→POS sin escrituras desde UI',async({request,page})=>{
  const email='b5-qr-'+randomUUID()+'@example.com'
  const password='E3 B5 clave QA descartable 2026!'
  const reg=await request.post(api+'/auth/register',{
    data:{email,password,display_name:'QA cobros QR'},
  })
  expect(reg.status(),await reg.text()).toBe(201)
  const login=await request.post(api+'/auth/login',{data:{email,password}})
  expect(login.status(),await login.text()).toBe(200)
  const auth={Authorization:'Bearer '+(await login.json()).access_token}
  const created=await request.post(api+'/businesses',{
    headers:{...auth,'Idempotency-Key':randomUUID()},
    data:{name:'Empresa B5 QA',category:'Servicios',activity_kind:'MIXTO'},
  })
  expect(created.status(),await created.text()).toBe(201)
  const bid=(await created.json()).id
  const root='/businesses/'+bid
  const connected=await request.post(api+root+'/payment-connections/mercadopago/demo',{headers:auth})
  expect(connected.status(),await connected.text()).toBe(200)
  const item=await request.post(api+root+'/catalog',{
    headers:auth,data:{name:'Servicio B5',kind:'SERVICIO',unit:'SERVICIO',sellable:true,price_cents:12500},
  })
  expect(item.status(),await item.text()).toBe(201)
  const qr=await request.post(api+root+'/qr-payment-intents',{
    headers:{...auth,'Idempotency-Key':randomUUID()},
    data:{lines:[{catalog_item_id:(await item.json()).id,quantity_milli:1000,unit_price_cents:12500}],discount_cents:500},
  })
  expect(qr.status(),await qr.text()).toBe(201)
  const intent=await qr.json()

  let writes=0
  page.on('request',req=>{
    if(req.method()!=='GET'&&new URL(req.url()).pathname.startsWith('/api/v1/businesses/'))writes++
  })
  await page.setViewportSize({width:390,height:844})
  await page.goto('/real/empresas/'+bid+'/cobros-qr')
  await page.getByLabel('Correo electrónico',{exact:true}).fill(email)
  await page.getByLabel('Contraseña',{exact:true}).fill(password)
  await page.getByRole('button',{name:'Ingresar',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Cobros QR',exact:true})).toBeVisible()
  await expect(page.getByLabel('Lista de cobros QR DEMO')).toContainText(intent.reference)
  await expect(page.getByLabel('Lista de cobros QR DEMO')).toContainText('Pendiente de simulación')
  await page.getByRole('button',{name:'Ver QR y detalle'}).click()
  await expect(page).toHaveURL(new RegExp('/qr-cobros/'+intent.id+'$'))
  await expect(page.getByRole('heading',{name:'Mercado Pago QR'})).toBeVisible()
  await expect(page.getByText('QR DE PRUEBA · NO COBRABLE')).toBeVisible()
  await expect(page.getByText('Servicio B5')).toBeVisible()
  await expect(page.getByText('CREAR', {exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Ver cobros QR'}).click()
  await expect(page.getByRole('heading',{name:'Cobros QR',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Medios de cobro'}).click()
  await expect(page.getByRole('heading',{name:'Medios de cobro',exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:'Ver cobros QR'})).toBeVisible()
  const width=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth))
  expect(width,'Cobros QR no debe desbordar 390px').toBeLessThanOrEqual(391)
  expect(writes,'La navegación de B5 no debe emitir escrituras comerciales').toBe(0)
})
