# E2-7 · T11 — Auditoría final de integración y puerta PRE-MERGE

**Fecha de cierre técnico:** 11/11/2026 · **Rama:** `feature/e2-7-t11-qa-integral-hardening` · **PR:** [#45](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/45), **DRAFT**, sin merge.  
**Commit de código con regresión final aprobada:** `6aecd80e52a0712f7d1088dde8347de7f7a7c186`.  
**Este documento reemplaza el dictamen NO-GO preliminar emitido antes de las pruebas T11-F.** El commit exclusivamente documental que actualiza este informe requiere revisar sus propios checks antes del merge.

## 1. Dictamen

**GO TÉCNICO CON LIMITACIONES EXPLÍCITAS para integrar la etapa funcional E2-7/T11 a `main`, sujeto a revisión humana y autorización expresa del responsable del repositorio.** No implica autorización para ejecutar el merge, habilitar ventas locales o declarar terminada la documentación académica.

El informe se basa en:
- **26 de 26 criterios funcionales E27 con evidencia directa del núcleo exigido** mediante Playwright + FastAPI/PostgreSQL descartable, pruebas de backend y, donde corresponde, retest manual.
- **Tres workflows en verde en el mismo commit de código `6aecd80`**: frontend, backend y full-stack.
- **Los dos defectos manuales de sedes SELL/STORE corregidos y retesteados**.
- GitHub comparó el PR con `main`: **63 commits adelante, 0 detrás, 30 archivos cambiados, `mergeable=true`** en el corte previo a la presente actualización documental. No se detectaron conflictos.
- El criterio E27-RESP-01 está acreditado en su **alcance de smoke test** (desktop 1440 px, móvil 390 px, teclado, navegación y ocho rutas principales); **no** representa una evaluación WCAG exhaustiva ni aprobación del rediseño visual.

El dictamen anterior de 17 directos/8 parciales/1 faltante era correcto **para su fecha de corte**, pero quedó obsoleto tras las suites T11-F. Esta es la matriz vigente.

## 2. Etapas y evidencia verificable

| Etapa | Evidencia | Resultado |
|---|---|---|
| Backend y datos | [Full-stack #43014577888](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/43014577888), Pytest con PostgreSQL efímero y `RUN_DB_INTEGRATION=1` | **892 Pytest PASS**, 2 warnings Pydantic |
| Backend aislado | [Backend #43014577849](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/43014577849) | **SUCCESS**, Python 3.12/3.14 e imagen FastAPI |
| Frontend independiente | [Frontend #43014577698](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/43014577698) | **SUCCESS**, build, lint y pruebas unitarias/browser del workflow |
| Navegador REAL full-stack | [Full-stack #43014577888](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/43014577888) | **38 Playwright PASS**, FastAPI/Vite/PostgreSQL QA |
| Navegador DEMO | Mismo full-stack | **6 Playwright PASS**, estado local independiente |
| Manual REAL | [Acta T11-D2 de 39 pasos](E2-7_T11_D2_ACTA_PRUEBA_MANUAL_REAL.md) + [retest SELL/STORE](E2-7_T11_E_FIX_SEDES_ASIGNADAS_QA.md) | Aprobado en casos recorridos; dos defectos corregidos y verificados |
| Verificación de integración | Comparación de PR #45 `main`→rama | 63 ahead / 0 behind, mergeable=true, sin reviews registradas |

**Guardas críticas:** tests de navegador que hacen POST usan `PYME_DISPOSABLE_QA=1`, API CI `127.0.0.1:18001`, usuarios y empresas QA únicos. No se habilitaron las ventas locales sobre TEST Empresa A. Se conservó el PR como borrador.

## 3. Matriz vigente de los 26 escenarios obligatorios

**DIRECTO** significa que el núcleo del escenario está comprobado en browser REAL + API/DB efímera (o, cuando el escenario es DEMO, en la UI DEMO vigilando escrituras REAL). La existencia de tests no equivale a cobertura universal de todos los estados y dispositivos.

| Escenario | Estado | Prueba principal |
|---|---|---|
| E27-AUTH-01 registro/login/GET me | DIRECTO | `auth-registration-ui.spec.ts` |
| E27-AUTH-02 logout y protección | DIRECTO | `security-navigation.spec.ts` |
| E27-AUTH-03 F5 y reautenticación | DIRECTO | `responsive-keyboard.spec.ts`, `sales-recovery.spec.ts` |
| E27-TEN-01 A/B empresas | DIRECTO | `security-navigation.spec.ts` |
| E27-TEN-02 respuesta tardía A→B | DIRECTO | `security-navigation.spec.ts` |
| E27-TEN-03 URL de empresa ajena | DIRECTO | `security-navigation.spec.ts` |
| E27-PERM-01 SELL/STORE sin asignación | DIRECTO | `assigned-location-visibility.spec.ts`, `security-errors.spec.ts` |
| E27-LOC-01 sede activa/pausada/reactivada + F5 | DIRECTO | `business-crud-persistence.spec.ts` |
| E27-CAT-01 bien/servicio/inactivación + F5 | DIRECTO | `business-crud-persistence.spec.ts` |
| E27-SUP-01 proveedor CRUD y persistencia | DIRECTO | `business-crud-persistence.spec.ts` |
| E27-PUR-01 bien + concepto libre sin stock antes de recibir | DIRECTO | `purchase-ui-persistence.spec.ts` |
| E27-REC-01 recepción y movimiento solo para bien físico | DIRECTO | `purchase-ui-persistence.spec.ts`, `flow-purchase-to-sale.spec.ts` |
| E27-REC-02 recepción idempotente | DIRECTO | `flow-purchase-to-sale.spec.ts` |
| E27-INV-01 saldos/versiones/ledger | DIRECTO | `inventory.spec.ts` |
| E27-INV-02 traslado con −1/+1 y neto cero | DIRECTO | `inventory.spec.ts` (par, misma operación y replay) |
| E27-INV-03 ajuste con versión válida | DIRECTO | `inventory.spec.ts` |
| E27-INV-04 versión obsoleta 409 | DIRECTO | `inventory.spec.ts` |
| E27-SAL-01 venta física y salida de stock | DIRECTO | `pos-draft.spec.ts` |
| E27-SAL-02 venta mixta + pagos divididos | DIRECTO | `flow-purchase-to-sale.spec.ts` |
| E27-SAL-03 idempotencia 201 perdido → GET/replay 200 | DIRECTO | `sales-recovery.spec.ts` |
| E27-SAL-04 stock insuficiente 409 | DIRECTO | `pos-draft.spec.ts` |
| E27-SAL-05 precio/descuento con pagos incoherentes | DIRECTO | `sales-invalid-payment-policy.spec.ts` (rechazo UI y API 422); `responsive-keyboard.spec.ts` |
| E27-PRES-01 F5 persistencia de compra/venta | DIRECTO | `purchase-ui-persistence.spec.ts`, `flow-purchase-to-sale.spec.ts` |
| E27-MODE-01 DEMO↔REAL aislados | DIRECTO | `responsive-keyboard.spec.ts` |
| E27-MODE-02 QR/caja/cuentas DEMO no escriben REAL | DIRECTO | `demo-money-isolation.spec.ts` |
| E27-RESP-01 móvil, escritorio, teclado, navegación | DIRECTO (smoke) | `responsive-keyboard.spec.ts`, `mobile-core-navigation.spec.ts` |

**Balance:** **26/26 criterios E27 comprobados en su alcance de aceptación definido.** Responsive/accesibilidad formal más allá de ese smoke, comportamiento en dispositivos reales y WCAG completo siguen pendientes de una etapa UX posterior. No clasificarla como evaluación de accesibilidad exhaustiva.

## 4. Auditoría del alcance del PR (no romper compatibilidad)

En la comparación de código previa al commit documental, **30 archivos** en `plataforma-pyme/`; los cambios funcionales en producción son mínimos:
- `backend/app/modules/locations/assignment_service.py`, `router.py`: consulta de ubicaciones propias activas, limitada por sesión y empresa.
- `frontend/src/features/businesses/realOperationsGateway.ts`: cliente de asignaciones propias.
- `frontend/src/features/sales/RealPosPage.tsx`: selector SELL filtrado por sede autorizada.
- `frontend/src/features/inventory/RealInventoryPage.tsx`, `RealTransferPanel.tsx`: origen/destino STORE limitados a asignaciones del trabajador.
- Cuatro pantallas con correcciones **solo de texto** (proveedores, compras, empresa y checkout).
- El resto: tests E2E y documentos de QA. **Sin nuevas migraciones Alembic, tablas o modificaciones de datos de producción.**

Verificaciones de compatibilidad: backend valida nuevamente permisos para cada POST; el filtro de la UI **no** confiere autorización; roles de administración conservan selección de sedes. Compra no mueve stock sin recepción; servicio no genera movimiento físico; idempotencia evita duplicación. El modo DEMO mantiene estado local separado y ninguna acción DEMO de QR/caja/cuentas escribe ventas, compras o inventario REAL.

## 5. Revisión manual y límites de la evidencia

Se siguieron **39 pasos** sobre cuentas de dueño y trabajador, con capturas en la conversación (no adjuntadas como imágenes versionadas). Se recorrieron empresas/equipo, catálogo, proveedores, compras, recepciones, inventario y POS (precio, descuentos, pagos, F5, borrador y logout). El listado de saldos observado fue **7, 4 y 6**; se comprobó visualmente que no cambió tras cancelar un traslado. No se verificó SQL persistente del usuario.

Los hallazgos **T11-D2-01** (POS ofrecía sede no asignada) y **T11-D2-02** (transferencias ofrecían sede no asignada) fueron corregidos y revalidados en navegador local y suite. **Sí hubo una revocación administrativa real** de la asignación de Miguel en Sede A TEST 2 realizada por el usuario; **no** se confirmaron ventas, compras, recepciones o movimientos de stock manuales durante ese recorrido. La política de lectura general de inventario entre sedes del mismo tenant se mantiene intencionalmente para el MVP.

## 6. Riesgos residuales y decisiones explícitas

| Riesgo o límite | Severidad para integración E2-7 | Tratamiento |
|---|---|---|
| **Pydantic `UnsupportedFieldAttributeWarning`**, `Field(alias=...)` | Bajo/no bloqueante | El full-stack del commit final de código reportó **2 warnings** (alias `supplier_id` y `command`) con 892 PASS; variaron entre corridas. No se identificó una fuente única reproducible; evitar cambios especulativos de validación al cerrar la rama |
| **IndexedDB** con payload comercial local no cifrado en flujos de recuperación | Medio/aceptación informada | No guarda tokens; interfaz advierte evitar dispositivos compartidos; arquitectura y cifrado quedan para endurecimiento posterior |
| **Ventas REAL** deshabilitadas por defecto localmente | Intencional | `VITE_PYME_ENABLE_REAL_SALES` solo en CI descartable u otros entornos explícitamente autorizados. No activar en TEST Empresa A sin decisión |
| **Pagos/QR DEMO** no son acreditación bancaria ni Mercado Pago real | Intencional | Los pagos REAL son *declarados*, no verificados por terceros; QR/caja/cuentas DEMO no equivalen a integraciones financieras productivas |
| UX, WCAG completa, lectores de pantalla, compatibilidad móvil física | Fuera del alcance de smoke E27, deuda de producto | Tratar después de estabilizar MVP; no declararlo certificado |
| Documentación académica T12 (UML, RF/CU/API/UI, documentos 01–05) | Puerta distinta | Actualizar tras integración, no confundir QA del frontend/backend con entrega final académica |

No se detectaron fallos de tests, duplicaciones de operaciones o filtración cross-tenant **en los escenarios probados**. No se afirma ausencia universal de bugs.

## 7. Checklist y autorización para main

- [x] Integridad de compra/recepción/stock/venta bajo PostgreSQL descartable.
- [x] Pruebas de registro, sesión, multi-tenant, permisos, HTTP 401/403/404/409/422/503, idempotencia.
- [x] 26 escenarios de la matriz E27 cubiertos en su alcance funcional.
- [x] Dos defectos de interfaz detectados manualmente corregidos y reverificados en CI + navegador local.
- [x] 892 Pytest + 38 Playwright REAL + 6 DEMO PASS en mismo commit funcional; frontend/backend independientes SUCCESS.
- [x] Sin divergencia ni conflicto GitHub con `main` al corte; cambios limitados a `plataforma-pyme/`.
- [x] Los riesgos residuales están explicitados, sin disfrazar DEMO de integración bancaria REAL.
- [ ] **Confirmar tres CI del HEAD final después de actualizar este documento.**
- [ ] **Revisión y aceptación explícita del responsable**, incluidos riesgos residuales.
- [ ] Solo entonces pasar PR #45 de DRAFT a READY y, con permiso expreso, fusionar a `main`.
- [ ] T12 académico se planifica tras el merge técnico, por separado.

**Dictamen:** `APTO TÉCNICAMENTE PARA MAIN (E2-7/T11)`, con limitaciones descritas; pendiente checks del commit documental y consentimiento humano. **No fusionado.**
