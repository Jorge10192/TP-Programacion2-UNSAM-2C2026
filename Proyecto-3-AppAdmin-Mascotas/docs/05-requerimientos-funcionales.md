# 05 — Requerimientos funcionales

## RF-01 — Acceso al sistema

- El sistema deberá permitir que los trabajadores de WALOS accedan a la aplicación desde distintos dispositivos.
Principalmente celular y computadora/notebook.
- El sistema debe poder permitir a los clientes acceder a una pagina web que permita hacer reservas de productos.

## RF-02 — Operación simultánea

- El sistema deberá permitir que múltiples personas utilicen la aplicación simultáneamente desde diferentes ubicaciones, manteniendo consistencia en las operaciones y en el stock.

## RF-03 — Gestión de proveedores

- El sistema deberá permitir registrar, modificar, consultar y desactivar proveedores.

## RF-04 — Gestión de insumos

- El sistema deberá permitir registrar y consultar los insumos utilizados en la producción.

## RF-05 — Registro de compras

- El sistema deberá permitir registrar compras de materia prima indicando proveedor, insumos, cantidades, precios, fecha de operación, usuario que registra la operación y fecha de recepción.
- Se debe guardar el comprobante de la compra.

## RF-06 — Gestión de recetas

- El sistema deberá permitir definir los insumos y cantidades necesarias para producir cada producto.
- Debe indicar el costo promedio actualizado a las ultimas compras de materia prima. (costo actualizado)

## RF-07 — Registro de producción

- El sistema deberá permitir registrar producciones, descontar los insumos utilizados y generar los lotes de productos correspondientes.

## RF-08 — Gestión de lotes

- El sistema deberá permitir identificar los productos producidos por lote, incluyendo fecha de elaboración, cantidad y vencimiento.
- Los valores deben poder ser editables dependiendo del uso y necesidades del negocio. Ejemplo: Se congela mercadería o materia prima prolonga su duración.

## RF-09 — Control de stock

- El sistema deberá permitir consultar y actualizar el stock de insumos y productos por lote y ubicación.
- La ubicación puede variar dependiendo las necesidades de la empresa
- Los lotes deben tener un numero de orden vinculado a la necesidad del negocio de uso. Como prioridad de lote.
- Los lotes deben tener un estado de cerrado o consumido, cuando ya se dieron de baja todos los elementos de ese lote.

## RF-10 — Gestión de ubicaciones

- El sistema deberá permitir registrar ubicaciones operativas, tales como local comercial, depósito o ferias, y registrar movimientos de stock entre   ellas.

## RF-11 — Registro de ventas

- El sistema deberá permitir registrar ventas realizadas en ferias, local comercial o canal web.

## RF-12 — Gestión de promociones

El sistema deberá permitir crear y aplicar promociones o descuentos de forma automática según las condiciones definidas.

## RF-13 — Gestión de pedidos

- El sistema deberá permitir que los clientes generen pedidos seleccionando productos y cantidades.

## RF-14 — Gestión de reservas

- El sistema deberá permitir reservar productos via web, coordinar la entrega en lugares conocidos o via envio de ser necesario y exigir una seña      antes de confirmar el pedido.

## RF-15 — Gestión de pagos

- El sistema deberá permitir registrar pagos, señas y saldos, incluyendo Mercado Pago y Cuenta DNI como medios de pago.

## RF-16 — Analítica de ventas

- El sistema deberá permitir consultar ventas por producto, período y punto de venta.

## RF-17 — Analítica por feria

- El sistema deberá permitir comparar el rendimiento de productos entre diferentes ferias o ubicaciones.

## RF-18 — Análisis mensual

- El sistema deberá permitir consultar la evolución mensual de ventas e ingresos general y por ubicacion deseada.

## RF-19 — Análisis de proveedores

- El sistema deberá permitir comparar precios históricos de compra entre proveedores.

## RF-20 — Cálculo de costos de producción

- El sistema deberá calcular el costo de producción de los productos a partir de los insumos utilizados.

## RF-21 — Costos fijos

- El sistema deberá permitir registrar y consultar costos fijos del negocio.
