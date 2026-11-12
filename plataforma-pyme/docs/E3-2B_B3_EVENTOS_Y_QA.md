# E3-2B · B3 — Laboratorio de eventos y recuperación segura de QR

**Rama exclusiva:** `feature/e3-2b-mercadopago-qr-demo`.  
**Estado:** implementación B3 incorporada y sometida a CI; B4–B6 pendientes.  
**Entrega:** única auditoría y QA manual tras integrar B1–B6; no hacer merge parcial a `main`.

## Qué se integró

1. Migración `e32b_qr_events` (revisión posterior a `e32b_qr_intents`) crea la bitácora `qr_payment_events`, con `business_id`, `intent_id`, `event_key`, secuencia, acción, antes/después, usuario y fecha. Unicidad por intento/clave de evento y por intento/secuencia.
2. `CREAR` se registra en el mismo commit que la intención B2; `CANCELAR` en el mismo commit que la cancelación B2. Las escrituras bloquean la fila de intento antes de cambiar estado, evitando transiciones concurrentes divergentes.
3. `GET /api/v1/businesses/{business_id}/qr-payment-intents/{intent_id}/events` devuelve histórico del intento visible, ordenado, sin tokens.
4. `POST /api/v1/businesses/{business_id}/qr-payment-intents/{intent_id}/simulate` acepta `{"action":"APROBAR|RECHAZAR|EXPIRAR|INDETERMINAR"}` y header `Idempotency-Key: UUID4`. Repetición idéntica devuelve 200 y no inserta otro evento; primer evento devuelve 201. Mismo UUID para acción/usuario distintos es 409.
5. UI `/real/empresas/{business_id}/qr-cobros/{intent_id}`: historial auditable más laboratorio de aprobación, rechazo, vencimiento o resultado incierto, con consulta/recuperación. Se distingue visualmente de un pago REAL.
6. POS: el intento QR se persiste en IndexedDB **antes del POST** y se relee para comprobar integridad. Tras F5 y nuevo login, el POS debe recuperar por GET la misma clave/cuerpo, sin crear otra intención hasta resolverla; un GET 404 no borra el intento y requiere reenvío explícito con la misma clave.

## Protección de laboratorio

**Deshabilitado por defecto.** La API simuladora responde 403 excepto si el servidor tiene:

```bash
PYME_ENABLE_QR_DEMO_LAB=1
```

Y solo en instalaciones QA descartables, nunca con cobros reales. La UI habilita los botones exclusivamente si se configuró `VITE_PYME_ENABLE_QR_DEMO_LAB=1` en el proceso de Vite. **Ambas variables** deben estar explícitamente configuradas y el actor debe ser `TITULAR_ADMINISTRATIVO` o `ADMINISTRADOR` en la empresa activa.

La consulta del QR y su historial funcionan sin activar el laboratorio, según permisos del negocio. Usuarios operativos no pueden emitir eventos ficticios desde la API aunque manipulen el frontend. Un usuario no puede leer el intento de otro usuario operativo ni de otro negocio.

## Máquina de estados

| Desde | Acción DEMO | Hacia |
|---|---|---|
| `ESPERANDO_PAGO` | `APROBAR` | `APROBADA_DEMO` |
| `ESPERANDO_PAGO` | `RECHAZAR` | `RECHAZADA` |
| `ESPERANDO_PAGO` | `EXPIRAR` | `EXPIRADA` |
| `ESPERANDO_PAGO` | `INDETERMINAR` | `INDETERMINADA` |
| `INDETERMINADA` | `APROBAR` / `RECHAZAR` / `EXPIRAR` | destino solicitado |
| Finales `APROBADA_DEMO`, `RECHAZADA`, `EXPIRADA`, `CANCELADA` | cualquier nuevo evento | 409 |

Intento con fecha ya vencida no puede aprobarse/rechazarse: solo pasar explícitamente a `EXPIRADA`. El GET sigue calculando `EXPIRADA` para un `ESPERANDO_PAGO` vencido, aunque no haya un evento escrito todavía. La materialización automática periódica de vencimientos no está implementada; la transición con bitácora se registra mediante la acción explícita de laboratorio. Nunca inferir acreditación de un cambio de estado ficticio.

## Límites de esta etapa

- **No existe transferencia de dinero**, consulta a Mercado Pago ni comprobante de cobro externo.
- `APROBADA_DEMO` es un estado de simulación y **no genera Sale**, pago declarado, stock, caja ni movimientos.
- La vinculación sigue siendo DEMO; OAuth y Orders API quedan para B6.
- En B4 se definirá la confirmación transaccional con control de stock y política de compensación/revisión. La aprobación ficticia nunca debe convertirse en acreditación real.
- El diario local guarda el cuerpo comercial en claro dentro de IndexedDB y **no guarda credenciales**: evitar dispositivos compartidos y no borrar manualmente los datos ante respuestas inciertas.

## Pruebas automáticas

- Python/FastAPI: control de sesión, rol, tenant, laboratorio deshabilitado, aprobación, rechazo, cancelación, vencimiento, indeterminación, resolución, idempotencia, auditoría, bloqueo de transiciones contradictorias y ausencia de cambios en `Sale` o `StockMovement`.
- Node: cliente de eventos, envío de headers, rechazo de datos de otro tenant, resultado de red incierto, diario durable y verificación exhaustiva para limpieza tras GET o POST.
- CI: `Plataforma PyME · Backend FastAPI`, `Frontend`, `Inventario REAL full-stack`. Exigir todos verdes para el SHA final de B3; registrar cualquier falla y corrección.

**Siguiente bloque:** B4 — venta REAL en PostgreSQL QA posterior a aprobación simulada, idempotencia y control transaccional de stock, sin acreditar dinero.
