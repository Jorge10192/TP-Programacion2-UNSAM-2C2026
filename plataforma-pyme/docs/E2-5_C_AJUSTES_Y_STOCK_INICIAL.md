# E2-5 C — Ajustes de inventario y stock inicial (CU-11)

**Fecha:** 09/11/2026. **Estado:** implementación verificada en CI; pendiente de merge y validación local Windows.
**Base de integración:** `main` `4f992b3beb8dda732e4cd752f828b375f240e13d` (E2-5 B; 826 tests y QA manual).
**Scope:** RF-06 / CU-11, operaciones físicas de un artículo en una ubicación, auditoría, idempotencia y versión de saldo. **No** se tocan frontend, compras, transferencias, ventas ni migraciones anteriores.

## 1. Alcance del comando

Nuevo `POST /api/v1/businesses/{business_id}/inventory/adjustments` con sesión Bearer y `Idempotency-Key` UUID4.

```json
{
  "kind": "AJUSTE_ENTRADA",
  "catalog_item_id": "<UUID DE ARTICULO FISICO>",
  "location_id": "<UUID DE UBICACION>",
  "quantity_milli": 2000,
  "expected_version": 1,
  "reason": "Sobrante identificado en recuento"
}
```

**Tipos autorizados:**

| `kind` | Efecto físico | Restricciones |
|---|---|---|
| `AJUSTE_ENTRADA` | Agrega `quantity_milli` al saldo existente | Motivo, versión del saldo, bien activo y espacio STORE |
| `AJUSTE_SALIDA` | Descuenta `quantity_milli` del saldo existente | Rechaza stock insuficiente, motivo y versión exacta |
| `STOCK_INICIAL` | Crea el primer saldo de un par ubicación+artículo | Solo si **nunca** existieron saldo ni movimientos para ese par; `expected_version: 0`; rol titular/admin |

Cantidad en milésimas positiva `1..999999999`; unidades discretas `UNIDAD`, `PAQUETE`, `CAJA` requieren múltiplos de 1000. El cuerpo es estricto (`extra=forbid`), razón normalizada y obligatoria 3..500 caracteres, `expected_version` es entero estricto (no booleano).

**Decisión expresa:** `AJUSTE_ENTRADA` y `AJUSTE_SALIDA` solo operan sobre un saldo previamente creado (por compra, traslado, inicial). No se crea el primer saldo con un ajuste para eludir el permiso reforzado de `STOCK_INICIAL`. Un par ya utilizado no vuelve a inicializarse **incluso con saldo igual a cero**.

## 2. Control de versión y concurrencia

El cliente **lee primero** `GET /inventory/balances`. El saldo trae `version`:

- Si no existe registro para el par artículo+ubicación, el stock inicial usa `expected_version=0`.
- Si existe, un ajuste debe enviar exactamente `expected_version` que observó.
- Después de un ajuste exitoso la versión aumenta en uno.
- Si una recepción, traslado u otro ajuste cambia el saldo entre lectura y escritura, el comando devuelve **409 Conflict** y **ninguna fila se modifica**; volver a leer el saldo antes de reintentar con una clave nueva.
- Una versión obsoleta no se trata como una operación ejecutada; se rechaza la solicitud. El replay de un comando previamente confirmado con la **misma** clave y cuerpo devuelve su comprobante histórico con 200 incluso si el saldo actual evolucionó.

El backend revalida usuario/sesión, empresa/membresía, estado y capacidad STORE. Bloquea ubicación antes de catálogo (`FOR SHARE`) y saldo (`FOR UPDATE`), coherente con las recepciones y transferencias de E2-4/E2-5 B. El bloqueo por ubicación serializa también el alta inicial con las entradas de compras y traslados de ese mismo depósito; no hay lectura/inserción ciega del balance.

Los saldos, cabecera `InventoryOperation` y **un** movimiento firmado `StockMovement` se confirman en una sola transacción. Un fallo hace rollback; se preserva el ledger histórico. No se crea un doble saldo editable.

## 3. Autorización

- `STOCK_INICIAL`: solo `TITULAR_ADMINISTRATIVO` o `ADMINISTRADOR`, membresía y negocio activos, ubicación propia ACTIVA y `can_store=true`.
- `AJUSTE_ENTRADA` / `AJUSTE_SALIDA`: los anteriores y también `ENCARGADO` **si tiene asignación ACTIVA a esa ubicación**. `TRABAJADOR` no puede ajustar por el impacto del comando en las existencias.
- Cualquier usuario sin autorización, sin sesión o perteneciente a otra empresa no puede producir ni leer operaciones ajenas. La consulta de comprobantes aplica el permiso de lectura empresarial vigente.

## 4. API, historial e idempotencia

| Acción | Resultado |
|---|---|
| `POST /inventory/adjustments` nueva operación | `201` con id, tipo, artículo, ubicación, cantidad, razón, actor, timestamp y movimiento |
| Misma clave, actor, tipo y cuerpo idéntico | `200`, **mismo** id y movimiento, sin nueva variación |
| Misma clave con distinta carga, actor o reutilizada en transferencia | `409`, no hay nueva operación |
| `GET /inventory/adjustments/{adjustment_id}` | `200` comprobante inmutable; `404` si no pertenece al tenant |
| `GET /inventory/movements` | Movimientos existentes + nuevos `AJUSTE_*` y `STOCK_INICIAL`, con delta firmado y origen referencial |
| `GET /inventory/balances` | Nuevo saldo y versión; es la fuente actual de disponibilidad, **no** el comprobante histórico |

Códigos: `401` sin sesión; `403` sin rol/asignación; `404` empresa, ficha o ubicación ausente/ajena; `409` stock insuficiente, inicial ya utilizado, clave incompatible, versión obsoleta, negocio/ubicación inactivos o desborde; `422` formato inválido o fraccionamiento incompatible.

### Compatibilidad

Se reutiliza la migración ya validada `e25a_inventory_ops`. E2-5 C **no exige otra migración**. La tabla soporta exactamente los tipos usados; no se cambia el contrato E2-4 de compras, recibos, `POST /receive`, ni E2-5 B de traslados. La lectura general del ledger ya admite los tres nuevos eventos desde E2-5 B.

## 5. Evidencia y matriz de pruebas

**CI de código E2-5 C verificado:** [GitHub Actions #42616213215](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42616213215), **3/3 trabajos exitosos**: **840 pruebas aprobadas** con Python 3.12 (2 advertencias) y **840** con Python 3.14 (3 advertencias); PostgreSQL 16, `e25a_inventory_ops (head)`, `alembic check` sin deriva, Docker build y liveness saludables. Las advertencias no afectaron el estado de CI; analizarlas como deuda técnica, no ocultarlas. **Ejecución Windows aún pendiente.**


- Postgres FastAPI con rollback `isolated`: inicial positivo, replay y conflicto, veto al segundo inicial incluso tras agotarse saldo a cero, entrada/salida de saldo y ledger firmado, rechazo de cantidad insuficiente, versión obsoleta y cambio de versión posterior a traslado, unidad discreta, rango, campos desconocidos, servicio inmaterial, autorización por rol/ubicación, tenant ajeno, idempotencia compartida con transferencia y compatibilidad de `PurchaseReceiptView`.
- Tres pruebas PostgreSQL con **conexiones HTTP independientes** y tenant efímero propio: dos salidas competidoras de una misma versión (201/409), mismo request simultáneo (201/200), dos iniciales simultáneos (201/409). Sin borrar datos ajenos.
- CI esperado: PostgreSQL 16, `e25a_inventory_ops (head)`, `alembic check` sin deriva, Python 3.12 y 3.14 + imagen Docker.
- Local Windows: tras merge, `git pull`, `alembic current`, `alembic check`, suite completa `RUN_DB_INTEGRATION=1`, `docker compose --profile api up -d --build --wait api` y `/ready`.

**Deuda no incluida:** conteo físico absoluto (`cantidadContada` → delta derivado), ajuste de múltiples artículos/lotes, cancelación compensatoria, límites agregados, política de revisión de ajustes sensibles, conciliación programada de ledger vs balance y hardening contra SQL directo. Un ajuste **no** borra ni modifica registros de compra o transferencia; deja un nuevo movimiento firmado.

## 6. Guía Swagger manual de E2-5 C sin alterar el ejemplo E2-5 B

Datos QA observados después de E2-5 B (verificar primero su vigencia):
- Empresa `3b161aa4-f476-4efc-8293-5978d590e0fe`
- Artículo `e3bcd831-1ae5-48ab-b1c1-0c43e58ae84b` — Alimento balanceado QA
- Depósito `b492ced2-0faa-42d8-b652-609fc4c2b6f4`: **6000**, versión **2**.
- Casa `a741f945-5c88-4855-8ff0-708374ac16f8`: **4000**, versión **1**.

Para probar E2-5 C sin tocar estos saldos, **crear otro artículo de prueba** con SKU nuevo, por ejemplo `INICIAL-E25C-001`, unidad `UNIDAD`, tipo `REVENTA`, y usar Casa para su primera inicialización. `GET /inventory/balances` para ese artículo debe devolver una lista vacía. Luego:

1. `POST /inventory/adjustments`, `kind=STOCK_INICIAL`, artículo nuevo, `location_id=Casa`, `quantity_milli=5000`, `expected_version=0`, `reason="Conteo inicial para pruebas E2-5 C"`, nueva clave UUID4 → **201**, un movimiento `STOCK_INICIAL +5000`.
2. Repetir **misma clave y cuerpo** → **200**, mismo id, saldo 5000 versión1.
3. Nueva clave, mismo `STOCK_INICIAL` → **409**, saldo sin cambio.
4. `AJUSTE_ENTRADA` +2000 con `expected_version=1` → **201**, saldo7000 versión2.
5. `AJUSTE_SALIDA` -1000 con `expected_version=2` → **201**, saldo6000 versión3.
6. Intentar `AJUSTE_SALIDA` -7000 con `expected_version=3` y nueva clave → **409**, saldo y ledger intactos.
7. Intentar ajuste +1000 con `expected_version=1` y otra clave → **409 por versión obsoleta**, saldo y ledger intactos.
8. Consultar movimientos para el artículo: exactamente tres, `STOCK_INICIAL +5000`, `AJUSTE_ENTRADA +2000`, `AJUSTE_SALIDA -1000`, neto **6000**. Los 6000/4000 del alimento balanceado no se modificaron.

**No enviar en reportes ni al repositorio** Bearer tokens, contraseñas o claves idempotentes. Registrar códigos HTTP, IDs de operaciones y snapshots sanitizados. Probar la ruta en Swagger **solo después de fusionar PR y reconstruir Docker**.
