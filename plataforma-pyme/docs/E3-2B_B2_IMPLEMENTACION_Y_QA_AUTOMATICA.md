# E3-2B · B2 — QR DEMO con detalle y recuperación

**Estado:** código integrado en `feature/e3-2b-mercadopago-qr-demo`. B3–B6 pendientes; auditoría y recorrido de uso al finalizar B6. No integrar parcialmente a `main`.

## Contratos y arquitectura B2

El POS REAL ofrece **«Generar QR de cobro (DEMO)»** como alternativa, no como sinónimo de `MERCADO_PAGO_DECLARADO`. El botón se habilita tras consultar el estado de la conexión DEMO de la empresa. Se envía una nueva intención independiente de `Sale`, con `Idempotency-Key` UUID4. En pantalla se ve un QR auténtico como **formato gráfico** pero que codifica exclusivamente `PYME-DEMO-QR:<referencia>`; no se puede pagar con Mercado Pago. Esta distinción debe permanecer visible.

**API:**
- `POST /api/v1/businesses/{business_id}/qr-payment-intents` — `location_id`, `lines`, `discount_cents`, `notes`, clave idempotente; nunca pagos declarados, tokens ni credenciales en cuerpo.
- `GET /api/v1/businesses/{business_id}/qr-payment-intents/{intent_id}` — estado, importes y snapshot del servidor, QR como imagen PNG embebida.
- `GET /api/v1/businesses/{business_id}/qr-payment-intents/by-request/{request_id}` — recuperación de resultado incierto para el autor de la solicitud.
- `POST /api/v1/businesses/{business_id}/qr-payment-intents/{intent_id}/cancel` — cancelación idempotente sin registro de venta.
- `DELETE /api/v1/businesses/{business_id}/payment-connections/mercadopago/demo` pasa a bloquear desvinculación con QR vigente no cancelado.

**Tablas:** `qr_payment_intents` (tenant, sede, merchant, actor, UUID de solicitud, SHA-256 del comando, referencia, montos en centavos, estado, vencimiento), `qr_payment_intent_lines` (línea, item/sku/nombre/unidad/tipo snapshot, cantidad milésimas, unitario/subtotal). Migración aditiva `e32b_qr_intents` posterior a `e32b_payment_connection`. No se modifica `Sale`, `SalePayment`, `StockBalance`, `StockMovement`.

**Seguridad:** sesión REAL revalidada bajo lock, membresía de tenant, política SELL y STORE por sede, política de precios/descuentos de roles, catálogo vendible activo, stock actual suficiente para bienes físicos (se consulta, **no se reserva**), cuenta DEMO activa. Si expira: estado de lectura `EXPIRADA`; futuras transiciones en B3.

**Recuperación:** URL canónica `/real/empresas/{business_id}/qr-cobros/{intent_id}` hace GET tras F5 y nuevo login. El checkout conserva la misma clave y cuerpo para recuperación por GET y reintento explícito cuando la red devuelve un resultado incierto mientras sigue abierta la sesión. El resguardo duradero del intento antes del POST queda para endurecimiento adicional de B3/B5; no describirlo como si fuera IndexedDB.

**Importe y detalle:** snapshot del servidor fijo, `ARS`, `quantity_milli` y `unit_price_cents` sin redondeos flotantes, descuento total, vencimiento de 15 minutos. Foto actual del catálogo es solo decorativa y puede cambiar, sin alterar datos congelados. El importe del QR no depende de datos ingresados manualmente luego de crearlo. Notas internas no se codifican en el QR.

## Base oficial y alcance B6

Mercado Pago publica Orders API para QR: `POST /v1/orders`, `type: qr`, `items[]`, `external_reference`, `config.qr.external_pos_id`, `config.qr.mode: dynamic`, `X-Idempotency-Key`; el `qr_data` real vendrá de una order emitida por MP. Documentación: https://www.mercadopago.com.ar/developers/es/docs/qr-code/payment-processing. **No intentar pagar el QR B2**: no es `qr_data` del proveedor.

## QA automática incorporada

- Pytest HTTP sin DB: autenticación obligatoria y existencia de contratos OpenAPI.
- Pytest PostgreSQL aislado: cuenta sin vincular, creación, replay único con clave, conflicto con distinto cuerpo, snapshot de dos servicios, 1 intento + 2 líneas, 0 ventas, 0 stock; GET por ID y por solicitud; bloqueo de desvinculación, cancelación, aislamiento entre empresas, otro usuario, trabajador y expiración.
- Node: composición de snapshot sin `payments`, centavos y validación, token Bearer, rutas API, clave idempotente, respuesta de tenant distinto inválida, total alterado inválido y QR externo rechazado.
- Frontend: build, lint y tests existentes (`test:qr` incluye B2). Fullstack y backend CI deberán aprobarse en el SHA final de la etapa.

## Pendiente para próximos bloques

**B3:** laboratorio y eventos auditables, estados idempotentes y reintentos, journal duradero en el cliente para POST ambiguo. **B4:** política transaccional de reserva/stock o compensación ante pago aprobado, vínculo único con venta real QA y comprobante. **B5:** UX y accesibilidad end-to-end. **B6:** OAuth/Orders API, credenciales de prueba, caja/sucursal, webhooks y verificación del proveedor.

No se solicita QA humana parcial. La aceptación manual y auditoría serán de B1–B6 integrados.
