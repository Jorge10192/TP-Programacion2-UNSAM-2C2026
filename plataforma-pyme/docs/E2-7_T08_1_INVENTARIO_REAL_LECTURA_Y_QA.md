# E2-7 · T08-1 — Lectura de Inventario REAL, saldos y movimientos

**Estado:** lectura central T08-1 validada en navegador REAL y regresión DEMO confirmada; PR #41 aún en borrador. **No fusionar a main antes de revisión de cierre de T08 y autorización.**

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

## Resultado de la primera validación automatizada — 10/11/2026

**GitHub Actions:** [run #42818763338](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42818763338), **SUCCESS**.

- `npm ci`: instalación aprobada.
- `npm run build`: `tsc -b && vite build`, compilación correcta. La advertencia Vite por tamaño del chunk JS superior a 500 kB **sigue visible**: asunto de rendimiento a tratar con carga diferida, no se elevó el umbral ni se ocultó.
- `npm run lint`: **0 warnings, 0 errors**. Las advertencias iniciales de React sobre estados síncronos en efectos y referencias `.current` en cleanup fueron **corregidas** mediante resets iniciados por eventos y limpieza de AbortController estable, no silenciadas.
- `npm run test:inventory-real`: **16/16 aprobadas**, 0 fallos. Pruebas de GET, tenant, filtros, paginación, validación de DTO y unidades, signos, abort y HTTP.
- Resto de las suites de frontend: **165/165 aprobadas** según los totales de los grupos; **181/181 en total** incluyendo las 16 de T08-1.
- Job Chromium: aprobado. Sus recorridos son para la navegación DEMO (escritorio y móvil), no se debe afirmar que hay Playwright full-stack REAL.
- **Limitación de evidencia:** GitHub CI no se conectó a PostgreSQL para verificar el saldo concreto del usuario; solo se revisaron contratos y mocks. La aceptación manual T08-1 requiere ejecutar el checklist anterior y comparar con los datos de las compras recibidas en TEST Empresa A.

**Decisión del incremento:** listo para revisión en navegador y estudio del código; PR #41 permanecerá borrador, sin merge. Las mutaciones de inventario de T08-3/T08-4 no forman parte de esta implementación.

## Evidencia manual T08-1 — saldo y ledger coherentes (10/11/2026)

**Fuente de evidencia:** dos capturas del navegador compartidas por el usuario durante la prueba sobre TEST Empresa A, con API REAL. El resultado documenta lo observado en la UI; no se ejecutó en esta revisión una consulta SQL independiente.

| Verificación | Resultado observado | Estado |
|---|---|---|
| Pantalla Existencias | 1 combinación artículo/sede: **Producto A TEST**, **Sede A TEST**, unidad **UNIDAD**, saldo **11** | Aprobado visualmente |
| Versión de saldo | **3**, actualizado 10/11/2026 **8:23 a. m.** | Aprobado visualmente |
| Pantalla Historial de movimientos | 3 movimientos `Recepción de compra` del mismo artículo y sede | Aprobado visualmente |
| Entradas del historial | **+5**, **+4**, **+2** unidades, en orden de más reciente a más antiguo | Aprobado visualmente |
| Aritmética y consistencia | 2 + 4 + 5 = **11**, coincidente con último saldo del comprobante T07 | Aprobado para datos mostrados |
| Último movimiento T07 | Recepción **+5** de Producto A TEST, a las **8:23 a. m.**, coincide con comprobante visual previo del trabajador Miguel | Aprobado visualmente |
| Paginación visible | 1 saldo, 3 movimientos, «Última página consultada» | Coherente para dataset pequeño |

**Conclusión parcial:** quedan validados los dos casos centrales de lectura de T08-1 (existencias e historial) en TEST Empresa A y la concordancia con el comprobante histórico T07. No se registró ninguna operación de inventario nueva para verificarlo.

**Actualización tras las siguientes capturas:** el aislamiento visual TEST Empresa B sin saldos y la consulta desde la cuenta del trabajador Miguel ya fueron verificados; ver sección posterior. **Aún no verificado:** filtro por Sede A TEST 2 y artículo, historial vacío en Empresa B, DEMO sin regresiones específicamente en esta rama y paginación con más de 100 entradas. El CI cubre los contratos de lectura, pero esas comprobaciones manuales siguen diferenciadas.

**Observación visual menor (no bloqueante):** con una única combinación el texto de la pantalla dice «1 combinaciones artículo/sede cargados»; considerar singularización de la leyenda en el pulido de T08-1, sin impacto en saldos.

## Evidencia manual adicional: cuenta de Miguel y empresas A/B — 10/11/2026

**Fuente:** tres capturas de la UI de Inventario REAL y confirmación textual del usuario («Anda bien desde la Cuenta de Miguel»).

| Observación | Resultado | Alcance |
|---|---|---|
| Empresa B → Existencias | `0 combinaciones artículo/sede cargados`; estado vacío: «No hay saldos registrados para los filtros seleccionados» | **Aprobado visualmente:** no muestra el saldo ni Producto A TEST de A; no se observó aquí el historial de B |
| Empresa A → Existencias | `Producto A TEST`, `Sede A TEST`, **11 UNIDAD**, versión 3 | **Aprobado:** coincide con último comprobante T07 y captura anterior de T08-1 |
| Cuenta de Miguel (TRABAJADOR en Empresa A) | El usuario afirma que puede abrir correctamente esta pantalla y consultar el saldo REAL | **Aprobado en UI** para lectura; la captura por sí sola no prueba una negativa HTTP para modificaciones, que no están disponibles todavía en T08-1 |
| Acciones de cambio de stock | No hay controles de ajuste/traslado en la vista | **Diseño previsto:** módulo read-only para todos los roles hasta T08-3/T08-4; no equivale a demostrar denegación por rol |

**Resultado parcial:** aislamiento de listados de saldos entre empresas y lectura como trabajador observados. Falta ejecutar la selección explícita de **Sede A TEST 2** (y preferiblemente comprobar la pestaña Historial con ese filtro), el filtro por artículo, el historial de Empresa B y la regresión DEMO para el cierre manual de este subincremento. No se modifica la base ni se fusiona PR #41 por estas capturas.

## Evidencia manual — filtro Sede A TEST 2 (10/11/2026)

**Fuente:** dos capturas del usuario con TEST Empresa A y filtro explícito **Sede A TEST 2 · ACTIVA**, una para cada pestaña.

| Vista | Evidencia visual | Resultado |
|---|---|---|
| Existencias | 0 combinaciones artículo/sede; mensaje «No hay saldos registrados para los filtros seleccionados. Esto no significa que todo el catálogo tenga saldo cero» | **Aprobado** |
| Historial de movimientos | 0 movimientos; mensaje «No hay movimientos registrados para los filtros seleccionados» | **Aprobado** |
| Aislamiento por sede | No figuran Producto A TEST con saldo 11 ni las tres recepciones (+5, +4 y +2) de Sede A TEST | **Aprobado visualmente** |

**Conclusión:** se verifica el funcionamiento del filtro server-side por sede en ambas vistas, sobre el conjunto de datos de esta prueba. Saldos y movimientos de Sede A TEST se mantienen separados de Sede A TEST 2. La respuesta vacía no prueba saldo cero explícito. Para el cierre completo de T08-1 quedan por revisar, según alcance deseado, el filtro por artículo, la regresión DEMO en esta rama y la paginación con volúmenes grandes; la cobertura de contrato ya fue ejecutada en CI. No se fusiona el PR por esta sola evidencia.

## Evidencia manual de regresión DEMO y aceptación principal — 10/11/2026

**Fuente:** confirmación expresa del responsable de las pruebas: «Demo sigue mostrando sus datos particulares sin mezclar nada de pruebas reales». Se refiere a la continuidad del entorno DEMO después de integrar T08-1; no representa una ejecución independiente de pruebas e2e automatizadas sobre PostgreSQL.

| Verificación | Resultado | Evidencia |
|---|---|---|
| DEMO WALOS: datos propios y navegación existente | **Aprobada en alcance reportado** | Usuario confirma que los datos DEMO se mantienen particulares y sin mezcla de pruebas REAL |
| Saldos REAL en TEST Empresa A | **Aprobado** | 11 UNIDAD de Producto A TEST en Sede A TEST, versión 3 |
| Ledger de la sede A TEST | **Aprobado** | Tres recepciones reales: +2, +4 y +5; suma 11 |
| Filtro Sede A TEST 2: saldos e historial | **Aprobado** | Ambas vistas vacías, sin arrastrar movimientos de Sede A TEST |
| Empresas A vs. B en saldos | **Aprobado visualmente** | B devuelve 0 combinaciones, sin saldos de A |
| Consulta con trabajador Miguel | **Aprobada en UI** | El usuario pudo acceder a los datos permitidos |

**Decisión:** aceptación funcional principal de T08-1 completada para lectura de saldos y movimientos, aislamiento visual por sede/empresa, trabajador lector y no regresión DEMO observada. **No equivale a aprobación de T08 completo ni a QA integral de seguridad**. Pendientes explícitos: prueba manual de filtro por artículo; historial vacío de B bajo la cuenta pertinente; >100 filas y cambios concurrentes de página; pruebas negativas HTTP y Playwright full-stack contra PostgreSQL (T11). Un mensaje de pluralización «0/1 combinaciones» sigue siendo un detalle UX no bloqueante para el siguiente pulido. **PR #41 permanece abierto como borrador, sin merge**.
