# WALOS — Requerimientos de la aplicación

## 1. Propósito y alcance

WALOS elabora productos para mascotas y necesita administrar en un solo lugar la compra de materias primas, la producción por lotes, el inventario, la distribución a comercios y las ventas. Hoy parte de la información se registra en Excel y la captación de clientes ocurre principalmente por Instagram. La aplicación debe ser simple para el equipo y permitir que otra persona autorizada ayude con inventario y proveedores.

El recorrido deseado es **compra de insumos → producción → stock por lote → venta directa o consignación → cobro y devolución**. Para clientes finales se agrega **catálogo → carrito → promoción automática → pedido con seña o pago total → entrega**.

La primera versión reúne un panel interno y una tienda B2C. La operación comercial distingue **venta mayorista** de **consignación**; por ahora no incluye un portal para comercios. Quedan fuera de alcance la contabilidad fiscal, las transferencias automáticas, los mensajes de Instagram, una app nativa, la predicción con IA y la combinación de promociones. La API REST es el entregable técnico de Programación 2; la interfaz necesaria para probar los recorridos debe acordarse con el equipo.

### Actores

| Actor | Necesidad principal |
| --- | --- |
| Administrador/a WALOS | Gestionar negocio, dinero y permisos; solo este rol habilita operadores. |
| Operador/a WALOS | Registrar producción y movimientos autorizados. |
| Cliente final | Comprar y consultar solo sus propios pedidos. |
| Comercio | Recibir mercadería y rendir ventas, mermas y devoluciones mediante WALOS; no tiene portal en la primera versión. |
| Proveedor de insumos | Entregar materias primas y recibir el pago; su integración digital se confirmará. |

## 2. Requerimientos funcionales

La numeración y los títulos siguen el PDF de referencia aportado por el usuario. Los criterios de implementación y las decisiones todavía abiertas aparecen después de la tabla.

| ID | El sistema debe… | Prioridad |
| --- | --- | --- |
| RF01 · Accesos | Registrar clientes e iniciar sesión por rol. Solo el administrador habilita operadores; cada cliente ve sus propios pedidos. | Alta |
| RF02 · Catálogos | Gestionar insumos, productos, proveedores, ubicaciones y recetas versionadas, con unidades y equivalencias entre gramos, paquetes y cajas. | Alta |
| RF03 · Compras | Registrar proveedor, cantidad, unidad, costo, fecha, lote y vencimiento cuando corresponda. El stock aumenta al recibir, no al pagar. | Alta |
| RF04 · Producción | Registrar insumos y rendimiento reales; descontar insumos y crear el lote producido en una sola operación trazable. Rechazar insumos insuficientes o vencidos. | Alta |
| RF05 · Inventario | Consultar stock físico, reservado y disponible por lote, ubicación y condición; guardar movimientos con responsable y motivo. | Alta |
| RF06 · Distribución | Registrar origen, destino, lote, cantidad y modalidad. Consignar cambia la ubicación, sin generar venta ni reiniciar vencimiento. | Alta |
| RF07 · Rendiciones | Conciliar cada envío con ventas, devoluciones, mermas y pendientes. Una devolución requiere aprobación; una diferencia no se transforma en venta. | Alta |
| RF08 · Ventas | Registrar ventas minoristas y mayoristas con precio histórico y lotes entregados. Descontar stock una sola vez. | Alta |
| RF09 · Pedidos | Crear pedidos con fecha de retiro y reserva temporal; confirmar tras verificar seña o pago total, liberar impagos vencidos o cancelados y revisar pagos tardíos. | Alta |
| RF10 · Dinero | Registrar cobros, señas, saldos, pagos a proveedores y reintegros. La propuesta actual usa pago externo y verificación manual; solo lo verificado se acredita. | Alta |
| RF11 · Alertas | Mostrar vencimientos y stock bajo al abrir el panel y diariamente; priorizar lotes aptos que venzan antes sin crear descuentos automáticos. | Alta |
| RF12 · Resumen | Consultar pedidos, ventas, cobros, existencias y mermas por período; exportar CSV y separar ventas de cobros y stock propio de consignado. | Media |
| RF13 · Carrito | Agregar, quitar y cambiar cantidades; mostrar subtotal, descuento, ahorro, total, seña y saldo. Agregar al carrito no reserva stock. | Alta |
| RF14 · Promociones | Configurar porcentajes o 3x2 por producto o lote, fechas, canal y cupo; aplicar la oferta vigente de menor total, sin acumular. | Alta |

### Reglas de negocio de la referencia, sujetas a validación con WALOS

1. Cada movimiento conserva producto, cantidad, unidad, lote, origen, destino, fecha, responsable y motivo. Una corrección crea un ajuste trazable; no borra el registro anterior.
2. La recepción aumenta el stock de insumos aunque el pago al proveedor quede pendiente. La producción usa una receta versionada y registra el consumo y rendimiento reales; ambos inventarios cambian juntos o no cambian.
3. El stock disponible para la tienda es el físico apto en la ubicación propia menos reservas vigentes. No incluye consignación, devoluciones en revisión ni unidades vencidas. No se permite stock negativo.
4. El vencimiento depende del producto y su conservación. Enviar a un comercio o recibir una devolución no reinicia esa fecha. Los avisos se muestran al abrir el panel y diariamente, incluso sin nuevos movimientos.
5. Un envío a comercio tiene modalidad: venta mayorista o consignación. La consignación traslada unidades y se rinde como **enviado = vendido + devuelto + merma + pendiente**. Una diferencia se investiga; no se declara venta por descarte. Lo devuelto conserva lote y vencimiento y requiere aprobación antes de volver a venderse.
6. Las ventas guardan el precio aceptado y los lotes entregados. La venta y el cobro son hechos separados; cobrar nunca vuelve a descontar stock. Una reserva, pedido, cobro o movimiento repetido por reintento no se aplica dos veces.
7. Agregar al carrito calcula precios sin reservar. Confirmar revalida fecha de retiro, disponibilidad, precio, oferta y cupo; reserva temporalmente lotes y beneficio. Si algo cambió, el cliente acepta las nuevas condiciones. El precio aceptado se conserva durante la reserva.
8. El pedido queda pendiente de pago hasta verificar la seña o el total. Al vencer o cancelarse una reserva impaga se liberan unidades y cupo; un pago tardío requiere revisión. La salida física ocurre al entregar, no al cobrar.
9. Un 3x2 entrega y reserva tres unidades del mismo producto y presentación, aunque cobre dos. La seña se calcula sobre el total ya descontado. Una oferta por lote muestra su vencimiento y termina al agotar sus unidades aptas.
10. La referencia propone aplicar una sola promoción por carrito: la que deje el menor total, sin acumular. WALOS autoriza las ofertas; una alerta de vencimiento no crea descuentos por sí sola.
11. La referencia propone pagos externos con verificación manual. Mercado Pago y Cuenta DNI son los medios mencionados en la conversación; falta confirmar si esta verificación satisface el procesamiento pedido o si la primera versión requiere integración directa.

## 3. Historias y criterios de aceptación

**HU02 — Producir por lote.** Como productor/a, quiero registrar insumos usados y paquetes obtenidos para rastrear cada elaboración.

- Ambos inventarios se actualizan juntos, sin registros parciales ante un error.
- Si falta materia prima, está vencida o no existe una equivalencia necesaria, no se confirma.

**HU03 — Rendir una entrega.** Como responsable de distribución, quiero conocer lo vendido, devuelto y pendiente en cada comercio.

- Una entrega de 10 cajas puede conciliarse como 6 vendidas, 3 devueltas y 1 pendiente.
- Las devueltas quedan en revisión hasta su aprobación; las diferencias no se presumen ventas.

**HU04 — Priorizar vencimientos.** Como responsable, quiero ver lotes próximos a vencer para decidir qué vender primero.

- La alerta aparece aun sin movimientos nuevos y no activa descuentos por sí sola.
- Un lote vencido no se ofrece en catálogo ni se asigna a un pedido nuevo.

**HU07 — Comprar con promociones.** Como cliente, quiero ver la oferta válida más conveniente y el precio final.

- Un 3x2 de tres paquetes descuenta una unidad del precio, pero reserva tres unidades del inventario.
- Al bajar a dos paquetes desaparece ese beneficio si no se cumple otra regla.
- Dos clientes no pueden confirmar simultáneamente la última unidad disponible ni el último cupo de una oferta.
- La seña se calcula a partir del total final y un cambio de precio se muestra antes de cobrar.

**HU adicional — Controlar dinero.** Como administrador/a, quiero distinguir cobros, señas, saldos, pagos a proveedores y reintegros para saber qué dinero fue verificado.

- Cada pago tiene medio, monto, referencia y estado; un pago pendiente no se presenta como cobrado.
- El mismo aviso de pago procesado dos veces no duplica el cobro ni el movimiento de stock.

## 4. Casos de uso resumidos

| Caso | Actor y disparador | Flujo principal | Alternativa y resultado |
| --- | --- | --- | --- |
| CU01 Comprar insumos | Operador/a registra una recepción. | Elige proveedor e insumo, ingresa cantidad, costo y lote; confirma la recepción. | Datos inválidos impiden recibir. El stock aumenta una vez, independientemente del estado del pago. |
| CU02 Registrar producción | Operador/a cierra una tanda. | Elige la versión de receta, registra consumo y rendimiento, lote y vencimiento; confirma. | Insumos insuficientes o vencidos impiden cerrar. No quedan cambios parciales. |
| CU03 Rendir consignación | Operador/a informa resultados de un envío. | Registra ventas, devoluciones, mermas y pendientes por lote. | Lo devuelto queda en revisión; las diferencias quedan pendientes de investigación. |
| CU04 Confirmar carrito | Cliente autenticado con productos y fecha de retiro. | Revisa cantidades, oferta y total; confirma; el sistema revalida, reserva lotes y cupo, y comunica plazo y pago requerido. | Si cambian condiciones, pide nueva aceptación. Reintentar no duplica pedido; queda pendiente de pago y sin salida física. |
| CU05 Entregar venta | Operador/a prepara un pedido confirmado. | Verifica pago requerido y lotes; entrega y registra la salida física. | Si faltan unidades aptas o el pago no cumple la condición acordada, detiene la entrega. |

## 5. Requerimientos no funcionales

| ID | Condición verificable propuesta |
| --- | --- |
| RNF01 · Uso sencillo | Meta propuesta: tras 15 minutos de explicación, dos usuarios registran recepción, producción y devolución sin ayuda, en hasta 3 minutos por tarea. |
| RNF02 · Interfaz | En español, para celular y computadora desde 360 px; errores junto al campo y total visible antes de confirmar. |
| RNF03 · Seguridad | Contraseñas con hash, permisos por operación, HTTPS y secretos fuera del repositorio; no guardar tarjetas ni credenciales bancarias. |
| RNF04 · Integridad | Impedir stock negativo, duplicaciones, reservas simultáneas de la última unidad y cupos excedidos; corregir mediante ajustes, no borrado. |
| RNF05 · Respuesta | Meta propuesta: 95 % de consultas en hasta 2 segundos con 10 usuarios concurrentes, 100 productos y 10.000 movimientos, sin contar esperas de terceros. |
| RNF06 · Respaldo | Copia diaria, retención de 7 días y restauración probada; reiniciar no pierde operaciones confirmadas. |

## 6. Decisiones pendientes con WALOS

1. **Vida útil y conservación.** En la conversación se dijo “aproximadamente dos semanas”; la etiqueta fotografiada de un paquete de pollito, zanahoria, huevo y avena dice 6–7 días en heladera y hasta dos meses en freezer. Confirmar reglas por producto y condición, y qué fecha debe informarse al cliente.
2. **Catálogo e inventario.** Productos, presentaciones, equivalencias, recetas y sus versiones, rendimientos, ubicaciones, stock inicial y conciliación de Excel.
3. **Pedidos.** Confirmar fecha de retiro o entrega, zonas, costos, porcentaje de seña, plazo de reserva, pagos tardíos y cancelaciones.
4. **Pagos.** El PDF adjunto propone pago externo y verificación manual, mientras que la conversación pide procesamiento con Mercado Pago y Cuenta DNI para clientes y compras del negocio. Definir si la primera versión requiere integración directa y cómo se verifican señas, pagos y reintegros.
5. **Promociones.** Validar la regla de menor total sin acumulación, canales, cupos, reservas de beneficio y condiciones de ofertas por lote.
6. **Comercios.** Distinguir ventas mayoristas de consignación; acordar rendición de mermas, diferencias y devoluciones. El PDF deja el portal B2B fuera de la primera versión.
7. **Accesos y entrega.** Precisar permisos de operadores y confirmar la fecha de entrega del proyecto.

## 7. Procedencia de las decisiones

Las necesidades de compras, lotes, stock, consignación, ventas, Instagram, simplicidad, accesos y medios de pago provienen de la [conversación de origen](https://chatgpt.com/c/6ab6f499-0df4-83e9-b031-537f21d4e2b4). La numeración RF01–RF14, venta mayorista frente a consignación, rendiciones, metas RNF y opción de pago externo/manual proceden del PDF `WALOS_Requerimientos_actualizado (1).pdf` aportado por el usuario. Ese PDF es una referencia de contenido, no una instrucción para implementar funciones por su cuenta. La exigencia académica de FastAPI, SQLAlchemy, autenticación, Docker, pruebas, despliegue, GitHub Actions y un patrón de diseño viene de la consigna adjunta de Programación 2. Las decisiones señaladas como pendientes requieren confirmación con WALOS.
