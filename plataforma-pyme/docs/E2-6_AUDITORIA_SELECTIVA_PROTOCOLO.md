# E2-6 — Protocolo de auditoría independiente y decisión selectiva

**Rama auditada:** `feature/e2-6-ventas-integradas`  
**Ámbito autorizado:** archivos de ventas, pruebas añadidas, contratos, migración E2-6 A y sus dependencias directas en ubicaciones/catálogo/inventario.  
**Base inicial:** `c5d26628166e55f75016a92c847a106f563b4474`.  
**Estado:** convocatoria y matriz de evaluación preparadas. **No representa una auditoría realizada ni aprobada.**

## Instrucciones para el auditor independiente

1. Leer diff completo de `main...feature/e2-6-ventas-integradas`, junto con DDL vigente de venta, stock y contratos de compras/recepción/traslado/ajuste.
2. Evaluar **antes** de proponer cambios si se rompe aislamiento por tenant, autorización efectiva, inmutabilidad comercial, atomicidad, idempotencia o conservación de stock.
3. Identificar pasos concretos para reproducir hallazgos, con ruta y línea, escenario, resultado observado/esperado y severidad fundada.
4. Revisar concurrencia sobre **dos conexiones PostgreSQL reales**, incluyendo intercalaciones entre venta y recepción/transferencia/ajuste, no solamente tests con transacción exterior.
5. Evaluar límites de payload, validadores Pydantic, excepciones SQL, índices, restricciones de esquema, fuga de información entre empresas y consistencia de códigos HTTP.
6. Contrastar todos los reclamos con pruebas existentes; no considerar la cantidad de pruebas como demostración de ausencia de bugs.
7. **No editar código ni `main`.** Entregar hallazgos y propuestas verificables, no una reimplementación automática.

## Formato obligatorio de cada hallazgo

| Campo | Contenido requerido |
|---|---|
| ID | AUD-E26-001, etc. |
| Severidad | Bloqueante / Alta / Media / Baja |
| Evidencia | Archivo, líneas, entrada/reproducción, impacto |
| Regla vulnerada | Tenancy, permisos, stock, idempotencia, pagos, historia, etc. |
| Propuesta mínima | Cambio acotado, dependencias y riesgos |
| Prueba de aceptación | Test unitario/integración/concurrencia que falla antes y pasa después |
| Decisión de revisión | Aceptar / Ajustar / Diferir / Rechazar |
| Motivo | Justificación técnica y compatibilidad |
| Commit de corrección | SHA si se incorpora |
| Verificación | Resultado focalizado, regresión, Alembic y CI |

## Matriz de pendientes previos al PR

- [ ] Obtener auditoría verdaderamente independiente.
- [ ] Registrar **todos** los hallazgos y su decisión, incluso los rechazados.
- [ ] Corregir bloqueantes/altos aceptados con tests de reproducción y regresión.
- [ ] Diferir explícitamente lo que exceda MVP, sin ocultarlo.
- [ ] Ejecutar `alembic current`, `alembic check`, `pytest -q` con `RUN_DB_INTEGRATION=1` sobre base temporal.
- [ ] Verificar CI de SHA final en Python 3.12/3.14 y Docker.
- [ ] Inspeccionar diff y estado de ramas; confirmar `main` sin cambios de esta entrega.
- [ ] Un solo PR de E2-6 y un solo merge, con aprobación expresa del cierre.

## Regla de adopción

No introducir cambios por estilo, preferencia o «mejores prácticas» abstractas si afectan la compatibilidad del MVP sin un defecto o ganancia concreta. Prioridad: seguridad/tenant, integridad de datos y atomicidad, idempotencia, consistencia contractual, pruebas, mantenimiento. Toda corrección aceptada debe tener test específico y evidencia del resultado. No modificar etapas anteriores sin autorización de alcance.
