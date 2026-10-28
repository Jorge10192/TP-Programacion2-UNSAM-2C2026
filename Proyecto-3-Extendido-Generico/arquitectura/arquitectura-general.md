# Arquitectura General

> **Estado:** arquitectura técnica base del proyecto.  
> **Alcance inicial:** Bloque 1 — Fundación (M01 Organización + M02 Catálogo).  
> **Objetivo:** traducir el modelo funcional y de dominio a una estructura implementable en Python, manteniendo separación de responsabilidades, testabilidad y capacidad de evolución.

---

## 1. Propósito

Este documento establece la arquitectura técnica general de `Proyecto-3-Extendido-Generico`.

Define:

- principios arquitectónicos;
- capas principales;
- reglas de dependencia;
- stack técnico base;
- criterios generales de persistencia, seguridad, testing, Docker e integración continua;
- lineamientos para integraciones externas futuras, incluyendo pagos.

No define todavía:

- tablas concretas;
- claves foráneas;
- endpoints individuales;
- DTOs concretos;
- mappings ORM definitivos;
- Aggregate Roots definitivos;
- diseño UX;
- proveedor final de pagos;
- arquitectura detallada de bloques todavía no diseñados.

Los detalles se documentarán en artefactos específicos.

---

## 2. Alcance inicial de implementación

La primera etapa de implementación corresponde a:

```text
Bloque 1 — Fundación
├── M01 — Organización del Negocio
└── M02 — Catálogo
```

El Bloque 1 debe servir además para validar en código decisiones transversales que luego reutilizará el resto del sistema:

- multi-tenancy;
- autenticación;
- autorización;
- persistencia;
- transacciones;
- concurrencia;
- manejo de errores;
- testing;
- estructura modular;
- Docker;
- integración continua.

---

## 3. Stack tecnológico base

El backend será desarrollado en Python.

Stack principal:

```text
Python 3.13
FastAPI
SQLAlchemy 2.x
PostgreSQL
Alembic
Pydantic v2
Pytest
Docker
Docker Compose
GitHub Actions
```

### 3.1 FastAPI

FastAPI será la frontera HTTP.

Responsabilidades:

- recibir requests;
- validar schemas de entrada;
- resolver dependencias de autenticación/autorización;
- invocar casos de uso de Application;
- transformar resultados a respuestas HTTP;
- traducir errores conocidos a respuestas HTTP;
- exponer documentación OpenAPI.

FastAPI **no contendrá reglas de negocio**.

### 3.2 PostgreSQL

PostgreSQL será la base de datos relacional principal.

Se selecciona por su soporte de:

- transacciones;
- constraints;
- índices;
- unicidades;
- concurrencia;
- múltiples usuarios simultáneos;
- crecimiento de módulos posteriores.

SQLite no será la base productiva principal.

### 3.3 SQLAlchemy

SQLAlchemy implementará la persistencia relacional desde Infrastructure.

Las clases de Domain no deberán depender directamente de:

```text
SQLAlchemy
Session
Mapped
Column
Relationship
```

salvo una excepción técnica futura expresamente documentada.

### 3.4 Alembic

Alembic versionará el esquema de base de datos.

Las modificaciones estructurales deberán realizarse mediante migraciones versionadas, no mediante cambios manuales como estrategia normal.

### 3.5 Pydantic

Pydantic se utilizará en la frontera HTTP/Application para:

- schemas de entrada;
- schemas de salida;
- validación estructural;
- serialización.

Regla:

```text
Schema Pydantic
!=
Entidad de dominio
```

y:

```text
DTO de Application
!=
Value Object automáticamente
```

---

## 4. Estilo arquitectónico

Se utilizará un **monolito modular por capas**, inspirado de forma pragmática en:

- Domain-Driven Design;
- Clean Architecture;
- Ports and Adapters;
- principios SOLID.

No se pretende aplicar una versión ceremonial de estas arquitecturas.

La separación existe para aportar:

- claridad;
- testabilidad;
- mantenibilidad;
- independencia del framework;
- facilidad de evolución.

---

## 5. Capas principales

La aplicación se divide conceptualmente en:

```text
API
Application
Domain
Infrastructure
```

Relación general:

```text
API
 │
 ▼
Application
 │
 ▼
Domain
 ▲
 │
Infrastructure
```

Las dependencias deben tender hacia el núcleo de negocio, no desde el núcleo hacia la tecnología.

---

## 6. Domain

Domain contiene las reglas de negocio fundamentales.

Ejemplos del Bloque 1:

```text
Usuario
Negocio
UsuarioNegocio
InvitacionNegocio
Email

Categoria
ArticuloCatalogo
CapacidadesArticulo
```

También contiene:

- Value Objects;
- enums;
- invariantes locales;
- comportamiento de entidades;
- errores de dominio;
- contratos conceptuales cuando corresponda.

### 6.1 Pureza tecnológica

Domain no deberá importar:

```text
fastapi
sqlalchemy
pydantic
requests
httpx
SDKs de pago
```

Tampoco deberá conocer:

```text
HTTP
JWT
headers
status codes
request
response
```

El objetivo es que el dominio pueda ejecutarse y testearse como Python puro.

---

## 7. Application

Application coordina casos de uso.

Ejemplos:

```text
CrearNegocioUseCase
AceptarInvitacionUseCase
CrearArticuloUseCase
EditarArticuloUseCase
DesactivarArticuloUseCase
ReactivarArticuloUseCase
```

Responsabilidades:

- obtener el usuario autenticado;
- validar permisos contextuales;
- cargar entidades;
- coordinar repositorios;
- resolver referencias;
- ejecutar operaciones de Domain;
- coordinar consistencia lógica;
- solicitar persistencia;
- coordinar servicios externos.

Application puede depender de Domain.

Application no debe duplicar invariantes propias de entidades o Value Objects.

---

## 8. Infrastructure

Infrastructure contiene detalles técnicos.

Inicialmente incluirá:

```text
persistencia SQLAlchemy
repositorios concretos
PostgreSQL
seguridad
hashing de contraseñas
tokens de acceso
reloj del sistema
```

Más adelante podrá incluir:

```text
Mercado Pago u otra pasarela
almacenamiento de imágenes
notificaciones
servicios externos
```

Infrastructure puede implementar contratos definidos hacia el interior del sistema.

---

## 9. API

API representa la frontera HTTP.

Estará construida con FastAPI y contendrá principalmente:

```text
routers
schemas
dependencies
exception handlers
```

Un endpoint debe actuar principalmente como adaptador:

```text
HTTP request
      ↓
Schema / DTO
      ↓
Caso de Uso
      ↓
Resultado
      ↓
HTTP response
```

Los routers no deben contener lógica compleja de negocio.

---

## 10. Regla de dependencias

Permitido:

```text
API -> Application
Application -> Domain
Infrastructure -> Domain
Infrastructure -> contratos internos
```

No permitido:

```text
Domain -> FastAPI
Domain -> SQLAlchemy
Domain -> API
Domain -> Infrastructure
Domain -> SDK Mercado Pago
```

La regla fundamental es:

> Las reglas de negocio no dependen de frameworks ni proveedores externos.

---

## 11. Organización modular

Los módulos conservan separación conceptual.

Para el Bloque 1:

```text
organizacion
catalogo
```

La estructura física detallada se definirá en:

```text
arquitectura/estructura-backend.md
```

Como orientación:

```text
backend/
└── src/
    ├── domain/
    │   ├── organizacion/
    │   └── catalogo/
    ├── application/
    │   ├── organizacion/
    │   └── catalogo/
    ├── infrastructure/
    │   ├── persistence/
    │   ├── repositories/
    │   ├── security/
    │   └── integrations/
    └── api/
        ├── routers/
        ├── schemas/
        ├── dependencies/
        └── exception_handlers/
```

---

## 12. Repositories

Las entidades de dominio no consultan repositorios.

Incorrecto:

```text
Negocio -> UsuarioNegocioRepository
```

Correcto conceptualmente:

```text
Application
    ↓
Repository
    ↓
membresiaHistorica
    ↓
Negocio.incorporarOReactivarMiembro(...)
```

Los contratos concretos de Repository se definirán al diseñar la persistencia.

No se crearán interfaces por ceremonia si no aportan una separación real.

---

## 13. Persistencia y consistencia

Las operaciones que conceptualmente requieren resultado todo-o-nada deberán confirmarse de forma consistente.

Ejemplo:

```text
Aceptar Invitacion
+
crear/reactivar UsuarioNegocio
```

debe producir:

```text
ambos cambios confirmados
```

o:

```text
ningún cambio confirmado
```

La arquitectura deberá ofrecer transacciones adecuadas.

No se congela todavía si se utilizará un patrón Unit of Work explícito o coordinación transaccional más simple.

---

## 14. Concurrencia

El sistema deberá asumir:

```text
múltiples usuarios
+
múltiples dispositivos
+
operaciones simultáneas
```

Las prevalidaciones no garantizan exclusión.

Persistencia y base de datos deberán colaborar para proteger:

- unicidades;
- cambios concurrentes;
- invariantes relevantes;
- lost updates;
- operaciones todo-o-nada.

Mecanismos posibles, según cada caso:

- constraints;
- transacciones;
- versionado optimista;
- locking;
- niveles de aislamiento.

No se define una única estrategia global antes de necesitarla.

---

## 15. Multi-tenancy

El sistema será multi-negocio.

`Negocio` representa el límite principal de aislamiento funcional.

Toda operación sobre recursos pertenecientes a un Negocio debe ejecutarse dentro del contexto de ese tenant.

Ejemplo correcto:

```text
buscar articulo dentro del Negocio actual
```

Ejemplo a evitar:

```text
buscar globalmente por id
+
confiar en el cliente para la autorización
```

Cuando sea posible, el scoping por Negocio deberá formar parte de las consultas de persistencia.

Los detalles se documentarán en:

```text
arquitectura/multitenant-y-seguridad.md
```

---

## 16. Autenticación y autorización

La identidad autenticada proviene del contexto seguro del backend.

No se confiará en:

```text
usuarioId
email
rol
negocioId autorizado
```

enviados por el cliente como prueba de identidad o permiso.

Conceptualmente:

```text
Autenticación
→ ¿quién es?
```

```text
Autorización
→ ¿puede realizar esta operación en este Negocio?
```

son responsabilidades distintas.

Inicialmente se prevé:

```text
credenciales
+
hash seguro de contraseña
+
token de acceso
```

La estrategia concreta se definirá en el documento de seguridad.

---

## 17. Manejo de errores

Se distinguirán al menos:

```text
errores de dominio
errores de aplicación
errores de autorización
errores de persistencia
errores de integraciones externas
```

Domain no devuelve códigos HTTP.

La frontera API traduce excepciones conocidas a respuestas HTTP adecuadas mediante handlers centralizados.

---

## 18. Testing

Testing forma parte estructural del desarrollo.

Framework principal:

```text
pytest
```

Los tests se dividirán progresivamente en:

```text
unit/domain
unit/application
integration/persistence
integration/api
e2e seleccionados
```

### 18.1 Prioridad inicial

El dominio debe poder probarse sin:

```text
FastAPI
PostgreSQL
Docker
HTTP
```

Ejemplos como:

```text
Negocio.incorporarOReactivarMiembro(...)
ArticuloCatalogo.aplicarEdicion(...)
```

deben poder probarse directamente como código Python.

No se buscará solamente cumplir el mínimo académico: se priorizarán invariantes, casos límite, operaciones inválidas y transiciones de estado.

---

## 19. Docker

La aplicación deberá ejecutarse de forma reproducible mediante Docker.

Configuración inicial prevista:

```text
docker compose
├── api
└── postgres
```

Solo se agregarán servicios adicionales cuando exista una necesidad concreta.

---

## 20. Integración continua

GitHub Actions ejecutará automáticamente al menos:

```text
instalación de dependencias
tests
```

También se recomienda incluir:

```text
lint
```

mediante una herramienta como `ruff`.

El proyecto genérico deberá tener un workflow propio, separado de workflows históricos de WALOS.

---

## 21. Patrones de diseño

Los patrones se utilizarán únicamente cuando resuelvan un problema real.

No se incorporarán patrones solo para cumplir formalmente la consigna académica.

Candidatos naturales:

### Repository

Separar casos de uso y dominio de la persistencia concreta.

### Adapter

Encapsular integraciones externas.

Ejemplo futuro:

```text
PasarelaPago
      ↑
MercadoPagoAdapter
```

### Strategy

Aplicable cuando existan algoritmos realmente intercambiables.

### Factory

Aplicable cuando la creación de implementaciones u objetos tenga variabilidad relevante.

### Observer

Podrá evaluarse cuando un mismo evento de negocio requiera notificar múltiples consumidores independientes.

Las decisiones definitivas se documentarán en:

```text
arquitectura/patrones-de-diseno.md
```

---

## 22. Pagos e integraciones externas

La materia exige incorporar pagos, pero esta integración no deberá contaminar M01/M02.

La arquitectura futura deberá permitir:

```text
Application
      ↓
abstracción de pago
      ↑
adapter concreto
```

Ejemplo:

```text
PasarelaPago
      ↑
MercadoPagoAdapter
```

y para tests:

```text
PasarelaPago
      ↑
FakePasarelaPago
```

No deberá ocurrir:

```text
Entidad Venta
    ↓
SDK Mercado Pago directamente
```

La integración concreta se diseñará en el bloque funcional correspondiente.

---

## 23. Configuración y secretos

Los datos sensibles o dependientes del entorno no se codifican directamente.

Ejemplos:

```text
DATABASE_URL
JWT_SECRET
credenciales
tokens externos
```

se obtendrán mediante configuración externa, normalmente variables de entorno.

No se versionarán secretos reales.

---

## 24. Principios generales de implementación

### Encapsulamiento

Las entidades protegen sus invariantes.

Evitar setters indiscriminados:

```text
setEstado(...)
setRol(...)
setPrecio(...)
```

Preferir operaciones con intención:

```text
desactivar()
reactivar()
aplicarEdicion(...)
cambiarRolMiembro(...)
```

### Responsabilidad única

Evitar clases que mezclen responsabilidades no relacionadas.

### Open/Closed

Permitir extensión cuando exista variabilidad real sin modificar continuamente código estable.

### Dependency Inversion

Las reglas de negocio no dependen de tecnologías concretas.

### Composición sobre herencia cuando corresponda

Se evitarán jerarquías profundas para representar diferencias de configuración.

El modelo:

```text
ArticuloCatalogo
+
CapacidadesArticulo
```

es preferible a una explosión de subclases por combinación de capacidades.

---

## 25. Evitar sobrearquitectura

No se introducirán preventivamente:

```text
microservicios
CQRS
Event Sourcing
Kafka
Redis
service mesh
múltiples bases de datos
Domain Events complejos
```

salvo requerimiento real.

La implementación inicial será un:

```text
monolito modular
```

Esto favorece:

- menor complejidad operativa;
- transacciones simples;
- testing accesible;
- despliegue sencillo;
- evolución posterior si fuera necesaria.

---

## 26. Estrategia de implementación incremental

Orden inicial recomendado:

```text
1. Domain Bloque 1
2. Tests de Domain
3. Persistencia
4. Migraciones
5. Application
6. API
7. Autenticación / autorización
8. Tests de integración y API
9. Docker
10. CI
```

El orden podrá adaptarse, pero Domain y sus tests deberán poder existir sin depender de HTTP o infraestructura.

---

## 27. Decisiones explícitamente diferidas

Todavía no se congelan:

- estructura exacta de contratos Repository;
- Unit of Work explícito o implícito;
- estrategia concreta de optimistic locking;
- estrategia completa de auditoría;
- almacenamiento de imágenes;
- proveedor de deployment;
- proveedor definitivo de pagos;
- refresh tokens;
- frontend;
- arquitectura de bloques posteriores;
- variantes avanzadas de catálogo.

Estas decisiones se tomarán cuando exista suficiente contexto.

---

## 28. Uso de ADR

Cuando aparezca una decisión significativa, transversal y costosa de revertir, podrá registrarse mediante ADR.

No toda decisión necesita un ADR.

Los ADR se reservarán para decisiones con impacto arquitectónico real.

---

## 29. Regla de evolución

La arquitectura evolucionará por necesidad comprobada.

El objetivo es mantener simultáneamente:

```text
dominio protegido
+
implementación simple
+
buena testabilidad
+
capacidad de extensión
```

sin introducir complejidad preventiva.

---

## 30. Estado del documento

Este documento establece la arquitectura técnica base.

Debe mantenerse coherente con:

```text
modelo de dominio
estructura del backend
persistencia
API
seguridad
testing
Docker
```

Los detalles específicos deben vivir en documentos especializados, evitando duplicación innecesaria.

El siguiente artefacto recomendado es:

```text
arquitectura/estructura-backend.md
```
