---
tipo_documento: INFORME_DE_REVISION
bloque: E2-2
rama: review/e2-2-ubicaciones
fecha: 2026-11-08
responsable_entrega: JoaquinOjedaDev
corte_informe: PRE_PUBLICACION
sha_base_recibido: af47a65bd2c04576cb3cb4b526188591585212f6
sha_final_rama: 7a57c5d76a345e432eb9448c2f442f4dcbd8e80a
sha_main_observado: 36dcc07634b44e1d5db66bc3479867f23b9a2896
sha_main_al_abrir_pr: null
pr_url: null
estado_recomendado: APTO_CON_OBSERVACIONES
resumen_hallazgos: {P0_bloqueantes: 0, P1_altos: 0, P2_medios: 3, P3_bajos: 0}
hallazgos_corregidos: 3
hallazgos_pendientes: 0
requiere_decision_humana: true
conflicto_con_main: false
cumplio_lista_blanca: true
pruebas_regresion: EJECUTADO_PASS
ci_del_pr: CI_PENDIENTE
---

# E2-2 - Informe de revisión

## 1. Resumen y recomendación

Dos defectos corregidos y una brecha de cobertura cubierta. En PostgreSQL 16.15 local, el original dio **370 passed, 1 failed** por representación de zona horaria; el código corregido da **384 passed**, sin fallas ni omitidos. Las 13 pruebas nuevas cubren NUL, zonas horarias, concurrencia y reactivaciones.

APTO_CON_OBSERVACIONES para revisar los cambios: no hay P0/P1 pendientes. La decisión de incorporación sigue siendo del equipo; CI del PR y Docker local no se presentan como aprobados. Los estados y SHAs corresponden al momento de preparar el informe, antes de publicarlo.

## 2. Acceso y referencia

La rama se creó desde la publicación exacta de la hoja E2-2, `af47a65`, en un worktree separado de E2-1. Se inspeccionaron hoja y guía maestra, RF-03/CU-04 y anexos E2-2 de 01-05, README, plan E2-2 D, modelos Location/LocationAssignment, migraciones 0008/0009/0010, módulos locations y assignment, tests del bloque y workflow backend.

También se leyeron fuente PUML, explicación 03A y etiquetas/estructura XML del SVG. El SVG declara ser un resumen editorial; no se hizo una revisión visual renderizada. E2-1 se consultó solo como dependencia; sus correcciones del PR #11 no se incorporaron a esta rama.

## 3. Estado inicial y decisiones preservadas

| RF / CU | HTTP del corte | Persistencia / protección | Evidencia |
|---|---|---|---|
| RF-03 / CU-04 | POST/GET colección, GET/PATCH detalle, PATCH status, PUT primary | Location por tenant, tipos incluyendo CASA, cuatro combinaciones de capacidades, principal ACTIVA única | test_location_model/integration/schemas/http/api_integration |
| RF-03 / CU-04, asignaciones | GET colección y PUT estado por membership_id | PK business/location/user, FK compuestas a Location y Membership; ACTIVA/REVOCADA y fecha coherente | test_location_assignment_model/schemas/http/integration |
| RF-03, política futura | can_operate_at_location, sin endpoint comercial | Tenant/miembro/sede activos, capacidad SELL/STORE y asignación para encargado/trabajador | test_location_assignment_schemas y prueba nueva con SQL real |

Alembic original: `e22d_assignments`, descendiente de `e22b_location_casa` y `e22a_locations`. Se conservaron roles, pertenencia por empresa, empresa inicialmente sin sedes, 0..1 principal ACTIVA, ausencia de DELETE, revocación sin borrar e independencia entre membresía y asignación. Ubicación principal no es requisito para la eficacia de la política operacional.

## 4. Método

Se contrastó requisito, contrato HTTP, DTO, servicio, repositorio, esquema y prueba. Se aplicaron migraciones en una base nueva aislada y se ejecutó la suite original. Los casos negativos nuevos se ejecutaron contra el código anterior antes de corregirlo. Para NUL se confirmó DataError con una copia de `git archive af47a65`; para fechas se forzaron tres zonas por transacción.

Las pruebas concurrentes usan clientes y sesiones SQL independientes, dos actores administrativos distintos y barreras de inicio. No comparten una Session entre hilos. Sus filas ficticias se limpian por IDs propios; las demás pruebas usan transacción exterior y savepoints.

## 5. Hallazgos

### REV-E2-2-001 - P2 - BUG_CONFIRMADO - revocación no estable según zona horaria

`LocationAssignmentView.from_record` devolvía `revoked_at` tal como estaba en memoria o como lo releía PostgreSQL. La primera revocación usaba UTC; un reintento podía devolver el mismo instante con otro offset. La prueba original `test_assign_list_idempotent_revoke_reactivate` falló comparando, por ejemplo, una fecha terminada en `Z` con su equivalente `-03:00`.

Reproducción: asignar, revocar, repetir PUT y consultar GET en PostgreSQL con zona no UTC. Dos casos nuevos fallaron con Buenos Aires y Kathmandu; UTC pasó. Se esperaba una representación estable de la misma revocación.

MOD-E2-2-001 normaliza **solo revoked_at de la respuesta** a UTC. No modifica el instante persistido, el historial, created_at/updated_at ni la configuración de PostgreSQL. Las tres zonas y la prueba original pasan. Archivo: `backend/app/modules/locations/assignment_schemas.py:28`. Test: `test_revocation_response_is_identical_on_retry_and_get_in_any_db_timezone`.

### REV-E2-2-002 - P2 - BUG_CONFIRMADO - NUL llega al driver SQL

Los DTO de alta y edición aceptaban NUL en `name`, `address` y la ruta de `map_url`. Las seis solicitudes llegaron al driver y provocaron `psycopg.DataError: PostgreSQL text fields cannot contain NUL (0x00) bytes`, en lugar de 422. La validación de familia HTTPS de Maps no rechazaba ese carácter en el path.

MOD-E2-2-002 lo rechaza en los validadores de texto y Maps antes de persistir. Los seis casos ahora dan 422: un alta fallida no crea filas ni reserva principal, y un PATCH fallido conserva toda la ubicación. No se restringen las capacidades, tipos o textos válidos anteriores. Archivo: `backend/app/modules/locations/schemas.py:13,54,107`; pruebas nuevas en `test_location_api_integration.py:91,110`.

### REV-E2-2-003 - P2 - COBERTURA_INSUFICIENTE - concurrencia y eficacia tras reactivar

La suite inicial comprobaba invariantes y transiciones principalmente en secuencia. No había pruebas con solicitudes simultáneas de dos administradores para primera principal, cambios de principal y activación repetida de una asignación. La política pura se probaba con parámetros, sin un recorrido SQL completo de pausa/reactivación de sede y membresía.

MOD-E2-2-003 añade cuatro pruebas en `test_location_concurrency_integration.py`. Pasan sin cambiar los servicios: dos altas producen una principal; dos cambios de principal terminan con una de las sedes solicitadas; dos activaciones reutilizan una fila; pausa/inactivación anulan eficacia y reactivación la recupera si la asignación seguía ACTIVA. Una revocación explícita la retira. Se verifica la política con SQL real, no una venta o recepción inexistente.

## 6. Modificaciones y trazabilidad

Rutas relativas a `plataforma-pyme/`.

| MOD | Hallazgo | RF/RNF - CU | Archivos | Efecto y prueba |
|---|---|---|---|---|
| 001 | REV-001 | RF-03, RNF-04/09 - CU-04 asignaciones | assignment_schemas.py; test_location_assignment_integration.py | Respuesta de revocación UTC, tres zonas + regresión original |
| 002 | REV-002 | RF-03, RNF-04 - CU-04 alta/edición | locations/schemas.py; test_location_api_integration.py | 422 para NUL en tres campos, POST/PATCH; seis regresiones |
| 003 | REV-003 | RF-03, RNF-01/02/06 - CU-04 | test_location_concurrency_integration.py | Tres escenarios simultáneos y recorrido de reactivación con SQL real |
| 004 | REV-001/002/003 | RF-03 - CU-04 | entrega-programacion-2/05_MATRIZ_API_Y_TRAZABILIDAD.md | Precisa NUL, UTC, eficacia de asignaciones y elección de principal |

Los schemas están en `backend/app/modules/locations/`; las pruebas, en `backend/tests/`. No cambian endpoints ni el esquema OpenAPI completo: siguen 18 paths y 22 operaciones.

## 7. Cambios no realizados y límites

No se modificaron auth/businesses, sesiones, membresías E2-1, modelos SQL, migraciones, frontend, workflows, 03B/03C ni catálogo E2-3. No se añaden tablas, tipos, permisos o rutas. No se ensayó downgrade sobre datos ni se usó stamp/create_all para sustituir migraciones.

CASA sigue siendo visible a los miembros activos autorizados por el contrato del tenant; conocer UUIDs de otra empresa no concede acceso. La política de privacidad del domicilio antes de producción queda como decisión de producto, sin cambiar unilateralmente visibilidad. También se conserva que reactivar sede/membresía puede devolver eficacia a asignaciones preexistentes. No se implementan auditoría histórica completa, turnos, notificaciones, stock ni consumo comercial de la política.

## 8. Compatibilidad y main posterior

La referencia auditada permanece `af47a65`; la rama solo añade cinco commits propios, sin incorporar nuevos commits de main ni E2-1. Main avanzó a `36dcc07634b44e1d5db66bc3479867f23b9a2896` durante el trabajo.

Una simulación con `git merge-tree --write-tree HEAD origin/main` detectó inicialmente una colisión en el encabezado general del Documento 01. Se retiró **esa modificación propia** para dejar el encabezado como en la base y limitar el cambio documental a la sección E2-2 del Documento 05. La simulación final fue exitosa; no se ejecutó git merge ni rebase y no cambió la rama principal. Esto comprueba compatibilidad textual con ese SHA, no valida E2-3 ni garantiza compatibilidad con avances posteriores.

## 9. Documentación y UML

01-04, README, plan y 03A se contrastaron sin cambios finales. Los estados de cortes anteriores se interpretan como históricos según el aviso vigente. 05 recibe las precisiones del contrato y referencias a tests. No se repiten conteos del autor como si fueran pruebas del revisor.

No cambian entidades ni cardinalidades: LocationAssignment conserva su PK triple y FK compuestas; Membership y Location conservan sus roles. Por eso no se regeneró 03A. La omisión editorial de asignación en SVG está declarada y la clase/multiplicidades figuran en PUML y guía; no se trató como error. El plan anterior y sus cierres se conservan como registro histórico.

## 10. Pruebas y evidencia

Ejecutadas el 08/11/2026, en Windows con Python 3.12, PostgreSQL 16.15 aislado y código del corte af47a65 más las correcciones indicadas. Comandos equivalentes desde `plataforma-pyme/backend`, con entorno virtual activo y configuración privada válida:

```powershell
python -m alembic upgrade head
python -m alembic current
python -m alembic check
$env:RUN_DB_INTEGRATION = "1"
try { python -m pytest -q } finally { Remove-Item Env:\RUN_DB_INTEGRATION }
```

| Control | Estado | Resultado / referencia | Límite |
|---|---|---|---|
| Suite original af47a65 | EJECUTADO_FAIL | 370 passed, 1 failed en 30.13s; comparación de revoked_at UTC/offset | No equivale a invalidar el resultado del autor en otro entorno |
| Casos nuevos antes de corregir | EJECUTADO_FAIL | 8 failed, 1 passed: seis NUL y dos zonas no UTC; UTC pasó | Pruebas del revisor contra implementación original |
| Regresión y prueba original de revocación | EJECUTADO_PASS | 10 passed tras las dos correcciones | Ejecución dirigida |
| Concurrencia/reactivación | EJECUTADO_PASS | 4 passed; conexiones independientes | No es prueba de carga |
| Suite final | EJECUTADO_PASS | **384 passed en 31.68s**, 0 fallas/omitidos; código de 7a57c5d | Cambios posteriores al test fueron solo documentales |
| Alembic | EJECUTADO_PASS | Upgrade desde base vacía; e22d_assignments head; check sin operaciones nuevas | No se probó rollback de migraciones |
| HTTP nativo | EJECUTADO_PASS | /health ok; /ready ready/database ok | Proceso Uvicorn, no contenedor |
| OpenAPI antes/después | EJECUTADO_PASS | JSON completo idéntico, 18 paths / 22 operaciones | Describe el corte E2-2 |
| CI histórico | CI_PASS_VERIFICADO | [Run 42497556047](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42497556047), SHA 3cd7bce, tres jobs success | No es CI de esta rama |
| CI del PR | CI_PENDIENTE | Rama aún local, sin PR | Debe comprobarse tras publicar |
| Docker local | OMITIDO_SIN_ENTORNO | Daemon no disponible | No se afirmó build local exitoso |
| Python 3.14 de estas correcciones | NO_EJECUTADO | Pendiente de CI | Solo Python 3.12 local |

Las 13 pruebas nuevas se suman a las 371 originales; no se suman los conteos históricos A/B/C/D entre sí. Los logs y XML conservan evidencia de la ejecución; el contenido de las pruebas usa datos ficticios.

## 11. Matriz de decisiones selectivas

| ID | Hallazgo | Commit | Prioridad | Cambio | Evidencia | Compatibilidad | Dependencias | Sugerencia | Decisión del equipo |
|---|---|---|---|---|---|---|---|---|---|
| MOD-001 | REV-001 | 6498319 | P2 | Normalizar revoked_at en la respuesta | Tres zonas y regresión original; 384 finales | Sin cambios SQL/OpenAPI | Ninguna | ACEPTAR | PENDIENTE |
| MOD-002 | REV-002 | 3e65bcd | P2 | Rechazar NUL antes de SQL | Seis regresiones POST/PATCH | Sin cambio de campos/tipos válidos | Ninguna | ACEPTAR | PENDIENTE |
| MOD-003 | REV-003 | 40461b0 | P2 | Cobertura concurrente y reactivaciones | Cuatro escenarios con PostgreSQL | Servicios sin cambios | Ninguna respecto de los fixes | ACEPTAR | PENDIENTE |
| MOD-004 | REV-001/002/003 | 786a5b1 + 7a57c5d | Apoyo documental | Contrato E2-2 en 05; encabezado general 01 sin diferencia final | Diff y simulación de integración | Evita colisión con catálogo | Usar ambos commits en ese orden; documenta MOD-001/002/003 | ACEPTAR | PENDIENTE |

MOD-004 se evalúa como una unidad documental: no tomar 786a5b1 aisladamente, porque 7a57c5d retira el ajuste de encabezado general. Alternativamente puede aplicarse solo el diff final de 05.

## 12. Archivos, commits y backlog

Diff final contra af47a65: **seis archivos** (dos schemas, tres tests y 05), todos de la lista blanca. El informe sería el séptimo archivo de entrega si se autoriza incluirlo en el repositorio. No hay diferencia final en 01.

Commits completos: `64983193a3fb88406f6e6339c3fe2a6636995f0c`, `3e65bcd51aafc107b968595fbbba2a6d5f6e004e`, `40461b0200f239c92bbed5fa8c86759ee6bee03c`, `786a5b1a9cb3e1937ff287c41fc0036054dc1275`, `7a57c5d76a345e432eb9448c2f442f4dcbd8e80a`.

Pendientes: autorizar publicación del informe/PR, ejecutar CI de la rama y revisar cada MOD. Antes de integrar, volver a comprobar el main vigente. Catálogo, compras, inventario, ventas, integración React y despliegue siguen sus bloques propios. No quedan bugs confirmados de esta auditoría sin corregir.

## 13. Dictamen e integridad

Correcciones locales validadas y compatibilidad textual comprobada con el main observado. Recomendación APTO_CON_OBSERVACIONES, condicionada a CI y revisión humana de los cambios. No es una certificación del producto completo o de seguridad de producción.

No hubo push, PR, force-push, rebase, merge de main ni despliegue durante esta auditoría. No se publicaron secretos ni se modificó E2-1. Los SHAs de esta portada identifican el código al preparar el informe; incorporarlo luego en un commit documental no cambia la referencia auditada.
