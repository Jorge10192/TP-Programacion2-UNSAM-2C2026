# Asistente PyME — Backend FastAPI

**Estado:** E2-0.3 (FastAPI + PostgreSQL 16 Compose + SQLAlchemy 2.x + migraciones Alembic). /ready consulta PostgreSQL; no hay tablas comerciales ni autenticacion. React DEMO permanece independiente.

**Fuente arquitectónica:** [Documento 04](../entrega-programacion-2/04_ARQUITECTURA_Y_PATRONES.md).

## Requisitos

- Python **3.11–3.14**, pip y entorno virtual.
- PowerShell en Windows o shell en Linux/macOS.

## Primer arranque en PowerShell

Desde la **raíz del repositorio**:

```powershell
cd plataforma-pyme/backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Si ya estás dentro de `plataforma-pyme/backend`, omití el primer `cd`.

Abre:

- `http://127.0.0.1:8000/health`: `{"status":"ok","service":"asistente-pyme-api"}`.
- `http://127.0.0.1:8000/docs`: Swagger UI.
- `http://127.0.0.1:8000/openapi.json`: OpenAPI.

Detener Uvicorn con `Ctrl+C`.

## Linux / macOS

```bash
cd plataforma-pyme/backend
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -e '.[dev]'
.venv/bin/python -m pytest
.venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Arquitectura de este corte

```text
backend/
├── app/
│   ├── main.py              # configuración y montaje de la aplicación FastAPI
│   └── api/
│       ├── health.py        # liveness independiente de PostgreSQL
│       └── v1/router.py     # espacio para recursos comerciales
├── tests/test_health.py     # salud, documentación y rutas inexistentes
├── pyproject.toml
└── .gitignore
```

**E2-0.2:** PostgreSQL 16 y Docker Compose. **E2-0.3:** SQLAlchemy, conexión real y Alembic. `/health` indica liveness y `/ready` verifica conectividad PostgreSQL.

Las futuras rutas bloqueantes que usen SQLAlchemy síncrono serán `def`; las sesiones serán de duración acotada y los repositorios no harán `commit()`. Los contratos comerciales se incorporarán bajo `/api/v1`.

## E2-0.2: PostgreSQL 16 con Docker Compose

**Este corte creó una base PostgreSQL local de desarrollo.** E2-0.3 agrega conexión ORM y primera migración, todavía sin tablas comerciales.

El archivo `compose.yaml` está en `plataforma-pyme/`, **un nivel arriba** de este backend. Se usa el puerto **55432 del equipo** hacia el **5432 del contenedor**, para no interferir con el PostgreSQL 16 que ya puede estar instalado localmente en Windows.

### Primer arranque: PowerShell

Si estás situado en `plataforma-pyme/backend`:

```powershell
cd ..
docker --version
docker compose version
Copy-Item .env.example .env
notepad .env
```

En el Bloc de notas, reemplazá `POSTGRES_PASSWORD=` por una **contraseña larga y privada**. El archivo `.env` está excluido de Git: no lo subas ni lo compartas. La contraseña **no debe dejarse vacía**.

Después ejecutá, todavía dentro de `plataforma-pyme/`:

```powershell
docker compose config --quiet
docker compose up -d db
docker compose ps
docker compose exec -T db psql -U pyme -d asistente_pyme -c "SELECT current_database() AS db, current_setting('server_version') AS postgres_version;"
```

**Resultado esperado:** servicio `db` activo y luego `healthy`; consulta SQL mostrando `asistente_pyme` y versión PostgreSQL `16.x`. El primer arranque puede necesitar descargar la imagen; observá `docker compose ps` hasta que el servicio esté saludable. Si Docker no está instalado o no está iniciado, no modifiques tu PostgreSQL de Windows: el siguiente paso es preparar Docker Desktop y repetir estos comandos.

**Seguridad y persistencia:** el acceso se publica solo en `127.0.0.1:55432`, no a toda la red. `db_data` es un volumen persistente exclusivo de este Compose; `docker compose down` detiene sin borrar los datos. **No ejecutar `docker compose down -v`** salvo que quieras borrar deliberadamente los datos de desarrollo. No utilizar este Compose tal cual en producción pública.

**Si el puerto 55432 está ocupado**, cambiá solo `POSTGRES_HOST_PORT` en el archivo local `.env` y volvé a aplicar `docker compose up -d db`. El puerto dentro del contenedor sigue siendo 5432.

**Si la contraseña cambia después de crear el volumen**, PostgreSQL no modifica automáticamente las credenciales de un volumen ya inicializado. Para el MVP conservá la contraseña inicial y, si necesitás rotarla, hacelo mediante SQL y una estrategia explícita. No borres volúmenes para resolver de manera improvisada un error de credenciales.

### Volver al backend de Python

```powershell
cd backend
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
.\.venv\Scripts\python.exe -m pytest -v
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

La API y la base levantan **en procesos independientes**. `/health` comprueba el proceso y `/ready` comprueba PostgreSQL.

## Calidad

```powershell
.\.venv\Scripts\python.exe -m pytest
```

El extra `.[dev]` instala **httpx2** para `TestClient` (Starlette moderna); mantenerlo en el manifiesto evita la advertencia que apareció al usuario. Las tres pruebas actuales son solo de infraestructura: **no equivalen a diez tests unitarios de lógica de negocio del TP**. Se añadirán pruebas de reglas de negocio, integración real con PostgreSQL y CI en las siguientes etapas.

No se guardan secretos ni datos comerciales reales. **No se modificó `frontend/`.**


## E2-0.3: SQLAlchemy 2.x + Alembic + readiness

**La contraseña se lee de `plataforma-pyme/.env` automáticamente:** es el mismo archivo privado que usa Docker Compose. No incluirla en comandos ni commits. La API usa el puerto local `POSTGRES_HOST_PORT` (por defecto 55432).

Primero, desde `plataforma-pyme/`:

```powershell
docker compose ps
```

Después, desde `plataforma-pyme/backend/` (sin recrear `.venv`):

```powershell
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
.\.venv\Scripts\python.exe -m pytest -v
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
```

Resultado esperado: revisión `e2003_baseline (head)` y Alembic sin diferencias pendientes. La migración inicial es **intencionalmente vacía**: crea el seguimiento `alembic_version`, no tablas de negocio. En las siguientes etapas se agregarán las entidades con nuevas migraciones. No ejecutar `Base.metadata.create_all()` en lugar de migraciones.

Desde `plataforma-pyme/`, verificar el registro de revisión:

```powershell
docker compose exec -T db psql -U pyme -d asistente_pyme -c "SELECT version_num FROM alembic_version;"
```

Levantar la API desde `backend/`:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- `GET /health`: HTTP 200, proceso vivo; independiente de la base.
- `GET /ready`: HTTP 200 y `{"status":"ready","database":"ok"}` cuando PostgreSQL responde a `SELECT 1`; error 503 sin detalles sensibles cuando no.
- `GET /docs`: Swagger muestra ambas rutas.

Arquitectura: `app/core/settings.py` lee las variables del `.env` ubicado en la raíz de `plataforma-pyme`, usa `URL.create()` para manejar caracteres especiales. Admite opcionales `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME` para futuros despliegues.

`app/infrastructure/db.py` inicializa engine y sessionmaker al necesitarlos. Una Session es por comando y nunca compartida entre peticiones. `session_scope()` hace rollback ante errores y **no hace commit**; esa responsabilidad será del servicio del caso de uso.

Las pruebas automáticas de E2-0.3 usan dobles de conexión y no escriben en PostgreSQL real. El `alembic upgrade head` y el `/ready` real son las verificaciones de integración ejecutadas explícitamente por el desarrollador.

**Seguridad:** no compartir `.env`, `docker compose config` sin `--quiet` ni logs con secretos. No utilizar `docker compose down -v` para detener la base.
