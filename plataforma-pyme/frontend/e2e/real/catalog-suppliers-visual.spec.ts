import { test, expect, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'

// Exclusivamente datos y base QA descartables.
const api='http://127.0.0.1:18001/api/v1'
test.beforeAll(()=>{
  if(process.env.PYME_DISPOSABLE_QA!=='1')throw Error('E3-1D requiere PYME_DISPOSABLE_QA=1 y PostgreSQL efímero')
})

async function loginUI(page:Page,email:string,password:string){
  await page.getByLabel('Correo electrónico',{exact:true}).fill(email)
  await page.getByLabel('Contraseña',{exact:true}).fill(password)
  await page.getByRole('button',{name:'Ingresar',exact:true}).click()
}

test('E3-1D catálogo/proveedores: fichas, alta aislada, cancelación y móvil',async({page,request})=>{
  const email='e3-1d-'+randomUUID()+'@example.com',password='Clave E3 1D efímera 2026!'
  const register=await request.post(api+'/auth/register',{data:{email,password,display_name:'QA E3-D'}})
  expect(register.status(),await register.text()).toBe(201)
  const login=await request.post(api+'/auth/login',{data:{email,password}})
  expect(login.status(),await login.text()).toBe(200)
  const headers={Authorization:'Bearer '+(await login.json()).access_token}
  const company=await request.post(api+'/businesses',{headers:{...headers,'Idempotency-Key':randomUUID()},
    data:{name:'Empresa QA E3-D',category:'QA',activity_kind:'MIXTO'}})
  expect(company.status(),await company.text()).toBe(201)
  const businessId=(await company.json()).id
  const path='/businesses/'+businessId
  const product=await request.post(api+path+'/catalog',{headers:{...headers,'Idempotency-Key':randomUUID()},
    data:{name:'Artículo QA-D',kind:'REVENTA',category:'Test',unit:'UNIDAD',sku:'SKU-QA-D',
      description:'Producto de prueba',observations:'Sin stock inicial',sellable:true,
      price_cents:215000,reference_cost_cents:180000}})
  expect(product.status(),await product.text()).toBe(201)

  await page.setViewportSize({width:390,height:844})
  await page.goto('/real/empresas/'+businessId+'/catalogo')
  await loginUI(page,email,password)
  await expect(page.getByRole('heading',{name:'Catálogo de artículos'})).toBeVisible()
  const cards=page.locator('article.e3-catalog-tile')
  await expect(cards).toHaveCount(1)
  await page.getByLabel('Filtrar catálogo por tipo').selectOption('SERVICIO')
  await expect(cards).toHaveCount(0)
  await page.getByLabel('Filtrar catálogo por tipo').selectOption('TODOS')
  await cards.first().getByRole('button',{name:'Ver ficha'}).click()
  await expect(page.getByRole('heading',{name:'Ficha del artículo'})).toBeVisible()
  await expect(cards).toHaveCount(0)
  await expect(page.getByLabel('Detalle del artículo')).toContainText('SKU-QA-D')
  await page.getByRole('button',{name:'Volver al catálogo'}).click()
  await expect(cards).toHaveCount(1)

  await cards.first().getByRole('button',{name:'Editar'}).click()
  await expect(page.getByRole('heading',{name:'Editar artículo'})).toBeVisible()
  await expect(cards).toHaveCount(0)
  await page.getByLabel('Nombre',{exact:true}).fill('Cambio no guardado')
  await page.getByRole('button',{name:'Cancelar'}).click()
  await expect(cards).toHaveCount(1)
  await cards.first().getByRole('button',{name:'Editar'}).click()
  await expect(page.getByLabel('Nombre',{exact:true})).toHaveValue('Artículo QA-D')
  await page.getByRole('button',{name:'Volver al catálogo'}).click()

  await page.getByRole('button',{name:'Crear artículo REAL'}).click()
  await expect(page.getByRole('heading',{name:'Nuevo artículo'})).toBeVisible()
  await expect(cards).toHaveCount(0)
  await page.getByRole('button',{name:'Cancelar'}).click()
  await expect(cards).toHaveCount(1)
  const catalog=await request.get(api+path+'/catalog',{headers})
  expect(catalog.status(),await catalog.text()).toBe(200)
  expect(await catalog.json()).toHaveLength(1)

  await page.getByRole('navigation',{name:'Navegación de empresa'}).getByRole('button',{name:'Empresa',exact:true}).click()
  await page.getByRole('button',{name:'Abrir Proveedores'}).click()
  await expect(page.getByRole('heading',{name:'Proveedores',exact:true})).toBeVisible()
  await expect(page.locator('article.e3-supplier-tile')).toHaveCount(0)
  await page.getByRole('button',{name:'Agregar proveedor REAL'}).click()
  await expect(page.getByRole('heading',{name:'Nuevo proveedor'})).toBeVisible()
  await page.getByLabel('Nombre comercial').fill('Proveedor descartado')
  await page.getByRole('button',{name:'Cancelar'}).click()
  const before=await request.get(api+path+'/suppliers',{headers})
  expect(before.status(),await before.text()).toBe(200)
  expect(await before.json()).toHaveLength(0)

  await page.getByRole('button',{name:'Agregar proveedor REAL'}).click()
  await page.getByLabel('Nombre comercial').fill('Proveedor QA-D')
  await page.getByLabel('Persona de contacto (opcional)').fill('Mariana QA')
  await page.getByLabel('Productos o servicios que ofrece (opcional)').fill('Insumos de prueba')
  await page.getByLabel('Teléfono comercial (opcional)').fill('+5491112345678')
  await page.getByLabel('Usar el teléfono comercial').check()
  await page.getByLabel('Correo electrónico (opcional)').fill('ventas@example.com')
  await page.getByLabel('Dirección o referencia (opcional)').fill('Calle QA 123')
  await page.getByLabel('Google Maps (enlace HTTPS, opcional)').fill('https://www.google.com/maps/place/Calle+QA')
  await page.getByLabel('Sitio web / catálogo digital (HTTPS, opcional)').fill('https://example.com/catalogo')
  await page.getByLabel('Instagram (usuario, opcional)').fill('@proveedor_qad')
  await page.getByLabel('Notas (opcional)').fill('Entrega lunes y miércoles')
  await page.getByRole('button',{name:'Crear proveedor'}).click()
  const suppliers=page.locator('article.e3-supplier-tile')
  await expect(suppliers).toHaveCount(1)
  await suppliers.first().getByRole('button',{name:'Ver ficha'}).click()
  await expect(page.getByRole('heading',{name:'Datos del proveedor'})).toBeVisible()
  await expect(page.getByLabel('Detalle del proveedor')).toContainText('Proveedor QA-D')
  await expect(page.getByLabel('Detalle del proveedor')).toContainText('Mariana QA')
  await expect(page.getByLabel('Detalle del proveedor')).toContainText('+5491112345678')
  await page.getByRole('button',{name:'Editar proveedor'}).click()
  await expect(page.getByRole('heading',{name:'Editar proveedor'})).toBeVisible()
  await expect(suppliers).toHaveCount(0)
  await expect(page.getByLabel('Persona de contacto (opcional)')).toHaveValue('Mariana QA')
  await page.getByLabel('Persona de contacto (opcional)').fill('No guardar')
  await page.getByRole('button',{name:'Cancelar'}).click()
  await suppliers.first().getByRole('button',{name:'Ver ficha'}).click()
  await page.getByRole('button',{name:'Editar proveedor'}).click()
  await expect(page.getByLabel('Persona de contacto (opcional)')).toHaveValue('Mariana QA')
  await page.getByLabel('Persona de contacto (opcional)').fill('Mariana Actualizada')
  await page.getByLabel('Notas (opcional)').fill('Cambio persistente')
  await page.getByRole('button',{name:'Guardar cambios'}).click()
  await expect(suppliers).toHaveCount(1)
  await page.reload()
  await loginUI(page,email,password)
  await suppliers.first().getByRole('button',{name:'Ver ficha'}).click()
  await expect(page.getByLabel('Detalle del proveedor')).toContainText('Mariana Actualizada')
  await expect(page.getByLabel('Detalle del proveedor')).toContainText('Cambio persistente')
  await page.getByRole('button',{name:'Volver a proveedores'}).click()
  await expect(suppliers).toHaveCount(1)
  const width=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth))
  expect(width,'Sin desborde horizontal a 390px').toBeLessThanOrEqual(391)
  const supplierApi=await request.get(api+path+'/suppliers',{headers})
  expect(supplierApi.status(),await supplierApi.text()).toBe(200)
  const stored=await supplierApi.json()
  expect(stored).toHaveLength(1)
  expect(stored[0]).toMatchObject({
    name:'Proveedor QA-D',offerings:'Insumos de prueba',contact_person:'Mariana Actualizada',
    phone:'+5491112345678',whatsapp:'+5491112345678',email:'ventas@example.com',
    address:'Calle QA 123',maps_url:'https://www.google.com/maps/place/Calle+QA',
    website:'https://example.com/catalogo',instagram:'proveedor_qad',notes:'Cambio persistente',
    payment_methods:[],promotions:[],status:'ACTIVO',
  })
  // Ni el alta de proveedor ni la ficha de catálogo generan movimientos comerciales.
  for(const suffix of ['/sales','/inventory/movements']){
    const response=await request.get(api+path+suffix,{headers})
    expect(response.status(),await response.text()).toBe(200)
    expect(await response.json()).toEqual([])
  }
})
