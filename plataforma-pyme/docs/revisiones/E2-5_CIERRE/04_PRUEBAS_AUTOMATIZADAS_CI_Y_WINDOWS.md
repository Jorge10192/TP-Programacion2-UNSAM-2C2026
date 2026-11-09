# E2-5 — Pruebas automatizadas, GitHub Actions, Alembic y Windows

**Fecha de corte:** 09/11/2026. **Repositorio y SHAs:** ver `00_LEEME.md`. Se distinguen verificaciones en GitHub de logs aportados por el desarrollador. Las cantidades reflejan **la suite completa del backend** en cada corte, no el número de tests exclusivos de E2-5.

## 1. CI final por subincremento — comprobado en GitHub

| Corte | PR fusionado | SHA en `main` | Run sobre merge | Python 3.12 | Python 3.14 | Docker/liveness |
|---|---|---|---|---:|---:|---|
| **A — Modelo** | [#21](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/21) | `4268846abc524ebd827b4da930ef58d8d9789ac7` | [42601062105](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42601062105) | **816 passed**, 1 warning | **816 passed**, 2 warnings | **success** |
| **B — Traslados** | [#22](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/22) | `4f992b3beb8dda732e4cd752f828b375f240e13d` | [42604071018](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42604071018) | **826 passed** | **826 passed** | **success** |
| **C — Ajustes/inicial** | [#23](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/23) | `748e69319d8d04900c009d5184168a264a9deeac` | [42617212795](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42617212795) | **840 passed**, 4 warnings | **840 passed**, 2 warnings | **success** |

**Todos esos runs terminaron `success` con 3/3 jobs exitosos** (Python 3.12 + PostgreSQL, Python 3.14 + PostgreSQL, construcción y liveness Docker). En cada suite aparece `e25a_inventory_ops (head)` y `No new upgrade operations detected.`. Las advertencias de pytest no son fallos; deben investigarse si se prioriza limpieza técnica, sin tergiversar el resultado.

**Importante sobre las cifras:** A→B añadió 10 pruebas a la suite (816→826); B→C añadió 14 (826→840). Esto **no** es una métrica de cobertura de líneas ni de exhaustividad de la seguridad.

## 2. Validación en Windows (fuente: salida del desarrollador)

### E2-5 C — evidencia íntegra aportada al cierre

Comandos ejecutados dentro de `plataforma-pyme/`, con `main` actualizado:

```powershell
git switch main
git pull --ff-only origin main
git rev-parse HEAD
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
Invoke-RestMethod http://127.0.0.1:18000/ready
```

**Salida observada y aportada:**

- `git rev-parse HEAD`: `748e69319d8d04900c009d5184168a264a9deeac`.
- `alembic current`: `e25a_inventory_ops (head)`.
- `alembic check`: `No new upgrade operations detected.`.
- Pytest completo: **`840 passed in 110.89s (0:01:50)`**.
- Docker: imagen `asistente-pyme-e2-api` reconstruida; contenedores DB y API en **Healthy**.
- `/ready`: `status=ready`, `database=ok`.
- El `git pull --ff-only` fue fast-forward de `4f992b3` a `748e693`; no hubo rebase ni reset.

### E2-5 B — antecedente local reportado

En el historial del desarrollo se reportaron **826 pruebas locales aprobadas** tras B, Alembic en `e25a_inventory_ops` y Docker/API saludables. Se registra como **antecedente reportado**, no como una segunda reejecución en el corte de C. La corrida completa de C (840) también recorrió las regresiones de B.

### E2-5 A — límite documental

Se comprobó CI 816/816. **No se dispone en esta conversación de una transcripción local A individual con resultado exacto** para adjuntar. No se fabrica ese registro: el cierre Windows consolidado más reciente es el de E2-5 C, que ejecutó la suite completa sobre el modelo A integrado.

## 3. Qué prueban los tests específicos

| Familia de archivo en `plataforma-pyme/backend/tests/` | Cobertura representativa |
|---|---|
| `test_inventory_operation_model.py` | Metadatos ORM, FK, CHECK/UNIQUE, restricciones estructurales de operaciones y movimientos |
| `test_inventory_operation_integration.py` | Restricciones SQL reales, tenant, dirección/signos, idempotencia estructural, retrocompatibilidad de recepción |
| `test_transfer_api_integration.py` | POST/GET traslado, movimiento dual, reintento, rechazo por insuficiencia/cuerpo inválido, RBAC, tenant, recibos anteriores |
| `test_transfer_concurrency_integration.py` | Doble salida rival desde el mismo saldo (201/409), replay concurrente (201/200), traslados opuestos sin pérdida |
| `test_adjustment_api_integration.py` | Inicial único, entrada/salida, saldo cero previo, replay/colisión, versión obsoleta, roles, tenant, interoperabilidad con traslado |
| `test_adjustment_concurrency_integration.py` | Dos salidas sobre la misma versión (201/409), mismo pedido paralelo (201/200), inicializaciones rivales (201/409) |
| `test_receipt_api_integration.py` y `test_receipt_concurrency_integration.py` | Regresión E2-4: recepción completa, reintentos, ledger por recepción, carreras en saldo inicialmente ausente |

**Pruebas de concurrencia:** las suites B/C utilizan solicitudes HTTP separadas y conexiones PostgreSQL reales, con datos temporales específicos del test. No son una auditoría de escalabilidad, resiliencia, transacciones distribuidas ni fallos de infraestructura. Evitar declarar benchmarks que no se hicieron.

## 4. Incidente de CI durante desarrollo de E2-5 C

Una primera corrida de 840 pruebas falló **en dos aserciones nuevas** que esperaban `[]` mientras el helper `view_balances(...)` devolvía `{}` cuando no había saldos. Otros escenarios, incluidos los tres de concurrencia, ya pasaban. Se corrigieron las aserciones, **sin alterar la lógica de stock por ese incidente**, y se verificó de nuevo la suite completa. Este antecedente muestra una corrección de test, no un bug de producción demostrado. El run de código [42616213215](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42616213215) ya fue verde antes de la documentación final; el run de merge [42617212795](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42617212795) también es verde.

## 5. Limitaciones explícitas

- No hay porcentaje de cobertura publicado de `coverage.py`: **840/840 es cantidad, no cobertura del 100 %**.
- Los tests locales aún pueden ejecutarse contra la base de desarrollo según la configuración: falta una separación fail-closed de DB de tests (riesgo heredado E2-4). No se hicieron limpiezas globales para obtener verde.
- Que CI salga bien no prueba todos los permisos/configuraciones de producción ni elimina la necesidad de auditoría independiente.
- La salida Windows es **evidencia aportada**, no un acceso remoto a esa máquina realizado para este paquete.

## Nota de esta actualización documental (v1.1)

La lectura de observaciones externas y la incorporación de este paquete a una rama de Git **no constituyen pruebas de ejecución de código ni cambian los resultados anteriores**. Las suites 816/826/840 y el QA de Swagger se atribuyen exactamente a sus cortes originales. Para evaluar los riesgos nuevos de concurrencia (especialmente ajuste contra traslado al mismo destino), reversión, permisos SQL y reservas deberá diseñarse y correr una suite específica en el futuro; no se afirma aquí haberla ejecutado.
