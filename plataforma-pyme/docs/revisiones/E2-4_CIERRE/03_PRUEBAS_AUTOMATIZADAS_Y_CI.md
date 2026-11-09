# E2-4 — Pruebas automatizadas, CI e incidente local

**Corte de evidencia:** 2026-11-08 · **Commit de cierre:** `4f88416141c09a82e744990b1aee8c00b9f31dfd`.
Los resultados de CI se consultaron en GitHub Actions; los resultados Windows y Swagger fueron aportados por el desarrollador. No atribuir una ejecución local a CI ni viceversa.

## 1. Evolución verificable por PR

| Corte | PR | Merge | Migración vigente | CI Python 3.12 | CI Python 3.14 | Run |
|---|---|---|---|---|---|---|
| E2-4 A: proveedores ORM | [#12](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/12) | `e322cd627ca199516c52c2e230412c0da4e3cbe6` | `e24a_suppliers` | 598 passed | 598 passed | [42511812005](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42511812005) |
| E2-4 B: API proveedores | [#13](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/13) | `be37d7b22ec6ac0b7ef4db76d2c5eee81412af88` | `e24a_suppliers` | 693 passed | 693 passed | [42514595377](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42514595377) |
| E2-4 C: compras ORM | [#14](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/14) | `170d9803943392f085de5a984af142364d2865b5` | `e24c_purchases` | 717 passed | 717 passed | [42520791923](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42520791923) |
| E2-4 D: API compras | [#15](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/15) | `3c75ecadd20f3efffba55fadd9037f480c62417b` | `e24d_purchase_hash` | 772 passed | 772 passed | [42523855898](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42523855898) |
| E2-4 E: recepción/stock | [#17](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/17) | `782999f3783a0916faf1fc07f3154902012194c4` | `e24e_receipt_stock` | 796 passed | 796 passed | [42528940012](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42528940012) |
| Corrección tests QA | [#18](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/18) | `4f88416141c09a82e744990b1aee8c00b9f31dfd` | `e24e_receipt_stock` | **797 passed** | **797 passed** | [42530739959](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42530739959) |

**CI último corte:** los tres trabajos concluyeron `success`: pruebas y PostgreSQL 16 con Python 3.12, las mismas con Python 3.14, y construcción/liveness de Docker. `alembic current` imprimió `e24e_receipt_stock (head)`; `alembic check`: `No new upgrade operations detected.`. GitHub reportó **797 passed, 1 warning** en cada versión; la advertencia no equivale a un fallo de tests.

## 2. Validación Windows aportada por el desarrollador

Después del merge #17, migración `e24e_receipt_stock` y prueba local con dos compras QA preexistentes:
- Primera suite: **781 passed, 15 failed** en `tests/test_purchase_integration.py` (102,35 segundos).
- Alembic: `e24e_receipt_stock (head)` y `No new upgrade operations detected.`.
- API y PostgreSQL Docker: `healthy`; `GET /ready` = `{"status":"ready","database":"ok"}`.

Después del merge #18 sobre commit `4f88416141c09a82e744990b1aee8c00b9f31dfd`:
- `pytest -q tests/test_purchase_integration.py`: **20 passed in 6.54s**.
- `pytest -q`: **797 passed in 95.24s**.
- Base local conservada; no se borraron compras, usuarios ni volúmenes. Las capturas y logs de origen están fuera de Git y no incluyen secretos en este cierre.

## 3. Incidente E2-4 — 15 fallas locales, raíz y solución

**Síntoma:** `SELECT purchase_lines.id` sin WHERE devolvía **tres** registros donde el test esperaba **uno**. Otros tests usaban `scalar_one()` y encontraban más de una fila; consultas globales a `purchases` fallaban al encontrar las compras de Swagger. El primer lote incluía dos líneas históricas QA: una de concepto libre y otra física.

**Causa confirmada:** los tests antiguos de restricciones SQL suponían implícitamente una base vacía, aunque su fixture revertía las inserciones de cada test. Se ejecutaron contra PostgreSQL local que contenía datos de pruebas de uso persistidas.

**Corrección #18:** las aserciones se acotaron por `business_id`, `purchase_id` y/o `request_id` del propio caso, y se añadió una regresión con más de un tenant. **No** se alteraron API, reglas de negocio, tablas ni migraciones para silenciar los fallos.

**Deuda adicional no resuelta:** el test runner local aún puede apuntar a la base de desarrollo. Filtrar aserciones resuelve la contaminación de resultados, pero **no equivale a un ambiente físicamente separado**. Se recomienda base `pyme_test_db` o contenedor efímero, con URL/credenciales de prueba independientes y chequeo fail-closed para impedir ejecución contra producción. Debe implementarse en un bloque posterior con pruebas, sin borrar la base existente ni alterar `conftest.py` a ciegas.

## 4. Cobertura de pruebas E2-4 — qué se comprobó

| Componente | Familias representativas | Qué garantizan dentro del alcance |
|---|---|---|
| Proveedores | `test_supplier_model.py`, `test_supplier_integration.py`, `test_supplier_schemas.py`, `test_supplier_http.py`, `test_supplier_api_integration.py` | restricciones, nombre canónico por tenant, RBAC, respuestas REST, fallos 401/403/404/409/422 y rollback |
| Compras | `test_purchase_model.py`, `test_purchase_integration.py`, `test_purchase_http.py`, `test_purchase_api_integration.py` | snapshots, proveedor opcional, cifras enteras, cálculo HALF_UP, idempotencia, integridad por tenant, ausencia de stock al registrar |
| Recepción | `test_receipt_models.py`, `test_receipt_http.py`, `test_receipt_api_integration.py` | compra física única, destino apto, permisos STORE, estados, rechazo de duplicados, rollback, entrada histórica y saldo |
| Concurrencia | `test_receipt_concurrency_integration.py` | dos compras ingresando en saldo inicialmente ausente; dos solicitudes sobre una compra; reintentos simultáneos |
| Esquema | `test_postgres_integration.py` y `alembic check` | migración vigente, conexión real y esquema sin deriva |

Los tests concurrentes son funcionales en PostgreSQL, **no** benchmarks de carga ni ensayos de resiliencia ante fallos de infraestructura. La cobertura numérica de código de tipo `coverage.py` **no fue medida**: 797/797 es cantidad de casos aprobados, no porcentaje de líneas cubiertas.

## 5. Comandos usados y reejecución

Desde `plataforma-pyme/backend/` en PowerShell, sobre una base de desarrollo migrada y **nunca producción**:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
$env:RUN_DB_INTEGRATION = "1"
try {
    .\.venv\Scripts\python.exe -m pytest -q tests/test_purchase_integration.py
    .\.venv\Scripts\python.exe -m pytest -q
} finally {
    Remove-Item Env:\RUN_DB_INTEGRATION -ErrorAction SilentlyContinue
}
```

Desde `plataforma-pyme/`: `docker compose --profile api up -d --build --wait api`, `docker compose ps` y `Invoke-RestMethod http://127.0.0.1:18000/ready`.

**No ejecutar:** `docker compose down -v`, `TRUNCATE`, `DROP`, `alembic downgrade`, `alembic stamp` ni limpiar registros QA para lograr verdes.

## 6. Evidencia manual y pendientes

La bitácora detallada está en [02_BITACORA_PRUEBAS_SWAGGER.md](02_BITACORA_PRUEBAS_SWAGGER.md) y el catálogo de recursos de QA en [06_FICHA_DATOS_QA.md](06_FICHA_DATOS_QA.md). La verificación manual completa de CRUD Proveedores **no dispone de transcripción HTTP integral**; no afirmar que la hubo. Cubierta por tests automáticos y CI, pero pendiente de una bitácora manual específica si el docente la exige.
