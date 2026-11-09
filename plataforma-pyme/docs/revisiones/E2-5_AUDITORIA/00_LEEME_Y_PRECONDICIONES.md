# E2-5 — Paquete de auditoría técnica independiente

**Estado:** documentación de **encargo preparada**, aún NO es auditoría ejecutada, NO está aprobada para producción y NO habilita merge automático.  
**Fecha:** 09/11/2026.  
**Repositorio:** https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026  
**Rama/PR documental preparatorio:** `docs/e2-5-cierre-revision-critica`, [PR #24 (draft)](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/24).  
**SHA funcional inmutable de E2-5:** `748e69319d8d04900c009d5184168a264a9deeac`.  
**SHA documental de publicación:** **PENDIENTE**, completar tras revisar/fusionar PR #24.  
**Directorios autorizados:** `plataforma-pyme/`, especialmente `backend/` y documentación.  
**Guía rectora:** [Guía maestra revisiones E2](../GUIA_MAESTRA_REVISION_BLOQUES_E2_ASISTENTE_PYME.md), con precedencia de [entrega E2-5](../E2-5_ENTREGA_PARA_REVISION.md) para este bloque.

## 1. Propósito

Facilitar que un compañero técnico o una IA diferente revise **de modo independiente y reproducible** el código de inventario E2-5 A/B/C. La auditoría debe determinar si los invariantes de stock, el aislamiento multiempresa, permisos, idempotencia, transacciones, concurrencia, compatibilidad de recepción E2-4 y documentación son correctos y suficientemente probados. No debe limitarse a repetir la opinión de la IA principal ni convertir sus preferencias en bugs.

**No confundir:**
- `E2-5_CIERRE/`: **cierre interno con evidencias reportadas** y evaluación de observaciones anteriores.
- `E2-5_AUDITORIA/`: **criterios, procedimiento y plantillas para que otro revisor audite**.
- `E2-5_INFORME_DE_REVISION.md`: **resultado futuro que redactará el auditor** en su propia rama. **Todavía no existe y no debe fabricarse**.

## 2. Documentos de este encargo

| Documento | Función |
|---|---|
| [01_MATRIZ_AUDITORIA_E_INVARIANTES.md](01_MATRIZ_AUDITORIA_E_INVARIANTES.md) | Mapa de capas, invariantes, archivos, ataques/casos límite, verificaciones exigidas |
| [02_PLAN_PRUEBAS_Y_REPRODUCCION.md](02_PLAN_PRUEBAS_Y_REPRODUCCION.md) | Matriz de casos, concurrencia, PostgreSQL, HTTP, regresión y seguridad de ejecución |
| [03_PROMPT_MAESTRO_AUDITOR_IA.md](03_PROMPT_MAESTRO_AUDITOR_IA.md) | Texto listo para asignar a una segunda IA con reglas explícitas |
| [04_PLANTILLA_INFORME_Y_PR.md](04_PLANTILLA_INFORME_Y_PR.md) | Informe exigido, matriz de hallazgos, cambios, tests y PR |
| [05_CRITERIOS_ACEPTACION_Y_NO_REGRESION.md](05_CRITERIOS_ACEPTACION_Y_NO_REGRESION.md) | Barreras de calidad, condiciones para aceptar, devolver o bloquear una auditoría |

## 3. Fuentes de verdad y orden de lectura

1. Confirmar **acceso real** a GitHub: SHA, rama, arbol, código y migraciones, no solo README o capturas.
2. Abrir [hoja de entrega E2-5](../E2-5_ENTREGA_PARA_REVISION.md) y la [guía maestra](../GUIA_MAESTRA_REVISION_BLOQUES_E2_ASISTENTE_PYME.md).
3. Cotejar `plataforma-pyme/entrega-programacion-2/`, documentos 01 a 05; [ADR-004](../../ADR/ADR-004-stock-unidades-sku.md) y `03B_CLASES_COMERCIO_E_INVENTARIO.puml`, separando AS-IS de TO-BE.
4. Leer `backend/app/infrastructure/models/{inventory_operation,stock_balance,stock_movement}.py` y `backend/alembic/versions/20261109_0016_inventory_operations.py`.
5. Leer `backend/app/modules/purchases/{transfer,adjustment}_{router,service,schemas}.py` y `inventory_router.py`; dependencias de E2-4 en `receipt_service.py` y `receipt_schemas.py`.
6. Inspeccionar tests y su aislamiento, luego CI de merges [A](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42601062105), [B](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42604071018), [C](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42617212795).
7. Finalmente cotejar [cierre interno](../E2-5_CIERRE/00_LEEME.md), las [bitácoras Swagger](../E2-5_CIERRE/02_BITACORA_SWAGGER_E2-5_B.md) y [C](../E2-5_CIERRE/03_BITACORA_SWAGGER_E2-5_C.md), así como [observaciones de otra IA](../E2-5_CIERRE/13_EVALUACION_OBSERVACIONES_IA.md). **Estas últimas son insumos, no veredictos**.

Si una fuente está ausente/inaccesible, **registrarlo** y limitar las conclusiones. Nunca inventar pruebas, commits, rutas, evidencias o resultados.

## 4. Preparación del ambiente del auditor

- **Código congelado:** E2-5 C `748e69319d8d04900c009d5184168a264a9deeac`. La rama de auditoría se crea desde el **main ya publicado con documentación**, pero el revisor identifica claramente si el código entre ambos SHAs es idéntico; si no, compara y solicita decisión del equipo.
- **Ambiente:** PostgreSQL **16 separado/efímero**, Python 3.12/3.14 cuando sea posible, Docker/Compose y Alembic. Verificar la base conectada y **fail-closed** antes de habilitar tests de integración.
- **Seguridad:** credenciales y tokens de QA quedan fuera del informe. No usar los UUID QA históricos para nuevos POST o ejercicios destructivos.
- **No borrar ni migrar a la baja** el volumen/DB QA del desarrollador; no ejecutar tests contra producción.
- **Procedimiento:** inspección inicial **solo lectura** y matriz de hallazgos primero. Cambios locales y mínimos solo con hallazgo fundamentado, en rama propia, siguiendo la guía maestra. No merge por parte del auditor.

## 5. Dictamen esperado del revisor

Por cada dimensión: `Aprobado`, `Aprobado con observaciones`, `No aprobado` o `No evaluado`, adjuntando evidencia de código/test/HTTP/SQL/CI. El informe final debe declarar **criterios comprobados, límites y riesgos residuales**. Un PR sin correcciones de código puede ser válido si demuestra que no hacen falta. Un PR con refactorizaciones no justificadas **no** gana calidad por cambiar más archivos.

## 6. Etapas formales

| Etapa | Responsable | Estado |
|---|---|---|
| Cierre funcional E2-5 A/B/C | Equipo de desarrollo | Implementado en `main` SHA funcional |
| Cierre documental, control editorial | Equipo de desarrollo | PR #24 draft, revisión previa |
| Aprobación/merge de PR documental | Responsable del equipo | **Pendiente** |
| Auditoría técnica independiente | Compañero/IA revisora | **No iniciada** |
| Correcciones justificadas y PR del auditor | Compañero/IA revisora | **No iniciadas** |
| Revisión, decisión y merge de correcciones | Responsable del equipo | **Pendiente** |

**Este paquete está listo para ser leído y revisado. Su utilización operativa por el auditor externo depende de publicar primero la documentación aprobada.**
