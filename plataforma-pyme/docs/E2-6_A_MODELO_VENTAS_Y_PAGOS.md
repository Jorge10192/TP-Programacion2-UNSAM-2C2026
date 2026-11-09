# E2-6 A — Persistencia transaccional de Ventas y pagos declarados

**Fecha:** 09/11/2026.  
**Estado:** implementación propuesta en rama `feat/e2-6-a-sales-persistence`, **pendiente de CI y validación local**.  
**Alcance:** exclusivamente `plataforma-pyme/`; sin modificar código de E2-1–E2-5 ni migraciones aplicadas.  
**Base de partida:** `main` `4fad77ea458b195ad136726e670d93a8ecf85f4e`.  
**RF/CU:** **RF-07 / CU-10**, dependencias RF-03 (ubicaciones), RF-04 (catálogo), RF-05 (recepción), RF-06 (stock).  
**Referencias:** `entrega-programacion-2/{01,02,03,04,05}`; `docs/ADR/ADR-004-stock-unidades-sku.md`, `docs/ADR/ADR-006-ventas-pagos-qr.md`, `docs/20_E1_C1_VENTAS_DEMO.md`. La DEMO no equivale a backend de ventas.

## 1. División ejecutable del bloque E2-6

| Etapa | Objetivo | Evidencia de aceptación |
|---|---|---|
| **E2-6 A** | Modelos SQL, FK tenant, snapshots, pagos declarados, origen `VENTA_SALIDA`, migración aditiva y pruebas de DB | DDL + Alembic + tests estructurales e integración PostgreSQL; ninguna venta puede ejecutarse aún por HTTP |
| **E2-6 B** | `POST/GET /api/v1/businesses/{business_id}/sales`: validaciones Pydantic, centavos exactos, descuento, split, lectura, auth, permisos e idempotencia | Servicio y API con venta solo de servicios sin ubicación, y ventas mixtas a pasar a C; 201/200/401/403/404/409/422 |
| **E2-6 C** | Vender bienes físicos y mixtos: locks, débito condicional, ledger `VENTA_SALIDA` una vez por renglón físico y snapshots de saldo | Dos ventas simultáneas por la última unidad: una 201 y otra 409; sin pago ni saldo parcial |
| **E2-6 D** | Hardening y regresión: cambios de pertenencia/rol/sesión, idempotencia/replays, colisiones de compras/stock, errores SQL, límites, mezclas por tenant, QA de permisos | CI y pruebas cruzadas E2-4/E2-5/E2-6; manuales Swagger con datos propios |
| **E2-6 E** | Documentación académica vigente, cierre QA e informe de entrega para auditor independiente | Evidencias con SHA/CI/Swagger reales, PR documental, sin secretos ni tests inventados |

**No se habilitan ventas reales antes de E2-6 C**. La etapa B debe mantenerse acotada: si introduce ventas de servicios, no debe registrar una venta física antes de tener atomicidad de stock. Todo envío de bienes debe rechazarse hasta C.

## 2. Arquitectura y estados AS-IMPLEMENTED en A

### Entidades

- **`Sale` → `sales`**: empresa, `location_id?`, `request_id` UUID4, digest SHA-256, `status=CONFIRMADA`, subtotal, descuento, total, notas, actor y hora. `balances_after` JSONB es snapshot histórico de respuesta tras el commit, **no una fuente de saldo editable**. `request_id` es único **dentro de una empresa**.
- **`SaleLine` → `sale_lines`**: 1..30 (obligación del servicio), `line_number` único por venta, artículo de empresa, snapshots de nombre/tipo/unidad/SKU, cantidad milésima, precio unitario y total por línea `HALF_UP`. `catalog_item_id` siempre existe; **no se ofrecen conceptos libres** en E2-6 MVP.
- **`SalePayment` → `sale_payments`**: 1..6 (obligación del servicio), orden y método tipado, importe positivo y referencia declarativa. Medios: `EFECTIVO`, `TRANSFERENCIA`, `CUENTA_DNI`, `TARJETA`, `MERCADO_PAGO_DECLARADO`. **Ninguno** indica acreditación o movimiento bancario.
- **`StockMovement` → `stock_movements`**: nuevo origen alternativo `sale_id` + `sale_line_id`, evento `VENTA_SALIDA`, `delta_milli < 0`, FK compuesta de tres campos a `sale_lines(business_id,sale_id,id)` y `UNIQUE(business_id,sale_id,sale_line_id)` para evitar descontar dos veces un mismo renglón. Los seis eventos históricos E2-4/E2-5 continúan conservando su origen/signo anterior y no se reescriben.

### Migración

`backend/alembic/versions/20261109_0017_sales_foundation.py`: **`e26a_sales_foundation`** desciende de `e25a_inventory_ops`. Agrega tres tablas y dos columnas **opcionales** en `stock_movements`, reemplazando únicamente el CHECK de origen/signo para admitir ventas. No ejecuta UPDATE de saldos, movimientos o compras previas. El `downgrade` **se bloquea si existen ventas**; no debe ejecutarse sobre datos QA o productivos.

### Reglas SQL vs. reglas de servicio pendientes

**La DB protege:** tenant en FK, cabecera idempotente única, autor perteneciente a la empresa, renglón físico firmado ligado a la misma venta, cantidad y precio en rangos, unidades discretas, `HALF_UP` por línea, importes por pago positivos, total = subtotal − descuento (total >0), unicidad de renglones y de pagos. `StockBalance` existente mantiene su CHECK no negativo.

**No se puede inferir de CHECK por fila:** que los pagos de todas las filas sumen exactamente el total, que la suma de renglones coincida con subtotal, que haya mínimo 1 y máximo 30 renglones o entre 1 y 6 pagos, que una venta con BIEN obligue ubicación y saldos, que el `kind_snapshot` coincida con el catálogo vigente, ni que una `VENTA_SALIDA` sea de bien físico o coincida en cantidad con el renglón. **Todas esas reglas corresponden al servicio transaccional B/C y deben probarse con API + PostgreSQL.** El esquema no certifica ventas completas por INSERT SQL aislados; no crear ventas manuales en producción.

**Reglas de dominio decididas para B/C:** `location_id` es nullable para venta exclusiva de servicios. Para ventas con bienes se exige `Location.ACTIVA`, `can_sell` y `can_store`, membresía/STORE/SELL autorizadas, saldo vigente suficiente. Los servicios no generan movimiento; **no reservan ni consumen insumos automáticamente**. En una venta mixta la agrupación de artículos repetidos solo afecta stock; los precios se redondean **por renglón**.

## 3. Exactitud monetaria y ejemplo

- `line_total_cents = floor((quantity_milli * unit_price_cents + 500) / 1000)` para no negativos, con aritmética `NUMERIC` en PostgreSQL y enteros en servicio.
- `subtotal_cents = sum(line_total_cents)` por línea **sin agrupar importes**.
- `total_cents = subtotal_cents - discount_cents` **estrictamente positivo**.
- `sum(payment.amount_cents) = total_cents` exacto, **sin floats**.
- Una línea de 0,333 kg a 1.050 centavos/kg totaliza 350 centavos; tres líneas separadas: 1.050 centavos, aunque el total de cantidad agregada de 0,999 kg daría 1.049 centavos.

## 4. Pruebas propuestas y operación segura

- `test_sale_foundation_model.py`: registro ORM, tipos, FK tenant, origen XOR, check de cantidades y centavos, enumeraciones y SHA.
- `test_sale_foundation_integration.py`: DB PostgreSQL, servicio-only sin sede, pago dividido, FK cruzada rechazada, misma clave duplicada, descuento inválido, unidad discreta, HALF_UP exacto y movimiento de venta no positivo/duplicado.
- Regresión: `test_receipt_models.py` actualiza sus expectativas por **la nueva FK opcional**; pruebas E2-4/E2-5 permanecen con la semántica original de sus operaciones.

**Primero validar CI de rama/PR.** Para ejecución local usar PostgreSQL **conocido y aislado**, sin borrar ni reconfigurar el volumen QA existente. En `plataforma-pyme/backend` tras el merge aprobado y migración aditiva sobre DB de desarrollo conocida:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
$env:RUN_DB_INTEGRATION = "1"
try {
    .\.venv\Scripts\python.exe -m pytest -q
} finally {
    Remove-Item Env:\RUN_DB_INTEGRATION -ErrorAction SilentlyContinue
}
```

**No ejecutar ahora** estos comandos sin decisión y sin verificar la DB: este documento se publica en **rama funcional PR**, y las pruebas de integración tienen datos temporales/rollbacks. No se ha ejecutado Pytest ni Alembic en la máquina del desarrollador durante esta entrega. En particular, nunca hacer `docker compose down -v`, `alembic downgrade`, `stamp` ni `TRUNCATE` sobre DB de desarrollo.

## 5. Criterios de aceptación de E2-6 A

1. PR limitado a E2-6 A, migración nueva y cambios compatibles de ledger/DTO, sin reescribir datos o migraciones E2-4/E2-5.
2. `alembic upgrade head`, `current` (`e26a_sales_foundation`) y `check` verde en **CI PostgreSQL 16**.
3. Tests nuevos y suite de regresión completa verdes en CI Python 3.12/3.14.
4. Revisión manual de SQL tenant, origen XOR, cantidad, precio, `HALF_UP` y riesgos residuales.
5. Solo después de aprobar B/C declarar el endpoint `POST sales` como funcional. La existencia de tablas **no es una API de ventas**.

**Siguiente trabajo directo:** E2-6 B, contratos Pydantic y API de ventas de servicios; E2-6 C cierre atómico de ventas físicas/mixtas, con pruebas de carrera.
