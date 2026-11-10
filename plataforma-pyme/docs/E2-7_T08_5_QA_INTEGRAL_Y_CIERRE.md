# E2-7 T08-5 — QA integral y cierre de inventario REAL

Fecha: 10/11/2026. Base consultada: `5dd14a5cf322e8724942149f4ca13ebb6f544fee`. Rama `feature/e2-7-t08-inventario-real`. Sin merge a main. Estado: EN CURSO.

## Aceptación funcional principal de T08-4

Evidencia: capturas compartidas en la conversación por el usuario. No representa consulta SQL independiente ni inspección de la red del navegador.

Datos efectivos: TEST Empresa A, **Sede A TEST** (no Sede A TEST 2), **Producto T08-4 CONTEO**, SKU TEST-T084-001, unidad UNIDAD.

| Control | Evidencia observada | Resultado |
|---|---|---|
| Stock inicial | Confirmación previa sin saldo, expected_version=0; comprobante STOCK INICIAL +5 y mensaje de verificación GET | Aprobado en UI |
| Entrada | Confirmación previa saldo 5, expected_version=1; comprobante AJUSTE ENTRADA +2 | Aprobado en UI |
| Conteo final 6 | Confirmación previa saldo 7, expected_version=2; comprobante AJUSTE SALIDA -1 | Aprobado en UI |
| Ledger | Tres registros del artículo/sede: +5, +2, -1 | Aprobado visualmente |
| Saldo final | Filtro por artículo y Sede A TEST: 6 UNIDAD, versión 3 | Aprobado visualmente |
| Conteo igual al saldo | Cantidad 6, saldo consultado 6/v3, motivo completo y consentimiento marcado; aviso de coincidencia y botón deshabilitado | Aprobado en UI; no se inspeccionó tráfico HTTP |

La secuencia concilia 5 + 2 - 1 = 6. No repetirla para recrear evidencia. T08-4 tiene aceptación funcional principal; no implica cierre integral de seguridad o concurrencia.

## Evidencia automática disponible

CI de la base: [run 42869087528](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42869087528), concluido SUCCESS. La revisión anterior registró 256/256 tests ejecutando todos los archivos frontend, build y lint correctos; ese total no equivale necesariamente a la selección de CI. Chromium DEMO no equivale a full-stack REAL.

Existen tests PostgreSQL de transferencias, ajustes, permisos y carreras: `test_transfer_api_integration.py`, `test_transfer_concurrency_integration.py`, `test_adjustment_api_integration.py`, `test_adjustment_concurrency_integration.py`. No se ejecutaron durante esta apertura de T08-5. Docker no está disponible en el entorno de revisión. Para ejecutarlos usar una base nueva y exclusiva de pruebas, migrada a head; no conectar la suite a la base de uso manual.

## Matriz pendiente

| Caso | Procedimiento / evidencia requerida | Estado |
|---|---|---|
| P1 Trabajador sin ajustes | Con Miguel como TRABAJADOR activo, abrir inventario y Stock inicial y ajustes; aviso de solo lectura, sin formulario habilitado | Pendiente manual |
| P2 Autorización backend | Pruebas de integración: trabajador rechazado para ajustes/inicialización; traslado requiere STORE en ambas sedes; verificar ausencia de mutación | Pendiente ejecución PostgreSQL |
| P3 Roles administrativos | Inicialización titular/admin; encargado solo ajuste con asignación; backend deniega inicialización al encargado | Pendiente ejecución PostgreSQL |
| C1 Versión obsoleta | Dos operaciones sobre misma versión: una confirma, otra 409; saldo y ledger cambian una sola vez | Pendiente PostgreSQL |
| C2 Concurrencia e idempotencia | Misma clave/cuerpo no duplica; transferencias opuestas no dejan escrituras parciales; inicialización concurrente única | Pendiente PostgreSQL |
| R1 Recuperación | En entorno aislado, simular pérdida de respuesta y F5/relogin; mismo actor/empresa recupera clave/cuerpo/version originales, sin POST automático | Pendiente full-stack |
| R2 Inicialización repetida | Rechazar sobre saldo previo, incluso cero histórico; sin movimiento nuevo | Pendiente PostgreSQL / UI |
| A1 Empresa B | Confirmar ausencia de artículo, saldo y movimientos T08-4 de A en B | Pendiente manual posterior a ajustes |
| A2 DEMO | Datos y navegación DEMO propios, sin incorporar datos TEST REAL | Pendiente regresión final |
| V1 Paginación | Más de 100 registros, filtros sede/artículo y recarga ante cambios entre páginas | Pendiente dataset aislado |

P1 demuestra comportamiento de interfaz, no sustituye P2. No retirar asignaciones reales de Miguel ni enviar traslados potencialmente válidos para intentar obtener un rechazo: verificar permisos negativos en fixtures aislados.

## Orden de trabajo y cierre

1. P1 en navegador, un paso por vez, sin crear movimientos.
2. A1/A2 y comprobación de bloqueo de stock inicial repetido en UI.
3. Ejecutar suites PostgreSQL en base exclusiva; registrar comando, commit, aprobadas/fallidas/omitidas.
4. Recuperación y paginación full-stack con datos aislados; registrar cualquier aplazamiento a T11 explícitamente, sin marcarlo aprobado.
5. Consolidar evidencia y riesgos antes de proponer cierre. PR #41 permanece borrador; no fusionar mientras falten criterios acordados.
