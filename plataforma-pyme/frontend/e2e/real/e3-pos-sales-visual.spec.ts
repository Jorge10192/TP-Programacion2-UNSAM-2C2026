import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const api='http://127.0.0.1:18001/api/v1'
test.beforeAll(()=>{
  if(process.env.PYME_DISPOSABLE_QA!=='1')
    throw new Error('E3-1G requiere PostgreSQL descartable y PYME_DISPOSABLE_QA=1')
})

test('E3-1G: historial→comprobante independiente→POS→revisión y regreso, sin POST desde UI',async({request,page})=>{
  const email='e3-1g-'+randomUUID()+'@example.com'
  const password='Clave POS visual QA aislada!'
  const register=await request.post(api+'/auth/register',{
    data:{email,password,display_name:'Vendedor E3 QA'},
  })
  expect(register.status(),await register.text()).toBe(201)
  const login=await request.post(api+'/auth/login',{data:{email,password}})
  expect(login.status(),await login.text()).toBe(200)
  const auth={Authorization:'Bearer '+(await login.json()).access_token}
  async function create(path:string,data:object){
    const response=await request.post(api+path,{
      headers:{...auth,'Idempotency-Key':randomUUID()},data,
    })
    expect(response.status(),await response.text()).toBe(201)
    return response.json()
  }
  const company=await create('/businesses',{
    name:'Empresa E3-G QA',category:'Pruebas',activity_kind:'MIXTO',
  })
  const root='/businesses/'+company.id
  const location=await create(root+'/locations',{
    name:'Sede de prueba G',kind:'LOCAL',can_sell:true,can_store:true,address:'',map_url:'',
  })
  const item=await create(root+'/catalog',{
    name:'Servicio G consulta',kind:'SERVICIO',unit:'SERVICIO',sellable:true,
    price_cents:150000,
  })
  const physical=await create(root+'/catalog',{
    name:'Producto físico G',kind:'REVENTA',unit:'UNIDAD',sellable:true,
    price_cents:200000,
  })
  await create(root+'/inventory/adjustments',{
    kind:'STOCK_INICIAL',catalog_item_id:physical.id,location_id:location.id,
    quantity_milli:2000,expected_version:0,reason:'Disponibilidad E3-1G',
  })
  const recorded=await create(root+'/sales',{
    location_id:location.id,
    lines:[{catalog_item_id:item.id,quantity_milli:1000,unit_price_cents:150000}],
    payments:[{method:'EFECTIVO',amount_cents:150000}],
  })
  let uiPosts=0
  page.on('request',req=>{
    if(req.method()==='POST'&&new URL(req.url()).pathname===
      '/api/v1'+root+'/sales')uiPosts++
  })

  await page.setViewportSize({width:390,height:844})
  await page.goto('/real/empresas/'+company.id+'/ventas')
  await page.getByLabel('Correo electrónico',{exact:true}).fill(email)
  await page.getByLabel('Contraseña',{exact:true}).fill(password)
  await page.getByRole('button',{name:'Ingresar',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Historial de ventas',exact:true})).toBeVisible()
  const history=page.locator('.real-sales-row')
  await expect(history).toHaveCount(1)
  await expect(history).toContainText('Vendedor E3 QA')
  await page.getByLabel('Buscar ventas cargadas').fill('No existe')
  await expect(history).toHaveCount(0)
  await page.getByLabel('Buscar ventas cargadas').fill('')
  await expect(history).toHaveCount(1)
  await history.getByRole('button',{name:'Ver comprobante'}).click()
  await expect(page.getByRole('heading',{name:'Comprobante de venta',exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:'Volver al historial'})).toBeFocused()
  await expect(history).toHaveCount(0)
  const receipt=page.getByRole('region',{name:'Comprobante de venta REAL'})
  await expect(receipt).toContainText('Servicio G consulta')
  await expect(receipt).toContainText('Vendedor E3 QA')
  await receipt.getByText('Identificadores de trazabilidad').click()
  await expect(receipt).toContainText(recorded.request_id)
  await page.getByRole('button',{name:'Volver al historial'}).click()
  await expect(history).toHaveCount(1)
  await page.getByRole('button',{name:'Ir al punto de venta'}).click()
  await expect(page.getByRole('heading',{name:'Punto de venta',exact:true})).toBeVisible()
  await page.getByLabel('Sede del punto de venta').selectOption(location.id)
  await expect(page.locator('.e3-pos-card-catalog')).toContainText('Disponible en Sede de prueba G: 2 UNIDAD')
  const goodCard=page.getByRole('article',{name:'Artículo Producto físico G'})
  const goodAdd=goodCard.getByRole('button',{name:'Agregar una unidad de Producto físico G al detalle de venta'})
  await goodAdd.click()
  await goodAdd.click()
  await expect(goodAdd).toBeDisabled()
  const cart=page.getByRole('region',{name:'Carrito de venta'})
  await expect(cart.locator('.real-pos-cart-row')).toHaveCount(1)
  await expect(cart).toContainText('Producto físico G')
  await expect(cart).toContainText('Cantidad: 2 UNIDAD')
  // Editar cantidades ocurre en el detalle, no al seleccionar otra ficha.
  await cart.locator('.real-pos-cart-row').filter({hasText:'Producto físico G'})
    .getByRole('button',{name:'Editar cantidad'}).click()
  await page.getByLabel('Cantidad del artículo').fill('3')
  await expect(page.getByRole('button',{name:'Guardar cambios en detalle'})).toBeDisabled()
  await page.getByLabel('Cantidad del artículo').fill('2')
  await page.getByRole('button',{name:'Guardar cambios en detalle'}).click()
  await page.getByRole('button',{name:'Agregar una unidad de Servicio G consulta al detalle de venta'}).click()
  await expect(cart.locator('.real-pos-cart-row')).toHaveCount(2)
  await expect(cart).toContainText('Servicio G consulta')
  await expect(page.getByLabel('Importe declarado 1')).toHaveValue('5500,00')
  await cart.getByRole('button',{name:'Agregar una unidad de Servicio G consulta',exact:true}).click()
  await expect(page.getByLabel('Desglose del total de compra')).toContainText('7.000,00')
  await cart.getByRole('button',{name:'Quitar una unidad de Servicio G consulta',exact:true}).click()
  await page.getByLabel('Descuento de la venta').fill('100')
  await expect(page.getByLabel('Desglose del total de compra')).toContainText('5.400,00')
  await expect(page.getByLabel('Importe declarado 1')).toHaveValue('5400,00')
  await page.getByLabel('Importe declarado 1').fill('500')
  await page.getByRole('button',{name:'Agregar otro medio de pago'}).click()
  await page.getByRole('button',{name:'Completar saldo con último medio de pago'}).click()
  await expect(page.getByLabel('Importe declarado 2')).toHaveValue('4900,00')
  await page.getByRole('button',{name:'Finalizar venta'}).click()
  await expect(page.getByRole('heading',{name:'Revisión y confirmación',exact:true})).toBeVisible()
  await expect(page.getByLabel('Revisión final de la venta')).toContainText('5.400,00')
  await expect(page.getByLabel('Revisión final de la venta')).toContainText('Producto físico G')
  await expect(page.getByLabel('Revisión final de la venta')).toContainText('Servicio G consulta')
  await expect(page.getByLabel('Carrito de venta')).toBeHidden()
  await expect(page.getByRole('button',{name:'Confirmar y registrar venta REAL'})).toBeDisabled()
  await page.getByRole('button',{name:'Volver a editar'}).click()
  await expect(page.getByRole('heading',{name:'Punto de venta',exact:true})).toBeVisible()
  await expect(page.getByLabel('Carrito de venta')).toBeVisible()
  expect(uiPosts).toBe(0)
  const list=await request.get(api+root+'/sales',{headers:auth})
  expect(list.status(),await list.text()).toBe(200)
  expect(await list.json()).toHaveLength(1)
  const width=await page.evaluate(()=>Math.max(
    document.documentElement.scrollWidth,document.body.scrollWidth))
  expect(width,'Responsive a 390 px').toBeLessThanOrEqual(391)
})
