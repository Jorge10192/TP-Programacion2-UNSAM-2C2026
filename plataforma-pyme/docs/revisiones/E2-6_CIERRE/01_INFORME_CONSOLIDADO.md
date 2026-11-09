# E2-6 — Informe técnico consolidado posterior al merge

**Bloque:** E2-6 (RF-07 / CU-10) · **estado:** fusionado en `main` mediante PR #26 y #27.  
**Corte:** merge `6336152e8dd095ca91363566beddd2b622432a5e` · **fecha:** 2026-11-09.

## 1. Alcance concluido A–E

| Corte | Resultado real | Verificación |
|---|---|---|
| **A** | Tablas SQL `sales`, `sale_lines`, `sale_payments`; columnas `sale_id`/`sale_line_id` en ledger; FK tenant, CHECK y migración Alembic `e26a_sales_foundation` | PR #26, pruebas estructurales/SQL |
| **B** | POST/GET de ventas de servicios, pagos declarados divididos, cálculo entero, snapshots e idempotencia por clave y actor | Pruebas schema/API/servicio |
| **C** | Ventas físicas y mixtas en ubicación SELL+STORE, débito atómico del stock, movimiento `VENTA_SALIDA` por renglón físico | Pruebas integración, concurrencia y Swagger |
| **D** | Endurecimiento de rollback, permisos, reintentos, conservación de snapshots y compatibilidad con E2-4/E2-5 | Regresión local 879 y CI |
| **E** | Entrega técnica, documentación integral, evidencias Swagger y material para auditoría IA | Publicado y fusionado con PR #27 |

## 2. Contratos públicos

- `POST /api/v1/businesses/{business_id}/sales`: encabezado `Idempotency-Key` (UUID v4), payload con `location_id?`, `discount_cents`, `notes`, de 1 a 30 líneas y de 1 a 6 pagos. Nueva venta **201**, replay idéntico **200**.
- `GET /api/v1/businesses/{business_id}/sales/{sale_id}`: comprobante histórico autorizado, **200** si existe y es accesible.
- Errores tipificados: **401** sesión; **403** permiso; **404** empresa/comprobante no accesible; **409** estado, clave o stock; **422** payload o artículo inválidos.
- Las cuentas o medios `EFECTIVO`, `TRANSFERENCIA`, `CUENTA_DNI`, `TARJETA`, `MERCADO_PAGO_DECLARADO` son **declaraciones**: no se genera acreditación real, webhook, caja ni movimiento financiero verificado.

## 3. Reglas y atomicidad

- Identidad empresarial global y autorización por negocio; venta con ubicación requiere `SELL`. Los bienes físicos exigen además `STORE` y sede activa apta para almacenar.
- Artículos físicos y servicios pueden coexistir en un comprobante; los servicios no descuentan stock.
- Centavos enteros estrictos y milésimas de cantidad; redondeo HALF_UP por línea; descuentos y suma de pagos deben cuadrar exactamente con el total positivo.
- Copias históricas de descripción, tipo, unidad, SKU, cantidad y precio por línea, más `balances_after` después del débito físico.
- El servicio agrupa cantidades físicas repetidas por artículo para un `UPDATE ... WHERE quantity_milli >= requerido RETURNING`, incrementa la versión del saldo y registra un `StockMovement(VENTA_SALIDA)` negativo por línea de bien.
- Cabecera + líneas + pagos declarados + ledger + saldos se confirman dentro de **una única transacción**; los casos de error probados revierten la operación completa.
- Idempotencia por `(business_id, request_id)` con digest normalizado y autor; un replay válido no modifica el stock.

## 4. Dependencias del sistema anterior

| Módulo | Integración que reutiliza E2-6 |
|---|---|
| **E2-1** | Registro, login, sesión, empresa y membresía |
| **E2-2** | Ubicación activa, capacidades de venta/almacenamiento, asignaciones y permisos |
| **E2-3** | Catálogo, tipo físico/servicio, unidades, estado y snapshots |
| **E2-4** | Compra/recepción y origen histórico `COMPRA_RECEPCION`, sin modificar su semántica |
| **E2-5** | `StockBalance` versionado, transferencias/ajustes, ledger físico y origen XOR |
| **E2-6** | Venta y origen adicional `VENTA_SALIDA`, referencias `sale_id` + `sale_line_id` |

E2-6 no sustituye las migraciones ni las operaciones previas. Los movimientos previos mantienen su identificador de origen; la extensión del CHECK de origen distingue ventas de recibos y operaciones manuales.

## 5. Archivos de implementación

```text
backend/app/modules/sales/router.py
backend/app/modules/sales/schemas.py
backend/app/modules/sales/service.py
backend/app/api/v1/router.py
backend/app/infrastructure/models/{sale,sale_line,sale_payment,stock_movement}.py
backend/alembic/versions/20261109_0017_sales_foundation.py
backend/tests/test_sale_foundation_{model,integration}.py
backend/tests/test_sales_{schemas,http,api_integration,atomicity_integration,
                          concurrency_integration,inventory_interop_integration,
                          permissions_integration}.py
```

La migración `e26a_sales_foundation` es aditiva y **prohíbe el downgrade si existen ventas**. No modificar datos QA ni ejecutar downgrades destructivos. La API de ventas no ofrece listado global, edición, anulaciones ni devoluciones en este bloque.

## 6. Alcance del cierre

**Se acepta como concluida la implementación del MVP backend E2-6 bajo las pruebas descritas**. No se acredita auditoría independiente exhaustiva, tolerancia universal a deadlocks, pagos externos o cobertura de todos los escenarios de seguridad. El material de revisión IA publicado es un encargo pendiente. Una revisión externa posterior puede originar defectos y PRs de corrección, sin reabrir silenciosamente la especificación ya fusionada.
