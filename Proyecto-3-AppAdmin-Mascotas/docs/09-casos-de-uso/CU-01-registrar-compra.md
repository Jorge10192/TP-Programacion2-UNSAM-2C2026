# CU-01 — Registrar compra de materia prima

## Actor principal

Trabajador de WALOS.

## Objetivo

Registrar en el sistema una compra de materia prima realizada externamente, conservar la información de la operación y su comprobante, actualizar el historial de costos y habilitar la materia prima recibida como stock disponible para producción.

## Aclaración

La compra y el pago se realizan fuera de la aplicación.

El sistema WALOS no ejecuta la compra ni realiza el pago al proveedor. Su función es registrar una compra ya realizada y utilizar esa información para actualizar inventario, costos e historial de compras.

## Precondiciones

- El trabajador debe haber iniciado sesión en la plataforma.
- El sistema debe poder utilizarse desde celular o computadora.
- Debe existir un catálogo de materias primas utilizadas por WALOS.
- La materia prima debe estar registrada y habilitada en dicho catálogo para poder seleccionarse.
- Los proveedores o lugares habituales de compra podrán encontrarse registrados previamente en el sistema.
- El sistema debe encontrarse disponible para registrar la operación.

## Disparador

Un trabajador de WALOS realiza una compra de materia prima fuera del sistema y desea registrar la operación.

## Datos de la operación

Cada compra deberá registrar como mínimo:

- materia prima, seleccionada desde el catálogo de materias primas habilitadas;
- cantidad comprada;
- unidad de medida correspondiente;
- precio de compra;
- fecha de la operación;
- proveedor o lugar de compra;
- usuario que registra la operación, identificado automáticamente por el sistema.

El sistema permitirá además registrar:

- comprobante de pago en formato PDF o imagen;
- observación o nota de texto asociada a la operación.

El sistema deberá distinguir entre campos obligatorios y opcionales antes de permitir confirmar la operación.

## Flujo principal

1. El trabajador accede a la plataforma desde un celular o computadora.
2. Selecciona la opción **Registrar compra de materia prima**.
3. El sistema muestra el formulario de registro de compra.
4. El trabajador selecciona la materia prima comprada dentro del catálogo de materias primas habilitadas.
5. El trabajador selecciona el proveedor o lugar de compra correspondiente.
6. Si el proveedor no se encuentra registrado, el trabajador puede registrar uno nuevo y continuar con la operación.
7. El trabajador ingresa la cantidad adquirida utilizando la unidad de medida correspondiente.
8. Ingresa el precio pagado.
9. Registra la fecha de la compra.
10. Adjunta el comprobante de pago en formato PDF o imagen, cuando se encuentre disponible.
11. Puede agregar una observación o nota de texto asociada a la operación.
12. El sistema identifica automáticamente al usuario que está realizando el registro.
13. El sistema valida que todos los campos obligatorios estén completos.
14. El sistema verifica si la operación podría estar duplicada comparando el comprobante y otros datos relevantes.
15. Si no se detectan conflictos, el sistema muestra un resumen de la operación.
16. El trabajador revisa la información ingresada.
17. El trabajador confirma el registro.
18. El sistema genera un identificador único para la operación.
19. El sistema registra la compra en la base de datos asociándola al identificador generado.
20. El sistema conserva el comprobante y las observaciones asociadas a la operación.
21. El sistema actualiza el historial de precios y costos de la materia prima.
22. Si la mercadería fue recibida, el sistema aumenta el stock disponible de la materia prima.
23. La materia prima recibida queda habilitada para ser utilizada en futuras producciones.
24. El sistema informa que la operación fue registrada correctamente.

## Flujos alternativos

### A1 — Materia prima no registrada

1. El trabajador intenta seleccionar una materia prima que no se encuentra disponible en el catálogo.
2. El sistema no permite seleccionarla como parte de la compra.
3. El trabajador puede acceder al registro de una nueva materia prima.
4. Una vez registrada y habilitada, puede volver al registro de la compra.
5. El proceso continúa desde la selección de materia prima.

### A2 — Datos obligatorios incompletos

1. El trabajador intenta confirmar la operación.
2. El sistema detecta uno o más campos obligatorios incompletos o inválidos.
3. El sistema informa cuáles deben completarse o corregirse.
4. La operación no se confirma.
5. El trabajador completa o corrige la información.
6. El sistema vuelve a validar los datos antes de permitir la confirmación.

### A3 — Comprobante no disponible

1. El trabajador no dispone del comprobante al momento de registrar la compra.
2. Si el comprobante está definido como campo opcional, el sistema permite continuar.
3. La operación queda identificada como **comprobante pendiente**.
4. El comprobante podrá adjuntarse posteriormente.
5. La falta del comprobante no modifica el resto de la información registrada.

### A4 — Mercadería todavía no recibida

1. La compra fue realizada, pero la materia prima todavía no fue recibida.
2. El trabajador registra la operación indicando que se encuentra **pendiente de recepción**.
3. La compra queda almacenada en la base de datos.
4. El stock disponible para producción no se modifica.
5. Cuando la mercadería es recibida, el trabajador confirma su recepción.
6. El sistema registra la recepción.
7. El sistema aumenta el stock disponible correspondiente.
8. La materia prima queda habilitada para producción.

### A5 — Error detectado después de registrar la operación

1. El trabajador detecta un error en una operación previamente confirmada.
2. El sistema no elimina el registro original.
3. Si la materia prima asociada todavía no fue utilizada en producción ni comprometida en otra operación, el sistema permite anular el registro.
4. El sistema genera un movimiento de ajuste que revierte el stock incorporado por la operación cuando corresponda.
5. La operación original queda registrada con estado **anulada**.
6. El comprobante asociado permanece archivado junto con la operación anulada.
7. El trabajador registra una nueva operación con la información corregida.
8. La nueva operación queda vinculada al identificador de la operación anulada.
9. El sistema permite agregar una observación indicando el motivo de la corrección.
10. Se conserva el historial completo de ambas operaciones.

### A6 — La materia prima ya fue utilizada

1. El trabajador detecta un error en una compra previamente registrada.
2. El sistema detecta que parte o la totalidad de la materia prima ya fue utilizada en producción u otra operación.
3. El sistema no realiza una reversión automática si esto puede generar inconsistencias o stock negativo.
4. La operación queda marcada para revisión.
5. El trabajador realiza un control manual del inventario.
6. Se registra un ajuste de stock por la diferencia encontrada.
7. El ajuste debe incluir una observación explicando el motivo.
8. La operación original y el ajuste quedan vinculados para conservar la trazabilidad.

### A7 — Posible registro duplicado antes de confirmar

1. El trabajador carga una compra y adjunta el comprobante correspondiente.
2. Antes de confirmar la operación, el sistema verifica si existe una compra potencialmente duplicada.
3. El sistema puede comparar:
   - comprobante adjunto;
   - proveedor o lugar de compra;
   - fecha de compra;
   - importe;
   - materia prima;
   - cantidad.
4. Si el sistema detecta una posible coincidencia, informa al trabajador que podría tratarse de una compra ya registrada.
5. El sistema muestra la operación potencialmente duplicada para su revisión.
6. El trabajador puede:
   - cancelar la nueva carga si confirma que se trata de la misma compra;
   - continuar con el registro si verifica que se trata de una compra diferente.
7. Si el trabajador continúa, el sistema conserva constancia de que existió una advertencia de posible duplicado.

### A8 — Registro duplicado detectado después de su confirmación

1. El trabajador detecta que una misma compra fue registrada más de una vez.
2. El sistema permite consultar los registros relacionados y sus comprobantes.
3. El trabajador selecciona el registro duplicado que debe anularse.
4. El sistema verifica si la materia prima incorporada por dicho registro continúa disponible en stock.
5. Si la cantidad correspondiente todavía se encuentra disponible:
   - el sistema genera un movimiento de ajuste que descuenta del stock la cantidad incorporada por el registro duplicado;
   - el registro duplicado cambia al estado **anulado por duplicación**;
   - el comprobante queda archivado y asociado al registro anulado;
   - el registro anulado no podrá volver a utilizarse para aumentar stock.
6. El trabajador debe indicar el motivo de la anulación.
7. El sistema conserva:
   - el registro correcto;
   - el registro duplicado anulado;
   - el comprobante;
   - el movimiento de ajuste;
   - fecha y hora de la corrección;
   - usuario que realizó la corrección.

### A9 — Registro duplicado cuya materia prima ya fue utilizada

1. El sistema detecta que la materia prima incorporada por el registro duplicado ya fue utilizada total o parcialmente.
2. El sistema no realiza una reversión automática que pueda generar stock negativo.
3. El registro duplicado queda marcado para revisión.
4. El trabajador realiza un control manual del inventario.
5. Se registra un ajuste por la diferencia encontrada.
6. El registro duplicado queda con estado **anulado por duplicación** o **corregido**, según corresponda.
7. El ajuste queda vinculado al registro que originó el error.
8. El sistema conserva una observación explicando el motivo de la corrección.

## Prevención de duplicados

El sistema deberá intentar reducir la posibilidad de registrar una misma compra más de una vez.

Para ello podrá utilizar:

- identificación del comprobante;
- proveedor;
- fecha;
- importe;
- materia prima;
- cantidad.

Cuando sea posible, el sistema podrá generar una huella digital o hash del archivo adjunto para detectar que exactamente el mismo PDF o imagen ya fue utilizado anteriormente.

Una coincidencia exacta podrá generar una advertencia de alta confianza.

Las coincidencias basadas únicamente en datos similares deberán tratarse como **posibles duplicados** y requerir revisión del trabajador.

## Postcondiciones

### Compra registrada y mercadería recibida

- La compra queda almacenada en la base de datos.
- La operación posee un identificador único.
- El usuario que realizó el registro queda identificado automáticamente.
- El comprobante queda asociado a la operación cuando se encuentre disponible.
- Las observaciones quedan asociadas a la compra.
- El historial de precios y costos de la materia prima queda actualizado.
- El stock disponible aumenta según la cantidad recibida.
- La materia prima queda disponible para producción.

### Compra registrada y pendiente de recepción

- La compra queda almacenada.
- El historial de compra y precio queda registrado.
- El stock disponible no cambia.
- La operación permanece pendiente hasta que se confirme la recepción.

### Operación anulada

- La operación original permanece almacenada.
- Su estado indica que fue anulada y el motivo correspondiente.
- El comprobante permanece archivado.
- La anulación no elimina el historial de la operación.
- Si correspondía modificar stock, el ajuste queda registrado como una nueva operación.

## Reglas de negocio relacionadas

- Una compra registrada no deberá eliminarse físicamente de la base de datos.
- Las correcciones deberán conservar el historial de la operación original.
- Una operación anulada no deberá volver a modificar el stock.
- El sistema deberá evitar que un mismo registro aumente stock más de una vez.
- El stock no deberá quedar con valores negativos por una corrección automática.
- Los ajustes de inventario deberán quedar registrados.
- El comprobante de una operación anulada deberá conservarse como evidencia histórica.
- Una compra pendiente de recepción no deberá habilitar stock para producción.
- El usuario que carga, corrige o anula una operación deberá quedar registrado automáticamente.

## Automatización futura

En una versión posterior, el sistema podrá permitir registrar una compra a partir del comprobante de pago.

El trabajador podrá cargar una fotografía del ticket o un archivo PDF y el sistema intentará obtener automáticamente:

- proveedor o lugar de compra;
- fecha;
- materias primas;
- cantidades;
- precios unitarios;
- importe total.

La información detectada no deberá registrarse automáticamente como definitiva.

El sistema mostrará los datos identificados al trabajador, quien deberá revisarlos, corregirlos cuando sea necesario y confirmar la operación antes de modificar el stock o registrar definitivamente la compra.



