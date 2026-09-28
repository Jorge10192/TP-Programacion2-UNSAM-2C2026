# 07 — Reglas de negocio

## RN-01 — Organizacion de mercaderia en lotes

Un lote es una unidad indivisible de produccion de mercaderia. A partir de los lotes se procesan movimientos de productos, ventas, y acciones que requiera la empresa.
Un lote puede estar distribuido entre múltiples ubicaciones. Los movimientos de stock no crean nuevos lotes; solamente modifican la cantidad disponible del lote en cada ubicación.

## RN-02 — Prioridad de lotes

Cuando existan varios lotes disponibles de un mismo producto, el sistema deberá priorizar para la venta el lote con vencimiento más próximo, siempre que se encuentre apto para comercialización.

Se debe definir un estado donde el lote deja de estar apto para comercializacion para que el negocio decida la mejor forma de uso. Por ejemplo muestra para feria o donacion o descarte.

---

## RN-03 — Lotes vencidos

Un lote vencido no podrá utilizarse para una nueva venta, reserva o asignación de stock. Debe declararse como perdida para el negocio.

---

## RN-04 — Producción y consumo de insumos

Una producción solo podrá confirmarse si existen insumos suficientes.

Al confirmar la producción:

- se descuentan los insumos utilizados;
- se registra la cantidad producida;
- se genera el lote correspondiente.

Estas operaciones deberán realizarse conjuntamente y ser verificadas/confirmadas por el usuario que las genera.

---

## RN-05 — Manejo de Inconsistencias

- Ninguna operación podrá dejar el stock de un insumo o producto con una cantidad negativa.
- No puede ubicarse a un stock en 2 lugares al mismo tiempo.
- No puede venderse un mismo producto identificado de forma unica 2 veces.
- No puede gastarse mas dinero del disponible en la cuenta de la empresa
- No pueden realizarse gastos sin detalle o justificacion del mismo. 

---

## RN-06 — Movimientos entre ubicaciones

Todo traslado de mercadería entre depósito, local comercial, feria u otra ubicación deberá registrar:

- producto;
- lote;
- cantidad;
- origen;
- destino;
- fecha y hora.
- duración del movimiento (si es permanente o temporal)

---

## RN-07 — Venta y stock

Una venta confirmada deberá descontar stock una sola vez.
Un reintento o repetición de la misma operación no deberá generar un segundo descuento.
Cada operacion realizada debe tener un numero de identificacion unico.

---

## RN-08 — Reservas

Una reserva que requiera seña solo se considerará confirmada cuando dicha seña haya sido registrada y verificada.
Mientras la reserva se encuentre vigente, se debe pedir a los usuarios del sistema que se designe unidades a dicha reserva. 
No deben ser designadas automaticamente.

---

## RN-09 — Liberación de reservas

Si una reserva se esta generando, pero el cliente no termina de completarla, no debe generarse cambios en el sistema. 
Los cambios en gestión de reservas solo se computan al confirmar las reservas. Las confirmaciones de reserva van vinculadas a un pago de seña.  
La reserva se genera con estado **en proceso**, que requiere adjudicación de productos y envió de la misma.

Si una reserva es cancelada antes de completarse la misma, debe cambiar el estado de la reserva a **cancelada**.
En caso que haya unidades asignadas a esa reserva deberán volver a estar disponibles al lote del que salieron.

Si la reserva se completa exitosamente, debe marcarse como **completada** y registrarse como una venta online.

---

## RN-10 — Precio histórico

Las ventas deberán conservar el precio y descuento aplicados en el momento de su confirmación.
Los cambios posteriores de precios o promociones no deberán modificar ventas anteriores.

---

## RN-11 — Promociones

Una promoción solo podrá aplicarse cuando se cumplan todas sus condiciones de vigencia, producto, cantidad o canal.
El descuento deberá calcularse antes de confirmar la venta o pedido.

---

## RN-12 — Costos de producción

El costo de una producción deberá calcularse utilizando los costos correspondientes a los insumos utilizados en dicha producción.
Los cambios posteriores en los precios de compra no deberán modificar el costo histórico registrado.

---

## RN-13 — Punto de venta

Toda venta deberá identificar el canal o punto donde fue realizada cuando corresponda, por ejemplo:

- feria;
- local comercial;
- web.

Esto permitirá realizar análisis posteriores por canal o ubicación.

---

## RN-14 — Operaciones simultáneas

Cuando dos operaciones concurrentes intenten utilizar la misma disponibilidad de stock, el sistema deberá permitir únicamente aquellas que puedan satisfacerse con las unidades realmente disponibles.

---

## RN-15 — Disponibilidad del sistema y horarios comerciales

El sistema podrá utilizarse en cualquier horario.
Los horarios de una feria, local comercial o modalidad de retiro podrán limitar determinadas operaciones comerciales, pero no deberán impedir el acceso general al sistema.

---

## RN-16 — Pagos

El registro de un pago no deberá descontar nuevamente stock.
Venta, pago y entrega deberán considerarse operaciones relacionadas pero diferentes.

---

## RN-17 — Medios de pago

El sistema deberá permitir registrar como mínimo los medios de pago utilizados por WALOS, incluyendo Mercado Pago y Cuenta DNI.
La integración automática con dichos servicios podrá implementarse en una etapa posterior.


