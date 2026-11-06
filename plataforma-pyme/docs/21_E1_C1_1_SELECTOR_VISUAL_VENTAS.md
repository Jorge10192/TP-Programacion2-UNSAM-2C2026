# E1-C1.1 — Selector visual POS, sin alterar los comandos de Ventas

**Fecha:** 06/11/2026. **Estado:** publicado en `main`; requiere build/lint y validación funcional local.

## Origen y alcance

Referencias revisadas: imágenes adjuntas del usuario y `WALOS_M3_Cargar_Venta_POS_vNext.html` original. Se aprovecha su patrón de búsqueda por producto/SKU, filtro por categoría y tarjetas de artículos con precio, imagen, stock de la ubicación y botón de agregar. **No se porta el HTML completo ni su JavaScript de stock, caja, moneda o QR.**

E1-C1 ya tenía carrito editable, centavos enteros, descuento fijo, pagos divididos exactos, salida única de stock y comprobante DEMO. Esas reglas permanecen intactas.

### Cambios visibles

- Dentro de **Ventas → Nueva venta** se muestra primero un **selector visual de artículos** y luego el formulario del carrito.
- Búsqueda por nombre, SKU, categoría o descripción, sin distinguir mayúsculas ni acentos; filtro desplegable por categoría.
- Tarjetas con imagen opcional ya guardada en IndexedDB, nombre, SKU, categoría, precio y disponibilidad según ubicación seleccionada.
- **Agregar** incorpora una unidad al carrito existente o incrementa la cantidad cuando el artículo ya está elegido. El formulario tradicional permite cantidades medidas, precios a cotizar y correcciones manuales.
- En bienes físicos sin ubicación elegida, o sin al menos una unidad disponible, se deshabilita el agregado rápido. Los servicios permiten agregarse sin ubicación ni stock.
- La cantidad ya seleccionada se resta visualmente de la disponibilidad de esa ubicación. La validación final sigue perteneciendo a `demoGateway.registerSale`; no se cambia el ledger.
- Hasta 30 artículos por venta; la búsqueda limita la presentación a 100 tarjetas, sin perder acceso al resto por filtros.
- Diseño adaptable al ancho del navegador, sin copiar el menú lateral, la marca WALOS ni el store propio del HTML de referencia.

### Decisiones deliberadas

- **No incluir «Reponer» en cada tarjeta** en esta entrega: la producción propia y traslados deben pasar por las operaciones trazables ya existentes, nunca crear stock libre desde Ventas.
- **No mostrar «Caja abierta»** si no hay una jornada real; la apertura y el arqueo pertenecen a E1-C2.
- **No simular acreditación de Mercado Pago** desde un botón de Ventas. Se mantiene «pago declarado DEMO»; QR de cobro, expiraciones y acreditación verificada tendrán entrega separada.
- **No cambiar a checkout de dos pantallas todavía**: la interfaz existente ya admite pagos mixtos y descuentos, que no deben perderse por simplificar a un solo medio.
- **No agregar efectivo recibido/vuelto** sin modelo explícito de `tenderedCents` versus `appliedCents`. Será útil con Caja, pero una entrega aislada podría falsear efectivo total.

## QA local recomendado

Desde `plataforma-pyme/frontend`:

```powershell
git pull --ff-only origin main
npm.cmd run build
npm.cmd run lint
npm.cmd run test:sales
npm.cmd run test:inventory
npm.cmd run dev
```

1. Entrar a WALOS → Ventas → Nueva venta, elegir una ubicación que permita vender y almacenar. Buscar **Shampoo**, comprobar imagen, precio y disponibilidad; agregarlo dos veces y verificar que el carrito tenga una sola línea con cantidad **2**.
2. Intentar agregar productos sin ubicación: botón inhabilitado, sin salidas de stock. Agregar un **servicio** sin ubicación: disponible.
3. Buscar por SKU y filtrar por categoría. Comprobar que al borrar filtros aparecen los artículos nuevamente.
4. Probar ubicación con stock cero: artículo visible y acción de agregado inhabilitada; no desaparecerlo de la búsqueda.
5. Confirmar una venta con descuento y dos medios exactos; revisar comprobante y salida única del inventario. F5 no debe cambiar el saldo.
6. Probar un precio del catálogo «A cotizar»: se puede seleccionar y luego ingresar manualmente el precio antes de confirmar.
7. Probar ancho de ventana móvil: tarjetas, carrito y formulario deben conservar legibilidad y navegación.

**Lo que falta comprobar:** ejecución real de build/lint, respuesta del navegador y pruebas de regresión visual por el equipo. No confundir este listado de QA con tests ya ejecutados.

**Próximas entregas:** Gastos + Apertura/Cierre (E1-C2). Separación de selección y cobro, carrito persistente y monto recibido/vuelto quedan como mejoras posteriores con reglas explícitas.
