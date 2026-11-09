---
tipo_documento: "INFORME_DE_CIERRE"
bloque: "E2-4"
estado: "COMPLETADO_PARA_ALCANCE_BACKEND"
proyecto: "Plataforma PyME — Programación 2 UNSAM 2C2026"
fecha_corte_evidencia: "2026-11-08"
commit_cierre: "4f88416141c09a82e744990b1aee8c00b9f31dfd"
pr_funcionales: [12, 13, 14, 15, 17]
pr_correccion_tests: 18
pruebas_locales: "797/797"
ci_status: "SUCCESS"
ci_run: 42530739959
entorno_manual: "Windows + Swagger UI + PostgreSQL 16"
clasificacion: "CI verificado / local reportado / Swagger reportado"
---

# Informe consolidado de cierre E2-4

**Plataforma de gestión multiempresa para PyMEs**  
**Trabajo Práctico Final de Programación 2 · UNSAM · 2C2026**  
**Corte:** 8 de noviembre de 2026 · **Rama:** `main` · **Último merge documentado:** `4f88416141c09a82e744990b1aee8c00b9f31dfd`

## 1. Resumen ejecutivo

El bloque **E2-4** construyó y validó el circuito backend de **proveedores → registro de compras → recepción física completa → saldos de inventario y ledger de movimientos**. El sistema mantiene el aislamiento por empresa y separa de forma explícita el **registro comercial** de una compra de su **efecto físico** sobre existencias. El negocio ejemplo de las pruebas se denomina *Comercio de Prueba QA*; la solución no está restringida a ese rubro ni a WALOS.

Se integraron los incrementos A–E mediante los **PR #12, #13, #14, #15 y #17**, más el **PR #18** para corregir pruebas SQL que asumían una base vacía. En el cierre local, sobre Windows y PostgreSQL **con datos QA preexistentes**, se obtuvieron **797 pruebas aprobadas de 797** en `95,24 s`. Una ejecución previa había arrojado **781 aprobadas y 15 fallidas** por aserciones SQL no filtradas por tenant; la corrección fue revalidada con **20/20 tests del archivo afectado**, **797/797 globales** y **3/3 trabajos verdes en CI**.

La validación funcional manual utilizó Swagger UI. Se creó una compra de concepto libre por **12.505 centavos** (`CERRADA_SIN_RECEPCION`) y una compra de **10 unidades físicas** por **1.000.000 de centavos** (`REGISTRADA`). Esta última fue recibida una vez en *Depósito QA*: se observó `201 Created`, estado `RECIBIDA`, movimiento `+10000` milésimas y saldo `10000` con versión `1`. El mismo intento con la clave de idempotencia original devolvió `200 OK` sin duplicar la entrada; otra clave devolvió `409 Conflict`, como correspondía. Un GET filtrado confirmó el único movimiento histórico.

**Conclusión:** el alcance comprometido para E2-4 está implementado y tiene evidencia automatizada y manual suficiente para documentar el cierre académico del bloque. Esto **no** equivale a afirmar que el TP completo, el frontend integrado, las ventas o todo el inventario estén finalizados.

## 2. Objetivos del bloque y correspondencia con los requisitos

- **RF-05 / CU-06:** registrar una compra con proveedor opcional, renglones físicos o conceptos, importes exactos y snapshots. El registro **no** modifica stock.
- **RF-05 / CU-07:** confirmar una **única recepción completa** de una compra con bienes físicos, en una ubicación válida, con permiso `STORE`, cambios transaccionales y reintentos seguros.
- **RF-06 / CU-08, primera parte:** consultar saldos por empresa/ubicación/artículo y consultar entradas físicas auditables.
- **RF-03 / CU-04, dependencia:** usar ubicaciones reales, estados y capacidades; no inventar depósitos al crear una empresa.
- **RF-04 / CU-05, dependencia:** catálogo tipado, activo, con unidades de medida y validación del historial.

La matriz completa aparece en `05_TRAZABILIDAD_Y_PENDIENTES.md`.

## 3. Alcance por incremento

| Corte | Entregable | Resultado verificable |
|---|---|---|
| **E2-4 A** | Entidad `Supplier`, restricciones PostgreSQL, migración `e24a_suppliers` y tests | Persistencia aislada por empresa; sin compras ni stock automáticos |
| **E2-4 B** | API REST de Proveedores (alta, listado, detalle, edición y estado) | Validación de campos, nombre normalizado, permisos y aislamiento multiempresa |
| **E2-4 C** | Entidades `Purchase`, `PurchaseLine` y migración `e24c_purchases` | Compra y líneas con snapshots, centavos y milésimas, sin recepción implícita |
| **E2-4 D** | API de Compras y migración `e24d_purchase_hash` | `POST/GET/GET detalle`, idempotencia, cálculo de totales y estados |
| **E2-4 E** | `PurchaseReceipt`, `StockMovement`, `StockBalance`, migración `e24e_receipt_stock` y endpoints | Recepción única, movimiento por línea, saldo atómico, GET de recibo/saldos/ledger |
| **PR #18** | Corrección de tests de compras sobre base con datos preexistentes | Tests con consultas por tenant/documento, sin limpiar los datos de QA |

### 3.1 Reglas de negocio efectivamente cubiertas

1. Una compra física puede existir **sin ubicación de recepción**. Registrar compra no aumenta existencias.
2. Las compras sin líneas físicas permanecen `CERRADA_SIN_RECEPCION`; no tienen una recepción inventada.
3. Una compra con al menos una línea física nace `REGISTRADA`. Al recibirla por completo pasa a `RECIBIDA`.
4. La recepción se confirma en **una sola ubicación activa** con `can_store=true`. El permiso comercial de venta (`can_sell`) es independiente.
5. La recepción usa **cantidades históricas** de las líneas, no cantidades reenviadas por el cliente. Un comando no acepta recepción parcial ni multidestino.
6. Solo bienes físicos generan movimientos. Servicios y conceptos no alteran existencias.
7. El registro de recepción, los movimientos, las actualizaciones de saldos, el estado de compra y la respuesta idempotente se efectúan en una misma transacción.
8. Una clave idempotente repetida con la misma compra, carga y actor devuelve el resultado histórico (HTTP `200`); una clave distinta después del éxito no vuelve a ingresar mercadería (`409`).
9. Las consultas y las FK compuestas restringen las referencias al mismo `business_id`.
10. Un artículo con historial de compra o stock no puede reinterpretar su **tipo o unidad** mediante edición de Catálogo; los snapshots históricos se mantienen.

## 4. Diseño técnico e integridad

**Stack:** FastAPI/Pydantic, SQLAlchemy 2, PostgreSQL 16, Alembic, Docker Compose; frontend React + TypeScript/Vite existente, pero **no conectado a esta API en el corte E2-4**.

**Persistencia comercial.** `suppliers` almacena fichas por tenant, con unicidad canónica del nombre. `purchases` guarda documento, fecha, proveedor opcional, estado, total y actor; `purchase_lines` conserva línea, artículo opcional, descripción/tipo/unidad/SKU históricos, cantidad milésimas y costo/total centavos. No se reescriben retrospectivamente por editar un proveedor o un artículo.

**Persistencia física.** `purchase_receipts` registra comprobante, compra, ubicación, actor y una huella para idempotencia; se limita a **0..1 recepción por compra**. `stock_movements` registra un movimiento positivo por renglón físico con referencias a recibo, línea, artículo, ubicación y actor. `stock_balances` proyecta el saldo transaccional por la clave `(empresa, ubicación, artículo)` y una `version` incremental.

**Operación atómica.** El servicio de recepción bloquea los registros operacionales pertinentes, revalida estado/permiso y usa `INSERT ... ON CONFLICT DO UPDATE` en PostgreSQL para incrementar saldos, incluso cuando la fila de stock todavía no existe. La unicidad en la recepción y por recibo/línea evita duplicaciones; una falla cancela la transacción completa.

**Cautela conceptual:** el ledger de este corte contiene exclusivamente eventos `COMPRA_RECEPCION` y se presenta como historial *no editable por la API*. La arquitectura posterior prevé otros orígenes (ventas y operaciones), pero no están implementados aquí. No se presume una garantía universal de inmutabilidad frente a modificaciones SQL privilegiadas.

Los contratos y restricciones se desarrollan en `04_ARQUITECTURA_API_Y_DATOS.md`.

## 5. Evidencia de ejecución: automatización y entorno

### 5.1 GitHub Actions

Cada corte tuvo ejecución final exitosa con **Python 3.12, Python 3.14, PostgreSQL 16, revisión de Alembic y construcción/healthcheck de Docker**.

| Corte | PR | Tests por versión en CI | Ejecución de Actions |
|---|---|---:|---|
| A | #12 | 598 | [42511812005](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42511812005) |
| B | #13 | 693 | [42514595377](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42514595377) |
| C | #14 | 717 | [42520791923](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42520791923) |
| D | #15 | 772 | [42523855898](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42523855898) |
| E | #17 | 796 | [42528940012](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42528940012) |
| Corrección | #18 | **797** | [42530739959](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42530739959) |

**Revisiones de migración por corte:** A/B `e24a_suppliers`; C `e24c_purchases`; D `e24d_purchase_hash`; E y corrección `e24e_receipt_stock`.

Todos los trabajos de las seis ejecuciones indicadas finalizaron en **`success` (3/3 por run)**. En el último run Python 3.12 y 3.14 obtuvieron **797 tests aprobados**. Se observó **una advertencia no bloqueante** en los logs de esa ejecución; no hubo fallas.

### 5.2 Validación en Windows con datos QA existentes

Tras integrar el PR #17 a `main` y aplicar la migración nueva, el desarrollador observó:

- `e24e_receipt_stock (head)`.
- `No new upgrade operations detected.`.
- `781 passed, 15 failed` al ejecutar toda la suite: **fallaron 15 aserciones antiguas de `test_purchase_integration.py` que consultaban todas las compras de la base en lugar de limitarse al tenant/documento de la prueba**.
- Docker FastAPI y PostgreSQL `healthy`; `GET /ready` entregó `status=ready`, `database=ok`.

En esta base existían las compras QA creadas manualmente. El test que esperaba una línea encontró tres: **dos renglones QA preexistentes y el renglón creado temporalmente**; otra prueba que usaba `scalar_one()` sin filtro recibió `MultipleResultsFound`. No fue una violación de negocio en la recepción: fue un error de diseño de test que CI, con una base limpia, no había expuesto.

El PR #18 limitó las aserciones a `business_id`, `purchase_id` o al identificador propio de la solicitud, y añadió una regresión con datos de dos empresas. **Sin borrar la base**, después de `git pull` el desarrollador ejecutó:

- `pytest -q tests/test_purchase_integration.py` → **20 passed in 6.54s**.
- `pytest -q` con `RUN_DB_INTEGRATION=1` → **797 passed in 95.24s**.
- Commit de `main` observado en el merge: `4f88416141c09a82e744990b1aee8c00b9f31dfd`.

**Alcance de esta evidencia:** la integración local se verificó sobre la base existente; no se eliminaron las compras de QA, y la corrección del PR #18 **solo modifica tests**. Para el detalle técnico, consultar `03_PRUEBAS_AUTOMATIZADAS_Y_CI.md`.

## 6. Evidencia de pruebas de uso (Swagger UI)

### 6.1 Preparación

- Se utilizó `http://127.0.0.1:18000/docs`, con autenticación Bearer obtenida mediante login. La sesión de Swagger debió restablecerse tras reabrir la interfaz; **los datos de PostgreSQL seguían persistidos**.
- Se operó una única empresa QA: `bd4d4e42-4ff6-403a-8633-59cbc001487d`.
- Se utilizaron los identificadores existentes de proveedor y artículo. Se creó el depósito `Depósito QA` cuando el GET de ubicaciones mostró `[]`.
- Los comandos `POST` idempotentes requirieron una clave UUID4 de encabezado; **los valores se omiten** deliberadamente en esta entrega.

### 6.2 Escenario de compra administrativa (sin stock)

1. `POST /purchases` con un concepto libre *Servicio de limpieza externo*: `quantity_milli=1000`, `unit_cost_cents=12505`, sin proveedor ni catálogo, referencia `QA-COMPRA-001`.
2. HTTP **201**: compra `b6646fcd-428f-4b9b-ab80-83e7ffb14827`, estado `CERRADA_SIN_RECEPCION`, total `12505` centavos, una línea `CONCEPTO`.
3. Repetición del mismo comando y clave: **200** con mismo `id`, `created_at` y línea.
4. Reutilización de la misma clave pero con costo alterado a `20000` centavos: **409**, detalle **«Clave de compra reutilizada con contenido diferente»**. No se creó otra compra.
5. `GET /purchases?offset=0&limit=100`: **200**, lista de **una compra** en ese momento; `GET /purchases/{id}`: **200** con los datos originales.

### 6.3 Escenario de compra física y recepción

1. `POST /catalog`: *Alimento balanceado QA*, `REVENTA`, tipo `BIEN`, SKU `ALIM-QA-001`, unidad `UNIDAD`, costo de referencia `100000`, precio de venta `150000` centavos → **201**. Artículo `881fdae2-18c5-46ae-8037-44a500ca96c0`.
2. `POST /purchases` con proveedor *Distribuidora QA*, artículo anterior, `quantity_milli=10000` (10 unidades), `unit_cost_cents=100000` ($1.000 por unidad), referencia `QA-COMPRA-002` → **201**. Compra `3e50aff2-c895-49d9-8fe5-d5843438f109`, estado `REGISTRADA`, total `1000000` centavos ($10.000), **todavía sin stock**.
3. `GET /locations` → **200** y `[]`: la empresa no tenía depósitos.
4. `POST /locations` con *Depósito QA*, `kind=DEPOSITO`, `can_store=true`, `can_sell=false` → **201**, ubicación `2d6761c4-efec-4b3e-925c-a24ceab8ce9c`, estado `ACTIVA`, `is_primary=true`.
5. `GET /locations` → **200** y lista con el depósito; `GET /purchases/{id}` → **200** confirmando estado `REGISTRADA` antes de recibir.
6. `POST /purchases/{id}/receive` con el `location_id` del depósito → **201**: recepción `266bd03e-763b-4f29-8f12-c19c9bc59066`, compra `RECIBIDA`, un movimiento `+10000` y `balances_after.quantity_milli=10000`, `version=1`.
7. Un segundo POST con **otra** clave fue rechazado con **409** y detalle **«Compra ya recibida, cancelada o sin bienes fisicos recepcionables»**; rechazo esperado, no falla del módulo.
8. Un POST de reintento con **la clave y el cuerpo originales** devolvió **200**, mismo recibo, movimiento, autor y fecha de recepción.
9. Un GET inicial de saldos con un `location_id` de ejemplo incorrecto devolvió **200, `[]`**: filtro sin coincidencias, no pérdida de stock.
10. `GET /inventory/balances` filtrado por el depósito y artículo correctos → **200**, **un saldo** de `10000` milésimas y `version=1`.
11. `GET /inventory/movements` con los mismos filtros → **200**, **un único movimiento** `COMPRA_RECEPCION`, `delta_milli=10000`, con referencia a compra, recibo, línea, ubicación y actor.

**Resultado de negocio:** la compra comercial registró la obligación/documento sin crear existencia; la recepción posterior añadió **exactamente 10 unidades** al depósito; ni el reintento aceptado ni el rechazo por clave distinta duplicaron mercadería.

El archivo `02_BITACORA_PRUEBAS_SWAGGER.md` conserva los JSON de entrada sin claves, las respuestas de éxito y errores, fechas y el protocolo de ejecución.

## 7. Matriz resumida de aceptación

| Criterio | Evidencia | Dictamen |
|---|---|---|
| Registrar concepto sin ubicación ni stock | Compra QA-001, `201`, `CERRADA_SIN_RECEPCION` | Cumplido |
| Idempotencia y conflicto de compra | Reintento `200` y cambio de carga `409` | Cumplido |
| Consultas de compras | Listado y detalle `200` | Cumplido |
| Compra física con proveedor real de QA | Compra QA-002 `201`, `REGISTRADA` | Cumplido |
| Crear ubicación apta | `POST /locations` `201`, `ACTIVA`, `can_store` | Cumplido |
| Recibir completa en un destino | `POST /receive` `201`, `RECIBIDA` | Cumplido |
| Evitar doble ingreso | Segunda clave `409`; misma clave `200` | Cumplido |
| Ver saldo actual | `GET /balances` `200`, 10000 milésimas | Cumplido |
| Ver trazabilidad de entrada | `GET /movements` `200`, 1 movimiento | Cumplido |
| Tests sobre base con datos QA | 20/20 focal y 797/797 general Windows | Cumplido |
| Integridad/roles/rollback/concurrencia | Suite CI + tests de integración en PostgreSQL | Cubierto por pruebas automatizadas; no recorrido manual exhaustivo |
| API proveedor CRUD en Swagger | Implementado y probado en CI | Sin transcript manual completo adjunto; no afirmar recorrido manual |

## 8. Limitaciones, riesgos y trabajo posterior

El bloque no incluye recepción parcial, múltiples depósitos en una sola recepción, cancelación mediante API, devoluciones, transferencias, ajustes, salidas por venta, facturación, pagos efectivamente cobrados, conciliación de cuentas, Mercado Pago operativo, integración React–API ni despliegue de producción. `GET /inventory/balances` y movimientos son **la primera parte de RF-06**, no un módulo completo de inventario.

La autorización y concurrencia fueron ejercitadas por la suite automatizada, incluidas pruebas de dos solicitudes simultáneas contra PostgreSQL; la evidencia no equivale a una prueba de carga prolongada ni a una auditoría de seguridad externa. La advertencia no bloqueante de CI queda señalada, sin afirmar un defecto de ejecución.

**Próxima etapa sugerida:** preservar esta evidencia, revisar con el compañero y continuar el plan de construcción incremental; antes del siguiente corte conviene acordar en el plan rector si corresponde ampliar operaciones de inventario o avanzar con ventas según prioridades de TP3/TP Final.

## 9. Conclusión de cierre

La evidencia documentada demuestra que E2-4 introduce un **circuito físicamente consistente** y reproducible para compras y recepciones en el backend generalista multiempresa. Los datos y respuestas observados concuerdan con las reglas: **compra ≠ recepción**, **recepción única**, **stock por ubicación**, **movimiento trazable** y **reintentos sin duplicados**. El incidente de 15 tests en Windows condujo a una mejora concreta de aislamiento del entorno de pruebas, revalidada con la base poblada.

Se recomienda declarar **E2-4 completado en el alcance backend definido y validado funcionalmente**, con pendientes explícitos; **no** declarar el TP o el sistema productivo finalizados.

## 10. Fuentes primarias de esta entrega

- Repositorio y commits: https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026
- PR: [#12](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/12), [#13](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/13), [#14](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/14), [#15](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/15), [#17](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/17), [#18](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/18).
- Documentos del repo: `plataforma-pyme/docs/E2-4_A_PROVEEDORES_MODELO.md`, `E2-4_B_API_PROVEEDORES.md`, `E2-4_D_API_COMPRAS.md`, `E2-4_E_RECEPCION_Y_STOCK.md`.
- Requisitos: `plataforma-pyme/entrega-programacion-2/02_CASOS_DE_USO.md`, `03_MODELO_DE_DOMINIO_Y_UML.md`, `05_MATRIZ_API_Y_TRAZABILIDAD.md`.
- Resultados manuales: transcripciones de Swagger y PowerShell aportadas por el desarrollador el 08/11/2026; la bitácora `02` las registra sin credenciales ni claves.
