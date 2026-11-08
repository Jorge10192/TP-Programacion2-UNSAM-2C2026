# 05 — Matriz de API, permisos y trazabilidad

**Proyecto:** Asistente PyME — Programación 2  
**Versión:** 0.3 (E2-1.3C.3 — emisión de invitaciones sin incorporación)  
**Fecha:** 7 de noviembre de 2026  
**Estado:** publicación técnica incremental; aprobación académica del equipo pendiente  
**Referencia:** `main` del repositorio, carpeta exclusiva `plataforma-pyme/`.

## 1. Propósito y vocabulario de evidencia

Este archivo une requisitos (01), casos de uso (02), modelos/UML (03), decisiones de arquitectura (04), endpoints, controles de acceso y pruebas reales. No confundir **IMPLEMENTADO** (código en Git), **VALIDADO LOCALMENTE** (evidencia del desarrollador), **CI VERIFICADO** (GitHub Actions comprobado en una ejecución concreta) y **PLANIFICADO** (TO-BE). El frontend React continúa como DEMO independiente del backend. WALOS es solo un cliente de ejemplo.

**Evidencia contrastada al 8/11/2026:** C.1 **98 pruebas aprobadas** y C.2 **125 pruebas locales aprobadas**, Docker API/DB saludables y `/ready` correcto. C.3 **CI exitoso** (Python 3.12/3.14, PostgreSQL/Alembic, pytest y Docker) pero ejecución/migración local **pendientes**.

## 2. Estado por requerimiento y caso de uso

| RF | CU | Estado API | Alcance comprobable / pendiente |
|---|---|---|---|
| RF-01 | CU-01 | Implementado; validado localmente | `POST /api/v1/auth/register`; hash Argon2id, email único, 201/409/422 |
| RF-01 | CU-02 | Implementado; validado localmente | `POST /api/v1/auth/login`, `GET /me`, `POST /logout`; sesiones revocables, 401 |
| RF-02 | CU-03 | Alta/lectura validada; PATCH C.2 publicado pendiente de validar | Alta Empresa + Membresía inicial + idempotencia; lectura aislada y edición por rol/tenant |
| RF-02 | CU-12a / CU-12b | **CU-12a emisión implementada y aprobada por CI**; CU-12b pendiente | `POST /api/v1/businesses/{business_id}/invitations` emite sin conceder membresía; aceptación y gestión en C.4 |
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
| POST | `/api/v1/businesses/{business_id}/invitations` | Bearer + membresía activa/rol autorizado + empresa activa + correo/rol validado en transacción | 201; 401/403/404/409/422 | `test_business_invitation_schemas.py` y `test_business_invitation_integration.py`; **CI aprobado, validación local pendiente** |

**Idempotencia CU-03:** `Idempotency-Key` UUID4, ámbito `actor_user_id` + clave; `business_creation_requests` conserva hash canónico y `business_id`. La **PK compuesta** mantiene la unicidad incluso con concurrencia. Reutilizar la clave con otro contenido devuelve 409; se corrigió la recuperación tras conflictos concurrentes sobre `pk_business_creation_requests` en E2-1.3C.1.

**Sesiones:** El token Bearer es un secreto; se guarda solo la huella SHA-256 para buscar/revocar sesiones. La cuenta deshabilitada o sesión vencida no puede leer ni crear empresas.

## 4. Política RBAC E2-1.3C.1 y primera aplicación real E2-1.3C.2

| Capacidad | TITULAR_ADMINISTRATIVO | ADMINISTRADOR | ENCARGADO | TRABAJADOR | Estado HTTP |
|---|---|---|---|---|---|
| `business.view` | Sí | Sí | Sí | Sí | Lectura vigente filtra por membresía activa; integración de política pura en C.2 |
| `business.profile.edit` | Sí | Sí | No | No | **Implementado en PATCH C.2; pendiente de validación local/CI** |
| `members.invite` | Sí | Sí | No | No | **Implementado en POST de CU-12a C.3; CI aprobado** |
| `members.manage` | Sí | No | No | No | Planificado: gestión sensible C.4 |

**Estados:** la membresía `INACTIVA` nunca autoriza; un rol desconocido o permiso nuevo se deniega por defecto (*fail closed*). La empresa `SUSPENDIDA` permite únicamente lectura informativa a miembros activos; no modificaciones, invitaciones ni administración de miembros. Esta función **no reemplaza** comprobar la empresa exacta en SQL ni la vigencia del token. Un titular de la empresa A no adquiere permisos en la empresa B por el nombre de su rol.

**Decisión MVP:** el rol `ENCARGADO` no es un permiso universal. Las capacidades futuras de catálogo, inventario, compras y ventas deberán tener permisos específicos propios, con pruebas y documentación por CU; no se deducen automáticamente de este cuadro.

### Comportamiento HTTP implementado en C.2 (pruebas pendientes de verificar)

| Caso | HTTP esperado | Motivo |
|---|---|---|
| Sin sesión, token vencido/revocado | 401 | No autenticado |
| Empresa ajena, inexistente o sin membresía activa | 404 | No exponer empresas ajenas |
| Miembro activo sin permiso de edición | 403 | Empresa propia, acción denegada |
| Miembro activo con permiso, empresa `SUSPENDIDA` | 409 | Estado no editable |
| Titular/administrador, empresa activa, cambios válidos | 200 | Actualización atómica |
| Datos inválidos / cuerpo vacío | 422 | Validación de contrato |

Los códigos precedentes están definidos en el router de C.2 y cuentan con pruebas escritas; **su conformidad real depende de ejecutarlas y validarlas localmente y en CI**. Para 403 se exige una membresía activa sin permiso; para 409 se exige rol apto pero empresa `SUSPENDIDA`.

## 5. Entidades, migraciones y reglas de integridad

| Revisión | Tablas / restricción | Estado |
|---|---|---|
| `e2003_baseline` | `alembic_version`, sin dominio | Validada |
| `e2101_users` | `users`, email UNIQUE, hash y estados | Validada |
| `e212b_sessions` | `auth_sessions`, token hash UNIQUE, FK y vencimiento | Validada |
| `e213a_business_members` | `businesses`, `memberships`, UNIQUE empresa/usuario, índice titular activo único | Validada |
| `e213b_business_creation` | `business_creation_requests`, PK compuesta actor/clave, digest SHA-256 y negocio único por comando | Validada |
| `e213c3_invitations` | `business_invitations`, token SHA-256 único, FK empresa/invitador, estados, expiración e índice parcial correo pendiente por tenant | **CI validado; aplicación local pendiente** |

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
3. **C.3 — publicado y aprobado por CI, pendiente de validar localmente:** emisión dirigida sin crear miembro, rol seguro, vencimiento de 7 días, hash de token e índice parcial de pendientes.
4. **C.4:** aceptar invitación y administrar miembros con invariantes de titularidad; actualizar migraciones y UML 03A si cambia estructura.
5. **Cierre de RF-02:** actualizar contratos y diagramas 03A sobre implementación confirmada; posteriormente abordar RF-03 Ubicaciones y RF-04 Catálogo.

Este documento es vivo: mantener los nombres de entidad, UUID, rutas y pruebas exactamente como están en `main` a la fecha del corte. No extrapolar funciones del frontend DEMO a endpoints inexistentes.

## 8. Evidencia específica para verificar E2-1.3C.2

**Objeto de prueba:** `PATCH /api/v1/businesses/{business_id}` con JSON de una o varias claves (`name`, `category`, `activity_kind`). Todos los demás campos, `null`, y el objeto vacío devuelven 422. Se deriva el actor del Bearer; ninguna petición permite asignar rol/fundador/estado. Se devuelve `BusinessView` con la membresía que habilitó la edición.

**Evidencia de autorización:** `test_business_update_integration.py` ensaya titular y administrador con escritura persistida, encargado/trabajador con 403, empresa ajena con 404, membresía inactiva con 404, empresa suspendida con 409, sesión revocada y usuario deshabilitado con 401, DTO inválido con 422 y rollback si falla la respuesta después del `flush`. Los datos de prueba se revierten con una transacción externa. Se complementa con `test_business_update_schemas.py` y `test_business_update_http.py`.

**Estado actual:** las pruebas están publicadas, **no se pueden declarar aprobadas hasta que se ejecuten**. El control local anterior (98 passed, `alembic check` sin diferencia) corresponde a C.1. Para C.2 se debe actualizar el resultado con SHA, cantidad exacta, fecha y evidencia CI cuando se disponga de ellos. No corresponde crear una nueva migración. `GET` de lectura sigue filtrando membresía activa; la nueva política RBAC se invoca efectivamente en `PATCH`.

**Dependencias:** C.3 emisión de invitaciones y C.4 aceptación/gestión de membresías usarán políticas `members.invite` / `members.manage`, sin dar permiso tácito a trabajador o encargado. El código React sigue exclusivamente DEMO.

## 9. Contrato de invitaciones reales C.3 y evidencia

**Ruta:** `POST /api/v1/businesses/{business_id}/invitations`. Requiere Bearer, pertenencia al tenant activo, permiso `members.invite` (titular o administrador), body `{"email":"persona@example.com","role":"ENCARGADO"}` o `TRABAJADOR`. **No** admite `ADMINISTRADOR`, `TITULAR_ADMINISTRATIVO`, otros estados, `business_id` dentro del body ni campos extra. El destinatario puede no poseer cuenta al emitir la invitación.

**Respuesta 201:** `id`, `business_id`, `email` normalizado, `role`, `status=PENDIENTE`, `expires_at` y `invitation_token` (solo disponible en esta respuesta). El token es aleatorio y confidencial; la base conserva `token_hash` SHA-256, no texto claro. **No existe todavía GET de invitaciones ni endpoint de aceptación.**

**Errores:** 401 token de sesión inválido, 404 empresa ajena/inexistente/membresía inactiva, 403 rol de miembro no autorizado, 409 empresa suspendida, destinatario ya activo o invitación vigente duplicada, 422 correo/rol/cuerpo incorrecto. El envío repetido de la misma invitación **no** recupera el token: responde 409, evitando crear una segunda. Una invitación vencida puede reemplazarse, marcando `EXPIRADA` el registro previo dentro de la misma transacción.

**Nueva migración:** `20261108_0006_business_invitations.py` → `e213c3_invitations`; nueva entidad `BusinessInvitation`, índice parcial `uq_business_invitations_pending_email` y FK a invitador/empresa. Sin alteraciones a membresías ni al UML 03B.

**Tests:** `tests/test_business_invitation_schemas.py` y `tests/test_business_invitation_integration.py` comprueban normalización, roles, seguridad, pertenencia, duplicados, expiración, persistencia del hash, no alta de membresía y rollback. En CI aprobaron Pytest con PostgreSQL real, `alembic upgrade head` y `alembic check` en Python 3.12/3.14, además de Docker. **La cantidad de pruebas y la migración local deben confirmarse por el desarrollador** tras `git pull`.

**Pendiente C.4:** validar secreto mediante comparación de hash, audiencia por correo de cuenta autenticada, estado/fecha, aceptación transaccional exactamente una vez, membresía única, activación de membresía inactiva y protección de concurrencia. El envío automático, reenvío/cancelación y protección antispam para producción quedan sin construir.
