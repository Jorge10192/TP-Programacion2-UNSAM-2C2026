# E2-6 - Hallazgos

## AUD-E26-001 / REV-E2-6-001 - P2 - Versión agotada producía HTTP 500

**Estado: confirmado y corregido.** `backend/app/modules/sales/service.py`, captura de errores de `SaleService.create`; DDL `ck_stock_balances_version` permite `1..9223372036854775807`.

Reproducción exclusivamente en PostgreSQL efímero: crear cuenta/empresa/sede/artículo propios, sembrar saldo 3000 y su versión máxima legal; POST de venta por 1000 con pagos consistentes. Antes: `Internal Server Error`, HTTP **500**. Las consultas posteriores del test confirman cero ventas/líneas/pagos/movimientos y saldo intacto; la atomicidad ya funcionaba.

Causa: incrementar la versión excede BIGINT y genera `DataError` SQLSTATE `22003`, pero solo se traducía `IntegrityError` de clave idempotente. Esperado: conflicto 409 comprensible y rollback, preservando el éxito de la versión máxima menos uno.

MOD-E2-6-001, commit `aae118313d595cb6a681df27854b30fa6097c57b`: capturar el límite numérico/de versión como `SaleBalanceOverflow`, mapearlo a 409 y documentarlo en la respuesta OpenAPI. Regresión `tests/test_sales_review_integration.py::test_sale_balance_version_limit_is_atomic`: última versión válida 201; versión agotada 409 y ninguna escritura parcial. Estado extremo, no se afirma incidencia habitual ni vulnerabilidad de stock.

## AUD-E26-002 / REV-E2-6-002 - P3 - Snapshot sin tipo en OpenAPI

**Estado: confirmado y corregido.** `backend/app/modules/sales/schemas.py`, `SaleView.balances_after` era `list` genérica: OpenAPI producía `items: {}` y no informaba a un cliente tipado los tres campos reales del saldo.

MOD-E2-6-002, commit `0a74f2b6e38a099bad20a2648ebf58547b06442e`: reutilizar `BalanceAfterView` ya existente. OpenAPI describe `catalog_item_id` UUID, `quantity_milli >= 0` y `version >= 1`. Test `test_sales_openapi_describes_balance_snapshot_fields`. No se agrega tabla, endpoint, dato ni representación JSON nueva para snapshots válidos.

## Cuestiones que no se declararon bugs

- Precio/descuento informado por un vendedor autorizado: política a confirmar por el equipo, no fallo aritmético demostrado.
- Replay tras pausar una sede: la validación actual precede al replay; no se alteró unilateralmente esa política. GET histórico mantiene su función de consulta con autorización empresarial.
- Restricciones de escritura SQL directa, carga sostenida y más carreras intermodulares: riesgo residual de despliegue/cobertura, no explotación demostrada por API.
