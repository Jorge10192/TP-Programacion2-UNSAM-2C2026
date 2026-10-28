# Estructura del Backend

> **Estado:** propuesta técnica base para la implementación del Bloque 1.  
> **Rama de trabajo:** `feature/bloque-1-arquitectura`.  
> **Objetivo:** traducir la arquitectura general a una estructura física concreta de paquetes Python, archivos, reglas de dependencia e infraestructura de tests.

---

## 1. Propósito

Este documento define cómo se organizará físicamente el backend de `Proyecto-3-Extendido-Generico`.

Complementa:

```text
arquitectura/arquitectura-general.md
```

y especifica:

- layout del backend;
- paquetes principales;
- ubicación de Domain, Application, Infrastructure y API;
- reglas de imports;
- convenciones de nombres;
- ubicación de casos de uso;
- ubicación de repositorios y adaptadores;
- organización de tests;
- ubicación de configuración y entrypoints.

No define todavía:

- tablas concretas;
- mappings SQLAlchemy definitivos;
- endpoints concretos;
- DTOs concretos;
- contratos finales de Repository;
- Unit of Work explícito;
- estrategia final de transacciones;
- estrategia completa de autenticación;
- estructura de bloques posteriores.

---

## 2. Layout general del backend

La estructura base será:

```text
Proyecto-3-Extendido-Generico/
└── backend/
    ├── pyproject.toml
    ├── alembic.ini
    ├── Dockerfile
    ├── .env.example
    │
    ├── alembic/
    │   ├── env.py
    │   └── versions/
    │
    ├── src/
    │   └── app/
    │       ├── __init__.py
    │       ├── main.py
    │       │
    │       ├── domain/
    │       ├── application/
    │       ├── infrastructure/
    │       └── api/
    │
    └── tests/
        ├── unit/
        ├── integration/
        └── e2e/
```

Se utiliza un layout `src/` para evitar imports accidentales desde el directorio de trabajo y forzar una estructura de paquete consistente.

El paquete raíz de la aplicación será:

```text
app
```

Por lo tanto, los imports productivos seguirán la forma:

```python
from app.domain.organizacion.negocio import Negocio
```

y no:

```python
from src.app.domain.organizacion.negocio import Negocio
```

---

## 3. Regla principal de dependencias

La estructura física debe hacer visible la regla arquitectónica:

```text
API
 ↓
Application
 ↓
Domain

Infrastructure implementa detalles externos
sin ser conocido por Domain.
```

### Imports permitidos

```text
api -> application
api -> domain              solo para tipos/errores puntuales si aporta claridad

application -> domain

infrastructure -> domain
infrastructure -> application contracts

main/composition root -> api
main/composition root -> infrastructure
main/composition root -> application
```

### Imports prohibidos

```text
domain -> application
domain -> infrastructure
domain -> api

application -> api
application -> FastAPI

domain -> FastAPI
domain -> SQLAlchemy
domain -> Pydantic
domain -> SDKs externos
```

---

## 4. Domain

Estructura inicial:

```text
src/app/domain/
├── __init__.py
├── common/
│   ├── __init__.py
│   └── exceptions.py
│
├── organizacion/
│   ├── __init__.py
│   ├── usuario.py
│   ├── negocio.py
│   ├── usuario_negocio.py
│   ├── invitacion_negocio.py
│   ├── email.py
│   ├── enums.py
│   └── exceptions.py
│
└── catalogo/
    ├── __init__.py
    ├── categoria.py
    ├── articulo_catalogo.py
    ├── capacidades_articulo.py
    ├── propuesta_edicion.py
    ├── enums.py
    └── exceptions.py
```

### 4.1 Responsabilidad

Domain contiene:

- entidades;
- Value Objects;
- enums de dominio;
- invariantes;
- comportamiento;
- errores de dominio;
- objetos de parámetros conceptuales cuando realmente pertenezcan al dominio.

No contiene:

- routers;
- schemas HTTP;
- sesiones SQLAlchemy;
- modelos ORM;
- llamadas HTTP;
- configuración de entorno;
- JWT;
- lógica de serialización de API.

---

## 5. Entidades y Value Objects

Convenciones:

```text
archivo: snake_case.py
clase: PascalCase
```

Ejemplos:

```text
usuario.py              -> Usuario
negocio.py              -> Negocio
usuario_negocio.py      -> UsuarioNegocio
invitacion_negocio.py   -> InvitacionNegocio
email.py                -> Email
articulo_catalogo.py    -> ArticuloCatalogo
capacidades_articulo.py -> CapacidadesArticulo
```

No se agruparán múltiples entidades grandes en un único archivo salvo que sean inseparables y pequeñas.

---

## 6. Enums

Los enums de cada módulo podrán agruparse inicialmente en:

```text
organizacion/enums.py
catalogo/enums.py
```

Ejemplos:

```text
Rol
EstadoMembresia
EstadoInvitacion
ModalidadOperativa
Moneda

EstadoCategoria
EstadoArticulo
TipoArticulo
UnidadMedida
```

Si el archivo crece excesivamente, podrá dividirse posteriormente.

No se crearán archivos individuales por enum sin necesidad.

---

## 7. Excepciones de dominio

Cada módulo tendrá un archivo:

```text
exceptions.py
```

Ejemplos conceptuales:

```text
MembresiaYaActivaError
UltimoPropietarioActivoError
InvitacionNoAceptableError
ConfiguracionArticuloInvalidaError
ArticuloNoReactivableError
```

Las excepciones describen problemas de negocio.

No deberán incluir:

```text
HTTP 400
HTTP 404
HTTP 409
```

La traducción a HTTP pertenece a API.

---

## 8. Application

Estructura inicial:

```text
src/app/application/
├── __init__.py
├── common/
│   ├── __init__.py
│   ├── ports/
│   └── exceptions.py
│
├── organizacion/
│   ├── __init__.py
│   ├── use_cases/
│   │   ├── crear_negocio.py
│   │   ├── aceptar_invitacion.py
│   │   ├── invitar_miembro.py
│   │   ├── desactivar_miembro.py
│   │   └── cambiar_rol_miembro.py
│   └── dto/
│
└── catalogo/
    ├── __init__.py
    ├── use_cases/
    │   ├── crear_categoria.py
    │   ├── crear_articulo.py
    │   ├── editar_articulo.py
    │   ├── desactivar_articulo.py
    │   └── reactivar_articulo.py
    └── dto/
```

---

## 9. Casos de uso

Cada caso de uso relevante tendrá su propio archivo.

Convención:

```text
archivo: verbo_objeto.py
clase: VerboObjetoUseCase
```

Ejemplos:

```text
aceptar_invitacion.py
-> AceptarInvitacionUseCase

editar_articulo.py
-> EditarArticuloUseCase
```

No se exige el sufijo `_use_case.py` en el nombre de archivo porque el contexto `use_cases/` ya expresa esa responsabilidad.

Se evita:

```text
aceptar_invitacion_use_case.py
```

por redundancia.

---

## 10. DTOs de Application

Application podrá definir DTOs propios cuando necesite representar:

- intención de caso de uso;
- datos compuestos;
- resultados desacoplados de HTTP.

Ubicación:

```text
application/<modulo>/dto/
```

Ejemplo:

```text
EditarArticuloCommand
CrearNegocioCommand
ArticuloResult
```

Estos DTOs:

```text
NO son schemas HTTP obligatoriamente
NO son entidades
NO son modelos ORM
```

En casos triviales, se podrá evitar crear un DTO propio y utilizar parámetros tipados directamente.

---

## 11. Ports / contratos internos

Las abstracciones necesarias para que Application no dependa de detalles externos vivirán inicialmente en:

```text
application/common/ports/
```

o, si son claramente específicas de un módulo:

```text
application/organizacion/ports/
application/catalogo/ports/
```

Ejemplos potenciales:

```text
UsuarioRepository
NegocioRepository
UsuarioNegocioRepository
InvitacionRepository
ArticuloCatalogoRepository
CategoriaRepository
Reloj
PasswordHasher
TokenService
```

No se crearán todos preventivamente.

Se crearán únicamente cuando un caso de uso requiera realmente una dependencia externa.

---

## 12. Repository: contrato vs implementación

Separación conceptual:

```text
Application
    ↓
contrato Repository
    ↑
implementación SQLAlchemy
```

Ejemplo futuro:

```text
ArticuloCatalogoRepository
          ↑
SqlAlchemyArticuloCatalogoRepository
```

### Regla

El contrato describe operaciones que necesita Application.

No debe intentar reproducir genéricamente todas las operaciones posibles de una base de datos.

Evitar:

```python
class GenericRepository:
    create()
    update()
    delete()
    get()
    get_all()
    filter()
    ...
```

si eso obliga a todos los módulos a una abstracción artificial.

Preferir contratos orientados a necesidades reales:

```python
buscar_por_id_en_negocio(...)
existe_nombre_equivalente_en_negocio(...)
registrar_cambio(...)
```

cuando el caso de uso realmente los requiera.

---

## 13. Infrastructure

Estructura propuesta:

```text
src/app/infrastructure/
├── __init__.py
├── config/
│   ├── __init__.py
│   └── settings.py
│
├── persistence/
│   ├── __init__.py
│   ├── database.py
│   ├── models/
│   │   ├── organizacion.py
│   │   └── catalogo.py
│   └── repositories/
│       ├── organizacion/
│       └── catalogo/
│
├── security/
│   ├── __init__.py
│   ├── password_hasher.py
│   └── token_service.py
│
└── integrations/
    └── __init__.py
```

---

## 14. Configuración

`settings.py` centralizará configuración de entorno.

Ejemplos:

```text
DATABASE_URL
JWT_SECRET
JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES
ENVIRONMENT
```

Se utilizará configuración tipada.

Los secretos reales no se versionan.

El repositorio incluirá:

```text
.env.example
```

con nombres de variables y valores ficticios/documentales.

---

## 15. Persistencia

`infrastructure/persistence/database.py` contendrá inicialmente:

- creación/configuración del engine;
- fábrica de sesiones;
- utilidades mínimas de acceso transaccional.

Los modelos SQLAlchemy vivirán en:

```text
infrastructure/persistence/models/
```

y no dentro de `domain/`.

Regla:

```text
ArticuloCatalogo
!=
ArticuloCatalogoModel
```

La forma concreta del mapping se definirá en el diseño de base de datos.

---

## 16. Modelos ORM

Convención de nombres propuesta:

```text
UsuarioModel
NegocioModel
UsuarioNegocioModel
InvitacionNegocioModel
CategoriaModel
ArticuloCatalogoModel
```

Esta convención permite distinguir claramente:

```text
Entidad de dominio
vs
Modelo de persistencia
```

No se decide todavía si los mappings estarán:

- separados por archivo;
- agrupados por módulo;
- implementados mediante mapping imperativo o declarativo desacoplado.

El criterio se decidirá cuando diseñemos el modelo relacional.

---

## 17. Repositorios SQLAlchemy

Ubicación:

```text
infrastructure/persistence/repositories/
```

Ejemplos:

```text
repositories/
├── organizacion/
│   ├── usuario_repository.py
│   ├── negocio_repository.py
│   ├── membresia_repository.py
│   └── invitacion_repository.py
└── catalogo/
    ├── articulo_repository.py
    └── categoria_repository.py
```

Clases concretas:

```text
SqlAlchemyUsuarioRepository
SqlAlchemyNegocioRepository
SqlAlchemyArticuloCatalogoRepository
```

El nombre de archivo no necesita repetir `sqlalchemy_` mientras el archivo ya se encuentre dentro de Infrastructure.

---

## 18. API

Estructura propuesta:

```text
src/app/api/
├── __init__.py
├── routers/
│   ├── __init__.py
│   ├── auth.py
│   ├── negocios.py
│   ├── miembros.py
│   ├── invitaciones.py
│   ├── categorias.py
│   └── articulos.py
│
├── schemas/
│   ├── __init__.py
│   ├── auth.py
│   ├── organizacion.py
│   └── catalogo.py
│
├── dependencies/
│   ├── __init__.py
│   ├── auth.py
│   ├── negocio_actual.py
│   └── use_cases.py
│
└── exception_handlers/
    ├── __init__.py
    └── handlers.py
```

---

## 19. Routers

Los routers agrupan endpoints HTTP.

Ejemplos conceptuales:

```text
/api/v1/auth
/api/v1/negocios
/api/v1/negocios/{negocio_id}/miembros
/api/v1/negocios/{negocio_id}/invitaciones
/api/v1/negocios/{negocio_id}/categorias
/api/v1/negocios/{negocio_id}/articulos
```

Las rutas exactas se definirán en:

```text
api/bloque-1-fundacion/endpoints.md
```

Responsabilidad de router:

```text
request
→ schema
→ dependencia
→ use case
→ response
```

No debe contener algoritmos de negocio.

---

## 20. Schemas HTTP

Schemas Pydantic vivirán exclusivamente en:

```text
api/schemas/
```

Ejemplos futuros:

```text
CrearNegocioRequest
NegocioResponse
CrearArticuloRequest
EditarArticuloRequest
ArticuloResponse
```

No deberán llamarse:

```text
Negocio
ArticuloCatalogo
UsuarioNegocio
```

para evitar confusión con entidades.

Convención:

```text
*Request
*Response
```

---

## 21. Dependencies de FastAPI

FastAPI Dependencies se utilizarán para cuestiones de frontera:

- usuario autenticado;
- negocio actual;
- sesión de base de datos;
- construcción/inyección de casos de uso;
- servicios técnicos compartidos.

No se utilizarán como sustituto de reglas de dominio.

Ejemplo:

```text
get_current_user()
```

puede resolver identidad autenticada.

Pero:

```text
validar_ultimo_propietario_activo()
```

no debería vivir como dependencia FastAPI si corresponde al dominio.

---

## 22. Exception handlers

Los handlers de API traducirán excepciones internas a respuestas HTTP.

Ejemplo conceptual:

```text
MembresiaYaActivaError
      ↓
HTTP 409
```

La elección exacta de códigos se documentará en el contrato de API.

Se evitarán bloques repetidos de:

```python
try:
    ...
except ...
```

en cada router cuando una traducción centralizada sea suficiente.

---

## 23. Composition Root

La creación de dependencias concretas debe quedar concentrada en una zona reducida.

Inicialmente podrá resolverse mediante:

```text
api/dependencies/use_cases.py
```

y configuración de `main.py`.

Ejemplo conceptual:

```text
Session
  ↓
SqlAlchemyArticuloCatalogoRepository
  ↓
EditarArticuloUseCase
  ↓
router
```

No se introducirá un framework de Dependency Injection externo salvo necesidad real.

FastAPI Dependencies es suficiente inicialmente.

---

## 24. main.py

`src/app/main.py` será el entrypoint HTTP.

Responsabilidades:

- crear `FastAPI`;
- registrar routers;
- registrar exception handlers;
- configurar metadatos de OpenAPI;
- configurar middleware estrictamente necesario;
- hooks de lifecycle cuando correspondan.

No contendrá lógica de negocio.

Debe mantenerse pequeño.

---

## 25. Versionado de API

Se prevé utilizar prefijo:

```text
/api/v1
```

desde el comienzo.

Esto permite evolucionar contratos externos sin vincularlos directamente al versionado interno del dominio.

No significa que se vayan a mantener múltiples versiones activas inmediatamente.

---

## 26. Tests

Estructura:

```text
tests/
├── unit/
│   ├── domain/
│   │   ├── organizacion/
│   │   └── catalogo/
│   └── application/
│       ├── organizacion/
│       └── catalogo/
│
├── integration/
│   ├── persistence/
│   └── api/
│
└── e2e/
```

---

## 27. Tests unitarios de Domain

Ejemplos:

```text
tests/unit/domain/organizacion/
├── test_negocio.py
├── test_usuario_negocio.py
└── test_invitacion_negocio.py

tests/unit/domain/catalogo/
├── test_articulo_catalogo.py
├── test_capacidades_articulo.py
└── test_categoria.py
```

Deben ejecutarse sin:

- PostgreSQL;
- FastAPI;
- Docker;
- red.

---

## 28. Tests unitarios de Application

Los casos de uso podrán probarse mediante fakes/stubs simples.

Ejemplo:

```text
FakeInvitacionRepository
FakeUsuarioNegocioRepository
FakeReloj
```

No se creará un framework interno complejo de mocks.

Pytest y objetos fake explícitos serán suficientes en la mayoría de los casos.

---

## 29. Tests de integración

`tests/integration/persistence/` comprobará:

- mappings;
- repositories;
- constraints;
- transacciones;
- consultas tenant-scoped;
- unicidades reales.

Idealmente se ejecutarán contra PostgreSQL de testing para cubrir comportamiento representativo del entorno productivo.

---

## 30. Tests de API

`tests/integration/api/` validará:

- routing;
- schemas;
- autenticación;
- autorización;
- exception handlers;
- status codes;
- serialización.

Se utilizarán las herramientas de testing recomendadas por FastAPI/HTTPX.

---

## 31. Tests E2E

Se reservarán para pocos escenarios de alto valor.

Ejemplos:

```text
crear usuario
→ autenticar
→ crear negocio
→ crear artículo
```

o:

```text
emitir invitación
→ aceptar invitación
→ obtener membresía ACTIVA
```

No toda funcionalidad necesita un test E2E si ya está cubierta adecuadamente por tests inferiores.

---

## 32. Convenciones de nombres

### Archivos Python

```text
snake_case.py
```

### Clases

```text
PascalCase
```

### Funciones y métodos

```text
snake_case
```

### Constantes

```text
UPPER_SNAKE_CASE
```

### Tests

```text
test_*.py
```

### Clases de casos de uso

```text
*UseCase
```

### Schemas HTTP

```text
*Request
*Response
```

### Implementaciones concretas

Cuando sea útil distinguirlas:

```text
SqlAlchemy*
Jwt*
MercadoPago*
```

---

## 33. Imports absolutos

Se utilizarán preferentemente imports absolutos desde `app`.

Ejemplo:

```python
from app.domain.catalogo.articulo_catalogo import ArticuloCatalogo
```

Se evitarán cadenas profundas de imports relativos como:

```python
from ....domain.catalogo.articulo_catalogo import ArticuloCatalogo
```

porque reducen legibilidad y dificultan refactors.

---

## 34. __init__.py

Los archivos `__init__.py` no deben convertirse en concentradores masivos de imports.

Se utilizarán principalmente para marcar paquetes.

Podrán exponer un conjunto pequeño de tipos cuando mejore claramente la API interna, pero no se reexportará todo automáticamente.

---

## 35. Evitar módulos utilitarios genéricos

Evitar archivos ambiguos como:

```text
utils.py
helpers.py
common.py
manager.py
services.py
```

cuando su responsabilidad pueda expresarse mejor.

Preferir nombres específicos:

```text
password_hasher.py
token_service.py
normalizacion_catalogo.py
```

Si aparece una utilidad realmente transversal, se ubicará de forma explícita y documentada.

---

## 36. Servicios de dominio

No se creará una carpeta `domain/services/` por defecto.

Un Domain Service se introducirá únicamente cuando exista comportamiento de dominio que:

- no pertenezca naturalmente a una entidad o Value Object;
- necesite colaborar con múltiples conceptos de dominio;
- siga siendo independiente de infraestructura.

No se utilizará `Service` como nombre genérico para cualquier clase.

---

## 37. Servicios de Application

Del mismo modo, se priorizarán casos de uso explícitos frente a una clase genérica tipo:

```text
CatalogService
UserService
BusinessService
```

que acumule muchas responsabilidades.

Preferir:

```text
CrearArticuloUseCase
EditarArticuloUseCase
ReactivarArticuloUseCase
```

Esto mejora:

- trazabilidad;
- tests;
- responsabilidades;
- autorización específica.

---

## 38. Estructura y circular imports

Para reducir imports circulares:

- Domain no depende de Application;
- entidades no deben importarse entre sí innecesariamente;
- usar `TYPE_CHECKING` cuando un type hint sea suficiente;
- evitar módulos índice que importen todo el dominio;
- mantener enums y Value Objects pequeños;
- evitar referencias bidireccionales de objetos cuando no sean necesarias.

Si aparece un circular import, se corregirá el límite de responsabilidades antes de recurrir a hacks globales.

---

## 39. Tipado

Se utilizará type hinting de Python en todo código nuevo relevante.

Ejemplo:

```python
def reactivar(self) -> None:
    ...
```

y:

```python
def buscar_por_id_en_negocio(
    self,
    articulo_id: UUID,
    negocio_id: UUID,
) -> ArticuloCatalogo | None:
    ...
```

El tipado ayuda a:

- documentación;
- IDE;
- refactoring;
- implementación asistida por IA;
- prevención de errores.

La herramienta de type checking está pendiente de selección.

---

## 40. IDs

La estructura de paquetes no congela todavía el tipo definitivo de identificadores.

UUID es un candidato fuerte para entidades principales, pero la decisión se documentará junto al modelo relacional.

No se deberá asumir prematuramente:

```text
int autoincremental
```

o:

```text
UUID
```

en contratos donde todavía no sea necesario.

---

## 41. Fechas y tiempo

Las operaciones sensibles al tiempo no llamarán indiscriminadamente:

```python
datetime.now()
```

desde múltiples lugares del dominio.

Cuando el tiempo sea parte del caso de uso, Application podrá utilizar una abstracción como:

```text
Reloj
```

y obtener un único `ahora` para la operación.

Esto es especialmente importante para invitaciones.

---

## 42. Seguridad

Código específico de:

- hashing;
- tokens;
- lectura de credenciales;
- proveedores de identidad;

vivirá en Infrastructure/API según responsabilidad.

Las entidades no almacenan ni procesan tokens JWT.

El documento específico será:

```text
arquitectura/multitenant-y-seguridad.md
```

---

## 43. Integraciones externas

Las integraciones futuras vivirán bajo:

```text
infrastructure/integrations/
```

Ejemplo futuro:

```text
integrations/
└── payments/
    └── mercado_pago.py
```

El contrato que consume Application estará separado de la implementación concreta.

No se creará esta estructura hasta que el módulo de pagos la necesite.

---

## 44. Docker

`backend/Dockerfile` empaquetará la API.

El `docker-compose.yml` podrá mantenerse en la raíz de `Proyecto-3-Extendido-Generico/` porque coordina múltiples servicios del proyecto:

```text
Proyecto-3-Extendido-Generico/
├── docker-compose.yml
└── backend/
    └── Dockerfile
```

Inicialmente:

```text
api
postgres
```

---

## 45. Dependencias Python

Se centralizarán en:

```text
backend/pyproject.toml
```

No se prevé mantener simultáneamente múltiples fuentes manuales de dependencias sin necesidad.

Las dependencias se separarán conceptualmente entre:

- runtime;
- development/testing.

La herramienta exacta de instalación/lock podrá definirse antes de inicializar el backend.

---

## 46. Lint y formato

Se recomienda:

```text
ruff
```

para linting y formateo.

Esto simplifica tooling y mantiene consistencia.

La configuración vivirá en:

```text
pyproject.toml
```

---

## 47. GitHub Actions

El workflow del proyecto genérico deberá:

- instalar Python;
- instalar dependencias;
- ejecutar lint;
- ejecutar tests.

Se ubicará en:

```text
.github/workflows/
```

con nombre que lo distinga del workflow histórico de WALOS.

Ejemplo:

```text
proyecto-generico-tests.yml
```

---

## 48. Regla para nuevos módulos

Cuando se agregue un módulo funcional posterior, deberá respetar la misma separación.

Ejemplo futuro:

```text
domain/compras/
application/compras/
infrastructure/persistence/repositories/compras/
api/routers/compras.py
```

No se crearán todas estas carpetas antes de necesitarlas.

---

## 49. Qué NO se hará

No se utilizará inicialmente una estructura basada en:

```text
models/
controllers/
services/
utils/
```

como única separación global si eso mezcla:

- entidades de dominio;
- ORM;
- lógica de casos de uso;
- detalles HTTP.

Tampoco se adoptará una estructura excesivamente granular con un archivo por interfaz, comando, handler y mapper si no aporta valor real.

El objetivo es:

```text
estructura explícita
+
simple
+
escalable
```

---

## 50. Estructura de referencia del Bloque 1

Vista consolidada:

```text
backend/
├── pyproject.toml
├── alembic.ini
├── Dockerfile
├── .env.example
├── alembic/
│   ├── env.py
│   └── versions/
│
├── src/
│   └── app/
│       ├── main.py
│       │
│       ├── domain/
│       │   ├── common/
│       │   ├── organizacion/
│       │   │   ├── usuario.py
│       │   │   ├── negocio.py
│       │   │   ├── usuario_negocio.py
│       │   │   ├── invitacion_negocio.py
│       │   │   ├── email.py
│       │   │   ├── enums.py
│       │   │   └── exceptions.py
│       │   └── catalogo/
│       │       ├── categoria.py
│       │       ├── articulo_catalogo.py
│       │       ├── capacidades_articulo.py
│       │       ├── propuesta_edicion.py
│       │       ├── enums.py
│       │       └── exceptions.py
│       │
│       ├── application/
│       │   ├── common/
│       │   │   └── ports/
│       │   ├── organizacion/
│       │   │   ├── use_cases/
│       │   │   └── dto/
│       │   └── catalogo/
│       │       ├── use_cases/
│       │       └── dto/
│       │
│       ├── infrastructure/
│       │   ├── config/
│       │   ├── persistence/
│       │   │   ├── database.py
│       │   │   ├── models/
│       │   │   └── repositories/
│       │   ├── security/
│       │   └── integrations/
│       │
│       └── api/
│           ├── routers/
│           ├── schemas/
│           ├── dependencies/
│           └── exception_handlers/
│
└── tests/
    ├── unit/
    │   ├── domain/
    │   └── application/
    ├── integration/
    │   ├── persistence/
    │   └── api/
    └── e2e/
```

---

## 51. Decisiones diferidas

Este documento no congela todavía:

- tipo definitivo de IDs;
- implementación exacta de contracts Repository;
- Unit of Work;
- mappings ORM;
- mappers Domain <-> ORM;
- librería de password hashing;
- librería JWT;
- type checker;
- gestor/lock de dependencias;
- estrategia de sesiones SQLAlchemy;
- database fixtures;
- proveedor de deploy.

Estas decisiones se tomarán en los documentos técnicos correspondientes o durante la inicialización controlada del backend.

---

## 52. Criterio de aceptación

La estructura será considerada adecuada si permite:

1. ejecutar y testear Domain sin FastAPI ni PostgreSQL;
2. reemplazar una implementación de Repository sin modificar entidades;
3. probar casos de uso mediante fakes;
4. mantener schemas HTTP fuera de Domain;
5. mantener ORM fuera de Domain;
6. aislar recursos por Negocio;
7. agregar módulos posteriores sin reorganizar completamente el backend;
8. mantener `main.py` y routers pequeños;
9. evitar circular imports estructurales;
10. cumplir los requisitos académicos sin introducir complejidad innecesaria.

---

## 53. Próximo documento recomendado

Después de congelar esta estructura, el siguiente documento técnico recomendado es:

```text
base-de-datos/bloque-1-fundacion/modelo-relacional.md
```

acompañado por:

```text
base-de-datos/bloque-1-fundacion/erd.puml
```

Esto permitirá decidir:

- IDs;
- tablas;
- claves;
- constraints;
- unicidades;
- relaciones;
- versionado/concurrencia;

antes de crear mappings SQLAlchemy y migraciones.
