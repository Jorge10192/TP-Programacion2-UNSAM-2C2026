# E1-C2 — Gastos y Apertura/Cierre de Caja · Primera vertical DEMO

**Fecha:** 2026-11-06. **Estado:** código publicado en `main`; `build`, `lint`, test automatizados y QA de navegador **pendientes de ejecución local**. **Referencias:** Plan v4 E1-C2, ADR-005/006 propuestos, HTML Z075/Z092/Z093 y E1-C1 Ventas. No se realizó otra auditoría general.

## Entrega funcional

### Gastos (`/b/:businessId/gastos`)

- Registro manual único de gastos operativos con fecha, categoría, concepto, importe ARS, ubicación opcional, medio de pago y observaciones.
- **Pagos declarados:** efectivo, transferencia, Cuenta DNI, tarjeta, Mercado Pago declarado y otro medio. No se consulta banco, no se transfieren fondos ni se verifican saldos.
- El gasto no se confunde con una compra; registrar en Compras no produce un egreso financiero automático. No se paga dos veces una compra por navegación o recibo de mercadería.
- Los gastos no alteran Inventario ni generan recepciones.
- Los gastos **en efectivo** se asocian automáticamente a la jornada **ABIERTA de la misma ubicación o caja general**, si existe en el instante de registro; si no existe, se identifican como «Fuera de caja», sin modificar cierres anteriores.
- Una salida de efectivo mayor al esperado de una caja abierta es rechazada; sin permiso de saldo negativo.
- Historial por empresa, con búsqueda, filtro de medio y totales históricos. La idempotencia `requestId` evita doble registro por reintento.

### Caja (`/b/:businessId/jornadas`)

- Se abre una `CashSession` con **ubicación activa habilitada para vender** o con **caja general** (sin ubicación física), y fondo efectivo inicial expresado en centavos.
- Una jornada **ABIERTA por ubicación** como máximo. Se permite sucesión cronológica de jornadas después de cerrar cada una; no «reapertura» de la antigua.
- Las **ventas nuevas** registradas durante una jornada se asocian por ID, nunca por mera coincidencia de fecha. Si no hay jornada abierta, Ventas sigue funcionando para preservar compatibilidad con E1-C1, pero el comprobante muestra «Sin jornada vinculada» y ese efectivo no entra al arqueo.
- Sólo el importe `EFECTIVO` de pagos divididos y sólo los gastos `EFECTIVO` vinculados cuentan para el efectivo físico esperado.
- **Efectivo esperado = fondo inicial + ventas efectivo asociadas − gastos efectivo asociados.** Se usa BigInt para cálculos intermedios y centavos enteros.
- El cierre exige introducir **efectivo contado**. Si existe diferencia, también exige el **motivo**. El botón que abre el formulario de arqueo no bloquea Ventas. La confirmación del cierre toma el conjunto actual de movimientos y lo guarda junto con el estado CERRADA en un solo cambio de snapshot local.
- **Snapshot inmutable:** apertura, ventas efectivo, gastos efectivo, total esperado, contado, diferencia, referencia a ventas/gastos, actor, fecha y observaciones. No hay botón de modificar/reabrir ni cierre «sin verificar».
- Reintentar el cierre con el mismo `closeRequestId` devuelve el cierre ya persistido; con una clave distinta se rechaza.
- Un cierre no retorna inventario de feria, no altera saldos bancarios ni mueve efectivo a cuentas.

### Arquitectura

`src/data/demo/cashPolicy.ts`: `DemoCashSession`, `CashCloseSnapshot`, `DemoExpense`, categorías, medios y proyección pura de arqueo.
`src/data/demo/demoStore.ts`: estado por empresa `expensesById` y `cashSessionsById`, `openCashSession`, `registerExpense`, `closeCashSession`, selectores, migración compatible con datos previos y enlace opcional `cashSessionId` en `DemoSale`.
`src/features/cash/ExpensesPage.tsx` y `CashSessionsPage.tsx`: pantallas DEMO. Navegación mediante `App.tsx` y estado en Inicio.
`tests/cash-policy.test.mjs`: 12 pruebas puras, accesibles con `npm.cmd run test:cash`.

**Compatibilidad:** se mantiene clave `asistente-pyme.e1a2.demo.v1` y `version: 1`. Los nuevos arrays opcionales de persistencia `expenses` y `cashSessions` no sustituyen `profile`, empresas, ubicaciones, catálogo, ventas, compras, inventario ni imágenes de IndexedDB. Las ventas antiguas sin `cashSessionId` no se incorporan retroactivamente a la caja. Los cierres se cargan con sus snapshots sin recalcularlos en cada consulta.

## QA de aceptación

Desde `plataforma-pyme/frontend`, no hacer otro `cd` si ya estás allí:

```powershell
git pull --ff-only origin main
npm.cmd run build
npm.cmd run lint
npm.cmd run test:cash
npm.cmd run test:sales
npm.cmd run test:inventory
npm.cmd run dev
```

| Caso | Acción | Esperado |
|---|---|---|
| CAJA-01 | Abrir jornada «San Martín Feria» con $10.000 iniciales | Estado ABIERTA, esperado $10.000 |
| CAJA-02 | Registrar venta de $3.000 con efectivo $2.000 y transferencia $1.000 desde esa ubicación | Efectivo esperado $12.000; transferencia no aumenta efectivo |
| CAJA-03 | Registrar gasto en efectivo de $500 en esa misma ubicación | Efectivo esperado $11.500 |
| CAJA-04 | Registrar gasto por transferencia de $700 | Gasto en historial; efectivo esperado permanece $11.500 |
| CAJA-05 | Gastar $12.000 en efectivo desde esa caja | Rechazo por fondos insuficientes; sin egreso duplicado |
| CAJA-06 | Cerrar con conteo $11.500 | Snapshot con diferencia $0 y referencias a la venta y gasto |
| CAJA-07 | Cerrar con $11.000 sin motivo | Rechazo; al agregar motivo se permite diferencia -$500 |
| CAJA-08 | Consultar cierre, pulsar F5 y volver a abrirlo | Mismos importes y referencias; no se recalcula |
| CAJA-09 | Intentar volver a cerrar la misma jornada | No se genera otro cierre; no se puede editar el snapshot |
| CAJA-10 | Abrir una nueva jornada en la misma ubicación | Permitido; no arrastra ventas/gastos de la anterior |
| CAJA-11 | Registrar venta en otra ubicación o empresa | No afecta caja actual |
| CAJA-12 | Venta en efectivo registrada antes de abrir la jornada | Sigue existiendo pero no ingresa al arqueo |
| CAJA-13 | Empresa de servicios sin ubicaciones: abrir caja general, vender sólo un servicio | La parte EFECTIVO se vincula sin crear ubicación ni stock |
| CAJA-14 | Comprar/recibir mercadería y cerrar caja | Compra no se cuenta como dinero pagado ni cierre altera stock |
| CAJA-15 | Buscar Gastos, revisar en móvil, abrir menú, navegar a Ventas | No se pierde información; no hay botones de banco «cobrado» |
| CAJA-16 | Ejecutar build/lint/tests tras `git pull` | Sin errores. Registrar resultado observado, no presumirlo |

**Límite explícito de DEMO:** las operaciones son sincrónicas en una pestaña sobre un store local compartido; `localStorage` no implementa transacciones entre múltiples dispositivos/pestañas, aislamiento de usuarios ni bloqueo de caja en servidor. TP3 requerirá transacción atómica en FastAPI/PostgreSQL para crear Venta/Expense/cerrar sesión con restricción de jornada y autorización por rol/ubicación. Lo digital no se concilia desde balances externos; se distingue QR de artículo de QR de cobro. Cada empresa enlazará su propia cuenta Mercado Pago en una etapa posterior de backend.

## Siguiente dependencia: Cuentas y Medios de Pago

Agregar entidades por empresa `FinancialAccount` / `PaymentChannel`, con titularidad, banco/alias/CBU/CVU opcionales, estado y permisos. **Una cuenta bancaria es distinta de una caja física**: nunca se sumarán ventas en efectivo al saldo de una billetera. Evitar vincular un gasto a una cuenta no registrada, o inferir movimientos de banco de pagos declarados. Posterior a este corte se podrán relacionar cuentas con egresos, ventas e integración real de MP OAuth + QR, sin cambiar los snapshots históricos de caja.
