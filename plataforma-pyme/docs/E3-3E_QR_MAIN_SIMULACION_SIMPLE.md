# E3-3E — Dos botones para simular aprobación/rechazo del QR original

## Base exacta

Creado desde `main` commit `5ddfde989d29aba384d2e133d7ff24b0a2435e37`. Esta rama NO reutiliza ni corrige E3-3D y NO modifica la UI ni la imagen QR del panel original. Código de frontend: `RealQrIntentPage.tsx`; su imagen `<img src={intent.qr_png_data_uri}>` permanece intacta. No hay migraciones nuevas.

## Comportamiento

- «**Simular cobro aprobado**» registra un evento `APROBAR` en `qr_payment_events` y transiciona `ESPERANDO_PAGO → APROBADA_DEMO`.
- «**Simular rechazo**» registra `RECHAZAR` y transiciona `ESPERANDO_PAGO → RECHAZADA`.
- Ambas decisiones se ven en la misma página QR principal de `main`, con su PNG, importe, referencia y detalle de artículos.
- **No hay acreditación, comprobante de venta, órdenes Mercado Pago, registro de Sale ni descuento de stock.** Son solo dos resultados **ficticios**, útiles para la presentación sin depender de credenciales de Mercado Pago.
- La respuesta viene del backend, no de un estado React inventado. Persiste y el historial permite comprobarlo tras F5.
- Solo un titular/administrador con acceso a la empresa puede simular; el backend valida sesión, rol, tenant, vigencia, estado e idempotencia. No se puede aprobar un QR rechazado ni volver a decidir sobre uno resuelto.
- No se activa el laboratorio anterior `/simulate` ni el cierre `/finalize-demo` en el sitio público.

## Habilitación

El modo actual `PYME_QR_EXHIBITION_ENABLED=1` en FastAPI y `VITE_PYME_QR_EXHIBITION=1` en frontend son suficientes; se reutilizan las banderas de exhibición existentes de `main`. Las variables de laboratorio/cierre QA y Mercado Pago deben permanecer en `0`.

## Prueba local simplificada

El proyecto puede correr sobre el PostgreSQL local habitual, sin crear empresas ni bases nuevas durante la instalación de esta rama. **Para ver una pantalla QR necesita existir una empresa y al menos un artículo**, igual que en `main` antes de este cambio.

- Seleccionar esta rama desde `origin/feature/e3-3e-qr-main-simulacion-simple`, compilar y levantar FastAPI y Vite con los flags de exhibición existentes.
- Generar un QR de exhibición desde POS con datos de prueba; verificar visualmente que la imagen PNG original se muestra junto con los dos botones.
- Aprobar uno; debe mostrar «Cobro simulado aprobado» y el evento en historial tras refrescar; no debe haber ventas ni stock movido.
- Generar otro e intentar rechazo; debe mostrar «Rechazo simulado», evento persistido y sin ventas ni stock movido.
- Un segundo usuario sin acceso a esa empresa no puede usar el endpoint.

## QA

- Pytest: `test_qr_exhibition_decision.py` con PostgreSQL CI QA, rollback transaccional.
- Node: `qr-main-exhibition-decision.test.mjs`, incluido en `npm run test:qr`.
- CI debe aprobar backend, frontend, Docker y navegador antes de merge.

## Publicación

Rama independiente y PR en borrador. No integrar a `main` ni desplegar a Render hasta probar y aprobar. No requiere credenciales de Mercado Pago reales ni TEST.
