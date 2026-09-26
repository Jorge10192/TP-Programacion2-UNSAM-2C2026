# WALOS — Guía técnica propuesta

Este documento traduce los [requerimientos](requerimientos.md) en una base de implementación. Las decisiones de negocio abiertas allí se deben resolver antes de fijar contratos de API.

## Modelo de datos mínimo

| Entidad | Datos y relación clave |
| --- | --- |
| Usuario/Rol | Identidad, autenticación, permisos de administrador, operador o cliente; clientes aislados entre sí. |
| Proveedor/Insumo/Equivalencia | Proveedor, unidad de compra y conversiones explícitas entre gramos, paquetes y cajas. |
| Compra/Recepción/LoteInsumo | Cantidad, costo, fecha, lote y vencimiento de insumos; recepción separada del pago. |
| Producto/RecetaVersionada/Producción | Presentación vendible, insumos previstos, versión usada, consumo y rendimiento reales. |
| LoteProducto | Producto, cantidad, origen, elaboración, conservación, vencimiento y condición. |
| Ubicación/MovimientoStock | Stock propio, comercio, revisión o descarte; movimiento inmutable con origen, destino, motivo y responsable. |
| Comercio/Envío/Rendición | Modalidad mayorista o consignación, ventas, devoluciones, mermas, pendientes y diferencias por lote. |
| Promoción/Cupo | Porcentaje o 3x2, alcance, vigencia, canal, cupo y autorización. |
| Pedido/PedidoItem/Reserva | Precio y oferta aceptados, lotes y cupo reservados, plazo, retiro y cumplimiento. |
| Pago/Reintegro | Cobro, seña, saldo o pago a proveedor; medio, referencia y verificación. |

El stock físico se obtiene de movimientos por lote y ubicación. La **disponibilidad online** es el stock apto en la ubicación de la tienda menos reservas activas. Stock en consignación, revisión, descarte o vencido no suma. Los importes del pedido se conservan como una fotografía de la oferta aceptada; cambios posteriores de precio no reescriben ventas anteriores.

## Estados y operaciones críticas

- **Lote:** en producción → apto → en revisión, agotado o descartado. Vencido es una condición calculada por fecha y conservación que impide nuevas asignaciones.
- **Pedido:** carrito sin reserva → pendiente de pago con reserva → confirmado → preparado → entregado, o cancelado/vencido. Los nombres finales pueden cambiar tras la entrevista.
- **Pago:** pendiente → informado → verificado, rechazado o reintegrado. Solo importes verificados cuentan como acreditados. Si se integra un proveedor, sus avisos repetidos se procesan una sola vez.
- **Consignación:** entregado → parcialmente vendido/devuelto/mermado → conciliado. La devolución entra en revisión; solo una aprobación genera disponibilidad propia. Una diferencia queda abierta para investigación.

Confirmar un pedido debe revalidar stock, vencimiento, fecha de retiro, precio, promoción y cupo dentro de una transacción. Si dos compradores intentan tomar la última unidad o cupo, solo uno confirma. La reserva mantiene el precio aceptado hasta su vencimiento. Verificar una seña o el total confirma el pedido; un pago tardío requiere revisión. El cobro y la salida física son eventos distintos: solo la entrega registra esa salida. La duración de la reserva está pendiente de acuerdo.

Las alertas por vencimiento y stock bajo se consultan al abrir el panel y se recalculan diariamente, aun si no hubo movimientos. Se priorizan lotes aptos que vencen antes. Para reglas de promoción con tipos distintos, **Strategy** es un patrón justificable: cada regla calcula elegibilidad y descuento bajo el mismo contrato; un evaluador elige la oferta válida de menor total. No se requiere un patrón adicional si no aporta claridad.

## API REST: mapa inicial

| Área | Endpoints orientativos | RF |
| --- | --- | --- |
| Acceso | `POST /auth/register`, `POST /auth/login`, `GET /users/me` | 01 |
| Catálogos | `GET/POST /suppliers`, `/ingredients`, `/products`, `/recipe-versions`, `/locations` | 02 |
| Abastecimiento | `GET/POST /purchases`, `POST /purchases/{id}/receive` | 03 |
| Producción | `GET/POST /batches`, `POST /batches/{id}/complete` | 04 |
| Inventario | `GET /stock`, `GET /stock/movements`, `POST /stock/adjustments` | 05 |
| Comercios | `GET/POST /retailers`, `GET/POST /shipments`, `POST /shipments/{id}/reconcile`, `POST /returns/{id}/approve` | 06, 07 |
| Ventas | `GET/POST /sales`, `POST /sales/{id}/fulfill` | 08 |
| Tienda | `GET /catalog`, `POST /carts/quote`, `POST /orders`, `GET /orders/{id}` | 01, 09, 13, 14 |
| Dinero | `GET/POST /payments`, `POST /payments/{id}/verify`, `POST /refunds` | 10 |
| Alertas y resumen | `GET /alerts`, `GET /reports/summary`, `GET /reports/export.csv` | 11, 12 |
| Promociones | `GET/POST /promotions`, `PATCH /promotions/{id}` | 14 |

Los endpoints son un mapa, no una promesa de integración ya disponible. En la primera versión del PDF de referencia los pagos se hacen fuera de la aplicación y se verifican manualmente con registro auditable. La conversación también pidió procesamiento con Mercado Pago y Cuenta DNI: hay que resolver esa diferencia antes de fijar los contratos. Solo se agregaría un webhook si existe una integración real con un proveedor que lo ofrezca.

## Entrega de Programación 2

La consigna adjunta solicita una API RESTful en **FastAPI**, autenticación segura, base de datos con **SQLAlchemy**, documentación de idea, requerimientos y casos de uso, Docker, despliegue, manejo de errores, al menos **10 pruebas unitarias**, una **GitHub Action** para ejecutarlas y un patrón de diseño con utilidad real. También solicita un README con dependencias y pasos de ejecución/prueba y una presentación con al menos un diagrama UML y la justificación del patrón.

Este repositorio contiene por ahora la documentación. Cuando exista código, el README debe agregar los comandos reales de instalación, variables, ejecución, pruebas y despliegue; no se deben inventar antes.

### Pruebas prioritarias

1. Compra recibida aumenta insumos una vez, aunque el pago siga pendiente.
2. Producción consume insumos y crea el lote en una sola transacción.
3. Producción rechaza insumos insuficientes o vencidos, sin cambios parciales.
4. Lote vencido no se publica ni reserva; moverlo no cambia su vencimiento.
5. Alertas de vencimiento y stock bajo aparecen incluso sin movimientos nuevos.
6. Consignación reduce disponibilidad propia sin registrar venta final.
7. Rendición de 10 cajas como 6 vendidas, 3 devueltas y 1 pendiente conserva el saldo.
8. Devolución queda en revisión hasta aprobación; una diferencia no se contabiliza como venta.
9. Carrito 3x2 reserva tres unidades y cupo, pero cobra dos.
10. Al bajar a dos unidades se recalcula la promoción.
11. Dos confirmaciones concurrentes no venden la última unidad ni consumen el último cupo dos veces.
12. Seña se calcula sobre el total con descuentos y el precio se conserva durante la reserva.
13. Pago tardío no confirma automáticamente un pedido con reserva vencida.
14. Solo un pago verificado se acredita; reintentos de pedido, pago o entrega no duplican registros.
15. El resumen separa ventas, cobros, stock propio y consignado; el CSV conserva esa distinción.
