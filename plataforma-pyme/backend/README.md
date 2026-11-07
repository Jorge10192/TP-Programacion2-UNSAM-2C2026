# Asistente PyME — Backend FastAPI

**Estado:** E2-0.1 (esqueleto inicial). No hay base de datos, login ni endpoints comerciales todavía. El frontend React DEMO permanece independiente.

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

**E2-0.2:** PostgreSQL 16 y Docker Compose. **E2-0.3:** SQLAlchemy 2.x y Alembic. La respuesta de `/health` indica que **el proceso está vivo**, pero no garantiza conectividad a una base de datos.

Las futuras rutas bloqueantes que usen SQLAlchemy síncrono serán `def`; las sesiones serán de duración acotada y los repositorios no harán `commit()`. Los contratos comerciales se incorporarán bajo `/api/v1`.

## Calidad

```powershell
.\.venv\Scripts\python.exe -m pytest
```

Las tres pruebas actuales son solo de infraestructura: **no equivalen a diez tests unitarios de lógica de negocio del TP**. Se añadirán pruebas de reglas de negocio, integración real con PostgreSQL y CI en las siguientes etapas.

No se guardan secretos ni datos comerciales reales. **No se modificó `frontend/`.**
