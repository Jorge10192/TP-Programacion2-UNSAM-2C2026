# E2-7 · T11-C — Seguridad de navegación y aislamiento multiempresa

**Fecha:** 11/11/2026. **Rama:** `feature/e2-7-t11-qa-integral-hardening`. **PR:** [#45](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/45) DRAFT, sin merge.

## Objetivo

Ampliar la prueba de seguridad desde los contratos FastAPI existentes hasta la navegación **React REAL** ante usuarios distintos, tenants A/B, respuestas tardías y cierre/recarga de sesión. Todos los datos son cuentas y empresas QA de PostgreSQL efímero; nunca TEST Empresa A ni DEMO.

## Escenarios implementados

Archivo: `frontend/e2e/real/security-navigation.spec.ts`. Commit funcional `19d7b6eb3948d1c8bb7dd06ffde114a353bfa4f7`.

| Escenario | Operaciones y aserciones | Resultado |
|---|---|---|
| **T11-C-01: A→B con GET demorado** | Crear A/B, un proveedor distinto por empresa, iniciar sesión en B; cambiar a A, interceptar y demorar GET de proveedores A, navegar en la misma SPA a B y liberar GET A; exigir ver solo proveedor B, no A | **PASS**, Playwright real 1,4 s |
| **T11-C-02: actor externo + logout/F5** | Crear propietario y usuario ajeno, empresa y proveedor privado; API del ajeno devuelve 403/404; abrir URL privada en UI como ajeno sin proveedor ni formulario de alta; listar sus empresas sin la ajena; cerrar sesión, F5 y login del dueño sin contaminación de sesión | **PASS**, Playwright real 1,4 s |

**Comportamiento observado:** `RealAuthApp` conserva el token opaco solo en memoria; las páginas de proveedores usan AbortController y descartado de resultados tras desmontaje. El backend sigue siendo la autoridad para pertenencia/permiso.

## Evidencia reproducible de GitHub Actions

- Commit funcional: `19d7b6eb3948d1c8bb7dd06ffde114a353bfa4f7`.
- [Full-stack REAL #42987791317](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42987791317): **SUCCESS**, **892 pytest, 22 Playwright REAL, 6 Playwright DEMO**. Los dos casos T11-C pasaron en Chromium contra API real y PostgreSQL descartable.
- [Frontend #42987791341](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42987791341): **SUCCESS**.
- 3 warnings Pydantic `UnsupportedFieldAttributeWarning` en suite de concurrencia: no bloquean estas pruebas y siguen registrados como riesgo de hardening.

## Cobertura y próximos controles T11-C

**Ya comprobado en navegador:** aislamiento visual A/B, descarte de respuesta tardía, impedimento de lectura de tenant ajeno, ausencia de formulario de escritura para actor no miembro y borrado local de sesión tras logout/F5.

**Todavía pendiente para cerrar T11-C completo:** escenario UI de trabajador/encargado **miembro** sin asignación SELL/STORE, más respuestas HTTP 401/403/404/409/422 y fallas de red durante navegación/operaciones en pantallas adicionales. Las pruebas backend existentes para esos permisos no sustituyen el recorrido React correspondiente.

**Dictamen:** subbloque **T11-C navegación multiempresa y sesión APROBADO**; T11-C global permanece parcial. PR #45 DRAFT; no habilitar POST REAL en bases persistentes ni fusionar `main` sin aprobación.

## Ampliación T11-C — permisos SELL/STORE y matriz de errores, validada

**Nuevos escenarios:** `frontend/e2e/real/security-errors.spec.ts`.

| Grupo | Evidencia automatizada | Resultado |
|---|---|---|
| `401` React | GET con 401 provoca vuelta a login, desaparecen datos privados, sin POST | PASS |
| `403`, `404`, `503` React | Rechazo/caída temporal de consulta de proveedores se informa sin éxito falso; actualización recupera GET sin escritura | PASS (3 tests) |
| `409` y `422` | Proveedor duplicado desde formulario produce rechazo sin segundo registro; compra inválida desde API recibe 422 sin crear compra | PASS |
| TRABAJADOR miembro sin sede asignada | Invitación/aceptación real, intento de venta directo por API: 403; intento recepción en STORE por API: 403; intento venta desde POS React: aviso de permisos y solicitud conservada, sin comprobante ni movimiento | PASS |

**CI funcional final del bloque:** commit `aeab8b9df2497aca515683238a4a91689ce75233`, [run full-stack #42990216776](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42990216776): **SUCCESS**, `892 passed` Pytest (**4 warnings**), `28 passed` Playwright REAL y `6 passed` Playwright DEMO. La prueba específica de trabajador `T11-C: trabajador miembro sin sede no puede recibir ni registrar venta desde POS` aprobó en 1,5 s. El commit de frontend independiente debe verificarse en sus propias checks; no inferirlo de esta suite.

**Incidente de QA resuelto:** la primera prueba de trabajador en commit `bc0231c` falló por selector Playwright demasiado amplio (`getByRole('alert')` halló tanto la advertencia de solicitud pendiente como la de venta denegada). No fue un fallo de permisos: la API había devuelto 403 y ambos avisos estaban presentes. Commit `aeab8b9` distingue los dos mensajes, elimina una compra de fixture innecesaria y la CI confirmó el escenario.

**Dictamen T11-C:** **APROBADO** para continuar T11-D (responsive, teclado y DEMO/REAL). Los controles reproducibles aquí son los descritos: no se afirma una cobertura exhaustiva de todas las rutas 403/409/422 o todos los módulos. Quedan **4 advertencias no bloqueantes de Pytest** por investigar en T11-E; se preserva el requisito de PR #45 DRAFT, sin merge ni POST en entornos persistentes.
