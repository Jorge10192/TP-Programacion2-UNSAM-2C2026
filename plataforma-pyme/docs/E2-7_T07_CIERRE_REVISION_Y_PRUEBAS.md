# E2-7 T07 — Revisión integral, matriz de pruebas y decisión de integración

**Fecha de revisión:** 10/11/2026  
**Repositorio:** `Jorge10192/TP-Programacion2-UNSAM-2C2026`  
**Rama revisada:** `feature/e2-7-t07-proveedores-compras-recepcion`  
**PR:** [#40](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/40)  
**Referencia de código de cierre (antes de este documento):** `279f61ab409fb33785d4fcd9d097184903815f86`  
**Base:** `main` — `fed4f8282fed964cdfb00bf96c07a5ab71e7eb75` (T06).  
**Decisión técnica:** *apto para integración de T07, con riesgos de QA adicional enumerados y transferidos a T08/T11*. No confundir esta decisión con el cierre de toda E2-7.

## 1. Alcance real del cambio y trazabilidad

Comparación `main...feature/e2-7-t07-proveedores-compras-recepcion` sobre la referencia previa al informe: **14 archivos modificados/creados, 56 commits, 0 commits de atraso**, GitHub marca PR fusionable. Se modificaron frontend React/TypeScript, tests de frontend, workflow frontend y documentación de T07. **No se modificaron módulos FastAPI, migraciones Alembic, Docker ni fixtures de DEMO.**

Se integraron:
- Proveedores REAL por empresa: listado paginado, alta inicial, cambio de estado y visibilidad según rol.
- Compras REAL: proveedores opcionales, líneas de catálogo o concepto libre, cantidades en milésimas, costos en centavos y snapshots históricos, historial paginado.
- Recepción atómica de compras: solo productos físicos generan entrada de stock, con sede activa y `can_store`, autorización backend, clave idempotente y comprobante del servidor.
- Registro de intentos pendientes de compra/recepción en IndexedDB **por actor, empresa y operación** antes del POST, con identidad, cuerpo y clave original; no se persisten Bearer tokens.
- Mejora visual de costos: propuesta de `reference_cost_cents`, cantidad × costo unitario, edición explícita por importe total solo si es representable exactamente en centavos, total de documento y advertencia no bloqueante si costo > precio de venta.
- Estado `REGISTRADA · RECEPCIÓN PENDIENTE` en ámbar y `RECIBIDA` en verde.
- Conciliación de 404 de recibo: segundo GET del documento propio antes de informar que aún no existe comprobante; sin fingir permisos sobre compras ajenas.
- Panel «Detalle de recepción» con nombre de sede, hora de backend, responsable si corresponde a sesión, identificadores de trazabilidad, snapshots de productos, movimientos y saldo posterior.
- Separación **REAL / DEMO** conservada: ni costos ni stocks reales se deducen de `demoStore`.

## 2. Evidencia automatizada GitHub Actions

**Workflow `Plataforma PyME · Frontend`, run #42812095691, resultado: SUCCESS (dos jobs), SHA funcional `279f61ab409fb33785d4fcd9d097184903815f86`.** El log del job `frontend` acredita `npm ci`, compilación `tsc -b && vite build`, `oxlint` con 0 errores/0 advertencias y las suites siguientes:

| Suite | Casos | Aprobados | Fallos | Alcance |
|---|---:|---:|---:|---|
| `test:api` | 11 | 11 | 0 | HTTP, errores, bearer, cancelación, timeout |
| `test:auth` | 6 | 6 | 0 | Registro, login, perfil, logout |
| `test:businesses` | 13 | 13 | 0 | Empresas, tenant, lectura, creación idempotente |
| `test:operations-real` | 14 | 14 | 0 | Ubicaciones, equipo, invitaciones y permisos |
| `test:catalog-real` | 15 | 15 | 0 | Catálogo, centavos, paginación y tenant |
| `test:pending-commands` | 12 | 12 | 0 | Identidad de comandos e IndexedDB |
| **`test:supply-real` (T07)** | **37** | **37** | **0** | Proveedores, compras, recepción, replay, importe, panel |
| `test:accounts` | 14 | 14 | 0 | Módulo DEMO |
| `test:sales` | 14 | 14 | 0 | Módulo DEMO |
| `test:cash` | 13 | 13 | 0 | Módulo DEMO |
| `test:qr` | 3 | 3 | 0 | Módulo DEMO |
| `test:inventory` | 13 | 13 | 0 | Módulo DEMO |
| **TOTAL** | **165** | **165** | **0** | Suites frontend de CI |

**Job Chromium:** 6/6 recorridos aprobados (3 escenarios ejecutados en escritorio y móvil): navegación y URL ajena, drawer/foco/desbordes, flujo de servicio/QR **DEMO**. **Advertencia de alcance:** los recorridos Chromium actuales NO levantan FastAPI/PostgreSQL ni sustituyen el E2E REAL previsto en T11.

**Advertencias no ocultadas:** Vite señala un chunk JS de >500 kB (optimización futura de code splitting). Los logs del runner presentan advertencias de deprecación de componentes Node/acciones GitHub y módulos `punycode`/`url.parse()`. Ninguna fue un fallo del job; conservarlas visibles y revisarlas cuando se actualice el tooling, sin aumentar artificialmente los límites.

## 3. Evidencia manual REAL en el navegador — datos TEST

Los resultados siguientes se sustentan en los mensajes, logs y capturas compartidos por el responsable durante el desarrollo; **no representan una ejecución independiente de un entorno E2E nuevo**.

| ID / grupo | Evidencia | Resultado |
|---|---|---|
| T07-01 / T07-02 | `Proveedor A T07` creado, desactivado y reactivado; consulta desde PostgreSQL | **Aprobado** |
| T07-03 | Primera compra `2 UNIDAD × $2.000,00 = $4.000,00`, `REGISTRADA` sin recepción | **Aprobado** |
| T07-04 / T07-05 | Recepción en sede y consulta posterior: `RECIBIDA`, 1 movimiento; no reenviar al consultar | **Aprobado** |
| T07-06 | `concepto libre T07`: 5 CONCEPTO × $500,00 = **$2.500,00**, sin proveedor; `CERRADA SIN RECEPCIÓN`, sin acción de recibir | **Aprobado visualmente** |
| T07-07 | TEST Empresa A muestra proveedor y compras; TEST Empresa B: **0 proveedores, 0 compras** | **Aprobado en listados** |
| T07-08 | Miguel con rol TRABAJADOR puede leer compras/proveedores; sin alta de proveedores; permisos de sede separados de membresía | **Aprobado en UI** |
| T07-10/11 (parcial) | Intención de recepción recuperada con clave original tras reingreso; 404 ausente se reconoce con segundo GET; no POST automático; posterior recepción explícita | **Recuperación observada**; corte artificial de red y POST sin respuesta no reproducidos íntegramente |
| Recepción de Miguel | Sede A TEST previamente `NO ASIGNADO`; luego de asignación y confirmación explícita, compra `Compra2 prueba E2-7 T07` de $9.200,00 pasó a `RECIBIDA` | **Aprobado**; autorización real respaldada por backend |
| Comprobante detallado | Captura `CONFIRMADA`, `Sede A TEST`, `miguel`, fecha 10 nov 2026 8:23 a. m., **+5 UNIDAD Producto A TEST**, saldo posterior **11 UNIDAD**; servicio sin movimiento | **Aprobado visualmente** |
| Costo de referencia / fórmula | Propuesta $800,00, cantidad y unitario editables, subtotal automático, total de renglones y total del documento; advertencia si costo excede venta | **Aprobado visualmente** |
| T07-14 | Catálogo e inventario DEMO: colágeno hidrolizado, Crema de enjuague, Shampoo; filtros, tarjetas, ubicaciones, acciones probadas; sin mezcla visible de datos REAL | **Aprobado en pantallas revisadas** |
| T07-19 | Compra histórica conserva importe original al listar; referencia de catálogo vigente no reemplaza costo histórico | **Aprobado en listados** |

**Precisión:** la captura de `RECIBIDA` y el comprobante son evidencia del estado devuelto por el backend; los balances y movimientos no se verificaron en una consulta SQL independiente en esta revisión. Se evita afirmar que el saldo 11 equivale a un inventario reconciliado globalmente: T08 realizará esa lectura.

## 4. Contratos backend y controles existentes contrastados por lectura

No hubo cambios backend en este PR. Se revisó que el repositorio contiene los siguientes tests de integración de PostgreSQL:

- `test_purchase_api_integration.py`: compra mixta y snapshots; concepto/servicio sin stock; replay 201/200/409; idempotencia por actor; proveedor/artículo ajeno rechazado; roles/empresa suspendida; paginación; rollback.
- `test_receipt_api_integration.py`: recepción atómica; balances históricos; replay; autorización de trabajador asignado versus no asignado; ubicación ajena, pausada y sin almacenaje; cambios de unidad/tipo; rollback y restricciones DB.
- `test_receipt_concurrency_integration.py`: recepción simultánea con clave igual/diferente; evitar duplicados, sumatoria de entradas concurrentes.
- `test_supplier_api_integration.py`: roles, reactivación, unicidad empresarial, aislamiento entre tenants, estados, paginación y rollback.
- `test_location_assignment_integration.py`: asignación activa, revocación, 409 en ubicación pausada y aislamiento entre empresas.

**No se ejecutó Pytest de nuevo para este cierre.** La existencia y lectura de esos tests valida el diseño de cobertura del backend, no se atribuye a este cierre un resultado de ejecución inexistente.

## 5. Hallazgos, riesgos residuales y decisión

**No se detectaron defectos bloqueantes confirmados para integrar el alcance T07.** El backend mantiene la autoridad sobre roles, acceso a empresa, permisos de ubicación, transacciones, snapshots y stock. El cliente no reenvía escrituras automáticamente ni reutiliza datos DEMO; persiste la misma clave/cuerpo en las operaciones idempotentes.

| Riesgo / QA diferido | Evidencia actual | Tratamiento |
|---|---|---|
| T07-09: URL directa de compra ajena como trabajador | Tests backend de tenant/ID y mocks frontend; no prueba manual específica | T11 E2E REAL contra dos empresas, 404 sin fuga |
| T07-10: perder respuesta del alta y recuperar tras F5 | Unit tests de journal y API; experiencia T06; no caída controlada para compra T07 | T11 full-stack con corte de red y una sola compra |
| T07-11/12: replay recepción tras pérdida de respuesta | Recuperación manual exitosa de la clave, GET de recibo y recepción; tests backend 201/200 y concurrencia | T11 repetir con interrupción/observación de ledger en DB efímera |
| T07-13: sede pausada / `can_store=false` | Tests de backend de 409, control frontend por lista de sedes activas | T11 negativa real y sin movimientos |
| T07-15: >100 registros (catálogo/proveedor/compra) | Paginación offset/limit implementada y tests de contrato/backend; no dataset manual 101+ | T11 dataset sintético paginado |
| T07-18, T07-20, T07-23: importes extremos, `null` vs 0, total imposible | Tests puros de centavos/HALF_UP/estado, no todos probados visualmente | T11 ampliar escenarios de formulario |
| IndexedDB sin cifrado, token en memoria | Riesgo documentado y aceptación informada; sin credenciales persistidas | Mantener recomendación de no usar dispositivos compartidos; revisar UX de sesiones en cierre |
| Performance y warnings de toolchain | Bundle JS >500 kB, Node deprecado en Actions | Optimización y dependencias después de cerrar integraciones funcionales |
| E2E real en CI | Chromium actual DEMO 6/6; manual T07 real, backend integración previa | **T11** debe levantar FastAPI/PostgreSQL en base efímera con Playwright en mismo SHA |

**Puerta T07:** los flujos comerciales centrales han sido probados mediante usuario real en navegador y la cobertura de frontend en CI está verde. La recepción se comprobó con colaborador asignado, con idempotencia manual y comprobante. Las evidencias restantes no son descartadas: se trasladan a la matriz de QA de T11 como trabajo verificable. Las limitaciones anteriores se aceptan **solo para el cierre incremental de T07**; no se autoriza declarar completada T11 ni E2-7.

## 6. Transferencia y próximos incrementos

**T08 — Inventario REAL:** consulta de saldos autoritativos y movimientos paginados por sede, uso de unidades en milésimas y UI de balances, traslado entre ubicaciones con una operación atómica, inventario inicial y ajuste de conteo con `expected_version`, `409` con relectura y reconfirmación humana. Probar compra `RECIBIDA` → mismo saldo/movimiento desde API, sin sumar dos veces.

**T09 — Soporte de ventas:** definir contratos de historial/recovery por `request_id` y política de replay histórico cuando cambia autorización de sede; testear permisos. Decidir la política de precios/descuentos por rol antes del POS.

**T10 — POS REAL:** venta física/servicio/mixta, pagos declarados, reducción de stock y comprobante; nunca mezclar cuentas/caja/QR DEMO con cobros reales.

**T11 — QA integral:** backend PostgreSQL + frontend + Playwright contra **la misma base efímera**, tests multi-tenant, fallos de red, reversión/rollback, 101/501 elementos, pruebas adversariales de permisos y verificación de ledger; recuperar pendientes manuales sin duplicar movimientos.

**T12 — Cierre académico:** contratos, UML, documentos 01–05, README, matriz REAL/DEMO/DIFERIDO, diagramas, evidencia de CI y límites conocidos.

**Registro de decisiones visuales:** costos unitarios editables, subtotales automáticos, importe total editable solo cuando tiene representación exacta, sugerencia desde referencia sin sobreescribir el catálogo, proveedor único por compra, semáforo ámbar/verde, panel de recibo interno sin PDF: asentados en el documento principal de QA de T07.
