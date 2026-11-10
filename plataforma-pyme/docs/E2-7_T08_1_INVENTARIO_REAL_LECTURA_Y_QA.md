# E2-7 · T08-1 — Lectura de Inventario REAL, saldos y movimientos

**Estado:** primera implementación en `feature/e2-7-t08-inventario-real`, pendiente de revisión y QA manual local. **No fusionar a main sin aprobación.**

## Objetivo y alcance

Integrar en React la **lectura real y exclusivamente de consulta** de existencias por artículo/ubicación y movimientos firmados, manteniendo FastAPI/PostgreSQL como fuente de verdad y los datos DEMO aislados.

### Contratos backend existentes, sin cambios

| Vista | Método y URL relativa a /api/v1 | Filtros opcionales | Paginación |
|---|---|---|---|
| Existencias | `GET /businesses/{business_id}/inventory/balances` | `location_id`, `catalog_item_id` | `offset=0&limit=100` |
| Movimientos | `GET /businesses/{business_id}/inventory/movements` | mismos campos | `offset=0&limit=100` |

Ambos endpoints permiten `limit` de 1 a 500 y exigen una sesión Bearer opaca y membresía autorizada. El backend limita recursos a la empresa del usuario; el frontend valida además cada `business_id`, ID UUID y parámetros de filtro que regresa el servidor.

`StockBalanceView`: `business_id`, `location_id`, `catalog_item_id`, `quantity_milli` (entero >=0), `version` (>=1), `updated_at`.

`InventoryMovementView`: ID, empresa/sede/artículo/actor, `event_type`, `delta_milli` **firmado**, `occurred_at`. El backend omite campos de origen `null` (recibo de compra, transferencia/ajuste, venta). Admitir campos de origen opcionales no significa inventar operaciones. Eventos: `COMPRA_RECEPCION`, `TRASLADO_ENTRADA`, `TRASLADO_SALIDA`, `AJUSTE_ENTRADA`, `AJUSTE_SALIDA`, `STOCK_INICIAL`, `VENTA_SALIDA`.

**No se calcula stock desde las compras en el navegador.** Las recepciones, ventas, traslados y ajustes se acumulan en el backend y su resultado se consulta en el saldo autoritativo. Se usan conversiones exactas en milésimas **sin multiplicar floats**; las cantidades se muestran con signo cuando son movimientos.

## Cambios en frontend

1. `src/features/inventory/realInventoryGateway.ts`: gateway HTTP con GET-only, filtros y paginación validados, DTOs seguros y mensajes de HTTP 401/403/404/422. Evita aceptar balances negativos, versiones inválidas, movimientos de signo contrario al evento, números fuera del rango entero seguro, respuestas de otro tenant y filas duplicadas.
2. `src/features/inventory/RealInventoryPage.tsx`: sección visible en `/real/empresas/{uuid}/inventario`, muestra empresa autenticada, sedes reales, catálogo real cargado, filtros y tabs «Existencias» / «Historial de movimientos». Puede cargar páginas sucesivas de cada listado. Cuando una página trae exactamente 100 registros, el sistema avisa que **puede haber más**, nunca afirma que ya consultó todos.
3. `src/features/auth/RealAuthApp.tsx`: ruta autenticada con validación de UUID. Reiniciar sesión después de F5 sigue siendo política T02; no se guarda Bearer en disco.
4. `src/features/businesses/RealBusinessesPage.tsx`: botón «Inventario REAL» en panel empresarial, sin mezclar con `/inicio` DEMO.
5. `src/features/auth/auth.css`: estados visuales de cantidades positivas, negativas y cero; responsivo en móvil.
6. `tests/inventory-real-api.test.mjs`, `package.json`, workflow CI: batería automatizada independiente `npm.cmd run test:inventory-real`.

### Datos históricos y filtros

- Las ubicaciones se consultan únicamente desde la empresa seleccionada, y se muestran incluso si actualmente están pausadas, porque puede haber saldos y movimientos históricos.
- Los nombres/unidades se enriquecen solo con fichas del **catálogo REAL de esa empresa**. El selector comienza con 100 fichas; se ofrece «Cargar más fichas» hasta alcanzar la última página. Mientras no se haya leído el catálogo completo, un artículo sin ficha cargada se presenta por ID corto, nunca por un nombre DEMO ni se oculta el movimiento.
- El backend ordena balances por ubicación/artículo y movimientos por fecha descendente/ID; cada lista pagina con su propio offset. Si una página posterior repite un ID ya cargado, la pantalla detiene esa paginación e indica actualizar: **offset pagination no representa una instantánea** si el stock cambia mientras se consulta.
- Solo se observan registros devueltos por la API. Si no hay saldos registrados se dice «No hay saldos registrados» y **no** se afirma que todos los artículos del catálogo tengan saldo cero.
- Mostrar una unidad de catálogo actual no transforma el valor histórico del movimiento; en el ledger las cantidades se muestran tal como fueron registradas.

## Casos de prueba automatizados previstos

- Ruta relativa y Bearer correcto, sin POST.
- Paginación 100/100, offset real, filtros API exactos y controles 0..500.
- UUID ajenos a la empresa, filtro de sede/artículo ignorado, datos malformados, duplicados, respuestas de más de 100 elementos.
- Saldos 0, balances no negativos, versión >=1, fecha válida y enteros seguros.
- Todos los tipos de movimiento, cantidades positivas/negativas y rechazo de signo incompatible o delta cero.
- Campos de origen opcionales `null` u omitidos (FastAPI `response_model_exclude_none=True`).
- HTTP 403/404 sin reemplazar por datos DEMO; red caída y abort sin mutaciones.
- Build, lint, regresión de suites frontend ya integradas; Chromium existente continúa siendo una prueba **DEMO**, no un E2E REAL con Postgres.

## QA manual solicitada: T08-1

Realizar sin modificar existencias, compras ni datos DEMO.

1. En VSCode, trabajar en `feature/e2-7-t08-inventario-real` y sincronizar con origin.
2. `docker compose --profile api up -d --wait` desde `plataforma-pyme`. En `frontend`, ejecutar `$env:PYME_API_PROXY_TARGET = "http://127.0.0.1:18000"` y `npm.cmd run dev`.
3. Ir a `http://localhost:5173/real/login`. Ingresar con el titular de **TEST Empresa A** y abrir **Inventario REAL** desde la empresa.
4. Filtrar **Sede A TEST** y **Producto A TEST**. Comprobar saldo. El último comprobante de T07 mostró **11 UNIDAD** de saldo posterior; si ningún movimiento ulterior ocurrió en la sede, la API debería devolver el mismo saldo. **No codificar 11 como fixture ni suponerlo permanente.**
5. En «Historial de movimientos», corroborar una entrada por recepción de **+5 UNIDAD** de Producto A TEST y la fecha del movimiento. Si aparecen otras compras recibidas, también deben figurar sus entradas.
6. Cambiar a **Sede A TEST 2** y observar que los saldos y movimientos corresponden solo a esa sede, sin mezclar la sede A TEST.
7. Abrir **TEST Empresa B**: no deben aparecer saldos ni movimientos de TEST Empresa A; un listado vacío es legítimo.
8. Ingresar como trabajador Miguel: si su membresía está activa, puede consultar los balances/historial del tenant sin ver botones de ajustes y transferencias (aún no implementados).
9. Si una lista llega a 100 registros, «Cargar más» debe avanzar a offset 100, no repetir resultados. El selector de artículos también puede ampliar sus fichas por páginas.
10. Abrir `/inicio`: comprobar que Inventario DEMO y Catálogo DEMO continúan separados de los saldos reales.

**No ejecutar transferencias ni ajustes en T08-1.** T08-3/T08-4 tendrán sus propios PR/validaciones. Cualquier error HTTP o inconsistencia de saldo se investiga antes de declarar aprobada la prueba.

## Transferencia

- **T08-2:** completar historial/UX y sus casos de aceptación con dataset de más de 100 movimientos.
- **T08-3:** transferencias entre ubicaciones, consistencia de doble movimiento y recuperación idempotente.
- **T08-4:** stock inicial y ajustes absolutos/relativos con `expected_version` y 409 de conflicto, recarga del saldo y nueva aprobación del usuario.
- **T08-5:** QA de permisos, tenant, carreras, balance y regresión, antes del merge del incremento completo.
- **T11:** Playwright full-stack con FastAPI/PostgreSQL en base efímera y casos de corte de red, concurrencia, paginación y trazabilidad end-to-end.

**Limitación explícita:** esta entrega T08-1 es lectura de recursos ya existentes. No implica un ERP comercial terminado ni resuelve cuentas, caja, QR ni ventas POS de T10.
