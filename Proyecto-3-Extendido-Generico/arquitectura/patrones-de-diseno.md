# Patrones de Diseño

> **Estado:** lineamientos de diseño para la implementación del proyecto.  
> **Alcance inicial:** Bloque 1 — Fundación.  
> **Objetivo:** documentar qué patrones y principios se aplicarán, por qué se aplicarán y, especialmente, cuáles no se introducirán sin una necesidad concreta.

---

## 1. Propósito

Este documento define el criterio de uso de patrones de diseño en `Proyecto-3-Extendido-Generico`.

La consigna académica exige aplicar al menos un patrón de diseño con sentido y poder justificar:

- dónde se utiliza;
- qué problema resuelve;
- por qué esa solución es adecuada;
- qué alternativas se descartaron.

El proyecto no utilizará patrones como decoración arquitectónica.

La regla general será:

> **Primero se identifica un problema de diseño; luego se selecciona un patrón que lo resuelva.**

No se crearán clases, interfaces o jerarquías únicamente para poder mencionar un patrón en la defensa.

---

## 2. Principios antes que patrones

Los patrones se apoyarán sobre principios de diseño ya adoptados:

- encapsulamiento;
- responsabilidad única;
- Open/Closed;
- inversión de dependencias;
- composición sobre herencia cuando corresponda;
- separación entre reglas de negocio y detalles técnicos;
- programar contra contratos cuando exista variabilidad real;
- aislar aquello que cambia.

Los patrones no sustituyen estos principios.

Un patrón bien aplicado debe mejorar al menos alguna de estas propiedades:

- claridad;
- mantenibilidad;
- extensibilidad;
- testabilidad;
- desacoplamiento;
- reutilización;
- capacidad de evolución.

---

## 3. Clasificación utilizada

Se distinguirán explícitamente tres categorías para evitar confusiones en documentación y defensa.

### 3.1 Patrones GoF

Patrones clásicos de diseño orientado a objetos, clasificados en:

```text
Creacionales
Estructurales
De comportamiento
```

Ejemplos relevantes para el proyecto:

```text
Factory Method
Decorator
Observer
Strategy
Adapter
```

### 3.2 Patrones arquitectónicos / de aplicación

No pertenecen necesariamente al catálogo GoF, pero resuelven problemas estructurales de software.

Ejemplos:

```text
Repository
Ports and Adapters
Unit of Work
Dependency Injection
```

### 3.3 Principios de diseño

No son patrones.

Ejemplos:

```text
SOLID
Open/Closed
Dependency Inversion
Single Responsibility
```

La documentación y la presentación deberán distinguir estas categorías correctamente.

---

## 4. Patrón principal previsto: Adapter

### 4.1 Problema

El sistema deberá integrar proveedores externos, especialmente pagos.

Ejemplos futuros:

```text
Mercado Pago
otro proveedor de pagos
almacenamiento de archivos
notificaciones
```

El dominio y los casos de uso no deberían depender directamente de:

- SDKs;
- endpoints externos;
- formatos de respuesta de terceros;
- excepciones propias del proveedor;
- detalles de autenticación de una API externa.

### 4.2 Solución

Se utilizará Adapter cuando exista una integración concreta.

Conceptualmente:

```text
Application
    ↓
PasarelaPago
    ↑
MercadoPagoAdapter
```

Application trabajará contra una abstracción interna.

Infrastructure contendrá la implementación específica del proveedor.

### 4.3 Beneficios

- desacopla proveedor y negocio;
- permite sustituir proveedor;
- facilita testing;
- evita propagar DTOs externos;
- encapsula traducción de errores;
- permite mocks/fakes;
- reduce impacto ante cambios de API.

### 4.4 Ejemplo de testing

```text
PasarelaPago
    ↑
FakePasarelaPago
```

El caso de uso podrá probarse sin realizar pagos reales.

### 4.5 Regla importante

No se creará `PasarelaPago` durante Bloque 1 únicamente como preparación futura.

El contrato se incorporará cuando aparezca el primer caso de uso que necesite pagos.

---

## 5. Repository

### 5.1 Categoría

Repository se documentará como patrón de persistencia/arquitectura, no como patrón GoF.

### 5.2 Problema

Application necesita recuperar y persistir entidades sin quedar acoplada a:

```text
SQLAlchemy
PostgreSQL
Session
queries SQL
```

### 5.3 Solución

Application utilizará contratos orientados a las necesidades reales de los casos de uso.

Ejemplo:

```text
Application
        ↓
ArticuloCatalogoRepository
        ↑
SqlAlchemyArticuloCatalogoRepository
```

### 5.4 Criterio de diseño

Los repositorios no serán CRUD genéricos por defecto.

Evitar:

```text
GenericRepository<T>
├── create()
├── update()
├── delete()
├── get()
├── get_all()
└── filter()
```

si esa abstracción no expresa el lenguaje del sistema.

Preferir operaciones con intención:

```text
buscar_por_id_en_negocio(...)
buscar_membresia_historica(...)
existe_nombre_equivalente_en_negocio(...)
existe_sku_equivalente_en_negocio(...)
```

### 5.5 Beneficios

- persistencia reemplazable;
- casos de uso testeables mediante fakes;
- queries centralizadas;
- menor acoplamiento;
- aislamiento multi-tenant más fácil de reforzar.

---

## 6. Strategy

### 6.1 Cuándo aplicar

Strategy será considerada cuando aparezcan algoritmos intercambiables que implementen la misma responsabilidad.

Ejemplos posibles en módulos futuros:

- política de selección de lotes;
- política de promociones;
- cálculo de costos;
- reglas de asignación;
- estrategia de conciliación;
- estrategia de pago si existe variabilidad real.

### 6.2 Cuándo no aplicar

No se creará una Strategy para reemplazar un simple `if` que:

- tiene pocas variantes;
- no cambia;
- es una invariante del dominio;
- resulta más clara directamente en la entidad.

Ejemplo:

```text
SERVICIO no controla stock
```

es una regla de dominio, no una Strategy.

### 6.3 Señal de incorporación

Strategy aparece cuando:

```text
misma responsabilidad
+
múltiples algoritmos sustituibles
+
variación esperable
```

---

## 7. Factory Method / Factory

### 7.1 Problema que puede resolver

La creación de algunos objetos puede requerir decidir una implementación concreta sin exponer esa decisión al consumidor.

Ejemplos futuros:

```text
crear adaptador de pago según proveedor configurado
crear estrategia según política seleccionada
crear integración según canal
```

### 7.2 Regla

No se utilizará una Factory para cada constructor.

Un constructor simple:

```python
Email(...)
```

no necesita Factory.

### 7.3 Uso probable

Si el sistema soporta en el futuro múltiples pasarelas:

```text
PaymentProviderFactory
    ├── MercadoPagoAdapter
    └── OtroProveedorAdapter
```

podría ser justificable.

La necesidad se evaluará cuando exista más de una implementación real o una construcción suficientemente compleja.

---

## 8. Observer

### 8.1 Problema que puede resolver

Un evento puede necesitar disparar múltiples reacciones independientes.

Ejemplo futuro:

```text
PagoConfirmado
├── actualizar estado del pedido
├── registrar movimiento de caja
├── emitir notificación
└── registrar auditoría
```

Observer puede desacoplar el emisor de los receptores.

### 8.2 Riesgo

Observer puede introducir:

- flujo implícito;
- debugging difícil;
- orden de ejecución poco claro;
- efectos secundarios escondidos.

Por eso no se adoptará preventivamente.

### 8.3 Bloque 1

No existe por ahora una necesidad suficientemente fuerte para introducir Observer en M01/M02.

Los flujos críticos deberán permanecer explícitos.

---

## 9. Decorator

### 9.1 Problema que resuelve

Decorator permite agregar comportamiento adicional a un objeto sin modificar su clase base y sin crear una explosión de subclases.

### 9.2 Posibles aplicaciones futuras

Podría evaluarse para responsabilidades realmente componibles, por ejemplo:

```text
ServicioBase
    ↓
LoggingDecorator
    ↓
RetryDecorator
    ↓
MetricsDecorator
```

en integraciones técnicas.

### 9.3 No aplicarlo al catálogo solo por similitud conceptual

El modelo:

```text
ArticuloCatalogo
+
CapacidadesArticulo
```

utiliza composición, pero no significa que sea una implementación del patrón Decorator.

Las capacidades representan configuración de negocio.

No envuelven dinámicamente un objeto para añadir comportamiento siguiendo la interfaz del componente decorado.

Por lo tanto, en la defensa no se deberá llamar "Decorator" a `CapacidadesArticulo`.

---

## 10. Dependency Injection

### 10.1 Categoría

Se trata como técnica/patrón arquitectónico de composición de dependencias.

### 10.2 Aplicación

Los casos de uso recibirán sus colaboradores desde afuera.

Ejemplo conceptual:

```python
class EditarArticuloUseCase:
    def __init__(self, articulos, categorias):
        self._articulos = articulos
        self._categorias = categorias
```

El caso de uso no construye:

```python
SqlAlchemyArticuloCatalogoRepository(...)
```

por sí mismo.

### 10.3 Composition Root

La composición concreta se realizará cerca de la frontera:

```text
FastAPI dependencies
+
main.py
```

No se incorporará inicialmente un container de DI externo.

---

## 11. Unit of Work

### 11.1 Estado

Patrón candidato, **no congelado**.

### 11.2 Problema

Algunos casos de uso modifican múltiples objetos dentro de una única unidad atómica.

Ejemplo:

```text
AceptarInvitacion
├── aceptar InvitacionNegocio
└── crear/reactivar UsuarioNegocio
```

### 11.3 Alternativas

Se evaluarán:

```text
A. Session SQLAlchemy coordinada desde Application/Infrastructure
B. UnitOfWork explícito
```

La decisión se tomará cuando se diseñen transacciones reales.

No se agregará una abstracción Unit of Work únicamente por seguir una plantilla de Clean Architecture.

---

## 12. Domain Services

Domain Service no será utilizado como contenedor genérico de lógica.

Solo se introducirá cuando exista una operación de dominio que:

- no pertenezca naturalmente a una entidad;
- involucre varios conceptos de dominio;
- siga siendo independiente de infraestructura.

Evitar:

```text
NegocioService
CatalogoService
UsuarioService
```

como clases que acumulen operaciones sin cohesión.

Primero se intentará colocar el comportamiento en las entidades correspondientes.

---

## 13. Value Object

Aunque Value Object suele considerarse patrón/modelo táctico de DDD más que GoF, es relevante en el diseño.

Ejemplo actual:

```text
Email
CapacidadesArticulo
```

Características buscadas:

- igualdad por valor;
- ausencia de identidad propia;
- invariantes protegidas;
- preferencia por inmutabilidad cuando corresponda.

Ejemplo:

```text
Email(" Test@Example.com ")
```

debe permitir centralizar las reglas de normalización/equivalencia definidas para el dominio.

---

## 14. Composición sobre herencia

El sistema favorecerá composición cuando las características puedan combinarse de forma independiente.

Ejemplo correcto:

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

Evita una jerarquía del tipo:

```text
Articulo
├── ArticuloComprable
├── ArticuloVendible
├── ArticuloComprableVendible
├── ArticuloInventariableVendible
├── ServicioVendible
└── ...
```

Esto reduce explosión combinatoria y rigidez.

---

## 15. Template Method

No se prevé utilizar Template Method inicialmente.

La herencia de algoritmos base no aparece como necesidad clara en Bloque 1.

Si más adelante surge un proceso con:

- secuencia estable;
- pasos variables;
- polimorfismo por herencia realmente útil;

se podrá evaluar.

No se adoptará antes de ese punto.

---

## 16. Command

Los DTOs de Application podrán llamarse `*Command` cuando representen una intención de modificación.

Ejemplo:

```text
EditarArticuloCommand
```

Esto no implica necesariamente implementar el patrón GoF Command.

Para afirmar que se aplica Command deberían existir elementos como:

- encapsulación explícita de una petición como objeto ejecutable;
- invocadores desacoplados;
- colas;
- undo/redo;
- almacenamiento/reintento de comandos;

u otra razón real.

La nomenclatura `Command` por sí sola no demuestra el patrón.

---

## 17. Facade

FastAPI routers no serán denominados Facade automáticamente.

Una fachada existe si proporciona una interfaz simplificada sobre un subsistema complejo.

Si aparece una integración o subsistema con múltiples componentes y una interfaz interna deliberadamente simplificada, Facade podrá evaluarse.

No existe necesidad actual.

---

## 18. Singleton

No se utilizará Singleton como patrón de acceso global para:

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

La vida de los objetos se resolverá mediante composición y dependencias explícitas.

---

## 19. Service Locator

No se utilizará un Service Locator global.

Ejemplo a evitar:

```python
Services.get("articulo_repository")
```

desde cualquier parte del sistema.

Oculta dependencias y dificulta tests.

Se preferirá inyección explícita.

---

## 20. Active Record

No se utilizará Active Record como modelo del dominio.

Ejemplo a evitar:

```python
articulo.save()
articulo.delete()
ArticuloCatalogo.query(...)
```

si esas operaciones mezclan entidad de dominio y persistencia.

La persistencia será responsabilidad de repositorios/Infrastructure.

---

## 21. Patrón State

M01 y M02 contienen estados:

```text
InvitacionNegocio
UsuarioNegocio
ArticuloCatalogo
```

Sin embargo, no se implementará automáticamente el patrón GoF State.

Actualmente los estados tienen:

- pocos valores;
- transiciones claras;
- reglas manejables dentro de las entidades.

Usar clases como:

```text
PendingInvitationState
AcceptedInvitationState
RejectedInvitationState
...
```

agregaría complejidad sin beneficio suficiente.

Los enums y métodos de dominio son preferibles por ahora.

Si el comportamiento por estado crece sustancialmente, podrá reevaluarse.

---

## 22. Pattern matching y enums no son patrones

El uso de:

```python
match estado:
    ...
```

o enums no significa automáticamente aplicar Strategy o State.

La documentación deberá justificar patrones por estructura y responsabilidad, no por sintaxis superficial.

---

## 23. Patrones en Bloque 1

Para la primera implementación, los patrones/técnicas con aplicación más probable son:

### Aplicación efectiva

```text
Repository
Dependency Injection
Value Object
composición
```

### Posibles según implementación

```text
Unit of Work
```

### Diferidos a módulos futuros

```text
Adapter
Strategy
Factory
Observer
Decorator
```

Esto es deliberado.

Bloque 1 no debe llenarse de patrones cuya necesidad pertenece a pagos, inventario u otras extensiones.

---

## 24. Patrones y tests

Los patrones elegidos deberán mejorar el testing.

Ejemplo:

```text
AceptarInvitacionUseCase
        ↓
InvitacionRepository
        ↑
FakeInvitacionRepository
```

permite probar Application sin PostgreSQL.

Otro ejemplo futuro:

```text
ProcesarPagoUseCase
        ↓
PasarelaPago
        ↑
FakePasarelaPago
```

permite probar pagos sin red ni dinero real.

Si una abstracción no mejora claridad, testabilidad o capacidad de sustitución, se deberá cuestionar su necesidad.

---

## 25. Patrones y multi-tenancy

Repository debe colaborar con el aislamiento multi-tenant.

Preferir:

```text
buscar_por_id_en_negocio(articulo_id, negocio_id)
```

sobre:

```text
buscar_por_id(articulo_id)
```

cuando el contexto de negocio es obligatorio.

El patrón no debe ocultar las reglas de seguridad.

---

## 26. Patrones y errores

Los adaptadores externos deberán traducir errores del proveedor a errores internos significativos.

Ejemplo futuro:

```text
MercadoPagoTimeout
        ↓ Adapter
PagoTemporalmenteNoDisponible
```

Application no debería quedar acoplada a excepciones propias del SDK.

Del mismo modo, Repository deberá evitar propagar detalles irrelevantes de SQLAlchemy cuando exista una traducción interna más adecuada.

---

## 27. Evitar abstracciones prematuras

Se aplicará la regla:

```text
No crear una abstracción
hasta tener una variación o dependencia real
que necesite ser aislada.
```

Ejemplos:

- no Factory para una única clase trivial;
- no Strategy para una sola implementación;
- no Observer sin múltiples consumidores;
- no Adapter sin integración externa;
- no UnitOfWork abstracto si la sesión simple resuelve el problema correctamente.

Esto no significa esperar a tener código inmantenible.

Significa diseñar con evidencia.

---

## 28. Evitar sobreuso de interfaces

Python utiliza duck typing y Protocols.

No es necesario crear una ABC para toda clase.

Cuando se necesite un contrato, se evaluará:

```text
typing.Protocol
ABC
interfaz implícita
```

según el caso.

Para ports de Application, `Protocol` es un candidato fuerte porque:

- expresa tipado estructural;
- facilita fakes;
- reduce herencia accidental.

La elección se congelará al escribir los primeros contratos reales.

---

## 29. Regla de extensibilidad

Un buen uso de Open/Closed no significa que nunca pueda modificarse código existente.

Significa evitar que cada nueva variante obligue a editar continuamente código estable y probado.

Se permitirá refactorizar cuando:

- mejore el modelo;
- reduzca complejidad;
- corrija una abstracción incorrecta.

No se mantendrán abstracciones malas únicamente por "cerrar" clases a cambios.

---

## 30. Ejemplo de mala aplicación de patrones

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

sin que cada elemento resuelva un problema real.

Esto produce:

- más archivos;
- mayor dificultad de navegación;
- más puntos de falla;
- mayor carga cognitiva;
- menor claridad para el equipo y para IA.

La cantidad de patrones no es una métrica de calidad.

---

## 31. Criterios para incorporar un patrón

Antes de incorporar un patrón se responderá:

1. ¿Qué problema concreto existe?
2. ¿Qué parte del sistema cambia?
3. ¿Qué parte debe permanecer estable?
4. ¿El patrón reduce acoplamiento o complejidad?
5. ¿Facilita tests?
6. ¿Existe una solución más simple?
7. ¿El costo conceptual se justifica?
8. ¿Podemos explicar su utilidad en la defensa?

Si no existe una respuesta clara, el patrón probablemente sea prematuro.

---

## 32. Documentación en código

No se agregarán comentarios como:

```python
# Strategy Pattern
```

solo para etiquetar una clase.

El diseño debe ser reconocible por:

- nombres;
- contratos;
- estructura;
- responsabilidades.

La documentación técnica explicará el patrón cuando sea relevante.

---

## 33. Patrones previstos para la presentación académica

La presentación final deberá utilizar únicamente patrones que efectivamente estén implementados.

Ejemplo de defensa futura:

### Repository

**Dónde:** acceso a persistencia de M01/M02.

**Problema:** desacoplar Application de SQLAlchemy/PostgreSQL.

**Resultado:** casos de uso testeables mediante fakes y consultas tenant-scoped centralizadas.

### Adapter

Solo se presentará si existe realmente la integración de pagos.

**Dónde:** módulo de pagos.

**Problema:** desacoplar casos de uso del SDK/API de Mercado Pago.

**Resultado:** proveedor intercambiable y tests con fake.

No se incluirán patrones únicamente porque fueron considerados en este documento.

---

## 34. Relación con la arquitectura general

Este documento complementa:

```text
arquitectura-general.md
estructura-backend.md
```

La arquitectura general define las capas.

La estructura backend define la ubicación física.

Este documento define el criterio para introducir abstracciones y patrones dentro de esas capas.

---

## 35. Decisiones diferidas

Se mantienen abiertas:

- Unit of Work explícito;
- Strategy concreta para módulos futuros;
- Factory concreta;
- Observer/eventos;
- Decorators técnicos;
- implementación exacta de ports con Protocol/ABC;
- patrón final de integración de pagos.

Estas decisiones se tomarán cuando aparezca el problema que las justifique.

---

## 36. Criterio de aceptación

El uso de patrones será considerado correcto si:

1. resuelve un problema identificable;
2. reduce acoplamiento o complejidad;
3. no duplica responsabilidades del dominio;
4. mejora o preserva testabilidad;
5. puede justificarse sin frases genéricas;
6. no fuerza herencia innecesaria;
7. no agrega capas vacías;
8. puede explicarse claramente durante la defensa.

---

## 37. Próximo documento

El siguiente documento recomendado es:

```text
arquitectura/multitenant-y-seguridad.md
```

Allí se definirán con mayor precisión:

- autenticación;
- autorización;
- pertenencia a Negocio;
- tenant scoping;
- protección contra IDOR;
- roles;
- tokens;
- contraseñas;
- aislamiento entre negocios;
- criterios de seguridad para endpoints y repositorios.
