# Asistente PyME — Backend FastAPI

**Estado:** E2-0.2 (FastAPI E2-0.1 + PostgreSQL 16 en Docker Compose). **La base de datos puede levantarse de manera independiente, pero FastAPI todavía no la utiliza**: SQLAlchemy/Alembic pertenecen a E2-0.3. No hay login ni endpoints comerciales. El frontend React DEMO permanece independiente.

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

**E2-0.2:** PostgreSQL 16 y Docker Compose (configuración y comandos más abajo). **E2-0.3:** SQLAlchemy 2.x, conexión real y Alembic. La respuesta de `/health` indica que **el proceso está vivo**, pero no garantiza conectividad a una base de datos.

Las futuras rutas bloqueantes que usen SQLAlchemy síncrono serán `def`; las sesiones serán de duración acotada y los repositorios no harán `commit()`. Los contratos comerciales se incorporarán bajo `/api/v1`.

## E2-0.2: PostgreSQL 16 con Docker Compose

**Este corte crea una base PostgreSQL local de desarrollo; no crea tablas comerciales ni conecta todavía FastAPI.** La conexión ORM y las migraciones se implementarán en E2-0.3.

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

La API y la base levantan **en procesos independientes** en E2-0.2. En este corte `/health` representa únicamente liveness y **no comprueba PostgreSQL**.

## Calidad

```powershell
.\.venv\Scripts\python.exe -m pytest
```

El extra `.[dev]` instala **httpx2** para `TestClient` (Starlette moderna); mantenerlo en el manifiesto evita la advertencia que apareció al usuario. Las tres pruebas actuales son solo de infraestructura: **no equivalen a diez tests unitarios de lógica de negocio del TP**. Se añadirán pruebas de reglas de negocio, integración real con PostgreSQL y CI en las siguientes etapas.

No se guardan secretos ni datos comerciales reales. **No se modificó `frontend/`.**
