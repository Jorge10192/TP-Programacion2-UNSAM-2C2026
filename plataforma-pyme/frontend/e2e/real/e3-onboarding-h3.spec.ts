import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const api='http://127.0.0.1:18001/api/v1'
test.beforeAll(()=>{
  if(process.env.PYME_DISPOSABLE_QA!=='1')
    throw new Error('E3-1H3 exige PostgreSQL y FastAPI exclusivamente descartables')
})

test('E3-1H3: guía contextual con datos REAL, servicios sin stock y navegación móvil',async({page,request})=>{
  const email='e3-h3-'+randomUUID()+'@example.com'
  const password='Clave H3 descartable QA 2026!'
  const registration=await request.post(api+'/auth/register',{
    data:{email,password,display_name:'QA H3 contexto'},
  })
  expect(registration.status(),await registration.text()).toBe(201)
  const login=await request.post(api+'/auth/login',{data:{email,password}})
  expect(login.status(),await login.text()).toBe(200)
  const headers={Authorization:'Bearer '+(await login.json()).access_token}
  const created=await request.post(api+'/businesses',{
    headers:{...headers,'Idempotency-Key':randomUUID()},
    data:{name:'Comercio H3 '+randomUUID().slice(0,6),category:'Consultoría QA',activity_kind:'MIXTO'},
  })
  expect(created.status(),await created.text()).toBe(201)
  const {id}=await created.json()
  const base='/real/empresas/'+id
  const endpoint=api+'/businesses/'+id
  let commercialWrites=0
  page.on('request',req=>{
    if(req.method()!=='GET'&&/\/api\/v1\/businesses\/[^/]+\/(?:locations|catalog|inventory|purchases|sales)/.test(new URL(req.url()).pathname))
      commercialWrites++
  })

  await page.goto(base+'/ubicaciones')
  await page.getByLabel('Correo electrónico',{exact:true}).fill(email)
  await page.getByLabel('Contraseña',{exact:true}).fill(password)
  await page.getByRole('button',{name:'Ingresar',exact:true}).click()
  const guide=page.getByRole('complementary',{name:'Orientación para primeros pasos'})
  await expect(guide).toContainText('Primero, definí dónde trabaja tu empresa')
  await guide.getByRole('button',{name:'Volver a primeros pasos'}).click()
  await expect(page).toHaveURL(new RegExp('/inicio$'))
  await expect(page.getByRole('progressbar',{name:'Configuración inicial observada'}))
    .toHaveAttribute('aria-valuenow','0')

  const nav=page.locator('#real-workspace-nav')
  await nav.getByRole('button',{name:'Catálogo',exact:true}).click()
  await expect(guide).toContainText('Registrá lo que ofrecés')

  await nav.getByRole('button',{name:'Equipo',exact:true}).click()
  await expect(guide).toContainText('Podés empezar trabajando por tu cuenta')

  const location=await request.post(endpoint+'/locations',{
    headers,data:{name:'Sede H3',kind:'OFICINA',can_sell:true,can_store:true},
  })
  expect(location.status(),await location.text()).toBe(201)
  const service=await request.post(endpoint+'/catalog',{
    headers,data:{name:'Asesoría H3',kind:'SERVICIO',unit:'SERVICIO',sellable:true,price_cents:150000},
  })
  expect(service.status(),await service.text()).toBe(201)

  await nav.getByRole('button',{name:'Inventario y movimientos',exact:true}).click()
  await expect(guide).toContainText('Los servicios no requieren inventario físico')
  await expect(guide).toContainText('No cargues stock inicial para ellos')
  await guide.getByRole('button',{name:'Revisar Catálogo'}).click()
  await expect(page).toHaveURL(new RegExp('/catalogo$'))
  await expect(guide).toHaveCount(0)
  await page.getByRole('button',{name:'Crear artículo REAL'}).click()
  await page.getByLabel('Tipo',{exact:true}).selectOption('SERVICIO')
  await expect(page.getByText('Los servicios no requieren stock inicial ni movimientos de inventario.',{exact:false})).toBeVisible()
  await page.getByRole('button',{name:'Cancelar',exact:true}).click()

  await page.setViewportSize({width:390,height:844})
  await page.getByRole('button',{name:'Abrir menú'}).click()
  await nav.getByRole('button',{name:'Inventario y movimientos',exact:true}).click()
  await expect(guide).toContainText('Los servicios no requieren inventario físico')
  const width=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth))
  expect(width,'La orientación H3 no debe desbordar el viewport de 390px').toBeLessThanOrEqual(391)
  expect(commercialWrites,'La orientación no puede crear operaciones comerciales').toBe(0)
})
