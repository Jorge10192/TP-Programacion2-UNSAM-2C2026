# E2-7 T08-5 — QA integral y cierre de inventario REAL

Fecha de cierre de QA: 10/11/2026. **Commit validado:** `bdeee364cdc3039faacef444c62d363b28c90c18`. Rama `feature/e2-7-t08-inventario-real`. **Estado: QA integral T08-5 APROBADO, pendiente revisión final del PR #41; sin merge a `main`.** El cierre se fundamenta en evidencia manual histórica y CI full-stack aislado; no equivale a despliegue productivo.

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

## Evidencia automática y alcance real de las pruebas

**Fuente primaria y commit:** [GitHub Actions: Inventario REAL full-stack, run 42895894227](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42895894227), **SUCCESS** en `bdeee364`. Corrió con PostgreSQL 16 efímero `pyme_t085_ephemeral`, FastAPI en puerto 18001, Chromium y cuentas creadas para QA. No utilizó la base local del usuario.

| Componente | Evidencia del run completo |
|---|---|
| Migración | `alembic upgrade head`, `current` y `check`: correctos |
| Backend | `python -m pytest -q --junitxml=/tmp/backend-qa.xml`: **879 aprobadas, 0 fallidas**, con `RUN_DB_INTEGRATION=1` y PostgreSQL real |
| Frontend | `node --test tests/*.test.mjs`: **256 aprobadas, 0 fallidas**; `npm run build` correcto; lint **0 errores y 0 advertencias** |
| Navegador REAL | **4/4 Playwright aprobadas**: ajuste/traslado con respuesta perdida + F5 + replay; versión vieja `409`; paginación 105/106 registros, filtros y detección de desplazamiento |
| Navegador DEMO | **6/6 Playwright aprobadas** en escritorio y móvil; configuración `e2e/playwright.config.ts` con `testDir: ./specs`, separado de `e2e/playwright.real.config.ts` con `testDir: ./real` |
| Otros workflows en mismo commit | Frontend SUCCESS y Backend FastAPI SUCCESS, incluidos Python 3.12 y 3.14 y comprobación de imagen Docker |

Las suites PostgreSQL incluyen `test_transfer_api_integration.py`, `test_transfer_concurrency_integration.py`, `test_adjustment_api_integration.py` y `test_adjustment_concurrency_integration.py`: autorizaciones negativas, versión, atomicidad, idempotencia y conflictos. La validación de navegador REAL comprueba los recorridos de extremo a extremo, no solo mocks. El workflow deshabilita trazas de navegador para no conservar Bearer. Aviso de Vite sobre chunk JS de más de 500 kB: **no bloqueante**, pendiente optimización de rendimiento fuera del cierre funcional T08.

**Fallas previas resueltas:** en `1a23f6b` se aisló `DB_PORT`/`DB_HOST` en `test_db_settings.py` (antes 878/879 por interferencia del entorno CI); en `bdeee36` se añadieron etiquetas accesibles explícitas a los selectores de sede y artículo (antes Playwright no encontraba el filtro y agotaba el tiempo). No se alteraron reglas de stock ni datos reales para resolverlos.

## Matriz final de aceptación

| Caso | Procedimiento / evidencia requerida | Estado |
|---|---|---|
| P1 Trabajador sin ajustes | Con Miguel como TRABAJADOR activo, abrir inventario y Stock inicial y ajustes; aviso de solo lectura, sin formulario habilitado | Aprobado en UI, captura de Miguel |
| P2 Autorización backend | Trabajador sin permiso, STORE en ambas sedes y rechazo sin mutación | Aprobado en suite PostgreSQL de integración |
| P3 Roles administrativos | Inicialización titular/admin; encargado ajusta con STORE pero no inicializa | Aprobado en suite PostgreSQL de integración |
| C1 Versión obsoleta | Comando con versión anterior retorna 409; no se agrega movimiento | Aprobado en PostgreSQL + Playwright REAL |
| C2 Concurrencia e idempotencia | Replay sin duplicado, traslado atómico e inicialización concurrente única | Aprobado en suites PostgreSQL; replay comprobado también en navegador REAL |
| R1 Recuperación | Respuesta 201 perdida, F5/relogin, misma clave/cuerpo/versión, sin POST automático; replay 200 | Aprobado en Playwright REAL para ajuste y traslado |
| R2 Inicialización repetida | Bloqueo en UI; backend rechaza saldo previo e historial previo aunque el saldo sea cero | Aprobado en UI manual y suite PostgreSQL |
| A1 Empresa B | Confirmar ausencia de artículo, saldo y movimientos T08-4 de A en B | Aprobado visualmente: B sin saldos ni movimientos, filtros generales |
| A2 DEMO | Datos y navegación DEMO propios, sin incorporar datos TEST REAL | Aprobado visualmente y 6/6 Playwright DEMO (escritorio/móvil) |
| V1 Paginación | 105 movimientos, filtros de sede/artículo, inserción concurrente y refresco hasta 106 sin duplicados | Aprobado 1/1 Playwright REAL |

P1 demuestra comportamiento de interfaz, no sustituye P2. No retirar asignaciones reales de Miguel ni enviar traslados potencialmente válidos para intentar obtener un rechazo: verificar permisos negativos en fixtures aislados.

## Metodología, límites y decisión de cierre

1. La ronda humana comprobó bloqueos de rol, aislamiento entre empresas, datos DEMO y rechazo de inicialización repetida. Son evidencias **visuales**; no se afirma haber inspeccionado tráfico del navegador local ni SQL del negocio TEST.
2. La suite de backend usó PostgreSQL 16 efímero para permisos, integridad, transacciones y concurrencia. Es evidencia de ejecución, no solo inspección de código.
3. Playwright REAL ejercitó la API real a través del proxy de Vite y Chromium; la pérdida intencional de la respuesta ocurrió **después** de la confirmación del servidor. No reenvía por sí sola al recargar; el usuario debe elegir el reintento explícito de la misma identidad.
4. Playwright DEMO confirmó recorridos separados de los flujos REALES. La paginación comprobada cubre 105/106 movimientos y la protección ante deslizamiento de páginas; no constituye ensayo general de carga masiva ni garantiza ausencia de cualquier carrera futura.
5. El journal durable de intentos utiliza IndexedDB sin cifrado y no sincroniza entre navegadores: riesgo conocido; no usar equipos compartidos. El bundle Vite grande sigue como deuda de rendimiento, sin bloquear el MVP.

**Decisión:** criterios de QA integral T08-5 satisfechos para el alcance previsto. Se habilita la **revisión final del PR #41** y su preparación académica; **no se fusiona a `main` ni se declara despliegue en producción** como parte de este documento. Mantener los datos manuales y la base del usuario intactos.

## Ronda manual T08-5 completada — 10/11/2026

Capturas: Miguel ve el aviso de solo lectura y no recibe formulario de ajustes; Empresa B muestra cero saldos y cero movimientos con filtros generales; DEMO muestra empresas propias y artículos colágeno, crema de enjuague y shampoo, sin productos TEST visibles. Inicialización repetida de Producto T08-4 CONTEO en Sede A TEST bloqueada con saldo 6/v3, cantidad 1, motivo completo y consentimiento marcado. Estas son comprobaciones visuales; no sustituyen los controles API.

## Cierre de ejecución automática — 10/11/2026

- **Run concluyente:** [42895894227](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42895894227), commit `bdeee364`, estado **SUCCESS**, todos los pasos de `inventory-real` correctos, incluido el navegador REAL y la regresión DEMO.
- **Backend:** 879/879; **frontend:** 256/256, build y lint limpios; **Playwright REAL:** 4/4; **Playwright DEMO:** 6/6.
- **T08-4 funcional:** Producto T08-4 CONTEO, TEST Empresa A, Sede A TEST, saldo final **6 UNIDAD / versión 3**, historial **+5 +2 −1** confirmado visualmente por el usuario. No recrear estos movimientos.
- **PR:** [#41](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/41) debe seguir abierto y en borrador hasta revisión humana, actualización de alcance y decisión de integración a `main`.

**Resultado final:** **T08-5 aprobado en QA**, con los límites descritos. La revisión del PR y el merge son tareas posteriores y explícitas.
