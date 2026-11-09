# E2-6 C — Contrato de implementación de ventas físicas y mixtas

**Rama:** `feature/e2-6-ventas-integradas`. **Base funcional:** E2-6 B, `dc7f16c252b705cf3e4eebc96deaad9058af3468`.
**Validación B Windows aportada:** 864 passed, 1 warning; Alembic `e26a_sales_foundation` sin diferencias. **Estado C:** pendiente de implementar y probar.

## Alcance

- Conservar las ventas de servicios sin ubicación de B, con los mismos contratos de pago y reglas monetarias.
- Aceptar ventas con bienes y ventas mixtas solo en ubicación del mismo tenant, `ACTIVA`, con `can_sell` y `can_store` verdaderos.
- Revalidar usuario, sesión, empresa, membresía y permisos en la transacción. Para operar en la ubicación: `SELL`; para consumir stock físico: también `STORE`. Titular y administrador por rol; encargado y trabajador únicamente con asignación activa, sin permisos implícitos.
- Bloquear empresa/membresía y ubicación antes del catálogo y saldo, respetando el orden de E2-4/E2-5. Bloquear artículos por UUID ordenado. Evitar inversiones de orden de locks con ediciones de catálogo, recepciones, traslados y ajustes.
- Rechazar artículos inactivos, no vendibles, de otro tenant o cantidades fraccionarias en unidades discretas. El servidor calcula precios y totales desde el comando y obtiene snapshots de la ficha vigente.
- Agrupar cantidades de bienes repetidos **solo para descontar stock**. Ejecutar `UPDATE stock_balances ... WHERE quantity_milli >= total_requerido RETURNING` por artículo con orden UUID; incrementar versión solo al descontar correctamente.
- Crear un movimiento `VENTA_SALIDA` negativo **por cada renglón físico**, vinculado por `sale_id` y `sale_line_id`; nunca generar movimiento para servicios. Guardar `balances_after` como snapshot histórico y no como saldo editable.
- Persistir comprobante, renglones, pagos declarados, movimientos, snapshots y saldos **en un único commit**. Ante cualquier error o falta de stock, rollback de todo; ningún comprobante ni pago parcial.
- Conservar idempotencia por `(business_id, request_id)`. Replay idéntico devuelve 200 y misma respuesta sin mutar stock. Payload o actor distintos con la misma clave: 409. Revalidar autorización al replay.
- Medios de pago son DECLARADOS: no acreditar bancos, Mercado Pago, cajas ni cuentas en E2-6 C. No agregar migración si `e26a_sales_foundation` es suficiente.

## Casos de prueba obligatorios antes de declarar C terminado

1. Bien único: 201, saldo decrece, versión +1, movimiento único y snapshot correcto.
2. Mixta: bien + servicio, solo el bien afecta stock.
3. Repetición de bien en varias líneas: suma única de débito, movimiento por línea, centavos HALF_UP por línea.
4. Stock insuficiente, saldo inexistente, ubicación sin SELL/STORE, inactiva o de otro tenant: error sin escrituras parciales.
5. Permisos: titulares/admin; encargado/trabajador con y sin asignación; sesión revocada; empresa suspendida; membresía revocada.
6. Dos ventas simultáneas con claves diferentes por última unidad: exactamente una 201, la otra 409 y un solo débito.
7. Reintento simultáneo con la misma clave: exactamente un comprobante, respuesta histórica coherente y sin doble débito.
8. Intercalación con recepción, transferencia y ajuste del mismo saldo; no saldos negativos ni pérdida de actualizaciones.
9. Fallo SQL después de descontar saldo pero antes del commit: rollback íntegro.
10. Ventas de servicios B siguen funcionando sin regresiones.

## Criterios para el cierre

CI verde Python 3.12/3.14 + PostgreSQL 16, Alembic `current` y `check`, pruebas focalizadas y regresión completa Windows sobre DB temporal. Documentar SHA exacto, resultados reales y advertencias. No abrir PR ni fusionar a `main` hasta cerrar E2-6 D/E y realizar auditoría independiente selectiva.
