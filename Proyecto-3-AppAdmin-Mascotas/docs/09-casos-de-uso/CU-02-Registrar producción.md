# CU-02 — Registrar producción

## Actor principal

Trabajador de WALOS.

## Objetivo

Registrar una producción realizada por WALOS, descontar las materias primas utilizadas, calcular el costo de producción, generar el lote correspondiente y actualizar el stock de productos terminados.

## Precondiciones

- El trabajador debe haber iniciado sesión en la plataforma.
- El sistema debe poder utilizarse desde celular o computadora.
- Debe existir un catálogo de productos habilitados para producción.
- Cada producto habilitado para producción debe estar asociado a una receta válida.
- Las materias primas necesarias deben encontrarse registradas en el sistema.
- Debe existir stock disponible suficiente de las materias primas necesarias para confirmar la producción.

## Disparador

Un trabajador de WALOS realiza o finaliza una producción y desea registrarla en el sistema.

## Datos de la operación

Cada producción deberá registrar como mínimo:

- producto elaborado;
- receta asociada;
- cantidad estimada a producir;
- cantidad efectivamente producida;
- materias primas utilizadas;
- cantidades reales utilizadas de cada materia prima;
- fecha de producción;
- usuario que registra la operación, identificado automáticamente por el sistema.

El sistema deberá registrar además:

- costo de las materias primas utilizadas;
- costo total de producción;
- costo estimado por unidad producida;
- lote generado;
- condición de conservación;
- fecha estimada de vencimiento;
- observación opcional sobre la producción.

## Flujo principal

1. El trabajador accede a la plataforma desde un celular o computadora.
2. Selecciona la opción **Registrar producción**.
3. El sistema muestra el formulario de producción.
4. El sistema muestra el catálogo de productos habilitados para producción.
5. El trabajador selecciona el producto que desea elaborar.
6. El sistema obtiene automáticamente la receta asociada al producto.
7. El sistema muestra las materias primas y cantidades necesarias según la receta.
8. El trabajador ingresa la cantidad que desea producir.
9. El sistema calcula las cantidades estimadas de materias primas necesarias.
10. El sistema consulta el stock disponible de cada materia prima.
11. El sistema informa si existe stock suficiente para realizar la producción.
12. El trabajador puede ajustar las cantidades realmente utilizadas de materia prima cuando sea necesario.
13. El sistema vuelve a verificar el stock disponible utilizando las cantidades reales ingresadas.
14. El trabajador registra la cantidad final efectivamente producida.
15. El trabajador registra la fecha de producción.
16. El trabajador indica la condición de conservación inicial del producto.
17. El sistema calcula una fecha estimada de vencimiento según la información registrada.
18. El trabajador puede agregar una observación sobre la producción.
19. El sistema identifica automáticamente al usuario que realiza la operación.
20. El sistema calcula el costo de las materias primas utilizadas.
21. El sistema calcula el costo total de producción.
22. El sistema calcula el costo estimado por unidad utilizando la cantidad efectivamente producida.
23. El sistema muestra un resumen de la operación.
24. El trabajador revisa la información ingresada.
25. El trabajador confirma la producción.
26. El sistema genera un identificador único para la operación.
27. El sistema descuenta del stock las materias primas utilizadas.
28. El sistema registra los movimientos de stock correspondientes.
29. El sistema registra la producción en la base de datos.
30. El sistema genera un nuevo lote de producto terminado.
31. El sistema asocia al lote:
    - producto;
    - cantidad producida;
    - fecha de producción;
    - condición de conservación;
    - fecha estimada de vencimiento;
    - costo de producción.
32. El sistema incorpora la cantidad producida al stock de productos terminados.
33. El sistema conserva la relación entre la producción, las materias primas utilizadas y el lote generado.
34. El sistema informa que la producción fue registrada correctamente.

## Gestión de la fecha estimada de vencimiento

La fecha de vencimiento no deberá considerarse necesariamente definitiva.

El sistema deberá permitir modificar la fecha estimada de vencimiento cuando cambie la condición de conservación del producto.

Por ejemplo, un producto podrá:

- mantenerse refrigerado;
- congelarse;
- descongelarse posteriormente.

Estos cambios podrán modificar su tiempo estimado de conservación.

El sistema deberá conservar el historial de:

- condición de conservación;
- fecha en que se modificó;
- nueva fecha estimada de vencimiento;
- usuario que realizó la modificación.

## Flujos alternativos

### A1 — Stock insuficiente de materia prima

1. El sistema calcula las cantidades necesarias según la receta y la cantidad a producir.
2. El sistema detecta que una o más materias primas no poseen stock suficiente.
3. El sistema informa:
   - qué materia prima presenta faltante;
   - cuánto stock se encuentra disponible;
   - cuánto stock sería necesario.
4. El trabajador puede:
   - cancelar la producción;
   - registrar o esperar una reposición de materia prima;
   - reducir la cantidad a producir.
5. Si el trabajador reduce la cantidad a producir, el sistema recalcula automáticamente las materias primas necesarias.
6. El sistema vuelve a verificar el stock disponible.
7. La producción solo puede confirmarse cuando exista stock suficiente.

### A2 — Producto no disponible para producción

1. El trabajador intenta registrar una producción.
2. El sistema muestra únicamente productos habilitados para producción.
3. Cada producto disponible debe encontrarse asociado a una receta válida.
4. Si el producto que se desea elaborar no existe, deberá registrarse previamente dentro del catálogo de productos producibles junto con su receta.
5. Una vez registrado y habilitado, podrá seleccionarse para iniciar la producción.

### A3 — Cantidad real de materia prima diferente a la receta

1. El sistema muestra las cantidades calculadas según la receta.
2. Durante la producción, el trabajador utiliza una cantidad diferente de una o más materias primas.
3. El trabajador registra las cantidades realmente utilizadas.
4. El sistema actualiza el consumo de materias primas.
5. El sistema vuelve a verificar la disponibilidad de stock.
6. El sistema recalcula el costo de producción utilizando las cantidades reales.
7. La producción continúa si existe stock suficiente.

### A4 — Cantidad producida diferente a la esperada

1. La receta establece una cantidad estimada de producto terminado.
2. El trabajador obtiene una cantidad diferente de la prevista.
3. El trabajador registra la cantidad efectivamente producida.
4. El sistema utiliza la cantidad real para calcular el costo unitario.
5. El lote se genera utilizando la cantidad efectivamente obtenida.
6. El sistema conserva la diferencia entre la cantidad estimada y la cantidad real producida.

### A5 — Cambio en la condición de conservación

1. Un producto perteneciente a un lote cambia su condición de conservación.
2. El trabajador registra el cambio en el sistema.
3. El sistema conserva la condición anterior.
4. El trabajador registra o confirma la nueva condición de conservación.
5. El sistema permite actualizar la fecha estimada de vencimiento.
6. El sistema registra:
   - fecha y hora del cambio;
   - condición anterior;
   - nueva condición;
   - fecha estimada de vencimiento anterior;
   - nueva fecha estimada de vencimiento;
   - usuario responsable.
7. El lote conserva el historial completo de modificaciones.

### A6 — Error detectado después de registrar la producción

1. El trabajador detecta un error en una producción previamente registrada.
2. El sistema permite iniciar una corrección de la producción.
3. El sistema no elimina directamente la operación original.
4. Antes de aplicar la corrección, el sistema verifica:
   - materias primas descontadas;
   - producto terminado generado;
   - lote asociado;
   - movimientos posteriores relacionados.
5. Si la operación puede revertirse sin generar inconsistencias:
   - se revierten los movimientos de materia prima;
   - se revierte el stock de producto generado;
   - el lote anterior queda anulado o corregido;
   - la producción original queda marcada como anulada o corregida;
   - se registra nuevamente la producción con los datos correctos.
6. La producción original permanece almacenada para conservar la trazabilidad.
7. La nueva operación queda vinculada al registro anterior.

### A7 — La producción no puede revertirse automáticamente

1. El sistema detecta que parte del producto generado ya fue vendido, reservado, trasladado o utilizado.
2. El sistema no realiza una reversión automática si esta puede generar inconsistencias.
3. La producción queda marcada para revisión.
4. El trabajador realiza un control manual del inventario.
5. Se registran los ajustes necesarios de:
   - materias primas;
   - productos terminados;
   - lotes.
6. Cada ajuste debe incluir una observación.
7. Los ajustes quedan vinculados a la producción original para conservar la trazabilidad.

### A8 — Datos obligatorios incompletos

1. El trabajador intenta confirmar la producción.
2. El sistema detecta uno o más campos obligatorios incompletos o inválidos.
3. El sistema informa cuáles deben completarse o corregirse.
4. La operación no se confirma.
5. El trabajador completa o corrige la información.
6. El sistema vuelve a validar los datos antes de permitir la confirmación.

## Postcondiciones

### Producción registrada correctamente

- La producción queda almacenada en la base de datos.
- La operación posee un identificador único.
- El usuario responsable queda identificado automáticamente.
- Las materias primas utilizadas son descontadas del stock.
- Los movimientos de inventario quedan registrados.
- El costo histórico de la producción queda conservado.
- Se genera un lote de producto terminado.
- El lote queda asociado a la producción.
- El lote conserva su condición de conservación y fecha estimada de vencimiento.
- El stock de producto terminado aumenta.
- La información queda disponible para consultas posteriores de costos, stock, lotes y trazabilidad.

### Producción corregida

- La producción original permanece almacenada.
- El registro original queda identificado como anulado o corregido.
- Los movimientos de stock revertidos quedan registrados.
- La nueva producción queda asociada a la operación anterior.
- El inventario refleja las cantidades corregidas.

## Reglas de negocio relacionadas

- Solo podrán producirse productos registrados y habilitados en el catálogo de producción.
- Cada producto producible deberá estar asociado a una receta válida.
- Una producción solo podrá confirmarse si existe stock suficiente de las materias primas necesarias.
- Las cantidades reales utilizadas podrán diferir de las cantidades estimadas por la receta.
- El costo final deberá calcularse utilizando las cantidades realmente consumidas.
- La cantidad realmente producida será utilizada para calcular el costo unitario.
- El descuento de materias primas y el registro de la producción deberán realizarse de forma consistente.
- Una producción confirmada no deberá descontar materias primas más de una vez.
- Cada producción deberá generar un lote identificable.
- La fecha de vencimiento deberá considerarse estimativa cuando pueda variar según la conservación.
- Los cambios de conservación y vencimiento deberán conservar historial.
- Una producción registrada no deberá eliminarse físicamente de la base de datos.
- Las correcciones deberán conservar la trazabilidad de la operación original.
- Los ajustes de inventario deberán quedar registrados.
- Una corrección automática no deberá generar stock negativo.

## Automatización futura

En una versión posterior, el sistema podrá asistir al trabajador en la planificación de producción.

A partir del stock disponible, las recetas, el historial de ventas y los productos próximos a agotarse, el sistema podrá sugerir:

- productos a elaborar;
- cantidades recomendadas;
- materias primas necesarias;
- faltantes de insumos;
- costo estimado de producción;
- posibles necesidades de reposición.

La decisión final de producir y la confirmación de la operación deberán permanecer a cargo del trabajador.

## Diagramas

### Diagrama 1 — Registro normal de producción

Se representará el flujo desde la selección del producto hasta el descuento de materias primas, generación del lote y actualización del stock de producto terminado.

### Diagrama 2 — Corrección de una producción registrada

Se representará la corrección de una producción previamente confirmada, incluyendo reversión de stock cuando sea posible y revisión manual cuando existan movimientos posteriores.
