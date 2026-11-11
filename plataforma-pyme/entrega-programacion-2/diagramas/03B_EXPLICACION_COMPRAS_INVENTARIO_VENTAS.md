# 03B — Guía de clases: compras, recepciones, inventario y ventas

**Proyecto:** Asistente PyME — Plataforma generalista de gestión multiempresa y multirrubro  
**Materia:** Programación 2 — UNSAM (2C2026)  
**Versión:** 2.1 — **E2-7 / T12-C3**, aprobada y publicada en la rama documental  
**Fecha de corte documental:** 11 de noviembre de 2026  
**Referencia funcional:** `main` en `c6a77137cf82dcb9aad225645e84b1265b1da3ec` (integración T11, PR #45)  
**Documento rector:** [03 — Modelo de dominio y diagramas UML](../03_MODELO_DE_DOMINIO_Y_UML.md), versión 2.1 aprobada en la rama documental de PR #46  
**Diagrama complementario:** [03A — Identidad, empresas, sedes, catálogo y proveedores](03A_EXPLICACION_IDENTIDAD_EMPRESAS_CATALOGO.md), versión 2.1 / T12-C2  
**Fuente editable:** [03B_CLASES_COMERCIO_E_INVENTARIO.puml](03B_CLASES_COMERCIO_E_INVENTARIO.puml)  
**Lámina vectorial:** [03B_COMERCIO_INVENTARIO_REDISENADO.svg](03B_COMERCIO_INVENTARIO_REDISENADO.svg).

> **Alcance:** documentación **AS-IMPLEMENTED** de los módulos comerciales efectivamente persistidos en PostgreSQL, no una propuesta de nuevas tablas ni una ejecución de pruebas. Esta entrega sustituye la edición conceptual **v0.3 TO-BE**. El 03B describe hechos comerciales, saldos y trazabilidad; el 03A describe identidades, permisos, sedes, artículos y proveedores. **Los tres archivos fueron aprobados y publicados en la rama documental de PR #46; no se realizó merge a `main`.**

![03B — Compras, recepciones, movimientos y ventas](03B_COMERCIO_INVENTARIO_REDISENADO.svg)

## 1. Para qué sirve el 03B y cómo interpretarlo

El objetivo es demostrar cómo la plataforma registra **una compra sin crear existencias automáticamente**, **la recepción física de esa compra**, **una modificación justificada de stock** y **una venta confirmada**. Todos esos hechos se aíslan por empresa y conservan datos históricos que no se deben volver a calcular con el catálogo actual.

La fuente PlantUML contiene **nueve clases comerciales persistentes** y cuatro enumeraciones conceptuales de valores restringidos, además de **cinco clases de referencia al 03A**; estas últimas *no son tablas nuevas*. El SVG editorial muestra las nueve clases principales y sintetiza las asociaciones transversales mediante una banda de orígenes del ledger. Para evitar un dibujo ilegible, no enumera las 19 tablas del sistema ni todas las FK a cada modelo externo.

**Diferencia esencial:** el 03B es un **diagrama UML de clases** (relaciones y responsabilidades), **no un DER generado desde PostgreSQL**. La posterior visualización ER de la base, por ejemplo con DBeaver, es un objetivo independiente **post-T12**. Los atributos del UML están nombrados conceptualmente en español; la columna SQL exacta aparece en la correspondencia siguiente.

## 2. Correspondencia clase UML ↔ SQLAlchemy ↔ PostgreSQL

| Clase UML | ORM | Tabla real | Responsabilidad principal |
|---|---|---|---|
| `Compra` | `Purchase` | `purchases` | Alta de adquisición sin ingreso físico inmediato. |
| `DetalleCompra` | `PurchaseLine` | `purchase_lines` | Renglón histórico (bien, servicio o concepto libre) y total calculado. |
| `Recepcion` | `PurchaseReceipt` | `purchase_receipts` | Confirmación **única y completa** de bienes físicos, a una sede. |
| `Venta` | `Sale` | `sales` | Comprobante confirmado, totales y snapshot de saldos. |
| `DetalleVenta` | `SaleLine` | `sale_lines` | Renglón vendido con precio, cantidad, tipo y descripción históricos. |
| `AplicacionPago` | `SalePayment` | `sale_payments` | Medio e importe **declarados**, sin acreditar fondos externos. |
| `OperacionInventario` | `InventoryOperation` | `inventory_operations` | Traslado, ajuste de entrada/salida o stock inicial justificado. |
| `MovimientoInventario` | `StockMovement` | `stock_movements` | **Ledger** de deltas firmados y origen comprobable. |
| `SaldoInventario` | `StockBalance` | `stock_balances` | Existencias actuales por empresa–sede–artículo, con versión. |

**Contexto importado del 03A:** `Empresa` (`Business`), `Ubicacion` (`Location`), `ArticuloCatalogo` (`CatalogItem`), `Proveedor` (`Supplier`) y `Membresia` (`Membership`). Un identificador `business_id` es la clave de separación de tenant; `Proveedor` ya está **implementado**, no es TO-BE. `SolicitudIdempotente` **no** se incluye porque **no existe** una tabla persistente genérica con ese nombre.

### 2.1 Diccionario de atributos que no conviene confundir

| UML | Columna / contrato real | Matiz relevante |
|---|---|---|
| `Compra.requestId` y `requestSha256` | `purchases.request_id`, `request_sha256` | `request_sha256` admite `NULL` a nivel modelo por compatibilidad; nuevas altas calculan hash. |
| `Compra.proveedorNombreSnapshot` | `purchases.supplier_name_snapshot` | String no nulo; vacío cuando no se eligió proveedor. |
| `DetalleCompra.numeroLinea`, `articuloId` | `purchase_lines.line_number`, `catalog_item_id` | Número entre 1 y 30; artículo **opcional solo en CONCEPTO libre**. |
| `DetalleCompra.tipoSnapshot` | `purchase_lines.kind_snapshot` | **`BIEN`, `SERVICIO`, `CONCEPTO`**; NO `ELABORADO/REVENTA/INSUMO`. |
| `DetalleVenta.tipoSnapshot` | `sale_lines.kind_snapshot` | **`BIEN` o `SERVICIO`**; artículo obligatorio. |
| `DetalleCompra.skuSnapshot` / `DetalleVenta.skuSnapshot` | `purchase_lines.sku_snapshot`, `sale_lines.sku_snapshot` | String no nulo; se almacena cadena vacía cuando no hay SKU. |
| `Recepcion.balancesAfter` | `purchase_receipts.balances_after` | JSONB arreglo para replay histórico; **no** saldo vigente alternativo. |
| `OperacionInventario.cantidadMilli` | `inventory_operations.quantity_milli` | Cantidad positiva de la operación; no existe columna `cantidad_milli_snapshot` separada. |
| `OperacionInventario.unidadSnapshot` | `inventory_operations.unit_snapshot` | Unidad física congelada. |
| `MovimientoInventario.tipoOperacionOrigen` | `stock_movements.operation_kind` | Participa en la FK compuesta con la operación y su tipo. |
| `MovimientoInventario.detalleCompraId` | `stock_movements.purchase_line_id` | Origen por **renglón físico** de recepción. |
| `MovimientoInventario.detalleVentaId` | `stock_movements.sale_line_id` | Origen por **renglón físico** de venta. |
| `Venta.balancesAfter` | `sales.balances_after` | Snapshot después de la venta, no fuente de inventario. |
| `AplicacionPago.numeroSecuencia` | `sale_payments.payment_number` | Secuencia entre 1 y 6, única dentro de la venta/empresa. |
| `AplicacionPago.referencia` | `sale_payments.reference` | String no nulo, vacío por defecto; no es número bancario verificado. |
| `SaldoInventario` | `stock_balances` | **PK triple** `(business_id, location_id, catalog_item_id)`; `version` comienza en 1. |

La clasificación comercial original de `CatalogItem.kind` (`ELABORADO`, `REVENTA`, `INSUMO`, `SERVICIO`) sí está en el 03A; el snapshot `kind_snapshot` en un detalle representa su **comportamiento físico** (`BIEN`/`SERVICIO`) o la ausencia de artículo (`CONCEPTO` en compra). Esta distinción evita documentar columnas y restricciones inexistentes.

## 3. Relaciones, multiplicidades y alcance de las FK

| Relación | Cardinalidad de un registro válido por API | Sustento y precisión |
|---|---|---|
| `Compra — DetalleCompra` | **1 → 1..30** líneas | FK `(business_id,purchase_id)`, numeración única; el mínimo de líneas lo impone el contrato de comando. |
| `Compra — Recepcion` | **1 → 0..1** recepción | `uq_purchase_receipts_business_purchase`; no hay recepción parcial/multidestino. |
| `Proveedor — Compra` | **1 proveedor → 0..*** compras; **compra → 0..1** proveedor | Proveedor opcional, FK empresarial; su nombre queda congelado al registrar. |
| `Venta — DetalleVenta` | **1 → 1..30** líneas | FK empresarial y número único por comprobante. |
| `Venta — AplicacionPago` | **1 → 1..6** pagos declarados | FK y número secuencial; el límite/mínimo se valida en la API. |
| `OperacionInventario — MovimientoInventario` | **1 → 1 o 2** movimientos | Traslado: exactamente dos; ajustes/stock inicial: uno, por creación controlada en servicio. |
| `Recepcion — MovimientoInventario` | **0..1** recepción por movimiento; **0..*** movimientos por recepción | Solo líneas físicas `BIEN`, con FK por recepción y detalle. |
| `Venta — MovimientoInventario` | **0..1** venta por movimiento; **0..*** movimientos por venta | Solo líneas físicas; FK triple a `sale_lines` identifica la venta y línea. |
| `MovimientoInventario → SaldoInventario` | **Sin multiplicidad de FK directa** | Dependencia **transaccional** por triple empresa–ubicación–artículo, no FK de movimiento a una PK de saldo obligatoria. |

**No leer las líneas del UML como garantía SQL de todos los mínimos.** En PostgreSQL no hay un CHECK de padre que cuente automáticamente los renglones hijos; el servicio crea el agregado completo. De igual modo, no se afirma que una FK de `purchase_line_id` pruebe por sí sola que la línea corresponda a la compra de `receipt_id`: la selección del agregado y su consistencia se controlan al ejecutar la recepción.

**Aislamiento:** las FK compuestas con `business_id` impiden varias referencias físicas cruzadas, y los servicios deben autorizar la sesión, membresía y sede. **Una FK válida no otorga permiso.**

## 4. Compras: registrar no significa recepcionar (RF-05, CU-06)

`Purchase` guarda empresa, proveedor opcional, nombre histórico del proveedor, fecha, autor, estado, referencia, notas, total e idempotencia. `PurchaseLine` conserva descripción, tipo, unidad, SKU, cantidad y costo acordado. La API **calcula** el total sumando las líneas individualmente redondeadas.

**Flujo actual:** se registra una compra con artículos físicos y/o servicios/conceptos sin elegir todavía destino. En esta operación **no se crea `StockMovement` ni se altera `StockBalance`**. El destino se decide después, en la recepción.

| Estado permitido por `ck_purchases_status` | Significado real |
|---|---|
| `REGISTRADA` | Hay al menos un bien físico pendiente de recepción. |
| `RECIBIDA` | Se confirmó la recepción física completa en una sede. |
| `CERRADA_SIN_RECEPCION` | Solo servicios/conceptos; nunca se crean movimientos de recepción. |
| `CANCELADA` | **Estado admitido por el CHECK, sin endpoint público de cancelación en el corte T11.** No inventar transición. |

Una compra mixta solo recepciona los renglones `BIEN`. El proveedor debe pertenecer a la empresa y estar activo al registrar la compra; una modificación posterior de su nombre **no reescribe** `supplier_name_snapshot`. Un concepto libre carece de `catalog_item_id`, y no debe convertirse en un artículo físico implícito.

## 5. Recepción: un ingreso físico, una sede y un commit (CU-07)

`PurchaseReceipt` relaciona una compra `REGISTRADA` con **una sola ubicación ACTIVA con capacidad STORE**. La autorización operativa por sede se comprueba en el servicio: titulares/administradores pueden operar sin asignación individual; encargados/trabajadores requieren la asignación habilitante según la política correspondiente.

1. Revalidar sesión, empresa, membresía, compra y capacidad STORE de la sede elegida.
2. Bloquear/verificar la compra y confirmar que aún no exista recepción previa.
3. Identificar **todas** las líneas físicas de la compra y revalidar su unidad/tipo aplicables.
4. Insertar la recepción (`request_id`, hash, actor, fecha, `balances_after`) y acreditar saldos por artículo con UPSERT seguro.
5. Insertar un `StockMovement` de tipo `COMPRA_RECEPCION` **por renglón físico**, con `receipt_id` y `purchase_line_id`.
6. Marcar la compra `RECIBIDA` y confirmar **todo junto**; cualquier excepción implica rollback.

El índice `uq_purchase_receipts_business_purchase` constituye la última barrera contra una segunda recepción para esa compra. `balances_after` preserva los saldos/versiones *devueltos en la respuesta original* aunque el inventario cambie después. No es un saldo editable.

**No implementado:** recepción parcial, múltiples sedes para una misma compra, recepción de insumos vinculada automáticamente a recetas, conciliación de pago de compra.

## 6. Inventario: operación, movimiento y saldo son conceptos distintos (RF-06)

### 6.1 Operación de inventario (`inventory_operations`)

`InventoryOperation` registra una acción manual identificable, justificada e idempotente. Sus campos `source_location_id` y `destination_location_id` son opcionales en el modelo pero la restricción `ck_inventory_operations_direction_locations` les exige una combinación según `kind`:

| `kind` | Sede origen | Sede destino | Eventos | Consecuencia |
|---|---|---|---|---|
| `TRASLADO` | Obligatoria | Obligatoria y distinta | `TRASLADO_SALIDA`, `TRASLADO_ENTRADA` | Dos deltas opuestos; variación neta 0. |
| `AJUSTE_ENTRADA` | NULL | Obligatoria | `AJUSTE_ENTRADA` | Ingreso justificado. |
| `AJUSTE_SALIDA` | Obligatoria | NULL | `AJUSTE_SALIDA` | Egreso justificado, exige saldo suficiente. |
| `STOCK_INICIAL` | NULL | Obligatoria | `STOCK_INICIAL` | Primera carga controlada sin historial previo. |

La cantidad `quantity_milli` es **positiva** en la operación; el signo se expresa mediante el **delta** del movimiento. Tanto la unidad como el artículo y las sedes se validan. No se admite un traslado a la misma sede.

**Permisos vigentes:** para ajustes positivos/negativos, el servicio permite titular/administrador/encargado bajo políticas STORE; `TRABAJADOR` no realiza ajustes. Para `STOCK_INICIAL`, solo titular/administrador. Los traslados y recepciones requieren capacidad STORE en las sedes involucradas y autorización efectiva por ubicación. La autorización es lógica de aplicación y no una propiedad de un CHECK SQL.

**Conteo físico y `expected_version`:** el comando de ajuste lleva una versión observada para rechazar saldos que cambiaron concurrentemente; **`expected_version` no es columna de `inventory_operations`**. Si el conteo coincide con el saldo observado no corresponde generar un movimiento ficticio.

### 6.2 Libro histórico de movimientos (`stock_movements`)

El ledger almacena hechos de stock *con signo*. La restricción `ck_stock_movements_origin_and_sign` comprueba que **tipo de evento, identificadores de origen y signo** se correspondan, no simplemente que una de tres FK sea distinta de NULL.

| `event_type` persistido | Origen obligatorio | Delta | Efecto |
|---|---|---|---|
| `COMPRA_RECEPCION` | `receipt_id` + `purchase_line_id` | Positivo | Bien recibido. |
| `TRASLADO_SALIDA` | `inventory_operation_id` + `operation_kind=TRASLADO` | Negativo | Se descuenta del origen. |
| `TRASLADO_ENTRADA` | Misma operación y clase | Positivo | Se acredita al destino. |
| `AJUSTE_ENTRADA` | Operación de tipo `AJUSTE_ENTRADA` | Positivo | Ajuste justificado. |
| `AJUSTE_SALIDA` | Operación de tipo `AJUSTE_SALIDA` | Negativo | Ajuste justificado. |
| `STOCK_INICIAL` | Operación de tipo `STOCK_INICIAL` | Positivo | Carga inicial. |
| `VENTA_SALIDA` | `sale_id` + `sale_line_id` | Negativo | Bien físico vendido. |

Las FK compuestas verifican tenant, y `fk_stock_movements_operation_kind_tenant` vincula incluso la **clase de la operación manual**. Las unicidades `uq_stock_movements_receipt_line`, `uq_stock_movements_operation_event` y `uq_stock_movements_sale_line` impiden duplicaciones según su origen. **No hay una columna `motivo` genérica en `stock_movements`:** el motivo de una operación manual se encuentra en `inventory_operations.reason`.

**Ledger auditable** significa que las aplicaciones no deben reescribir movimientos antiguos para corregir existencias; una corrección necesita un nuevo hecho autorizado. No implica afirmar que PostgreSQL tenga un trigger genérico que haga a todas las filas físicamente inmutables frente a cualquier acceso privilegiado.

### 6.3 Saldos transaccionales (`stock_balances`)

La **PK de tres partes** `(business_id, location_id, catalog_item_id)` identifica el saldo único de un bien en una sede y empresa. SQL exige `quantity_milli` no negativa y una `version` positiva. Una fila todavía inexistente se interpreta como cero al intentar una salida. Para una primera entrada el servicio utiliza UPSERT concurrente; para descontar, condiciones atómicas de disponibilidad, por ejemplo `UPDATE ... WHERE quantity_milli >= cantidad`.

Al registrar un movimiento, el saldo materializado y el ledger se actualizan en el mismo commit. El saldo no se considera un artículo editable libremente ni se debe recontar en el frontend para aplicar cambios. La conciliación lógica esperada es:

```text
Saldo actual (empresa, sede, artículo)
    = suma de delta_milli de sus movimientos confirmados
```

Esta conciliación es un **invariante sistémico conservado por los servicios**, no un CHECK SQL que agregue filas históricas. La validación de versiones y las pruebas de concurrencia deben utilizar PostgreSQL real y sesiones independientes.

## 7. Ventas y pagos declarados (RF-07, CU-10)

### 7.1 Venta y sus renglones

`Sale` persiste **solo `CONFIRMADA`**; no hay una entidad SQL de carrito o borrador comercial. `SaleLine` guarda su artículo obligatorio y los snapshots de nombre, clase física, unidad, SKU, cantidad y precio pactado. Tiene números de línea 1 a 30.

**Flujo de venta REAL del backend:**

1. Verificar sesión y membresía activa en empresa ACTIVA; validar autorización para la ubicación de la venta.
2. Comprobar que el catálogo esté ACTIVO, sea `sellable` y que unidades/cantidades sean compatibles.
3. Aplicar **política de precio por rol (T10/T11)**: `ENCARGADO` y `TRABAJADOR` no pueden cambiar precio de lista ni aplicar descuentos. Para ellos se exige `catalog_items.price_cents` no nulo y coincidencia exacta. El backend vuelve a validar, independientemente del estado de inputs en React.
4. Calcular el total de **cada línea** con HALF_UP y luego el subtotal y descuento. Comprobar que la suma de pagos declarados coincide con el total.
5. Agrupar cantidades de un mismo bien físico **solo para controlar y descontar stock**; preservar cada línea y su importe histórico.
6. Para venta física: exigir sede con **SELL + STORE** y stock suficiente, con asignación ACTIVA del operario cuando corresponda.
7. Insertar venta, líneas, aplicaciones declaradas, movimientos de `VENTA_SALIDA`, actualización de saldos y `balances_after` en **una única transacción**; si falta stock, no queda venta ni pago parcial.

**Venta solo de servicios:** no produce egreso físico y puede omitir sede únicamente para titular/administrador. Un rol operativo sin sede no puede confirmar venta. **Venta mixta:** descuenta únicamente los bienes `BIEN`, no los servicios ni sus insumos de manera automática.

### 7.2 Medios declarados (`sale_payments`)

| Medio persistido | Significado |
|---|---|
| `EFECTIVO` | El operador declaró efectivo. |
| `TRANSFERENCIA` | Declaración de una transferencia, no conciliación bancaria. |
| `CUENTA_DNI` | Declaración de medio CUENTA DNI. |
| `TARJETA` | Declaración de cobro por tarjeta. |
| `MERCADO_PAGO_DECLARADO` | Declaración manual; **no** comprobante de QR o webhook confirmado. |

El total comercial puede distribuirse entre **1 y 6** medios declarados positivos. El número de secuencia es único dentro de la venta. **No existen aquí cuentas financieras de empresa, caja diaria persistida, settlement de pagos ni conexión OAuth/QR REAL de Mercado Pago.** Esas integraciones quedan para un incremento posterior a T12.

### 7.3 Consultas y visibilidad de ventas

La consulta histórica no da permisos irrestrictos al autor. Titular/administrador pueden consultar ventas de la empresa bajo su membresía; encargado/trabajador solo ven ventas de sedes a las que actualmente tienen asignación ACTIVA. Una revocación puede quitar visibilidad sobre ventas anteriores. La lectura de stock tiene sus propias reglas; no es correcto extrapolar automáticamente la política de ventas a todo inventario.

## 8. Aritmética monetaria exacta y límites

Los importes son **enteros de centavos**, las cantidades son **enteros de milésimas de la unidad del artículo** y se aplica redondeo **HALF_UP por renglón**.

```text
line_total_cents = floor((quantity_milli × unit_price_or_cost_cents + 500) / 1000)
Compra.total_cents = Σ PurchaseLine.line_total_cents
Venta.subtotal_cents = Σ SaleLine.line_total_cents
Venta.total_cents = subtotal_cents - discount_cents
Σ SalePayment.amount_cents = Venta.total_cents
```

Ejemplo matemático ilustrativo: tres renglones por separado de `0,333` unidad a `10,50` por unidad (1.050 centavos) generan **350 centavos por línea y 1.050 centavos en total**. Si se agruparan `0,999` unidades y recién después se redondeara, el total sería **1.049 centavos**. Por eso el backend **agrupa cantidades físicas para stock**, pero **no fusiona los renglones para facturar**.

`PurchaseLine` admite costo unitario 0 y el encabezado puede tener total 0. `SaleLine` admite precio por línea 0 como bonificación, pero `Sale` requiere **subtotal y total final estrictamente positivos**. Para artículos discretos (`UNIDAD`, `PAQUETE`, `CAJA`; y `SERVICIO`/`CONCEPTO` donde corresponda), la cantidad debe ser múltiplo de 1.000 milésimas. SQL controla la aritmética de cada línea; la suma de múltiples filas y pagos se verifica en la capa de aplicación.

## 9. Idempotencia real por agregado; no existe tabla genérica

La identidad del comando se envía en `Idempotency-Key` como UUID y se guarda en su entidad correspondiente:

| Comando | Persistencia del `request_id` y hash | Regla observable |
|---|---|---|
| Crear compra | `purchases`, UNIQUE `(business_id, request_id)` | Replay mismo actor+cuerpo; otro contenido/actor entra en conflicto. |
| Confirmar recepción | `purchase_receipts`, UNIQUE `(business_id, request_id)` | Replay de la recepción ya confirmada; no vuelve a ingresar stock. |
| Trasladar / ajustar / stock inicial | `inventory_operations`, UNIQUE `(business_id, request_id)` | Replay de la operación, sin segundo movimiento. |
| Confirmar venta | `sales`, UNIQUE `(business_id, request_id)` | Replay del comprobante sin nueva salida ni pago. |
| Crear empresa | `business_creation_requests` con PK `(actor_user_id, idempotency_key)` | Mecanismo propio del alta empresarial; está documentado en 03A/Documento 03. |

El **par** `request_id` + `request_sha256` y la validación del actor ayudan a distinguir un reintento legítimo de una reutilización conflictiva de clave. Estas unicidades se aplican **por tabla/agregado**, no como una clave global única entre compra y venta. Los hashes de solicitud no son hashes de contraseña ni acreditaciones de dinero.

**Si se confirma en DB pero se pierde la respuesta HTTP**, el cliente debe recuperar el resultado existente, **no volver a crear la transacción**. En ventas el backend expone consulta por `request_id`: `GET /api/v1/businesses/{business_id}/sales/by-request/{request_id}`. La guía no supone que toda pantalla ya implemente una recuperación automática tras timeout. La verificación UX previa a reintentar y los mensajes de error tipados son tareas post-T12.

## 10. Integridad: restricciones PostgreSQL frente a reglas de servicio

| Regla crítica | Implementación / límite |
|---|---|
| Compra por solicitud | `uq_purchases_business_request`, más digest/actor en servicio. |
| Recepción única por compra | `uq_purchase_receipts_business_purchase`, más bloqueo y estado en servicio. |
| Evento por línea física | `uq_stock_movements_receipt_line` y `uq_stock_movements_sale_line`. |
| Evento por operación | `uq_stock_movements_operation_event`, más `operation_kind` coherente. |
| Origen y signo del movimiento | `ck_stock_movements_origin_and_sign`; exige combinaciones permitidas de identificadores/tipo/signo. |
| Saldos no negativos/versionados | `ck_stock_balances_quantity_nonnegative`, `ck_stock_balances_version`; `UPDATE` condicional/UPSERT. |
| Dirección de traslados y ajustes | `ck_inventory_operations_direction_locations` y verificaciones de sede, permisos y catálogo. |
| Precisión por línea | `ck_purchase_lines_half_up_total`, `ck_sale_lines_half_up_total`; servicio calcula en centavos. |
| Venta confirmada y total coherente | `ck_sales_status_confirmed`, `ck_sales_positive_total_equals_subtotal_minus_discount`. |
| Pagos y suma total | `sale_payments.method` restringido en `ck_sale_payments_declared_method`; **suma entre pagos** validada por servicio. |
| Multiempresa | FK compuestas por `business_id` y consultas tenant-scoped; permiso autorizado en cada servicio. |

En particular, una base correctamente relacionada **no elimina** el riesgo de autorización si el servidor omite validar permisos. Y un CHECK sobre `Sale` no verifica automáticamente la suma de N registros `SalePayment`.

## 11. Concurrencia y casos de error relevantes

**Dos ventas de la última unidad:** el servidor debe permitir que una confirme y otra falle sin stock negativo. El rechazo se produce **sin venta, pagos ni movimientos parciales**. La diferencia entre hacer un SELECT y un `UPDATE` condicional atómico es fundamental para demostrar por qué el saldo es seguro.

**Dos recepciones de una compra:** una única recepción puede persistir, incluso si las solicitudes tienen claves distintas; no se acepta acreditar dos veces la misma compra física.

**Saldo inicialmente ausente:** egreso físico sin fila equivale a 0 y falla; ingreso positivo inicial usa UPSERT concurrente.

**Traslado más venta concurrente:** se debita origen y acredita destino dentro del mismo commit que registra los dos hechos de traslado; una venta competidora no debe dejar inconsistencia.

**Conteo con versión obsoleta:** `expected_version` no coincide y el servicio rechaza la operación. El router de ajustes devuelve **409** con texto «Version de saldo obsoleta o saldo inexistente», no un campo `code: STALE_BALANCE_VERSION` confirmado.

**Accesos de otra empresa / sede:** un UUID válido de un negocio ajeno no habilita operación; un colaborador sin asignación activa a STORE/SELL no accede a esa función en esa ubicación.

Estos son **escenarios de verificación y evidencia**. Este trabajo documental no ejecuta nuevas pruebas de carga, Pytest, Playwright ni migraciones: no presentarlo como un nuevo resultado CI de T12-C3.

## 12. API REST relacionada con el modelo

Prefijo común: **`/api/v1/businesses/{business_id}`**. La información de alta, edición y permisos de proveedores/catálogo/sedes reside en 03A.

| Operación REAL documentada | Método y ruta | CU |
|---|---|---|
| Crear y consultar compras | `POST /purchases`, `GET /purchases`, `GET /purchases/{purchase_id}` | CU-06 |
| Recepcionar y consultar comprobante | `POST /purchases/{purchase_id}/receive`, `GET /purchases/{purchase_id}/receipt` | CU-07 |
| Traslado y consulta | `POST /inventory/transfers`, `GET /inventory/transfers/{transfer_id}` | CU-09 |
| Ajuste y consulta | `POST /inventory/adjustments`, `GET /inventory/adjustments/{adjustment_id}` | CU-11 |
| Confirmar / listar / consultar ventas | `POST /sales`, `GET /sales`, `GET /sales/{sale_id}` | CU-10 |
| Recuperación de venta por comando | `GET /sales/by-request/{request_id}` | CU-10 |

**Nota de rutas:** esta selección no pretende ser el inventario completo de la API del proyecto. Las consultas de saldos/movimientos y administración de otros recursos se describen en sus módulos y documentos contractuales; no agregar endpoints imaginarios de cancelación, caja o QR externo.

## 13. Relación con 03A, Documento 03 y la futura visualización de la base

El 03B **no duplica** las clases de negocio del 03A. Para toda operación, su `business_id` delimita la empresa; `catalog_item_id` referencia una ficha real; `location_id` representa una sede con capacidades; `supplier_id` es opcional para compras; `created_by_id` / `actor_id` se asocian a la membresía del tenant.

El Documento 03 v2.1 es la fuente rectora de las definiciones, el 03A muestra las entidades base, el 03B muestra los hechos comerciales y el 03C mostrará casos de uso y actores. Tras T12 se propone generar **un DER físico desde PostgreSQL real** con una herramienta como DBeaver, sin migrar la base ni reemplazar los UML por un diagrama de tablas ajeno a los contratos implementados.

**Sobre el SVG:** es un diseño editorial **semánticamente equivalente** a las nueve clases centrales del PUML, no un resultado exportado automáticamente por PlantUML. Las asociaciones desde `Recepcion` y `Venta` hacia `MovimientoInventario` se representan en la banda inferior de trazabilidad para evitar líneas que atraviesen las tarjetas. `Empresa`, `Proveedor`, `Ubicacion`, `ArticuloCatalogo` y `Membresia` figuran como contexto proveniente del 03A, no como nuevas persistencias del 03B.

## 14. Decisiones pospuestas — no confundir DEMO con REAL

- **Convergencia REAL/DEMO:** conservar operaciones y seguridad del backend, acercar la navegación, estética, validaciones visuales y secuencias de uso del frontend REAL a las pantallas DEMO existentes.
- **Demostración web/móvil:** preparar una experiencia React/Vite responsive y reproducible para uso docente y pruebas en navegador o teléfono, sin que ello certifique un despliegue público seguro.
- **Diagrama ER del esquema real:** derivarlo de PostgreSQL con DBeaver, dbdiagram u otra herramienta; es representación física adicional, no sustitución de este UML.
- **Mercado Pago QR REAL:** cada empresa conectará su **propia cuenta**; distinguir **QR de artículo** (identificación/enlace) de **QR de cobro** (transacción), confirmar pagos mediante proveedores/webhooks verificados e implementar idempotencia específica. `MERCADO_PAGO_DECLARADO` hoy **no hace ese trabajo**.
- **Caja, gastos, cuentas financieras, reservas/pagos con seña y automatismos de consumo de insumos:** pueden figurar en la DEMO o en el plan, pero no se atribuyen a estos nueve modelos persistentes sin código/migración y pruebas adicionales.

La inclusión de esta hoja de ruta **no cambia los criterios de aceptación académica** ni autoriza trabajo funcional sobre el repositorio durante T12-C3.

## 15. Preguntas clave para la defensa oral

**¿Por qué separar Compra de Recepcion?** Porque adquirir no significa disponer físicamente. La compra conserva el compromiso y la recepción representa el ingreso de bienes en una sede concreta, con fecha y actor.

**¿Por qué hay `StockMovement` y `StockBalance`?** El primero es el historial auditable de eventos; el segundo es la proyección consultable y bloqueable. Se sincronizan atómicamente, sin duplicar una fuente de verdad editable.

**¿Qué impide doble recepción o doble venta por reintento?** Unicidades SQL por agregado y clave de comando, verificación de digest/actor y una sola transacción. La doble recepción también se restringe por compra.

**¿Qué protege contra sobreventa?** Descuento condicional con saldo suficiente en PostgreSQL y rollback íntegro en caso de conflicto.

**¿Por qué los precios y descripciones son snapshots?** Para no reescribir comprobantes históricos cuando el catálogo o proveedor cambian. El precio unitario de venta de roles operativos además se valida contra catálogo en el backend.

**¿Por qué `MERCADO_PAGO_DECLARADO` no equivale a Mercado Pago QR?** Porque declarar el medio manualmente no consulta ni verifica una orden de cobro del procesador externo. La integración real requiere credenciales por empresa, verificación de notificaciones, estados de pago y conciliación.

**¿Qué patrones se pueden defender?** Service Layer, Repository donde existe, manejo transaccional mediante la sesión SQLAlchemy, snapshots históricos e idempotencia/replay. No afirmar que existen clases GoF `State`, `Memento` ni una implementación universal de `UnitOfWork` cuando el código no las exhibe.

## 16. Matriz de trazabilidad y comprobaciones del entregable

| Área | Requisito / CU | Tabla / evidencia de código | Resultado documental esperado |
|---|---|---|---|
| Compra | RF-05 / CU-06 | `Purchase`, `PurchaseLine`, servicio de compras | No ingreso físico al crear; snapshot y estados correctos. |
| Recepción | RF-05 / CU-07 | `PurchaseReceipt`, `StockMovement`, `StockBalance` | Una recepción física por compra, una sede STORE, entrada por línea. |
| Inventario y consulta | RF-06 / CU-08 | `StockBalance`, `StockMovement` | Triple de stock y ledger, historial y conciliación. |
| Traslado | RF-06 / CU-09 | `InventoryOperation`, dos movimientos | Salida y entrada atómicas, neto cero. |
| Ajuste/conteo | RF-06 / CU-11 | `InventoryOperation`, versión del saldo | Roles, motivo y control de concurrencia. |
| Venta | RF-07 / CU-10 | `Sale`, `SaleLine`, `SalePayment` | Comprobante confirmado, pagos declarados y egreso físico atómico. |
| Contexto | RF-01..05 / 03A | `Business`, `Membership`, `Location`, `CatalogItem`, `Supplier` | Tenant, permisos, sede, catálogo y proveedor reales. |

**Lista de aceptación T12-C3 (se completa tras revisión):**

- [x] Están modeladas las **9 entidades comerciales persistentes**.
- [x] El PlantUML declara 4 estados de compra, 4 tipos de operación, 7 eventos de ledger y 5 medios de pago declarado.
- [x] El diagrama/guía no inventan una tabla SQL `SolicitudIdempotente`.
- [x] Se identifica `Purchase.request_sha256` como nullable en el modelo y `kind_snapshot` con tipos correctos.
- [x] Se explican `operation_kind`, los identificadores por línea y la regla de origen/evento/signo del movimiento.
- [x] Se distinguen SQL CHECK/FK/UNIQUE de validaciones transaccionales del servicio.
- [x] Se distingue pago declarado de QR acreditado; se conservan los objetivos post-T12.
- [x] El SVG editorial es legible; las 156 etiquetas `<text>` tienen atributo `fill` explícito y conservan su diseño aprobado.
- [ ] Validar sintaxis del `.puml` con un **motor PlantUML** (si no está disponible, consignarlo sin inventar resultado).
- [x] Revisión humana y **aprobación expresa** de los tres archivos para sustituirlos en PR #46.
- [x] Actualizar **solo** `.puml`, `.svg` y esta guía en `docs/e2-7-t12-cierre-academico`; verificar commit y referencias, sin tocar `main`, frontend, backend ni DB.

**Dictamen:** **T12-C3 APROBADO Y PUBLICADO EN RAMA DOCUMENTAL**, derivado del corte funcional T11 y compatible con el Documento 03 v2.1/03A v2.1. El PR #46 permanece DRAFT; no se fusionó a `main`. La compilación con PlantUML continúa pendiente por falta del ejecutable en este entorno. El siguiente incremento documental es **T12-C4 — 03C, casos de uso**.
