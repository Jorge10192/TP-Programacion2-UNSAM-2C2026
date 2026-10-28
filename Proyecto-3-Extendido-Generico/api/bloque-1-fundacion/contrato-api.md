# Contrato API — Bloque 1 Fundación

> **Estado:** versión de referencia para diseño e implementación de la API del Bloque 1.  
> **Alcance:** M01 — Organización del Negocio + M02 — Catálogo.  
> **Framework objetivo:** FastAPI + Pydantic v2.  
> **Objetivo:** congelar las reglas HTTP transversales que deberán respetar `endpoints.md`, `schemas-dto.md` y la implementación real.

---

## 1. Propósito

Este documento define las reglas globales de la API REST de:

~~~text
M01 — Organización del Negocio
M02 — Catálogo
~~~

No enumera todavía todas las rutas ni define cada DTO concreto.

Funciona como base para:

~~~text
contrato-api.md
        ↓
endpoints.md
        ↓
schemas-dto.md
        ↓
Routers FastAPI
        ↓
Use Cases
        ↓
Tests de API
~~~

Complementa:

~~~text
arquitectura/arquitectura-general.md
arquitectura/estructura-backend.md
arquitectura/multitenant-y-seguridad.md
arquitectura/patrones-de-diseno.md

base-de-datos/bloque-1-fundacion/modelo-relacional.md
base-de-datos/bloque-1-fundacion/erd.puml
~~~

---

## 2. Principio rector

La API expone **casos de uso y recursos del dominio**, no tablas de PostgreSQL.

Evitar diseños del tipo:

~~~text
PATCH /usuario_negocio/{id}
PATCH /articulo_catalogo/{id}
~~~

cuando la intención funcional real es:

~~~text
cambiar rol
desactivar miembro
reactivar artículo
aceptar invitación
~~~

Regla:

~~~text
HTTP expresa intención
Application coordina
Domain protege invariantes
Infrastructure persiste
~~~

La API no debe convertirse en un CRUD directo sobre el esquema relacional.

---

## 3. Prefijo global

Toda ruta funcional del backend utilizará:

~~~text
/api/v1
~~~

Ejemplos:

~~~text
/api/v1/auth/login
/api/v1/usuarios/me
/api/v1/negocios
/api/v1/negocios/{negocio_id}/articulos
~~~

La versión forma parte de la URL.

No se utilizará inicialmente versionado mediante headers.

---

## 4. Convención de nombres de rutas

Los recursos utilizarán:

- sustantivos;
- plural;
- minúsculas;
- `snake_case` cuando una palabra compuesta lo requiera.

Ejemplos válidos:

~~~text
/negocios
/invitaciones
/miembros
/categorias
/articulos
~~~

Se evitarán rutas que expongan nombres internos de tablas o clases ORM.

---

## 5. Recursos tenant-scoped

Toda operación perteneciente a un Negocio utilizará el tenant explícitamente en el path:

~~~text
/api/v1/negocios/{negocio_id}/...
~~~

Ejemplos:

~~~text
/api/v1/negocios/{negocio_id}/miembros
/api/v1/negocios/{negocio_id}/invitaciones
/api/v1/negocios/{negocio_id}/categorias
/api/v1/negocios/{negocio_id}/articulos
~~~

El `negocio_id` del path es la fuente HTTP autoritativa del tenant.

---

## 6. Tenant no enviado libremente en el body

Cuando el tenant ya está definido por el path, los DTOs de request no deberán aceptar:

~~~json
{
  "negocio_id": "..."
}
~~~

como forma de elegir o modificar el tenant.

Flujo correcto:

~~~text
path.negocio_id
        ↓
validación de membresía
        ↓
Application Context
        ↓
creación/modificación tenant-scoped
~~~

El cliente no puede transferir un recurso a otro Negocio mediante un campo del payload.

---

## 7. Autenticación

Las rutas autenticadas utilizarán:

~~~http
Authorization: Bearer <access_token>
~~~

El JWT identifica principalmente al Usuario global.

Claim mínimo autoritativo:

~~~text
sub = usuario_id
~~~

No se confía en claims de rol o negocio como única fuente de autorización.

---

## 8. Contexto autenticado

Después de validar el JWT, la API resuelve:

~~~text
CurrentUser
├── usuario_id
└── identidad autenticada
~~~

Para una ruta tenant-scoped se agrega:

~~~text
TenantContext
├── usuario_id
├── negocio_id
├── usuario_negocio_id
├── rol vigente
└── estado = ACTIVO
~~~

Este contexto se obtiene desde datos persistidos actuales.

No desde valores enviados libremente por el frontend.

---

## 9. Membresía activa

Una request tenant-scoped debe validar:

~~~text
Usuario autenticado
+
Negocio del path
+
UsuarioNegocio correspondiente
+
EstadoMembresia.ACTIVO
~~~

antes de ejecutar la operación funcional.

Una membresía INACTIVA no concede acceso operativo.

---

## 10. Autorización por operación

La membresía activa no implica permiso universal.

Cada caso de uso determina el permiso requerido.

Conceptualmente:

~~~text
autenticación
    ↓
membresía activa
    ↓
permiso para la operación
    ↓
invariantes de dominio
~~~

Los routers no deben duplicar las reglas internas del Domain.

---

## 11. Política anti-enumeración

Un identificador válido no demuestra autorización.

Cuando un recurso solicitado:

- no existe; o
- existe, pero pertenece a otro tenant no accesible;

la respuesta pública será normalmente indistinguible:

~~~text
404 Not Found
~~~

Ejemplo:

~~~text
GET /api/v1/negocios/A/articulos/123
~~~

no debe revelar si `123` existe en el Negocio B.

---

## 12. Uso de 403

`403 Forbidden` se utiliza cuando:

- el Usuario está correctamente autenticado;
- el contexto autorizado puede revelarse;
- la operación está prohibida por rol/permiso/estado.

Ejemplo:

~~~text
Usuario con membresía ACTIVA
+
recurso del mismo Negocio
+
permiso administrativo insuficiente
→ 403
~~~

Cuando revelar la existencia del recurso o tenant facilite enumeración, se preferirá `404`.

---

# PARTE I — FORMATO HTTP

## 13. Representación principal

El formato principal de request/response será:

~~~text
application/json
~~~

Los endpoints principales de M01/M02 no utilizarán XML.

Los uploads binarios del catálogo no se mezclarán con los DTOs JSON de negocio.

---

## 14. UUID

Los UUID se serializarán como strings canónicos.

Ejemplo:

~~~json
{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
~~~

El backend validará el formato antes de invocar Application.

Un UUID válido sintácticamente no otorga autorización.

---

## 15. Fechas e instantes

Los instantes HTTP se serializarán en ISO-8601 con zona horaria.

Preferencia de salida:

~~~text
2026-10-28T21:00:00Z
~~~

El backend trabaja conceptualmente en UTC.

No se expondrán timestamps ambiguos sin offset.

---

## 16. Valores monetarios

Los valores monetarios del dominio se manejan con:

~~~text
Decimal
~~~

y nunca con `float`.

En JSON se serializarán como **strings decimales** para evitar pérdida de precisión entre clientes:

~~~json
{
  "precio_base": "2500.0000",
  "costo_referencia": "1735.5000"
}
~~~

Los DTOs podrán aceptar string decimal válido y normalizarlo a `Decimal`.

No se aceptarán:

- NaN;
- Infinity;
- valores negativos cuando la regla lo prohíba.

---

## 17. Enums

Los enums se exponen mediante strings estables en mayúsculas.

Ejemplos:

~~~json
{
  "rol": "PROPIETARIO",
  "estado": "ACTIVO",
  "tipo": "BIEN",
  "unidad_medida": "KG"
}
~~~

No se expondrán ordinales numéricos.

---

## 18. Booleanos

Los booleanos utilizarán valores JSON reales:

~~~json
{
  "es_vendible": true,
  "controla_stock": false
}
~~~

No:

~~~text
"true"
1
"SI"
~~~

---

## 19. Null y ausencia

Debe distinguirse:

~~~text
campo omitido
!=
campo enviado como null
~~~

Especialmente en `PATCH`.

Ejemplo:

~~~json
{
  "descripcion": null
}
~~~

significa explícitamente:

~~~text
eliminar/limpiar descripción
~~~

cuando el campo admite `NULL`.

En cambio:

~~~json
{}
~~~

significa:

~~~text
no modificar descripción
~~~

Los schemas Pydantic de PATCH deberán preservar esta distinción mediante campos opcionales + detección de campos enviados.

---

## 20. Campos desconocidos

Los DTOs de mutación utilizarán política equivalente a:

~~~python
extra="forbid"
~~~

No se ignorarán silenciosamente propiedades desconocidas.

Ejemplo:

~~~json
{
  "nomrbe": "Harina"
}
~~~

debe producir error de validación.

Esto también evita aceptar accidentalmente:

~~~json
{
  "negocio_id": "tenant-inyectado"
}
~~~

en schemas que no lo contemplan.

---

# PARTE II — RESPUESTAS EXITOSAS

## 21. Recursos individuales

Las lecturas y mutaciones con representación de retorno responderán directamente el recurso/resultado.

Ejemplo:

~~~json
{
  "id": "...",
  "nombre": "Snack de pollo",
  "estado": "ACTIVO",
  "version": 3
}
~~~

No se agrega un wrapper genérico:

~~~json
{
  "data": { ... }
}
~~~

sin necesidad real.

---

## 22. Creación

Una creación exitosa utilizará:

~~~text
201 Created
~~~

cuando se crea un nuevo recurso identificable.

La respuesta incluirá:

~~~http
Location: /api/v1/negocios/{negocio_id}/articulos/{articulo_id}
~~~

cuando exista una URI canónica del recurso.

El body devolverá normalmente la representación creada.

---

## 23. Modificación

Una modificación con representación actualizada utilizará normalmente:

~~~text
200 OK
~~~

y devolverá la versión resultante.

Esto es especialmente útil en entidades con optimistic locking porque el cliente necesita conocer la nueva `version`.

---

## 24. Operaciones sin contenido

Se utilizará:

~~~text
204 No Content
~~~

cuando la operación haya finalizado correctamente y no exista una representación útil que devolver.

Una respuesta 204 no contiene body.

---

## 25. DELETE

`DELETE` se reservará para eliminación física real.

No se utilizará DELETE como sinónimo de:

~~~text
desactivar
cancelar
rechazar
~~~

porque esas son transiciones funcionales distintas.

Ejemplo:

~~~text
DELETE /articulos/{articulo_id}
~~~

solo representa el hard delete excepcional permitido por M02.

---

# PARTE III — ERRORES

## 26. Formato estándar de error

Toda respuesta de error controlada utilizará:

~~~json
{
  "code": "ARTICULO_NOMBRE_DUPLICADO",
  "message": "Ya existe un artículo con ese nombre en este negocio.",
  "details": [],
  "timestamp": "2026-10-28T21:00:00Z"
}
~~~

Campos:

### code

Código estable y machine-readable.

Formato:

~~~text
UPPER_SNAKE_CASE
~~~

### message

Mensaje humano comprensible.

No debe ser utilizado por el frontend como identificador lógico.

### details

Lista de detalles adicionales.

Puede estar vacía.

### timestamp

Instante UTC en el que la API generó la respuesta.

---

## 27. Relación con Problem Details

El formato anterior es un contrato propio del sistema.

Puede inspirarse conceptualmente en Problem Details para APIs HTTP, pero **no se declarará como implementación literal de RFC 9457** mientras no utilice de forma completa su modelo de campos y media type.

No se afirmará compatibilidad con RFC 7807.

Si en el futuro se adopta `application/problem+json`, deberá realizarse como una decisión explícita de contrato.

---

## 28. Details de validación

Para validaciones de campos:

~~~json
{
  "code": "REQUEST_VALIDATION_ERROR",
  "message": "La solicitud contiene valores inválidos.",
  "details": [
    {
      "field": "sku",
      "issue": "El valor no cumple el formato esperado."
    },
    {
      "field": "precio_base",
      "issue": "Debe ser un decimal válido."
    }
  ],
  "timestamp": "2026-10-28T21:00:00Z"
}
~~~

No se expondrán:

- paths internos del servidor;
- stack traces;
- SQL;
- nombres de archivos Python;
- excepciones de librerías;
- cuerpos sensibles.

---

## 29. Exception handlers

La capa API utilizará exception handlers centralizados para traducir:

~~~text
Domain Error
Application Error
Persistence Conflict traducido
RequestValidationError
Authentication Error
~~~

a HTTP.

Domain y Application no deberán lanzar:

~~~text
HTTPException
~~~

ni conocer códigos HTTP.

---

## 30. Catálogo base de códigos de error

Códigos transversales iniciales:

~~~text
REQUEST_VALIDATION_ERROR
AUTHENTICATION_REQUIRED
TOKEN_INVALIDO
CREDENCIALES_INVALIDAS
PERMISO_DENEGADO
MEMBRESIA_INACTIVA
RECURSO_NO_ENCONTRADO
REGLA_DOMINIO_VIOLADA
VALOR_DUPLICADO
CONFLICTO_CONCURRENCIA
RATE_LIMIT_EXCEDIDO
~~~

Los módulos pueden agregar códigos más específicos.

Ejemplos:

~~~text
ARTICULO_NOMBRE_DUPLICADO
ARTICULO_SKU_DUPLICADO
CATEGORIA_NOMBRE_DUPLICADO
ULTIMO_PROPIETARIO
INVITACION_NO_VIGENTE
INVITACION_YA_PROCESADA
~~~

Los códigos definitivos por endpoint se congelarán en `endpoints.md`.

---

# PARTE IV — CÓDIGOS HTTP

## 31. 200 OK

Se utiliza para:

- GET exitoso;
- PATCH exitoso con representación;
- comandos que devuelven el nuevo estado;
- aceptación/rechazo cuando se decide devolver representación funcional.

---

## 32. 201 Created

Se utiliza cuando una operación crea un recurso nuevo.

Ejemplos:

~~~text
Usuario
Negocio
InvitacionNegocio
Categoria
ArticuloCatalogo
~~~

Cuando existe URI canónica se devuelve `Location`.

---

## 33. 204 No Content

Se utiliza cuando la operación no necesita retornar body.

Ejemplo posible:

~~~text
hard delete exitoso
~~~

No se utilizará 204 si el cliente necesita conocer una nueva `version`.

---

## 34. 400 Bad Request

Se utiliza para una request estructuralmente válida cuyo significado funcional inmediato viola una regla de entrada o dominio que no corresponde a conflicto con estado concurrente.

Ejemplos:

~~~text
fecha_expiracion <= fecha_emision
configuración local de capacidades inválida
operación semánticamente imposible por los valores enviados
~~~

No se utilizará 400 para ocultar errores de validación estructural que FastAPI/Pydantic identifica antes del Caso de Uso.

---

## 35. 401 Unauthorized

Se utiliza cuando no existe autenticación válida:

- Bearer token ausente en ruta protegida;
- JWT expirado;
- firma inválida;
- token malformado;
- credenciales de login inválidas.

Cuando corresponda se incluirá:

~~~http
WWW-Authenticate: Bearer
~~~

No se detallará públicamente si el email o password concreto fue el incorrecto.

---

## 36. 403 Forbidden

Se utiliza para un Usuario correctamente autenticado que no posee autoridad para una operación en un contexto cuya existencia puede revelarse.

Ejemplos:

~~~text
rol insuficiente
membresía conocida pero INACTIVA
permiso conceptual faltante
~~~

No sustituye la política 404 cross-tenant.

---

## 37. 404 Not Found

Se utiliza cuando:

- el recurso no existe;
- el recurso no existe dentro del tenant autorizado;
- revelar que el recurso existe en otro tenant produciría enumeración.

El cliente no debe poder distinguir:

~~~text
UUID inexistente
vs
UUID existente en otro Negocio
~~~

mediante el response público.

---

## 38. 409 Conflict

Se utiliza para conflictos con el estado persistido actual.

Ejemplos:

- `version` desactualizada;
- unicidad funcional concurrente;
- recurso ya procesado cuando la operación requiere estado previo;
- conflicto de estado que depende de información persistida actual.

Ejemplos de códigos:

~~~text
CONFLICTO_CONCURRENCIA
ARTICULO_NOMBRE_DUPLICADO
ARTICULO_SKU_DUPLICADO
INVITACION_YA_PROCESADA
~~~

---

## 39. 422 Unprocessable Content

Se utiliza para errores de validación estructural de request detectados por FastAPI/Pydantic.

Ejemplos:

- UUID con formato inválido;
- enum desconocido;
- campo obligatorio ausente;
- tipo JSON incorrecto;
- decimal no parseable;
- campo extra prohibido.

La respuesta se transforma al formato estándar:

~~~text
REQUEST_VALIDATION_ERROR
~~~

No se expone el payload nativo de FastAPI directamente.

---

## 40. 429 Too Many Requests

Se utiliza cuando se supera una política de rate limiting.

Aplicación inicial relevante:

~~~text
POST /api/v1/auth/login
~~~

Cuando la implementación conozca el tiempo de reintento podrá incluir:

~~~http
Retry-After: ...
~~~

Código:

~~~text
RATE_LIMIT_EXCEDIDO
~~~

---

## 41. 500 Internal Server Error

Un error inesperado produce:

~~~text
500 Internal Server Error
~~~

con mensaje público genérico.

Ejemplo:

~~~json
{
  "code": "INTERNAL_ERROR",
  "message": "Ocurrió un error interno.",
  "details": [],
  "timestamp": "2026-10-28T21:00:00Z"
}
~~~

El detalle técnico solo pertenece a logs internos.

---

# PARTE V — PAGINACIÓN Y CONSULTAS

## 42. Paginación

Las colecciones potencialmente crecientes utilizarán:

~~~text
page
page_size
~~~

Convenciones:

~~~text
page
- base 1
- default 1
- mínimo 1

page_size
- default 20
- mínimo 1
- máximo 100
~~~

Ejemplo:

~~~text
GET /api/v1/negocios/{negocio_id}/articulos?page=2&page_size=20
~~~

---

## 43. Respuesta paginada

Formato:

~~~json
{
  "items": [],
  "total": 45,
  "page": 1,
  "page_size": 20,
  "pages": 3
}
~~~

### pages

~~~text
ceil(total / page_size)
~~~

Para `total = 0`:

~~~text
pages = 0
~~~

La lista `items` será vacía.

---

## 44. Página fuera de rango

Solicitar una página válida sintácticamente pero sin elementos no produce 404.

Ejemplo:

~~~text
page = 1000
total = 15
~~~

Respuesta:

~~~text
200 OK
items = []
~~~

con metadata real de paginación.

---

## 45. Búsqueda libre

Cuando una colección soporte búsqueda textual utilizará:

~~~text
q
~~~

Ejemplo:

~~~text
GET /articulos?q=pollo
~~~

La semántica exacta de cada búsqueda se documentará por endpoint.

No se prometerá full-text search mientras no exista implementación específica.

---

## 46. Filtros

Los filtros se expresan como query parameters.

Ejemplos:

~~~text
?estado=ACTIVO
?tipo=BIEN
?categoria_id=<uuid>
~~~

Los filtros permitidos son una allowlist por endpoint.

No se acepta filtrado arbitrario por nombres de columnas.

---

## 47. Ordenamiento

Cuando se soporte ordenamiento se utilizarán:

~~~text
sort
order
~~~

Ejemplo:

~~~text
?sort=nombre&order=asc
~~~

`order` admite:

~~~text
asc
desc
~~~

Los campos permitidos son una allowlist definida por endpoint.

Toda ordenación paginada debe tener un criterio estable; cuando sea necesario se utilizará `id` como desempate técnico.

---

## 48. Paginación inicial y evolución

Para el alcance académico/MVP se congela:

~~~text
page + page_size
~~~

No se implementará cursor pagination preventivamente.

Si el volumen futuro demuestra problemas reales con OFFSET/page pagination, podrá versionarse o extenderse el contrato.

---

# PARTE VI — CONCURRENCIA

## 49. Optimistic locking

Las entidades persistidas con columna `version` expondrán esa versión en sus respuestas cuando el cliente pueda modificarlas.

Ejemplo:

~~~json
{
  "id": "...",
  "nombre": "Snack",
  "version": 4
}
~~~

---

## 50. Version en requests de modificación

Los DTOs de modificación de recursos versionados deberán incluir:

~~~json
{
  "version": 4
}
~~~

Además de los campos de la operación.

Esto aplica a:

- PATCH de entidad;
- cambio de estado;
- comandos administrativos que mutan una entidad versionada.

No se requiere `version` al crear un recurso nuevo.

---

## 51. Conflicto de versión

El update lógico debe comportarse conceptualmente como:

~~~sql
UPDATE ...
WHERE id = :id
  AND negocio_id = :negocio_id
  AND version = :version_esperada
~~~

Si la versión ya no coincide:

~~~text
409 Conflict
code = CONFLICTO_CONCURRENCIA
~~~

La API no realizará merge automático silencioso.

---

## 52. Nueva versión

Después de una modificación exitosa, la respuesta devuelve la nueva versión.

Ejemplo:

~~~text
request version = 4
response version = 5
~~~

El incremento real pertenece a persistencia.

---

## 53. If-Match

No se utilizará `If-Match` como mecanismo principal durante Bloque 1.

La versión en body es más simple para:

- Pydantic;
- frontend;
- comandos explícitos;
- tests académicos.

ETag / If-Match quedan como posible evolución futura.

---

# PARTE VII — IMÁGENES

## 54. Binarios desacoplados del recurso de negocio

Los endpoints principales de ArticuloCatalogo no recibirán archivos mediante:

~~~text
multipart/form-data
~~~

junto con el resto del artículo.

Trabajarán con:

~~~text
referencia_storage
~~~

opaca para el dominio funcional.

---

## 55. Referencia de storage

Ejemplo conceptual:

~~~json
{
  "referencia_storage": "catalogo/abc123/image-1"
}
~~~

El cliente no debe inferir reglas de infraestructura a partir de esta referencia.

No se congela:

- S3;
- Cloudinary;
- filesystem;
- proveedor cloud.

---

## 56. Flujo de upload

La mecánica concreta para obtener una referencia válida queda diferida.

Opciones futuras:

- endpoint de upload dedicado;
- URL prefirmada;
- adaptador de storage del backend.

El diseño deberá preservar:

~~~text
upload físico
!=
mutación del ArticuloCatalogo
~~~

y las reglas de 0..3 imágenes / principal continúan siendo del caso de uso.

---

# PARTE VIII — INVITACIONES

## 57. Token público de invitación

La invitación podrá resolverse mediante un token público de alta entropía.

Ese token:

- identifica la invitación;
- no sustituye autenticación para aceptar/rechazar;
- no autoriza por sí solo incorporación.

No se utiliza el ID interno incremental/predecible como secreto.

---

## 58. Lectura pública mínima

Se prevé una ruta pública conceptual:

~~~text
GET /api/v1/invitaciones/{token}
~~~

No requiere JWT.

Solo podrá retornar información mínima necesaria para orientar la UI.

Ejemplo conceptual:

~~~json
{
  "negocio_nombre": "WALOS",
  "rol_propuesto": "TRABAJADOR",
  "email_destino_ofuscado": "m***@example.com",
  "disponible": true
}
~~~

No debe retornar:

- IDs internos innecesarios;
- listado de miembros;
- información financiera;
- email completo si no es necesario;
- token_hash;
- metadatos de seguridad.

El shape definitivo se congelará en `schemas-dto.md`.

---

## 59. Token inválido o no utilizable

Para un token inexistente, inválido o que no deba exponerse se preferirá una respuesta que no facilite enumeración.

El detalle exacto por estado de invitación se congelará en `endpoints.md`.

La UI pública no necesita conocer información interna excesiva para orientar al Usuario.

---

## 60. Aceptación

Conceptualmente:

~~~text
POST /api/v1/invitaciones/{token}/aceptar
~~~

requiere:

- JWT válido;
- Usuario autenticado;
- email funcionalmente equivalente a `email_destino`;
- invitación PENDIENTE;
- invitación vigente;
- guardias contextuales del dominio.

Poseer el token no alcanza.

---

## 61. Rechazo

Conceptualmente:

~~~text
POST /api/v1/invitaciones/{token}/rechazar
~~~

también requiere autenticación de la identidad destinataria.

No se permite que cualquier persona que posea el enlace cierre una invitación ajena.

---

## 62. Token en logs

Los tokens de invitación son secretos de un solo propósito y no deberán registrarse completos en logs de aplicación.

Si es necesario correlacionar eventos se utilizará:

- identificador interno;
- hash;
- valor truncado no reutilizable.

---

# PARTE IX — NORMALIZACIÓN

## 63. Email

Toda entrada de Email pasa por la semántica única del Value Object `Email`.

No se implementarán reglas distintas en:

- router;
- Pydantic;
- Repository;
- SQLAlchemy.

Las búsquedas utilizan la representación normalizada persistida correspondiente.

---

## 64. Nombres y SKU

Los nombres funcionalmente únicos y SKU se normalizan según la política definida para el dominio/persistencia.

El cliente no decide cuál es la representación usada por índices de unicidad.

Ejemplo:

~~~text
valor visible
+
valor normalizado interno
~~~

El API schema expone normalmente el valor funcional, no las columnas `*_normalizado`.

---

## 65. Strings vacíos

Para campos opcionales donde ausencia significa `NULL`, el contrato deberá normalizar/rechazar strings vacíos según el DTO correspondiente.

Ejemplos relevantes:

~~~text
sku
descripcion
rubro
~~~

No se utilizará `""` como segunda representación persistente de ausencia.

---

# PARTE X — IDEMPOTENCIA Y REINTENTOS

## 66. Métodos naturalmente seguros

Las lecturas GET son safe e idempotentes desde la perspectiva HTTP.

DELETE de un recurso físicamente eliminable deberá diseñarse de forma que un reintento no produzca corrupción, aunque el segundo intento pueda observar 404.

---

## 67. POST de comandos

Los comandos mediante POST no se considerarán idempotentes automáticamente.

Ejemplos:

~~~text
aceptar invitación
crear negocio
crear artículo
~~~

Las invariantes y constraints deben impedir efectos duplicados ante reintentos accidentales.

No se implementarán `Idempotency-Key` globales en Bloque 1 sin requerimiento concreto.

---

# PARTE XI — SEGURIDAD DE RESPUESTAS

## 68. Información sensible

Nunca se devolverán:

- `password_hash`;
- JWT ajenos;
- `token_hash`;
- secretos;
- claves de proveedor;
- SQL;
- stack traces.

Los response schemas deben ser explícitos.

No se serializarán modelos ORM directamente como respuesta automática.

---

## 69. Login

El login deberá responder de forma equivalente ante:

~~~text
email inexistente
password incorrecta
~~~

para evitar enumeración de cuentas.

Código funcional:

~~~text
CREDENCIALES_INVALIDAS
~~~

El endpoint está sujeto a rate limiting.

---

## 70. Cache de respuestas sensibles

Las respuestas de autenticación y otras que contengan credenciales/token podrán utilizar políticas como:

~~~http
Cache-Control: no-store
~~~

La configuración exacta se implementará en la frontera HTTP.

---

# PARTE XII — SEPARACIÓN DE CAPAS

## 71. Router

El router FastAPI debe:

- extraer path/query/body;
- resolver dependencias;
- invocar Application;
- devolver response;
- declarar contrato OpenAPI.

No debe:

- consultar SQLAlchemy directamente;
- implementar invariantes de negocio;
- decidir unicidades;
- ejecutar commits arbitrarios.

---

## 72. Schemas Pydantic

Los schemas HTTP:

~~~text
!= Domain Entity
!= SQLAlchemy Model
~~~

Pueden compartir nombres conceptuales, pero no identidad arquitectónica.

Ejemplo:

~~~text
CrearArticuloRequest
        ↓
DTO / Command de Application
        ↓
ArticuloCatalogo
~~~

---

## 73. Application

Application recibe datos ya estructuralmente válidos y coordina:

- autorización contextual;
- repositories;
- transacciones;
- reloj;
- Domain;
- persistencia;
- integración externa cuando corresponda.

No recibe objetos `Request` de FastAPI.

---

## 74. Domain

Domain no conoce:

- HTTP;
- status codes;
- JSON;
- FastAPI;
- Pydantic;
- JWT.

Sus errores son traducidos en la capa API/Application correspondiente.

---

# PARTE XIII — OPENAPI

## 75. Documentación automática

FastAPI deberá generar OpenAPI coherente con este contrato.

Cada endpoint concreto definirá:

- request schema;
- response schema;
- status de éxito;
- errores relevantes;
- seguridad;
- path/query params.

No se documentará únicamente el camino feliz.

---

## 76. operation_id

Los `operation_id` deberán ser estables y descriptivos.

Ejemplos:

~~~text
crear_negocio
emitir_invitacion
aceptar_invitacion
crear_articulo
editar_articulo
reactivar_articulo
~~~

Esto facilita clientes generados y documentación.

---

# PARTE XIV — DECISIONES CONGELADAS

## 77. Decisiones congeladas

1. El prefijo global es `/api/v1`.
2. Los recursos utilizan nombres plurales.
3. `negocio_id` viaja en el path para recursos tenant-scoped.
4. El tenant del path es la fuente HTTP autoritativa.
5. Los DTOs tenant-scoped no aceptan `negocio_id` libre en body.
6. Autenticación utiliza `Authorization: Bearer <JWT>`.
7. `sub` identifica al Usuario global.
8. Rol/membresía se revalidan contra persistencia.
9. Cross-tenant inaccesible se expone normalmente como 404.
10. 403 queda reservado para autorización denegada en contexto revelable.
11. El formato principal es JSON.
12. UUID se serializa como string canónico.
13. Fechas se serializan como ISO-8601 UTC.
14. Dinero se modela con Decimal y se serializa como string decimal.
15. Enums se exponen como strings estables.
16. Mutation schemas rechazan campos desconocidos.
17. PATCH distingue omisión de `null`.
18. Creación utiliza 201 cuando se crea un recurso.
19. 201 incluye Location cuando existe URI canónica.
20. 204 no contiene body.
21. DELETE representa hard delete, no desactivación.
22. Los errores controlados usan `code`, `message`, `details`, `timestamp`.
23. El formato de error es propio; no se declara RFC 9457 literal.
24. FastAPI/Pydantic request validation se traduce a 422.
25. Reglas de dominio locales inválidas pueden traducirse a 400.
26. Conflictos de estado/unicidad/concurrencia usan 409 cuando corresponda.
27. Rate limiting utiliza 429.
28. Paginación inicial usa `page` + `page_size`.
29. Default de page_size = 20; máximo = 100.
30. Respuesta paginada usa items/total/page/page_size/pages.
31. Búsqueda textual usa `q` cuando el endpoint la soporte.
32. Filtros y sort utilizan allowlists por endpoint.
33. Optimistic locking utiliza `version` dentro del body.
34. Conflicto de version produce 409.
35. Responses de entidades versionadas devuelven la nueva version.
36. No se usa If-Match como mecanismo principal en Bloque 1.
37. Endpoints de ArticuloCatalogo no mezclan binarios multipart con DTOs de negocio.
38. Las imágenes se representan mediante referencias opacas de storage.
39. La lectura mínima de una invitación por token puede ser pública.
40. Aceptar/rechazar invitaciones requiere autenticación del destinatario.
41. Token de invitación no se registra completo.
42. Response schemas nunca exponen secretos ni modelos ORM accidentalmente.
43. Pydantic/FastAPI pertenecen a API, no a Domain.
44. Domain/Application no conocen status HTTP.

---

# PARTE XV — DECISIONES DIFERIDAS

## 78. Decisiones diferidas

Permanecen abiertas:

- refresh tokens;
- OAuth externo;
- MFA;
- cookies autenticadas;
- CSRF asociado a cookies;
- ETag / If-Match;
- Idempotency-Key;
- cursor pagination;
- full-text search;
- upload provider;
- endpoint de upload definitivo;
- URLs prefirmadas;
- CDN;
- request correlation ID público;
- adopción literal de RFC 9457 / `application/problem+json`;
- caching funcional;
- compresión;
- API pública externa;
- API keys;
- webhooks.

Estas decisiones no bloquean el contrato del Bloque 1.

---

# PARTE XVI — CRITERIO DE ACEPTACIÓN

## 79. Criterio de aceptación

El contrato transversal se considera correctamente implementado si puede demostrarse que:

1. todas las rutas funcionales están bajo `/api/v1`;
2. recursos tenant-scoped incluyen `negocio_id` en path;
3. cambiar un `negocio_id` del cliente no permite acceso cross-tenant;
4. los DTOs no aceptan tenant arbitrario cuando viene del path;
5. rutas protegidas rechazan JWT ausente/inválido;
6. membresía INACTIVA no concede acceso operativo;
7. recursos cross-tenant no pueden enumerarse;
8. errores poseen shape uniforme;
9. RequestValidationError se transforma al shape del sistema;
10. Domain/Application no dependen de HTTPException;
11. un POST de creación retorna 201 y Location cuando corresponde;
12. un 204 nunca contiene body;
13. DELETE no se utiliza para desactivar;
14. paginación aplica límites definidos;
15. páginas vacías válidas retornan 200, no 404;
16. filtros/sort no aceptan columnas arbitrarias;
17. versiones obsoletas producen 409;
18. una modificación exitosa devuelve la nueva version cuando corresponde;
19. dinero no atraviesa Domain como float;
20. fechas poseen timezone;
21. campos extra de mutación son rechazados;
22. PATCH distingue ausente de null;
23. imágenes no requieren multipart en el endpoint principal de artículo;
24. el token de invitación por sí solo no permite aceptar/rechazar;
25. responses nunca exponen hashes o secretos;
26. OpenAPI representa correctamente requests, responses, errores y seguridad.

---

## 80. Próximo documento

El siguiente artefacto es:

~~~text
api/bloque-1-fundacion/endpoints.md
~~~

Allí se definirá la lista exhaustiva de rutas del Bloque 1:

- método HTTP;
- path;
- autenticación;
- permiso requerido;
- request;
- response;
- status de éxito;
- errores esperables;
- idempotencia;
- reglas específicas del caso de uso.

Después:

~~~text
api/bloque-1-fundacion/schemas-dto.md
~~~

congelará los DTOs y schemas Pydantic v2 concretos.
