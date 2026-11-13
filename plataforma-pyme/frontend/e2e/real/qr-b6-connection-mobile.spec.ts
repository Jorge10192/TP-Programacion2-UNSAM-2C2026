import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'

/** B6 UX: el navegador no conoce credenciales MP, ni crea pagos sin modo TEST. */
const api='http://127.0.0.1:18001/api/v1'
test.beforeAll(()=>{
  if(process.env.PYME_DISPOSABLE_QA!=='1')throw Error('Requiere Postgres descartable')
})

test('B6: cuenta DEMO y cuenta oficial TEST separadas, móvil 390px, sin POST a MP',async({request,page})=>{
  const email='b6-qa-'+randomUUID()+'@example.com'
  const password='B6 prueba QA segura sin credenciales!'
  const registered=await request.post(api+'/auth/register',{
    data:{email,password,display_name:'B6 QA UX'},
  })
  expect(registered.status(),await registered.text()).toBe(201)
  const login=await request.post(api+'/auth/login',{data:{email,password}})
  expect(login.status(),await login.text()).toBe(200)
  const auth={Authorization:'Bearer '+(await login.json()).access_token}
  const business=await request.post(api+'/businesses',{
    headers:{...auth,'Idempotency-Key':randomUUID()},
    data:{name:'B6 Cuenta QR',category:'QA',activity_kind:'MIXTO'},
  })
  expect(business.status(),await business.text()).toBe(201)
  const bid=(await business.json()).id
  let providerRequests=0
  page.on('request',req=>{
    if(req.url().includes('mercadopago.com')||req.url().includes('auth.mercadopago.com'))providerRequests++
  })
  await page.setViewportSize({width:390,height:844})
  await page.goto('/real/empresas/'+bid+'/medios-de-cobro')
  await page.getByLabel('Correo electrónico',{exact:true}).fill(email)
  await page.getByLabel('Contraseña',{exact:true}).fill(password)
  await page.getByRole('button',{name:'Ingresar',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Medios de cobro',exact:true})).toBeVisible()
  const official=page.getByLabel('Mercado Pago oficial TEST')
  await expect(official).toBeVisible()
  await expect(official).toContainText('Integración B6')
  await expect(official).toContainText('NO PRODUCCIÓN')
  await expect(official).toContainText('Sin cuenta asociada')
  await expect(official.getByRole('button',{name:'Vincular vendedor TEST por OAuth'})).toHaveCount(0)
  await expect(page.getByRole('heading',{name:'Mercado Pago'}).first()).toBeVisible()
  const width=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth))
  expect(width,'La pantalla de cuenta/caja TEST no debe desbordar 390px').toBeLessThanOrEqual(391)
  expect(providerRequests).toBe(0)
})
