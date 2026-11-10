# E2-7 T08-2 — Historial REAL, filtros locales y trazabilidad de movimientos

**Estado:** implementación completada, CI aprobado y **seis pruebas funcionales manuales T08-2 aprobadas** según las capturas y confirmación del usuario (10/11/2026). **PR #41 sigue en borrador, sin merge a `main`.**

## 1. Objetivo y límites

Pulir el módulo de **Inventario REAL de solo lectura** construido en T08-1, sobre los contratos ya existentes de FastAPI/PostgreSQL. El servidor continúa siendo la **única fuente de verdad** para cantidades, saldos, movimientos, autorizaciones y aislamiento por tenant. T08-2 **no** crea stock, ajusta cantidades, confirma recepciones ni implementa transferencias.

**No cambia rutas backend**, esquemas PostgreSQL, Alembic, permisos, idempotencia, `demoStore` ni operaciones comerciales.

## 2. Cambios funcionales

| Pantalla / decisión | Implementación |
|---|---|
| Leyendas de registros cargados | Gramática correcta: `0 combinaciones ... cargadas`, `1 combinación ... cargada`, `1 movimiento cargado`, `3 movimientos cargados`, con aviso si pueden quedar páginas |
| Historial → tipo | Select `Todos`, `Solo entradas (+)`, `Solo salidas (−)` y los siete tipos de movimiento del backend |
| Historial → búsqueda | Nombre de artículo, SKU, sede, etiqueta de evento, identificador del movimiento, actor y registros de origen; búsqueda insensible a tildes y mayúsculas |
| Alcance honesto del filtro | **Solo registros que el navegador ya cargó**. El endpoint general no dispone de búsqueda por texto/tipo/fecha; por eso hay aviso permanente de filtro local |
| Totales visibles | Recuento de **entradas** y **salidas** entre registros cargados, sin confundirlos con el stock del negocio ni sumarlos como si fueran saldo |
| Coincidencias vacías | Se distingue ausencia de movimientos en la consulta server-side de la ausencia de coincidencias en los movimientos descargados; si hay más páginas, se advierte |
| Trazabilidad desplegable | `Ver trazabilidad` muestra ID íntegro de movimiento, responsable, ubicación y artículo, más IDs opcionales de recepción/renglón de compra, operación y tipo, venta/renglón de venta si existen |
| Diseño | Panel accesible con `details/summary`, selección por teclado, texto copiables y composición responsive |
| Continuidad | Mantiene filtros server-side **por sede y artículo**, `offset/limit=100`, `Cargar más`, cancelación de peticiones, manejo 401/403/404 y separación REAL/DEMO |

### Precisión semántica

- `receipt_id` es un **comprobante interno de recepción** (ID), **no** una factura de proveedor ni un comprobante de pago. No se inventan links de documentos inexistentes.
- `actor_id` se identifica como ID; no se inventan nombres ni se asocia sin consulta autorizada adicional.
- Se muestran **IDs de registros que la API ya autorizó** a este usuario y empresa. No se consulta un usuario ajeno ni se extraen datos privados de otras empresas.
- Un nombre, SKU o unidad procede del **catálogo REAL actualmente cargado**, no de un snapshot histórico de la línea. Si una ficha no se descargó, se conserva el identificador parcial visible.
- El resumen `Entradas / Salidas` cuenta movimientos de las páginas cargadas; no expresa total histórico del tenant, consumo, ni cantidades acumuladas.
- La búsqueda local no hace un nuevo GET ni sustituye los filtros server-side. El botón **Cargar más movimientos** sigue disponible cuando el endpoint devolvió una página completa.

## 3. Archivos implicados

- `frontend/src/features/inventory/inventoryHistoryView.ts` (nuevo): funciones puras para filtros, totales parciales, leyendas y trazabilidad.
- `frontend/src/features/inventory/RealInventoryPage.tsx`: select, búsqueda local, resumen, `details` y corrección de leyendas.
- `frontend/src/features/auth/auth.css`: disposición responsive, foco visible y texto de IDs íntegros sin desbordes.
- `frontend/tests/inventory-real-api.test.mjs`: nueve nuevas pruebas unitarias agregadas al comando existente `npm.cmd run test:inventory-real`.

El resto de tests existentes se mantiene; no se modifica el contrato `createInventoryGateway` ni los endpoints para agregar un `event_type` inexistente.

## 4. Matriz automatizada de T08-2

| Grupo de test | Aceptación |
|---|---|
| 0 / 1 / múltiples registros | Textos y pluralización sin errores; aviso de páginas pendientes |
| Entradas / salidas | Filtrado por signo, sin alterar datos ni orden del backend |
| Evento exacto | Recepción diferente de traslado y salida por venta |
| Búsqueda local | Acentos/case-insensitive, SKU, artículo, sede y nombre de evento |
| IDs de origen | Movimiento, actor, recepción y operación de inventario |
| Detalle de recepción | IDs existentes; no inventar factura/venta |
| Detalle venta / traslado | Campos opcionales no se muestran si vienen ausentes o `null` |
| 100 filas cargadas | No se infiere cobertura total del servidor ni se accede a páginas futuras |
| Totales visibles | Cuenta filas de las páginas cargadas; no calcula el stock ni cantidades agregadas |

**Evidencia CI confirmada:** [GitHub Actions run #42846238798](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42846238798), commit funcional `449bc5804a9cfb280b826540430f6c9bc04f5915`: **SUCCESS**. `npm run build` aprobado, `npm run lint` **0 advertencias y 0 errores**, `npm run test:inventory-real` **25/25** (16 de T08-1 + 9 de T08-2), suites frontend **190/190** acumuladas y job Chromium escritorio/móvil aprobado (recorridos actuales DEMO; no E2E PostgreSQL). La primera ejecución de T08-2 había fallado por dos expresiones JSX sin cerrar; fueron corregidas en commit `449bc58` y la ejecución posterior aprobó. El aviso Vite de tamaño de chunk JS >500 kB continúa visible, no se ha silenciado.

## 5. QA manual sobre TEST Empresa A (sin mutaciones)

Después de actualizar la rama y abrir `/real/login`:

1. Ir a **TEST Empresa A → Inventario REAL → Historial de movimientos**. Esperado con el dataset conocido: **3 movimientos cargados; 3 entradas, 0 salidas**; recepción +5, +4, +2 por Sede A TEST.
2. Elegir **Solo entradas (+)**: permanecen las tres recepciones. Elegir **Solo salidas (−)**: aparece mensaje **sin coincidencias entre los registros cargados** (no equivale a asegurar que históricamente no existen salidas).
3. Elegir **Recepción de compra**: siguen +5, +4 y +2. Elegir otro evento, por ejemplo `Salida por venta`: no debería mostrar estas recepciones.
4. Buscar `producto a`, `Sede A TEST` y un texto inexistente. La búsqueda es local sobre las filas ya cargadas y debe anunciarlo.
5. Abrir **Ver trazabilidad** en la recepción de **+5**: debe mostrar UUID de movimiento, responsable, sede, artículo, recibo y renglón de compra. No hay factura ni PDF generado.
6. Alternar a **Existencias**: **11 UNIDAD** en Sede A TEST si no hubo movimientos nuevos; observar singular correcto `1 combinación artículo/sede cargada`.
7. En el filtro superior elegir **Sede A TEST 2**: sigue **0 combinaciones y 0 movimientos**; ambos textos ahora están bien pluralizados.
8. Entrar a **TEST Empresa B**: solo información de B. Ingresar como Miguel: lectura REAL sin controles de ajuste ni transferencia.
9. Regresión: entrar a DEMO/WALOS; artículos y movimientos siguen independientes.

**Nota:** No hace falta recrear usuarios ni modificar las compras recibidas. Si el saldo difiere de 11, revisar los movimientos reales posteriores y no alterar el código para forzar ese valor.

## 6. Riesgos y entrega a T08-3 / T11

- **Paginación concurrente:** `offset/limit` no ofrece snapshot transaccional entre páginas. T08-1 ya detecta IDs repetidos y permite actualizar. Una fila desplazada/saltada entre páginas puede exigir un mecanismo de cursor backend en una evolución posterior; no declarar lista completa con 100 registros exactos.
- **Filtros de alcance global:** tipo/texto/fecha serían filtros server-side nuevos, con contratos y pruebas backend; **no** se simulan aquí.
- **QA de gran volumen:** crear dataset sintético de >100 movimientos y comprobar paginación sin duplicar/omitir filas bajo concurrencia. Transferir a T11.
- **Auditoría documental:** identificadores internos de recepción no constituyen documentos de facturación.
- **T08-3:** transferencias REALES con doble movimiento atómico e idempotencia; UI distinta, protección de roles/ubicaciones.
- **T08-4:** carga inicial y ajustes con `expected_version` y relectura ante 409.
- **T08-5:** validación integrada antes de merge a `main`. El PR #41 sigue como borrador hasta finalizar T08 completo.

## 7. Resultado técnico y próxima decisión

Se considera **aprobada la aceptación funcional principal de T08-2** con las pruebas manuales de búsqueda, filtro por tipo, trazabilidad y saldos; ver evidencia de la sección 8. La aprobación es del subincremento de lectura, **no** de la seguridad/integración completa de T08. T08-3/T08-4 aún no desarrolladas; PR #41 NO se fusiona.

## 8. Evidencia manual T08-2 — 10/11/2026

**Fuente:** seis capturas del navegador con TEST Empresa A en Inventario REAL y declaración expresa del usuario de haber completado las seis pruebas. Se registra solo lo que muestran las capturas o lo que confirma el usuario; no se afirma una nueva consulta SQL ni una prueba E2E automatizada contra PostgreSQL.

| Criterio | Resultado observado | Veredicto |
|---|---|---|
| Historial inicial de Producto A TEST, Sede A TEST | **3 movimientos** de recepción, **+5**, **+4**, **+2**; resumen **3 entradas, 0 salidas**, orden descendente | **Aprobado** |
| Selector «Solo entradas (+)» | **3 coincidencias** y permanecen visibles las tres recepciones | **Aprobado** |
| Selector «Solo salidas (−)» | **0 coincidencias**, mensaje «No hay coincidencias entre los 3 movimientos cargados»; sin inventar salidas | **Aprobado** |
| Búsqueda por texto sin coincidencias | Ingreso «Producto A TEST agregado»; **0 coincidencias** y mensaje correcto; el usuario además confirma la prueba de búsqueda positiva | **Aprobado** en alcance reportado |
| «Ver trazabilidad» en recepción +5 | Se despliegan UUID de **movimiento, responsable, ubicación, artículo, recepción interna y renglón de compra**; aviso de que no constituye factura o comprobante de pago | **Aprobado** |
| Regreso a Existencias | **Producto A TEST: 11 UNIDAD**, saldo versión 3, leyenda singular «1 combinación artículo/sede cargada» | **Aprobado** |

**Conciliación:** +2 +4 +5 = **11 UNIDAD**, consistente con el saldo confirmado en el historial y el comprobante de T07. El resumen 3/0 cuenta movimientos **descargados**, no inventario global.

**Decisión:** T08-2 (historial y trazabilidad de solo lectura) **aceptado funcionalmente**. El CI sigue aprobado (25/25 tests de inventario y 190/190 frontend en la última ejecución verificada). No hay autorización para fusionar T08 completo a `main`; el PR #41 permanece en borrador. Siguen pendientes **T08-3 transferencias**, **T08-4 inventario inicial y ajustes**, **T08-5 QA integral**, además de paginación de más de 100 filas y concurrencia que se cubrirán en el QA posterior.
