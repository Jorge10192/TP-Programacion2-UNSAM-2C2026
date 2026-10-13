# CU-01 — Registrar compra de insumos

## Actor principal

Trabajador de WALOS.

---

## Objetivo

Registrar en WALOS una compra de bienes físicos realizada fuera del sistema, conservar la información histórica de la operación y generar la correspondiente entrada de Inventario al confirmar la compra.

La compra y el pago ocurren fuera de WALOS.

WALOS no compra productos ni realiza pagos al proveedor. Su función es registrar una operación que ya ocurrió y utilizar esa información para mantener historial de compras, costos, trazabilidad e Inventario.

---

## Alcance

Este caso de uso cubre el registro de compras de bienes físicos utilizados por WALOS.

Ejemplos:

- materias primas;
- packaging;
- elementos de limpieza;
- insumos utilizados en la operación del negocio.

No incluye:

- alquileres;
- impuestos;
- servicios;
- seguros;
- otros egresos sin existencia física.

Estos conceptos corresponden al módulo de Gastos.

---

## Precondiciones

- El trabajador debe haber iniciado sesión en WALOS.
- El sistema debe encontrarse disponible.
- Debe existir un catálogo de insumos.
- Los insumos seleccionados deben encontrarse registrados y activos.
- Deben existir unidades de medida válidas para expresar las cantidades compradas.
- El usuario autenticado debe tener permisos para registrar compras.

El proveedor podrá encontrarse registrado previamente, pero no es obligatorio para confirmar una compra.

La presentación comercial también será opcional.

---

## Disparador

Un trabajador de WALOS realiza una compra fuera del sistema y desea registrarla.

---

## Datos de la operación

### Datos de la compra

La compra deberá registrar:

- fecha de compra;
- estado de la compra;
- estado de consistencia;
- usuario creador, identificado automáticamente;
- proveedor, cuando corresponda;
- observaciones opcionales;
- fecha y hora de creación;
- fecha y hora de última modificación;
- fecha y hora de confirmación, cuando corresponda.

### Datos de cada ítem

Cada ítem deberá registrar como mínimo:

- insumo;
- cantidad;
- unidad de compra;
- precio total pagado.

Cuando corresponda también podrá registrar:

- presentación utilizada como plantilla;
- contenido por unidad;
- unidad del contenido.

El sistema calculará la cantidad incorporada a Inventario y los valores económicos derivados cuando sea posible.

### Datos opcionales

La compra podrá incluir:

- proveedor;
- uno o más comprobantes;
- observaciones.

---

## Reglas generales

- Una compra confirmada deberá contener al menos un ítem.
- El proveedor es opcional.
- Una compra podrá tener como máximo un proveedor.
- Si se adquirieron productos en distintos proveedores y se desea conservar analítica correcta por proveedor, deberán registrarse compras separadas.
- La presentación de insumo es opcional.
- Un ítem puede registrarse directamente a partir de un insumo.
- El precio principal ingresado por el usuario será el importe realmente pagado por cada ítem.
- El total de la compra se calculará como la suma de los precios de sus ítems.
- El usuario creador se obtiene automáticamente de la sesión.
- Los comprobantes son opcionales.
- Una compra en borrador no modifica Inventario.
- Confirmar una compra genera automáticamente la entrada correspondiente en Inventario.
- Las compras confirmadas deberán conservar trazabilidad de sus modificaciones posteriores.
- Las compras anuladas no se eliminan físicamente.

---

## Estado inicial

Al iniciar una nueva compra, el sistema crea o prepara una operación con estado:

```text
BORRADOR
```

y estado de consistencia:

```text
CONSISTENTE
```

La fecha de compra se propone inicialmente como la fecha actual, pero puede ser modificada por el trabajador.

El usuario creador se obtiene automáticamente de la sesión autenticada.

---

## Flujo principal

1. El trabajador accede a WALOS desde un celular o computadora.
2. Selecciona la opción **Registrar compra**.
3. El sistema inicia una nueva compra en estado `BORRADOR`.
4. El sistema asigna automáticamente al usuario autenticado como creador de la compra.
5. El sistema propone la fecha actual como fecha de compra.
6. El trabajador puede modificar la fecha si está registrando una compra realizada anteriormente.
7. El trabajador puede seleccionar un proveedor existente.
8. Si no desea o no puede identificar al proveedor, continúa sin proveedor.
9. El trabajador selecciona un insumo activo del catálogo.
10. Si corresponde, puede seleccionar una presentación habitual del insumo.
11. Si utiliza una presentación, el sistema precarga los datos disponibles, como unidad de compra y contenido por unidad.
12. El trabajador puede modificar los valores de la compra actual sin alterar necesariamente la presentación guardada.
13. El trabajador ingresa la cantidad comprada.
14. Indica o confirma la unidad de compra.
15. Cuando corresponda, ingresa o confirma el contenido por unidad y la unidad de contenido.
16. Ingresa el importe total realmente pagado por ese ítem.
17. El sistema calcula, cuando corresponda:
    - cantidad incorporada;
    - precio por unidad de compra;
    - precio normalizado.
18. El trabajador puede agregar más ítems a la misma compra.
19. El sistema calcula el total general de la compra como la suma de los importes de todos los ítems.
20. El trabajador puede adjuntar uno o más comprobantes en formato admitido.
21. El trabajador puede agregar observaciones.
22. Mientras la compra se encuentre en borrador, el sistema conserva la información cargada para permitir recuperarla posteriormente.
23. El trabajador selecciona **Confirmar compra**.
24. El sistema valida que exista al menos un ítem.
25. El sistema valida que cada ítem tenga un insumo válido.
26. El sistema valida que las cantidades y precios sean válidos.
27. El sistema valida que las unidades utilizadas permitan determinar correctamente la cantidad incorporada.
28. Si la validación es correcta, el sistema cambia la compra a estado `CONFIRMADA`.
29. El sistema registra la fecha y hora de confirmación.
30. El sistema genera las entradas correspondientes en Inventario.
31. El sistema registra la actividad de confirmación en el historial de la compra.
32. El sistema informa que la compra fue registrada correctamente.

---

## Flujos alternativos

### A1 — Insumo no registrado

1. El trabajador intenta registrar un producto que no se encuentra disponible en el catálogo.
2. El sistema no permite utilizar un texto libre como reemplazo de un insumo inexistente.
3. El trabajador puede registrar un nuevo insumo.
4. Una vez creado y activo, el nuevo insumo queda disponible para la compra.
5. El trabajador continúa con la carga.

---

### A2 — Proveedor no registrado

1. El trabajador desea asociar un proveedor que todavía no existe.
2. El sistema permite registrar un nuevo proveedor.
3. El trabajador completa los datos necesarios.
4. El proveedor queda disponible para ser seleccionado.
5. El trabajador continúa con la compra.

También puede decidir continuar sin proveedor.

---

### A3 — Compra sin proveedor

1. El trabajador no selecciona ningún proveedor.
2. El sistema permite continuar.
3. La compra puede confirmarse normalmente.
4. La operación seguirá formando parte de:
   - Inventario;
   - costos;
   - historial de precios;
   - análisis generales.
5. La compra no podrá atribuirse a un proveedor específico en análisis posteriores.

---

### A4 — Compra realizada en más de un proveedor

1. El trabajador compró productos en dos o más proveedores.
2. Si desea conservar correctamente la información por proveedor, deberá registrar una compra independiente por cada proveedor.
3. Cada compra tendrá como máximo un proveedor.
4. El sistema no dividirá internamente una compra entre múltiples proveedores durante el MVP.

---

### A5 — Compra sin presentación registrada

1. El trabajador selecciona un insumo.
2. No selecciona una `PresentacionInsumo`.
3. Ingresa manualmente la cantidad, unidad de compra, contenido cuando corresponda y precio total.
4. El sistema valida los datos.
5. El ítem puede incorporarse normalmente a la compra.

Ejemplo:

```text
Insumo: Pollo
Cantidad: 3,75
Unidad de compra: kg
Precio total: $18.000
```

---

### A6 — Modificación puntual de una presentación

1. El trabajador selecciona una presentación habitual.
2. El sistema precarga sus valores.
3. El trabajador detecta que esa compra concreta tiene un contenido diferente.
4. Modifica los valores del ítem actual.
5. El sistema utiliza esos valores para la compra.
6. La presentación registrada no se modifica automáticamente.

Si el trabajador desea cambiar la plantilla para futuras compras, podrá hacerlo mediante la gestión correspondiente.

---

### A7 — Datos obligatorios incompletos

1. El trabajador intenta confirmar la compra.
2. El sistema detecta datos faltantes o inválidos.
3. El sistema informa claramente qué información debe corregirse.
4. La compra permanece en estado `BORRADOR`.
5. El trabajador corrige los datos.
6. El sistema vuelve a validar la operación.

---

### A8 — Comprobante no disponible

1. El trabajador no dispone de comprobante.
2. El sistema permite continuar sin adjuntarlo.
3. La compra puede confirmarse normalmente.
4. La falta de comprobante no modifica los demás datos de la operación.

No es necesario utilizar un estado especial de “comprobante pendiente” para el MVP.

---

### A9 — Ticket con productos personales

1. El comprobante incluye productos de WALOS y productos personales.
2. El trabajador registra únicamente los ítems correspondientes a WALOS.
3. El sistema calcula el total de la compra utilizando únicamente esos ítems.
4. El importe total impreso en el ticket no determina el total registrado en WALOS.
5. El comprobante puede conservarse únicamente como respaldo documental.

Ejemplo:

```text
Total ticket: $40.000
Productos WALOS: $32.000
Productos personales: $8.000

Total registrado en WALOS: $32.000
```

---

### A10 — Recuperación de borrador

1. El trabajador inicia una compra y carga información.
2. Cierra la aplicación, pierde conexión o abandona accidentalmente el formulario.
3. La compra permanece almacenada como `BORRADOR`.
4. Al volver a utilizar el módulo, el sistema informa que existe una compra sin terminar.
5. El trabajador puede:
   - continuar la carga;
   - descartar el borrador.
6. Mientras permanezca en borrador, la compra no modifica Inventario.

---

### A11 — Borrador antiguo

1. El sistema detecta que un borrador lleva más de 24 horas sin actividad.
2. El sistema muestra una advertencia.
3. El borrador no se elimina automáticamente.
4. El trabajador decide si desea continuarlo o descartarlo.

---

### A12 — Error detectado luego de confirmar la compra

1. El trabajador consulta una compra confirmada.
2. Detecta un error.
3. Selecciona la opción **Editar**.
4. El sistema permite modificar los datos habilitados según los permisos del usuario.
5. El sistema analiza las consecuencias de la modificación.
6. Si la modificación puede aplicarse manteniendo consistencia, actualiza la información relacionada y ajusta Inventario automáticamente cuando corresponda.
7. El sistema registra una actividad de tipo `EDICION`.
8. El historial conserva los datos anteriores y nuevos cuando corresponda.

El usuario no deberá seleccionar manualmente si se trata de una corrección segura, una reversión o un ajuste técnico.

---

### A13 — Corrección que genera inconsistencia

1. El trabajador modifica una compra confirmada.
2. El sistema detecta que la modificación entra en conflicto con operaciones posteriores.

Ejemplo:

```text
Compra original:
15 kg

Cantidad ya consumida:
10 kg

Cantidad corregida:
5 kg
```

3. El sistema determina que no puede mantener automáticamente una historia completamente consistente.
4. Según los permisos y reglas vigentes, permite registrar la corrección.
5. La compra queda marcada con:

```text
estadoConsistencia = REQUIERE_REVISION
```

6. El sistema informa qué módulos pueden estar afectados.
7. Se registra la modificación en el historial.
8. La operación queda disponible para revisión posterior.

El sistema no deberá perder la información histórica ni bloquear necesariamente toda la operación del negocio.

---

### A14 — Anulación de una compra

1. El trabajador consulta una compra confirmada.
2. Selecciona la opción **Anular**.
3. El sistema solicita confirmación.
4. El sistema analiza las consecuencias sobre Inventario.
5. Cuando sea posible, genera los ajustes correspondientes.
6. Si no puede resolverlos completamente, la operación podrá quedar marcada como `REQUIERE_REVISION`.
7. La compra cambia a estado `ANULADA`.
8. La compra permanece almacenada.
9. El sistema registra una actividad de tipo `ANULACION`.
10. La compra anulada no podrá volver a generar una entrada de Inventario.

---

### A15 — Comprobante incorrecto en borrador

1. El trabajador adjunta un comprobante incorrecto.
2. Mientras la compra siga en estado `BORRADOR`, puede eliminarlo o reemplazarlo.
3. El sistema actualiza los archivos asociados.
4. El trabajador continúa con la compra.

---

### A16 — Modificación de comprobante luego de confirmar

1. El trabajador necesita modificar los comprobantes de una compra confirmada.
2. El sistema aplica las reglas y permisos correspondientes.
3. La modificación queda registrada en el historial de actividad.
4. Para el MVP no es obligatorio conservar físicamente todas las versiones anteriores de un archivo eliminado.

---

## Borradores

Los borradores forman parte del flujo normal de registro.

Un borrador:

- pertenece al usuario que lo creó;
- no modifica Inventario;
- puede recuperarse;
- puede descartarse;
- conserva la última fecha de modificación;
- no se elimina automáticamente por antigüedad.

En condiciones normales, un trabajador no deberá editar o confirmar el borrador de otro usuario.

La interfaz podrá priorizar inicialmente un único borrador activo por usuario para simplificar la experiencia, sin convertir esta limitación en una regla rígida permanente del dominio.

---

## Presentaciones

`PresentacionInsumo` funciona como una plantilla reutilizable y opcional.

Ejemplos:

```text
Harina
Bolsa 5 kg
```

```text
Bolsas packaging
Pack x100
```

Seleccionar una presentación podrá precargar valores frecuentes.

Sin embargo, los valores definitivos de una compra deberán quedar almacenados en `ItemCompra`.

Por este motivo, modificar una presentación en el futuro no deberá cambiar operaciones históricas.

---

## Unidades y conversiones

El sistema podrá realizar conversiones automáticas únicamente entre unidades compatibles.

Ejemplos válidos:

```text
1 kg = 1000 g
1 L = 1000 ml
```

Ejemplos no válidos:

```text
kg -> L
```

Las unidades comerciales como paquete, bolsa o caja no tendrán necesariamente una conversión global.

La equivalencia dependerá del contenido registrado para el producto.

Ejemplo:

```text
5 paquetes
300 unidades por paquete

Cantidad incorporada:
1500 unidades
```

---

## Precio de compra

El trabajador registra el importe realmente pagado por cada ítem.

Ejemplo:

```text
Producto: Harina
Cantidad: 2 bolsas de 5 kg
Precio total: $12.000
```

El sistema podrá calcular:

```text
Precio por bolsa: $6.000
Precio normalizado: $1.200 / kg
```

No será necesario que el usuario calcule estos valores manualmente.

---

## Descuentos

El MVP no requiere un motor específico de descuentos dentro del módulo de Compras.

Si un descuento ya fue aplicado por el proveedor, el trabajador registra el importe efectivamente pagado.

Ejemplo:

```text
Precio original: $15.000
Precio pagado: $12.000
```

El valor registrado será:

```text
precioTotal = $12.000
```

---

## Comprobantes

Los comprobantes son opcionales.

Una compra podrá tener ninguno, uno o varios comprobantes.

Podrán utilizarse, por ejemplo:

- imágenes;
- tickets;
- facturas;
- archivos PDF.

Los comprobantes funcionan como respaldo documental.

Su importe impreso no determina automáticamente el valor de la compra almacenada por WALOS.

---

## Integración con Inventario

La confirmación de la compra genera automáticamente la entrada de los insumos correspondientes en Inventario.

Para el MVP no existe un paso separado de recepción.

Por lo tanto:

```text
BORRADOR
-> no modifica Inventario

CONFIRMADA
-> genera entrada de Inventario

ANULADA
-> debe reflejar las consecuencias correspondientes sin borrar el historial
```

La integración técnica concreta con Inventario deberá resolverse en la arquitectura y servicios de la aplicación.

---

## Trazabilidad

Cada compra deberá conservar un historial cronológico de las acciones relevantes.

Ejemplo:

```text
10:32 - Jorge creó la compra
10:40 - Jorge confirmó la compra
11:15 - Jorge editó la cantidad
```

Las actividades principales serán:

```text
CREACION
EDICION
CONFIRMACION
ANULACION
```

Cada actividad deberá asociarse a:

- compra;
- usuario;
- fecha y hora;
- tipo de actividad;
- descripción;
- datos anteriores y nuevos cuando corresponda.

---

## Postcondiciones

### Compra en borrador

- La compra permanece almacenada con estado `BORRADOR`.
- No modifica Inventario.
- Puede ser recuperada posteriormente.
- El usuario creador queda asociado a la operación.

### Compra confirmada

- La compra queda almacenada con estado `CONFIRMADA`.
- Contiene al menos un ítem válido.
- El usuario creador queda identificado.
- El proveedor queda asociado cuando fue informado.
- Los comprobantes quedan asociados cuando fueron cargados.
- El total queda determinado a partir de los ítems.
- Los valores históricos de cada `ItemCompra` quedan conservados.
- Se generan las entradas correspondientes en Inventario.
- Se registra la actividad de confirmación.
- El estado de consistencia será normalmente `CONSISTENTE`.

### Compra editada

- La compra conserva el mismo registro.
- Las modificaciones quedan reflejadas en el historial.
- Inventario se ajusta automáticamente cuando sea posible.
- Si existe una inconsistencia no resoluble automáticamente, la compra puede quedar en `REQUIERE_REVISION`.

### Compra anulada

- La compra permanece almacenada.
- Su estado pasa a `ANULADA`.
- El historial se conserva.
- Se registran las consecuencias sobre Inventario.
- La operación anulada no puede volver a generar una entrada de stock.

---

## Reglas de negocio relacionadas

- Una compra representa una adquisición que ocurrió fuera de WALOS.
- Una compra confirmada deberá contener al menos un ítem.
- Una compra podrá tener como máximo un proveedor.
- El proveedor será opcional.
- La presentación será opcional.
- Todo ítem deberá estar asociado a un insumo existente.
- El sistema deberá conservar los valores históricos reales de cada ítem.
- Los cambios posteriores de una presentación no deberán modificar compras anteriores.
- El total de Compra será derivado de los precios de sus ítems.
- Los comprobantes serán opcionales.
- Una compra en borrador no deberá modificar Inventario.
- Una compra confirmada deberá generar la entrada correspondiente en Inventario una sola vez.
- Una compra no deberá eliminarse físicamente una vez confirmada.
- Una compra anulada deberá permanecer disponible para consulta histórica.
- Las modificaciones deberán conservar trazabilidad.
- Las acciones relevantes deberán registrar usuario, fecha y hora.
- Una inconsistencia podrá marcarse como `REQUIERE_REVISION`.
- Las correcciones no deberán borrar la historia anterior de la operación.

---

## Entidades principales relacionadas

Este caso de uso se relaciona principalmente con:

```text
Compra
ItemCompra
Insumo
PresentacionInsumo
Proveedor
Comprobante
UnidadMedida
RegistroActividadCompra
Usuario
```

Y con las enumeraciones:

```text
EstadoCompra
EstadoConsistencia
TipoActividadCompra
TipoControlStock
MagnitudUnidad
```

---

## Resultado esperado

El trabajador deberá poder registrar una compra mediante un flujo simple:

```text
Elegir insumo
        ↓
Indicar cantidad y unidad
        ↓
Ingresar precio pagado
        ↓
Proveedor opcional
        ↓
Comprobante opcional
        ↓
Revisar
        ↓
Confirmar
        ↓
Actualizar Inventario
        ↓
Registrar historial
```

El sistema deberá ocultar al usuario la complejidad técnica de conversiones, ajustes, persistencia, auditoría e integración con Inventario siempre que sea posible.
