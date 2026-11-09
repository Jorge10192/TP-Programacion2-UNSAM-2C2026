# E2-5 A — Modelo de operaciones de inventario y ampliación compatible del ledger

**Fecha:** 09/11/2026 · **Estado:** implementación propuesta en PR, pendiente de CI y validación local.
**Base exacta:** `main` `1a188f9a596f4674ca121806ecb92e6a96abf294` (cierre documental E2-4).
**Ámbito:** RF-06, CU-09 (traslados), CU-11 (ajustes), soporte de CU-07/08 (recepción/lectura). Desarrollo backend solamente, **sin nuevos endpoints HTTP en este corte**.

## 1. Problema que resuelve

En E2-4 E, `stock_movements` registraba únicamente entradas positivas `COMPRA_RECEPCION`, con `receipt_id` y `purchase_line_id` obligatorios. Esa estructura no podía representar una salida, un traslado ni un ajuste sin violar las restricciones SQL. Se conserva la recepción 1:1 **sin rediseñarla**, y se prepara otro origen para futuros movimientos manuales.

E2-5 A crea `inventory_operations` y amplía el ledger de forma aditiva. No traslada, no crea stock inicial real, no corrige existencias y no publica nuevos comandos. La futura actualización de saldos deberá ocurrir **en la misma transacción** que los movimientos; no se deben realizar INSERT directos para operar comercialmente.

## 2. Entidades y restricciones implementadas

### `inventory_operations` — cabecera de una operación manual

| Campo | Regla |
|---|---|
| `id` / `business_id` | UUID de operación y empresa, FK restrictiva |
| `kind` | `TRASLADO`, `AJUSTE_ENTRADA`, `AJUSTE_SALIDA`, `STOCK_INICIAL` |
| `catalog_item_id` / `unit_snapshot` | Bien físico del mismo tenant y unidad histórica de la operación |
| `quantity_milli` | 1..999999999 milésimas; unidades discretas con múltiplos de 1000 |
| `source_location_id` / `destination_location_id` | Ubicaciones FK por tenant; direcciones obligatorias y coherentes con `kind` |
| `reason` | Motivo obligatorio de 3..500 caracteres no vacíos |
| `request_id` / `request_sha256` | Clave por empresa única y huella de 64 caracteres (idempotencia de futuros comandos) |
| `actor_id` / `created_at` | Membresía empresarial y fecha histórica |

Para `TRASLADO` se exigen dos ubicaciones **diferentes**. Para `AJUSTE_SALIDA`, solo origen. Para `AJUSTE_ENTRADA` y `STOCK_INICIAL`, solo destino. Se modela **un artículo por operación básica**; lotes, conteos múltiples y múltiples artículos por comando son futuras ampliaciones.

Se incluye UNIQUE `(business_id,request_id)` y `(business_id,id,kind)`. La última soporta FK de tres columnas desde el movimiento: impide asociar un evento a una cabecera de otra clase o tenant. **El valor enviado al ORM no es por sí solo una prueba de autenticación**: los futuros servicios deberán autenticar, validar permisos, empresa y ubicación, y calcular la huella.

### `stock_movements` — ledger histórico ampliado

Continúa incluyendo `receipt_id` y `purchase_line_id`, ahora **opcionales** para permitir orígenes nuevos. Se agregan `inventory_operation_id` y `operation_kind`, ambos NULL en las entradas ya existentes por recepción, con FK compuesta a `inventory_operations`.

Restricción `ck_stock_movements_origin_and_sign`:

- `COMPRA_RECEPCION`: `receipt_id` y `purchase_line_id` presentes, operación manual ausente, `delta_milli > 0`.
- `TRASLADO_SALIDA`: solo operación `TRASLADO`, delta negativo.
- `TRASLADO_ENTRADA`: solo operación `TRASLADO`, delta positivo.
- `AJUSTE_SALIDA`: solo operación `AJUSTE_SALIDA`, delta negativo.
- `AJUSTE_ENTRADA`: solo operación `AJUSTE_ENTRADA`, delta positivo.
- `STOCK_INICIAL`: solo operación `STOCK_INICIAL`, delta positivo.

Los movimientos deben satisfacer **exactamente uno de los dos orígenes implementados** (recepción o operación manual), con la línea comercial únicamente si es recepción. Se usa `operation_kind IS NOT NULL` para evitar que un `CHECK` SQL acepte `UNKNOWN` por semántica NULL. UNIQUE `(business_id,inventory_operation_id,event_type)` impide duplicar el lado de un traslado simple. El **tercer origen, Venta**, sigue TO-BE; no se crea tabla ficticia.

**Invariantes que requieren los servicios E2-5 B/C:** ambos movimientos de traslado deben existir o ninguno; ubicación, artículo, signo y cantidad del movimiento deben corresponder a su cabecera; no decrementar saldos inexistentes; asegurar orden estable de bloqueos y un único commit; conservar historial ante errores. Las FK y CHECK de este corte son defensas parciales, **no sustituyen los casos de uso transaccionales**.

### `stock_balances` y `purchase_receipts`

**No se modifican**. Se conserva `stock_balances` (cantidad no negativa, versión y clave triple). Las recepciones históricas y sus movimientos no se reescriben. Las claves de idempotencia y los snapshots de E2-4 siguen válidos.

## 3. Migración aditiva y compatibilidad

Archivo: `backend/alembic/versions/20261109_0016_inventory_operations.py`

- Nuevo head: **`e25a_inventory_ops`**, descendiente de `e24e_receipt_stock`.
- `CREATE TABLE inventory_operations`, FK compuestas, UNIQUE y CHECK.
- `ADD COLUMN stock_movements.inventory_operation_id NULL` y `operation_kind NULL`.
- `receipt_id`/`purchase_line_id` pasan a permitir NULL, sin actualizar los valores existentes.
- Dos CHECK legados para entradas de recepción se reemplazan por un CHECK general de origen, clase y signo. Se preserva UNIQUE `uq_stock_movements_receipt_line`.
- Se agrega FK hacia cabecera y UNIQUE por evento.
- La reversión se bloquea **si ya hay alguna operación manual**, para no borrar su origen; nunca usar `downgrade` en la base de trabajo.

No se modifican migrations anteriores, vistas React, endpoints, ventas ni cuentas financieras.

**Compatibilidad de API:** mientras no existan comandos E2-5 B/C, el GET de movimientos continúa devolviendo únicamente recepciones y su DTO E2-4, que exige `receipt_id`. **Antes** de permitir nuevos eventos por HTTP, E2-5 B debe extender la respuesta de lectura sin romper los datos históricos; no insertar operaciones manuales mediante SQL externo para intentar simular el uso final.

## 4. Pruebas previstas

- Contrato de metadatos SQLAlchemy: tabla, columnas, FK por tenant, unicidad y CHECK.
- SQL real PostgreSQL 16: rechazo de dirección inválida, origen=destino, cantidad discreta fraccionaria, tenant ajeno, request repetido, signo incorrecto, evento de tipo incompatible y operación sin `operation_kind`.
- Retrocompatibilidad: registrar y recibir una compra mediante endpoints E2-4, consultar comprobante, movimiento y saldo sin cambio de forma ni cantidad.
- CI con PostgreSQL 16 y Alembic `e25a_inventory_ops` sin deriva, Python 3.12/3.14 y Docker.
- Pruebas locales: ejecutarlas **sin borrar los registros QA**. La prueba con transacción externa revierte los datos que ella misma crea. No hay QA manual de movimientos E2-5 A: todavía no existen endpoints.

## 5. Orden de los siguientes cortes

1. **E2-5 B — Traslados**: endpoint protegido, validación SELL/STORE según política acordada (traslados requieren capacidad STORE en ambos depósitos), permisos por ubicación, descuento condicional sin negativos, entrada concurrente, dos movimientos en una transacción, doble reintento idempotente, HTTP y pruebas de carrera.
2. **E2-5 C — Ajustes y stock inicial**: ajuste justificado positivo/negativo; stock inicial una sola vez por ubicación/artículo bajo regla validada; conteos absolutos con versión observada cuando correspondan.
3. **E2-5 D — Lecturas, reconciliación y robustez**: extender GET de movimientos para orígenes manuales, auditoría por operación, filtros, permisos, hardening de controles SQL y pruebas de consistencia.
4. **E2-5 E — Cierre**: evidencias Swagger, CI, documentación y pruebas locales completas.

**Deuda transversal reconocida:** los tests de integración locales aún utilizan PostgreSQL de desarrollo con rollback por fixture y filtros por tenant; la CI sí usa un contenedor efímero. Aislar una base `pyme_test_db` dedicada (y los tests de concurrencia que actualmente crean tenants comprometidos temporalmente) requiere modificar el entorno/configuración y se abordará como trabajo controlado en E2-5, no con un borrado de datos ni una migración comercial destructiva.

## 6. Reproducción Windows tras integrar

Desde `plataforma-pyme/`, con DB de desarrollo preservada:

```powershell
git switch main
git pull --ff-only origin main
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check

$env:RUN_DB_INTEGRATION = "1"
try {
    .\.venv\Scripts\python.exe -m pytest -q
} finally {
    Remove-Item Env:\RUN_DB_INTEGRATION -ErrorAction SilentlyContinue
}
cd ..
```

**Esperado:** `e25a_inventory_ops (head)`, sin deriva de migración y suite sin fallos. El conteo y duración solo se registrarán como hechos cuando termine CI/Windows, no antes.
