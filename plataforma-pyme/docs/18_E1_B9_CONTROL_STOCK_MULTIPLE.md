# E1-B9 — Control de stock por ubicación (sesión multiartículo)

**Estado:** publicado en `main`. **Falta la comprobación local de build/lint/tests y la QA en navegador**.
**Base:** prototipo React E1-B8, historial de recepciones/traslados/conteos y HTML de referencia `walos_m_dulo_2_inventario_y_control_de_stock(3)(1).html` proporcionado por el usuario. Se aprovecha la estructura visual del control por artículos; no se importan scripts/fixtures ni lógica de reservas del HTML.

## Experiencia de usuario

1. Desde **Inventario** se ofrece el botón **Control de stock**. El formulario individual previo queda como **Ajuste rápido**.
2. Se selecciona **una ubicación activa que almacene**. Cambiar de ubicación borra los conteos en edición para no aplicarlos accidentalmente en otro lugar.
3. Se listan **artículos físicos activos** del catálogo de esa empresa. Cada artículo muestra su saldo teórico, campo de conteo real, botones +/−, botón **Marcar 0** y diferencia visual.
4. **Sin contar** = *no modificar*. Es diferente de ingresar **0**, que puede generar ajuste de salida de toda la existencia previa. Se muestra progreso de artículos contados; buscador por nombre/SKU; máximo **200 artículos contados por sesión**.
5. Un **motivo u observación obligatorio** acompaña la sesión. Al pulsar **Revisar diferencias**, se muestra un resumen con saldo teórico, contado y diferencias de todos los artículos contados, incluidos los que coincidieron.
6. Al confirmar, **todos los cambios se aplican juntos** en el estado DEMO. Si el saldo de cualquier artículo cambió desde la revisión, la sesión se rechaza completa y vuelve a edición para recalcular el resumen.
7. En **Movimientos**, la sesión ocupa **una fila desplegable** con su cantidad de artículos revisados, número de diferencias, ubicación, motivo y fecha. Al expandir, se ve cada artículo y su cambio. Los ajustes previos individuales y los traslados continúan visibles.

## Modelo y compatibilidad

- El tipo `InventoryOperation` incorpora `BATCH_COUNT`, guardando `locationId`, `requestId`, `reason`, `createdAt` y `lines[]`. Cada línea conserva artículo, unidad, `expectedMilli`, `countedMilli` y `deltaMilli`.
- `inventoryOperationMovements` proyecta **un ajuste por línea distinta de cero**. Las líneas iguales a su saldo **sí permanecen en la sesión**, pero no generan movimientos artificiales. Los artículos sin contar no se incluyen.
- `inventoryHistoryEntries(movements, operations)` agrupa la sesión por `operationId`, evitando duplicar filas y manteniendo los eventos firmados de inventario para calcular saldos. Un traslado conserva dos movimientos aunque se vea como una fila.
- `demoGateway.countInventoryBatch`: valida empresa, ubicación, artículos activos y físicos, unidades exactas, límites, duplicados, motivo e igualdad de saldo con el revisado; sólo hace **un `notify`** al finalizar. La repetición del mismo `requestId` en esa empresa devuelve la sesión previa.
- Al recuperar `localStorage`, `BATCH_COUNT` se valida y se reconstruye en orden temporal junto a `TRANSFER` y `COUNT`, comparando cada saldo histórico previo. La clave y versión local no cambian: `asistente-pyme.e1a2.demo.v1`, versión 1. No se descartan perfiles, empresas, catálogos, proveedores, ubicaciones, compras ni operaciones antiguas.
- Es una **simulación local**: no hay autenticación ni reservas de inventario, locking, concurrencia entre navegadores, reconciliación de cambios físicos ni soporte multiusuario real. Ese control deberá implementarse con transacciones de servidor y política de permisos al construir backend TP3.

## Archivos afectados

- `frontend/src/data/demo/inventoryPolicy.ts`: tipos de sesión, cálculo de diferencias revisadas y proyección.
- `frontend/src/data/demo/demoStore.ts`: `countInventoryBatch`, carga histórica y barreras de integridad.
- `frontend/src/features/inventory/InventoryBatchCount.tsx`: formulario de conteo por ubicación, progreso y revisión.
- `frontend/src/features/inventory/InventoryPage.tsx`: acciones y vista de historial con expansión por sesión.
- `frontend/src/App.tsx`: pasa operaciones al historial de cada empresa.
- `frontend/src/App.css`: estilos y adaptación responsive.
- `frontend/tests/inventory-policy.test.mjs`: pruebas de sesiones con y sin diferencias, ledger e inconsistencias de saldo.

## Verificación local

Desde `plataforma-pyme/frontend`:

```powershell
git pull --ff-only origin main
npm.cmd run build
npm.cmd run lint
npm.cmd run test:inventory
npm.cmd run test:purchases
npm.cmd run dev
```

### QA manual mínimo

| Código | Prueba | Resultado esperado |
|---|---|---|
| B9-01 | Abrir Inventario → Control de stock | Se abre la sesión sin alterar los ajustes previos |
| B9-02 | Seleccionar una ubicación | Se listan sólo bienes físicos activos del catálogo actual y sus saldos |
| B9-03 | Ingresar 7 en un artículo cuyo saldo es 10; dejar otro «Sin contar» | Se propone −3 para el primero y el segundo permanece sin cambios |
| B9-04 | Marcar 0 en un artículo que tiene 2 | Se propone ajuste −2; cero explícito no equivale a no contar |
| B9-05 | Cargar dos artículos, verificar progreso, observar resumen antes de guardar | Se muestran ambos y sus diferencias (incluso si una es cero) |
| B9-06 | Confirmar y revisar Inventario | Ambos cambios se aplican juntos sin negativos |
| B9-07 | Revisar Movimientos | Una fila para la sesión y detalle por artículo al expandirla |
| B9-08 | Hacer conteo sin diferencias | Se registra una sesión histórica, sin fabricar movimientos ni cambiar el stock |
| B9-09 | Cambiar de ubicación durante edición | Se limpian los valores en edición |
| B9-10 | Entrar con el navegador de otra empresa | No aparecen sesiones ni stock de la anterior |
| B9-11 | Actualizar F5 después del control y de una compra posterior | Se conservan operaciones y se proyectan saldos correctos |
| B9-12 | Repetir la misma `requestId` | Una sola sesión; no se duplican ajustes |
| B9-13 | Cambiar stock entre revisión y confirmación | Se rechaza toda la sesión y exige revisar los nuevos saldos |
| B9-14 | Intentar contar un servicio, cantidad negativa o fracción de caja | Rechazo por reglas del Catálogo/unidad |
| B9-15 | Abrir en ancho móvil | Controles accesibles y filas legibles |

## Pendientes deliberados

No se incluyen reservas, lotes, alertas de vencimiento ni ventas concurrentes simuladas del HTML de referencia: esas funciones dependen del modelo de dominio y del inventario reservado que todavía no está implementado. Tampoco se altera el módulo de Compras ni se crean datos de stock predeterminados.

**Próximo corte recomendado:** completar inventario operativo de Ventas (salidas autorizadas y sesiones de caja), respetando stock disponible y la futura integración con Mercado Pago sin confundir QR de artículo con QR de cobro.
