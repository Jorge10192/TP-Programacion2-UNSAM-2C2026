# E2-5 — Protocolo reproducible de auditoría y plan de pruebas

**Importante:** esto es **un plan para el auditor**, NO evidencia de tests adicionales ejecutados durante el cierre. El auditor debe conservar logs saneados, SHA, ambiente y resultados efectivos de cada prueba.

## 1. Puerta de entrada: aislamiento y trazabilidad

**Antes de ejecutar cualquier comando de prueba que escriba PostgreSQL:**
1. Clonar en directorio **independiente** y verificar `git rev-parse HEAD` y `git status --short`.
2. Identificar la URL efectiva del motor y **nombre/host/puerto de la base de datos** a la que apuntará el test runner; imprimir solo los parámetros no sensibles. Si existe duda sobre la DB, detener ejecución.
3. Levantar PostgreSQL 16 **dedicado/efímero**, con usuario y datos sin reutilizar del servidor local/producción. No reciclar el volumen QA del desarrollador. Si no se puede verificar aislamiento, marcar pruebas DB como **NO EJECUTADAS**, no forzar `RUN_DB_INTEGRATION=1`.
4. Revisar `backend/app/core/settings.py`, `backend/app/infrastructure/db.py` y las fixtures de `test_receipt_concurrency_integration.py`: algunas pruebas concurrentes crean y limpian tenants comprometidos, aunque con alcance limitado.
5. Aplicar migraciones **en la base de tests exclusivamente** según la cadena existente; `alembic current` debe mostrar `e25a_inventory_ops (head)` y `alembic check` no debe detectar deriva.
6. Para entornos compartidos, todo ensayo de INSERT/UPDATE/DELETE a nivel SQL está **prohibido**, incluso dentro de rollback “supuesto” sin verificar.

**No ejecutar:** `docker compose down -v`, `DROP`, `TRUNCATE`, `DELETE` global, `alembic downgrade`, `stamp` ni eliminación de tablas/volúmenes. Un auditor no necesita recrear la base del desarrollador para evaluar el sistema.

## 2. Verificación de código y repositorio

En clon independiente, después de aprobado y fusionado el PR documental:

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
git status --short
git rev-parse HEAD
# Fijar además SHA funcional: 748e69319d8d04900c009d5184168a264a9deeac
# Comprobar por diff si desde ese SHA solo cambió documentación.
git diff --name-status 748e69319d8d04900c009d5184168a264a9deeac HEAD -- plataforma-pyme/backend
```

**Esperado solo si main no tuvo evolución funcional posterior:** último comando sin diferencias. Si aparece cambio en backend, registrar **dos SHAs** y no atribuir tests de E2-5 al código posterior sin volver a probarlo. No se debe saltar a rama desconocida para “arreglar” evidencia.

**Lectura segura de esquema:** tras verificar conexión aislada, dentro de `plataforma-pyme/backend`:

```powershell
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
```

**Suite completa solo en DB aislada:** 

```powershell
$env:RUN_DB_INTEGRATION = "1"
try {
  .\.venv\Scripts\python.exe -m pytest -q
} finally {
  Remove-Item Env:\RUN_DB_INTEGRATION -ErrorAction SilentlyContinue
}
```

Con Python disponible y DB aislada, contrastar además las suites específicas:

```powershell
$env:RUN_DB_INTEGRATION = "1"
try {
  .\.venv\Scripts\python.exe -m pytest -q tests/test_inventory_operation_model.py tests/test_inventory_operation_integration.py
  .\.venv\Scripts\python.exe -m pytest -q tests/test_transfer_api_integration.py tests/test_transfer_concurrency_integration.py
  .\.venv\Scripts\python.exe -m pytest -q tests/test_adjustment_api_integration.py tests/test_adjustment_concurrency_integration.py
  .\.venv\Scripts\python.exe -m pytest -q tests/test_receipt_api_integration.py tests/test_receipt_concurrency_integration.py
} finally {
  Remove-Item Env:\RUN_DB_INTEGRATION -ErrorAction SilentlyContinue
}
```

Registrar si se ejecutó la suite completa o solo grupos, y no sumar conteos históricos como pruebas actuales. La base de CI de GitHub sirve como control anterior: A `816`, B `826` y C `840` en Python 3.12/3.14; los nuevos resultados pueden variar legítimamente si el auditor agregó tests.

## 3. Casos mínimos HTTP y dominio (crear **tenant y artículos nuevos**)

| Código | Escenario | Operación | Resultado que debe contrastarse |
|---|---|---|---|
| T01 | No autenticado / token vencido/revocado | GET/POST inventario | `401`, sin escritura |
| T02 | Usuario sin membresía de empresa / recurso de otro tenant | GET/POST | `404`/denegación prevista, sin revelación de datos |
| T03 | Empleado STORE en ambas sedes vs. solo una | POST traslado | éxito o `403` según asignación |
| T04 | ENCARGADO asignado vs. TRABAJADOR | POST ajuste y STOCK_INICIAL | Encargado puede ajustar pero no inicializar; trabajador ninguno |
| T05 | Catálogo servicio / INACTIVO / sede sin STORE / sede pausada | POST | Rechazo sin movimiento; diferenciar `404`/`409`/`403`/`422` según ruta |
| T06 | `UNIDAD` en cantidad no múltiplo 1000; booleano; decimal; campos extra | POST traslado/ajuste | `422`; no coerción silenciosa |
| T07 | Cantidad cero/negativa/superior al máximo, motivo vacío/normalizado | POST | `422` o código contractual, cero escrituras |
| T08 | Compra, luego recepción única | POST compra / receive / GET | Compra sola no acredita; recepción +10; lectura de documento E2-4 intacta |
| T09 | Traslado 4 de 10 | POST transfer, GET balances/movements | `201`, 6/4, dos movimientos -4/+4 y operación única |
| T10 | Replay y colisión de transferencia | igual clave+payload; igual clave+otro payload/actor | `200` replay; `409` colisión, sin duplicar |
| T11 | Origen insuficiente y destino lleno | POST transfer | `409` y rollback total; verificar ledger, cantidades y versión |
| T12 | Par sin historia, initial 5 | POST adjustment STOCK_INICIAL | `201`, evento +5, versión 1 |
| T13 | Replay initial y nuevo initial duplicado | POST misma clave; otra clave | `200` mismo documento; `409` duplicado |
| T14 | Saldo 0 **con historia** | POST STOCK_INICIAL | `409`: no equiparar a par nuevo |
| T15 | `AJUSTE_ENTRADA` 2 sobre versión 1; `AJUSTE_SALIDA` 1 sobre versión 2 | POST adjustments | `201`/`201`, 6 finales versión 3, +2/-1 |
| T16 | Salida más grande que saldo | POST AJUSTE_SALIDA | `409`, sin pérdida ni movimiento |
| T17 | `expected_version` obsoleta tras ajuste o traslado | POST adjustment | `409`, sin delta confirmado |
| T18 | Ajuste sin `StockBalance` y sin initial | POST adjustment | `409`, no se crea balance por bypass de permiso |
| T19 | UUID4 idempotente repetido en distintos tipos o con actor diferente | POST transfer vs. adjustment | `409`, límite de tenant y tipo preservado |
| T20 | Lecturas históricas GET tras cambios posteriores de balance | GET transfer/adjustment/{id} | Comprobante original estable y no reinterpretado como saldo actual |

**Clave de idempotencia:** generar valores aleatorios UUID4 **nuevos** solo en el equipo del auditor y conservarlos temporalmente durante el caso. Para reintentar usar exactamente la clave/cuerpo inicial; para una operación distinta usar clave diferente. **Nunca subir valores reales**, ni pegarlos en chats, issues, logs o capturas.

## 4. Concurrencia real — pruebas preexistentes y brechas

**Test preexistentes que deberían pasar sin modificar su semántica:**
- `test_two_simultaneous_transfers_compete_for_same_ten_units`: dos traslados de 7 sobre origen 10, uno `201` y otro `409`; fuente nunca negativa.
- `test_concurrent_replay_same_key_does_not_duplicate_stock`: peticiones idénticas 201/200, una operación y dos eventos.
- `test_opposite_direction_transfers_lock_locations_in_stable_order`: A↔B sin deadlocks ni destrucción de cantidades.
- `test_two_competing_adjustments_do_not_spend_same_version`: una versión aceptada, la rival rechazada.
- `test_identical_key_concurrent_replay_is_safe`: misma operación confirmada una vez.
- `test_concurrent_initial_stock_accepts_only_one_command`: dos initial rivales, uno aceptado y otro rechazado.

**Agregar/evaluar independientemente como potencial prueba faltante, NO como fallo demostrado:**
1. **Traslado entrante vs. AJUSTE_ENTRADA sobre el mismo balance destino:** dos clientes/sesiones/DB connections, barrera temporal y orden de commit controlado. Si traslado confirma primero, ajuste con versión leída antes debe dar `409`; si ajuste confirma primero, traslado usa saldo vigente. Comparar ledger con proyección y número de versiones.
2. **Recepción vs. STOCK_INICIAL sobre mismo artículo+ubicación inicialmente vacío:** como máximo un primer saldo reconocido; la otra operación debe comportarse según regla y serialización definida; no deben quedar duplicados de saldo ni eventos no ligados.
3. **Traslado saliente vs. AJUSTE_SALIDA en mismo origen:** stock limitado; nunca doble consumo, sin stock negativo, rollback de la operación rechazada.
4. **Reintento después de progreso**: Replay 200 aunque saldo/version cambió luego; revisar qué permisos siguen siendo necesarios y si devuelve datos fuera del alcance actual.
5. **Cambios de membresía/asignación y revocación de sesión durante operación:** verificar que locks protegen transacción y no permiten escrituras después de revocación ya efectiva. Evaluar con tests diseñados con barrera; no inferir de una prueba secuencial.
6. **Errores SQL parciales**: simular fallo entre saldo y ledger en DB efímera, verificar rollback total, sesiones limpias e idempotency key reusable cuando nada se confirmó.

Para cada carrera registrar: versión inicial de cada saldo, barrera/scheduling, HTTP por petición, IDs sanos de operación, versión final, deltas de ledger, suma de todas las ubicaciones, número de eventos y presencia/ausencia de excepciones. **Sin timings de rendimiento inventados ni tests de escalabilidad no realizados.**

## 5. Integridad SQL y hardening (ambiente efímero)

Verificar, sin poner en riesgo QA real:
- Restricciones FK tenant; `CHECK` tipo/dirección/valor/cantidad y semántica `NULL`; UNIQUE idempotente y por evento.
- Intentos de insertar una operación con `kind=TRASLADO` y origen=destino; una unidad discreta fraccionaria; evento con `operation_kind` incompatible; dos lados iguales de una operación; movimiento con doble origen; actor de tenant ajeno.
- Investigar si DDL/FK/CHECK solos dejan un camino SQL directo para vincular movimiento con **ubicación o cantidad distintas de su cabecera**. Distinguir integridad en API vs integridad ante rol SQL con DML.
- Analizar rol SQL runtime, rol migrador, permisos efectivos, posibles `UPDATE/DELETE` de ledger y eventual trigger/privilegios. **No ejecutar UPDATE/DELETE en datos ajenos.**
- Saturación de `quantity_milli`/`StockBalance`, límite de versión BIGINT, tratamiento de IntegrityError, SQLSTATE y ausencia de errores 500 con detalles sensibles.

Si la revisión encuentra una vulnerabilidad real, adjuntar **caso mínimo reproducible sin credenciales ni datos del usuario**, y proponer migración nueva/test antes de pedir implementación.

## 6. Comprobaciones de arquitectura, mantenimiento y documentos

- Verificar que router solo traduce contratos/HTTP, servicio aplica permisos y límite transaccional, y repositorio/ORM no hacen commits ocultos; sincronismo SQLAlchemy real.
- No introducir datos DEMO de React en un flujo del backend; el frontend permanece separado.
- Revisar coherencia actual de `entrega-programacion-2/01...05` y UML 03B; estados históricos se anotan, no se borran para “pasar” la auditoría.
- Verificar que pruebas parametrizadas cubren errores 401/403/404/409/422 y no ocultan fallos con `pytest.mark.skip` no declarado.
- Examinar warnings CI (C: 4 con Python3.12, 2 con 3.14) para clasificarlos; no llamarlos fallos sin evidencia.
- Evitar tests que dependen de orden global de filas o DB vacía; aislar datos/tenants y documentar fixtures de concurrencia.

## 7. Registro obligatorio por caso (plantilla breve)

| Campo | Valor |
|---|---|
| Código de caso | `T01`, `INV-01`, etc. |
| Commit funcional / documental | SHA exactos |
| Ambiente | Python, PostgreSQL, Alembic, Docker |
| Preparación | Tenant y recursos nuevos, sin secretos |
| Entrada | Parámetros sanitizados y versión del saldo |
| Esperado | Código HTTP / deltas / número de registros |
| Observado | Resultado real y referencia a log/test |
| Aprobado / falló / no ejecutado | Uno de los tres; nunca asumir éxito |
| Hallazgo vinculado | `REV-E2-5-NNN` o `Ninguno` |

Guardar las evidencias dentro del informe/PR o en artefactos de CI con control de acceso apropiado; nunca incluir dump de DB ni token de sesión.
