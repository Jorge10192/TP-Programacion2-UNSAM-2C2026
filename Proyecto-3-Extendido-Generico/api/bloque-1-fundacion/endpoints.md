# Endpoints API — Bloque 1 Fundación

> **Estado:** versión de referencia para implementación del Bloque 1.  
> **Alcance:** M01 — Organización del Negocio + M02 — Catálogo.  
> **Base contractual:** `api/bloque-1-fundacion/contrato-api.md`.  
> **Objetivo:** congelar las rutas HTTP concretas, su intención funcional, seguridad, respuestas y errores esperables antes de definir los schemas Pydantic definitivos.

---

## 1. Propósito

Este documento traduce los Casos de Uso de M01 y M02 a endpoints REST concretos.

No modela tablas directamente.

La derivación esperada es:

~~~text
Caso de Uso
    ↓
Endpoint HTTP
    ↓
Request / Response DTO
    ↓
Application Use Case
    ↓
Domain
~~~

Los nombres exactos y campos internos de los DTO se detallarán en:

~~~text
api/bloque-1-fundacion/schemas-dto.md
~~~

---

## 2. Convenciones heredadas

Todas las rutas respetan:

~~~text
/api/v1
~~~

Los recursos tenant-scoped utilizan:

~~~text
/api/v1/negocios/{negocio_id}/...
~~~

Autenticación:

~~~http
Authorization: Bearer <access_token>
~~~

Reglas generales:

- `422` para errores estructurales de request;
- `401` para autenticación inválida/ausente;
- `403` para permiso insuficiente en un contexto revelable;
- `404` para recurso inexistente o cross-tenant no revelable;
- `409` para conflictos de estado, unicidad o concurrencia;
- `version` en mutaciones de entidades versionadas;
- `DELETE` únicamente para hard delete;
- recursos creados devuelven `201 Created` y `Location` cuando corresponde.

---

## 3. Permisos conceptuales

M01 congela roles explícitos para operaciones organizacionales.

M02 no congela todavía una matriz completa `Rol → Permiso`.

Por lo tanto se utilizarán permisos conceptuales:

~~~text
CONSULTAR_CATALOGO
CREAR_CATALOGO
EDITAR_CATALOGO
DESACTIVAR_CATALOGO
REACTIVAR_CATALOGO
GESTIONAR_CATEGORIAS
~~~

La implementación podrá resolverlos inicialmente mediante una política simple basada en rol, pero el contrato HTTP no debe codificar comparaciones rígidas innecesarias.

Excepción congelada:

~~~text
hard delete de ArticuloCatalogo
→ PROPIETARIO
~~~

---

# PARTE I — RESUMEN DE RUTAS

## 4. Autenticación e identidad

| Método | Path | Auth | Intención |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/registro` | Pública | Registrar Usuario |
| POST | `/api/v1/auth/login` | Pública | Iniciar sesión |
| GET | `/api/v1/usuarios/me` | JWT | Consultar identidad autenticada |
| GET | `/api/v1/usuarios/me/negocios` | JWT | Consultar negocios con membresía ACTIVA |
| GET | `/api/v1/usuarios/me/invitaciones` | JWT | Consultar invitaciones destinadas al Usuario |

## 5. Negocios y organización

| Método | Path | Auth / Permiso | Intención |
| --- | --- | --- | --- |
| POST | `/api/v1/negocios` | JWT | Crear Negocio |
| GET | `/api/v1/negocios/{negocio_id}` | Miembro ACTIVO | Consultar Negocio |
| PUT | `/api/v1/negocios/{negocio_id}/modalidades` | PROPIETARIO | Reemplazar conjunto de modalidades |
| GET | `/api/v1/negocios/{negocio_id}/preparacion` | Miembro ACTIVO | Consultar preparación derivada |
| GET | `/api/v1/negocios/{negocio_id}/miembros` | Miembro autorizado | Consultar miembros |
| PATCH | `/api/v1/negocios/{negocio_id}/miembros/{miembro_id}/rol` | PROPIETARIO | Cambiar rol no promocional / degradar |
| POST | `/api/v1/negocios/{negocio_id}/miembros/{miembro_id}/promover-propietario` | PROPIETARIO | Promover explícitamente a PROPIETARIO |
| POST | `/api/v1/negocios/{negocio_id}/miembros/{miembro_id}/desactivar` | PROPIETARIO | Desactivar membresía |

## 6. Invitaciones

| Método | Path | Auth / Permiso | Intención |
| --- | --- | --- | --- |
| POST | `/api/v1/negocios/{negocio_id}/invitaciones` | PROPIETARIO | Emitir invitación |
| GET | `/api/v1/negocios/{negocio_id}/invitaciones` | PROPIETARIO | Consultar invitaciones del Negocio |
| POST | `/api/v1/negocios/{negocio_id}/invitaciones/{invitacion_id}/cancelar` | PROPIETARIO | Cancelar invitación |
| POST | `/api/v1/negocios/{negocio_id}/invitaciones/{invitacion_id}/enlace-compartible` | PROPIETARIO | Obtener/reemitir referencia compartible |
| GET | `/api/v1/invitaciones/{token}` | Pública | Vista pública mínima |
| POST | `/api/v1/invitaciones/{token}/aceptar` | JWT destinatario | Aceptar invitación |
| POST | `/api/v1/invitaciones/{token}/rechazar` | JWT destinatario | Rechazar invitación |

## 7. Categorías

| Método | Path | Auth / Permiso | Intención |
| --- | --- | --- | --- |
| GET | `/api/v1/negocios/{negocio_id}/categorias` | CONSULTAR_CATALOGO | Listar categorías |
| GET | `/api/v1/negocios/{negocio_id}/categorias/{categoria_id}` | CONSULTAR_CATALOGO | Consultar categoría |
| POST | `/api/v1/negocios/{negocio_id}/categorias` | GESTIONAR_CATEGORIAS | Crear categoría |
| PATCH | `/api/v1/negocios/{negocio_id}/categorias/{categoria_id}` | GESTIONAR_CATEGORIAS | Editar categoría |
| POST | `/api/v1/negocios/{negocio_id}/categorias/{categoria_id}/desactivar` | GESTIONAR_CATEGORIAS | Desactivar categoría |
| POST | `/api/v1/negocios/{negocio_id}/categorias/{categoria_id}/reactivar` | GESTIONAR_CATEGORIAS | Reactivar categoría |
| DELETE | `/api/v1/negocios/{negocio_id}/categorias/{categoria_id}` | GESTIONAR_CATEGORIAS | Hard delete seguro |

## 8. Artículos

| Método | Path | Auth / Permiso | Intención |
| --- | --- | --- | --- |
| GET | `/api/v1/negocios/{negocio_id}/articulos` | CONSULTAR_CATALOGO | Consultar catálogo |
| GET | `/api/v1/negocios/{negocio_id}/articulos/{articulo_id}` | CONSULTAR_CATALOGO | Consultar artículo |
| POST | `/api/v1/negocios/{negocio_id}/articulos` | CREAR_CATALOGO | Crear artículo |
| PATCH | `/api/v1/negocios/{negocio_id}/articulos/{articulo_id}` | EDITAR_CATALOGO | Editar artículo |
| POST | `/api/v1/negocios/{negocio_id}/articulos/{articulo_id}/desactivar` | DESACTIVAR_CATALOGO | Desactivar artículo |
| POST | `/api/v1/negocios/{negocio_id}/articulos/{articulo_id}/reactivar` | REACTIVAR_CATALOGO | Reactivar artículo |
| DELETE | `/api/v1/negocios/{negocio_id}/articulos/{articulo_id}` | PROPIETARIO | Hard delete seguro |

---

# PARTE II — AUTENTICACIÓN E IDENTIDAD

## 9. Registrar Usuario

### Endpoint

~~~http
POST /api/v1/auth/registro
~~~

### Intención

Implementa:

~~~text
CU-ORG-01 — Registrar Usuario
~~~

### Autenticación

Pública.

### Request

~~~text
RegistrarUsuarioRequest
~~~

Incluye conceptualmente:

- nombre;
- email;
- password.

No incluye:

- rol;
- negocio_id;
- estado;
- password_hash.

### Success

~~~text
201 Created
~~~

Response:

~~~text
UsuarioResponse
~~~

Location:

~~~text
/api/v1/usuarios/{usuario_id}
~~~

Aunque no se exponga en Bloque 1 una ruta pública genérica de lectura por ID, la URI identifica conceptualmente el recurso creado. Si se prefiere no publicar una URI no navegable, `Location` podrá omitirse para este endpoint y esa decisión deberá mantenerse consistente en OpenAPI.

### Errores específicos

~~~text
409 EMAIL_YA_REGISTRADO
400 REGLA_DOMINIO_VIOLADA
422 REQUEST_VALIDATION_ERROR
~~~

### Seguridad

El error de registro puede indicar que el Email ya posee cuenta porque el propio flujo funcional de M01 prevé orientar al Usuario hacia login.

### Idempotencia

No idempotente.

La unicidad funcional de Email evita duplicación concurrente.

---

## 10. Iniciar Sesión

### Endpoint

~~~http
POST /api/v1/auth/login
~~~

### Intención

Implementa:

~~~text
CU-ORG-02 — Iniciar Sesión
~~~

### Autenticación

Pública.

### Request

~~~text
LoginRequest
~~~

Incluye:

- email;
- password.

### Success

~~~text
200 OK
~~~

Response:

~~~text
AccessTokenResponse
~~~

Conceptualmente:

- access_token;
- token_type = bearer;
- expires_in.

No incluye rol ni tenant autoritativo.

Headers recomendados:

~~~http
Cache-Control: no-store
~~~

### Errores

~~~text
401 CREDENCIALES_INVALIDAS
422 REQUEST_VALIDATION_ERROR
429 RATE_LIMIT_EXCEDIDO
~~~

Email inexistente y password incorrecta deben producir respuesta funcional equivalente.

### Idempotencia

No se garantiza idempotencia de emisión de token.

---

## 11. Consultar Usuario autenticado

### Endpoint

~~~http
GET /api/v1/usuarios/me
~~~

### Autenticación

JWT.

### Success

~~~text
200 OK
UsuarioResponse
~~~

No expone:

- password_hash;
- tokens;
- claves normalizadas internas.

### Errores

~~~text
401 AUTHENTICATION_REQUIRED / TOKEN_INVALIDO
~~~

### Idempotencia

GET seguro e idempotente.

---

## 12. Consultar Negocios del Usuario

### Endpoint

~~~http
GET /api/v1/usuarios/me/negocios
~~~

### Intención

Parte de:

~~~text
RF-ORG-005 — Consultar Negocios e Invitaciones
~~~

### Autenticación

JWT.

### Regla

Retorna únicamente membresías:

~~~text
estado = ACTIVO
~~~

No establece un tenant activo en el servidor.

Seleccionar un Negocio significa que el frontend utilizará posteriormente:

~~~text
/api/v1/negocios/{negocio_id}/...
~~~

### Query

Puede utilizar paginación estándar:

~~~text
page
page_size
~~~

### Success

~~~text
200 OK
NegocioMembresiaPageResponse
~~~

Cada item puede incluir:

- negocio;
- rol vigente;
- usuario_negocio_id.

### Idempotencia

GET seguro e idempotente.

---

## 13. Consultar Invitaciones del Usuario

### Endpoint

~~~http
GET /api/v1/usuarios/me/invitaciones
~~~

### Autenticación

JWT.

### Regla

Busca invitaciones cuyo:

~~~text
email_destino
~~~

sea funcionalmente equivalente al Email autenticado.

### Query

Permitidos inicialmente:

~~~text
estado
page
page_size
sort
order
~~~

La vigencia temporal puede exponerse como un campo derivado, pero no reemplaza `estado`.

### Success

~~~text
200 OK
InvitacionUsuarioPageResponse
~~~

### Idempotencia

GET seguro e idempotente.

---

# PARTE III — NEGOCIOS Y MEMBRESÍAS

## 14. Crear Negocio

### Endpoint

~~~http
POST /api/v1/negocios
~~~

### Autenticación

JWT.

Cualquier Usuario autenticado puede crear un Negocio.

### Request

~~~text
CrearNegocioRequest
~~~

Incluye conceptualmente:

- nombre;
- rubro opcional;
- modalidades: 1..N.

Durante MVP:

~~~text
moneda_base = ARS
~~~

se asigna según política del backend y no necesita ser un campo libre del cliente.

### Atomicidad

La operación crea en una sola transacción:

~~~text
Negocio
+
1..N NegocioModalidad
+
UsuarioNegocio del creador
  estado = ACTIVO
  rol = PROPIETARIO
~~~

### Success

~~~text
201 Created
NegocioResponse
~~~

Location:

~~~text
/api/v1/negocios/{negocio_id}
~~~

### Errores

~~~text
400 MODALIDADES_INVALIDAS
422 REQUEST_VALIDATION_ERROR
409 CONFLICTO_CONCURRENCIA
~~~

### Idempotencia

No idempotente.

No se implementa `Idempotency-Key` en Bloque 1.

---

## 15. Consultar Negocio

### Endpoint

~~~http
GET /api/v1/negocios/{negocio_id}
~~~

### Autenticación

JWT + membresía ACTIVA.

### Success

~~~text
200 OK
NegocioResponse
~~~

Incluye:

- id;
- nombre;
- rubro;
- moneda_base;
- modalidades;
- version.

### Errores

~~~text
401 ...
403 MEMBRESIA_INACTIVA cuando sea revelable
404 RECURSO_NO_ENCONTRADO / anti-enumeración
422 REQUEST_VALIDATION_ERROR
~~~

### Idempotencia

GET seguro e idempotente.

---

## 16. Configurar Modalidades

### Endpoint

~~~http
PUT /api/v1/negocios/{negocio_id}/modalidades
~~~

### Motivo de PUT

El recurso representa el **conjunto completo** de modalidades actuales.

La request reemplaza explícitamente el conjunto.

### Autenticación

JWT + membresía ACTIVA + PROPIETARIO.

### Request

~~~text
ActualizarModalidadesRequest
~~~

Incluye:

- modalidades: 1..N;
- version del Negocio.

### Reglas

Valores:

~~~text
REVENTA
PRODUCCION
SERVICIOS
~~~

No puede quedar un conjunto vacío.

Las modalidades adaptan UX; no borran datos de módulos.

### Success

~~~text
200 OK
NegocioResponse
~~~

con nueva `version`.

### Errores

~~~text
400 MODALIDADES_INVALIDAS
403 PERMISO_DENEGADO
404 RECURSO_NO_ENCONTRADO
409 CONFLICTO_CONCURRENCIA
422 REQUEST_VALIDATION_ERROR
~~~

### Idempotencia

Semánticamente idempotente si se aplica exactamente el mismo conjunto y versión vigente.

La verificación de `version` continúa siendo obligatoria.

---

## 17. Consultar Preparación

### Endpoint

~~~http
GET /api/v1/negocios/{negocio_id}/preparacion
~~~

### Intención

Implementa:

~~~text
RF-ORG-017 — Consultar Preparación
~~~

### Autenticación

JWT + membresía ACTIVA.

### Success

~~~text
200 OK
PreparacionNegocioResponse
~~~

Es una proyección derivada.

No persiste un enum artificial:

~~~text
INCOMPLETO / COMPLETO
~~~

El contenido podrá ampliarse al incorporarse nuevos módulos.

### Idempotencia

GET seguro e idempotente.

---

## 18. Consultar Miembros

### Endpoint

~~~http
GET /api/v1/negocios/{negocio_id}/miembros
~~~

### Autenticación

JWT + membresía ACTIVA + permiso de consulta de miembros.

M01 no obliga a que únicamente PROPIETARIO pueda consultar.

### Query

~~~text
estado
rol
q
page
page_size
sort
order
~~~

### Success

~~~text
200 OK
MiembroPageResponse
~~~

### Idempotencia

GET seguro e idempotente.

---

## 19. Cambiar Rol de Miembro

### Endpoint

~~~http
PATCH /api/v1/negocios/{negocio_id}/miembros/{miembro_id}/rol
~~~

### Autenticación

JWT + membresía ACTIVA + PROPIETARIO.

### Request

~~~text
CambiarRolMiembroRequest
~~~

Incluye:

- nuevo_rol;
- version de UsuarioNegocio.

En este endpoint:

~~~text
nuevo_rol ∈ {ENCARGADO, TRABAJADOR}
~~~

La promoción a PROPIETARIO posee endpoint explícito separado.

Puede utilizarse para degradar un PROPIETARIO, sujeto a la invariante de último propietario.

### Success

~~~text
200 OK
MiembroResponse
~~~

### Errores

~~~text
400 REGLA_DOMINIO_VIOLADA
403 PERMISO_DENEGADO
404 RECURSO_NO_ENCONTRADO
409 ULTIMO_PROPIETARIO
409 CONFLICTO_CONCURRENCIA
422 REQUEST_VALIDATION_ERROR
~~~

### Idempotencia

No debe tratarse como no-op silencioso si la semántica de dominio rechaza la transición solicitada.

---

## 20. Promover a Propietario

### Endpoint

~~~http
POST /api/v1/negocios/{negocio_id}/miembros/{miembro_id}/promover-propietario
~~~

### Intención

Hace explícita la operación:

~~~text
ENCARGADO/TRABAJADOR
→ PROPIETARIO
~~~

### Autenticación

JWT + membresía ACTIVA + PROPIETARIO.

### Request

~~~text
PromoverPropietarioRequest
~~~

Incluye:

- version de UsuarioNegocio.

No recibe `rol`: la intención está determinada por el endpoint.

### Precondición

La membresía destino debe estar ACTIVA.

### Success

~~~text
200 OK
MiembroResponse
~~~

### Errores

~~~text
400 TRANSICION_INVALIDA
403 PERMISO_DENEGADO
404 RECURSO_NO_ENCONTRADO
409 CONFLICTO_CONCURRENCIA
422 REQUEST_VALIDATION_ERROR
~~~

### Idempotencia

No se considera idempotente automáticamente.

Promover una membresía ya PROPIETARIO puede rechazarse como transición inválida en lugar de ocultar el error.

---

## 21. Desactivar Membresía

### Endpoint

~~~http
POST /api/v1/negocios/{negocio_id}/miembros/{miembro_id}/desactivar
~~~

### Autenticación

JWT + membresía ACTIVA + PROPIETARIO.

### Request

~~~text
DesactivarMiembroRequest
~~~

Incluye:

- version de UsuarioNegocio.

### Regla crítica

No puede dejar:

~~~text
0 PROPIETARIOS ACTIVO
~~~

La verificación se realiza dentro de la misma transacción, con la estrategia de locking congelada en persistencia.

### Success

~~~text
200 OK
MiembroResponse
~~~

El response devuelve:

~~~text
estado = INACTIVO
nueva version
~~~

### Errores

~~~text
400 TRANSICION_INVALIDA
403 PERMISO_DENEGADO
404 RECURSO_NO_ENCONTRADO
409 ULTIMO_PROPIETARIO
409 CONFLICTO_CONCURRENCIA
~~~

### Nota

**No existe un endpoint administrativo directo de reactivación de membresía en Bloque 1.**

La reincorporación ocurre mediante:

~~~text
nueva InvitacionNegocio
        ↓
aceptación por destinatario
        ↓
reutilización de UsuarioNegocio histórica INACTIVA
~~~

---

# PARTE IV — INVITACIONES

## 22. Emitir Invitación

### Endpoint

~~~http
POST /api/v1/negocios/{negocio_id}/invitaciones
~~~

### Autenticación

JWT + membresía ACTIVA + PROPIETARIO.

### Request

~~~text
CrearInvitacionRequest
~~~

Incluye:

- email_destino;
- rol_propuesto.

Valores admitidos:

~~~text
ENCARGADO
TRABAJADOR
~~~

No admite:

~~~text
PROPIETARIO
~~~

La duración/fecha de expiración se obtiene de la política de Application; no se confía en una fecha arbitraria enviada por el cliente mientras esa política no sea un parámetro funcional del producto.

### Reglas

Rechazar si:

- destinatario ya posee membresía ACTIVA;
- existe otra PENDIENTE vigente equivalente.

Si existe una PENDIENTE ya vencida pero no materializada:

~~~text
materializar EXPIRADA
+
crear nueva PENDIENTE
~~~

en una frontera consistente.

### Success

~~~text
201 Created
InvitacionEmitidaResponse
~~~

Location:

~~~text
/api/v1/negocios/{negocio_id}/invitaciones/{invitacion_id}
~~~

El response puede incluir la referencia compartible inicial, pero nunca `token_hash`.

### Errores

~~~text
400 ROL_INVITACION_INVALIDO
403 PERMISO_DENEGADO
404 RECURSO_NO_ENCONTRADO
409 MIEMBRO_YA_ACTIVO
409 INVITACION_PENDIENTE_EXISTENTE
409 CONFLICTO_CONCURRENCIA
422 REQUEST_VALIDATION_ERROR
~~~

### Idempotencia

No idempotente.

Constraints impiden efectos duplicados equivalentes.

---

## 23. Consultar Invitaciones del Negocio

### Endpoint

~~~http
GET /api/v1/negocios/{negocio_id}/invitaciones
~~~

### Autenticación

JWT + membresía ACTIVA + PROPIETARIO.

### Query

~~~text
estado
q
page
page_size
sort
order
~~~

`q` puede buscar por email funcional/visible según política explícita de Application.

### Success

~~~text
200 OK
InvitacionNegocioPageResponse
~~~

No expone token_hash.

### Idempotencia

GET seguro e idempotente.

---

## 24. Cancelar Invitación

### Endpoint

~~~http
POST /api/v1/negocios/{negocio_id}/invitaciones/{invitacion_id}/cancelar
~~~

### Autenticación

JWT + membresía ACTIVA + PROPIETARIO.

### Request

~~~text
CancelarInvitacionRequest
~~~

Incluye:

- version.

### Regla

Se permite:

~~~text
PENDIENTE → CANCELADA
~~~

aunque la invitación haya vencido temporalmente y todavía no se haya materializado como EXPIRADA.

No se permite cancelar estados terminales.

### Success

~~~text
200 OK
InvitacionNegocioResponse
~~~

### Errores

~~~text
400 TRANSICION_INVALIDA
403 PERMISO_DENEGADO
404 RECURSO_NO_ENCONTRADO
409 INVITACION_YA_PROCESADA
409 CONFLICTO_CONCURRENCIA
~~~

---

## 25. Obtener Enlace Compartible

### Endpoint

~~~http
POST /api/v1/negocios/{negocio_id}/invitaciones/{invitacion_id}/enlace-compartible
~~~

### Intención

Implementa funcionalmente:

~~~text
RF-ORG-007 — Compartir / Reenviar Invitación
~~~

sin crear otra `InvitacionNegocio`.

### Autenticación

JWT + membresía ACTIVA + PROPIETARIO.

### Precondición

La invitación debe ser:

~~~text
PENDIENTE
+
vigente
~~~

### Success

~~~text
200 OK
EnlaceInvitacionResponse
~~~

Conceptualmente:

~~~json
{
  "url": "..."
}
~~~

### Regla técnica

La mecánica exacta para recuperar o rotar el token público es de Infrastructure/Security.

Puede emitirse una nueva referencia técnica para la **misma InvitacionNegocio** siempre que:

- no se cree otra invitación;
- no cambie estado;
- no cambie rol_propuesto;
- no se extienda fecha_expiracion.

Si se rota el token técnico, los enlaces anteriores podrán quedar invalidados según la estrategia elegida.

### Errores

~~~text
400 INVITACION_NO_VIGENTE
403 PERMISO_DENEGADO
404 RECURSO_NO_ENCONTRADO
409 INVITACION_YA_PROCESADA
~~~

### Idempotencia

No se garantiza idempotencia porque la implementación puede rotar la referencia técnica.

---

## 26. Vista Pública de Invitación

### Endpoint

~~~http
GET /api/v1/invitaciones/{token}
~~~

### Autenticación

Pública.

### Success

~~~text
200 OK
InvitacionPublicaResponse
~~~

Información mínima:

- nombre del Negocio;
- rol_propuesto;
- email_destino_ofuscado;
- disponibilidad/vigencia necesaria para orientar la UI.

No expone:

- negocio_id si no es necesario;
- miembros;
- email completo;
- token_hash;
- datos internos de auditoría.

### Errores

Un token inexistente/no utilizable debe responder de forma que no habilite enumeración indebida.

Contrato inicial:

~~~text
404 INVITACION_NO_DISPONIBLE
422 REQUEST_VALIDATION_ERROR
~~~

### Idempotencia

GET seguro e idempotente.

---

## 27. Aceptar Invitación

### Endpoint

~~~http
POST /api/v1/invitaciones/{token}/aceptar
~~~

### Autenticación

JWT.

No requiere una membresía previa en el Negocio invitante.

### Request

~~~text
AceptarInvitacionRequest
~~~

No contiene email ni negocio_id.

Puede contener la `version` pública/técnica solo si se decide exponerla en `schemas-dto.md`; la autoridad sobre estado se revalida server-side.

### Reglas

Requiere:

- invitación PENDIENTE;
- vigente;
- email autenticado equivalente a email_destino;
- ausencia de membresía ACTIVA;
- creación o reactivación de membresía histórica;
- aceptación + membresía en una única transacción.

Si existe membresía histórica INACTIVA:

~~~text
misma UsuarioNegocio
→ ACTIVO
→ rol = rol_propuesto
~~~

### Success

~~~text
200 OK
AceptarInvitacionResponse
~~~

Debe permitir al frontend conocer como mínimo:

- invitación aceptada;
- negocio incorporado;
- membresía resultante;
- rol resultante.

### Errores

~~~text
401 AUTHENTICATION_REQUIRED
403 INVITACION_NO_CORRESPONDE_AL_USUARIO
404 INVITACION_NO_DISPONIBLE
409 INVITACION_NO_VIGENTE
409 INVITACION_YA_PROCESADA
409 MIEMBRO_YA_ACTIVO
409 CONFLICTO_CONCURRENCIA
~~~

### Idempotencia

No se considera idempotente.

Un segundo intento después de aceptación debe observar estado ya procesado, no crear otra membresía.

---

## 28. Rechazar Invitación

### Endpoint

~~~http
POST /api/v1/invitaciones/{token}/rechazar
~~~

### Autenticación

JWT destinatario.

### Reglas

Requiere:

- email autenticado equivalente;
- estado PENDIENTE;
- invitación vigente.

### Success

~~~text
200 OK
InvitacionUsuarioResponse
~~~

Estado resultante:

~~~text
RECHAZADA
~~~

### Errores

~~~text
403 INVITACION_NO_CORRESPONDE_AL_USUARIO
404 INVITACION_NO_DISPONIBLE
409 INVITACION_NO_VIGENTE
409 INVITACION_YA_PROCESADA
409 CONFLICTO_CONCURRENCIA
~~~

### Idempotencia

No se considera idempotente.

Un segundo rechazo observa estado terminal.

---

# PARTE V — CATEGORÍAS

## 29. Listar Categorías

### Endpoint

~~~http
GET /api/v1/negocios/{negocio_id}/categorias
~~~

### Autenticación

JWT + membresía ACTIVA + `CONSULTAR_CATALOGO`.

### Query

~~~text
estado
q
page
page_size
sort
order
~~~

Filtros:

~~~text
estado = ACTIVA | INACTIVA
~~~

Default recomendado:

~~~text
sin filtro explícito
→ ACTIVA
~~~

El comportamiento exacto queda congelado aquí para simplificar UX inicial.

### Success

~~~text
200 OK
CategoriaPageResponse
~~~

### Idempotencia

GET seguro e idempotente.

---

## 30. Consultar Categoría

### Endpoint

~~~http
GET /api/v1/negocios/{negocio_id}/categorias/{categoria_id}
~~~

### Autenticación

JWT + membresía ACTIVA + `CONSULTAR_CATALOGO`.

### Success

~~~text
200 OK
CategoriaResponse
~~~

### Errores

~~~text
404 RECURSO_NO_ENCONTRADO
~~~

incluyendo cross-tenant.

---

## 31. Crear Categoría

### Endpoint

~~~http
POST /api/v1/negocios/{negocio_id}/categorias
~~~

### Autenticación

JWT + membresía ACTIVA + `GESTIONAR_CATEGORIAS`.

### Request

~~~text
CrearCategoriaRequest
~~~

Incluye:

- nombre.

Estado inicial:

~~~text
ACTIVA
~~~

### Success

~~~text
201 Created
CategoriaResponse
~~~

Location:

~~~text
/api/v1/negocios/{negocio_id}/categorias/{categoria_id}
~~~

### Errores

~~~text
409 CATEGORIA_NOMBRE_DUPLICADO
422 REQUEST_VALIDATION_ERROR
~~~

### Idempotencia

No idempotente.

---

## 32. Editar Categoría

### Endpoint

~~~http
PATCH /api/v1/negocios/{negocio_id}/categorias/{categoria_id}
~~~

### Autenticación

JWT + membresía ACTIVA + `GESTIONAR_CATEGORIAS`.

### Request

~~~text
EditarCategoriaRequest
~~~

Incluye:

- nombre si cambia;
- version obligatoria.

No modifica estado.

### Success

~~~text
200 OK
CategoriaResponse
~~~

### Errores

~~~text
404 RECURSO_NO_ENCONTRADO
409 CATEGORIA_NOMBRE_DUPLICADO
409 CONFLICTO_CONCURRENCIA
422 REQUEST_VALIDATION_ERROR
~~~

---

## 33. Desactivar Categoría

### Endpoint

~~~http
POST /api/v1/negocios/{negocio_id}/categorias/{categoria_id}/desactivar
~~~

### Request

~~~text
CambiarEstadoCategoriaRequest
~~~

Incluye:

- version.

### Regla

~~~text
ACTIVA → INACTIVA
~~~

No:

- desactiva artículos;
- elimina asociaciones;
- modifica categoria_id de artículos.

### Success

~~~text
200 OK
CategoriaResponse
~~~

### Errores

~~~text
400 TRANSICION_INVALIDA
404 RECURSO_NO_ENCONTRADO
409 CONFLICTO_CONCURRENCIA
~~~

---

## 34. Reactivar Categoría

### Endpoint

~~~http
POST /api/v1/negocios/{negocio_id}/categorias/{categoria_id}/reactivar
~~~

### Request

~~~text
CambiarEstadoCategoriaRequest
~~~

Incluye:

- version.

### Regla

~~~text
INACTIVA → ACTIVA
~~~

No se utiliza para renombrar o editar simultáneamente.

### Success

~~~text
200 OK
CategoriaResponse
~~~

### Errores

~~~text
400 TRANSICION_INVALIDA
404 RECURSO_NO_ENCONTRADO
409 CONFLICTO_CONCURRENCIA
~~~

---

## 35. Eliminar Categoría

### Endpoint

~~~http
DELETE /api/v1/negocios/{negocio_id}/categorias/{categoria_id}
~~~

### Autenticación

JWT + membresía ACTIVA + `GESTIONAR_CATEGORIAS`.

### Request

Para proteger concurrencia podrá requerir `version` mediante un pequeño body de comando únicamente si el cliente HTTP utilizado soporta DELETE con body de manera confiable.

**Decisión preferida del Bloque 1:** usar query param explícito:

~~~text
?version=N
~~~

para esta operación excepcional.

Esto evita depender de bodies en DELETE.

### Regla

Solo puede eliminarse si no existe ningún ArticuloCatalogo asociado, ACTIVO o INACTIVO.

### Success

~~~text
204 No Content
~~~

### Errores

~~~text
404 RECURSO_NO_ENCONTRADO
409 CATEGORIA_CON_ARTICULOS
409 CONFLICTO_CONCURRENCIA
422 REQUEST_VALIDATION_ERROR
~~~

### Idempotencia

El primer DELETE exitoso devuelve 204.

Un reintento posterior puede devolver 404.

---

# PARTE VI — ARTÍCULOS

## 36. Consultar Catálogo

### Endpoint

~~~http
GET /api/v1/negocios/{negocio_id}/articulos
~~~

### Autenticación

JWT + membresía ACTIVA + `CONSULTAR_CATALOGO`.

### Query

~~~text
q
estado
tipo
categoria_id
page
page_size
sort
order
~~~

Filtros permitidos:

~~~text
estado = ACTIVO | INACTIVO
tipo = BIEN | SERVICIO
categoria_id = UUID
~~~

Default:

~~~text
estado = ACTIVO
~~~

Ordenamiento inicial permitido:

~~~text
nombre
created_at
updated_at
~~~

con `id` como desempate técnico cuando corresponda.

### Success

~~~text
200 OK
ArticuloPageResponse
~~~

### Idempotencia

GET seguro e idempotente.

---

## 37. Consultar Artículo

### Endpoint

~~~http
GET /api/v1/negocios/{negocio_id}/articulos/{articulo_id}
~~~

### Autenticación

JWT + membresía ACTIVA + `CONSULTAR_CATALOGO`.

### Success

~~~text
200 OK
ArticuloResponse
~~~

Incluye la configuración vigente:

- tipo;
- unidad;
- categoría opcional;
- SKU opcional;
- precio/costo;
- capacidades;
- estado;
- imágenes;
- version.

No expone columnas normalizadas internas.

### Errores

~~~text
404 RECURSO_NO_ENCONTRADO
~~~

incluyendo cross-tenant.

---

## 38. Crear Artículo

### Endpoint

~~~http
POST /api/v1/negocios/{negocio_id}/articulos
~~~

### Autenticación

JWT + membresía ACTIVA + `CREAR_CATALOGO`.

### Request

~~~text
CrearArticuloRequest
~~~

Incluye conceptualmente:

- nombre;
- descripcion opcional;
- tipo;
- unidad_medida;
- categoria_id opcional;
- sku opcional;
- precio_base opcional;
- costo_referencia opcional;
- configuración/capacidades;
- imágenes 0..3 mediante referencias opacas.

No incluye:

- negocio_id;
- estado libre;
- version;
- identidad;
- valores normalizados.

Estado inicial:

~~~text
ACTIVO
~~~

### Reglas principales

- Tipo BIEN/SERVICIO válido;
- Tipo queda inmutable;
- Categoria, si existe, debe ser ACTIVA y del mismo Negocio;
- nombre único por Negocio incluyendo INACTIVOS;
- SKU único por Negocio incluyendo INACTIVOS;
- SKU vacío → null;
- vendible requiere precio;
- capacidades coherentes;
- ACTIVO requiere uso operativo;
- 0..3 imágenes;
- si existen imágenes, exactamente una principal.

### Success

~~~text
201 Created
ArticuloResponse
~~~

Location:

~~~text
/api/v1/negocios/{negocio_id}/articulos/{articulo_id}
~~~

### Errores

~~~text
400 CONFIGURACION_ARTICULO_INVALIDA
400 CATEGORIA_INACTIVA
404 CATEGORIA_NO_ENCONTRADA
409 ARTICULO_NOMBRE_DUPLICADO
409 ARTICULO_SKU_DUPLICADO
409 CONFLICTO_CONCURRENCIA
422 REQUEST_VALIDATION_ERROR
~~~

Para una categoria_id perteneciente a otro tenant se utiliza 404.

### Idempotencia

No idempotente.

---

## 39. Editar Artículo

### Endpoint

~~~http
PATCH /api/v1/negocios/{negocio_id}/articulos/{articulo_id}
~~~

### Autenticación

JWT + membresía ACTIVA + `EDITAR_CATALOGO`.

### Request

~~~text
EditarArticuloRequest
~~~

Incluye:

- version obligatoria;
- solamente campos a modificar.

Campos editables:

- nombre;
- descripcion;
- categoria_id;
- sku;
- unidad_medida;
- precio_base;
- costo_referencia;
- capacidades;
- imágenes.

No editables:

~~~text
id
negocio_id
tipo
estado
created_at
~~~

### Semántica PATCH

~~~text
campo omitido
→ conservar

campo = null
→ limpiar/desasociar si el campo admite ausencia
~~~

Ejemplos:

~~~text
categoria_id omitida → conservar
categoria_id = null  → desasociar

sku omitido → conservar
sku = null  → quitar
~~~

### Regla de estado

Editar:

~~~text
ACTIVO   → continúa ACTIVO
INACTIVO → continúa INACTIVO
~~~

No reactiva implícitamente.

### Atomicidad

La propuesta completa se valida antes de mutar y se confirma todo-o-nada.

Los cambios de imágenes incrementan también la version del artículo padre.

### Success

~~~text
200 OK
ArticuloResponse
~~~

con nueva `version`.

### Errores

~~~text
400 CONFIGURACION_ARTICULO_INVALIDA
400 CAMBIO_TIPO_NO_PERMITIDO
400 CATEGORIA_INACTIVA
404 RECURSO_NO_ENCONTRADO
404 CATEGORIA_NO_ENCONTRADA
409 ARTICULO_NOMBRE_DUPLICADO
409 ARTICULO_SKU_DUPLICADO
409 CONFLICTO_CONCURRENCIA
409 CATEGORIA_INVALIDADA_CONCURRENTEMENTE
422 REQUEST_VALIDATION_ERROR
~~~

---

## 40. Desactivar Artículo

### Endpoint

~~~http
POST /api/v1/negocios/{negocio_id}/articulos/{articulo_id}/desactivar
~~~

### Autenticación

JWT + membresía ACTIVA + `DESACTIVAR_CATALOGO`.

### Request

~~~text
CambiarEstadoArticuloRequest
~~~

Incluye:

- version.

### Regla

~~~text
ACTIVO → INACTIVO
~~~

No modifica:

- capacidades;
- precio;
- SKU;
- categoría;
- imágenes;
- historia de módulos consumidores.

Desactivar no libera nombre ni SKU.

### Success

~~~text
200 OK
ArticuloResponse
~~~

### Errores

~~~text
400 TRANSICION_INVALIDA
404 RECURSO_NO_ENCONTRADO
409 CONFLICTO_CONCURRENCIA
~~~

---

## 41. Reactivar Artículo

### Endpoint

~~~http
POST /api/v1/negocios/{negocio_id}/articulos/{articulo_id}/reactivar
~~~

### Autenticación

JWT + membresía ACTIVA + `REACTIVAR_CATALOGO`.

### Request

~~~text
CambiarEstadoArticuloRequest
~~~

Incluye únicamente:

- version.

No admite un payload libre de edición.

### Regla

~~~text
INACTIVO → ACTIVO
~~~

utilizando la configuración vigente ya confirmada.

Debe rechazarse si la configuración actual no satisface las invariantes de ACTIVO.

Una Categoria históricamente asociada e INACTIVA no bloquea por sí sola la reactivación.

### Success

~~~text
200 OK
ArticuloResponse
~~~

### Errores

~~~text
400 TRANSICION_INVALIDA
400 CONFIGURACION_NO_REACTIVABLE
404 RECURSO_NO_ENCONTRADO
409 CONFLICTO_CONCURRENCIA
~~~

---

## 42. Eliminar Artículo

### Endpoint

~~~http
DELETE /api/v1/negocios/{negocio_id}/articulos/{articulo_id}?version=N
~~~

### Autenticación

JWT + membresía ACTIVA + PROPIETARIO.

### Regla

Requiere:

~~~text
estado = INACTIVO
+
sin historia/referencias/dependencias que deban conservarse
~~~

La ausencia de dependencias se revalida al confirmar.

### Success

~~~text
204 No Content
~~~

La eliminación libera:

- nombre funcional;
- SKU si existía.

### Errores

~~~text
403 PERMISO_DENEGADO
404 RECURSO_NO_ENCONTRADO
409 ARTICULO_DEBE_ESTAR_INACTIVO
409 ARTICULO_CON_REFERENCIAS
409 CONFLICTO_CONCURRENCIA
422 REQUEST_VALIDATION_ERROR
~~~

### Idempotencia

Un primer DELETE puede retornar 204.

Un reintento posterior puede retornar 404.

---

# PARTE VII — REGLAS TRANSVERSALES POR ENDPOINT

## 43. Tenant scoping

Para toda ruta:

~~~text
/api/v1/negocios/{negocio_id}/recurso/{id}
~~~

la consulta inicial debe realizarse conceptualmente como:

~~~text
buscar recurso
WHERE id = :id
AND negocio_id = :negocio_id
~~~

No:

~~~text
buscar por id global
→ cargar
→ comparar tenant después
~~~

como estrategia normal.

---

## 44. Authorization context

El router/dependency resuelve:

~~~text
sub
+
negocio_id path
+
UsuarioNegocio ACTIVO
~~~

y luego verifica el permiso requerido.

El body no puede elevar privilegios.

---

## 45. Versionado optimista

Las mutaciones de:

- Negocio;
- UsuarioNegocio;
- InvitacionNegocio;
- Categoria;
- ArticuloCatalogo;

deben utilizar la `version` esperada cuando el cliente actúa sobre un estado previamente leído.

Los endpoints de creación no requieren version.

---

## 46. Auditoría

Las operaciones mutantes relevantes deben proporcionar a Application el actor autenticado necesario para registrar:

~~~text
quién
cuándo
qué recurso
qué cambio
~~~

No se expone un endpoint CRUD de `auditoria_cambio` en Bloque 1.

La tabla de auditoría es infraestructura de trazabilidad, no un recurso administrativo genérico del MVP.

---

## 47. Responses de mutaciones

Cuando la entidad posee version y continúa existiendo, se prefiere:

~~~text
200 + representación actualizada
~~~

sobre `204`.

Así el cliente recibe inmediatamente:

~~~text
nueva version
~~~

Hard delete utiliza 204.

---

## 48. Operaciones que no existen

Bloque 1 **no expone**:

~~~text
PATCH /negocios/{negocio_id}              para cambiar moneda
DELETE /negocios/{negocio_id}
DELETE /usuarios/{usuario_id}
POST /miembros/{id}/reactivar             directo
PATCH /articulos/{id}/tipo
PATCH /articulos/{id}/estado              genérico
PATCH /invitaciones/{id}/estado           genérico
CRUD /auditoria_cambio
~~~

Motivo:

- no están definidos funcionalmente; o
- romperían intención de dominio; o
- omitirían invariantes específicas.

---

# PARTE VIII — MAPEO CASO DE USO → ENDPOINT

## 49. M01

| Caso de Uso / RF | Endpoint principal |
| --- | --- |
| CU-ORG-01 Registrar Usuario | `POST /auth/registro` |
| CU-ORG-02 Iniciar Sesión | `POST /auth/login` |
| RF-ORG-003 Crear Negocio | `POST /negocios` |
| RF-ORG-004 Configurar Modalidades | `PUT /negocios/{negocio_id}/modalidades` |
| RF-ORG-005 Consultar Negocios | `GET /usuarios/me/negocios` |
| RF-ORG-005 Consultar Invitaciones | `GET /usuarios/me/invitaciones` |
| RF-ORG-006 Invitar Miembro | `POST /negocios/{negocio_id}/invitaciones` |
| RF-ORG-007 Compartir/Reenviar | `POST .../invitaciones/{id}/enlace-compartible` |
| RF-ORG-008 Aceptar | `POST /invitaciones/{token}/aceptar` |
| RF-ORG-009 Rechazar | `POST /invitaciones/{token}/rechazar` |
| RF-ORG-010 Cancelar | `POST .../invitaciones/{id}/cancelar` |
| RF-ORG-011 Entrar a Negocio | selección frontend + tenant en path |
| RF-ORG-012 Consultar Miembros | `GET .../miembros` |
| RF-ORG-013 Modificar Rol | `PATCH .../miembros/{id}/rol` |
| RF-ORG-014 Promover Propietario | `POST .../miembros/{id}/promover-propietario` |
| RF-ORG-015 Desactivar Membresía | `POST .../miembros/{id}/desactivar` |
| RF-ORG-016 Reactivar Membresía | aceptación de nueva invitación |
| RF-ORG-017 Consultar Preparación | `GET .../preparacion` |

---

## 50. M02

| Caso de Uso | Endpoint principal |
| --- | --- |
| CU-CAT-01 Consultar Catálogo | `GET .../articulos` |
| CU-CAT-02 Buscar y Filtrar | query params de `GET .../articulos` |
| CU-CAT-03 Gestionar Categorias | endpoints `/categorias` |
| CU-CAT-04 Crear Artículo | `POST .../articulos` |
| CU-CAT-05 Editar Artículo | `PATCH .../articulos/{id}` |
| CU-CAT-06 Desactivar | `POST .../articulos/{id}/desactivar` |
| CU-CAT-06 Reactivar | `POST .../articulos/{id}/reactivar` |
| CU-CAT-07 Eliminar | `DELETE .../articulos/{id}?version=N` |

---

# PARTE IX — DECISIONES CONGELADAS

## 51. Decisiones

1. Registro y login viven bajo `/auth`.
2. Identidad autenticada se consulta mediante `/usuarios/me`.
3. Seleccionar Negocio no crea sesión de tenant server-side.
4. Modalidades se reemplazan como colección completa mediante PUT.
5. Cambio de rol general y promoción a PROPIETARIO son intenciones separadas.
6. Reactivación de membresía no posee endpoint administrativo directo.
7. Reincorporación de miembro ocurre mediante nueva invitación aceptada.
8. Invitaciones administrativas tenant-scoped utilizan `invitacion_id`.
9. Aceptación/rechazo del destinatario utiliza token público.
10. El token público nunca reemplaza autenticación del destinatario.
11. Compartir/reemitir referencia no crea otra InvitacionNegocio.
12. Categorias poseen endpoints de estado explícitos.
13. Articulos poseen endpoints de estado explícitos.
14. PATCH de artículo nunca reactiva implícitamente.
15. TipoArticulo no tiene endpoint de modificación.
16. Imágenes se administran dentro de creación/edición de ArticuloCatalogo durante Bloque 1.
17. Hard delete de Articulo requiere PROPIETARIO.
18. Hard delete de Categoria requiere permiso conceptual GESTIONAR_CATEGORIAS.
19. DELETE usa `version` como query param para evitar depender de body en DELETE.
20. No existe API genérica de auditoría.
21. Listados de catálogo muestran ACTIVO por defecto salvo filtro explícito.
22. Cross-tenant se oculta mediante 404.

---

# PARTE X — DECISIONES DIFERIDAS

## 52. Diferidas

Permanecen para `schemas-dto.md` o implementación:

- longitudes máximas concretas de strings;
- requisitos exactos de password;
- duración por defecto de invitaciones;
- algoritmo exacto de normalización;
- shape final de cada Response;
- política concreta de permisos M02 por rol;
- proveedor/estrategia de storage;
- mecanismo concreto de token compartible y rotación;
- campos concretos del checklist de preparación;
- límites específicos de `q`;
- soporte futuro de cursor pagination.

No deben inventarse silenciosamente durante implementación.

---

# PARTE XI — CRITERIO DE ACEPTACIÓN

## 53. Criterio de aceptación

El catálogo de endpoints se considera consistente si:

1. todo RF/CU de M01 con interacción HTTP posee una ruta o un mapeo explícito;
2. todo CU de M02 posee una ruta;
3. ninguna ruta permite elegir tenant desde body;
4. ninguna ruta genérica permite cambiar estados sensibles arbitrariamente;
5. aceptar invitación no requiere membresía previa;
6. aceptar/rechazar exige identidad destinataria;
7. no existe reactivación directa de membresía fuera del flujo de invitación;
8. último Propietario continúa protegido;
9. promocionar a Propietario es deliberado;
10. M02 no inventa una matriz exhaustiva de roles;
11. TipoArticulo no puede modificarse;
12. edición de INACTIVO no lo reactiva;
13. reactivación de Articulo no permite payload libre de edición;
14. hard delete es distinto de desactivar;
15. Categoria cross-tenant nunca puede asociarse a Articulo;
16. optimistic locking aparece en mutaciones versionadas;
17. responses de mutación devuelven nueva version cuando el recurso persiste;
18. 404 protege recursos cross-tenant;
19. errores esperables pueden mapearse al contrato uniforme;
20. OpenAPI puede documentar todas las rutas sin exponer modelos ORM.

---

## 54. Próximo documento

El siguiente artefacto es:

~~~text
api/bloque-1-fundacion/schemas-dto.md
~~~

Allí se definirán exactamente:

- request schemas;
- response schemas;
- campos;
- tipos;
- nulabilidad;
- validaciones estructurales;
- ConfigDict;
- paginación genérica;
- error schemas;
- DTOs de comandos;
- distinción omitido/null en PATCH;
- serialización de Decimal, UUID, datetime y enums.
