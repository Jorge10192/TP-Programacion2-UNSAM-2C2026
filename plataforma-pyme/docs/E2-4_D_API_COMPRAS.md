# E2-4 D — API real de Compras (sin recepción)

**Base:** E2-4 C migración \`e24c_purchases\`. **Rama:** \`feature/e2-4d-compras-api\`. **Fecha:** 08/11/2026.

## Funcionalidades

- **POST** \`/api/v1/businesses/{business_id}/purchases\`: registra 1–30 líneas y devuelve 201. Requiere \`Idempotency-Key\` UUID v4, Bearer y membresía TITULAR_ADMINISTRATIVO o ADMINISTRADOR de empresa ACTIVA. Identica clave+payload del mismo creador devuelve 200 y la misma compra; misma clave con otro contenido/actor devuelve 409.
- **GET** \`/api/v1/businesses/{business_id}/purchases\`: historial completo del tenant, con snapshots y paginación \`offset=0, limit=100\` por defecto.
- **GET** \`/api/v1/businesses/{business_id}/purchases/{purchase_id}\`: consulta de compra de esa misma empresa con líneas ordenadas. Lectura para miembros activos, también bajo suspensión.
- Proveedor opcional y conceptos libres sin catálogo ni ubicación. Si se referencia un Proveedor, debe ser ACTIVO del mismo tenant. Catálogo referenciado debe estar ACTIVO y tener la misma unidad que la línea solicitada.
- Nombre/SKU/tipo/unidad de ítem y nombre de proveedor se copian exclusivamente desde PostgreSQL como **snapshot histórico**, nunca desde un dato que el cliente pueda falsificar. La descripción enviada de artículos se valida pero el nombre histórico proviene del catálogo.
- Aritmética en **centavos enteros** y **milésimas enteras**, redondeo \`HALF_UP\` por cada línea (sin Float), suma de líneas exacta. \`REGISTRADA\` cuando hay al menos un bien físico; \`CERRADA_SIN_RECEPCION\` para solo servicios y/o conceptos libres.
- Compra y 1–30 renglones se insertan **en una sola transacción**; cualquier error implica rollback. Aislamiento multiempresa por filtros de tenant y claves foráneas compuestas.
- Se agrega migración aditiva \`e24d_purchase_hash\`, campo nullable \`purchases.request_sha256\` con CHECK de longitud 64 para registrar hash SHA-256 de la solicitud. Nullable preserva compatibilidad con compras antiguas si existiesen, pero toda nueva alta HTTP informa la huella. La unicidad de \`(business_id, request_id)\` ya estaba creada en E2-4 C.

## Campos de alta

\`\`\`json
{
  "purchased_on": "2026-11-08",
  "supplier_id": null,
  "reference": "FC-001",
  "notes": "Compra ficticia para QA",
  "lines": [
    {
      "catalog_item_id": null,
      "description": "Servicio externo",
      "unit": "CONCEPTO",
      "quantity_milli": 1000,
      "unit_cost_cents": 12505
    }
  ]
}
\`\`\`

Para un artículo del catálogo: \`catalog_item_id\` UUID real, \`unit\` igual a la ficha actual y \`description\` informativa; para concepto libre: \`catalog_item_id: null\`, \`unit: "CONCEPTO"\`. Todos los renglones exigen cantidad > 0 y costo >= 0. Unidades discretas requieren milésimas múltiplos de 1000.

## Límites explícitos y siguientes cortes

- **No se crea ni se exige Ubicación**, no hay pagos, recepción, existencia vendible, movimiento, ni efecto físico sobre Inventario.
- La compra queda guardada para recepción posterior E2-4 E (una vez, completa, en una ubicación con permiso STORE). Concepto libre y servicio no dan derecho a recepción.
- Sin edición/borrado retrospectivo de compras. Controles de integridad SQL y de API protegen altas; no se introduce permiso de INSERT comercial SQL directo para usuarios finales.
- La integración React/HTTP, frontend DEMO y cuentas financieras quedan fuera de este corte.
- La protección de cambios de tipo/unidad en Catálogo cuando hay historial comercial deberá incorporarse en el bloque de integridad correspondiente; los snapshots ya guardados no cambian.
- Pruebas HTTP y de PostgreSQL para creación, consultas, roles, tenant, idempotencia, importes, redondeo, estado, referencias activas, rollback y ausencia de stock. **Documentación integral de evidencias de TP: al cierre de E2-4 completo**, según instrucción del autor.

## Validación recomendada

1. CI Python 3.12 / 3.14 con PostgreSQL 16, \`alembic upgrade head\` y \`alembic check\`, Docker.
2. Merge del PR solo tras CI verde y revisión.
3. En Windows \`git pull --ff-only origin main\`, \`python -m alembic upgrade head\`, \`alembic current\`, \`alembic check\`, \`RUN_DB_INTEGRATION=1 pytest -q\` y \`docker compose --profile api up -d --build --wait api\`.
4. Swagger: registro de compra de concepto libre, repetición con misma clave, rechazo de clave con distinta carga, listado y consulta, luego una compra con artículo físico del catálogo sin recepción.
