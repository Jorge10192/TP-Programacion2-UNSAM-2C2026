# E2-7 · T10-B2 — Coordinador de creación y recuperación idempotente (sin interfaz de POST)

**Rama:** `feature/e2-7-t10-pos-ventas-real`. **PR #43:** borrador; `main` sin cambios T10.

## Qué implementa

`frontend/src/features/sales/realSaleWriteCoordinator.ts` separa cuatro operaciones explícitas:

- `pending()`: lectura local del intento aislado por **actor y empresa**.
- `prepare(body,key?)`: validación T10-A y persistencia IndexedDB del **mismo cuerpo normalizado y UUID4** con lectura posterior, sin solicitudes HTTP; un intento anterior bloquea otro con contenido diferente.
- `recover(signal?)`: solo `GET /businesses/{businessId}/sales/by-request/{key}` para el intento guardado. Si devuelve comprobante coincidente, intenta cerrar la fila; si HTTP **404**, devuelve `not-found`, **sin borrar ni reintentar POST**. Un 404 no acredita inexistencia de la primera venta.
- `sendApproved(key,true,signal?)`: requiere consentimiento explícito del llamador (la UI de confirmación humana será T10-D), clave UUID4, lectura y nueva verificación del journal; solo entonces permite un `POST /sales` con el cuerpo original y su `Idempotency-Key`. Los errores HTTP 401/403/404/409/422 y de red no borran el registro. Una respuesta POST inválida es **resultado incierto** y exige recuperar por GET antes de decidir. Para `201/200`, el comprobante debe coincidir con la empresa/actor/clave, sede, renglones, pagos, notas y totales del comando.

**Si el comprobante está confirmado pero falla la limpieza local**, se devuelve `confirmed` con `journalCleared=false`: no se informa erróneamente una venta como no confirmada; se conserva el registro para recuperación. Nunca se hace replay automático por F5, timeout o error 404. Un reintento debe partir de una nueva confirmación humana, con clave y cuerpo **idénticos**. No existen fallback DEMO, generación de nueva clave tras error ni almacenamiento de Bearer.

**Límite importante:** el mecanismo es una librería/gateway, **no está conectado a la pantalla React**. El usuario todavía **no puede registrar una venta mediante este incremento**. La política P01 de precios/descuentos por rol sigue pendiente; deberá imponerse en FastAPI antes de conectar el botón de confirmación.

## Verificaciones T10-B2

`frontend/tests/sales-real-write-coordinator.test.mjs` añade 12 pruebas:

- Preparación sin llamadas HTTP y resguardo de clave/cuerpo.
- Rechazo sin confirmación, clave ajena o journal ausente.
- POST explícito con Bearer en memoria, `Idempotency-Key` original y comprobante auténtico.
- Replay `200` y error `409`, conservando el registro cuando el backend rechaza.
- Respuesta POST inválida y pérdida de red: resultado incierto, sin repetición.
- GET `404` ambiguo sin borrar, recuperación tras F5/nuevo login mediante GET sin POST.
- Rechazo de comprobante con tenant/actor/importe alterado.
- Fallos de lectura/reserva de IndexedDB bloquean la escritura.
- Comprobante confirmado con fallo de borrado local mantiene el intento sin duplicar la venta.

**Evidencia automática del último commit:** pendiente de completar cuando GitHub Actions termine; no atribuir aprobación integral a un run anterior. `npm.cmd run test:sales-real-write` ejecuta la suite. Las pruebas T10-A (11) y B1 (12) aprobaron localmente o en CI; aún corresponde verificar B2.

## Siguientes puertas

- Implementar P01 en backend y probar intento de bypass por API: **no** basta ocultar precio o descuento al trabajador.
- Antes de mostrar POS y habilitar envíos: catálogo completo por paginación, sede asignada, compra/venta física vs servicio, revisión humana y estados de recuperación comprensibles.
- T10-E: Playwright REAL + base descartable para respuesta POST perdida, F5, replay explícito 200, ausencia de dobles movimientos de stock/pago y regresión DEMO.
- Mantener **PR #43 DRAFT** y no fusionar a `main` antes de T10-F.
