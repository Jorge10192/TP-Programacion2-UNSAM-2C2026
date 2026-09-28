# CU-06 — Crear pedido web

## Actor principal

Cliente.

## Actores secundarios

Trabajador WALOS.

## Objetivo

Permitir que un cliente prepare un pedido de forma estructurada desde el sitio web de WALOS.

La página web debe funcionar como:

- sitio institucional;
- catálogo de productos;
- espacio para promociones;
- canal de novedades;
- espacio para recetas o contenido relacionado;
- generador de pedidos y reservas.

El objetivo no es reemplazar las redes sociales ni los canales de comunicación habituales de WALOS.

La web debe complementar canales como Instagram y WhatsApp, permitiendo que el cliente arme un pedido completo y luego continúe la comunicación con WALOS mediante un medio de contacto válido.

El pedido generado desde la web no se considera una venta definitiva.

Al confirmarlo, se genera una reserva pendiente que posteriormente debe ser gestionada por un trabajador de WALOS.

---

## Rol del sitio web

El sitio web puede contener, entre otras secciones:

- inicio;
- información sobre WALOS;
- catálogo de productos;
- promociones;
- recetas;
- novedades;
- próximas ferias;
- información sobre cómo trabaja la empresa;
- puntos de retiro;
- generación de pedidos;
- contacto.

Las redes sociales, especialmente Instagram, pueden continuar utilizándose para:

- difusión;
- novedades;
- contenido visual;
- promociones;
- contacto con clientes.

El sitio web debe aportar principalmente una forma estructurada de consultar información y preparar pedidos.

---

## Precondiciones

- El sitio web debe encontrarse disponible.
- Deben existir productos habilitados para pedidos.
- Los productos deben tener precios vigentes.
- Deben existir promociones configuradas cuando corresponda.
- WALOS debe tener al menos un canal de contacto habilitado.
- Si se ofrece retiro, deben existir puntos de retiro habilitados.
- Si se ofrece envío, debe existir una forma de coordinarlo.

---

## Disparador

El cliente desea consultar productos y preparar un pedido para WALOS.

---

## Carrito de compras

El cliente puede utilizar un carrito para preparar el pedido.

Debe poder:

- consultar productos;
- agregar productos;
- modificar cantidades;
- quitar productos;
- visualizar precios;
- visualizar promociones aplicables;
- consultar el importe total.

Mientras el pedido permanezca únicamente en el carrito:

- no se genera una reserva;
- no se descuenta stock;
- no se asigna mercadería;
- no se genera una venta;
- no existe obligación comercial para WALOS.

---

## Datos del pedido

El cliente debe indicar:

- productos;
- cantidades;
- nombre;
- medio de contacto;
- modalidad de entrega.

El medio de contacto puede ser, por ejemplo:

- WhatsApp;
- Instagram;
- teléfono;
- otro canal habilitado.

Según la modalidad de entrega también pueden requerirse:

- punto de retiro;
- fecha;
- dirección;
- observaciones.

---

## Modalidades de entrega

El pedido puede contemplar:

- retiro en punto habilitado;
- envío.

---

## Pedido con retiro

Si el cliente selecciona retiro:

1. El sistema muestra los puntos habilitados.
2. El cliente selecciona uno.
3. Si corresponde, selecciona una fecha disponible.

Ejemplos:

- Local Comercial.
- Feria determinada.
- Otro punto habilitado por WALOS.

Una feria solamente debe poder seleccionarse si se encuentra habilitada como punto de retiro para esa fecha.

Ejemplo:

`Retiro: Feria Plaza San Martín — 15/10/2026`

---

## Pedido con envío

Si el cliente selecciona envío:

1. El sistema solicita la información básica necesaria.
2. El pedido queda sujeto a coordinación con WALOS.
3. Un trabajador puede comunicarse con el cliente.
4. Se terminan de definir:
   - dirección;
   - costo de envío;
   - horario;
   - condiciones especiales.

Para el MVP, la coordinación del envío puede realizarse manualmente.

La asignación automática de transporte según zona geográfica queda fuera del alcance inicial.

---

## Cálculo del pedido

Antes de confirmar el pedido, el sistema debe calcular:

- subtotal sin descuentos;
- promociones aplicables;
- descuentos;
- costo de envío, si estuviera definido;
- importe final;
- seña requerida.

El cliente debe visualizar claramente:

- precio original;
- promociones aplicadas;
- descuento total;
- importe final;
- seña requerida.

Las promociones se evalúan según lo definido en:

`CU-05 — Configurar promoción`.

---

## Seña requerida

Para que la reserva pueda ser aceptada, debe existir una seña.

La seña tiene como finalidad reducir el riesgo económico para WALOS ante pedidos que requieran preparación o producción.

WALOS debe poder definir el criterio utilizado para calcular el importe mínimo de la seña.

Como criterio general, la seña no debería ser inferior al costo que WALOS necesita cubrir para preparar o producir el pedido.

WALOS puede establecer un importe superior.

El cliente visualiza únicamente el importe de la seña requerida.

No es necesario mostrar el costo interno utilizado para calcularla.

---

## Flujo principal — Preparar pedido web

1. El cliente ingresa al sitio web de WALOS.
2. El sistema muestra el catálogo de productos disponibles.
3. El cliente agrega productos al carrito.
4. El cliente selecciona las cantidades.
5. El sistema calcula el subtotal.
6. El sistema evalúa las promociones activas.
7. El sistema aplica los descuentos correspondientes.
8. El cliente selecciona:
   - retiro;
   - o envío.
9. El cliente completa los datos requeridos.
10. El cliente indica un medio de contacto.
11. El sistema calcula:
    - subtotal;
    - descuentos;
    - importe final;
    - seña requerida.
12. El sistema muestra un resumen completo del pedido.
13. El cliente confirma el pedido.
14. El sistema genera un identificador único de reserva.
15. La reserva queda en estado `PENDIENTE`.
16. La reserva queda disponible en el sistema interno de WALOS.
17. El sistema permite continuar la comunicación mediante un canal habilitado.
18. El cliente es redirigido al canal seleccionado.
19. El sistema genera automáticamente un mensaje con el resumen del pedido.

---

## Generación del mensaje de contacto

Al confirmar el pedido, el sistema debe preparar un mensaje con la información principal de la reserva.

Ejemplo:

`Reserva R-0025`

`Productos:`
- `3 Galletitas de pollo`
- `2 Bocaditos de hígado`

`Subtotal: $15.000`

`Descuento: $1.500`

`Total: $13.500`

`Seña requerida: $5.000`

`Modalidad: Retiro`

`Lugar: Feria Plaza San Martín`

`Fecha: 15/10/2026`

El cliente puede continuar la conversación mediante:

- WhatsApp;
- Instagram;
- otro canal habilitado por WALOS.

---

## Comunicación con el cliente

La comunicación posterior puede utilizarse para:

- confirmar disponibilidad;
- confirmar la seña;
- coordinar retiro;
- coordinar envío;
- acordar cambios;
- resolver dudas;
- confirmar que el pedido está preparado.

Para el MVP, esta comunicación puede realizarse fuera de la plataforma.

La reserva sigue siendo la referencia interna utilizada por WALOS.

---

## Gestión interna de reservas

Toda reserva generada desde la web debe aparecer en una lista interna accesible para los trabajadores.

Para cada reserva deben poder visualizarse:

- identificador;
- cliente;
- medio de contacto;
- productos;
- cantidades;
- precio original;
- promociones;
- descuento;
- total;
- seña requerida;
- modalidad de entrega;
- punto de retiro o datos de envío;
- fecha;
- estado actual.

Los trabajadores pueden abrir una reserva para continuar su gestión.

---

## Estados de la reserva

### PENDIENTE

El pedido fue generado desde la web.

Todavía:

- no fue aceptado por WALOS;
- o no fue confirmada la seña.

La reserva todavía no constituye una venta definitiva.

---

### EN GESTIÓN

Un trabajador comenzó a gestionar la reserva.

Puede estar:

- revisando disponibilidad;
- contactando al cliente;
- coordinando envío;
- esperando confirmación;
- ajustando detalles.

Este estado permite distinguir una reserva todavía no revisada de una ya tomada por un trabajador.

---

### ACEPTADA

La seña fue confirmada y WALOS aceptó el pedido.

A partir de este momento puede comenzar la preparación de la mercadería.

---

### PREPARADA

La mercadería se encuentra asignada y preparada para:

- retiro;
- o entrega.

---

### FINALIZADA

El cliente recibió o retiró la mercadería.

La reserva se cierra y genera una venta definitiva.

---

### CANCELADA

La reserva fue dada de baja antes de finalizarse.

Debe conservarse el motivo y el historial.

---

### NO RETIRADA

La mercadería fue preparada pero el cliente no la retiró o recibió dentro de las condiciones acordadas.

En este caso:

- no se genera venta definitiva;
- la mercadería puede liberarse;
- debe registrarse el tratamiento de la seña.

---

## Asignación de mercadería

Cuando la reserva es aceptada, el trabajador puede comenzar a preparar el pedido.

El sistema debe identificar el stock disponible y seleccionar automáticamente los lotes necesarios.

Ejemplo:

Reserva:

- Galletitas: 10 unidades.

Stock:

- Lote `L-010`: 4 unidades.
- Lote `L-012`: 20 unidades.

Asignación:

- Lote `L-010`: 4 unidades.
- Lote `L-012`: 6 unidades.

Las unidades continúan perteneciendo a sus lotes originales.

No se generan nuevos lotes.

Mientras la mercadería se encuentre asignada a una reserva aceptada:

- no debe encontrarse disponible para otras ventas;
- debe conservarse la trazabilidad de los lotes involucrados.

---

## Confirmación de la seña

La reserva permanece inicialmente en estado `PENDIENTE`.

Cuando un trabajador confirma que la seña fue recibida:

1. El pago queda vinculado a la reserva.
2. Se registra el importe.
3. Se registra el medio de pago.
4. WALOS puede aceptar el pedido.
5. La reserva pasa a estado `ACEPTADA`.

Esta operación se desarrolla con mayor detalle en:

`CU-07 — Confirmar reserva mediante seña`.

---

## Finalización de la reserva

Cuando el cliente retira o recibe el pedido:

1. El trabajador abre la reserva.
2. El sistema muestra:
   - total;
   - seña abonada;
   - saldo restante.
3. El trabajador confirma la entrega.
4. Se registra el pago restante, si corresponde.
5. La reserva pasa a estado `FINALIZADA`.
6. El sistema genera una venta definitiva.
7. La venta queda vinculada a la reserva.
8. La seña se considera parte del importe ya abonado.
9. La venta conserva:
   - productos;
   - cantidades;
   - lotes;
   - promociones;
   - pagos;
   - modalidad de entrega;
   - referencia a la reserva.

---

## Reserva no retirada

Si una reserva fue aceptada y preparada pero el cliente no la retira:

1. El trabajador marca la reserva como `NO RETIRADA`.
2. El sistema identifica la mercadería asignada.
3. El trabajador libera la mercadería.
4. Las unidades vuelven a quedar disponibles en sus lotes originales.
5. Se registra el tratamiento aplicado a la seña.

Si WALOS retiene la seña:

- no se genera una venta;
- el importe se registra como ingreso asociado a la reserva.

---

## Cancelación

Una reserva puede cancelarse antes de finalizar.

Si no existe mercadería asignada:

- se marca como `CANCELADA`;
- se registra el motivo.

Si ya existe mercadería asignada:

- debe liberarse;
- vuelve a quedar disponible en sus lotes originales;
- se conserva el historial.

Si existe una seña:

- debe registrarse su tratamiento;
- la devolución o retención no debe suponerse automáticamente.

---

## Integración con redes sociales

Instagram puede continuar utilizándose como canal de:

- difusión;
- novedades;
- contenido;
- promociones;
- contacto con clientes.

La página web no pretende reemplazar Instagram.

Su función principal es:

- centralizar información;
- mostrar contenido estable;
- estructurar pedidos;
- generar reservas;
- reducir errores en la toma de pedidos.

---

## Integración con plataformas externas

En una versión futura, WALOS podrá integrar pedidos provenientes de plataformas externas.

Ejemplos:

- PedidosYa;
- otras plataformas de delivery.

En esos casos:

- la venta puede originarse externamente;
- el transporte puede quedar a cargo de la plataforma;
- WALOS debe conservar el registro interno de stock, lotes y venta.

Esta integración queda fuera del alcance del MVP.

---

## Validaciones

### V1 — Carrito vacío

No puede confirmarse un pedido sin productos.

---

### V2 — Cantidad inválida

Las cantidades deben ser mayores que cero.

---

### V3 — Medio de contacto faltante

No puede generarse una reserva sin un medio de contacto válido.

---

### V4 — Punto de retiro no disponible

Solo pueden seleccionarse puntos y fechas habilitados.

---

### V5 — Datos de entrega incompletos

La modalidad seleccionada debe contener la información mínima necesaria para poder continuar la gestión.

---

## Postcondiciones

Al confirmar correctamente el pedido:

- se genera una reserva;
- recibe un identificador único;
- queda inicialmente en estado `PENDIENTE`;
- queda disponible para los trabajadores;
- se conservan productos y cantidades;
- se conservan precios;
- se conservan promociones;
- se registra el total;
- se registra la seña requerida;
- se registra el medio de contacto;
- se registra la modalidad de entrega;
- el cliente puede continuar la conversación con WALOS;
- todavía no existe una venta definitiva.

Cuando la reserva se finaliza:

- se genera una venta;
- la venta queda vinculada a la reserva;
- la seña forma parte del pago;
- la mercadería queda descontada de los lotes correspondientes.

---

## Reglas de negocio asociadas

### RN-CU06-01 — Pedido web genera reserva

Confirmar un pedido web genera una reserva y no una venta definitiva.

---

### RN-CU06-02 — Medio de contacto obligatorio

Toda reserva debe incluir al menos un medio de contacto válido.

---

### RN-CU06-03 — Continuación mediante canal externo

La gestión de una reserva puede continuar mediante WhatsApp, Instagram u otro canal habilitado.

El uso de un canal externo no reemplaza el registro interno de la reserva.

---

### RN-CU06-04 — Lista interna de reservas

Toda reserva generada desde la web debe aparecer en el sistema interno de WALOS.

---

### RN-CU06-05 — Gestión manual

Un trabajador debe poder revisar y gestionar las reservas antes de su finalización.

---

### RN-CU06-06 — Seña requerida

Una reserva debe requerir una seña antes de ser aceptada.

---

### RN-CU06-07 — Seña configurable

WALOS debe poder definir el criterio utilizado para calcular el importe mínimo de la seña.

---

### RN-CU06-08 — Stock reservado

La mercadería asignada a una reserva aceptada no debe encontrarse disponible para otras ventas.

---

### RN-CU06-09 — Conservación de lotes

Asignar mercadería a una reserva no genera nuevos lotes.

Las unidades mantienen la identidad de sus lotes originales.

---

### RN-CU06-10 — Conversión en venta

Una reserva solamente genera una venta cuando la mercadería es entregada o retirada y la operación es finalizada.

---

### RN-CU06-11 — Vinculación reserva-venta

Toda venta originada desde una reserva debe mantener una referencia a dicha reserva.

---

### RN-CU06-12 — Seña como parte del pago

Si la reserva finaliza en una venta, la seña forma parte del total abonado.

No debe contabilizarse nuevamente como ingreso independiente.

---

### RN-CU06-13 — Reserva no retirada

Si una reserva preparada no es retirada:

- no genera venta;
- la mercadería puede liberarse;
- vuelve a sus lotes originales;
- se registra el tratamiento de la seña.

---

### RN-CU06-14 — Retención de seña

Si WALOS retiene una seña correspondiente a una reserva que no finalizó, el importe puede registrarse como ingreso asociado a la reserva.

---

### RN-CU06-15 — Coordinación manual de envío

Para el MVP, los detalles de envío pueden coordinarse manualmente entre WALOS y el cliente.

---

### RN-CU06-16 — La web no reemplaza las redes sociales

La página web funciona como canal institucional y generador estructurado de pedidos.

Las redes sociales pueden continuar utilizándose como canales de difusión y comunicación.

---

### RN-CU06-17 — Trazabilidad de estados

Todo cambio de estado de la reserva debe conservar:

- estado anterior;
- estado nuevo;
- fecha y hora;
- usuario responsable cuando corresponda.

---

## Diagrama asociado

El ciclo principal de la reserva puede representarse mediante un diagrama de estados:

`PENDIENTE → EN GESTIÓN → ACEPTADA → PREPARADA → FINALIZADA`

Con posibles salidas:

- `PENDIENTE → CANCELADA`
- `EN GESTIÓN → CANCELADA`
- `ACEPTADA → CANCELADA`
- `PREPARADA → NO RETIRADA`

El diagrama permite visualizar el ciclo completo desde la generación del pedido hasta su conversión en una venta definitiva.

---

## Resultado esperado

El cliente puede utilizar el sitio web de WALOS para:

- conocer la empresa;
- consultar productos;
- visualizar promociones;
- acceder a recetas y novedades;
- conocer próximas ferias;
- preparar un pedido;
- seleccionar retiro o envío;
- visualizar el total;
- conocer la seña requerida;
- generar una reserva;
- continuar la comunicación por un canal válido.

WALOS recibe una reserva estructurada en su sistema interno y puede:

- revisarla;
- contactar al cliente;
- confirmar la seña;
- aceptar el pedido;
- asignar mercadería;
- preparar el pedido;
- finalizar la entrega;
- convertir la reserva en una venta;
- mantener la trazabilidad completa de la operación.
