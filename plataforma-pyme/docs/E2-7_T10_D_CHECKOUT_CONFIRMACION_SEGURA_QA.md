# E2-7 · T10-D — Checkout REAL, pagos declarados y confirmación idempotente

**Fecha:** 10/11/2026. **Rama:** `feature/e2-7-t10-pos-ventas-real`. **PR:** [#43](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/43) (**DRAFT / SIN MERGE**).

## Alcance

Se implementó la etapa funcional T10-D sobre el carrito y la política P01 ya aprobados. El POS reconoce los cinco medios declarados `EFECTIVO`, `TRANSFERENCIA`, `CUENTA_DNI`, `TARJETA`, `MERCADO_PAGO_DECLARADO`. **No acredita pagos externos**, no consulta un QR de cobro ni supone que una referencia significa dinero recibido.

### Contratos reutilizados

- `realPosCheckoutDraft.ts`: composición pura de 1–6 medios con importe ARS → centavos sin floats, referencias NFKC y validación T10-A; total de pagos exactamente igual al total después del descuento.
- `RealPosCheckout.tsx`: formulario de pagos/nota, revisión detallada empresa+sede+renglones+precios+subtotal+descuento+total+medios y aceptación humana específica para crear la venta.
- `realSaleWriteCoordinator.ts` de T10-B2: `pending`/ `prepare`/ `recover`/ `sendApproved`. **Obligatorio** reservar el cuerpo original + UUID4 por actor y empresa en IndexedDB y releerlo antes del primer POST.
- `salePendingJournal.ts` de T10-B1: no se borra un intento por timeout, F5, 404 o 409; se exige comprobante que coincida con tenant, actor, request_id, sede, líneas y pagos para cerrar.
- `SaleService` FastAPI y P01 de T10-C: atomicidad de stock físico, snapshots de comprobante, alcance por sede, prohibición de modificar precio/descuento para Encargado/Trabajador, respuesta `201` original, `200` replay y `409` conflicto.

### Estados y controles de seguridad

1. Al montar el POS se **bloquea** el carrito mientras se consulta IndexedDB. Si hay un pendiente anterior, se muestra su UUID4; si IndexedDB falla, el POS queda cerrado a nuevas ventas. Ninguna consulta de montaje envía un POST.
2. Un carrito válido puede declarar pagos mixtos. La **revisión final** captura un comando inmutable; su apertura bloquea edición del carrito y requiere una casilla de consentimiento explícito. Cancelar la revisión permite editar **solo antes de persistir o enviar**.
3. La confirmación exige que la UI esté habilitada en entorno de prueba, el check explícito y `coordinator.prepare(review.body)`. Únicamente cuando la reserva + relectura duradera termina satisfactoriamente se llama a `sendApproved(key,true)` con **el mismo body y clave**. Un bloqueo o error de almacenamiento impide el POST.
4. Tras error de red, aborto, timeout, respuesta incompatible o HTTP `401/403/409/422`, se conserva el intento y se exige consulta `GET /sales/by-request/{key}` antes de un eventual **reenvío manual de la misma solicitud**. **404 es ambiguo** y no permite borrar ni crear una clave nueva automáticamente.
5. Tras `201` o `200`, se verifica que el comprobante coincida con la intención guardada. Si falla el borrado IndexedDB, el recibo confirmado se muestra como confirmado, pero se mantiene la restricción de nueva venta hasta lograr limpieza por GET. No hay fallback DEMO ni almacenamiento de token en IndexedDB.
6. Sólo cuando el journal se ha cerrado y la venta está confirmada se libera el carrito para comenzar otra operación. Mostrar total y pagos como **declarados**, no acreditados.

### Control de habilitación por ambiente (defensa operativa, no de autorización)

La UI usa `VITE_PYME_ENABLE_REAL_SALES === '1'` para habilitar el botón **«Confirmar y registrar venta REAL»**; **por defecto está desactivado en Vite local del usuario**, de modo que se puede revisar el checkout sin mutar TEST Empresa A. **No es un control de seguridad** (cualquier navegador podría llamar a la API), por lo que P01, membresía, asignación y atomicidad siguen impuestos por FastAPI.

`frontend/e2e/playwright.real.config.ts` únicamente habilita ese switch en la ejecución REAL con `PYME_DISPOSABLE_QA=1` y una API en `http://127.0.0.1:18001` con PostgreSQL efímero. Nunca usar credenciales ni DB reales para esos tests.

## Pruebas

- **8 Node nuevas** en `tests/sales-real-checkout.test.mjs`: venta mixta 5×$2000 + 4×$1000 −$2000=$12000; mezcla de pagos, límites, suma exacta, texto de referencia, rechazo de métodos acreditados y normalización.
- **2 Playwright REAL nuevas** en `e2e/real/pos-draft.spec.ts`: consentimiento humano, POST única vez y comprobante en servicio; respuesta `201` perdida tras COMMIT, F5/login y GET de recuperación **sin segundo POST**.
- Se adaptaron los 2 tests originales T10-C para la pantalla de checkout: el precio sigue bloqueado por defecto, el carrito/edición se prueban sin enviar venta y 501 fichas mantienen paginación.
- **CI T10-D COMPLETA Y APROBADA:** [Full-stack #42928402751](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42928402751), commit funcional `f3286c6d500190407294be9d38a5e5399cecbcc9`, **SUCCESS**. **892/892 Pytest** sobre PostgreSQL efímero (**2 advertencias no bloqueantes**), **8/8** pruebas Node checkout, **15/15 Playwright REAL** (incluye las 2 de T10-D) y **6/6 Playwright DEMO**, sin fallos; TypeScript build/Oxlint también aprobados. [Frontend independiente #42928402676](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42928402676) y [Backend Python 3.12/3.14 + Docker #42928402678](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42928402678) también **SUCCESS**. Estos 3 runs verifican el **mismo commit funcional**, antes de actualizaciones documentales.

## Pendientes de aceptación

- **T10-E:** escenarios de producto físico y stock, venta mixta, roles operativos, errores HTTP, conflicto/insuficiencia de stock, navegador F5 y pago mixto; ejecutar sobre empresa y PostgreSQL descartables y comprobar el ledger, unicidad y snapshots.
- **QA visual local sin mutaciones:** revisar selección, total por producto, medios declarados, confirmación deshabilitada y mensajes de ayuda. **No pedir al usuario que registre ventas en TEST Empresa A**.
- **T10-F:** auditoría de seguridad, reconciliación con QA, decisión explícita de habilitar POST REAL fuera de CI y merge con autorización humana. Las reglas futuras de Mercado Pago real/QR de cobro son otro alcance.


## Dictamen T10-D

**T10-D aprobado técnicamente para pasar a T10-E.** La UI de pagos y revisión funciona; la prueba de servicio con POST original y el escenario de pérdida del `201` tras COMMIT se comprobaron con navegador y PostgreSQL **descartables**, sin duplicados. No atribuir estas ejecuciones a datos locales del usuario.

**T10-D NO habilita operaciones de venta en el navegador local por defecto.** Permanecen pendientes la batería ampliada de T10-E (stock físico/ventas mixtas, pagos declarados mixtos, errores 403/409/422, permisos de operador y recuperaciones), la QA manual sin mutaciones y la auditoría T10-F. No fusionar PR #43 ni activar `VITE_PYME_ENABLE_REAL_SALES` en un entorno persistente hasta aceptación explícita.
