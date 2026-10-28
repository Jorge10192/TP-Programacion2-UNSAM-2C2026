# 03 — M02 Catálogo — Guía de Interpretación del Diagrama de Clases

## 1. Propósito del Documento

Este documento acompaña al diagrama:

```text
03-m02-catalogo-clases.puml
```

y a su representación visual:

```text
03-m02-catalogo-clases.png
```

Su objetivo es permitir que:

```text
persona
desarrollador
arquitecto
revisor
modelo de IA
```

interprete correctamente el **Diagrama 3 — M02 Catálogo** y lo utilice como referencia durante:

```text
análisis
arquitectura
modelo relacional
contrato API
backend
frontend
tests
mantenimiento
revisión de cambios
generación asistida por IA
```

El documento explica:

- qué problema de dominio resuelve M02;
- qué conceptos son responsabilidad de M02;
- qué invariantes están cerradas;
- qué operaciones necesitan información contextual;
- qué información pertenece a módulos posteriores;
- cómo se edita coherentemente un `ArticuloCatalogo`;
- cómo se separan edición, desactivación y reactivación;
- qué riesgos de concurrencia e implementación deben evitarse;
- qué decisiones siguen abiertas para Arquitectura;
- cómo derivar código y tests sin convertir el UML mecánicamente en ORM o CRUD.

Este archivo constituye la **guía semántica del Diagrama 3**.

Esta versión sincronizada debe leerse especialmente junto con:

```text
modulos/M02-Catalogo.md
secuencias/02-editar-articulo.puml
```

y junto con:

```text
06-m02-estados-articulo.md
06-m02-estados-articulo.puml
```

Las vistas son complementarias:

```text
Diagrama 3
→ estructura
→ relaciones
→ responsabilidades
→ invariantes estáticas
→ comportamiento de edición encapsulado

Diagrama 6
→ ciclo de vida
→ transiciones ACTIVO / INACTIVO

Secuencia 02
→ coordinación Application / Domain / Persistencia
→ edición parcial de entrada
→ validación antes de mutar
→ atomicidad y concurrencia
```

No reemplaza la especificación funcional `M02-Catalogo.md`.

No debe introducir una regla funcional nueva que contradiga dicha especificación.

En particular, esta versión incorpora las decisiones funcionales más recientes:

```text
editar ACTIVO o INACTIVO
editar NO cambia EstadoArticulo
reactivación separada de edición
0..3 imágenes
autorización por permiso conceptual
nombre de artículo único por Negocio
validar antes de mutar
confirmación todo-o-nada
```

---

# 2. Ubicación dentro de la Documentación

La estructura relevante es:

```text
Proyecto-3-Extendido-Generico/
└── modelo-dominio/
    └── bloque-1-fundacion/
        ├── 01-modelo-dominio-bloque-1.md
        ├── 01-diagrama-general.puml
        ├── 01-diagrama-general.png
        ├── 02-m01-organizacion-clases.md
        ├── 02-m01-organizacion-clases.puml
        ├── 02-m01-organizacion-clases.png
        ├── 03-m02-catalogo-clases.md
        ├── 03-m02-catalogo-clases.puml
        ├── 03-m02-catalogo-clases.png
        ├── 06-m02-estados-articulo.md
        ├── 06-m02-estados-articulo.puml
        ├── 06-m02-estados-articulo.png
        └── secuencias/
            ├── 01-aceptar-invitacion.puml
            ├── 01-aceptar-invitacion.png
            ├── 02-editar-articulo.puml
            └── 02-editar-articulo.png
```

Este archivo:

```text
03-m02-catalogo-clases.md
```

documenta cómo debe interpretarse:

```text
03-m02-catalogo-clases.puml
```

La secuencia:

```text
secuencias/02-editar-articulo.puml
```

es una vista dinámica especializada que ya fija decisiones relevantes que deben reflejarse en esta guía y posteriormente en el Diagrama 3.

---

# 3. Estado del Artefacto

Esta versión de la guía se resincroniza con:

```text
modulos/M02-Catalogo.md
+
secuencias/02-editar-articulo.puml
```

Estado documental actual:

```text
03-m02-catalogo-clases.md
✅ GUÍA SEMÁNTICA ACTUALIZADA

03-m02-catalogo-clases.puml
⚠️ PENDIENTE DE RESINCRONIZACIÓN CON ESTA GUÍA

03-m02-catalogo-clases.png
⚠️ REGENERAR DESPUÉS DE ACTUALIZAR EL PUML

06-m02-estados-articulo.md / .puml
⚠️ TODAVÍA REQUIEREN SINCRONIZACIÓN
```

Por lo tanto, todavía NO corresponde declarar el conjunto M02:

```text
CONGELADO Y SINCRONIZADO
```

Ese estado solo debe asignarse después de:

1. actualizar `03-m02-catalogo-clases.puml`;
2. revisar/renderizar su PNG;
3. actualizar `06-m02-estados-articulo.md/.puml`;
4. realizar una auditoría transversal del Bloque 1.

La palabra **congelado** significa:

```text
la estructura y las invariantes representadas
no deben modificarse silenciosamente durante implementación
```

No significa que el modelo nunca pueda evolucionar.

Si una necesidad futura exige modificar entidades, cardinalidades, estados, invariantes, política de SKU, reglas de Categoria, imágenes, capacidades o permisos, primero debe modificarse la especificación funcional y luego resincronizarse el conjunto documental.

No deben coexistir dos fuentes con semánticas incompatibles.

---

# 4. Fuentes de Verdad y Orden de Interpretación

Para interpretar M02 durante esta resincronización debe utilizarse:

```text
1. modulos/M02-Catalogo.md
   → especificación funcional vigente

2. secuencias/02-editar-articulo.puml
   → decisiones dinámicas ya validadas para edición

3. modelo-dominio/bloque-1-fundacion/
   01-modelo-dominio-bloque-1.md
   → reglas transversales del Bloque 1
   → sujeto a auditoría transversal final

4. modelo-dominio/bloque-1-fundacion/
   03-m02-catalogo-clases.md
   03-m02-catalogo-clases.puml
   → estructura y responsabilidades

5. modelo-dominio/bloque-1-fundacion/
   06-m02-estados-articulo.md
   06-m02-estados-articulo.puml
   → ciclo de vida
   → deben resincronizarse después de Diagrama 3

6. ADRs / Diseño Técnico
7. Modelo Relacional
8. Contrato API
9. Código
```

Los Diagramas 3 y 6, junto con la Secuencia 02, son **vistas complementarias del mismo dominio**.

Si dos fuentes parecen incompatibles:

```text
NO elegir silenciosamente una
NO inferir una solución por conveniencia
NO corregir únicamente desde el código
```

La contradicción debe resolverse primero en documentación.

La implementación nunca se convierte en fuente superior por haber sido escrita después.

---

# 5. Objetivo del Diagrama

El Diagrama 3 debe permitir responder:

```text
¿Qué representa ArticuloCatalogo?

¿Qué representa Categoria?

¿Cómo se diferencia BIEN de SERVICIO?

¿Qué son las capacidades?

¿Qué capacidades son comerciales?

¿Qué capacidades son estructurales?

¿Qué información puede editarse?

¿Qué información es inmutable?

¿Cómo se expresa una edición compuesta sin setters públicos indiscriminados?

¿Qué significa ACTIVO?

¿Qué significa INACTIVO?

¿Por qué un INACTIVO puede editarse administrativamente
sin reactivarse?

¿Cómo se separan editar, desactivar y reactivar?

¿Qué reglas puede validar un objeto con información local?

¿Qué reglas necesitan contexto del Negocio?

¿Qué reglas necesitan información de módulos posteriores?

¿Cómo se modelan 0..3 imágenes sin congelar storage?

¿Qué significa eliminar físicamente?

¿Qué datos representan estado actual?

¿Qué historia debe preservarse fuera de M02?

¿Qué decisiones pertenecen todavía a Arquitectura?
```

---

# 6. Problema Principal que Resuelve M02

La plataforma debe funcionar para negocios distintos sin crear un modelo específico para cada rubro.

Debe poder representar, por ejemplo:

```text
mercadería para reventa
materias primas
insumos
productos elaborados
servicios
bienes comprables pero no vendibles
bienes vendibles pero no comprables
bienes con stock
bienes sin stock controlado
bienes con vencimiento
servicios por unidad
servicios por hora

```

No se utiliza una jerarquía rígida:

```text
Producto
MateriaPrima
Insumo
ProductoTerminado
Mercaderia
Servicio

```

para expresar esos comportamientos.

La solución conceptual es:

```text
ArticuloCatalogo
=
TipoArticulo
+
CapacidadesArticulo

```

---

# 7. Principio Rector

El principio rector de M02 es:

> **Un artículo se define por su naturaleza general y por sus capacidades operativas; no por una jerarquía rígida de clases comerciales.**

Conceptualmente:

```text
ArticuloCatalogo
        │
        ├── TipoArticulo
        │      ├── BIEN
        │      └── SERVICIO
        │
        └── CapacidadesArticulo
               ├── esComprable
               ├── esVendible
               ├── controlaStock
               ├── puedeUsarseEnProduccion
               ├── controlaVencimiento
               └── permiteDescuento

```

---

# 8. Alcance del Diagrama

El Diagrama 3 representa:

```text
Negocio
[referencia externa de M01]

Categoria
ArticuloCatalogo

CapacidadesArticulo

EstadoCategoria
EstadoArticulo
TipoArticulo
UnidadMedida
```

También representa:

- relaciones;
- cardinalidades;
- composición conceptual;
- estado;
- comportamiento relevante;
- invariantes principales;
- edición compuesta y encapsulada;
- restricciones de modificación;
- dependencia conceptual de información externa;
- colección conceptual de 0..3 imágenes por artículo.

No obliga a representar como entidad persistente:

```text
PropuestaEdicionDTO
propuestaEdicionPreparada
```

`PropuestaEdicionDTO` pertenece a Application/API.

`propuestaEdicionPreparada` expresa conceptualmente una intención de edición ya normalizada y con referencias resueltas, pero:

```text
NO posee identidad propia
NO implica tabla
NO implica Repository
NO se persiste como entidad
```

La representación exacta de esa estructura permanece abierta.

---

# 9. Elementos Fuera del Alcance

M02 NO administra:

```text
StockUbicacion
StockActual
Lote
MovimientoInventario
fechaVencimiento concreta

Proveedor
Compra

Cliente
Venta
Pago

Receta
Produccion

Promocion
ListaPrecio

Caja
MovimientoCaja

```

Tampoco decide todavía:

```text
tablas
foreign keys
índices
constraints SQL
ORM
SQLAlchemy
Pydantic
DTOs
endpoints
Repository
Unit of Work
Domain Events
Aggregate Roots formales
Service Layer concreto
locking
estrategia de transacciones

```

---

# 10. Dependencia con M01

`Negocio` aparece como referencia externa porque M02 depende del contexto organizacional definido por M01.

M02 utiliza Negocio para:

```text
pertenencia
aislamiento entre Negocios
unicidad contextual
moneda base
autorización contextual

```

Conceptualmente:

```text
Negocio
   │
   ├── 0..N Categoria
   │
   └── 0..N ArticuloCatalogo

```

Reglas que no pueden entenderse sin Negocio:

```text
SKU único por Negocio (ACTIVOS e INACTIVOS)

Categoria.nombre único por Negocio (ACTIVAS e INACTIVAS)

ArticuloCatalogo y Categoria
deben pertenecer al mismo Negocio

```

El Diagrama 3 no redefine internamente M01.

---

# 11. Identidad de Dominio vs Claves Funcionales

Este punto es crítico para implementación.

`ArticuloCatalogo` posee una identidad estable propia.

Por lo tanto:

```text
ArticuloCatalogo.identidad
≠
ArticuloCatalogo.sku
```

y:

```text
ArticuloCatalogo.identidad
≠
ArticuloCatalogo.nombre
```

El SKU:

```text
es opcional
es editable
puede quitarse
puede reutilizarse cuando queda libre después de confirmar
```

El nombre:

```text
es editable
NO es identidad
```

pero posee una regla funcional adicional:

```text
nombre funcionalmente único
por Negocio
considerando ACTIVO + INACTIVO
```

Por lo tanto, un artículo `INACTIVO` continúa reservando su nombre.

La estrategia exacta de equivalencia/normalización del nombre permanece abierta.

No congelar automáticamente:

```text
lower()
trim()
casefold()
Unicode exacto
tratamiento exacto de acentos
collation SQL
```

como especificación de dominio.

La misma regla conceptual de identidad aplica a Categoria:

```text
Categoria.identidad
≠
Categoria.nombre
```

Renombrar una Categoria no crea otra entidad.

---

# 12. Entidad `Categoria`

## 12.1. Responsabilidad

`Categoria` organiza artículos dentro de un Negocio.

No determina:

```text
precio
promoción
descuento
stock
vencimiento
producción

```

No debe utilizarse como contenedor de reglas comerciales que no hayan sido definidas explícitamente.

## 12.2. Información Conceptual

```text
Categoria
├── identidad
├── nombre
└── estado : EstadoCategoria

```

No posee durante el MVP:

```text
descripcion
jerarquía padre/hijo
reglas de precio
reglas de promoción

```

---

# 13. Estado de Categoria

Estados:

```text
ACTIVA
INACTIVA

```

No agregar sin modificar la especificación:

```text
BORRADOR
ELIMINADA
ARCHIVADA
SUSPENDIDA

```

La eliminación física:

```text
NO es un estado

```

---

# 14. Unicidad de Categoria

Dentro de un mismo Negocio:

```text
Categoria.nombre

```

debe ser único luego de la normalización funcional definida por el sistema.

Conceptualmente equivalentes:

```text
Snacks
SNACKS
 snacks

```

La regla considera:

```text
ACTIVAS
+
INACTIVAS

```

Si existe una Categoria equivalente INACTIVA:

```text
NO crear duplicado
→ informar existencia
→ ofrecer reactivación

```

La normalización técnica exacta permanece abierta.

No congelar todavía decisiones como:

```text
lowercase exacto
Unicode normalization exacta
tratamiento exacto de acentos
collation SQL

```

---

# 15. Validación de Unicidad de Categoria

La propia instancia `Categoria` no puede conocer todas las categorías del Negocio.

Por lo tanto:

```text
cambiarNombre(...)

```

es una operación conceptual válida, pero la regla:

```text
nombre normalizado único por Negocio

```

requiere contexto externo.

No implementar la unicidad únicamente como:

```text
if nombreDisponible():
    guardar()

```

sin una garantía final consistente.

La forma técnica se resolverá en Arquitectura / Modelo Relacional.

---

# 16. Categoria INACTIVA

Una Categoria INACTIVA:

```text
continúa existiendo
conserva identidad
conserva referencias
conserva artículos asociados

```

No provoca:

```text
ArticuloCatalogo → INACTIVO

```

No modifica:

```text
precioBase
costoReferencia
SKU
UnidadMedida
CapacidadesArticulo

```

No recalcula precios ni promociones.

---

# 17. Asociaciones con Categoria INACTIVA

Debe distinguirse entre asociación histórica y nueva asociación.

## 17.1. Asociación Existente

```text
Articulo A
→ Categoria X

Categoria X
ACTIVA → INACTIVA

```

Resultado:

```text
Articulo A
continúa asociado a Categoria X

```

El artículo puede permanecer ACTIVO.

## 17.2. Nueva Asociación

```text
Articulo B
+
Categoria X INACTIVA

```

Resultado:

```text
rechazar
→ solicitar reactivar Categoria

```

## 17.3. Reasignación

```text
Articulo A
→ cambiar Categoria
→ Categoria Y INACTIVA

```

Resultado:

```text
rechazar

```

Por lo tanto:

```text
Categoria INACTIVA
→ válida como asociación histórica existente
→ inválida como nueva asociación o reasignación

```

---

# 18. Reactivación de Categoria

```text
INACTIVA → ACTIVA

```

debe:

* reutilizar la misma entidad;
* conservar identidad;
* conservar relaciones;
* conservar artículos asociados.

No debe:

* generar otra Categoria;
* recargar artículos;
* recalcular precios;
* recalcular promociones;
* modificar SKU;
* cambiar capacidades.

---

# 19. Eliminación Física de Categoria

La eliminación física es excepcional.

Solo puede confirmarse cuando:

```text
0 ArticuloCatalogo asociados
+
0 dependencias que deban conservarse

```

Esto incluye artículos:

```text
ACTIVOS
INACTIVOS

```

La elegibilidad para eliminación física es una consulta contextual coordinada por el Caso de Uso.

No se modela `puedeEliminarseFisicamente()` como responsabilidad autosuficiente de `Categoria`, porque la entidad aislada no conoce todas las asociaciones o dependencias externas.

La operación de eliminación real debe volver a garantizar las condiciones al confirmar.

---

# 20. Entidad `ArticuloCatalogo`

## 20.1. Responsabilidad

Representa cualquier bien o servicio que un Negocio necesite utilizar comercial u operativamente.

Ejemplos:

```text
Harina
Collar
Snack de pollo
Remera negra M
Maquillaje social
Asesoramiento por hora
```

`ArticuloCatalogo` mantiene la **configuración vigente** del elemento.

No contiene los hechos transaccionales producidos por otros módulos.

## 20.2. Información Conceptual

```text
ArticuloCatalogo
├── identidad
├── Negocio
├── nombre
├── descripcion opcional
├── tipo : TipoArticulo
├── Categoria opcional
├── unidadMedida : UnidadMedida
├── SKU opcional
├── imágenes [0..3]
│   └── exactamente una principal si N > 0
├── precioBase opcional
├── costoReferencia opcional
├── capacidades : CapacidadesArticulo
└── estado : EstadoArticulo
```

Reglas estructurales relevantes:

```text
identidad
→ inmutable

TipoArticulo
→ inmutable en MVP

nombre
→ no es identidad
→ funcionalmente único por Negocio
→ ACTIVO + INACTIVO participan

SKU
→ no es identidad
→ opcional
→ único por Negocio si existe

imágenes
→ 0..3
→ si N > 0, exactamente una principal
```

La representación física de imágenes no forma parte de la entidad conceptual.

---

# 21. Edición de `ArticuloCatalogo`

La edición de catálogo representa:

```text
cambiar configuración vigente hacia futuro
```

y NO:

```text
reescribir hechos históricos
```

La edición administrativa está permitida sobre:

```text
ACTIVO
INACTIVO
```

pero nunca cambia implícitamente `EstadoArticulo`.

Por lo tanto:

```text
editar ACTIVO
→ sigue ACTIVO
→ solo si la configuración resultante continúa siendo válida

editar INACTIVO
→ sigue INACTIVO
→ puede corregirse o prepararse para una futura reactivación
```

La reactivación es un Caso de Uso separado.

## 21.1. Campos Editables

Conceptualmente pueden editarse, sujeto a invariantes:

```text
nombre
descripcion
SKU
imágenes
precioBase
costoReferencia
UnidadMedida
CapacidadesArticulo / configuración operativa
Categoria
```

No pueden editarse mediante este caso de uso:

```text
identidad
TipoArticulo
EstadoArticulo
```

`EstadoArticulo` cambia mediante operaciones explícitas de ciclo de vida.

## 21.2. Entrada Parcial

Application puede recibir una propuesta parcial.

Debe distinguir:

```text
campo NO enviado
→ conservar valor actual

campo enviado como null
→ quitar / desasociar, cuando el campo lo permite
```

Ejemplos:

```text
Categoria omitida
→ conservar

Categoria = null
→ quitar

SKU omitido
→ conservar

SKU = null
→ quitar
```

## 21.3. DTO vs Dominio

`PropuestaEdicionDTO` pertenece a Application/API.

No debe enviarse directamente a la entidad.

Flujo conceptual:

```text
PropuestaEdicionDTO
        ↓
Application normaliza entrada
        ↓
resuelve referencias
        ↓
prevalida contexto / unicidades
        ↓
construye propuestaEdicionPreparada
        ↓
ArticuloCatalogo
```

La estructura preparada no define infraestructura ni persistencia propia.

## 21.4. Operación Compuesta de Dominio

La edición genérica debe expresarse conceptualmente mediante una operación coherente:

```text
ArticuloCatalogo.aplicarEdicion(propuestaEdicionPreparada)
```

La entidad debe:

```text
validar TODA la configuración resultante
        ↓
si falla
→ rechazar SIN consolidar mutaciones observables
        ↓
si pasa
→ aplicar todos los cambios coherentemente
```

No implementar `EditarArticulo` como una cadena pública de setters independientes.

Operaciones especializadas pueden existir para otros Casos de Uso, pero no deben utilizarse para romper la atomicidad de la edición compuesta.

## 21.5. Atomicidad

La entrada puede ser parcial.

La confirmación de la edición debe ser:

```text
TODO
o
NADA
```

Si falla cualquier:

```text
invariante local
guardia contextual
unicidad
persistencia
conflicto concurrente
```

ninguna modificación queda confirmada.

No modelar:

```text
mutar parcialmente
→ descubrir error
→ revertir manualmente atributos
```

como estrategia de dominio.

---

# 22. TipoArticulo

Valores:

```text
BIEN
SERVICIO

```

Es:

```text
obligatorio
+
inmutable después de creación

```

No existe:

```text
cambiarTipo()

```

Si se creó incorrectamente y nunca fue utilizado:

```text
eliminar físicamente
+
crear correctamente

```

Si posee historia:

```text
desactivar
+
crear otro artículo

```

No reinterpretar retrospectivamente la identidad de un artículo utilizado.

---

# 23. EstadoArticulo

Estados:

```text
ACTIVO
INACTIVO

```

No agregar:

```text
BORRADOR
ARCHIVADO
SUSPENDIDO
ELIMINADO

```

sin modificar la especificación.

La eliminación física no es un estado de la entidad.

---

# 24. Uso Operativo Mínimo

Un artículo ACTIVO debe poseer al menos uno:

```text
esComprable = True
o
esVendible = True
o
puedeUsarseEnProduccion = True

```

Un artículo INACTIVO puede conservar:

```text
esComprable = False
esVendible = False
puedeUsarseEnProduccion = False

```

sin violar invariantes de dominio.

No aplicar la regla de uso operativo mínimo indiscriminadamente a artículos INACTIVOS.

Si una edición de un artículo ACTIVO resultaría en 0 usos operativos:

```text
RECHAZAR edición

```

No desactivar automáticamente.

---

# 25. Reactivación de `ArticuloCatalogo`

La reactivación es una operación explícita y separada de la edición.

Representa únicamente la transición:

```text
INACTIVO → ACTIVO
```

sobre la **configuración vigente ya confirmada**.

`reactivar()` no es una asignación ciega:

```text
estado = ACTIVO
```

Antes de confirmar debe verificarse que la configuración vigente permita un artículo ACTIVO válido, incluyendo las guardias locales y contextuales aplicables:

```text
coherencia Tipo + Capacidades
uso operativo mínimo
precioBase válido si esVendible
costoReferencia válido si existe
UnidadMedida válida
dependencias estructurales aplicables
otras guardias contextuales necesarias
```

Una Categoria históricamente asociada que actualmente se encuentre INACTIVA:

```text
NO bloquea por sí sola la reactivación
```

porque no constituye una nueva asociación.

## 25.1. Separación entre Editar y Reactivar

No existe en este modelo vigente una “reactivación con payload libre de edición” como mecanismo normal.

Si el artículo INACTIVO necesita cambios:

```text
EditarArticulo
→ confirmar cambios
→ continúa INACTIVO
→ ReactivarArticulo
```

La reactivación:

```text
NO incorpora cambios comerciales arbitrarios
NO cambia precio
NO cambia SKU
NO cambia Categoria
NO cambia UnidadMedida
NO cambia imágenes
NO reconfigura capacidades mediante payload libre
```

Si la configuración vigente no permite volver a ACTIVO:

```text
RECHAZAR reactivación
```

y el artículo permanece `INACTIVO`.

## 25.2. Identidad e Historia

Reactivar:

- reutiliza la misma entidad;
- conserva identidad;
- no crea una copia;
- no reescribe hechos históricos;
- no reconstruye operaciones anteriores.

## 25.3. Autorización

La reactivación requiere un permiso conceptual específico.

La matriz completa:

```text
Rol → Permiso
```

no se congela en esta guía.

No asumir automáticamente que una determinada clase de Rol puede o no reactivar salvo regla explícita de la especificación funcional.

## 25.4. Equivalencia Semántica `activar` / `reactivar`

En interfaces de usuario puede utilizarse:

```text
activar
```

pero para un artículo histórico existente en `INACTIVO`, la transición semántica oficial es:

```text
INACTIVO → ACTIVO
= reactivar
```

No modelar dos ciclos de vida distintos para la misma transición.

---

# 26. Value Object `CapacidadesArticulo`

`CapacidadesArticulo` representa una configuración completa e **inmutable**.

No posee identidad propia.

Atributos:

```text
esComprable
esVendible
controlaStock
puedeUsarseEnProduccion
controlaVencimiento
permiteDescuento

```

Debe interpretarse como:

```text
<<value object>>

```

y no automáticamente como:

```text
tabla propia
Aggregate Root
entidad ORM independiente
objeto con identidad técnica

```

---

# 27. Inmutabilidad y Prohibición de Auto-Fix en VO

`CapacidadesArticulo`:

```text
NO posee setters parciales
NO muta flags existentes
NO aplica auto-fixes silenciosos
NO interpreta la intención del Caso de Uso
```

Flujo conceptual correcto:

```text
Caso de Uso interpreta intención
        ↓
construye propuesta completa
        ↓
CapacidadesArticulo valida
        ↓
acepta o rechaza
        ↓
ArticuloCatalogo reemplaza su configuración actual
como una única mutación válida
```

Si recibe:

```text
esVendible = False
permiteDescuento = True
```

el VO debe:

```text
RECHAZAR
```

No debe programarse:

```python
if not es_vendible:
    permite_descuento = False
```

dentro del VO.

La intención funcional pertenece al Caso de Uso.

La forma concreta de expresar el rechazo queda abierta:

```text
excepción de dominio
ValidationResult
resultado tipado
otro mecanismo coherente
```

La regla congelada es:

```text
entrada inválida
→ rechazo

NUNCA:
entrada inválida
→ corrección silenciosa
→ aceptación
```

---

# 28. Responsabilidad de `esCoherenteCon()`

`CapacidadesArticulo.esCoherenteCon(tipo)` valida solamente:

```text
TipoArticulo
+
CapacidadesArticulo

```

No debe convertirse en una función omnisciente.

Verifica exclusivamente:

```text
SERVICIO sin stock
SERVICIO sin vencimiento
SERVICIO sin producción

vencimiento → BIEN + stock
producción → BIEN + stock
descuento → vendible

```

No debe validar por sí sola:

```text
precioBase
estado ACTIVO/INACTIVO
SKU
Categoria
pertenencia al Negocio
stock real
lotes
recetas
historia cuantitativa
autorización

```

---

# 29. Capacidades ≠ Hechos Operativos

Este punto debe preservarse durante implementación.

```text
controlaStock
≠
stock actual

```

```text
controlaVencimiento
≠
fecha de vencimiento concreta

```

```text
puedeUsarseEnProduccion
≠
receta

```

```text
esVendible
≠
Venta

```

```text
esComprable
≠
Compra

```

Las capacidades expresan:

```text
elegibilidad
configuración
uso permitido

```

Los hechos operativos pertenecen a otros módulos.

No agregar dentro de `ArticuloCatalogo` por interpretación de estas capacidades:

```text
stockActual
listaDeLotes
fechaVencimiento
listaDeCompras
listaDeVentas
recetas
producciones

```

---

# 30. Reglas Internas de Capacidades

## 30.1. SERVICIO

Si:

```text
tipo = SERVICIO

```

entonces:

```text
controlaStock = False
controlaVencimiento = False
puedeUsarseEnProduccion = False

```

## 30.2. Vencimiento

Si:

```text
controlaVencimiento = True

```

entonces:

```text
tipo = BIEN
controlaStock = True

```

## 30.3. Producción

Si:

```text
puedeUsarseEnProduccion = True

```

entonces:

```text
tipo = BIEN
controlaStock = True

```

## 30.4. Descuento

Si:

```text
permiteDescuento = True

```

entonces:

```text
esVendible = True

```

---

# 31. Capacidades Comerciales

Se consideran comerciales / de habilitación futura:

```text
esComprable
esVendible
permiteDescuento

```

Estas capacidades pueden cambiar aunque exista historia.

Los cambios afectan:

```text
operaciones futuras

```

No reinterpretan:

```text
operaciones pasadas

```

Ejemplo válido:

```text
Articulo vendido históricamente
+
esVendible True → False

```

Las ventas anteriores permanecen intactas.

---

# 32. Habilitar Venta

La transición:

```text
esVendible False → True

```

solo puede confirmarse si:

```text
precioBase != null
+
precioBase >= 0

```

No permitir:

```text
Articulo ACTIVO
+
esVendible = True
+
precioBase = null

```

La regla requiere información de `ArticuloCatalogo`, no solamente de `CapacidadesArticulo`.

---

# 33. Deshabilitar Venta

Si la intención funcional es:

```text
esVendible True → False
```

el **Caso de Uso** debe construir explícitamente:

```text
esVendible = False
permiteDescuento = False
```

Luego `CapacidadesArticulo` valida y acepta o rechaza.

El VO NO infiere la intención ni corrige automáticamente:

```text
permiteDescuento = True
→ False
```

No debe existir un estado confirmado:

```text
esVendible = False
permiteDescuento = True
```

`precioBase` se conserva como referencia comercial **actual**.

La historia pertenece a módulos consumidores.

Deshabilitar venta NO implica automáticamente:

```text
ArticuloCatalogo ACTIVO → INACTIVO
```

Si la nueva configuración dejara 0 usos operativos:

```text
RECHAZAR edición
```

No desactivar implícitamente.

---

# 34. Capacidades Estructurales

Se consideran estructurales:

```text
controlaStock
controlaVencimiento
puedeUsarseEnProduccion

```

Pueden tener dependencias en módulos consumidores.

Ejemplos:

```text
controlaStock
→ M04
→ stock
→ lotes
→ movimientos

```

```text
puedeUsarseEnProduccion
→ M07
→ recetas
→ consumos
→ producción

```

No aplicar:

```text
si alguna vez hubo historia
→ bloquear para siempre

```

La regla es:

> **Bloquear una transición estructural cuando el cambio resulte incompatible con dependencias existentes o altere el significado histórico que deba preservarse.**

---

# 35. Historia vs Dependencia Operativa

Debe distinguirse:

```text
tener historia

```

de:

```text
tener una dependencia que impide la transición

```

Ejemplo conceptual:

```text
Artículo tuvo movimientos hace un año
Stock actual = 0
Sin lotes abiertos
Sin dependencias productivas incompatibles

```

La existencia de historia no implica automáticamente que todas las capacidades estructurales deban quedar bloqueadas para siempre.

M02 define la necesidad de validar.

Los módulos consumidores completarán las condiciones específicas.

---

# 36. Consistencia Estructural vs Tolerancia Operativa

M02 protege consistencia estructural.

Nunca debe aceptar:

```text
SERVICIO
+
controlaStock = True

```

ni:

```text
permiteDescuento = True
+
esVendible = False

```

Sin embargo, módulos operativos posteriores podrán decidir si toleran temporalmente situaciones como:

```text
stock negativo

```

para sostener la operación diaria.

Por lo tanto:

```text
inconsistencia operativa temporal
≠
configuración estructural inválida

```

No solucionar problemas operativos relajando invariantes estructurales de M02.

---

# 37. Precio Base

Si:

```text
esVendible = True
```

debe cumplir:

```text
precioBase != null
precioBase >= 0
```

M02 no acepta precios negativos.

Respecto de:

```text
precioBase = 0
```

M02 mantiene únicamente la invariante estructural:

```text
precioBase >= 0
```

pero **no congela todavía la semántica comercial definitiva** de una venta normal con precio base cero.

No inferir automáticamente:

```text
precioBase = 0
→ promoción
→ descuento 100 %
→ gratuidad
```

La semántica de precio efectivo, promociones, bonificaciones y descuentos corresponde a M05/Promociones.

Modificar `precioBase`:

```text
NO reescribe ventas históricas
NO elimina ni modifica promociones existentes
```

El artículo no posee moneda independiente.

Los importes utilizan:

```text
Negocio.monedaBase
```

Durante el MVP:

```text
ARS
```

---

# 38. Costo de Referencia

Es opcional.

Si existe:

```text
costoReferencia >= 0

```

No significa obligatoriamente:

```text
último costo
costo promedio
costo contable
costo histórico definitivo

```

Modificarlo no modifica costos históricos de módulos consumidores.

---

# 39. Política Final y Ausencia Canónica de SKU

El SKU:

```text
es opcional
es editable
NO es identidad técnica
```

### Ausencia Canónica y Normalización

La ausencia funcional de SKU se representa en dominio y persistencia como:

```text
null
```

Antes de validar o persistir:

```text
input ""
input compuesto solo por espacios
→ null
```

No utilizar cadenas vacías como una segunda representación de “sin SKU”.

La estrategia técnica exacta de normalización permanece abierta.

### Unicidad Contextual

Cuando existe:

```text
SKU ACTUAL
→ único dentro del Negocio
```

considerando artículos:

```text
ACTIVOS
+
INACTIVOS
```

Desactivar un artículo:

```text
NO libera su SKU actual
```

Los prechecks de disponibilidad mejoran UX.

La defensa final de unicidad debe resistir concurrencia.

### Decisiones Técnicas Diferidas

No se definen aquí:

- case sensitivity;
- trim exacto;
- normalización Unicode;
- regex/formato;
- collation SQL.

---

# 40. Transiciones de SKU

## 40.1. A → B

```text
SKU actual = A
nuevo SKU = B

```

Debe:

1. validar contextual y consistentemente que `B` esté disponible en el Negocio;
2. confirmar el cambio;
3. asignar `B`;
4. liberar `A` después de la confirmación.

No debe existir un estado confirmado donde dos artículos del mismo Negocio posean `B`.

## 40.2. A → null

```text
SKU actual = A
nuevo SKU = null

```

Al confirmar:

```text
A queda disponible

```

## 40.3. null → B

Debe validarse que:

```text
B está disponible

```

antes y al confirmar la modificación.

## 40.4. A → A

Se considera:

```text
no-op

```

No constituye modificación funcional.

---

# 41. Historia de SKU

M02 NO mantiene durante el MVP:

```text
historial de SKU
alias de SKU
reserva permanente de SKUs anteriores

```

Cuando un SKU anterior queda libre mediante una modificación válida:

```text
puede reutilizarse

```

Si una operación histórica necesita conocer el SKU usado en ese momento:

```text
el módulo transaccional correspondiente
debe preservar ese valor histórico

```

Si en el futuro se desea impedir reutilización de SKUs históricos:

```text
deberá modelarse explícitamente

```

No inventar esa política durante la implementación actual.

---

# 42. UnidadMedida

Valores iniciales:

```text
UNIDAD
KG
G
L
ML
M
CM
HORA

```

Durante el MVP es:

```text
catálogo global normalizado

```

No pertenece a un Negocio particular.

No se crean unidades personalizadas por Negocio.

---

# 43. UnidadMedida en BIEN y SERVICIO

## BIEN

Debe poseer una unidad válida elegida explícitamente.

Ejemplo:

```text
Harina
→ KG

```

## SERVICIO

Posee también UnidadMedida.

Valor inicial:

```text
UNIDAD

```

Puede utilizar otra unidad apropiada:

```text
Asesoramiento
→ HORA

```

---

# 44. Evolución de `UnidadMedida`

`UnidadMedida` representa la unidad vigente para operaciones futuras.

Puede modificarse administrativamente cuando la configuración propuesta sea válida.

Regla temporal:

```text
cambiar unidad vigente
→ afecta operaciones futuras

NO
→ reescribe cantidades históricas
```

Ejemplo:

```text
Harina
Unidad vigente = KG
Compra histórica = 5 KG
```

Si posteriormente la unidad vigente cambia, la Compra histórica continúa siendo:

```text
5 KG
```

y no debe reinterpretarse utilizando el valor actual del catálogo.

Por lo tanto, la existencia de historia cuantitativa:

```text
NO bloquea automáticamente para siempre
todo cambio de UnidadMedida
```

Las futuras reglas que determinen cuándo un cambio de unidad resulta operacionalmente incompatible con:

```text
stock actual
lotes
recetas
producción
otras dependencias
```

se definirán al diseñar los módulos consumidores correspondientes.

M02 no introduce de forma prematura:

```text
tieneHistoriaOperativa : Boolean
```

ni una librería completa de conversiones.

La historia se preserva en los hechos transaccionales correspondientes.

---

# 45. Imágenes del Artículo

Durante el MVP:

```text
ArticuloCatalogo
→ 0..3 imágenes
```

Regla:

```text
N = 0
→ no existe imagen principal

N > 0
→ exactamente una imagen debe ser principal
```

La prevalidación puede realizarse en Application para brindar feedback temprano.

La invariante debe quedar protegida también por Domain.

No se obliga todavía a introducir una clase concreta como:

```text
ColeccionImagenesArticulo
```

si no resulta necesaria.

Tampoco se decide:

```text
filesystem
S3
blob SQL
CDN
URL pública
Cloudinary
Base64
```

La representación física y lifecycle de archivos pertenecen a Diseño Técnico.

Regla de seguridad:

```text
una edición lógica de referencias de imágenes
NO debe provocar efectos externos irreversibles inseguros
antes de que la modificación pueda confirmarse
```

Por ejemplo, no borrar físicamente una imagen previa de forma irreversible antes de una confirmación segura sin una estrategia arquitectónica adecuada.

---

# 46. Desactivación de ArticuloCatalogo

```text
ACTIVO → INACTIVO

```

debe:

* conservar identidad;
* conservar SKU actual;
* conservar historia;
* conservar referencias;
* no borrar operaciones;
* no alterar existencias administradas por M04;
* retirar el artículo del uso normal en nuevas operaciones.

Desactivar:

```text
≠
eliminar físicamente

```

Regla explícita:

```text
stock > 0
NO impide desactivar

```

---

# 47. Stock Remanente

Si un artículo se desactiva con stock:

```text
stock existente
→ permanece intacto en M04

```

M02 NO debe:

```text
poner stock en cero
eliminar lotes
eliminar movimientos

```

M04 y otros módulos definirán qué operaciones son válidas sobre existencias remanentes.

Ejemplos posibles futuros:

```text
ajuste
baja
traslado
liquidación

```

No congelar estas políticas dentro de M02.

---

# 48. Eliminación Física de `ArticuloCatalogo`

`eliminarFisicamente()`:

```text
NO es EstadoArticulo
NO crea estado ELIMINADO
NO es una transición de la máquina de estados
```

Es una operación administrativa excepcional.

En el MVP requiere explícitamente:

```text
Usuario con Rol PROPIETARIO
+
ArticuloCatalogo INACTIVO
+
sin historia operativa relevante
+
sin referencias
+
sin dependencias que deban conservarse
```

Si el artículo continúa ACTIVO y se desea retirarlo:

```text
desactivar
```

antes de evaluar un hard delete.

La ausencia de historia, referencias y dependencias debe revalidarse al momento de confirmar.

Si la eliminación física se confirma:

```text
SKU actual queda disponible para reutilización
nombre actual deja de estar reservado por ese artículo
```

La operación no debe utilizarse para borrar un artículo únicamente porque “molesta” en los selectores; para ese caso existe `INACTIVO`.

---

# 49. Elegibilidad para Eliminación Física

La posibilidad de hard delete es una decisión contextual del Caso de Uso.

No debe modelarse:

```text
Categoria.puedeEliminarseFisicamente()
ArticuloCatalogo.puedeEliminarseFisicamente()
```

como una respuesta autosuficiente de la entidad.

La evaluación puede necesitar:

```text
estado actual
actor autorizado
historia
referencias
dependencias de módulos consumidores
condiciones concurrentes
```

Una preconsulta puede orientar UX o diagnóstico, pero no constituye garantía definitiva.

Para ArticuloCatalogo, la confirmación final exige en el MVP:

```text
PROPIETARIO
+
INACTIVO
+
sin historia relevante
+
sin referencias
+
sin dependencias
```

La operación final debe volver a garantizar las condiciones al confirmar.

---

# 50. Estado Actual vs Historia

M02 representa:

```text
configuración ACTUAL del catálogo
```

Pueden cambiar hacia futuro:

```text
nombre
descripcion
Categoria
SKU
precioBase
costoReferencia
imágenes
UnidadMedida
capacidades permitidas
estado mediante casos de uso explícitos
```

Los módulos transaccionales deben preservar los valores históricos que necesiten para interpretar correctamente sus operaciones.

No reconstruir una operación pasada consultando exclusivamente la configuración vigente.

Ejemplos:

```text
precioBase actual
≠ precio aplicado en Venta histórica

UnidadMedida actual
≠ unidad registrada necesariamente en una Compra histórica

nombre actual
≠ nombre que necesariamente se mostró en una operación anterior
```

Principio:

```text
editar catálogo
=
cambiar configuración hacia futuro

editar catálogo
≠
reescribir pasado
```

---

# 51. Validaciones Locales vs. Contextuales

Debe mantenerse una separación explícita.

## Guardias Locales — Entidad / Value Objects

Pueden resolverse con la configuración candidata y el estado local del artículo:

```text
TipoArticulo inmutable

Tipo + CapacidadesArticulo coherentes

si esVendible:
    precioBase != null
    precioBase >= 0

si costoReferencia != null:
    costoReferencia >= 0

si estado == ACTIVO:
    >= 1 uso operativo

imágenes:
    0..3
    si N > 0 exactamente una principal

coherencia interna de Value Objects
```

La entidad debe validar la propuesta completa antes de consolidar mutaciones observables.

## Guardias Contextuales — Application / Persistencia / Módulos Consumidores

Necesitan información externa:

```text
Usuario autenticado
Negocio autorizado
UsuarioNegocio ACTIVO
permiso conceptual

tenant correcto

nombre funcionalmente único por Negocio
SKU único por Negocio

Categoria del mismo Negocio
Categoria ACTIVA para nueva asociación
vigencia concurrente de la Categoria utilizada

dependencias estructurales
compatibilidad operativa de cambios de UnidadMedida

historia / referencias para hard delete
```

El dominio no consulta repositories directamente para resolverlas.

Los prechecks de Application mejoran UX.

No sustituyen las defensas finales de persistencia.

---

# 52. Preconsulta vs Confirmación

Una consulta previa puede orientar la UX:

```text
elegibilidadPreliminarParaEliminar()
nombreDisponible()
skuDisponible()
Categoria válida para nueva asociación
compatibilidad preliminar de un cambio estructural
```

Pero:

```text
preconsulta
≠
garantía definitiva
```

Patrón peligroso:

```text
if puede():
    # pasa tiempo / otra operación modifica el sistema
    guardar_sin_revalidar()
```

Las guardias contextuales relevantes y la mutación deben confirmarse de manera consistente.

En particular, antes de confirmar una edición deben seguir siendo válidas las condiciones relevantes sobre:

```text
nombre
SKU
Categoria
versión/estado lógico del propio ArticuloCatalogo
```

La forma técnica puede incluir posteriormente:

```text
constraints SQL
transacciones
locking
versionado
aislamiento
otra estrategia
```

pero no se decide en este UML.

---

# 53. Concurrencia, TOCTOU y Lost Update

Existe un riesgo general de:

```text
Time Of Check
        ↓
Time Of Use
```

cuando una condición se verifica antes de confirmar.

## Elegibilidad Operativa

```text
T0: Artículo X está ACTIVO
T1: Usuario A lo selecciona
T2: Usuario B lo desactiva
T3: Usuario A intenta confirmar una nueva operación consumidora
```

Regla:

```text
selección previa
≠
elegibilidad garantizada al confirmar
```

El módulo consumidor debe revalidar.

## Unicidad de Nombre y SKU

Dos ediciones concurrentes no pueden confirmar:

```text
mismo nombre funcional
```

o:

```text
mismo SKU
```

en el mismo Negocio cuando la regla exige unicidad.

Los prechecks no son la defensa final.

## Edición Concurrente del Mismo Artículo

```text
T0 Usuario A carga versión lógica X
T1 Usuario B carga versión lógica X
T2 Usuario A confirma cambios
T3 Usuario B intenta confirmar sobre estado obsoleto
```

Regla:

```text
T3 NO puede sobrescribir silenciosamente T2
```

Debe detectarse el conflicto.

## Categoria Concurrentemente Invalidada

Si una edición pretende asignar una Categoria que estaba ACTIVA durante la lectura pero deja de ser válida antes de confirmar:

```text
NO confirmar silenciosamente la asociación
```

## Mecanismo Técnico

La especificación exige el comportamiento, no la tecnología.

Permanece abierto:

```text
version
timestamp
optimistic locking
locking pesimista
constraint
aislamiento
otra estrategia
```

No congelar uno de esos mecanismos desde el UML conceptual.

---

# 54. Autorización Contextual

Los métodos del dominio:

```text
NO autentican usuarios
NO autorizan actores
```

No agregar parámetros como:

```text
token
request HTTP
usuarioActual
rol enviado por cliente
```

a los métodos de `ArticuloCatalogo` o `Categoria` para resolver autorización.

Antes de ejecutar una mutación, Application debe disponer de contexto confiable:

```text
Usuario autenticado
+
Negocio identificado
+
UsuarioNegocio ACTIVO
+
permiso conceptual requerido
+
recurso perteneciente al mismo Negocio
```

El Rol contextual proviene de M01 y puede ser utilizado por la política de autorización.

Sin embargo, M02 no congela una matriz rígida completa:

```text
Rol → Permiso
```

para todas las operaciones.

No confiar en:

```text
usuarioId enviado por request
negocioId arbitrario del cliente
rol enviado por request
```

como fuente de autorización.

---

# 55. Permisos Conceptuales y Matriz de Roles Diferida

M02 requiere permisos conceptuales por operación.

Ejemplos:

```text
CONSULTAR_CATALOGO
CREAR_ARTICULO
EDITAR_CATALOGO
DESACTIVAR_ARTICULO
REACTIVAR_ARTICULO
GESTIONAR_CATEGORIAS
```

Los nombres exactos no quedan congelados como clases, enums ni registros persistentes.

La matriz completa:

```text
PROPIETARIO / ENCARGADO / TRABAJADOR
        ↓
permisos M02
```

permanece deliberadamente abierta hasta diseñar de forma transversal la autorización del sistema.

Por lo tanto, esta guía NO debe utilizarse para inferir automáticamente:

```text
solo PROPIETARIO puede editar
ENCARGADO nunca puede editar
TRABAJADOR nunca podrá recibir un permiso adicional
```

sin una decisión funcional explícita.

La secuencia de edición exige únicamente:

```text
permiso conceptual para editar catálogo
```

además de:

```text
Usuario autenticado
UsuarioNegocio ACTIVO
mismo Negocio
tenant scoping
```

## Restricción Explícita Conservada

Para hard delete de `ArticuloCatalogo` en el MVP sí existe una decisión funcional específica:

```text
PROPIETARIO
+
ArticuloCatalogo INACTIVO
+
sin historia/referencias/dependencias
```

Esta excepción explícita no debe generalizarse automáticamente a todas las operaciones de M02.

---

# 56. Aislamiento entre Negocios

Toda operación debe respetar:

```text
Negocio autorizado
ArticuloCatalogo.negocio
Categoria.negocio

```

Nunca permitir:

```text
Articulo del Negocio A + Categoria del Negocio B

```

ni:

```text
Usuario autorizado en A → modifica recursos de B

```

La estrategia técnica de aislamiento multitenant se decidirá en Arquitectura.

---

# 57. Trazabilidad y Auditoría Conceptual

Toda modificación relevante debe poder responder conceptualmente:

```text
¿Quién?
¿Cuándo?
¿Qué recurso?
¿Qué cambio fue confirmado?
```

Para `EditarArticulo`, una confirmación debe conservar contexto suficiente para reconstruir al menos:

```text
usuario
artículo
cambios confirmados
instante de confirmación
```

Otros ejemplos relevantes:

```text
crear artículo
cambiar SKU
cambiar precio
cambiar capacidades
desactivar
reactivar
renombrar Categoria
hard delete
```

Esto no obliga a implementar:

```text
Event Sourcing
AuditRepository
tabla universal de auditoría
Domain Events
middleware específico
```

en este momento.

El mecanismo técnico pertenece a Arquitectura.

---

# 58. Relación con M03 — Compras

M03 utilizará artículos con:

```text
esComprable = True

```

M02 no registra Compras ni modifica el catálogo al comprar.

---

# 59. Relación con M04 — Inventario

M04 administra existencias solamente cuando:

```text
controlaStock = True

```

M02 NO administra stock actual, lotes ni movimientos.

M04 completará las condiciones concretas para cambios estructurales de catálogo relacionados con inventario.

---

# 60. Relación con M05 — Ventas

M05 utiliza artículos con:

```text
esVendible = True

```

M02 aporta `precioBase` actual como referencia.

M05 preserva el precio realmente aplicado en cada Venta. Cambiar el catálogo no reescribe ventas históricas.

---

# 61. Relación con M07 — Producción

M07 podrá utilizar como insumos artículos con:

```text
puedeUsarseEnProduccion = True
(implica BIEN + controlaStock = True)

```

M02 no contiene recetas, producciones ni consumos.

---

# 62. Implicancias para Arquitectura

Este modelo exige que Arquitectura pueda resolver posteriormente:

```text
unicidad contextual de nombre de artículo
unicidad contextual de SKU y Categoria
guardias contextuales
atomicidad semántica
concurrencia y aislamiento
detección de lost updates
consultas de dependencias
autorización multitenant
trazabilidad
hard delete seguro
lifecycle seguro de archivos de imagen
```

Especialmente sensibles:

```text
edición compuesta
cambio de SKU
cambio de nombre
cambio estructural de capacidades
cambio de UnidadMedida
asignación concurrente de Categoria
eliminación física
edición concurrente del mismo artículo
edición vs desactivación
```

La arquitectura debe permitir:

```text
entrada parcial
→ propuesta coherente completa
→ validación local
→ defensas contextuales
→ confirmación todo-o-nada
```

Pero este documento NO prescribe:

```text
ORM
Repository concreto
Unit of Work concreto
transacción SQL exacta
SELECT FOR UPDATE
optimistic locking
pessimistic locking
nivel de aislamiento
Domain Events
microservicios
storage de imágenes
```

La arquitectura futura debe adaptarse a las invariantes.

Las invariantes no deben debilitarse para simplificar una implementación.

La entidad de dominio NO consulta repositories directamente para resolver guardias contextuales.

---

# 63. Implicancias para el Modelo Relacional

No traducir mecánicamente:

```text
1 clase UML = 1 tabla
```

En particular:

```text
CapacidadesArticulo <<value object>>
```

no obliga a una tabla separada.

Puede representarse técnicamente de distintas maneras siempre que preserve sus invariantes.

```text
UnidadMedida <<enum>>
```

no obliga a una tabla propia.

La colección conceptual:

```text
0..3 imágenes
```

tampoco congela todavía:

```text
tabla separada
array
JSON
entidad Imagen
Value Object
storage externo
```

La representación relacional deberá preservar:

```text
máximo 3 referencias
exactamente una principal si existen
pertenencia correcta al artículo
```

sin filtrar decisiones de storage hacia el dominio.

Del mismo modo:

```text
propuestaEdicionPreparada
```

NO debe traducirse automáticamente a una tabla o entidad persistente.

Las restricciones de unicidad funcional de:

```text
nombre de artículo
SKU
nombre de Categoria
```

deben contar con una defensa consistente en persistencia, pero la forma exacta se define posteriormente.

---

# 64. Implicancias para la API

Una API futura no debe permitir saltarse invariantes mediante modificaciones ciegas.

HTTP `PATCH` parcial:

```text
NO significa
setter parcial en el dominio
```

Flujo conceptual de edición:

```text
payload parcial
↓
autorización contextual
↓
carga tenant-scoped de ArticuloCatalogo
↓
distinguir campo omitido / null explícito
↓
normalizar entrada
↓
resolver Categoria si corresponde
↓
prevalidar nombre, SKU e imágenes
↓
construir propuestaEdicionPreparada
↓
ArticuloCatalogo valida TODA la configuración resultante
↓
si es válida, aplica coherentemente
↓
persistencia protege unicidades / concurrencia
↓
confirmación todo-o-nada
```

La API NO debe rechazar la edición únicamente porque:

```text
estado = INACTIVO
```

Editar un INACTIVO es válido administrativamente y lo deja INACTIVO.

La API tampoco debe:

```text
editar INACTIVO
→ reactivar automáticamente
```

La reactivación es otra operación.

`ReactivarArticulo` utiliza la configuración vigente y no debe convertirse en un endpoint alternativo con payload libre para modificar:

```text
precio
SKU
Categoria
UnidadMedida
capacidades
imágenes
```

Si la configuración requiere cambios:

```text
editar
→ confirmar
→ reactivar
```

Quedan abiertas:

```text
endpoint
verbo HTTP
DTO concreto
Command
status code
error code
```

---

# 65. Implicancias para UX

La UX debe simplificar capacidades mediante lenguaje cotidiano y prevenir combinaciones inválidas.

Sin embargo:

```text
UX previene errores
≠
única capa de validación
```

El backend protege todas las invariantes.

## Artículo ACTIVO

La UX puede ofrecer edición administrativa cuando el Usuario posea el permiso correspondiente.

Una edición válida:

```text
mantiene ACTIVO
```

Si la configuración candidata dejaría al artículo sin los requisitos locales necesarios para permanecer ACTIVO:

```text
rechazar edición
```

No desactivarlo silenciosamente.

## Artículo INACTIVO

La UX administrativa puede permitir:

```text
corregir nombre
preparar precio
modificar Categoria
gestionar SKU
ajustar UnidadMedida
actualizar configuración/capacidades
gestionar imágenes
```

según permisos.

Guardar esos cambios:

```text
NO reactiva
```

El artículo sigue `INACTIVO`.

Después, si se desea:

```text
Reactivar
```

es una acción explícita separada.

## Capacidades

La UI no debe exponer obligatoriamente al operador todos los flags internos de `CapacidadesArticulo`.

Puede presentar conceptos comerciales comprensibles y derivar internamente la configuración necesaria.

## Imágenes

Puede mostrarse una imagen principal en listados/carrito y permitir visualizar hasta tres imágenes donde corresponda.

## SKU vacío

Una entrada vacía o compuesta solo por espacios se interpreta como:

```text
null
```

no como un SKU real vacío.

---

# 66. Dinero y Cantidades

Una futura implementación debe respetar:

```text
dinero → representación decimal exacta (ej. Decimal / Numeric)
cantidades → admitir fracciones (ej. 0.500 kg, 1.5 horas)

```

Evitar el uso de `Float` binario para valores monetarios.

---

# 67. Problemas de Diseño que Este Modelo Busca Evitar

1. **Jerarquías rígidas:** evitar clases `Producto`, `Insumo`, `Servicio`.
2. **Setteritis:** evitar una secuencia pública de setters para una edición compuesta.
3. **Mutación antes de validar:** evitar dejar una entidad parcialmente modificada en memoria ante un error posterior.
4. **Pérdida de historia:** evitar reescribir operaciones pasadas usando valores actuales.
5. **SKU o nombre como identidad:** son claves funcionales editables, no identidad técnica.
6. **Auto-fix silencioso:** el VO rechaza configuraciones incoherentes.
7. **Bloqueo artificial de INACTIVO:** un INACTIVO puede editarse administrativamente sin reactivarse.
8. **Reactivación como bypass de edición:** reactivar no lleva payload libre de configuración.
9. **Matriz rígida de permisos prematura:** no congelar `Rol → Permiso` sin decisión funcional.
10. **Check-then-save inseguro:** prevalidar no reemplaza la defensa final de persistencia.
11. **Lost update:** dos ediciones concurrentes no deben sobrescribirse silenciosamente.
12. **Acoplamiento con Inventario/Producción:** no meter stock, lotes o recetas en el catálogo.
13. **Imagen única accidental:** el MVP admite hasta 3 imágenes.
14. **Efectos externos irreversibles:** no borrar archivos antes de una confirmación segura.
15. **Bloqueo histórico excesivo de UnidadMedida:** la historia debe conservar su propia unidad; el catálogo actual evoluciona hacia futuro.
16. **Acoplar precio a promociones:** cambiar `precioBase` no modifica promociones existentes.

---

# 68. Qué Debe Hacer una IA al Utilizar Este Diagrama

Una IA debe:

1. leer primero `M02-Catalogo.md`;
2. utilizar `secuencias/02-editar-articulo.puml` para comprender la edición;
3. respetar la identidad estable de las entidades;
4. mantener `TipoArticulo` inmutable;
5. tratar `CapacidadesArticulo` como VO inmutable sin auto-fix;
6. permitir edición administrativa de ACTIVO e INACTIVO;
7. mantener el estado durante una edición;
8. separar estrictamente edición y reactivación;
9. diferenciar en entrada parcial campo omitido de `null` explícito;
10. impedir que el DTO de API cruce directamente al dominio;
11. construir una propuesta preparada y coherente;
12. validar toda la propuesta antes de mutar;
13. aplicar la edición de forma compuesta, no mediante setters públicos indiscriminados;
14. proteger nombre y SKU únicos entre ACTIVOS e INACTIVOS;
15. normalizar SKU vacío a `null`;
16. exigir Categoria ACTIVA y del mismo Negocio para una nueva asociación;
17. proteger 0..3 imágenes y exactamente una principal cuando existan;
18. no modificar promociones al cambiar `precioBase`;
19. preservar historia de precio, unidad y cantidades;
20. detectar conflictos de concurrencia y lost updates;
21. aplicar tenant scoping;
22. autorizar mediante permiso conceptual;
23. mantener abiertas las decisiones técnicas que no han sido aprobadas.

Una IA NO debe asumir que el diagrama de clases define por sí solo:

```text
ORM
tablas
endpoints
Aggregate Roots
Repository
locking
storage de archivos
matriz completa Rol → Permiso
```

---

# 69. Tests Derivables — Suite Mínima de Dominio e Integración

## A. TipoArticulo y CapacidadesArticulo

1. Crear BIEN válido.
2. Crear SERVICIO válido.
3. Impedir SERVICIO con stock.
4. Impedir SERVICIO con vencimiento.
5. Impedir SERVICIO en producción.
6. Impedir vencimiento sin stock.
7. Impedir producción sin stock.
8. Rechazar descuento sin venta.
9. Verificar que el VO NO auto-corrige.
10. Reemplazar capacidades con una configuración completa válida.
11. Verificar `TipoArticulo` inmutable.

## B. EstadoArticulo y Edición

12. Crear ACTIVO con al menos un uso operativo.
13. Impedir ACTIVO con cero usos.
14. Permitir INACTIVO con cero usos.
15. Permitir editar un ACTIVO con permiso correspondiente.
16. Permitir editar un INACTIVO con permiso correspondiente.
17. Editar ACTIVO mantiene ACTIVO.
18. Editar INACTIVO mantiene INACTIVO.
19. Rechazar edición que dejaría ACTIVO con cero usos.
20. Verificar que editar no constituye transición de `EstadoArticulo`.
21. Verificar que identidad y TipoArticulo no formen parte de la propuesta editable.
22. Entrada parcial conserva campos omitidos.
23. `null` explícito quita campos opcionales cuando corresponde.
24. Error en cualquier campo evita toda confirmación parcial.
25. Validación de dominio falla sin mutación observable.
26. El DTO de Application no se utiliza como objeto de dominio.

## C. Precio, Costo y Promociones

27. Vendible exige `precioBase`.
28. Precio negativo se rechaza.
29. `precioBase = 0` satisface la invariante estructural `>= 0`.
30. M02 no interpreta automáticamente precio cero como promoción.
31. `costoReferencia` puede ser null.
32. Costo negativo se rechaza.
33. Deshabilitar venta construye `vendible=False + descuento=False`.
34. Deshabilitar venta conserva `precioBase`.
35. Cambiar `precioBase` no modifica promociones existentes.
36. Cambiar `precioBase` no reescribe ventas históricas.

## D. Reactivación

37. Reactivar INACTIVO válido produce ACTIVO.
38. Reactivar reutiliza la misma identidad.
39. Reactivar ACTIVO se rechaza como operación inválida/no-op no silencioso.
40. Reactivación con configuración vigente inválida se rechaza.
41. Reactivación fallida mantiene INACTIVO.
42. Reactivación no acepta payload libre de edición.
43. Preparar INACTIVO mediante EditarArticulo y luego reactivar funciona como dos operaciones separadas.
44. Categoria histórica INACTIVA no bloquea por sí sola.

## E. Nombre y SKU

45. Nombre de artículo es único por Negocio.
46. INACTIVO continúa reservando nombre.
47. Dos Negocios pueden reutilizar el mismo nombre.
48. Conflicto concurrente de nombre no confirma duplicado.
49. Permitir artículo sin SKU.
50. Normalizar `""` o espacios a `null`.
51. Impedir SKU duplicado con ACTIVO.
52. Impedir SKU duplicado con INACTIVO.
53. Desactivar no libera SKU.
54. A→B valida B y libera A al confirmar.
55. A→null libera A al confirmar.
56. null→B valida B.
57. A→A es no-op funcional.
58. Dos asignaciones concurrentes no confirman el mismo SKU.

## F. Categoria y Tenant

59. Nueva asociación exige Categoria ACTIVA.
60. Reasignación a Categoria INACTIVA se rechaza.
61. Categoria de otro Negocio se rechaza.
62. Inactivar Categoria no inactiva artículos.
63. Asociación histórica se conserva.
64. Usuario autorizado en otro Negocio no modifica el recurso.
65. Categoria que se inactiva concurrentemente antes de confirmar una nueva asociación provoca rechazo/conflicto.

## G. Imágenes

66. Permitir cero imágenes.
67. Permitir una imagen principal.
68. Permitir dos o tres imágenes con exactamente una principal.
69. Rechazar cuatro imágenes.
70. Rechazar colección no vacía sin principal.
71. Rechazar más de una principal.
72. Domain protege la invariante aunque Application haya prevalidado.
73. Falla de persistencia no debe dejar referencias lógicas parcialmente confirmadas.
74. Lifecycle físico no debe borrar irreversiblemente recursos previos antes de una confirmación segura.

## H. Desactivación y Hard Delete

75. Desactivar conserva identidad/configuración.
76. Desactivar con stock > 0 está permitido desde M02.
77. Desactivar no modifica M04.
78. Hard delete de ACTIVO se rechaza.
79. Hard delete por actor no permitido se rechaza.
80. Hard delete con dependencias se rechaza.
81. Hard delete válido libera SKU al confirmar.
82. Hard delete no crea `ELIMINADO`.
83. Dependencias se revalidan al confirmar.

## I. UnidadMedida e Historia

84. BIEN exige UnidadMedida válida.
85. SERVICIO admite UNIDAD.
86. SERVICIO admite HORA.
87. Cambiar UnidadMedida afecta configuración futura.
88. Operaciones históricas conservan su unidad original.
89. La mera existencia de historia no bloquea automáticamente todo cambio.
90. Dependencias operativas futuras pueden impedir cambios incompatibles.
91. No se requiere `tieneHistoriaOperativa`.

## J. Concurrencia / TOCTOU / Auditoría

92. Edición concurrente del mismo artículo no produce lost update silencioso.
93. Edición concurrente con desactivación se resuelve sin estado inválido confirmado.
94. Nueva operación consumidora revalida artículo desactivado después de selección.
95. Conflicto de nombre concurrente se detecta.
96. Conflicto de SKU concurrente se detecta.
97. Cambio concurrente relevante de Categoria se detecta.
98. Hard delete concurrente con nueva referencia no viola integridad.
99. Edición confirmada permite reconstruir quién, cuándo, qué artículo y qué cambios.
100. `registrarCambio()` no se interpreta como commit independiente obligatorio.

---

# 70. Estado del Artefacto y Próximo Paso

Con esta versión queda actualizada semánticamente:

```text
03-m02-catalogo-clases.md
✅ ALINEADO CON M02-Catalogo.md
✅ ALINEADO CON secuencias/02-editar-articulo.puml
```

Todavía falta propagar estas decisiones a:

```text
03-m02-catalogo-clases.puml
03-m02-catalogo-clases.png

06-m02-estados-articulo.md
06-m02-estados-articulo.puml
06-m02-estados-articulo.png
```

Estado actual del Bloque 1 relevante para M02:

```text
M02-Catalogo.md
✅ ACTUALIZADO

03 — M02 Catálogo — Guía de Clases
✅ ACTUALIZADA

03 — M02 Catálogo — PUML
⚠️ SIGUIENTE ARTEFACTO A SINCRONIZAR

06 — M02 ArticuloCatalogo — Estados
⚠️ PENDIENTE DESPUÉS DE 03

Secuencia 02 — Editar Artículo
✅ REFERENCIA DINÁMICA VIGENTE
```

Después de actualizar 03 y 06 corresponde:

```text
auditoría transversal del Bloque 1
```

Esa auditoría debe revisar también:

```text
01-modelo-dominio-bloque-1.md
01-diagrama-general.puml
artefactos M01
referencias de estado documental
firmas
invariantes
permisos
cardinalidades
secuencias
```

No declarar el Bloque 1 completamente congelado antes de esa revisión cruzada.

---

# 71. Qué NO Debe Inferir una IA

El Diagrama 3 NO implica que:

```text
ArticuloCatalogo sea Aggregate Root
Categoria sea Aggregate Root
CapacidadesArticulo tenga tabla propia
cada enum sea tabla SQL
cada método sea endpoint
cada asociación sea FK idéntica al UML
exista Repository por entidad
exista Unit of Work
se utilicen Domain Events
Event Sourcing
CQRS
microservicios
```

Tampoco inferir:

```text
INACTIVO → no editable

editar INACTIVO → reactivar

reactivar() → recibir payload libre de edición

PROPIETARIO → único Rol capaz de editar
sin decisión explícita de autorización

atributo editable → setter público independiente

HTTP PATCH → setters parciales del dominio

SKU opcional → "" y null son dos ausencias persistibles

nombre editable → duplicados permitidos si uno está INACTIVO

precioBase [0..1] → puede faltar cuando esVendible=True

precioBase = 0 → promoción o gratuidad automática

cambiar precio → recalcular promociones

cambiar unidad → reescribir cantidades históricas

tener historia → bloquear para siempre UnidadMedida

imagen principal → solo puede existir una imagen total
```

La implementación se deriva del conjunto de invariantes, no de una traducción mecánica del dibujo.

---

# 72. Qué NO Debe Agregar una IA

No crear por iniciativa propia:

```text
Producto
MateriaPrima
ProductoTerminado
Servicio como subclase

StockActual
StockUbicacion
Lote
MovimientoInventario

Compra
Venta
Receta
Produccion

SkuHistorico
AliasSku
HistorialArticulo universal

Permiso
RBAC dinámico
tieneHistoriaOperativa

Estado ELIMINADO
Estado ARCHIVADO
Estado AGOTADO
```

No introducir dentro de Entidades/VO:

```text
Repository
SQL session
HTTP request
DTO
token
lock concreto
```

No crear `activar()` y `reactivar()` con semánticas distintas para la misma transición histórica sin nueva decisión funcional.

---

# 73. Decisiones Técnicas que Permanecen Abiertas

No se decide aquí:

```text
Aggregate Roots formales
Factory Methods
Domain Services
Application Services concretos

Repository
Unit of Work
Domain Events

transacciones
optimistic/pessimistic locking
version column
timestamp de concurrencia
nivel de aislamiento

tablas
foreign keys
índices
constraints SQL
ORM

SKU:
- case sensitivity
- trim exacto
- Unicode
- regex/formato
- collation SQL

nombre de artículo / Categoria:
- algoritmo exacto de equivalencia funcional
- normalización técnica concreta

precisión SQL exacta

imágenes:
- clase/VO concreto para colección
- storage
- CDN
- lifecycle físico
- estrategia de borrado

DTOs
Commands
endpoints
códigos HTTP
clases de excepción
error codes

matriz completa Rol → Permiso M02
mecanismo concreto de auditoría
```

También permanece deliberadamente abierta la regla comercial definitiva de:

```text
venta normal con precioBase = 0
```

M02 congela únicamente la invariante estructural:

```text
precioBase >= 0
```

Estas decisiones futuras deben satisfacer las invariantes ya definidas.

---

# 74. Contrato Semántico Mínimo para una IA

```text
1. ArticuloCatalogo representa BIEN o SERVICIO.
2. TipoArticulo es inmutable.
3. EstadoArticulo = ACTIVO | INACTIVO.
4. ACTIVO exige >=1 uso operativo.
5. INACTIVO puede tener 0 usos.
6. ACTIVO e INACTIVO pueden editarse administrativamente.
7. Editar NO cambia EstadoArticulo.
8. Reactivar es un Caso de Uso separado: INACTIVO → ACTIVO.
9. Reactivar utiliza configuración vigente; no recibe payload libre de edición.
10. Identidad y TipoArticulo no forman parte de una edición.
11. La entrada de edición puede ser parcial.
12. Campo omitido ≠ null explícito.
13. PropuestaEdicionDTO pertenece a Application/API.
14. Domain recibe una propuesta preparada independiente del transporte.
15. ArticuloCatalogo valida toda la propuesta antes de mutar.
16. Edición se aplica todo-o-nada.
17. No implementar EditarArticulo como cadena de setters públicos.
18. CapacidadesArticulo es VO inmutable.
19. VO valida y acepta/rechaza; no auto-corrige.
20. SERVICIO no controla stock/vencimiento/producción.
21. Descuento implica vendible.
22. Si vendible, precioBase existe y >=0.
23. Precio cero no recibe semántica comercial automática desde M02.
24. Cambiar precio no altera promociones ni historia.
25. costoReferencia es opcional; si existe >=0.
26. Nombre de artículo es único por Negocio entre ACTIVO+INACTIVO.
27. SKU opcional; ausencia=null; ""/espacios→null.
28. SKU único por Negocio entre ACTIVO+INACTIVO.
29. Categoria nueva/reasignada debe estar ACTIVA y ser del mismo Negocio.
30. Artículo admite 0..3 imágenes y exactamente una principal si existen.
31. Cambiar UnidadMedida aplica hacia futuro; historia conserva unidad original.
32. Desactivar no libera SKU ni modifica M04.
33. Hard delete requiere PROPIETARIO + INACTIVO + sin dependencias.
34. Guardias contextuales no se resuelven desde entidad consultando repositories.
35. Prechecks no reemplazan defensas finales de persistencia.
36. Lost updates y duplicidades concurrentes no pueden confirmarse silenciosamente.
37. Toda consulta/mutación respeta tenant scoping.
38. Autorización se expresa mediante permiso conceptual; matriz de roles abierta salvo reglas explícitas.
39. Edición confirmada debe ser auditable conceptualmente.
40. Módulos consumidores preservan hechos históricos.
```

---

# 75. Checklist para Implementación Asistida por IA

```text
[ ] TipoArticulo inmutable.
[ ] Solo ACTIVO / INACTIVO.
[ ] ACTIVO exige >=1 uso operativo.
[ ] INACTIVO puede tener 0 usos.

[ ] Editar ACTIVO permitido con autorización.
[ ] Editar INACTIVO permitido con autorización.
[ ] Edición no cambia estado.
[ ] Reactivación separada de edición.
[ ] Reactivación sin payload libre de edición.

[ ] Entrada parcial distingue omitido/null.
[ ] DTO de API no cruza al Domain.
[ ] propuestaEdicionPreparada no es entidad persistente.
[ ] Validar propuesta completa antes de mutar.
[ ] Edición todo-o-nada.
[ ] Sin cadena pública de setters para EditarArticulo.

[ ] CapacidadesArticulo inmutable.
[ ] Sin setters parciales sobre VO.
[ ] Sin auto-fixes.
[ ] Combinación inválida se rechaza.

[ ] Vendible exige precioBase válido.
[ ] precioBase negativo rechazado.
[ ] precioBase=0 no recibe semántica promocional automática.
[ ] costoReferencia opcional y >=0 si existe.
[ ] Cambiar precio no cambia promociones.
[ ] Historia de precios intacta.

[ ] Nombre no es identidad.
[ ] Nombre único por Negocio ACTIVO+INACTIVO.
[ ] INACTIVO reserva nombre.

[ ] SKU no es identidad.
[ ] SKU vacío/espacios → null.
[ ] SKU único ACTIVO+INACTIVO.
[ ] Desactivar no libera SKU.

[ ] Categoria nueva/reasignada ACTIVA.
[ ] Categoria del mismo Negocio.
[ ] Categoria histórica INACTIVA conserva asociación.
[ ] Cambio concurrente relevante de Categoria protegido.

[ ] Imágenes 0..3.
[ ] Si hay imágenes, exactamente una principal.
[ ] Domain protege la invariante de imágenes.
[ ] Storage físico no filtrado al dominio.
[ ] Sin efectos irreversibles inseguros antes de confirmar.

[ ] UnidadMedida vigente aplica hacia futuro.
[ ] Historia conserva unidad/cantidad originales.
[ ] No bloquear todo cambio solo por existir historia.
[ ] M02 no contiene stock/lotes/recetas/ventas/compras.

[ ] Desactivar no modifica M04.
[ ] stock >0 no impide por sí solo desactivar.

[ ] Hard delete exige INACTIVO.
[ ] Hard delete reservado a PROPIETARIO.
[ ] Hard delete revalida dependencias.
[ ] Hard delete no crea ELIMINADO.

[ ] Usuario y Negocio provienen de contexto confiable.
[ ] UsuarioNegocio ACTIVO.
[ ] Permiso conceptual requerido.
[ ] Tenant scoping en consultas.
[ ] No autorizar solo por un ID/rol enviado por cliente.
[ ] Matriz completa Rol→Permiso no inventada.

[ ] Preconsulta UX no es garantía.
[ ] Nombre/SKU concurrentes protegidos.
[ ] Lost update protegido.
[ ] Edición vs desactivación protegida.
[ ] registrarCambio() no interpretado como commit independiente obligatorio.

[ ] Auditoría conceptual de edición.
[ ] Dinero decimal exacto.
[ ] Cantidades fraccionarias.
[ ] Sin infraestructura inventada.
```

---

# 76. Regla Final

El UML es:

```text
representación visual del dominio
```

No es:

```text
especificación automática de ORM
tablas
endpoints
infraestructura
```

Principio final:

> **ArticuloCatalogo mantiene identidad y configuración vigente; TipoArticulo permanece inmutable; EstadoArticulo determina su habilitación para nuevas operaciones, pero no bloquea la edición administrativa; editar cambia configuración hacia futuro sin alterar el estado ni reescribir historia; reactivar es una operación separada; CapacidadesArticulo expresa elegibilidad mediante un Value Object inmutable; Application coordina contexto y referencias; Domain valida antes de mutar; Persistencia protege unicidad, atomicidad y concurrencia; los módulos consumidores preservan sus hechos históricos.**

> **La implementación debe adaptarse a estas invariantes. Las invariantes no deben debilitarse para adaptarse a una implementación ya escrita.**
