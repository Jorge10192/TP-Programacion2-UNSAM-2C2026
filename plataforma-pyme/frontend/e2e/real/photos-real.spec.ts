import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const api='http://127.0.0.1:18001/api/v1'
test.beforeAll(()=>{
  if(process.env.PYME_DISPOSABLE_QA!=='1')
    throw new Error('E3-2A requiere PostgreSQL exclusivamente descartable')
})

test('E3-2A: foto perfil, empresa, galería servicios y proveedor con POS, sin cruzar tenants',async({page,request})=>{
  const email='e32a-'+randomUUID()+'@example.com'
  const password='Clave E3 2A sólo QA descartable 2026!'
  const reg=await request.post(api+'/auth/register',{data:{email,password,display_name:'Actor Fotos E3'}})
  expect(reg.status(),await reg.text()).toBe(201)
  const login=await request.post(api+'/auth/login',{data:{email,password}})
  expect(login.status(),await login.text()).toBe(200)
  const headers={Authorization:'Bearer '+(await login.json()).access_token}
  const create=await request.post(api+'/businesses',{headers:{...headers,'Idempotency-Key':randomUUID()},
    data:{name:'Empresa imágenes E3',category:'Servicios',activity_kind:'MIXTO'}})
  expect(create.status(),await create.text()).toBe(201)
  const bid=(await create.json()).id as string
  const catalog=await request.post(api+'/businesses/'+bid+'/catalog',{headers,
    data:{name:'Servicio fotos E3',kind:'SERVICIO',unit:'SERVICIO',sellable:true,price_cents:4000}})
  expect(catalog.status(),await catalog.text()).toBe(201)
  const item=(await catalog.json()).id as string
  const supplier=await request.post(api+'/businesses/'+bid+'/suppliers',{headers,
    data:{name:'Proveedor visual E3'}})
  expect(supplier.status(),await supplier.text()).toBe(201)
  const sid=(await supplier.json()).id as string

  await page.goto('/real/perfil')
  await page.getByLabel('Correo electrónico',{exact:true}).fill(email)
  await page.getByLabel('Contraseña',{exact:true}).fill(password)
  await page.getByRole('button',{name:'Ingresar',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Mi perfil',exact:true})).toBeVisible()

  const png64=await page.evaluate(()=>{
    const canvas=document.createElement('canvas')
    canvas.width=36;canvas.height=28
    const context=canvas.getContext('2d')
    if(!context)throw new Error('Canvas no disponible')
    context.fillStyle='#2463ad';context.fillRect(0,0,36,28)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  const image={name:'foto-qa.png',mimeType:'image/png',buffer:Buffer.from(png64,'base64')}
  const profile=page.getByRole('region',{name:'Imágenes de Foto de perfil'})
  await profile.locator('input[type=file]').setInputFiles(image)
  await expect(profile.getByText('Foto guardada en PostgreSQL.')).toBeVisible()
  await expect(profile.locator('img')).toHaveCount(1)
  const publicPhoto=(await (await request.get(api+'/photos/me',{headers})).json())[0]
  expect(publicPhoto.byte_size).toBeGreaterThan(0)
  const content=await request.get(api+'/photos/'+publicPhoto.id+'/content',{headers})
  expect(content.status()).toBe(200)
  expect(content.headers()['content-type']).toContain('image/webp')
  // Reemplazo personal real: no mantiene fotos anteriores ni URLs activas.
  await profile.locator('input[type=file]').setInputFiles(image)
  await expect.poll(async()=>{
    const result=await request.get(api+'/photos/me',{headers})
    return (await result.json())[0]?.id
  }).not.toBe(publicPhoto.id)
  const replaced=await request.get(api+'/photos/'+publicPhoto.id+'/content',{headers})
  expect(replaced.status()).toBe(404)

  await page.getByRole('button',{name:'Mis empresas',exact:true}).first().click()
  const companyCard=page.getByRole('button',{name:/Empresa imágenes E3/})
  await expect(companyCard).toBeVisible()
  await companyCard.click()
  const company=page.getByRole('region',{name:'Imágenes de Foto o logo de la empresa'})
  await company.locator('input[type=file]').setInputFiles(image)
  await expect(company.getByText('Foto guardada en PostgreSQL.')).toBeVisible()

  // Navegación dentro de la SPA: no usar page.goto(), que borra la sesión en memoria.
  await page.getByRole('navigation',{name:'Secciones disponibles en REAL'})
    .getByRole('button',{name:'Catálogo',exact:true}).click()
  const card=page.locator('.e3-catalog-tile').filter({hasText:'Servicio fotos E3'})
  await card.getByRole('button',{name:'Ver ficha'}).click()
  const gallery=page.getByRole('region',{name:'Imágenes de Fotografías de Servicio fotos E3'})
  await gallery.locator('input[type=file]').setInputFiles([image,image])
  await expect(gallery.getByText('Fotografías guardadas en PostgreSQL.')).toBeVisible()
  await expect(gallery.locator('img')).toHaveCount(2)
  const photos=await request.get(api+'/photos/businesses/'+bid+'/catalog/'+item,{headers})
  expect(photos.status()).toBe(200)
  expect(await photos.json()).toHaveLength(2)

  await page.getByRole('navigation',{name:'Secciones disponibles en REAL'})
    .getByRole('button',{name:'Proveedores',exact:true}).click()
  const supplierCard=page.locator('.e3-supplier-tile').filter({hasText:'Proveedor visual E3'})
  await supplierCard.getByRole('button',{name:'Ver ficha'}).click()
  const provider=page.getByRole('region',{name:'Imágenes de Foto de Proveedor visual E3'})
  await provider.locator('input[type=file]').setInputFiles(image)
  await expect(provider.getByText('Foto guardada en PostgreSQL.')).toBeVisible()
  const providerPhotos=await request.get(api+'/photos/businesses/'+bid+'/suppliers/'+sid,{headers})
  expect((await providerPhotos.json())).toHaveLength(1)
  page.once('dialog',dialog=>{ void dialog.accept() })
  await provider.getByRole('button',{name:'Quitar foto'}).click()
  await expect(provider.getByText('Foto quitada correctamente.')).toBeVisible()
  const afterDelete=await request.get(api+'/photos/businesses/'+bid+'/suppliers/'+sid,{headers})
  expect(await afterDelete.json()).toHaveLength(0)

  await page.getByRole('navigation',{name:'Secciones disponibles en REAL'})
    .getByRole('button',{name:'Punto de venta',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Punto de venta'})).toBeVisible()
  const posCard=page.locator('.e3-pos-product-card').filter({hasText:'Servicio fotos E3'})
  // La portada se solicita de forma perezosa cuando la tarjeta entra al viewport.
  await posCard.scrollIntoViewIfNeeded()
  await expect(posCard.locator('img')).toHaveCount(1)
  const width=await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth))
  expect(width).toBeLessThanOrEqual(1366)
  // La portada también debe adaptarse a una pantalla móvil sin overflow horizontal.
  await page.setViewportSize({width:390,height:844})
  await posCard.scrollIntoViewIfNeeded()
  await expect(posCard.locator('img')).toHaveCount(1)
  const mobileWidth=await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth))
  expect(mobileWidth).toBeLessThanOrEqual(390)
})
