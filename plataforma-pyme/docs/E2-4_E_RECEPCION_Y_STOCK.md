# E2-4 E — Recepción completa y stock físico transaccional

**Contrato:** RF-05/CU-07 y primera parte de RF-06/CU-08. Base: E2-4 D, migración \`e24d_purchase_hash\`. Rama aislada \`feature/e2-4e-recepcion-stock\`. El frontend DEMO no está integrado.

## Qué implementa

- \`POST /api/v1/businesses/{business_id}/purchases/{purchase_id}/receive\` con Bearer e \`Idempotency-Key\` UUID4. Cuerpo obligatorio y exclusivo: \`{"location_id":"<UUID>"}\`. No se permite suministrar cantidades parciales, precios, artículos alternativos ni varios destinos.
- Recepción únicamente para compra \`REGISTRADA\` con al menos una línea física; \`CERRADA_SIN_RECEPCION\`, \`RECIBIDA\` o \`CANCELADA\` se rechazan con 409 (excepto replay idéntico).
- Ubicación del mismo tenant, \`ACTIVA\` y \`can_store=true\`. \`can_sell\` no sustituye \`can_store\`.
- Se reaprovecha la política empresarial \`can_operate_at_location(..., operation="STORE")\`: titular/admin con membresía ACTIVA operan en ubicaciones aptas; encargado/trabajador solo con asignación ACTIVA a esa ubicación. Empresa SUSPENDIDA bloquea recepciones nuevas; sesiones revocadas no acceden.
- Compras mixtas: solo las líneas con snapshot \`BIEN\` generan un movimiento cada una; no se ingresan servicios ni conceptos libres. El artículo debe seguir ACTIVO, físico y con la misma unidad guardada en el snapshot, para evitar mezclar unidades incompatibles.
- Una única transacción PostgreSQL bloquea usuario/sesión, empresa/membresía, compra y ubicación, consulta catálogo ordenado, crea Recepción, crea entradas del ledger, aplica UPSERT atómico a los saldos agrupados por artículo y pasa Compra a \`RECIBIDA\`. Error => rollback completo.
- Cada nueva entrada inicial se inserta en \`stock_balances\`; otras suman \`quantity_milli\` y aumentan \`version\`, bajo \`INSERT ... ON CONFLICT DO UPDATE\`. Prohibidos saldos negativos y cantidades mayores al límite de esquema.
- \`purchase_receipts\`: un recibo por compra, clave de reintento única por empresa, hash SHA-256 del cuerpo + purchase_id, autor y destino históricos. Los reintentos exactos del **mismo actor** devuelven HTTP 200 y el primer recibo; clave distinta o cuerpo distinto devuelve 409 y jamás reingresa mercancía. Se conserva una *fotografía de respuesta* \`balances_after\` para que un replay siga siendo idéntico aunque haya recepciones posteriores.
- \`stock_movements\`: ledger de hechos históricos firmados, uno por línea física (sin fusionar descripciones ni unidades históricas); FK compuestas a empresa, ubicación, artículo, recibo, línea histórica y actor, con UNIQUE recibo+lÍnea.
- \`stock_balances\`: proyección de saldo por (business_id,location_id,catalog_item_id), con versión y CHECK de no negativo. No hay stock ficticio al crear Compra/Catálogo/Empresa.
- \`GET /api/v1/businesses/{business_id}/purchases/{purchase_id}/receipt\`: comprobante histórico y movimientos de esta recepción.
- \`GET /api/v1/businesses/{business_id}/inventory/balances\`: saldos actuales paginados con filtros opcionales \`location_id\`, \`catalog_item_id\`.
- \`GET /api/v1/businesses/{business_id}/inventory/movements\`: ledger paginado de entradas físicas. GET propios exigen membresía activa y admiten empresa suspendida solo para lectura. Se prohíbe edición o borrado de movimientos y saldos desde API.

**Integridad de Catálogo:** una vez que existe una línea histórica de compra (o un saldo), su artículo no puede cambiar de \`kind\` ni \`unit\` por PATCH (409); nombre, SKU y datos descriptivos siguen siendo editables sin alterar snapshots. La recepción revalida de todos modos la ficha actual para fallar en forma segura ante cambios hechos por SQL fuera de la API.

## Migración y compatibilidad

Migración aditiva \`e24e_receipt_stock\` sobre \`e24d_purchase_hash\`: crea exclusivamente \`purchase_receipts\`, \`stock_balances\`, \`stock_movements\`, índices/UNIQUE/CHECK/FK compuestas. No modifica ni borra compras, catálogos, ubicaciones o proveedores ya registrados. La compra física de QA \`3e50aff2-c895-49d9-8fe5-d5843438f109\` permanece \`REGISTRADA\` hasta que el usuario decida recibirla desde Swagger.

**Alcance del ledger E2-4 E:** origen único \`COMPRA_RECEPCION\` con FK obligatoria a Recepción. Se ampliará en incrementos de Ventas/OperacionesInventario con FK de orígenes adicionales y CHECK XOR sin crear tablas de ventas ficticias ahora. El lector debe evitar presentar la variante final de tres orígenes como ya implementada.

## Prueba manual recomendada (solo después de merge, migración y CI/local verdes)

1. Confirmar que la compra de QA sigue \`REGISTRADA\`.
2. Listar ubicaciones; seleccionar una \`ACTIVA\`, \`can_store=true\`. Si no existe, crear un depósito real de QA con \`POST /locations\`, tipo \`DEPOSITO\`, \`can_store=true\`, \`can_sell=false\`.
3. Generar nueva \`Idempotency-Key\` UUID4, ejecutar \`POST /purchases/3e50aff2-c895-49d9-8fe5-d5843438f109/receive\` con \`{"location_id": "<UUID-ALMACEN>"}\`. Esperado HTTP 201, estado \`RECIBIDA\`, un movimiento \`+10000\` milésimas y saldo de artículo.
4. Repetir **exactamente la misma clave y cuerpo** => 200, mismo recibo y movimiento, mismo snapshot de respuesta. Clave distinta => 409.
5. Leer \`GET /purchases/{id}\` => estado RECIBIDA, \`GET /receipt\` => mismo recibo, \`GET /inventory/balances\` filtrado por ubicación/artículo => cantidad 10000 (si era saldo inicial 0), \`GET /inventory/movements\` => hecho firmado. La compra de concepto libre \`b6646fcd-428f-4b9b-ab80-83e7ffb14827\` debe rechazar recepción (409).
6. No compartir Bearer tokens ni Swagger Curl completos.

### Fuera de E2-4 E

No incluye recepción parcial/multidestino, devoluciones, venta/descuento de stock, transferencias, ajustes, pagos, cuentas financieras, Mercado Pago ni integración React–API. Lectura de saldo actual y ledger de entradas es solamente el inicio de RF-06. Pruebas automatizadas PostgreSQL incluidas; cierre del informe consolidado del TP al finalizar TODO E2-4, no en este subincremento.
