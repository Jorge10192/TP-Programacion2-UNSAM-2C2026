# CU-04 — Registrar venta

## Actor principal

Trabajador WALOS.

## Objetivo

Permitir registrar una venta de productos terminados desde una ubicación determinada, descontando automáticamente el stock correspondiente y manteniendo la trazabilidad de los lotes involucrados.

El trabajador selecciona productos y cantidades.

El sistema determina internamente de qué lote o lotes descontar las unidades vendidas.

---

## Precondiciones

- El trabajador debe estar autenticado en el sistema.
- Debe existir al menos una ubicación habilitada para venta.
- Debe existir stock disponible de los productos seleccionados en la ubicación desde la cual se realiza la venta.
- Los productos disponibles deben estar asociados a lotes registrados.
- La ubicación de venta debe estar habilitada.

Ejemplos de ubicaciones:

- Local Comercial.
- Feria.
- Casa/Depósito, si se permite venta directa desde allí.

---

## Disparador

Un cliente realiza una compra y el trabajador necesita registrar la venta en el sistema.

---

## Datos requeridos

El trabajador debe indicar:

- ubicación donde se realiza la venta;
- producto o productos vendidos;
- cantidad de cada producto;
- medio de pago.

Opcionalmente:

- promoción aplicada;
- observación.

El sistema registra automáticamente:

- fecha y hora;
- usuario que registra la venta;
- identificador de la venta;
- lotes utilizados;
- cantidad descontada de cada lote;
- importe total.

---

## Flujo principal

1. El trabajador accede a la opción **Registrar venta**.
2. El sistema solicita seleccionar la ubicación donde se realiza la venta.
3. El sistema muestra los productos con stock disponible en esa ubicación.
4. El trabajador selecciona uno o más productos.
5. El trabajador indica la cantidad de cada producto.
6. El sistema verifica que exista stock suficiente.
7. El sistema determina automáticamente qué lotes utilizar para completar las cantidades solicitadas.
8. El sistema calcula el subtotal de cada producto.
9. Si corresponde, el sistema aplica las promociones vigentes.
10. El sistema calcula el importe total de la venta.
11. El trabajador selecciona el medio de pago.
12. El sistema muestra un resumen de la operación.
13. El trabajador confirma la venta.
14. El sistema genera un identificador único de venta.
15. El sistema descuenta las cantidades vendidas de los lotes correspondientes en la ubicación seleccionada.
16. El sistema registra los movimientos de salida de stock.
17. El sistema registra la venta.
18. El sistema registra los productos, cantidades, precios, promociones y lotes involucrados.
19. El sistema confirma que la venta fue registrada correctamente.

---

## Selección automática de lotes

El trabajador no necesita seleccionar manualmente los lotes utilizados en una venta.

El sistema determina automáticamente de qué lotes descontar el stock disponible.

Ejemplo:

Stock disponible de Galletitas en Feria 1:

- Lote `L-001`: 5 unidades.
- Lote `L-002`: 20 unidades.

El cliente compra:

- 8 unidades.

El sistema puede resolver:

- 5 unidades del lote `L-001`;
- 3 unidades del lote `L-002`.

Después de la venta:

### Lote L-001

- Feria 1: 0 unidades.

### Lote L-002

- Feria 1: 17 unidades.

La venta queda asociada a ambos lotes.

---

## Venta desde una ubicación

La venta siempre debe registrarse contra una ubicación concreta.

Por ejemplo:

- Feria 1;
- Local Comercial.

El sistema solo puede descontar productos disponibles en esa ubicación.

Ejemplo:

Si existen:

- 30 Galletitas en Casa/Depósito;
- 10 Galletitas en Feria 1;

y la venta ocurre en Feria 1, el sistema solamente considera las 10 unidades disponibles en Feria 1.

---

## Promociones

Si existe una promoción vigente aplicable a los productos seleccionados:

1. El sistema identifica la promoción.
2. El sistema verifica que se cumplan sus condiciones.
3. El sistema aplica automáticamente el beneficio correspondiente.
4. El trabajador puede visualizar el descuento antes de confirmar la venta.

Ejemplos futuros:

- 2x1;
- descuento porcentual;
- precio especial por cantidad;
- promociones específicas de feria.

La configuración de promociones corresponde al caso de uso `CU-05 — Configurar promoción`.

---

## Medio de pago

El trabajador debe indicar el medio de pago utilizado.

Ejemplos:

- efectivo;
- Mercado Pago;
- Cuenta DNI;
- transferencia;
- otro medio habilitado.

Para el MVP, el sistema registra el medio informado por el trabajador.

La verificación o integración automática con plataformas de pago puede incorporarse en una versión posterior.

---

## Validaciones

### V1 — Stock insuficiente

Si la cantidad solicitada supera el stock disponible en la ubicación de venta:

1. El sistema informa la cantidad disponible.
2. No permite confirmar esa cantidad.
3. El trabajador puede modificar la cantidad o cancelar el producto.

---

### V2 — Producto sin stock en la ubicación

Los productos sin stock disponible en la ubicación seleccionada no deben aparecer como disponibles para venta.

---

### V3 — Cantidad inválida

La cantidad vendida debe ser mayor que cero y no puede superar el stock disponible.

---

## Venta en feria

Cuando la venta se realiza desde una feria:

1. El sistema descuenta el producto del stock asignado a esa feria.
2. El sistema conserva la relación con el lote original.
3. La cantidad vendida queda registrada para el posterior cierre de la asignación temporal.

Ejemplo:

Feria 1:

- 40 Galletitas asignadas.
- 27 vendidas.
- 13 restantes.

Al cerrar la feria, esas 13 unidades podrán retornar a su ubicación de origen según lo definido en `CU-03 — Mover stock entre ubicaciones`.

---

## Postcondiciones

Si la venta se registra correctamente:

- la venta queda almacenada;
- se genera un identificador único;
- se registra la ubicación donde ocurrió;
- se registra el usuario responsable;
- se registra el medio de pago;
- se registran los productos vendidos;
- se registran las cantidades;
- se registran los precios aplicados;
- se registran las promociones utilizadas, si corresponde;
- se registran los lotes involucrados;
- se actualiza el stock de cada lote en la ubicación;
- se generan los movimientos de salida correspondientes;
- la venta queda disponible para consultas y análisis posteriores.

---

## Reglas de negocio asociadas

### RN-CU04-01 — Venta asociada a una ubicación

Toda venta debe realizarse desde una ubicación habilitada.

El stock debe descontarse exclusivamente de la ubicación seleccionada.

---

### RN-CU04-02 — Trazabilidad por lote

Toda unidad vendida debe poder relacionarse con el lote del cual proviene.

Una misma venta puede consumir unidades de múltiples lotes.

---

### RN-CU04-03 — Selección automática de lotes

El trabajador selecciona productos y cantidades.

El sistema determina automáticamente qué lotes utilizar.

---

### RN-CU04-04 — No permitir stock negativo

Una venta no puede provocar stock negativo en ningún lote ni ubicación.

---

### RN-CU04-05 — Conservación del precio de venta

La venta debe conservar el precio aplicado al momento de la operación.

Cambios posteriores en el precio del producto no deben modificar ventas históricas.

---

### RN-CU04-06 — Conservación de promociones

Si se aplica una promoción, la venta debe registrar:

- promoción utilizada;
- descuento aplicado;
- importe final.

Cambios posteriores en la promoción no deben modificar la venta histórica.

---

### RN-CU04-07 — Registro del medio de pago

Toda venta debe registrar el medio de pago utilizado.

---

### RN-CU04-08 — Actualización de stock

Una venta confirmada debe reducir el stock disponible de los lotes correspondientes en la ubicación de venta.

---

## Resultado esperado

El trabajador puede registrar una venta de forma simple seleccionando:

- ubicación;
- productos;
- cantidades;
- medio de pago.

El sistema resuelve automáticamente:

- stock disponible;
- lotes utilizados;
- promociones;
- importe total;
- actualización del inventario;
- trazabilidad de la operación.
