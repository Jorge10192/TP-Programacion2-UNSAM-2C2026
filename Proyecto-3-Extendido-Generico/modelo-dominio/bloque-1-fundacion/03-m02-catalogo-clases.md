# 03 — M02 Catálogo — Guía de Interpretación del Diagrama de Clases

## 1. Propósito del Documento

Este documento acompaña al diagrama oficial:

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
- qué riesgos de implementación deben evitarse;
- qué decisiones siguen abiertas para Arquitectura;
- cómo derivar código y tests sin convertir el UML mecánicamente en ORM o CRUD.

Este archivo constituye la **guía semántica del Diagrama 3**.

Debe leerse junto con:

```text
06-m02-estados-articulo.md
06-m02-estados-articulo.puml
```

porque ambas vistas son complementarias:

```text
Diagrama 3
→ estructura
→ relaciones
→ responsabilidades
→ invariantes estáticas

Diagrama 6
→ ciclo de vida
→ transiciones
→ restricciones dependientes de EstadoArticulo
```

No reemplaza la especificación funcional `M02-Catalogo.md`.

No debe introducir una regla funcional nueva que contradiga esa especificación.

---

# 2. Ubicación dentro de la Documentación

La estructura esperada es:

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
        └── 03-m02-catalogo-clases.png

```

Este archivo:

```text
03-m02-catalogo-clases.md

```

documenta cómo debe interpretarse:

```text
03-m02-catalogo-clases.puml

```

---

# 3. Estado del Artefacto

El Diagrama 3 forma parte de la especificación de Fundación y su **semántica queda cerrada con este documento**.

Estado semántico objetivo:

```text
03-m02-catalogo-clases.md      ✅ SEMÁNTICA SINCRONIZADA
03-m02-catalogo-clases.puml    🟡 DEBE COINCIDIR CON ESTA GUÍA
03-m02-catalogo-clases.png     🟡 DEBE DERIVARSE DEL PUML SINCRONIZADO
```

Una vez que el `.puml` y su render hayan sido revisados contra esta guía, el estado documental puede actualizarse a:

```text
03-m02-catalogo-clases.md      ✅ CONGELADO Y SINCRONIZADO
03-m02-catalogo-clases.puml    ✅ CONGELADO Y SINCRONIZADO
03-m02-catalogo-clases.png     ✅ CONGELADO Y SINCRONIZADO
```

La palabra **congelado** significa:

```text
la estructura y las invariantes representadas
no deben modificarse silenciosamente durante implementación
```

No significa que el modelo nunca pueda evolucionar.

Si una necesidad futura exige modificar entidades, cardinalidades, estados, invariantes, política de SKU, reglas de Categoria, capacidades o permisos de reactivación, primero debe modificarse la especificación funcional y luego resincronizarse el conjunto documental.

No deben coexistir dos fuentes con semánticas incompatibles.

---

# 4. Fuentes de Verdad y Orden de Interpretación

Para interpretar o implementar M02 debe utilizarse este orden:

```text
1. modulos/M02-Catalogo.md
   → especificación funcional

2. modelo-dominio/bloque-1-fundacion/
   01-modelo-dominio-bloque-1.md
   → reglas transversales del Bloque 1

3. modelo-dominio/bloque-1-fundacion/
   03-m02-catalogo-clases.md
   03-m02-catalogo-clases.puml
   → estructura y responsabilidades

4. modelo-dominio/bloque-1-fundacion/
   06-m02-estados-articulo.md
   06-m02-estados-articulo.puml
   → ciclo de vida y restricciones por estado

5. ADRs / Diseño Técnico
6. Modelo Relacional
7. Contrato API
8. Código
```

Los Diagramas 3 y 6 son **vistas complementarias del mismo dominio**.

Si dos fuentes parecen incompatibles:

```text
NO elegir silenciosamente una
NO inferir una solución
NO corregir desde el código
```

Debe resolverse primero la contradicción documental.

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

¿Qué reglas puede validar un objeto con información local?

¿Qué reglas necesitan contexto del Negocio?

¿Qué reglas necesitan información de módulos posteriores?

¿Qué significa ACTIVO?

¿Qué significa INACTIVO?

¿Por qué un artículo INACTIVO no admite edición individual en MVP?

¿Cómo se diferencia la reactivación simple de la reactivación con reconfiguración?

¿Qué significa desactivar?

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

* relaciones;
* cardinalidades;
* composición conceptual;
* estado;
* comportamiento relevante;
* invariantes principales;
* restricciones de modificación;
* dependencia conceptual de información externa.

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

El nombre también es editable.

Ninguno debe utilizarse como identidad técnica primaria del artículo.

La misma regla conceptual aplica a Categoria:

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

`puedeEliminarseFisicamente()` puede existir como consulta conceptual para UX o diagnóstico.

No debe interpretarse como autorización definitiva.

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
├── imagenPrincipal opcional
├── precioBase opcional
├── costoReferencia opcional
├── capacidades : CapacidadesArticulo
└── estado : EstadoArticulo

```

---

# 21. Edición de Atributos y Regla MVP en Estado INACTIVO

El Diagrama 3 muestra principalmente operaciones que poseen comportamiento o invariantes relevantes.

La ausencia de un método específico NO implica inmutabilidad.

Por ejemplo, conceptualmente pueden editarse:

```text
nombre
descripcion
SKU
imagenPrincipal
precioBase
costoReferencia
UnidadMedida
CapacidadesArticulo
Categoria

```

Únicamente:

```text
TipoArticulo

```

está definido explícitamente como **estrictamente inmutable**.

### Regla MVP — Edición Bloqueada en INACTIVO

```text
Edición normal de atributos:
→ permitida ÚNICAMENTE si estado == ACTIVO
→ autorizada solo para PROPIETARIO

```

Mientras un artículo permanezca en estado `INACTIVO`:

```text
NO admite edición individual de atributos

```

No deben existir comandos o endpoints normales que modifiquen datos dejando al artículo `INACTIVO`.

Para incorporar cambios de configuración a un artículo `INACTIVO` se debe utilizar el flujo de reactivación con reconfiguración por un `PROPIETARIO`.

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

# 25. Reactivación de ArticuloCatalogo

`reactivar()` no es una asignación ciega:

```text
estado = ACTIVO

```

Representa la transición semántica `INACTIVO → ACTIVO` y revalida todas las invariantes vigentes necesarias para volver a operar:

```text
coherencia Tipo + Capacidades
uso operativo mínimo
precioBase != null y >= 0 si esVendible
costoReferencia >= 0 si existe
compatibilidad con dependencias estructurales
otras guardias contextuales necesarias

```

No reescribe historia ni reconstruye operaciones anteriores.

Una Categoria históricamente asociada que actualmente se encuentre INACTIVA:

```text
NO bloquea por sí sola la reactivación

```

---

## 25.1. Reactivación Simple

Utiliza la configuración almacenada.

Pueden ejecutarla:

```text
PROPIETARIO
ENCARGADO

```

Siempre que la configuración actual de la entidad cumpla todas las invariantes vigentes.

---

## 25.2. Reactivación con Reconfiguración

Necesaria cuando la configuración almacenada de un artículo INACTIVO es inválida o requiere cambios para volver a operar.

Solo puede ejecutarla:

```text
PROPIETARIO

```

Flujo:

```text
Configuración candidata propuesta
+
validación local y contextual completa
+
transición a ACTIVO

```

Se confirman como **una única operación atómica**.

Si falla cualquier guardia o validación:

```text
artículo permanece INACTIVO
+
NO se persisten cambios parciales

```

---

## 25.3. Bloqueo de Bypass para ENCARGADO

```text
reactivar(payload)
≠
editarArticuloInactivo()

```

Un `ENCARGADO` NO puede utilizar un payload de reactivación para saltarse la prohibición de edición.

Si un `ENCARGADO` intenta reactivar un artículo cuya configuración almacenada no es válida:

```text
RECHAZAR operación
→ indicar que requiere reconfiguración por un PROPIETARIO

```

---

## 25.4. Equivalencia Semántica `activar` / `reactivar`

En interfaces de usuario o catálogos de permisos puede utilizarse el término:

```text
activar

```

Sin embargo, para un artículo histórico existente en estado `INACTIVO`, la transición semántica del dominio es:

```text
INACTIVO → ACTIVO
= reactivar

```

No deben modelarse ni implementarse dos ciclos de vida distintos (`activar()` y `reactivar()`).

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

Se permite:

```text
precioBase = 0

```

Modificar precioBase:

```text
NO reescribe ventas históricas

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

La ausencia funcional de SKU se representa en el dominio y persistencia como:

```text
null

```

Antes de validar o persistir, cualquier entrada de cadena vacía debe normalizarse:

```text
input "" → null

```

No utilizar `""` como segunda representación de "sin SKU".

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

### Decisiones Técnicas Diferidas (Arquitectura)

No se definen en esta especificación de dominio:

* case sensitivity;
* trim automático de espacios intermedios/extremos;
* normalización Unicode;
* formato regex exacto.

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

# 44. Cambio de Unidad e Historia Cuantitativa

`cambiarUnidad()` no debe alterar el significado de cantidades históricas.

Ejemplo:

```text
Harina
Unidad = KG
Compra histórica = 5 KG

```

No convertir mediante simple edición:

```text
KG → UNIDAD

```

si eso vuelve ambiguas o incorrectas las cantidades registradas.

La existencia de historia cuantitativa:

```text
es una condición derivada

```

NO agregar automáticamente:

```text
ArticuloCatalogo.tieneHistoriaOperativa : Boolean

```

La forma técnica de consultar esa información queda abierta.

---

# 45. Imagen Principal

Durante el MVP:

```text
ArticuloCatalogo
→ 0..1 imagenPrincipal

```

El diagrama no decide:

```text
filesystem
S3
blob SQL
URL pública
Base64

```

La estrategia de almacenamiento pertenece a Diseño Técnico.

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

# 48. Eliminación Física de ArticuloCatalogo

`eliminarFisicamente()`:

```text
NO es EstadoArticulo
NO crea estado ELIMINADO
NO es una transición de la máquina de estados

```

Es una operación administrativa excepcional.

Solo puede confirmarse cuando no existan:

```text
historia operativa relevante
referencias
dependencias que deban conservarse

```

Normalmente:

```text
artículo utilizado
→ desactivar

```

No:

```text
artículo utilizado
→ eliminar físicamente

```

La ausencia de dependencias debe revalidarse al momento de confirmar.

Si la eliminación física se confirma:

```text
SKU actual queda disponible para reutilización

```

---

# 49. `puedeEliminarseFisicamente()`

Representa una consulta conceptual.

Puede utilizarse para:

```text
UX
diagnóstico
orientación

```

No significa:

```text
la entidad aislada conoce toda la respuesta

```

La respuesta puede depender de módulos consumidores.

Tampoco significa:

```text
si devuelve True
→ eliminar después sin revalidar

```

La eliminación real debe volver a garantizar las condiciones al confirmar.

---

# 50. Estado Actual vs Historia

M02 representa:

```text
estado ACTUAL del catálogo

```

Pueden cambiar:

```text
nombre
descripcion
Categoria
SKU
precioBase
costoReferencia
imagen
capacidades permitidas
estado

```

Los módulos transaccionales deben preservar los valores históricos que necesiten para interpretar correctamente sus operaciones.

No reconstruir una operación histórica leyendo solamente:

```text
ArticuloCatalogo.nombre actual
ArticuloCatalogo.sku actual
ArticuloCatalogo.precioBase actual
Categoria actual

```

si esa operación necesita los valores existentes al momento original.

Este documento no impone la técnica concreta:

```text
snapshot
campos copiados
versionado
otra estrategia

```

---

# 51. Validaciones Locales vs. Contextuales

Debe garantizarse una separación estricta de responsabilidades entre el objeto de dominio y la capa de aplicación/persistencia.

## Guardias Locales (Validadas por Entidad / VO)

Se resuelven exclusivamente con la información contenida en el propio objeto o propuesta:

```text
• TipoArticulo + CapacidadesArticulo
• Si esVendible == true => precioBase != null y precioBase >= 0
• Si costoReferencia != null => costoReferencia >= 0
• Uso operativo mínimo en ACTIVO (>= 1 entre comprable, vendible o producción)
• TipoArticulo inmutable
• Coherencia interna e inmutabilidad del Value Object

```

## Guardias Contextuales (Caso de Uso / Persistencia)

Requieren consultar información externa al objeto de dominio:

```text
• Usuario autenticado y membresía UsuarioNegocio ACTIVA
• Tenant / pertenencia al mismo Negocio
• SKU único por Negocio (considerando ACTIVOS e INACTIVOS)
• Categoria del mismo Negocio
• Categoria ACTIVA para nueva asociación o reasignación
• Historia cuantitativa relevante
• Dependencias estructurales en M04 / M07
• Ausencia de referencias para eliminación física

```

El objeto de dominio **NO consulta repositorios directamente** para resolver guardias contextuales.

---

# 52. Preconsulta vs Confirmación

Una consulta previa puede orientar la UX:

```text
puedeEliminarseFisicamente()
skuDisponible()
categoriaDisponible()
puedeCambiarUnidad()

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

La forma técnica puede incluir posteriormente:

```text
constraints SQL
transacciones
locking
versionado
otra estrategia

```

pero no se decide en este UML.

---

# 53. Concurrencia y Carrera TOCTOU

Existe un riesgo general de:

```text
Time Of Check
        ↓
Time Of Use (TOCTOU)

```

cuando se separa la prevalidación de la confirmación.

Ejemplo explícito:

```text
T0: Artículo X está ACTIVO
T1: Usuario A selecciona Artículo X en una pantalla de nueva operación
T2: Usuario B desactiva concurrentemente el Artículo X
T3: Usuario A intenta confirmar la nueva operación consumidora

```

Regla de integridad:

```text
La selección previa NO garantiza elegibilidad al confirmar.

```

El módulo consumidor (M03, M05, M07) debe revalidar el estado del artículo en el momento exacto de la confirmación.

---

# 54. Autorización Contextual

Los métodos del dominio:

```text
NO autorizan actores

```

No agregar parámetros como `rol`, `usuarioActual` o `token` a los métodos de `ArticuloCatalogo` o `Categoria`.

Antes de ejecutar cualquier mutación, el Caso de Uso debe validar:

```text
Usuario autenticado
+
Negocio identificado
+
UsuarioNegocio ACTIVO
+
Rol
+
permiso concreto de M02
+
recurso perteneciente al mismo Negocio

```

No autorizar únicamente mediante `rol == PROPIETARIO` sin comprobar la membresía ACTIVA y el Negocio correspondiente.

---

# 55. Permisos M02 por Rol

## PROPIETARIO

Puede:

```text
consultar
crear artículos
editar artículos ACTIVOS
desactivar artículos
reactivar artículos (simple)
reactivar artículos con reconfiguración
eliminar físicamente cuando corresponda
administrar Categorias (crear, editar, activar, desactivar, eliminar)
modificar precioBase
modificar costoReferencia
modificar capacidades
modificar SKU
modificar UnidadMedida cuando corresponda

```

## ENCARGADO

Puede:

```text
consultar catálogo y categorías
desactivar artículos
reactivar artículos SIN modificar configuración (reactivación simple)

```

No puede:

* crear o editar artículos;
* eliminar artículos;
* modificar precioBase, costo, SKU, capacidades o UnidadMedida;
* administrar Categorias.

Si la reactivación de un artículo exige reconfiguración:

```text
ENCARGADO -> RECHAZAR operación -> requiere PROPIETARIO

```

## TRABAJADOR

Puede:

```text
consultar catálogo
buscar artículos
visualizar información necesaria para operar

```

No modifica M02.

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

# 57. Trazabilidad

Toda modificación relevante debe poder responder conceptualmente:

```text
¿Quién?
¿Cuándo?
¿Qué hizo?

```

Ejemplos:

```text
crear artículo
modificar SKU
cambiar precio
cambiar capacidades
desactivar
reactivar
renombrar Categoria

```

Esto no obliga a implementar auditoría universal ni Event Sourcing en el MVP.

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

Este diagrama exige que Arquitectura pueda resolver posteriormente:

```text
unicidad contextual de SKU y Categoria
guardias contextuales
atomicidad semántica
concurrencia y aislamiento
consultas de dependencias
autorización multitenant
trazabilidad
reactivación todo-o-nada
hard delete seguro
```

Especialmente sensibles:

```text
cambio de SKU
reactivación con reconfiguración
cambio estructural de capacidades
cambio de UnidadMedida
eliminación física
edición concurrente con desactivación
```

Pero este documento NO prescribe:

```text
ORM
Repository
Unit of Work
transacción SQL concreta
SELECT FOR UPDATE
optimistic locking
pessimistic locking
nivel de aislamiento
Domain Events
microservicios
```

La arquitectura futura debe adaptarse a las invariantes ya definidas.

La entidad de dominio NO consulta repositories directamente para resolver guardias contextuales.

---

# 63. Implicancias para el Modelo Relacional

No traducir mecánicamente `1 clase UML = 1 tabla`.

En particular:

```text
CapacidadesArticulo <<value object>>

```

no obliga a una tabla separada (puede mapearse como columnas empaquetadas o JSON en la tabla del artículo).

```text
UnidadMedida <<enum>>

```

no obliga a una tabla propia.

---

# 64. Implicancias para la API

Una API futura no debe permitir saltarse invariantes mediante modificaciones ciegas.

HTTP `PATCH` parcial NO significa setter parcial en el dominio.

Flujo conceptual:

```text
payload
↓
autorización contextual
↓
carga de ArticuloCatalogo + contexto
↓
validar EstadoArticulo esperado
↓
construir propuesta completa
↓
crear/reemplazar VO necesarios
↓
validaciones locales
↓
guardias contextuales
↓
confirmación consistente
```

Si:

```text
estado = INACTIVO
```

un endpoint normal de edición debe:

```text
RECHAZAR
```

No debe editar igual ni reactivar implícitamente.

La API podrá distinguir:

```text
reactivación simple
reactivación con reconfiguración
```

sin obligar a que la entidad exponga exactamente `reactivar(payload)`.

ENCARGADO no puede utilizar reactivación para modificar precio, costo, SKU, Categoria, UnidadMedida o capacidades.

Quedan abiertas:

```text
endpoint
verbo HTTP
DTO
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

El backend debe validar todas las invariantes.

## Artículo ACTIVO

PROPIETARIO puede acceder a edición normal.

## Artículo INACTIVO

La UX normal:

```text
NO ofrece edición individual
```

Debe orientar hacia:

```text
reactivar
```

Si la configuración almacenada sigue siendo válida:

```text
PROPIETARIO o ENCARGADO
→ reactivación simple
```

Si requiere reconfiguración:

```text
PROPIETARIO
→ revisar/configurar
→ reactivar

ENCARGADO
→ informar que requiere PROPIETARIO
```

## SKU vacío

Una entrada vacía se interpreta como:

```text
null
```

no como un SKU real `""`.

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

1. **Jerarquías Rígidas:** Evitar clases `Producto`, `Insumo`, `Servicio`.
2. **Setteritis:** Evitar setters individuales para cambiar configuraciones interdependientes.
3. **Pérdida de Historia:** Evitar borrados físicos cuando existe historial.
4. **SKU como PK:** Evitar usar SKU como clave primaria técnica.
5. **Auto-Fix Silencioso:** Evitar que el Value Object altere datos para corregir incoherencias sin lanzar error.
6. **Edición en INACTIVO:** Evitar modificar atributos en estado inactivo sin pasar por el flujo atómico de reactivación.
7. **Bypass de ENCARGADO:** Evitar que el Encargado edite artículos usando el payload de reactivación.
8. **Check-Then-Save Inseguro:** Evitar validar en preconsulta sin revalidar al confirmar.
9. **Acoplamiento de Inventario/Producción:** Evitar meter stock, lotes o recetas en el catálogo.

---

# 68. Qué Debe Hacer una IA al Utilizar Este Diagrama

Una IA debe:

1. leer `M02-Catalogo.md` y `06-m02-estados-articulo.md`;
2. respetar la identidad estable de las entidades (SKU no es ID);
3. mantener `TipoArticulo` inmutable;
4. tratar `CapacidadesArticulo` como VO inmutable sin auto-fix;
5. bloquear la edición individual de artículos `INACTIVOS`;
6. exigir `precioBase != null y >= 0` al habilitar venta;
7. normalizar `SKU "" → null` antes de validar o persistir;
8. exigir unicidad de SKU entre artículos `ACTIVOS` e `INACTIVOS`;
9. aplicar permisos estrictos por rol en la reactivación;
10. revalidar guardias contextuales al confirmar operaciones;
11. mantener abiertas las decisiones de arquitectura técnica.

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
10. Reemplazar capacidades con un VO completo válido.
11. Verificar TipoArticulo inmutable.

## B. EstadoArticulo y Edición

12. Crear ACTIVO con >=1 uso operativo.
13. Impedir ACTIVO con 0 usos.
14. Permitir INACTIVO con 0 usos.
15. Permitir edición de ACTIVO por PROPIETARIO.
16. Rechazar edición individual de INACTIVO.
17. Rechazar edición que deja ACTIVO con 0 usos.
18. Editar ACTIVO no cambia EstadoArticulo.
19. Rechazar reactivar ACTIVO.
20. Rechazar desactivar INACTIVO.

## C. Precio, Costo y Venta

21. Vendible exige precioBase.
22. Precio 0 es válido.
23. Precio negativo se rechaza.
24. No vendible puede tener precioBase null.
25. costoReferencia puede ser null.
26. costoReferencia negativo se rechaza.
27. Deshabilitar venta construye vendible=False + descuento=False.
28. Conserva precioBase actual.
29. VO no hace el ajuste por sí mismo.

## D. Reactivación y Roles

30. PROPIETARIO puede reactivar simple.
31. ENCARGADO puede reactivar simple.
32. PROPIETARIO puede reactivar con reconfiguración.
33. Cambios + ACTIVO confirman juntos.
34. Fallo mantiene INACTIVO sin cambios parciales.
35. ENCARGADO no puede reconfigurar.
36. Rechazo de ENCARGADO distingue necesidad de PROPIETARIO.
37. Categoria histórica INACTIVA no bloquea por sí sola.

## E. SKU

38. Permitir sin SKU.
39. Normalizar `""` a `null`.
40. Impedir duplicado con ACTIVO.
41. Impedir duplicado con INACTIVO.
42. Desactivar no libera SKU.
43. A→B valida B y libera A al confirmar.
44. A→null libera A al confirmar.
45. null→B valida B.
46. A→A es no-op.
47. Dos asignaciones concurrentes no confirman el mismo SKU.

## F. Categoria y Tenant

48. Nueva asociación exige Categoria ACTIVA.
49. Reasignación a Categoria INACTIVA se rechaza.
50. Categoria de otro Negocio se rechaza.
51. Inactivar Categoria no inactiva artículos.
52. Asociación histórica se conserva.
53. Usuario de otro Negocio no modifica el recurso.

## G. Desactivación, Inventario y Hard Delete

54. Desactivar conserva identidad/configuración.
55. Desactivar con stock >0 está permitido.
56. Desactivar no modifica M04.
57. Hard delete con dependencias se rechaza.
58. Hard delete válido libera SKU al confirmar.
59. Hard delete no crea ELIMINADO.
60. Dependencias se revalidan al confirmar.

## H. UnidadMedida e Historia

61. BIEN exige UnidadMedida válida.
62. SERVICIO admite UNIDAD.
63. SERVICIO admite HORA.
64. Cambio incompatible con historia cuantitativa se rechaza.
65. No se requiere `tieneHistoriaOperativa`.

## I. Concurrencia / TOCTOU

66. Edición concurrente con desactivación no confirma sobre estado obsoleto.
67. Nueva operación revalida artículo desactivado tras selección.
68. Reactivaciones concurrentes no duplican.
69. Reactivaciones con configuraciones distintas no hacen overwrite silencioso.
70. Hard delete concurrente con nueva referencia no viola integridad.

---

# 70. Estado del Artefacto y Próximo Paso

Con este documento quedan alineadas semánticamente:

```text
M02-Catalogo.md
03-m02-catalogo-clases.md
06-m02-estados-articulo.md
```

Estado del Bloque 1:

```text
01 — Mapa General                       ✅ CONGELADO
02 — M01 Organización — Clases         ✅ CONGELADO
03 — M02 Catálogo — Clases             ✅ SEMÁNTICA CERRADA
04 — M01 Invitacion — Estados          ✅ CONGELADO
05 — M01 Membresia — Estados           ✅ CONGELADO
06 — M02 Articulo — Estados            ✅ CONGELADO
```

Antes de marcar el `.puml` y `.png` de Diagrama 3 como:

```text
✅ CONGELADO Y SINCRONIZADO
```

debe comprobarse que reflejen esta guía.

Después corresponde:

```text
secuencias/
├── 01-aceptar-invitacion.puml
└── 02-editar-articulo.puml
```

Luego se realiza una limpieza transversal de estados documentales y referencias obsoletas.

No corresponde reabrir 01–06 salvo contradicción real detectada por las secuencias.

---

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

No inferir:

```text
atributo editable → editable también en INACTIVO
reactivar() → cualquier Rol puede reconfigurar
deshabilitar venta → el VO auto-corrige
SKU opcional → "" y null son dos ausencias persistibles
precioBase [0..1] → puede faltar cuando esVendible=True
```

La implementación se deriva de invariantes, no de una traducción mecánica del dibujo.

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
nivel de aislamiento

tablas
foreign keys
índices
constraints SQL
ORM

SKU:
- case sensitivity
- trim
- Unicode
- regex/formato
- collation SQL

precisión SQL exacta
almacenamiento de imágenes

DTOs
Commands
endpoints
códigos HTTP
clases de excepción
error codes
```

Estas decisiones futuras deben satisfacer las invariantes ya congeladas.

---

# 74. Contrato Semántico Mínimo para una IA

```text
1. ArticuloCatalogo representa BIEN o SERVICIO.
2. TipoArticulo es inmutable.
3. EstadoArticulo = ACTIVO | INACTIVO.
4. ACTIVO exige >=1 uso operativo.
5. INACTIVO puede tener 0 usos.
6. Edición normal solo sobre ACTIVO.
7. INACTIVO no admite edición individual.
8. PROPIETARIO puede editar ACTIVO.
9. ENCARGADO no edita configuración.
10. Reactivación simple: PROPIETARIO o ENCARGADO.
11. Reactivación con reconfiguración: solo PROPIETARIO.
12. Reactivación con cambios es todo-o-nada.
13. CapacidadesArticulo es VO inmutable.
14. VO valida y acepta/rechaza; no auto-corrige.
15. Caso de Uso construye configuración candidata.
16. SERVICIO no controla stock/vencimiento/producción.
17. Descuento implica vendible.
18. Si vendible, precioBase existe y >=0.
19. costoReferencia es opcional; si existe >=0.
20. SKU opcional; ausencia=null; ""→null.
21. SKU único por Negocio entre ACTIVO+INACTIVO.
22. Desactivar no libera SKU ni modifica M04.
23. Categoria INACTIVA no desactiva artículos.
24. Guardias contextuales no se resuelven desde la entidad con repositories.
25. Hard delete no es estado y revalida referencias al confirmar.
```

---

# 75. Checklist para Implementación Asistida por IA

```text
[ ] TipoArticulo inmutable.
[ ] Solo ACTIVO/INACTIVO.
[ ] Edición normal exige ACTIVO.
[ ] INACTIVO sin edición individual.
[ ] Reactivación simple respeta roles.
[ ] Reactivación con reconfiguración exige PROPIETARIO.
[ ] Reactivación fallida sin cambios parciales.

[ ] CapacidadesArticulo inmutable.
[ ] Sin setters parciales sobre VO.
[ ] Sin auto-fixes.
[ ] Combinación inválida se rechaza.
[ ] Caso de Uso construye propuesta completa.

[ ] Vendible exige precioBase válido.
[ ] precioBase=0 válido.
[ ] costoReferencia opcional.
[ ] costo existente >=0.
[ ] Deshabilitar venta construye descuento=False.
[ ] Conserva precioBase actual.

[ ] SKU no es identidad.
[ ] SKU="" → null.
[ ] SKU único ACTIVO+INACTIVO.
[ ] Desactivar no libera SKU.

[ ] Categoria nueva/reasignada ACTIVA.
[ ] Categoria del mismo Negocio.
[ ] Categoria histórica INACTIVA conserva asociación.

[ ] Desactivar no modifica M04.
[ ] stock >0 no impide desactivar.
[ ] UnidadMedida protege historia cuantitativa.
[ ] M02 no contiene stock/lotes/recetas/ventas/compras.

[ ] UsuarioNegocio ACTIVO + tenant + permiso.
[ ] No autorizar solo por Rol.
[ ] Guardias contextuales revalidadas al confirmar.
[ ] Preconsulta UX no es garantía.
[ ] Concurrencia de SKU protegida.
[ ] Edición vs desactivación protegida.
[ ] Hard delete revalida dependencias.
[ ] Hard delete no crea ELIMINADO.

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
```

Principio final:

> **ArticuloCatalogo mantiene identidad y configuración actual; EstadoArticulo determina si puede utilizarse y editarse normalmente; CapacidadesArticulo expresa elegibilidad mediante un Value Object inmutable; los Casos de Uso coordinan autorización y contexto; la Persistencia protege integridad y concurrencia; los módulos consumidores preservan sus hechos históricos.**

> **La implementación debe adaptarse a estas invariantes. Las invariantes no deben debilitarse para adaptarse a una implementación ya escrita.**
