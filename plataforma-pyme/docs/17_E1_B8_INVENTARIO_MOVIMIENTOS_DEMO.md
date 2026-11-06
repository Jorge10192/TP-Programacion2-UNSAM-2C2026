# E1-B8 — Inventario y movimientos por ubicación (DEMO)

**Estado:** implementación integrada en GitHub `main`. **Build, lint, pruebas automatizadas y QA visual local pendientes**.
**Fuentes:** E0-A Z050 (inventario/stock integrado de M2), Z072 (conteos), Plan de Integración v4, E1-B7 Compras, ADR-004 propuesto y requisitos TP3. Se conserva el shell React existente; no se incorporan HTML ni scripts globales heredados.

## Alcance funcional entregado

- **Inventario:** existencias por empresa, artículo físico del Catálogo y ubicación. Sin stock ficticio precargado. Los servicios no tienen existencias.
- **Movimientos:** ruta `/b/:businessId/movimientos` con el mismo componente y ledger que Inventario; abre directamente el historial de recepciones, traslados y ajustes.
- **Recepción de Compras:** las entradas previamente confirmadas en E1-B7 aparecen automáticamente, incluso las registradas antes de este incremento. Una compra todavía pendiente NO modifica existencias.
- **Traslado:** un comando valida dos ubicaciones distintas, activas y habilitadas para almacenar; descuenta del origen y suma exactamente la misma cantidad al destino en **una sola operación**. Rechaza faltantes y no genera stock negativo.
- **Conteo físico:** registra la cantidad efectivamente observada en una ubicación. La diferencia contra el saldo previo genera un movimiento firmado con motivo obligatorio; el conteo puede ser **cero**. No se acepta ajuste de diferencia cero ni cantidades negativas.
- **Trazabilidad:** cada movimiento guarda fecha/hora, tipo, empresa, artículo, unidad, ubicación y motivo; los traslados comparten `operationId` y generan dos movimientos correlacionados. Los eventos no se editan ni eliminan.
- **Filtros:** nombre/SKU/categoría y ubicación para existencias; artículo/referencia/motivo y tipo/ubicación para movimientos. Las vistas limitan registros renderizados para evitar saturar pantalla.
- **Indicadores**: cantidad de artículos con stock, combinaciones artículo-ubicación con stock, renglones recibidos y cantidad de movimientos. **No se suman cantidades de unidades heterogéneas**.

## Reglas del ledger

La fuente de verdad es `PurchaseReceipt.movements` (de Compras) junto con `inventoryOperations` (traslados y conteos). **No hay tabla de stock mutable paralela**. `listDemoInventoryMovements(snapshot, businessId)` produce la proyección; `stockBalances` agrupa por par `[locationId, catalogItemId]`. `inventoryBalanceMilli` consulta el saldo sin recalcular por otro origen.

- Todas las cantidades se expresan como enteros en **milésimas de la unidad del Catálogo**; para Unidad, Caja y Paquete se exigen múltiplos exactos de 1000. Kilogramo, Gramo, Litro y Mililitro admiten tres decimales. No hay equivalencias automáticas entre cajas, paquetes, gramos, kilogramos o unidades.
- No se opera sobre servicios ni artículos inactivos. Los artículos inactivos con saldo histórico pueden seguir mostrándose para consulta.
- No se cambia la unidad de control de un artículo asociado a una compra o movimiento histórico, ni se transforma un bien histórico en servicio.
- Una ubicación no puede perder `canStore=true` mientras conserve saldo positivo; pausar una ubicación impide nuevos traslados/conteos hasta reactivarla, pero no elimina existencias históricas.
- Una operación posee un `requestId` estable durante su formulario. Repetir ese mismo ID devuelve la operación previa y no aplica el movimiento de nuevo. El frontend presenta una nueva solicitud sólo al iniciar un formulario nuevo.
- Al rehidratar datos locales antiguos, `inventoryOperations` es opcional. Las operaciones restauradas se validan contra empresa, Catálogo, ubicaciones y saldos **históricos al momento del evento**, evitando que una recepción posterior invalide un conteo anterior.
- `load()` conserva `profile`, `createdBusinesses`, `fixtureEdits`, `memberJobs`, `locations`, `teamInvitations`, `teamMembers`, `catalogItems`, `suppliers`, `purchases` y sus recepciones. Misma clave/version local: `asistente-pyme.e1a2.demo.v1`, versión 1.
- Estas validaciones son **para la UX local**, no autorizaciones reales. localStorage no asegura transacciones distribuidas, sincronización entre equipos, seguridad, permisos o protección contra cambios manuales. El servidor futuro deberá usar transacciones, bloqueo/versionado y claves de idempotencia.

## Archivos

- `frontend/src/data/demo/inventoryPolicy.ts`: tipos, proyección por claves, validación de cantidad/motivo, ajuste y pares de traslado.
- `frontend/src/data/demo/demoStore.ts`: proyección de compras y operaciones; comandos `transferInventory`, `countInventory`; carga compatible e invariantes cruzadas.
- `frontend/src/features/inventory/InventoryActionForm.tsx`: traslado y conteo con vista previa de saldo y variación.
- `frontend/src/features/inventory/InventoryPage.tsx`: indicadores, existencias, filtros e historial.
- `frontend/src/App.tsx` y `frontend/src/features/dashboard/Dashboards.tsx`: rutas y accesos de Inicio.
- `frontend/src/App.css`: estilos de escritorio y móvil.
- `frontend/tests/inventory-policy.test.mjs`: pruebas de ledger y reglas exactas.

## Comandos desde `plataforma-pyme/frontend`

~~~powershell
git pull --ff-only origin main
npm.cmd run build
npm.cmd run lint
npm.cmd run test:inventory
npm.cmd run test:purchases
npm.cmd run test:catalog
npm.cmd run test:suppliers
npm.cmd run test:maps
npm.cmd run test:team
npm.cmd run dev
~~~

Si Vite ya está abierto, omitir `npm.cmd run dev`.

## Matriz de validación manual

| Caso | Acción | Esperado |
|---|---|---|
| INV-01 | Abrir Inventario luego de confirmar una recepción de Compra E1-B7 | El bien recibido aparece en la ubicación de recepción; no hay que cargarlo de nuevo |
| INV-02 | Consultar otra empresa | No aparecen movimientos ni saldos de la empresa anterior |
| INV-03 | Elegir una ubicación y activar «Incluir saldos en cero» | Se ven artículos físicos sin existencia, expresados en su unidad |
| INV-04 | Trasladar 2 unidades del depósito al local | Origen −2, destino +2, total combinado constante, dos movimientos correlacionados |
| INV-05 | Intentar trasladar más stock del disponible | Error «Stock insuficiente», sin evento ni saldo negativo |
| INV-06 | Intentar trasladar a la misma ubicación o a una pausada | Rechazo |
| INV-07 | Registrar conteo real de 7 unidades donde había 9 | Se registra ajuste −2 y queda saldo 7 |
| INV-08 | Registrar conteo cero | Se registra la salida del remanente hasta saldo cero |
| INV-09 | Registrar conteo igual al saldo actual | Error: no hay ajuste que registrar |
| INV-10 | Registrar 0,5 cajas o paquetes | Rechazo; no hay conversiones implícitas |
| INV-11 | Registrar 0,500 kg | Aceptado en unidad kilogramo, sin convertir a gramos |
| INV-12 | Crear un servicio en Catálogo | No aparece entre artículos físicos para traslado/conteo |
| INV-13 | Intentar editar la unidad de un artículo con compra/movimiento | Rechazo; ficha y datos históricos intactos |
| INV-14 | Intentar deshabilitar «Puede almacenar» con stock positivo | Rechazo hasta trasladar o ajustar |
| INV-15 | Hacer conteo, después recibir otra compra y recargar F5 | Se preserva el conteo anterior y se suma la nueva recepción |
| INV-16 | Confirmar recepción de compra y volver a Inventario/Movimientos | Único evento por renglón físico; sin doble recepción |
| INV-17 | Actualizar F5, navegar a otras secciones y volver | Persistencia y filtros correctos, sin cruces entre empresas |
| INV-18 | Pantalla de 390px | Listado, botones y formularios legibles sin desbordamientos |
| INV-19 | Build, lint, test:inventory y demás scripts de regresión | Sin errores ni advertencias |

## Fuera de alcance y siguiente corte

Esta entrega registra solamente entradas por Compras, traslados y diferencias por conteo. No genera salidas por Ventas ni Reservas; no tiene lotes, vencimientos, ubicación destino múltiple por recepción, devoluciones, movimientos masivos, unidades equivalentes, arqueo de caja ni disponibilidad reservada. Tampoco puede garantizar concurrencia interdispositivo.

**Próximo corte propuesto:** mejoras de inventario por conteos/lotes según prioridad, luego Ventas y Caja con salidas de stock; backend TP3 con PostgreSQL, transacciones y contratos API antes de operar datos reales.
