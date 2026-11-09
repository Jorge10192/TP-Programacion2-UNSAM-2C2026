# E2-6 — Documentación integral de Ventas Integradas

**Proyecto:** Plataforma PyME — Trabajo Práctico Final, Programación 2, UNSAM 2C2026  
**Fecha de corte:** 2026-11-09  
**Alcance:** `plataforma-pyme/`; producto generalista multiempresa (WALOS es una empresa de ejemplo, no el alcance del producto).  
**Rama:** `feature/e2-6-ventas-integradas`  
**Destino eventual:** `main`, mediante un único Pull Request posterior a revisión y auditoría independiente.  
**Estado:** E2-6 A–D implementadas; E documental y validación manual completadas; auditoría independiente y fusión pendientes.  
**Referencia de código ejecutable validado:** `a66c180d02bfb5decc583a90a07efcc48d0a2783`. Los commits posteriores a esa revisión hasta la elaboración de este documento son documentales.

> **Naturaleza del documento.** Esta es la especificación descriptiva y la memoria técnica de la funcionalidad efectivamente implementada de E2-6, no un informe de auditoría de seguridad ni una certificación de pagos. Ante discrepancias, prevalecen los modelos, las rutas y las pruebas del commit citado; las posibles mejoras se evaluarán por separado en la auditoría.

## 1. Objetivo y resultado

E2-6 incorpora al backend la posibilidad de registrar y consultar ventas confirmadas de **servicios**, **bienes físicos** y operaciones **mixtas** de una empresa autenticada. Un mismo comprobante agrupa sus líneas y pagos declarados; cuando incluye bienes físicos, consume stock de una ubicación autorizada y registra movimientos históricos vinculados a cada línea.

El diseño prioriza cinco invariantes: (1) aislamiento por empresa; (2) control de acceso real según membresía y ubicación; (3) exactitud monetaria entera; (4) atomicidad de comprobante–pagos–movimientos–saldos; y (5) protección frente a solicitudes repetidas.

**No implica:** acreditación bancaria, cierre o arqueo de caja, creación de preferencias de Mercado Pago, pago por QR, webhooks, cobros reales confirmados, emisión fiscal, devolución, anulación ni interfaz React conectada. Esos flujos requieren módulos posteriores.

## 2. Estado del repositorio verificado

Comparación GitHub `main...feature/e2-6-ventas-integradas` consultada el 2026-11-09, **antes del commit de esta documentación**:

| Campo | Verificación |
|---|---|
| Base `main` | `9516633d8fe5ce69c7f8f6ed0af4c87c40e6e460` |
| Relación | `ahead`: 26 commits por delante, 0 por detrás |
| Archivos de la comparación | 14: 4 código backend (incluido registro de router), 7 pruebas, 3 documentos |
| Último commit de código probado | `a66c180d02bfb5decc583a90a07efcc48d0a2783` |
| Última evidencia documental previa | `a15b84a6d78c1471b53f2aac4133afccf77f0798` |
| Migración requerida | `e26a_sales_foundation`, ya presente en la línea base de `main` |
| PR y merge | No realizados en esta etapa |

**Importante:** la comparación variará en un commit y un archivo al incorporar este documento. La cantidad de commits no representa versiones pendientes de migración de base de datos. E2-6 A (persistencia/migración) ya está en `main`; esta rama integra B–D, endurecimiento, tests y su documentación.

### 2.1 Entregables por fase

| Fase | Contenido implementado | Resultado |
|---|---|---|
| **A — Modelo** | Tablas `sales`, `sale_lines`, `sale_payments`, FK multi-tenant, origen `VENTA_SALIDA`, Alembic, pruebas de integridad | Disponible en `main`; migración aditiva |
| **B — Ventas de servicios** | API POST/GET, validación estricta, pagos declarados, snapshots, autorización, idempotencia; servicios sin ubicación | Validada, sin débito físico |
| **C — Ventas físicas y mixtas** | Ubicación SELL/STORE, locks, CAS de saldos, ledger por línea física, integración con inventario | Validada con PostgreSQL y concurrencia |
| **D — Hardening** | Pruebas de regresión cruzada, membresía y sesión revocadas, rollback ante fallas tardías y stock insuficiente, replay histórico | Validada |
| **E — Cierre documental** | Contrato, entrega técnica, evidencias CI, pruebas manuales Swagger y esta memoria integral | Documentación vigente; auditoría externa pendiente |

## 3. Arquitectura implementada

```text
Cliente HTTP autenticado
       |
       v
POST /api/v1/businesses/{business_id}/sales
GET  /api/v1/businesses/{business_id}/sales/{sale_id}
       |  AuthContext / get_db
       v
app/modules/sales/router.py
       | validación Pydantic + errores HTTP
       v
app/modules/sales/service.py
       | permisos, transacción y replay
       +-- Businesses / Membership / Session (autorización)
       +-- Locations / LocationAssignment (SELL y STORE)
       +-- CatalogItem (artículo vigente, snapshots)
       +-- Sale + SaleLine + SalePayment
       +-- StockBalance (débito condicional y versión)
       +-- StockMovement (VENTA_SALIDA)
       |
       v
PostgreSQL 16 — commit único o rollback íntegro
```

**Tecnologías relevantes:** Python, FastAPI, Pydantic v2, SQLAlchemy, PostgreSQL, Alembic y pytest. La API v1 monta el router de ventas en `app/api/v1/router.py`. El frontend E1 existente es independiente de esta operación transaccional de backend.

### 3.1 Archivos principales

| Archivo relativo a `plataforma-pyme/` | Función |
|---|---|
| `backend/app/modules/sales/router.py` | Dos endpoints, dependencia de sesión, cabecera de idempotencia, mapeo HTTP |
| `backend/app/modules/sales/schemas.py` | Solicitudes/respuestas, límites, digest SHA-256, validación monetaria |
| `backend/app/modules/sales/service.py` | Lógica transaccional, catálogo, permisos, replay, saldo y movimientos |
| `backend/app/api/v1/router.py` | Registro del módulo en la API |
| `backend/app/infrastructure/models/sale.py` | Cabecera de venta y snapshot de saldos |
| `backend/app/infrastructure/models/sale_line.py` | Renglones y snapshots comerciales |
| `backend/app/infrastructure/models/sale_payment.py` | Pagos declarados |
| `backend/app/infrastructure/models/stock_movement.py` | Ledger histórico extendido con origen de venta |
| `backend/alembic/versions/20261109_0017_sales_foundation.py` | Migración `e26a_sales_foundation` |
| `backend/tests/test_sales_*.py` | Siete suites de pruebas de la API y servicio |

## 4. Modelo persistente y relaciones

### 4.1 `Sale` / tabla `sales`

Cada comprobante contiene `id`, `business_id`, `location_id` opcional, `request_id` (UUID por empresa), `request_sha256`, `status='CONFIRMADA'`, `subtotal_cents`, `discount_cents`, `total_cents`, `notes`, `created_by_id`, `created_at` y `balances_after` (JSONB).

La base exige subtotal y total positivos, `total = subtotal - discount`, digest de longitud 64, status confirmado, JSONB de tipo array y unicidad de `(business_id, request_id)`. La ubicación, de existir, está vinculada por clave foránea compuesta al mismo tenant; el actor se referencia a la membresía del negocio.

`balances_after` conserva una **fotografía histórica** por artículo físico con `catalog_item_id`, `quantity_milli` y `version`. No es una proyección viva ni debe emplearse para calcular el inventario actual.

### 4.2 `SaleLine` / tabla `sale_lines`

Cada línea posee `line_number` (1..30), artículo y negocio, `description_snapshot`, `kind_snapshot` (`BIEN` o `SERVICIO`), `unit_snapshot`, `sku_snapshot`, `quantity_milli`, `unit_price_cents` y `line_total_cents`. Las FK enlazan la venta y el catálogo del mismo negocio.

El snapshot protege la interpretación histórica ante cambios posteriores del catálogo. La base controla tipo/unidad compatibles, cantidad discreta en unidades discretas, precio no negativo y cálculo de total por línea con redondeo HALF_UP. La cantidad de líneas por comprobante se limita en la API.

### 4.3 `SalePayment` / tabla `sale_payments`

Cada pago guarda `payment_number` (1..6), `method`, `amount_cents` (positivo) y `reference`. Se permiten los valores `EFECTIVO`, `TRANSFERENCIA`, `CUENTA_DNI`, `TARJETA` y `MERCADO_PAGO_DECLARADO`. No hay `payment_id` de proveedor externo, estado de captura, cuenta liquidada ni confirmación de webhook.

### 4.4 `StockMovement` / `StockBalance`

El ledger incorpora `event_type='VENTA_SALIDA'` con `delta_milli < 0`, `sale_id` y `sale_line_id`. FK triple garantiza referencia a un renglón de la misma venta/empresa; unicidad `(business_id,sale_id,sale_line_id)` protege contra movimiento duplicado de esa línea. La regla CHECK de origen excluyente separa ventas de recepción de compras y operaciones de inventario.

`StockBalance` es la fuente del stock actual, identificada por empresa, ubicación y artículo, y mantiene `quantity_milli` no negativa y `version` incremental. Para cada artículo físico se acumulan cantidades entre líneas del mismo comprobante y se actualiza una sola fila de saldo.

### 4.5 Límites de las restricciones SQL

Los CHECK/FK por fila no demuestran por sí solos que la suma de todos los pagos sea igual al total, que las líneas sumen el subtotal ni que haya 1..30 líneas y 1..6 pagos. Tales invariantes son validaciones de Pydantic y del servicio transaccional, y deben preservarse mediante los endpoints; no crear ventas con INSERT manual directo.

## 5. Contratos HTTP

### 5.1 Crear venta

**`POST /api/v1/businesses/{business_id}/sales`**

- Requiere sesión autenticada mediante el mecanismo de autenticación vigente.
- Cabecera obligatoria: `Idempotency-Key` con UUID **v4**.
- `location_id`: UUID o `null`/ausente; la omisión solo admite venta de servicios por titular/administrador.
- `discount_cents`: entero, 0 por defecto.
- `notes`: texto normalizado, máximo efectivo de 500 caracteres.
- `lines`: entre 1 y 30, cada una con artículo, cantidad milésima positiva y precio en centavos no negativo.
- `payments`: entre 1 y 6, medio permitido, monto positivo y referencia opcional normalizada.
- Campos extra y números flotantes en los campos de enteros estrictos son rechazados.

**Ejemplo concreto, venta mixta:** los UUID corresponden a la empresa *descartable* utilizada en las pruebas manuales de 2026-11-09. Son ejemplos verificables, no valores para reutilizar en otro ambiente.

```http
POST /api/v1/businesses/fc37e4ff-9e26-423b-946e-a9cc0b662360/sales
Idempotency-Key: <UUID-v4-nuevo>
Content-Type: application/json
```

```json
{
  "location_id": "013860da-e39b-4028-a080-1ae0638ae482",
  "discount_cents": 0,
  "notes": "Prueba de venta mixta E2-6",
  "lines": [
    {
      "catalog_item_id": "dfbef980-9d7b-4810-9d04-ab0e4f51c86f",
      "quantity_milli": 1000,
      "unit_price_cents": 500000
    },
    {
      "catalog_item_id": "740f0ed2-4371-4de3-bd0d-d218f9b53c34",
      "quantity_milli": 1000,
      "unit_price_cents": 150000
    }
  ],
  "payments": [
    {"method": "EFECTIVO", "amount_cents": 300000, "reference": ""},
    {"method": "TRANSFERENCIA", "amount_cents": 350000,
     "reference": "TRANSFERENCIA-PRUEBA-E26"}
  ]
}
```

**Respuesta de creación `201`:** `SaleView` con cabecera, `lines`, `payments` y `balances_after`. En la ejecución documentada, total `650000` centavos y saldo posterior `7000` milésimas, versión 3. El servidor determina los snapshots de texto/tipo/SKU del catálogo, pero el precio unitario se recibe en el comando y se guarda en el comprobante.

### 5.2 Consultar venta

**`GET /api/v1/businesses/{business_id}/sales/{sale_id}`**

Devuelve `SaleView` histórico para una sesión y membresía autorizadas, sin modificación de stock. Si no existe dentro del tenant indicado, responde 404. No hay endpoint de listado general de ventas ni operación de cancelación en este corte.

### 5.3 Códigos y semántica

| HTTP | Caso |
|---|---|
| **201** | Comprobante creado y operación confirmada |
| **200** | Repetición idéntica de POST (mismo actor, empresa, clave y contenido) o GET exitoso |
| **401** | Sesión ausente o no válida |
| **403** | Rol, membresía o asignación sin permiso operativo |
| **404** | Empresa no accesible o comprobante no hallado dentro del tenant |
| **409** | Clave idempotente incompatible, empresa/ubicación no operativa o stock insuficiente |
| **422** | JSON/campos inválidos, referencia a artículo no apto, reglas cuantitativas o importes incumplidos |

Las categorías de error describen la API real; los textos exactos pueden depender del caso. El contrato no garantiza que una venta rechazada tenga un comprobante histórico.

## 6. Reglas de dominio verificables

### 6.1 Tipos de venta y ubicación

| Modalidad | Ubicación | Stock | Permisos |
|---|---|---|---|
| Solo servicios, administrativa | Ausente/null | Sin movimientos | Solo titular o administrador |
| Solo servicios, en ubicación | Activa, habilitada para venta | Sin movimientos | SELL en la ubicación |
| Bien físico | Obligatoria, activa, `can_sell` y `can_store` | Débito atómico, movimiento por línea | SELL + STORE |
| Mixta | Obligatoria, activa, `can_sell` y `can_store` | Solo debitan las líneas BIEN | SELL + STORE |

En los casos con ubicación se aplica `can_operate_at_location` y la membresía actual. Titular/administrador acceden por rol conforme a las reglas vigentes; encargado/trabajador precisan asignación activa. El catálogo debe pertenecer al tenant, estar activo y ser vendible. Un artículo sin stock suficiente no se puede vender como físico.

### 6.2 Cantidades y dinero

- `quantity_milli = 1000` equivale a una unidad entera de la unidad del artículo; 10000 equivale a 10. Se aceptan cantidades positivas hasta 999999999 milésimas por línea.
- Unidades discretas `UNIDAD`, `PAQUETE`, `CAJA` y `SERVICIO` requieren múltiplos de 1000.
- `unit_price_cents`, `discount_cents` y montos de pago se representan como **enteros**; no se usa float para cálculo comercial.
- Total por línea: `floor((quantity_milli * unit_price_cents + 500) / 1000)` para cantidades/precios no negativos (HALF_UP).
- `subtotal_cents = sum(line_total_cents)`; `total_cents = subtotal_cents - discount_cents` y debe ser estrictamente positivo.
- `sum(payment.amount_cents) == total_cents`; cada monto declarado es positivo.
- Límite monetario general: `99999999999` centavos por campo y para subtotal/total.
- Si se repite un mismo artículo en varias líneas, **cada línea mantiene su redondeo y precio**; únicamente se suman las cantidades físicas para el débito de saldo.

### 6.3 Autorización y aislamiento

La operación comprueba identidad/sesión, pertenencia a la empresa y rol; selecciona ubicación y artículos por `business_id`, no solo por ID global. Las FK compuestas refuerzan esa separación. Los roles no autorizados, asignaciones inactivas, sesiones revocadas y membresías revocadas son escenarios incluidos en pruebas automatizadas.

El replay revalida autorización antes de devolver el comprobante; por diseño actual también evalúa la aptitud de la ubicación solicitada. **Este documento describe ese comportamiento, sin declarar que sea necesariamente la política definitiva para históricos**: cualquier cambio de la ubicación entre la venta original y su replay requiere evaluación específica en la auditoría, no una modificación implícita de E2-6.

### 6.4 Idempotencia

La identidad de comando es `(business_id, request_id)`. Se calcula SHA-256 de JSON canónico del cuerpo validado y normalizado. Para el mismo actor/empresa/clave/contenido: `200` con venta y snapshot históricos (sin segundo descuento); si el actor o digest cambia: `409`. El índice único de PostgreSQL y un manejo específico de `IntegrityError` defienden frente a reintentos concurrentes.

Una solicitud nueva necesita otra clave UUID v4. El contrato no ofrece reintento de *una venta distinta* reutilizando una clave previa.

## 7. Flujo transaccional de creación

1. Validar Pydantic (campos, cantidades, descuentos, suma de pagos) y calcular digest del comando.
2. Comprobar sesión/membresía y obtener empresa con protecciones transaccionales existentes.
3. Cuando se indica ubicación, bloquearla para escritura, consultar asignación y comprobar permiso SELL.
4. Buscar venta existente por clave; si el contenido/actor coincide, responder replay histórico 200 sin nuevas escrituras.
5. Para nueva venta, exigir empresa activa y cargar artículos del tenant en orden determinista, con bloqueo de lectura sobre catálogo.
6. Verificar artículos activos/vendibles y cantidades discretas; si hay bienes, exigir ubicación con capacidad de almacenar y permiso STORE.
7. Crear `Sale`, `SaleLine` y `SalePayment`; persistir en la sesión SQL.
8. Sumar cantidades físicas por artículo; ejecutar, en orden de UUID, `UPDATE stock_balances SET quantity_milli = quantity_milli - requerido, version = version + 1 ... WHERE quantity_milli >= requerido RETURNING quantity_milli, version`.
9. Si falta saldo o no alcanza: lanzar error y **rollback** de comprobante, renglones, pagos y cualquier descuento previo de la misma transacción.
10. Crear un movimiento `VENTA_SALIDA` negativo por cada línea física, con `sale_id` y `sale_line_id`.
11. Guardar `balances_after`, construir respuesta y realizar **un solo commit**.
12. Ante fallas SQL o de aplicación antes del commit, rollback; ante colisión específica de clave idempotente, comprobar nuevamente el replay permitido.

**Propiedades importantes:** no existen descuentos parciales confirmados de una venta fallida; el servicio no crea un movimiento para una línea de servicios; la versión del saldo crece una vez por artículo descontado en cada venta.

## 8. Compatibilidad, migración y despliegue

### 8.1 Dependencias funcionales

- **E2-1/E2-2:** usuario, sesión, empresa, membresía, ubicación y asignaciones por rol.
- **E2-3:** catálogo multi-tenant, tipo de artículo, precio de referencia, estado y unidad.
- **E2-4:** compras y recepciones, las cuales incorporan existencias al stock mediante su propio origen histórico.
- **E2-5:** ajustes, stock inicial y traslados, con el mismo saldo versionado e historial.
- **E2-6:** descuenta bienes contra las proyecciones existentes; no reimplementa recepción o ajustes ni reinterpreta sus eventos.

### 8.2 Migración exacta

`20261109_0017_sales_foundation.py` define revisión `e26a_sales_foundation`, descendiente de `e25a_inventory_ops`. Crea tres tablas y agrega `sale_id` y `sale_line_id` opcionales a `stock_movements`, su FK/índice/unicidad y CHECK extendido de origen/signo. No modifica cantidades históricas de E2-4/E2-5.

**Downgrade deliberadamente protegido:** la migración impide revertirse cuando hay ventas en `sales`. No probar `downgrade` en la empresa de pruebas ni en bases que se quieran conservar. No es necesaria otra migración SQL para B/C/D.

### 8.3 Desarrollo local seguro (Windows PowerShell)

Desde `plataforma-pyme/`, para validar **exclusivamente** la base de pruebas existente:

```powershell
git switch feature/e2-6-ventas-integradas
git pull --ff-only origin feature/e2-6-ventas-integradas

Push-Location backend
$env:DB_NAME = "asistente_pyme_e26b_test_20261109_134652"
$env:RUN_DB_INTEGRATION = "1"
try {
    .\.venv\Scripts\python.exe -m alembic current
    if ($LASTEXITCODE -ne 0) { throw "Alembic current falló" }
    .\.venv\Scripts\python.exe -m alembic check
    if ($LASTEXITCODE -ne 0) { throw "Alembic check falló" }
    .\.venv\Scripts\python.exe -m pytest -q
    if ($LASTEXITCODE -ne 0) { throw "Regresión fallida" }
} finally {
    Remove-Item Env:\DB_NAME -ErrorAction SilentlyContinue
    Remove-Item Env:\RUN_DB_INTEGRATION -ErrorAction SilentlyContinue
    Pop-Location
}
```

No crear ni destruir volúmenes de Docker, no resetear datos QA, no ejecutar `alembic downgrade` sobre datos preservados. El contenedor API del `compose.yaml` usa, por defecto, la base `asistente_pyme` en puerto HTTP 18000: **no** confundir ese entorno con Swagger local, configurado explícitamente para la base temporal.

Para Swagger local, desde `plataforma-pyme/backend`, en otra consola dedicada, establecer `$env:DB_NAME` a la base temporal e iniciar `uvicorn app.main:app --host 127.0.0.1 --port 8000`. Interfaz: `http://127.0.0.1:8000/docs`.

## 9. Inventario de pruebas implementadas

Los siete módulos incorporados en la rama incluyen los siguientes escenarios principales:

| Archivo | Pruebas / foco |
|---|---|
| `test_sales_schemas.py` | 7 tests: split/discount, sumas inválidas, ceros, tipos estrictos, HALF_UP, digest, límites |
| `test_sales_http.py` | 3 tests: exposición de rutas, autenticación y campos propiedad del servidor |
| `test_sales_api_integration.py` | 7 tests: servicio y replay, tenant/stock físico, split, invalidación, mixtas, rollback por faltante, SELL/STORE |
| `test_sales_atomicity_integration.py` | 2 tests: débito previo revertido por segundo artículo insuficiente; fallo tardío con rollback completo |
| `test_sales_concurrency_integration.py` | 3 tests: última unidad en paralelo, mismo request simultáneo y dos ventas válidas concurrentes |
| `test_sales_inventory_interop_integration.py` | 3 tests: venta–recepción–traslado–ajuste, saldo inexistente y replay de snapshot luego de recepción |
| `test_sales_permissions_integration.py` | 3 tests: asignación activa, membresía revocada y sesión revocada |

**Total de funciones `test_` de estos siete archivos:** 28. Esa cuenta no equivale al total de tests de toda la aplicación ni incluye las pruebas de modelo y migración de E2-6 A.

### 9.1 Regresiones confirmadas por el operador

| Etapa | Evidencia local aportada |
|---|---|
| B | 14 pruebas focalizadas; regresión `864 passed, 1 warning` |
| C | 17 focalizadas; 10 de concurrencia/API; 22 de interoperabilidad; regresión `872 passed, 1 warning` |
| Seguridad y D | 16 de seguridad; 9 focalizadas de endurecimiento |
| **Última regresión de código** | **879 passed in 132.08s**, sin advertencias |
| Migraciones | `e26a_sales_foundation (head)`; `alembic check`: sin operaciones nuevas |

Base temporal de validación: `asistente_pyme_e26b_test_20261109_134652`.

**GitHub Actions:** ejecución exitosa de la rama para SHA de código `a66c180`: https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42684413403. El historial consultado no exhibe una ejecución posterior para los commits exclusivamente documentales. El verde registrado no debe presentarse como CI de un commit futuro aún no ejecutado.

### 9.2 Pruebas Swagger manuales comprobadas (2026-11-09)

Empresa `fc37e4ff-9e26-423b-946e-a9cc0b662360`; local `013860da-e39b-4028-a080-1ae0638ae482`; producto `dfbef980-9d7b-4810-9d04-ab0e4f51c86f`; servicio `740f0ed2-4371-4de3-bd0d-d218f9b53c34`.

| Escenario | HTTP observado | Evidencia |
|---|---|---|
| Registrar usuario/empresa; crear bien, servicio y ubicación | 201 en cada creación | Empresa y local ACTIVA; SELL/STORE |
| Stock inicial | 201 | `STOCK_INICIAL +10000`; saldo 10000, versión 1 |
| Inventario inicial | 200 | `quantity_milli=10000`, `version=1` |
| Venta física 2 unidades | 201 | `sale_id=def970fc-6b45-48cb-ba65-a5ca994c3fdd`; saldo 8000, versión 2 |
| Venta mixta bien + servicio | 201 | `sale_id=61108b12-df7e-4da6-8046-ddde75eedba4`; total 650000, pagos 300000+350000; saldo 7000, versión 3 |
| Replay idéntico | 200 | Mismo sale_id, lines, payments, created_at y snapshot |
| Venta de 10 unidades con 7 disponibles | 409 | Mensaje stock insuficiente; saldo 7000/version 3 |
| Lectura de ledger | 200 | **3 eventos exactos**: +10000, −2000, −1000; dos ventas ligadas a sus líneas |

Conciliación: `10000 - 2000 - 1000 = 7000`. El servicio no generó movimiento físico. El intento fallido y replay no agregaron movimientos. La consulta de ledger mostró eventos en orden cronológico inverso (las dos ventas y luego el stock inicial).

**Cobertura delimitada:** lo anterior acredita el circuito principal de creación/replay/stock y no sustituye pruebas manuales de autorización con múltiples usuarios, pruebas de pagos externos, auditoría independiente o pruebas de carga de larga duración.

## 10. Decisiones y no-objetivos

1. **Pagos declarativos, no liquidados.** Ninguna tarjeta, banco, billetera, caja o cuenta monetaria recibe un efecto financiero confirmado en este bloque.
2. **Sin autorización implícita de inventario.** La venta física requiere SELL y STORE, y consume el saldo de la propia ubicación de venta, no de un depósito elegido automáticamente.
3. **Históricos preservados.** Un comprobante confirmado no se edita en este módulo; snapshots y movimientos registran el hecho ocurrido.
4. **Sin stock negativo.** El débito condicional evita confirmar una venta sin disponibilidad; fallas posteriores revierten todo.
5. **Idempotencia explícita.** `Idempotency-Key` obligatoria, por empresa; replay válido no crea movimientos nuevos.
6. **Sin venta de catálogo ajeno o inactivo.** Se verifican tenant, estado, aptitud de venta y unidad.
7. **Sin pantalla de ventas conectada a este backend en E2-6.** La demo previa de frontend no sustituye esta API real.
8. **Sin devolución/cancelación.** La futura reversión de ventas requiere una operación explícita, autorización y ledger compensatorio, no edición retroactiva.
9. **Sin QR operativo de cobro.** La arquitectura futura de Mercado Pago debe mantener una cuenta conectada por empresa, diferenciar QR de artículo del QR de cobro y procesar acreditación por webhooks verificados.
10. **No modificar funcionalidades históricas como atajo.** Integraciones con compras, recepciones y traslados conservan sus contratos y motivos de movimiento.

## 11. Límites conocidos y consideraciones de mantenimiento

- Se observaron tests automatizados de intercalación secuencial de ventas con recepción/traslado/ajuste y pruebas concurrentes entre ventas. Eso no equivale a verificar todas las secuencias inter-módulo bajo carga simultánea.
- `SaleView.balances_after` se expone como `list` genérica en el esquema Pydantic: la forma JSON documentada proviene del servicio, pero Swagger podría mostrar elementos genéricos en vez de una estructura tipada. Es una limitación descriptiva del contrato, no evidencia de inconsistencia de saldo.
- El control de replay ocurre luego de comprobar la ubicación. Si el estado/capacidad de una ubicación cambia después de la venta original, la posibilidad de recuperar la respuesta idempotente requiere una decisión formal de política de autorización histórica. No se altera esa política aquí.
- La sesión de venta implementa bloqueo de ubicación y catálogo y operaciones de saldo condicionales. No se afirma ausencia absoluta de deadlocks o de todas las condiciones de carrera bajo cualquier cliente o aislamiento; esas conclusiones requieren revisión específica.
- El descuento es una cantidad agregada por artículo. El ledger conserva un movimiento por línea; ambas representaciones deben mantener igualdad contable.
- La respuesta de una venta contiene precio solicitado por el cliente, no reemplaza automáticamente ese importe por `CatalogItem.price_cents`. La autorización de precios/descuentos y su futura política de negocio deben estar definidas fuera de este corte si la aplicación evoluciona.
- No hay mecanismo general de inventario reservado ni descuento de recetas o insumos por venta de un producto elaborado.
- Los casos de 401/403/404/409/422 deben mantenerse seguros ante tenants ajenos y no filtrar detalles sensibles de negocios de terceros.

Estas son **condiciones de operación y límites verificables**, no una lista de fallas demostradas ni un informe de auditoría. La revisión independiente debe distinguir riesgo plausible, escenario reproducible y defecto confirmado antes de proponer cambios.

## 12. Criterios de cierre y siguiente ciclo

| Criterio | Estado al 2026-11-09 |
|---|---|
| Persistencia E2-6 A y migración | **Completado**; incorporado a `main` |
| API de ventas B/C/D en rama | **Implementado** |
| Pruebas automatizadas locales | **Aprobadas en código `a66c180`** |
| CI sobre código validado | **Success** |
| Swagger del circuito principal | **Aprobado** y conciliado |
| Memoria técnica integral y trazabilidad | **Completado con este documento** |
| Auditoría independiente | **Pendiente**, documento aparte |
| Decisiones sobre hallazgos aceptados | **Pendientes** |
| Regresión final posterior a eventuales correcciones | **Pendiente si el código cambia** |
| PR único hacia `main` | **No abierto por esta entrega** |
| Merge final | **Pendiente de aprobación y CI** |

**Orden establecido:** (1) documentar E2-6; (2) emitir informe de auditoría independiente separado; (3) aceptar/rechazar cada hallazgo con evidencia y aplicar solo lo aceptado; (4) ejecutar regresión y verificar CI en el SHA definitivo; (5) revisar diff y abrir un único PR; (6) fusionar una sola vez si la revisión es satisfactoria. No reinterpretar la aprobación de Swagger como autorización de merge.

## 13. Referencias del repositorio

- [Contrato de base de datos, E2-6 A](E2-6_A_MODELO_VENTAS_Y_PAGOS.md) — documento histórico de diseño A; algunas notas de «pendiente» describen el momento de su redacción.
- [Contrato de implementación física, E2-6 C](E2-6_C_CONTRATO_VENTAS_STOCK.md) — invariantes previstos antes de C, implementados posteriormente.
- [Entrega técnica y evidencia de E2-6 E](E2-6_E_ENTREGA_TECNICA_Y_VALIDACION.md) — resultados de pruebas, CI y Swagger.
- [Protocolo de auditoría independiente](E2-6_AUDITORIA_SELECTIVA_PROTOCOLO.md) — **procedimiento futuro distinto de esta documentación**.
- `docs/ADR/ADR-004-stock-unidades-sku.md` — unidades, cantidades y catálogo.
- `docs/ADR/ADR-006-ventas-pagos-qr.md` — decisiones de ventas, pagos y QR.
- `docs/20_E1_C1_VENTAS_DEMO.md` — diseño visual histórico de ventas demo.
- `entrega-programacion-2/` — consigna académica y documentos técnicos generales.
