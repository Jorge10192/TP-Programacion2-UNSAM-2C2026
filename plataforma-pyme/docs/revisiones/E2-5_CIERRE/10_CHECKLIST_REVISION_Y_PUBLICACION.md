# E2-5 — Checklist de revisión, cierre final y publicación controlada

**Estado de revisión v1.1:** documentación fuente subida **solo a la rama documental** `docs/e2-5-cierre-revision-critica`, con PR hacia `main` pendiente de revisión. No se alteró código ni `main`, y el cierre/auditoría definitivos siguen pendientes.

## A. Revisión técnica de los documentos de este paquete

- [ ] Validar que `main` de referencia es realmente `748e69319d8d04900c009d5184168a264a9deeac` (si cambió, registrar nuevo corte).
- [ ] Contrastar `01_INFORME_CONSOLIDADO.md` contra PR #21–#23 y código actual, sin asumir que las pantallas DEMO son backend.
- [ ] Comprobar secuencia B-01…B-13 y códigos 201/200/409/422; no incluir claves de reintento en los registros.
- [ ] Comprobar secuencia C-01…C-11 y códigos 201/200/409/401; confirmar que el incidente de sesión está saneado.
- [ ] Confirmar saldos y versiones con los últimos GET aportados (ART-A: 6/4, ART-B: 6/versión 3).
- [ ] Contrastar CI de merge en `main`: 816/826/840, Python 3.12/3.14, 3 jobs exitosos y Alembic sin deriva.
- [ ] Contrastar el log Windows E2-5 C: `840 passed in 110.89s`, Docker/DB Healthy, `/ready ready/ok`.
- [ ] Revisar descripciones de concurrencia/RBAC en tests y código antes de presentarlas como comportamiento general.
- [x] Clasificar observaciones y límites en `09_RIESGOS_DEUDAS_Y_DECISIONES.md` y `13_EVALUACION_OBSERVACIONES_IA.md`; sin modificar reglas ni endpoints.

## B. Control de secretos y datos antes de distribuir

- [ ] Confirmar **revocación del token Bearer previamente expuesto**; no anexar su valor.
- [ ] Verificar que el paquete no contiene contraseñas, emails QA, tokens, claves idempotentes reales, `request_id` de comandos, `.env` ni bases de datos exportadas.
- [ ] Decidir si los **UUID de recursos QA** de `07_FICHA_QA_SANITIZADA.md` deben permanecer en la futura versión pública; no son credenciales, pero su publicación es una elección editorial.
- [ ] Controlar capturas nuevas: Swagger incluye `curl` con cabeceras; publicar solo **Server response** saneada.
- [ ] Regenerar el manifiesto SHA-256 **después** de cualquier cambio.

## C. Cierre documental definitivo — **etapa posterior a esta revisión**

- [ ] Resolver comentarios a la documentación v1.1 del PR y generar **versión aprobada** con fecha y SHA de cierre funcional inmovilizado.
- [ ] Redactar hoja de cierre `E2-5_ENTREGA_PARA_REVISION.md` o equivalente según la guía maestra, distinguible de este informe preliminar.
- [ ] Preparar **documento de encargo de auditoría E2-5**, con límites de lectura/escritura, SHA, objetivo, dependencias, requisitos y entregables esperados.
- [ ] Mantener la auditoría **separada** del cierre interno: la opinión de un revisor externo no se anticipa ni se inventa.
- [ ] Fijar criterios para corregir hallazgos P0/P1 en rama específica y PR sin fusionar automáticamente.

## D. Publicación — **solo después de aprobación**

Ubicación efectivamente utilizada para este PR: `plataforma-pyme/docs/revisiones/E2-5_CIERRE/`. Índice general actualizado en `plataforma-pyme/docs/revisiones/README.md`. Se suben fuentes Markdown/JSON, **no ZIP ni PDFs binarios**. El merge se decide solo tras revisar.

- [x] Confirmar rama de trabajo documental específica, sin edición directa no revisada de `main`.
- [ ] Comprobar que solo cambian archivos Markdown/JSON/índices autorizados; **no** tocar código, migraciones, tests, datos QA ni backend/frontend durante un cierre solo documental.
- [ ] Abrir PR de documentación con índice, manifiesto de Git blobs y changelog de la propuesta, sin presumir aprobación definitiva.
- [ ] Verificar enlaces, referencias relativas, estado de CI y que el SHA no cambió por debajo de las pruebas declaradas.
- [ ] Revisar el PR, obtener conformidad y **recién entonces** decidir el merge/publicación.
- [ ] Entregar al auditor la hoja de revisión y el commit **ya publicado**; no atribuirle hallazgos antes de que trabaje.

## E. Revisión de coherencia con documentos anteriores

Cotejar `docs/E2-5_A_MODELO_OPERACIONES_INVENTARIO.md`, `docs/E2-5_B_TRASLADOS_ATOMICOS.md`, `docs/E2-5_C_AJUSTES_Y_STOCK_INICIAL.md`, Documento 01–05 y ADR-004. Sus encabezados históricos (p.ej. «pendiente de merge») no son prueba de que la función siga ausente; señalar que los cortes A/B/C **ya se fusionaron** en el índice de cierre. No sobrescribir retroactivamente evidencias previas sin nota de revisión.

## Dictamen editorial aún pendiente

**Se propone aceptar E2-5 como funcionalmente cerrado para A–C** siempre que el responsable apruebe estas evidencias y límites. **No se propone** declarar producción, aprobar RF-07 por arrastre, reescribir UML sin contraste, ni iniciar de manera automática otro módulo. La auditoría independiente será una etapa posterior y expresa.

## F. Control de calidad para esta revisión con observaciones externas

- [x] Comparar el planteo de locks de Ajustes/Traslados con los servicios **síncronos reales**: no etiquetar un 409 esperado como pérdida de stock probada.
- [x] Conservar `STOCK_INICIAL` único aunque saldo actual sea 0; proponer conteo físico como caso de uso separado y futuro.
- [x] Distinguir reversión compensatoria ausente (deuda) de falla funcional del flujo actual.
- [x] Priorizar revisión de privilegios SQL y aprobaciones por merma antes de producción, sin declarar incidente real no demostrado.
- [x] Corregir referencia normativa: **RFC 9457** (no 7807) para futura interfaz de errores; no cambiar códigos HTTP mediante documentación.
- [ ] Agregar/correr en PR de código futuro la carrera cruzada Ajuste vs Traslado al mismo destino y los controles de permisos SQL.
- [ ] Obtener revisión y conformidad antes de merge o emisión de hoja específica de auditoría externa.
