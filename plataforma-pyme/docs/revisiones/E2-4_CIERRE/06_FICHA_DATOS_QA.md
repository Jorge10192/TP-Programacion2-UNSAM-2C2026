# E2-4 — Datos de la sesión QA utilizados (sin credenciales ni claves)

**Origen:** respuestas Swagger aportadas para el cierre. **Fecha:** 2026-11-08. **Importante:** los siguientes UUID son identificadores de recursos de prueba, no claves de autenticación. Se omiten `Idempotency-Key`, `request_id`, contraseñas, tokens Bearer y cadenas de conexión.

## Empresa y actor

| Campo | Valor |
|---|---|
| Empresa | Comercio de Prueba QA |
| `business_id` | `bd4d4e42-4ff6-403a-8633-59cbc001487d` |
| `created_by_id` / actor | `0e0fc877-c3d4-45dd-9813-2501596baee0` |
| Entorno | API local 127.0.0.1:18000, PostgreSQL 16, Docker |

## Proveedor

| Campo | Valor |
|---|---|
| Nombre | Distribuidora QA |
| `supplier_id` | `4a9e7618-6388-4765-a8e7-0d7338becd6d` |

La existencia del proveedor fue verificada indirectamente en la compra física que devolvió `supplier_name_snapshot: "Distribuidora QA"`. No se conserva una transcripción completa de su CRUD manual.

## U-01 — Compra de concepto libre

**POST** `/api/v1/businesses/{business_id}/purchases`; HTTP **201**.

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

| Campo de respuesta | Valor |
|---|---|
| `purchase_id` | `b6646fcd-428f-4b9b-ab80-83e7ffb14827` |
| `purchase_line_id` | `914048a7-3c08-4fc1-bc32-16f833906cf7` |
| Estado | `CERRADA_SIN_RECEPCION` |
| Total | `total_cents: 12505` |
| `created_at` | `2026-11-08T21:36:06.917074Z` |
| Reintento idéntico | HTTP **200**, mismo documento y línea |
| Misma clave y costo diferente | HTTP **409**, detalle: clave de compra reutilizada con contenido diferente |
| GET listado y detalle | HTTP **200**, documento conservado |

## U-06 — Artículo físico

**POST** `/api/v1/businesses/{business_id}/catalog`; HTTP **201**.

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

Respuesta: `id: 881fdae2-18c5-46ae-8037-44a500ca96c0`, `item_type: BIEN`, `status: ACTIVO`, creación `2026-11-08T21:50:33.523379Z`. Precio de venta de prueba: 1.500,00; costo de referencia: 1.000,00. **La moneda no se almacena explícitamente en el modelo de E2-4**.

## U-07 — Compra física a proveedor

**POST** `/purchases`; HTTP **201**.

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

| Campo | Valor |
|---|---|
| Compra | `3e50aff2-c895-49d9-8fe5-d5843438f109` |
| Línea | `fc2226e3-0205-4354-860e-73bb5376eec7` |
| Proveedor snapshot | `Distribuidora QA` |
| SKU snapshot | `ALIM-QA-001` |
| Estado inicial | `REGISTRADA` |
| Total | `1000000` centavos, equivalentes a diez × 100000 centavos |
| `created_at` | `2026-11-08T21:53:23.410940Z` |
| Efecto inmediato de crear compra | **No** genera movimiento ni stock; efecto físico ocurre en U-12 |

## U-08/U-09/U-10 — Depósito

Inicialmente `GET /locations` → **200**, `[]`. Después `POST /locations` → **201** con:

```json
{"name":"Depósito QA","kind":"DEPOSITO","address":"","map_url":"","can_sell":false,"can_store":true}
```

Respuesta: `location_id: 2d6761c4-efec-4b3e-925c-a24ceab8ce9c`, `is_primary: true`, `status: ACTIVA`, `created_at: 2026-11-08T22:45:49.542089Z`. El `GET /locations` repetido devolvió una sola ubicación con ese UUID; el `GET /purchases/{id}` anterior a recibir confirmó `REGISTRADA`.

## U-12/U-13/U-14 — Recepción

**POST** `/purchases/3e50aff2-c895-49d9-8fe5-d5843438f109/receive`, cuerpo:

```json
{"location_id": "2d6761c4-efec-4b3e-925c-a24ceab8ce9c"}
```

**Primer resultado:** HTTP **201**, `id: 266bd03e-763b-4f29-8f12-c19c9bc59066`, `purchase_status: RECIBIDA`, `confirmed_at: 2026-11-08T22:51:29.200944Z`. Movimiento `id: 9d72f578-c54f-4250-accb-995d712958d8`, `event_type: COMPRA_RECEPCION`, `delta_milli: 10000`, `actor_id: 0e0fc877-c3d4-45dd-9813-2501596baee0`. Saldo después: `quantity_milli: 10000`, `version: 1`.

**Segundo intento con clave diferente:** HTTP **409**, `{"detail":"Compra ya recibida, cancelada o sin bienes fisicos recepcionables"}`. **Reintento idéntico con clave original:** HTTP **200**, mismo recibo, movimiento y foto de saldo; no se creó otra recepción.

## U-15/U-16/U-17 — Consultas actuales y ledger

1. `GET /inventory/balances` con un `location_id` de ejemplo de Swagger, no perteneciente al depósito: **200 []**, filtro incorrecto, no error de inventario.
2. Mismo GET con `location_id=2d6761c4-efec-4b3e-925c-a24ceab8ce9c`, `catalog_item_id=881fdae2-18c5-46ae-8037-44a500ca96c0`, `offset=0`, `limit=100`: **200**, una fila `quantity_milli=10000, version=1`, `updated_at=2026-11-08T22:51:29.200944Z`.
3. `GET /inventory/movements` con los mismos filtros: **200**, un movimiento `COMPRA_RECEPCION`, `+10000`, `receipt_id=266bd03e-763b-4f29-8f12-c19c9bc59066`.

**No usar los UUID de recurso como claves idempotentes.** Para ensayar creación de nuevos documentos se deben generar claves UUID4 nuevas en un entorno de QA separado, guardadas solo en la máquina del revisor.
