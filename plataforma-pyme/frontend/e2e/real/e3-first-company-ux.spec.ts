import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const api='http://127.0.0.1:18001/api/v1'
test.beforeAll(()=>{
  if(process.env.PYME_DISPOSABLE_QA!=='1')
    throw new Error('E3-1H2 usa exclusivamente PostgreSQL efímero y cuenta QA descartable.')
})

test('E3-1H2: primera empresa lleva al Inicio, menú contraíble y móvil accesible',async({page,request})=>{
  const email='e3-h2-'+randomUUID()+'@example.com'
  const password='QA E3 H2 clave descartable 2026!'
  const name='Empresa nueva E3 H2 '+randomUUID().slice(0,6)
  const registration=await request.post(api+'/auth/register',{
    data:{email,password,display_name:'Onboarding H2 QA'},
  })
  expect(registration.status(),await registration.text()).toBe(201)

  await page.setViewportSize({width:1440,height:900})
  let creations=0
  let commercialMutations=0
  page.on('request',req=>{
    const pathname=new URL(req.url()).pathname
    if(req.method()==='POST'&&pathname==='/api/v1/businesses')creations++
    if(req.method()!=='GET'&&/\/api\/v1\/businesses\/[^/]+\/(?:sales|inventory|purchases)/.test(pathname))
      commercialMutations++
  })
  await page.goto('/real/empresas')
  await page.getByLabel('Correo electrónico',{exact:true}).fill(email)
  await page.getByLabel('Contraseña',{exact:true}).fill(password)
  await page.getByRole('button',{name:'Ingresar',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Mis empresas'})).toBeVisible()
  await page.getByRole('button',{name:'Crear nueva empresa'}).click()
  await expect(page.getByRole('heading',{name:'Nueva empresa real'})).toBeVisible()
  await page.getByLabel('Nombre comercial').fill(name)
  await page.getByLabel('Rubro',{exact:true}).fill('Consultoría QA')
  await page.getByLabel('Actividad',{exact:true}).selectOption('SERVICIOS')
  await page.getByRole('checkbox',{name:/Acepto conservar/}).check()
  await page.getByRole('button',{name:'Crear empresa',exact:true}).click()
  await expect(page).toHaveURL(/\/real\/empresas\/[0-9a-f-]{36}\/inicio$/)
  await expect(page.getByRole('heading',{name:'Inicio',exact:true})).toBeVisible()
  await expect(page.getByRole('region',{name:'Siguiente paso recomendado'}))
    .toContainText('Prepará tu primera ubicación')
  const progress=page.getByRole('progressbar',{name:'Configuración inicial observada'})
  await expect(progress).toHaveAttribute('aria-valuenow','0')
  expect(creations,'Debe emitir un solo POST de creación de empresa').toBe(1)

  const sidebar=page.locator('#real-workspace-nav')
  const collapse=page.getByRole('button',{name:'Contraer menú lateral'})
  await collapse.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.real-workspace-mode')).toHaveClass(/rw-collapsed-workspace/)
  await expect(sidebar).toHaveClass(/rw-sidebar-compact/)
  await expect(page.getByRole('button',{name:'Expandir menú lateral'})).toBeVisible()
  // Íconos con nombres accesibles: navegar mantiene la preferencia visual.
  await sidebar.getByRole('button',{name:'Mi empresa',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Datos de la empresa',exact:true})).toBeVisible()
  await expect(page.locator('.real-workspace-mode')).toHaveClass(/rw-collapsed-workspace/)
  await sidebar.getByRole('button',{name:'Inicio',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Inicio',exact:true})).toBeVisible()

  await page.setViewportSize({width:390,height:844})
  await page.getByRole('button',{name:'Abrir menú'}).click()
  await expect(sidebar).toHaveClass(/rw-sidebar-open/)
  await expect(sidebar.getByRole('button',{name:'Ubicaciones',exact:true})).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(sidebar).not.toHaveClass(/rw-sidebar-open/)
  const width=await page.evaluate(()=>
    Math.max(document.documentElement.scrollWidth,document.body.scrollWidth))
  expect(width,'No debe generar scroll horizontal en pantalla de 390px').toBeLessThanOrEqual(391)
  expect(commercialMutations,'Onboarding y navegación no deben alterar operaciones comerciales').toBe(0)
})
