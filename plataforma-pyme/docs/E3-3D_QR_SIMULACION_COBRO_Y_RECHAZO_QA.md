# E3-3D — QR sintético: simular cobro o rechazo (sin Mercado Pago)

## Propósito
Rama nueva desde `main` en el commit `5ddfde9`: agregar en QR público de exhibición dos botones explícitos. No se reutiliza la rama E3-3C ni se toca `main` hasta aprobar QA.

- **Simular cobro**: acción administrativa ficticia. Genera un único comprobante de venta en la empresa seleccionada, registra líneas y pago `MERCADO_PAGO_DEMO_QA` *interno*, y descuenta stock, todo en una transacción PostgreSQL con el estado de QR y la auditoría. **No hay fondos, orden real ni conexión a Mercado Pago**.
- **Simular rechazo**: cambia el intento a `RECHAZADA` y agrega un evento de auditoría. No genera venta ni mueve stock.
- Ambos botones se renderizan solamente al seleccionar un QR vigente y con rol Titular/Administrador. Un intento resuelto no puede volver a cobrarse.
- El QR continúa siendo **no pagable**: escanearlo no sirve para transferir dinero.

## Aislamiento y seguridad
- Activación doble exclusivamente para esta funcionalidad:
  - `PYME_QR_EXHIBITION_ENABLED=1` (backend)
  - `PYME_QR_EXHIBITION_SIMULATION_ENABLED=1` (backend)
  - `VITE_PYME_QR_EXHIBITION=1` y `VITE_PYME_QR_EXHIBITION_SIMULATION=1` (build frontend)
- `PYME_ENABLE_QR_DEMO_LAB=0`, `PYME_ENABLE_QR_FINALIZATION_QA=0`, `PYME_DISPOSABLE_QA=0`; toda integración Mercado Pago permanece `0`. Nunca configurar credenciales productivas del proveedor en Render.
- Nuevo POST autenticado y tenant-scoped `/api/v1/businesses/{business_id}/qr-payment-intents/{intent_id}/exhibition-simulation`, con `Idempotency-Key` UUID v4 y `{ "action": "COBRAR" | "RECHAZAR" }`.
- El servidor valida rol, estado, vencimiento, tenant y ausencia de órdenes externas.
- Cobro serializado con bloqueo de fila, `sale_key_for_intent` determinística, protección de reintento por la misma clave y actor, vínculo 1:1 venta-QR. Saldo de stock y snapshot son verificados por el servicio de ventas existente.
- Rechazo no usa el endpoint antiguo `/simulate` ni puede dejar una venta parcial.
- Si hay fallo de stock u otro conflicto de venta, la aprobación simulada y el intento de venta se revierten. El QR no queda 'pagado' si el stock no alcanza.
- No usar credenciales, datos financieros ni empresas reales: solo cuentas y datos ficticios, porque el esquema Supabase tiene RLS desactivado con Data API apagada.

## QA antes de merge/despliegue
1. **Revisión estática**: `npm run build`, `node --test tests/qr-exhibition-simulation.test.mjs`, Pytest `test_qr_exhibition.py` y `test_qr_exhibition_simulation.py`.
2. **Pruebas con PostgreSQL CI QA** (nunca la base Supabase pública): rol, empresa ajena, idempotencia, no órdenes Mercado Pago, no doble venta y rechazo sin movimientos.
3. **Manual luego del merge aprobado**: En Render, publicar la versión nueva por *Manual Deploy* (no está habilitado autodeploy). Crear un artículo con stock, generar un QR ficticio y pulsar «Simular cobro». Verificar un único registro nuevo en `sales`, `sale_lines`, `sale_payments` y movimiento de stock asociado a empresa y sede; el QR debe quedar `FINALIZADA`. Reabrir y comprobar mismo comprobante sin venta duplicada.
4. Generar otro QR y elegir «Simular rechazo». Verificar estado `RECHAZADA` y ausencia de una nueva venta o salida de inventario. Comprobar que otro usuario de distinta empresa no pueda operar ese QR.
5. En caso de error, **no repetir con una clave nueva**; consultar el estado original y el historial antes de reintentar.
6. Probar con stock insuficiente: el intento de cobro debe responder conflicto/revisión y no crear venta ni descontar parcialmente.

## Fuera de alcance
Una operación con **credenciales reales de Mercado Pago** no se habilita en esta rama ni en la web pública. Requeriría un circuito separado, de uso restringido, permisos de vendedor titular, conectividad HTTPS/webhooks, comprobación de pagos efectivamente acreditados y controles de cancelación/reintegro. Un token TEST y un token productivo no son equivalentes.

## Publicación
El archivo `render.yaml` configura los nuevos indicadores, pero está en una rama de revisión; la página pública actual sigue sin cambios. Las credenciales de Supabase ya existen en Render; no enviarlas al chat ni a GitHub. **No integrar o desplegar sin CI y autorización.**
