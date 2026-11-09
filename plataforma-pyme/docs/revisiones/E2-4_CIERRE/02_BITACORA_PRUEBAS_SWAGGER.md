# Bitácora de pruebas manuales de uso — E2-4

**Fecha:** 08/11/2026 · **Herramienta:** Swagger UI (FastAPI/OpenAPI) · **Host:** `http://127.0.0.1:18000` · **API base:** `/api/v1` · **Empresa QA:** `bd4d4e42-4ff6-403a-8633-59cbc001487d`.

> **Criterio de evidencia:** todo código HTTP indicado como *observado* fue transcripto de las respuestas comunicadas por el desarrollador. Se omiten valores reales de `Idempotency-Key`, su reflejo en `request_id`, contraseñas, Bearer y material sensible. Se preservan cuerpos de negocio, costos y UUID de recursos para reproducir y revisar. **No ejecutar nuevamente los `POST` de alta con los datos reales de esta bitácora y claves nuevas** si no se desea crear duplicados o modificar existencias.

> **Cobertura:** esta bitácora contiene la secuencia de uso observada para compras y recepción, pero **no** afirma que el CRUD de proveedores haya sido ejecutado íntegramente de forma manual. La API de proveedores se verifica mediante tests PostgreSQL/HTTP y CI; ver `03_PRUEBAS_AUTOMATIZADAS_Y_CI.md` y `05_TRAZABILIDAD_Y_PENDIENTES.md`.

## A. Preparación de la sesión

1. Se levantó FastAPI con Docker y se accedió a `http://127.0.0.1:18000/docs`.
2. En `POST /api/v1/auth/login` se utilizó una cuenta QA preexistente y se obtuvo autorización. El valor del token y la contraseña **no están incluidos**.
3. En la opción **Authorize** se instaló el token en Swagger. El cliente no debe incluir el prefijo `Bearer` dos veces.
4. Al cerrar o reabrir Swagger, los campos de prueba y la autorización dejaron de estar visibles. Se realizó un nuevo login; no hubo que recrear empresa, proveedor, compras o artículo porque PostgreSQL persistió la información.
5. Las pruebas protegidas posteriores devolvieron `201`/`200`/`409` según reglas de negocio; esto acredita que se operó con una sesión autorizada, pero **no se conserva una transcripción del HTTP de login** como evidencia independiente.

## B. Datos fijos de la sesión

| Recurso | Identificador / dato |
|---|---|
| Empresa | `Comercio de Prueba QA` — `bd4d4e42-4ff6-403a-8633-59cbc001487d` |
| Actor que figura en los registros | `0e0fc877-c3d4-45dd-9813-2501596baee0` |
| Proveedor | `Distribuidora QA` — `4a9e7618-6388-4765-a8e7-0d7338becd6d` |
| Artículo | `Alimento balanceado QA` — `881fdae2-18c5-46ae-8037-44a500ca96c0` |
| Depósito | `Depósito QA` — `2d6761c4-efec-4b3e-925c-a24ceab8ce9c` |
| Compra libre | `QA-COMPRA-001` — `b6646fcd-428f-4b9b-ab80-83e7ffb14827` |
| Compra física | `QA-COMPRA-002` — `3e50aff2-c895-49d9-8fe5-d5843438f109` |
| Recepción | `266bd03e-763b-4f29-8f12-c19c9bc59066` |
| Movimiento | `9d72f578-c54f-4250-accb-995d712958d8` |

La ficha con todos los atributos no secretos está en `06_FICHA_DATOS_QA.md`.

## C. Caso U-01 — Alta de compra de concepto libre

**Endpoint:** `POST /api/v1/businesses/{business_id}/purchases`  
**Objetivo:** comprobar que una compra administrativa sin proveedor/catálogo/ubicación no crea inventario físico.  
**Precondición:** Bearer válido y miembro autorizado de empresa activa.  
**Cabecera adicional:** `Idempotency-Key: [VALOR REAL OMITIDO]` (UUID4 generado para la operación).

**Cuerpo ingresado:**

```json
{
  "purchased_on": "2026-11-08",
  "supplier_id": null,
  "reference": "QA-COMPRA-001",
  "notes": "Primera compra de prueba sin proveedor ni recepcion",
  "lines": [
    {
      "catalog_item_id": null,
      "description": "Servicio de limpieza externo",
      "unit": "CONCEPTO",
      "quantity_milli": 1000,
      "unit_cost_cents": 12505
    }
  ]
}
```

**Resultado observado:** `201 Created`.

```json
{
  "id": "b6646fcd-428f-4b9b-ab80-83e7ffb14827",
  "business_id": "bd4d4e42-4ff6-403a-8633-59cbc001487d",
  "supplier_id": null,
  "supplier_name_snapshot": "",
  "purchased_on": "2026-11-08",
  "status": "CERRADA_SIN_RECEPCION",
  "total_cents": 12505,
  "reference": "QA-COMPRA-001",
  "notes": "Primera compra de prueba sin proveedor ni recepcion",
  "created_by_id": "0e0fc877-c3d4-45dd-9813-2501596baee0",
  "created_at": "2026-11-08T21:36:06.917074Z",
  "lines": [
    {
      "id": "914048a7-3c08-4fc1-bc32-16f833906cf7",
      "line_number": 1,
      "catalog_item_id": null,
      "description_snapshot": "Servicio de limpieza externo",
      "kind_snapshot": "CONCEPTO",
      "unit_snapshot": "CONCEPTO",
      "sku_snapshot": "",
      "quantity_milli": 1000,
      "unit_cost_cents": 12505,
      "line_total_cents": 12505
    }
  ]
}
```

*Respuesta presentada sin el campo idempotente `request_id`; el resto son valores observados.*

**Interpretación:** 1.000 milésimas = 1 concepto; costo 12.505 centavos = **$125,05**; sin bienes físicos, el estado `CERRADA_SIN_RECEPCION` corresponde al contrato.

## D. Caso U-02 — Reintento idéntico de compra

**Endpoint:** mismo `POST /purchases`.  
**Entrada:** mismo cuerpo de U-01 y exactamente **la misma clave de idempotencia** utilizada en U-01 (no se publica).  
**Resultado observado:** `200 OK`, `id` de la compra `b6646fcd-428f-4b9b-ab80-83e7ffb14827`, `created_at` `2026-11-08T21:36:06.917074Z` y línea `914048a7-3c08-4fc1-bc32-16f833906cf7`, sin modificaciones.

**Dictamen:** respuesta de reintento, no una nueva compra. La misma fecha, compra y línea muestran que se recuperó el documento original.

## E. Caso U-03 — Colisión por cambiar el costo con la misma clave

**Entrada:** mismo `POST` y misma clave que U-01, pero el único campo cambiado fue `lines[0].unit_cost_cents`: de `12505` a `20000`.

**Resultado observado:** `409 Conflict`.

```json
{
  "detail": "Clave de compra reutilizada con contenido diferente"
}
```

**Dictamen:** el servidor rechaza una operación diferente con la clave anterior; no se modifica la compra original.

## F. Caso U-04 — Listar compras

**Endpoint:** `GET /api/v1/businesses/{business_id}/purchases?offset=0&limit=100`.  
**Resultado observado:** `200 OK`, arreglo de **un único elemento** en ese momento, la compra `QA-COMPRA-001` con `total_cents=12505`, `status=CERRADA_SIN_RECEPCION` y la línea `CONCEPTO`. Los intentos U-02/U-03 no añadieron elementos.

## G. Caso U-05 — Consultar compra individual

**Endpoint:** `GET /api/v1/businesses/{business_id}/purchases/b6646fcd-428f-4b9b-ab80-83e7ffb14827`.  
**Resultado observado:** `200 OK`, mismo documento, línea, `created_at`, referencia, total y estado que U-01.  
**Dictamen:** lectura histórica íntegra.

## H. Caso U-06 — Alta del artículo físico de QA

**Endpoint:** `POST /api/v1/businesses/{business_id}/catalog`.

**Cuerpo ingresado:**

```json
{
  "name": "Alimento balanceado QA",
  "kind": "REVENTA",
  "category": "Alimentos",
  "sku": "ALIM-QA-001",
  "unit": "UNIDAD",
  "description": "Producto ficticio para probar compras",
  "sellable": true,
  "price_cents": 150000,
  "reference_cost_cents": 100000
}
```

**Resultado observado:** `201 Created`.

```json
{
  "id": "881fdae2-18c5-46ae-8037-44a500ca96c0",
  "business_id": "bd4d4e42-4ff6-403a-8633-59cbc001487d",
  "name": "Alimento balanceado QA",
  "kind": "REVENTA",
  "item_type": "BIEN",
  "category": "Alimentos",
  "sku": "ALIM-QA-001",
  "unit": "UNIDAD",
  "description": "Producto ficticio para probar compras",
  "observations": "",
  "sellable": true,
  "price_cents": 150000,
  "reference_cost_cents": 100000,
  "status": "ACTIVO",
  "created_at": "2026-11-08T21:50:33.523379Z",
  "updated_at": "2026-11-08T21:50:33.523379Z"
}
```

Se utilizaron costos de referencia de **$1.000,00** y precio de venta de referencia de **$1.500,00**; esto no equivale a registrar una venta.

## I. Caso U-07 — Compra física a proveedor QA

**Endpoint:** `POST /api/v1/businesses/{business_id}/purchases`.  
**Cabecera:** `Idempotency-Key: [VALOR REAL OMITIDO]`, nuevo respecto de la compra administrativa.

**Cuerpo ingresado:**

```json
{
  "purchased_on": "2026-11-08",
  "supplier_id": "4a9e7618-6388-4765-a8e7-0d7338becd6d",
  "reference": "QA-COMPRA-002",
  "notes": "Compra de 10 unidades pendiente de recepcion",
  "lines": [
    {
      "catalog_item_id": "881fdae2-18c5-46ae-8037-44a500ca96c0",
      "description": "Alimento balanceado QA",
      "unit": "UNIDAD",
      "quantity_milli": 10000,
      "unit_cost_cents": 100000
    }
  ]
}
```

**Resultado observado:** `201 Created`.

```json
{
  "id": "3e50aff2-c895-49d9-8fe5-d5843438f109",
  "business_id": "bd4d4e42-4ff6-403a-8633-59cbc001487d",
  "supplier_id": "4a9e7618-6388-4765-a8e7-0d7338becd6d",
  "supplier_name_snapshot": "Distribuidora QA",
  "purchased_on": "2026-11-08",
  "status": "REGISTRADA",
  "total_cents": 1000000,
  "reference": "QA-COMPRA-002",
  "notes": "Compra de 10 unidades pendiente de recepcion",
  "created_by_id": "0e0fc877-c3d4-45dd-9813-2501596baee0",
  "created_at": "2026-11-08T21:53:23.410940Z",
  "lines": [
    {
      "id": "fc2226e3-0205-4354-860e-73bb5376eec7",
      "line_number": 1,
      "catalog_item_id": "881fdae2-18c5-46ae-8037-44a500ca96c0",
      "description_snapshot": "Alimento balanceado QA",
      "kind_snapshot": "BIEN",
      "unit_snapshot": "UNIDAD",
      "sku_snapshot": "ALIM-QA-001",
      "quantity_milli": 10000,
      "unit_cost_cents": 100000,
      "line_total_cents": 1000000
    }
  ]
}
```

*Se omite `request_id` del cuerpo original.*

**Interpretación:** `10000 / 1000 = 10` unidades; costo por unidad `100000 / 100 = $1.000,00`; total `1000000 / 100 = $10.000,00`. La compra queda `REGISTRADA` y **todavía no crea stock**. La ausencia de stock en esta etapa se sostiene además en el contrato y los tests del backend; el POST por sí solo no devuelve saldos.

## J. Caso U-08 — Consultar ubicaciones sin depósitos

**Endpoint:** `GET /api/v1/businesses/{business_id}/locations`.  
**Resultado observado:** `200 OK` con cuerpo `[]`.  
**Dictamen:** la empresa QA no tenía ubicaciones registradas antes de crear el depósito.

## K. Caso U-09 — Crear depósito real de QA

**Endpoint:** `POST /api/v1/businesses/{business_id}/locations`.

**Cuerpo ingresado:**

```json
{
  "name": "Depósito QA",
  "kind": "DEPOSITO",
  "address": "",
  "map_url": "",
  "can_sell": false,
  "can_store": true
}
```

**Resultado observado:** `201 Created`.

```json
{
  "id": "2d6761c4-efec-4b3e-925c-a24ceab8ce9c",
  "business_id": "bd4d4e42-4ff6-403a-8633-59cbc001487d",
  "name": "Depósito QA",
  "kind": "DEPOSITO",
  "address": "",
  "map_url": "",
  "can_sell": false,
  "can_store": true,
  "is_primary": true,
  "status": "ACTIVA",
  "created_at": "2026-11-08T22:45:49.542089Z",
  "updated_at": "2026-11-08T22:45:49.542089Z"
}
```

## L. Casos U-10 y U-11 — Confirmación de ubicación y compra antes de recibir

- `GET /locations` → **200**, arreglo de **una ubicación** con `id=2d6761c4-efec-4b3e-925c-a24ceab8ce9c`, `status=ACTIVA`, `can_store=true`, `can_sell=false`, `is_primary=true`.
- `GET /purchases/3e50aff2-c895-49d9-8fe5-d5843438f109` → **200**, compra QA-002 con proveedor `Distribuidora QA`, `status=REGISTRADA`, `quantity_milli=10000` y `total_cents=1000000`.

Estas lecturas verifican las precondiciones del comando de recepción: documento pendiente y lugar habilitado.

## M. Caso U-12 — Confirmar recepción física completa

**Endpoint:** `POST /api/v1/businesses/{business_id}/purchases/3e50aff2-c895-49d9-8fe5-d5843438f109/receive`.  
**Cabecera:** `Idempotency-Key: [VALOR REAL OMITIDO]` (UUID4 nuevo para **esta recepción**, distinto del usado al crear la compra).

**Cuerpo ingresado:**

```json
{
  "location_id": "2d6761c4-efec-4b3e-925c-a24ceab8ce9c"
}
```

**Resultado observado:** `201 Created`. Se representa a continuación la respuesta real sin `request_id`.

```json
{
  "id": "266bd03e-763b-4f29-8f12-c19c9bc59066",
  "business_id": "bd4d4e42-4ff6-403a-8633-59cbc001487d",
  "purchase_id": "3e50aff2-c895-49d9-8fe5-d5843438f109",
  "location_id": "2d6761c4-efec-4b3e-925c-a24ceab8ce9c",
  "confirmed_by_id": "0e0fc877-c3d4-45dd-9813-2501596baee0",
  "confirmed_at": "2026-11-08T22:51:29.200944Z",
  "purchase_status": "RECIBIDA",
  "movements": [
    {
      "id": "9d72f578-c54f-4250-accb-995d712958d8",
      "business_id": "bd4d4e42-4ff6-403a-8633-59cbc001487d",
      "location_id": "2d6761c4-efec-4b3e-925c-a24ceab8ce9c",
      "catalog_item_id": "881fdae2-18c5-46ae-8037-44a500ca96c0",
      "receipt_id": "266bd03e-763b-4f29-8f12-c19c9bc59066",
      "purchase_line_id": "fc2226e3-0205-4354-860e-73bb5376eec7",
      "actor_id": "0e0fc877-c3d4-45dd-9813-2501596baee0",
      "event_type": "COMPRA_RECEPCION",
      "delta_milli": 10000,
      "occurred_at": "2026-11-08T22:51:29.200944Z"
    }
  ],
  "balances_after": [
    {
      "catalog_item_id": "881fdae2-18c5-46ae-8037-44a500ca96c0",
      "quantity_milli": 10000,
      "version": 1
    }
  ]
}
```

**Dictamen:** una recepción para una compra, un movimiento por línea física y un saldo de **10 unidades** en una ubicación habilitada. La respuesta incluye la fecha efectiva `confirmed_at` y el actor.

## N. Caso U-13 — Rechazar segunda recepción con otra clave

**Entrada:** mismo POST `/receive`, misma compra y mismo `location_id`, pero con una **clave diferente** de la utilizada en U-12. Se llegó a utilizar accidentalmente como clave un UUID de recurso; no se reproduce ese valor para cumplir la política de exclusión de claves.

**Resultado observado:** `409 Conflict`.

```json
{
  "detail": "Compra ya recibida, cancelada o sin bienes fisicos recepcionables"
}
```

**Dictamen:** comportamiento **correcto** de protección contra doble ingreso; la compra ya está `RECIBIDA`. No debe contarse como fallo del backend.

## O. Caso U-14 — Reintento de recepción idéntico

**Entrada:** mismo POST `/receive`, misma compra, mismo actor y **exactamente la misma clave y cuerpo** que en U-12.  
**Resultado observado:** `200 OK`; se recuperaron los valores:

- `receipt.id`: `266bd03e-763b-4f29-8f12-c19c9bc59066`.
- `confirmed_at`: `2026-11-08T22:51:29.200944Z`.
- `purchase_status`: `RECIBIDA`.
- `movements[0].id`: `9d72f578-c54f-4250-accb-995d712958d8`.
- `movements[0].delta_milli`: `10000`.
- `balances_after[0].quantity_milli`: `10000`.
- `balances_after[0].version`: `1`.

**Dictamen:** la respuesta representa el **mismo hecho**, no una segunda operación. La versión `1` y el historial de U-17 acreditan ausencia de duplicación.

## P. Caso U-15 — Consulta de saldo con ubicación de ejemplo incorrecta

**Endpoint:** `GET /api/v1/businesses/{business_id}/inventory/balances`.  
**Parámetros:** artículo correcto `881fdae2-18c5-46ae-8037-44a500ca96c0`; se dejó por error como `location_id` el UUID ficticio que Swagger propone en sus ejemplos en lugar del depósito creado; `offset=0`, `limit=100`.

**Resultado observado:** `200 OK` y `[]`.

**Diagnóstico:** la consulta filtraba una ubicación que no coincidía con la recepción. Es una respuesta vacía **válida**, no evidencia de que faltara el saldo.

## Q. Caso U-16 — Consulta de saldo con filtros reales

**Endpoint:** `GET /api/v1/businesses/{business_id}/inventory/balances`.  
**Parámetros:**

```text
business_id      = bd4d4e42-4ff6-403a-8633-59cbc001487d
location_id      = 2d6761c4-efec-4b3e-925c-a24ceab8ce9c
catalog_item_id  = 881fdae2-18c5-46ae-8037-44a500ca96c0
offset           = 0
limit            = 100
```

**Resultado observado:** `200 OK`.

```json
[
  {
    "business_id": "bd4d4e42-4ff6-403a-8633-59cbc001487d",
    "location_id": "2d6761c4-efec-4b3e-925c-a24ceab8ce9c",
    "catalog_item_id": "881fdae2-18c5-46ae-8037-44a500ca96c0",
    "quantity_milli": 10000,
    "version": 1,
    "updated_at": "2026-11-08T22:51:29.200944Z"
  }
]
```

**Dictamen:** las 10 unidades constan en `stock_balances`. La versión sigue siendo `1` después del reintento, y los filtros coinciden con el depósito real.

## R. Caso U-17 — Consulta del ledger de movimientos

**Endpoint:** `GET /api/v1/businesses/{business_id}/inventory/movements` con exactamente los mismos filtros que U-16.

**Resultado observado:** `200 OK`; **un solo movimiento**:

```json
[
  {
    "id": "9d72f578-c54f-4250-accb-995d712958d8",
    "business_id": "bd4d4e42-4ff6-403a-8633-59cbc001487d",
    "location_id": "2d6761c4-efec-4b3e-925c-a24ceab8ce9c",
    "catalog_item_id": "881fdae2-18c5-46ae-8037-44a500ca96c0",
    "receipt_id": "266bd03e-763b-4f29-8f12-c19c9bc59066",
    "purchase_line_id": "fc2226e3-0205-4354-860e-73bb5376eec7",
    "actor_id": "0e0fc877-c3d4-45dd-9813-2501596baee0",
    "event_type": "COMPRA_RECEPCION",
    "delta_milli": 10000,
    "occurred_at": "2026-11-08T22:51:29.200944Z"
  }
]
```

**Dictamen:** la consulta confirma el **único hecho físico** de la compra QA-002 y su trazabilidad (actor, recibo y línea). En conjunto con la prueba U-14, confirma ausencia de duplicación en este escenario.

## S. Resumen tabular de los casos manuales

| ID | Operación | HTTP observado | Dictamen |
|---|---|---:|---|
| U-01 | Alta compra concepto | 201 | Aprobado |
| U-02 | Replay misma compra | 200 | Aprobado |
| U-03 | Clave reutilizada con otro costo | 409 | Aprobado: conflicto esperado |
| U-04 | Listar compras | 200 | Aprobado |
| U-05 | Detalle compra | 200 | Aprobado |
| U-06 | Crear artículo físico | 201 | Aprobado |
| U-07 | Crear compra física | 201 | Aprobado |
| U-08 | Ubicaciones antes del alta | 200, `[]` | Aprobado |
| U-09 | Alta depósito | 201 | Aprobado |
| U-10 | Ubicaciones luego del alta | 200 | Aprobado |
| U-11 | Compra física antes de recibir | 200 | Aprobado |
| U-12 | Recepción única | 201 | Aprobado |
| U-13 | Intento de segunda recepción | 409 | Aprobado: conflicto esperado |
| U-14 | Replay recepción original | 200 | Aprobado |
| U-15 | Saldo filtrado por UUID no correspondiente | 200, `[]` | Diagnóstico de filtro incorrecto |
| U-16 | Saldo con depósito correcto | 200 | Aprobado |
| U-17 | Movimientos con filtros correctos | 200 | Aprobado |

La API de Proveedores (`POST/GET/PATCH/PATCH status`) está implementada y validada por CI. La evidencia permite identificar un proveedor QA utilizado por compra, pero **no contiene un recorrido manual completo con los cuerpos y HTTP de cada operación de Proveedores**; no se inventó ese conjunto de casos.

## T. Regla de reproceso y conservación de datos

Las altas U-01, U-06, U-07, U-09 y la recepción U-12 **ya sucedieron** en una base persistente. Si se desea revisar esta evidencia, utilizar las rutas **GET**. Para repetir exactamente U-14 en un contexto autorizado hay que reutilizar la clave original, que está excluida del informe: **sin ella no se puede realizar la misma prueba de replay de forma idéntica**. No sustituir esa clave por el ID de la compra y no generar otra para la misma recepción; eso produce correctamente `409`.

Para una nueva práctica íntegra, usar otros datos de QA y nuevas claves guardadas **localmente y fuera del informe**, sin compartir cabeceras de autorización.