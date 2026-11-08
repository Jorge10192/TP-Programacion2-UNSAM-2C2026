# 05 — Matriz de API, permisos y trazabilidad

**Proyecto:** Asistente PyME — Programación 2  
**Versión:** 0.6 — cierre y sincronización documental C.5
**Fecha:** 7 de noviembre de 2026  
**Estado:** publicación técnica incremental; aprobación académica del equipo pendiente  
**Referencia:** `main` del repositorio, carpeta exclusiva `plataforma-pyme/`.

## 1. Propósito y vocabulario de evidencia

Este archivo une requisitos (01), casos de uso (02), modelos/UML (03), decisiones de arquitectura (04), endpoints, controles de acceso y pruebas reales. No confundir **IMPLEMENTADO** (código en Git), **VALIDADO LOCALMENTE** (evidencia del desarrollador), **CI VERIFICADO** (GitHub Actions comprobado en una ejecución concreta) y **PLANIFICADO** (TO-BE). El frontend React continúa como DEMO independiente del backend. WALOS es solo un cliente de ejemplo.

**Cierre E2-1 / C.5 — 08/11/2026:** C.1 (98), C.2 (125), C.3 (147), C.4a (171) y **C.4b (195/195 pruebas locales aprobadas; `195 passed in 23.86s`)**. Alembic `e213c4_acceptance (head)`, `No new upgrade operations detected.`; Docker FastAPI/PostgreSQL `healthy` y `/ready` = `ready`/`ok`. GitHub Actions **3/3** corresponde al commit funcional `8cd1674`. C.5 es **exclusivamente documental**; no se reejecutaron pruebas ni cambiaron endpoints, modelos SQL o migraciones. React sigue DEMO; RF-03–RF-07 no tienen backend; transferencia de titularidad, verificación de correo y endurecimiento para producción siguen pendientes.

## 2. Estado por requerimiento y caso de uso

| RF | CU | Estado API | Alcance comprobable / pendiente |
|---|---|---|---|
| RF-01 | CU-01 | Implementado; validado localmente | `POST /api/v1/auth/register`; hash Argon2id, email único, 201/409/422 |
| RF-01 | CU-02 | Implementado; validado localmente | `POST /api/v1/auth/login`, `GET /me`, `POST /logout`; sesiones revocables, 401 |
| RF-02 | CU-03 | Alta, lectura y PATCH empresarial validados localmente | Empresa con titular inicial, idempotencia y edición autorizada por tenant/rol |
| RF-02 | CU-12a / CU-12b y gestión | Emisión/aceptación validadas localmente; **equipo C.4b validado localmente con 195 pruebas y CI 3/3** | Emitir, aceptar, consultar equipo y editar roles/estados operativos con titularidad protegida |
| RF-03 | CU-04 | Planificado | Ubicación y permisos, necesaria para recepción/venta de bienes físicos |
| RF-04 | CU-05 | Planificado | Catálogo y SKU único dentro del tenant |
| RF-05 | CU-06, CU-07 | Planificado | Compra separada de recepción física completa |
| RF-06 | CU-08, CU-09 | Planificado | Saldos, movimientos, stock no negativo, concurrencia |
| RF-07 | CU-10, CU-11 | Planificado | Ventas, pagos declarados y restricciones monetarias |
| RF-08–10 | Fuera primer backend MVP | Diferido | Gastos/caja, cuentas y QR DEMO |

## 3. Contratos HTTP realmente existentes

| Método | Ruta | Seguridad real vigente | Respuesta principal | Prueba |
|---|---|---|---|---|
| GET | `/health` | Pública, liveness | 200 `status=ok` | `test_health.py` |
| GET | `/ready` | Pública local, conectividad PostgreSQL | 200/503 | `test_readiness.py` |
| POST | `/api/v1/auth/register` | Pública, validación Pydantic/SQL | 201, 409, 422 | `test_auth_registration_integration.py` |
| POST | `/api/v1/auth/login` | Credenciales, Argon2id | 200 bearer/401 | `test_auth_session_integration.py` |
| GET | `/api/v1/auth/me` | Bearer vigente y cuenta activa | 200/401 | `test_auth_session_integration.py` |
| POST | `/api/v1/auth/logout` | Bearer vigente | 204/401 | `test_auth_session_integration.py` |
| POST | `/api/v1/businesses` | Bearer vigente, usuario global activo; **sin membresía previa** | 201 nuevo; 200 reintento; 409 payload diferente | `test_business_creation_integration.py` |
| GET | `/api/v1/businesses` | Bearer + filtro de membresía `ACTIVA` | 200 lista propia | `test_business_creation_integration.py` |
| GET | `/api/v1/businesses/{business_id}` | Bearer + membresía activa en ese tenant | 200 propio; 404 ajeno | `test_business_creation_integration.py` |
| PATCH | `/api/v1/businesses/{business_id}` | Bearer + revalidación transaccional de sesión y membresía + `business.profile.edit` | 200; 401/403/404/409/422 | `test_business_update_*.py`, **125 pruebas locales aprobadas en C.2** |
| POST | `/api/v1/businesses/{business_id}/invitations` | Bearer + membresía activa/rol autorizado + empresa activa + correo/rol validado en transacción | 201; 401/403/404/409/422 | `test_business_invitation_schemas.py` y `test_business_invitation_integration.py`; **147 pruebas locales aprobadas en C.3** |
| POST | `/api/v1/invitations/accept` | Bearer + cuenta destinataria coincide con correo invitado + invitación PENDIENTE vigente + empresa ACTIVA; commit único | 200; 401/404/409/422 | `test_business_acceptance_*.py`, **171 pruebas locales en C.4a** |
| GET | `/api/v1/businesses/{business_id}/memberships` | Bearer + membresía propia activa; permiso `members.read` (titular/administrador); empresa activa | 200; 401/403/404/409 | `test_business_team_schemas.py`, `test_business_team_integration.py` **(195 pruebas locales; CI 3/3)** |
| PATCH | `/api/v1/businesses/{business_id}/memberships/{membership_id}` | Bearer + rol titular vigente; miembro objetivo del mismo tenant no titular; permiso `members.manage`; transacción con bloqueo | 200; 401/403/404/409/422 | `test_business_team_schemas.py`, `test_business_team_integration.py` **(195 pruebas locales; CI 3/3)** |

**Idempotencia CU-03:** `Idempotency-Key` UUID4, ámbito `actor_user_id` + clave; `business_creation_requests` conserva hash canónico y `business_id`. La **PK compuesta** mantiene la unicidad incluso con concurrencia. Reutilizar la clave con otro contenido devuelve 409; se corrigió la recuperación tras conflictos concurrentes sobre `pk_business_creation_requests` en E2-1.3C.1.

**Sesiones:** El token Bearer es un secreto; se guarda solo la huella SHA-256 para buscar/revocar sesiones. La cuenta deshabilitada o sesión vencida no puede leer ni crear empresas.

## 4. Política RBAC E2-1.3C.1 y primera aplicación real E2-1.3C.2

| Capacidad | TITULAR_ADMINISTRATIVO | ADMINISTRADOR | ENCARGADO | TRABAJADOR | Estado HTTP |
|---|---|---|---|---|---|
| `business.view` | Sí | Sí | Sí | Sí | Lectura vigente filtra por membresía activa; integración de política pura en C.2 |
| `business.profile.edit` | Sí | Sí | No | No | **Implementado/validado C.2 (125 pruebas)** |
| `members.invite` | Sí | Sí | No | No | **Implementado/validado C.3 (147 pruebas)** |
| `members.read` | Sí | Sí | No | No | **C.4b GET validado (195 pruebas y CI 3/3)** |
| `members.manage` | Sí | No | No | No | **C.4b PATCH validado (195 pruebas y CI 3/3)** |

**Estados:** la membresía `INACTIVA` nunca autoriza; un rol desconocido o permiso nuevo se deniega por defecto (*fail closed*). La empresa `SUSPENDIDA` permite únicamente lectura informativa a miembros activos; no modificaciones, invitaciones ni administración de miembros. Esta función **no reemplaza** comprobar la empresa exacta en SQL ni la vigencia del token. Un titular de la empresa A no adquiere permisos en la empresa B por el nombre de su rol.

**Decisión MVP:** el rol `ENCARGADO` no es un permiso universal. Las capacidades futuras de catálogo, inventario, compras y ventas deberán tener permisos específicos propios, con pruebas y documentación por CU; no se deducen automáticamente de este cuadro.

### Comportamiento HTTP implementado y validado desde C.2

| Caso | HTTP esperado | Motivo |
|---|---|---|
| Sin sesión, token vencido/revocado | 401 | No autenticado |
| Empresa ajena, inexistente o sin membresía activa | 404 | No exponer empresas ajenas |
| Miembro activo sin permiso de edición | 403 | Empresa propia, acción denegada |
| Miembro activo con permiso, empresa `SUSPENDIDA` | 409 | Estado no editable |
| Titular/administrador, empresa activa, cambios válidos | 200 | Actualización atómica |
| Datos inválidos / cuerpo vacío | 422 | Validación de contrato |

Los códigos precedentes están definidos en el router de C.2 y cuentan con pruebas escritas; **se validaron en C.2 (125 pruebas) y regresiones posteriores hasta 195**. Para 403 se exige una membresía activa sin permiso; para 409 se exige rol apto pero empresa `SUSPENDIDA`.

## 5. Entidades, migraciones y reglas de integridad

| Revisión | Tablas / restricción | Estado |
|---|---|---|
| `e2003_baseline` | `alembic_version`, sin dominio | Validada |
| `e2101_users` | `users`, email UNIQUE, hash y estados | Validada |
| `e212b_sessions` | `auth_sessions`, token hash UNIQUE, FK y vencimiento | Validada |
| `e213a_business_members` | `businesses`, `memberships`, UNIQUE empresa/usuario, índice titular activo único | Validada |
| `e213b_business_creation` | `business_creation_requests`, PK compuesta actor/clave, digest SHA-256 y negocio único por comando | Validada |
| `e213c3_invitations` | `business_invitations`, token SHA-256 único, FK empresa/invitador, estados, expiración e índice parcial correo pendiente por tenant | Validada localmente C.3 |
| `e213c4_acceptance` | Columnas `accepted_by_user_id`, `accepted_at`, FK usuario y CHECK de auditoría consistente | Localmente validada C.4a; C.4b sin migraciones |

En E2-1.3C.1 y C.2 **no se añadieron tablas ni migraciones**; C.3 incorpora la nueva tabla `business_invitations` mediante una migración aditiva. El UML 03A representa vínculos conceptuales; no debe dibujarse la política como una entidad persistente ni regenerar 03B por esta etapa.

## 6. Estrategia de pruebas y cumplimiento académico

- **Unitarias puras:** políticas de permisos con las cuatro combinaciones de roles y los estados, normalización y criptografía donde corresponda. Pruebas del mapeo de conflicto de PK para la carrera de idempotencia.
- **Integración HTTP/PostgreSQL:** autenticación, negocio idempotente, aislamiento entre empresas, protección de sesiones y rollback. Las pruebas reales existentes usan `RUN_DB_INTEGRATION=1` y transacciones externas revertidas.
- **Migraciones:** `alembic upgrade head`, `alembic current` y `alembic check`; no usar `stamp` ni downgrades destructivos para silenciar errores.
- **CI:** workflow `.github/workflows/plataforma-pyme-backend.yml`, jobs Python y Docker con PostgreSQL efímero. Un commit publicado no equivale a CI verde; verificar la ejecución de ese SHA.
- **TP:** tener más de diez tests de infraestructura/identidad no sustituye construir, probar y desplegar el conjunto de **al menos cinco RF completos de alto nivel**. RF-03–07 siguen pendientes en la API.
- **Deploy público:** pendiente, con medidas de protección y configuración seguras antes de exponer auth y datos.

## 7. Protocolo de actualización documental por entregas

| Evento | Documentos a actualizar |
|---|---|
| Cambio de comportamiento, RF o CU | 01, 02 y 05 |
| Nueva tabla, FK, estado o cardinalidad | 03 y fuentes UML 03A cuando cambie el concepto, migración, 05 |
| Cambio de arquitectura, transacción, patrón o autorización | 04, 05 y README técnico |
| Nuevo endpoint o error | 05 con método/ruta, contrato, permiso, tests, estado real |
| Nueva prueba, CI o deploy | 05 y 06 cuando se publique, con evidencia verificable |
| Cada etapa validada por el desarrollador | Actualizar estado real sin inventar tests ni adelantar funcionalidades |

### Próximos pasos cerrados

1. **C.1 — publicado y validado localmente:** política pura RBAC, regresión de idempotencia, 98 pruebas aprobadas.
2. **C.2 — validado localmente y por CI:** PATCH de perfil empresarial, permisos por rol/tenant y pruebas; 125 casos aprobados, Docker/DB saludables.
3. **C.3 — validado localmente:** emisión dirigida sin crear miembro, rol seguro, 7 días y 147 pruebas aprobadas.
4. **C.4a — validado localmente (171 pruebas):** aceptación autenticada y atómica. **C.4b — validado localmente con 195 pruebas y CI 3/3:** consulta de equipo y actualización de roles operativos/estado con titularidad protegida.
5. **Cierre de RF-02:** actualizar contratos y diagramas 03A sobre implementación confirmada; posteriormente abordar RF-03 Ubicaciones y RF-04 Catálogo.

Este documento es vivo: mantener los nombres de entidad, UUID, rutas y pruebas exactamente como están en `main` a la fecha del corte. No extrapolar funciones del frontend DEMO a endpoints inexistentes.

## 8. Evidencia específica para verificar E2-1.3C.2

**Objeto de prueba:** `PATCH /api/v1/businesses/{business_id}` con JSON de una o varias claves (`name`, `category`, `activity_kind`). Todos los demás campos, `null`, y el objeto vacío devuelven 422. Se deriva el actor del Bearer; ninguna petición permite asignar rol/fundador/estado. Se devuelve `BusinessView` con la membresía que habilitó la edición.

**Evidencia de autorización:** `test_business_update_integration.py` ensaya titular y administrador con escritura persistida, encargado/trabajador con 403, empresa ajena con 404, membresía inactiva con 404, empresa suspendida con 409, sesión revocada y usuario deshabilitado con 401, DTO inválido con 422 y rollback si falla la respuesta después del `flush`. Los datos de prueba se revierten con una transacción externa. Se complementa con `test_business_update_schemas.py` y `test_business_update_http.py`.

**Estado actual:** las pruebas están publicadas, **no se pueden declarar aprobadas hasta que se ejecuten**. El control local anterior (98 passed, `alembic check` sin diferencia) corresponde a C.1. Para C.2 se debe actualizar el resultado con SHA, cantidad exacta, fecha y evidencia CI cuando se disponga de ellos. No corresponde crear una nueva migración. `GET` de lectura sigue filtrando membresía activa; la nueva política RBAC se invoca efectivamente en `PATCH`.

**Dependencias:** C.3 emisión de invitaciones y C.4 aceptación/gestión de membresías usarán políticas `members.invite` / `members.manage`, sin dar permiso tácito a trabajador o encargado. El código React sigue exclusivamente DEMO.

## 9. Contrato de invitaciones reales C.3 y evidencia

**Ruta:** `POST /api/v1/businesses/{business_id}/invitations`. Requiere Bearer, pertenencia al tenant activo, permiso `members.invite` (titular o administrador), body `{"email":"persona@example.com","role":"ENCARGADO"}` o `TRABAJADOR`. **No** admite `ADMINISTRADOR`, `TITULAR_ADMINISTRATIVO`, otros estados, `business_id` dentro del body ni campos extra. El destinatario puede no poseer cuenta al emitir la invitación.

**Respuesta 201:** `id`, `business_id`, `email` normalizado, `role`, `status=PENDIENTE`, `expires_at` y `invitation_token` (solo disponible en esta respuesta). El token es aleatorio y confidencial; la base conserva `token_hash` SHA-256, no texto claro. **No existe GET de invitaciones; el endpoint de aceptación se implementó después, en C.4a (`POST /api/v1/invitations/accept`).**

**Errores:** 401 token de sesión inválido, 404 empresa ajena/inexistente/membresía inactiva, 403 rol de miembro no autorizado, 409 empresa suspendida, destinatario ya activo o invitación vigente duplicada, 422 correo/rol/cuerpo incorrecto. El envío repetido de la misma invitación **no** recupera el token: responde 409, evitando crear una segunda. Una invitación vencida puede reemplazarse, marcando `EXPIRADA` el registro previo dentro de la misma transacción.

**Nueva migración:** `20261108_0006_business_invitations.py` → `e213c3_invitations`; nueva entidad `BusinessInvitation`, índice parcial `uq_business_invitations_pending_email` y FK a invitador/empresa. Sin alteraciones a membresías ni al UML 03B.

**Tests:** `tests/test_business_invitation_schemas.py` y `tests/test_business_invitation_integration.py` comprueban normalización, roles, seguridad, pertenencia, duplicados, expiración, persistencia del hash, no alta de membresía y rollback. En CI aprobaron Pytest con PostgreSQL real, `alembic upgrade head` y `alembic check` en Python 3.12/3.14, además de Docker. **La cantidad de pruebas y la migración local deben confirmarse por el desarrollador** tras `git pull`.

**Pendiente C.4:** validar secreto mediante comparación de hash, audiencia por correo de cuenta autenticada, estado/fecha, aceptación transaccional exactamente una vez, membresía única, activación de membresía inactiva y protección de concurrencia. El envío automático, reenvío/cancelación y protección antispam para producción quedan sin construir.

## 10. Contrato de aceptación C.4a: invitar ≠ aceptar ≠ administrar

**POST `/api/v1/invitations/accept`** — requiere `Authorization: Bearer` global y cuerpo exclusivamente `{"invitation_token":"<token-opaco>"}`. La cuenta debe tener exactamente el correo normalizado para el que se emitió la invitación. El servidor busca **SHA-256 del token**, no el texto claro, bloquea la invitación, comprueba `PENDIENTE` y expiración, bloquea empresa `ACTIVA`, y crea o reactiva una sola Membresía para `(business_id,user_id)` con el rol operativo que se propuso al emitir. Marca `ACEPTADA` y `accepted_by_user_id/accepted_at` en el mismo commit; responde `200 BusinessView`, sin token ni datos privados de otras empresas.

**Errores:** 401 cuenta/sesión inválida, 404 token desconocido o ajeno al email (misma respuesta), 409 token vencido o consumido, negocio suspendido, membresía ya activa o rol histórico de titular administrativo inactivo incompatible, 422 formato de token inválido/campos extra. La operación no otorga permisos antes de confirmar aceptación. No se asignan `ADMINISTRADOR` ni `TITULAR_ADMINISTRATIVO` mediante invitación básica. Ante error después del `flush` se revierte membresía y aceptación. El reintento de token consumido da 409, sin duplicaciones.

**Entidad y Alembic:** `business_invitations` suma `accepted_by_user_id` (FK a usuario, nullable), `accepted_at` (nullable) y CHECK `ck_business_invitation_acceptance_audit` que exige ambas columnas cuando `status=ACEPTADA` y prohíbe consignarlas en otro estado. Migración aditiva `e213c4_acceptance` (sin editar migraciones previas).

**Evidencia:** C.4a se probó localmente con **171 pruebas** y en CI con PostgreSQL/Alembic (Python 3.12/3.14, Docker); C.4b amplió la validación local a **195 pruebas**, CI funcional **3/3** y Docker saludable, sin nueva migración. La consulta y administración básica del equipo **sí están implementadas** desde C.4b. Permanecen pendientes la cancelación/rechazo/reenvío de invitaciones, correo/QR automático, verificación del email, rate limiting para internet y transferencia de titularidad. El UML 03A ya fue actualizado en C.5; la hoja para el compañero se redactará después, por separado.

## 11. C.4b — Contrato de equipo y decisiones de autorización

**GET `/api/v1/businesses/{business_id}/memberships`:** directorio limitado a titular/administrador activos de empresa ACTIVA; lista los miembros activos e inactivos de **ese tenant**, con `id`, `user_id`, `email`, `display_name`, `role`, `status`, `job_title`. No expone password_hash, contacto telefónico o tokens. 401 sesión inválida; 403 encargado/trabajador; 404 empresa ajena/inexistente o membresía del actor inactiva; 409 empresa suspendida. El rol de otra empresa no concede lectura. La capacidad `members.read` es nueva y distinta de `business.view`.

**PATCH `/api/v1/businesses/{business_id}/memberships/{membership_id}`:** solo titular administrativo vigente, empresa ACTIVA, target existente de esa misma empresa con rol **distinto de TITULAR_ADMINISTRATIVO**. Body parcial exige al menos un campo `role: ADMINISTRADOR|ENCARGADO|TRABAJADOR` o `status: ACTIVA|INACTIVA`, sin nulls ni campos adicionales. Una edición puede ascender un colaborador a ADMINISTRADOR; un administrador no puede ejecutar PATCH sobre equipo. El titular no puede auto-desactivarse/degradarse ni modificar una membresía titular histórica inactiva. 200 retorna `BusinessTeamMemberView` del target; 401 auth, 403 permiso, 404 tenant/target desconocidos, 409 estado suspendido o titular protegido, 422 cuerpo inválido. El servidor bloquea identidad/sesión, empresa/membresía del actor y objetivo en una única transacción y revierte ante error.

**Evidencia:** `tests/test_business_team_schemas.py`, `tests/test_business_team_integration.py` y actualización de matriz en `test_business_permissions.py`. GitHub Actions en código de C.4b aprobó Pytest PostgreSQL Python 3.12 y 3.14, y Docker. **Validación Windows: `195 passed in 23.86s`; Alembic `e213c4_acceptance (head)` sin deriva y Docker saludable.** Sin nueva tabla ni migración; `e213c4_acceptance` sigue como head.

**Pendientes conscientemente fuera de este corte:** transferencia/revocación de titularidad (caso sensible separado), auditoría histórica de cambios de rol, edición de `job_title`, eliminación física, listado/rechazo/cancelación/reenvío de invitaciones, confirmación de email y frontend React conectado. El cierre documental y revisión de 03A corresponden a C.5, después de validar C.4b. Las funciones comerciales RF-03–RF-07 no se atribuyen a este bloque.

## 12. Matriz de cierre de evidencias C.5 (08/11/2026)

| RF / CU | Operación real | Evidencia al cierre | Estado |
|---|---|---|---|
| RF-01 / CU-01–02 | Registro, login, `/me`, logout | Regresión PostgreSQL 195/195 | Implementado en API |
| RF-02 / CU-03 | Empresas: alta, consulta y PATCH | Regresión PostgreSQL 195/195 | Implementado en API |
| RF-02 / CU-12 | Invitación, aceptación y equipo (`GET`/`PATCH` de membresías) | Regresión 195/195; CI 3/3 del commit `8cd1674` | Implementado, titular protegido |
| Infraestructura | Alembic, API/PostgreSQL Docker, `/ready` | `e213c4_acceptance (head)`, sin deriva; ambos `healthy`; `ready`/`ok` | Verificado localmente |
| RF-03–RF-07 | Ubicaciones, catálogo, compras, stock y ventas | No hay endpoints ni pruebas backend | TO-BE |

**Precisiones:** la salida `195 passed in 23.86s` corresponde al código funcional `8cd1674`, **no a una ejecución posterior al commit documental C.5**. Frontend React, transferencia de titularidad, verificación de email, auditoría histórica de rol, seguridad de producción y deploy público siguen pendientes. La hoja de revisión del compañero se redactará después, antes de RF-03.
