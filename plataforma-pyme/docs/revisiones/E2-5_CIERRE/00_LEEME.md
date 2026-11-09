# E2-5 — Paquete documental para revisión previa al cierre definitivo

**Proyecto:** Asistente PyME · Programación 2 (UNSAM, 2C2026)  
**Bloque:** E2-5 — Inventario · cortes A (modelo), B (traslados), C (ajustes y stock inicial)  
**Fecha del corte documental:** 9 de noviembre de 2026  
**Versión documental:** 1.1 — **BORRADOR VERSIONADO EN RAMA DOCUMENTAL**, pendiente de revisión y merge; no auditoría independiente  
**Repositorio:** https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026  
**Área examinada:** `plataforma-pyme/` · **rama:** `main`  
**Commit exacto de cierre funcional:** `748e69319d8d04900c009d5184168a264a9deeac`  
**Migración vigente:** `e25a_inventory_ops`.

## Propósito y límites de esta entrega

Este directorio contiene **el cierre documental preliminar de E2-5**, procedente del ZIP v1 y revisado a la luz de observaciones de otra IA contrastadas con el código. Se publica solo en una **rama y PR documental**, sin modificar código, tablas, datos ni `main`. La publicación definitiva requiere revisar y fusionar el PR; la hoja específica de auditoría se preparará por separado, una vez aprobado el cierre. **Esta evaluación no es una auditoría independiente ni una aprobación de producción.**

### Índice

| Archivo | Para qué sirve |
|---|---|
| `01_INFORME_CONSOLIDADO.md` | Dictamen técnico acotado, objetivos, resultados y situación al cierre |
| `02_BITACORA_SWAGGER_E2-5_B.md` | Pruebas manuales de compra, recepción, traslado, reintentos y saldos |
| `03_BITACORA_SWAGGER_E2-5_C.md` | Pruebas manuales de stock inicial, ajustes, errores y reconciliación |
| `04_PRUEBAS_AUTOMATIZADAS_CI_Y_WINDOWS.md` | PR, SHA, runs, cantidad de tests, ejecución local y cobertura inferible |
| `05_ARQUITECTURA_MODELO_Y_API.md` | Modelo de datos, rutas, controles y límites de las transacciones |
| `06_MATRIZ_TRAZABILIDAD.md` | RF/CU → código → pruebas → criterios de aceptación |
| `07_FICHA_QA_SANITIZADA.md` | Identificadores de recursos QA, dos artículos y estado final |
| `08_REPRODUCCION_SEGURA.md` | Reproducción no destructiva en Windows/PostgreSQL y secuencia de validaciones |
| `09_RIESGOS_DEUDAS_Y_DECISIONES.md` | Pendientes reales y prioridades propuestas, sin inventar defectos |
| `10_CHECKLIST_REVISION_Y_PUBLICACION.md` | Revisión previa, distinción de auditados/no auditados y siguiente decisión |
| `11_EVIDENCIA_ESTRUCTURADA.json` | Resumen legible por herramientas de QA, con resultados y sin secretos |
| `12_MANIFIESTO_GIT_BLOBS.md` | Identificadores Git blob verificados en el PR; sustituyen hashes del ZIP anterior que ya no corresponden al contenido revisado |
| `13_EVALUACION_OBSERVACIONES_IA.md` | Contraste razonado de 14 observaciones externas, decisiones y prioridades sin cambiar código |

## Política estricta de seguridad

- **No se incluyen** contraseñas, tokens de sesión, encabezados Bearer reales, claves reales de idempotencia ni sus valores de solicitud, hashes de esos valores, credenciales de base, ni correos del usuario QA.
- Se conservan algunos **UUID de recursos QA** (empresa, ubicaciones, artículos y operaciones) porque son identificadores de negocio útiles para contrastar el ledger. **No son credenciales**. Los UUID de identidad personal se omiten.
- No se incluye el `curl` copiado desde Swagger, precisamente porque podría exponer una cabecera sensible. Las respuestas se reducen a códigos, estados, cantidades, eventos y relaciones verificables.
- En la conversación de QA se copió una cabecera Bearer válida en una ocasión. **No hay evidencia aquí de que fuera revocada**. La revocación/cambio de sesión es un pendiente de seguridad a confirmar **antes de publicar**. No se reproduce su valor.
- Cualquier nueva captura o transcripción debe inspeccionarse y sanearse **antes** de adjuntarla o subirla a Git.

## Procedencia y grado de prueba

**CI-VERIFICADO:** ejecución observada en GitHub Actions asociada a un commit específico.  
**LOCAL-REPORTADO:** salida de PowerShell copiada por el desarrollador; no acceso remoto independiente a su máquina.  
**SWAGGER-REPORTADO:** respuesta HTTP real aportada por el desarrollador; se validó su coherencia con el flujo y el código consultado.  
**CÓDIGO-INSPECCIONADO:** archivos existentes en GitHub `main` al SHA indicado.  
**PENDIENTE:** falta evidencia suficiente o está fuera de este corte.

Un total de **840 pruebas aprobadas no significa 840 pruebas exclusivamente de inventario ni 100 % de cobertura**: la suite abarca todos los módulos backend hasta E2-5 C.

## Fuente de verdad

Se cotejó el repositorio público (documentos E2-5 A/B/C, routers, servicios, ORM, migración, tests y PR #21–#23), las ejecuciones de GitHub Actions y el registro Swagger/PowerShell de esta conversación. **El código del commit es fuente de verdad para el comportamiento implementado**; los documentos de incremento A/B/C que todavía dicen «pendiente de merge» describen el estado de aquel momento, no el estado actual. Este paquete aclara esa evolución sin reescribir los documentos históricos.

**Ubicación de esta versión propuesta:** `plataforma-pyme/docs/revisiones/E2-5_CIERRE/` en la rama `docs/e2-5-cierre-revision-critica`. **El PR no equivale al merge** ni a auditoría independiente. El commit funcional examinado sigue siendo `748e69319d8d04900c009d5184168a264a9deeac`.

## Cambios de esta revisión (v1.1)

Se incorporó un **dictamen crítico documentado** sobre concurrencia, semántica de stock inicial, reversos, autorización, auditoría SQL, reservas, errores HTTP y límites comerciales. Los comentarios recibidos son **hipótesis y propuestas**, no pruebas de un bug por sí mismos. Ver [13_EVALUACION_OBSERVACIONES_IA.md](13_EVALUACION_OBSERVACIONES_IA.md) y [09_RIESGOS_DEUDAS_Y_DECISIONES.md](09_RIESGOS_DEUDAS_Y_DECISIONES.md). La documentación v1.0 permanece como antecedente de lectura, pero los hashes del ZIP v1.0 no validan esta revisión versionada.
