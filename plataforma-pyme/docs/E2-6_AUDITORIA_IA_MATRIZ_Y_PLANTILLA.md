# E2-6 — Matriz de auditoría independiente, evidencias y plantillas

**Propósito:** instrumento de trabajo para la IA auditora. **No es una auditoría efectuada ni una lista de fallos confirmados.**  
**Fecha:** 2026-11-09.  
**Rama:** `feature/e2-6-ventas-integradas`.  
**Ámbito:** `plataforma-pyme/`; ventas E2-6 y dependencias directas.  
**Documento de encargo:** [E2-6_AUDITORIA_IA_PROMPT_MAESTRO.md](E2-6_AUDITORIA_IA_PROMPT_MAESTRO.md).

## 1. Ficha de trazabilidad que debe completar el auditor

| Dato | Valor que debe registrar la IA |
|---|---|
| URL repositorio | `https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026` |
| Rama de análisis | `feature/e2-6-ventas-integradas` |
| SHA de `main` efectivamente consultado | **Completar** |
| SHA exacto de la rama auditada | **Completar** |
| Merge-base exacto y comparación `main...feature` | **Completar** |
| Fecha/hora UTC de lectura | **Completar** |
| Modalidad | Solo lectura |
| Archivos consultados y archivos inaccesibles | **Completar con paths exactos** |
| Tests ejecutados en base aislada | **Completar o «no ejecutados»** |
| CI consultada y SHA de esa ejecución | **Completar o «no consultada»** |
| Restricciones / evidencia ausente | **Completar** |

**Regla:** la referencia documental inicial es `130d0c14f6d26248df96f65c3f6d12ba5fba8341`, pero el paquete de auditoría agrega commits documentales. El auditor debe registrar el **HEAD real leído**, no copiar mecánicamente ese SHA.

## 2. Matriz completa de controles

Para cada fila: anotar `OK`, `FALLO`, `RIESGO` o `NO VERIFICADO`, archivo:líneas y test/evidencia que respalda el juicio. **OK no implica demostración exhaustiva**.

| ID | Dimensión | Control específico | Evidencia mínima que buscar | Estado / hallazgo |
|---|---|---|---|---|
| C01 | Tenant | Catálogo, ventas, ubicación, saldo y movimientos pertenecen al business_id autorizado | Queries con `business_id`, FK compuestas, test cross-tenant | Pendiente |
| C02 | Sesión | Usuario/sesión revocados no pueden crear/leer indebidamente | Dependencias AuthContext, locks, tests sesión | Pendiente |
| C03 | Membresía | Roles y membresía activa controlan POST y GET | `PurchaseService._authorize`, `own_business`, tests | Pendiente |
| C04 | Ubicaciones | SELL/STORE, ubicación activa/capacidades, asignaciones activas | `can_operate_at_location`, bloqueo de sede | Pendiente |
| C05 | Carreras en autorizaciones | Revocación concurrente de asignaciones, permisos y estado operativo | Dos sesiones PostgreSQL; orden de locks | Pendiente |
| C06 | Catálogo | Estado ACTIVO, sellable, unidad y tipo, validación previa a debitar | `CatalogItem`, validación del servicio | Pendiente |
| C07 | Cantidades | Milésimas positivas, discretas en múltiplos de 1000, máximos | Validadores y CHECK SQL | Pendiente |
| C08 | Montos | HALF_UP por línea, subtotal/total/descuento, enteros estrictos, máximos | Pydantic, SQL CHECK, pruebas límite | Pendiente |
| C09 | Pagos declarados | 1..6 pagos; suma exacta; no acreditación falsa ni transacción bancaria | Schemas, pagos, response, textos API | Pendiente |
| C10 | Política de precio | Diferencia de precio recibido frente a catálogo; límites de abuso por rol | Servicio, permisos, ADR | Pendiente |
| C11 | Atomicidad | Revertir comprobante, pagos, saldo y ledger ante falla en línea 2 o flush | Transaction boundaries, tests falla tardía | Pendiente |
| C12 | Stock CAS | Cantidad disponible y versión, dos ventas por última unidad | UPDATE condicional, tests concurrencia real | Pendiente |
| C13 | Ledger | Movimiento negativo por línea bien, exclusivo y ligado a sale_line | StockMovement FK y CHECK, consulta balances | Pendiente |
| C14 | Histórico | Snapshot estable de venta y saldo, GET sin mutaciones, replay posterior | `SaleView`, `balances_after`, tests | Pendiente |
| C15 | Idempotencia | Identidad por tenant, actor y digest; replay seguro; conflicto por clave | Unique constraint, hash, error 409, tests | Pendiente |
| C16 | Replay / sede cambiada | Sede pausada/STORE revocado tras venta: decisión de semántica histórica | Orden exacto de autorización y `_replay` | Pendiente |
| C17 | Interoperabilidad | Venta con recepción, traslado, ajustes simultáneos; deadlock/no pérdidas | Locks/orden, conexiones PG reales | Pendiente |
| C18 | HTTP y OpenAPI | 201/200/401/403/404/409/422, request/response, errores no filtrantes | Router, tests, OpenAPI | Pendiente |
| C19 | DDL / migración | Upgrade aditivo, origen XOR, FK tenant, downgrade protegido | Alembic y modelos E2-6 A | Pendiente |
| C20 | Regresión | Tests de B–D realmente cubren sus afirmaciones; límites no probados | 7 archivos test_sales, CI local/integración | Pendiente |

## 3. Escenarios de prueba priorizados

Separar expresamente **caso confirmado por test**, **test leído pero no ejecutado**, **reproducción manual exitosa**, **riesgo potencial** y **falta de evidencia**.

| ID | Escenario | Resultado esperado |
|---|---|---|
| T01 | Crear venta física de 2 unidades con stock 10 | HTTP 201, saldo 8, versión siguiente, 1 `VENTA_SALIDA` |
| T02 | Venta mixta bien + servicio, con split de pagos | HTTP 201, solo bien descuenta stock, suma de pagos exacta |
| T03 | Repetir misma clave/payload del mismo actor | HTTP 200, mismo ID y snapshot, ningún saldo/ledger adicional |
| T04 | Misma clave con payload o actor diferente | HTTP 409, sin escritura extra |
| T05 | Solicitar venta por encima del saldo | HTTP 409, stock y versión sin cambio |
| T06 | Dos ventas simultáneas por última unidad | Una 201 y una 409; no negativo |
| T07 | Dos reintentos simultáneos de misma clave | Un único comprobante y débito |
| T08 | Segundo artículo sin stock tras primer UPDATE | Rollback de ambos y ausencia de venta/pagos/ledger |
| T09 | Excepción SQL tras descontar y antes de commit | Rollback completo |
| T10 | Usuario sin permiso/tenant equivocado | 403/404 según contrato; cero efecto |
| T11 | Sesión y membresía revocadas antes de reintento | Acceso denegado según política |
| T12 | Asignación SELL/STORE revocada concurrentemente | Ninguna operación no autorizada confirmada |
| T13 | Misma venta recuperada tras cambio posterior de stock | Snapshot original sin mutaciones |
| T14 | Replay tras pausar ubicación | Observar y juzgar contra política histórica explícita |
| T15 | Artículo de servicio sin ubicación | Solo modalidad administrativa autorizada |
| T16 | Unidad discreta fraccionaria, float o montos desbordados | HTTP 422; ningún registro |
| T17 | Venta y recepción concurrentes del mismo artículo | Stock consistente y historial reconciliable |
| T18 | Venta y traslado concurrentes del mismo artículo | Stock consistente, sin deadlock persistente ni pérdidas |
| T19 | Venta y ajuste concurrentes del mismo artículo | Stock consistente, sin saldo negativo |
| T20 | Upgrade y check de esquema en base descartable | Alembic sin diferencias; historial E2-4/E2-5 conservado |

**Recomendación operacional:** si se ejecutan T06–T20, usar sesiones independientes contra PostgreSQL en una base aislada. No usar la base con datos que el usuario quiera conservar. No exigir ejecución real cuando el auditor carezca de entorno, pero dejar esa limitación en el informe.

## 4. Plantilla de hallazgo AUD-E26-XXX

Copiar una instancia por hallazgo. No completar con ejemplos hipotéticos como si fueran resultados reales.

```markdown
### AUD-E26-001 — [Título concreto]

- **Severidad:** Bloqueante / Alta / Media / Baja
- **Estado probatorio:** Confirmado / Probable / Hipótesis
- **Control asociado:** C__
- **Prioridad sugerida:** Antes de PR / Condicional / Diferible
- **Ubicación exacta:** `plataforma-pyme/.../archivo.py:Lx-Ly`
- **SHA auditado:** `...`
- **Regla o contrato afectado:** ...
- **Precondiciones:** ...
- **Pasos para reproducir:** 1. ... 2. ... 3. ...
- **Resultado esperado:** ...
- **Resultado observado:** ... [o "no ejecutado; inferido del flujo X"]
- **Impacto en tenants, datos, seguridad, negocio:** ...
- **Evidencia:** extracto breve, referencia a test y/o respuesta HTTP sin secretos
- **Causa probable:** ...
- **Corrección mínima propuesta (sin implementar):** ...
- **Riesgos de la corrección:** ...
- **Dependencias de E2-1 a E2-5:** ...
- **Test de aceptación propuesto:** ...; debe fallar antes y pasar luego
- **Incertidumbres que requieren decisión de negocio:** ...
- **Decisión del equipo (llenar después):** Aceptar / Ajustar / Diferir / Rechazar
- **Motivo y responsable (después):** ...
- **SHA de corrección (después):** ...
- **Resultado de regresión y CI (después):** ...
```

## 5. Plantilla de matriz de decisión selectiva del mantenedor

Este cuadro **no** debe completarse automáticamente por la IA auditora como autorización de implementar.

| ID del hallazgo | Estado probatorio | Severidad | Recomendación auditor | Decisión mantenedor | Motivo | Test de aceptación | SHA fix | Verificación |
|---|---|---|---|---|---|---|---|---|
| AUD-E26-001 | Pendiente | Pendiente | Pendiente | **Sin decidir** | — | — | — | — |

Reglas de clasificación:

- **Aceptar:** defecto reproducible y dentro de alcance; corrección mínima con test.
- **Ajustar:** existe problema real pero se requiere solución menos disruptiva.
- **Diferir:** riesgo fundado no bloqueante o necesidad posterior fuera de MVP; explicitar condición y tarea futura.
- **Rechazar:** evidencia insuficiente, falso positivo, regresión injustificada o exigencia fuera de alcance; conservar argumentación.
- **Bloquear merge:** hallazgo crítico o alto confirmado no resuelto, violación de aislamiento o corrupción de stock, regressión crítica, CI final rojo.

## 6. Plantillas de archivos a entregar

Para evitar un informe genérico, la IA debe producir cinco Markdown independientes:

```text
AUD-E26-00_RESUMEN_EJECUTIVO.md
AUD-E26-01_MATRIZ_DE_CONTROLES.md
AUD-E26-02_HALLAZGOS.md
AUD-E26-03_PLAN_SELECTIVO.md
AUD-E26-04_EVIDENCIA_Y_LIMITES.md
```

Mínimos:

- **00:** SHA, cobertura, estado aptitud (apto, apto con correcciones, no apto, no evaluable), top riesgos con evidencia, qué se inspeccionó y qué queda pendiente.
- **01:** completar C01–C20, con referencias de archivo/test y limitaciones.
- **02:** todas las instancias AUD-E26; si no hay hallazgos, explicitar «sin hallazgos reproducibles en alcance inspeccionado».
- **03:** propuesta mínima ordenada por riesgo, alcance de cada corrección y test asociado, sin ejecutarla.
- **04:** inventario de archivos leídos, diff real, logs/comandos de pruebas ejecutadas, CI de SHA preciso, fecha y fuentes; separar lo no comprobado.

## 7. Lista de control antes de aceptar el informe

- [ ] La IA identifica el repo, rama y SHA que realmente examinó.
- [ ] Reporta la comparación `main...feature` y la persistencia A que ya existe en main.
- [ ] Leyó archivos centrales, la migración, contratos y pruebas relevantes, o declaró cada ausencia.
- [ ] No confunde ausencia de función futura con incumplimiento del MVP.
- [ ] Ningún hallazgo grave carece de archivo:línea, causalidad y resultado verificable.
- [ ] Distingue riesgo hipotético de fallo confirmado.
- [ ] Aborda concurrencia y revocación de permisos, no solo datos válidos.
- [ ] Propone tests concretos y una corrección mínima por hallazgo.
- [ ] No ha modificado repositorio ni datos reales.
- [ ] Devuelve cinco artefactos separados con matrices y decisiones pendientes.
- [ ] No presenta CI verde de SHA diferente como validación final de un futuro fix.
- [ ] El equipo conserva la potestad de corregir solo hallazgos aceptados.

## 8. Cierre esperado del proceso, posterior a la auditoría

Recibida la auditoría, el mantenedor registrará la decisión de todos los hallazgos, implementará correcciones aceptadas **únicamente en** `feature/e2-6-ventas-integradas`, ejecutará tests focalizados + regresión en PostgreSQL aislado, verificará `alembic current/check` y GitHub Actions del SHA final; luego revisará un único PR hacia `main` y fusionará solo después de la aprobación explícita.

**No realizar esta secuencia dentro del encargo de auditoría.**
