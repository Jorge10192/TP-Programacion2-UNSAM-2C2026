# E2-5 — Checklist de revisión, cierre final y publicación controlada

**Estado actualizado tras publicación:** cierre documental **aprobado y fusionado** mediante PR #24, SHA original `c66df2f8ddaa8179ca12e342bd3099348bc6b155`. Backend sin cambios; **auditoría independiente pendiente de ejecución**, no confundir cierre documental con validación de producción.

## A. Revisión técnica de los documentos de este paquete

- [x] Validar que `main` de referencia es realmente `748e69319d8d04900c009d5184168a264a9deeac` (si cambió, registrar nuevo corte).
- [x] Contrastar `01_INFORME_CONSOLIDADO.md` contra PR #21–#23 y código actual, sin asumir que las pantallas DEMO son backend.
- [x] Comprobar secuencia B-01…B-13 y códigos 201/200/409/422; no incluir claves de reintento en los registros.
- [x] Comprobar secuencia C-01…C-11 y códigos 201/200/409/401; confirmar que el incidente de sesión está saneado.
- [x] Confirmar saldos y versiones con los últimos GET aportados (ART-A: 6/4, ART-B: 6/versión 3).
- [x] Contrastar CI de merge en `main`: 816/826/840, Python 3.12/3.14, 3 jobs exitosos y Alembic sin deriva.
- [x] Contrastar el log Windows E2-5 C: `840 passed in 110.89s`, Docker/DB Healthy, `/ready ready/ok`.
- [x] Revisar descripciones de concurrencia/RBAC en tests y código antes de presentarlas como comportamiento general.
- [x] Clasificar observaciones y límites en `09_RIESGOS_DEUDAS_Y_DECISIONES.md` y `13_EVALUACION_OBSERVACIONES_IA.md`; sin modificar reglas ni endpoints.

## B. Control de secretos y datos antes de distribuir

- [x] Confirmar **revocación de la sesión del token Bearer expuesto**: `POST /api/v1/auth/logout` devolvió **204** usando el mismo token (09/11/2026, 15:23:37 GMT; **SWAGGER-REPORTADO**, no inspección SQL). No anexar su valor. Este cierre es **de esa sesión**, no de todas las posibles sesiones de la cuenta.
- [x] Verificar que el paquete no contiene contraseñas, emails QA, tokens, claves idempotentes reales, `request_id` de comandos, `.env` ni bases de datos exportadas.
- [x] **UUID QA autorizados por el responsable** para permanecer como evidencia de trazabilidad en el repositorio público; no equivalen a credenciales.
- [ ] Controlar capturas nuevas: Swagger incluye `curl` con cabeceras; publicar solo **Server response** saneada.
- [x] Regenerar **al final** el manifiesto de OID Git `12_MANIFIESTO_GIT_BLOBS.md` después de las ediciones del PR; el SHA-256 del ZIP v1.0 no aplica. **Si se edita algo después, regenerarlo de nuevo.**

## C. Cierre documental definitivo — **etapa posterior a esta revisión**

- [ ] Resolver comentarios a la documentación v1.1 del PR y generar **versión aprobada** con fecha y SHA de cierre funcional inmovilizado.
- [ ] Redactar hoja de cierre `E2-5_ENTREGA_PARA_REVISION.md` o equivalente según la guía maestra, distinguible de este informe preliminar.
- [ ] Revisar y aprobar el **paquete de encargo de auditoría E2-5** en `../E2-5_AUDITORIA/`; preparación no equivale a ejecución.
- [ ] Mantener la auditoría **separada** del cierre interno: la opinión de un revisor externo no se anticipa ni se inventa.
- [ ] Fijar criterios para corregir hallazgos P0/P1 en rama específica y PR sin fusionar automáticamente.

## D. Publicación — **completada; auditoría independiente posterior**

Ubicación efectivamente utilizada para este PR: `plataforma-pyme/docs/revisiones/E2-5_CIERRE/`. Índice general actualizado en `plataforma-pyme/docs/revisiones/README.md`. Se suben fuentes Markdown/JSON, **no ZIP ni PDFs binarios**. El PR #24 fue revisado por el equipo y se fusionó en `main` al SHA `c66df2f8ddaa8179ca12e342bd3099348bc6b155`.

- [x] Confirmar rama de trabajo documental específica, sin edición directa no revisada de `main`.
- [x] Comprobar que solo cambian archivos Markdown/JSON/índices autorizados; **no** tocar código, migraciones, tests, datos QA ni backend/frontend durante un cierre solo documental.
- [x] Abrir PR de documentación con índice, manifiesto de Git blobs y changelog de la propuesta, sin presumir aprobación definitiva.
- [x] Verificar enlaces, referencias relativas, estado de CI y que el SHA no cambió por debajo de las pruebas declaradas.
- [x] Revisar el PR, obtener conformidad y realizar merge/publicación: PR #24, SHA `c66df2f8ddaa8179ca12e342bd3099348bc6b155`.
- [ ] Entregar al auditor la hoja de revisión y el commit **ya publicado**; no atribuirle hallazgos antes de que trabaje.

## E. Revisión de coherencia con documentos anteriores

Cotejar `docs/E2-5_A_MODELO_OPERACIONES_INVENTARIO.md`, `docs/E2-5_B_TRASLADOS_ATOMICOS.md`, `docs/E2-5_C_AJUSTES_Y_STOCK_INICIAL.md`, Documento 01–05 y ADR-004. Sus encabezados históricos (p.ej. «pendiente de merge») no son prueba de que la función siga ausente; señalar que los cortes A/B/C **ya se fusionaron** en el índice de cierre. No sobrescribir retroactivamente evidencias previas sin nota de revisión.

## Dictamen editorial propuesto y control final pendiente

**Se propone aceptar E2-5 como funcionalmente cerrado para A–C** siempre que el responsable apruebe estas evidencias y límites. **No se propone** declarar producción, aprobar RF-07 por arrastre, reescribir UML sin contraste, ni iniciar de manera automática otro módulo. La auditoría independiente será una etapa posterior y expresa.

## F. Control de calidad para esta revisión con observaciones externas

- [x] Comparar el planteo de locks de Ajustes/Traslados con los servicios **síncronos reales**: no etiquetar un 409 esperado como pérdida de stock probada.
- [x] Conservar `STOCK_INICIAL` único aunque saldo actual sea 0; proponer conteo físico como caso de uso separado y futuro.
- [x] Distinguir reversión compensatoria ausente (deuda) de falla funcional del flujo actual.
- [x] Priorizar revisión de privilegios SQL y aprobaciones por merma antes de producción, sin declarar incidente real no demostrado.
- [x] Corregir referencia normativa: **RFC 9457** (no 7807) para futura interfaz de errores; no cambiar códigos HTTP mediante documentación.
- [ ] Agregar/correr en PR de código futuro la carrera cruzada Ajuste vs Traslado al mismo destino y los controles de permisos SQL.
- [x] Obtener conformidad documental y fusionar el PR; la hoja de encargo está publicada, pero la **auditoría independiente aún no fue ejecutada**.


## G. Resultado de revisión interna v1.2

El [acta de control editorial y técnico](14_REVISION_INTEGRAL_DOCUMENTAL.md) emite **OK para revisión del equipo y preparación de auditoría**, pero **NO** para producción ni merge automático. La [hoja E2-5](../E2-5_ENTREGA_PARA_REVISION.md) y el [paquete del auditor](../E2-5_AUDITORIA/00_LEEME_Y_PRECONDICIONES.md) están preparados. **Aprobación y merge documental completados**, SHA original `c66df2f8ddaa8179ca12e342bd3099348bc6b155` ya conocido. Falta únicamente ejecutar la auditoría independiente con el HEAD que corresponda.
