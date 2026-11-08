# E2-3 D — Matriz técnica de integridad y regresión del Catálogo

**Proyecto:** Asistente PyME (multiempresa y multirrubro)  
**Fecha:** 08/11/2026  
**Estado:** CÓDIGO Y CI VALIDADOS; EJECUCIÓN WINDOWS DEL CORTE D PENDIENTE  
**Base funcional:** E2-3 C, commit `5fe257f140ebc0d19d6504798bcdee02b9c7e314`  
**Corte de pruebas D:** `8598c271eeaf5a21e64909e518765135d22fbc03`  
**Corte de paginación D:** `bf4fd3fa809c9f4e6afdeb064a155acf233b1722`  
**CI del último código:** https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42508771222

## 1. Propósito del incremento

Cerrar los casos límite de los cinco endpoints de Catálogo ya construidos en E2-3 B/C sin agregar funciones comerciales, inventario o modificaciones innecesarias de modelos y migraciones de bloques anteriores.

- Se crean, listan, consultan y editan fichas, y se cambia explícitamente `status` ACTIVO/INACTIVO.
- Los bienes físicos ELABORADO/REVENTA/INSUMO usan unidades físicas; SERVICIO usa la unidad SERVICIO.
- Los nombres canónicos y SKU no nulos son únicos por empresa, también para artículos inactivos, pero se pueden reutilizar en otro tenant.
- El catálogo no genera saldo, compra, venta ni movimiento por registrar o activar una ficha.
- El estado de una ficha y el indicador `sellable` son diferentes y no deben confundirse.

## 2. Matriz de regresión nueva

| Dimensión | Prueba / contrato | Evidencia |
|---|---|---|
| Unicode y colisiones | NFKC + casefold en nombres, fullwidth y ligaduras | `test_catalog_hardening_schemas.py`, `test_catalog_api_integration.py` |
| SKU | Canonicalización ASCII, mayúsculas y rechazo de formatos inválidos | Pruebas puras y HTTP de colisión real |
| Límites | casefold que expande el nombre más allá de 90 caracteres; caracteres de control; longitud SKU | Validación Pydantic, 422 |
| Dinero | Enteros estrictos con rango seguro; sin float, bool o cadenas coercionadas | Pruebas del esquema |
| PATCH | Diferencia entre campo ausente y null para SKU/precio/costo; `sellable=false` | SQL y lectura posterior |
| Tipo/unidad | Un cambio parcial incompatible devuelve 422 sin afectar el registro; conversión conjunta válida sin historia comercial | SQL + API |
| Tenants | Dos empresas del mismo usuario, misma clave nominal y UUID ajeno | 404 y verificación de filas intactas |
| Estado | La ficha INACTIVO sigue siendo visible y conserva claves reservadas | SQL + API |
| Fallo posterior a flush | Excepción provocada durante serialización de alta/edición | Rollback, sin fila huérfana ni cambio parcial |
| Paginación | `offset` fuera de rango BIGINT bloqueado antes de SQL | 422; `limit` continúa entre 1 y 500 |
| Regresión global | E2-0, E2-1 y E2-2 no cambiaron | Suite completa y revisión de diff |

## 3. Evidencia CI

- Commit funcional final: `bf4fd3fa809c9f4e6afdeb064a155acf233b1722`.
- GitHub Actions: https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42508771222
- Python 3.12/PostgreSQL 16: **580 passed en 57.31s**.
- Python 3.14/PostgreSQL 16: **580 passed en 57.55s**.
- Docker build/liveness aprobado. Alembic `e23a_catalog (head)`; `alembic check`: sin operaciones pendientes.
- Windows: el último resultado suministrado corresponde a **E2-3 C (527 passed in 59.60s)**. Para E2-3 D **aún no hay ejecución local**.
- El commit documental posterior es una sincronización de evidencias, no un nuevo CI de código.

## 4. Riesgos, límites y dependencias

1. **Concurrencia real:** la UNIQUE por tenant y el bloqueo SQL existente brindan la defensa principal contra dobles altas. Esta entrega prueba conflictos en PostgreSQL y rollback; **no contiene una prueba de carrera simultánea con dos conexiones**, ni ensayo de carga. Registrar explícitamente al auditar.
2. **Historia comercial:** cuando se implementen compras, stock y ventas deberán enlazarse mediante claves del mismo tenant y conservar snapshots. Reglas para impedir conversión de tipo/unidad con operaciones registradas se añaden cuando haya tablas comerciales reales, no antes.
3. **Estado:** al confirmar una compra o venta futura, comprobar si una ficha se encuentra ACTIVO, aparte de `sellable`, ubicación y permisos; el catálogo por sí solo no autoriza la operación.
4. **Front-end:** React continúa en modo DEMO y no llama a este backend; integración y pruebas end-to-end pertenecen a E2-7.
5. **Migración:** no hubo nueva migración en E2-3 D. No editar migraciones E2-1, E2-2 o E2-3 A ya aplicadas.
6. **Revisión independiente:** no generar informe de auditoría E2-3 hasta reconciliar el UML 03A y recibir la validación Windows de D.

## 5. Próxima ejecución Windows (base de desarrollo, no producción)

Desde `plataforma-pyme/`:

```powershell
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
docker compose ps
Invoke-RestMethod http://127.0.0.1:18000/ready
```

Esperado: **580 passed**, `e23a_catalog (head)`, ausencia de deriva, dos contenedores `healthy` y `ready/ok`. No usar `downgrade`, `stamp` ni borrar volúmenes.

**Luego:** E2-3 E — conciliar 03A PUML/guía/SVG y cerrar documentos 01–05 con un SHA fijo para auditoría externa. No iniciar E2-4 en el mismo corte.
