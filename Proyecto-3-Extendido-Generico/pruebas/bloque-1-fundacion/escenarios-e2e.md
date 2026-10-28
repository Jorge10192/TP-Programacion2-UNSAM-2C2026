# Escenarios E2E — Bloque 1 Fundación

> **Estado:** versión de referencia para implementación y validación del Bloque 1.  
> **Alcance:** M01 — Organización del Negocio + M02 — Catálogo.  
> **Stack objetivo:** FastAPI, Pytest, HTTPX/TestClient, SQLAlchemy 2.x, PostgreSQL 16+.  
> **Base documental:** `casos-prueba.md`, dominio M01/M02, arquitectura, persistencia y especificación HTTP.  
> **Objetivo:** verificar recorridos reales de punta a punta atravesando API → Application → Domain → Infrastructure → PostgreSQL.

---

## 1. Propósito

Los escenarios E2E verifican que decisiones correctas en aislamiento continúen siendo correctas cuando interactúan todas las capas.

Un escenario E2E debe comprobar:

~~~text
request HTTP real
        ↓
routing + dependencias
        ↓
autenticación/autorización
        ↓
Application Use Case
        ↓
Domain
        ↓
Repository / SQLAlchemy
        ↓
PostgreSQL
        ↓
commit
        ↓
response HTTP
        ↓
estado observable posterior
~~~

No reemplazan:

- unit tests de Domain;
- unit tests de Application;
- tests de persistencia;
- tests de concurrencia específicos.

Los complementan.

---

# PARTE I — ESTRATEGIA DE EJECUCIÓN

## 2. Qué significa E2E en este proyecto

En el Bloque 1, E2E significa una prueba de la aplicación backend completa a través de su API HTTP.

No es obligatorio utilizar un navegador.

La suite puede ejecutar:

~~~text
Pytest
+
HTTPX / FastAPI TestClient
+
aplicación FastAPI real
+
PostgreSQL real
~~~

El test no debe invocar directamente repositories ni entidades para ejecutar el flujo funcional.

Las verificaciones principales se realizan mediante la API pública.

Solo se permite consultar directamente la base en asserts técnicos muy específicos donde sea necesario demostrar una propiedad no observable por HTTP, por ejemplo:

~~~text
reutilización exacta de usuario_negocio.id
ausencia de duplicados físicos
rollback transaccional
~~~

Estas verificaciones deben mantenerse excepcionales.

---

## 3. Aplicación real, dependencias controladas

La instancia FastAPI usada en E2E debe ejecutar:

- routers reales;
- exception handlers reales;
- dependencies reales;
- casos de uso reales;
- repositories reales;
- mappings reales;
- SQLAlchemy real;
- PostgreSQL real.

Pueden sustituirse únicamente fronteras externas que no forman parte del objetivo:

- proveedor externo de email;
- WhatsApp;
- storage cloud;
- clock;
- generador externo de URLs.

No se reemplazan repositories por mocks en E2E.

---

## 4. Base de datos

Cada ejecución E2E utiliza PostgreSQL aislado.

Preparación:

~~~text
crear instancia/base de tests
        ↓
Alembic upgrade head
        ↓
ejecutar escenario
        ↓
limpiar estado / destruir DB
~~~

No utilizar SQLite.

No crear las tablas manualmente en fixtures.

Alembic debe ser la fuente de schema para estas pruebas.

---

## 5. Aislamiento entre escenarios

Cada escenario debe comenzar desde un estado conocido.

Opciones aceptables:

- base limpia por test;
- transacción exterior con rollback, si no interfiere con los commits reales que deben probarse;
- truncado controlado entre escenarios;
- base temporal independiente.

La estrategia elegida debe evitar contaminación entre tests.

Un escenario no depende de que otro se ejecute antes.

---

## 6. Autenticación

Los escenarios crean usuarios por API y obtienen JWT mediante:

~~~text
POST /api/v1/auth/login
~~~

Se recomienda un helper de tests:

~~~python
def auth_headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
    }
~~~

No fabricar contextos de membresía manualmente para los pasos funcionales.

Cuando un escenario necesita una segunda identidad, obtiene un segundo token real.

---

## 7. Tiempo

Escenarios con invitaciones utilizan un clock controlable.

Debe poder fijarse un único `ahora` para:

- emisión;
- consulta de vigencia;
- aceptación/rechazo;
- expiración.

No usar sleeps para esperar vencimientos.

---

## 8. Datos sensibles

Los escenarios nunca imprimen en logs de CI:

- passwords;
- access tokens completos;
- token_hash;
- tokens públicos completos de invitación.

Si el test falla, los mensajes de assert deben evitar incluir secretos.

---

# PARTE II — CONVENCIÓN DE ESCENARIOS

## 9. Formato

Cada escenario especifica:

~~~text
ID
Objetivo
Actores
Precondiciones
Pasos
Asserts
Invariantes protegidas
Relación con casos-prueba.md
~~~

Prioridad:

~~~text
E2E-P0
→ obligatorio para merge

E2E-P1
→ obligatorio antes de release/entrega final
~~~

---

# PARTE III — E2E-001 ONBOARDING COMPLETO

## 10. E2E-001 — Registrar Usuario y Crear Negocio

**Prioridad:** E2E-P0

### Objetivo

Validar el onboarding inicial completo:

~~~text
registrar Usuario
→ login
→ crear Negocio
→ crear modalidades
→ crear membresía inicial PROPIETARIO
→ consultar Negocio
→ consultar Mis Negocios
~~~

### Actores

~~~text
Usuario A
~~~

### Estado inicial

Base vacía respecto del Usuario A.

### Paso 1 — Registro

~~~http
POST /api/v1/auth/registro
~~~

Body conceptual:

~~~json
{
  "nombre": "Usuario A",
  "email": "usuario.a@example.com",
  "password": "<secret>"
}
~~~

### Assert

~~~text
201 Created
UsuarioResponse válido
sin password
sin password_hash
sin email_normalizado
sin Location inexistente
~~~

Guardar:

~~~text
usuario_a_id
~~~

---

### Paso 2 — Login

~~~http
POST /api/v1/auth/login
~~~

### Assert

~~~text
200 OK
token_type = bearer
access_token presente
expires_in > 0
Cache-Control: no-store
~~~

Guardar:

~~~text
token_a
~~~

---

### Paso 3 — Crear Negocio

~~~http
POST /api/v1/negocios
Authorization: Bearer token_a
~~~

Body:

~~~json
{
  "nombre": "WALOS",
  "rubro": "Alimentos para mascotas",
  "modalidades": [
    "REVENTA",
    "PRODUCCION"
  ]
}
~~~

### Assert

~~~text
201 Created
Location navegable
nombre = WALOS
moneda_base = ARS
modalidades = REVENTA + PRODUCCION
version = 1
~~~

Guardar:

~~~text
negocio_a_id
~~~

---

### Paso 4 — Navegar Location

~~~http
GET /api/v1/negocios/{negocio_a_id}
Authorization: Bearer token_a
~~~

### Assert

~~~text
200 OK
mismo negocio
misma configuración
~~~

---

### Paso 5 — Consultar Mis Negocios

~~~http
GET /api/v1/usuarios/me/negocios
Authorization: Bearer token_a
~~~

### Assert

Debe existir exactamente la membresía esperada:

~~~text
negocio.id = negocio_a_id
rol = PROPIETARIO
usuario_negocio_id presente
~~~

No debe existir una segunda membresía accidental.

---

### Paso 6 — Preparación

~~~http
GET /api/v1/negocios/{negocio_a_id}/preparacion
Authorization: Bearer token_a
~~~

### Assert

~~~text
200 OK
negocio_id correcto
items es una lista
no existe estado rígido COMPLETO/INCOMPLETO
~~~

### Invariantes protegidas

- creación atómica del Negocio;
- propietario inicial;
- moneda ARS;
- modalidades 1..N;
- JWT global sin tenant embebido como autoridad;
- membresía ACTIVA.

### Trazabilidad

~~~text
APP-ORG-001..005
DB-ORG-003
API-001
API-003
API-015
API-016
~~~

---

# PARTE IV — E2E-002 INVITACIÓN E INCORPORACIÓN

## 11. E2E-002 — Invitación, Registro/Login y Aceptación

**Prioridad:** E2E-P0

### Objetivo

Verificar el recorrido multiusuario completo:

~~~text
Propietario A
→ invita a B como ENCARGADO
→ obtiene enlace
→ B consulta vista pública
→ B se autentica
→ B acepta
→ membresía ACTIVA/ENCARGADO
→ B accede al Negocio
~~~

### Actores

~~~text
Usuario A = PROPIETARIO de WALOS
Usuario B = destinatario
~~~

### Precondición

Resultado funcional equivalente a E2E-001 para Usuario A.

Usuario B todavía no pertenece a WALOS.

---

### Paso 1 — Emitir invitación

~~~http
POST /api/v1/negocios/{negocio_a_id}/invitaciones
Authorization: Bearer token_a
~~~

~~~json
{
  "email_destino": "usuario.b@example.com",
  "rol_propuesto": "ENCARGADO"
}
~~~

### Assert

~~~text
201 Created
Location presente
estado = PENDIENTE
rol_propuesto = ENCARGADO
vigente = true
enlace_compartible presente
sin token_hash
~~~

Guardar:

~~~text
invitacion_id
token/link público
~~~

---

### Paso 2 — Navegar Location administrativa

~~~http
GET /api/v1/negocios/{negocio_a_id}/invitaciones/{invitacion_id}
Authorization: Bearer token_a
~~~

### Assert

~~~text
200 OK
misma invitación
email_destino correcto
estado PENDIENTE
sin token_hash
~~~

---

### Paso 3 — Vista pública sin JWT

~~~http
GET /api/v1/invitaciones/{token}
~~~

### Assert

~~~text
200 OK
negocio_nombre = WALOS
rol_propuesto = ENCARGADO
email_destino_ofuscado
disponible = true
~~~

No debe devolver:

~~~text
email completo
negocio_id
invitacion_id
version
token_hash
~~~

---

### Paso 4 — Usuario B se registra o inicia sesión

Registrar B si no existe:

~~~http
POST /api/v1/auth/registro
~~~

Luego:

~~~http
POST /api/v1/auth/login
~~~

Guardar:

~~~text
token_b
usuario_b_id
~~~

---

### Paso 5 — Aceptar invitación

~~~http
POST /api/v1/invitaciones/{token}/aceptar
Authorization: Bearer token_b
~~~

Sin body.

### Assert

~~~text
200 OK
invitacion.estado = ACEPTADA
membresia.rol = ENCARGADO
membresia apunta a WALOS
~~~

Guardar:

~~~text
usuario_negocio_b_id
~~~

---

### Paso 6 — Acceso tenant-scoped de B

~~~http
GET /api/v1/negocios/{negocio_a_id}
Authorization: Bearer token_b
~~~

### Assert

~~~text
200 OK
~~~

---

### Paso 7 — Mis Negocios de B

~~~http
GET /api/v1/usuarios/me/negocios
Authorization: Bearer token_b
~~~

### Assert

Existe WALOS una sola vez:

~~~text
usuario_negocio_id = usuario_negocio_b_id
rol = ENCARGADO
~~~

---

### Paso 8 — Reutilización del token

Repetir:

~~~http
POST /api/v1/invitaciones/{token}/aceptar
Authorization: Bearer token_b
~~~

### Assert

~~~text
409
INVITACION_YA_PROCESADA
~~~

No se crea otra membresía.

### Invariantes protegidas

- token no sustituye identidad;
- aceptación requiere Usuario correcto;
- una invitación se procesa una sola vez;
- incorporación + aceptación son atómicas;
- UsuarioNegocio queda ACTIVO;
- rol inicial nunca es PROPIETARIO.

### Trazabilidad

~~~text
APP-ORG-006..022
DB-ORG-008..017
API-020..029
CON-002
CON-004
~~~

---

# PARTE V — E2E-003 REINCORPORACIÓN HISTÓRICA

## 12. E2E-003 — Desactivar e Incorporar Nuevamente al Mismo Usuario

**Prioridad:** E2E-P0

### Objetivo

Demostrar que:

~~~text
reincorporar
!=
crear otra UsuarioNegocio
~~~

La membresía histórica debe reutilizarse.

### Actores

~~~text
Usuario A = PROPIETARIO
Usuario B = ENCARGADO ACTIVO
~~~

### Precondición

Estado final de E2E-002.

Guardar previamente:

~~~text
usuario_negocio_b_id_original
version_b
~~~

---

### Paso 1 — Desactivar B

~~~http
POST /api/v1/negocios/{negocio_a_id}/miembros/{usuario_negocio_b_id}/desactivar
Authorization: Bearer token_a
~~~

~~~json
{
  "version": <version_b>
}
~~~

### Assert

~~~text
200 OK
id = usuario_negocio_b_id_original
estado = INACTIVO
rol conservado según transición
version incrementada
~~~

---

### Paso 2 — B pierde acceso operativo

~~~http
GET /api/v1/negocios/{negocio_a_id}
Authorization: Bearer token_b
~~~

### Assert

Respuesta según política de membresía inactiva congelada, sin acceso operativo.

No debe obtener el recurso como miembro activo.

---

### Paso 3 — Nueva invitación

Usuario A emite una nueva invitación al mismo Email de B, esta vez:

~~~text
rol_propuesto = TRABAJADOR
~~~

### Assert

~~~text
201 Created
nueva invitacion_id
PENDIENTE
~~~

---

### Paso 4 — B acepta

~~~http
POST /api/v1/invitaciones/{nuevo_token}/aceptar
Authorization: Bearer token_b
~~~

### Assert

~~~text
200 OK
membresia.estado = ACTIVO
membresia.rol = TRABAJADOR
~~~

### Assert crítico de identidad histórica

El ID debe ser:

~~~text
membresia.usuario_negocio_id
=
usuario_negocio_b_id_original
~~~

No se creó una nueva membresía.

Si el response no permite demostrar suficiente identidad, se admite un assert técnico directo de DB:

~~~text
COUNT usuario_negocio
WHERE usuario_id = B
AND negocio_id = WALOS
= 1
~~~

---

### Paso 5 — B recupera acceso

~~~http
GET /api/v1/negocios/{negocio_a_id}
Authorization: Bearer token_b
~~~

### Assert

~~~text
200 OK
~~~

### Invariantes protegidas

- conservación histórica;
- UNIQUE Usuario+Negocio;
- reactivación mediante invitación;
- rol propuesto reemplaza rol vigente al reactivar;
- no existe endpoint administrativo directo de reactivación.

### Trazabilidad

~~~text
DOM-ORG-004
APP-ORG-014
APP-ORG-028
DB-ORG-005
CON-004
~~~

---

# PARTE VI — E2E-004 CICLO COMPLETO DE CATÁLOGO

## 13. E2E-004 — Categoria + Articulo + Edición + Estado + Hard Delete

**Prioridad:** E2E-P0

### Objetivo

Validar el ciclo completo M02 respetando:

- tenant;
- categorías;
- Decimal;
- capacidades;
- imágenes;
- optimistic version;
- filtros;
- edición;
- desactivación;
- reactivación;
- hard delete.

### Actor

Usuario con permisos de catálogo en WALOS.

Para evitar depender de una matriz de roles todavía diferida, el escenario puede utilizar al PROPIETARIO.

---

### Paso 1 — Crear categoría

~~~http
POST /api/v1/negocios/{negocio_a_id}/categorias
Authorization: Bearer token_a
~~~

~~~json
{
  "nombre": "Bocaditos"
}
~~~

### Assert

~~~text
201 Created
estado = ACTIVA
version = 1
Location navegable
~~~

Guardar `categoria_id`.

---

### Paso 2 — Crear artículo

~~~http
POST /api/v1/negocios/{negocio_a_id}/articulos
Authorization: Bearer token_a
~~~

Body conceptual:

~~~json
{
  "nombre": "Bocadito de pollo",
  "descripcion": "Snack horneado",
  "tipo": "BIEN",
  "unidad_medida": "UNIDAD",
  "categoria_id": "<categoria_id>",
  "sku": "WAL-POLLO-01",
  "precio_base": "2500.0000",
  "costo_referencia": "1200.5000",
  "capacidades": {
    "es_comprable": false,
    "es_vendible": true,
    "controla_stock": true,
    "puede_usarse_en_produccion": false,
    "controla_vencimiento": true,
    "permite_descuento": true
  },
  "imagenes": [
    {
      "referencia_storage": "catalogo/pollo-1",
      "posicion": 1,
      "es_principal": true
    }
  ]
}
~~~

### Assert

~~~text
201 Created
estado = ACTIVO
tipo = BIEN
precio_base = "2500.0000"
costo_referencia = "1200.5000"
1 imagen principal
version = 1
~~~

Guardar:

~~~text
articulo_id
version_articulo
~~~

---

### Paso 3 — Consultar detalle

~~~http
GET /api/v1/negocios/{negocio_a_id}/articulos/{articulo_id}
~~~

### Assert

La representación coincide con el estado creado y no incluye:

~~~text
nombre_normalizado
sku_normalizado
~~~

---

### Paso 4 — Editar precio, descripción e imágenes

~~~http
PATCH /api/v1/negocios/{negocio_a_id}/articulos/{articulo_id}
~~~

~~~json
{
  "version": 1,
  "descripcion": null,
  "precio_base": "2750.0000",
  "imagenes": [
    {
      "referencia_storage": "catalogo/pollo-nueva",
      "posicion": 1,
      "es_principal": true
    }
  ]
}
~~~

### Assert

~~~text
200 OK
descripcion = null
precio_base = "2750.0000"
imagen nueva
version > 1
estado = ACTIVO
~~~

Guardar nueva version.

---

### Paso 5 — Desactivar

~~~http
POST /api/v1/negocios/{negocio_a_id}/articulos/{articulo_id}/desactivar
~~~

Body:

~~~json
{
  "version": <version_actual>
}
~~~

### Assert

~~~text
200 OK
estado = INACTIVO
configuración conservada
version incrementada
~~~

---

### Paso 6 — Listado default

~~~http
GET /api/v1/negocios/{negocio_a_id}/articulos
~~~

### Assert

El artículo INACTIVO no aparece por defecto.

---

### Paso 7 — Listado explícito INACTIVO

~~~http
GET /api/v1/negocios/{negocio_a_id}/articulos?estado=INACTIVO
~~~

### Assert

El artículo aparece.

---

### Paso 8 — Listado ACTIVO + INACTIVO

~~~http
GET /api/v1/negocios/{negocio_a_id}/articulos?estado=ACTIVO&estado=INACTIVO
~~~

### Assert

Puede aparecer el artículo INACTIVO junto con los activos.

No existe valor ficticio `TODOS`.

---

### Paso 9 — Editar mientras está INACTIVO

Actualizar un campo permitido con version vigente.

### Assert

~~~text
200 OK
estado continúa INACTIVO
~~~

No existe reactivación implícita.

---

### Paso 10 — Reactivar

~~~http
POST /api/v1/negocios/{negocio_a_id}/articulos/{articulo_id}/reactivar
~~~

### Assert

~~~text
200 OK
estado = ACTIVO
version incrementada
~~~

---

### Paso 11 — Preparar hard delete

Para eliminar físicamente:

~~~text
ACTIVO
→ desactivar nuevamente
→ INACTIVO
~~~

Usar version vigente.

---

### Paso 12 — Hard delete

~~~http
DELETE /api/v1/negocios/{negocio_a_id}/articulos/{articulo_id}?version=<version>
~~~

### Assert

~~~text
204 No Content
sin body
~~~

Luego:

~~~http
GET /api/v1/negocios/{negocio_a_id}/articulos/{articulo_id}
~~~

debe producir:

~~~text
404
~~~

Las imágenes estructurales asociadas deben haber desaparecido por CASCADE.

---

### Paso 13 — Eliminar categoría ahora libre

~~~http
DELETE /api/v1/negocios/{negocio_a_id}/categorias/{categoria_id}?version=<version_categoria>
~~~

### Assert

~~~text
204 No Content
~~~

### Invariantes protegidas

- categoría tenant-safe;
- creación ACTIVA;
- precio Decimal;
- imágenes 0..3;
- una principal;
- edición atómica;
- PATCH null;
- optimistic version;
- estado explícito;
- hard delete separado de desactivar;
- CASCADE estructural de imágenes;
- RESTRICT de categoría mientras existía artículo.

### Trazabilidad

~~~text
APP-CAT-001..038
DB-CAT-001..028
DTO-005..025
API-030..052
~~~

---

# PARTE VII — E2E-005 AISLAMIENTO CROSS-TENANT

## 14. E2E-005 — Ataques Cross-Tenant con UUID Conocidos

**Prioridad:** E2E-P0

### Objetivo

Demostrar que conocer UUID reales de otro tenant no otorga acceso ni permite inferir su existencia.

### Actores

~~~text
Usuario A → Negocio A
Usuario X → Negocio X
~~~

Ambos poseen JWT válidos.

### Preparación

Crear mediante API:

~~~text
Negocio A
Categoria A
Articulo A
Miembro A

Negocio X
Categoria X
Articulo X
Miembro X
Invitacion X
~~~

Guardar intencionalmente los UUID del Negocio X para utilizarlos como si hubiesen sido descubiertos por un atacante.

---

### Ataque 1 — Leer artículo X desde A

Usuario A:

~~~http
GET /api/v1/negocios/{negocio_x_id}/articulos/{articulo_x_id}
Authorization: Bearer token_a
~~~

### Assert

~~~text
404 Not Found
~~~

No 403 con información reveladora.

---

### Ataque 2 — Modificar artículo X

~~~http
PATCH /api/v1/negocios/{negocio_x_id}/articulos/{articulo_x_id}
Authorization: Bearer token_a
~~~

### Assert

~~~text
404
~~~

Luego Usuario X consulta el artículo.

### Assert

No fue modificado.

---

### Ataque 3 — Asociar Categoria X a Articulo de A

Usuario A intenta:

~~~text
categoria_id = categoria_x_id
~~~

al crear o editar un artículo bajo:

~~~text
/negocios/{negocio_a_id}/...
~~~

### Assert

~~~text
404 CATEGORIA_NO_ENCONTRADA
~~~

No debe existir asociación cross-tenant.

---

### Ataque 4 — Leer invitación administrativa X

~~~http
GET /api/v1/negocios/{negocio_x_id}/invitaciones/{invitacion_x_id}
Authorization: Bearer token_a
~~~

### Assert

~~~text
404
~~~

---

### Ataque 5 — Manipular miembro X

Usuario A intenta una operación administrativa sobre:

~~~text
/negocios/{negocio_x_id}/miembros/{miembro_x_id}
~~~

### Assert

~~~text
404
~~~

El miembro X permanece sin cambios.

---

### Ataque 6 — Inyectar tenant por body

Usuario A crea recurso bajo Negocio A agregando:

~~~json
{
  "negocio_id": "<negocio_x_id>"
}
~~~

### Assert

~~~text
422 REQUEST_VALIDATION_ERROR
~~~

La propiedad extra se rechaza.

---

### Ataque 7 — Comparar 404

Comparar:

~~~text
UUID real cross-tenant
vs
UUID inexistente
~~~

### Assert

El contrato público no ofrece diferencias útiles para enumerar recursos.

### Invariantes protegidas

- prevención IDOR;
- tenant autoritativo desde path;
- membership persistida;
- composite tenant-safe references;
- extra forbid;
- 404 anti-enumeración.

### Trazabilidad

~~~text
TEN-001..010
API-009..014
API-037
~~~

---

# PARTE VIII — E2E-006 ÚLTIMO PROPIETARIO

## 15. E2E-006 — Protección y Transferencia de Propiedad

**Prioridad:** E2E-P0

### Objetivo

Validar que un Negocio nunca quede sin al menos un PROPIETARIO ACTIVO.

### Actor inicial

~~~text
Usuario A = único PROPIETARIO ACTIVO
~~~

---

### Paso 1 — Intentar degradar al único propietario

~~~http
PATCH /api/v1/negocios/{negocio_id}/miembros/{miembro_a_id}/rol
Authorization: Bearer token_a
~~~

~~~json
{
  "nuevo_rol": "ENCARGADO",
  "version": <version_a>
}
~~~

### Assert

~~~text
409 Conflict
code = ULTIMO_PROPIETARIO
~~~

Consultar nuevamente.

### Assert

~~~text
A sigue PROPIETARIO
version/estado coherentes
~~~

---

### Paso 2 — Intentar desactivar al único propietario

~~~http
POST /api/v1/negocios/{negocio_id}/miembros/{miembro_a_id}/desactivar
~~~

### Assert

~~~text
409 ULTIMO_PROPIETARIO
~~~

A continúa ACTIVO/PROPIETARIO.

---

### Paso 3 — Incorporar B

Invitar y aceptar a B como ENCARGADO reutilizando el flujo E2E-002.

---

### Paso 4 — Promover B explícitamente

Usuario A:

~~~http
POST /api/v1/negocios/{negocio_id}/miembros/{miembro_b_id}/promover-propietario
~~~

~~~json
{
  "version": <version_b>
}
~~~

### Assert

~~~text
200 OK
B = PROPIETARIO ACTIVO
~~~

Ahora existen dos propietarios activos.

---

### Paso 5 — B degrada a A

Con token B:

~~~http
PATCH /api/v1/negocios/{negocio_id}/miembros/{miembro_a_id}/rol
~~~

~~~json
{
  "nuevo_rol": "ENCARGADO",
  "version": <version_a_actual>
}
~~~

### Assert

~~~text
200 OK
A = ENCARGADO ACTIVO
B = PROPIETARIO ACTIVO
~~~

La operación ahora sí es válida porque queda un propietario.

### Invariantes protegidas

- último propietario;
- promoción explícita;
- autorización por rol;
- versionado;
- no existe promoción accidental vía PATCH genérico.

### Trazabilidad

~~~text
DOM-ORG-020..024
APP-ORG-023..027
DB-ORG-014
CON-005
API-017..019
~~~

---

# PARTE IX — E2E-007 OPTIMISTIC LOCKING

## 16. E2E-007 — Dos Clientes Editan la Misma Versión

**Prioridad:** E2E-P0

### Objetivo

Demostrar desde HTTP que no existe lost update.

### Preparación

Crear Articulo:

~~~text
version = N
~~~

Simular dos clientes que leen el mismo estado:

~~~text
Cliente 1 conoce version N
Cliente 2 conoce version N
~~~

Pueden utilizar el mismo Usuario/token; el conflicto relevante es el estado leído.

---

### Paso 1 — Cliente 1 modifica

~~~http
PATCH /api/v1/negocios/{negocio_id}/articulos/{articulo_id}
~~~

~~~json
{
  "version": N,
  "precio_base": "3000.0000"
}
~~~

### Assert

~~~text
200 OK
version = N+1
precio_base = "3000.0000"
~~~

---

### Paso 2 — Cliente 2 modifica usando N obsoleta

~~~json
{
  "version": N,
  "descripcion": "Cambio tardío"
}
~~~

### Assert

~~~text
409 Conflict
code = CONFLICTO_CONCURRENCIA
~~~

---

### Paso 3 — Consultar estado final

~~~http
GET .../articulos/{articulo_id}
~~~

### Assert

~~~text
precio_base = "3000.0000"
version = N+1
descripcion NO fue aplicada por el segundo request
~~~

### Regla

La API no realiza merge automático.

### Trazabilidad

~~~text
DB-CAT-024..026
CON-001
API-044
~~~

---

# PARTE X — E2E-008 PATCH OMITIDO VS NULL

## 17. E2E-008 — Semántica Parcial Correcta

**Prioridad:** E2E-P0

### Objetivo

Verificar que el JSON HTTP conserva intención de cambio y no confunde defaults con mutaciones.

### Preparación

Artículo:

~~~text
descripcion = "Original"
sku = "SKU-1"
categoria_id = C1
precio_base = "1500.0000"
version = N
~~~

---

### Paso 1 — Omitir campos

~~~json
{
  "version": N,
  "precio_base": "1600.0000"
}
~~~

### Assert

~~~text
precio_base cambia
descripcion sigue "Original"
sku sigue "SKU-1"
categoria_id sigue C1
~~~

---

### Paso 2 — Null explícito

Con nueva version:

~~~json
{
  "version": N2,
  "descripcion": null,
  "sku": null,
  "categoria_id": null
}
~~~

### Assert

~~~text
descripcion = null
sku = null
categoria_id = null
~~~

---

### Paso 3 — Null inválido

~~~json
{
  "version": N3,
  "nombre": null
}
~~~

### Assert

~~~text
422 REQUEST_VALIDATION_ERROR
~~~

Estado persistido sin cambios.

---

### Paso 4 — PATCH sin cambios

~~~json
{
  "version": N3
}
~~~

### Assert

~~~text
422 REQUEST_VALIDATION_ERROR
~~~

No incrementa version.

### Trazabilidad

~~~text
DTO-011..017
APP-CAT-019/020/025
API-041/043
~~~

---

# PARTE XI — E2E-009 INVITACIÓN NO UTILIZABLE

## 18. E2E-009 — Identidad Incorrecta, Expiración y Estado Terminal

**Prioridad:** E2E-P1

### Objetivo

Verificar que poseer un enlace no equivale a autorización.

### Preparación

A invita:

~~~text
usuario.b@example.com
~~~

Obtener token público.

Registrar además:

~~~text
usuario.c@example.com
~~~

---

### Paso 1 — C consulta vista pública

Sin JWT:

~~~http
GET /api/v1/invitaciones/{token}
~~~

Puede obtener la vista mínima pública.

---

### Paso 2 — C intenta aceptar

~~~http
POST /api/v1/invitaciones/{token}/aceptar
Authorization: Bearer token_c
~~~

### Assert

~~~text
403 INVITACION_NO_CORRESPONDE_AL_USUARIO
~~~

La invitación continúa PENDIENTE.

---

### Paso 3 — Avanzar clock al límite

Fijar:

~~~text
ahora = fecha_expiracion
~~~

### Paso 4 — B intenta aceptar

~~~http
POST /api/v1/invitaciones/{token}/aceptar
Authorization: Bearer token_b
~~~

### Assert

~~~text
409 INVITACION_NO_VIGENTE
~~~

No se crea membresía.

---

### Paso 5 — Nueva emisión

A solicita nueva invitación al mismo Email.

### Assert

La operación puede:

~~~text
materializar anterior como EXPIRADA
+
crear nueva PENDIENTE
~~~

sin violar unicidad.

### Invariantes protegidas

- token no es autorización;
- comparación por Email funcional;
- límite temporal exacto;
- PENDIENTE vencida no bloquea indefinidamente nuevas emisiones.

---

# PARTE XII — E2E-010 ERRORES Y NO FILTRACIÓN DE SECRETOS

## 19. E2E-010 — Contrato de Error Uniforme

**Prioridad:** E2E-P1

### Objetivo

Verificar que distintos errores atraviesan la pila y salen con el mismo contrato.

Provocar al menos:

~~~text
400
401
403
404
409
422
~~~

### Para cada respuesta

Validar exactamente la presencia de:

~~~text
code
message
details
timestamp
~~~

### Además

No debe aparecer:

~~~text
password
password_hash
token_hash
SQL
traceback
ruta de archivo Python
nombre de tabla interno innecesario
~~~

### Caso especial 422

Enviar un payload con:

~~~text
campo extra
tipo inválido
~~~

### Assert

No debe devolver el shape nativo sin adaptar de FastAPI.

Debe retornar:

~~~text
code = REQUEST_VALIDATION_ERROR
~~~

---

# PARTE XIII — ESCENARIO DE CATÁLOGO CON CATEGORÍA INACTIVA

## 20. E2E-011 — Asociación Histórica vs Nueva Asociación

**Prioridad:** E2E-P1

### Objetivo

Distinguir dos reglas deliberadamente diferentes:

~~~text
Categoria histórica que luego queda INACTIVA
→ puede seguir asociada

nueva asignación/reasignación a Categoria INACTIVA
→ rechazada
~~~

### Preparación

Crear:

~~~text
Categoria C1 ACTIVA
Articulo A asociado a C1
Categoria C2 ACTIVA
~~~

---

### Paso 1 — Desactivar C1

~~~http
POST .../categorias/{c1}/desactivar
~~~

### Assert

~~~text
C1 = INACTIVA
Articulo A sigue categoria_id = C1
~~~

---

### Paso 2 — Editar otro campo de A

Cambiar descripción sin tocar categoria_id.

### Assert

~~~text
200 OK
A conserva C1
~~~

---

### Paso 3 — Desactivar y reactivar A

### Assert

La C1 histórica INACTIVA no bloquea por sí sola la reactivación.

---

### Paso 4 — Intentar reasignar A a C2 después de desactivar C2

### Assert

~~~text
rechazo de nueva asociación
~~~

No queda persistido el cambio.

### Invariantes protegidas

- historia válida;
- categoría inactiva no destruye asociaciones;
- nueva asociación requiere categoría activa;
- reactivación de artículo no equivale a reasignación.

---

# PARTE XIV — ASERTOS TRANSVERSALES

## 21. Headers

Cuando corresponda verificar:

### 201

~~~text
Location
~~~

solo si existe URI navegable.

### Login

~~~text
Cache-Control: no-store
~~~

### 401

~~~text
WWW-Authenticate: Bearer
~~~

cuando aplique.

---

## 22. Version

Después de toda mutación versionada exitosa:

~~~text
version_nueva > version_anterior
~~~

La implementación preferida es incremento exacto de uno.

Las pruebas de persistencia verifican esa precisión.

E2E puede comprobar como mínimo que el cliente recibe la nueva versión y puede utilizarla en la operación siguiente.

---

## 23. Tenant

Todo escenario que cree recursos tenant-scoped debe verificar al menos una vez que:

~~~text
otro tenant no puede leerlo
~~~

aunque E2E-005 concentre la suite sistemática de seguridad.

---

## 24. Secretos

Ningún JSON de respuesta puede contener claves como:

~~~text
password
password_hash
email_normalizado
nombre_normalizado
sku_normalizado
token_hash
~~~

Esto puede reforzarse mediante un helper recursivo de assertions.

---

# PARTE XV — HELPERS E2E

## 25. Helpers permitidos

Los helpers pueden reducir repetición de transporte.

Ejemplos:

~~~text
register_user(...)
login(...)
create_business(...)
invite_member(...)
accept_invitation(...)
create_category(...)
create_article(...)
auth_headers(...)
assert_error_shape(...)
~~~

Deben invocar la API HTTP.

No deben saltarse Application/Domain insertando directamente en repositories para ejecutar el escenario.

---

## 26. Qué puede prepararse directamente

Se permite preparación técnica directa solo cuando:

- el objetivo no es probar esa preparación;
- hacerlo por API haría el escenario excesivamente lento o irrelevante;
- no se elude la regla bajo prueba.

Aun así, para los escenarios P0 definidos en este documento se prefiere preparar mediante API siempre que sea razonable.

---

# PARTE XVI — EJECUCIÓN EN CI

## 27. Marcador

Los escenarios pueden usar:

~~~python
@pytest.mark.e2e
~~~

y, cuando corresponda:

~~~python
@pytest.mark.integration
~~~

---

## 28. Orden recomendado de pipeline

~~~text
ruff
↓
unit
↓
integration persistence
↓
API
↓
E2E
~~~

Un fallo en niveles anteriores puede evitar ejecutar una suite E2E costosa.

---

## 29. Sin dependencia de orden

Aunque los escenarios se describen secuencialmente para legibilidad:

~~~text
E2E-001
E2E-002
E2E-003
...
~~~

los tests reales no deben depender unos de otros.

Cada test prepara su propio estado equivalente.

No usar:

~~~text
E2E-002 depende físicamente de que E2E-001 haya corrido
~~~

La descripción “precondición equivalente a E2E-001” significa reutilizar factory/helper de setup, no dependencia de ejecución.

---

# PARTE XVII — MATRIZ DE ESCENARIOS

## 30. Resumen

| ID | Prioridad | Journey | Riesgo principal |
| --- | --- | --- | --- |
| E2E-001 | P0 | Registro → Login → Negocio | onboarding/atomicidad |
| E2E-002 | P0 | Invitación → Aceptación | identidad/atomicidad |
| E2E-003 | P0 | Desactivar → Reinvitar → Reactivar | historia de membresía |
| E2E-004 | P0 | Ciclo completo Catálogo | integración M02 |
| E2E-005 | P0 | Cross-tenant | IDOR/multitenancy |
| E2E-006 | P0 | Último propietario | integridad organizacional |
| E2E-007 | P0 | Version obsoleta | lost update |
| E2E-008 | P0 | PATCH omitido/null | corrupción por defaults |
| E2E-009 | P1 | Invitación no utilizable | seguridad/tiempo |
| E2E-010 | P1 | Error contract | frontera HTTP |
| E2E-011 | P1 | Categoría histórica inactiva | semántica M02 |

---

# PARTE XVIII — GATE E2E

## 31. Suite obligatoria para merge

Como mínimo deben pasar:

~~~text
E2E-001
E2E-002
E2E-003
E2E-004
E2E-005
E2E-006
E2E-007
E2E-008
~~~

Sin skips injustificados.

Los escenarios P1 deben estar verdes antes de la entrega/release del Bloque 1.

---

# PARTE XIX — CRITERIO DE ACEPTACIÓN

## 32. El Bloque 1 pasa E2E si

1. un Usuario puede registrarse y autenticarse;
2. puede crear un Negocio con propietario inicial;
3. la membresía inicial se observa como ACTIVA/PROPIETARIO;
4. un Propietario puede emitir una invitación válida;
5. la Location administrativa de invitación es navegable;
6. la vista pública no expone información sensible;
7. el destinatario correcto puede aceptar sin body;
8. otro Usuario con el token no puede aceptar;
9. aceptar crea/reactiva exactamente una membresía;
10. la reincorporación conserva usuario_negocio.id;
11. una membresía INACTIVA no conserva acceso operativo;
12. el catálogo puede crearse y modificarse por API;
13. dinero permanece decimal/string sin float;
14. imágenes respetan 0..3 y principal;
15. editar INACTIVO no reactiva;
16. reactivar es una operación explícita;
17. hard delete solo ocurre en condiciones válidas;
18. otro tenant no puede leer ni mutar recursos conocidos;
19. los 404 cross-tenant no permiten enumeración útil;
20. el último propietario no puede eliminarse funcionalmente;
21. una segunda propiedad permite degradar a otro propietario;
22. una version obsoleta produce 409 sin lost update;
23. PATCH distingue omitido de null;
24. todos los errores controlados respetan ErrorResponse;
25. ningún response expone hashes o secretos;
26. los escenarios son independientes entre sí;
27. la base real se crea mediante migraciones Alembic;
28. CI puede ejecutar la suite automáticamente.

---

# PARTE XX — CIERRE DE ESPECIFICACIÓN

## 33. Estado documental del Bloque 1

Con este documento queda completada la especificación previa a implementación de:

~~~text
Dominio
+
Arquitectura
+
Persistencia
+
ERD
+
Contrato API
+
Endpoints
+
Schemas/DTOs
+
Casos de prueba
+
Escenarios E2E
~~~

El siguiente paso deja de ser diseño documental principal.

Pasa a ser:

~~~text
inicialización del backend
→ pyproject.toml / uv
→ estructura src/app
→ configuración
→ Domain
→ Application
→ SQLAlchemy/Alembic
→ API
→ tests
→ CI
~~~

La implementación deberá mantenerse trazable contra los documentos congelados del Bloque 1.
