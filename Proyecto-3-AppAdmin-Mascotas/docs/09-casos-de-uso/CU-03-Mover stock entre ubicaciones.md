# CU-03 — Mover stock entre ubicaciones

## Actor principal

Trabajador WALOS.

## Objetivo

Permitir mover productos terminados entre ubicaciones habilitadas, manteniendo la trazabilidad por lote y actualizando automáticamente la cantidad disponible de cada lote en cada ubicación.

El movimiento puede ser:

- permanente, por ejemplo de Casa/Depósito a Local Comercial;
- temporal, por ejemplo una asignación de mercadería a una feria por un período determinado.

Mover una parte de un lote no genera un lote nuevo. El lote mantiene su identidad original y el sistema registra qué cantidad de ese lote se encuentra disponible en cada ubicación.

---

## Precondiciones

- El trabajador debe estar autenticado en el sistema.
- Deben existir ubicaciones habilitadas.
- Deben existir productos terminados disponibles en stock.
- Los productos deben pertenecer a lotes registrados.
- El lote debe tener cantidad disponible suficiente en la ubicación de origen.
- La ubicación de origen y la ubicación de destino deben ser diferentes.
- El movimiento debe realizarse entre ubicaciones habilitadas.

---

## Disparador

El trabajador necesita trasladar productos terminados desde una ubicación hacia otra.

Ejemplos:

- Casa/Depósito → Local Comercial.
- Local Comercial → Casa/Depósito.
- Casa/Depósito → Feria.
- Local Comercial → Feria.

---

## Datos requeridos

El trabajador debe indicar:

- ubicación de origen;
- ubicación de destino;
- producto o productos a trasladar;
- cantidad de cada producto;
- tipo de movimiento:
  - permanente;
  - temporal.

En caso de movimiento temporal también podrá registrarse:

- fecha de inicio;
- fecha u hora prevista de finalización;
- observación opcional.

El sistema registra automáticamente:

- usuario que realiza el movimiento;
- fecha y hora;
- lotes involucrados;
- cantidad trasladada de cada lote;
- ubicación de origen;
- ubicación de destino.

---

## Flujo principal

1. El trabajador accede a la opción **Mover stock**.
2. El sistema muestra las ubicaciones habilitadas.
3. El trabajador selecciona una ubicación de origen.
4. El sistema consulta el stock disponible en dicha ubicación.
5. El sistema muestra un catálogo de productos disponibles para mover.
6. Para cada producto, el sistema informa la cantidad total disponible.
7. El trabajador selecciona uno o más productos.
8. El trabajador indica la cantidad que desea trasladar de cada producto.
9. El trabajador selecciona la ubicación de destino.
10. El trabajador selecciona si el movimiento será permanente o temporal.
11. El sistema verifica que exista stock suficiente en la ubicación de origen.
12. El sistema identifica automáticamente los lotes necesarios para completar las cantidades solicitadas.
13. El sistema prioriza los lotes correspondientes según las reglas de stock definidas.
14. El sistema muestra un resumen del movimiento.
15. El trabajador confirma la operación.
16. El sistema descuenta las cantidades correspondientes de la ubicación de origen.
17. El sistema incorpora esas mismas cantidades en la ubicación de destino.
18. El sistema conserva la identidad de los lotes involucrados.
19. El sistema registra los movimientos de stock por lote.
20. El sistema registra la operación de traslado.
21. El sistema muestra una confirmación al trabajador.

---

## Distribución del lote entre ubicaciones

Un lote puede encontrarse distribuido simultáneamente entre varias ubicaciones.

Ejemplo:

Producción original:

- Lote: `L-001`
- Producto: Galletitas
- Cantidad producida: 100 unidades

Situación inicial:

- Casa/Depósito: 100
- Local Comercial: 0

El trabajador solicita mover 50 unidades desde Casa/Depósito hacia Local Comercial.

Después del movimiento:

- Casa/Depósito: 50
- Local Comercial: 50

Las 100 unidades continúan perteneciendo al mismo lote `L-001`.

No se generan automáticamente:

- nuevos lotes;
- sublotes;
- nuevas producciones.

El sistema únicamente modifica la cantidad disponible del lote en cada ubicación.

---

## Selección automática de lotes

El trabajador selecciona productos y cantidades, pero no necesita indicar manualmente qué lotes utilizar.

Ejemplo:

Stock disponible de Galletitas en Casa/Depósito:

- Lote `L-001`: 30 unidades.
- Lote `L-002`: 60 unidades.
- Lote `L-003`: 40 unidades.

El trabajador solicita mover:

- 70 unidades de Galletitas.

El sistema puede resolver internamente:

- 30 unidades del lote `L-001`;
- 40 unidades del lote `L-002`.

Resultado:

### Lote L-001

- Casa/Depósito: 0.
- Destino: 30.

### Lote L-002

- Casa/Depósito: 20.
- Destino: 40.

### Lote L-003

- Casa/Depósito: 40.
- Destino: 0.

Los lotes mantienen su identidad original.

---

## Movimiento permanente

Un movimiento permanente representa un traslado de stock entre ubicaciones estables.

Ejemplos:

- Casa/Depósito → Local Comercial.
- Local Comercial → Casa/Depósito.

Una vez confirmado:

- disminuye el stock del lote en la ubicación de origen;
- aumenta el stock del mismo lote en la ubicación de destino;
- se registra el movimiento;
- no se crea un nuevo lote.

Ejemplo:

Antes:

- Lote `L-010`
- Casa/Depósito: 80
- Local Comercial: 20

Movimiento:

- 30 unidades desde Casa/Depósito hacia Local Comercial.

Después:

- Casa/Depósito: 50
- Local Comercial: 50.

---

## Movimiento temporal

Un movimiento temporal representa una asignación de stock a una ubicación durante un período limitado.

El principal caso previsto es la asignación de productos a una feria.

Ejemplo:

- Origen: Casa/Depósito.
- Destino: Feria 1.
- Producto: Galletitas.
- Cantidad: 40 unidades.

El sistema registra qué lotes aportan esas 40 unidades y conserva dicha relación durante toda la asignación.

La mercadería sigue perteneciendo a los mismos lotes originales.

---

## Cierre de asignación temporal

Cuando finaliza una feria o asignación temporal:

1. El trabajador selecciona la asignación temporal abierta.
2. El sistema consulta las cantidades originalmente asignadas.
3. El sistema consulta las cantidades vendidas o consumidas durante el período.
4. El sistema calcula el stock sobrante.
5. El sistema identifica los lotes originales de las unidades sobrantes.
6. El sistema retorna el stock no vendido a la ubicación de origen.
7. El sistema actualiza las cantidades de cada lote por ubicación.
8. El sistema registra los movimientos de retorno.
9. El sistema marca la asignación temporal como cerrada.
10. El sistema muestra:
    - cantidad asignada;
    - cantidad vendida;
    - cantidad retornada.

Ejemplo:

Asignación inicial:

- Lote `L-001`: 20 unidades.
- Lote `L-002`: 20 unidades.
- Total asignado: 40.

Ventas:

- 27 unidades.

Sobrante:

- 13 unidades.

Las 13 unidades retornan a sus lotes de origen correspondientes.

---
## Flujos alternativos

### A1 — Stock insuficiente en la ubicación de origen

Si la cantidad solicitada supera el stock disponible en la ubicación de origen:

1. El sistema no permite confirmar el movimiento.
2. El sistema informa:
   - producto;
   - cantidad solicitada;
   - cantidad disponible.
3. El trabajador puede:
   - reducir la cantidad;
   - cancelar el movimiento;
   - reponer stock antes de continuar.

Este caso también contempla que el producto no tenga stock disponible en la ubicación seleccionada.

---

### A2 — Origen y destino iguales

Si el trabajador selecciona la misma ubicación como origen y destino:

1. El sistema no permite confirmar el movimiento.
2. El sistema solicita seleccionar una ubicación de destino diferente.

---

### A3 — El stock cambia antes de confirmar

Si el stock disponible cambia antes de confirmar el movimiento:

1. El sistema actualiza la información con el estado más reciente.
2. El movimiento preparado anteriormente deja de considerarse válido.
3. El trabajador debe volver a realizar el movimiento utilizando el stock actualizado.

Para el MVP este escenario puede considerarse poco frecuente, pero el sistema debe evitar confirmar movimientos basados en información desactualizada.

---

### A4 — Inconsistencia al cerrar una asignación temporal

Cuando finaliza una asignación temporal, el sistema compara:

- cantidad enviada;
- cantidad vendida;
- cantidad retornada.

La relación esperada es:

`cantidad enviada = cantidad vendida + cantidad retornada`

Si las cantidades no coinciden:

1. El sistema informa la diferencia detectada.
2. La asignación se marca como pendiente de revisión.
3. El sistema solicita un control manual de la mercadería.
4. Se conserva la trazabilidad de:
   - productos;
   - cantidades;
   - lotes involucrados;
   - ubicación de origen;
   - ubicación temporal;
   - ventas registradas;
   - cantidad retornada.

La diferencia puede representar una pérdida, error de registro o inconsistencia física de stock.

---

## Gestión de ubicaciones

El trabajador puede administrar el catálogo de ubicaciones.

Debe poder:

- agregar una ubicación;
- consultar ubicaciones existentes;
- deshabilitar una ubicación.

Ejemplos de ubicaciones:

- Casa/Depósito;
- Local Comercial;
- Feria 1;
- Feria 2.

Una ubicación que posea movimientos históricos no debe eliminarse físicamente.

En su lugar debe poder marcarse como deshabilitada para evitar que se utilice en nuevos movimientos.

---

## Postcondiciones

Si el movimiento se completa correctamente:

- se registra la operación;
- se conserva el lote original;
- se actualiza el stock del lote en la ubicación de origen;
- se actualiza el stock del lote en la ubicación de destino;
- se registra cada movimiento de stock;
- se conserva la trazabilidad completa;
- la suma del stock disponible por ubicación debe coincidir con el stock restante del lote;
- no se generan nuevos lotes únicamente por trasladar mercadería.

En movimientos temporales:

- queda registrada una asignación temporal;
- se conserva el origen del stock;
- las ventas pueden descontarse del stock asignado;
- al cerrar la asignación se puede retornar el sobrante al origen.

---

## Reglas de negocio asociadas

### RN-CU03-01 — Conservación de identidad del lote

Mover productos entre ubicaciones no genera un nuevo lote.

Las unidades trasladadas continúan perteneciendo al lote original.

---

### RN-CU03-02 — Stock por lote y ubicación

El sistema debe mantener la cantidad disponible de cada lote en cada ubicación.

La suma de las cantidades disponibles del lote en todas las ubicaciones debe representar su stock actual.

---

### RN-CU03-03 — Trazabilidad de movimientos

Todo movimiento debe registrar como mínimo:

- lote;
- producto;
- cantidad;
- ubicación de origen;
- ubicación de destino;
- fecha y hora;
- usuario responsable;
- tipo de movimiento.

---

### RN-CU03-04 — Selección automática de lotes

Cuando el trabajador solicita mover una cantidad de un producto, el sistema puede utilizar uno o más lotes para completar dicha cantidad.

La selección de lotes debe realizarse automáticamente según las reglas de stock vigentes.

---

### RN-CU03-05 — No permitir stock negativo

Ningún movimiento puede provocar que la cantidad disponible de un lote en una ubicación sea negativa.

---

### RN-CU03-06 — Movimiento atómico

La salida de stock de la ubicación de origen y la entrada en la ubicación de destino forman parte de una misma operación.

No debe quedar registrada únicamente una de las dos acciones.

---

### RN-CU03-07 — Ubicaciones habilitadas

Los nuevos movimientos solo pueden realizarse entre ubicaciones habilitadas.

Las ubicaciones deshabilitadas deben conservarse para consultar movimientos históricos.

---

### RN-CU03-08 — Asignación temporal

Una asignación temporal debe mantener registrada la ubicación de origen para permitir el retorno posterior del stock no vendido o no consumido.

---

### RN-CU03-09 — Retorno al lote original

Cuando finaliza una asignación temporal, las unidades sobrantes deben volver asociadas a sus lotes originales.

El cierre de la asignación no crea nuevos lotes.

---

## Consideraciones de concurrencia

El sistema puede ser utilizado simultáneamente desde distintos dispositivos o ubicaciones.

Por este motivo, el stock debe volver a validarse al momento de confirmar el movimiento.

Dos movimientos simultáneos no deben poder utilizar las mismas unidades de stock si esto provoca una cantidad negativa.

---

## Resultado esperado

El trabajador puede gestionar traslados de mercadería de forma simple, seleccionando únicamente:

- origen;
- destino;
- productos;
- cantidades;
- tipo de movimiento.

La complejidad asociada a los lotes debe ser resuelta automáticamente por el sistema.

El usuario trabaja principalmente con productos y cantidades, mientras que el sistema mantiene internamente la trazabilidad por lote y ubicación.
