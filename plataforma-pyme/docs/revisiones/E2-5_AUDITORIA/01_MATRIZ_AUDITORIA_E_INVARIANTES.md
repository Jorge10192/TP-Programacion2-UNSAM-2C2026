# E2-5 — Matriz de auditoría por invariante y superficie técnica

**Alcance:** E2-5 A/B/C congelado en `748e69319d8d04900c009d5184168a264a9deeac`.  
**Carácter:** **plan de auditoría independiente**, NO lista de defectos confirmados. Cada fila requiere evidencia y dictamen del futuro revisor.  
**Principio para IA:** la implementación y el contrato aprobado mandan sobre diagramas conceptuales, pseudocódigo externo y preferencias de estilo. La IA debe comparar modelos, SQL, HTTP, dependencias y pruebas: no inferir propiedades de una sola capa.

## 1. Límites de confianza y arquitectura de referencia

`Cliente (Swagger/React/externo) → FastAPI/Pydantic → autenticación Bearer opaca con sesión revocable → Business/Membership/LocationAssignment → Service + Session SQLAlchemy síncrona → ORM/SQL PostgreSQL 16 + constraints + commit → ledger y proyección`.

- `business_id` deriva de la URL, pero **no concede permisos**; el servidor verifica la pertenencia y los recursos en ese tenant.
- `StockMovement` es la **evidencia histórica firmada** y `StockBalance` la **proyección actual bloqueable**. Una corrección no debe borrar historia ni crear un segundo saldo editable.
- `InventoryOperation` es la cabecera idempotente de un **solo artículo** y clase; `TRASLADO` requiere dos movimientos, cada ajuste/inicial **uno**.
- `PurchaseReceipt` y movimientos `COMPRA_RECEPCION` pertenecen a E2-4 y deben permanecer operativos y legibles.
- `money` en ARS centavos solo afecta la dependencia de compras/recepción. **No hay transacción de efectivo, pago ni venta** en un traslado/ajuste E2-5.
- Los locks de ubicación y el orden fijo en traslados son parte del diseño; el uso de `expected_version` solo en ajustes **no es por sí mismo un bug**.
- Autenticación real: `app/modules/auth/tokens.py` genera tokens aleatorios URL-safe de 256 bits; no JWT. `SessionService` consulta su huella y estado en DB.

## 2. Matriz principal RF/CU, invariantes y evidencia buscada

| ID | RF/CU | Invariante o política examinada | Fuente primaria | Test representativo | Pregunta crítica del auditor |
|---|---|---|---|---|---|
| **INV-01** | RF-06 | Tabla de operación manual, `kind` permitido, direcciones correctas y motivo 3–500 | `models/inventory_operation.py`, migración 0016 | `test_inventory_operation_model.py` y `integration.py` | ¿Un INSERT SQL inválido (dirección, unidad o motivo) puede entrar por semántica NULL o FK parcial? |
| **INV-02** | RF-06 | FK compuestas por tenant para artículo, ubicación y actor de operación | ORM + DDL `e25a_inventory_ops` | `test_inventory_operation_integration.py` | ¿Puede un movimiento/cabecera asociarse a recurso de empresa ajena con UUID conocido? |
| **INV-03** | RF-06 | Origen XOR: movimiento de compra O manual; signo/tipo concordante | `models/stock_movement.py`, migración 0016 | `test_signed_origin_kind_is_enforced_in_postgres` | ¿Una fila mezcla `receipt_id` con `inventory_operation_id` o contradice `operation_kind`? |
| **INV-04** | RF-06 | Ledger compatible con documentos de recepción E2-4 | `receipt_schemas.py`, `receipt_service.py`, `inventory_router.py` | `test_receipt_http_and_historical_movement_remain_unchanged` | ¿Se modificaron datos históricos o cambió el DTO antiguo de recibo por campos opcionales nuevos? |
| **INV-05** | CU-08 | Lectura de saldos/movimientos por empresa, filtros y paginación | `inventory_router.py`, `ReceiptService.list_*` | `test_transfer_movements_visible_in_general_ledger_and_old_receipt_unchanged` | ¿La lectura comparte auth/tenant? ¿Filtra correctamente ambos ids y no agrega de otro negocio? |
| **INV-06** | CU-09 | Traslado requiere dos ubicaciones distintas, activas y STORE | `transfer_schemas.py`, `TransferService.transfer`, `locations/permissions.py` | `test_location_status_store_and_foreign_tenant` | ¿Es posible usar lugar SELL-only o propio sin STORE? ¿Cuándo se bloquea y revalida? |
| **INV-07** | CU-09 | Origen suficiente, débito SQL condicional; destino UPSERT; total conservado | `transfer_service.py`, `stock_balance.py` | `test_transfer_atomic_two_movements_same_total_and_replay` | ¿Puede existir crédito sin débito, negativo o doble confirmación? |
| **INV-08** | CU-09 | Orden de lock estable para dos sedes y deadlock/reintentos | `transfer_service.py`, `test_transfer_concurrency_integration.py` | `test_opposite_direction_transfers_lock_locations_in_stable_order` | ¿Qué ocurre con transferencias opuestas y transacciones que usan otro orden (recepción/ajuste)? |
| **INV-09** | CU-09 | Replay exacto del mismo actor/cuerpo/tenant devuelve 200 sin mutación | `TransferService._replay`, UNIQUE `business_id,request_id` | `test_concurrent_replay_same_key_does_not_duplicate_stock` | ¿Nueva clave, misma clave distinta carga, actor o tipo pueden provocar duplicación o información sensible? |
| **INV-10** | CU-11 | `STOCK_INICIAL` una sola vez por empresa/ubicación/artículo, incluso saldo histórico cero | `adjustment_service.py` | `test_initial_is_forbidden_after_receipt_or_previous_initial_even_when_empty` | ¿Puede volver a «inicializar» tras mover todo el stock? ¿Qué pasa si existe ledger sin balance? |
| **INV-11** | CU-11 | Solo titular/admin inicializa; ENCARGADO asignado puede ajustar; TRABAJADOR no | `adjustment_service.py`, `locations/permissions.py` | `test_permissions_employee_and_manager_location_assignment` | ¿Se aplican restricciones a POST, GET, replay, rol cambiado o membresía revocada? |
| **INV-12** | CU-11 | Ajuste exige balance previo y versión exacta, +1 por éxito | `adjustment_service.py`, `stock_balance.py` | `test_no_prior_balance_cannot_be_adjusted_without_stock_initial` / `test_insufficient_stock_and_stale_version_do_not_change_ledger` | ¿El mismo saldo leído admite una segunda escritura con versión vieja? ¿Se devuelven 409 consistentes? |
| **INV-13** | CU-11 | Ajuste positivo/negativo firmado; no sobrepasar cero/máximo | `adjustment_service.py`, `MAX_BALANCE_MILLI` | `test_adjust_increase_decrease_and_history_are_signed` | ¿Hay overflow, error SQL 500 no mapeado o signo incorrecto bajo carga extrema? |
| **INV-14** | CU-11 | Replay y colisión de tipo/actor/cuerpo en ajustes | `AdjustmentService._replay` y request digest | `test_adjustment_key_cannot_be_reused_after_transfer` | ¿Un UUID4 usado en traslado puede reutilizarse para inicial? ¿Qué efecto tiene una carrera? |
| **INV-15** | RF-06/RF-05 | Compra no acredita; recepción acredita una vez; ajuste/traslado no alteran compra | `receipt_service.py`, `receipt_schemas.py`, `transfer_service.py` | `test_receipt_api_integration.py` | ¿Existe comportamiento accidental E2-4 al operar E2-5? |
| **INV-16** | RF-06 | Un commit/rollback integral para cabecera, dos movimientos y balances | `transfer_service.py`, `adjustment_service.py` | tests de error parcial; revisar su exhaustividad | ¿Un fallo entre debit/credit/insert deja efectos persistentes? ¿Se propagó 500 inesperado? |
| **INV-17** | Seguridad | Sesión revocable y membresía/empresa revalidadas; recursos ajenos ocultos | `auth/session_service.py`, `purchases/service.py`, `businesses/repository.py` | `test_transfer_denied_on_invalid_token_and_foreign_operation` y tests de ajuste | ¿Queda algún camino sin revalidar, especialmente GET de comprobantes o replay temprano? |
| **INV-18** | RF-06 | Cantidad en milésimas, unidades discretas, `StrictInt` y limites de `BIGINT` | `*_schemas.py`, CHECK en 0016, `StockBalance` | `test_schema_rejects_discrete_fraction_bad_reason_boolean_or_extra` | ¿Se filtran booleanos, fracciones, unidades inválidas y valores extremos sin coerción silenciosa? |
| **INV-19** | RF-06 | Consistencia ledger ↔ balance bajo concurrencia mixta | `receipt_service.py`, `transfer_service.py`, `adjustment_service.py` | **Cobertura específica cruzada no demostrada** | ¿Una recepción simultánea a inicial o traslado entrante simultáneo a ajuste se serializa siempre sin doble conteo? |
| **INV-20** | Seguridad DB | Integridad de ledger ante UPDATE/DELETE SQL directo; mínimo privilegio | esquema 0016, roles DB/Compose, ausencia de endpoint REST mutador | **No probado en cierre** | ¿Qué rol SQL usa runtime? ¿Puede modificar histórico y cómo auditarlo? |
| **INV-21** | Seguridad/operación | Uso de DB de tests aislada y limpieza limitada a tenant | `test_*_concurrency_integration.py`, fixtures de recepción | CI efímero PostgreSQL 16; desarrollo local compartido | ¿Alguna fixture borra más que su tenant? ¿Config permite accidentalmente tocar base real? |
| **INV-22** | UX/DX | Estado de error y contratos de reintento consistentes | routers E2-5, OpenAPI, Pydantic | tests HTTP/Swagger | ¿La aplicación cliente puede distinguir causa de 409 sin parsear texto libre? Registrar como riesgo, no cambiar API sin decisión |
| **INV-23** | Arquitectura | Nuevos patrones/abstracciones solo cuando eliminan problemas reales | routers → services → modelos | revisión estática y tests | ¿AI introduciría otro almacén editable, commits escondidos, AsyncSession o duplicaría interfaces? |
| **INV-24** | Documentación | RF-06, CU-08/09/11, UML 03B AS-IS/TO-BE, CI/QA atribuidos bien | 01–05, ADR-004, documentos E2-5 y cierre | matriz manual documentada | ¿Se atribuye backend real a frontend DEMO, se interpreta 840 como cobertura total o se mezclan SHAs? |

## 3. Matriz RBAC que debe probarse contra API y políticas

| Operación | Titular/Admin con membresía activa | Encargado activo y asignado | Trabajador activo y asignado | Restricciones adicionales |
|---|---|---|---|---|
| POST traslado | Permitido en ambas ubicaciones STORE | Permitido **solo si asignado a ambas** | Permitido **solo si asignado a ambas** | Empresa y ubicaciones activas, catálogo físico activo, saldo suficiente |
| POST stock inicial | Permitido | **Prohibido** | **Prohibido** | Sin saldo ni movimiento previo en el par, versión 0 |
| POST ajuste entrada/salida | Permitido | Permitido **solo asignado a esa sede** | **Prohibido** | Balance existente y versión actual, sin negativo |
| GET saldos/ledger | Membresía empresarial activa | Según política de lectura, verificar en `ReceiptService` | Según política de lectura, verificar en `ReceiptService` | Filtro por tenant; no suponer permisos STORE por estar autenticado |
| GET comprobante traslado/ajuste | Membresía empresarial activa | Verificar permiso exacto y condiciones actuales | Verificar permiso exacto y condiciones actuales | Investigar si basta VIEW o se exige haber operado; no inventar política |

Asegurarse de comprobar cambios de rol/asignación/empresa y reintentos históricos **después** del cambio. El comportamiento de lectura puede ser deliberadamente más amplio que la escritura: la auditoría debe contrastarlo con la regla de negocio, no elevar un 200 de lectura a vulnerabilidad por defecto.

## 4. Modelo SQL y contraejemplos que debe inspeccionar la segunda IA

Comprobar desde PostgreSQL 16 y SQLAlchemy:
- `inventory_operations`: restricción de dirección por `kind`; `business_id`/`id`/`kind` y FK compuesta al ledger; unicidad de request por tenant; actor de membresía del mismo negocio; motivo y unidades.
- `stock_movements`: `COMPRA_RECEPCION` usa recibo+línea y delta positivo; `TRASLADO_*` usa cabecera `TRASLADO`; `AJUSTE_*` y `STOCK_INICIAL` tienen signo correcto. Ningún movimiento con ambos orígenes ni con origen indeterminado.
- `stock_balances`: clave triple; cantidad no negativa, límite máximo, versión positiva y progresiva a través de servicios.
- **Límite SQL que NO se debe ocultar:** CHECK/FK no garantizan por sí solos que la magnitud/ubicación de cada movimiento manual coincida con todos los atributos de su cabecera, ni que una operación tenga exactamente dos eventos; el **servicio y las pruebas** sostienen esas garantías. Auditar si existe un camino alternativo con privilegios DML que rompa el contrato y cómo limitarlo.
- **Idempotencia:** la huella se calcula con JSON normalizado y ordenado; la clave UUID4 no es un secreto pero su valor de QA real no se publica. Probar `actor`, `kind`, `digest`, `business_id`, concurrencia y colisiones.
- **No borrar/editar las migraciones previas:** para endurecer el esquema, nuevas migraciones compatibles y plan de rollback lógico que respete registros existentes.

## 5. Matriz de resultados esperados (sin hacer de la auditoría una formalidad)

| Caso | Resultado actual esperado | Qué debe observar |
|---|---|---|
| Traslado nuevo 4 de 10 | `201` | Origen 6, destino 4, dos eventos neto 0 |
| Replay exacto traslado | `200` | Igual cabecera y mismos ids; sin evento nuevo |
| Traslado 7 desde saldo 6 | `409` | Sin mutación parcial |
| Inicial de par nuevo | `201` | Versión 1, evento positivo |
| Replay exacto inicial | `200` | Recupera cabecera original sin nueva fila |
| Segundo inicial con clave nueva | `409` | Histórico intacto incluso si llega a cero |
| Ajuste +2 sobre v1 | `201` | Saldo 7, versión 2 |
| Ajuste -1 sobre v2 | `201` | Saldo 6, versión 3 |
| Salida 7 desde saldo 6 | `409` | Sin nuevo movimiento |
| Ajuste con v1 tras v3 | `409` | Sin cambio de saldo ni ledger |
| Cualquier recurso de otro tenant | `404` o denegación conforme al contrato | Sin fuga de datos ni escritura cruzada |
| Sesión inválida/revocada | `401` | Sin efectos comerciales |
| Datos Pydantic inválidos | `422` | Sin efecto; no aceptar decimal/boolean como cantidad |
| Acceso no autorizado | `403` en empresa propia | No confundir con 404 de tenant ajeno |

## 6. Riesgos a revisar sin convertirlos en implementaciones automáticas

**En alcance de auditoría:** race mix traslados/ajustes/recepciones, permisos durante reintentos y revocación, SQL directo del ledger/roles DB, aislamiento de fixture test, saturaciones/errores, discrepancia entre docs, esquema, contratos y reglas.

**Fuera del desarrollo de E2-5:** reservas/ventas `RF-07`, multimoneda, parcial de recepción, redondeo general nuevo, motivo tipificado/aprobaciones y reversión vinculada (decisiones posteriores). **Se pueden recomendar**, pero NO introducir sin autorización y evaluación de compatibilidad.

**Resultado que se exige al auditor:** para cada INV-xx, registrar `INSPECCIONADO + evidencia`, `NO INSPECCIONADO + motivo` o `NECESITA TEST`. Ningún `OK` global sin matizar verificaciones faltantes.
