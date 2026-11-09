# E2-5 — Arquitectura, modelo, API e invariantes efectivos

**Ámbito:** código de `plataforma-pyme/backend/` leído en `main` `748e69319d8d04900c009d5184168a264a9deeac`. Solo se describen características respaldadas por el código, las pruebas o las respuestas manuales. Esto **no** es la arquitectura completa del producto.

## 1. Flujo y separación de responsabilidades

```text
Cliente autenticado
  └── /api/v1/businesses/{business_id}/...
        ├── routers FastAPI (contratos, JWT, HTTP)
        ├── services (autorización, validaciones, idempotencia, unidad transaccional)
        ├── modelos SQLAlchemy (business/ubicaciones/artículo/saldo/operación/movimiento)
        └── PostgreSQL 16 (FK, UNIQUE, CHECK, row locks, commit/rollback)
```

Se mantiene la distinción E2-4: **compra registrada ≠ recepción física**. El alta en catálogo tampoco genera stock. E2-5 B traslada cantidades existentes; E2-5 C registra correcciones o primer stock, todos con un movimiento auditable.

### Endpoints vigentes (prefijo `/api/v1`)

| Método | Ruta | Origen / resultado |
|---|---|---|
| `GET` | `/businesses/{business_id}/inventory/balances` | Saldos por empresa; filtros `location_id`, `catalog_item_id`, paginación |
| `GET` | `/businesses/{business_id}/inventory/movements` | Ledger de recepciones, traslados y ajustes/stock inicial; filtros y paginación |
| `POST` | `/businesses/{business_id}/inventory/transfers` | Traslado de un artículo entre dos ubicaciones aptas; `201` nuevo / `200` replay |
| `GET` | `/businesses/{business_id}/inventory/transfers/{transfer_id}` | Comprobante histórico y dos movimientos |
| `POST` | `/businesses/{business_id}/inventory/adjustments` | `AJUSTE_ENTRADA`, `AJUSTE_SALIDA`, `STOCK_INICIAL`; `201` / `200` replay |
| `GET` | `/businesses/{business_id}/inventory/adjustments/{adjustment_id}` | Comprobante de operación manual y un movimiento |
| `POST` | `/businesses/{business_id}/purchases/{purchase_id}/receive` | **Dependencia E2-4**: recepción completa en ubicación STORE; cambia stock una vez |

También se utilizaron `POST /catalog`, `POST /purchases` y `POST /locations` para preparar datos. Todas las rutas de negocio reales requieren autenticación y pertenencia a la empresa.

### Contratos de request esenciales

**Traslado:** `catalog_item_id`, `source_location_id`, `destination_location_id`, `quantity_milli`, `reason`. No se exige `expected_version` para el traslado: el origen se descuenta mediante una **actualización SQL condicional**, y el destino se incrementa con un UPSERT.

**Ajuste/stock inicial:** `kind`, `catalog_item_id`, `location_id`, `quantity_milli`, `expected_version`, `reason`. La versión es estricta y proviene de `GET /inventory/balances`; si aún no existe saldo, `STOCK_INICIAL` utiliza `0`. En ambos POST se exige cabecera de idempotencia UUID4 **cuyo valor deliberadamente no se publica**.

- Cantidad positiva: `1..999999999` milésimas por operación.
- Bien físico `item_type=BIEN`, artículo `ACTIVO`, unidad válida. `UNIDAD`, `PAQUETE`, `CAJA` requieren `quantity_milli` múltiplo de 1000.
- `reason` de 3 a 500 caracteres normalizado; el comando no acepta campos extra.
- Saldos nunca negativos; el máximo de la proyección de `stock_balances` es `999999999999999` milésimas.

## 2. Persistencia e integridad SQL

| Entidad / tabla | Función vigente |
|---|---|
| `InventoryOperation` / `inventory_operations` | Cabecera de `TRASLADO`, `AJUSTE_ENTRADA`, `AJUSTE_SALIDA`, `STOCK_INICIAL`; cantidades, tipo, artículo, dirección, motivo, actor, fecha y solicitud idempotente por empresa |
| `StockMovement` / `stock_movements` | Registro histórico firmado con origen explícito **recepción** o **operación manual**, sin reescribir antecedentes |
| `StockBalance` / `stock_balances` | Proyección actual con clave compuesta empresa+ubicación+artículo, cantidad no negativa, `version` y actualización temporal |
| `PurchaseReceipt` / `purchase_receipts` | **E2-4**, recepción vinculada a compra/líneas; no cambia su contrato por E2-5 |
| `Location`, `LocationAssignment`, `CatalogItem`, `Membership` | Aislamiento por empresa, capacidad STORE, permisos y tipo/unidad activa |

El modelo A incorpora FK compuestas por tenant y tipo de operación, UNIQUE de solicitud por empresa y evento por operación, y CHECK que distinguen direcciones y signos. **No constituye prueba de inmutabilidad frente a un superusuario SQL**; es integridad relativa a las restricciones y a los servicios expuestos.

**Migración aplicada:** `backend/alembic/versions/20261109_0016_inventory_operations.py` con `revision='e25a_inventory_ops'` y `down_revision='e24e_receipt_stock'`. Nueva tabla `inventory_operations`; columnas opcionales `inventory_operation_id`, `operation_kind` en ledger; FK/CHECK de origen ampliadas; se preservan los movimientos existentes de recepción. E2-5 B/C **sin otra migración**.

## 3. Atomicidad y concurrencia

### Traslado E2-5 B

1. Revalidación de sesión y membresía dentro del ámbito de la operación.
2. Búsqueda de solicitud idempotente; replay idéntico devuelve el comprobante original (`200`) sin repetir saldos; carga/actor/operación incompatibles producen conflicto.
3. Bloqueo de **ambas ubicaciones en orden fijo de UUID**; se comprueba estado `ACTIVA`, `can_store=true`, pertenencia y permisos STORE.
4. Bloqueo compartido del catálogo activo (`FOR SHARE`).
5. Descuento condicional sobre origen (`quantity_milli >= solicitado`); saldo ausente/insuficiente ⇒ error, sin parciales.
6. Crédito destino mediante UPSERT PostgreSQL; sube versión del destino o crea versión 1.
7. Inserción de una `InventoryOperation` y **dos** `StockMovement` (`TRASLADO_SALIDA` negativo, `TRASLADO_ENTRADA` positivo), seguidos de **un commit**. Excepción ⇒ rollback.

### Ajustes E2-5 C

1. Revalidación de sesión, empresa, membresía, ubicación y rol; comprobación de permiso STORE.
2. Bloqueo de ubicación; catálogo compartido; saldo `FOR UPDATE` si existe. Se protege el par de operaciones concurrentes con la misma ubicación.
3. **Stock inicial:** solo cuando **no existe saldo ni movimiento previo** para esa combinación artículo/ubicación y `expected_version=0`. Un saldo existente de cantidad cero **no** habilita reinicialización.
4. **Ajustes de entrada/salida:** requieren saldo anterior y `expected_version` coincidente. La salida comprueba cantidad suficiente; la entrada comprueba límite de saldo. Ambos incrementan `version`.
5. Una cabecera manual y **un movimiento firmado** (`STOCK_INICIAL`/`AJUSTE_ENTRADA` positivos; `AJUSTE_SALIDA` negativo) se confirman con la proyección en una sola transacción.

**Control de carrera demostrado por test, no por Swagger:** dos salidas rivales con la misma versión ofrecen 201/409; replay concurrente del mismo comando 201/200; dos cargas iniciales simultáneas 201/409. Para traslados opuestos existen pruebas sin deadlock en el alcance ensayado.

## 4. Roles y permisos

- **Traslado:** rol `TITULAR_ADMINISTRATIVO` o `ADMINISTRADOR` (sin asignación particular) o `ENCARGADO`/`TRABAJADOR` **con asignación ACTIVA en ambas ubicaciones**, siempre `ACTIVA` y `can_store=true`.
- **Stock inicial:** exclusivamente `TITULAR_ADMINISTRATIVO` / `ADMINISTRADOR`, con ubicación apta y membresía/empresa activas.
- **Ajustes:** titular/administrador, o `ENCARGADO` asignado a la ubicación. `TRABAJADOR` **no** está autorizado a crear/quitar stock mediante ajustes manuales.
- Un identificador de recurso ajeno no concede acceso. La API valida tenant y condiciones, y puede devolver `404` genérico para recursos externos.

### HTTP y errores característicos

`201` escritura nueva; `200` lectura/replay exacto; `401` sesión ausente/inválida; `403` permiso; `404` recurso/tenant ausente; `409` saldo insuficiente, doble inicial, versión obsoleta, clave en conflicto, negocio/ubicación inapropiados; `422` cuerpo/UUID/cantidad inválidos. La capa HTTP traduce excepciones del servicio; **un 409 no implica movimiento compensatorio**.

## 5. Compatibilidad y límites del diseño

- E2-5 A conserva las entradas `COMPRA_RECEPCION` con su referencia al recibo y línea; B extiende el DTO común para incluir nuevas clases sin forzar campos nulos en respuestas antiguas; C usa ese ledger.
- **La fuente auditable** son los movimientos; **la proyección actual** son los saldos y versiones. Una lectura de un comprobante histórico no garantiza saldo presente.
- No existe todavía `Venta` backend que descuente estas existencias, ni reversión automática de traslado/ajuste, stock por lote o conteo físico absoluto con reconciliación de diferencias.
- El `reason` es trazabilidad básica; no equivale a doble aprobación, soporte documental o política antifraude.

### Rutas fuente verificables

`backend/app/infrastructure/models/{inventory_operation,stock_movement,stock_balance}.py`  
`backend/app/modules/purchases/{inventory_router,transfer_router,transfer_schemas,transfer_service,adjustment_router,adjustment_schemas,adjustment_service}.py`  
`backend/app/modules/purchases/{receipt_router,receipt_schemas,receipt_service}.py`  
`backend/alembic/versions/20261109_0016_inventory_operations.py`.

## Adenda técnica v1.1 — Concurrencia y semántica de saldo

**Modelo efectivo (síncrono SQLAlchemy `Session`, no `AsyncSession`):** `TransferService.transfer()` toma locks `FOR UPDATE` sobre las **dos ubicaciones en orden de UUID**, valida ubicación/permiso y bien físico, ejecuta el débito condicional de origen y el crédito `UPSERT` en destino, sumando la `version` de los saldos. `AdjustmentService.adjust()` toma `FOR UPDATE` de la ubicación, `FOR SHARE` de artículo y `FOR UPDATE` del saldo, compara la `expected_version` del ajuste antes de modificarlo. Las entradas de compra bloquean también la ubicación.

Si un traslado entra en un depósito entre la lectura del saldo en UI y la confirmación de un ajuste, el ajuste puede **rechazarse con 409 por versión obsoleta de forma intencional**. No demuestra pérdida de stock: evita aplicar una diferencia sobre una cantidad cambiada. El frontend deberá consultar de nuevo el saldo y permitir recalcular o confirmar el ajuste, **nunca cambiar `expected_version` silenciosamente**. Los tests automatizados de concurrencia existente cubren carreras dentro de traslados y dentro de ajustes, además de ajuste posterior a traslado; **no** constituyen una prueba específica intercalada ajuste/traslado en paralelo al mismo destino: se propone como cobertura adicional.

**Dos conceptos distintos:** `STOCK_INICIAL` es un hecho histórico único para cada par (empresa, ubicación, artículo) **sin movimientos previos**; un saldo presente con `quantity_milli=0` no lo rehabilita. Para nuevos ingresos después del agotamiento se usa una compra/recepción, traslado entrante o ajuste positivo justificado; para recuento absoluto se propone un CU futuro que derive el delta sobre la versión observada. Autorizar `STOCK_INICIAL` otra vez al llegar a cero falsearía la semántica del ledger.

No se alteraron endpoints ni migraciones como consecuencia de esta adenda. Los cambios de política y controles estructurales deben debatirse en una entrega posterior. Ver [evaluación externa](13_EVALUACION_OBSERVACIONES_IA.md).
