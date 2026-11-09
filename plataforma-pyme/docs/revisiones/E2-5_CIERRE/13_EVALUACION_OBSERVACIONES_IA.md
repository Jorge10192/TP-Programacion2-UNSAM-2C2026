# E2-5 — Evaluación crítica de observaciones de otra IA (sin refactor de código)

**Fecha:** 09/11/2026. **Estado:** evaluación técnica interna y plan de verificación, **no** auditoría independiente ni pruebas nuevas ejecutadas.  
**Código de referencia:** `main`, SHA `748e69319d8d04900c009d5184168a264a9deeac`; E2-5 A/B/C, PR #21, #22 y #23.  
**Fuente de las observaciones:** dos textos proporcionados por el desarrollador el 09/11/2026, que plantean concurrencia, stock inicial, reversión, trazabilidad, límites comerciales y controles de seguridad. Se evalúan como **propuestas, no como fallos confirmados**, y se confrontan con servicios, esquemas, migraciones y pruebas de `plataforma-pyme/backend`.

## 1. Dictamen ejecutivo

**Se mantiene el cierre funcional acotado de E2-5 A–C:** existe evidencia CI/QA para los comandos implementados. La revisión recibida **no demuestra** en sus ejemplos un saldo negativo, movimiento duplicado o pérdida de actualización. Aporta, sin embargo, riesgos para operación real y ampliaciones futuras que deben convertirse en decisiones de diseño o pruebas reproducibles. No hay justificación para modificar las migraciones aplicadas, los contratos HTTP ni los saldos de QA a partir de estos textos.

No adoptar por inercia los rótulos «P0» de la revisión: un P0 exige un fallo crítico reproducible, no la coexistencia de mecanismos correctos de serialización y control de versión. El límite de este documento es **analizar y priorizar**, sin certificar producción.

## 2. Matriz de observaciones, contraste y decisión

| ID | Observación externa | Contraste con implementación | Clasificación / prioridad propuesta | Decisión documental |
|---|---|---|---|---|
| **OBS-01** | Traslado carece de `expected_version` a ambos extremos y compite con ajustes | `TransferService.transfer` bloquea ambas ubicaciones en orden UUID, debita origen condicionalmente y acredita destino con UPSERT + incremento de versión. `AdjustmentService.adjust` bloquea ubicación y saldo y valida `expected_version`. Una versión que cambia genera **409 esperado**, no escritura perdida demostrada. | Riesgo de UX/cobertura adicional, **P2**; **no bug P0 demostrado** | Mantener comportamiento; documentar relectura y crear test específico de carrera cruzada |
| **OBS-02** | Permitir nuevo `STOCK_INICIAL` si saldo registrado llega a 0 | La unicidad histórica inicial es una **regla deliberada**: saldo cero con historial no equivale a un artículo nunca inicializado. El backend y tests lo rechazan. | Cambio de semántica propuesto, **no bug** | **No cambiar**; reabastecer por recepción/traslado/ajuste de entrada. Proponer conteo físico absoluto distinto |
| **OBS-03** | Falta reversión o anulación explícita de operaciones equivocadas | No hay endpoint que referencie y compense una operación previa. Se puede registrar ajuste separado, pero no liga causalmente el error. | **Deuda funcional de trazabilidad P2**, subir a P1 si se exige antes de producción | Diseñar **operación compensatoria** con referencia al origen, control de cantidad, versión, roles e idempotencia. No borrar ni editar el movimiento original |
| **OBS-04** | `reason` libre impide agrupar mermas por causa | El motivo obligatorio 3–500 caracteres sí deja evidencia narrativa; no ofrece categoría estable para analítica. | **Mejora válida P2** | Evaluar `reason_code` tipado + `reason`/comentario conservado; migración aditiva, compatibilidad con historia |
| **OBS-05** | Encargado puede registrar mermas negativas sin doble aprobación | `AdjustmentService.adjust` permite `AJUSTE_SALIDA` a titular/admin o `ENCARGADO` asignado con permiso STORE; `TRABAJADOR` no. Hay trazabilidad de actor, pero no aprobación dual ni umbral. | **Riesgo de control interno P1 antes de producción**; no hay fraude demostrado | Diseñar límites y aprobación por tenant/rol, auditoría de revisiones y separación de funciones. **No adoptar el umbral arbitrario ARS 500,00** del ejemplo |
| **OBS-06** | Límite de `quantity_milli` por operación | Máximo `999999999` en comando y CHECK SQL. En magnitudes físicas muy grandes o unidades de masa pequeñas puede exigir partición; no se conoce caso de cliente que lo exceda. | **Limitación real de contrato P2** según rubro | Medir necesidad, diseñar cambio de API+SQL+pruebas; no eliminar límites o fraccionar artificialmente una operación atómica |
| **OBS-07** | Sin `reserved_milli` dos ventas concurrentes causarían sobreventa | Ventas `RF-07` no existen aún en backend. **La ausencia de reserva NO implica overselling** si la venta descuenta stock condicional y atómicamente. Reserva temporal es otra semántica de negocio. | **Dependencia futura RF-07 P2**, no bug E2-5 | Primero definir venta confirmada con débito atómico y pruebas de carrera; agregar reservas solo si se aprueban pedidos/carritos/reservas con vencimiento |
| **OBS-08** | Compras con recepción 1:1, sin parciales/multidestino | Correcto para contrato E2-4 actual: recepción completa y única en una ubicación. No constituye regresión E2-5. | **Extensión comercial RF-05 P2**, fuera de E2-5 | Analizar `PurchaseReceiptLine` y 1:N mediante migración compatible, sin modificar comprobantes ya recibidos |
| **OBS-09** | Compras sin moneda/tasa histórica | La especificación vigente monetaria de esta API fija centavos enteros ARS; no hay soporte multidivisa acordado. | **Extensión RF-05 P2**, no bug del recorte ARS | Definir divisa de precio/factura/pago, tasa fuente/fecha, política de snapshots y compatibilidad antes de una migración |
| **OBS-10** | Redondeo `HALF_UP` por línea difiere del global | El contrato de compras **elige explícitamente** `HALF_UP` por línea y suma de subtotales. Cambiar solo cabecera a redondeo global puede generar `total_cents != suma(line_total_cents)`. | **Decisión comercial futura P2**, no error de implementación demostrado | No cambiar cálculo sin conciliación validada con proveedor/contabilidad y pruebas de exactitud/regresión |
| **OBS-11** | Ledger no inmune a `UPDATE/DELETE` SQL directo | API no publica edición/borrado del ledger, pero un rol SQL privilegiado podría modificarlo. No se acreditó configuración definitiva de privilegios ni triggers. | **Riesgo de integridad SQL P1 antes de producción**, no incidente probado | Revisar permisos DBA/runtime, separación de roles, protección DML, auditoría y posible trigger con nueva migración; considerar fixtures/test cleanup y procedimiento de mantenimiento |
| **OBS-12** | Múltiples errores usan `409` y no poseen código máquina estable | HTTP 409 para conflicto de estado, insuficiencia y concurrencia es defendible. Respuestas `detail` textuales dificultan UX si se deben analizar literalmente. Revisión cita RFC 7807; **la versión vigente es RFC 9457**. | **Mejora DX P2** | Evaluar errores con código estable y formato compatible con RFC 9457, conservando códigos hasta versionado/acuerdo; no cambiar 409 por 422 indiscriminadamente |
| **OBS-13** | Límite de 30 líneas de compra insuficiente para algunos rubros | `CreatePurchaseRequest.lines` limita a 30; protege tamaño y costo, pero podría restringir facturas extensas. | **Límite contractual RF-05 P2** sujeto a caso real | Medir uso, evaluar importación/batch/solicitudes grandes bajo límites y atomicidad; no quitar tope sin controles |
| **OBS-14** | Refactor de ejemplo a `AsyncSession` y `FOR UPDATE` universal | El proyecto usa SQLAlchemy **síncrono** (`Session`). Ya combina locks y operaciones SQL atómicas con orden por ubicación. El pseudocódigo externo no es un parche compatible ni considera saldo aún inexistente por UPSERT. | **Propuesta no aplicable directamente** | No copiarla como código. Diseñar cualquier refactor con contratos y pruebas reales de PostgreSQL |

## 3. Concurrencia: qué está garantizado y qué falta comprobar

### 3.1. Semántica de la versión

`version` es un número monotónico de la **proyección por empresa, ubicación y artículo**. Los traslados, recepciones y ajustes que afectan la fila incrementan la versión. En el ajuste, `expected_version` significa «lo decido sobre el saldo que vi». Si un traslado modifica ese saldo antes de confirmar el ajuste, **el rechazo por versión obsoleta es correcto incluso cuando habría cantidad suficiente**: la diferencia física que se pretendía corregir puede haber dejado de ser cierta.

No es correcto interpretar ese `409` como «el traslado sobrescribió el ajuste». Los candados transaccionales de ubicación serializan los cambios en la misma sede, y el ajuste vuelve a leer la fila bajo lock. El traslado, en cambio, opera sobre cantidades y existencias actuales y rechaza el débito cuando no alcanza: no se prometió en su contrato una fotografía de origen/destino suministrada por el operador.

### 3.2. Prueba faltante recomendada

La suite actual valida carreras entre **dos traslados**, **dos ajustes**, **dos inicializaciones**, replay simultáneo y un ajuste con versión obsoleta tras traslado. **No se afirma que incluya una intercalación paralela específicamente entre un traslado entrante y un ajuste sobre el mismo saldo destino.** Agregar en un futuro PR de código una prueba con dos sesiones PostgreSQL/HTTP y barrera que confirme:

1. Con versión previa conocida, si traslado confirma primero, ajuste con versión vieja da **409**, sin movimiento nuevo; el saldo refleja solo el traslado.
2. Si ajuste confirma primero con versión vigente, traslado debe observar el resultado, y ambos pueden confirmarse cuando hay stock válido; las versiones aumentan y los deltas coinciden.
3. Bajo cualquier orden de carrera, nunca hay saldo negativo, doble movimiento ni discrepancia entre ledger y saldos; sin `500` ni deadlocks.
4. El test utiliza exclusivamente tenant efímero propio, sin borrar datos de desarrollo ni producción.

**No ejecutado** como parte de esta revisión documental. La diferencia debe quedar visible para quien audite el bloque.

## 4. Cero unidades ≠ primera existencia

Reclasificar el planteo de «bug de stock inicial» como **requerimiento de UX pendiente**:

- `STOCK_INICIAL`: evento único de alta histórica para combinación empresa/ubicación/artículo sin balance ni ledger previos, `expected_version=0`.
- `AJUSTE_ENTRADA`: agrega unidades a un saldo previo, incluido el caso de saldo 0 y versión positiva, exigiendo motivo y versión actual.
- Compra/recepción o traslado entrante: otras vías explícitas de reabastecimiento del mismo bien.
- **Conteo físico absoluto**: propuesta futura para introducir cantidad observada y calcular ajuste firmado en servidor; no debe confundirse con inicialización.

Si la UI desea presentar una acción común «Registrar conteo» puede seleccionar el comando correcto **con información de historial/version** y confirmar al usuario los efectos; no debe ocultar cambios de permiso ni derivar un `STOCK_INICIAL` de saldo cero.

## 5. Seguridad e inmutabilidad: evitar soluciones ilusorias

Un trigger `BEFORE UPDATE OR DELETE` puede impedir mutaciones de filas en el ledger a un rol normal con DML, pero **no garantiza** protección ante un administrador de base o superusuario capaz de alterar/quitar el trigger. Tampoco reemplaza privilegios mínimos, auditoría de acceso, respaldo, control de migraciones y reconciliación periódica.

Antes de producción se recomienda un plan compatible que identifique **qué rol ejecuta la API** y qué necesita sobre `stock_movements` e `inventory_operations`; separe rol migrador del rol de ejecución; evalúe triggers/revocaciones de permisos y garantice pruebas y mantenimiento sin borrar un histórico real. La solución debe considerar que la suite de concurrencia limpia solo tenants creados por sus fixtures.

Para ajustes negativos, una doble aprobación evita algunos abusos pero introduce estados operativos, pendientes y exigencias de consistencia. No añadir `PENDIENTE_APROBACION` a la cabecera actual sin diseñar sus transiciones, idempotencia, permisos y efecto sobre saldo. Un coste de referencia editable **no es automáticamente un valor financiero auditable** para calcular un umbral; requiere snapshot de costo o reglas por negocio.

## 6. Aceptación y siguientes pasos

Se recomienda mantener esta evaluación **junto al cierre documental**, pero tratarla como respuesta a propuestas externas, no como hallazgos de auditoría independiente. Los cambios propuestos requieren:

- Decisión explícita de alcance y prioridades para un PR de código posterior.
- Criterios de aceptación reproducibles, suites de regresión y permisos por tenant/rol.
- Migración aditiva nueva cuando afecten columnas, estados o CHECK ya aplicados; no reescribir `e25a_inventory_ops` ni E2-4.
- Revalidación en Windows + CI PostgreSQL/Python antes de fusionar cualquier cambio funcional.
- Aprobación separada de cierre definitivo y **uso posterior del encargo de auditoría formal ya preparado, todavía no ejecutado**, conforme a `GUIA_MAESTRA_REVISION_BLOQUES_E2_ASISTENTE_PYME.md`.

**Bibliografía interna y fuente de verdad:**
- `backend/app/modules/purchases/transfer_service.py`, `transfer_schemas.py`, `adjustment_service.py`, `adjustment_schemas.py`, `receipt_service.py`, `schemas.py`.
- `backend/app/infrastructure/models/{inventory_operation,stock_balance,stock_movement}.py` y migración `20261109_0016_inventory_operations.py`.
- `backend/tests/test_{transfer,adjustment,receipt}*_integration.py`, CI de merge [E2-5 A](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42601062105), [E2-5 B](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42604071018), [E2-5 C](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42617212795).


## 7. Dependencia del proceso independiente (adenda v1.2)

La revisión crítica de esta hoja **no debe sesgar al auditor hacia aceptar las decisiones de la IA autora**. La [hoja formal E2-5](../E2-5_ENTREGA_PARA_REVISION.md) y el [prompt autónomo de auditoría](../E2-5_AUDITORIA/03_PROMPT_MAESTRO_AUDITOR_IA.md) exigen que el auditor inspeccione primero fuentes y tests y solo después lea estas observaciones; puede discrepar con evidencia. No se añadieron tests ni se modificaron servicios por esta evaluación documental.
