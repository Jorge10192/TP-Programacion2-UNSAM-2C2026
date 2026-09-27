# 07 — Reglas de negocio

## RN-01 — Prioridad de lotes

Cuando existan varios lotes disponibles de un mismo producto, el sistema deberá priorizar para la venta el lote con vencimiento más próximo, siempre que se encuentre apto para comercialización.

Se debe definir un estado donde el lote deja de estar apto para comercializacion para que el negocio decida la mejor forma de uso. Por ejemplo muestra para feria o donacion o descarte.

---

## RN-02 — Lotes vencidos

Un lote vencido no podrá utilizarse para una nueva venta, reserva o asignación de stock. Debe declararse como perdida para el negocio.

---

## RN-03 — Producción y consumo de insumos

Una producción solo podrá confirmarse si existen insumos suficientes.

Al confirmar la producción:

- se descuentan los insumos utilizados;
- se registra la cantidad producida;
- se genera el lote correspondiente.

Estas operaciones deberán realizarse conjuntamente y ser verificadas/confirmadas por el usuario que las genera.

---

## RN-04 — Manejo de Inconsistencias

- Ninguna operación podrá dejar el stock de un insumo o producto con una cantidad negativa.
- No puede ubicarse a un stock en 2 lugares al mismo tiempo.
- No puede venderse un mismo producto identificado de forma unica 2 veces.
- No puede gastarse mas dinero del disponible en la cuenta de la empresa
- No pueden realizarse gastos sin detalle o justificacion del mismo. 

---

## RN-05 — Movimientos entre ubicaciones

Todo traslado de mercadería entre depósito, local comercial, feria u otra ubicación deberá registrar:

- producto;
- lote;
- cantidad;
- origen;
- destino;
- fecha y hora.

---

## RN-06 — Venta y stock

Una venta confirmada deberá descontar stock una sola vez.
Un reintento o repetición de la misma operación no deberá generar un segundo descuento.
Cada operacion realizada debe tener un numero de identificacion unico.

---

## RN-07 — Reservas

Una reserva que requiera seña solo se considerará confirmada cuando dicha seña haya sido registrada y verificada.
Mientras la reserva se encuentre vigente, se debe pedir a los usuarios del sistema que se designe unidades a dicha reserva. 
No deben ser designadas automaticamente.

---

## RN-08 — Liberación de reservas

Si una reserva se esta generando, pero el cliente no termina de completarla, no debe generarse cambios en el sistema. 
Los cambios en gestión de reservas solo se computan al confirmar las reservas. Las confirmaciones de reserva van vinculadas a un pago de seña.  
La reserva se genera con estado **en proceso**, que requiere adjudicación de productos y envió de la misma.

Si una reserva es cancelada antes de completarse la misma, debe cambiar el estado de la reserva a **cancelada**.
En caso que haya unidades asignadas a esa reserva deberán volver a estar disponibles al lote del que salieron.

Si la reserva se completa exitosamente, debe marcarse como **completada** y registrarse como una venta online.

---

## RN-09 — Precio histórico

Las ventas deberán conservar el precio y descuento aplicados en el momento de su confirmación.
Los cambios posteriores de precios o promociones no deberán modificar ventas anteriores.

---

## RN-10 — Promociones

Una promoción solo podrá aplicarse cuando se cumplan todas sus condiciones de vigencia, producto, cantidad o canal.
El descuento deberá calcularse antes de confirmar la venta o pedido.

---

## RN-11 — Costos de producción

El costo de una producción deberá calcularse utilizando los costos correspondientes a los insumos utilizados en dicha producción.
Los cambios posteriores en los precios de compra no deberán modificar el costo histórico registrado.

---

## RN-12 — Punto de venta

Toda venta deberá identificar el canal o punto donde fue realizada cuando corresponda, por ejemplo:

- feria;
- local comercial;
- web.

Esto permitirá realizar análisis posteriores por canal o ubicación.

---

## RN-13 — Operaciones simultáneas

Cuando dos operaciones concurrentes intenten utilizar la misma disponibilidad de stock, el sistema deberá permitir únicamente aquellas que puedan satisfacerse con las unidades realmente disponibles.

---

## RN-14 — Disponibilidad del sistema y horarios comerciales

El sistema podrá utilizarse en cualquier horario.
Los horarios de una feria, local comercial o modalidad de retiro podrán limitar determinadas operaciones comerciales, pero no deberán impedir el acceso general al sistema.

---

## RN-15 — Pagos

El registro de un pago no deberá descontar nuevamente stock.
Venta, pago y entrega deberán considerarse operaciones relacionadas pero diferentes.

---

## RN-16 — Medios de pago

El sistema deberá permitir registrar como mínimo los medios de pago utilizados por WALOS, incluyendo Mercado Pago y Cuenta DNI.
La integración automática con dichos servicios podrá implementarse en una etapa posterior.


