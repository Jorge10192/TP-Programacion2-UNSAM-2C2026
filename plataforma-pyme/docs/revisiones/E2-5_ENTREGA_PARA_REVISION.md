# E2-5 — Hoja formal de entrega para auditoría técnica independiente

**Proyecto:** Asistente PyME — Programación 2 (UNSAM, 2C2026)  
**Alcance de código:** E2-5 A, B y C — inventario físico, traslados, ajustes, stock inicial y ledger común.  
**Estado de esta hoja:** **PUBLICADA COMO ENCARGO DE AUDITORÍA INDEPENDIENTE**; la auditoría todavía no fue realizada y no hay autorización de merge automático.  
**Fecha:** 09/11/2026.  
**Repositorio:** https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026  
**Ruta exclusiva:** `plataforma-pyme/`; rama de origen funcional `main`.  
**SHA exacto del código E2-5 C:** `748e69319d8d04900c009d5184168a264a9deeac`.  
**SHA base previa de E2-4:** `1a188f9a596f4674ca121806ecb92e6a96abf294`.  
**Rango de cambios funcionales:** `1a188f9a596f4674ca121806ecb92e6a96abf294..748e69319d8d04900c009d5184168a264a9deeac`.  
**SHA documental de cierre publicado por PR #24:** `c66df2f8ddaa8179ca12e342bd3099348bc6b155` (publicación original; verificar también el HEAD real al iniciar la auditoría).  
**Rama sugerida para el auditor:** `review/e2-5-inventario`, crearla desde el **main documental ya publicado**, registrando en su informe el SHA del documento recibido y el código funcional analizado.

> **Precondición satisfecha:** el [PR documental #24](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/24) fue fusionado en `main` al commit `c66df2f8ddaa8179ca12e342bd3099348bc6b155`. Ese es el **SHA de publicación del cierre original**. El auditor debe registrar también el SHA de `main`/rama vigente al comenzar, porque pueden existir correcciones documentales posteriores, y comparar el backend con el SHA funcional congelado.

## 1. Qué se entrega y cuál es la fuente de verdad

Se entregan dos líneas base diferenciadas: **código funcional E2-5 al SHA congelado** y **documentos de cierre publicados al commit documental original `c66df2f8ddaa8179ca12e342bd3099348bc6b155`**. La documentación es una guía y una colección de evidencias; no sustituye inspeccionar routers, servicios, ORM, SQL ni ejecutar tests. Si un documento histórico describe «pendiente de merge», ese estado se refiere a la fecha de su redacción, no al corte funcional.

El informe interno de [cierre E2-5](E2-5_CIERRE/00_LEEME.md), la [evaluación de observaciones externas](E2-5_CIERRE/13_EVALUACION_OBSERVACIONES_IA.md) y [este plan específico de auditoría](E2-5_AUDITORIA/00_LEEME_Y_PRECONDICIONES.md) **no son resultados de auditoría independiente**. El revisor no debe copiar las conclusiones internas como hallazgos probados ni dejar de investigar hipótesis por estar etiquetadas P2.

## 2. Incrementos y PR que deben verificarse

| Corte | PR | Merge SHA en main | Trabajo implementado | Suite CI final (Python 3.12 y 3.14) |
|---|---|---|---|---|
| **A** | [#21](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/21) | `4268846abc524ebd827b4da930ef58d8d9789ac7` | Modelo `inventory_operations`; ledger firmado con origen y FK/CHECK; migración `e25a_inventory_ops` | **816 passed** cada versión, 3/3 jobs |
| **B** | [#22](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/22) | `4f992b3beb8dda732e4cd752f828b375f240e13d` | Traslados atómicos, 2 eventos y lectura común de movimientos; mismos esquemas SQL | **826 passed** cada versión, 3/3 jobs |
| **C** | [#23](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/23) | `748e69319d8d04900c009d5184168a264a9deeac` | `STOCK_INICIAL`, `AJUSTE_ENTRADA`, `AJUSTE_SALIDA`, versión e idempotencia | **840 passed** cada versión, 3/3 jobs |

Runs de `main`: [A 42601062105](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42601062105) · [B 42604071018](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42604071018) · [C 42617212795](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42617212795).  
Windows aportado por el desarrollador para C: **840 passed in 110.89s**, `alembic current = e25a_inventory_ops (head)`, `alembic check` sin deriva, API y PostgreSQL saludables. **No confundir esas ejecuciones históricas con tests hechos por el auditor.**

## 3. Alcance técnico permitido

**Auditar a fondo y corregir solo defectos demostrados de este bloque**, con autorización de la guía maestra y en rama propia:

- `backend/app/infrastructure/models/inventory_operation.py`, `stock_balance.py`, `stock_movement.py`.
- `backend/alembic/versions/20261109_0016_inventory_operations.py` **solo lectura, al ser migración ya aplicada**; cualquier modificación del esquema requiere **nueva migración aditiva** y aprobación cuando altere contrato.
- `backend/app/modules/purchases/{transfer_router,transfer_service,transfer_schemas,adjustment_router,adjustment_service,adjustment_schemas,inventory_router}.py`.
- `backend/app/modules/purchases/{receipt_service,receipt_router,receipt_schemas,receipt_repository,service,schemas}.py`, únicamente **como dependencia de regresión E2-4**.
- `backend/app/modules/locations/permissions.py`, `backend/app/modules/auth/` y `backend/app/modules/businesses/repository.py` **solo para verificar autorización y locks**; cambios funcionales fuera del bloque requieren decisión previa.
- Tests `test_inventory_operation_*`, `test_transfer_*`, `test_adjustment_*`, test de recibos y tests base por tenant. Conservar suites de regresión.
- `plataforma-pyme/docs/E2-5_A_MODELO_OPERACIONES_INVENTARIO.md`, `E2-5_B_TRASLADOS_ATOMICOS.md`, `E2-5_C_AJUSTES_Y_STOCK_INICIAL.md`, cierre documental, y documentos académicos pertinentes.

**No tocar:** frontend React DEMO, ventas/pagos/caja, Mercado Pago, cuentas financieras, permisos ajenos al inventario, datos QA existentes, migraciones anteriores, otros subproyectos del repositorio ni `.env`/credenciales. No introducir reservas, recepciones parciales o multidivisa para “mejorar” el bloque auditado.

## 4. Requisitos y reglas que deben probarse, no suponerse

**RF-06 / CU-08:** balances y lectura de ledger propios del tenant y ubicación, filtros/paginación, compatibilidad de recepciones.  
**RF-06 / CU-09:** traslado origen/destino diferentes, ambas ubicaciones `ACTIVA`/`can_store`, permisos, stock no negativo, 2 movimientos de suma cero y commit único; replay idéntico 200 y conflicto 409 sin duplicar.  
**RF-06 / CU-11:** inicial único por par sin historia previa, titular/admin; ajuste delta positivo/negativo solo sobre balance existente y versión observada exacta; motivo obligatorio; no negativa; actor y comprobantes históricos.  
**RF-03/CU-04, RF-04/CU-05, RF-05/CU-07** como dependencias: permisos STORE, artículos físicos y recepciones. **RF-07/CU-10 venta backend no implementada**: no atribuirla a E2-5.

Todo comando mantiene `business_id`, UUID4 idempotente, actor, firma de movimientos, unidad/cantidad válida, transacción y rollback. La versión de saldo cambia con recepciones/traslados/ajustes; **traslado no exige expected_version por contrato**, ajuste sí. Tokens **Bearer opacos de sesión revocable, no JWT**.

## 5. Preguntas de auditoría obligatorias

El revisor debe comprobar código, pruebas y casos extremos al menos sobre: (i) secuencia de locks entre usuarios/sesiones/empresa/ubicaciones/catálogo/saldos; (ii) fuga intertenant y RBAC en POST, GET y replay de operación; (iii) idempotencia con misma clave+cuerpo, distinta carga/actor/tipo y peticiones simultáneas; (iv) fallback a saldo inexistente y saldo existente cero; (v) compatibilidad SQL origen único, tipo, signo, dirección y cantidad, incluyendo inserciones directas únicamente en base efímera; (vi) saturación de saldo y límites enteros; (vii) rollback bajo error a mitad del comando, ventanas de carrera con recepciones y traslados; (viii) desacople entre documentación, UML y código. Ver [matriz completa](E2-5_AUDITORIA/01_MATRIZ_AUDITORIA_E_INVARIANTES.md).

**Los asuntos de otra IA son una agenda no vinculante:** no diagnosticar corrupción por un `409` esperado, ni deducir fraude de la mera autorización de encargados, ni permitir nueva inicialización sobre saldo cero. Si aparece un fallo grave **reproducido**, documentarlo con prioridad y prueba; las políticas nuevas requieren decisión del equipo.

## 6. Ambientes y seguridad

La suite local se ha ejecutado con PostgreSQL de desarrollo en el pasado. **No ejecutar tests de integración/destructivos ni SQL de prueba contra la base del desarrollador o producción**. Utilizar un PostgreSQL 16 de QA efímero/dedicado, credenciales sin publicar y un control fail-closed del destino antes de poner `RUN_DB_INTEGRATION=1`. Las pruebas de concurrencia crean y eliminan tenants temporales: revisar sus fixtures y límites de limpieza.

No pedir tokens Bearer, contraseñas, hashes de reintento ni secretos en informes o PR. Documentar solo entradas **sanitizadas** y resultados; usar alias de recursos si es posible. No realizar `docker compose down -v`, `alembic downgrade`, `stamp`, `TRUNCATE`, `DROP` ni `DELETE` sin acotamiento y aprobación.

## 7. Entregables obligatorios del auditor

1. Confirmación de acceso al código real, SHA funcional exacto, SHA documental efectivo, branch y condiciones del ambiente.
2. Matriz RF/RN/CU → ruta/método → modelo/SQL → tests → estado.
3. Informe **`plataforma-pyme/docs/revisiones/E2-5_INFORME_DE_REVISION.md`**, en su rama, con hallazgos `REV-E2-5-001...`, prioridad P0–P3, evidencia reproducible, riesgo y decisión.
4. Correcciones **locales y justificadas** solo cuando sean defectos confirmados del bloque. Cada cambio: diff mínimo, tests nuevos/regresión y documentación coherente. Si no se requiere cambio, informe de “sin cambios de código” igualmente completo.
5. Resultados de pruebas efectivamente ejecutadas por el auditor (comandos, Python/PostgreSQL/Alembic, SHA, warnings, CI), diferenciados de los runs históricos.
6. Backlog de cuestiones no corregidas, impactos de API/DDL/UML, pruebas faltantes y condiciones para aceptar merge.
7. Abrir **PR del revisor hacia `main`**, con rama propia, informe versionado y resumen de modificaciones. **No fusionar** ni tocar `main` directamente.

**Guía obligatoria:** [GUIA_MAESTRA_REVISION_BLOQUES_E2_ASISTENTE_PYME.md](GUIA_MAESTRA_REVISION_BLOQUES_E2_ASISTENTE_PYME.md).  
**Documentación de auditoría y plantilla:** [E2-5_AUDITORIA/00_LEEME_Y_PRECONDICIONES.md](E2-5_AUDITORIA/00_LEEME_Y_PRECONDICIONES.md).  
**Criterio de cierre:** revisión técnica independientes y regresión aprobadas; aceptación final por el equipo, no por el auditor/IA automáticamente.
