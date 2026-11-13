# E3-2C · B7-B — Una caja QR Mercado Pago TEST para todas las empresas QA

**Rama:** `feature/e3-2c-qr-qa-caja-unica` — **PR #70 (borrador; base B6)**. No merge ni cambios en `main`.
**Alcance:** QA descartable solamente. No se modifican recursos externos de Mercado Pago hasta que el operador cree manualmente la primera orden desde el POS.

## Recursos existentes (NO volver a crear)

- Vendedor TEST: `3837129107`
- Sucursal TEST: `89968780` (`PYMEQA001`)
- Caja TEST: `140776986` (`PYMEQA001POS001`)
- Mismo QR estático de la respuesta oficial `POST /v2/pos`, reutilizado por todas las empresas QA

### Diferencia entre QR y pago

El QR estático es una **dirección de la caja**, no una acreditación ni una orden. Se genera **una order estática por venta** con `POST /v1/orders`, `config.qr.mode="static"`, `config.qr.external_pos_id="PYMEQA001POS001"`, una `external_reference` única y la clave idempotente original de la intención QR. El desglose se toma del snapshot del servidor: si un descuento o fracciones impiden que la suma de ítems coincida, se emite un único ítem agregado en MP mientras la pantalla PyME conserva el detalle completo.

## Garantías de código B7-B

- `GET /businesses/{bid}/mercadopago/qa-shared/connection`: pertenencia a empresa, vista virtual de la caja QA; sin credenciales; no genera recursos.
- `POST .../qa-shared/orders/from-qr/{qr_id}`: una orden por QR, idempotente. El backend consulta `GET /users/me` para confirmar el vendedor TEST y el país. Nunca recibe importe, token, vendedor o caja desde el navegador.
- `mp_shared_qa_box` tiene una sola fila (id=1), con `SELECT FOR UPDATE` y reserva durable antes del POST remoto. Dos empresas no pueden tener dos órdenes pendientes en la misma caja.
- `mp_shared_qa_orders` persiste empresa, creador, snapshot total, `request_id`, referencia, ID proveedor, estado y venta única.
- Estados `PREPARANDO` o `INDETERMINADA`: no liberar la caja ni generar otro `request_id`. Reintentar con la misma clave solo dentro de ventana de idempotencia; si no se puede confirmar, revisión manual.
- `POST .../orders/{id}/reconcile`: `GET` oficial validando vendedor, referencia, monto, moneda, caja, modo y transacción. Procesada/cancelada/expirada/reembolsada libera el candado, no la trazabilidad histórica.
- `POST .../orders/{id}/cancel`: solo si `CREADA`. Se confirma cancelación con la respuesta oficial; ante duda, mantener caja bloqueada.
- `POST .../orders/{id}/settle-qa`: titular/admin, reconsulta el proveedor, y solo si status processed y transacción acreditada registra **UNA** venta + stock atómicamente, con `MERCADO_PAGO_QR_TEST`. Si falta stock se marca para revisión sin movimiento parcial.
- El webhook B6 firmado (cuando se configure secreto) también reconcilia órdenes compartidas con GET. El mensaje entrante no acredita nada por sí solo.
- Se bloquean OAuth, cambios de caja y creación de órdenes B6 por empresa cuando el modo compartido está activo. También quedan bloqueadas simulaciones/finalizaciones DEMO si ya existe una orden compartida para ese intento.
- Las cuentas nuevas se vinculan virtualmente; al crear su primer QR, se persiste la referencia interna necesaria sin pedir credenciales ni registrar otra caja.

## Flags del backend (solo QA descartable)

```env
PYME_DISPOSABLE_QA=1
PYME_MP_QR_SHARED_QA_ENABLED=1
PYME_MP_SHARED_QA_ORDERS_ENABLED=1
PYME_MP_SHARED_QA_ACCESS_TOKEN=<TOKEN TEST VENDEDOR, NO VERSIONAR>
```

Si las tres primeras no valen exactamente `1`, el POST remoto no se habilita. La cuarta se lee solo en el backend, nunca en Vite, HTML, GitHub o esta conversación. No reutilizar un token de producción. Nunca ejecutar contra una base de datos habitual. **El uso de `APP_USR` por sí solo no garantiza que un token sea de prueba**: se comprueba el vendedor TEST `3837129107` con GET a Mercado Pago.

El webhook `PYME_MP_WEBHOOK_SECRET` es opcional para la primera prueba manual (se puede usar conciliación desde el POS); es obligatorio para validar el circuito de notificaciones automáticas.

## Prueba manual guiada (después de CI verde)

**A. Aislar carpeta y DB.** Trabajar en worktree separado, desde la carpeta raíz del repo original. No modificar la base habitual:

```powershell
git fetch origin
git worktree add --detach ..\TP-PyME-E3-2C-QA origin/feature/e3-2c-qr-qa-caja-unica
cd ..\TP-PyME-E3-2C-QA\plataforma-pyme
```

El operador debe configurar en esa carpeta su conexión privada a PostgreSQL (`.env` **no versionado**); nunca copiar un Access Token allí ni a GitHub.

**B. Base de datos nueva.** Con PostgreSQL Docker ya levantado:

```powershell
$qaDb = "asistente_pyme_mp_b7_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
docker compose exec -T db createdb -U pyme $qaDb
if ($LASTEXITCODE -ne 0) { throw "No se pudo crear la DB QA" }
```

**C. Migrar SOLO la DB nueva.** En la terminal que iniciará FastAPI:

```powershell
cd backend
$env:DB_NAME = $qaDb
$env:PYME_DISPOSABLE_QA = "1"
$env:PYME_MP_QR_SHARED_QA_ENABLED = "1"
$env:PYME_MP_SHARED_QA_ORDERS_ENABLED = "1"
# Requiere .venv instalado en backend y .env privado con contraseña PostgreSQL.
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic check
```

**D. Ingresar token sin mostrarlo y levantar backend QA** en la misma ventana:

```powershell
$secureToken = Read-Host "Access Token de PRUEBA del vendedor QA" -AsSecureString
$env:PYME_MP_SHARED_QA_ACCESS_TOKEN = [System.Net.NetworkCredential]::new("", $secureToken).Password
$secureToken = $null
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 18001
```

**E. Frontend** en OTRA terminal dentro del worktree QA (`plataforma-pyme/frontend`):

```powershell
$env:PYME_API_PROXY_TARGET = "http://127.0.0.1:18001"
npm.cmd ci
npm.cmd run dev -- --host 127.0.0.1 --port 5174
```

Navegar `http://127.0.0.1:5174`; crear usuario y empresa de prueba NUEVOS en esa DB descartable, artículo/servicio y una venta pequeña, p. ej. ARS 100. En «Medios de cobro» ver caja `140776986`, después POS → QR → «Asignar venta al QR real TEST». Debe aparecer `provider_order_id` que empieza con `ORD`, el QR estático y el total correcto. **Antes del POST no escanear el QR de caja**.

**F. Aislamiento.** Crear otra empresa QA y probar otro QR: el servidor debe devolver `409` mientras haya orden `CREADA` en la primera. Al cancelar esa orden desde su pantalla (confirmado por proveedor), la segunda puede iniciar una orden nueva.

**G. Pago.** Usar *otro comprador TEST de Mercado Pago*, nunca la cuenta del vendedor TEST ni una personal. Comprobar pago en el dispositivo, pulsar «Verificar pago». Solo si se obtiene `PROCESADA` y transacción acreditada, titular/admin puede pulsar «Registrar venta QA verificada y descontar stock». Repetir cierre: mismo `sale_id`, ningún doble stock.

**H. Respuesta incierta.** Si hay HTTP 5xx/timeout, no crear otra venta ni caja. Volver al mismo QR, «Consultar orden guardada», «Verificar» si existe ID, o reintentar **la misma** orden/clave dentro de la ventana segura. Si queda `INDETERMINADA` sin ID, no forzar liberación del candado: revisión manual.

**Limpieza**: desconectar servidor QA, borrar variables de entorno de esa sesión y, después de exportar evidencias, eliminar la DB QA si se desea. No borrar la base habitual, no hacer merge sin autorización.

## Evidencia exigida para cerrar B7-B

- CI backend en Python 3.12/3.14 + migración/Alembic y CI frontend.
- Prueba manual externa con respuestas reales de MP TEST (no basta con mocks).
- Identidad vendedor, caja, moneda, importe y artículos; otra empresa bloqueada.
- Payment status conciliado, factura/venta única y stock (o revisión segura).
- Comprador TEST distinto del vendedor, webhook firmado cuando esté configurado.

Fuente oficial: https://www.mercadopago.com.ar/developers/es/docs/qr-code/payment-processing
