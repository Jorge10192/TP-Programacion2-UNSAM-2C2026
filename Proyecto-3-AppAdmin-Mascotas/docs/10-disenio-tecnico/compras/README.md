# Diseño técnico — Módulo de Compras

## Objetivo

El módulo de Compras tiene como responsabilidad registrar y administrar las compras de materias primas realizadas por WALOS.

La compra se realiza físicamente fuera del sistema.

El trabajador adquiere la mercadería en un comercio o proveedor y, posteriormente, registra en WALOS la información relevante para el negocio.

El módulo deberá conservar información sobre:

- proveedor o comercio donde se realizó la compra;
- materias primas adquiridas;
- cantidades compradas;
- unidades de medida;
- precios pagados;
- fecha de la operación;
- usuario que realizó el registro;
- comprobante de compra, cuando se encuentre disponible;
- observaciones asociadas a la operación;
- historial necesario para futuros análisis de costos y proveedores.

Una vez confirmada correctamente la compra, las materias primas adquiridas serán informadas al módulo de Inventario para que puedan quedar disponibles para Producción.

---

## Alcance del módulo

El módulo de Compras administra exclusivamente las operaciones relacionadas con el registro de compras de materias primas.

El módulo comienza cuando el trabajador desea registrar una compra que ya fue realizada físicamente y finaliza cuando:

1. la compra queda registrada;
2. sus ítems quedan almacenados;
3. el comprobante queda asociado, cuando corresponda;
4. la información histórica de precios queda disponible;
5. las materias primas adquiridas son informadas al módulo de Inventario.

El módulo de Compras no administra el consumo posterior de las materias primas.

El consumo de insumos durante una producción será responsabilidad del módulo de Producción en conjunto con Inventario.

---

## Responsabilidades

El módulo deberá permitir:

- gestionar proveedores o comercios;
- gestionar el catálogo de materias primas;
- registrar compras;
- registrar uno o más ítems dentro de una misma compra;
- asociar cada ítem a una materia prima existente;
- registrar cantidades, unidades y precios;
- registrar la fecha de la operación;
- identificar automáticamente al usuario responsable;
- adjuntar opcionalmente un comprobante;
- agregar observaciones a la compra;
- conservar el historial de compras;
- conservar los precios efectivamente pagados;
- permitir correcciones y anulaciones manteniendo trazabilidad;
- informar al módulo de Inventario las materias primas incorporadas por una compra confirmada.

---

## Flujo principal

1. El trabajador realiza físicamente una compra en un comercio o proveedor.
2. Recibe la mercadería y, cuando exista, el correspondiente comprobante.
3. El trabajador accede en WALOS a la opción **Registrar compra**.
4. Selecciona el proveedor o comercio desde el catálogo de proveedores.
5. Si el proveedor no existe, podrá registrarlo y continuar luego con la compra.
6. El trabajador agrega las materias primas correspondientes a la operación.
7. Cada materia prima deberá seleccionarse desde el catálogo de materias primas habilitadas.
8. Si una materia prima todavía no existe, el trabajador podrá registrarla, habilitarla y continuar con la compra.
9. Para cada materia prima deberá registrar:
   - cantidad adquirida;
   - unidad de medida;
   - precio pagado.
10. El trabajador podrá adjuntar opcionalmente una imagen o archivo PDF del comprobante.
11. Podrá agregar observaciones asociadas a la operación.
12. El sistema mostrará un resumen de la compra.
13. El trabajador revisará la información ingresada.
14. El trabajador confirmará la operación.
15. El sistema registrará la compra y sus ítems.
16. El sistema asociará automáticamente la operación al usuario responsable.
17. La información quedará disponible como historial de compras y precios.
18. El módulo de Compras informará al módulo de Inventario las materias primas y cantidades incorporadas.
19. Inventario registrará las correspondientes entradas.
20. Las materias primas quedarán disponibles para su utilización en Producción.

---

## Catálogo de materias primas

Una compra solamente podrá contener materias primas previamente registradas y habilitadas en el catálogo del negocio.

El trabajador no deberá ingresar libremente el nombre de una materia prima dentro de un ítem de compra.

Esta restricción busca evitar registros inconsistentes como:

- `Avena`;
- `avena`;
- `AVENA`;
- distintas variantes que representen conceptualmente la misma materia prima.

Si una materia prima necesaria todavía no existe, el trabajador podrá crearla durante el flujo de compra.

Una vez registrada y habilitada, podrá seleccionarla como parte de la operación.

La creación de una nueva materia prima no deberá obligar al trabajador a abandonar la compra que se encuentra registrando.

Cada materia prima deberá poseer una unidad de medida adecuada que permita registrar y posteriormente comparar cantidades y precios.

Ejemplos:

- harina → kilogramos;
- avena → kilogramos;
- aceite → litros;
- huevos → unidades.

La normalización de unidades será especialmente importante para futuros análisis de precios y comparación entre proveedores.

---

## Catálogo de proveedores

Toda compra deberá quedar asociada a un proveedor o comercio registrado.

El trabajador seleccionará el proveedor desde un catálogo existente.

Si el proveedor no se encuentra registrado, podrá crear uno nuevo y continuar posteriormente con la operación.

Un mismo proveedor podrá estar relacionado históricamente con múltiples compras y diferentes materias primas.

Una misma materia prima podrá ser adquirida a distintos proveedores.

Esta relación permitirá posteriormente comparar cuánto se pagó por una misma materia prima en diferentes comercios.

---

## Compra e ítems de compra

Una compra podrá contener múltiples materias primas.

Ejemplo:

**Compra C-001 — Distribuidora Norte**

- Harina: 5 kg;
- Avena: 3 kg;
- Huevos: 24 unidades.

Cada materia prima será representada mediante un ítem de compra independiente.

Conceptualmente:

```text
Compra
 ├── Ítem de compra → Harina
 ├── Ítem de compra → Avena
 └── Ítem de compra → Huevos
```

Cada ítem deberá conservar como mínimo:

- materia prima;
- cantidad adquirida;
- unidad de medida;
- precio pagado.

A partir de esta información podrá calcularse posteriormente el precio unitario normalizado de una materia prima.

Ejemplo:

```text
Harina
Cantidad: 5 kg
Precio total: $7.500

Precio unitario:
$7.500 / 5 kg = $1.500 por kg
```

Este dato será fundamental para comparar proveedores y realizar análisis de costos.

---

## Historial de precios

El módulo de Compras deberá conservar la información necesaria para conocer cuánto se pagó históricamente por cada materia prima.

No será necesario mantener inicialmente una tabla independiente de historial de precios.

Los propios ítems de compra constituirán el historial de precios efectivamente pagados.

Cada registro permitirá conocer:

- qué materia prima se compró;
- a qué proveedor;
- qué cantidad;
- qué precio se pagó;
- en qué fecha.

A partir de esta información podrán calcularse posteriormente:

- último precio pagado;
- precio unitario;
- precio promedio;
- precio mínimo y máximo histórico;
- evolución del precio en el tiempo;
- diferencias de precio entre proveedores;
- gasto total por proveedor;
- frecuencia de compra de una materia prima.

El módulo de Compras únicamente conservará los datos necesarios.

Los análisis y recomendaciones posteriores corresponderán a otros módulos.

---

## Comprobantes

El comprobante de una compra será opcional.

Cuando se encuentre disponible, el trabajador podrá adjuntar:

- fotografías;
- imágenes;
- archivos PDF.

El comprobante funcionará como evidencia de la operación.

No deberá determinar automáticamente qué elementos se incorporan al inventario.

Un comprobante puede contener productos que no pertenezcan al negocio.

Por ejemplo:

```text
Ticket de supermercado

Harina
Avena
Huevos
Detergente
Gaseosa
```

Aunque todos los elementos aparezcan en el mismo comprobante, únicamente las materias primas seleccionadas explícitamente por el trabajador deberán formar parte de la compra registrada en WALOS.

La forma definitiva de almacenamiento físico de imágenes y archivos PDF será una decisión de infraestructura posterior.

La base de datos deberá conservar al menos una referencia que permita vincular el comprobante con la compra correspondiente.

---

## Relación con Inventario

El módulo de Compras no administrará directamente el stock.

Compras será responsable de registrar el hecho comercial:

> Se adquirieron determinadas materias primas en una operación concreta.

Cuando una compra sea confirmada correctamente, Compras deberá informar al módulo de Inventario las materias primas y cantidades adquiridas.

Ejemplo:

```text
Compra C-001

Harina: 5 kg
Avena: 3 kg
```

deberá generar conceptualmente:

```text
Inventario

ENTRADA_COMPRA
Harina: +5 kg
Referencia: Compra C-001

ENTRADA_COMPRA
Avena: +3 kg
Referencia: Compra C-001
```

Inventario será responsable de conservar y calcular las existencias disponibles.

Compras no deberá modificar directamente una cantidad de stock.

Esta separación permitirá que posteriormente Producción, Ventas u otros módulos utilicen Inventario sin depender directamente del módulo de Compras.

---

## Relación con Usuarios

Toda operación relevante deberá quedar vinculada al usuario responsable.

El sistema deberá identificar automáticamente al usuario que:

- registra una compra;
- realiza una corrección;
- anula una compra;
- registra o confirma un ajuste cuando corresponda.

La autenticación y administración general de los usuarios no pertenece al módulo de Compras.

Estas funcionalidades serán responsabilidad del módulo de Usuarios y Autenticación.

Compras solamente utilizará la identidad del usuario autenticado para mantener la trazabilidad de las operaciones.

---

## Estados de una compra

Inicialmente se contemplan los siguientes estados conceptuales:

### BORRADOR

La compra está siendo cargada y todavía no afecta Inventario.

Mientras permanezca en este estado, sus datos podrán ser modificados libremente.

### CONFIRMADA

La compra fue revisada y aceptada por el trabajador.

La información pasa a formar parte del historial y las materias primas correspondientes son informadas a Inventario.

Una compra confirmada no deberá modificarse sobrescribiendo silenciosamente sus datos históricos.

### ANULADA

La compra fue invalidada posteriormente.

La operación original permanecerá registrada para conservar trazabilidad.

Cuando corresponda, Inventario deberá registrar los movimientos necesarios para compensar la operación.

### REQUIERE_REVISION

Existe una inconsistencia que no puede resolverse automáticamente sin riesgo de generar información incorrecta o stock negativo.

La operación requerirá una revisión manual antes de completar la corrección.

Los estados definitivos podrán ajustarse durante la implementación si aparecen nuevas necesidades del dominio.

---

## Correcciones y anulaciones

### Compra todavía no confirmada

Mientras la compra se encuentre en estado `BORRADOR`, el trabajador podrá:

- agregar materias primas;
- eliminar ítems;
- modificar cantidades;
- modificar precios;
- cambiar proveedor;
- agregar o reemplazar el comprobante;
- modificar observaciones.

Como la operación todavía no fue confirmada, estas modificaciones no deberán afectar Inventario.

### Compra confirmada

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

Cantidad correcta:
Harina = 8 kg

Ajuste necesario:
-2 kg de harina
```

Si esos 2 kg todavía se encuentran disponibles, Inventario podrá registrar el ajuste correspondiente.

Si la materia prima ya fue utilizada y el ajuste pudiera producir stock negativo o inconsistencias, la operación deberá pasar a estado `REQUIERE_REVISION`.

En ese caso será necesario realizar un control manual y registrar posteriormente el ajuste correspondiente.

---

## Prevención de duplicados

El sistema deberá intentar reducir la posibilidad de que una misma compra sea registrada más de una vez.

Inicialmente podrán utilizarse datos como:

- proveedor;
- fecha;
- materias primas;
- cantidades;
- precios;
- importe de la operación;
- comprobante asociado.

Cuando exista un comprobante, en una versión posterior podrá calcularse una huella digital o hash del archivo.

Si exactamente el mismo archivo fue utilizado anteriormente, el sistema podrá advertir que existe una posible compra duplicada.

Una coincidencia no deberá provocar automáticamente la eliminación o rechazo de una operación cuando no exista suficiente certeza.

El trabajador deberá poder revisar la posible coincidencia y decidir si se trata realmente de una compra duplicada.

---

## Fuera de alcance del módulo

El módulo de Compras no será responsable de:

- ejecutar físicamente compras;
- realizar pagos a proveedores;
- administrar cuentas bancarias;
- administrar producción;
- administrar ventas;
- administrar reservas;
- consumir materias primas;
- calcular necesidades futuras de compra;
- recomendar qué proveedor utilizar;
- optimizar futuras compras;
- modificar directamente el stock;
- interpretar automáticamente comprobantes mediante OCR durante el MVP.

---

## Relación con el futuro Recomendador de Compras

El Recomendador de Compras será un módulo independiente.

El módulo de Compras registra operaciones reales que ya ocurrieron.

El Recomendador utilizará posteriormente esa información para ayudar a decidir cómo conviene realizar futuras compras.

Conceptualmente:

```text
Compras
   ↓
Historial de proveedores, cantidades y precios
   ↓
Analítica
   ↓
Recomendador de Compras
   ↓
Plan sugerido
```

El Recomendador podrá utilizar información como:

- proveedores disponibles;
- materias primas;
- historial de precios;
- precios actuales o cotizados;
- cantidades necesarias;
- restricciones de compra.

El algoritmo del recomendador podrá evolucionar sin modificar la forma en que el módulo de Compras registra las operaciones.

---

## Extensiones futuras

### Carga asistida mediante comprobante

En una versión futura, el trabajador podrá cargar una fotografía o archivo PDF del comprobante.

El sistema podrá utilizar OCR u otras técnicas para detectar posibles datos como:

- proveedor;
- fecha;
- materias primas;
- cantidades;
- precios;
- importe.

La información detectada deberá presentarse al trabajador para su revisión.

El sistema no deberá modificar Inventario ni registrar definitivamente la compra sin confirmación del usuario.

Esto será especialmente importante porque un mismo comprobante puede contener productos que no pertenecen al negocio.

---

### Detección avanzada de compras duplicadas

Podrá utilizarse el hash del comprobante junto con otros datos de la compra para detectar registros potencialmente duplicados.

El sistema podrá comparar:

- archivo del comprobante;
- proveedor;
- fecha;
- importe;
- materias primas;
- cantidades.

---

### Integración con análisis de proveedores

El historial generado por Compras podrá utilizarse posteriormente para:

- comparar proveedores;
- analizar evolución de precios;
- detectar diferencias de costos;
- calcular precios unitarios;
- conocer el gasto histórico por proveedor.

---

### Integración con Recomendador de Compras

Los datos históricos de Compras podrán alimentar un módulo independiente capaz de proponer cómo distribuir futuras compras entre distintos proveedores.

Ejemplo:

```text
Necesidad:

Harina: 10 kg
Avena: 5 kg
Pollo: 3 kg

Recomendación:

Proveedor A
- Harina: 10 kg

Proveedor B
- Avena: 5 kg
- Pollo: 3 kg
```

Esta funcionalidad no formará parte del MVP inicial del módulo de Compras.
