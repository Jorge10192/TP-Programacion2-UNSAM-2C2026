# 06 — M02 Catálogo — Guía Semántica del Ciclo de Vida de `ArticuloCatalogo`

## 1. Propósito y Alcance del Documento

Este documento define la semántica oficial del ciclo de vida de:

```text
ArticuloCatalogo
```

dentro de:

```text
M02 — Catálogo
```

Su objetivo es servir como especificación fuente para:

- análisis de dominio;
- diseño arquitectónico;
- implementación backend;
- servicios y casos de uso;
- persistencia;
- autorización;
- contrato API;
- frontend;
- pruebas automatizadas;
- control de concurrencia;
- mantenimiento;
- implementación asistida por IA.

Este documento debe permitir que una persona desarrolladora o una IA determine sin ambigüedad:

```text
qué estados existen;
qué significa cada estado;
qué transiciones son válidas;
qué operaciones NO cambian EstadoArticulo;
qué atributos pueden modificarse;
qué atributos son inmutables;
qué invariantes deben cumplirse para permanecer ACTIVO;
qué ocurre al desactivar;
qué ocurre al reactivar;
cómo funciona la reactivación con datos de actualización;
qué relación existe entre EstadoArticulo y CapacidadesArticulo;
qué reglas requieren contexto de Negocio;
qué reglas pertenecen a módulos posteriores;
qué restricciones deben protegerse bajo concurrencia;
qué decisiones técnicas todavía NO están tomadas.
```

Este documento congela:

```text
semántica;
invariantes;
transiciones;
responsabilidades conceptuales;
operaciones inválidas;
propiedades que deben preservarse.
```

Este documento NO congela:

```text
framework;
ORM;
SQL concreto;
DTOs;
endpoints;
códigos HTTP;
locking específico;
Repository concreto;
Unit of Work concreto;
Domain Events obligatorios;
infraestructura de notificaciones;
implementación de M03/M04/M05/M07.
```

---

## 1.1. Artefactos relacionados

Este documento debe mantenerse semánticamente sincronizado con:

```text
modulos/M02-Catalogo.md

modelo-dominio/bloque-1-fundacion/
├── 01-modelo-dominio-bloque-1.md
├── 01-diagrama-general.puml
├── 03-m02-catalogo-clases.md
├── 03-m02-catalogo-clases.puml
├── 06-m02-estados-articulo.md
└── 06-m02-estados-articulo.puml
```

El artefacto:

```text
06-m02-estados-articulo.puml
```

será la representación visual resumida de las reglas definidas aquí.

Este Markdown conserva la explicación semántica detallada.

---

## 1.2. Fuentes de verdad

Para interpretar o implementar el ciclo de vida de `ArticuloCatalogo`, respetar conceptualmente este orden:

```text
1. modulos/M02-Catalogo.md

2. modelo-dominio/bloque-1-fundacion/
   01-modelo-dominio-bloque-1.md

3. modelo-dominio/bloque-1-fundacion/
   03-m02-catalogo-clases.md

4. modelo-dominio/bloque-1-fundacion/
   06-m02-estados-articulo.md

5. modelo-dominio/bloque-1-fundacion/
   06-m02-estados-articulo.puml

6. ADRs / Arquitectura

7. Modelo Relacional

8. Contrato API

9. Implementación
```

Si una implementación futura contradice una invariante de dominio:

```text
NO adaptar silenciosamente la invariante al código.
NO considerar la implementación como fuente superior.
NO resolver la contradicción solamente en frontend.
NO introducir excepciones ad hoc sin actualizar primero el modelo.
```

La contradicción debe resolverse primero en la documentación de dominio correspondiente.

---

## 1.3. Decisión nueva del MVP que requiere sincronización posterior

Para el MVP queda congelada una decisión adicional:

```text
ArticuloCatalogo INACTIVO
→ NO admite edición individual
   de atributos ni capacidades.
```

Esto debe sincronizarse posteriormente con:

```text
M02-Catalogo.md
03-m02-catalogo-clases.md
03-m02-catalogo-clases.puml
```

si esos artefactos todavía describen la edición de artículos sin distinguir EstadoArticulo.

La sincronización documental se realizará en la revisión transversal final del Bloque 1.

---

# 2. Definición Semántica de Estados

`ArticuloCatalogo` posee exactamente dos estados:

```text
EstadoArticulo
├── ACTIVO
└── INACTIVO
```

No deben agregarse nuevos estados sin modificar primero la especificación funcional de M02.

---

## 2.1. `ACTIVO`

Un artículo `ACTIVO` representa un elemento del catálogo actualmente habilitado para participar en nuevas operaciones compatibles con sus capacidades.

Conceptualmente:

```text
ArticuloCatalogo ACTIVO
+
CapacidadesArticulo válidas
+
guardias contextuales satisfechas
→ puede ser elegible para operaciones futuras compatibles
```

`ACTIVO` NO significa:

```text
vendible obligatoriamente;
comprable obligatoriamente;
con stock obligatoriamente;
utilizable en producción obligatoriamente.
```

La elegibilidad concreta depende de:

```text
EstadoArticulo
+
TipoArticulo
+
CapacidadesArticulo
+
reglas del módulo consumidor
+
contexto del mismo Negocio
```

---

## 2.2. Uso operativo mínimo de un artículo ACTIVO

Todo artículo `ACTIVO` debe conservar al menos una finalidad operativa válida.

Debe cumplirse:

```text
esComprable
OR
esVendible
OR
puedeUsarseEnProduccion
```

Por lo tanto, no es válido:

```text
ACTIVO
+
esComprable = false
+
esVendible = false
+
puedeUsarseEnProduccion = false
```

Un cambio de capacidades que produciría esa combinación debe rechazarse.

Importante:

```text
poner capacidades en false
NO desactiva automáticamente el artículo.
```

Si una propuesta de configuración dejaría un artículo `ACTIVO` sin usos operativos:

```text
la modificación se rechaza
```

y el estado permanece sin cambios.

La desactivación del artículo requiere una operación explícita:

```text
desactivar()
```

---

## 2.3. `INACTIVO`

Un artículo `INACTIVO` representa una entidad histórica del catálogo que ya no participa normalmente en nuevas operaciones.

Permanece disponible para:

```text
historial;
reportes;
consultas administrativas;
referencias históricas;
auditoría;
reactivación;
operaciones técnicas/excepcionales que otros módulos definan en el futuro.
```

No debe aparecer normalmente en:

```text
selectores de nuevas ventas;
selectores de nuevas compras;
selectores de nuevas producciones;
autocompletados operativos;
otras nuevas operaciones normales.
```

La exclusión de nuevas operaciones normales NO significa que se elimine su información.

---

## 2.4. Un artículo INACTIVO puede conservar una configuración no operativa

Mientras permanezca `INACTIVO`, puede conservar:

```text
esComprable = false
esVendible = false
puedeUsarseEnProduccion = false
```

sin violar la regla de uso operativo mínimo.

Esto es válido porque la regla:

```text
>= 1 uso operativo
```

aplica al estado:

```text
ACTIVO
```

no al estado:

```text
INACTIVO
```

---

## 2.5. Terminología `activar` vs. `reactivar`

En permisos, UX o textos funcionales puede aparecer el verbo:

```text
activar
```

Sin embargo, para una entidad histórica que ya existe y se encuentra:

```text
INACTIVO
```

la transición semántica oficial de la máquina de estados es:

```text
INACTIVO → ACTIVO
= reactivar
```

No introducir dos comandos de dominio con invariantes diferentes:

```text
activar()
reactivar()
```

para representar el mismo cambio de estado.

Si la API o la UI utilizan la palabra `activar`, esa denominación debe mapear conceptualmente al mismo Caso de Uso de reactivación y a las mismas invariantes.

---

## 2.6. Bloqueo de edición en INACTIVO — Regla MVP

Mientras un `ArticuloCatalogo` permanezca:

```text
INACTIVO
```

NO admite edición individual de:

```text
nombre;
descripcion;
sku;
precioBase;
costoReferencia;
imagenPrincipal;
Categoria;
UnidadMedida;
CapacidadesArticulo.
```

Tampoco admite:

```text
actualizarCapacidades(...)
cambiarPrecioBase(...)
cambiarCostoReferencia(...)
cambiarUnidad(...)
asignarCategoria(...)
quitarCategoria(...)
cambiarSKU(...)
```

como operaciones independientes.

La única vía normal para modificar la configuración de un artículo INACTIVO es:

```text
reactivación válida
```

con los datos permitidos para dicha reactivación.

Esta regla es deliberadamente estricta para el MVP.

No implica que futuras versiones no puedan permitir edición administrativa de artículos inactivos.

---

# 3. Invariantes Estructurales y Value Objects

## 3.1. `TipoArticulo` es inmutable

`TipoArticulo` posee:

```text
BIEN
SERVICIO
```

y es inmutable desde la creación del artículo.

No existe una operación válida:

```text
BIEN → SERVICIO
SERVICIO → BIEN
```

ni estando `ACTIVO` ni estando `INACTIVO`.

Si se eligió un tipo incorrecto:

```text
si el artículo nunca fue utilizado y puede eliminarse físicamente
→ eliminar + crear otro correctamente

si existe historia o referencias
→ desactivar + crear un nuevo artículo
```

No modificar `tipo` para “reutilizar” la identidad histórica.

---

## 3.2. `CapacidadesArticulo` es un Value Object inmutable

`CapacidadesArticulo` representa una configuración completa:

```text
esComprable
esVendible
controlaStock
puedeUsarseEnProduccion
controlaVencimiento
permiteDescuento
```

Conceptualmente:

```text
CapacidadesArticulo
→ Value Object
→ sin identidad propia
→ inmutable una vez construido
→ reemplazo completo
```

Actualizar capacidades significa:

```text
configuración anterior
→ construir nueva propuesta completa
→ validar
→ reemplazar por un nuevo CapacidadesArticulo válido
```

No debe implementarse como:

```text
setEsVendible(...)
setPermiteDescuento(...)
setControlaStock(...)
```

sobre una instancia ya construida.

Tampoco debe realizar:

```text
auto-fixes;
normalizaciones semánticas silenciosas;
mutaciones internas para reparar combinaciones inválidas.
```

Si una combinación propuesta viola las invariantes del Value Object:

```text
la construcción/validación debe rechazarse.
```

La taxonomía concreta de excepción o resultado se definirá en Diseño Técnico.

---

## 3.3. Coherencia entre Tipo y Capacidades

Reglas estructurales mínimas:

### SERVICIO

Debe cumplirse:

```text
controlaStock = false
controlaVencimiento = false
puedeUsarseEnProduccion = false
```

### BIEN

Puede utilizar capacidades estructurales cuando corresponda.

### Vencimiento

Si:

```text
controlaVencimiento = true
```

entonces debe cumplirse:

```text
tipo = BIEN
controlaStock = true
```

### Producción

Si:

```text
puedeUsarseEnProduccion = true
```

entonces debe cumplirse:

```text
tipo = BIEN
controlaStock = true
```

### Descuento

Si se intenta construir:

```text
permiteDescuento = true
esVendible = false
```

la propuesta es inválida y debe rechazarse.

`CapacidadesArticulo` NO debe “corregir” silenciosamente:

```text
permiteDescuento = true
→ false
```

durante su construcción.

Cuando la intención funcional sea:

```text
deshabilitar venta
```

la capa que construye la nueva configuración debe proponer explícitamente:

```text
esVendible = false
permiteDescuento = false
```

y crear un nuevo Value Object coherente.

Esto mantiene separadas:

```text
intención del comando
→ construcción de nueva configuración válida

validación del Value Object
→ aceptar o rechazar la configuración recibida
```

El:

```text
precioBase
```

se conserva cuando la venta se deshabilita.

---

## 3.4. Precio base

Si:

```text
esVendible = true
```

debe existir:

```text
precioBase
```

y cumplirse:

```text
precioBase >= 0
```

El valor:

```text
0
```

es válido.

El precio base representa una referencia comercial actual.

Modificarlo:

```text
NO reescribe ventas históricas;
NO reescribe operaciones anteriores.
```

---

## 3.5. Costo de referencia

`costoReferencia` es opcional.

Si existe:

```text
costoReferencia >= 0
```

Es una referencia actual.

No constituye historial de costos.

---

## 3.6. UnidadMedida

Todo artículo posee una `UnidadMedida` válida.

Para `BIEN`, la unidad debe ser explícitamente válida.

Para `SERVICIO`, el valor inicial puede ser:

```text
UNIDAD
```

y puede utilizarse:

```text
HORA
```

u otra unidad normalizada permitida.

Cambiar la unidad está condicionado por las reglas de significado histórico y cantidades existentes definidas en M02.

Una reactivación con cambio de unidad debe aplicar exactamente las mismas guardias que una edición equivalente sobre un artículo ACTIVO.

No usar la reactivación para saltear restricciones de `UnidadMedida`.

---

## 3.7. SKU

El SKU es:

```text
opcional;
editable cuando el artículo está ACTIVO;
no es identidad del artículo;
único por Negocio;
único considerando artículos ACTIVOS e INACTIVOS.
```

### Representación de ausencia

La ausencia de SKU se representa conceptualmente como:

```text
null
```

No utilizar:

```text
""
```

como un segundo significado de “sin SKU”.

Antes de validar unicidad o persistir:

```text
SKU == ""
→ normalizar a null
```

Además, un SKU considerado presente no debe ser una cadena vacía.

No se congela todavía:

```text
sensibilidad a mayúsculas/minúsculas;
trim automático;
normalización Unicode;
formato o regex exacta.
```

Esas decisiones pertenecen a Diseño Técnico/Modelo Relacional y deberán ser consistentes entre validación y persistencia.

Por lo tanto:

```text
Articulo A INACTIVO
SKU = PROD-100

→ PROD-100 continúa reservado
   por A dentro de ese Negocio.
```

No es un escenario funcional válido:

```text
A INACTIVO usa PROD-100
+
B creado después usa PROD-100
```

si el sistema se encuentra en un estado consistente.

La reactivación no debería descubrir una “colisión normal” con otro artículo creado correctamente durante la inactividad, porque la unicidad incluye también artículos INACTIVOS.

Una colisión durante reactivación puede existir únicamente por:

```text
cambio de SKU solicitado dentro de la reactivación;
operaciones concurrentes;
datos legados inconsistentes;
migraciones;
corrupción o bypass previo de invariantes.
```

Esos casos deben rechazarse o resolverse explícitamente.

---

## 3.8. Política de cambio de SKU

Para un artículo `ACTIVO`:

```text
A → B
→ B debe estar disponible
→ al confirmar B, A queda libre

A → null
→ al confirmar, A queda libre

null → B
→ B debe estar disponible

A → A
→ no-op funcional
```

La validación debe considerar:

```text
todo el Negocio
+
artículos ACTIVOS
+
artículos INACTIVOS.
```

El artículo conserva la misma identidad técnica aunque cambie SKU.

---

## 3.9. Categoria

`Categoria` es contextual al mismo Negocio.

Si un artículo posee Categoria:

```text
ArticuloCatalogo.negocio
=
Categoria.negocio
```

Una nueva asociación o reasignación exige:

```text
Categoria ACTIVA
```

Sin embargo:

```text
Categoria asociada ACTIVA → INACTIVA
```

NO provoca:

```text
ArticuloCatalogo ACTIVO → INACTIVO
```

El artículo:

```text
conserva la asociación histórica;
permanece ACTIVO;
conserva capacidades;
conserva precio.
```

Una Categoria históricamente asociada que se encuentra INACTIVA:

```text
NO bloquea por sí sola la reactivación del artículo.
```

La prohibición sobre Categoria INACTIVA aplica a:

```text
nuevas asociaciones;
reasignaciones.
```

---

# 4. Matriz Oficial de Transiciones y Comportamientos Internos

Las únicas transiciones reales de `EstadoArticulo` son:

```text
[*] → ACTIVO

ACTIVO → INACTIVO

INACTIVO → ACTIVO
```

Las modificaciones internas sobre un artículo `ACTIVO`:

```text
editar datos;
cambiar precio;
cambiar costo;
cambiar SKU;
cambiar Categoria;
cambiar UnidadMedida;
actualizar CapacidadesArticulo;
```

NO constituyen transiciones de `EstadoArticulo`.

| Estado Origen | Operación / Comando conceptual | Estado Destino | Configuración Resultante | Guardia / Invariante Principal |
| --- | --- | --- | --- | --- |
| `[*]` | Crear artículo | `ACTIVO` | Configuración inicial | `tipo` válido, capacidades coherentes, `>=1` uso operativo, precio válido si vendible, SKU/contexto válidos. |
| `ACTIVO` | Desactivar | `INACTIVO` | Conserva configuración actual | No borra historia, referencias, SKU, precio, capacidades ni stock de otros módulos. |
| `INACTIVO` | Reactivar sin cambios | `ACTIVO` | Configuración conservada | Todas las invariantes vigentes deben ser satisfechas nuevamente. |
| `INACTIVO` | Reactivar con actualización acotada | `ACTIVO` | Configuración propuesta validada atómicamente | Solo datos permitidos; `tipo` inmutable; no es edición libre; actor debe poseer permiso suficiente para los cambios solicitados. |
| `ACTIVO` | Actualizar capacidades | `ACTIVO` | Nuevo VO completo e inmutable | La propuesta se acepta o rechaza como conjunto; no hay auto-fix silencioso; coherencia Tipo+Capacidades y `>=1` uso operativo. |
| `ACTIVO` | Editar configuración | `ACTIVO` | Nueva configuración válida | `tipo` no cambia; se aplican guardias locales y contextuales. |
| `INACTIVO` | Editar individualmente | Rechazo | Sin cambios | Regla MVP: no admite edición fuera de una reactivación válida. |
| `INACTIVO` | Desactivar nuevamente | Rechazo | Sin cambios | No existe no-op silencioso `INACTIVO → INACTIVO`. |
| `ACTIVO` | Reactivar | Rechazo | Sin cambios | No existe `ACTIVO → ACTIVO` por reactivación. |

---

## 4.1. Creación

Un artículo nuevo se crea:

```text
ACTIVO
```

y debe satisfacer desde el inicio:

```text
TipoArticulo válido
+
CapacidadesArticulo coherentes
+
>= 1 uso operativo
+
precioBase válido si esVendible
+
SKU disponible si existe
+
Categoria válida si se asigna
+
UnidadMedida válida
+
guardias contextuales aplicables
```

No se crea primero `INACTIVO` para completar datos posteriormente dentro del flujo normal del MVP.

---

## 4.2. Desactivación

Desactivar:

```text
ACTIVO → INACTIVO
```

debe conservar:

```text
identidad;
nombre;
descripcion;
tipo;
UnidadMedida;
SKU;
precioBase;
costoReferencia;
imagenPrincipal;
Categoria;
CapacidadesArticulo;
referencias;
historia.
```

La desactivación NO debe:

```text
poner capacidades en false;
poner precio en null;
liberar SKU;
quitar Categoria;
eliminar imagen;
cambiar unidad;
crear una copia;
borrar datos de M04/M03/M05/M07.
```

La única modificación estructural necesaria en M02 es:

```text
estado = INACTIVO
```

---

## 4.3. Reactivación simple

Si la configuración almacenada todavía satisface todas las invariantes vigentes:

```text
INACTIVO → ACTIVO
```

puede confirmarse sin modificar otros datos.

---

## 4.4. Reactivación con actualización acotada

Bloquear edición en estado `INACTIVO` puede generar un callejón sin salida si la configuración almacenada ya no permite volver a `ACTIVO`.

Para evitarlo, la reactivación puede aceptar conceptualmente:

```text
datosDeReactivacion
```

que permitan construir la configuración final propuesta y validarla antes de confirmar:

```text
INACTIVO
+
datosDeReactivacion
→
configuración propuesta válida
→
ACTIVO
```

La operación debe ser:

```text
atómica;
consistente;
sin estado intermedio visible.
```

Es decir:

```text
aplicar cambios permitidos
+
validar
+
reactivar
```

se confirman juntos o:

```text
no se confirma ningún cambio.
```

---

## 4.5. La reactivación con datos NO es edición libre encubierta

Regla crítica para implementación con IA:

```text
reactivar(datosDeReactivacion)
≠
editarArticuloINACTIVO(...)
```

La operación existe únicamente para permitir que el artículo pueda volver válidamente a `ACTIVO`.

No debe convertirse en una ruta genérica que permita modificar arbitrariamente cualquier dato de un artículo inactivo.

Siempre:

```text
tipo
→ INMUTABLE.
```

El conjunto exacto de campos del payload pertenece al contrato API posterior.

---

## 4.6. Autorización de reactivación con datos

M02 posee permisos distintos.

### PROPIETARIO

Puede editar configuración y reactivar.

Por lo tanto, un `PROPIETARIO` puede utilizar una reactivación que incluya cambios para los cuales ya posee permiso funcional.

### ENCARGADO

Puede:

```text
activar;
desactivar;
reactivar;
```

pero NO puede:

```text
editar;
modificar precio;
modificar costo;
modificar SKU;
modificar UnidadMedida;
modificar capacidades.
```

Por lo tanto:

```text
ENCARGADO
+
reactivar sin cambios de configuración
→ permitido si las invariantes actuales se cumplen.
```

Pero:

```text
ENCARGADO
+
reactivar con cambios en datos que equivalen a edición
→ RECHAZO.
```

Si la configuración actual del artículo no satisface las invariantes necesarias para volver a `ACTIVO`, el rechazo debe permitir distinguir semánticamente:

```text
el artículo requiere reconfiguración
+
el ENCARGADO no posee permiso para realizarla
+
se requiere intervención de un PROPIETARIO
```

Una IA debe interpretar este caso como:

```text
reactivación simple
→ funcionalmente posible solo si la configuración actual ya es válida

reactivación que requiere corregir configuración
→ necesita permisos de edición
→ ENCARGADO no alcanza
→ requiere PROPIETARIO
```

No degradar este escenario a un error ambiguo como:

```text
"no se pudo reactivar"
```

si la capa de aplicación puede expresar la causa de dominio de forma estructurada.

No se congela todavía:

```text
mensaje textual exacto;
clase de excepción;
código HTTP;
error code de API.
```

La reactivación con payload NO puede utilizarse para saltarse la política de permisos del MVP.

---

## 4.7. Preparación UX para reactivación

Antes de confirmar una reactivación, la UI puede solicitar/revisar:

```text
precio actual;
capacidades;
SKU;
Categoria;
UnidadMedida;
otros datos relevantes.
```

Especialmente cuando:

```text
el artículo estuvo INACTIVO durante un período prolongado;
el precio puede estar desactualizado;
las reglas actuales ya no se cumplen;
la configuración requiere ajustes para volver a operar.
```

La UI puede sugerir una revisión, pero:

```text
la UI no constituye garantía de dominio.
```

Toda validación relevante debe repetirse o garantizarse al confirmar.

---

# 5. Invariantes Semánticas y Reglas de Protección

## 5.1. Estado y capacidades son conceptos ortogonales

`EstadoArticulo` y `CapacidadesArticulo` no son equivalentes.

Incorrecto:

```text
esVendible = false
→ artículo INACTIVO
```

La regla correcta es:

```text
EstadoArticulo
→ ciclo de vida

CapacidadesArticulo
→ configuración operativa
```

Si una actualización propuesta deja a un artículo `ACTIVO` sin uso operativo:

```text
rechazar actualización
```

No desactivarlo automáticamente.

---

## 5.2. Desactivar no destruye configuración

Al ejecutar:

```text
desactivar()
```

no modificar automáticamente:

```text
precioBase;
costoReferencia;
SKU;
Categoria;
UnidadMedida;
imagen;
CapacidadesArticulo.
```

---

## 5.3. Independencia de M04 — Inventario

M02 no administra:

```text
stock actual;
stock por ubicación;
lotes;
movimientos;
vencimientos de lotes.
```

Por lo tanto:

```text
stock > 0
```

NO impide:

```text
ACTIVO → INACTIVO
```

en M02.

Desactivar un artículo:

```text
NO pone stock en 0;
NO elimina stock;
NO elimina lotes;
NO elimina movimientos;
NO consulta directamente repositorios de M04 desde ArticuloCatalogo.
```

---

## 5.4. Un artículo INACTIVO no debe seleccionarse para nuevas operaciones normales

M03/M04/M05/M07 deberán considerar la elegibilidad actual al iniciar o confirmar nuevas operaciones.

Un artículo `INACTIVO` no debe ser seleccionado normalmente para una nueva operación.

Esto no invalida referencias históricas existentes.

---

## 5.5. Carrera entre selección y desactivación

Caso crítico:

```text
Usuario A selecciona ArticuloCatalogo ACTIVO
para una nueva operación.

Antes de confirmar:
Usuario B desactiva el artículo.

Usuario A intenta confirmar.
```

La selección previa de UI:

```text
NO garantiza elegibilidad futura.
```

El módulo consumidor debe volver a verificar la elegibilidad relevante al confirmar la nueva operación.

---

## 5.6. Categoria INACTIVA no desactiva ArticuloCatalogo

Si:

```text
Categoria X
ACTIVA → INACTIVA
```

los artículos ya asociados:

```text
NO cambian EstadoArticulo;
NO cambian CapacidadesArticulo;
NO cambian precio;
NO pierden la referencia histórica.
```

---

## 5.7. Categoria INACTIVA y reactivación del artículo

Un artículo puede estar:

```text
INACTIVO
+
Categoria asociada actualmente INACTIVA.
```

Eso no bloquea por sí solo:

```text
INACTIVO → ACTIVO
```

porque la asociación es histórica/existente.

Si el payload de reactivación intenta reasignar Categoria, la Categoria destino debe estar ACTIVA y pertenecer al mismo Negocio.

---

## 5.8. SKU y aislamiento multitenant

La unicidad de SKU es:

```text
por Negocio
```

Es válido el mismo SKU en Negocios distintos.

No es válido dentro del mismo Negocio, aunque alguno esté INACTIVO.

---

## 5.9. Concurrencia de SKU

Dos operaciones pueden intentar simultáneamente asignar el mismo SKU disponible a dos artículos distintos del mismo Negocio.

Una prevalidación:

```text
"SKU disponible"
```

no es suficiente.

La persistencia debe impedir que ambas confirmen.

---

## 5.10. Concurrencia de reactivación

Dos solicitudes pueden intentar reactivar simultáneamente el mismo artículo `INACTIVO`.

No deben producir:

```text
dos copias;
estados finales incoherentes;
sobrescritura silenciosa de configuración;
pérdida de cambios.
```

No asumir:

```text
last-write-wins silencioso
```

como comportamiento de dominio.

---

## 5.11. Concurrencia de edición vs. desactivación

Ejemplo:

```text
A carga Articulo ACTIVO para editar.
B lo desactiva.
A confirma cambios.
```

La operación debe revalidar o garantizar el estado esperado al confirmar.

---

## 5.12. Prevalidación no es garantía

Consultas como:

```text
puedeReactivarse()
puedeEliminarseFisicamente()
skuDisponible()
puedeCambiarUnidad()
```

son útiles para UX.

Pero:

```text
prevalidación
≠
autorización definitiva
≠
garantía de persistencia
```

---

## 5.13. Eliminación física fuera de la máquina de estados

La eliminación física:

```text
NO es un EstadoArticulo.
```

No introducir:

```text
ELIMINADO
BORRADO
ARCHIVADO
```

como estado únicamente para representar hard delete.

La operación:

```text
eliminarFisicamente()
```

es una capacidad administrativa excepcional.

Solo puede confirmarse si:

```text
nunca fue utilizado
+
no posee historia relevante
+
no posee referencias
+
no posee dependencias que deban conservarse.
```

Si existe historia:

```text
NO eliminar
→ desactivar.
```

---

## 5.14. Borrado físico y estado previo

No se congela que el artículo deba pasar necesariamente por `INACTIVO` antes de ser eliminado físicamente.

Sí queda congelado:

```text
el borrado físico no pertenece a la máquina de estados;
solo se permite si no existe historia/referencias/dependencias;
la operación debe revalidar dichas condiciones al confirmar.
```

---

## 5.15. SKU liberado por borrado físico válido

Cuando una eliminación física válida se confirma:

```text
SKU actual
→ queda disponible
```

dentro del Negocio.

No liberar el SKU antes de que el borrado sea efectivamente confirmado.

---

# 6. Delimitación de Responsabilidades

## 6.1. `ArticuloCatalogo`

Es responsable de:

```text
identidad;
estado actual;
TipoArticulo;
configuración actual;
CapacidadesArticulo;
reglas locales;
coherencia estructural disponible localmente.
```

No debe consultar directamente:

```text
repositorios;
HTTP;
M04;
M03;
M05;
M07;
servicios externos.
```

---

## 6.2. `CapacidadesArticulo`

Es un Value Object.

Responsabilidad:

```text
representar la configuración completa;
validar coherencia interna Tipo + Capacidades.
```

No debe contener datos operativos.

---

## 6.3. Caso de Uso — editar artículo ACTIVO

Debe autenticar, resolver contexto, verificar permiso, comprobar estado ACTIVO, construir configuración propuesta, validar reglas y confirmar consistentemente.

Solo `PROPIETARIO` puede editar configuración durante el MVP.

---

## 6.4. Caso de Uso — desactivar

Puede ser ejecutado por:

```text
PROPIETARIO;
ENCARGADO;
```

con membresía ACTIVA, mismo Negocio y permiso concreto M02.

No necesita consultar stock actual de M04 para decidir la transición.

---

## 6.5. Caso de Uso — reactivar sin cambios

Puede ser ejecutado por:

```text
PROPIETARIO;
ENCARGADO;
```

si el artículo está INACTIVO y su configuración almacenada satisface todas las invariantes vigentes.

---

## 6.6. Caso de Uso — reactivar con cambios

Solo puede aplicar modificaciones para las cuales el actor posee permiso funcional.

En el MVP:

```text
PROPIETARIO
→ puede reactivar con ajustes permitidos.

ENCARGADO
→ NO puede utilizar la reactivación
   para modificar campos que no puede editar normalmente.
```

Si un artículo INACTIVO requiere ajustes y el actor es ENCARGADO:

```text
reactivación rechazada;
debe intervenir un PROPIETARIO.
```

---

## 6.7. Persistencia

Debe actuar como última línea de defensa para:

```text
unicidad SKU por Negocio;
estado esperado al confirmar;
reactivación concurrente;
edición vs desactivación;
borrado físico sin referencias;
aislamiento multitenant.
```

---

## 6.8. Módulos consumidores

M03/M04/M05/M07 pueden utilizar capacidades como elegibilidad, pero deben preservar su propia historia transaccional.

No reconstruir operaciones históricas leyendo únicamente la configuración actual de `ArticuloCatalogo`.

---

# 7. Errores de Implementación y Anti-Patrones a Evitar

Una IA o desarrollador NO debe:

1. Crear estados adicionales como `ARCHIVADO`, `DESCONTINUADO`, `BORRADO`, `SIN_STOCK`, `AGOTADO` o `PAUSADO`.
2. Usar `deleted_at`, `is_deleted` o soft delete técnico como sustituto de `EstadoArticulo.INACTIVO`.
3. Cambiar `TipoArticulo` después de crear el artículo.
4. Editar directamente un artículo `INACTIVO` mediante comandos normales del MVP.
5. Mutar internamente un `CapacidadesArticulo` ya construido.
6. Aplicar auto-fixes silenciosos dentro de `CapacidadesArticulo`.
7. Aceptar `permiteDescuento=true` con `esVendible=false`; la propuesta debe rechazarse.
8. Persistir `SKU=""` como un segundo significado de ausencia; debe normalizarse a `null` antes de validar/persistir.
9. Inventar una política de case-folding, trimming o Unicode para SKU sin una decisión técnica documentada.
10. Usar la reactivación con payload para saltear permisos de edición.
11. Permitir que un `ENCARGADO` modifique precio, SKU, capacidades, Categoria o UnidadMedida mediante reactivación.
12. Desactivar automáticamente un artículo por cambios de capacidades.
13. Poner capacidades en `false` al desactivar.
14. Consultar M04 desde `ArticuloCatalogo`.
15. Impedir desactivación solo porque exista stock > 0.
16. Borrar stock, lotes o movimientos al desactivar.
17. Propagar automáticamente la inactividad de `Categoria` a sus artículos.
18. Bloquear reactivación solo porque la Categoria históricamente asociada esté INACTIVA.
19. Permitir SKU duplicado porque uno de los artículos está INACTIVO.
20. Confundir SKU con identidad técnica.
21. Liberar SKU al desactivar.
22. Restaurar configuraciones históricas “mágicamente” al reactivar.
23. Sobrescribir historia transaccional al editar datos actuales del catálogo.
24. Persistir cambios parciales si una reactivación con actualización falla.
25. Usar `float` binario impreciso para dinero.
26. Restringir cantidades a enteros cuando la UnidadMedida admita fracciones.
27. Confiar únicamente en frontend para estado, permisos o elegibilidad.
28. Confiar en prevalidaciones de SKU, estado o referencias sin garantía al confirmar.
29. Introducir HTTP, ORM, SQL o mecanismos de locking dentro de la semántica de la entidad.
30. Inventar Kafka, Redis, CQRS, Event Sourcing, microservicios o Event Bus sin una decisión arquitectónica posterior.

---

# 8. Batería Completa de Pruebas Derivables

| ID | Caso | Condición inicial | Acción | Resultado esperado |
| --- | --- | --- | --- | --- |
| `TC-ART-001` | Crear BIEN válido | Datos válidos | Crear artículo | `ACTIVO`, tipo `BIEN`, configuración válida. |
| `TC-ART-002` | Crear SERVICIO válido | Datos válidos | Crear artículo | `ACTIVO`, sin stock/vencimiento/producción. |
| `TC-ART-003` | Crear sin uso operativo | Todos los usos operativos false | Crear | Rechazo. |
| `TC-ART-004` | Crear vendible sin precio | `esVendible=true`, sin precio | Crear | Rechazo. |
| `TC-ART-005` | Crear con precio 0 | `esVendible=true`, precio 0 | Crear | Permitido. |
| `TC-ART-006` | Crear SERVICIO con stock | `tipo=SERVICIO`, `controlaStock=true` | Crear | Rechazo. |
| `TC-ART-007` | Crear SERVICIO con vencimiento | `SERVICIO`, `controlaVencimiento=true` | Crear | Rechazo. |
| `TC-ART-008` | Crear SERVICIO productivo | `SERVICIO`, `puedeUsarseEnProduccion=true` | Crear | Rechazo. |
| `TC-ART-009` | Crear BIEN productivo sin stock | Producción true, stock false | Crear | Rechazo. |
| `TC-ART-010` | Descuento sin venta | Descuento true, venta false | Crear/editar | Rechazo. |
| `TC-ART-011` | SKU duplicado ACTIVO | Mismo Negocio | Crear con mismo SKU | Rechazo. |
| `TC-ART-012` | SKU duplicado INACTIVO | Mismo Negocio | Crear con mismo SKU | Rechazo. |
| `TC-ART-013` | Mismo SKU otro Negocio | Negocio distinto | Crear con mismo SKU | Permitido. |
| `TC-ART-014` | Desactivar artículo | ACTIVO | Desactivar | Pasa a INACTIVO, conserva configuración. |
| `TC-ART-015` | Desactivar con stock | ACTIVO + stock en M04 | Desactivar | Permitido; M04 no se modifica. |
| `TC-ART-016` | Desactivar conserva SKU | ACTIVO con SKU | Desactivar | SKU permanece reservado. |
| `TC-ART-017` | Desactivar conserva precio | ACTIVO vendible | Desactivar | precioBase se conserva. |
| `TC-ART-018` | Desactivar conserva capacidades | ACTIVO | Desactivar | Capacidades sin cambios. |
| `TC-ART-019` | Editar INACTIVO | INACTIVO | Editar nombre | Rechazo MVP. |
| `TC-ART-020` | Cambiar precio INACTIVO | INACTIVO | cambiarPrecioBase | Rechazo MVP. |
| `TC-ART-021` | Cambiar capacidades INACTIVO | INACTIVO | actualizarCapacidades | Rechazo MVP. |
| `TC-ART-022` | Reactivar sin cambios válido | INACTIVO válido | Reactivar | Pasa a ACTIVO. |
| `TC-ART-023` | Reactivar sin uso operativo | INACTIVO sin usos | Reactivar | Rechazo. |
| `TC-ART-024` | Reactivar con payload válido | INACTIVO no activable | Reactivar con datos válidos | Cambios + ACTIVO atómicos. |
| `TC-ART-025` | Reactivar con payload inválido | INACTIVO | Reactivar | Rechazo; sin cambios parciales. |
| `TC-ART-026` | Reactivar cambiando tipo | INACTIVO BIEN | Payload SERVICIO | Rechazo. |
| `TC-ART-027` | Encargado reactiva sin cambios | INACTIVO válido | Reactivar | Permitido. |
| `TC-ART-028` | Encargado cambia precio al reactivar | INACTIVO | Reactivar con precio | Rechazo. |
| `TC-ART-029` | Propietario reactiva con precio | INACTIVO | Reactivar con precio válido | Permitido si resto válido. |
| `TC-ART-030` | Categoria histórica INACTIVA | INACTIVO asociado | Reactivar sin reasignar | Permitido si resto válido. |
| `TC-ART-031` | Reasignar a Categoria INACTIVA | INACTIVO | Reactivar cambiando Categoria | Rechazo. |
| `TC-ART-032` | Categoria cross-tenant | Negocios distintos | Asociar/reactivar | Rechazo. |
| `TC-ART-033` | Desactivar Categoria | Artículo ACTIVO asociado | Categoria pasa INACTIVA | Artículo sigue ACTIVO. |
| `TC-ART-034` | Cambiar capacidades válido | ACTIVO | Actualizar VO | Sigue ACTIVO. |
| `TC-ART-035` | Capacidades dejan cero usos | ACTIVO | Actualizar | Rechazo. |
| `TC-ART-036` | Deshabilitar venta con descuento | ACTIVO | venta false | descuento false, precio se conserva, si queda otro uso. |
| `TC-ART-037` | Deshabilitar único uso | ACTIVO solo vendible | venta false | Rechazo salvo desactivación explícita. |
| `TC-ART-038` | SKU A→B | B disponible | Cambiar | B asignado, A liberado al confirmar. |
| `TC-ART-039` | SKU A→null | A actual | Quitar SKU | A libre al confirmar. |
| `TC-ART-040` | SKU A→A | Mismo valor | Guardar | No-op funcional. |
| `TC-ART-041` | SKU concurrente | SKU libre | Dos asignaciones | Como máximo una confirma. |
| `TC-ART-042` | Reactivación concurrente | INACTIVO | Dos reactivaciones | Sin duplicado ni overwrite silencioso. |
| `TC-ART-043` | Edición vs desactivación | ACTIVO | Operaciones concurrentes | Detectar/revalidar estado. |
| `TC-ART-044` | Selección vs desactivación | Seleccionado ACTIVO | Desactivar antes de confirmar | Nueva operación normal rechazada al revalidar. |
| `TC-ART-045` | INACTIVO en historial | INACTIVO | Consultar reporte | Visible. |
| `TC-ART-046` | INACTIVO en selector | INACTIVO | Nueva operación | No se ofrece normalmente. |
| `TC-ART-047` | Borrado sin historia | Sin referencias | Eliminar | Permitido tras revalidación. |
| `TC-ART-048` | Borrado con historia | Con referencias | Eliminar | Rechazo. |
| `TC-ART-049` | Borrado libera SKU | Borrado válido | Confirmar | SKU libre tras confirmación. |
| `TC-ART-050` | Borrado no es estado | Elegible | Eliminar | No aparece `ELIMINADO`. |
| `TC-ART-051` | Tipo inmutable ACTIVO | BIEN | Cambiar a SERVICIO | Rechazo. |
| `TC-ART-052` | Tipo inmutable INACTIVO | BIEN | Reactivar como SERVICIO | Rechazo. |
| `TC-ART-053` | Precio no reescribe historia | Con ventas | Cambiar precio | Historial intacto. |
| `TC-ART-054` | SKU no cambia identidad | ACTIVO | Cambiar SKU | Misma identidad técnica. |
| `TC-ART-055` | Artículo cross-tenant | Actor A, artículo B | Mutar | Rechazo. |
| `TC-ART-056` | Categoria cross-tenant | Artículo A, Categoria B | Asociar | Rechazo. |
| `TC-ART-057` | INACTIVO sin usos | INACTIVO | Consultar | Estado válido. |
| `TC-ART-058` | Reactivar actualizando capacidades | INACTIVO sin usos | Payload válido | Permitido a actor autorizado. |
| `TC-ART-059` | Reactivación parcial falla | Payload parcialmente válido | Reactivar | Nada se persiste. |
| `TC-ART-060` | Encargado no usa payload como bypass | INACTIVO inválido | Encargado envía cambios | Rechazo; requiere Propietario. |
| `TC-ART-061` | VO inválido descuento sin venta | Se intenta construir capacidades con descuento=true y vendible=false | Construir VO | Rechazo; el VO no auto-corrige flags. |
| `TC-ART-062` | Deshabilitar venta construye VO coherente | ACTIVO vendible con descuento | Comando deshabilita venta | Se construye nueva configuración con vendible=false y descuento=false; precio se conserva. |
| `TC-ART-063` | SKU vacío | Input SKU=`""` | Crear/editar/reactivar | Se normaliza a `null` antes de unicidad y persistencia. |
| `TC-ART-064` | Encargado necesita reconfiguración | INACTIVO con configuración no activable | Encargado intenta reactivar sin cambios | Rechazo distinguible: requiere reconfiguración y participación de Propietario. |

---

# 9. Pruebas Basadas en Propiedades

## Propiedad A — Estado binario

```text
estado ∈ {ACTIVO, INACTIVO}
```

## Propiedad B — Uso operativo mínimo de ACTIVO

```text
estado = ACTIVO
→ esComprable OR esVendible OR puedeUsarseEnProduccion
```

## Propiedad C — Coherencia SERVICIO

```text
tipo = SERVICIO
→ controlaStock=false
  AND controlaVencimiento=false
  AND puedeUsarseEnProduccion=false
```

## Propiedad D — Descuento implica venta

```text
permiteDescuento=true
→ esVendible=true
```

## Propiedad E — Producción implica BIEN con stock

```text
puedeUsarseEnProduccion=true
→ tipo=BIEN AND controlaStock=true
```

## Propiedad F — Vencimiento implica BIEN con stock

```text
controlaVencimiento=true
→ tipo=BIEN AND controlaStock=true
```

## Propiedad G — SKU único por Negocio

Para cualquier SKU no nulo, existe como máximo un artículo actual con ese SKU dentro del mismo Negocio, considerando ACTIVOS e INACTIVOS.

## Propiedad H — Desactivar conserva configuración

`ACTIVO → INACTIVO` preserva identidad y configuración actual.

## Propiedad I — Reactivar conserva identidad

`ACTIVO → INACTIVO → ACTIVO` mantiene la identidad del artículo.

## Propiedad J — INACTIVO no participa normalmente de nuevas operaciones

```text
estado=INACTIVO
→ elegibilidad normal para nueva operación=false
```

## Propiedad K — Reactivación atómica

Si una reactivación con cambios falla:

```text
estado final=INACTIVO
```

y no queda ningún cambio parcial confirmado.

## Propiedad L — Categoria INACTIVA no propaga EstadoArticulo

`Categoria ACTIVA → INACTIVA` no implica `ArticuloCatalogo ACTIVO → INACTIVO`.

---


## Propiedad M — Value Object sin auto-fix

Para toda propuesta de `CapacidadesArticulo`:

```text
configuración inválida
→ rechazo
```

y nunca:

```text
configuración inválida
→ mutación silenciosa interna
→ configuración distinta aceptada.
```

---

## Propiedad N — Ausencia de SKU canónica

La ausencia funcional de SKU se representa como:

```text
null
```

Por lo tanto:

```text
input SKU = ""
→ null
```

antes de evaluar unicidad/persistencia.

---

# 10. Decisiones Técnicas Abiertas

## 10.1. Payload exacto de reactivación

No se congelan DTO, campos exactos ni estructura API.

Debe respetar:

```text
tipo inmutable;
permisos por Rol;
invariantes completas;
atomicidad.
```

## 10.2. Estrategia de concurrencia

Quedan abiertos locking optimista/pesimista, versionado, aislamiento, constraints y mecanismos equivalentes.

## 10.3. Persistencia y normalización de SKU

Quedan abiertos:

```text
índice;
constraint;
case sensitivity;
trim;
normalización Unicode;
formato permitido;
longitud máxima técnica.
```

La semántica sí está cerrada:

```text
SKU opcional
+
ausencia canónica = null
+
input "" → null
+
único por Negocio
+
incluye ACTIVO e INACTIVO.
```

La política elegida debe ser idéntica en:

```text
validación;
búsqueda de unicidad;
persistencia.
```

## 10.4. Borrado físico y dependencias

La forma de consultar M03/M04/M05/M07 para saber si existen referencias se define después.

## 10.5. Auditoría

No se decide todavía si existirán timestamps específicos, actor de cambios, historial de precio/SKU/capacidades, audit log o eventos.

## 10.6. Revisión obligatoria de precio al reactivar

La UX puede recomendar revisar precio/configuración al reactivar.

No se congela que toda reactivación deba cambiar precio.

La regla de dominio permanece:

```text
si esVendible
→ precioBase válido.
```

---

# 11. Checklist para Implementación Asistida por IA

```text
[ ] EstadoArticulo contiene únicamente ACTIVO/INACTIVO.
[ ] TipoArticulo es inmutable.
[ ] CapacidadesArticulo se trata como VO inmutable y completo.
[ ] CapacidadesArticulo rechaza combinaciones inválidas; no aplica auto-fixes silenciosos.
[ ] Deshabilitar venta construye explícitamente un nuevo VO con esVendible=false y permiteDescuento=false.
[ ] ACTIVO conserva >=1 uso operativo.
[ ] INACTIVO puede conservar 0 usos operativos.
[ ] Cambiar capacidades NO cambia EstadoArticulo automáticamente.
[ ] Desactivar es una transición explícita.
[ ] Desactivar conserva configuración.
[ ] Desactivar NO libera SKU.
[ ] Desactivar NO modifica M04.
[ ] Stock > 0 NO impide desactivar.
[ ] INACTIVO no aparece normalmente en nuevas operaciones.
[ ] INACTIVO sigue visible en historia/reportes.
[ ] INACTIVO no admite edición individual en MVP.
[ ] Reactivar reutiliza la misma identidad.
[ ] Reactivar revalida invariantes vigentes.
[ ] Reactivar puede usar datos de actualización de forma atómica.
[ ] Reactivación con payload NO es edición libre encubierta.
[ ] Encargado no usa reactivación para saltarse permisos de edición.
[ ] Si Encargado no puede reactivar por requerir reconfiguración, el rechazo distingue esa causa y exige intervención de Propietario.
[ ] Propietario puede aplicar ajustes permitidos al reactivar.
[ ] Reactivar con cambios falla sin persistir mutaciones parciales.
[ ] SKU es opcional.
[ ] La ausencia de SKU se representa como null.
[ ] Input SKU="" se normaliza a null antes de validar/persistir.
[ ] No se inventó una política no documentada de case/trim para SKU.
[ ] SKU no es identidad.
[ ] SKU es único por Negocio.
[ ] La unicidad SKU incluye ACTIVO e INACTIVO.
[ ] Cambiar SKU libera el anterior solo al confirmar.
[ ] Dos operaciones concurrentes no pueden confirmar el mismo SKU.
[ ] Categoria INACTIVA no desactiva artículos.
[ ] Categoria histórica INACTIVA no bloquea reactivación.
[ ] Nueva asociación a Categoria INACTIVA se rechaza.
[ ] Categoria debe pertenecer al mismo Negocio.
[ ] SERVICIO nunca controla stock.
[ ] SERVICIO nunca controla vencimiento.
[ ] SERVICIO nunca se usa en producción.
[ ] Producción implica BIEN + controlaStock.
[ ] Vencimiento implica BIEN + controlaStock.
[ ] Descuento implica esVendible.
[ ] esVendible true→false fuerza permiteDescuento=false.
[ ] Deshabilitar venta conserva precioBase.
[ ] Precio cero es válido.
[ ] Dinero no usa float binario impreciso.
[ ] No se fuerzan cantidades enteras.
[ ] Borrado físico NO es EstadoArticulo.
[ ] Borrado físico solo ocurre sin historia/referencias/dependencias.
[ ] Borrado físico revalida al confirmar.
[ ] Selección previa de UI no garantiza elegibilidad al confirmar.
[ ] Módulos consumidores revalidan EstadoArticulo para nuevas operaciones.
[ ] Dominio no depende de HTTP.
[ ] Dominio no depende de ORM/SQL.
[ ] ArticuloCatalogo no consulta repositorios de otros módulos.
[ ] No se congeló infraestructura innecesaria.
```

---

# 12. Contrato Semántico Mínimo para una IA

```text
1. EstadoArticulo = ACTIVO | INACTIVO.

2. TipoArticulo = BIEN | SERVICIO
   y es inmutable.

3. ACTIVO exige al menos:
   esComprable OR esVendible OR puedeUsarseEnProduccion.

4. INACTIVO puede conservar todos esos usos en false.

5. CapacidadesArticulo es un Value Object inmutable y completo;
   combinaciones inválidas se RECHAZAN;
   el VO no auto-corrige flags.

6. Desactivar es explícito:
   ACTIVO -> INACTIVO.

7. Desactivar conserva identidad y configuración.

8. Desactivar NO consulta ni modifica stock M04.

9. Stock > 0 NO impide desactivar.

10. INACTIVO no se ofrece normalmente
    en nuevas operaciones.

11. INACTIVO no admite edición individual en MVP.

12. Reactivar:
    INACTIVO -> ACTIVO,
    reutiliza la misma entidad
    y revalida invariantes.

13. Reactivación puede aceptar datos de actualización
    de forma atómica si son necesarios.

14. Reactivación con datos NO es CRUD libre
    ni bypass de permisos.

15. ENCARGADO puede reactivar sin editar;
    PROPIETARIO puede aplicar ajustes permitidos.

16. SKU es opcional.
    Ausencia = null.
    Input "" se normaliza a null.
    Es único por Negocio considerando
    ACTIVOS e INACTIVOS.

17. Categoria INACTIVA no desactiva
    los artículos ya asociados.

18. SERVICIO:
    no stock,
    no vencimiento,
    no producción.

19. permiteDescuento => esVendible.

20. puedeUsarseEnProduccion
    => BIEN + controlaStock.

21. controlaVencimiento
    => BIEN + controlaStock.

22. Borrado físico no es un estado;
    solo se permite sin historia,
    referencias ni dependencias.

23. Las guardias contextuales
    deben garantizarse al confirmar.

24. Una selección previa en UI
    no garantiza que el artículo siga ACTIVO
    cuando una nueva operación se confirma.

25. La implementación debe adaptarse
    a estas invariantes, no al revés.
```

---

# 13. Estado Documental

Estado semántico del documento:

```text
06-m02-estados-articulo.md
✅ SEMÁNTICA CERRADA Y LISTA PARA DERIVAR EL DIAGRAMA 6
```

Antes de marcar:

```text
CONGELADO Y SINCRONIZADO
```

debe:

```text
1. derivarse 06-m02-estados-articulo.puml;
2. validarse visualmente;
3. sincronizar la nueva regla MVP
   "INACTIVO no admite edición individual"
   con M02-Catalogo.md y Diagrama 3;
4. realizarse la revisión transversal final del Bloque 1.
```

---

# 14. Regla Final para Implementación Asistida por IA

Una IA debe interpretar el ciclo de vida de `ArticuloCatalogo` mediante esta separación:

```text
EstadoArticulo
→ disponibilidad estructural para nuevas operaciones

TipoArticulo
→ naturaleza general e inmutable

CapacidadesArticulo
→ elegibilidades/configuración operativa

ArticuloCatalogo
→ identidad y configuración actual

Caso de Uso
→ autenticación
→ autorización
→ contexto del Negocio
→ coordinación
→ guardias externas

Persistencia
→ unicidad
→ concurrencia
→ referencias
→ última línea de defensa

Módulos consumidores
→ historia transaccional
→ stock
→ compras
→ ventas
→ producción
```

Principio final:

> **Desactivar un artículo retira su disponibilidad futura sin destruir su identidad ni configuración. Reactivarlo reutiliza la misma entidad y exige volver a satisfacer las invariantes vigentes. Las capacidades describen cómo puede utilizarse el artículo; el EstadoArticulo describe si esa configuración está actualmente habilitada para nuevas operaciones.**

Regla adicional para generación de código:

> **Los Value Objects no reparan silenciosamente entradas inválidas. La intención del Caso de Uso construye una propuesta coherente; el dominio la acepta o la rechaza.**
