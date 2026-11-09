# E2-5 B — Transferencias físicas atómicas entre ubicaciones

**Fecha:** 2026-11-09 · **Estado:** backend validado en CI; pendiente de merge y ejecución local Windows.
**Base:** E2-5 A, commit de main `4268846abc524ebd827b4da930ef58d8d9789ac7`, migración `e25a_inventory_ops`.
**Alcance:** RF-06, CU-09. Solo backend, datos del tenant, permisos STORE y trazabilidad; no se construye UI React ni ajustes CU-11.

## Flujo del comando

**POST `/api/v1/businesses/{business_id}/inventory/transfers`** (Bearer + `Idempotency-Key` UUID4). Request:

```json
{
  "catalog_item_id": "<UUID ARTICULO FISICO>",
  "source_location_id": "<UUID DEPOSITO ORIGEN>",
  "destination_location_id": "<UUID DEPOSITO DESTINO>",
  "quantity_milli": 4000,
  "reason": "Reposicion de exhibicion"
}
```

Los UUID deben pertenecer **a la misma empresa**; ambos depósitos distintos, `ACTIVA` y `can_store=true`. El usuario debe poder operar STORE en ambos: titular/administrador con membresía activa, o encargado/trabajador asignado activamente a **cada una**. Una ubicación `can_sell=true` pero `can_store=false` no sirve para transportar stock. Catálogo físico ACTIVO; cantidad en milésimas, entera y positiva. UNIDAD/PAQUETE/CAJA: múltiplo de 1000. La solicitud debe incluir un motivo normalizado de 3–500 caracteres.

### Pasos técnicos

1. Revalidar usuario, sesión revocable, empresa y membresía dentro de la transacción, como en Compras/Recepciones.
2. Buscar clave de idempotencia del mismo tenant; si coincide actor+carga, devolver el **mismo traslado** y ambos movimientos con HTTP 200, sin recalcular saldos. Si no coincide, 409.
3. Validar empresa ACTIVA; bloquear los dos depósitos en **orden fijo de UUID** para evitar deadlocks por traslados opuestos; comprobar pertenencia, estado y permiso STORE.
4. Bloquear catálogo con `FOR SHARE`, confirmar tipo físico, unidad y cantidad.
5. Descontar del saldo de origen mediante UPDATE condicional `quantity_milli >= solicitado`; un saldo inexistente cuenta como cero → 409. No crear saldo negativo ni descontar parcialmente.
6. Sumar al destino mediante PostgreSQL `INSERT … ON CONFLICT DO UPDATE`, con cantidad+versión atómicas; controles SQL del límite de cantidad.
7. Persistir **una** `InventoryOperation(kind=TRASLADO)` y **dos** movimientos trazables: `TRASLADO_SALIDA` = `-quantity_milli` en origen y `TRASLADO_ENTRADA` = `+quantity_milli` en destino.
8. Confirmar un único commit: saldos, cabecera y ambos movimientos. Ante error, rollback total.

**Saldo total de empresa:** la suma de los dos saldos no cambia por el traslado. No hay compra, venta, pago ni movimiento de efectivo.

**Respuesta:** 201 al crear; 200 para replay idéntico; 401 sesión inválida; 403 sin permiso STORE; 404 empresa/ubicación/ítem/traslado inexistente o ajeno; 409 empresa suspendida, destino inhabilitado, stock insuficiente o clave distinta; 422 UUID/cantidad/cuerpo no válido. Una clave nueva es una **nueva operación** y se vuelve a validar disponibilidad.

El **GET `/api/v1/businesses/{business_id}/inventory/transfers/{transfer_id}`** devuelve cabecera y movimientos históricos de un traslado; no reconstruye los saldos actuales, que se consultan en `GET /inventory/balances`. El estado de depósitos tras el traslado puede cambiar sin alterar el comprobante.

### Compatibilidad histórica

Se conserva `POST /purchases/{purchase_id}/receive` y `GET /purchases/{purchase_id}/receipt` con el esquema E2-4 intacto. El GET general `/inventory/movements` ahora acepta tanto `COMPRA_RECEPCION` como entradas y salidas de traslado. Los campos opcionales del origen ausente se omiten de la respuesta para conservar la forma de los movimientos de recepción ya validada en E2-4. No se reescriben movimientos existentes.

**Sin migración nueva en E2-5 B:** se utiliza `e25a_inventory_ops`; no modifica tablas, FOREIGN KEY ni CHECK históricos de E2-4.

### Pruebas y límites

`tests/test_transfer_api_integration.py` cubre traslado 10→6/4, respuesta persistida, replay sin duplicar, clave con carga distinta, rechazo por origen insuficiente sin cambios parciales, unidades físicas y discretas, servicios no transferibles, ubicación ajena o inhabilitada, permisos de encargado/trabajador y lectura inter-tenant. Tres pruebas de concurrencia real con conexiones HTTP/PostgreSQL independientes verifican: (i) dos transferencias competidoras de 7 unidades desde un stock de 10: solo una se confirma (201 y 409), (ii) mismo UUID4 en dos pedidos paralelos: 201 y 200, una sola operación, (iii) transferencias opuestas de ubicaciones A↔B: ambas 201, sin deadlock ni pérdida de stock. `tests/test_transfer_concurrency_integration.py` utiliza un tenant temporal propio y limpieza restringida a ese tenant; la base QA preexistente se conserva.

**No implementado en este corte:** ajuste positivo/negativo (E2-5 C), stock inicial, transferencias de múltiples artículos, recepciones parciales, reversión compensatoria, consumos por venta/producción, conciliación SQL periódica, front React conectado. Aunque el movimiento es histórico e inaccesible por PATCH/DELETE en la API, el hardening ante modificaciones SQL directas se sigue debiendo.

### Reproducción manual sin alterar el depósito QA existente hasta estar listo

Después de merge, reconstruir la API Docker para exponer la nueva ruta y validar `/ready`. Para probar Swagger, crear **un segundo depósito QA** con `can_store=true`. Con el producto existente `881fdae2-18c5-46ae-8037-44a500ca96c0`, el depósito de origen `2d6761c4-efec-4b3e-925c-a24ceab8ce9c` parte de **10 unidades** según último GET manual E2-4. Antes de transferir, **verificar saldo actual**: no asumir que sigue siendo 10 si hubo otras operaciones.

Probar un traslado de `quantity_milli=4000` solo si hay 10 unidades. Esperado: origen 6000, destino 4000 y dos movimientos con suma cero. Repetir **la misma clave y cuerpo**: 200, sin nuevas entradas. Otra clave/traslado superior al disponible: 409, sin cambios. Compartir únicamente respuesta y código HTTP **sin Bearer ni claves**. No utilizar las cuentas/cómputos fuera del entorno QA.

### Validación automatizada local

Desde `plataforma-pyme/` (tras merge en `main`):

```powershell
git switch main
git pull --ff-only origin main
cd backend
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
$env:RUN_DB_INTEGRATION = "1"
try {
    .\.venv\Scripts\python.exe -m pytest -q
} finally {
    Remove-Item Env:\RUN_DB_INTEGRATION -ErrorAction SilentlyContinue
}
cd ..
docker compose --profile api up -d --build --wait api
```

Esperado `e25a_inventory_ops (head)`, Alembic sin deriva y tests aprobados. **CI verificado en [GitHub Actions #42602232103](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42602232103)**: 3/3 trabajos exitosos; **826 pruebas** en Python 3.12 y **826** en Python 3.14 (PostgreSQL 16); `e25a_inventory_ops (head)`, `alembic check` sin deriva; imagen Docker y liveness aprobados. **Windows aún no ejecutado para E2-5 B**, no se lo presenta como validado. No borrar ningún volumen Docker.
