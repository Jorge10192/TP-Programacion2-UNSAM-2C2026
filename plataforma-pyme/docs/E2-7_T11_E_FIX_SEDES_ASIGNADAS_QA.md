# T11-E · Corrección de sedes autorizadas en POS y traslados

**Fecha:** 11/11/2026 · **PR:** [#45](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/45) (DRAFT; sin merge). **Rama:** `feature/e2-7-t11-qa-integral-hardening`.

## Defectos encontrados en la prueba manual T11-D2

- **T11-D2-01 (alta):** usuario `TRABAJADOR` sin asignación activa a `Sede A TEST 2` visualizaba dicha sede en el selector de ventas; persistía después de F5 y reautenticación.
- **T11-D2-02 (alta):** el panel de transferencia ofrecía origen/destino STORE de sedes sin asignación, incluso con saldo consultable. FastAPI seguía siendo la autoridad en cada POST.
- **T11-D2-03 (no clasificado como bug):** el inventario de consulta general puede mostrar sedes de la misma empresa; la política de lectura de stock se mantiene sin cambios por falta de decisión contraria.

Los hallazgos fueron reproducidos con dos cuentas en TEST Empresa A **sin efectuar ventas o traslados**. La corrección y regresión automatizada utilizan exclusivamente tenants/usuarios creados en PostgreSQL descartable.

## Corrección implementada

| Archivo | Cambio |
|---|---|
| `backend/app/modules/locations/assignment_service.py` | Método `list_my_active_location_ids`, lectura autenticada limitada al actor y al tenant, filtrando asignaciones y sedes ACTIVAS. No expone información de miembros ajenos ni habilita administración. |
| `backend/app/modules/locations/router.py` | `GET /api/v1/businesses/{business_id}/locations/my-assignments`; devuelve lista de UUID de sedes del usuario autenticado; respeta 401/403/404. Registro anterior a ruta dinámica de ubicación. |
| `frontend/src/features/businesses/realOperationsGateway.ts` | Cliente tipado y validación de respuesta UUID, sin duplicados. |
| `frontend/src/features/sales/RealPosPage.tsx` | Para ENCARGADO/TRABAJADOR solo ofrece sedes SELL activas que estén en asignaciones propias; dueño y administrador conservan acceso a sedes SELL activas. GET falla cerrado para no habilitar opciones sin consultar permisos. |
| `frontend/src/features/inventory/RealInventoryPage.tsx` | Obtiene asignaciones propias para traslados, sin restringir consulta general de existencias. |
| `frontend/src/features/inventory/RealTransferPanel.tsx` | Origen y destino restringidos a sedes STORE activas con asignación del actor no administrativo; se conserva la revalidación backend y recuperación idempotente. |
| `frontend/e2e/real/security-errors.spec.ts` | La prueba de trabajador sin asignación ahora espera que la sede no pueda seleccionarse en POS. |
| `frontend/e2e/real/assigned-location-visibility.spec.ts` | Nueva prueba E2E: dueño crea dos sedes, invita trabajador, asigna únicamente A; backend devuelve sólo A, endpoint administrativo permanece 403; POS muestra únicamente A, traslados sólo A; revocación y F5 + nuevo login dejan selector sin sedes. Sin POST comercial desde navegador. |

## Evidencia de GitHub Actions

**Commit funcional final:** `d2cdf4e774990a770909b674520b883e9e8cd31a`.

- [Full-stack REAL #43002093357](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/43002093357): **SUCCESS**; **892 Pytest**, **32 Playwright REAL**, **6 Playwright DEMO**. El nuevo caso `T11-E: trabajador solo ve sus sedes SELL y STORE, revocación efectiva tras F5` aprobó.
- [Frontend #43002093452](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/43002093452): **SUCCESS**.
- [Backend FastAPI #43002093351](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/43002093351): **SUCCESS**.
- Pytest reportó **3 warnings** no bloqueantes (Pydantic alias/Annotated). Su número varía entre ejecuciones; se mantienen como pendiente independiente de hardening T11-E.

## Decisiones y riesgos residuales

1. **No sustituir permisos backend.** La consulta de asignaciones determina opciones UI; todo POST sigue validado por API, tenant, membresía y sede en el momento de la operación. Si una asignación se revoca durante una sesión abierta, se refleja al recargar/reabrir; la API debe rechazar la operación con permisos vencidos.
2. **No modificar política de lectura:** mostrar saldos/historial entre sedes a un miembro de la empresa no fue tratado como defecto sin una regla de dominio que lo prohíba.
3. **No habilitar confirmación de ventas persistentes:** `VITE_PYME_ENABLE_REAL_SALES` continúa desactivado en el entorno local habitual.
4. **Pendientes de T11-E general:** warnings Pydantic, textos de etapas antiguas y cierre/revisión final del PR. **La corrección de los dos defectos es aprobada; no implica aceptación global del PR.**

## Verificación manual sugerida tras actualizar

1. Mantener backend de rama actualizado (cambió FastAPI, requiere recrear imagen del servicio antes de probar).
2. Iniciar sesión como Miguel y entrar al POS de TEST Empresa A: ver sólo `Sede A TEST` (asignación activa), sin `Sede A TEST 2`.
3. En Inventario > Transferir, los desplegables de origen/destino deben ofrecer solamente sedes STORE activas asignadas. Con una sola sede asignada, el traslado no puede confirmarse.
4. No marcar consentimiento ni enviar POST. Comprobar que saldos y versiones existentes no cambien.

**Estado:** T11-D2-01 y T11-D2-02 **CORREGIDOS Y VERIFICADOS EN CI**. PR #45 DRAFT; `main` intacta.
