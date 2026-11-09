# E2-4 — Arquitectura, contratos HTTP, persistencia y riesgos

**AS-IMPLEMENTED:** Backend FastAPI, SQLAlchemy ORM 2, PostgreSQL 16, Alembic; multiempresa por `business_id`, membresía, sesión y permisos. React DEMO no consume aún estos endpoints. Fuente técnica: código de `backend/app/modules/{suppliers,purchases}/` y migraciones 0012–0015.

## 1. Flujo implementado

```text
Usuario autenticado → Membresía de Empresa
             ├── Proveedor (opcional)
             └── Compra + PurchaseLine (snapshots; NO stock)
                     ├── Solo servicios/conceptos → CERRADA_SIN_RECEPCION
                     └── Con BIEN → REGISTRADA
                               ↓ POST /receive (una vez, completa)
                           Compra RECIBIDA
                               ├── PurchaseReceipt único por compra
                               ├── StockMovement por línea física
                               └── StockBalance por empresa/ubicación/artículo
```

Los servicios y los conceptos libres de una compra mixta **no** generan entradas de stock. La recepción ocurre después del registro comercial, no en el mismo endpoint.

## 2. Rutas existentes

Prefijo `/api/v1/businesses/{business_id}`.

| Grupo | Método y subruta | Acción | Éxito |
|---|---|---|---|
| Proveedores | `GET /suppliers` | Listado, incluidos inactivos | 200 |
| Proveedores | `POST /suppliers` | Alta | 201 |
| Proveedores | `GET /suppliers/{supplier_id}` | Detalle | 200 |
| Proveedores | `PATCH /suppliers/{supplier_id}` | Edición parcial, sin estado | 200 |
| Proveedores | `PATCH /suppliers/{supplier_id}/status` | Activar/desactivar | 200 |
| Compras | `POST /purchases` | Documento y líneas, **sin stock** | 201 / replay 200 |
| Compras | `GET /purchases` | Listado y snapshots | 200 |
| Compras | `GET /purchases/{purchase_id}` | Detalle y estado | 200 |
| Recepción | `POST /purchases/{purchase_id}/receive` | Ingreso físico completo a una ubicación | 201 / replay 200 |
| Recepción | `GET /purchases/{purchase_id}/receipt` | Comprobante y movimientos históricos | 200 |
| Inventario | `GET /inventory/balances` | Saldo actual filtrado/paginado | 200 |
| Inventario | `GET /inventory/movements` | Entradas históricas filtradas/paginadas | 200 |

Lecturas requieren sesión y membresía activa de empresa; escribir Proveedor/Compra requiere los roles correspondientes y empresa ACTIVA. La recepción aplica `can_operate_at_location(...operation="STORE")`, destino `ACTIVA` y `can_store=true`; personal operativo necesita asignación activa. Los errores 401/403/404/409/422 dependen del contexto y no deben confundirse con fallos de infraestructura.

## 3. Compra: entrada, totales y estados

```json
{
  "purchased_on": "2026-11-08",
  "supplier_id": null,
  "reference": "QA-COMPRA-001",
  "notes": "Compra ficticia",
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

- Cantidades en milésimas y dinero en centavos como enteros; `quantity_milli: 10000` representa 10 unidades.
- Cada línea: `line_total_cents = floor((quantity_milli * unit_cost_cents + 500)/1000)`, HALF_UP en centavos. La suma de los renglones es `total_cents`; se evita Float. **Límite 1–30 renglones** por creación.
- Referencias activas del mismo tenant. Nombres, SKU, tipo y unidad del artículo y nombre del proveedor se extraen del backend para fijar snapshots históricos (sin confianza en una descripción de cliente).
- `POST /purchases` exige `Idempotency-Key` UUID4: mismo actor, clave y contenido → 200 y mismo documento. Clave reutilizada con cambios → 409.
- `REGISTRADA` si hay un bien físico; `CERRADA_SIN_RECEPCION` si no lo hay. `RECIBIDA` tras confirmación física. `CANCELADA` está previsto como estado de esquema, **no hay ruta HTTP para cancelarlo aún**.

## 4. Recepción, transacción, idempotencia y bloqueo

```json
{"location_id": "2d6761c4-efec-4b3e-925c-a24ceab8ce9c"}
```

La entrada se limita estrictamente a `location_id`: sin cantidades parciales, sin líneas seleccionadas ni múltiple depósito. Operación en una transacción de PostgreSQL:

1. Revalida cuenta, sesión, empresa y membresía; reconoce reintento exacto.
2. Bloquea la compra y ubicación, verifica `REGISTRADA`, `ACTIVA`, `can_store=true` y permiso STORE.
3. Bloquea filas del catálogo ordenadas: **el código sí usa `.with_for_update(read=True)` en `receipt_service.py`**, que en PostgreSQL implementa lectura `FOR SHARE`. Por lo tanto, la observación externa de que esta protección faltaría **no describe la implementación actual**. Conviene verificar SQL generado al cambiar driver/dialecto.
4. Inserta `purchase_receipts` (UNIQUE por empresa/compra y empresa/clave), un `stock_movements` por línea BIEN y agrupa las cantidades por artículo.
5. Aplica `INSERT ... ON CONFLICT DO UPDATE` para incrementar atómicamente `stock_balances`. Preserva snapshots `balances_after`, fija compra `RECIBIDA` y confirma **un solo COMMIT**. Error → ROLLBACK.
6. El reintento idéntico del mismo actor/clave/destino devuelve 200 y el recibo original, aunque el saldo real pueda haber cambiado después. Nueva clave sobre compra ya recibida → 409.

## 5. Modelo SQL y migraciones

| Migración | Cambio |
|---|---|
| `e24a_suppliers` | `suppliers`, nombre normalizado/único en empresa, ficha y estado |
| `e24c_purchases` | `purchases` y `purchase_lines`; FKs por tenant, snapshots, UNIQUE y CHECK |
| `e24d_purchase_hash` | `purchases.request_sha256` opcional (migración compatible) |
| `e24e_receipt_stock` | `purchase_receipts`, `stock_movements`, `stock_balances` |

La recepción está modelada 1:1 por compra mediante UNIQUE `(business_id,purchase_id)`; no se declaró una relación 1:N implementada. Los saldos tienen PK `(business_id,location_id,catalog_item_id)`, cantidad no negativa y versión. Un movimiento conserva referencia a recibo, renglón, artículo, ubicación y actor; no tiene PATCH/DELETE REST.

## 6. Observaciones de revisión: clasificación técnica

| Observación recibida | Comprobación / decisión |
|---|---|
| Recepciones parciales y multidestino no disponibles | **Limitación funcional consciente del corte**, no fallo de una recepción completa. Requiere diseño 1:N, asignación por línea y migración aditiva. No reescribir migración histórica 0015. |
| `CANCELADA` sin endpoint | **Brecha funcional pendiente**. Incorporar comando de cancelación validando transición permitida, autoría e idempotencia; no actualizar estado por SQL ad hoc. |
| No reversión de recepción | **Brecha operativa pendiente**. Diseñar ajustes/compensaciones auditables, no DELETE del ledger ni rollback manual destructivo. |
| No `currency_code` ni tipo de cambio | **Limitación de modelo** para multimoneda. No inferir ARS como moneda persistida por el sistema; pesos solo se usaron al interpretar escenarios QA locales. Planificar ISO 4217 y conversión histórica explícita. |
| Acumulación de HALF_UP por línea | **Regla deliberada y probada**, pero puede diferir del comprobante externo. Diseñar descuentos/ajustes/impuestos conciliatorios sin modificar snapshots pasados. |
| Máximo 30 líneas | **Límite contractual actual**; analizar paginación de altas por lotes y carga masiva sin eliminar protecciones de tamaño. |
| Inmutabilidad del ledger solo mediante REST | **Riesgo real de hardening DB:** no hay triggers UPDATE/DELETE sobre movimientos; claves/FKs no equivalen a inmutabilidad ante un operador con escrituras SQL directas. Se requieren roles SQL de mínimo privilegio, auditoría y, si procede, trigger restrictivo. |
| Falta de bloqueo de catálogo | **Observación no aplicable** al código actual: `with_for_update(read=True)` sí realiza lectura compartida bloqueante. Confirmar con test de carrera y SQL compilado si se desea reforzar evidencia. |
| Tests con DB local poblada | **Deuda confirmada de aislamiento ambiental**; PR #18 corrigió aserciones globales, no creó una DB efímera independiente. |

## 7. Alcance diferido y decisiones de compatibilidad

Recepción 1:N, anulaciones/compensaciones, traslados, ajustes negativos, ventas y caja, pagos declarados/Mercado Pago, conciliación monetaria, multimoneda, grandes cargas, hardening/observabilidad y frontend conectado **no están implementados en este bloque**.

No alterar columnas/UNIQUE de migraciones ya aplicadas para agregar estas capacidades. Requerir ADR, migraciones nuevas, permisos y tests de compatibilidad. No declarar listo para producción al subsistema solo por pasar CI.
