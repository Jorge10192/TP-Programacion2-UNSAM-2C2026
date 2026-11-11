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
