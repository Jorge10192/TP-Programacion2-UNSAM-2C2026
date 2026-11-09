# E2-4 — Guía para reproducir y verificar sin comprometer datos

**Audiencia:** autor, revisor, docente. **No usar el entorno descrito contra producción**. La base local ya tiene compras QA persistentes; la finalidad principal es auditar con GET y, si se desean pruebas de mutación, sembrar recursos nuevos en un tenant de ensayo aislado.

## 1. Clonar o sincronizar y comprobar el commit

Desde `plataforma-pyme/` en PowerShell:

```powershell
git switch main
git pull --ff-only origin main
git rev-parse HEAD
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
cd ..
```

El corte auditable de código/QA se produjo sobre `4f88416141c09a82e744990b1aee8c00b9f31dfd` y `e24e_receipt_stock (head)`. Commits documentales posteriores cambian el SHA sin volver a ejecutar casos de negocio. Registrar SHA actual en cualquier reproducción.

## 2. Verificar tests sin borrar datos

```powershell
cd backend
$env:RUN_DB_INTEGRATION = "1"
try {
    .\.venv\Scripts\python.exe -m pytest -q tests/test_purchase_integration.py
    .\.venv\Scripts\python.exe -m pytest -q
} finally {
    Remove-Item Env:\RUN_DB_INTEGRATION -ErrorAction SilentlyContinue
}
cd ..
```

**Resultados históricos Windows:** 20 passed en 6,54 s, luego 797 passed en 95,24 s. En GitHub Actions (run 42530739959): Python 3.12 y 3.14, 797 passed cada una (1 warning), y Docker exitoso.

**Precaución adicional:** los tests PostgreSQL hoy pueden usar la DB local de desarrollo. Ejecutarlos solo en base explícitamente de desarrollo. La corrección PR #18 filtró las consultas por tenant, pero no creó una base de test físicamente independiente. No ejecutar sobre producción, no usar `down -v`, `TRUNCATE`, `DROP` ni `downgrade`.

## 3. Docker y API

```powershell
docker compose --profile api up -d --build --wait api
docker compose ps
Invoke-RestMethod http://127.0.0.1:18000/ready
```

Esperado: API y PostgreSQL saludables; `{"status":"ready","database":"ok"}`.

## 4. Swagger y datos históricos de lectura

Abrir `http://127.0.0.1:18000/docs`. Autenticarse mediante `POST /api/v1/auth/login` y `Authorize` usando credenciales **locales no compartidas**. No copiar a reportes el `curl` completo, porque contiene Bearer. Si la sesión fue expuesta, revocarla con logout y obtener otra.

Datos históricos:

```text
business_id      = bd4d4e42-4ff6-403a-8633-59cbc001487d
purchase_id      = 3e50aff2-c895-49d9-8fe5-d5843438f109
location_id      = 2d6761c4-efec-4b3e-925c-a24ceab8ce9c
catalog_item_id  = 881fdae2-18c5-46ae-8037-44a500ca96c0
offset           = 0
limit            = 100
```

Revisar sin modificar datos:
- `GET /api/v1/businesses/{business_id}/purchases/{purchase_id}` → `RECIBIDA`.
- `GET .../purchases/{purchase_id}/receipt` → recibo `266bd03e-763b-4f29-8f12-c19c9bc59066`.
- `GET .../inventory/balances`, filtros ubicación/artículo → `quantity_milli: 10000, version: 1`.
- `GET .../inventory/movements` → un movimiento `COMPRA_RECEPCION`, `delta_milli: 10000`.

Un filtro con `location_id` ajeno devuelve 200 y lista vacía. Un `POST /receive` con **otra clave** en compra ya recibida devuelve 409; no es regresión. No volver a crear compra/recepción histórica esperando 201.

## 5. Prueba de idempotencia para un revisor nuevo

No se publican valores de `Idempotency-Key`. Un revisor que no conserve la clave original **no puede repetir el replay sobre la operación histórica de QA**. La reproducción adecuada consiste en crear un documento nuevo en tenant de QA propio:

1. Crear o seleccionar empresa QA y usuario autorizado; comprobar ubicación `ACTIVA/can_store=true` y artículo físico `ACTIVO`.
2. Generar una clave de compra UUID v4 y guardarla de forma privada (por ejemplo `[guid]::NewGuid().ToString()` en PowerShell).
3. `POST /purchases` con artículo, fecha, cantidad y costo → 201. Guardar `purchase_id`. Repetir misma clave y body → 200; cambiar el body con la misma clave → 409.
4. Antes de recibir, leer inventario por ubicación+artículo y registrar saldo inicial; comprar por sí solo no debe subirlo.
5. Generar **otra** clave UUID4 distinta de la de compra; `POST /purchases/{purchase_id}/receive` con un solo `location_id` → 201. Guardar recibo, movimiento y saldo posterior.
6. Repetir **el mismo usuario, cuerpo y clave de recepción** → 200, mismo recibo. Nueva clave para compra ya recibida → 409. El saldo debe reflejar una sola recepción.
7. Documentar status y cuerpos **sin** credenciales, keys ni `request_id`.

Se incluye el archivo parametrizable `requests/E2-4_QA.http` como ejemplo para VS Code REST Client, sin credenciales ni valores reales. **Los ejemplos de POST son mutantes**: revisar datos/tenant antes de enviarlos, y nunca lanzarlos contra recursos históricos.

## 6. Convención de evidencia

Para cada caso registrar: fecha, commit, ambiente, ruta, método, parámetros (sin secretos), body de negocio, status observado, campos de respuesta y explicación. Distinguir manual observado, CI verificado y pendiente. No inferir que el CRUD completo de Proveedores fue ejecutado manualmente por tener tests verdes.
