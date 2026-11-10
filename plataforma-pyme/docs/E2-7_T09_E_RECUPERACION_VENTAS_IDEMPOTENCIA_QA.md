# E2-7 · T09-E — Recuperación de ventas ante pérdida de respuesta HTTP

**Fecha:** 10/11/2026. Rama `feature/e2-7-t09-consulta-recuperacion-ventas`. PR [#42](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/42), en borrador, sin merge a `main`.

## 1. Objetivo y límite de alcance

Probar en **Chromium REAL + FastAPI + PostgreSQL 16 efímero** que una venta confirmada **una sola vez** pueda recuperarse después de perder la respuesta del POST y de recargar/iniciar sesión, sin contabilizar dos pagos declarados, dos ventas o dos salidas de inventario.

**T09 no implementa el POS REAL.** Como el formulario para crear ventas se construirá en T10, el navegador de pruebas T09-E emite el POST mediante un **harness aislado de Playwright**; la pantalla `RealSalesPage` mantiene **solo GET**. El harness conserva la misma `Idempotency-Key` UUID4 y el mismo JSON del primer intento para un replay explícito. No representa un journal duradero de ventas de producción, ni se atribuye al UI la capacidad de guardar y reintentar ventas que todavía no tiene.

## 2. Matriz de aceptación automatizada

| Código | Precondición efímera | Acción principal | Resultado exigido |
|---|---|---|---|
| E1 — bien físico | Empresa nueva en DB efímera; sede SELL/STORE, producto REVENTA y stock inicial 5 UNIDAD/v1 | Playwright envía POST, `route.fetch()` permite confirmar **201**, `route.abort()` hace perder solo la respuesta, F5 y nuevo login, GET por solicitud y replay original | Una venta, un pago declarado, **un solo movimiento `VENTA_SALIDA -1`** de la venta, stock **4 UNIDAD/v2**; replay **200** con mismo comprobante y cuerpo/clave; sin POST automático |
| E2 — servicio | Empresa nueva, artículo SERVICIO sin sede ni saldo | Misma respuesta perdida, reingreso, consulta por `request_id` y replay original | Una venta, un pago declarado, sin snapshots ni mutaciones de inventario; replay **200** |
| E3 — rechazo preventivo | Empresa nueva, intento abortado por el harness **antes de llegar a FastAPI** | GET por solicitud da 404, F5/login, no hay POST automático, reenvío **explícito** de clave/cuerpo original | 404 **no demuestra** si un intento incierto fue confirmado o no; en este caso instrumentado se sabe que no llegó; el reenvío explícito genera un único **201** |
| E4 — conflicto de identidad | Tras E1 y E2, enviar **misma clave** con **otro importe/cuerpo** | POST devuelto **409** | No se crean otra venta, otro pago ni movimientos adicionales |
| E5 — frontend | Abrir `/real/empresas/{id}/ventas`, F5/login, buscar `request_id` | UI solo consulta vía GET | Comprobante REAL muestra ID y pagos **declarados**; no crea venta ni modifica stock; no hay fallback a DEMO |

Las verificaciones por API leen `GET /sales`, `GET /sales/by-request/{request_id}`, `GET /inventory/balances` y `GET /inventory/movements`, exigiendo identidad e igualdad de datos antes/después del replay, no solo igualdad de un código HTTP.

## 3. Protección de datos

- **Guard obligatorio:** `PYME_DISPOSABLE_QA=1`. Configuración de Playwright REAL fija FastAPI en `127.0.0.1:18001`, frontend en `127.0.0.1:5173`. El workflow usa DB `pyme_t085_ephemeral`. **No apuntar jamás esos tests al contenedor de uso manual del usuario ni a `TEST Empresa A`.**
- Se generan usuarios, empresas, catálogo, sede y stock inicial nuevos dentro del entorno efímero, exclusivamente para las pruebas. No se registran pagos acreditados por terceros.
- Capturas y logs no deben almacenar Bearer. El token solo se usa en memoria del test; los artefactos CI no guardan trazas de navegador.
- No confundir el replay POST con un nuevo cobro: es la **misma solicitud idempotente** y su salida se valida contra el ledger.

## 4. Evidencia y estado

**Implementación de prueba:** `plataforma-pyme/frontend/e2e/real/sales-recovery.spec.ts`.

**CI T09-E APROBADA:** [workflow full-stack #42910407673](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42910407673), commit ejecutable `38b980edbcccf1e3b73537571bdaf1b5b4afea8c`, estado final **SUCCESS**. Evidencia directa del log del job `inventory-real`:

- Backend con PostgreSQL temporal: **886 aprobadas**, 2 warnings no bloqueantes.
- Frontend Node: **272 aprobadas**, 0 fallidas; `npm run build` y Oxlint sin errores ni advertencias.
- Playwright REAL: **10/10 aprobadas**: 4 T08 inventario, 3 T09-D lectura, **3 T09-E** (venta física, venta de servicio y POST abortado antes del servidor).
- Playwright DEMO: **6/6 aprobadas**.
- Los casos T09-E se ejecutaron con `PYME_DISPOSABLE_QA=1` sobre `pyme_t085_ephemeral`. Dos casos verificaron `201` confirmado pero oculto al navegador → GET autorizado tras F5/login → replay `200`, y `409` por otra carga con clave existente. El caso de aborto antes de alcanzar FastAPI verificó `404` y reintento explícito con `201`. Se compararon antes/después saldos, comprobantes y movimientos cuando había bienes físicos.
- [Backend Python 3.12/3.14 y Docker](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42910407905): matriz del mismo commit; comprobar conclusión por separado antes de cierre T09-F.

**Dictamen T09-E:** **APROBADO en CI** para simulación de navegador mediante harness, no implementación POS real. La aceptación manual local de ventas escritas no es necesaria ni aconsejable sobre los datos existentes.

**Pruebas manuales locales de T09-E:** **no necesarias** para E1–E4; implicarían escribir ventas en una base existente, contrario al alcance acordado. La pantalla T09-D de estado vacío ya fue aceptada manualmente. Si se exige visualizar comprobante con datos, se puede usar una base TEST aislada totalmente nueva y consentida en T09-F, sin fabricar evidencia sobre `TEST Empresa A`.

## 5. Trabajo explícitamente posterior

- **T10 / POS REAL:** introducir comando de venta en React con **journal durable scoped por empresa+actor**, confirmación humana y recuperación de intento incierto sin POST automático. La recuperación por GET de T09 es una dependencia, no una sustitución del journal.
- **T09-F:** auditoría integral, verificación de que T09-B/C/D/E no introdujeron regresiones, revisión de la documentación y pruebas manuales no mutantes pendientes; PR en borrador hasta autorización de merge.
