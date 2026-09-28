# CU-05 — Configurar promoción

## Actor principal

Trabajador WALOS.

## Objetivo

Permitir crear y administrar promociones comerciales que posteriormente puedan ser evaluadas automáticamente durante el registro de una venta.

Una promoción define:

- las condiciones necesarias para que pueda aplicarse;
- el descuento correspondiente;
- si puede combinarse con otras promociones;
- si se encuentra activa o inactiva.

La creación o activación de una promoción no genera ningún descuento por sí misma.

Las condiciones de una promoción se evalúan únicamente durante el registro de una venta.

---

## Precondiciones

- El trabajador debe estar autenticado.
- Deben existir productos registrados si la promoción se encuentra asociada a productos determinados.
- Los valores y condiciones de la promoción deben ser válidos para poder guardarla.

---

## Disparador

El trabajador desea crear, modificar, activar o desactivar una promoción comercial.

---

## Datos de una promoción

Cada promoción debe contener como mínimo:

- nombre;
- estado:
  - activa;
  - inactiva;
- condición o condiciones de aplicación;
- tipo de descuento;
- valor del descuento;
- indicación de si es acumulable con otras promociones.

Opcionalmente puede incluir:

- descripción;
- productos alcanzados;
- cantidad mínima o múltiplo requerido;
- medio de pago requerido;
- fecha de inicio;
- fecha de finalización;
- ubicación donde aplica;
- observaciones.

---

## Condiciones de aplicación

Una promoción puede definir una o más condiciones que deberán verificarse al momento de registrar una venta.

Las condiciones posibles pueden incluir, por ejemplo:

- compra de determinado producto;
- compra de una cantidad determinada;
- compra de múltiplos de una cantidad;
- utilización de determinado medio de pago;
- realización de la venta en una ubicación determinada;
- cumplimiento de un período de vigencia.

Estas condiciones no generan ningún efecto al configurar la promoción.

El sistema las evalúa únicamente cuando se genera una venta.

---

## Ejemplo — Promoción por cantidad

Promoción:

`Cada 2 paquetes de Galletitas → 10 % de descuento`

Durante una venta:

- 1 paquete → no cumple la condición.
- 2 paquetes → aplica una vez.
- 4 paquetes → aplica dos veces.
- 5 paquetes → aplica dos veces y una unidad queda fuera de la promoción.

El sistema determina automáticamente cuántas veces se cumple la condición.

---

## Ejemplo — Promoción según medio de pago

Como ejemplo de configuración posible:

`10 % de descuento pagando en efectivo`

La promoción solamente se aplica si, durante el registro de la venta:

1. la promoción se encuentra activa;
2. la venta cumple las demás condiciones configuradas;
3. el trabajador selecciona `Efectivo` como medio de pago.

Este tipo de promoción es una posibilidad del sistema y no implica que WALOS necesariamente deba utilizarla.

---

## Flujo principal — Crear promoción

1. El trabajador accede a la sección **Promociones**.
2. El sistema muestra la lista de promociones existentes.
3. El trabajador selecciona **Crear promoción**.
4. El trabajador ingresa:
   - nombre;
   - condiciones de aplicación;
   - tipo de descuento;
   - valor del descuento;
   - si es acumulable;
   - estado inicial.
5. Si corresponde, selecciona:
   - productos;
   - cantidades;
   - medio de pago;
   - ubicación;
   - período de vigencia.
6. El sistema valida la configuración.
7. El trabajador confirma.
8. El sistema registra la promoción.
9. La promoción queda disponible en la lista.
10. Si se encuentra activa, podrá ser evaluada en futuras ventas.

---

## Administración de promociones

El trabajador debe disponer de una lista de promociones creadas.

Para cada promoción debe poder visualizar:

- nombre;
- condición principal;
- tipo de descuento;
- valor del descuento;
- estado;
- si es acumulable.

El trabajador puede:

- crear una promoción;
- modificarla;
- activarla;
- desactivarla.

Una promoción utilizada históricamente en ventas no debería eliminarse físicamente.

Puede deshabilitarse para impedir su aplicación en nuevas ventas sin perder la trazabilidad de las ventas anteriores.

---

## Activación y desactivación

### Promoción activa

Una promoción activa puede ser considerada cuando se registra una nueva venta.

Esto no significa que necesariamente vaya a aplicarse.

Para hacerlo, la venta debe cumplir las condiciones definidas.

### Promoción inactiva

Una promoción inactiva:

- permanece almacenada;
- conserva su historial;
- no se evalúa en nuevas ventas.

---

## Evaluación durante una venta

Las promociones se evalúan únicamente dentro del proceso de registro de una venta.

Cuando el trabajador prepara una venta:

1. El sistema calcula el precio normal de los productos.
2. El sistema consulta las promociones activas.
3. Para cada promoción activa, evalúa sus condiciones.
4. El sistema identifica cuáles promociones son aplicables.
5. Calcula el descuento generado por cada una.
6. Evalúa si pueden combinarse.
7. Determina las promociones que finalmente serán utilizadas.
8. Calcula el importe total con descuento.

La venta debe mostrar el resultado antes de ser confirmada.

---

## Información mostrada durante la venta

Cuando existe una promoción aplicable, la venta debe distinguir claramente:

- importe original;
- promoción o promociones aplicadas;
- tipo de descuento;
- importe descontado;
- importe final.

Ejemplo:

### Venta V-0025

Precio original:

`$15.000`

Promoción:

`Cada 2 Galletitas → 10 %`

Descuento:

`$1.500`

Total final:

`$13.500`

---

## Promociones acumulables

Cada promoción debe indicar:

`Acumulable con otras promociones: Sí / No`

Si varias promociones aplicables son compatibles y acumulables, el sistema puede aplicar más de una dentro de la misma venta.

La venta debe registrar cada promoción por separado.

Ejemplo:

- Promoción A → 10 %.
- Promoción B → $500.

Si ambas pueden combinarse, deben quedar registradas individualmente en la venta.

---

## Promociones no acumulables

Si varias promociones cumplen sus condiciones pero no pueden aplicarse conjuntamente:

1. El sistema calcula el descuento que generaría cada alternativa.
2. Compara los resultados.
3. Selecciona automáticamente la alternativa que produzca el mayor descuento.
4. Aplica únicamente esa promoción o combinación permitida.
5. Registra cuál fue seleccionada.

Ejemplo:

Promoción A:

`10 % de descuento → $1.000`

Promoción B:

`$1.500 de descuento`

Si no son acumulables:

`Se aplica Promoción B.`

---

## Registro de promociones dentro de la venta

Las promociones aplicadas deben registrarse como una parte separada del detalle de la venta.

La venta debe conservar:

- precio original;
- promociones evaluadas que finalmente fueron aplicadas;
- importe descontado por cada promoción;
- total de descuentos;
- precio final.

Ejemplo conceptual:

`Venta`

- Productos.
- Cantidades.
- Precio original.
- Medio de pago.
- Promociones aplicadas.
  - Promoción A.
  - Descuento A.
  - Promoción B.
  - Descuento B.
- Descuento total.
- Precio final.

---

## Validaciones

### V1 — Promoción incompleta

Si faltan datos necesarios:

1. El sistema informa los campos faltantes.
2. No permite guardar la promoción hasta completar la configuración.

---

### V2 — Condición inválida

Si una condición posee valores inválidos, la promoción no puede guardarse.

Ejemplos:

- cantidad igual a cero;
- cantidad negativa;
- producto inexistente.

---

### V3 — Descuento inválido

El descuento debe contener un valor válido según su tipo.

Por ejemplo:

- un porcentaje no puede ser negativo;
- una cantidad fija de descuento no puede ser negativa.

---

## Postcondiciones

Después de crear o modificar una promoción:

- la promoción queda registrada;
- conserva su estado activo o inactivo;
- quedan registradas sus condiciones;
- queda registrado su tipo de descuento;
- queda registrado si es acumulable;
- podrá ser evaluada en futuras ventas si se encuentra activa.

La creación o modificación de la promoción no altera ventas existentes.

---

## Reglas de negocio asociadas

### RN-CU05-01 — Evaluación durante la venta

Las condiciones de las promociones se evalúan únicamente durante el registro de una venta.

Crear, modificar o activar una promoción no genera por sí mismo ningún descuento.

---

### RN-CU05-02 — Solo promociones activas

Únicamente las promociones activas pueden ser consideradas para nuevas ventas.

---

### RN-CU05-03 — Cumplimiento de condiciones

Una promoción solo puede aplicarse cuando la venta cumple todas las condiciones requeridas por su configuración.

---

### RN-CU05-04 — Aplicación automática

El trabajador no debe calcular manualmente el descuento.

El sistema determina automáticamente si corresponde aplicar una promoción y calcula su efecto.

---

### RN-CU05-05 — Aplicación por cantidad

Una promoción por cantidad puede aplicarse más de una vez dentro de una misma venta cuando su condición se cumple repetidamente.

Ejemplo:

`Cada 2 unidades → descuento`

Con 6 unidades:

`La condición se cumple 3 veces.`

---

### RN-CU05-06 — Condición según medio de pago

Una promoción puede utilizar el medio de pago como condición.

En ese caso, solo puede aplicarse cuando el medio de pago seleccionado durante la venta coincide con el configurado en la promoción.

---

### RN-CU05-07 — Acumulabilidad

Cada promoción debe indicar si permite combinarse con otras promociones.

---

### RN-CU05-08 — Mayor beneficio entre promociones incompatibles

Si varias promociones aplicables no pueden combinarse, el sistema debe elegir automáticamente la alternativa que genere el mayor descuento.

---

### RN-CU05-09 — Precio original y precio final

Toda venta con promociones debe conservar:

- precio original;
- descuentos aplicados;
- precio final.

---

### RN-CU05-10 — Trazabilidad histórica

Una venta debe conservar las promociones que fueron utilizadas al momento de realizarse.

Modificar, desactivar o eliminar lógicamente una promoción posteriormente no debe modificar ventas históricas.

---

## Resultado esperado

El trabajador puede crear una lista de promociones y decidir cuáles están activas.

Las promociones funcionan como reglas que permanecen configuradas en el sistema.

Durante una venta, el sistema evalúa automáticamente:

- productos;
- cantidades;
- medio de pago, cuando corresponda;
- ubicación, cuando corresponda;
- vigencia;
- acumulabilidad.

A partir de esas condiciones determina qué promociones aplicar.

La venta siempre debe mostrar y conservar:

- precio original;
- promociones aplicadas;
- descuento producido por cada promoción;
- descuento total;
- precio final.
