# E2-5 — Puertas de calidad, no regresión y decisión de auditoría

**Estado:** criterios **propuestos para una auditoría futura**; no son aprobación del código por parte de un revisor externo.  
**Línea funcional a comprobar:** `748e69319d8d04900c009d5184168a264a9deeac`.  
**Responsable de aprobar o rechazar merge:** titular/equipo del proyecto, no la IA que escribe el informe.

## 1. Condiciones previas a iniciar

| Puerta | Obligatorio | Si falla |
|---|---|---|
| P-01 | Acceso real a código, documentos, migración, tests y `main` SHA exacto | Detener conclusiones sobre componentes inaccesibles |
| P-02 | **Cumplido:** PR #24 fusionado y cierre publicado con SHA `c66df2f8ddaa8179ca12e342bd3099348bc6b155`; antes de comenzar, registrar además el HEAD efectivo | Si se detectan nuevos cambios funcionales posteriores al corte E2-5, aclarar alcance o congelar nuevo SHA antes de ejecutar |
| P-03 | Rama del revisor desde `main` publicado; no commits directos a `main` | Rehacer preparación de rama |
| P-04 | Base PostgreSQL 16 **aislada/efímera** y configuración de tests verificada | No ejecutar `RUN_DB_INTEGRATION=1` ni ensayos destructivos |
| P-05 | Sin credenciales expuestas en prompts, archivos, CI, logs o capturas | Sanear antes de enviar; revocar sesiones afectadas |

## 2. Criterios mínimos de aceptación funcional

| Código | Criterio | Evidencia mínima para declarar aprobado |
|---|---|---|
| A-01 | El ledger distingue **recepción** vs. **operación manual**, kind y signo | Esquema SQL+modelos+test PostgreSQL, no solo Pydantic |
| A-02 | No se permite empresa/ubicación/artículo/actor de otro tenant | Tests de autorización y FK compuestas, respuestas no divulgadoras |
| A-03 | Saldo nunca negativo ni excedido | Test de débito condicional/ajuste, límites y rollback |
| A-04 | Traslado es **una operación atómica de dos movimientos neto cero** | Carrera y lectura de balances/ledger tras commit |
| A-05 | Ajuste/inicial es **una operación de un movimiento firmado** | Compensación de signo y versión verificada |
| A-06 | Stock inicial histórico único **aunque saldo posteriormente sea cero** | Test con saldo previo 0, historial y clave nueva |
| A-07 | Versión observada en ajuste evita operar sobre saldo viejo | 409 con cambios concurrentes y estado intacto |
| A-08 | Idempotencia sin duplicaciones en reintento normal, concurrente y cross-kind | 201/200 y 409 según casos, mismas operaciones |
| A-09 | Permisos diferenciados por rol y sede | Test titular/admin/encargado/trabajador/asignación revocada |
| A-10 | Compatibilidad E2-4: compras, recepción completa, DTO histórico y movimientos | Regresión de compra + recepción + GET sin reescritura |
| A-11 | Manejo de errores HTTP con rollback y sin divulgación | Evidencias 401/403/404/409/422 y fallos SQL representativos |
| A-12 | Tests deterministas aislados por tenant/DB | Fixtures inspeccionadas y ejecución propia segura |
| A-13 | Documentación y UML diferencian AS-IMPLEMENTED/TO-BE | Matriz RF→CU→ruta→test consistente con SHA |

Un criterio puede estar **NO EVALUADO** cuando falta ambiente o prueba. No elevarlo a aprobado por mera existencia de método o de CI histórica.

## 3. Umbral de severidad y acción

| Prioridad | Evidencia exigible | Decisión recomendada |
|---|---|---|
| **P0** | Corrupción/pérdida de datos o vulnerabilidad crítica **reproducida**, con impacto concreto | Bloquear merge de cambios auditados hasta contención, solución y pruebas; no redactar “P0” por hipótesis |
| **P1** | Bug confirmado de regla central, autorización o estabilidad, o riesgo de seguridad alto verificado | Corregir en alcance si es seguro; si requiere rediseño, documentar bloqueo y pedir aprobación |
| **P2** | Riesgo plausible, falta de prueba significativa, deuda funcional o contradicción documental | Corregir si local/proporcional; de lo contrario backlog aceptado y criterio de verificación |
| **P3** | Estilo, mejora opcional o futura feature | Registrar sin refactor preventivo |

Una **vulnerabilidad SQL de runtime** cambia de riesgo a bug **solo cuando se comprueban privilegios y posibilidad de mutación** bajo el perfil efectivo, de forma segura en una base efímera; aun así su prioridad depende de amenaza/ambiente. Una carrera con `409` **correcto** no debe etiquetarse como pérdida de stock.

## 4. Regla de no regresión

**Cualquier corrección funcional debe conservar:**
- Contratos de rutas y request/response E2-4, E2-5 B/C; cambiar HTTP, Pydantic o campos sin negociación es ruptura.
- Relaciones tenant, campos de auditoría, idempotencia por actor/tipo/huella y versiones existentes.
- Migraciones previas aplicadas; si hace falta DDL, **nueva revisión Alembic compatible** con datos históricos.
- Separación compra registrada/recepción; sin movimiento de compra antes de recibir.
- Artículos físicos activos y cantidades enteras en escala de milésimas; sin stock para servicios.
- Locks ordenados/commit único/rollback sin parcial; sin ventanas de double-spend.
- Frontend React DEMO no alterado salvo pedido nuevo; no agregar `localStorage` o stock alternativo por atajo.
- Fuente de verdad del saldo en API SQL y ledger histórico; sin scripts manuales ocultos.

**Validación mínima de cualquier cambio de código propuesto:** Pytest relevante, suite backend completa sobre DB **aislada** cuando posible, Alembic current/check, CI Python3.12/3.14 PostgreSQL16 y Docker, pruebas de regresión E2-4, diff de migraciones y documentación de compatibilidad. Registrar los tests que no se ejecutaron.

## 5. Aceptación del informe del auditor

Se acepta un **informe de auditoría completo** cuando:
1. Usa fuentes reales y fija SHAs del código funcional y documental.
2. Incluye 24 controles `INV-01..INV-24` con estado/evidencia o justificación de no ejecución.
3. Acompaña hallazgos con reproducción y prioridad proporcionada, separa bug de riesgo.
4. Adjunta registro seguro de pruebas propias, warnings, CI y límites de ambiente.
5. Indica qué cambió y qué **no** cambió, por qué, y relación con bloques anteriores.
6. Entrega informe versionado `E2-5_INFORME_DE_REVISION.md` y PR separado hacia `main` **sin merge**.
7. No expone secretos ni modifica datos QA/producción.

**No alcanza** con “todo correcto, 840 tests” ni con afirmar «el diseño es P0 por no tener expected_version en traslado». El análisis debe sostenerse en restricciones, servicio, orden de locks, comportamiento y pruebas.

## 6. Estados de cierre

- **Apto para revisión técnica independiente:** documentación del equipo validada con advertencias/pendientes.
- **Aprobado por auditoría E2-5:** solo tras informe **independiente realizado** y decisión del equipo.
- **Apto para merge de correcciones:** solo si PR del revisor fue evaluado y sus tests/CI resultan aceptables.
- **Apto para producción:** requiere hardening y operación real más allá de E2-5; no deriva de ninguno de los estados anteriores.

**El OK técnico documental del equipo nunca reemplaza estas fases.**
