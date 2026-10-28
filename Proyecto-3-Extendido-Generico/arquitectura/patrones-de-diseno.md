# Patrones de Diseño

> **Estado:** versión de referencia para implementación y defensa académica.  
> **Alcance inicial:** Bloque 1 — Fundación.  
> **Objetivo:** establecer qué patrones, técnicas y principios se utilizan, qué problema resuelven y bajo qué condiciones se incorporarán.

---

## 1. Propósito

Este documento define el criterio de uso de patrones de diseño en `Proyecto-3-Extendido-Generico`.

La consigna académica exige aplicar al menos un patrón de diseño con utilidad real y justificar:

- dónde se utiliza;
- qué problema resuelve;
- por qué esa solución es adecuada;
- qué alternativa más simple o más acoplada se evita.

La regla general del proyecto será:

> **Primero se identifica un problema de diseño; después se selecciona un patrón que lo resuelva.**

No se introducirán clases, interfaces, jerarquías o abstracciones únicamente para poder mencionar un patrón durante la presentación.

---

## 2. Principios antes que patrones

Los patrones se aplicarán sobre principios de diseño ya adoptados:

- encapsulamiento;
- responsabilidad única;
- Open/Closed;
- Dependency Inversion;
- composición sobre herencia cuando corresponda;
- separación entre reglas de negocio y detalles técnicos;
- aislamiento de aquello que cambia;
- dependencias explícitas;
- testabilidad.

Los principios no son patrones y los patrones no sustituyen un buen modelo de dominio.

Una abstracción debe aportar al menos una mejora concreta en:

- claridad;
- mantenibilidad;
- extensibilidad;
- testabilidad;
- desacoplamiento;
- capacidad de sustitución;
- evolución del sistema.

---

## 3. Clasificación conceptual

Para evitar errores durante la implementación y la defensa, se distinguen cuatro categorías.

### 3.1 Patrones GoF

Patrones clásicos de diseño orientado a objetos.

#### Creacionales

```text
Factory Method
Abstract Factory
```

#### Estructurales

```text
Adapter
Decorator
Facade
```

#### De comportamiento

```text
Strategy
Observer
State
Template Method
Command
```

> **Nota:** “Factory” por sí solo es un término amplio. Cuando se afirme que se utiliza un patrón GoF deberá indicarse concretamente `Factory Method` o `Abstract Factory`. Una `Simple Factory` puede ser una técnica válida, pero no forma parte de los 23 patrones GoF.

### 3.2 Patrones arquitectónicos / de persistencia

No pertenecen necesariamente al catálogo GoF.

```text
Repository
Ports and Adapters
Unit of Work
Dependency Injection
```

### 3.3 Patrones tácticos de DDD

Conceptos utilizados para modelar el dominio.

```text
Entity
Value Object
Domain Service
Repository
```

`Repository` puede discutirse tanto desde DDD como desde persistencia/arquitectura según el contexto. En este proyecto se documentará principalmente como frontera entre Application y persistencia.

### 3.4 Principios de diseño

No son patrones.

```text
SOLID
Single Responsibility Principle
Open/Closed Principle
Dependency Inversion Principle
composición sobre herencia
encapsulamiento
```

La documentación final deberá mantener estas categorías diferenciadas.

---

## 4. Patrón principal futuro para integraciones: Adapter

### 4.1 Problema

El sistema deberá integrar proveedores externos.

El caso más evidente será pagos:

```text
Mercado Pago
otra pasarela futura
```

También podrían existir integraciones para:

- almacenamiento de archivos;
- notificaciones;
- canales externos;
- servicios de terceros.

Domain y Application no deberían depender directamente de:

- SDKs;
- endpoints HTTP de terceros;
- DTOs externos;
- códigos de error del proveedor;
- mecanismos particulares de autenticación externa.

### 4.2 Solución

Cuando exista la integración real se utilizará Adapter.

Conceptualmente:

```text
Application
    ↓
PasarelaPago
    ↑
MercadoPagoAdapter
```

Application conoce un contrato interno.

Infrastructure adapta el proveedor externo a ese contrato.

### 4.3 Beneficios

- desacopla proveedor y negocio;
- permite sustituir implementaciones;
- facilita testing;
- encapsula traducción de datos;
- encapsula errores externos;
- reduce impacto ante cambios de API.

### 4.4 Testing

```text
PasarelaPago
    ↑
FakePasarelaPago
```

permite probar casos de uso sin red ni dinero real.

### 4.5 Decisión temporal

No se creará todavía `PasarelaPago` durante el Bloque 1.

El contrato se incorporará cuando exista el primer caso de uso real de pagos.

---

## 5. Repository

### 5.1 Clasificación

Repository no es un patrón GoF.

Se utilizará como patrón de persistencia y como frontera arquitectónica entre Application e Infrastructure.

### 5.2 Problema

Application necesita recuperar y persistir objetos sin quedar acoplada a:

```text
SQLAlchemy
PostgreSQL
Session
queries SQL
```

### 5.3 Solución

Application dependerá de contratos orientados a los casos de uso.

```text
Application
        ↓
ArticuloCatalogoRepository
        ↑
SqlAlchemyArticuloCatalogoRepository
```

### 5.4 Contratos con intención

Se evitará un repositorio genérico inflado:

```text
GenericRepository<T>
├── create()
├── update()
├── delete()
├── get()
├── get_all()
└── filter()
```

cuando no exprese necesidades reales.

Se preferirán operaciones como:

```text
buscar_por_id_en_negocio(...)
buscar_membresia_historica(...)
existe_nombre_equivalente_en_negocio(...)
existe_sku_equivalente_en_negocio(...)
```

### 5.5 Multi-tenancy

Cuando el contexto tenant sea obligatorio, la propia operación deberá expresarlo.

Preferir:

```text
buscar_por_id_en_negocio(articulo_id, negocio_id)
```

sobre:

```text
buscar_por_id(articulo_id)
```

seguido de autorización tardía.

### 5.6 Beneficios

- menor acoplamiento;
- casos de uso testeables con fakes;
- consultas centralizadas;
- scoping multi-tenant explícito;
- persistencia reemplazable.

---

## 6. Ports mediante typing.Protocol

Para los ports consumidos por Application se utilizará preferentemente:

```python
typing.Protocol
```

### 6.1 Motivo

Python permite subtipado estructural.

Una clase concreta puede satisfacer un `Protocol` por su forma y comportamiento sin heredar explícitamente de él.

Ejemplo conceptual:

```python
from typing import Protocol

class ArticuloRepository(Protocol):
    def buscar_por_id_en_negocio(self, articulo_id, negocio_id):
        ...
```

Una implementación de Infrastructure:

```python
class SqlAlchemyArticuloRepository:
    ...
```

puede satisfacer ese contrato sin heredar de `ArticuloRepository`.

Lo mismo ocurre con un fake de tests.

### 6.2 Beneficios

- menor acoplamiento por herencia;
- contratos explícitos;
- buen soporte de type checkers;
- fakes simples;
- estilo idiomático de Python.

### 6.3 runtime_checkable

No se utilizará `@runtime_checkable` por defecto.

Los `Protocol` se utilizarán principalmente para chequeo estático.

Solo se habilitarán comprobaciones con `isinstance()` si aparece una necesidad concreta.

---

## 7. Dependency Injection

### 7.1 Application: inyección Python normal

Los casos de uso recibirán sus colaboradores mediante constructor.

Ejemplo:

```python
class EditarArticuloUseCase:
    def __init__(
        self,
        articulos: ArticuloRepository,
        categorias: CategoriaRepository,
    ) -> None:
        self._articulos = articulos
        self._categorias = categorias
```

El caso de uso no construye directamente implementaciones concretas.

Incorrecto:

```python
class EditarArticuloUseCase:
    def __init__(self):
        self._articulos = SqlAlchemyArticuloRepository(...)
```

### 7.2 API: FastAPI Depends

`fastapi.Depends()` se utilizará únicamente en la frontera HTTP para resolver dependencias.

Conceptualmente:

```text
FastAPI router
      ↓ Depends()
Composition Root
      ↓
EditarArticuloUseCase
      ↓
ports
```

Application no importa FastAPI ni conoce `Depends()`.

### 7.3 Composition Root

La construcción de dependencias concretas se concentrará cerca de:

```text
api/dependencies/
main.py
```

No se utilizará inicialmente un container de DI externo.

---

## 8. Unit of Work

### 8.1 Problema

Algunos casos de uso necesitan persistir múltiples cambios como una única operación atómica.

Ejemplo:

```text
AceptarInvitacion
├── aceptar InvitacionNegocio
└── crear/reactivar UsuarioNegocio
```

El resultado correcto es:

```text
todo confirmado
o
nada confirmado
```

### 8.2 SQLAlchemy Session

SQLAlchemy `Session` ya implementa comportamiento asociado al patrón Unit of Work:

- mantiene cambios pendientes;
- realiza `flush`;
- participa en una transacción;
- permite `commit`;
- permite `rollback`.

Por lo tanto, no se creará automáticamente:

```text
CustomUnitOfWork
```

solo por seguir una plantilla arquitectónica.

### 8.3 Límite arquitectónico

Aunque `Session` provea ese comportamiento, continúa siendo una dependencia de Infrastructure.

Application no deberá importar:

```python
from sqlalchemy.orm import Session
```

El límite transaccional podrá resolverse mediante:

```text
A. coordinación de Session desde Infrastructure / Composition Root

o, si aporta valor,

B. un port UnitOfWork consumido por Application
```

La elección se tomará cuando implementemos los primeros casos de uso transaccionales.

### 8.4 Regla

La abstracción explícita de Unit of Work solo se agregará si:

- reduce acoplamiento;
- hace visible un límite transaccional importante;
- simplifica tests;
- evita repetir coordinación transaccional.

---

## 9. Strategy

Strategy se considerará cuando exista:

```text
misma responsabilidad
+
múltiples algoritmos intercambiables
+
variación esperable
```

Ejemplos futuros:

- selección de lotes;
- política de promociones;
- cálculo de costos;
- estrategias de conciliación;
- políticas de asignación.

No se utilizará Strategy para disfrazar una invariante sencilla.

Ejemplo:

```text
SERVICIO no controla stock
```

es una regla de dominio, no una Strategy.

---

## 10. Factory Method / Abstract Factory

Se evaluarán cuando la creación de objetos o familias de objetos tenga variabilidad real.

Ejemplos futuros:

- seleccionar una pasarela según configuración;
- construir integraciones por proveedor;
- crear estrategias relacionadas.

No se utilizará Factory para reemplazar constructores simples.

```python
Email(...)
```

no necesita una Factory.

Si solo se utiliza una función o clase auxiliar de construcción, se documentará como `Simple Factory` y no como patrón GoF.

---

## 11. Observer

Observer podrá ser útil si un evento debe notificar múltiples consumidores independientes.

Ejemplo futuro:

```text
PagoConfirmado
├── actualizar pedido
├── registrar movimiento de caja
├── notificar
└── auditar
```

### Riesgos

- flujo implícito;
- efectos secundarios ocultos;
- orden de ejecución difícil de visualizar;
- debugging más complejo.

### Bloque 1

No existe actualmente una necesidad suficiente para introducir Observer.

Los flujos de M01/M02 permanecerán explícitos.

---

## 12. Decorator

Decorator permite agregar responsabilidades dinámicamente manteniendo la misma interfaz del componente decorado.

Podría tener sentido en infraestructura técnica:

```text
ServicioExterno
    ↓
RetryDecorator
    ↓
LoggingDecorator
```

si la necesidad aparece.

### CapacidadesArticulo NO es Decorator

```text
ArticuloCatalogo
+
CapacidadesArticulo
```

utiliza composición.

`CapacidadesArticulo` es un Value Object de configuración y no un wrapper dinámico que implemente la misma interfaz del objeto decorado.

Durante la defensa no se deberá clasificar este diseño como Decorator.

---

## 13. Entity y Value Object

Son conceptos tácticos de DDD, no patrones GoF.

### Entity

Posee identidad estable a lo largo de su ciclo de vida.

Ejemplos:

```text
Usuario
Negocio
UsuarioNegocio
InvitacionNegocio
Categoria
ArticuloCatalogo
```

### Value Object

Se define por su valor y no por identidad propia.

Ejemplos:

```text
Email
CapacidadesArticulo
```

Características buscadas:

- igualdad por valor;
- invariantes propias;
- ausencia de identidad;
- preferencia por inmutabilidad cuando resulte natural.

---

## 14. Domain Service

Domain Service es un patrón táctico de DDD.

Solo se introducirá cuando exista comportamiento de dominio que:

- no pertenezca naturalmente a una entidad o Value Object;
- involucre varios conceptos del dominio;
- siga siendo independiente de infraestructura.

No se utilizará como contenedor genérico.

Evitar:

```text
NegocioService
CatalogoService
UsuarioService
```

si solo concentran métodos sin una responsabilidad coherente.

---

## 15. Composición sobre herencia

La composición será preferida cuando las características puedan combinarse independientemente.

Ejemplo actual:

```text
ArticuloCatalogo
    |
    +-- CapacidadesArticulo
        ├── esComprable
        ├── esVendible
        ├── controlaStock
        ├── controlaVencimiento
        ├── puedeUsarseEnProduccion
        └── permiteDescuento
```

Esto evita una jerarquía combinatoria:

```text
Articulo
├── ArticuloComprable
├── ArticuloVendible
├── ArticuloComprableVendible
├── ArticuloInventariableVendible
├── ServicioVendible
└── ...
```

Composición sobre herencia es un principio de diseño, no una aplicación automática de Decorator.

---

## 16. State

El dominio contiene estados:

```text
InvitacionNegocio
UsuarioNegocio
ArticuloCatalogo
```

Esto no implica utilizar el patrón GoF State.

Actualmente:

- hay pocos estados;
- las transiciones son claras;
- las reglas son manejables dentro de las entidades.

Por eso se utilizarán enums y métodos de dominio.

Crear:

```text
PendingInvitationState
AcceptedInvitationState
RejectedInvitationState
...
```

agregaría complejidad sin beneficio suficiente.

State podrá reevaluarse si el comportamiento específico por estado crece significativamente.

---

## 17. Template Method

No se prevé su uso en Bloque 1.

Solo se evaluará si aparece:

- una secuencia estable;
- pasos variables;
- una relación por herencia que aporte valor real.

No se introducirá preventivamente.

---

## 18. Command

Application puede utilizar nombres como:

```text
EditarArticuloCommand
CrearNegocioCommand
```

para DTOs que expresen intención.

Eso no significa implementar automáticamente el patrón GoF Command.

Para afirmar que existe Command deberían aparecer necesidades como:

- una petición encapsulada como objeto ejecutable;
- invocadores desacoplados;
- colas;
- almacenamiento/reintento;
- undo/redo;

u otra motivación concreta.

El nombre `Command` por sí solo no demuestra el patrón.

---

## 19. Facade

Un router FastAPI no es automáticamente una Facade.

Facade solo se utilizará si existe un subsistema complejo al que deliberadamente se ofrece una interfaz simplificada.

No hay una necesidad actual en Bloque 1.

---

## 20. Singleton

No se utilizará Singleton como acceso global para:

```text
Session
repositories
configuración
servicios
```

El estado global dificulta:

- tests;
- aislamiento;
- concurrencia;
- configuración por entorno.

Se utilizarán dependencias explícitas y ciclos de vida controlados.

---

## 21. Service Locator

No se utilizará un Service Locator global.

Evitar:

```python
Services.get("articulo_repository")
```

Oculta dependencias y dificulta testing y análisis estático.

La inyección será explícita.

---

## 22. Active Record

Las entidades de dominio no utilizarán Active Record.

Evitar:

```python
articulo.save()
articulo.delete()
ArticuloCatalogo.query(...)
```

cuando estas operaciones mezclen dominio y persistencia.

La persistencia se realizará mediante Repository/Infrastructure.

---

## 23. Errores e integraciones

Los Adapter deberán traducir errores específicos del proveedor a errores internos significativos.

Ejemplo futuro:

```text
MercadoPagoTimeout
        ↓
MercadoPagoAdapter
        ↓
PagoTemporalmenteNoDisponible
```

Application no debe quedar acoplada a excepciones privadas de un SDK externo.

Repository aplicará el mismo criterio cuando resulte necesario para no filtrar detalles irrelevantes de SQLAlchemy.

---

## 24. Patrones y tests

Una abstracción debe facilitar tests cuando ese sea uno de sus objetivos.

Ejemplo:

```text
AceptarInvitacionUseCase
        ↓
InvitacionRepository
        ↑
FakeInvitacionRepository
```

y, en un bloque posterior:

```text
ProcesarPagoUseCase
        ↓
PasarelaPago
        ↑
FakePasarelaPago
```

Los fakes deberán satisfacer los mismos `Protocol` de Application sin necesitar herencia explícita.

---

## 25. Evitar abstracciones prematuras

Regla:

> **No crear una abstracción hasta que exista una dependencia, variación o responsabilidad real que necesite ser aislada.**

Ejemplos:

- no Factory para una construcción trivial;
- no Strategy para una única variante;
- no Observer sin múltiples consumidores;
- no Adapter sin proveedor externo;
- no State para tres estados simples;
- no Custom UnitOfWork si `Session` y una coordinación sencilla resuelven correctamente el límite transaccional.

Esto no significa postergar diseño hasta tener código inmantenible.

Significa diseñar con evidencia.

---

## 26. Open/Closed sin dogmatismo

Open/Closed no significa que el código existente nunca pueda modificarse.

El objetivo es evitar que cada nueva variante requiera modificar continuamente componentes estables.

Se permitirá refactorizar cuando:

- mejore el modelo;
- reduzca complejidad;
- corrija una abstracción incorrecta;
- elimine deuda técnica.

No se conservará una mala abstracción únicamente para evitar modificarla.

---

## 27. Ejemplo de patronitis

Diseño a evitar:

```text
ArticuloFactory
    ↓
ArticuloStrategy
    ↓
ArticuloDecorator
    ↓
ArticuloObserver
    ↓
ArticuloRepository
```

sin un problema concreto detrás de cada elemento.

Esto aumenta:

- cantidad de clases;
- navegación;
- puntos de fallo;
- carga cognitiva;
- dificultad para el equipo;
- dificultad para implementación asistida por IA.

La cantidad de patrones no es una métrica de calidad.

---

## 28. Patrones previstos por etapa

### Bloque 1 — aplicación efectiva esperada

```text
Repository
Dependency Injection
Entity
Value Object
composición
typing.Protocol para ports
```

### Bloque 1 — posible según necesidad real

```text
Unit of Work explícito
Domain Service
```

### Bloques posteriores

```text
Adapter
Strategy
Factory Method / Abstract Factory
Observer
Decorator
```

solo cuando exista el problema correspondiente.

---

## 29. Criterios para introducir un patrón

Antes de incorporar un patrón se responderá:

1. ¿Qué problema concreto existe?
2. ¿Qué responsabilidad está variando?
3. ¿Qué parte debe permanecer estable?
4. ¿Existe más de una implementación o algoritmo real?
5. ¿Reduce acoplamiento o complejidad?
6. ¿Facilita testing?
7. ¿Existe una solución más simple?
8. ¿El costo conceptual se justifica?
9. ¿Podemos defender por qué está ahí?

Si no existe una respuesta clara, el patrón probablemente sea prematuro.

---

## 30. Documentación en código

No se agregarán comentarios del tipo:

```python
# Strategy Pattern
```

solo para etiquetar código.

El diseño debe poder reconocerse por:

- nombres;
- contratos;
- estructura;
- responsabilidades.

La documentación explicará el patrón donde aporte contexto.

---

## 31. Presentación académica

La presentación final mencionará únicamente patrones realmente implementados.

### Ejemplo: Repository

**Dónde:** persistencia de M01/M02.

**Problema:** evitar que Application dependa de SQLAlchemy/PostgreSQL.

**Solución:** ports `Protocol` + implementaciones SQLAlchemy.

**Beneficio:** fakes en tests y consultas tenant-scoped centralizadas.

### Ejemplo futuro: Adapter

Solo se presentará si existe la integración de pagos.

**Dónde:** módulo de pagos.

**Problema:** desacoplar casos de uso del proveedor externo.

**Solución:** port interno + `MercadoPagoAdapter`.

**Beneficio:** sustitución del proveedor y tests sin acceso externo.

---

## 32. Relación con otros documentos

Este documento complementa:

```text
arquitectura-general.md
estructura-backend.md
```

- `arquitectura-general.md` define capas y dirección de dependencias.
- `estructura-backend.md` define la ubicación física.
- este documento define cuándo y por qué introducir patrones y abstracciones.

Las reglas de seguridad y aislamiento tenant se detallarán en:

```text
multitenant-y-seguridad.md
```

---

## 33. Decisiones congeladas

Para la implementación actual quedan definidas:

1. Domain no depende de frameworks.
2. Los casos de uso reciben dependencias por constructor.
3. FastAPI `Depends()` se utiliza solo en la frontera API/composition root.
4. Los ports de Application se expresarán preferentemente con `typing.Protocol`.
5. Repository será específico a necesidades reales y no un CRUD genérico obligatorio.
6. SQLAlchemy `Session` aporta comportamiento Unit of Work, por lo que no se creará un UoW propio sin una necesidad demostrable.
7. `CapacidadesArticulo` no es Decorator.
8. Los enums de estado no implican el patrón State.
9. Value Object y Domain Service se clasificarán como patrones tácticos de DDD.
10. Los patrones futuros no se implementarán antes de que aparezca el problema real.

---

## 34. Decisiones diferidas

Permanecen abiertas:

- necesidad de un Unit of Work explícito;
- Domain Services concretos;
- Adapter concreto de pagos;
- Strategy concretas;
- Factory Method / Abstract Factory concretos;
- Observer/eventos;
- Decorators técnicos.

Se decidirán cuando aparezca la necesidad funcional o técnica correspondiente.

---

## 35. Criterio de aceptación

El uso de un patrón será considerado correcto si:

1. resuelve un problema identificable;
2. tiene una responsabilidad clara;
3. reduce acoplamiento o complejidad;
4. no duplica reglas del dominio;
5. mejora o preserva testabilidad;
6. no fuerza herencia innecesaria;
7. no agrega capas vacías;
8. puede justificarse claramente en la defensa;
9. su eliminación empeoraría de forma tangible el diseño.

---

## 36. Próximo documento

El siguiente documento de arquitectura es:

```text
arquitectura/multitenant-y-seguridad.md
```

Allí se definirán:

- autenticación;
- autorización;
- hashing de contraseñas;
- tokens;
- pertenencia a `Negocio`;
- tenant scoping;
- protección contra IDOR;
- roles y membresías;
- aislamiento entre negocios;
- criterios de seguridad para API y repositorios.
