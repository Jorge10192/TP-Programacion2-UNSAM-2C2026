# E2-7 · T09-0 — Línea base y contratos propuestos para consulta y recuperación de ventas REALES

Fecha de apertura: 10/11/2026. **Rama de trabajo:** `feature/e2-7-t09-consulta-recuperacion-ventas`, creada desde `main` tras [merge PR #41 (T08)](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/41), commit `5f83541049b6332e5a991810cbfd105515db10ce`.

**Estado de T09:** iniciado; alcance y decisiones P02/P03 **en elaboración, no aprobadas**. No equivale a T09 terminado ni a T10/POS implementado.

## 1. Línea base de código y contratos existentes

Revisado directamente en `backend/app/modules/sales/`:

| Recurso actual | Qué garantiza | Límite |
|---|---|---|
| `POST /api/v1/businesses/{business_id}/sales` | `Idempotency-Key` UUID4; `201` creación, `200` replay idéntico; comprobante completo; una transacción con renglones, pagos **declarados**, stock y ledger | Replay vuelve a validar permisos de venta, sede/SELL y STORE, antes de verificar la clave: cambios de asignación pueden impedir recuperar el comprobante por POST |
| `GET /api/v1/businesses/{business_id}/sales/{sale_id}` | Comprobante histórico completo por UUID, autenticado y aislado por empresa; no modifica stock | Requiere conocer `sale_id`; valida sesión y membresía activa, pero actualmente **no** aplica filtro por ubicación o autor de la venta en una membresía válida |
| `SaleView` | id, business_id, location_id opcional, request_id, estado CONFIRMADA, subtotales/descuento/total en centavos, notes, created_by_id, created_at, balances_after, lines y payments con snapshots | No es un índice paginado ni interfaz de ventas REAL |
| `Sale` | Clave única por empresa `(business_id, request_id)`, índices empresa/fecha, snapshots `balances_after`; FK negocio/sede y negocio/creador | No hay `GET /sales` ni `GET .../by-request/{request_id}` |

**Hechos importantes:** el pago `MERCADO_PAGO_DECLARADO` es una **declaración manual**, no acreditación confirmada de Mercado Pago, transferencia bancaria, caja o cuenta de dinero. El frontend DEMO de ventas no es una venta REAL. Los servicios de backend de E2-6 no se modificarán por una propuesta de política sin decisión explícita.

La base incluye las suites `test_sales_api_integration.py`, `test_sales_permissions_integration.py`, `test_sales_atomicity_integration.py`, `test_sales_concurrency_integration.py` y `test_sales_inventory_interop_integration.py`; la aceptación global T08 fue 879/879 backend sobre PostgreSQL temporal. Esto **no acredita aún** los endpoints propuestos de T09.

## 2. Decisiones que T00 exige resolver primero

### P02 — Consulta histórica y replay ante cambios de permisos (PENDIENTE)

Situaciones que requieren una política clara: sede `SUSPENDIDA` después de una venta; rol o asignación `SELL/STORE` retirados; usuario con membresía revocada; sesión cerrada; cambio de empresa; intento confirmado pero respuesta HTTP perdida.

**Alternativas a evaluar (NO implementadas):**
- **A. Mantener el contrato actual sin cambios:** replay POST requiere permisos actuales; GET histórico por `sale_id` permite cualquier integrante activo de la empresa (independientemente de asignación). Es el comportamiento observable actual, pero la exposición horizontal entre empleados puede no ser deseable.
- **B. Separar autorización de lectura de autorización de venta (propuesta preferida para discusión):** la **venta nueva** siempre requiere permisos actuales; la **lectura de una venta propia ya confirmada** se permite a su autor mientras siga siendo integrante activo, incluso si la sede se pausó o perdió STORE; titular/admin pueden ver todo el tenant; otros empleados no pueden ver ventas de compañeros fuera de su alcance autorizado. La membresía o sesión revocada sigue denegada. La repetición POST no debe crear venta nueva si los permisos cambiaron, y su política de replay se define aparte con pruebas explícitas.
- **C. Lectura solo con permisos vigentes de la sede:** también restringe al autor cuando pierde la asignación; disminuye exposición pero puede impedir resolver un intento propio después de F5.

**No se modifica** `SaleService.create`, `get`, ni las reglas de autorización hasta aprobar una política y especificar precedencias de 401/403/404/409, sin filtrar información de otros tenants. El test existente confirma rechazo de replay de operador tras revocar STORE, y rechazo de sesión/membresía revocadas.

### P03 — Diseño de listado y búsqueda por request ID (PENDIENTE)

**Propuesta de contrato, sujeta a aprobación:**

```text
GET /api/v1/businesses/{business_id}/sales?offset=0&limit=100&location_id=<UUID-opcional>
GET /api/v1/businesses/{business_id}/sales/by-request/{request_id}
GET /api/v1/businesses/{business_id}/sales/{sale_id}  (EXISTENTE, preservar)
```

- Para `GET /sales`: DTO de **resumen**, sin pagos con referencia ni renglones completos: `id, business_id, location_id, request_id, status, total_cents, created_by_id, created_at`; solo lectura, orden determinista `created_at DESC, id DESC`, paginación validada `0 <= offset`, `1 <= limit <= 100` (o límite acordado), resultados limitados al tenant/roles/ubicaciones autorizadas. Explicitar que `offset` puede desplazarse ante ventas nuevas; no anunciar «listado completo» hasta agotar las páginas.
- Para `GET .../by-request/{request_id}`: **mismo SaleView** histórico existente, sin mutar stock ni crear intento nuevo; semántica de no encontrado sin revelar si pertenece a otro negocio. Mantener ruta estática `/by-request/...` separada de `/{sale_id}`.
- El `request_id` es identificador de correlación; para usar la operación idempotente después de respuesta perdida se conserva la **misma Idempotency-Key y el mismo cuerpo**. Un 404 en consulta no demuestra que un POST anterior no haya sido procesado.
- Auth: Bearer opaco en memoria, sesión activa, tenant estricto, sin fallback a DEMO; la visibilidad por rol requiere P02.
- Opciones: evaluación alternativa de pantalla que solo consulte un comprobante conocido por `sale_id`, sin crear endpoints nuevos. Sin listado, el POS de T10 quedaría con recuperación limitada.

## 3. Primer incremento seguro — T09-A

**Objetivo inmediato:** montar cimientos de lectura que **ya están autorizados por el contrato existente**: cliente TypeScript para `GET /sales/{sale_id}` con validación estricta de DTO, tenant/UUID, importes/snapshots y tests Node. No crear UI de ventas REAL todavía, no añadir POST ni modificar servidores o permisos; mantener DEMO completamente independiente.

**Criterios de aceptación:**
1. Ruta `/api/v1` relativa, GET Bearer, sin body, `credentials: omit`, sin escritura y sin almacenamiento persistente del token.
2. Parser acepta servicios sin sede ni inventario (`location_id=null`, `balances_after=[]`) y bienes con saldos históricos, sin recalcular precios desde catálogo actual.
3. Rechaza recibos de otro tenant, UUID/cantidades/importes/medios incompatibles, renglones/pagos duplicados y falta de coherencia entre líneas, descuentos y pagos.
4. Propaga 401/403/404/5xx y errores de red, sin generar otro POST ni inventar un comprobante.
5. Frontend build/lint/tests verdes en GitHub; T09-A no requiere migración ni altera la base de datos.

## 4. Implementación futura sugerida (condicionada a P02/P03)

- **T09-B — Contrato aprobado:** fijar matriz rol/sede/actor histórico + DTO de resumen + paginación y reglas de errores. Documentar ADR si cambia la política de acceso; no modificar comportamiento de replay previo sin un test de regresión que reproduzca la política actual.
- **T09-C — Backend:** endpoints propuestos y pruebas PostgreSQL, incluyendo 101+ ventas, dos empresas, dos operadores, negocio/sede suspendidos, cambio de asignación, sesión o membresía revocadas, request de otro tenant y orden estable.
- **T09-D — Frontend:** historial REAL etiquetado inequívocamente, búsqueda por request ID solo si contrato aprobado, estado parcial/cargando/error/última página, comprobante con snapshots, sin pagos acreditados falsos.
- **T09-E — Recuperación extremo a extremo:** POST confirmado con respuesta perdida; F5 y login del mismo actor; recuperar por request_id si existe; replay explícito de MISMA clave/cuerpo según política adoptada; 404 no implica «nunca enviada»; no duplicar venta ni stock; PostgreSQL temporal y Playwright.
- **T09-F — QA:** validación manual acotada con datos TEST y sin repetir ventas; CI completa, auditoría y PR borrador. Mantener `main` intacta hasta autorización de integración.

## 5. Guardrails para T09/T10

1. No habilitar POS REAL, caja, gastos, cuentas o QR por inferencia del DEMO.
2. No crear una API `GET /sales` ficticia en frontend antes de su implementación verificada.
3. No usar `localStorage` para Bearer ni crear pagos acreditados virtualmente.
4. No alterar roles/asignaciones de cuentas reales para probar escenarios negativos; usar fixtures PostgreSQL aislados.
5. No replicar ventas al reintentar una respuesta incierta; conservar identidad y cuerpo del mismo intento.
6. PR de T09 abierto como borrador hasta QA y revisión de alcance.

**Hito T09-0:** línea base verificada, contrato propuesto y decisiones pendientes visibles; el hecho de documentarlas **no las aprueba automáticamente**.
