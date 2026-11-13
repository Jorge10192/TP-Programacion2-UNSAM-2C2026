# E3-2B · B4 — Confirmación transaccional de venta QR DEMO en PostgreSQL QA

**Rama:** `feature/e3-2b-mercadopago-qr-demo`  
**Estado:** implementación en rama; requiere aprobación de CI sobre último SHA. No se realizó prueba manual ni merge de `main`; la aceptación integral corresponde después de B6.

## Regla esencial

Un evento `APROBADA_DEMO` **no es una acreditación externa**. B4 incorpora una acción administrativa adicional y explícita que registra **UNA venta de prueba** en PostgreSQL QA usando el snapshot persistido por B2. B4 no invoca Mercado Pago ni acredita dinero.

El backend requiere **ambas** variables en la base de datos **descartable**:

```text
PYME_ENABLE_QR_DEMO_LAB=1
PYME_DISPOSABLE_QA=1
```

La UI necesita `VITE_PYME_ENABLE_QR_DEMO_LAB=1` y `VITE_PYME_ENABLE_QR_FINALIZATION_QA=1` para mostrar el botón. La API no confía en las variables del frontend y valida roles de titular/administrador. **Jamás activar estas variables sobre la base cotidiana o en producción.** La base local del usuario no se modificó desde esta implementación.

## API

- `POST /api/v1/businesses/{business_id}/qr-payment-intents/{intent_id}/finalize-demo` — no acepta importes, líneas o medio de pago enviados por navegador. La solicitud se identifica por el QR persistido: repetirla devuelve HTTP 200, mismo comprobante y stock inalterado.
- `GET /api/v1/businesses/{business_id}/qr-payment-intents/{intent_id}/receipt` — comprobante confirmado solo si hay enlace transaccional.
- `GET /api/v1/businesses/{business_id}/qr-payment-intents/{intent_id}` — incluye `sale_id` nullable, que se completa solo cuando `FINALIZADA`.
- El endpoint público `POST /sales` sigue aceptando solo **cinco pagos declarados**, y no puede declarar `MERCADO_PAGO_DEMO_QA`. Ese nuevo valor se crea exclusivamente desde el servicio interno de B4.

## Transacción única, sin ventas duplicadas

1. Revalidar sesión, empresa activa y rol administrativo; comprobar que el servidor usa entorno QA descartable.
2. Bloquear `QrPaymentIntent` (`SELECT FOR UPDATE`). Si ya existe `QrPaymentSettlement`, recuperar el mismo comprobante de forma idempotente; nunca volver a debitar stock.
3. Exigir estado `APROBADA_DEMO` y evento `APROBAR` en la bitácora de esa empresa y ese intento. Rechazados, expirados, cancelados, indeterminados o en revisión no pueden finalizarse.
4. Construir `CreateSaleRequest` **desde las líneas y totales originales del servidor**. Asignar `request_id` UUID4 determinístico por tenant/intento. No confiar en un nuevo cuerpo enviado por cliente.
5. Reutilizar `SaleService.create(..., commit=False, trusted_qr_demo=True)`: valida rol, sede, artículo y stock; inserta venta, renglones, pago `MERCADO_PAGO_DEMO_QA`, movimientos y modifica saldos. No hace `COMMIT` todavía. El endpoint de ventas tradicional conserva su semántica previa de commit.
6. Conservar nombre/SKU del snapshot del QR, crear `QrPaymentSettlement` (FK tenant hacia venta e intento, único por ambos), pasar estado QR a `FINALIZADA`, añadir evento `FINALIZAR`.
7. **Un solo commit** confirma venta + pago simulado + movimientos + stock + vínculo + evento. Cualquier fallo previo revierte toda la operación.

La relación se guarda en la nueva tabla `qr_payment_settlements` y su migración `e32b_qr_sales`. La restricción de medio de pago se amplía para reconocer `MERCADO_PAGO_DEMO_QA`; la API pública no lo acepta como entrada. `QrPaymentEvent.action` incorpora `FINALIZAR` y `REVISION`.

## Fallos posteriores al pago ficticio

Si al intentar registrar la venta el artículo, la sede o el stock ya no cumplen los requisitos, la transacción de venta se revierte por completo. En una segunda transacción corta el QR pasa de `APROBADA_DEMO` a `REQUIERE_REVISION`, con evento `REVISION` y sin `Sale`, `SalePayment`, `StockMovement` ni débito. No reintentar automáticamente un cierre en revisión.

En respuestas de red inciertas el navegador debe consultar primero el QR (y su comprobante si dice `FINALIZADA`). La finalización es idempotente porque usa el identificador del QR y un vínculo único en DB; no genera nuevas claves de venta.

## Casos automáticos previstos

- Sin aprobación, rechazado o cancelado: 409, cero ventas.
- Aprobación simulada → POST cierre: 201, pago `MERCADO_PAGO_DEMO_QA`, evento `FINALIZAR`, vínculo 1:1.
- Mismo POST repetido: 200, mismo comprobante y cero descuentos adicionales.
- GET por QR y por comprobante de venta; rechazo de tenant ajeno, empleado sin rol o laboratorio deshabilitado.
- Bien físico + servicio con saldo: stock decrece una vez, versión incrementada una vez, un solo movimiento.
- Se agota stock después de aprobar: 409 y `REQUIERE_REVISION`, cero ventas, cero movimientos, no saldo negativo.
- Fallo tardío antes de commit: rollback de venta, pago, stock, vínculo y estado de QR.
- Frontend: método DEMO distinto del declarado; rechazar respuesta con QR/venta/total/SKU no coincidentes y resultado HTTP incierto.

## Pendiente

**B5:** consolidación visual, controles de UX, avisos de QR en revisión y recorridos responsive.  
**B6:** OAuth, Orders API QR dinámico, notificaciones y conciliación oficial con credenciales y permisos reales de prueba. **Solo B6 puede emitir un QR cobrable en el entorno del proveedor**, nunca este QR ficticio.

No pedir pruebas manuales intermedias; hacer una única auditoría y recorrido B1–B6 antes del merge explícitamente aprobado a `main`.
