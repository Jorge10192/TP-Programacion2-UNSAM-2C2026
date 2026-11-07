# Deploy de WALOS API

Una API Docker y una base PostgreSQL persistente. El frontend React se entrega como demo independiente. La configuración está preparada; crear recursos y obtener la URL pública es un paso posterior.

## 1. Verificar localmente

Desde esta carpeta, con las dependencias del README instaladas:

```powershell
python -m pytest -q
docker compose up --build -d
python tools/check_deploy.py http://127.0.0.1:8000
docker compose exec api python -m src.auth.bootstrap admin
```

El contenedor aplica Alembic antes de iniciar y usa `PORT` (8000 por defecto). El Compose local conserva SQLite en `datos`; no reutilizar esa base para el deploy público.

## 2. Publicar en Render

1. Elegir una base PostgreSQL persistente y su política de respaldo. Obtener su URL de conexión; no subirla a Git.
2. Publicar la rama aprobada y crear un Blueprint desde el `render.yaml` de la raíz. Revisar cuenta, rama y recursos antes de confirmar su creación.
3. Completar `DATABASE_URL` con la URL de PostgreSQL. La API acepta `postgresql://`, `postgres://` y `postgresql+psycopg://`. Usar TLS cuando la conexión salga de la red privada del proveedor.
4. Render construye el Dockerfile existente, entrega HTTPS y consulta `/health`. Los siguientes despliegues son manuales (`autoDeployTrigger: off`). No cambiar el comando de arranque: ya aplica las migraciones.
5. Crear el administrador una sola vez desde un entorno autorizado con acceso a la misma base: `python -m src.auth.bootstrap admin`. En un equipo local usar la URL **externa** de PostgreSQL en `DATABASE_URL`; el comando solicita la contraseña sin mostrarla. El plan web gratuito no ofrece Shell.

El Blueprint sólo configura el servicio web `free`, sin crear una base ni contratar un plan de pago. El servicio gratuito se suspende tras 15 minutos sin tráfico; abrirlo antes de exponer. SQLite local se pierde al reiniciar en ese hosting. Una base Render Postgres gratuita vence a los 30 días y no ofrece backups: sirve para una entrega temporal, no para operar WALOS con datos reales. [Límites oficiales](https://render.com/docs/free).

## 3. Comprobar la URL

```powershell
python tools/check_deploy.py https://TU-SERVICIO.onrender.com
```

Verifica salud/migraciones, los contratos de los cinco requisitos y el rechazo de acceso anónimo. Después abrir `/docs`, iniciar sesión en `POST /auth/login`, autorizar con el token y recorrer proveedor → catálogo → compra → confirmar → stock. Repetir la confirmación debe conservar una sola entrada; anular debe devolver el stock inicial.

Reiniciar el servicio y comprobar que los datos siguen en PostgreSQL. Antes de la entrega, realizar y restaurar un respaldo en otra base vacía con las herramientas del proveedor. Conservar los respaldos diarios durante 7 días.

Si falla el nuevo código, volver al despliegue anterior; no revertir migraciones a ciegas. No cambiar esquema ni múltiples instancias en esta entrega.

Referencias: [Blueprint](https://render.com/docs/blueprint-spec), [Docker](https://render.com/docs/docker).
