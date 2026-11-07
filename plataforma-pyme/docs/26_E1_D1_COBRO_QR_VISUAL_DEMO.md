# E1-D1 — Cobro con QR visual DEMO

**Estado:** construido en rama de integración; pruebas locales y navegación pendientes de validar por el equipo.

## Alcance

- Desde **Ventas → Nueva venta**, seleccionar exactamente **un medio Mercado Pago declarado** por el total; el botón «Generar QR DEMO» crea una intención separada, con `businessId`, importe, snapshot de ítems y descuento, cuenta receptora opcional, requestId idempotente y referencia futura a la venta.
- El QR mostrado es **un patrón gráfico ilustrativo deliberadamente no escaneable**. No hay API de Mercado Pago, OAuth, credenciales, interoperabilidad, fondos ni pago real.
- Estados: `PENDIENTE`, `SIMULADO_APROBADO`, `CANCELADO`. Mientras está pendiente no existe venta, saldo ingresado, registro de pago ni salida de stock. Cancelar deja historial de la intención, sin tocar Inventario ni Caja.
- «Simular aprobación (sin cobro real)» usa el mismo gateway que las ventas ordinarias. Vuelve a validar stock, actividad de ubicación, pertenencia de la cuenta y disponibilidad del catálogo; solo entonces crea **una** venta DEMO, cuyo pago Mercado Pago sigue etiquetado *declarado, no verificado*.
- Cada QR tiene un `saleRequestId` estable. Aprobar dos veces o reintentar la operación recupera la misma venta. Una venta QR se representa en el ledger de inventario por sus renglones físicos una sola vez.
- Si el producto se agotó o desactivaron la cuenta mientras el QR estaba pendiente, la aprobación simulada se rechaza sin crear venta; se puede cancelar y generar otro.
- Persistencia compatible: mismo `localStorage` y `version: 1`, con colección nueva opcional `qrIntents`. Se carga después de las ventas para reconstruir una aprobación interrumpida entre escrituras.
- En una empresa B no se puede consultar ni mutar una intención de la empresa A. Cada negocio ve únicamente sus QR.
- El **QR de artículo** sigue fuera de este flujo; nunca realiza ni certifica cobros.

## Corrección adicional en Ventas

El botón de completar saldo ahora **completa el último medio agregado**, manteniendo intactos los importes de los anteriores; valida que no falten importes previos y rechaza un saldo cero o negativo. Se ajustó la distribución de columnas de los selectores.

## Comandos

```powershell
git pull --ff-only origin main
npm.cmd run build
npm.cmd run lint
npm.cmd run test:sales
npm.cmd run test:qr
npm.cmd run test:accounts
npm.cmd run test:cash
npm.cmd run test:inventory
npm.cmd run dev
```

## Casos manuales de aceptación

| ID | Secuencia | Esperado |
|---|---|---|
| QR-01 | Venta con 1 pago Mercado Pago DEMO por total; generar QR | Estado PENDIENTE, empresa e importe exactos, patrón con «no escaneable» |
| QR-02 | Consultar Inventario y Ventas con QR pendiente | Sin venta ni descuento de stock |
| QR-03 | F5 y volver a Ventas | Intención recuperable con su estado |
| QR-04 | Cancelar QR pendiente | Sin venta ni stock; segunda cancelación idempotente |
| QR-05 | Crear otro QR; simular aprobación explícita | Exactamente una venta y una salida por línea física |
| QR-06 | Abrir intención aprobada y volver a simular (o reintentar gateway) | No duplica venta ni stock |
| QR-07 | Cambiar a otra empresa | No muestra ni permite modificar QR de la otra empresa |
| QR-08 | Generar con Efectivo, 2 medios o monto incorrecto | Se rechaza indicando requisitos del QR |
| QR-09 | Desactivar billetera o agotar stock entre intención y aprobación | Bloqueo coherente; sigue PENDIENTE sin venta |
| QR-10 | Completar último medio tras valores en los anteriores | Calcula solo el saldo final, no modifica primer medio |
| QR-11 | Reabrir cierre de caja anterior | Snapshot idéntico; QR no altera caja |
| QR-12 | Probar escritorio y móvil | Campos, botones y visualización legibles |

## Fuera de alcance

QR real legible por apps de pago, integración de vendedores OAuth, órdenes externas, webhooks, conciliación, reservas de stock, reembolsos y seguridad multiusuario. Eso requiere backend y diseño de seguridad posterior conforme ADR-006.

**Advertencia de producto:** jamás usar este QR visual para cobrar a un cliente ni considerar `SIMULADO_APROBADO` como acreditación de dinero.
