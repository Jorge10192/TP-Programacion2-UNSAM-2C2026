# WALOS

Una jornada de WALOS: compra → recepción → stock → venta → gasto → cierre. React, FastAPI y SQLAlchemy; una empresa y ubicación, importes en ARS.
[Documentación del sistema](Ingenieria%20de%20Software/Documentacion.md).
[Presentación](Ingenieria%20de%20Software/Presentacion-WALOS.pptx) · [Deploy](DEPLOY.md).

## App completa con Docker

Desde la raíz del repositorio:

```powershell
docker build -f Dockerfile.walos -t walos .
docker run -d --name walos-local -p 127.0.0.1:8000:8000 -v walos-datos:/data walos
docker exec -it walos-local python -m src.auth.bootstrap admin
```

Abrir [WALOS](http://localhost:8000). La contraseña inicial se solicita sin mostrarla. El contenedor aplica migraciones y sirve React y API en el mismo origen; el volumen conserva SQLite local. El deploy usa PostgreSQL mediante `DATABASE_URL`.

## API para desarrollo (PowerShell)

Desde esta carpeta:

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements-dev.txt
.venv\Scripts\python -m alembic upgrade head
.venv\Scripts\python -m src.auth.bootstrap admin
.venv\Scripts\python -m uvicorn src.main:app --reload
```

En Linux/macOS, usar `.venv/bin/python`. El administrador inicial se crea una vez; la contraseña se solicita sin mostrarla.

API y contratos: [Swagger](http://localhost:8000/docs). Ejecutar `/auth/login` y pegar `access_token` en **Authorize**. Sesiones de 8 horas; cinco errores bloquean el usuario 15 minutos. Para desarrollar React, ver [frontend](../plataforma-pyme/frontend/README.md).

Pruebas: `.venv\Scripts\python -m pytest -q`; frontend: `npm ci` y `npm test` desde `plataforma-pyme/frontend`. GitHub Actions ejecuta pruebas y comprueba el arranque Docker.

## API independiente y despliegue

```powershell
docker compose up --build -d
docker compose exec api python -m src.auth.bootstrap admin
```

Docker aplica migraciones y conserva SQLite en el volumen `datos`. Fuera de Docker, `walos.db` queda junto al proyecto, independientemente de la carpeta de ejecución.

Para publicar la app, seguir [DEPLOY.md](DEPLOY.md). `render.yaml` usa el Dockerfile de la raíz, despliegue manual y `DATABASE_URL` privada. El puerto se toma de `PORT`; ver `.env.example`. `/health` devuelve 503 si la base no está disponible o faltan migraciones.
