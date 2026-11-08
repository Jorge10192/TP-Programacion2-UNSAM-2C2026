# 06 - Pruebas y despliegue

## Verificar localmente

Desde `backend/`, con un entorno virtual y PostgreSQL descartable configurado:

```powershell
python -m pip install -e ".[dev]"
python -m alembic upgrade head
python -m alembic check
$env:RUN_DB_INTEGRATION = "1"
python -m pytest -q
```

Sin `RUN_DB_INTEGRATION=1`, las pruebas PostgreSQL se omiten; no cuentan como aprobadas. La revisión actual es `e226_commerce`. Las pruebas transaccionales revierten sus datos; la prueba concurrente limpia únicamente sus usuarios y empresas sintéticos.

Desde `frontend/`:

```powershell
npm ci --ignore-scripts
npm run lint
npm test
npm run build
```

Las pruebas de contrato usan una respuesta HTTP sintética capturada de los routers reales con PostgreSQL. Comprueban multiempresa, cambio de sesión, precisión, recursos ajenos y recuperación de operaciones inciertas. Los workflows de GitHub Actions ejecutan backend/PostgreSQL, frontend y E2E Chromium al publicar; configurar CI no equivale a una ejecución verde.

## Criterios de revisión

1. Dos usuarios no consultan ni modifican las empresas del otro. Una cuenta puede crear varias empresas y repetir SKU entre ellas.
2. Crear empresa conserva una membresía inicial activa; reintentar no duplica la empresa.
3. Comprar y recibir son operaciones distintas. Reintentar recepción no duplica stock.
4. Venta fallida deja cero efectos parciales. Dos ventas concurrentes de la última unidad producen una venta y un rechazo.
5. Conteo obsoleto devuelve `409`; traslado conserva existencia total y registra origen/destino.
6. Servicio sin ubicación física no mueve stock. Pagos digitales no aumentan efectivo.
7. Fondo 1.000 + venta en efectivo 5.000 - gasto en efectivo 250 = cierre 5.750; diferencia cero. Recargar conserva los registros.
8. React permite crear/cambiar empresa, muestra el contexto activo y protege borradores. Menú usable a 375px y escritorio, sin desborde.

## Docker y publicación

El [README](../README.md) contiene el arranque único de React + API + PostgreSQL. `/health` comprueba proceso y `/ready` comprueba conexión PostgreSQL. Los archivos privados y rutas desconocidas devuelven `404`; la API protegida devuelve `401` sin sesión.

La configuración Free de [render.yaml](../render.yaml) está preparada y todavía no se aplicó. Consultar la [especificación oficial de Blueprint](https://render.com/docs/blueprint-spec) antes de crear el servicio. Requiere una `DATABASE_URL` privada de PostgreSQL compatible y aprobación del destino antes de publicar. No usar la base del prototipo anterior: tiene otro esquema y otra historia Alembic. No convertirla con `stamp` ni sobrescribirla.

Antes del deploy: respaldo y restauración comprobada; migraciones sobre copia; CI verde del commit exacto; revisión del equipo. Las cuotas, suspensión por inactividad y vencimiento de PostgreSQL Free hacen que esta opción sirva para una entrega temporal. Confirmar los límites de la cuenta antes de desplegar; no activar planes pagos.

La integración local no cambia automáticamente la web pública anterior. Publicación y aprobación académica son hitos separados. Para uso comercial público siguen pendientes recuperación/verificación de correo, controles antiabuso y una política operativa de respaldos.
