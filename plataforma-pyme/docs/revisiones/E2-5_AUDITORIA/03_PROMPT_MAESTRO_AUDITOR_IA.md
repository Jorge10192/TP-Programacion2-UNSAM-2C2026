# Prompt maestro — Asignación a IA revisora independiente de E2-5

**Uso:** copiar a una **segunda IA** junto con este documento o proporcionar acceso al repositorio. **No se ejecutó esta auditoría**; el contenido es una orden de trabajo propuesta. El PR documental #24 ya fue fusionado. El SHA de publicación del cierre E2-5 está resuelto; el auditor debe registrar además el HEAD real de la revisión (puede ser posterior por una fe de erratas documental).

---

## INICIO DEL ENCARGO PARA LA IA REVISORA

Actuá como **auditor/a independiente senior de backend transaccional y seguridad**, con criterio académico de Programación 2 y experiencia en FastAPI/Pydantic, SQLAlchemy 2 (síncrono), PostgreSQL 16, Alembic, Docker, Pytest y CI. Tu objetivo es revisar críticamente **el bloque E2-5 A/B/C de Inventario** de Asistente PyME, sistema generalista multiempresa/multirrubro.

### Datos no negociables

- Repositorio: `https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026`.
- Carpeta única autorizada: `plataforma-pyme/`.
- Código E2-5 funcional congelado: `748e69319d8d04900c009d5184168a264a9deeac`.
- Base funcional anterior E2-4: `1a188f9a596f4674ca121806ecb92e6a96abf294`.
- SHA del **merge documental** aprobado: `c66df2f8ddaa8179ca12e342bd3099348bc6b155`.
- Rama sugerida para revisión: `review/e2-5-inventario`, creada después de confirmar SHA exacto de `main` publicado.
- Guía rectora: `plataforma-pyme/docs/revisiones/GUIA_MAESTRA_REVISION_BLOQUES_E2_ASISTENTE_PYME.md`.
- Hoja específica: `plataforma-pyme/docs/revisiones/E2-5_ENTREGA_PARA_REVISION.md`.
- Paquete operativo: `plataforma-pyme/docs/revisiones/E2-5_AUDITORIA/`.
- Cierre **interno**, no una auditoría externa: `plataforma-pyme/docs/revisiones/E2-5_CIERRE/`.
- Requisitos: RF-06 y CU-08, CU-09, CU-11; dependencias RF-03/04/05; **RF-07 backend NO implementado todavía**.

### Regla inicial obligatoria

**Antes de analizar:** accedé realmente al código, modelos, tests, migraciones, docs 01–05 y archivos enumerados. Confirmá accesibilidad **y ambos SHA** (funcional y documental), listá lo que pudiste leer y separá estado histórico del vigente. Si GitHub o parte relevante no es accesible, **declará exactamente el límite**. Nunca inventes el contenido de un archivo que no inspeccionaste.

**No modifiques código ni documentación durante el reconocimiento inicial.** Primero entregá una matriz de hallazgos con prioridad y evidencia. Si un problema puede resolverse localmente dentro de E2-5 y la guía lo permite, hacé la corrección **solo en tu rama propia**, con tests y documentación actualizada. **No edites ni fusiones `main`** y no toques otro subproyecto.

### Método de auditoría obligatorio

**Fase 1 — Línea base y dependencias.** Fijá el diff de E2-4→E2-5, mirá PR #21–#23 y la migración `e25a_inventory_ops`. Leé las especificaciones E2-5 A/B/C, `entrega-programacion-2/01...05`, UML 03B y ADR-004. Separá **AS-IMPLEMENTED**, **AS-TESTED**, **TO-BE**, **DEFERIDO**. No supongas que la DEMO React opera contra la API.

**Fase 2 — Threat model, dominio y contratos.** Auditá `business_id`/tenant, roles y STORE por sede, actor, token Bearer **opaco/revocable**, sesiones, idempotencia UUID4, hashes canónicos de payload, FK compuestas, restricciones CHECK/UNIQUE y mensajes 401/403/404/409/422. Identificá cómo podría producirse una escritura no autorizada, una doble operación o una lectura cruzada de empresa.

**Fase 3 — Integridad y atomicidad.** Reconstruí para cada comando su orden real de bloqueos/validaciones/escrituras/commit/rollback. Traslado = un débito + un crédito + una cabecera + **dos** eventos firmados; ajuste/inicial = un balance/cabecera + **un** evento. Verificá versiones, ausencia de saldos negativos, estados históricos cero, límites de BIGINT y compatibilidad de movimientos de recepción. No confundir 409 por versión obsoleta con corrupción de datos.

**Fase 4 — Tests y concurrencia.** Revisá todas las suites `test_inventory_operation_*`, `test_transfer_*`, `test_adjustment_*` y regresión `test_receipt_*`. Las carreras existentes validan traslados paralelos/opuestos, ajustes rivales e inicialización. Investigá las **carreras cruzadas** traslado ↔ ajuste y recepción ↔ inicial, reintentos cross-kind, autorización concurrente y errores SQL parciales. Si no podés reproducirlo, anotá `RIESGO/NO PROBADO`, no `BUG CONFIRMADO`.

**Fase 5 — Seguridad SQL y data lifecycle.** Comprobá usuario real de runtime DB, privilegios para actualizar/eliminar `stock_movements` y `inventory_operations`, protección contra cambios de ledger por SQL directo, fugas de error SQL, disponibilidad de rollback, limpieza de fixtures y riesgo de que `RUN_DB_INTEGRATION=1` apunte a una DB compartida. **Solo hacer pruebas con DML en DB efímera dedicada**.

**Fase 6 — Documentación y compatibilidad.** Contrastá requisitos, CU, diagramas, estado de API, mensajes HTTP, estados, migraciones, tests y CI. No reescribas historias previas para que todo "parezca alineado". Proponé o aplicá solo adendas/migraciones nuevas compatibles cuando corresponda. Asegurá que cualquier documentación nueva sea útil a futuras IAs, con nombres exactos, invariantes, precondiciones, criterios verificables y **sin copiar secretos**.

### Hipótesis externas que debés evaluar, sin sesgo

Hubo observaciones de otra IA sobre dos estrategias de concurrencia, stock inicial con saldo cero, anulación, motivos tipados, autorización de merma, límites, reservas, recepción parcial, multimoneda, redondeo, hardening SQL, errores 409 y límite de compra de 30 líneas. Leelas **solo después de una primera inspección independiente** para evitar anclaje.

No te obligamos a aceptar ni a rechazar el diagnóstico previo. Si demostrases un defecto real, clasificálo por impacto **P0/P1/P2/P3** y reproducilo. Si es cambio de producto o de UX, recomendalo sin programarlo. **No**: hacer pasar `STOCK_INICIAL` histórico sobre saldo cero, eliminar límites sin pruebas, meter ventas/pagos, introducir `AsyncSession` porque un prompt lo sugiera, cambiar redondeos monetarios de E2-4 o modificar migraciones aplicadas sin aprobación.

### Condiciones de pruebas

1. Usá **clon y base PostgreSQL 16 aislados**, no la DB QA del desarrollador.
2. Comprobá destino efectivo de DB antes de `RUN_DB_INTEGRATION=1`; si hay dudas, **no ejecutar tests de escritura**. Ver `02_PLAN_PRUEBAS_Y_REPRODUCCION.md`.
3. Ejecutá CI local/reproducible cuando sea seguro, registrá comandos/versiones y aserciones observadas. No afirmes un `840 passed` nuevo si simplemente leíste el log histórico del merge.
4. No expongas contraseñas, Bearer, keys idempotentes, DSN, `.env`, correo QA ni dumps; usar recursos propios y anonimizar evidencias.
5. No ejecutar `docker compose down -v`, `DROP`, `TRUNCATE`, `alembic downgrade/stamp` ni borrados globales o de datos ajenos.

### Formato y entregables obligatorios

- Informe versionado dentro de tu rama: `plataforma-pyme/docs/revisiones/E2-5_INFORME_DE_REVISION.md`.
- Confirmación de código/documentación accesibles y SHA; mapa de archivos examinados.
- Matriz RF/CU/INV → código y SQL → tests → resultado y estado.
- Hallazgos IDs `REV-E2-5-001` etc. Cada uno con prioridad, clasificación (BUG CONFIRMADO / RIESGO FUNDAMENTADO / BRECHA TEST / INCONSISTENCIA DOCUMENTAL / IDEA FUTURA), evidencia exacta, impacto, reproducción, decisión y riesgos de corrección.
- Tabla de **modificaciones justificadas** (si las hay): archivo, mínimo diff, test de regresión, resultado, contrato y docs afectados.
- Tabla de **no-modificados** y pendientes de producto fuera de E2-5.
- Evidencias reproducibles de Pytest/Alembic/PostgreSQL/CI ejecutadas; distinguir entre resultados históricos y propios.
- Confirmar que no hay secretos ni cambios en proyectos ajenos.
- Abrir **PR independiente hacia `main`** con cambios e informe; **NO MERGE**. Un PR sin código cambiado es aceptable si demuestra que el bloque no necesitaba cambios.

### Criterio de éxito

Tu trabajo es útil cuando el equipo puede decidir **qué aprobar, qué corregir, qué postergar y por qué**, con evidencia suficiente para otra IA implementar una corrección sin inferir contexto oculto. Una conclusión "todo perfecto" sin examen de riesgos y condiciones no cumple; una lista P0 especulativos sin reproducción tampoco. El equipo decide si publica/fusiona.

## FIN DEL ENCARGO

---

## Nota para el responsable del proyecto

**PR documental #24 fusionado** en `main` al commit `c66df2f8ddaa8179ca12e342bd3099348bc6b155`. Ese SHA identifica el **cierre publicado original**, no pretende autorreferenciar el commit actual de esta fe de erratas. Antes de iniciar, comprobar `git rev-parse HEAD`, comparar el backend contra el SHA funcional `748e69319d8d04900c009d5184168a264a9deeac` y registrar ambos identificadores. Si hubo cambios funcionales posteriores, decidir un nuevo corte antes de la auditoría.
