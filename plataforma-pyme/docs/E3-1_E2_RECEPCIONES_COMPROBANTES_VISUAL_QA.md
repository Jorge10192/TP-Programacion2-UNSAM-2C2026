# E3-1E2 — Recepción y comprobantes REAL: vistas independientes

**Fecha:** 2026-11-12  
**Base:** PR #55 / \`feature/e3-1e1-compras-visual-real\` en commit \`f8009b3\`, todavía sin fusionar.  
**Rama:** \`feature/e3-1e2-recepciones-comprobantes-visual\`.  
**Estado:** primera versión para QA, CI y revisión manual; \`main\` sin modificación.

## Objetivo

Completar la navegación visual de Compras REAL usando el mismo patrón aprobado para Empresa, Ubicaciones, Catálogo y Proveedores: una pantalla para el listado, otra para **recibir una compra**, otra para el **comprobante confirmado** y otra para el alta de compra (E3-1E1). No desplegar la recepción ni el comprobante bajo las tarjetas.

## Diseño y comportamiento

- **Listado:** tarjetas y filtros E3-1E1. Pulsar «Pendiente · Confirmar recepción en ubicación» abre la pantalla exclusiva de recepción. «Consultar comprobante» abre la pantalla exclusiva de detalle histórico, utilizando GET del backend y sin enviar recepciones.
- **Recepción:** encabezado empresarial, resumen inmutable de compra (proveedor, fecha, importe, renglones), artículos documentados y aviso visible sobre conceptos sin stock físico. Selector de sede activa habilitada para inventario. La confirmación continúa siendo **completa, una sola sede, no parcial**, con el mismo diálogo explícito y la misma llamada de backend.
- **Comprobante:** vista exclusiva con resumen de ubicación, fecha, **«Registró la compra»** y **«Confirmó la recepción»**, entradas físicas y trazabilidad técnica desplegable. Se conservan snapshots de la compra y los nombres de usuarios resueltos solo cuando lo permite el directorio empresarial. No es factura ni PDF.
- Cada vista incluye «Volver a compras» arriba, sin modificar la URL. El foco del teclado vuelve al encabezado del listado o al botón Volver. Diseño responsive (390 px incluido).
- «Cerrar detalle» sigue disponible en el comprobante como acceso secundario de regreso. El listado se oculta enteramente durante recepción y comprobante.

## Invariantes y seguridad

1. No modificar backend, gateway, endpoint, esquema, permisos, ledger, stock, idempotencia ni migraciones.
2. Solo confirmar recepción con la sede autorizada, usando la clave UUID ya reservada en **IndexedDB**. Reintentar, cuando esté permitido, utiliza estrictamente la **MISMA clave y cuerpo**. El frontend no envía recepción automáticamente al abrir, recargar ni volver de pantalla.
3. **Volver al listado NO elimina la intención de recepción pendiente.** El estado React se cierra, pero el registro en IndexedDB permanece; al abrir la misma compra se recuperan clave y sede originales. Una confirmación existente se verifica antes de repetir. El formulario bloquea edición de sede para una intención recuperada.
4. La comprobación de recibo sigue usando **GET**, y el registro de recepción solamente se descarta del journal cuando el comprobante confirma la misma request_id. No borrar claves automáticamente si la confirmación corresponde a otra solicitud.
5. Confirmar una compra sin recepción no mueve stock; recibir solo crea movimientos físicos permitidos y snapshots confirmados. Conceptos y servicios no crean stock.
6. El usuario que registró la compra puede ser distinto de quien confirmó la recepción. Si su nombre no es consultable por permisos o ausencia histórica, mostrar «Nombre no disponible», sin inferirlo del usuario de sesión.
7. Ninguna prueba debe ejecutar recepciones sobre datos del usuario. QA E2E exige \`PYME_DISPOSABLE_QA=1\` y PostgreSQL descartable.

## Cobertura

- Prueba E2E nueva \`frontend/e2e/real/purchase-receipt-visual.spec.ts\`: una compra con artículo físico y concepto, navegación entre listado, recepción, comprobante y vuelta; cancelar sin POST; confirmar una sola vez; verificar GET/balances/movimientos, recargar y probar 390 px.
- Adaptación de \`frontend/e2e/real/purchases.spec.ts\` para la vista exclusiva durante una lectura lenta de IndexedDB, preservando el bloqueo de controles mientras se recupera una intención y comprobando que la intención de otra compra no se duplica.
- Regresiones existentes \`purchase-ui-persistence.spec.ts\`, \`flow-purchase-to-sale.spec.ts\`, \`test:supply-real\`, build/lint, Chromium E2E, backend y PostgreSQL integrales.

## Revisión manual sugerida

1. Abrir una compra registrada. Verificar que «Recepción de compra» sustituya a las tarjetas, incluya el resumen correcto, la sede y el botón Volver.
2. Seleccionar sede, volver sin confirmar, reabrir: **no** debe existir movimiento nuevo.
3. Consultar un comprobante ya confirmado. Verificar que abre una **vista completa** con los nombres correctos, sin lista detrás y con Volver.
4. Probar una recepción real **únicamente en una empresa/base de pruebas descartable**. Verificar aumento de saldo exactamente una vez, la lectura de movimientos y la posibilidad de volver a consultar sin duplicar nada.
5. Probar redimensionamiento, teclado y estados de error. Si una solicitud resulta incierta, verificar primero comprobante y reabrir la compra para recuperar exactamente la misma clave de recepción.
6. Aprobar el incremento antes de integrarlo. El PR #55 es dependencia y continúa independiente hasta autorización expresa.

## Pendiente de otras etapas

La exportación de un comprobante formal PDF, subida de facturas del proveedor, recepción parcial y rediseños de caja/QR **no están incluidos**. El ajuste global de tipografías/imágenes y optimización del bundle se pospone a una revisión visual transversal.

## Ajuste UX posterior a revisión manual

El usuario validó visual y funcionalmente E3-1E2 (recepción, comprobante y movimientos) y solicitó aclarar el botón al registrar una compra. **Texto final: «Registrar compra»**, acompañado por explicación contigua: al registrarla queda pendiente de recepción; para ingresar mercadería al inventario hay que confirmar la recepción en una sede. Sin cambios de API ni de estado, stock o idempotencia.

En el primer workflow integral del PR se detectó **una única falla de accesibilidad**: después de seleccionar recepción, el botón Volver no recibía el foco cuando la lectura inicial de IndexedDB todavía estaba ocupada. Se ajustó el efecto de foco para esperar la finalización de `busy` antes de enfocar la vista. Los 45 recorridos integrales restantes pasaron; este cambio requiere **nuevo workflow completo en verde** y revisión de los recorridos de compras/recepciones antes del cierre.
