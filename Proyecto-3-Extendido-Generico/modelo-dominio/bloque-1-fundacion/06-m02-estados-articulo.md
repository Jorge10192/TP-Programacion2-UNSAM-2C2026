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
cómo se separan edición administrativa y reactivación;
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

## 1.3. Sincronización vigente del MVP

Este documento queda alineado con las decisiones actualmente vigentes de M02.

Regla central:

```text
ArticuloCatalogo ACTIVO
→ puede editarse administrativamente
→ si la edición confirma, permanece ACTIVO

ArticuloCatalogo INACTIVO
→ puede editarse administrativamente
→ si la edición confirma, permanece INACTIVO
```

Por lo tanto:

```text
editar
!=
activar
!=
reactivar
```

La edición:

- modifica la configuración vigente hacia futuro;
- NO cambia `EstadoArticulo`;
- puede preparar un artículo `INACTIVO` para una reactivación posterior;
- es todo-o-nada;
- no reescribe historia transaccional.

La reactivación:

```text
INACTIVO → ACTIVO
```

es un Caso de Uso separado.

No debe:

- recibir un payload libre de edición;
- utilizarse como bypass para modificar configuración;
- mezclar reconfiguración y cambio de estado en una misma operación conceptual.

Si un artículo `INACTIVO` no cumple actualmente las invariantes necesarias para volver a `ACTIVO`:

```text
EditarArticulo
→ confirma una configuración válida para el objetivo deseado
→ el artículo continúa INACTIVO

ReactivarArticulo
→ revalida las condiciones necesarias
→ INACTIVO → ACTIVO
```

`TipoArticulo` continúa siendo inmutable.

La matriz completa:

```text
Rol → Permiso
```

permanece abierta, salvo las excepciones funcionales expresamente congeladas en M02, como el hard delete restringido a `PROPIETARIO`.

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

## 2.6. Edición administrativa de un artículo INACTIVO

Un `ArticuloCatalogo` en estado:

```text
INACTIVO
```

puede editarse administrativamente.

La edición puede modificar, según la intención y las guardias aplicables:

```text
nombre;
descripcion;
sku;
precioBase;
costoReferencia;
imagenes;
Categoria;
UnidadMedida;
CapacidadesArticulo.
```

La edición NO puede modificar:

```text
identidad;
TipoArticulo;
EstadoArticulo.
```

Regla crítica:

```text
editar INACTIVO
→ permanece INACTIVO
```

No existe reactivación implícita.

La edición administrativa se representa conceptualmente mediante:

```text
ArticuloCatalogo.aplicarEdicion(
    propuesta : PropuestaEdicionPreparada
)
```

donde `PropuestaEdicionPreparada`:

- es un parameter object conceptual aceptado por Domain;
- no es DTO HTTP;
- no es request de API;
- no es una entidad persistente;
- no posee identidad ni ciclo de vida propio;
- no implica dependencia `Domain → Application`;
- conserva abierta su representación técnica definitiva.

La entidad valida la configuración resultante completa antes de consolidar mutaciones observables.

Por lo tanto:

```text
validar todo
→ aplicar todo
```

o:

```text
rechazar todo
```

No implementar la edición mediante una cadena pública de setters parciales.

Mientras permanezca `INACTIVO`, no se exige:

```text
>= 1 uso operativo
```

pero sí continúan vigentes las invariantes estructurales locales, por ejemplo:

- `TipoArticulo` inmutable;
- coherencia `TipoArticulo + CapacidadesArticulo`;
- `precioBase >= 0` cuando exista;
- si `esVendible = true`, `precioBase != null`;
- `costoReferencia >= 0` cuando exista;
- colección de imágenes válida;
- coherencia de Value Objects.

Las guardias que requieren contexto externo continúan siendo coordinadas por el Caso de Uso.

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
si el artículo nunca fue utilizado, se encuentra INACTIVO
y el Caso de Uso confirma que puede eliminarse físicamente
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

debe cumplirse:

```text
precioBase != null
precioBase >= 0
```

Un valor negativo es inválido.

El valor:

```text
0
```

satisface la invariante estructural de M02.

Sin embargo, M02 NO congela todavía la semántica comercial definitiva de:

```text
precioBase = 0
```

La gratuidad, promociones, bonificaciones o tratamientos comerciales equivalentes pertenecen a módulos posteriores de Ventas/Promociones.

El precio base representa una referencia comercial vigente.

Modificarlo:

```text
aplica hacia operaciones futuras;
NO modifica promociones existentes;
NO reescribe ventas históricas;
NO recalcula operaciones anteriores.
```

Los módulos transaccionales deben conservar el precio efectivamente aplicado a cada operación histórica.

---

## 3.5. Costo de referencia

`costoReferencia` es opcional.

Si existe:

```text
costoReferencia >= 0
```

Representa una referencia actual del catálogo.

No constituye:

- historial de compras;
- costo histórico de producción;
- costo transaccional de una operación pasada.

Modificarlo aplica hacia futuro y no reescribe historia.

---

## 3.6. UnidadMedida

Todo artículo posee una `UnidadMedida` válida.

Para `BIEN`, la unidad debe ser explícitamente válida.

Para `SERVICIO`, puede utilizarse:

```text
UNIDAD
HORA
```

u otra unidad normalizada apropiada.

La `UnidadMedida` vigente del catálogo puede cambiar para operaciones futuras, tanto si el artículo está `ACTIVO` como si está `INACTIVO`, siempre que se satisfagan las guardias del Caso de Uso.

La mera existencia de historia:

```text
NO congela para siempre la UnidadMedida actual.
```

Las operaciones históricas deben conservar:

```text
unidad original;
cantidad original.
```

Nunca reconstruir una operación histórica utilizando únicamente la `UnidadMedida` actual de `ArticuloCatalogo`.

Módulos consumidores futuros podrán agregar guardias operativas adicionales si un cambio de unidad afecta estado operativo actual. Esas reglas se definirán cuando dichos módulos sean diseñados.

No crear automáticamente:

```text
tieneHistoriaOperativa : Boolean
```

como atajo dentro de M02.

---

## 3.7. SKU

El SKU es:

```text
opcional;
editable tanto en ACTIVO como en INACTIVO;
no es identidad del artículo;
único por Negocio;
único considerando artículos ACTIVOS e INACTIVOS.
```

### Representación de ausencia

La ausencia de SKU se representa conceptualmente como:

```text
null
```

Input vacío o compuesto solo por espacios puede canonicalizarse a:

```text
null
```

antes de validar unicidad o persistir.

No utilizar:

```text
""
```

como un segundo significado persistido de “sin SKU”.

No se congela todavía:

```text
sensibilidad a mayúsculas/minúsculas;
algoritmo exacto de trim;
normalización Unicode;
formato o regex exacta.
```

La equivalencia funcional elegida deberá ser consistente entre:

```text
Application;
búsquedas de unicidad;
persistencia;
constraints futuros.
```

Un artículo `INACTIVO` continúa reservando su SKU.

Por lo tanto:

```text
Articulo A INACTIVO
SKU = PROD-100
```

impide que otro artículo del mismo Negocio confirme correctamente el mismo SKU.

Desactivar NO libera SKU.

Hard delete confirmado sí deja de reservar el SKU actual.

---

## 3.8. Política de cambio de SKU

La misma política aplica a ediciones de artículos `ACTIVOS` e `INACTIVOS`.

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
mismo Negocio
+
artículos ACTIVOS
+
artículos INACTIVOS
```

y excluir al propio artículo editado de la búsqueda de duplicados.

El artículo conserva la misma identidad aunque cambie SKU.

Una prevalidación de disponibilidad no constituye garantía de confirmación bajo concurrencia.

---

## 3.9. Categoria

`Categoria` es contextual al mismo Negocio.

La asociación es opcional:

```text
ArticuloCatalogo
→ Categoria [0..1]
```

Una edición debe distinguir conceptualmente:

```text
Categoria omitida
→ conservar asociación actual

Categoria = null explícito
→ quitar asociación

Categoria nueva
→ asignar/reasignar
```

Una nueva asociación o reasignación exige:

```text
Categoria existente
+
mismo Negocio
+
Categoria ACTIVA
```

Una `Categoria` ya asociada puede posteriormente pasar:

```text
ACTIVA → INACTIVA
```

sin provocar:

```text
ArticuloCatalogo ACTIVO → INACTIVO
```

El artículo:

- conserva la asociación existente;
- conserva estado;
- conserva capacidades;
- conserva precio.

Una Categoria históricamente asociada y actualmente `INACTIVA`:

```text
NO bloquea por sí sola
INACTIVO → ACTIVO
```

si no se intenta cambiar la asociación.

La prohibición sobre Categoria `INACTIVA` aplica a:

```text
nuevas asociaciones;
reasignaciones.
```

El Caso de Uso debe considerar cambios concurrentes relevantes del estado de la Categoria antes de confirmar.

---

---

## 3.10. Nombre del artículo

`nombre`:

- es editable;
- NO es identidad;
- es funcionalmente único dentro del mismo Negocio;
- la unicidad considera `ACTIVO + INACTIVO`;
- un artículo INACTIVO continúa reservando su nombre.

No se congela todavía el algoritmo exacto de normalización.

Debe existir una:

```text
equivalencia funcional compartida del catálogo
```

consistente entre validación y persistencia.

Hard delete confirmado deja de reservar el nombre actual.

---

## 3.11. Imágenes

`ArticuloCatalogo` admite conceptualmente:

```text
imagenes [0..3]
```

Invariantes:

```text
N = 0
→ no existe imagen principal

N > 0
→ exactamente una imagen es principal
```

Application puede prevalidar para feedback temprano.

Domain debe proteger la invariante final.

El modelo NO congela:

- S3;
- filesystem;
- CDN;
- Cloudinary;
- URL pública;
- Base64;
- blob SQL.

`imagenes` representa referencias lógicas.

El lifecycle físico de archivos pertenece a Arquitectura.

Regla anti-bug:

```text
NO ejecutar efectos externos irreversibles inseguros
antes de una confirmación consistente.
```

Por ejemplo, no borrar físicamente una imagen previa si todavía existe la posibilidad de que la actualización de catálogo falle.

---

## 3.12. Edición compuesta y PropuestaEdicionPreparada

La edición administrativa de `ArticuloCatalogo` se expresa conceptualmente mediante:

```text
aplicarEdicion(
    propuesta : PropuestaEdicionPreparada
)
```

`PropuestaEdicionPreparada`:

- es aceptada por Domain;
- no es DTO de API;
- no es request HTTP;
- no es modelo Pydantic obligatorio;
- no posee identidad;
- no posee ciclo de vida independiente;
- no se persiste por sí misma;
- no implica dependencia `Domain → Application`.

Application:

1. interpreta la intención parcial;
2. distingue campo omitido de `null` explícito;
3. normaliza valores funcionales;
4. resuelve referencias externas;
5. realiza prevalidaciones contextuales;
6. construye `PropuestaEdicionPreparada`.

Domain:

1. evalúa la configuración resultante completa;
2. protege invariantes locales;
3. rechaza sin mutar si alguna falla;
4. aplica todos los cambios coherentemente si la propuesta es válida.

Regla:

```text
entrada parcial
+
confirmación todo-o-nada
```

No implementar `EditarArticulo` como una cadena pública de setters.

---

# 4. Matriz Oficial de Transiciones y Comportamientos Internos

Las únicas transiciones reales de `EstadoArticulo` son:

```text
[*] → ACTIVO

ACTIVO → INACTIVO

INACTIVO → ACTIVO
```

La edición administrativa NO constituye una transición de estado.

Por lo tanto:

```text
editar ACTIVO
→ ACTIVO

editar INACTIVO
→ INACTIVO
```

Estos comportamientos internos no se representan mediante self-loops de la máquina de estados.

| Estado Origen | Operación / Comando conceptual | Estado Destino | Configuración Resultante | Guardia / Invariante Principal |
| --- | --- | --- | --- | --- |
| `[*]` | Crear artículo | `ACTIVO` | Configuración inicial | Tipo válido e inmutable, capacidades coherentes, `>=1` uso operativo, precio válido si vendible y guardias contextuales. |
| `ACTIVO` | Editar configuración | `ACTIVO` | Nueva configuración vigente | Edición todo-o-nada; Tipo y Estado no cambian; resultado conserva invariantes de ACTIVO. |
| `INACTIVO` | Editar configuración | `INACTIVO` | Nueva configuración vigente | Edición administrativa permitida; no reactiva; no exige `>=1` uso operativo. |
| `ACTIVO` | Desactivar | `INACTIVO` | Conserva configuración actual | Transición explícita; no destruye historia ni datos operativos de otros módulos. |
| `INACTIVO` | Reactivar | `ACTIVO` | Configuración vigente ya confirmada | Debe cumplir invariantes locales de ACTIVO y guardias contextuales al confirmar. |
| `INACTIVO` | Desactivar nuevamente | Rechazo | Sin cambios | No existe no-op silencioso `INACTIVO → INACTIVO` mediante desactivar. |
| `ACTIVO` | Reactivar | Rechazo | Sin cambios | No existe `ACTIVO → ACTIVO` mediante reactivar. |
| cualquier estado | Cambiar TipoArticulo | Rechazo | Sin cambios | `TipoArticulo` es inmutable. |

---

## 4.1. Creación

Un artículo nuevo se crea normalmente:

```text
ACTIVO
```

y debe satisfacer desde el inicio:

```text
TipoArticulo válido e inmutable
+
CapacidadesArticulo coherentes
+
>= 1 uso operativo
+
precioBase válido si esVendible
+
nombre funcionalmente disponible
+
SKU disponible si existe
+
Categoria válida si se asigna
+
UnidadMedida válida
+
colección de imágenes válida
+
guardias contextuales aplicables
```

No se crea primero `INACTIVO` para completar datos dentro del flujo normal actual.

---

## 4.2. Edición

Editar:

```text
NO modifica EstadoArticulo
```

Puede ejecutarse sobre:

```text
ACTIVO
INACTIVO
```

mediante una operación conceptual compuesta:

```text
ArticuloCatalogo.aplicarEdicion(
    propuesta : PropuestaEdicionPreparada
)
```

La propuesta puede representar cambios en:

- nombre;
- descripción;
- SKU;
- precioBase;
- costoReferencia;
- Categoria;
- UnidadMedida;
- imágenes;
- CapacidadesArticulo.

No puede modificar:

- identidad;
- TipoArticulo;
- EstadoArticulo.

Para `ACTIVO`, la configuración resultante debe conservar:

```text
>= 1 uso operativo
```

Para `INACTIVO`, puede existir:

```text
0 usos operativos
```

Editar un `INACTIVO` nunca lo reactiva.

---

## 4.3. Desactivación

Desactivar:

```text
ACTIVO → INACTIVO
```

conserva la configuración vigente:

```text
identidad;
nombre;
descripcion;
tipo;
UnidadMedida;
SKU;
precioBase;
costoReferencia;
imagenes;
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
liberar nombre;
quitar Categoria;
eliminar imágenes;
cambiar UnidadMedida;
crear una copia;
borrar stock;
borrar lotes;
borrar movimientos;
reescribir historia.
```

La única modificación estructural necesaria en M02 es:

```text
estado = INACTIVO
```

`stock > 0` en M04 no impide por sí solo la transición.

---

## 4.4. Reactivación

Reactivar:

```text
INACTIVO → ACTIVO
```

es un Caso de Uso independiente de la edición.

Debe:

- reutilizar la misma entidad;
- exigir estado actual `INACTIVO`;
- utilizar la configuración vigente ya confirmada;
- NO recibir un payload libre de edición;
- revalidar las invariantes locales necesarias para `ACTIVO`;
- coordinar mediante Application las guardias contextuales externas;
- confirmar el cambio de estado de forma consistente.

Si la configuración actual no permite volver a `ACTIVO`:

```text
ReactivarArticulo
→ RECHAZO
```

La corrección se realiza mediante:

```text
EditarArticulo
→ permanece INACTIVO
```

y luego:

```text
ReactivarArticulo
→ INACTIVO → ACTIVO
```

No introducir:

```text
reactivación simple
reactivación con reconfiguración
reactivar(payload)
```

como caminos semánticos diferentes.

---

## 4.5. Autorización

Los casos de uso requieren autorización contextual.

No congelar una matriz completa:

```text
Rol → Permiso
```

en este documento.

Conceptualmente podrán existir permisos como:

```text
CREAR_ARTICULO
EDITAR_CATALOGO
DESACTIVAR_ARTICULO
REACTIVAR_ARTICULO
CONSULTAR_CATALOGO
```

La asignación exacta a:

```text
PROPIETARIO
ENCARGADO
TRABAJADOR
```

queda abierta para la revisión transversal / política de autorización.

Excepción funcional ya congelada:

```text
hard delete
→ requiere PROPIETARIO
```

además de las demás condiciones correspondientes.

---

## 4.6. Preparación UX para reactivación

La UI puede mostrar la configuración actual antes de reactivar:

- precio;
- capacidades;
- SKU;
- Categoria;
- UnidadMedida;
- imágenes;
- otros datos relevantes.

Puede sugerir revisar un artículo que estuvo inactivo durante mucho tiempo.

Sin embargo:

```text
revisar
!=
editar durante la reactivación
```

Si el usuario decide modificar la configuración:

```text
EditarArticulo
```

se confirma primero.

Luego:

```text
ReactivarArticulo
```

opera sobre la configuración ya vigente.

La UI nunca constituye garantía de dominio.

---

# 5. Invariantes Semánticas y Reglas de Protección

## 5.1. Estado y capacidades son conceptos ortogonales

`EstadoArticulo` y `CapacidadesArticulo` no son equivalentes.

Incorrecto:

```text
esVendible = false
→ INACTIVO
```

Correcto:

```text
EstadoArticulo
→ ciclo de vida / habilitación estructural

CapacidadesArticulo
→ configuración operativa
```

Si una edición deja un artículo `ACTIVO` sin uso operativo:

```text
rechazar edición
```

No desactivarlo automáticamente.

Un `INACTIVO` sí puede conservar cero usos operativos.

---

## 5.2. Editar no cambia el estado

Regla transversal:

```text
EditarArticulo
→ EstadoArticulo no cambia
```

Esto aplica a ambos estados.

La edición puede preparar una configuración para una futura reactivación, pero:

```text
editar INACTIVO
!=
reactivar
```

No implementar reactivación implícita.

---

## 5.3. Desactivar no destruye configuración

Al ejecutar:

```text
desactivar()
```

no modificar automáticamente:

```text
nombre;
descripcion;
precioBase;
costoReferencia;
SKU;
Categoria;
UnidadMedida;
imagenes;
CapacidadesArticulo.
```

Tampoco liberar nombre o SKU.

---

## 5.4. Independencia de M04 — Inventario

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

NO impide por sí solo:

```text
ACTIVO → INACTIVO
```

Desactivar NO pone stock en cero ni elimina objetos de M04.

`ArticuloCatalogo` no consulta repositorios de M04.

---

## 5.5. Un artículo INACTIVO no participa normalmente de nuevas operaciones

Los módulos consumidores deberán excluir normalmente artículos `INACTIVOS` de nuevas operaciones.

Esto no invalida:

- reportes;
- referencias históricas;
- auditoría;
- consultas administrativas.

La elegibilidad debe revalidarse al confirmar nuevas operaciones.

---

## 5.6. Carrera entre selección y desactivación

Caso crítico:

```text
Usuario A selecciona artículo ACTIVO
Usuario B lo desactiva
Usuario A intenta confirmar una nueva operación
```

La selección previa:

```text
NO garantiza elegibilidad futura
```

El módulo consumidor debe revalidar la condición relevante al confirmar.

---

## 5.7. Categoria INACTIVA no propaga EstadoArticulo

Si:

```text
Categoria X
ACTIVA → INACTIVA
```

los artículos asociados:

```text
NO cambian EstadoArticulo;
NO cambian CapacidadesArticulo;
NO cambian precio;
NO pierden la asociación existente.
```

---

## 5.8. Categoria INACTIVA y reactivación

Un artículo puede estar:

```text
INACTIVO
+
Categoria asociada actualmente INACTIVA
```

y eso no bloquea por sí solo:

```text
INACTIVO → ACTIVO
```

si se conserva la asociación existente.

Si una edición intenta asignar/reasignar Categoria:

```text
Categoria destino
→ debe estar ACTIVA
→ debe pertenecer al mismo Negocio
```

---

## 5.9. SKU y nombre en aislamiento multi-tenant

La unicidad de:

```text
SKU
nombre funcional
```

es contextual al Negocio.

El mismo valor puede existir en Negocios distintos.

Dentro del mismo Negocio, la unicidad considera:

```text
ACTIVO + INACTIVO
```

---

## 5.10. Concurrencia de SKU y nombre

Dos operaciones concurrentes pueden observar un valor como disponible.

Una prevalidación:

```text
disponible
```

no es garantía.

La frontera de persistencia debe impedir que ambas confirmen la misma unicidad funcional.

---

## 5.11. Concurrencia de edición

Dos usuarios pueden editar simultáneamente el mismo artículo.

No aceptar:

```text
last-write-wins silencioso
```

como comportamiento de dominio.

Debe detectarse o prevenirse la pérdida silenciosa de cambios relevantes.

El mecanismo técnico queda abierto.

---

## 5.12. Edición vs. desactivación/reactivación

Ejemplos:

```text
A carga ACTIVO para editar
B lo desactiva
A intenta confirmar
```

o:

```text
A carga INACTIVO para editar
B lo reactiva
A intenta confirmar
```

La operación debe detectar/revalidar el conflicto relevante al confirmar.

Ningún cambio debe sobrescribir silenciosamente el estado o configuración confirmada por otra operación.

---

## 5.13. Cambio concurrente de Categoria

Una Categoria validada como `ACTIVA` al iniciar una edición puede cambiar antes de confirmar.

La frontera de confirmación debe impedir que una nueva asociación/reasignación se confirme silenciosamente si la Categoria ya no cumple las condiciones requeridas.

No congelar el mecanismo técnico.

---

## 5.14. Prevalidación no es garantía

Consultas de UX como:

```text
skuDisponible()
nombreDisponible()
categoriaAsignable()
puedeReactivarse()
```

pueden ser útiles.

Pero:

```text
prevalidación
!=
autorización definitiva
!=
garantía de persistencia
```

Las reglas relevantes deben garantizarse al confirmar.

No exigir que estas consultas existan como métodos de las entidades.

---

## 5.15. Eliminación física fuera de la máquina de estados

Hard delete:

```text
NO es EstadoArticulo
NO genera ELIMINADO
NO es transición
NO es método autosuficiente de la entidad
```

Es una operación administrativa excepcional coordinada por un Caso de Uso.

Para el MVP solo puede confirmarse si:

```text
actor con Rol PROPIETARIO
+
ArticuloCatalogo INACTIVO
+
sin historia relevante
+
sin referencias
+
sin dependencias que deban conservarse
```

La ausencia de dependencias debe revalidarse al confirmar.

Si el artículo está `ACTIVO` y se desea retirarlo:

```text
desactivar primero
```

---

## 5.16. Liberación de identificadores funcionales por hard delete

Cuando un hard delete válido se confirma:

```text
SKU actual
→ deja de estar reservado

nombre funcional actual
→ deja de estar reservado
```

No liberar ninguno antes de que el borrado haya sido confirmado.

---

## 5.17. Historia transaccional

M02 representa configuración actual.

Los módulos transaccionales deben conservar hechos históricos suficientes.

Por lo tanto:

```text
precio actual
!= precio histórico

unidad actual
!= unidad histórica

nombre actual
puede != nombre mostrado en una operación histórica
```

Editar catálogo:

```text
NO reescribe el pasado.
```

---

## 5.18. Imágenes y efectos externos

La edición lógica de referencias de imágenes participa del todo-o-nada del cambio de catálogo.

El almacenamiento físico pertenece a Arquitectura.

Evitar diseños donde:

```text
se borra archivo previo
→ luego falla persistencia
→ entidad continúa apuntando a un recurso inexistente
```

La estrategia técnica de lifecycle de archivos queda abierta.

---

# 6. Delimitación de Responsabilidades

## 6.1. `ArticuloCatalogo`

Es responsable de:

```text
identidad;
EstadoArticulo;
TipoArticulo;
configuración actual;
CapacidadesArticulo;
invariantes locales;
edición compuesta;
transiciones locales de estado.
```

No debe consultar directamente:

```text
repositories;
HTTP;
ORM;
SQL;
M03;
M04;
M05;
M07;
servicios externos.
```

`aplicarEdicion(...)` valida la configuración resultante completa antes de consolidar mutaciones.

`reactivar()` protege las invariantes locales necesarias para `ACTIVO`.

---

## 6.2. `CapacidadesArticulo`

Es un Value Object inmutable.

Responsabilidad:

```text
representar configuración completa;
validar coherencia Tipo + Capacidades.
```

No contiene hechos operativos.

No interpreta intención de usuario.

No consulta repositorios.

No auto-corrige combinaciones inválidas.

---

## 6.3. Caso de Uso — editar artículo

Puede operar sobre:

```text
ACTIVO
INACTIVO
```

Debe coordinar:

- contexto autenticado;
- Negocio actual;
- permiso conceptual de edición;
- tenant correcto;
- carga del artículo;
- resolución de Categoria;
- equivalencia/unicidad de nombre;
- unicidad de SKU;
- normalización funcional;
- construcción de `PropuestaEdicionPreparada`;
- invocación de Domain;
- concurrencia;
- confirmación todo-o-nada;
- contexto suficiente para auditoría.

La edición no modifica `EstadoArticulo`.

La matriz exacta `Rol → Permiso` permanece abierta.

---

## 6.4. Caso de Uso — desactivar

Coordina:

```text
ACTIVO → INACTIVO
```

Requiere autorización contextual.

No necesita consultar stock actual de M04 como precondición del dominio M02.

No modifica datos de M04.

La matriz exacta de roles autorizados permanece abierta.

---

## 6.5. Caso de Uso — reactivar

Coordina:

```text
INACTIVO → ACTIVO
```

Opera sobre la configuración vigente ya confirmada.

NO recibe payload libre de edición.

Debe:

- verificar autorización contextual;
- verificar tenant;
- cargar artículo;
- garantizar estado `INACTIVO`;
- coordinar guardias externas;
- invocar `reactivar()` para invariantes locales;
- confirmar consistentemente.

Si requiere cambiar datos:

```text
EditarArticulo primero
ReactivarArticulo después
```

---

## 6.6. Caso de Uso — hard delete

Es una operación separada de la máquina de estados.

En el MVP requiere:

```text
PROPIETARIO
+
ArticuloCatalogo INACTIVO
+
sin historia relevante
+
sin referencias
+
sin dependencias que conservar
```

El Caso de Uso coordina las consultas externas necesarias.

`ArticuloCatalogo` no decide por sí solo si puede borrarse físicamente.

---

## 6.7. Persistencia / frontera de confirmación

Debe ser última línea de defensa para:

```text
unicidad funcional de nombre por Negocio;
unicidad SKU por Negocio;
estado esperado al confirmar;
lost updates;
edición concurrente;
edición vs desactivación/reactivación;
cambio concurrente relevante de Categoria;
hard delete vs aparición de referencias;
aislamiento multi-tenant.
```

El mecanismo concreto queda abierto.

---

## 6.8. Módulos consumidores

M03/M04/M05/M07 utilizan `ArticuloCatalogo` según sus propias reglas.

Deben:

- revalidar elegibilidad relevante al confirmar nuevas operaciones;
- preservar su historia transaccional;
- no reconstruir pasado leyendo únicamente la configuración actual.

---

## 6.9. Arquitectura

Arquitectura resolverá posteriormente:

- transacciones;
- Unit of Work;
- locking;
- aislamiento;
- storage de imágenes;
- auditoría técnica;
- integración entre módulos;
- DTOs y endpoints;
- persistencia concreta.

Estas decisiones no deben filtrarse a las entidades de M02.

---

# 7. Errores de Implementación y Anti-Patrones a Evitar

Una IA o persona desarrolladora NO debe:

1. Crear estados adicionales como `ARCHIVADO`, `DESCONTINUADO`, `BORRADO`, `SIN_STOCK`, `AGOTADO` o `PAUSADO` sin nueva decisión de dominio.
2. Usar `deleted_at` o `is_deleted` como sustituto conceptual de `EstadoArticulo.INACTIVO`.
3. Cambiar `TipoArticulo` después de crear el artículo.
4. Bloquear toda edición de un artículo `INACTIVO`.
5. Reactivar automáticamente un artículo por haber sido editado.
6. Mezclar edición y reactivación en un único `reactivar(payload)`.
7. Implementar `EditarArticulo` como cadena de setters públicos con posibilidad de mutación parcial.
8. Permitir que `PropuestaEdicionPreparada` sea un DTO HTTP que obligue a Domain a depender de Application/API.
9. Persistir `PropuestaEdicionPreparada` como entidad con identidad propia sin una nueva decisión.
10. Mutar internamente un `CapacidadesArticulo` ya construido.
11. Aplicar auto-fixes silenciosos dentro de `CapacidadesArticulo`.
12. Aceptar `permiteDescuento=true` con `esVendible=false`.
13. Persistir `SKU=""` como un segundo significado de ausencia.
14. Inventar una política concreta de case-folding/Unicode para nombre o SKU sin decisión técnica compartida.
15. Permitir nombre funcional duplicado dentro del mismo Negocio porque uno de los artículos está INACTIVO.
16. Permitir SKU duplicado dentro del mismo Negocio porque uno está INACTIVO.
17. Confundir nombre o SKU con identidad técnica.
18. Liberar nombre o SKU al desactivar.
19. Desactivar automáticamente un artículo porque una edición deja cero usos; esa edición debe rechazarse.
20. Poner capacidades en `false` al desactivar.
21. Borrar precio, imágenes, Categoria o UnidadMedida al desactivar.
22. Consultar M04 desde `ArticuloCatalogo`.
23. Impedir desactivación solamente porque exista stock > 0.
24. Borrar stock, lotes o movimientos al desactivar.
25. Propagar automáticamente la inactividad de Categoria a sus artículos.
26. Bloquear reactivación únicamente porque la Categoria asociada existente está INACTIVA.
27. Asignar/reasignar una Categoria INACTIVA.
28. Asignar Categoria de otro Negocio.
29. Reconstruir historia con la configuración actual del catálogo.
30. Bloquear para siempre cambios de UnidadMedida por la mera existencia de historia.
31. Sobrescribir silenciosamente una edición concurrente.
32. Confiar solo en prevalidaciones de nombre, SKU, Categoria o estado.
33. Ejecutar efectos externos irreversibles de imágenes antes de una confirmación segura.
34. Tratar hard delete como estado `ELIMINADO`.
35. Permitir hard delete de un artículo ACTIVO en el MVP.
36. Permitir hard delete sin revalidar historia/referencias/dependencias.
37. Poner `puedeEliminarseFisicamente()` como decisión autosuficiente de la entidad.
38. Usar `float` binario impreciso para dinero.
39. Restringir cantidades históricas a enteros cuando la unidad admita fracciones.
40. Confiar únicamente en frontend para estado, permisos o elegibilidad.
41. Introducir HTTP, ORM, SQL o locking dentro de la semántica de la entidad.
42. Congelar optimistic locking, pessimistic locking o aislamiento sin ADR.
43. Inventar Kafka, Redis, CQRS, Event Sourcing, microservicios o Event Bus sin necesidad/decisión arquitectónica.
44. Exponer obligatoriamente todos los flags de `CapacidadesArticulo` como checkboxes técnicos al operador.
45. Interpretar `precioBase = 0` como una semántica comercial definitiva dentro de M02.

---

# 8. Batería Completa de Pruebas Derivables

| ID | Caso | Condición inicial | Acción | Resultado esperado |
| --- | --- | --- | --- | --- |
| `TC-ART-001` | Crear BIEN válido | Datos válidos | Crear | `ACTIVO`, misma configuración válida. |
| `TC-ART-002` | Crear SERVICIO válido | Capacidades coherentes | Crear | `ACTIVO`; sin stock/vencimiento/producción. |
| `TC-ART-003` | Crear sin uso operativo | Todos los usos `false` | Crear | Rechazo. |
| `TC-ART-004` | Vendible sin precio | `esVendible=true`, precio `null` | Crear/editar | Rechazo. |
| `TC-ART-005` | Precio negativo | precio `<0` | Crear/editar | Rechazo. |
| `TC-ART-006` | Precio cero estructural | vendible, precio `0` | Crear/editar | Permitido estructuralmente; semántica comercial diferida. |
| `TC-ART-007` | SERVICIO con stock | `controlaStock=true` | Crear/editar | Rechazo. |
| `TC-ART-008` | SERVICIO con vencimiento | `controlaVencimiento=true` | Crear/editar | Rechazo. |
| `TC-ART-009` | SERVICIO productivo | `puedeUsarseEnProduccion=true` | Crear/editar | Rechazo. |
| `TC-ART-010` | Descuento sin venta | descuento `true`, venta `false` | Construir capacidades | Rechazo; sin auto-fix. |
| `TC-ART-011` | Nombre duplicado ACTIVO | mismo Negocio | Crear/editar | Rechazo. |
| `TC-ART-012` | Nombre duplicado INACTIVO | mismo Negocio | Crear/editar | Rechazo. |
| `TC-ART-013` | Mismo nombre funcional otro Negocio | Negocio distinto | Crear | Permitido. |
| `TC-ART-014` | SKU duplicado ACTIVO | mismo Negocio | Crear/editar | Rechazo. |
| `TC-ART-015` | SKU duplicado INACTIVO | mismo Negocio | Crear/editar | Rechazo. |
| `TC-ART-016` | Mismo SKU otro Negocio | Negocio distinto | Crear/editar | Permitido. |
| `TC-ART-017` | SKU vacío | input vacío/espacios | Editar | Canonicalizado a `null`. |
| `TC-ART-018` | Editar ACTIVO válido | ACTIVO | Editar nombre/precio | Cambios confirmados; sigue ACTIVO. |
| `TC-ART-019` | Editar ACTIVO deja cero usos | ACTIVO | Quitar último uso | Rechazo completo; sigue ACTIVO sin cambios. |
| `TC-ART-020` | Editar INACTIVO nombre | INACTIVO | Editar | Permitido; sigue INACTIVO. |
| `TC-ART-021` | Editar INACTIVO precio | INACTIVO | Editar | Permitido; sigue INACTIVO. |
| `TC-ART-022` | Editar INACTIVO capacidades a cero usos | INACTIVO | Editar | Permitido si resto de invariantes locales válidas; sigue INACTIVO. |
| `TC-ART-023` | Editar INACTIVO no reactiva | INACTIVO | Completar configuración activable | Sigue INACTIVO. |
| `TC-ART-024` | Edición parcial falla al final | Cualquier estado | Propuesta con una invariante inválida | Ningún cambio observable confirmado. |
| `TC-ART-025` | Intentar cambiar tipo ACTIVO | BIEN | Proponer SERVICIO | Rechazo. |
| `TC-ART-026` | Intentar cambiar tipo INACTIVO | BIEN | Proponer SERVICIO | Rechazo. |
| `TC-ART-027` | Desactivar | ACTIVO | Desactivar | INACTIVO; configuración conservada. |
| `TC-ART-028` | Desactivar con stock | ACTIVO + stock M04 | Desactivar | Permitido; stock intacto. |
| `TC-ART-029` | Desactivar conserva nombre/SKU | ACTIVO | Desactivar | Ambos continúan reservados. |
| `TC-ART-030` | Desactivar conserva capacidades | ACTIVO | Desactivar | Capacidades intactas. |
| `TC-ART-031` | Desactivar INACTIVO | INACTIVO | Desactivar | Rechazo explícito. |
| `TC-ART-032` | Reactivar válido | INACTIVO activable | Reactivar | ACTIVO. |
| `TC-ART-033` | Reactivar sin uso operativo | INACTIVO con 0 usos | Reactivar | Rechazo; sigue INACTIVO. |
| `TC-ART-034` | Reactivar no recibe edición | INACTIVO | Intentar enviar cambios junto a reactivar | Rechazo/contrato no admite payload libre. |
| `TC-ART-035` | Editar y luego reactivar | INACTIVO no activable | Editar válido; luego reactivar | Edición mantiene INACTIVO; reactivación posterior pasa a ACTIVO. |
| `TC-ART-036` | Reactivar ACTIVO | ACTIVO | Reactivar | Rechazo explícito. |
| `TC-ART-037` | Categoria histórica INACTIVA | INACTIVO asociado | Reactivar sin reasignar | No bloquea por sí sola. |
| `TC-ART-038` | Nueva Categoria INACTIVA | Cualquier estado | Asignar/reasignar | Rechazo. |
| `TC-ART-039` | Categoria cross-tenant | Artículo A, Categoria B | Asignar | Rechazo. |
| `TC-ART-040` | Categoria se inactiva después | ACTIVO asociado | Inactivar Categoria | Artículo conserva estado/asociación. |
| `TC-ART-041` | Imágenes 0 | Artículo | Editar imágenes vacías | Permitido; sin principal. |
| `TC-ART-042` | Una imagen principal | Artículo | Editar | Permitido. |
| `TC-ART-043` | Tres imágenes una principal | Artículo | Editar | Permitido. |
| `TC-ART-044` | Cuatro imágenes | Artículo | Editar | Rechazo. |
| `TC-ART-045` | Varias imágenes principales | Artículo | Editar | Rechazo. |
| `TC-ART-046` | Imágenes sin principal | N>0 | Editar | Rechazo. |
| `TC-ART-047` | Cambiar unidad ACTIVO | ACTIVO con historia | Editar unidad | Puede confirmarse si guardias actuales lo permiten; historia intacta. |
| `TC-ART-048` | Cambiar unidad INACTIVO | INACTIVO con historia | Editar unidad | Puede confirmarse; sigue INACTIVO; historia intacta. |
| `TC-ART-049` | Cambiar precio no reescribe historia | Con ventas previas | Editar precio | Ventas históricas intactas. |
| `TC-ART-050` | Cambiar precio no altera promoción | Promoción existente | Editar precio | Promoción no es modificada por M02. |
| `TC-ART-051` | SKU A→B | B disponible | Editar | B asignado, A liberado solo al confirmar. |
| `TC-ART-052` | SKU A→null | A actual | Editar | A libre solo al confirmar. |
| `TC-ART-053` | SKU A→A | mismo valor | Editar | No-op funcional para SKU. |
| `TC-ART-054` | Nombre concurrente | Nombre libre | Dos ediciones crean mismo nombre funcional | Como máximo una confirma. |
| `TC-ART-055` | SKU concurrente | SKU libre | Dos asignaciones | Como máximo una confirma. |
| `TC-ART-056` | Dos ediciones mismo artículo | Misma versión lógica inicial | Confirmaciones concurrentes | No lost update silencioso. |
| `TC-ART-057` | Edición vs desactivación | ACTIVO | Operaciones concurrentes | Conflicto detectado/revalidado. |
| `TC-ART-058` | Edición vs reactivación | INACTIVO | Operaciones concurrentes | Conflicto detectado/revalidado. |
| `TC-ART-059` | Categoria cambia durante edición | Categoria ACTIVA al validar | Se inactiva antes de confirmar | Nueva asociación no confirma silenciosamente. |
| `TC-ART-060` | Selección vs desactivación | Seleccionado ACTIVO | Desactivar antes de operación consumidora | Consumidor revalida y rechaza si corresponde. |
| `TC-ART-061` | INACTIVO en historial | INACTIVO | Consultar reporte | Visible. |
| `TC-ART-062` | INACTIVO en selector operativo | INACTIVO | Nueva operación | No se ofrece normalmente. |
| `TC-ART-063` | Hard delete ACTIVO | ACTIVO sin historia | Eliminar | Rechazo: primero debe desactivarse. |
| `TC-ART-064` | Hard delete INACTIVO sin dependencias | INACTIVO + PROPIETARIO | Eliminar | Permitido tras revalidación. |
| `TC-ART-065` | Hard delete con historia | INACTIVO | Eliminar | Rechazo. |
| `TC-ART-066` | Hard delete con referencia concurrente | Elegible inicialmente | Referencia aparece antes de confirmar | Rechazo. |
| `TC-ART-067` | Hard delete libera SKU/nombre | Borrado válido | Confirmar | Dejan de estar reservados después de confirmar. |
| `TC-ART-068` | Hard delete no es estado | INACTIVO elegible | Eliminar | No aparece `ELIMINADO`. |
| `TC-ART-069` | Cross-tenant artículo | Actor Negocio A, artículo B | Editar/desactivar/reactivar | Rechazo. |
| `TC-ART-070` | Capacidades UI técnicas | Operador | UI de edición | No es obligación exponer flags técnicos; dominio sigue validando. |
| `TC-ART-071` | Efecto externo de imagen falla | Edición imágenes | Falla confirmación catálogo | No dejar referencia confirmada a archivo eliminado / estado inconsistente. |
| `TC-ART-072` | Auditoría conceptual | Edición exitosa | Confirmar | Existe contexto suficiente para reconstruir actor, artículo, cambios e instante. |

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

## Propiedad C — INACTIVO puede no tener usos

```text
estado = INACTIVO
→ no exige uso operativo mínimo
```

## Propiedad D — Edición preserva estado

Para toda edición válida:

```text
estado_final = estado_inicial
```

## Propiedad E — Tipo inmutable

```text
tipo_final = tipo_inicial
```

para toda edición, desactivación y reactivación.

## Propiedad F — Coherencia SERVICIO

```text
tipo = SERVICIO
→ controlaStock=false
  AND controlaVencimiento=false
  AND puedeUsarseEnProduccion=false
```

## Propiedad G — Descuento implica venta

```text
permiteDescuento=true
→ esVendible=true
```

## Propiedad H — Producción implica BIEN con stock

```text
puedeUsarseEnProduccion=true
→ tipo=BIEN AND controlaStock=true
```

## Propiedad I — Vencimiento implica BIEN con stock

```text
controlaVencimiento=true
→ tipo=BIEN AND controlaStock=true
```

## Propiedad J — Precio de vendible

```text
esVendible=true
→ precioBase != null AND precioBase >= 0
```

## Propiedad K — SKU único por Negocio

Para cualquier SKU no nulo existe como máximo un `ArticuloCatalogo` con ese SKU dentro del mismo Negocio, considerando ACTIVO e INACTIVO.

## Propiedad L — Nombre funcional único por Negocio

Para cualquier nombre funcional equivalente existe como máximo un artículo que lo reserva dentro del mismo Negocio, considerando ACTIVO e INACTIVO.

## Propiedad M — Desactivar conserva configuración

```text
ACTIVO → INACTIVO
```

preserva identidad y configuración actual.

## Propiedad N — Reactivar conserva identidad

```text
ACTIVO → INACTIVO → ACTIVO
```

mantiene la misma identidad.

## Propiedad O — Reactivar no edita

Una reactivación válida cambia EstadoArticulo y no modifica arbitrariamente configuración.

## Propiedad P — INACTIVO no participa normalmente de nuevas operaciones

```text
estado = INACTIVO
→ elegibilidad normal para nueva operación = false
```

## Propiedad Q — Categoria INACTIVA no propaga estado

```text
Categoria ACTIVA → INACTIVA
```

no implica:

```text
ArticuloCatalogo ACTIVO → INACTIVO
```

## Propiedad R — Value Object sin auto-fix

```text
configuración CapacidadesArticulo inválida
→ rechazo
```

nunca reparación silenciosa.

## Propiedad S — Ausencia de SKU canónica

```text
input SKU vacío/espacios
→ null
```

antes de validar/persistir.

## Propiedad T — Edición atómica

Si `aplicarEdicion(...)` falla:

```text
ningún cambio parcial queda confirmado
```

## Propiedad U — Imágenes

```text
0 <= cantidadImagenes <= 3
```

y:

```text
cantidadImagenes > 0
→ exactamente una principal
```

## Propiedad V — Historia inmutable

Una edición de configuración actual no modifica hechos transaccionales históricos.

## Propiedad W — Hard delete fuera del estado

No existe:

```text
EstadoArticulo.ELIMINADO
```

y hard delete solo puede confirmarse bajo las guardias contextuales definidas.

---

# 10. Decisiones Técnicas Abiertas

## 10.1. Representación de `PropuestaEdicionPreparada`

No se congela si será:

- Value Object;
- record;
- dataclass;
- estructura interna;
- otro parameter object.

Sí se congela:

```text
NO es DTO HTTP;
NO posee identidad;
NO se persiste por sí mismo;
NO genera dependencia Domain → Application.
```

---

## 10.2. Estrategia de concurrencia

Quedan abiertos:

- optimistic locking;
- pessimistic locking;
- versionado;
- timestamps;
- `SELECT FOR UPDATE`;
- nivel de aislamiento;
- combinación de constraints.

La semántica congelada es:

```text
no lost update silencioso
+
conflicto relevante → operación no confirmada
```

---

## 10.3. Normalización de nombre y SKU

Quedan abiertos:

- collation;
- case sensitivity;
- trim exacto;
- normalización Unicode;
- longitud técnica;
- regex;
- índices concretos.

La política elegida debe ser consistente entre validación, búsqueda y persistencia.

---

## 10.4. Borrado físico y dependencias

La forma de consultar M03/M04/M05/M07 para detectar historia/referencias/dependencias se define posteriormente.

La semántica sí exige:

```text
PROPIETARIO
+
INACTIVO
+
sin historia/referencias/dependencias
+
revalidación al confirmar
```

---

## 10.5. Auditoría

No se congela si se utilizará:

- Audit Log;
- timestamps específicos;
- actor en cada tabla;
- Domain Events;
- Event Store;
- middleware;
- otra estrategia.

Sí se exige capacidad conceptual de reconstruir quién/cuándo/qué cambió.

---

## 10.6. Imágenes

No se congela:

- S3;
- CDN;
- filesystem;
- Cloudinary;
- URLs;
- blob;
- estrategia de garbage collection;
- transacción con storage externo.

Debe preservarse consistencia entre referencias lógicas y recursos externos.

---

## 10.7. Matriz de permisos

La matriz exacta:

```text
Rol → Permiso
```

permanece abierta.

No inferir:

```text
solo PROPIETARIO edita
```

como regla general.

Excepción congelada:

```text
hard delete → PROPIETARIO
```

---

## 10.8. Precio cero

`precioBase = 0` satisface la invariante estructural.

Su significado comercial definitivo se resolverá con Ventas/Promociones.

---

## 10.9. Guardias de módulos consumidores

Módulos futuros podrán imponer guardias operativas adicionales sobre cambios estructurales, por ejemplo UnidadMedida o capacidades.

No introducir esas dependencias en M02 antes de diseñar los módulos consumidores.

---

# 11. Checklist para Implementación Asistida por IA

```text
[ ] EstadoArticulo contiene únicamente ACTIVO / INACTIVO.
[ ] TipoArticulo es inmutable.
[ ] Crear artículo produce ACTIVO bajo configuración inicial válida.
[ ] ACTIVO conserva >=1 uso operativo.
[ ] INACTIVO puede conservar 0 usos operativos.
[ ] Editar ACTIVO mantiene ACTIVO.
[ ] Editar INACTIVO está permitido administrativamente.
[ ] Editar INACTIVO mantiene INACTIVO.
[ ] Editar nunca reactiva automáticamente.
[ ] Editar usa una operación compuesta aplicarEdicion(...).
[ ] La edición valida toda la propuesta antes de consolidar mutaciones.
[ ] Fallo de edición => ningún cambio parcial confirmado.
[ ] PropuestaEdicionPreparada no es DTO HTTP.
[ ] PropuestaEdicionPreparada no se persiste por sí misma.
[ ] Domain no depende de Application.
[ ] Reactivar es un Caso de Uso separado.
[ ] Reactivar exige estado INACTIVO.
[ ] Reactivar usa configuración vigente ya confirmada.
[ ] Reactivar no recibe payload libre de edición.
[ ] Si hace falta corregir configuración: editar primero, reactivar después.
[ ] Desactivar conserva configuración.
[ ] Desactivar NO libera nombre ni SKU.
[ ] Desactivar NO modifica M04.
[ ] Stock > 0 NO impide desactivar por sí solo.
[ ] INACTIVO no aparece normalmente en nuevas operaciones.
[ ] INACTIVO sigue visible en historia/reportes.
[ ] CapacidadesArticulo es VO inmutable.
[ ] CapacidadesArticulo rechaza combinaciones inválidas.
[ ] CapacidadesArticulo no aplica auto-fixes.
[ ] SERVICIO nunca controla stock.
[ ] SERVICIO nunca controla vencimiento.
[ ] SERVICIO nunca se usa en producción.
[ ] Producción implica BIEN + controlaStock.
[ ] Vencimiento implica BIEN + controlaStock.
[ ] Descuento implica esVendible.
[ ] Vendible implica precioBase != null y precioBase >= 0.
[ ] Precio cero es estructuralmente válido, semántica comercial diferida.
[ ] Cambiar precio no modifica promociones ni historia.
[ ] costoReferencia, si existe, >= 0.
[ ] Nombre es funcionalmente único por Negocio.
[ ] La unicidad de nombre incluye ACTIVO e INACTIVO.
[ ] SKU es opcional y no es identidad.
[ ] Ausencia SKU = null.
[ ] Input SKU vacío/espacios se canonicaliza a null.
[ ] SKU es único por Negocio incluyendo ACTIVO e INACTIVO.
[ ] Cambiar SKU libera el anterior solo al confirmar.
[ ] Categoria es opcional.
[ ] Nueva asociación/reasignación requiere Categoria ACTIVA del mismo Negocio.
[ ] Categoria INACTIVA existente no desactiva el artículo.
[ ] Categoria INACTIVA existente no bloquea por sí sola reactivación.
[ ] UnidadMedida vigente puede cambiar hacia futuro.
[ ] Historia conserva unidad y cantidad originales.
[ ] No crear tieneHistoriaOperativa como atajo artificial.
[ ] imagenes tiene cardinalidad 0..3.
[ ] Si existen imágenes hay exactamente una principal.
[ ] Domain protege también invariantes de imágenes.
[ ] Storage físico de imágenes queda fuera de M02.
[ ] No ejecutar efectos externos irreversibles inseguros antes de confirmar.
[ ] Prevalidaciones no garantizan confirmación.
[ ] Persistencia protege nombre/SKU frente a concurrencia.
[ ] No se permite lost update silencioso.
[ ] Edición vs desactivación/reactivación se detecta/revalida.
[ ] Cambio concurrente relevante de Categoria se detecta/revalida.
[ ] Nueva operación consumidora revalida elegibilidad al confirmar.
[ ] Hard delete NO es EstadoArticulo.
[ ] Hard delete NO es método autosuficiente de la entidad.
[ ] Hard delete exige PROPIETARIO.
[ ] Hard delete exige ArticuloCatalogo INACTIVO.
[ ] Hard delete exige ausencia de historia/referencias/dependencias.
[ ] Hard delete revalida al confirmar.
[ ] Hard delete confirmado libera nombre y SKU.
[ ] La matriz general Rol -> Permiso permanece abierta.
[ ] Auditoría conceptual permite reconstruir actor, instante, recurso y cambios.
[ ] Dinero no usa float binario impreciso.
[ ] Dominio no depende de HTTP, ORM o SQL.
[ ] ArticuloCatalogo no consulta repositories de otros módulos.
[ ] No se congeló infraestructura innecesaria.
```

---

# 12. Contrato Semántico Mínimo para una IA

```text
1. EstadoArticulo = ACTIVO | INACTIVO.

2. TipoArticulo = BIEN | SERVICIO
   y es inmutable.

3. ACTIVO exige:
   esComprable OR esVendible OR puedeUsarseEnProduccion.

4. INACTIVO puede conservar 0 usos operativos.

5. EditarArticulo puede operar sobre ACTIVO e INACTIVO.

6. EditarArticulo NO cambia EstadoArticulo.

7. Editar INACTIVO NO reactiva.

8. La edición es todo-o-nada y valida antes de mutar.

9. La edición conceptual utiliza:
   aplicarEdicion(propuesta : PropuestaEdicionPreparada).

10. PropuestaEdicionPreparada:
    no es DTO HTTP,
    no tiene identidad,
    no se persiste por sí misma,
    no genera dependencia Domain -> Application.

11. Reactivar:
    INACTIVO -> ACTIVO.

12. Reactivar es un Caso de Uso separado,
    usa configuración vigente
    y NO recibe payload libre de edición.

13. Si INACTIVO necesita corrección:
    EditarArticulo primero,
    ReactivarArticulo después.

14. Desactivar:
    ACTIVO -> INACTIVO
    y conserva configuración.

15. Desactivar NO modifica stock/lotes/movimientos.

16. CapacidadesArticulo es un Value Object inmutable;
    combinaciones inválidas se rechazan;
    no existen auto-fixes silenciosos.

17. SERVICIO:
    no stock,
    no vencimiento,
    no producción.

18. permiteDescuento => esVendible.

19. puedeUsarseEnProduccion
    => BIEN + controlaStock.

20. controlaVencimiento
    => BIEN + controlaStock.

21. esVendible
    => precioBase != null y precioBase >= 0.

22. precioBase=0 es estructuralmente válido;
    su semántica comercial definitiva queda abierta.

23. nombre es funcionalmente único por Negocio
    considerando ACTIVO + INACTIVO.

24. SKU es opcional,
    ausencia = null,
    único por Negocio considerando ACTIVO + INACTIVO.

25. Categoria nueva/reasignada debe ser ACTIVA
    y pertenecer al mismo Negocio.

26. Categoria INACTIVA ya asociada
    no cambia el EstadoArticulo
    ni bloquea por sí sola reactivación.

27. UnidadMedida actual puede cambiar hacia futuro.
    Historia conserva unidad/cantidad originales.

28. imagenes = 0..3.
    Si N>0, exactamente una es principal.

29. Editar catálogo NO reescribe historia.

30. Prevalidación UX NO es garantía de confirmación.

31. Concurrencia no puede producir
    nombre/SKU duplicado ni lost update silencioso.

32. Hard delete NO es estado,
    requiere PROPIETARIO + INACTIVO
    + ausencia de historia/referencias/dependencias.

33. La matriz general Rol -> Permiso permanece abierta.

34. Domain NO consulta repositories
    ni depende de HTTP/ORM/SQL.

35. La implementación debe adaptarse
    a estas invariantes, no al revés.
```

---

# 13. Estado Documental

Estado semántico propuesto:

```text
06-m02-estados-articulo.md
✅ ACTUALIZADO Y SINCRONIZADO SEMÁNTICAMENTE
```

El documento ya queda alineado con:

```text
modulos/M02-Catalogo.md
03-m02-catalogo-clases.md
03-m02-catalogo-clases.puml
secuencias/02-editar-articulo.puml
```

Todavía NO declarar:

```text
BLOQUE 1 COMPLETAMENTE CONGELADO
```

hasta completar:

```text
1. actualización de 06-m02-estados-articulo.puml;
2. render y revisión visual del Diagrama 6;
3. sincronización de documentos puente pendientes;
4. auditoría transversal final del Bloque 1.
```

Luego de esa auditoría, si no aparecen contradicciones:

```text
06-m02-estados-articulo.md
→ CONGELADO Y SINCRONIZADO
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
→ configuración operativa

ArticuloCatalogo
→ identidad + configuración actual + estado

EditarArticulo
→ modifica configuración vigente
→ NO modifica EstadoArticulo

ReactivarArticulo
→ INACTIVO -> ACTIVO
→ NO edita configuración

DesactivarArticulo
→ ACTIVO -> INACTIVO
→ conserva configuración

Caso de Uso
→ autenticación
→ autorización
→ contexto del Negocio
→ guardias externas
→ coordinación
→ concurrencia
→ confirmación

Persistencia
→ unicidades
→ detección de conflictos
→ aislamiento multi-tenant
→ última línea de defensa

Módulos consumidores
→ historia transaccional
→ stock
→ compras
→ ventas
→ producción
```

Principio final:

> **Editar cambia la configuración vigente hacia futuro sin alterar el estado ni reescribir historia. Desactivar retira un artículo de nuevas operaciones sin destruir su identidad ni configuración. Reactivar reutiliza la misma entidad y habilita nuevamente su configuración vigente únicamente cuando satisface las invariantes correspondientes.**

Regla adicional:

> **Los Value Objects no reparan silenciosamente entradas inválidas. Application prepara la intención; Domain valida y acepta o rechaza; Persistencia impide que la concurrencia confirme estados incompatibles.**

Regla de separación crítica:

> **Editar un artículo INACTIVO y reactivarlo son dos operaciones distintas. Ninguna implementación debe volver a introducir `reactivar(payload)` como atajo de edición.**
