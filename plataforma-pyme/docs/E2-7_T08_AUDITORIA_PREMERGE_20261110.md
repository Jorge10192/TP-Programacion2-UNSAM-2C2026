# Auditoría previa al merge — E2-7 T08 (Inventario REAL)

**Fecha:** 10/11/2026 · **Repositorio:** `Jorge10192/TP-Programacion2-UNSAM-2C2026` · **Rama:** `feature/e2-7-t08-inventario-real` · **PR:** [#41](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/41) (**DRAFT, sin merge**).

**Base funcional con CI integral verde:** `3e4daffe4df7e90c8f4e7a7bf0da5954ce09327f`. La corrección de documentación posterior no modifica código de ejecución: `86d146e` (acta T08-4) y `dd41b94` (acta T08-3). Esta auditoría es una **revisión de código, contratos y evidencia pública**; no implica ejecución local de Windows/Docker ni acceso independiente a las capturas alojadas en el historial del chat.

## 1. Alcance técnico de la revisión

- Comparación de `main` con la rama: antes de la presente acta, **72 commits por delante, ninguno por detrás y 27 archivos distintos cambiados**. Sin conflicto de merge informado por GitHub. Los cambios ejecutables corresponden sobre todo al frontend y sus tests; **no se modificaron los servicios backend de inventario de E2-5**, salvo una prueba de configuración. También hay dos archivos de workflow en la raíz `.github/workflows/`.
- Se inspeccionaron gateways y parsers de lectura, traslado y ajuste; `RealInventoryPage`, `RealTransferPanel`, `RealAdjustmentPanel`, journals IndexedDB; cableado de navegación real, CSS y archivos de pruebas; workflows; routers/servicios y pruebas existentes de backend de transferencias, ajustes, permisos, concurrencia y compras/ventas; modelo `StockBalance`.
- La revisión estática **no demuestra ausencia total de defectos** ni sustituye un ensayo real en dispositivos no representados.

## 2. Verificación automática reproducible

**[Run integral GitHub Actions #42896686337](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42896686337) — SUCCESS — SHA `3e4daff`.**

| Control | Evidencia | Resultado |
|---|---|---|
| Esquema y migraciones | Alembic `upgrade head`, `current` y `check`, PostgreSQL efímero | APROBADO |
| Backend completo | `python -m pytest -q` con `RUN_DB_INTEGRATION=1` | **879/879 APROBADOS** |
| Frontend | Node tests, build TypeScript/Vite y Oxlint | **256/256 APROBADOS**, build, lint sin errores |
| Browser REAL | 2 replays de ajuste/traslado después de pérdida de respuesta y F5; 409 sin reintento; paginación 105→106 y filtro | **4/4 APROBADOS** |
| Browser DEMO | Playwright escritorio y móvil, navegación independiente | **6/6 APROBADOS** |
| Backend en CI independiente | Python 3.12 y 3.14, construcción Docker, liveness | APROBADO |

Las pruebas REAL usan base temporal `pyme_t085_ephemeral`, API `127.0.0.1:18001`, actor y empresa efímeros; **no usan ni validan directamente los datos de la instalación local del usuario**. El `test` de paginación cubre movimiento por cambios concurrentes en un dataset acotado, no benchmark de cargas masivas. No se deben correr las pruebas PostgreSQL contra la base de uso manual.

Verificaciones específicas observadas en tests backend:
- `test_adjustment_api_integration.py::test_permissions_employee_and_manager_location_assignment`: trabajador 403, encargado autorizado para ajuste y 403 para stock inicial, titular 201.
- `test_transfer_api_integration.py::test_employee_requires_store_assignment_at_both_locations`: empleado sin asignación y con una sola asignación 403; con STORE en ambas sedes 201.
- `test_adjustment_concurrency_integration.py`: versión competitiva [201,409], replay de misma clave [200,201], inicialización única [201,409].
- `test_transfer_concurrency_integration.py`: stock insuficiente concurrente [201,409], mismo request idempotente [200,201] y operaciones en direcciones opuestas sin inconsistencia.

## 3. Evidencia manual comprobada en los documentos

| Etapa | Ejercicios efectivamente realizados en frontend REAL | Fuente documental | Estado |
|---|---|---|---|
| **T08-1** | TEST Empresa A / Sede A TEST / Producto A TEST: **11 UNIDAD v3**, ledger recepciones **+2,+4,+5**; Sede A TEST 2 sin saldos ni movimientos; B sin datos de A; Miguel lector; DEMO independiente | [Acta T08-1](E2-7_T08_1_INVENTARIO_REAL_LECTURA_Y_QA.md) | Aceptación funcional principal documentada |
| **T08-2** | **6 pruebas manuales**: resumen 3 entradas/0 salidas, entradas/salidas, búsqueda sin coincidencias, trazabilidad real, regreso a Existencias 11/v3; búsqueda positiva reportada | [Acta T08-2](E2-7_T08_2_HISTORIAL_TRAZABILIDAD_Y_QA.md) | Aceptación manual 6/6 documentada; no se afirma haber ejecutado literalmente cada variante del plan inicial |
| **T08-3** | Traslado real **3** (11→8 origen, 0→3 destino), segundo traslado distinto **1** (final 7 origen, 4 destino); movimientos firmados; mismo ID de operación `efeff7f6-5f82-475b-b29b-bf0b53d778e6` del traslado de 3; conservación 7+4=11; B sin saldos de A | [Acta T08-3](E2-7_T08_3_PLAN_TRANSFERENCIAS_REAL.md) | Circuito principal manual aceptado |
| **T08-4** | Producto T08-4 CONTEO, SKU `TEST-T084-001`, **Sede A TEST**, inicial +5/v1, entrada +2/v2, conteo final 6 con salida −1/v3, historial +5+2−1, conteo sin delta deshabilita botón, inicialización repetida bloqueada | [Acta T08-4 actualizada](E2-7_T08_4_STOCK_INICIAL_AJUSTES_VERSIONADOS_QA.md), [T08-5](E2-7_T08_5_QA_INTEGRAL_Y_CIERRE.md) | Aceptado en UI, sin consulta SQL manual independiente |
| **T08-5** | Miguel sin formulario de ajustes; empresa B sin movimientos/saldos de A; DEMO con artículos propios; rechazo de stock inicial repetido | [Acta T08-5](E2-7_T08_5_QA_INTEGRAL_Y_CIERRE.md) | Manual parcial + pruebas adversariales automatizadas aprobadas |

**Distinción obligatoria:** no hay constancia suficiente para afirmar que se ejecutaron **manualmente** el 403 de traslado con asignación STORE incompleta, todas las opciones de entrada inválida del formulario o la desconexión/F5 de un POST en el equipo local. **Sí están cubiertos en pruebas automáticas con PostgreSQL/Chromium descartable.** El plan original propone escenarios, pero una propuesta no es evidencia de ejecución.

**Capturas:** los Markdown describen capturas compartidas en el chat; un recorrido por el árbol del repositorio no encontró archivos de capturas de QA T08 adjuntados al proyecto (solo un recurso gráfico `hero.png`). **No presentar imágenes inexistentes ni inventar resultados.** Conviene archivar capturas seleccionadas y sanitizadas si el docente/compañero exige prueba independiente.

## 4. Hallazgos y tratamiento

| ID | Importancia | Hallazgo / evidencia | Acción recomendada o tomada |
|---|---|---|---|
| DOC-01 | **Media, corregida** | El acta T08-4 decía al inicio y cierre que faltaba QA manual, pese a la aprobación registrada en T08-5 | **Corregido en `86d146e`**, con acta real de 5→7→6 y distinción UI/PostgreSQL |
| DOC-02 | **Media, corregida** | La sección histórica de T08-3 conservaba faltantes de permisos y DEMO sin relacionarlos claramente con la validación posterior | **Corregido en `dd41b94`**: nueva sección de reconciliación, sin atribuir escenarios automáticos a pruebas manuales |
| QA-01 | **Media, alcance de evidencia** | No se ejecutó manualmente el 403 de traslado de Miguel sin STORE completo, ni toda la matriz adversarial del formulario | Casos exactos **aprobados en suite PostgreSQL/Node**; no reproducir POST sobre instalaciones con permisos inciertos; solo QA manual negativo en entorno nuevo aislado si es imprescindible como requisito |
| EVID-01 | **Media académica** | Resultados escritos en actas, pero capturas manuales no archivadas en el repo | Adjuntar capturas sanitizadas o índice externo verificable si se exige auditabilidad autónoma; sin tokens/Bearer, contraseñas o datos sensibles |
| GOV-01 | **Media, decisión del responsable** | Dos archivos de workflows bajo `.github/workflows/` están fuera de la carpeta exclusiva `plataforma-pyme/` | Son necesarios para CI. Documentar expresamente la **excepción de ubicación** antes del merge, conforme a las pautas T00; no revertirlos sin alternativa |
| UX-01 | Baja, no bloqueante | Botón de confirmar traslado puede verse habilitado aun con motivo/cantidad inválidos; `create()` rechaza por `transferReason`/`transferMilli` y no envía POST. Ajuste comprueba motivo completo al confirmar | Mejorar feedback y `disabled` preventivo en una mejora posterior, manteniendo lógica estricta en backend |
| PAG-01 | Baja, riesgo conocido | Paginación por `offset/limit` no es un snapshot estable bajo concurrencia; el frontend detecta duplicados y exige actualizar | Documentado; evaluar cursor keyset/snapshot en evolución T11, no prometer exhaustividad global por filtro local |
| SEC-01 | Baja/media, riesgo reconocido | Journals de idempotencia en IndexedDB **sin cifrar**, scoped por actor+empresa, no compartidos entre navegadores | UI advierte evitar equipos compartidos; no hay tokens ni contraseñas en records. Considerar políticas de equipos compartidos/caducidad y UX de limpieza |
| E2E-01 | Baja, ampliación futura | Playwright REAL automatizado usa Chromium de escritorio; DEMO sí prueba escritorio y móvil | Agregar smoke REAL móvil sin mutaciones en T11 o antes si se exige aceptación responsive |
| CI-01 | Baja, mantenimiento | El nuevo workflow puede correr tanto por `push` como por `pull_request`; instalación E2E sin lockfile en ese paso | Considerar `concurrency` y dependencias reproducibles después del cierre |
| PERF-01 | Baja, no bloqueante | Vite avisa de chunk mayor a 500 kB después de minificación | Optimización futura mediante code splitting, sin alterar flujo validado |

**No se identificó, en el código inspeccionado y las suites aprobadas, una falla crítica reproducible de aislamiento por tenant, saldo negativo, pérdida de atomicidad, replay duplicado o bypass de roles.** Esto no significa que el software sea infalible: la revisión es limitada por el alcance de los tests y por no haber ejecutado una segunda infraestructura independiente.

## 5. Pasos previos a autorización de merge

1. Confirmar que el último commit documental sigue con CI verde; el código funcional validado ya pasó en el SHA `3e4daff`.
2. Comprobar que las actas T08-3, T08-4 y T08-5 muestren estados **consistentes**, conservando el historial de rondas parciales.
3. Si se exige completar **cada escenario manual originalmente escrito**, realizar únicamente en entorno aislado la validación faltante de permisos 403 y entradas inválidas. **No modificar roles, probar 403 mediante POST sobre una cuenta con permisos inciertos ni generar otro traslado sobre Producto A TEST.** Como sustituto de seguridad, ya existen suites automáticas.
4. Para evidencia manual adicional no mutante, se puede revisar en frontend el filtro de evento exacto `Recepción de compra` y `Salida por venta`, además de un smoke REAL de solo lectura en viewport móvil. Capturar resultado y anotar que no hubo POST.
5. Obtener la aceptación explícita del responsable de la excepción `.github/workflows/` y de los riesgos conocidos; actualizar el PR #41, sin marcarlo listo ni fusionarlo automáticamente.
6. **Solo después de la conformidad final del usuario** elegir estrategia de merge y preparar T09 en una rama nueva. Mantener `main` intacta hasta ese momento.

**Dictamen:** **apto funcionalmente para revisión humana final**, con hallazgos de documentación y evidencia aclarados. **Aún no autorizado para merge**. No se detectaron bugs funcionales críticos nuevos confirmados en esta auditoría; los riesgos y las oportunidades de mejora quedan explícitos para decidir alcance.
