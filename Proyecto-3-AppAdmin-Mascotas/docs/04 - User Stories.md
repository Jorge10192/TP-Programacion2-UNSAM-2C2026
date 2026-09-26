# 04 — User Stories

Las siguientes historias de usuario describen las principales necesidades de los usuarios del sistema WALOS.

Se utiliza el formato:

> Como **[actor]**, quiero **[acción]** para **[beneficio]**.

Cada historia incluye criterios de aceptación que permitirán verificar posteriormente su cumplimiento.

---

# 1. Usuarios y permisos

## US-01 — Iniciar sesión

Como **usuario trabajador**, quiero iniciar sesión para acceder a las funciones correspondientes a mi rol.

### Criterios de aceptación

- El usuario debe identificarse mediante sus credenciales.
- Las credenciales inválidas deben impedir el acceso.
- El usuario solo puede acceder a las funciones permitidas por su rol.
- La sesión debe identificar qué usuario realiza cada operación.
- El **usuario administrador** puede dar de alta y de baja otros usuarios.

---

## US-02 — Operar el negocio simultáneamente desde distintos lugares

Como **trabajador de WALOS**, quiero utilizar el sistema al mismo tiempo que otras personas desde diferentes ubicaciones para que las distintas actividades del negocio puedan realizarse en paralelo sin generar inconsistencias.

### Criterios de aceptación

- Dos o más personas pueden utilizar el sistema simultáneamente.
- Las operaciones realizadas por una persona deben reflejarse para las demás.
- El sistema debe permitir realizar en paralelo actividades de compra de materia prima, producción, ventas en ferias, ventas en local comercial, ventas web y gestión de reservas.
- Una operación realizada en un área debe actualizar la información relacionada cuando corresponda.
- El sistema debe mantener consistencia del stock ante operaciones simultáneas.
- El sistema debe evitar que una misma unidad disponible sea vendida, reservada o asignada más de una vez.
- Cada operación debe conservar: la fecha, hora y punto de operación cuando corresponda, detalle de operación y que usuario la realizo.
---

# 2. Proveedores e insumos

## US-03 — Gestionar proveedores

Como **administrador**, quiero registrar y mantener información de los proveedores para centralizar las alternativas disponibles para la compra de insumos.

### Criterios de aceptación

- Se pueden registrar nuevos proveedores.
- Se pueden modificar sus datos.
- Se puede indicar si un proveedor está activo o inactivo.
- Se pueden consultar los proveedores registrados.

---

## US-04 — Gestionar insumos

Como **administrador**, quiero registrar los insumos utilizados en la elaboración de productos para controlar compras, costos y existencias.

### Criterios de aceptación

- Cada insumo debe tener un nombre.
- Debe indicarse su unidad de medida.
- Se puede consultar su stock actual.
- Un insumo puede estar asociado a uno o más proveedores.

---

## US-05 — Registrar compra de insumos

Como **operador**, quiero registrar las compras realizadas a proveedores para actualizar el inventario y conservar el costo de adquisición.

### Criterios de aceptación

- La compra debe estar asociada a un proveedor.
- Debe indicar los insumos comprados.
- Debe registrar cantidades y precios.
- Debe registrar la fecha de compra o recepción.
- Al recibir los insumos debe actualizarse el stock correspondiente.
- El sistema debe conservar el costo histórico de la compra.

---

## US-06 — Comparar proveedores

Como **administrador**, quiero consultar los precios de diferentes proveedores para decidir dónde conviene comprar cada insumo.

### Criterios de aceptación

- Se puede consultar el historial de compras de un insumo.
- Se identifica el proveedor de cada compra.
- Se muestran los precios registrados.
- Se pueden comparar proveedores para un mismo insumo.
- La comparación debe utilizar información histórica almacenada por el sistema.

---

# 3. Producción

## US-07 — Gestionar recetas

Como **administrador**, quiero definir los insumos necesarios para producir cada producto para calcular necesidades de materia prima y costos.

### Criterios de aceptación

- Una receta debe estar asociada a un producto.
- Debe indicar los insumos utilizados.
- Debe indicar las cantidades necesarias.
- Una receta puede modificarse conservando el historial necesario para producciones anteriores.

---

## US-08 — Registrar producción

Como **operador**, quiero registrar una producción indicando los insumos utilizados y las unidades obtenidas para mantener trazabilidad de lo producido.

### Criterios de aceptación

- Debe seleccionarse el producto elaborado.
- Deben registrarse los insumos utilizados.
- Debe registrarse la cantidad producida.
- La producción debe generar un lote.
- Los insumos consumidos deben descontarse del inventario.
- Si no existe suficiente materia prima, la producción no debe confirmarse.
- La actualización del stock de insumos y la creación del lote deben realizarse conjuntamente.

---

## US-09 — Calcular costo de producción

Como **administrador**, quiero conocer el costo de elaboración de cada producto para analizar precios y rentabilidad.

### Criterios de aceptación

- El sistema debe considerar los insumos utilizados.
- Debe utilizar los costos registrados de dichos insumos.
- Debe calcular el costo total de la producción.
- Debe permitir obtener un costo por unidad producida.
- El costo histórico de una producción debe conservarse aunque posteriormente cambien los precios de los insumos.
- Debe poder asignar costos fijos que no son asociados a la produccion, como por ejemplo: uso de cocina, packagin e impuestos.


---

# 4. Lotes e inventario

## US-10 — Gestionar lotes

Como **operador**, quiero identificar cada producción mediante un lote para conocer su origen, cantidad y vencimiento.

### Criterios de aceptación

- Cada producción genera un lote identificable.
- El lote debe indicar el producto.
- Debe conservar la fecha de elaboración.
- Debe registrar la cantidad producida.
- Debe permitir registrar o calcular su vencimiento según las reglas definidas por WALOS.
- Los movimientos posteriores deben conservar la referencia al lote.

---

## US-11 — Priorizar productos próximos a vencer

Como **vendedor**, quiero identificar los lotes próximos a vencer para priorizar su venta y reducir pérdidas de mercadería.

### Criterios de aceptación

- El sistema debe mostrar la fecha de vencimiento de los lotes.
- Debe permitir identificar los lotes próximos a vencer.
- Cuando existan varios lotes aptos de un mismo producto, debe poder priorizarse el que vence primero.
- Debe generarse una alerta cuando un lote esta proximo a vencer segun criterio de WALOS
- Si un producto esta vencido debe notificarse para su descarte y considerarse perdida para el negocio.
  
---

## US-12 — Consultar stock

Como **operador o administrador**, quiero consultar el stock actualizado para conocer qué productos e insumos se encuentran disponibles.

### Criterios de aceptación

- Se puede consultar el stock de productos terminados.
- Se puede consultar el stock de insumos.
- El stock de productos debe poder visualizarse por lote.
- Debe poder visualizarse según su ubicación.
- Una operación confirmada debe reflejarse en el stock.

---

# 5. Ferias y puntos de venta

## US-13 — Registrar ferias o puntos de venta

Como **administrador**, quiero registrar las diferentes ferias o puntos de venta donde trabaja WALOS para identificar dónde se realizan las ventas.

### Criterios de aceptación

- Se puede registrar un punto de venta.
- Puede indicarse su nombre o ubicación.
- Una venta puede asociarse al punto de venta donde ocurrió.
- La información histórica de una feria debe conservarse aunque ya no se utilice.

---

## US-14 — Asignar mercadería a una feria

Como **operador**, quiero registrar qué productos y lotes se llevan a cada feria para conocer dónde se encuentra físicamente la mercadería.

### Criterios de aceptación

- Debe indicarse el origen del stock.
- Debe indicarse la feria o punto de venta de destino.
- Deben registrarse producto, lote y cantidad.
- El movimiento debe actualizar la ubicación del stock.
- El sistema debe impedir trasladar una cantidad superior a la disponible.

---

# 6. Ventas y promociones

## US-15 — Registrar venta

Como **vendedor**, quiero registrar una venta desde el celular para mantener actualizado el stock mientras trabajo en una feria.

### Criterios de aceptación

- La venta debe indicar los productos y cantidades.
- Debe estar asociada a un punto de venta.
- Debe registrar al vendedor que realizó la operación.
- Debe registrar el precio aplicado.
- Debe permitir indicar el medio de pago.
- La venta confirmada debe actualizar el stock correspondiente.
- Una misma venta no debe descontar stock más de una vez.

---

## US-16 — Configurar promociones

Como **administrador**, quiero configurar promociones para que los vendedores puedan aplicarlas sin realizar cálculos manuales.

### Criterios de aceptación

- Se pueden crear promociones.
- Se puede definir qué productos participan.
- Se puede definir su período de vigencia.
- El sistema debe permitir promociones porcentuales.
- El sistema debe poder contemplar promociones del tipo 3x2.
- Una promoción fuera de vigencia no debe aplicarse.

---

## US-17 — Aplicar promociones automáticamente

Como **vendedor**, quiero que el sistema calcule automáticamente los descuentos para cobrar correctamente y agilizar las ventas en las ferias.

### Criterios de aceptación

- El sistema debe detectar si la venta cumple las condiciones de una promoción.
- Debe calcular automáticamente el descuento correspondiente.
- Debe mostrar el precio original.
- Debe mostrar el descuento.
- Debe mostrar el total final antes de confirmar la venta.
- Si las cantidades cambian, el descuento debe recalcularse.

---

# 7. Pedidos y reservas

## US-18 — Consultar catálogo

Como **cliente**, quiero consultar los productos disponibles para conocer qué puedo pedir a WALOS.

### Criterios de aceptación

- El cliente puede consultar los productos disponibles.
- Puede consultar precios.
- Puede consultar promociones vigentes.
- No deben ofrecerse productos o lotes que no estén disponibles para venta.

---

## US-19 — Crear pedido

Como **cliente**, quiero seleccionar productos y cantidades para realizar un pedido.

### Criterios de aceptación

- El cliente puede agregar productos.
- Puede modificar cantidades.
- Puede eliminar productos.
- El sistema debe mostrar el total del pedido.
- Las promociones correspondientes deben reflejarse antes de confirmar en un carrito de compra similar a Pedidos Ya.

---

## US-20 — Reservar mediante seña

Como **responsable de WALOS**, quiero que determinados pedidos requieran una seña para evitar producir o reservar mercadería para clientes que luego no la retiran.

### Criterios de aceptación

- El sistema debe calcular la seña requerida.
- El cliente debe conocer el monto antes de confirmar.
- El pedido debe distinguir entre pendiente de seña y confirmado.
- Un pedido que requiera seña no debe considerarse confirmado hasta que el pago correspondiente sea verificado.
- La seña debe formar parte del total del pedido.
- El saldo restante debe quedar registrado.

---

# 8. Pagos

## US-21 — Registrar medio de pago

Como **vendedor**, quiero registrar cómo se pagó una venta para poder controlar posteriormente los ingresos.

### Criterios de aceptación

- Cada pago debe indicar su medio.
- Debe registrar su monto.
- Debe relacionarse con una venta o pedido.
- Debe poder distinguirse entre pago total, seña y saldo cuando corresponda.
- El sistema debe contemplar Mercado Pago y Cuenta DNI como medios utilizados por WALOS.

---

# 9. Analítica

## US-22 — Analizar ventas por ubicacion de venta

Como **administrador**, quiero conocer qué productos se venden en cada **feria/punto de venta especifico** para decidir qué mercadería conviene priorizar en cada lugar.

### Criterios de aceptación

- Las ventas pueden filtrarse por punto de venta disponible.
- Puede consultarse la cantidad vendida por producto.
- Puede consultarse el importe vendido por periodo de tiempo (no menor a un dia completo).
- Deben poder compararse diferentes puntos de venta.
- Debe permitirse seleccionar un período de análisis valido (dia, semana, mes o meses).

---

## US-23 — Analizar ventas mensuales

Como **administrador**, quiero consultar la evolución mensual de las ventas para conocer el desempeño del negocio.

### Criterios de aceptación

- Se pueden consultar ventas por mes.
- Se muestra el total vendido.
- Se puede consultar la cantidad de productos vendidos.
- Se pueden identificar los productos más vendidos.
- La información debe surgir de las ventas registradas en el sistema.

---

## US-24 — Analizar productos

Como **administrador**, quiero conocer cuáles son los productos más y menos vendidos para tomar mejores decisiones de producción.

### Criterios de aceptación

- Se pueden ordenar productos según cantidad vendida.
- Puede seleccionarse un período.
- Puede analizarse el comportamiento general o por feria.
- El sistema debe utilizar ventas confirmadas para realizar el análisis.

---

## US-25 — Analizar costos y rentabilidad

Como **administrador**, quiero comparar el costo de producción con las ventas para conocer la rentabilidad de los productos.

### Criterios de aceptación

- Se puede consultar el costo por producto.
- Se puede consultar el precio de venta histórico.
- Se puede comparar ingreso y costo.
- El análisis debe permitir seleccionar un período.

---

# 10. Costos del negocio

## US-26 — Registrar costos fijos

Como **administrador**, quiero registrar costos fijos del negocio para obtener una visión más completa del resultado económico mensual.

### Criterios de aceptación

- Se puede registrar un concepto de costo.
- Se puede registrar el importe.
- Se puede registrar la fecha o período correspondiente.
- Los costos pueden consultarse posteriormente.
- Los costos registrados pueden utilizarse en los análisis económicos.
