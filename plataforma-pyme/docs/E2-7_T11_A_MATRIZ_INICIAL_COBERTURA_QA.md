# E2-7 · T11-A — Matriz inicial de cobertura transversal (corte parcial)

**Fecha:** 11/11/2026. **Base:** `main` `bc91c1ee`; **rama:** `feature/e2-7-t11-qa-integral-hardening`; **PR:** #45 DRAFT.

## Metodología y límite

Esta matriz coteja los **26 escenarios E27-*** exigidos por `E2-7_QA_CRITERIOS_ACEPTACION_Y_RIESGOS.md` contra pruebas de las que se inspeccionó el contenido directamente en este corte: `frontend/e2e/real/pos-draft.spec.ts`, `inventory.spec.ts`, `sales.spec.ts`, `backend/tests/test_sales_api_integration.py` y `test_sales_price_policy_integration.py`, y el workflow full-stack. Se consideran además las evidencias de CI del acta T10-F. **No es una enumeración exhaustiva de todos los archivos de tests**: aún deben inventariarse los e2e de autenticación, empresas, catálogo, proveedores y compras. No confundir ausencia de evidencia consultada con ausencia definitiva de tests.

**Leyenda:** CUBIERTO = prueba directa identificada del comportamiento completo; PARCIAL = existen pruebas de una parte pero no del escenario transversal completo; POR VERIFICAR = no se ha localizado ni inspeccionado evidencia suficiente en este corte.

| Escenario | Estado inicial | Evidencia o brecha concreta |
|---|---|---|
| E27-AUTH-01 registro/login/GET me | POR VERIFICAR | Fixtures POS se registran y autentican, pero no se verificó prueba de pantalla + GET /me |
| E27-AUTH-02 logout/protección | POR VERIFICAR | Revisar tests e2e auth |
| E27-AUTH-03 F5/reautenticación | PARCIAL | `sales.spec.ts` y `pos-draft.spec.ts` hacen F5/re-login; falta validar ausencia de contaminación DEMO |
| E27-TEN-01 selector A/B | POR VERIFICAR | Revisar tests e2e empresas y flujo UI |
| E27-TEN-02 respuesta tardía A→B | POR VERIFICAR | Riesgo alto; test de red específico |
| E27-TEN-03 URL empresa ajena | PARCIAL | Backend ventas comprueba aislamiento de tenant; falta verificar vista de navegación |
| E27-PERM-01 SELL/STORE sin asignación | PARCIAL | `test_sales_price_policy_integration.py` prueba 403 sin asignación; falta UI integral |
| E27-LOC-01 sede pausar/reactivar y F5 | POR VERIFICAR | Revisar pruebas de operaciones/sedes |
| E27-CAT-01 bien+servicio/inactivación | PARCIAL | POS E2E crea ambos tipos, pero no verifica inactivación persistida |
| E27-SUP-01 proveedor CRUD | POR VERIFICAR | Revisar e2e proveedores |
| E27-PUR-01 compra mixta sin stock | POR VERIFICAR | No existe escenario de compra en el listado de **19 Playwright REAL** certificado; se debe verificar cobertura backend/frontend aparte |
| E27-REC-01 recibir compra con stock | POR VERIFICAR | Ninguno de los **19 casos navegador REAL** del workflow final T10 prueba compra→recepción→saldo; inventariar backend y tests frontend unitarios antes de crear el transversal |
| E27-REC-02 recepción replay | POR VERIFICAR | Revisar e2e recepción y API idempotente |
| E27-INV-01 saldo/version/ledger | CUBIERTO | `inventory.spec.ts` verifica saldos, historial y versiones; `pos-draft.spec.ts` consulta saldo y ledger postventa |
| E27-INV-02 traslado entre sedes | PARCIAL | `inventory.spec.ts`: traslado, saldos en origen/destino y replay sin duplicados; ampliar aserción explícita de los dos movimientos de signos opuestos y neto cero en un único escenario |
| E27-INV-03 ajuste con versión válida | CUBIERTO | `inventory.spec.ts` opera ajustes con `expected_version` y saldo final |
| E27-INV-04 versión obsoleta/409 | CUBIERTO | `inventory.spec.ts` valida 409 sin movimiento/reintento automático |
| E27-SAL-01 venta física y débito | CUBIERTO | `pos-draft.spec.ts` prueba 5→3, un movimiento VENTA_SALIDA y comprobante |
| E27-SAL-02 mixta bien+servicio+2 pagos | PARCIAL | `pos-draft.spec.ts` prueba dos pagos/descuento y venta física por separado; backend `test_sales_api_integration.py` prueba físico+servicio; falta **combinación en un mismo flujo navegador** |
| E27-SAL-03 respuesta perdida y replay 200 | CUBIERTO | `sales-recovery.spec.ts`: casos físico y servicio, 201 perdido después de COMMIT, F5, GET, replay HTTP 200, misma clave/cuerpo, sin movimiento duplicado; además `pos-draft.spec.ts` cubre GET 404 y reenvío manual |
| E27-SAL-04 insuficiencia/409 | CUBIERTO | `pos-draft.spec.ts` comprueba 409, F5, GET 404, cero ventas; `test_sales_api_integration.py` prueba rollback de ledger y saldo |
| E27-SAL-05 precio/descuento y pagos incoherentes | PARCIAL | `sales-real-checkout.test.mjs` y `test_sales_price_policy_integration.py` rechazan montos/permisos; verificar error mostrado por navegador |
| E27-PRES-01 F5 post compra/venta | PARCIAL | `sales.spec.ts`, `sales-read.spec.ts` y `sales-recovery.spec.ts` consultan historial/recuperación tras F5; falta el mismo recorrido desde compra y recepción |
| E27-MODE-01 aislamiento DEMO/REAL | POR VERIFICAR | El workflow ejecuta suites DEMO y REAL separadas; no equivale a probar cambio entre ambos modos |
| E27-MODE-02 QR/caja/cuentas DEMO sin writes REAL | POR VERIFICAR | Requiere navegación y comprobación de efectos |
| E27-RESP-01 desktop/móvil/teclado REAL | PARCIAL | `sales-read.spec.ts` incluye viewport REAL 390×844 y F5; el proyecto Playwright REAL usa Desktop Chrome y todavía falta matriz móvil/teclado integral de módulos; DEMO sí tiene suite aparte |

## Priorización de trabajo T11

**P0 (primero):** escenario continuo **bien físico + servicio → compra/recepción → stock → venta mixta con dos pagos → comprobante + ledger + F5** sobre **una sola empresa PostgreSQL efímera**. Debe usar los contratos existentes, sin habilitar ventas en el entorno local del usuario.

**P1:** concurrencia/aislamiento tenant A/B, respuesta tardía al cambiar empresa, navegación de URL ajena y permisos de trabajador sin asignación.

**P2:** recorrido móvil REAL y teclado; cambios DEMO↔REAL sin contaminación, acciones de QR/caja/cuentas que no generan escrituras REALES.

## Próxima acción

Completar el inventario de archivos e2e y tests backend relevantes antes de declarar cobertura definitiva, convertir esta tabla en matriz trazable con rutas y nombre de prueba exacto, y añadir solo los escenarios faltantes. Mantener PR #45 DRAFT y exigir CI en el mismo commit para cada cambio. **La matriz inicial no da por aprobada la puerta T11-D.**

## 4. T11-A — Contraste reproducible de la suite browser REAL

**Fuente directa de ejecución:** [GitHub Actions full-stack T10 último commit documental, run 42982898458](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42982898458), job `inventory-real` **SUCCESS**, registro de Pytest **892 passed (2 warnings)**, Playwright **19 passed** REAL y **6 passed** DEMO. El run pertenece a T10 antes de iniciar T11; **no** declara aún QA T11 aprobada.

El listado de tests ejecutados por Playwright REAL consta de cinco archivos, sin suites de autenticación, navegación multiempresa, proveedores, compras o recepción:

| Archivo browser REAL | Casos reales del run | Cobertura constatable |
|---|---:|---|
| `e2e/real/inventory.spec.ts` | 4 | ajuste y traslado con pérdida de respuesta/replay, 409 de versión, historial paginado |
| `e2e/real/pos-draft.spec.ts` | 8 | carrito, 501 fichas, servicio, dos pagos, venta física, stock 409, POST perdido antes de API y 201 perdido después de COMMIT |
| `e2e/real/sales-read.spec.ts` | 3 | historial/filtro/comprobante y by-request, F5 en viewport móvil, 503 y retry de GET |
| `e2e/real/sales-recovery.spec.ts` | 3 | respuesta 201 perdida y replay 200 para bien/servicio, GET 404 de solicitud no enviada, sin duplicados |
| `e2e/real/sales.spec.ts` | 1 | historial, comprobante por ID, recovery tras F5 y solo GET |
| **Total** | **19** | **Cubre fuertemente inventario y ventas; no el encadenamiento completo del resto de módulos** |

**Ajustes respecto de la matriz inicial:**

- `E27-SAL-03` se reclasifica **CUBIERTO**: `sales-recovery.spec.ts` ejecuta el replay 200 real que faltaba identificar (incluye 201 perdido, F5 y comparación de saldos/ledger sin duplicados). No crear una tercera prueba idéntica en T11.
- `E27-RESP-01` sigue **PARCIAL**: ya existe un caso REAL en ancho 390 px; no hay una matriz móvil/teclado para todos los módulos.
- `E27-INV-02` queda **PARCIAL en su criterio estricto** de dos movimientos de signos opuestos: la suite visible comprueba saldo y reintento, pero falta aserción explícita del par de movimientos en el mismo recorrido.
- Registro/login se usan extensamente como *fixtures* de otras pruebas, pero **no equivalen a pruebas dedicadas** de usuario sin empresa, cambio de tenant y rutas ajenas.
- Los **892 Pytest** confirman una regresión backend verde, no implican por sí mismos que todos los 26 escenarios de interfaz estén cubiertos. Sus casos deben trazarse por nombre en una segunda pasada documental.

## 5. Decisión T11-A para comenzar T11-B

**Brecha transversal confirmada por la ejecución:** ninguno de los 19 E2E REAL une *creación de compra → recepción → saldo → venta mixta* dentro de una misma empresa QA. Ese será el **primer escenario T11-B**, reutilizando DTO y rutas que existan efectivamente en FastAPI, sin añadir endpoints imaginarios ni realizar POST en bases persistentes.

**Antes de escribir ese test:** inspeccionar fuentes reales de compra/recepción y su contrato, los helpers/fixtures de QA y los scripts CI, y enumerar pruebas backend ya existentes para no replicarlas. Después agregar un E2E integral con guardas `PYME_DISPOSABLE_QA=1`, API fija al PostgreSQL efímero y seguimiento de balances/versiones/movimientos. Mantener PR #45 DRAFT, sin merge; `main` y TEST Empresa A permanecen intactos.

**Estado de T11-A:** evidencia de suite REAL inventariada y matriz reclasificada; el inventario nominativo de todos los tests backend/front-end de proveedores y compras aún está **pendiente**, por lo que esta matriz no debe presentarse como cobertura exhaustiva de todo el repositorio.
