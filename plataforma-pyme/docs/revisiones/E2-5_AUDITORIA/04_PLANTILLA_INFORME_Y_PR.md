# E2-5 — Plantilla del informe del auditor independiente y PR

**IMPORTANTE:** esta es **solo una plantilla**. El informe `E2-5_INFORME_DE_REVISION.md` debe ser creado **por el auditor**, con resultados nuevos y evidencia. Los campos `<...>` no se deben sustituir por cifras inventadas ni por resultados de otro SHA.

**Ruta del entregable final del auditor:** `plataforma-pyme/docs/revisiones/E2-5_INFORME_DE_REVISION.md`, versionado en **su propia rama de revisión**.

---

# E2-5 — Informe de revisión técnica independiente (COMPLETAR POR AUDITOR)

## 0. Ficha y procedencia

| Campo | Valor verificado |
|---|---|
| Auditor/a o equipo | `<IDENTIFICAR>` |
| Fecha e intervalo revisado | `<FECHAS>` |
| Repositorio | `Jorge10192/TP-Programacion2-UNSAM-2C2026` |
| Rama de revisión y commit | `<RAMA>` / `<SHA_DEL_AUDITOR>` |
| SHA funcional E2-5 de referencia | `748e69319d8d04900c009d5184168a264a9deeac` |
| SHA documental aprobado realmente auditado | `<SHA_REAL_POST_MERGE_DOCS>` |
| PR del auditor | `<URL_O_PENDIENTE>` |
| Acceso al código y documentos | `<ACCESO_REAL: OK/PARCIAL/NO>` |
| PostgreSQL / Python / Alembic | `<VERSIONES_VERIFICADAS>` |
| Ambientes y seguridad | `<DEDICADO/COMPARTIDO - Y LIMITES>` |
| Evidencia externa previa recibida | `<REFERENCIA_SIN_SECRETO>` |

## 1. Resumen ejecutivo y dictamen

Describir propósito, 3–7 conclusiones técnicas basadas en evidencia y **dictamen**:
- `APROBADO PARA CIERRE DEL BLOQUE` / `APROBADO CON OBSERVACIONES` / `NO APROBADO` / `PARCIALMENTE EVALUADO`.
- Aclarar si se trata de idoneidad del bloque E2-5, no de producción del sistema completo.
- Resumir qué bloquea merge, qué no, con criterios P0/P1/P2/P3.
- Separar **lo ejecutado** de lo simplemente leído en documentación o CI histórica.

## 2. Alcance exacto y archivos efectivamente consultados

| Área | Archivo o función | Inspeccionado | Modificado | Evidencia de línea/método | Justificación |
|---|---|---|---|---|---|
| ORM / migración | `inventory_operation.py` / `0016_inventory_operations.py` | `Sí/No` | `Sí/No` | `archivo:Lxx` | `...` |
| Traslado | `transfer_service.py`/router/schemas | `Sí/No` | `Sí/No` | `archivo:Lxx` | `...` |
| Ajustes | `adjustment_service.py`/router/schemas | `Sí/No` | `Sí/No` | `archivo:Lxx` | `...` |
| Ledger lectura | `inventory_router.py` / `receipt_schemas.py` | `Sí/No` | `Sí/No` | `archivo:Lxx` | `...` |
| Auth / permisos | `auth`, `locations/permissions.py` | `Sí/No` | `Sí/No` | `archivo:Lxx` | `...` |
| Tests | `test_*integration.py` | `Sí/No` | `Sí/No` | `test:función` | `...` |
| Doc académico | `01…05, 03B, ADR-004` | `Sí/No` | `Sí/No` | `sección` | `...` |

**Limitaciones de acceso:** `<NUNCA INVENTAR INSPECCION>`.

## 3. Matriz RF/CU/INV y testeo

| INV-ID | RF/CU | Endpoint y regla | Fuentes reales | Test/log | Resultado | Riesgo residual |
|---|---|---|---|---|---|---|
| `INV-01` | `RF-06` | `kind/FK/DDL` | `...` | `...` | `OK/FALLA/NO EJECUTADO` | `...` |
| `INV-07` | `CU-09` | `traslado dual, saldo no negativo` | `...` | `...` | `...` | `...` |
| `INV-10` | `CU-11` | `inicial único` | `...` | `...` | `...` | `...` |
| `INV-19` | `RF-06` | `carrera mixta` | `...` | `...` | `...` | `...` |

Completar **todas las INV-01 a INV-24** de `01_MATRIZ_AUDITORIA_E_INVARIANTES.md`, incluso las no evaluadas, explicando por qué.

## 4. Matriz general de hallazgos

| ID | Prioridad | Clasificación | Archivo/función | Evidencia reproducible | Impacto | Decisión |
|---|---|---|---|---|---|---|
| `REV-E2-5-001` | `P0/P1/P2/P3` | `Bug/Riesgo/Brecha de test/Doc/Mejora` | `ruta:línea` | `test/HTTP/SQL` | `...` | `Corregido/Pendiente/Descartado` |

**Nivel mínimo de cada hallazgo:**

### REV-E2-5-001 — Título de síntoma observable

- **Prioridad y clasificación:** `<...>`.
- **Regla que se viola o podría fallar:** `<RF/RN/CU/INV>`.
- **Precondición reproducible y actor/tenant:** `<...>`.
- **Ruta y evidencia:** `<archivo:método/línea, test, estado SQL>`.
- **Entrada saneada:** `<sin Bearer ni claves reales>`.
- **Esperado vs observado:** `<códigos, deltas, versiones>`.
- **Reproducción:** `<pasos comprobables en DB aislada, con comandos seguros>`.
- **Causa técnica y nivel de confianza:** `<confirmada / hipótesis>`.
- **Impacto y seguridad:** `<dato, dinero, integridad, disponibilidad, UX>`.
- **Recomendación mínima:** `<sin salto de alcance, contrato y migraciones compatibles>`.
- **Prueba de regresión deseada:** `<nombre y aserciones>`.
- **Estado y decisión:** `<corregido/no corregido/esperando aprobación>`.

## 5. Cambios efectuados y pruebas asociadas

| MOD-ID | Hallazgo | Archivo(s) | Resumen del diff | Test nuevo/modificado | Resultado | Impacto doc/API/SQL |
|---|---|---|---|---|---|---|
| `MOD-001` | `REV-E2-5-001` | `...` | `...` | `test_...` | `Passed/No ejecutado` | `...` |

No refactorizar o añadir features sin hallazgo justificado. Si no hubo cambios, escribir **«No se modificó código»** y explicar cómo se validó.

## 6. Registro de pruebas propias (NO resultados heredados)

| Ejecutó auditor | SHA | Entorno/DB | Comando o caso | Resultado/fecha | Log referenciado |
|---|---|---|---|---|---|
| `Sí/No` | `<...>` | `<...>` | `pytest -q` | `X passed / X failed / NO EJECUTADO` | `<...>` |
| `Sí/No` | `<...>` | `<...>` | `alembic current/check` | `<...>` | `<...>` |
| `Sí/No` | `<...>` | `<...>` | `T01…T20, races` | `<...>` | `<...>` |
| `Sí/No` | `<...>` | `<...>` | `CI de PR` | `<...>` | `<URL>` |

Como referencia histórica, hasta el merge funcional de E2-5 C CI tuvo **840 passed en Python 3.12/3.14** y Windows reportó **840 passed**; **no copiar estos valores como test ejecutado por el auditor**.

## 7. Riesgos y cambios que NO se hicieron

| Código | Recomendación o riesgo | Prioridad | Por qué no se aplicó | Requisito afectado | Próximo paso |
|---|---|---|---|---|---|
| `PEN-001` | `...` | `P1/P2/P3` | `Fuera del bloque / no confirmado / depende de decisión` | `...` | `...` |

Aclarar especialmente SQL inmutabilidad, aprobaciones, reversión y reserva/ventas, sin equiparar mejoras a fallos.

## 8. Compatibilidad y relación con bloques anteriores

- E2-4 compras/recepciones `COMPRA_RECEPCION` y comprobante histórico.
- E2-1/2/3: auth/identidad, membresías, sedes y catálogo; solo dependencias.
- E2-6/RF-07 ventas: no implementado, no atribuirlo a E2-5.
- Migración `e25a_inventory_ops` previamente aplicada: no se reescribe.
- Mapa documentación 01–05/03B/ADR-004 según lo realmente cambiado.

## 9. Seguridad de la entrega y estado Git

- Rama utilizada y `git diff --name-status` vs SHA inicial; listar **todos** los archivos.
- Confirmación de que no se borraron datos QA y se usó DB de tests aislada.
- Confirmación de no publicar tokens, claves, correos QA o DSN.
- CI PR actual: estado y URL.
- Checklist de compatibilidad, tests que faltan y limitaciones.

## 10. Conclusión con condiciones de aceptación

- **Aprobable ahora:** `<motivos con evidencia>`.
- **Bloqueado hasta corregir:** `<IDs P0/P1 justificados>`.
- **No aprobado como producción:** `<hardening no certificado, si corresponde>`.
- **Próxima decisión solicitada al responsable:** `<...>`.
- **PR hacia main:** `<URL>` — **sin merge**.

---

## Guía de redacción y revisión del PR

**Título sugerido:** `review(E2-5): auditoría independiente de inventario A–C — <resultado>`.

**Descripción obligatoria:** SHA de base, SHA de head, metodología, informe versionado, tabla de defectos corregidos, tests propios (no heredados), impactos de DDL y contrato, pendientes priorizados, riesgos, avisos de seguridad, instrucciones de revisión/rollback no destructivo y condiciones de merge. Toda afirmación deberá ser trazable a código o evidencia del PR.

**Regla:** el auditor abre PR, el equipo revisa; **el auditor NO lo fusiona y NO crea commits en main directamente**.
