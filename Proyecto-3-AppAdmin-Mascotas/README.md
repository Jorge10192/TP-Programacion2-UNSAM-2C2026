# WALOS API

FastAPI, SQLAlchemy y Alembic · Python 3.12.
[Documentación del sistema](Ingenieria%20de%20Software/Documentacion.md).

## Ejecutar (PowerShell)

Desde esta carpeta:

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements-dev.txt
.venv\Scripts\python -m alembic upgrade head
.venv\Scripts\python -m src.auth.bootstrap admin
.venv\Scripts\python -m uvicorn src.main:app --reload
```

En Linux/macOS, usar `.venv/bin/python`. El administrador inicial se crea una vez; la contraseña se solicita sin mostrarla.

API y contratos: [Swagger](http://localhost:8000/docs). Ejecutar `/auth/login` y pegar `access_token` en **Authorize**. Sesiones de 8 horas; cinco errores bloquean el usuario 15 minutos.

Pruebas: `.venv\Scripts\python -m pytest -q`. GitHub Actions ejecuta pruebas y construye la imagen.

## Docker y despliegue

```powershell
docker compose up --build -d
docker compose exec api python -m src.auth.bootstrap admin
```

Docker aplica migraciones y conserva SQLite en el volumen `datos`. Fuera de Docker, `walos.db` queda junto al proyecto, independientemente de la carpeta de ejecución.

Para desplegar, usar este Dockerfile con HTTPS y `DATABASE_URL` de PostgreSQL; el puerto se toma de `PORT`. Ver `.env.example`. Mantener respaldo diario durante 7 días y comprobar su restauración. `/health` devuelve 503 si la base no está disponible o faltan migraciones.
