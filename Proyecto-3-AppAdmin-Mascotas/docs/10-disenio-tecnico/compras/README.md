# Diseño técnico — Módulo de Compras

## Objetivo

El módulo de Compras tiene como responsabilidad registrar y administrar las compras de bienes físicos realizadas por WALOS.

La compra se realiza físicamente fuera del sistema.

El trabajador adquiere mercadería o insumos en un comercio o proveedor y, posteriormente, registra en WALOS la información relevante para el negocio.

Los bienes físicos adquiridos serán representados dentro del sistema mediante un catálogo de **insumos**.

Un insumo podrá representar, entre otros:

- materias primas;
- materiales de empaque;
- productos de limpieza;
- elementos utilizados durante la operación del negocio;
- otras categorías de bienes físicos que WALOS necesite administrar.

El módulo deberá conservar información sobre:

- proveedor o comercio donde se realizó la compra;
- insumos adquiridos;
- cantidades compradas;
- unidad base de cada insumo;
- presentación en la cual fue adquirido, cuando corresponda;
- precios pagados;
- fecha de la operación;
- usuario que realizó el registro;
- comprobante de compra, cuando se encuentre disponible;
- observaciones asociadas a la operación;
- historial necesario para futuros análisis de costos y proveedores.

Una vez confirmada correctamente la compra, los insumos correspondientes serán informados al módulo de Inventario.

Inventario será responsable de administrar las existencias físicas.

Los insumos utilizados posteriormente por Producción podrán ser consumidos desde Inventario de acuerdo con las necesidades y recetas correspondientes.

---

## Alcance del módulo

El módulo de Compras administra exclusivamente las operaciones relacionadas con el registro de adquisiciones de bienes físicos destinados a WALOS.

El módulo comienza cuando el trabajador desea registrar una compra que ya fue realizada físicamente y finaliza cuando:

1. la compra queda registrada;
2. sus ítems quedan almacenados;
3. el comprobante queda asociado, cuando corresponda;
4. la información histórica de precios queda disponible;
5. los insumos adquiridos son informados al módulo de Inventario.

El módulo de Compras no administra el consumo posterior de los insumos.

El consumo de insumos durante Producción será responsabilidad del módulo de Producción en conjunto con Inventario.

Tampoco será responsabilidad de Compras registrar egresos que no representen bienes físicos.

Ejemplos:

- alquiler;
- servicios;
- impuestos;
- seguros;
- tasas;
- otros gastos operativos sin existencia física.

Estos conceptos serán responsabilidad del módulo de Gastos.

---

## Responsabilidades

El módulo deberá permitir:

- gestionar proveedores o comercios;
- gestionar el catálogo de insumos;
- gestionar las categorías de insumos;
- registrar compras;
- registrar uno o más ítems dentro de una misma compra;
- asociar cada ítem a un insumo existente;
- registrar cantidades;
- registrar presentaciones de compra cuando corresponda;
- normalizar las cantidades utilizando la unidad base del insumo;
- registrar precios;
- registrar la fecha de la operación;
- identificar automáticamente al usuario responsable;
- adjuntar opcionalmente un comprobante;
- agregar observaciones a la compra;
- conservar el historial de compras;
- conservar los precios efectivamente pagados;
- permitir correcciones y anulaciones manteniendo trazabilidad;
- informar al módulo de Inventario los insumos incorporados por una compra confirmada.

---

## Flujo principal

1. El trabajador realiza físicamente una compra en un comercio o proveedor.
2. Recibe la mercadería y, cuando exista, el correspondiente comprobante.
3. El trabajador accede en WALOS a la opción **Registrar compra**.
4. Selecciona el proveedor o comercio desde el catálogo de proveedores.
5. Si el proveedor no existe, podrá registrarlo y continuar luego con la compra.
6. El trabajador agrega los insumos correspondientes a la operación.
7. Cada insumo deberá seleccionarse desde el catálogo de insumos habilitados.
8. Si un insumo todavía no existe, el trabajador podrá registrarlo, asignarle una categoría y continuar con la compra.
9. Para cada insumo deberá registrar la información correspondiente a la adquisición.
10. El sistema deberá determinar la cantidad incorporada expresada en la unidad base del insumo.
11. El trabajador registrará el precio pagado.
12. El trabajador podrá adjuntar opcionalmente una imagen o archivo PDF del comprobante.
13. Podrá agregar observaciones asociadas a la operación.
14. El sistema mostrará un resumen de la compra.
15. El trabajador revisará la información ingresada.
16. El trabajador confirmará la operación.
17. El sistema registrará la compra y sus ítems.
18. El sistema asociará automáticamente la operación al usuario responsable.
19. La información quedará disponible como historial de compras y precios.
20. El módulo de Compras informará al módulo de Inventario los insumos y cantidades incorporadas.
21. Inventario registrará las correspondientes entradas.
22. Los insumos quedarán disponibles para las operaciones del negocio que correspondan.

---

# Catálogo de insumos

Una compra solamente podrá contener insumos previamente registrados y habilitados en el catálogo del negocio.

El trabajador no deberá ingresar libremente el nombre de un insumo dentro de cada ítem de compra.

Esta restricción busca evitar registros inconsistentes como:

```text
Avena
avena
AVENA
```

cuando todos representan conceptualmente el mismo insumo.

Si un insumo necesario todavía no existe, el trabajador podrá crearlo durante el flujo de compra.

Una vez registrado y habilitado, podrá seleccionarlo como parte de la operación.

La creación de un nuevo insumo no deberá obligar al trabajador a abandonar la compra que se encuentra registrando.

Ejemplos de insumos:

```text
Harina
Avena
Huevos
Queso rallado
Aceite
Bolsas
Film
Cajas
Detergente
Esponjas
```

---

## Insumo

Conceptualmente, un insumo podrá representarse mediante una entidad similar a:

```text
Insumo
--------------------------------
id
nombre
categoriaId
unidadBase
activo
fechaCreacion
```

### id

Identificador único del insumo.

### nombre

Nombre utilizado por WALOS para identificarlo.

Ejemplos:

```text
Harina integral
Queso rallado
Bolsa biodegradable
Detergente
```

### categoriaId

Referencia a la categoría a la cual pertenece el insumo.

### unidadBase

Unidad normalizada en la cual Inventario deberá expresar su cantidad.

Ejemplos:

```text
Harina
→ KILOGRAMO

Aceite
→ LITRO

Huevos
→ UNIDAD

Bolsas
→ UNIDAD

Detergente
→ LITRO
```

### activo

Permite determinar si el insumo continúa habilitado para nuevas operaciones.

Un insumo histórico no deberá eliminarse físicamente si ya fue utilizado en compras.

Podrá ser desactivado para impedir nuevas operaciones sin perder trazabilidad.

### fechaCreacion

Fecha y hora de creación del registro.

---

# Categorías de insumos

Las categorías de insumos no deberán estar limitadas a una enumeración rígida dentro del código.

WALOS deberá disponer de un catálogo administrable de categorías.

Inicialmente podrán existir categorías como:

```text
Materia prima
Empaque
Limpieza
Otros
```

Pero los usuarios autorizados podrán crear nuevas categorías si el negocio evoluciona.

Por ejemplo:

```text
Decoración
Material promocional
Eventos
Equipamiento descartable
```

Esto permitirá adaptar el sistema después de su entrega sin requerir modificaciones en el código fuente cada vez que aparezca una nueva clasificación comercial.

---

## CategoriaInsumo

Conceptualmente:

```text
CategoriaInsumo
--------------------------------
id
nombre
descripcion
activa
esSistema
fechaCreacion
```

### nombre

Nombre visible de la categoría.

Ejemplos:

```text
Materia prima
Empaque
Limpieza
```

### descripcion

Descripción opcional del propósito de la categoría.

### activa

Determina si la categoría puede seguir utilizándose para nuevos insumos.

Una categoría utilizada históricamente no deberá eliminarse físicamente.

Podrá pasar a:

```text
activa = false
```

para conservar correctamente las referencias históricas.

### esSistema

Permite distinguir categorías iniciales proporcionadas junto con WALOS de categorías creadas posteriormente por los usuarios.

Por ejemplo:

```text
Materia prima
esSistema = true

Eventos
esSistema = false
```

El uso definitivo de esta propiedad podrá ajustarse durante la implementación.

---

## Relación entre CategoriaInsumo e Insumo

Una categoría podrá clasificar múltiples insumos.

Cada insumo deberá pertenecer a una categoría.

Conceptualmente:

```text
CategoriaInsumo
      1
      │
      │ clasifica
      │
      0..*
    Insumo
```

Ejemplo:

```text
Categoria:
Materia prima

Insumos:
- Harina
- Avena
- Queso rallado
- Huevos
```

Otro ejemplo:

```text
Categoria:
Empaque

Insumos:
- Bolsa
- Caja
- Film
```

La categoría clasifica al insumo pero no determina por sí sola cómo debe utilizarse.

Por ejemplo, será Producción y sus recetas quien determine qué insumos se consumen durante la elaboración de un producto.

---

# Unidad de medida

Cada insumo deberá poseer una unidad base que permita normalizar cantidades y precios.

Inicialmente podrán considerarse:

```text
KILOGRAMO
LITRO
UNIDAD
```

Conceptualmente:

```text
<<enumeration>>
UnidadMedida
--------------------------------
KILOGRAMO
LITRO
UNIDAD
```

A diferencia de las categorías de insumos, las unidades de medida representan conceptos estructurales del sistema y podrán mantenerse inicialmente como una enumeración.

---

## Unidad base y presentación de compra

La unidad base de un insumo no deberá confundirse con la presentación comercial en la cual se compra.

Por ejemplo:

```text
Insumo:
Queso rallado

Unidad base:
KILOGRAMO
```

Puede adquirirse de la siguiente forma:

```text
2 paquetes de 500 g
```

La cantidad incorporada al Inventario deberá quedar normalizada como:

```text
1 kg
```

Por lo tanto:

```text
PAQUETE
CAJA
BIDON
BOLSA
```

no deberán considerarse automáticamente unidades base.

Representan formas o presentaciones comerciales.

---

## Ejemplos de normalización

### Queso rallado

```text
Unidad base:
KILOGRAMO

Compra:
2 paquetes

Contenido por paquete:
500 g

Cantidad total:
1 kg
```

### Detergente

```text
Unidad base:
LITRO

Compra:
1 bidón

Contenido:
5 litros

Cantidad total:
5 litros
```

### Bolsas

```text
Unidad base:
UNIDAD

Compra:
1 paquete

Contenido:
100 bolsas

Cantidad total:
100 unidades
```

### Pollo comprado a granel

```text
Unidad base:
KILOGRAMO

Compra:
1,25 kg

Presentación:
no corresponde

Cantidad total:
1,25 kg
```

La presentación deberá ser opcional cuando la compra pueda expresarse directamente mediante la unidad base.

---

# Catálogo de proveedores

Toda compra deberá quedar asociada a un proveedor o comercio registrado.

El trabajador seleccionará el proveedor desde un catálogo existente.

Si el proveedor no se encuentra registrado, podrá crear uno nuevo y continuar posteriormente con la operación.

Un mismo proveedor podrá estar relacionado históricamente con múltiples compras y diferentes insumos.

Un mismo insumo podrá ser adquirido a distintos proveedores.

No será necesario crear inicialmente una relación directa entre:

```text
Proveedor
<->
Insumo
```

La relación histórica surgirá a través de:

```text
Proveedor
   ↓
Compra
   ↓
ItemCompra
   ↓
Insumo
```

Esto permitirá posteriormente conocer:

- qué proveedores vendieron determinado insumo;
- cuánto se pagó;
- qué cantidades se compraron;
- cuándo se realizaron las compras;
- diferencias históricas de precios.

---

# Compra e ítems de compra

Una compra podrá contener múltiples insumos.

Ejemplo:

**Compra C-001 — Distribuidora Norte**

```text
Harina
Queso rallado
Bolsas
Detergente
```

Cada insumo seleccionado será representado mediante un ítem de compra independiente.

Conceptualmente:

```text
Compra
 ├── ItemCompra → Harina
 ├── ItemCompra → Queso rallado
 ├── ItemCompra → Bolsas
 └── ItemCompra → Detergente
```

---

## ItemCompra

Cada ítem deberá conservar la información específica de un insumo adquirido dentro de una compra.

Conceptualmente podrá considerarse:

```text
ItemCompra
--------------------------------
id
insumoId
cantidadBase
cantidadPresentaciones
presentacion
contenidoPorPresentacion
precioTotal
--------------------------------
calcularPrecioUnitario()
```

El modelo definitivo podrá simplificarse o ajustarse durante la implementación.

---

## cantidadBase

Representa la cantidad real incorporada al Inventario expresada mediante la unidad base del insumo.

Ejemplo:

```text
Insumo:
Queso rallado

Unidad base:
KILOGRAMO

Compra:
2 paquetes de 500 g

cantidadBase:
1
```

---

## cantidadPresentaciones

Representa la cantidad de unidades comerciales adquiridas cuando corresponda.

Ejemplo:

```text
2 paquetes
```

podrá registrarse como:

```text
cantidadPresentaciones = 2
```

Este dato podrá ser opcional cuando la compra se realice directamente en la unidad base.

---

## presentacion

Describe la forma comercial en la cual fue adquirido el insumo.

Ejemplos:

```text
Paquete
Caja
Bidón
Bolsa
Botella
```

Inicialmente podrá representarse mediante información descriptiva.

La necesidad de crear un catálogo específico de presentaciones se evaluará durante la implementación.

---

## contenidoPorPresentacion

Representa cuánto contiene cada presentación expresado respecto de la unidad base correspondiente.

Ejemplo:

```text
2 paquetes de queso

contenidoPorPresentacion:
0,5 kg

cantidadBase:
1 kg
```

---

## precioTotal

Representa el precio efectivamente pagado por el ítem.

Ejemplo:

```text
Queso rallado

Cantidad:
1 kg

Precio total:
$8.000
```

---

# Precio unitario normalizado

El precio unitario no necesita almacenarse inicialmente como un dato independiente.

Puede calcularse mediante:

```text
precioUnitario =
precioTotal / cantidadBase
```

Ejemplo:

```text
Queso rallado

Compra:
2 paquetes de 500 g

Cantidad base total:
1 kg

Precio total:
$8.000

Precio unitario:
$8.000 por kg
```

Otro ejemplo:

```text
Harina

Cantidad base:
5 kg

Precio total:
$7.500

Precio unitario:
$1.500 por kg
```

La normalización será importante para comparar compras realizadas en presentaciones distintas.

Ejemplo:

```text
Proveedor A:
paquete de 500 g → $4.000

Proveedor B:
paquete de 1 kg → $7.500
```

Después de normalizar:

```text
Proveedor A:
$8.000 / kg

Proveedor B:
$7.500 / kg
```

Esto permitirá realizar comparaciones correctas independientemente de cómo se comercialice físicamente el producto.

---

# Historial de precios

El módulo de Compras deberá conservar la información necesaria para conocer cuánto se pagó históricamente por cada insumo.

No será necesario mantener inicialmente una tabla independiente de historial de precios.

Los propios ítems de compra constituirán el historial de precios efectivamente pagados.

Cada registro permitirá conocer:

- qué insumo se compró;
- a qué proveedor;
- qué cantidad base se incorporó;
- en qué presentación se compró, cuando corresponda;
- qué precio se pagó;
- en qué fecha.

A partir de esta información podrán calcularse posteriormente:

- último precio pagado;
- precio unitario normalizado;
- precio promedio;
- precio mínimo y máximo histórico;
- evolución del precio en el tiempo;
- diferencias de precio entre proveedores;
- gasto total por proveedor;
- frecuencia de compra de un insumo;
- comportamiento de precios según presentación.

El módulo de Compras únicamente conservará los datos necesarios.

Los análisis y recomendaciones posteriores corresponderán a otros módulos.

---

# Comprobantes

El comprobante de una compra será opcional.

Cuando se encuentre disponible, el trabajador podrá adjuntar:

- fotografías;
- imágenes;
- archivos PDF.

El comprobante funcionará como evidencia de la operación.

No deberá determinar automáticamente qué elementos se incorporan al sistema o al Inventario.

Un comprobante puede contener elementos pertenecientes y no pertenecientes al negocio.

Por ejemplo:

```text
Ticket de supermercado

Harina
Avena
Detergente
Bolsas
Gaseosa
Chocolate personal
```

En este ejemplo podrían corresponder a WALOS:

```text
Harina
Avena
Detergente
Bolsas
```

mientras que otros elementos podrían ser compras personales:

```text
Gaseosa
Chocolate personal
```

Por lo tanto, únicamente los bienes seleccionados explícitamente por el trabajador como parte de la compra de WALOS deberán registrarse.

La existencia de un producto dentro del comprobante no será suficiente para incorporarlo automáticamente al sistema.

La forma definitiva de almacenamiento físico de imágenes y archivos PDF será una decisión de infraestructura posterior.

La base de datos deberá conservar al menos una referencia que permita vincular el comprobante con la compra correspondiente.

---

# Relación con Inventario

El módulo de Compras no administrará directamente el stock.

Compras será responsable de registrar el hecho comercial:

> WALOS adquirió determinados insumos físicos en una operación concreta.

Cuando una compra sea confirmada correctamente, Compras deberá informar al módulo de Inventario los insumos y las cantidades base adquiridas.

Ejemplo:

```text
Compra C-001

Harina:
5 kg

Bolsas:
100 unidades

Detergente:
5 litros
```

deberá generar conceptualmente:

```text
Inventario

ENTRADA_COMPRA
Harina: +5 kg
Referencia: Compra C-001

ENTRADA_COMPRA
Bolsas: +100 unidades
Referencia: Compra C-001

ENTRADA_COMPRA
Detergente: +5 litros
Referencia: Compra C-001
```

Inventario será responsable de conservar y calcular las existencias disponibles.

Compras no deberá modificar directamente una cantidad de stock.

Esta separación permitirá que posteriormente:

- Producción;
- Ventas;
- movimientos entre ubicaciones;
- otras operaciones;

utilicen Inventario sin depender directamente del módulo de Compras.

---

# Relación con Producción

Producción no deberá depender directamente del módulo de Compras para conocer qué materiales se encuentran disponibles.

Conceptualmente:

```text
Compras
   ↓
informa entradas
   ↓
Inventario
   ↑
consulta / consume
   ↑
Producción
```

Producción consumirá desde Inventario los insumos requeridos por sus recetas u operaciones.

Por ejemplo:

```text
Producto:
Torta para perro
```

podría utilizar:

```text
Harina
Huevos
Queso
Bandeja
Caja
```

No todos los insumos existentes en el catálogo necesariamente deberán ser utilizados por Producción.

Por ejemplo:

```text
Detergente
```

puede encontrarse en Inventario pero no formar parte de una receta.

La responsabilidad de definir qué insumos utiliza cada producto corresponderá al módulo de Producción.

---

# Relación con Gastos

Compras y Gastos representan diferentes tipos de egresos económicos.

## Compra

Representa la adquisición de un bien físico.

Ejemplos:

```text
Harina
Bolsa
Detergente
Caja
```

Puede generar una existencia en Inventario.

## Gasto

Representa un egreso económico que no genera una existencia física.

Ejemplos:

```text
Alquiler
Electricidad
Seguro
Monotributo
Tasa municipal
```

Conceptualmente:

```text
               EGRESOS DE WALOS
                      │
              ┌───────┴───────┐
              │               │
           Compras           Gastos
              │               │
       bienes físicos      sin stock
              │
          Inventario
```

El módulo de Compras no deberá registrar gastos operativos sin existencia física.

Estos serán administrados mediante el módulo de Gastos.

---

# Relación con Usuarios

Toda operación relevante deberá quedar vinculada al usuario responsable.

El sistema deberá identificar automáticamente al usuario que:

- registra una compra;
- confirma una compra;
- realiza una corrección;
- anula una compra;
- registra o confirma un ajuste cuando corresponda;
- crea o modifica un insumo;
- crea o modifica una categoría de insumo.

La autenticación y administración general de los usuarios no pertenece al módulo de Compras.

Estas funcionalidades serán responsabilidad del módulo de Usuarios y Autenticación.

Compras solamente utilizará la identidad del usuario autenticado para mantener la trazabilidad de las operaciones.

---

# Estados de una compra

Inicialmente se contemplan los siguientes estados conceptuales:

## BORRADOR

La compra está siendo cargada y todavía no afecta Inventario.

Mientras permanezca en este estado, sus datos podrán ser modificados libremente.

---

## CONFIRMADA

La compra fue revisada y aceptada por el trabajador.

La información pasa a formar parte del historial y los insumos correspondientes son informados a Inventario.

Una compra confirmada no deberá modificarse sobrescribiendo silenciosamente sus datos históricos.

---

## ANULADA

La compra fue invalidada posteriormente.

La operación original permanecerá registrada para conservar trazabilidad.

Cuando corresponda, Inventario deberá registrar los movimientos necesarios para compensar la operación.

---

## REQUIERE_REVISION

Existe una inconsistencia que no puede resolverse automáticamente sin riesgo de generar información incorrecta o stock negativo.

La operación requerirá una revisión manual antes de completar la corrección.

Los estados definitivos podrán ajustarse durante la implementación si aparecen nuevas necesidades del dominio.

---

# Correcciones y anulaciones

## Compra todavía no confirmada

Mientras la compra se encuentre en estado `BORRADOR`, el trabajador podrá:

- agregar insumos;
- eliminar ítems;
- modificar cantidades;
- modificar presentaciones;
- modificar precios;
- cambiar proveedor;
- agregar o reemplazar el comprobante;
- modificar observaciones.

Como la operación todavía no fue confirmada, estas modificaciones no deberán afectar Inventario.

---

## Compra confirmada

Una compra confirmada no deberá editarse sobrescribiendo directamente la información original.

Si se detecta un error, deberá registrarse una corrección o anulación que conserve:

- la operación original;
- motivo de la corrección;
- usuario responsable;
- fecha y hora;
- información modificada;
- movimientos de Inventario relacionados.

Cuando la corrección pueda resolverse de manera segura, el sistema podrá generar automáticamente el ajuste correspondiente.

Ejemplo:

```text
Compra registrada:

Harina = 10 kg
```

Cantidad correcta:

```text
Harina = 8 kg
```

Ajuste necesario:

```text
-2 kg de harina
```

Si esos 2 kg todavía se encuentran disponibles, Inventario podrá registrar el ajuste correspondiente.

Si el insumo ya fue utilizado y el ajuste pudiera producir stock negativo o inconsistencias, la operación deberá pasar a estado:

```text
REQUIERE_REVISION
```

En ese caso será necesario realizar un control manual y registrar posteriormente el ajuste correspondiente.

---

# Historial y trazabilidad

Una operación confirmada no deberá desaparecer ni ser reemplazada silenciosamente.

El historial deberá permitir conocer:

- compra original;
- usuario que la creó;
- usuario que la confirmó;
- fecha de creación;
- fecha de confirmación;
- correcciones posteriores;
- anulaciones;
- motivos;
- usuarios responsables;
- movimientos relacionados en Inventario.

El detalle técnico definitivo del mecanismo de auditoría se establecerá durante la implementación.

---

# Prevención de duplicados

El sistema deberá intentar reducir la posibilidad de que una misma compra sea registrada más de una vez.

Inicialmente podrán utilizarse datos como:

- proveedor;
- fecha;
- insumos;
- cantidades;
- presentaciones;
- precios;
- importe de la operación;
- comprobante asociado.

Cuando exista un comprobante, en una versión posterior podrá calcularse una huella digital o hash del archivo.

Si exactamente el mismo archivo fue utilizado anteriormente, el sistema podrá advertir que existe una posible compra duplicada.

Una coincidencia no deberá provocar automáticamente la eliminación o rechazo de una operación cuando no exista suficiente certeza.

El trabajador deberá poder revisar la posible coincidencia y decidir si se trata realmente de una compra duplicada.

---

# Relación histórica entre proveedores e insumos

No deberá existir inicialmente una relación directa:

```text
Proveedor
<->
Insumo
```

La relación surge de las compras efectivamente realizadas.

Conceptualmente:

```text
Proveedor
   ↓
Compra
   ↓
ItemCompra
   ↓
Insumo
```

Esto permite conocer históricamente:

```text
Proveedor A
→ vendió Harina
→ 10 kg
→ $15.000
→ fecha determinada
```

y compararlo posteriormente con:

```text
Proveedor B
→ vendió Harina
→ 10 kg
→ $13.500
→ otra fecha
```

De esta forma, el modelo no obliga a mantener manualmente relaciones entre proveedores e insumos.

Las relaciones reales se deducen de las operaciones registradas.

---

# Modelo conceptual del módulo

Las principales entidades consideradas actualmente son:

```text
Proveedor

Compra

ItemCompra

Insumo

CategoriaInsumo

Comprobante

CorreccionCompra
```

Además se consideran enumeraciones estructurales como:

```text
UnidadMedida

EstadoCompra

TipoCorreccion
```

El módulo utilizará también la identidad de:

```text
Usuario
```

como entidad externa perteneciente al módulo de Usuarios y Autenticación.

---

## Relaciones conceptuales principales

```text
Proveedor
   1
   │
   │ realiza históricamente
   │
   0..*
 Compra
```

```text
Compra
   1
   │
   │ contiene
   │
   1..*
ItemCompra
```

```text
Insumo
   1
   │
   │ corresponde a
   │
   0..*
ItemCompra
```

```text
CategoriaInsumo
   1
   │
   │ clasifica
   │
   0..*
Insumo
```

```text
Compra
   1
   │
   │ posee
   │
   0..*
Comprobante
```

```text
Compra
   1
   │
   │ historial
   │
   0..*
CorreccionCompra
```

```text
Usuario
   1
   │
   │ responsable
   │
   0..*
Compra / CorreccionCompra
```

Las cardinalidades definitivas podrán ajustarse durante la implementación si aparecen restricciones adicionales.

---

# Fuera de alcance del módulo

El módulo de Compras no será responsable de:

- ejecutar físicamente compras;
- realizar pagos a proveedores;
- administrar cuentas bancarias;
- administrar gastos operativos sin bienes físicos;
- administrar producción;
- administrar ventas;
- administrar reservas;
- consumir directamente insumos;
- administrar directamente cantidades de stock;
- calcular necesidades futuras de compra;
- recomendar automáticamente qué proveedor utilizar;
- optimizar futuras compras;
- realizar liquidaciones impositivas;
- interpretar automáticamente comprobantes mediante OCR durante el MVP.

---

# Relación con el futuro Recomendador de Compras

El Recomendador de Compras será un módulo independiente.

El módulo de Compras registra operaciones reales que ya ocurrieron.

El Recomendador utilizará posteriormente esa información para ayudar a decidir cómo conviene realizar futuras compras.

Conceptualmente:

```text
Compras
   ↓
Historial de proveedores,
insumos, cantidades y precios
   ↓
Analítica
   ↓
Recomendador de Compras
   ↓
Plan sugerido
```

El Recomendador podrá utilizar información como:

- proveedores disponibles;
- insumos;
- categorías de insumos;
- historial de precios;
- precios actuales o cotizados;
- cantidades necesarias;
- Inventario actual;
- necesidades futuras;
- restricciones de compra.

El algoritmo del recomendador podrá evolucionar sin modificar la forma en que el módulo de Compras registra las operaciones.

---

# Extensiones futuras

## Carga asistida mediante comprobante

En una versión futura, el trabajador podrá cargar una fotografía o archivo PDF del comprobante.

El sistema podrá utilizar OCR u otras técnicas para detectar posibles datos como:

- proveedor;
- fecha;
- insumos;
- cantidades;
- presentaciones;
- precios;
- importe.

La información detectada deberá presentarse al trabajador para su revisión.

El sistema no deberá modificar Inventario ni registrar definitivamente la compra sin confirmación del usuario.

Esto será especialmente importante porque un mismo comprobante puede contener productos que no pertenecen al negocio.

---

## Detección avanzada de compras duplicadas

Podrá utilizarse el hash del comprobante junto con otros datos de la compra para detectar registros potencialmente duplicados.

El sistema podrá comparar:

- archivo del comprobante;
- proveedor;
- fecha;
- importe;
- insumos;
- cantidades;
- presentaciones.

---

## Catálogo de presentaciones

Inicialmente la presentación de una compra podrá conservarse de manera simple.

Si posteriormente aparece suficiente necesidad, podrá crearse un catálogo específico de presentaciones.

Ejemplos:

```text
Paquete
Caja
Botella
Bidón
Bolsa
Bandeja
```

La existencia de este catálogo no deberá modificar la unidad base utilizada para Inventario.

Por ejemplo:

```text
Presentación:
Paquete

Contenido:
500 g

Unidad base:
KILOGRAMO
```

---

## Conversiones adicionales de unidades

Inicialmente se utilizarán unidades base simples como:

```text
KILOGRAMO
LITRO
UNIDAD
```

En una versión posterior podrán incorporarse conversiones adicionales cuando resulten necesarias.

Por ejemplo:

```text
gramos → kilogramos

mililitros → litros
```

El objetivo será conservar siempre una cantidad normalizada adecuada para Inventario y análisis de precios.

---

## Integración con análisis de proveedores

El historial generado por Compras podrá utilizarse posteriormente para:

- comparar proveedores;
- analizar evolución de precios;
- detectar diferencias de costos;
- calcular precios unitarios normalizados;
- conocer el gasto histórico por proveedor;
- conocer qué proveedor vendió cada insumo;
- comparar distintas presentaciones comerciales.

---

## Integración con Recomendador de Compras

Los datos históricos de Compras podrán alimentar un módulo independiente capaz de proponer cómo distribuir futuras compras entre distintos proveedores.

Ejemplo:

```text
Necesidad:

Harina: 10 kg
Avena: 5 kg
Pollo: 3 kg
Bolsas: 100 unidades
```

Recomendación:

```text
Proveedor A

- Harina: 10 kg
- Bolsas: 100 unidades
```

```text
Proveedor B

- Avena: 5 kg
- Pollo: 3 kg
```

Esta funcionalidad no formará parte del MVP inicial del módulo de Compras.

---

# Decisiones de diseño actuales

## MateriaPrima deja de ser la entidad general de Compras

Inicialmente el diseño utilizaba:

```text
MateriaPrima
```

como entidad central del catálogo.

Durante el análisis se detectó que WALOS también necesita registrar compras de bienes físicos que no son materias primas.

Ejemplos:

```text
Bolsas
Film
Cajas
Detergente
Esponjas
```

Por este motivo se adopta el concepto más general:

```text
Insumo
```

`Materia prima` pasa a ser una posible categoría de un insumo.

---

## Las categorías son configurables

Las categorías comerciales del negocio no deberán quedar rígidamente definidas en el código.

Por este motivo:

```text
CategoriaInsumo
```

se modelará como un catálogo administrable.

Esto permitirá que WALOS cree nuevas categorías después de la entrega del sistema.

---

## Unidad base y presentación son conceptos diferentes

La unidad base representa cómo debe conservarse y compararse una cantidad.

La presentación representa cómo fue adquirido comercialmente el producto.

Ejemplo:

```text
Insumo:
Queso rallado

Unidad base:
KILOGRAMO

Presentación:
Paquete

Compra:
2 paquetes de 500 g

Cantidad base:
1 kg
```

Esto permitirá comparar correctamente proveedores aunque utilicen presentaciones diferentes.

---

## Compras y Gastos permanecen separados

Una compra requiere la existencia de un bien físico adquirido.

Un gasto operativo sin existencia física será administrado por el módulo de Gastos.

Ejemplos:

```text
Harina
→ Compra

Detergente
→ Compra

Alquiler
→ Gasto

Electricidad
→ Gasto

Monotributo
→ Gasto
```

Esta separación permitirá que Inventario reciba únicamente operaciones que representen bienes físicos.

---

# Estado actual

El módulo de Compras se encuentra en desarrollo.

Actualmente ya se comenzó a implementar:

```text
Proveedor
```

y se está redefiniendo el catálogo originalmente denominado:

```text
MateriaPrima
```

para reemplazarlo por:

```text
Insumo
```

junto con:

```text
CategoriaInsumo
```

Antes de continuar con la implementación de:

```text
Compra
ItemCompra
```

deberán alinearse:

- modelo de clases;
- documentación técnica;
- migraciones;
- modelos SQLAlchemy;
- schemas de API;
- endpoints correspondientes.

La implementación deberá mantener la separación entre:

```text
Compras
Inventario
Producción
Gastos
Usuarios
Recomendador de Compras
```

para evitar que un mismo módulo asuma responsabilidades que pertenecen a otras partes del sistema.
