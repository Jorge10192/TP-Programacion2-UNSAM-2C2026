# E1-B7 — Compras, renglones, recepción y eventos DEMO

**Estado:** código integrado en `main` el 06/11/2026. **Build, lint, pruebas automáticas y QA visual local PENDIENTES.**
**Fuentes de diseño/requisitos:** Plan v4, E0-A Z050/Z070; especificación de Compras/Gastos M2; ADR-004 (estado PROPUESTO); E1-B2-02, DEMO-STK-01 y QA-STK-01. No se reutilizan scripts globales de los HTML originales.

## Objetivo y alcance

- Ingresar compras **por empresa** sin exigir proveedor, depósito ni artículo del catálogo. Una empresa de servicios puede registrar una compra con concepto libre sin crear almacén.
- Registrar entre 1 y 30 renglones por operación, cada uno vinculado a artículo/servicio ACTIVO del catálogo **o** concepto libre. Cantidad, unidad y costo unitario obligatorios. Concepto libre usa unidad `CONCEPTO` y no ingresa a stock.
- Capturar fecha, proveedor opcional, referencia de comprobante y observaciones; información de pagos NO se registra en este corte.
- **Snapshot histórico** por renglón: nombre, SKU, unidad, cantidad, costo y subtotal al momento de registro. El nombre del proveedor también queda fotografiado. Editar un artículo o proveedor después **no modifica** compras antiguas.
- Importes en **centavos enteros de ARS**, cantidades en **milésimas enteras de la unidad del catálogo**. `lineTotalCents` calcula mediante `BigInt` y redondeo HALF_UP *por renglón*; luego suma subtotales en enteros, sin pérdida por coma flotante.
- Las unidades discretas (unidad, paquete, caja, servicio y concepto libre) sólo admiten cantidades enteras; kilogramo, gramo, litro y mililitro admiten hasta tres decimales. No hay conversión automática caja→unidades ni kg→gramo. Cada entrada se expresa en **la misma unidad de control del Catálogo**.
- Guardar compra no implica recepción ni pago. Se registra con estado de recepción **Pendiente**, **Confirmada** o **Sin recepción física** (servicios/conceptos libres).
- Ficha/historial de compras con búsqueda y filtros por estado de recepción. No hay edición retrospectiva, ni eliminación de compra. La ausencia de comprobante significa sin referencia, NO que se haya adjuntado una factura.
- Recepción: una acción posterior, explícita y confirmada, que requiere ubicación **activa con `canStore=true`**. Genera **en un mismo comando** un movimiento positivo por cada renglón de bien físico del catálogo. Servicios y conceptos libres quedan informativos.
- **Idempotencia en DEMO:** cada submit de compra usa `requestId` estable durante el formulario; un reintento con esa clave devuelve la misma compra. Cada compra acepta **una única recepción**, completa respecto a sus bienes físicos, en una única ubicación. Invocar de nuevo `receivePurchase` devuelve la recepción previa y no añade movimientos.
- `listDemoReceiptMovements` deriva eventos desde snapshots inmutables; `receiptQuantityMilli` permite derivar cantidades recibidas por empresa, artículo y ubicación. El Inventario vendrá después como proyección de estos eventos; todavía no se presentan saldos operativos de inventario.

## Diseño de datos

`PurchaseInput` = `purchasedOn`, `supplierId|null`, `reference`, `notes`, `lines[]`.

`PurchaseLineInput` = `catalogItemId|null`, `description`, `unit`, `quantityMilli`, `unitCostCents`.

`DemoPurchase` = `PurchaseInput` más `id`, `requestId`, `businessId`, `supplierNameSnapshot`, `createdAt`, `totalCents`, `receipt|null` y los `PurchaseLineSnapshot[]` con IDs estables y clase BIEN/SERVICIO/CONCEPTO.

`PurchaseReceipt` = `id`, `locationId`, `createdAt`, `movements[]` con IDs de evento, compra/renglón inferidos, catálogo, unidad y cantidad positiva. Se preserva el evento tras F5; al cargar se valida congruencia de movimiento ↔ renglón y ubicación ↔ empresa, para evitar interpretar objetos arbitrarios como existencias.

**Almacenamiento:** sigue `asistente-pyme.e1a2.demo.v1` con versión 1 y un array **opcional** `purchases`. Se conservan los campos previos `profile`, `createdBusinesses`, `fixtureEdits`, `memberJobs`, `locations`, `teamInvitations`, `teamMembers`, `catalogItems` y `suppliers`. No se inventan compras preexistentes. El estado del navegador **no tiene seguridad, concurrencia real ni persistencia servidor**.

## Archivos

- `frontend/src/data/demo/purchasePolicy.ts`: cantidades, total centavos, fechas, clases y validación.
- `frontend/src/data/demo/demoStore.ts`: comandos `registerPurchase` y `receivePurchase`, historiales y lectura compatible.
- `frontend/src/features/purchases/PurchaseForm.tsx`: compra con varios renglones y preview calculado.
- `frontend/src/features/purchases/PurchasesPage.tsx`: historial, filtros, KPIs.
- `frontend/src/features/purchases/PurchaseDetailDialog.tsx`: snapshots y confirmación de recepción.
- `frontend/src/App.tsx` + `frontend/src/features/dashboard/Dashboards.tsx`: ruta de Compras y acceso DEMO.
- `frontend/src/App.css`: diseño responsivo.
- `frontend/tests/purchase-policy.test.mjs` + script `test:purchases`: pruebas puras de política.

## Ejecutar desde `plataforma-pyme/frontend`

~~~powershell
git pull --ff-only origin main
npm.cmd run build
npm.cmd run lint
npm.cmd run test:purchases
npm.cmd run test:catalog
npm.cmd run test:suppliers
npm.cmd run test:team
npm.cmd run test:maps
npm.cmd run dev
~~~

Si Vite ya está activo, omitir el último comando.

## Validación manual propuesta

| Caso | Pasos | Esperado |
|---|---|---|
| COMP-01 | Abrir Compras en empresa nueva o de servicios | Historial vacío; sin depósito exigido |
| COMP-02 | Compra con 1 concepto libre y sin proveedor | Se registra; estado **Sin recepción física**, total correcto |
| COMP-03 | Compra con proveedor y 2 artículos físicos del Catálogo | Muestra snapshot y total, **Pendiente de recepción** |
| COMP-04 | Cambiar nombre de artículo o proveedor tras registrar | Compra anterior mantiene nombres originales |
| COMP-05 | Crear ubicación activa que **no** almacena | No se ofrece para recepción |
| COMP-06 | Crear ubicación activa con **Puede almacenar** | Permite seleccionarla en la compra pendiente |
| COMP-07 | Confirmar recepción de 2 artículos en esa ubicación | Aparecen 2 eventos positivos y estado Confirmada |
| COMP-08 | Cerrar/abrir detalle, actualizar F5 | Recepción sigue confirmada, sin botón para recibir otra vez |
| COMP-09 | Ejecutar recepción desde consola con mismo ID (sólo si QA técnico) | Devuelve mismo receipt ID, no duplica movimientos |
| COMP-10 | Compra mixta bien + servicio + concepto libre | Sólo el bien físico se recepciona |
| COMP-11 | Compra sólo de servicios | Sin recepción física y sin ingreso de stock |
| COMP-12 | Cantidad `0,5` caja | Rechaza fracción para unidad discreta |
| COMP-13 | Cantidad `0,5` kg | Permite y conserva `500` milésimas de kg, sin convertir a gramos |
| COMP-14 | Precio `1.250,50` o más de 2 decimales | Error sin generar compra; `1250,50` permitido |
| COMP-15 | Reintentar registrar con mismo requestId | Una única compra |
| COMP-16 | Cambiar empresa antes y después de registrar | Los registros y recibos no cruzan empresas |
| COMP-17 | Volver a Catálogo/Proveedores/Ubicaciones y F5 | Sus registros permanecen intactos |
| COMP-18 | Abrir detalle y Escape, cerrar, 390px | Modal y formulario utilizables sin desbordes |
| COMP-19 | Build, lint, tests automáticos | Sin errores ni warnings |

## Fuera de alcance E1-B7

Recepciones **parciales**, destinos múltiples por factura, devoluciones, equivalencias configurables de empaques, adjuntos, OCR, pagos reales, cuentas financieras, deducción automática de promociones, aprobación de órdenes, modificación o anulación con reversión contable, impuestos desglosados, productos de elaboración avanzada, stock disponible/reservado y concurrencia multisucursal. **No** se simula que existan.

## Próximo corte

E1-B8 Inventario: consultar movimientos y saldo físico por empresa/ubicación/artículo, calculados desde un ledger único, agregar traslados y conteos con validación de stock no negativo. API PostgreSQL posterior: transacciones, versiones y claves de idempotencia persistentes del servidor; mantener los requisitos de TP3 y los ADR propuestos.
