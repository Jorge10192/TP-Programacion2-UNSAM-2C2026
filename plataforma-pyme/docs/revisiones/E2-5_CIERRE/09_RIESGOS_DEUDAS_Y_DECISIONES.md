# E2-5 — Riesgos, deuda técnica y decisiones pendientes de revisión

**Criterio:** separar **bug demostrado**, **riesgo fundamentado**, **deuda funcional** y **mejora opcional**. Las prioridades son una **propuesta** y no orden de programación aprobado.

## 1. Riesgos y pendientes

| ID | Prioridad orientativa | Clasificación | Hallazgo / límite | Acción propuesta (fuera de este ZIP) |
|---|---|---|---|---|
| E25-P01 | **P1** | Seguridad operativa: exposición de credencial en conversación | Se compartió una vez un encabezado Bearer real en un `curl`. El valor **no** figura en este paquete. No hay comprobante aportado de revocación. | **Confirmar revocación de aquella sesión** y reautorización segura, evitando replicar el token en informes; revisar otras capturas/exports antes de publicar. |
| E25-P02 | **P1** | Riesgo de ambiente QA | Test runner local admite PostgreSQL de desarrollo según configuración; test con rollback por tenant no sustituye DB aislada de manera física. | Configurar DB de tests efímera dedicada y chequeo fail-closed contra producción; no borrar datos QA existentes. Heredado de E2-4. |
| E25-P03 | **P1 antes de producción** | Hardening SQL | La API no ofrece editar/borrar movimientos históricos, pero no se demuestra que un rol con `UPDATE/DELETE` SQL pueda ser impedido por triggers/política de permisos. | Aplicar least privilege al usuario de runtime, revisar DML y considerar mecanismo DB de inmutabilidad; probar migración compatible. |
| E25-P04 | **P1 antes de ampliar inventario** | Robustez / integridad | No existe conciliación programada de `stock_movements` contra `stock_balances`; ante escritura SQL externa privilegiada no hay rutina de diagnóstico publicada. | Crear consulta/reportes de discrepancias **sin autorreparación silenciosa**; escenarios con concurrencia y errores. |
| E25-P05 | **P1 para RF-07** | Funcionalidad diferida | La venta backend todavía no descuenta bienes físicos ni conserva idempotencia de egreso comercial. | Definir ventas transaccionales, pagos declarados, salidas de stock, devoluciones y permisos como **nuevo bloque**, preservando E2-5. |
| E25-P06 | P2 | Funcionalidad diferida | `STOCK_INICIAL` es creación única de primera proyección; `AJUSTE_*` aplica deltas. No existe endpoint de **conteo físico absoluto** que derive diferencia respecto de saldo observado. | Diseñar CU de conteo con cantidad observada, versión y diferencia; aclarar si el ajuste se confirma bajo revisión. |
| E25-P07 | P2 | Funcionalidad diferida | Un comando manual de E2-5 procesa un artículo; no hay ajuste/traslado por lote o lista de artículos, ni reversión compensatoria de una operación equivocada. | Diseñar agregados con atomicidad e idempotencia agregada; incluir contraoperaciones auditablemente vinculadas. |
| E25-P08 | P2 | Consistencia documental | Documentos históricos E2-5 A/B/C todavía pueden indicar «pendiente de merge/validación Windows». Encabezados acumulados de Documento 05 citan etapas anteriores. | Agregar **índice de estado actual** del cierre y referencias a evidencia, sin borrar el historial del incremento anterior. |
| E25-P09 | P2 | Seguridad/QA de roles | La sesión Swagger fue con titular QA; las pruebas de `ENCARGADO`, `TRABAJADOR`, asignaciones, tenant ajeno y carreras son principalmente automatizadas, no manuales. | Auditoría independiente de permisos, sesiones, revocación y rutas de lectura; generar tenants de prueba efímeros. |
| E25-P10 | P2 | Alcance UI e integración | React tiene pantallas DEMO; no se probó integración productiva React ↔ API E2-5, manejo de sesión, carga/error/red en interfaz. | Fase de gateway API/estado React por empresa, control de respuestas obsoletas y E2E. |
| E25-P11 | P2 | Warning de CI | C en `main` pasó con warnings de pytest (4 en Python 3.12, 2 en 3.14). No son fallos, pero no se revisaron en este cierre en detalle. | Clasificar cada warning y su impacto antes de declarar una política de cero advertencias. |
| E25-P12 | P3 | Reproducibilidad | Las pruebas manuales están reportadas como códigos y respuestas de conversación; no existe video/artefacto de ejecución independiente ni snapshot firmado de la DB. | En auditoría formal, repetir sobre un ambiente efímero identificado con SHA y registrar resultados saneados. |

## 2. Observaciones que NO deben transformarse en bugs sin evidencia

- El `422` inicial al registrar una compra con `quantity_milli=1` para `UNIDAD` indica **validación correcta**, no falla de cálculo.
- El `401` al intentar stock inicial sin cabecera Bearer indica **autorización faltante/sesión inválida**; el reintento autenticado fue `201`, no hay evidencia de fallo de stock.
- La falta de `STOCK_INICIAL` en una ubicación que **ya** recibió mercadería es comportamiento intencional; no es un defecto.
- Un saldo de cantidad cero **registrado** y la ausencia de balance son estados distintos, por diseño.
- Un `200` al repetir un POST no significa una segunda operación: los IDs de comprobante/movimiento no cambiaron.
- La ausencia de venta/caja real en E2-5 no es una regresión del inventario: es alcance de otro bloque.

## 3. Decisiones propuestas antes del siguiente desarrollo

1. **Aprobar/corregir el alcance de E2-5** y no expandirlo inadvertidamente mientras se revisa.
2. **Clasificar primero hallazgos de auditoría** sobre permisos, invariantes SQL, concurrency y documentación, con evidencia reproducible, antes de decidir refactor.
3. **No reescribir migraciones ya aplicadas**. Si una mejora necesita SQL adicional, diseñar migración nueva y compatible.
4. **No crear otro origen editable de stock** por pantalla ni escribir saldos directamente desde frontend.
5. **Mantener cantidad exacta en milésimas, dinero en centavos** y comportamiento de reintento por empresa/actor/cuerpo.
6. **No priorizar ventas por automatismo**: evaluar primero si hay hallazgos P1 de E2-5 y acordar la secuencia del MVP.

## 4. Dependencias para una eventual auditoría formal

Se recomienda fijar: commit exacto, alcance solo E2-5 A–C, base anterior E2-4 como dependencia, consigna y documentos 01–05, ADR-004, archivos de tests/servicios y esta evidencia QA saneada. La guía general existente es `docs/revisiones/GUIA_MAESTRA_REVISION_BLOQUES_E2_ASISTENTE_PYME.md`. **El documento específico de encargo ahora está preparado** en [E2-5_ENTREGA_PARA_REVISION.md](../E2-5_ENTREGA_PARA_REVISION.md) y [E2-5_AUDITORIA/](../E2-5_AUDITORIA/00_LEEME_Y_PRECONDICIONES.md), pero **no aprobado, enviado ni ejecutado**; debe revisarse y publicarse el cierre antes de entregarlo.

## 5. Repriorización v1.1 a raíz de revisión externa asistida por IA

Esta revisión **no es evidencia de nuevos bugs reproducidos**. Para cada propuesta, la clasificación, prioridad y aceptación/rechazo se explican en [13_EVALUACION_OBSERVACIONES_IA.md](13_EVALUACION_OBSERVACIONES_IA.md). Se incorporan los siguientes trabajos con alcance acotado:

| ID | Prioridad propuesta | Trabajo y decisión |
|---|---|---|
| E25-P13 | P1 antes de producción | Revisar **privilegios reales del rol SQL runtime** y mecanismo de inmutabilidad de `stock_movements`/operaciones, compatible con migraciones y limpieza de tests; no afirmar que triggers solos bloquean al DBA/superusuario. |
| E25-P14 | P1 antes de operación multiusuario | Diseñar política para **mermas negativas**: revisión/umbral por tenant/rol, bitácora de aprobaciones y separación de funciones; no fijar ARS 500 arbitrarios ni dar por probado fraude. |
| E25-P15 | P2 | Proponer `reason_code` estable + observaciones sin borrar `reason` histórico; su clasificación y migración deben ser compatibles. |
| E25-P16 | P2 | Diseñar **reversión compensatoria vinculada** a la operación original, con FK tenant y control de cantidad disponible, sin editar ledger histórico. |
| E25-P17 | P2 para integración UI | Mensajes de `409` diferenciables mediante códigos de error estables (evaluar **RFC 9457**), refrescar saldo/version y permitir reintento deliberado del usuario; conservar contrato hasta acordar evolución. |
| E25-P18 | P2 | Añadir pruebas de **intercalación traslado vs. ajuste en mismo destino** y casos de saturación/desborde; no atribuir a E2-5 un bug de pérdida de stock sin reproducción. |
| E25-P19 | P2 sujeto a uso real | Evaluar tope `quantity_milli <= 999999999` por operación; si limita rubros a granel, rediseñar límite en API, modelo y SQL conjuntamente sin fragmentar una transacción comercial arbitrariamente. |
| E25-P20 | P2 en RF-05 | Evaluar recepción parcial/multidestino, trazabilidad de cantidad restante y límites de 30 líneas; cambiar modelo con migración nueva, no editar E2-4 aplicado. |
| E25-P21 | P2 en RF-05 | Evaluar snapshot explícito de moneda/tasa y conciliación de `HALF_UP` **por línea**, preservando el contrato monetario existente hasta decisión. |
| E25-P22 | P2 solo si reservas son requisito | Estudiar reservas de stock ligadas a pedido con vencimiento/idempotencia para RF-07 futuro. Un débito de venta **atómico condicional** puede evitar overselling incluso sin `reserved_milli`; reserva es otro requisito de negocio. |

**No adoptar:** imponer `expected_version` obligatorio a los dos extremos de cada traslado sin justificar cambio contractual; reejecutar `STOCK_INICIAL` sobre saldo 0 con historial; sustituir `Session` síncrona por ejemplos `AsyncSession` ajenos al código; cambiar `409` por `422` indiscriminadamente; eliminar límite de 30 líneas sin política de tamaño/atomicidad; aplicar `total_cents` redondeado en global mientras líneas se redondean por separado sin regla de conciliación.


## 6. Relación entre deudas duplicadas para evitar implementaciones redundantes (v1.2)

- **Integridad SQL:** `E25-P03` es el riesgo inicial; `E25-P13` desarrolla una propuesta de mitigación. **Es una sola familia de trabajo**, no dos features independientes.
- **Operaciones compensatorias:** `E25-P07` agrupa procesos por lote y reversión como deuda general; `E25-P16` concreta la reversión vinculada. Si se aprueba, **unificar en un único requerimiento de reversión**, independiente del trabajo de lotes.
- **Reconciliación ledger/saldos:** `E25-P04` es un problema distinto de los permisos SQL de `P03/P13`: detectar divergencias no reemplaza impedir alteración y viceversa.
- **RF-07:** `E25-P05` cubre venta confirmada y egreso atómico; `E25-P22` evalúa reservas solamente si se aprueban pedidos o carritos. **No son requisitos intercambiables.**
- **Presentación de errores:** `E25-P17` corresponde al contrato de integración frontend y no debe corregirse cambiando masivamente HTTP 409 por 422 sin versionado.

**No abrir cinco PR sobre la misma causa raíz**: el auditor debe cotejar estos IDs, aportar evidencia y proponer plan/ADR con criterios de aceptación antes de modificar el backend.
