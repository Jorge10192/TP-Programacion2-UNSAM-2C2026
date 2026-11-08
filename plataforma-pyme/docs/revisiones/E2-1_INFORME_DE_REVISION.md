---
bloque: E2-1
tipo: INFORME_DE_REVISION
fecha: 2026-11-08
responsable_entrega: JoaquinOjedaDev
commit_base_auditado: 44247a95350b7ff5662c66c2119b459475af7082
rama_revision: review/e2-1-identidad-empresas
commit_correcciones_e2_1: 452f17fb7b79fe258d53130efcde033ca04092e1
commit_main_integrado: 788def54327a0024461841837ab6a320f38379aa
commit_compatibilidad: 1e96e5cb4a79f055918e6935e535e68096ef0b65
pr_url: null
estado_recomendado: APTO_CON_OBSERVACIONES
resumen_hallazgos: {P0: 0, P1: 2, P2: 3, P3: 0}
hallazgos_corregidos: 5
hallazgos_pendientes: 0
conflicto_con_main: false
pruebas_regresion: EJECUTADO_PASS
ci_del_pr: CI_PENDIENTE
---

# E2-1 - Informe de revisión

## 1. Identificación

Revisión de identidad, autenticación, empresas, roles, invitaciones y membresías desde `44247a9`. Correcciones en `452f17f`; compatibilidad posterior con `main` hasta `788def5`, conservada en `1e96e5c`. Rama `review/e2-1-identidad-empresas`. Estado registrado al preparar el informe, antes de publicar el PR; no hubo merge a `main`.

## 2. Resultado

Cuatro defectos de implementación y una inconsistencia documental corregidos. El bloque original pasó 195 pruebas; con las 13 regresiones nuevas, 208. Al incorporar ubicaciones de `main`, el conjunto pasó 290. Recomendación condicionada a revisar los cambios y aprobar el CI del PR. Docker local no se ejecutó por falta de daemon disponible.

## 3. Alcance

Se inspeccionaron guía maestra y hoja E2-1, documentos 01-05, README, fuente y explicación UML 03A, auth/businesses, dependencias, modelos, migraciones, pruebas y workflow backend. El diff de correcciones contra `788def5` contiene 14 archivos: cuatro de implementación, cinco de pruebas y cinco de documentación. Este informe constituye el archivo adicional de entrega.

No hay diferencias de frontend, workflows, modelos SQL, migraciones, 03A gráfico, 03B/03C ni proyectos hermanos contra esa base. Las ubicaciones pertenecen a los cambios previos de `main`; no son una corrección ni una auditoría E2-2 de esta entrega. No se hizo revisión visual del SVG.

## 4. Método

Contraste RF/RNF y CU con endpoints, validadores, servicios, repositorios, constraints y pruebas. Se reprodujeron los defectos antes de corregirlos y se añadieron regresiones HTTP y de concurrencia con PostgreSQL real. Los escenarios concurrentes usan sesiones independientes y un reloj controlado para reproducir el límite de vencimiento sin esperas largas. Solo se usaron datos ficticios en bases locales aisladas.

## 5. Hallazgos

| ID | Prioridad / tipo | Evidencia anterior | Efecto | Corrección |
|---|---|---|---|---|
| REV-E2-1-001 | P2 / BUG_CONFIRMADO | NUL aceptado en nombre visible y nombre/rubro empresarial; cinco casos llegaron a SQL y fallaron con DataError no controlado | Alta/PATCH inválidos provocaban error de servidor | Rechazar NUL con 422 antes de persistir |
| REV-E2-1-002 | P1 / BUG_CONFIRMADO | La aceptación validaba vencimiento antes de esperar Empresa; tras vencer durante la espera devolvía 200 | Concedía membresía con invitación vencida | Comprobar vigencia después de adquirir los bloqueos |
| REV-E2-1-003 | P1 / BUG_CONFIRMADO | Aceptar bloqueaba Invitación luego Empresa; reemitir hacía el orden inverso; reproducción con DeadlockDetected | Operaciones simultáneas podían cancelarse por bloqueo circular | Bloquear Empresa antes de Invitación en ambos flujos y releer estado |
| REV-E2-1-004 | P2 / BUG_CONFIRMADO | Los 422 por longitud de contraseña reflejaban el valor recibido en detail.input | Contraseña incluida en respuesta de validación | Proteger el string antes de comprobar longitud |
| REV-E2-1-005 | P2 / DOCUMENTACION_INCONSISTENTE | Arranque indicaba pytest antes de configurar POSTGRES_PASSWORD; referencias C.2/C.4b seguían pendientes pese al cierre C.5 | Instalación y estado de implementación contradictorios | Aclarar configuración y sincronizar referencias y contratos |

Los cinco hallazgos quedaron CORREGIDO_VALIDADO. El cuarto cubre errores de longitud de contraseñas string, no el saneamiento universal de cuerpos malformados.

## 6. Modificaciones y trazabilidad

Rutas relativas a `plataforma-pyme/`. Los commits mantienen separadas las correcciones.

| MOD / hallazgo | RF/RNF - CU | Archivos y símbolos | Regresión | Documento |
|---|---|---|---|---|
| 001 / REV-001 | RF-01/02, RNF-04 - CU-01/03 | backend/app/modules/auth/schemas.py:strip_name; businesses/schemas.py:normalize_text, normalize_optional_text | test_auth_registration_integration.py; test_business_creation_integration.py; test_business_update_integration.py, cinco casos NUL | 05 |
| 002 / REV-004 | RF-01, RNF-01 - CU-01/02 | auth/schemas.py:_protect_password_input, RegisterRequest, LoginRequest | test_auth_secret_errors.py, cuatro casos | 05 |
| 003 / REV-002/003 | RF-02, RNF-01/02 - CU-12a/b | businesses/service.py:accept_invitation; repository.py:invitation_business_id | test_business_concurrency_integration.py: vencimiento en espera, reemisión, doble aceptación y alta idempotente simultánea | 02/04/05 |
| 004 / REV-005 | RF-01/02, RNF-06/07 | backend/README.md; entrega-programacion-2/02,03,04,05 | Arranque configurado y suite completa; OpenAPI E2-1 original/final idéntico | README y 02-05 |

Los archivos de prueba se encuentran en `backend/tests/`; los módulos de la tabla, en `backend/app/modules/`. NUL no deja altas/claves parciales ni altera el perfil rechazado. Las invitaciones conservan destinatario, rol permitido, uso único, hash, atomicidad y rollback. La protección de contraseña conserva los límites y el esquema OpenAPI.

## 7. Cambios no realizados

No se implementaron verificación de email, recuperación de cuenta, transferencia de titularidad, cancelación/listado de invitaciones, historial de roles, rate limiting ni nuevas pantallas. Son decisiones de otros cortes. No se modificaron constraints ni se reescribieron migraciones para hacer pasar pruebas.

## 8. Relación con main

La auditoría funcional se hizo desde `44247a9`. Después, por pedido de compatibilización, se incorporaron los avances de `main` mediante los commits de merge `3882a5e` y `1e96e5c`, sin rebase ni cambio del historial existente. El segundo resolvió el encabezado concurrente del README conservando el nuevo estado de ubicaciones y sus límites.

Esto es una actualización posterior de compatibilidad, distinta de la revisión congelada original. Se registran ambos SHAs y ambos resultados: 208 para E2-1 corregido, 290 con E2-2 incorporado. El diff vigente contra `788def5` no cambia frontend ni ubicaciones. No se sustituyó un hash por otro ni se atribuyen al revisor avances de Jorge. Antes de integrar debe comprobarse si `main` volvió a cambiar.

## 9. Documentos y UML

01 se contrastó sin cambios propios de requisitos. 02 corrige estados y flujo de aceptación; 03 corrige la referencia de validación C.2; 04 documenta el orden de bloqueos; 05 vincula validaciones y pruebas; README aclara configuración y estado actual. 03A conserva entidades y cardinalidades; no requiere regeneración estructural. 03B/03C permanecen intactos. El material comercial TO-BE no se presenta como implementado por esta auditoría.

## 10. Pruebas

Ejecutadas el 08/11/2026 con Python 3.12 y PostgreSQL 16.15 locales, desde `plataforma-pyme/backend`, con integración SQL activada. Comandos de reproducción con el entorno virtual activo y `.env` privado configurado:

```powershell
python -m alembic upgrade head
python -m alembic current
python -m alembic check
$env:RUN_DB_INTEGRATION = "1"
try { python -m pytest -q } finally { Remove-Item Env:\RUN_DB_INTEGRATION }
```

| Control | Estado | Resultado y referencia |
|---|---|---|
| Original sin correcciones, copia de 44247a9 | EJECUTADO_PASS | 195 passed en 14.37s |
| E2-1 corregido, código en 452f17f | EJECUTADO_PASS | 208 passed en 16.57s; 13 regresiones nuevas |
| Compatibilidad con código de main hasta bdd2c84 | EJECUTADO_PASS | 290 passed en 20.92s; sin fallas ni omitidos |
| Cambios posteriores hasta 1e96e5c | EJECUTADO_PASS | Solo documentación; código y tests sin diferencias respecto del conjunto probado |
| Alembic E2-1 / integrado | EJECUTADO_PASS | e213c4_acceptance / e22b_location_casa; check sin operaciones nuevas; ninguna migración propia |
| HTTP E2-1 nativo | EJECUTADO_PASS | /health ok; /ready ready/database ok |
| OpenAPI E2-1 antes/después | EJECUTADO_PASS | JSON completo idéntico: 12 paths, 14 operaciones |
| Diff y alcance contra 788def5 | EJECUTADO_PASS | Sin frontend, esquema ni proyectos hermanos; diff --check aprobado |
| CI del PR | CI_PENDIENTE | Rama todavía sin publicar; no hay ejecución de estas correcciones |
| Docker local | OMITIDO_SIN_ENTORNO | Daemon no disponible; no se atribuye un build local exitoso |
| Python 3.14 de esta rama | NO_EJECUTADO | Pendiente del CI |

El CI histórico de E2-1 se verificó en [run 42472269979](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42472269979), SHA `8cd1674`, tres trabajos exitosos. No sustituye al CI pendiente de esta rama. Las regresiones están versionadas; no se incluyen credenciales ni registros de datos personales en el informe.

## 11. Commits y aceptación selectiva

| MOD | Commit | Dependencias | Propuesta | Decisión del responsable |
|---|---|---|---|---|
| 001 - validación NUL | 3f4127b | Independiente funcionalmente | ACEPTAR | PENDIENTE |
| 002 - secretos en errores | a604256 | Independiente; comparte archivo auth/schemas.py con 001 | ACEPTAR | PENDIENTE |
| 003 - invitaciones | 0b20e9f | Vencimiento y orden de bloqueos se entregan juntos | ACEPTAR | PENDIENTE |
| 004 - documentación | 452f17f | Contratos documentales corresponden a MOD 001-003 | ACEPTAR | PENDIENTE |
| Compatibilidad con main | 3882a5e, 1e96e5c | Incluye main hasta 788def5; revisar contra ese destino | REVISAR | PENDIENTE |

Listado verificable de correcciones: `git diff --name-only 788def5...1e96e5c`. Este informe se entrega por separado de los commits de código; no modifica los SHAs que identifican lo auditado.

## 12. Pendientes

Primero, publicar la rama autorizada, verificar su CI y revisar cada MOD antes del merge. Después, coordinar el siguiente bloque y resolver por separado la integración general del proyecto. No mezclar esta revisión con PRs previos de UI o comercio. Los pendientes funcionales del apartado 7 requieren alcance propio.

## 13. Recomendación

APTO_CON_OBSERVACIONES para revisión del diff: cero P0/P1 pendientes y pruebas locales satisfactorias. La aprobación definitiva sigue condicionada al CI del PR, la compatibilidad con el main vigente y la decisión del equipo. No es una certificación de producción ni una aprobación para desplegar.

## 14. Integridad

Se conservaron el trabajo anterior y los contratos. Se distinguen pruebas ejecutadas, CI histórico, omisiones y validación pendiente. No se publicaron secretos, no se eliminaron datos del proyecto, no hubo force-push ni merge a main. Los estados de publicación y CI corresponden al momento de preparar este informe.
