# E1-C1 — Ventas rápidas y pagos declarados (DEMO)

**Estado:** primera implementación publicada en `main` el 06/11/2026. **No consta ejecución de build, lint, tests o QA en la PC del usuario hasta que se realicen los comandos inferiores.**
**Fuente de diseño:** E0-A Z074 (POS) + Z075 (checkout e historial) + Plan Integración v4 E1-C1-01/02 + ADR-004/006 propuestos. Implementación nueva en React; no hay iframes ni scripts heredados.

## Qué entrega

- **Ventas** en `/b/:businessId/ventas`, accesible desde el menú y el panel Inicio.
- **Carrito 1..30 líneas**: artículos activos y habilitados para vender, incluidos servicios, con cantidad y precio editable por renglón. Sin servicio de cotización externo; se puede cargar precio manual cuando el Catálogo dice «A cotizar».
- **Ubicación**: necesaria para bienes físicos; debe estar activa, habilitada para vender y almacenar. La venta de sólo servicios puede registrarse sin ubicación física.
- **Descuento fijo** en ARS, descontado después de calcular el subtotal, sin descontar dos veces. La primera versión no calcula promociones de proveedores automáticamente ni incluye IVA fiscal.
- **Pagos declarados 1..6**: Efectivo, Transferencia, Cuenta DNI, Tarjeta y Mercado Pago declarado. El importe de todos los medios **debe sumar exactamente el total**. Los importes y totales son centavos enteros (BigInt para los productos intermedios). No hay QR ni verificación de acreditación.
- **Registro idempotente por requestId**: un doble envío o reintento de la misma venta dentro de la DEMO devuelve la venta existente; no aplica otra salida de stock.
- **Descuento de existencia** únicamente para bienes físicos: el gateway rechaza vender más que lo disponible en la ubicación elegida, y cada línea genera una sola proyección `VENTA_SALIDA` de cantidad negativa dentro del ledger `listDemoInventoryMovements`. Los servicios no producen evento de inventario.
- **Comprobante/historial**: vendedor/empresa, instante, ubicación o servicio sin ubicación, líneas, subtotal, descuento, total, medios y observaciones, etiquetado «DEMO». No se presenta como factura fiscal ni acreditación bancaria real.
- **Inicio** muestra número de ventas registradas DEMO; Inventario y Movimientos actualizan saldos y permiten filtrar «Salidas por ventas».
- **Separación por empresa**: las lecturas y escrituras se filtran/validan por `businessId` y no cruzan catálogos, ubicaciones ni ventas.

## Arquitectura y compatibilidad

- `frontend/src/data/demo/salePolicy.ts`: `SaleInput`, `SalePayment`, `SaleLineSnapshot`, normalización y aritmética de checkout.
- `frontend/src/data/demo/demoStore.ts`: `DemoSale`, `salesById`, `registerSale`, `listDemoSales`, carga opcional de ventas, serialización y proyección del ledger.
- `frontend/src/data/demo/inventoryPolicy.ts`: incorpora el tipo de movimiento `VENTA_SALIDA`.
- `frontend/src/features/sales/SalesPage.tsx`: formulario de venta, pagos divididos, descuentos y comprobante.
- `frontend/src/features/inventory/InventoryPage.tsx`: filtra salida por venta.
- `frontend/src/features/dashboard/Dashboards.tsx`, `frontend/src/App.tsx`, `frontend/src/App.css`: navegación, indicadores, estilos responsive.
- `frontend/tests/sale-policy.test.mjs`: pruebas unitarias puras de centavos, descuentos, split y validaciones.

**Persistencia:** se mantiene exactamente la clave `asistente-pyme.e1a2.demo.v1` y el objeto almacenado `version:1`. Se agrega un campo **opcional** `sales` a `Stored`, sin borrar ni reconstruir datos previos del perfil, negocios, Catálogo, Ubicaciones, Compras, Inventario o fotos de IndexedDB. `load` lee las ventas previamente guardadas antes de reproducir los conteos históricos para que una venta anterior a un conteo no desfigure su saldo. Las ventas tienen IDs propios y no escriben en `inventoryOperationsById`.

**Límites intencionales:** localStorage no ofrece autenticación, aislamiento seguro ni bloqueo distribuido. El gateway DEMO comprueba existencias en memoria en el momento de registrar; **no sirve como prueba de concurrencia de dos dispositivos o pestañas**. En backend FastAPI/PostgreSQL la creación de venta + salidas + pagos + saldo debe realizarse en una transacción con idempotencia persistente y permisos efectivos, como exige el TP3.

## Comandos en VS Code

Desde `plataforma-pyme/frontend`:

```powershell
git pull --ff-only origin main
npm.cmd run build
npm.cmd run lint
npm.cmd run test:sales
npm.cmd run test:inventory
npm.cmd run test:purchases
npm.cmd run dev
```

Si Vite ya está funcionando en la terminal, no ejecutar otro `npm.cmd run dev`. URL: `http://localhost:5173/inicio`.

## QA de E1-C1

| Caso | Pasos | Resultado esperado |
|---|---|---|
| C1-01 | Comprar/recibir 3 unidades de un bien en una ubicación que permita venta y almacenamiento | Inventario = 3 |
| C1-02 | Ventas → Nueva venta → vender 2 unidades en esa ubicación | Se registra una venta y el saldo pasa de 3 a 1 |
| C1-03 | Repetir submit/reintento con el mismo requestId | No se genera venta duplicada ni segundo descuento |
| C1-04 | Intentar vender 2 desde ubicación con saldo 1 | Error «Stock insuficiente», sin venta |
| C1-05 | Carrito mixto: 1 bien y 1 servicio | Bien descuenta stock; servicio no exige inventario |
| C1-06 | Empresa de servicios, sólo 1 servicio, sin ubicación | Venta válida sin crear depósito ni inventario |
| C1-07 | Descuento ARS 50 desde subtotal ARS 2.500, pagos ARS 1.000 + ARS 1.450 | Total 2.450 y split exacto |
| C1-08 | Pagos menores/mayores en 1 centavo | Error; no se confirma venta |
| C1-09 | Medio de pago «Mercado Pago (declarado)» | Comprobante advierte que no acredita cobro real |
| C1-10 | Abrir comprobante, cerrar, volver y pulsar F5 | Registro persiste; saldo no se vuelve a descontar |
| C1-11 | Inventario → Movimientos, filtrar «Salidas por ventas» | Una salida por línea física con referencia a la misma venta |
| C1-12 | Ir a otra empresa | Ventas, productos y saldos separados por empresa |
| C1-13 | Editar Catálogo e intentar cambiar unidad de un artículo ya vendido | Se rechaza el cambio que rompería la trazabilidad |
| C1-14 | Build + lint + tests | Sin errores ni advertencias; registrar resultado real |
| C1-15 | Vista móvil, menú lateral y volver | Carrito y medios legibles sin bloquear navegación |

## Corte siguiente: E1-C2 — Gastos, Apertura y Cierre

Construir una `CashSession` por empresa/ubicación/caja cuando corresponda y distinguir:
1. Fondo inicial de efectivo y movimientos de efectivo; dinero digital declarado pertenece a un medio, **no a caja física**.
2. Apertura explícita, gastos operativos con origen de fondos, arqueo contado y cierre con snapshot inmutable, fecha y actor.
3. Prevención de venta contra jornada ya cerrada; el lock debe fijarse al confirmar el corte, no simplemente al abrir el modal de revisión.
4. Retorno físico de feria es una operación distinta; no se inventa mermas ni entradas al cerrar.
5. Mercado Pago real y QR de artículo vs QR de cobro siguen posteriores; OAuth por cuenta vendedora de cada empresa y conciliación con backend.

Mantener ADR-005/006 como **propuestas**, no afirmarlas aprobadas por el equipo.
