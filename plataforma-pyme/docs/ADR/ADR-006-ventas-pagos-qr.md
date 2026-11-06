# ADR-006 — Venta, pagos declarados y QR de cobro
**Fecha:** 2026-11-06  
**Estado:** PROPUESTO para DEMO; integración real MP DIFERIDA a etapa posterior a API.  
**Responsable de aprobación:** equipo del TP / responsable funcional (a designar).  
**Fuentes:** E0-A Z074/Z075, H09/H10, D07/D08; E0-B §8.4–8.5; plan v4 §3 y documento §03_MERCADO_PAGO_QR(1).md§.

## Contexto
POS Z074 propone checkout en dos pasos y Z075 tiene lógica de pagos múltiples no plenamente expuesta. No hay integración acreditada de Mercado Pago en la demo. QR de ficha y QR de cobro son funciones diferentes.

## Decisión propuesta
1. Venta §Sale§ contiene líneas y descuentos validados por servidor en producción; en DEMO gateway recalcula total, nunca toma como autoridad un total arbitrario de UI.
2. Aplicaciones §PaymentApplication§ de **uno o más medios** concilian exactamente al total a pagar en centavos. Las operaciones se expresan en moneda de empresa; anticipos/crédito/devoluciones complejas son extensiones que requieren regla posterior.
3. Venta de bien físico valida existencia y descuenta stock una sola vez; servicio no exige stock ni ubicación de almacenamiento.
4. Un pago **declarado** es registro interno; no equivale a acreditación externa. Billetera digital puede ser compartida y no representa saldo de jornada.
5. QR de ficha de producto, opcional y futuro, abre ficha/permite iniciar selección. **No confirma ni ejecuta cobro**.
6. QR de cobro DEMO se inicia desde venta; intención asociada a businessId/saleId/importe, con estados §PENDIENTE§, §SIMULADO_APROBADO§ y §CANCELADO§ claramente rotulados **DEMO — no mueve dinero**. No incluir botones que aparenten corroborar MP real.
7. Mercado Pago real después: cada empresa conecta **su propia cuenta vendedora** (OAuth gestionado en backend y credenciales protegidas); sucursal/POS de ese seller; Orders API con idempotencia; webhook firmado + consulta al proveedor; conciliación, expiración y reembolso. **Crear QR o recibir webhook no implica confirmar pago**.
8. Mientras QR real está pendiente, proponer reserva de stock con caducidad separada de la salida definitiva; manejar pago tardío/expiración mediante ADR/contrato validado antes de producción.

## Alternativas
- QR fijo de artículo como comprobante: descartado.
- Un único vendedor MP global para varios tenants: descartado.
- Marcar pagado porque frontend pulsó «Ya pagué»: descartado.
- Debitar stock definitivo al emitir QR: descartado.

## Pruebas pendientes
- **DEMO-MON-01 / QA-MON-01:** descuento + 2 medios cuadran al centavo; formatos inválidos rechazados.
- **DEMO-MP-01:** UI indica DEMO; QR pendiente no se suma a cobros reales.
- **QA-MP-01/02/03 (API real):** misma idempotency key, webhooks duplicados/fuera de orden, y seller de A jamás aplican dinero a B.
- Transición de cancelación/expiración sin doble cobro o doble descuento.

## Condiciones previas a MP real
Verificar documentación oficial vigente y habilitación de QR/OAuth/Orders para terceros y cuentas vendedoras argentinas. No compartir secretos en repositorio, chat ni frontend.