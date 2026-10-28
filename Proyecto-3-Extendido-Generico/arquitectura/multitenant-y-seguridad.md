# Multi-tenancy y Seguridad

> **Estado:** versión de referencia para implementación del Bloque 1.  
> **Alcance inicial:** autenticación, autorización y aislamiento por Negocio.  
> **Objetivo:** establecer reglas concretas para impedir accesos cross-tenant, proteger credenciales y mantener separadas identidad, membresía, rol y permisos.

---

## 1. Propósito

Este documento define la estrategia de seguridad y multi-tenancy de Proyecto-3-Extendido-Generico.

Complementa:

~~~text
arquitectura-general.md
estructura-backend.md
patrones-de-diseno.md
~~~

y establece:

- qué representa la identidad global;
- cómo se selecciona un tenant;
- cómo se valida pertenencia a un Negocio;
- cómo se aplican roles;
- qué información contiene el token;
- cómo se almacenan contraseñas;
- cómo se evita IDOR;
- cómo se protege la persistencia;
- cómo se manejan errores sin filtrar información;
- qué decisiones quedan diferidas.

---

## 2. Modelo de seguridad

El sistema distingue tres conceptos:

~~~text
Usuario
    ↓
identidad global

Negocio
    ↓
tenant

UsuarioNegocio
    ↓
relación Usuario <-> Negocio
    + rol
    + estado
~~~

Por lo tanto:

~~~text
Usuario != UsuarioNegocio != Negocio
~~~

Un mismo Usuario puede pertenecer a varios Negocios y tener un rol diferente en cada uno.

La autorización siempre debe evaluarse dentro del contexto de un Negocio concreto.

---

## 3. Tenant

El tenant es:

~~~text
Negocio
~~~

Los datos funcionales que pertenecen a una organización deberán quedar asociados directa o indirectamente a un Negocio.

Ejemplos del Bloque 1:

~~~text
UsuarioNegocio
InvitacionNegocio
Categoria
ArticuloCatalogo
~~~

Los módulos posteriores deberán respetar el mismo límite.

---

## 4. Identidad global y tenant activo

El JWT representará principalmente la identidad global del Usuario.

Conceptualmente:

~~~text
JWT
└── sub = usuario_id
~~~

El JWT no fijará un negocio activo ni será la fuente de verdad para rol o membresía.

Esto permite que un Usuario perteneciente a varios negocios cambie de contexto sin necesitar un nuevo token.

---

## 5. Selección del Negocio

Para recursos multi-tenant, negocio_id viajará en el path REST.

Ejemplos:

~~~text
/api/v1/negocios/{negocio_id}/miembros
/api/v1/negocios/{negocio_id}/invitaciones
/api/v1/negocios/{negocio_id}/categorias
/api/v1/negocios/{negocio_id}/articulos
~~~

No se utilizará inicialmente un header global tipo:

~~~text
X-Negocio-Id
~~~

como mecanismo principal de selección.

### Motivo

El tenant queda:

- explícito en el contrato HTTP;
- visible en la URL del recurso;
- fácil de auditar;
- fácil de testear;
- libre de estado implícito.

Un header de tenant podrá evaluarse en el futuro si aparece un caso concreto que lo justifique, pero no coexistirá como segunda fuente autoritativa sin necesidad real.

### 5.1 Fuente autoritativa del tenant

Para endpoints tenant-scoped, el valor autoritativo de `negocio_id` será el obtenido desde el path y posteriormente validado contra la membresía autenticada.

Los schemas de request de recursos pertenecientes a un Negocio **no deberán aceptar `negocio_id` como un campo libre del payload** cuando el tenant ya está determinado por la URL.

Ejemplo:

~~~text
POST /api/v1/negocios/{negocio_id}/articulos
~~~

El artículo se crea para el `negocio_id` validado del path.

No se permitirá:

~~~json
{
  "negocio_id": "otro-negocio",
  "nombre": "..."
}
~~~

como mecanismo para elegir o sobrescribir el tenant.

Si por compatibilidad futura algún contrato recibiera el dato duplicado en más de una fuente, el backend no deberá confiar en el body: deberá rechazarse la inconsistencia o ignorarse el valor redundante según el contrato definido. Nunca se utilizará silenciosamente un tenant diferente del path autenticado.

---

## 6. Flujo general

~~~text
credenciales
    ↓
normalizar Email
    ↓
buscar Usuario
    ↓
verificar password hash
    ↓
emitir JWT
    ↓
request autenticada
    ↓
obtener usuario_id desde JWT
    ↓
obtener negocio_id desde path
    ↓
buscar UsuarioNegocio(usuario_id, negocio_id)
    ↓
verificar membresía ACTIVA
    ↓
verificar rol / permiso
    ↓
ejecutar caso de uso
~~~

Autenticación y autorización son responsabilidades distintas.

---

## 7. Autenticación

Autenticación responde:

> ¿Quién realiza la request?

La fuente confiable de identidad será el token validado por el backend.

No se aceptará como prueba de identidad un valor controlado por el cliente como:

~~~text
usuario_id
email
rol
~~~

en body, query parameter o header custom.

---

## 8. Autorización

Autorización responde:

> ¿Puede este Usuario realizar esta operación dentro de este Negocio?

La decisión puede depender de:

- existencia de membresía;
- EstadoMembresia.ACTIVO;
- rol actual;
- operación solicitada;
- reglas adicionales del dominio.

Un JWT válido no implica autorización sobre cualquier Negocio.

Una membresía activa tampoco implica permiso para cualquier operación.

---

## 9. Estado de membresía

Solo:

~~~text
EstadoMembresia.ACTIVO
~~~

otorga autorización operativa.

Una membresía INACTIVO es histórica y no autoriza operaciones.

El rol persistido en una membresía inactiva tiene valor histórico, no autoridad vigente.

---

## 10. Roles

Roles iniciales:

~~~text
PROPIETARIO
ENCARGADO
TRABAJADOR
~~~

Los roles pertenecen a UsuarioNegocio.

No existe rol global dentro de Usuario.

La matriz de permisos crecerá con los casos de uso, pero siempre se evaluará contra la membresía vigente del Negocio correcto.

---

## 11. Rol y membresía no son autoridad del JWT

El JWT no será la única fuente de verdad para:

~~~text
rol
estado de membresía
pertenencia a Negocio
~~~

Una operación sensible deberá revalidar la membresía persistida.

### Motivo

Después de emitir un token, el usuario puede haber sido:

- desactivado;
- cambiado de rol;
- reincorporado;
- afectado por una decisión administrativa.

Un token todavía no vencido no debe conservar privilegios retirados posteriormente.

---

## 12. JWT de acceso

Se utilizarán tokens JWT firmados.

Claims mínimos previstos:

~~~text
sub -> usuario_id
iat -> issued at
exp -> expiration
~~~

Podrán agregarse claims como iss, aud o jti si el diseño de deployment y revocación lo requiere.

No se incluirán secretos ni información sensible innecesaria.

### Regla

Un JWT firmado proporciona integridad/autenticidad, pero no confidencialidad.

Su payload debe tratarse como legible por quien posea el token.

---

## 13. Firma y secreto JWT

Para el monolito inicial se utilizará una firma HMAC segura, inicialmente:

~~~text
HS256
~~~

con una clave criptográficamente aleatoria de al menos 256 bits.

Configuración:

~~~text
JWT_SECRET
JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES
~~~

La clave:

- no será una contraseña humana;
- no se reutilizará para otros propósitos;
- no se versionará;
- se obtendrá mediante configuración externa.

Si en el futuro aparecen verificadores independientes o nuevas necesidades de distribución de claves, se reevaluará firma asimétrica.

---

## 14. Expiración

El access token tendrá duración limitada.

Valor inicial propuesto:

~~~text
30 minutos
~~~

configurable por entorno.

Un token expirado no se acepta.

Refresh tokens se dejan diferidos hasta que la UX justifique su complejidad.

---

## 15. Validación de JWT

El backend deberá validar como mínimo:

- firma;
- algoritmo permitido;
- expiración;
- formato y presencia de sub.

No se confiará en el algoritmo declarado por un token sin validarlo contra una allowlist/configuración propia.

---

## 16. Contraseñas

Las contraseñas nunca se almacenarán:

- en texto plano;
- cifradas reversiblemente como mecanismo principal;
- con hashes rápidos como SHA-256;
- en logs.

Solo se almacenará un hash específicamente diseñado para contraseñas.

---

## 17. Password hashing

Se utilizará:

~~~text
Argon2id
~~~

mediante una biblioteca mantenida.

Para FastAPI/Python moderno, una opción adecuada es:

~~~text
pwdlib[argon2]
~~~

Los parámetros deberán poder evolucionar y se validarán contra recursos reales del entorno.

No se implementará criptografía propia.

---

## 18. PasswordHasher como port

Application no dependerá de pwdlib.

Conceptualmente:

~~~text
Application
      ↓
PasswordHasher
      ↑
PwdlibPasswordHasher
~~~

El contrato se expresará mediante typing.Protocol.

Ejemplo conceptual:

~~~python
class PasswordHasher(Protocol):
    def hash(self, plain_password: str) -> str:
        ...

    def verify(self, plain_password: str, password_hash: str) -> bool:
        ...
~~~

La implementación concreta pertenece a Infrastructure.

### 18.1 Ejecución del hashing y modelo de concurrencia

Argon2id es deliberadamente costoso en CPU y memoria. Por eso no deberá ejecutarse de forma que bloquee un event loop asíncrono.

La implementación seguirá la convención de concurrencia que finalmente adopte el backend:

- si el flujo HTTP es síncrono y FastAPI lo ejecuta en su worker threadpool, el hashing/verificación podrá permanecer como llamada síncrona;
- si el flujo se implementa con `async def`, una operación síncrona costosa deberá ejecutarse fuera del event loop, por ejemplo mediante un worker thread compatible con AnyIO;
- no se mezclará código async con operaciones bloqueantes sin una decisión explícita.

Esta regla se concretará junto con la elección definitiva de SQLAlchemy síncrono o asíncrono.

---

## 19. Normalización del Email

Email es un Value Object de Domain.

La autenticación deberá utilizar exactamente la misma semántica de normalización/equivalencia que el dominio.

Como mínimo, para el alcance actual:

~~~text
trim
+
canonicalización definida por Email
~~~

La API, Application y Repository no deberán inventar reglas incompatibles.

El objetivo es evitar diferencias como:

~~~text
usuario@example.com
Usuario@Example.com
" usuario@example.com "
~~~

produciendo cuentas o búsquedas funcionalmente inconsistentes.

---

## 20. Anti-enumeración de cuentas

El login no debe revelar fácilmente si un email existe.

Ante:

~~~text
email inexistente
~~~

y:

~~~text
password incorrecta
~~~

la respuesta pública será equivalente.

Ejemplo:

~~~text
Credenciales inválidas
~~~

No se devolverán mensajes diferentes como:

~~~text
El email no existe
~~~

y:

~~~text
La contraseña es incorrecta
~~~

---

## 21. Timing de autenticación

También se evitarán diferencias temporales obvias entre cuenta existente e inexistente.

Cuando el usuario no exista, la implementación podrá realizar una verificación contra un hash ficticio válido.

Objetivo:

~~~text
reducir enumeración por timing
~~~

---

## 22. Rate limiting del login

El endpoint público de login deberá protegerse contra:

- fuerza bruta;
- credential stuffing;
- abuso del costo de Argon2id.

La estrategia deberá contemplar límites independientes por:

~~~text
cuenta/email normalizado
+
origen/IP
~~~

No se utilizará únicamente una clave combinada IP+email si eso permite multiplicar intentos cambiando uno de ambos valores.

Ante exceso de intentos, la API podrá responder:

~~~text
429 Too Many Requests
~~~

La implementación concreta puede incorporarse después del esqueleto inicial, pero deberá existir antes de considerar completo el endpoint público de autenticación.

---

## 23. Lockout

Un bloqueo permanente automático tras pocos intentos puede transformarse en un vector de denegación de servicio.

Si posteriormente se incorpora lockout se evaluarán:

- threshold;
- ventana temporal;
- duración;
- recuperación;
- backoff progresivo.

Para el MVP se priorizará rate limiting antes que un bloqueo permanente agresivo.

---

## 24. IDOR / autorización por objeto

Conocer un identificador válido no otorga autorización.

Ejemplo:

~~~text
GET /api/v1/negocios/A/articulos/123
~~~

Un usuario no puede cambiarlo por:

~~~text
GET /api/v1/negocios/B/articulos/456
~~~

y acceder a B aunque:

- 456 exista;
- conozca el UUID;
- tenga JWT válido;
- pertenezca a A.

Cada acceso a objeto deberá realizar autorización dentro del scope correspondiente.

---

## 25. Política anti-enumeración cross-tenant

Los recursos cuya existencia no debe revelarse se buscarán dentro del tenant autorizado.

Ejemplo conceptual:

~~~text
buscar Articulo 456 dentro de Negocio A
~~~

Si:

- no existe; o
- existe pero pertenece a Negocio B;

la respuesta pública será la misma:

~~~text
404 Not Found
~~~

### Importante

Internamente sigue existiendo una decisión de autorización.

El 404 es una política de exposición de información, no un reemplazo de los controles de acceso.

---

## 26. Defensa en profundidad en Repository

Para recursos tenant-scoped, las consultas deberán incorporar el tenant.

Evitar:

~~~sql
WHERE id = :id
~~~

como búsqueda normal de un recurso perteneciente a Negocio.

Preferir:

~~~sql
WHERE id = :id
  AND negocio_id = :negocio_id
~~~

Ejemplo de port:

~~~text
buscar_por_id_en_negocio(
    articulo_id,
    negocio_id
)
~~~

Esto reduce el riesgo de exposición ante una validación omitida en una capa superior.

---

## 27. Escrituras tenant-scoped

La misma regla aplica a:

- UPDATE;
- DELETE;
- cambios de estado;
- asociaciones;
- operaciones administrativas.

Evitar conceptualmente:

~~~sql
UPDATE articulo
SET ...
WHERE id = :id
~~~

para recursos multi-tenant.

El tenant deberá formar parte de la selección o el objeto deberá provenir de una recuperación tenant-scoped previa.

### 27.1 Creación de recursos e inmutabilidad del tenant

La protección multi-tenant también aplica a operaciones de creación.

En un endpoint como:

~~~text
POST /api/v1/negocios/{negocio_id}/articulos
~~~

Application deberá:

1. tomar el `negocio_id` del contexto validado del path;
2. verificar la membresía ACTIVA del Usuario autenticado;
3. construir la nueva entidad asociada a ese Negocio;
4. ignorar o rechazar cualquier intento del cliente de inyectar otro tenant.

El `negocio_id` de una entidad tenant-scoped no será un atributo libremente editable después de la creación.

Mover un recurso de un Negocio a otro, si alguna vez existiera como requerimiento, deberá modelarse como una operación administrativa explícita y no como una edición ordinaria.

---

## 28. Relaciones cross-tenant

La base de datos y Application deberán colaborar para impedir relaciones imposibles como:

~~~text
ArticuloCatalogo del Negocio A
→ Categoria del Negocio B
~~~

Cuando sea razonable, el modelo relacional utilizará constraints que refuercen esta regla.

La estrategia concreta se definirá en:

~~~text
base-de-datos/bloque-1-fundacion/modelo-relacional.md
~~~

---

## 29. UUID no es autorización

UUID es un candidato fuerte para identificadores públicos porque dificulta enumeración secuencial.

Sin embargo:

~~~text
UUID impredecible != autorización
~~~

Los controles de tenant y objeto siguen siendo obligatorios.

---

## 30. FastAPI Dependencies de seguridad

La API podrá usar dependencias específicas:

~~~text
get_current_user
get_active_membership
require_roles
~~~

Flujo:

~~~text
Bearer token
    ↓
get_current_user
    ↓
negocio_id del path
    ↓
get_active_membership
    ↓
caso de uso
~~~

Estas dependencias no reemplazan invariantes de Domain.

---

## 31. Membresía activa en la frontera

Una dependencia podrá resolver:

~~~text
Usuario autenticado
+
negocio_id
~~~

a:

~~~text
UsuarioNegocio ACTIVO
~~~

Si no existe membresía activa, la request no continuará hacia el caso de uso tenant-scoped.

Se evitará buscar primero un recurso global y comprobar el tenant después cuando pueda hacerse directamente una consulta scoped.

---

## 32. Autorización por rol

La autorización de frontera podrá exigir:

~~~text
PROPIETARIO
~~~

o:

~~~text
PROPIETARIO | ENCARGADO
~~~

según la operación.

Pero un rol permitido no puede violar invariantes de dominio.

Ejemplo:

~~~text
PROPIETARIO
+
intenta desactivar al último PROPIETARIO activo
~~~

debe rechazarse aunque el actor tenga permiso para administrar miembros.

---

## 33. Separación autorización / invariantes

~~~text
API / Application:
¿el actor está autorizado a intentar la operación?

Domain:
¿la operación conserva las invariantes?
~~~

Ambas validaciones son necesarias.

---

## 34. Invitaciones

La posesión de una referencia o token de invitación no otorga automáticamente membresía.

Aceptar una invitación deberá comprobar al menos:

- invitación correcta;
- estado PENDIENTE;
- vigencia;
- identidad autenticada;
- equivalencia de Email;
- Negocio correcto;
- ausencia de membresía activa al confirmar;
- reglas de reincorporación.

La referencia a la invitación no es autoridad suficiente.

---

## 35. Tokens de invitación

Si el flujo utiliza un token compartible, deberá ser:

- aleatorio;
- de alta entropía;
- difícil de adivinar;
- no derivado de IDs secuenciales.

Si la funcionalidad lo permite, se preferirá almacenar una representación segura/hash del token en lugar del token reutilizable en texto plano.

La estrategia concreta se definirá al implementar la invitación.

---

## 36. CORS

CORS no es autenticación ni autorización.

Se configurará explícitamente según orígenes permitidos.

No se utilizará una configuración indiscriminadamente permisiva en producción.

---

## 37. HTTPS

En producción, credenciales y bearer tokens deberán viajar únicamente mediante HTTPS.

TLS podrá terminar en:

- plataforma de deployment;
- reverse proxy;
- infraestructura administrada.

Login y tokens no deberán exponerse mediante HTTP sin cifrar en un entorno público.

---

## 38. Almacenamiento de tokens en clientes

La arquitectura backend no fija todavía el frontend.

Cuando exista cliente web, el almacenamiento de credenciales deberá decidirse considerando:

- XSS;
- CSRF;
- cookies HttpOnly;
- Secure;
- SameSite.

No se prescribirá localStorage como solución universal.

---

## 39. CSRF

Con bearer tokens enviados explícitamente en Authorization, el modelo CSRF es distinto al de cookies enviadas automáticamente.

Si posteriormente se utilizan cookies autenticadas, se diseñará una defensa CSRF correspondiente.

---

## 40. Secretos

No se versionarán:

- JWT_SECRET;
- passwords;
- tokens de Mercado Pago;
- credenciales PostgreSQL reales;
- claves de servicios externos.

Se usarán variables de entorno/configuración externa.

El repositorio podrá incluir:

~~~text
.env.example
~~~

con valores ficticios.

---

## 41. Logging seguro

No se registrarán:

- passwords;
- hashes de password;
- JWT completos;
- refresh tokens;
- tokens de invitación;
- secretos;
- credenciales externas.

Los emails se minimizarán o enmascararán cuando no sean imprescindibles.

---

## 42. Eventos de seguridad

Será útil registrar de forma segura:

- login exitoso;
- login fallido;
- rate limit alcanzado;
- token inválido;
- intento cross-tenant;
- operación denegada por rol;
- cambios administrativos sensibles.

Los logs internos no deben traducirse en mensajes públicos detallados.

---

## 43. Mensaje público vs. log interno

Ejemplo:

Respuesta pública:

~~~text
404 Not Found
~~~

Registro interno autorizado:

~~~text
usuario X intentó acceder a recurso Y fuera de su tenant
~~~

Esto permite detectar abuso sin revelar información al atacante.

---

## 44. Errores de autenticación

Para token ausente, inválido o expirado se utilizará el código HTTP que defina el contrato de autenticación, normalmente:

~~~text
401 Unauthorized
~~~

Los mensajes serán genéricos.

---

## 45. Errores de autorización

Dentro de un tenant al que el Usuario sí pertenece, puede corresponder:

~~~text
403 Forbidden
~~~

cuando revelar la existencia del recurso no sea sensible.

Para recursos cross-tenant cuya existencia no debe revelarse se preferirá:

~~~text
404 Not Found
~~~

La matriz exacta se documentará en el contrato API.

---

## 46. Registro de cuentas

El flujo funcional completo de registro no está congelado.

Cualquier implementación deberá respetar:

- Email normalizado;
- unicidad;
- password hashing;
- ausencia de password original persistido;
- anti-enumeración cuando corresponda.

La verificación de email se incorporará si el alcance funcional la requiere.

---

## 47. Password reset

Queda diferido salvo requerimiento de entrega.

Si se incorpora deberá utilizar:

- token aleatorio de un solo uso;
- expiración;
- almacenamiento seguro;
- invalidación después del uso;
- respuestas anti-enumeración;
- rate limiting.

Nunca se enviará una contraseña existente por email.

---

## 48. Refresh tokens

No se implementarán preventivamente.

Se evaluarán cuando:

- la UX requiera sesiones largas;
- el access token corto produzca fricción real;
- se diseñe revocación/rotación.

---

## 49. MFA y OAuth externo

No forman parte del alcance inicial.

No se introducirán preventivamente:

~~~text
Google OAuth
Microsoft OAuth
MFA
Passkeys
~~~

La arquitectura no debe impedir incorporarlos posteriormente.

---

## 50. Estrategia multi-tenant física

Inicialmente:

~~~text
una base PostgreSQL compartida
+
tablas compartidas
+
negocio_id como frontera lógica
~~~

No se utilizará inicialmente:

~~~text
base por Negocio
schema PostgreSQL por Negocio
~~~

porque aumentaría la complejidad operativa sin necesidad actual.

---

## 51. PostgreSQL Row Level Security

RLS puede agregar una barrera adicional.

No se incorporará inicialmente.

Motivos:

- configuración extra;
- contexto por conexión;
- complejidad de tests;
- interacción con migraciones;
- mayor complejidad de debugging.

El aislamiento inicial se apoyará en:

- queries tenant-scoped;
- autorización;
- constraints;
- tests negativos.

RLS podrá reevaluarse si el riesgo o escala lo justifican.

---

## 52. Caché futura

Si se incorpora caché, la clave deberá incluir tenant.

Correcto:

~~~text
negocio:{negocio_id}:articulo:{articulo_id}
~~~

Evitar:

~~~text
articulo:{articulo_id}
~~~

si puede mezclar información entre negocios.

No se incorporará caché en Bloque 1 sin necesidad.

---

## 53. Archivos e imágenes

Cuando se implemente storage, la autorización deberá abarcar también archivos.

Una URL directa no debe convertirse en bypass de tenant.

La storage key o metadata debe permitir validar:

- Negocio propietario;
- recurso propietario;
- permiso de lectura/escritura.

---

## 54. Tests cross-tenant

La suite deberá incluir pruebas negativas explícitas.

Ejemplo:

~~~text
Usuario A pertenece a Negocio A
Usuario B pertenece a Negocio B
Articulo A pertenece a Negocio A
Articulo B pertenece a Negocio B
~~~

Autenticado como A:

- puede consultar A;
- no puede consultar B;
- no puede editar B;
- no puede desactivar B;
- no debe poder distinguir públicamente que B existe.

---

## 55. Tests de autenticación

Se deberán cubrir:

- password correcta;
- password incorrecta;
- email inexistente;
- JWT válido;
- JWT expirado;
- JWT manipulado;
- JWT sin sub;
- usuario válido con membresía inactiva;
- usuario válido sin membresía del tenant.

---

## 56. Tests de roles

Se probarán combinaciones actor/operación.

Ejemplos:

~~~text
PROPIETARIO -> operaciones administrativas permitidas
ENCARGADO -> según matriz
TRABAJADOR -> según matriz
INACTIVO -> ninguna operación tenant
~~~

También se probarán invariantes que ningún rol puede violar.

---

## 57. Orden general de validación

Flujo recomendado:

~~~text
1. autenticar
2. resolver tenant
3. validar membresía
4. localizar recurso dentro del tenant
5. validar autorización funcional
6. ejecutar Domain
7. persistir
~~~

No es una receta rígida para cada endpoint, pero evita filtraciones y búsquedas globales inseguras.

---

## 58. Regla de confianza

Todo dato controlado por el cliente se considera no confiable.

Incluye:

- path params;
- query params;
- body;
- headers custom;
- IDs;
- nombres de archivo;
- rol declarado;
- usuario declarado;
- negocio declarado.

La autoridad se deriva siempre desde:

~~~text
identidad autenticada
+
datos persistidos
+
reglas del sistema
~~~

---

## 59. Decisiones congeladas

Para la implementación quedan definidas:

1. Negocio es el tenant.
2. Usuario es identidad global.
3. UsuarioNegocio define pertenencia, rol y estado.
4. El JWT identifica al Usuario y no fija un tenant único.
5. negocio_id viajará en el path de recursos multi-tenant.
6. Toda request tenant-scoped revalidará membresía ACTIVA.
7. Rol y estado no se confiarán únicamente al JWT.
8. Repository aplicará tenant scoping en recursos pertenecientes a Negocio.
9. Recursos cross-tenant se expondrán normalmente como 404.
10. UUID no reemplaza autorización.
11. Passwords se almacenarán con Argon2id.
12. Application dependerá de PasswordHasher, no de la librería concreta.
13. Login utilizará la misma normalización del Value Object Email.
14. Login tendrá respuestas anti-enumeración y mitigación de timing.
15. Login requerirá rate limiting.
16. Secretos vivirán fuera del repositorio.
17. Domain no conoce JWT, FastAPI ni librerías criptográficas.
18. Permisos de rol no reemplazan invariantes del dominio.

---

## 60. Decisiones diferidas

Permanecen abiertas:

- refresh tokens;
- revocación avanzada;
- jti obligatorio;
- verificación de email;
- password reset;
- MFA;
- OAuth externo;
- autenticación mediante cookies;
- estrategia CSRF asociada;
- PostgreSQL RLS;
- proveedor concreto de rate limiting;
- storage de archivos;
- auditoría avanzada;
- política completa de passwords;
- lockout progresivo.

Estas decisiones se tomarán cuando exista requerimiento real o antes de exponer públicamente una funcionalidad que las necesite.

---

## 61. Criterio de aceptación

La implementación será aceptable si:

1. un usuario autenticado no puede acceder a datos de otro Negocio sin membresía;
2. conocer un UUID no otorga acceso;
3. una membresía inactiva no autoriza;
4. el rol se evalúa dentro del Negocio correcto;
5. los repositorios evitan búsquedas globales inseguras para recursos tenant-scoped;
6. las respuestas no permiten enumerar recursos cross-tenant;
7. passwords nunca se guardan en texto plano;
8. tokens y secretos no aparecen en logs;
9. cambios de rol/membresía pueden surtir efecto antes de que expire un token viejo;
10. los tests incluyen escenarios cross-tenant negativos.

---

## 62. Próximo documento

El último documento general previsto en arquitectura/ es:

~~~text
arquitectura/docker.md
~~~

Después se avanzará con:

~~~text
base-de-datos/bloque-1-fundacion/modelo-relacional.md
~~~

y su ERD.
