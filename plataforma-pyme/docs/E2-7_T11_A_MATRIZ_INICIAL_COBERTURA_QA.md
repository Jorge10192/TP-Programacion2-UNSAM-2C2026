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
| E27-PUR-01 compra mixta sin stock | POR VERIFICAR | Revisar e2e compra/stock antes de recepción |
| E27-REC-01 recibir compra con stock | POR VERIFICAR | Falta prueba transversal compra→recepción→saldo identificada |
| E27-REC-02 recepción replay | POR VERIFICAR | Revisar e2e recepción y API idempotente |
| E27-INV-01 saldo/version/ledger | CUBIERTO | `inventory.spec.ts` verifica saldos, historial y versiones; `pos-draft.spec.ts` consulta saldo y ledger postventa |
| E27-INV-02 traslado entre sedes | CUBIERTO | `inventory.spec.ts` verifica reintento y saldos de origen/destino, más historial |
| E27-INV-03 ajuste con versión válida | CUBIERTO | `inventory.spec.ts` opera ajustes con `expected_version` y saldo final |
| E27-INV-04 versión obsoleta/409 | CUBIERTO | `inventory.spec.ts` valida 409 sin movimiento/reintento automático |
| E27-SAL-01 venta física y débito | CUBIERTO | `pos-draft.spec.ts` prueba 5→3, un movimiento VENTA_SALIDA y comprobante |
| E27-SAL-02 mixta bien+servicio+2 pagos | PARCIAL | `pos-draft.spec.ts` prueba dos pagos/descuento y venta física por separado; backend `test_sales_api_integration.py` prueba físico+servicio; falta **combinación en un mismo flujo navegador** |
| E27-SAL-03 respuesta perdida y replay 200 | PARCIAL | `pos-draft.spec.ts` verifica respuesta 201 perdida + GET confirmado sin reenvío, y POST perdido + GET 404 + replay con mismo body; `test_sales_api_integration.py` comprueba replay 200; falta caso navegador de 200 después de 201 perdido |
| E27-SAL-04 insuficiencia/409 | CUBIERTO | `pos-draft.spec.ts` comprueba 409, F5, GET 404, cero ventas; `test_sales_api_integration.py` prueba rollback de ledger y saldo |
| E27-SAL-05 precio/descuento y pagos incoherentes | PARCIAL | `sales-real-checkout.test.mjs` y `test_sales_price_policy_integration.py` rechazan montos/permisos; verificar error mostrado por navegador |
| E27-PRES-01 F5 post compra/venta | PARCIAL | `sales.spec.ts` consulta historial tras F5; falta recorrido compra→stock→venta |
| E27-MODE-01 aislamiento DEMO/REAL | POR VERIFICAR | El workflow ejecuta suites DEMO y REAL separadas; no equivale a probar cambio entre ambos modos |
| E27-MODE-02 QR/caja/cuentas DEMO sin writes REAL | POR VERIFICAR | Requiere navegación y comprobación de efectos |
| E27-RESP-01 desktop/móvil/teclado REAL | PARCIAL | CI frontend prueba DEMO en Chromium desktop/móvil; configuración Playwright REAL actual tiene Desktop Chrome; faltan móvil y teclado específicamente en REAL |

## Priorización de trabajo T11

**P0 (primero):** escenario continuo **bien físico + servicio → compra/recepción → stock → venta mixta con dos pagos → comprobante + ledger + F5** sobre **una sola empresa PostgreSQL efímera**. Debe usar los contratos existentes, sin habilitar ventas en el entorno local del usuario.

**P1:** concurrencia/aislamiento tenant A/B, respuesta tardía al cambiar empresa, navegación de URL ajena y permisos de trabajador sin asignación.

**P2:** recorrido móvil REAL y teclado; cambios DEMO↔REAL sin contaminación, acciones de QR/caja/cuentas que no generan escrituras REALES.

## Próxima acción

Completar el inventario de archivos e2e y tests backend relevantes antes de declarar cobertura definitiva, convertir esta tabla en matriz trazable con rutas y nombre de prueba exacto, y añadir solo los escenarios faltantes. Mantener PR #45 DRAFT y exigir CI en el mismo commit para cada cambio. **La matriz inicial no da por aprobada la puerta T11-D.**
