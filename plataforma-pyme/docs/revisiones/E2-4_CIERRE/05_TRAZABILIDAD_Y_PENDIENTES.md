# E2-4 — Matriz de trazabilidad, evidencia y backlog

**Clasificaciones:** AS-IMPLEMENTED (código ejecutable), QA-MANUAL (respuesta de Swagger aportada por el desarrollador), CI-VERIFICADO (run de GitHub comprobado), TO-BE (diseño), DIFERIDO (no implementado). Una etiqueta de requisito no convierte automáticamente toda su funcionalidad en realizada.

## 1. Requisitos, casos de uso y pruebas

| RF/CU | Contrato implementado | Archivo fuente | Prueba / evidencia | Estado |
|---|---|---|---|---|
| RF-05 / CU-06 | Alta, consulta, edición y estado de Proveedor por empresa | `modules/suppliers/{router,service,schemas}.py` | CI A/B; suites `test_supplier_*` | AS-IMPLEMENTED + CI |
| RF-05 / CU-06 | Alta de compra opcionalmente asociada a Proveedor; líneas, snapshots, totales | `modules/purchases/{router,service,schemas}.py` | U-01/U-07, CI D | AS-IMPLEMENTED + QA-MANUAL |
| RF-05 / CU-06 | Idempotencia de compra, colisión diferente y GET/listado | `purchases/service.py`, `purchases/router.py` | U-02 a U-05; tests de concurrencia/HTTP | AS-IMPLEMENTED + QA-MANUAL |
| RF-05 / CU-07 | Recepción única y completa hacia ubicación STORE | `purchases/receipt_service.py`, `receipt_router.py` | U-12/U-13/U-14, CI E | AS-IMPLEMENTED + QA-MANUAL |
| RF-06 / CU-08 (parcial) | Saldo actual por empresa/ubicación/artículo | `purchases/inventory_router.py`, `stock_balance.py` | U-15/U-16, test de saldos | AS-IMPLEMENTED (parcial) |
| RF-06 / CU-08 (parcial) | Ledger de entradas con trazabilidad | `purchases/inventory_router.py`, `stock_movement.py` | U-17, tests de ledger | AS-IMPLEMENTED (parcial) |
| RF-03 / CU-04 (dependencia) | Ubicaciones `ACTIVA`, `can_store`, asignación | `modules/locations/` y `purchases/receipt_service.py` | U-08/U-09/U-10, integración | AS-IMPLEMENTED |
| RF-04 / CU-05 (dependencia) | Catálogo físico, estado, unidad y protección histórica | `modules/catalog/service.py` | U-06, integración E, CI | AS-IMPLEMENTED |
| CU-09 / transferencias | Movimiento origen-destino y 2 saldos | No existe endpoint E2-4 | Ninguna ejecución | DIFERIDO |
| CU-11 / ajustes | Ajuste manual firmado y comprobante | No existe endpoint E2-4 | Ninguna ejecución | DIFERIDO |
| RF-07 / CU-10 (ventas) | Venta/caja y egresos de stock | No existe endpoint E2-4 | Ninguna ejecución | DIFERIDO |

Consultar documentos académicos `entrega-programacion-2/01`–`05` y la implementación vigente. El UML 03B contiene diseño conceptual más amplio que este corte: no atribuir al código atributos u operaciones aún no implementadas.

## 2. Contratos de seguridad y operación no negociables

1. `business_id` y permisos se verifican en el backend por cada operación; una identidad global no otorga rol global sobre todas las empresas.
2. La Compra no tiene efecto físico hasta recepción; los conceptos/servicios no generan stock.
3. La recepción es completa, atómica y por una ubicación STORE, con una sola entrada por línea física.
4. Nunca reingresar el mismo documento por usar una clave nueva. Reintento exacto del mismo actor y cuerpo reproduce respuesta, sin alterar saldo.
5. Restricciones de FK compuestas y registros históricos no deben eliminarse en futuras extensiones.
6. Mantener centavos/milésimas enteros y regla HALF_UP por línea mientras el contrato vigente no cambie.
7. Los tests deben aislar documentos/empresas en sus consultas sin depender de un conteo global de filas.
8. Un cambio de contrato requiere versión/migración aditiva y pruebas; no editar migraciones ya aplicadas.

## 3. Backlog priorizado (propuesta; no nuevas funcionalidades de E2-4)

| Prioridad orientativa | Trabajo | Motivo y criterio de aceptación futuro |
|---|---|---|
| P1 antes de pruebas destructivas | **Base de datos de tests aislada** | `RUN_DB_INTEGRATION=1` nunca debe conectar a DB de desarrollo/producción sin explícita separación y protección por nombre/URL; crear DB efímera y migrarla |
| P1 para operación real | Cancelación comercial | Definir transición `REGISTRADA→CANCELADA` y autorización/idempotencia. No cancelar una compra `RECIBIDA` por simple cambio de estado |
| P1 para corregir errores reales | Compensación o ajuste auditable de recepción | No borrar el movimiento original; generar contraoperación controlada, preservar no negativo y motivo |
| P1 para despliegue | Permisos e inmutabilidad SQL de movimientos | Rol runtime sin privilegio de UPDATE/DELETE del ledger, acceso DBA restringido, auditoría y evaluación de triggers |
| P2 según necesidad de negocio | Recepción parcial 1:N/multidestino | Rediseñar por renglón/cantidad pendiente y comprobante de recepción, garantizar migración aditiva sin romper la recepción completa existente |
| P2 comercial | Moneda y tipo de cambio histórico | Código ISO 4217 + tasa/fecha/fuente de cambio; aclarar moneda en compra y reportes |
| P2 comercial | Conciliación de redondeo | Ajustes por comprobante/impuestos/descuentos sin cambiar costo de línea histórica |
| P2 escala | Límite de 30 líneas | Importación por lotes con protección de abuso, atomicidad y paginación de lectura |
| P2 integridad | Reconciliar ledger y saldos | Informe de diferencias, acciones seguras ante manipulación SQL externa, sin ajustar manualmente en silencio |
| P2 documentación QA | CRUD completo de Proveedores manual | Registrar POST/GET/PATCH/PATCH status sin exponer credenciales |
| P3 experiencia dev | Solicitudes HTTP parametrizadas | Colecciones .http/Bruno con tokens y claves locales efímeras; no versionar secretos |
| P3 | Frontend React conectado a API | Contrato DTO, sesión, estado por tenant y pruebas E2E |
| Futuro | Ventas, transferencias, gastos, caja, MP/QR | Otros bloques con casos de uso y seguridad independiente |

El orden expresa riesgo técnico, no decisión de producto aprobada. Priorizar bajo el plan del TP.

## 4. Estado de la revisión externa recibida

Las observaciones de terceros se clasifican y contestan en `10_OBSERVACIONES_DE_AUDITORIA_Y_DECISIONES.md`. **No son prueba de auditoría independiente completa**, ni autorizan migraciones/refactors. E2-4 se cierra funcionalmente para el alcance implementado, no para producción.
