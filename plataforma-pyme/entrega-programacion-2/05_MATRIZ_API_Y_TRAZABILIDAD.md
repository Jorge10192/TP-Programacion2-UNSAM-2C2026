# 05 — Matriz de API, permisos y trazabilidad

**Versión vigente de consulta:** E2-7/T12-B, 11/11/2026. **Código auditado:** `main` `c6a77137cf82dcb9aad225645e84b1265b1da3ec` (PR #45).  
**Estado:** API v1 REAL + React REAL para RF-01 a RF-07, con **46 endpoints declarados en routers** y 12 CU nucleares. RF-08–RF-10 permanecen exclusivamente DEMO/diferidos.  
**Alcance de la revisión:** reconciliar rutas concretas de FastAPI, pantalla React y test reproducible. Esta matriz **no autoriza** funcionalidades bancarias ni cambios de permisos.

> **Precedencia documental:** el inventario y las matrices siguientes son la vista **AS-IMPLEMENTED** de T12-B. El material original completo figura después como **histórico E2-1 a E2-5**, incluso cuando usa expresiones «vigente», «RF-07 diferido», «React sigue DEMO» o tablas TO-BE: esas afirmaciones fueron correctas *a su fecha de corte*, pero ya no representan el estado de `main` post-T11. El mapa de clases SQL se revisará específicamente en T12-C; no convertir todavía esta matriz en certificación UML.

## 1. Tabla maestra vigente — RF → CU → API → UI → prueba

Convención: `B` = `/api/v1/businesses/{business_id}`; `E` = `/real/empresas/{business_id}`. Las rutas en la columna API son **representativas**: el inventario exhaustivo de métodos y rutas está en la sección 2.

| RF | CU / resultado comprobable | API y autorización efectiva | React REAL | Evidencia principal |
|---|---|---|---|---|
| **RF-01** | **CU-01** registro de identidad | `POST /api/v1/auth/register`; validación pública, email único | `/real/registro`, `RealAuthApp.tsx` | `auth-registration-ui.spec.ts`; tests de registro |
| **RF-01** | **CU-02** login, identidad, logout | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`; Bearer revocable | `/real/login`, `/real/perfil` | `auth-registration-ui.spec.ts`, `security-navigation.spec.ts` |
| **RF-02** | **CU-03** crear/consultar/editar empresa | `POST/GET /businesses`, `GET/PATCH B`; membresía/tenant/rol, creación idempotente | `/real/empresas`, `/real/empresas/nueva`, `E` | `security-navigation.spec.ts`, backend de empresas |
| **RF-02** | **CU-12** invitaciones, aceptación, equipo | `POST B/invitations`, `POST /invitations/accept`, `GET/PATCH B/memberships...`, `GET/PUT B/locations/{location_id}/assignments...`; roles protegidos | `E/equipo`, `/real/invitaciones/aceptar` | `test_business_acceptance_*.py`, `test_business_team_*.py`, manual T11 |
| **RF-03** | **CU-04** sedes, estados, principal, asignación | `B/locations` (GET/POST/PATCH/PUT según ruta); SELL/STORE y asignaciones propias | `E/ubicaciones`, `RealLocationsPage.tsx` | `business-crud-persistence.spec.ts`, `assigned-location-visibility.spec.ts` |
| **RF-04** | **CU-05** catálogo bienes/servicios con estado y precio | `B/catalog` (GET/POST/PATCH); nombre/SKU por empresa, roles y paginación | `E/catalogo`, `RealCatalogPage.tsx` | `business-crud-persistence.spec.ts`, `pos-draft.spec.ts` |
| **RF-05** | **CU-06** proveedor y compra sin stock | `B/suppliers` (CRUD y estado), `B/purchases` (POST/GET); proveedor y snapshots | `E/proveedores`, `E/compras` | `purchase-ui-persistence.spec.ts`, `business-crud-persistence.spec.ts` |
| **RF-05+RF-06** | **CU-07** recepción física completa | `POST B/purchases/{purchase_id}/receive`, `GET .../receipt`; sede STORE y replay | `E/compras`, `RealReceiptDetail.tsx` | `flow-purchase-to-sale.spec.ts`, `purchase-ui-persistence.spec.ts` |
| **RF-06** | **CU-08** saldo/version/ledger | `GET B/inventory/balances`, `GET B/inventory/movements` | `E/inventario`, `RealInventoryPage.tsx` | `inventory.spec.ts`; conciliación manual T11 |
| **RF-06** | **CU-09** traslado atómico | `POST B/inventory/transfers`, `GET .../{transfer_id}`; STORE en origen y destino | `E/inventario`, `RealTransferPanel.tsx` | `inventory.spec.ts`, `assigned-location-visibility.spec.ts` |
| **RF-06** | **CU-11** ajuste con versión y stock inicial | `POST B/inventory/adjustments`, `GET .../{adjustment_id}`; STORE, rol, `expected_version` | `E/inventario`, `RealAdjustmentPanel.tsx` | `inventory.spec.ts`, `security-errors.spec.ts` |
| **RF-07** | **CU-10** POS, venta, comprobante y recuperación | `POST/GET B/sales`, `GET B/sales/{sale_id}`, `GET B/sales/by-request/{request_id}`; SELL, rol/precio y clave idempotente | `E/pos`, `E/ventas`, `RealPosPage.tsx`, `RealSalesPage.tsx` | `pos-draft.spec.ts`, `flow-purchase-to-sale.spec.ts`, `sales-recovery.spec.ts`, `sales-invalid-payment-policy.spec.ts` |
| **RF-08** | Gastos y jornadas de caja | **Sin router real equivalente** | `/b/{demoId}/gastos`, `/b/{demoId}/jornadas` | `demo-money-isolation.spec.ts`; DEMO |
| **RF-09** | Cuentas financieras referenciales | **Sin router real equivalente** | `/b/{demoId}/cuentas` | `demo-money-isolation.spec.ts`; DEMO |
| **RF-10** | Intentos QR ilustrativos | **Sin cobro REAL ni endpoints OAuth/webhook MP** | `/b/{demoId}/ventas`, `QrDemoPanel.tsx` | `demo-money-isolation.spec.ts`; DEMO |

**Precisiones de CU:** CU-11 corresponde a **RF-06** (no RF-07); CU-07 soporta RF-05+RF-06, pero no implica segunda recepción parcial; CU-12 abarca invitación, aceptación y gestión del equipo, no alta pública por QR. En operaciones SELL/STORE de trabajadores, **asignación activa a cada sede** es condición adicional al rol: un trabajador que solo opera en una sede no puede hacer traslado con otra. Consulta general de balances por empresa ≠ autorización para modificar sus saldos.

## 2. Inventario completo de rutas FastAPI v1 implementadas

**Fuente de verdad:** los `APIRouter(prefix=...)` y decoradores `@router.get/post/patch/put` en los **13 routers realmente montados** por [`backend/app/api/v1/router.py`](../backend/app/api/v1/router.py). Las rutas siguientes son **relativas a `/api/v1`**. Por ejemplo, `GET /businesses` significa `GET /api/v1/businesses`. Se incluyen **46 operaciones**; métodos distintos en la misma URL cuentan como operaciones distintas. Fuera de este mapa de negocio quedan `GET /health` (liveness) y `GET /ready` (readiness de BD), no prefijados con `/api/v1`.

| Método | Ruta bajo `/api/v1` | RF / CU | Archivo de definición |
|---|---|---|---|
| `POST` | `/auth/register` | RF-01; CU-01/02 | [`auth/router.py`](../backend/app/modules/auth/router.py) |
| `POST` | `/auth/login` | RF-01; CU-01/02 | [`auth/router.py`](../backend/app/modules/auth/router.py) |
| `GET` | `/auth/me` | RF-01; CU-01/02 | [`auth/router.py`](../backend/app/modules/auth/router.py) |
| `POST` | `/auth/logout` | RF-01; CU-01/02 | [`auth/router.py`](../backend/app/modules/auth/router.py) |
| `POST` | `/businesses` | RF-02; CU-03/12 | [`businesses/router.py`](../backend/app/modules/businesses/router.py) |
| `GET` | `/businesses` | RF-02; CU-03/12 | [`businesses/router.py`](../backend/app/modules/businesses/router.py) |
| `GET` | `/businesses/{business_id}` | RF-02; CU-03/12 | [`businesses/router.py`](../backend/app/modules/businesses/router.py) |
| `PATCH` | `/businesses/{business_id}` | RF-02; CU-03/12 | [`businesses/router.py`](../backend/app/modules/businesses/router.py) |
| `POST` | `/businesses/{business_id}/invitations` | RF-02; CU-03/12 | [`businesses/router.py`](../backend/app/modules/businesses/router.py) |
| `GET` | `/businesses/{business_id}/memberships` | RF-02; CU-03/12 | [`businesses/router.py`](../backend/app/modules/businesses/router.py) |
| `PATCH` | `/businesses/{business_id}/memberships/{membership_id}` | RF-02; CU-03/12 | [`businesses/router.py`](../backend/app/modules/businesses/router.py) |
| `POST` | `/invitations/accept` | RF-02; CU-12 | [`businesses/invitations_router.py`](../backend/app/modules/businesses/invitations_router.py) |
| `GET` | `/businesses/{business_id}/locations` | RF-03; CU-04 | [`locations/router.py`](../backend/app/modules/locations/router.py) |
| `GET` | `/businesses/{business_id}/locations/my-assignments` | RF-03; CU-04 | [`locations/router.py`](../backend/app/modules/locations/router.py) |
| `GET` | `/businesses/{business_id}/locations/{location_id}` | RF-03; CU-04 | [`locations/router.py`](../backend/app/modules/locations/router.py) |
| `POST` | `/businesses/{business_id}/locations` | RF-03; CU-04 | [`locations/router.py`](../backend/app/modules/locations/router.py) |
| `PATCH` | `/businesses/{business_id}/locations/{location_id}` | RF-03; CU-04 | [`locations/router.py`](../backend/app/modules/locations/router.py) |
| `PATCH` | `/businesses/{business_id}/locations/{location_id}/status` | RF-03; CU-04 | [`locations/router.py`](../backend/app/modules/locations/router.py) |
| `PUT` | `/businesses/{business_id}/locations/{location_id}/primary` | RF-03; CU-04 | [`locations/router.py`](../backend/app/modules/locations/router.py) |
| `GET` | `/businesses/{business_id}/locations/{location_id}/assignments` | RF-02/03; CU-04/12 | [`locations/assignment_router.py`](../backend/app/modules/locations/assignment_router.py) |
| `PUT` | `/businesses/{business_id}/locations/{location_id}/assignments/{membership_id}` | RF-02/03; CU-04/12 | [`locations/assignment_router.py`](../backend/app/modules/locations/assignment_router.py) |
| `GET` | `/businesses/{business_id}/catalog` | RF-04; CU-05 | [`catalog/router.py`](../backend/app/modules/catalog/router.py) |
| `GET` | `/businesses/{business_id}/catalog/{item_id}` | RF-04; CU-05 | [`catalog/router.py`](../backend/app/modules/catalog/router.py) |
| `POST` | `/businesses/{business_id}/catalog` | RF-04; CU-05 | [`catalog/router.py`](../backend/app/modules/catalog/router.py) |
| `PATCH` | `/businesses/{business_id}/catalog/{item_id}` | RF-04; CU-05 | [`catalog/router.py`](../backend/app/modules/catalog/router.py) |
| `PATCH` | `/businesses/{business_id}/catalog/{item_id}/status` | RF-04; CU-05 | [`catalog/router.py`](../backend/app/modules/catalog/router.py) |
| `GET` | `/businesses/{business_id}/suppliers` | RF-05; CU-06 | [`suppliers/router.py`](../backend/app/modules/suppliers/router.py) |
| `GET` | `/businesses/{business_id}/suppliers/{supplier_id}` | RF-05; CU-06 | [`suppliers/router.py`](../backend/app/modules/suppliers/router.py) |
| `POST` | `/businesses/{business_id}/suppliers` | RF-05; CU-06 | [`suppliers/router.py`](../backend/app/modules/suppliers/router.py) |
| `PATCH` | `/businesses/{business_id}/suppliers/{supplier_id}` | RF-05; CU-06 | [`suppliers/router.py`](../backend/app/modules/suppliers/router.py) |
| `PATCH` | `/businesses/{business_id}/suppliers/{supplier_id}/status` | RF-05; CU-06 | [`suppliers/router.py`](../backend/app/modules/suppliers/router.py) |
| `POST` | `/businesses/{business_id}/purchases` | RF-05; CU-06 | [`purchases/router.py`](../backend/app/modules/purchases/router.py) |
| `GET` | `/businesses/{business_id}/purchases` | RF-05; CU-06 | [`purchases/router.py`](../backend/app/modules/purchases/router.py) |
| `GET` | `/businesses/{business_id}/purchases/{purchase_id}` | RF-05; CU-06 | [`purchases/router.py`](../backend/app/modules/purchases/router.py) |
| `POST` | `/businesses/{business_id}/purchases/{purchase_id}/receive` | RF-05/06; CU-07 | [`purchases/receipt_router.py`](../backend/app/modules/purchases/receipt_router.py) |
| `GET` | `/businesses/{business_id}/purchases/{purchase_id}/receipt` | RF-05/06; CU-07 | [`purchases/receipt_router.py`](../backend/app/modules/purchases/receipt_router.py) |
| `GET` | `/businesses/{business_id}/inventory/balances` | RF-06; CU-08 | [`purchases/inventory_router.py`](../backend/app/modules/purchases/inventory_router.py) |
| `GET` | `/businesses/{business_id}/inventory/movements` | RF-06; CU-08 | [`purchases/inventory_router.py`](../backend/app/modules/purchases/inventory_router.py) |
| `POST` | `/businesses/{business_id}/inventory/transfers` | RF-06; CU-09 | [`purchases/transfer_router.py`](../backend/app/modules/purchases/transfer_router.py) |
| `GET` | `/businesses/{business_id}/inventory/transfers/{transfer_id}` | RF-06; CU-09 | [`purchases/transfer_router.py`](../backend/app/modules/purchases/transfer_router.py) |
| `POST` | `/businesses/{business_id}/inventory/adjustments` | RF-06; CU-11 | [`purchases/adjustment_router.py`](../backend/app/modules/purchases/adjustment_router.py) |
| `GET` | `/businesses/{business_id}/inventory/adjustments/{adjustment_id}` | RF-06; CU-11 | [`purchases/adjustment_router.py`](../backend/app/modules/purchases/adjustment_router.py) |
| `POST` | `/businesses/{business_id}/sales` | RF-07; CU-10 | [`sales/router.py`](../backend/app/modules/sales/router.py) |
| `GET` | `/businesses/{business_id}/sales` | RF-07; CU-10 | [`sales/router.py`](../backend/app/modules/sales/router.py) |
| `GET` | `/businesses/{business_id}/sales/by-request/{request_id}` | RF-07; CU-10 | [`sales/router.py`](../backend/app/modules/sales/router.py) |
| `GET` | `/businesses/{business_id}/sales/{sale_id}` | RF-07; CU-10 | [`sales/router.py`](../backend/app/modules/sales/router.py) |

### Contrato de seguridad y consistencia (transversal)

- **Identidad:** `/auth/register` pública; `/auth/login` devuelve token opaco; `/auth/me` y `/auth/logout` requieren sesión válida. React mantiene token **en memoria**, sin conservarlo tras F5. No se presume correo verificado ni refresh token.
- **Tenant:** los UUID no conceden acceso. Cada operación real verifica la empresa y la membresía, protege estados y actor. `404` puede ocultar recurso ajeno; `403` deniega una acción de rol/permisos; `401` invalida credenciales. Una consulta GET sobre saldos de sedes del mismo tenant puede ser global por política MVP, sin permitir operaciones no asignadas.
- **Ubicaciones:** `can_sell` y `can_store` son capacidades independientes. El nuevo `GET /businesses/{business_id}/locations/my-assignments` solo consulta IDs asignados al actor, no permite administrar equipo; `GET/PUT .../{location_id}/assignments` sigue restringido por privilegios administrativos.
- **Compras:** `POST /purchases` guarda snapshots; no elige recepción ni altera inventario. `POST /receive` confirma **una recepción completa** y entradas únicamente de líneas físicas. El servicio no se transforma artificialmente en stock ni se admite recepción vacía.
- **Stock:** se mantiene saldo atómico + ledger firmado, cantidad en milésimas y versionado. Los traslados debitan y acreditan en un único commit; ajustes con versión obsoleta, stock insuficiente o stock inicial repetido responden conflicto sin movimiento falso.
- **Ventas:** POS REAL requiere sede SELL autorizada para bienes. Los precios/descuentos se verifican también en FastAPI; pagos declarados suman exactamente el total. Se almacena dinero en centavos enteros y totales por renglón HALF_UP; **no hay acreditación bancaria automática**.
- **Idempotencia y recuperación:** `Idempotency-Key` UUID4 para altas/comandos transaccionales que lo requieren; mismo key y cuerpo recupera resultado `200`, operación inicial `201`; key reutilizada con otro contenido o actor se rechaza. Pérdida de respuesta/timeout: consultar comprobante por `request_id`, nunca reenviar un comando automáticamente con otro key.
- **Errores esperables según operación:** `401` sesión, `403` autorización, `404` recurso fuera de alcance, `409` conflicto transaccional/idempotencia/stock/versión, `422` esquema/campos, y `5xx`/red como fallo incierto. Esta lista es **transversal**: no afirma que cada endpoint produzca todos estos códigos.
- **DEMO:** rutas `/b/{demoId}/...` conservan almacenamiento local e intenciones QR **ilustrativas**, sin pagar ni consultar la API REAL. No realizar migración ficticia de IDs DEMO a UUID FastAPI.

## 3. Matriz de pruebas trazables por capacidad

| Cobertura | Archivos / evidencia | Resultado acreditado |
|---|---|---|
| Identidad, registro, sesión, logout, F5 | `frontend/e2e/real/auth-registration-ui.spec.ts`, `security-navigation.spec.ts`, `responsive-keyboard.spec.ts` | REAL navegador → API/BD, tokens en memoria |
| Tenancy, respuestas tardías, 401/403/404, roles y sedes | `security-navigation.spec.ts`, `security-errors.spec.ts`, `assigned-location-visibility.spec.ts` | Cambio A/B sin fuga, acceso ajeno denegado, sedes SELL/STORE filtradas |
| Sede, catálogo, proveedor CRUD y persistencia | `business-crud-persistence.spec.ts`, `mobile-core-navigation.spec.ts` | Altas/estados y F5 en REAL; smoke móvil |
| Compra bien+concepto libre, recepción e idempotencia | `purchase-ui-persistence.spec.ts`, `flow-purchase-to-sale.spec.ts` | Sin stock previo, recepción una vez, ledger físico |
| Saldos, traslado, conteo, ajuste y concurrencia | `inventory.spec.ts`; `backend/tests/test_*concurrency_integration.py` | Par firmado, versión, rollback, un solo efecto |
| Venta física y mixta, dos pagos, price/discount, replay 201 perdido | `pos-draft.spec.ts`, `sales-recovery.spec.ts`, `sales-invalid-payment-policy.spec.ts`, `flow-purchase-to-sale.spec.ts` | Comprobante, débito físico, 409 y 422, recuperación sin duplicación |
| Aislamiento DEMO QR/caja/cuentas | `demo-money-isolation.spec.ts`, pruebas DEMO | Cero operaciones reales desde UI DEMO |
| Manual dueño/trabajador y retest de sedes | [Acta de 39 pasos](../docs/E2-7_T11_D2_ACTA_PRUEBA_MANUAL_REAL.md) y [T11-E fix](../docs/E2-7_T11_E_FIX_SEDES_ASIGNADAS_QA.md) | Dos defectos de permisos corregidos; capturas revisadas en conversación, no versionadas |

**Regresión de referencia:** PR #45 fusionado, [full-stack #43015544889](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/43015544889) — **892 Pytest, 38 Playwright REAL, 6 Playwright DEMO PASS**. CI frontend [#43015544947](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/43015544947) y backend [#43015544819](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/43015544819) SUCCESS. Matriz de [26 escenarios E27](../docs/E2-7_T11_E_AUDITORIA_FINAL_PREMERGE.md) aprobada **en su alcance funcional/smoke**, no garantía universal de seguridad/WCAG. Las capturas de QA manual se observaron en conversación; no se adjuntaron al repositorio.

## 4. Riesgos, declaraciones de alcance y continuidad T12

1. **RF-01 a RF-07** son núcleo académico REAL; **RF-08 a RF-10** DEMO/diferido; transferencia con recepción logística asincrónica, devoluciones, producción por receta, reservas y pagos MP webhooks permanecen fuera del MVP.
2. El POS REAL local permanece deshabilitado para registrar ventas por defecto salvo `VITE_PYME_ENABLE_REAL_SALES` en entorno explícitamente autorizado. Los tests con escritura corrieron en PostgreSQL **descartable**, no en la base persistente `TEST Empresa A`.
3. Los pagos REAL son **declarados**, no acreditados. IndexedDB conserva algunas intenciones comerciales pendientes sin cifrado; no almacenar tokens allí; evitar dispositivos compartidos. Quedan advertencias Pydantic `UnsupportedFieldAttributeWarning` no bloqueantes.
4. No inferir paridad UML a partir de nombres conceptuales. **T12-C** confrontará 03A/03B/03C con tablas SQLAlchemy/Alembic y su representación gráfica; **T12-D** actualizará README, arquitectura y procedimientos reproducibles; **T12-E** comprobará que los documentos no contradigan el último SHA de `main`.

---

## Archivo histórico — matriz incremental anterior al cierre T12 (preservada)

La siguiente matriz es el **documento previo íntegro**, incluyendo adendas y tablas por corte E2-1..E2-5. Está preservado para auditoría de evolución; «pendiente» o «estado vigente» en sus párrafos se refiere **solo** al corte temporal indicado y no sustituye las secciones actuales de T12-B anteriores.

> **ADENDA VIGENTE E2-5 (09/11/2026; prevalece sobre estados históricos de esta matriz):** RF-06/CU-08 (balances y ledger), **CU-09 (traslados)** y **CU-11 (ajustes y stock inicial)** están implementados en backend y probados en el corte `main` `748e69319d8d04900c009d5184168a264a9deeac` (PR #21–#23), `e25a_inventory_ops`, CI 816/826/840 pruebas por corte en Python3.12/3.14 y Windows E2-5 C 840 pruebas reportadas. **CU-11 pertenece a RF-06**, no a RF-07: cualquier fila histórica de esta matriz que etiquete CU-11 bajo RF-07 está desactualizada. **RF-07/CU-10 ventas reales continúa DIFERIDO**. Los endpoints de E2-5 añadidos son `GET /inventory/balances`, `GET /inventory/movements`, `POST/GET /inventory/transfers` y `POST/GET /inventory/adjustments` bajo `/api/v1/businesses/{business_id}`. Esta adenda **no reescribe las tablas históricas** de versiones anteriores; consultar el [cierre E2-5](../docs/revisiones/E2-5_CIERRE/00_LEEME.md) y el [encargo de auditoría pendiente de ejecución](../docs/revisiones/E2-5_ENTREGA_PARA_REVISION.md). **La integración React ↔ backend, el hardening de producción y la auditoría independiente no están completados**.

### 05 — Matriz de API, permisos y trazabilidad (versión histórica)

**Proyecto:** Asistente PyME — Programación 2  
**Versión:** 1.5 — E2-3 E, catálogo real y 580 pruebas Windows
**Fecha:** 8 de noviembre de 2026  
**Estado:** publicación técnica incremental; aprobación académica del equipo pendiente  
**Referencia:** `main` del repositorio, carpeta exclusiva `plataforma-pyme/`.

> **Estado vigente E2-2 (08/11/2026):** RF-03/CU-04 y E2-2 A/A.1/B/C/D implementados, con ubicaciones, asignaciones de colaboradores, autorización por tenant y política operacional reutilizable. **371/371 pruebas en Windows (47.57s)**; `e22d_assignments (head)`; Alembic sin operaciones pendientes; Docker FastAPI/PostgreSQL `healthy` y `/ready` = `ready/ok`. [CI del código E2-2 D: 3/3 y 371 pruebas en Python 3.12 y 3.14](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42497556047). **No** existe todavía integración React–API ni operaciones comerciales de compras/stock/ventas que consuman la política; corresponden a bloques posteriores. Los párrafos de cortes previos que mencionan validaciones o funciones «pendientes» se conservan como **histórico**, no como estado actual. El TP integral no se declara terminado.


## 1. Propósito y vocabulario de evidencia

Este archivo une requisitos (01), casos de uso (02), modelos/UML (03), decisiones de arquitectura (04), endpoints, controles de acceso y pruebas reales. No confundir **IMPLEMENTADO** (código en Git), **VALIDADO LOCALMENTE** (evidencia del desarrollador), **CI VERIFICADO** (GitHub Actions comprobado en una ejecución concreta) y **PLANIFICADO** (TO-BE). El frontend React continúa como DEMO independiente del backend. WALOS es solo un cliente de ejemplo.

**Cierre E2-1 / C.5 — 08/11/2026:** C.1 (98), C.2 (125), C.3 (147), C.4a (171) y **C.4b (195/195 pruebas locales aprobadas; `195 passed in 23.86s`)**. Alembic `e213c4_acceptance (head)`, `No new upgrade operations detected.`; Docker FastAPI/PostgreSQL `healthy` y `/ready` = `ready`/`ok`. GitHub Actions **3/3** corresponde al commit funcional `8cd1674`. C.5 es **exclusivamente documental**; no se reejecutaron pruebas ni cambiaron endpoints, modelos SQL o migraciones. React sigue DEMO; RF-03–RF-07 no tienen backend; transferencia de titularidad, verificación de correo y endurecimiento para producción siguen pendientes.

## 2. Estado por requerimiento y caso de uso

| RF | CU | Estado API | Alcance comprobable / pendiente |
|---|---|---|---|
| RF-01 | CU-01 | Implementado; validado localmente | `POST /api/v1/auth/register`; hash Argon2id, email único, 201/409/422 |
| RF-01 | CU-02 | Implementado; validado localmente | `POST /api/v1/auth/login`, `GET /me`, `POST /logout`; sesiones revocables, 401 |
| RF-02 | CU-03 | Alta, lectura y PATCH empresarial validados localmente | Empresa con titular inicial, idempotencia y edición autorizada por tenant/rol |
| RF-02 | CU-12a / CU-12b y gestión | Emisión/aceptación validadas localmente; **equipo C.4b validado localmente con 195 pruebas y CI 3/3** | Emitir, aceptar, consultar equipo y editar roles/estados operativos con titularidad protegida |
| RF-03 | CU-04 | **E2-2 B/C/D: ubicación y asignaciones por sede con 371 pruebas CI** | Seis rutas de ubicación + GET/PUT de asignaciones; FK compuesta por empresa; uso comercial de la política aún pendiente |
| RF-04 | CU-05 | **E2-3 B: cuatro rutas CRUD iniciales, CI 498 pruebas aprobado; Windows pendiente** | Catálogo empresarial, RBAC, nombre/SKU únicos, bienes/servicios y precio nullable; activar/desactivar pendiente C |
| RF-05 | CU-06, CU-07 | Planificado | Compra separada de recepción física completa |
| RF-06 | CU-08, CU-09 | Planificado | Saldos, movimientos, stock no negativo, concurrencia |
| RF-07 | CU-10, CU-11 | Planificado | Ventas, pagos declarados y restricciones monetarias |
| RF-08–10 | Fuera primer backend MVP | Diferido | Gastos/caja, cuentas y QR DEMO |

## 3. Contratos HTTP realmente existentes

| Método | Ruta | Seguridad real vigente | Respuesta principal | Prueba |
|---|---|---|---|---|
| GET | `/health` | Pública, liveness | 200 `status=ok` | `test_health.py` |
| GET | `/ready` | Pública local, conectividad PostgreSQL | 200/503 | `test_readiness.py` |
| POST | `/api/v1/auth/register` | Pública, validación Pydantic/SQL | 201, 409, 422 | `test_auth_registration_integration.py` |
| POST | `/api/v1/auth/login` | Credenciales, Argon2id | 200 bearer/401 | `test_auth_session_integration.py` |
| GET | `/api/v1/auth/me` | Bearer vigente y cuenta activa | 200/401 | `test_auth_session_integration.py` |
| POST | `/api/v1/auth/logout` | Bearer vigente | 204/401 | `test_auth_session_integration.py` |
| POST | `/api/v1/businesses` | Bearer vigente, usuario global activo; **sin membresía previa** | 201 nuevo; 200 reintento; 409 payload diferente | `test_business_creation_integration.py` |
| GET | `/api/v1/businesses` | Bearer + filtro de membresía `ACTIVA` | 200 lista propia | `test_business_creation_integration.py` |
| GET | `/api/v1/businesses/{business_id}` | Bearer + membresía activa en ese tenant | 200 propio; 404 ajeno | `test_business_creation_integration.py` |
| PATCH | `/api/v1/businesses/{business_id}` | Bearer + revalidación transaccional de sesión y membresía + `business.profile.edit` | 200; 401/403/404/409/422 | `test_business_update_*.py`, **125 pruebas locales aprobadas en C.2** |
| POST | `/api/v1/businesses/{business_id}/invitations` | Bearer + membresía activa/rol autorizado + empresa activa + correo/rol validado en transacción | 201; 401/403/404/409/422 | `test_business_invitation_schemas.py` y `test_business_invitation_integration.py`; **147 pruebas locales aprobadas en C.3** |
| POST | `/api/v1/invitations/accept` | Bearer + cuenta destinataria coincide con correo invitado + invitación PENDIENTE vigente + empresa ACTIVA; commit único | 200; 401/404/409/422 | `test_business_acceptance_*.py`, **171 pruebas locales en C.4a** |
| GET | `/api/v1/businesses/{business_id}/memberships` | Bearer + membresía propia activa; permiso `members.read` (titular/administrador); empresa activa | 200; 401/403/404/409 | `test_business_team_schemas.py`, `test_business_team_integration.py` **(195 pruebas locales; CI 3/3)** |
| PATCH | `/api/v1/businesses/{business_id}/memberships/{membership_id}` | Bearer + rol titular vigente; miembro objetivo del mismo tenant no titular; permiso `members.manage`; transacción con bloqueo | 200; 401/403/404/409/422 | `test_business_team_schemas.py`, `test_business_team_integration.py` **(195 pruebas locales; CI 3/3)** |
| POST | `/api/v1/businesses/{business_id}/locations` | Bearer + membresía `ACTIVA` y rol titular/administrador + empresa `ACTIVA` + DTO estricto | 201; 401/403/404/409/422 | `test_location_schemas.py`, `test_location_http.py`, `test_location_api_integration.py` **(277 pruebas CI; local pendiente)** |
| GET | `/api/v1/businesses/{business_id}/locations` | Bearer + membresía activa propia; empresa `ACTIVA`/`SUSPENDIDA` (lectura) | 200 lista propia; 401/403/404 | `test_location_http.py`, `test_location_api_integration.py` |
| GET | `/api/v1/businesses/{business_id}/locations/{location_id}` | Bearer + membresía activa y filtro simultáneo de empresa y ubicación | 200 propio; 401/403/404 | `test_location_http.py`, `test_location_api_integration.py` |
| PATCH | `/api/v1/businesses/{business_id}/locations/{location_id}` | Bearer + rol titular/administrador, empresa activa; DTO parcial sin campos protegidos | 200; 401/403/404/409/422 | `test_location_schemas.py`, `test_location_http.py`, `test_location_api_integration.py` |
| PATCH | `/api/v1/businesses/{business_id}/locations/{location_id}/status` | Bearer + rol autorizado; `ACTIVA/PAUSADA`; pausar revoca principal | 200; 401/403/404/409/422 | `test_location_schemas.py`, `test_location_api_integration.py` |
| PUT | `/api/v1/businesses/{business_id}/locations/{location_id}/primary` | Bearer + rol autorizado; ubicación ACTIVA; transferencia dentro de un tenant y una transacción | 200; 401/403/404/409 | `test_location_http.py`, `test_location_api_integration.py` |
| GET | `/api/v1/businesses/{business_id}/locations/{location_id}/assignments` | Bearer + titular/administrador; sede del mismo tenant | 200; 401/403/404 | `test_location_assignment_http.py`, `test_location_assignment_integration.py` |
| PUT | `/api/v1/businesses/{business_id}/locations/{location_id}/assignments/{membership_id}` | Bearer + titular/administrador; `status` ACTIVA/REVOCADA; objetivo del mismo tenant | 200; 401/403/404/409/422 | `test_location_assignment_schemas.py`, `test_location_assignment_integration.py` |
| POST | `/api/v1/businesses/{business_id}/catalog` | Bearer + titular/administrador + empresa ACTIVA; SKU/nombre normalizados | 201; 401/403/404/409/422 | `test_catalog_schemas.py`, `test_catalog_http.py`, `test_catalog_api_integration.py` |
| GET | `/api/v1/businesses/{business_id}/catalog` | Bearer + membresía ACTIVA; empresa propia, permite suspendida | 200; 401/403/404/422 | `test_catalog_http.py`, `test_catalog_api_integration.py` |
| GET | `/api/v1/businesses/{business_id}/catalog/{item_id}` | Bearer + membresía ACTIVA, UUID artículo dentro de la empresa | 200; 401/403/404 | `test_catalog_api_integration.py` |
| PATCH | `/api/v1/businesses/{business_id}/catalog/{item_id}` | Bearer + titular/administrador, empresa ACTIVA; DTO parcial sin estado ni tenant | 200; 401/403/404/409/422 | `test_catalog_schemas.py`, `test_catalog_api_integration.py` |
| PATCH | `/api/v1/businesses/{business_id}/catalog/{item_id}/status` | Bearer + titular/administrador, tenant ACTIVO, status ACTIVO/INACTIVO exclusivo | 200; 401/403/404/409/422 | `test_catalog_schemas.py`, `test_catalog_http.py`, `test_catalog_api_integration.py` |

**Idempotencia CU-03:** `Idempotency-Key` UUID4, ámbito `actor_user_id` + clave; `business_creation_requests` conserva hash canónico y `business_id`. La **PK compuesta** mantiene la unicidad incluso con concurrencia. Reutilizar la clave con otro contenido devuelve 409; se corrigió la recuperación tras conflictos concurrentes sobre `pk_business_creation_requests` en E2-1.3C.1.

**Sesiones:** El token Bearer es un secreto; se guarda solo la huella SHA-256 para buscar/revocar sesiones. La cuenta deshabilitada o sesión vencida no puede leer ni crear empresas.

## 4. Política RBAC E2-1.3C.1 y primera aplicación real E2-1.3C.2

| Capacidad | TITULAR_ADMINISTRATIVO | ADMINISTRADOR | ENCARGADO | TRABAJADOR | Estado HTTP |
|---|---|---|---|---|---|
| `business.view` | Sí | Sí | Sí | Sí | Lectura vigente filtra por membresía activa; integración de política pura en C.2 |
| `business.profile.edit` | Sí | Sí | No | No | **Implementado/validado C.2 (125 pruebas)** |
| `members.invite` | Sí | Sí | No | No | **Implementado/validado C.3 (147 pruebas)** |
| `members.read` | Sí | Sí | No | No | **C.4b GET validado (195 pruebas y CI 3/3)** |
| `members.manage` | Sí | No | No | No | **C.4b PATCH validado (195 pruebas y CI 3/3)** |

**Estados:** la membresía `INACTIVA` nunca autoriza; un rol desconocido o permiso nuevo se deniega por defecto (*fail closed*). La empresa `SUSPENDIDA` permite únicamente lectura informativa a miembros activos; no modificaciones, invitaciones ni administración de miembros. Esta función **no reemplaza** comprobar la empresa exacta en SQL ni la vigencia del token. Un titular de la empresa A no adquiere permisos en la empresa B por el nombre de su rol.

**Decisión MVP:** el rol `ENCARGADO` no es un permiso universal. Las capacidades futuras de catálogo, inventario, compras y ventas deberán tener permisos específicos propios, con pruebas y documentación por CU; no se deducen automáticamente de este cuadro.

### Comportamiento HTTP implementado y validado desde C.2

| Caso | HTTP esperado | Motivo |
|---|---|---|
| Sin sesión, token vencido/revocado | 401 | No autenticado |
| Empresa ajena, inexistente o sin membresía activa | 404 | No exponer empresas ajenas |
| Miembro activo sin permiso de edición | 403 | Empresa propia, acción denegada |
| Miembro activo con permiso, empresa `SUSPENDIDA` | 409 | Estado no editable |
| Titular/administrador, empresa activa, cambios válidos | 200 | Actualización atómica |
| Datos inválidos / cuerpo vacío | 422 | Validación de contrato |

Los códigos precedentes están definidos en el router de C.2 y cuentan con pruebas escritas; **se validaron en C.2 (125 pruebas) y regresiones posteriores hasta 195**. Para 403 se exige una membresía activa sin permiso; para 409 se exige rol apto pero empresa `SUSPENDIDA`.

## 5. Entidades, migraciones y reglas de integridad

| Revisión | Tablas / restricción | Estado |
|---|---|---|
| `e2003_baseline` | `alembic_version`, sin dominio | Validada |
| `e2101_users` | `users`, email UNIQUE, hash y estados | Validada |
| `e212b_sessions` | `auth_sessions`, token hash UNIQUE, FK y vencimiento | Validada |
| `e213a_business_members` | `businesses`, `memberships`, UNIQUE empresa/usuario, índice titular activo único | Validada |
| `e213b_business_creation` | `business_creation_requests`, PK compuesta actor/clave, digest SHA-256 y negocio único por comando | Validada |
| `e213c3_invitations` | `business_invitations`, token SHA-256 único, FK empresa/invitador, estados, expiración e índice parcial correo pendiente por tenant | Validada localmente C.3 |
| `e213c4_acceptance` | Columnas `accepted_by_user_id`, `accepted_at`, FK usuario y CHECK de auditoría consistente | Localmente validada C.4a; C.4b sin migraciones |
| `e22a_locations` | Tabla `locations`, FK a empresa, CHECK de estados/tipos/principal, índice parcial único de principal por empresa | E2-2 A: 212 pruebas locales aprobadas, CI 3/3 |
| `e22b_location_casa` | Amplía CHECK de tipo para admitir `CASA` sin modificar esquema previo | E2-2 A.1: 217 pruebas CI backend; frontend 2/2; Windows pendiente |
| `e22d_assignments` | Tabla `location_assignments`, FK compuestas, UNIQUE auxiliar en `locations` y CHECK de revocación | 371 pruebas CI / Windows por comprobar |

En E2-1.3C.1 y C.2 **no se añadieron tablas ni migraciones**; C.3 incorpora la nueva tabla `business_invitations` mediante una migración aditiva. El UML 03A representa vínculos conceptuales; no debe dibujarse la política como una entidad persistente ni regenerar 03B por esta etapa.

## 6. Estrategia de pruebas y cumplimiento académico

- **Unitarias puras:** políticas de permisos con las cuatro combinaciones de roles y los estados, normalización y criptografía donde corresponda. Pruebas del mapeo de conflicto de PK para la carrera de idempotencia.
- **Integración HTTP/PostgreSQL:** autenticación, negocio idempotente, aislamiento entre empresas, protección de sesiones y rollback. Las pruebas reales existentes usan `RUN_DB_INTEGRATION=1` y transacciones externas revertidas.
- **Migraciones:** `alembic upgrade head`, `alembic current` y `alembic check`; no usar `stamp` ni downgrades destructivos para silenciar errores.
- **CI:** workflow `.github/workflows/plataforma-pyme-backend.yml`, jobs Python y Docker con PostgreSQL efímero. Un commit publicado no equivale a CI verde; verificar la ejecución de ese SHA.
- **TP:** tener más de diez tests de infraestructura/identidad no sustituye construir, probar y desplegar el conjunto de **al menos cinco RF completos de alto nivel**. RF-03–07 siguen pendientes en la API.
- **Deploy público:** pendiente, con medidas de protección y configuración seguras antes de exponer auth y datos.

## 7. Protocolo de actualización documental por entregas

| Evento | Documentos a actualizar |
|---|---|
| Cambio de comportamiento, RF o CU | 01, 02 y 05 |
| Nueva tabla, FK, estado o cardinalidad | 03 y fuentes UML 03A cuando cambie el concepto, migración, 05 |
| Cambio de arquitectura, transacción, patrón o autorización | 04, 05 y README técnico |
| Nuevo endpoint o error | 05 con método/ruta, contrato, permiso, tests, estado real |
| Nueva prueba, CI o deploy | 05 y 06 cuando se publique, con evidencia verificable |
| Cada etapa validada por el desarrollador | Actualizar estado real sin inventar tests ni adelantar funcionalidades |

### Próximos pasos cerrados

1. **C.1 — publicado y validado localmente:** política pura RBAC, regresión de idempotencia, 98 pruebas aprobadas.
2. **C.2 — validado localmente y por CI:** PATCH de perfil empresarial, permisos por rol/tenant y pruebas; 125 casos aprobados, Docker/DB saludables.
3. **C.3 — validado localmente:** emisión dirigida sin crear miembro, rol seguro, 7 días y 147 pruebas aprobadas.
4. **C.4a — validado localmente (171 pruebas):** aceptación autenticada y atómica. **C.4b — validado localmente con 195 pruebas y CI 3/3:** consulta de equipo y actualización de roles operativos/estado con titularidad protegida.
5. **Cierre de RF-02:** actualizar contratos y diagramas 03A sobre implementación confirmada; posteriormente abordar RF-03 Ubicaciones y RF-04 Catálogo.

Este documento es vivo: mantener los nombres de entidad, UUID, rutas y pruebas exactamente como están en `main` a la fecha del corte. No extrapolar funciones del frontend DEMO a endpoints inexistentes.

## 8. Evidencia específica para verificar E2-1.3C.2

**Objeto de prueba:** `PATCH /api/v1/businesses/{business_id}` con JSON de una o varias claves (`name`, `category`, `activity_kind`). Todos los demás campos, `null`, y el objeto vacío devuelven 422. Se deriva el actor del Bearer; ninguna petición permite asignar rol/fundador/estado. Se devuelve `BusinessView` con la membresía que habilitó la edición.

**Evidencia de autorización:** `test_business_update_integration.py` ensaya titular y administrador con escritura persistida, encargado/trabajador con 403, empresa ajena con 404, membresía inactiva con 404, empresa suspendida con 409, sesión revocada y usuario deshabilitado con 401, DTO inválido con 422 y rollback si falla la respuesta después del `flush`. Los datos de prueba se revierten con una transacción externa. Se complementa con `test_business_update_schemas.py` y `test_business_update_http.py`.

**Estado actualizado en C.5:** las pruebas C.2 fueron ejecutadas y **125 pasaron localmente**; las regresiones posteriores culminaron con **195 aprobadas** al cerrar C.4b, con CI funcional 3/3. C.2 no requirió migración. El `GET` empresarial filtra por membresía activa y `PATCH` aplica efectivamente la autorización RBAC. La referencia antigua a 98 casos correspondía al corte histórico C.1.

**Dependencias:** C.3 emisión de invitaciones y C.4 aceptación/gestión de membresías usarán políticas `members.invite` / `members.manage`, sin dar permiso tácito a trabajador o encargado. El código React sigue exclusivamente DEMO.

## 9. Contrato de invitaciones reales C.3 y evidencia

**Ruta:** `POST /api/v1/businesses/{business_id}/invitations`. Requiere Bearer, pertenencia al tenant activo, permiso `members.invite` (titular o administrador), body `{"email":"persona@example.com","role":"ENCARGADO"}` o `TRABAJADOR`. **No** admite `ADMINISTRADOR`, `TITULAR_ADMINISTRATIVO`, otros estados, `business_id` dentro del body ni campos extra. El destinatario puede no poseer cuenta al emitir la invitación.

**Respuesta 201:** `id`, `business_id`, `email` normalizado, `role`, `status=PENDIENTE`, `expires_at` y `invitation_token` (solo disponible en esta respuesta). El token es aleatorio y confidencial; la base conserva `token_hash` SHA-256, no texto claro. **No existe GET de invitaciones; el endpoint de aceptación se implementó después, en C.4a (`POST /api/v1/invitations/accept`).**

**Errores:** 401 token de sesión inválido, 404 empresa ajena/inexistente/membresía inactiva, 403 rol de miembro no autorizado, 409 empresa suspendida, destinatario ya activo o invitación vigente duplicada, 422 correo/rol/cuerpo incorrecto. El envío repetido de la misma invitación **no** recupera el token: responde 409, evitando crear una segunda. Una invitación vencida puede reemplazarse, marcando `EXPIRADA` el registro previo dentro de la misma transacción.

**Nueva migración:** `20261108_0006_business_invitations.py` → `e213c3_invitations`; nueva entidad `BusinessInvitation`, índice parcial `uq_business_invitations_pending_email` y FK a invitador/empresa. Sin alteraciones a membresías ni al UML 03B.

**Tests:** `tests/test_business_invitation_schemas.py` y `tests/test_business_invitation_integration.py` comprueban normalización, roles, seguridad, pertenencia, duplicados, expiración, persistencia del hash, no alta de membresía y rollback. En CI aprobaron Pytest con PostgreSQL real, `alembic upgrade head` y `alembic check` en Python 3.12/3.14, además de Docker. **La cantidad de pruebas y la migración local deben confirmarse por el desarrollador** tras `git pull`.

**Pendiente C.4:** validar secreto mediante comparación de hash, audiencia por correo de cuenta autenticada, estado/fecha, aceptación transaccional exactamente una vez, membresía única, activación de membresía inactiva y protección de concurrencia. El envío automático, reenvío/cancelación y protección antispam para producción quedan sin construir.

## 10. Contrato de aceptación C.4a: invitar ≠ aceptar ≠ administrar

**POST `/api/v1/invitations/accept`** — requiere `Authorization: Bearer` global y cuerpo exclusivamente `{"invitation_token":"<token-opaco>"}`. La cuenta debe tener exactamente el correo normalizado para el que se emitió la invitación. El servidor busca **SHA-256 del token**, no el texto claro, bloquea la invitación, comprueba `PENDIENTE` y expiración, bloquea empresa `ACTIVA`, y crea o reactiva una sola Membresía para `(business_id,user_id)` con el rol operativo que se propuso al emitir. Marca `ACEPTADA` y `accepted_by_user_id/accepted_at` en el mismo commit; responde `200 BusinessView`, sin token ni datos privados de otras empresas.

**Errores:** 401 cuenta/sesión inválida, 404 token desconocido o ajeno al email (misma respuesta), 409 token vencido o consumido, negocio suspendido, membresía ya activa o rol histórico de titular administrativo inactivo incompatible, 422 formato de token inválido/campos extra. La operación no otorga permisos antes de confirmar aceptación. No se asignan `ADMINISTRADOR` ni `TITULAR_ADMINISTRATIVO` mediante invitación básica. Ante error después del `flush` se revierte membresía y aceptación. El reintento de token consumido da 409, sin duplicaciones.

**Entidad y Alembic:** `business_invitations` suma `accepted_by_user_id` (FK a usuario, nullable), `accepted_at` (nullable) y CHECK `ck_business_invitation_acceptance_audit` que exige ambas columnas cuando `status=ACEPTADA` y prohíbe consignarlas en otro estado. Migración aditiva `e213c4_acceptance` (sin editar migraciones previas).

**Evidencia:** C.4a se probó localmente con **171 pruebas** y en CI con PostgreSQL/Alembic (Python 3.12/3.14, Docker); C.4b amplió la validación local a **195 pruebas**, CI funcional **3/3** y Docker saludable, sin nueva migración. La consulta y administración básica del equipo **sí están implementadas** desde C.4b. Permanecen pendientes la cancelación/rechazo/reenvío de invitaciones, correo/QR automático, verificación del email, rate limiting para internet y transferencia de titularidad. El UML 03A ya fue actualizado en C.5; la hoja para el compañero se redactará después, por separado.

## 11. C.4b — Contrato de equipo y decisiones de autorización

**GET `/api/v1/businesses/{business_id}/memberships`:** directorio limitado a titular/administrador activos de empresa ACTIVA; lista los miembros activos e inactivos de **ese tenant**, con `id`, `user_id`, `email`, `display_name`, `role`, `status`, `job_title`. No expone password_hash, contacto telefónico o tokens. 401 sesión inválida; 403 encargado/trabajador; 404 empresa ajena/inexistente o membresía del actor inactiva; 409 empresa suspendida. El rol de otra empresa no concede lectura. La capacidad `members.read` es nueva y distinta de `business.view`.

**PATCH `/api/v1/businesses/{business_id}/memberships/{membership_id}`:** solo titular administrativo vigente, empresa ACTIVA, target existente de esa misma empresa con rol **distinto de TITULAR_ADMINISTRATIVO**. Body parcial exige al menos un campo `role: ADMINISTRADOR|ENCARGADO|TRABAJADOR` o `status: ACTIVA|INACTIVA`, sin nulls ni campos adicionales. Una edición puede ascender un colaborador a ADMINISTRADOR; un administrador no puede ejecutar PATCH sobre equipo. El titular no puede auto-desactivarse/degradarse ni modificar una membresía titular histórica inactiva. 200 retorna `BusinessTeamMemberView` del target; 401 auth, 403 permiso, 404 tenant/target desconocidos, 409 estado suspendido o titular protegido, 422 cuerpo inválido. El servidor bloquea identidad/sesión, empresa/membresía del actor y objetivo en una única transacción y revierte ante error.

**Evidencia:** `tests/test_business_team_schemas.py`, `tests/test_business_team_integration.py` y actualización de matriz en `test_business_permissions.py`. GitHub Actions en código de C.4b aprobó Pytest PostgreSQL Python 3.12 y 3.14, y Docker. **Validación Windows: `195 passed in 23.86s`; Alembic `e213c4_acceptance (head)` sin deriva y Docker saludable.** Sin nueva tabla ni migración; `e213c4_acceptance` sigue como head.

**Pendientes conscientemente fuera de este corte:** transferencia/revocación de titularidad (caso sensible separado), auditoría histórica de cambios de rol, edición de `job_title`, eliminación física, listado/rechazo/cancelación/reenvío de invitaciones, confirmación de email y frontend React conectado. El cierre documental y revisión de 03A corresponden a C.5, después de validar C.4b. Las funciones comerciales RF-03–RF-07 no se atribuyen a este bloque.

## 12. Matriz de cierre de evidencias C.5 (08/11/2026)

| RF / CU | Operación real | Evidencia al cierre | Estado |
|---|---|---|---|
| RF-01 / CU-01–02 | Registro, login, `/me`, logout | Regresión PostgreSQL 195/195 | Implementado en API |
| RF-02 / CU-03 | Empresas: alta, consulta y PATCH | Regresión PostgreSQL 195/195 | Implementado en API |
| RF-02 / CU-12 | Invitación, aceptación y equipo (`GET`/`PATCH` de membresías) | Regresión 195/195; CI 3/3 del commit `8cd1674` | Implementado, titular protegido |
| Infraestructura | Alembic, API/PostgreSQL Docker, `/ready` | `e213c4_acceptance (head)`, sin deriva; ambos `healthy`; `ready`/`ok` | Verificado localmente |
| RF-03–RF-07 | Ubicaciones, catálogo, compras, stock y ventas | No hay endpoints ni pruebas backend | TO-BE |

**Precisiones:** la salida `195 passed in 23.86s` corresponde al código funcional `8cd1674`, **no a una ejecución posterior al commit documental C.5**. Frontend React, transferencia de titularidad, verificación de email, auditoría histórica de rol, seguridad de producción y deploy público siguen pendientes. La hoja de revisión del compañero se redactará después, antes de RF-03.

## 13. E2-2 A — Matriz de trazabilidad para persistencia RF-03

| RF/CU | Implementación | Pruebas | Estado |
|---|---|---|---|
| RF-03 / CU-04, tabla | `models/location.py`, migración `20261108_0008_business_locations.py` | `test_location_model.py`, `test_location_integration.py` | **Persistencia implementada; CI validado** |
| RF-03 / CU-04, HTTP | CRUD y cambios de principal / pausa | Pruebas HTTP y RBAC todavía inexistentes | **Pendiente E2-2 B/C** |
| RF-03, permisos por ubicación | Controles tenant + membresía + capacidad concreta | Pruebas de autorización futuras | **Pendiente E2-2 C** |
| RF-05/06/07, uso comercial | Validaciones de stock, recepción y venta con ubicación ACTIVA | Pruebas comerciales futuras | **Fuera de este corte** |

**E2-2 A — persistencia de Ubicaciones (08/11/2026):** se publicó `Location`/`locations` con FK obligatoria `business_id → businesses.id` (`RESTRICT`), seis tipos, `can_sell`/`can_store` independientes, campos de referencia opcionales, `ACTIVA/PAUSADA`, `is_primary`, índice parcial que permite como máximo una principal activa por tenant y CHECK que impide principal pausada. Migración aditiva `20261108_0008_business_locations.py` (`e22a_locations`, descendiente de `e213c4_acceptance`). La empresa continúa iniciándose **sin ubicaciones**. **No hay todavía rutas HTTP de ubicaciones**, ni inventario/compra/venta conectado, ni permisos de ubicación; esos cambios pertenecen a E2-2 B/C y bloques siguientes. El CI del código del corte se verificó en `300fa6f` (GitHub Actions [run 42491816481](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42491816481)): resultado `success`. La validación local Windows del nuevo corte aún se requiere; los 195 tests anteriores correspondían a E2-1.

**Observación:** el antiguo renglón de cierre E2-1 que describe `e213c4_acceptance (head)` es evidencia histórica de E2-1 y no el head nuevo. El head original E2-2 A fue `e22a_locations`, pero después de incorporar CASA el nuevo head es `e22b_location_casa`; el backend aún no expone nuevas rutas. No presentar los resultados del CI como pruebas locales de Windows.


### E2-2 A.1 — CASA y nuevo head (08/11/2026)

`CASA` se añade a los tipos admitidos; las capacidades `can_sell`/`can_store` continúan independientes. Migración aditiva `e22b_location_casa` tras `e22a_locations`, sin cambios a datos anteriores, y reversión protegida cuando existen ubicaciones CASA. **CI backend** ([run](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42492475011)): **217 pruebas aprobadas, Python 3.12/3.14, Alembic `e22b_location_casa (head)` sin deriva, Docker 3/3**. **CI frontend** ([run](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42492474999)): **2/2 trabajos exitosos, incluidos build/lint y E2E**. Resultado Windows precedente de E2-2 A: 212 pruebas; **la migración adicional CASA y los 217 tests todavía deben reproducirse localmente**. Sin endpoints de ubicación hasta E2-2 B/C y sin conexión React–API.

## 14. E2-2 B — Contratos y evidencia de RF-03 parcial

**Estado E2-2 B (08/11/2026):** se publicaron tres rutas reales para ubicaciones bajo `/api/v1/businesses/{business_id}/locations` (`POST` 201, `GET` lista 200, `GET /{location_id}` 200). La creación valida DTO sin campos protegidos, revalida identidad/sesión, bloquea la empresa y membresía del actor, exige tenant `ACTIVA` y rol `TITULAR_ADMINISTRATIVO` o `ADMINISTRADOR`, y confirma una única transacción. Una primera ubicación recibe `is_primary=true`; las posteriores no la reemplazan. Los miembros activos de cualquier rol reconocido pueden consultar las ubicaciones propias, incluso con empresa suspendida; una empresa suspendida no permite crear. Empresa ajena o membresía inactiva devuelve 404; rol sin permiso 403; sesión inválida 401; empresa suspendida al crear 409; cuerpo incorrecto 422. `CASA` y Google Maps HTTPS validado están incluidos. **No hay PATCH/DELETE, ni pausa/reactivación, cambio de principal, asignación individual de personal o consumo comercial de ubicaciones todavía.** La DEMO permanece independiente. Backend sin migración nueva respecto de `e22b_location_casa`.

**Matriz de capacidades del corte:** leer ubicaciones (cualquier rol empresarial reconocido con membresía activa); crear (titular y administrador); empresa suspendida solo permite leer. No se implementa autorización por ubicación asignada ni edición/pausa. Los nombres de los endpoints son los definidos en la tabla de contratos HTTP. **Los GET no son inventario ni habilitan operar stock**, y una empresa sin ubicaciones devuelve lista vacía.

**Evidencia de CI:** commit funcional `bdd2c84653dafb976c8cd6b49d8c2d577cc345de`; [GitHub Actions E2-2 B](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42493624747) **3/3** (Python 3.12 y 3.14 con PostgreSQL, Docker), **277 pruebas aprobadas**, `e22b_location_casa (head)` y Alembic sin deriva. La salida local de Windows aportada previamente para **E2-2 A.1** fue **217 passed in 23.90s**. Posteriormente E2-2 B **fue validado en Windows con `277 passed in 31.22s`**, Alembic sin deriva y Docker saludable; E2-2 C agrega nuevas pruebas por verificar localmente. La revisión de E2-1 por el compañero sigue anclada en el commit entregado.

## 15. E2-2 C — Matriz de edición, estados y principal

**E2-2 C (08/11/2026) — operaciones reales sobre ubicaciones:** `PATCH /api/v1/businesses/{business_id}/locations/{location_id}` permite editar únicamente `name`, `kind`, `address`, `map_url`, `can_sell` y `can_store` (campos opcionales en el cuerpo, pero se rechazan `null`, cuerpos vacíos, valores inválidos y campos protegidos). `PATCH /{location_id}/status` recibe solo `ACTIVA` o `PAUSADA`: pausar revoca `is_primary` en la misma transacción y reactivar **no** recupera la titularidad de ubicación automáticamente. `PUT /{location_id}/primary` designa una ubicación `ACTIVA`, desmarca la anterior y marca la elegida dentro del **mismo tenant y de una transacción única**, serializada por bloqueo de empresa y protegida con el índice SQL `uq_locations_one_active_primary`. La operación sobre una ubicación ya principal no realiza cambios adicionales. Titular/administrador con membresía ACTIVA pueden administrar; encargado/trabajador solo consultan. Empresa `SUSPENDIDA` admite lectura pero no cambios; recurso ajeno/inexistente 404, rol sin permiso 403, sesión inválida 401, estado incompatible 409 y cuerpo inválido 422. No se habilitó DELETE ni se crearon tablas nuevas.

| Capacidad | TITULAR_ADMINISTRATIVO | ADMINISTRADOR | ENCARGADO | TRABAJADOR |
|---|---|---|---|---|
| Leer ubicaciones propias | Sí | Sí | Sí | Sí |
| Crear ubicación | Sí | Sí | No | No |
| Editar datos/capacidades | Sí | Sí | No | No |
| Pausar/reactivar | Sí | Sí | No | No |
| Designar principal ACTIVA | Sí | Sí | No | No |

**Evidencia:** código funcional `7abafd8208965cd99b0116e02ffc5240d23f218f`, [GitHub Actions E2-2 C](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42495567321) **3/3 exitoso**, 325/325 pruebas en Python 3.12 y 3.14 con PostgreSQL, Alembic `e22b_location_casa (head)` sin deriva y Docker correcto. Windows había validado previamente E2-2 B (`277 passed in 31.22s`, `/ready` = `ready`/`ok`). **Los 325 tests todavía deben reproducirse en Windows para dar por cerrado localmente E2-2 C.** La integración React/API, la asignación individual de miembros a ubicaciones, control de existencias al quitar `can_store`, recepciones/ventas y gestión de cajas operativas son trabajos futuros; no se atribuyen a este incremento. E2-1 y UML 03B/03C no fueron modificados.

## 16. E2-2 D — Trazabilidad de asignaciones por ubicación

**E2-2 D AS-IMPLEMENTED:** `LocationAssignment` con clave `(business_id,location_id,user_id)` y FK compuesta hacia `Location` y `Membership` del MISMO tenant. Migración aditiva `e22d_assignments`, índice único auxiliar de ubicación `(business_id,id)`. Estados administrativos `ACTIVA`/`REVOCADA`; fecha `revoked_at`, sin borrado físico. `GET /api/v1/businesses/{business_id}/locations/{location_id}/assignments` lista asignaciones de una sede (titular/administrador); `PUT /api/v1/businesses/{business_id}/locations/{location_id}/assignments/{membership_id}` recibe JSON `{"status":"ACTIVA"}` o `{"status":"REVOCADA"}` y activa/revoca idempotentemente. Solo se activa una membresía ENCARGADO/TRABAJADOR activa hacia ubicación ACTIVA; revocar permite sede pausada o miembro inactivo. Empresa SUSPENDIDA solo lectura. La política pura `can_operate_at_location` obliga a tenant, membresía, sede y capacidad `SELL/STORE` vigentes, además de asignación ACTIVA a encargados/trabajadores. **La política todavía no se consume en compras, inventario ni ventas**, fuera de este corte. Sin nuevas funciones de E2-1 ni conexión del frontend.

**CI comprobado para código funcional `3cd7bce71d951218e8c77da58d147e78fb0d426e`:** [run 42497556047](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42497556047), **371/371 tests Python 3.12 y 3.14, 3/3 trabajos aprobados**, Alembic `e22d_assignments (head)` sin deriva y Docker saludable. **Windows local E2-2 D está pendiente:** la última ejecución aportada corresponde a E2-2 C, 325 passed. No atribuir al último commit documental ejecución propia de tests.

## 17. E2-3 A — Trazabilidad de esquema de Catálogo (RF-04)

| Capa | Artefacto | Prueba | Estado |
|---|---|---|---|
| SQL y ORM | `models/catalog_item.py`, `alembic/versions/20261108_0011_catalog_items.py` | `test_catalog_item_model.py`, `test_catalog_item_integration.py` | **407 pruebas CI aprobadas, local pendiente** |
| SKU/nombre por empresa | Índices/UNIQUE, normalización posterior por servicio | Duplicados del mismo tenant/inactivos y reutilización en otro tenant | **Restricción SQL implementada; API pendiente** |
| Tipo/unidad | CHECK para clases DEMO y exclusividad `SERVICIO` | Combinaciones válidas e inválidas en PostgreSQL | **Implementado** |
| API, RBAC y CRUD | Endpoints bajo `/businesses/{business_id}/items` (propuesta previa) | Tests HTTP, sesiones, concurrencia y errores | **Pendiente E2-3 B/C** |
| Inventario/compras/ventas | FK compuestas futuras y snapshots históricos | Tests comerciales futuros | **Fuera de E2-3 A** |

**Corte E2-3 A (08/11/2026), persistencia parcial de RF-04/CU-05:** clase SQLAlchemy `CatalogItem` y tabla `catalog_items` con `business_id` obligatorio, FK a Empresa (`RESTRICT`) y par UNIQUE `(business_id,id)` para futuras FK comerciales del mismo tenant. Cuatro clases de ficha según la DEMO: `ELABORADO`, `REVENTA`, `INSUMO` (bienes físicos) y `SERVICIO` (conceptualmente un servicio). Un servicio obliga unidad `SERVICIO`; un bien físico la prohíbe. Unidades físicas: `UNIDAD`, `GRAMO`, `KILOGRAMO`, `MILILITRO`, `LITRO`, `PAQUETE`, `CAJA`. Se almacenan nombre, clave normalizada `name_key`, categoría, SKU opcional, descripción, observaciones internas, estado `ACTIVO`/`INACTIVO`, condición `sellable`, `price_cents` y `reference_cost_cents` opcionales. Importes enteros BIGINT entre 0 y 99.999.999.999 centavos, sin Float. Dos restricciones independientes impiden repetir `name_key` y SKU no nulo **dentro de la empresa**, también en fichas inactivas; distintos tenants pueden reutilizarlos. En E2-3 B el servicio deberá calcular `name_key` de forma canónica (NFKC, espacios colapsados, equivalencia de mayúsculas) y normalizar SKU a mayúsculas **antes de insertar/editar**: SQL impone la unicidad de las claves guardadas y el formato de SKU, pero no deriva `name_key` automáticamente. Crear ficha no crea ubicación, stock, compras, ventas ni movimientos.

**Evidencia:** corte de código/pruebas `79c2071f4e5192be95d75c78d5b1e9a75492a645`; [GitHub Actions E2-3 A](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42504783843) **3/3**, **407 pruebas aprobadas** en Python 3.12 y Python 3.14 con PostgreSQL 16, Docker liveness aprobado y `e23a_catalog (head)` sin cambios pendientes de Alembic. **Validación local de Windows pendiente para E2-3 A**; los 371 tests anteriores corresponden al cierre de E2-2. **No existen rutas HTTP de Catálogo** en este corte; CRUD, RBAC de catálogo, SKU/name normalization de entrada y protección de historias comerciales se implementarán en E2-3 B/C/D. No hay integración React API ni revisión independiente de E2-3 todavía. No se modificó E2-1 ni E2-2 ni frontend DEMO.

## 18. E2-3 B — Trazabilidad HTTP Catálogo

**E2-3 B — API real de Catálogo (RF-04/CU-05, 08/11/2026):** cuatro rutas bajo `/api/v1/businesses/{business_id}/catalog`: `POST /catalog` (201 alta), `GET /catalog` (200 lista con `offset>=0`, `1<=limit<=500`; por defecto `limit=100`), `GET /catalog/{item_id}` (200 detalle) y `PATCH /catalog/{item_id}` (200 edición parcial). Cada operación requiere Bearer válido, revalidación de sesión, usuario y membresía de la empresa solicitada. Titular/administrador pueden leer y escribir; encargado/trabajador con membresía activa solo leen; empresa SUSPENDIDA solo lectura; empresa o artículo ajenos/inexistentes 404. El servidor normaliza los nombres Unicode NFKC, colapsa espacios y genera `name_key` con `casefold`; normaliza SKU a mayúsculas ASCII y convierte SKU vacío en NULL. PostgreSQL conserva la unicidad por empresa de `name_key`/SKU incluso con fichas INACTIVO, y la API traduce esa colisión a 409. Datos inválidos o campos protegidos (id, tenant, status, clave derivada) reciben 422. Tipo SERVICIO exige unidad SERVICIO; ninguna otra clasificación puede usarla. Son válidos `price_cents` y `reference_cost_cents` NULL o enteros desde 0 hasta 99.999.999.999. El PATCH permite eliminar SKU/precio/costo con NULL, pero no editar estado. La ficha conserva su `status` y timestamps SQL. La creación no crea ubicación, saldo de stock, compras, ventas ni movimientos.

| Capacidad | Titular | Administrador | Encargado | Trabajador |
|---|---|---|---|---|
| Crear / editar ficha | Sí | Sí | No | No |
| Listar / consultar ficha propia | Sí | Sí | Sí | Sí |
| Editar estado ACTIVO/INACTIVO | **Pendiente E2-3 C** | **Pendiente E2-3 C** | No | No |

**Límites explícitos:** E2-3 B no expone todavía `PATCH /status` ni borrado físico (se evaluarán en E2-3 C). No existe integración del frontend React con esta API; no se implementan recepción, ventas, snapshots comerciales ni protección de edición de unidad con historia, pues esos módulos son posteriores. Los tests nuevos comprueban permisos, rollback de duplicados, SKU/nombres normalizados, aislamiento multiempresa, lectura bajo suspensión y fallas 401/403/404/409/422. **Evidencia CI E2-3 B:** [GitHub Actions 42506409757](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42506409757) finalizó **3/3 trabajos exitosos**, **498 pruebas aprobadas** tanto en Python 3.12 (53.96s) como Python 3.14 (50.12s), PostgreSQL 16, `e23a_catalog (head)` y `alembic check` sin operaciones, imagen Docker/liveness aprobado. Código funcional validado: `35ff901855397c024cee50fa590c6c05a7f04cfe`. El CI anterior `42506050141` había detectado dos fallos de mapeo HTTP en PATCH con tipo/unidad incompatible; se corrigieron y ambos casos pasan ahora. **La validación Windows local de E2-3 B sigue pendiente**; el último resultado local confirmado es 407/407 de E2-3 A.

## 19. E2-3 C — Matriz HTTP de estado

**E2-3 C (08/11/2026):** se implementó `PATCH /api/v1/businesses/{business_id}/catalog/{item_id}/status` con cuerpo exclusivo `{"status":"ACTIVO"}` o `{"status":"INACTIVO"}`, validación estricta y rechazo de atributos extra (422). La ruta revalida sesión y membresía y exige titular/administrador de empresa ACTIVA para escribir (401/403/404/409 según caso). El artículo se bloquea dentro del tenant y se cambia de estado en una sola transacción. El cambio repetido es idempotente, sin alterar `updated_at`. El artículo inactivo continúa visible en GET/listados, con UUID, nombre y SKU reservados incluso ante altas duplicadas; no hay DELETE ni stock ficticio. El PATCH genérico mantiene `status` protegido. Esta funcionalidad tampoco modifica el campo independiente `sellable`.

**Dependencias:** las futuras compras/ventas deben prohibir nuevos movimientos con fichas INACTIVO y conservar snapshots históricos reales. Todavía no hay operaciones comerciales ni frontend integrado; por lo tanto, tampoco existe una restricción real de cambio de unidad por transacciones anteriores. Ninguna migración nueva: se reutiliza CHECK `ACTIVO/INACTIVO` de `e23a_catalog`.

**Pruebas:** [CI E2-3 C](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42507243181) **3/3 trabajos aprobados**, **527 passed** en Python 3.12 y 3.14 con PostgreSQL, `e23a_catalog (head)`, `alembic check` sin operaciones y Docker correcto; código `c2153ab9b65b265eb46b3081079e0f3f15002215`. E2-3 B: **498 passed en Windows (55.79s)**, Docker/API/DB saludables. **E2-3 C: Windows pendiente**. El commit documental posterior no equivale a otra ejecución CI.

## 20. E2-3 D — Matriz de cobertura, límites y seguimiento

**E2-3 D (08/11/2026):** se reforzó el Catálogo existente, **sin agregar tablas ni migraciones**. Los tests nuevos verifican equivalencias Unicode NFKC + `casefold` en nombres, SKU NFKC y mayúsculas ASCII, rechazo de controles y formas inválidas, desbordamiento de `name_key` por expansión Unicode, importes enteros estrictos (sin booleanos ni decimales), diferenciación entre `PATCH` con campo omitido y con `null` explícito, incompatibilidad SERVICIO/unidad física, campos protegidos de `/status`, colisiones de nombre/SKU incluso en fichas INACTIVO, independencia entre dos empresas del mismo usuario, recuperación de la sesión tras 409, y rollback provocado después de `flush` tanto en alta como en edición. Se añadió un límite máximo a `offset` de catálogo (`9_223_372_036_854_775_807`, BIGINT PostgreSQL): excederlo produce 422 antes de ejecutar SQL, manteniendo `limit` de 1 a 500 y `offset` no negativo. Los cinco endpoints de Catálogo conservan sus contratos y permisos empresariales; no se crea stock.

**Alcance y límites:** las UNIQUE por `(business_id,name_key)` y `(business_id,sku)` y las transacciones/bloqueos existentes protegen ante colisiones; los tests ejercen duplicados y recuperaciones reales en PostgreSQL, **pero no son una prueba simultánea de carga/concurrencia con múltiples conexiones independientes**. Esta última queda registrada como verificación futura antes de producción. No hay aún compras, ventas, movimientos ni snapshots, por lo que no se puede comprobar una regla de cambio de unidad/estado con historial comercial real. `sellable` no sustituye `status`. No conectar frontend DEMO ni E2-1/E2-2 para este corte.

**Evidencia CI del código D:** commit `bf4fd3fa809c9f4e6afdeb064a155acf233b1722`, [GitHub Actions run 42508771222](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42508771222): **3/3 trabajos aprobados**, **580 passed** en Python 3.12 y Python 3.14 con PostgreSQL, Docker build/liveness aprobado, `e23a_catalog (head)` y `alembic check` sin diferencias. **Validación local Windows E2-3 C:** 527 passed in 59.60s, contenedores saludables y `/ready` correcto. **Validación local Windows E2-3 D:** todavía pendiente. No confundir CI remoto con pruebas ejecutadas en la computadora del autor.

## E2-3 E — Trazabilidad final del Catálogo: modelo, pruebas y límites reconciliados

**E2-3 E (08/11/2026) — cierre funcional:** E2-3 A/B/C/D implementó `CatalogItem`/`catalog_items`, migración `e23a_catalog`, cinco operaciones REST (GET/POST colección, GET/PATCH detalle, PATCH estado), permisos por tenant y rol, nombre canónico y SKU únicos dentro de la empresa, cuatro clases ELABORADO/REVENTA/INSUMO/SERVICIO, tipo BIEN/SERVICIO derivado sin columna duplicada, importes opcionales en centavos y desactivación reversible sin borrar fichas ni liberar claves. No se crean existencias al registrar un artículo. **La fuente PlantUML 03A v0.7 y su SVG editorial ya se conciliaron** con el Catálogo real; `Proveedor` sigue TO-BE.

**Windows D comprobado por el desarrollador:** 580 passed in 66.45 s, `e23a_catalog (head)`, `No new upgrade operations detected.`, API y PostgreSQL Docker `healthy`, `/ready` → `ready/ok`. **CI D:** [run 42508771222](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42508771222), SHA `bf4fd3fa809c9f4e6afdeb064a155acf233b1722`, 580 tests Python 3.12 y 3.14, 3/3 jobs aprobados. Cambios posteriores solo de UML/documentos no constituyen nueva ejecución CI.

**Pendientes explícitos:** no se ejecutó una prueba de doble alta concurrente con dos conexiones independientes ni carga sostenida. Aún no hay compras, stock, ventas, snapshots comerciales ni uso de permisos SELL/STORE en operaciones reales. Las reglas sobre cambios de tipo/unidad con historial comercial deberán aplicarse cuando existan esos módulos. React continúa DEMO sin integración HTTP. E2-1/E2-2 y diagramas 03B/03C permanecen fuera del alcance. El bloque está preparado para **auditoría independiente** y no se declara auditado ni listo para producción.

| Acción real | Ruta HTTP | Autorización |
|---|---|---|
| Listar fichas, incluidas INACTIVO | `GET /api/v1/businesses/{business_id}/catalog` | Miembro activo con lectura |
| Crear ficha sin stock | `POST /api/v1/businesses/{business_id}/catalog` | Titular/administrador, empresa ACTIVA |
| Ver detalle propio | `GET /api/v1/businesses/{business_id}/catalog/{item_id}` | Miembro activo con lectura |
| Modificar campos válidos | `PATCH /api/v1/businesses/{business_id}/catalog/{item_id}` | Titular/administrador, empresa ACTIVA |
| Desactivar/reactivar | `PATCH /api/v1/businesses/{business_id}/catalog/{item_id}/status` | Titular/administrador, empresa ACTIVA |

**Fuente real:** `backend/app/infrastructure/models/catalog_item.py`, `backend/alembic/versions/20261108_0011_catalog_items.py`, `backend/app/modules/catalog/{schemas,repository,service,router}.py` y `backend/tests/test_catalog*.py`. Las rutas comerciales de Compras/Stock/Ventas son metas posteriores, no implementaciones.

## 21. E2-4 — Actualización de trazabilidad AS-IMPLEMENTED (cierre 08/11/2026)

> **Precedencia:** esta sección documenta las operaciones existentes tras PR #18. Las frases `pendiente E2-4` de E2-3 y bloques previos se conservan como **historia** de aquellos cortes, no como estado actual. Código de cierre: `4f88416141c09a82e744990b1aee8c00b9f31dfd`. Cierre exhaustivo con 17 casos manuales, CI y backlog: [docs/revisiones/E2-4_CIERRE](../docs/revisiones/E2-4_CIERRE/00_LEEME.md).

| RF / CU | Endpoint real (bajo `/api/v1/businesses/{business_id}`) | Roles/condiciones | Evidencia |
|---|---|---|---|
| RF-05 / CU-06, Proveedor | `GET/POST /suppliers`; `GET/PATCH /suppliers/{supplier_id}`; `PATCH /suppliers/{supplier_id}/status` | Miembro activo lee; titular/admin escriben en empresa ACTIVA | [CI E2-4 B](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42514595377), 693 tests |
| RF-05 / CU-06, Compra | `POST/GET /purchases`; `GET /purchases/{purchase_id}` | Compra: titular/admin, empresa ACTIVA, clave idempotente; lectura de membresía activa | [CI E2-4 D](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42523855898), 772 tests; bitácora U-01–U-07 |
| RF-05 / CU-07, Recepción | `POST /purchases/{purchase_id}/receive`; `GET /purchases/{purchase_id}/receipt` | Sesión válida, compra REGISTRADA, destino ACTIVA/`can_store`; permiso `STORE` y una sola recepción | [CI E2-4 E](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42528940012), 796 tests; U-08–U-14 |
| RF-06 / CU-08 (parcial) | `GET /inventory/balances`, `GET /inventory/movements` | Lectura por empresa, filtros y paginación | U-15–U-17; saldo 10000, ledger una entrada |
| RF-03/RF-04 (dependencias) | `GET/POST /locations`, `POST /catalog`; catálogo valida tipo/unidad históricos | Roles y tenant; ubicación `can_store`, artículo activo | U-06 y U-08–U-11 |
| Calidad técnica | Sin endpoints nuevos en PR #18; corrección `test_purchase_integration.py` | Los tests no suponen DB vacía | [CI final](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42530739959), **797/797**; Windows 797/797 |

**Implementado:** compra sin stock, centavos/milésimas enteros, snapshots, recepción física completa 1:1, balance UPSERT, movimiento histórico y permisos tenant/STORE. **Pendiente:** recepción parcial 1:N, cancelación HTTP, compensaciones, transferencias, ajustes, multimoneda, ventas, Mercado Pago, frontend integrado, hardening de DB y pruebas de carga. Los tests se ejecutaron correctamente con datos QA locales después de PR #18, **pero la DB de pruebas local continúa compartiendo entorno con desarrollo** hasta aislarla mediante infraestructura dedicada.

**Criterio académico:** cierre del bloque E2-4 para su alcance acordado, **no** finalización de RF-06 completo, TP completo ni certificación productiva.

## E2-5 A — Preparación de RF-06/CU-09 y CU-11: modelo implementado, API diferida

**Corte:** 09/11/2026; base E2-4 validada (`797/797` Windows y CI, migración `e24e_receipt_stock`). Se agrega `inventory_operations` con FK compuestas por tenant (artículo, origen/destino, actor), motivo, cantidad y huella/idempotencia. El ledger `stock_movements` admite tipos firmados para traslados, ajustes y stock inicial, con FK compuesta de origen y nuevo CHECK de signo y exclusión; `stock_balances` y `purchase_receipts` permanecen intactos. Migración propuesta `e25a_inventory_ops` sobre la histórica E2-4.

| RF / CU | Contrato implementado en E2-5 A | Endpoint HTTP | Estado |
|---|---|---|---|
| RF-05 / CU-07, recepción histórica | `COMPRA_RECEPCION` y snapshots E2-4 compatibles; FK y signo preservados | `POST /purchases/{id}/receive`, `GET /purchases/{id}/receipt` | **Implementado E2-4; regresión exigida E2-5 A** |
| RF-06 / CU-08, lectura | `stock_balances` sin cambios; consulta actual de entradas por recepción | `GET /inventory/balances`, `GET /inventory/movements` | **Parcial E2-4** |
| RF-06 / CU-09, traslado | Cabecera `TRASLADO` y deltas `TRASLADO_SALIDA/ENTRADA` con integridad SQL | **No disponible todavía** | **E2-5 A: modelo; E2-5 B: comando transaccional y pruebas** |
| RF-06 / CU-11, ajustes e inicial | Cabeceras `AJUSTE_ENTRADA`, `AJUSTE_SALIDA`, `STOCK_INICIAL`; motivo obligatorio y signos | **No disponible todavía** | **E2-5 A: modelo; E2-5 C: comando transaccional y pruebas** |

La migración no ejecuta traslados por sí misma: el saldo debe actualizarse atómicamente junto con ambos movimientos y comprobar no negatividad en E2-5 B/C. El futuro GET de movimientos requerirá respuestas compatibles con orígenes opcionales antes de registrar nuevas operaciones manuales. La revisión de BD dedicada para pruebas locales, hardening del ledger y conciliación de saldos quedan como deuda controlada antes de producción.

**Fuente técnica:** [E2-5 A — Modelo de operaciones de inventario](../docs/E2-5_A_MODELO_OPERACIONES_INVENTARIO.md) y `backend/tests/test_inventory_operation_{model,integration}.py`. **CI E2-5 A verificado:** [run 42599668128](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42599668128), **3/3 trabajos exitosos**, **816 tests tanto en Python 3.12 como 3.14** con PostgreSQL 16, migración `e25a_inventory_ops (head)` y `alembic check` sin diferencias. **Validación local Windows pendiente**, no equipararla con CI.

## E2-5 B — CU-09: transferencia de existencias con movimientos dobles

El endpoint nuevo `POST /api/v1/businesses/{business_id}/inventory/transfers` exige sesión, membresía, permiso STORE en ambas ubicaciones de un solo tenant, artículo físico activo, cantidad en milésimas y `Idempotency-Key` UUID4. Descuenta de origen condicionalmente y acredita destino mediante UPSERT, registra cabecera y dos movimientos firmados y confirma todo en una transacción. Misma clave/actor/carga retorna 200 y la operación histórica, sin doble stock. `GET /inventory/transfers/{transfer_id}` permite consultar esa operación; `GET /inventory/movements` lee tanto recepciones E2-4 como transferencias.

**Límites:** RF-06/CU-09 ahora tiene API de transferencia básica. No equivale a CU-11 (ajustes), stock inicial, transferencias multiartículo, frontend integrado ni inventario productivo completo. Migración no cambia respecto de E2-5 A (`e25a_inventory_ops`). Pruebas HTTP/PostgreSQL del corte: `backend/tests/test_transfer_api_integration.py`; **CI E2-5 B verificado:** [run #42602232103](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42602232103), 3/3 trabajos exitosos, **826 tests en Python 3.12 y 3.14**, PostgreSQL 16, Alembic `e25a_inventory_ops (head)` sin deriva y Docker aprobado. Pruebas SQL/HTTP y tres carreras concurrentes en sesiones independientes; **Windows pendiente de validar**, no confundir con CI. Contrato: [docs/E2-5_B_TRASLADOS_ATOMICOS.md](../docs/E2-5_B_TRASLADOS_ATOMICOS.md).


## E2-5 C — RF-06 / CU-11: API de ajustes justificados y stock inicial

Se suman **`POST /api/v1/businesses/{business_id}/inventory/adjustments`** (nuevo evento `AJUSTE_ENTRADA`, `AJUSTE_SALIDA`, `STOCK_INICIAL`) y **`GET /api/v1/businesses/{business_id}/inventory/adjustments/{adjustment_id}`**. Exigen Bearer, membresía activa, permiso STORE, motivo obligatorio, artículo físico, idempotencia por empresa y `expected_version` tomada del GET de saldos. Stock inicial: solo titular/admin y solo par ubicación/artículo nunca utilizado; un saldo cero con historial no habilita segunda carga inicial. Ajuste de salida: saldo insuficiente → 409 y rollback; versión obsoleta → 409. Los movimientos firmados se integran al ledger general ya disponible.

**Modelo y Alembic:** reutiliza `InventoryOperation`, `StockMovement`, `StockBalance` y `e25a_inventory_ops`, sin alterar historial E2-4/E2-5 B. **Limitación:** conteo absoluto de cantidad observada, doble aprobación y conciliación automatizada se diferirán; aquí la variación enviada es firmada por el tipo, no recalculada a partir de un conteo absoluto. Pruebas E2-5 C: `backend/tests/test_adjustment_api_integration.py` y `test_adjustment_concurrency_integration.py`. **CI E2-5 C:** [run #42616213215](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42616213215), 3/3 trabajos exitosos, **840 pruebas en Python 3.12 y 3.14** sobre PostgreSQL 16, `e25a_inventory_ops (head)`, `alembic check` sin deriva, Docker saludable. **QA local Windows pendiente**, no presentado como ejecutado. [Detalle de contrato](../docs/E2-5_C_AJUSTES_Y_STOCK_INICIAL.md).
