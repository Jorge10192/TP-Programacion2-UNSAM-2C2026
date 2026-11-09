# E2-4 — Observaciones de la revisión recibida y decisiones documentales

**Tipo:** evaluación de observaciones externas aportadas por el desarrollador el 09/11/2026. **No es una auditoría independiente exhaustiva realizada sobre todos los archivos**. Se comprobaron expresamente contratos, migraciones, tests, CI y el bloqueo de Catálogo que se señalan abajo. Las opiniones sobre diseño futuro quedan clasificadas como propuestas, no errores reproducidos.

## 1. Informe y calidad de evidencias

| ID | Observación recibida | Comprobación y decisión |
|---|---|---|
| REV-E24-001 | Falta bitácora manual CRUD Proveedores | **Confirmado como brecha de documentación de uso**: se dispone de proveedor QA como referencia histórica y de tests HTTP/SQL/CI, pero no de la transcripción manual de POST/lista/PATCH/status. No se inventan resultados. Pendiente de QA adicional si se exige. |
| REV-E24-002 | Imposible reproducir replay histórico sin publicar clave | **Confirmado como limitación deliberada de sanitización**. El evaluador generará nuevos UUID4 privados en un tenant de prueba y repetirá la misma operación; los GET originales sí permiten verificar recursos pasados. Se agrega colección `requests/E2-4_QA.http` con placeholders. |
| REV-E24-003 | Suite local sobre base de desarrollo con datos | **Confirmado como deuda de aislamiento físico**. PR #18 corrigió la contaminación de aserciones SQL y se confirmó 797/797 con datos previos; **no creó DB efímera ni bloqueó URLs de producción**. Se propone trabajo de infraestructura en bloque separado. |
| REV-E24-004 | Duplicidad de PDF y Markdown en Git | **Aceptado**. Solo Markdown/JSON/colección HTTP/manifiesto de checksums se versionan. El PDF/ZIP académico anterior queda fuera de Git para evitar duplicación binaria; puede regenerarse para entregar. |
| REV-E24-005 | Falta frontmatter | **Aceptado**. El informe rector tiene frontmatter con corte, commit, alcance, estado y CI. |
| REV-E24-006 | Seeder de QA para terceros | **Parcialmente aceptado**. No se agregará un seeder que muta recursos al ejecutarse automáticamente y requiera tokens. Se incluye colección .http parametrizada; un seeder opt-in aislado con claves privadas y limpieza segura queda como mejora posterior. |
| REV-E24-007 | Checksums del manifiesto | **Aceptado**. Archivo de `sha256sum` regenerado contra textos finales que queden en la rama, con instrucciones de verificación local y sin líneas extra no compatibles con `-c`. |

## 2. Arquitectura y operación

| ID | Tema | Situación AS-IMPLEMENTED y tratamiento |
|---|---|---|
| REV-E24-008 | Recepción parcial / multidestino | **Diferida por alcance explícito**. Actualmente 1:1 compra/recibo y una sola ubicación, operación atómica 100%. Evolución futura 1:N exigirá diseño y migración aditiva con control de cantidades restantes; no se cambia 0015 retrospectivamente. |
| REV-E24-009 | Estado `CANCELADA` inalcanzable por API | **Brecha funcional documentada**. Estado presente en dominio, sin POST/PATCH de cancelación comercial. Definir permiso, transición, compensación y mensajes de error en futuro incremento. |
| REV-E24-010 | No se puede deshacer la recepción | **Brecha funcional documentada**. Proponer operación compensatoria/ajuste auditable que no borre el movimiento original y respete stock no negativo. |
| REV-E24-011 | Sin divisa ni tipo de cambio en compra | **Limitación comercial real** para multimoneda; centavos enteros sin ISO 4217 explícita. No asumir que importes están siempre en ARS por pruebas expresadas en pesos. |
| REV-E24-012 | Desvío por HALF_UP por renglón | **Decisión numérica explícita y probada**. La suma de líneas puede diferir de comprobante externo por redondeos; futura conciliación fiscal/impuestos/descuentos debe ser explícita y auditada. |
| REV-E24-013 | Tope de 30 líneas | **Límite funcional vigente**; evaluar altas/importaciones masivas con garantías de atomicidad y límite de tamaño. |
| REV-E24-014 | Historial inmutable solo REST | **Riesgo de hardening confirmado por diseño:** no existen UPDATE/DELETE REST, pero tampoco disparadores que bloqueen sentencias SQL con privilegios. Priorizar rol SQL restringido, auditoría y evaluación de triggers antes de producción. |
| REV-E24-015 | Supuesta falta de FOR SHARE en Catálogo | **No aplicable**: `backend/app/modules/purchases/receipt_service.py` obtiene artículos con `.with_for_update(read=True)` (bloqueo compartido al usar PostgreSQL). La revisión externa debe corregir este punto. Se preserva como deuda probar una carrera específica en la que alguien intenta cambiar tipo/unidad mientras se recibe. |

## 3. Decisiones de edición efectuadas en este PR documental

- **Editado** el encabezado del informe rector con metadatos YAML y aclaración del origen de las evidencias.
- **Conservada** la bitácora manual con los 17 casos reportados y agregada nota de ausencia del CRUD manual de Proveedores.
- **Conciliadas** las notas técnicas de CI, arquitectura, trazabilidad, ficha QA y reproducción, explicitando el bug del test, la deuda de DB compartida y el bloqueo SQL existente.
- **Añadidos** un JSON saneado para máquinas, ejemplos HTTP parametrizados, una hoja de entrega para una eventual revisión independiente y un manifiesto de checksums.
- **Actualizados** los índices de documentación académica y técnica con nota de corte vigente; los párrafos antiguos quedan como historial.
- **No modificados** código backend/frontend, migraciones, archivos UML, tablas, entornos, datos QA o secretos.

## 4. Límites de la decisión

El cierre funcional E2-4 no certifica un MVP productivo ni significa que los pendientes estén aprobados para implementar. Cada cambio futuro debe empezar con decisión de alcance, ADR si altera el dominio, migración compatible y tests de regresión. Si se realiza una auditoría independiente posterior, debe partir de SHA fijado y producir su propio informe, distinto del presente documento de **respuesta a observaciones**.

**Fuentes de verificación:** PR #12–#15, #17–#18; CI [42530739959](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42530739959); rutas de `suppliers`, `purchases`, `receipt_service.py`, migraciones 0012–0015 y respuestas de Swagger descritas en la bitácora.