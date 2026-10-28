# Docker y Containerización

> **Estado:** versión de referencia para implementación del Bloque 1.  
> **Alcance:** desarrollo local, testing, construcción de imagen y preparación para despliegue.  
> **Objetivo:** disponer de una estrategia reproducible, segura y simple para ejecutar FastAPI + PostgreSQL sin acoplar el proyecto a un proveedor cloud concreto.

---

## 1. Propósito

Este documento define la estrategia de containerización de `Proyecto-3-Extendido-Generico`.

Complementa:

~~~text
arquitectura-general.md
estructura-backend.md
patrones-de-diseno.md
multitenant-y-seguridad.md
~~~

y establece:

- estructura de archivos Docker;
- construcción de la imagen del backend;
- desarrollo local;
- PostgreSQL local;
- migraciones;
- variables de entorno;
- persistencia;
- healthchecks;
- testing;
- diferencias entre desarrollo y producción;
- reglas mínimas de CI/CD y deployment.

---

## 2. Filosofía de containerización

Docker se utilizará para obtener:

~~~text
entorno reproducible
+
aislamiento de dependencias
+
ejecución consistente
+
desarrollo local simple
+
imagen desplegable
~~~

La estrategia distingue dos objetivos.

### Desarrollo

Prioriza:

- feedback rápido;
- hot reload;
- herramientas de test;
- facilidad de inspección;
- persistencia local de PostgreSQL.

### Producción

Prioriza:

- imagen inmutable;
- menor superficie de ataque;
- ausencia de código montado desde host;
- usuario no-root;
- dependencias reproducibles;
- configuración externa;
- apagado limpio.

---

## 3. Servicios necesarios

Para Bloque 1 solo existen dos servicios persistentes:

~~~text
api
postgres
~~~

Podrá existir además una tarea efímera:

~~~text
migrate
~~~

para ejecutar Alembic antes de iniciar la API.

`migrate` no representa un tercer servicio funcional permanente.

No se incorporarán inicialmente:

~~~text
Nginx
Redis
Celery
RabbitMQ
Kafka
Traefik
Kubernetes
~~~

sin una necesidad concreta.

---

## 4. Estructura de archivos

~~~text
Proyecto-3-Extendido-Generico/
├── docker-compose.yml
├── .env.example
│
└── backend/
    ├── Dockerfile
    ├── .dockerignore
    ├── pyproject.toml
    ├── uv.lock
    ├── alembic.ini
    │
    ├── docker/
    │   └── docker-entrypoint.sh
    │
    ├── alembic/
    │   ├── env.py
    │   └── versions/
    │
    ├── src/
    │   └── app/
    │
    └── tests/
~~~

`docker-compose.yml` queda en la raíz del proyecto genérico porque coordina múltiples servicios.

El `Dockerfile` pertenece al backend porque construye exclusivamente la API.

---

## 5. Gestión de dependencias

Se adopta como estrategia preferida:

~~~text
pyproject.toml
+
uv.lock
+
uv
~~~

El lockfile se versionará.

Los builds reproducibles utilizarán instalación congelada:

~~~text
uv sync --frozen
~~~

No se mantendrán manualmente dos fuentes de verdad independientes para las mismas dependencias.

---

## 6. Imagen base

Se utilizará una imagen oficial de Python 3.13, preferentemente slim.

Ejemplo:

~~~dockerfile
FROM python:3.13-slim AS base
~~~

No se utilizarán imágenes históricas prearmadas de FastAPI/Uvicorn/Gunicorn como dependencia arquitectónica.

La aplicación construirá su propia imagen.

---

## 7. Variables estándar de Python

La etapa base declarará:

~~~dockerfile
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
~~~

### PYTHONUNBUFFERED

Envía logs y errores inmediatamente a stdout/stderr.

### PYTHONDONTWRITEBYTECODE

Evita generar archivos `.pyc` innecesarios dentro del contenedor.

---

## 8. Directorio de trabajo

Se utilizará:

~~~text
/app
~~~

como `WORKDIR`.

El paquete productivo quedará bajo:

~~~text
/app/src/app
~~~

y el import seguirá siendo:

~~~python
from app.domain.organizacion.negocio import Negocio
~~~

no:

~~~python
from src.app.domain.organizacion.negocio import Negocio
~~~

---

## 9. Dockerfile multi-stage

Se utilizará un único Dockerfile con targets diferenciados:

~~~text
base
├── builder
├── development
└── production
~~~

No se crearán Dockerfiles independientes para cada ambiente salvo necesidad demostrable.

El objetivo del multi-stage es separar dependencias/herramientas de construcción del runtime final y reducir tamaño y superficie de ataque.

---

## 10. Etapa base

Responsabilidades:

- Python 3.13;
- variables comunes;
- `WORKDIR`;
- herramienta de dependencias;
- configuración mínima compartida.

Ejemplo representativo:

~~~dockerfile
FROM python:3.13-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# En implementación real se fijará versión o digest de uv.
COPY --from=ghcr.io/astral-sh/uv:<VERSION_PINNED> /uv /uvx /bin/
~~~

No se utilizará `latest` para tooling crítico en un build reproducible.

---

## 11. Caché de capas

Los archivos de dependencias se copiarán antes del código fuente.

Conceptualmente:

~~~dockerfile
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY src ./src
~~~

Un cambio en código de negocio no debería invalidar automáticamente la instalación completa de dependencias.

---

## 12. Etapa builder

La etapa `builder` preparará el entorno de producción.

Conceptualmente:

~~~dockerfile
FROM base AS builder

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY src ./src
~~~

La forma definitiva de instalación se ajustará cuando quede configurado el packaging real de `app` en `pyproject.toml`.

---

## 13. Etapa development

La etapa de desarrollo incluirá dependencias para:

- Pytest;
- Ruff;
- herramientas de desarrollo;
- ejecución con reload.

Conceptualmente:

~~~dockerfile
FROM base AS development

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --all-groups

COPY . .
~~~

El código local podrá montarse mediante bind mounts.

---

## 14. Etapa production

La imagen final contendrá únicamente lo necesario para ejecutar la aplicación.

Características:

- sin tests;
- sin dev tools innecesarias;
- sin caches de build;
- sin bind mounts;
- usuario no-root;
- dependencias congeladas;
- código incluido en la imagen.

Ejemplo conceptual:

~~~dockerfile
FROM python:3.13-slim AS production

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH="/app/src"

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY src ./src
COPY alembic ./alembic
COPY alembic.ini .
COPY docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint

RUN addgroup --system app \
    && adduser --system --ingroup app app \
    && chmod +x /usr/local/bin/docker-entrypoint \
    && chown -R app:app /app

USER app

ENTRYPOINT ["docker-entrypoint"]
CMD ["serve"]
~~~

Este fragmento representa la estructura. El detalle exacto de copia del entorno virtual se verificará al implementar el packaging.

---

## 15. Usuario no-root

Producción no ejecutará la API como root.

Se utilizará un usuario dedicado:

~~~text
app
~~~

Esto reduce privilegios si el proceso es comprometido.

La aplicación tampoco deberá depender de escribir arbitrariamente sobre su filesystem de código.

---

## 16. Entrypoint

Se utilizará un entrypoint pequeño y transparente.

Ejemplo:

~~~sh
#!/bin/sh
set -eu

if [ "${1:-}" = "serve" ]; then
    exec uvicorn app.main:app \
        --host 0.0.0.0 \
        --port "${PORT:-8000}" \
        --workers "${WEB_CONCURRENCY:-1}"
fi

exec "$@"
~~~

El uso de `exec` permite que Uvicorn reciba directamente:

~~~text
SIGTERM
SIGINT
~~~

y pueda realizar graceful shutdown.

El entrypoint no contendrá lógica de negocio.

---

## 17. Migraciones: decisión principal

Las migraciones no se ejecutarán automáticamente dentro del entrypoint de cada réplica productiva.

Se evita:

~~~text
API A -> alembic upgrade head
API B -> alembic upgrade head
API C -> alembic upgrade head
~~~

durante un rollout concurrente.

La migración deberá ejecutarse una sola vez por despliegue.

---

## 18. Migraciones como tarea separada

Flujo deseado:

~~~text
PostgreSQL listo
    ↓
migrate
    ↓
alembic upgrade head
    ↓
éxito
    ↓
api
~~~

En Compose local, `migrate` será un servicio one-shot.

En producción se utilizará, según el proveedor:

- release command;
- pre-deploy command;
- job único;
- etapa de CI/CD.

---

## 19. Readiness de PostgreSQL

En desarrollo, el healthcheck se ejecutará dentro del contenedor PostgreSQL.

Ejemplo:

~~~yaml
healthcheck:
  test:
    - CMD-SHELL
    - pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}
  interval: 5s
  timeout: 5s
  retries: 10
  start_period: 5s
~~~

No hace falta instalar `postgresql-client` dentro de la imagen API únicamente para ejecutar `pg_isready`.

---

## 20. depends_on

La forma corta:

~~~yaml
depends_on:
  - postgres
~~~

solo expresa dependencia/orden de inicio.

Para esperar readiness se utilizará:

~~~yaml
depends_on:
  postgres:
    condition: service_healthy
~~~

y para una tarea de migración:

~~~yaml
depends_on:
  migrate:
    condition: service_completed_successfully
~~~

---

## 21. Docker Compose de desarrollo

Ejemplo de referencia:

~~~yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test:
        - CMD-SHELL
        - pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 5s
    networks:
      - app_network

  migrate:
    build:
      context: ./backend
      target: development
    env_file:
      - .env
    command: ["alembic", "upgrade", "head"]
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - app_network
    restart: "no"

  api:
    build:
      context: ./backend
      target: development
    env_file:
      - .env
    command:
      - uvicorn
      - app.main:app
      - --host
      - 0.0.0.0
      - --port
      - "8000"
      - --reload
    ports:
      - "${PORT:-8000}:8000"
    volumes:
      - ./backend/src:/app/src
      - ./backend/tests:/app/tests
      - ./backend/alembic:/app/alembic
    depends_on:
      migrate:
        condition: service_completed_successfully
    networks:
      - app_network

volumes:
  postgres_data:

networks:
  app_network:
    driver: bridge
~~~

La implementación final podrá simplificarse si alguna pieza no aporta valor durante desarrollo.

---

## 22. Persistencia local de PostgreSQL

Se utilizará el named volume:

~~~text
postgres_data
~~~

para datos locales.

~~~text
docker compose down
~~~

no elimina el volumen.

~~~text
docker compose down -v
~~~

sí elimina los datos persistidos.

Esta diferencia deberá quedar visible en el README.

---

## 23. Bind mounts

En desarrollo podrán montarse:

~~~text
./backend/src
./backend/tests
./backend/alembic
~~~

para obtener feedback rápido.

En producción:

~~~text
bind mounts de código = no
~~~

La imagen desplegada debe ser autocontenida e inmutable.

---

## 24. Hot reload

Desarrollo:

~~~text
uvicorn ... --reload
~~~

Producción:

~~~text
--reload prohibido
~~~

El reload observa el filesystem y está pensado exclusivamente para desarrollo.

---

## 25. Puerto y workers

La API escuchará en:

~~~text
0.0.0.0
~~~

El puerto provendrá de:

~~~text
PORT
~~~

con fallback:

~~~text
8000
~~~

El número de workers provendrá de:

~~~text
WEB_CONCURRENCY
~~~

con valor inicial:

~~~text
1
~~~

No se congelará un número elevado de workers antes de conocer CPU, memoria, modelo sync/async y estrategia de escalado.

En plataformas con escalado horizontal puede ser preferible un proceso por contenedor.

---

## 26. EXPOSE

Puede utilizarse:

~~~dockerfile
EXPOSE 8000
~~~

como metadata.

`EXPOSE` no publica realmente el puerto.

La publicación la realiza Compose o la plataforma.

---

## 27. Variables de entorno

Ejemplos iniciales:

~~~text
ENVIRONMENT
DATABASE_URL

POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD

JWT_SECRET
JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES

PORT
WEB_CONCURRENCY
~~~

La configuración productiva se inyectará en runtime.

---

## 28. .env.example

Se versionará un archivo documental:

~~~dotenv
ENVIRONMENT=development

POSTGRES_DB=app
POSTGRES_USER=app
POSTGRES_PASSWORD=change-me

DATABASE_URL=postgresql+psycopg://app:change-me@postgres:5432/app

JWT_SECRET=replace-with-a-secure-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

PORT=8000
WEB_CONCURRENCY=1
~~~

Estos valores no son credenciales productivas.

---

## 29. .env real y secretos

`.env` será local y estará excluido de Git.

Producción utilizará:

- secrets del proveedor;
- variables de entorno;
- secret manager;
- runtime configuration.

Nunca:

~~~dockerfile
ENV JWT_SECRET="secreto-real"
~~~

ni se copiará un `.env` real dentro de la imagen.

---

## 30. DATABASE_URL y DNS interno

Desde el contenedor API, PostgreSQL se resolverá por nombre de servicio:

~~~text
postgres
~~~

Ejemplo:

~~~text
postgresql+psycopg://app:password@postgres:5432/app
~~~

Dentro del contenedor:

~~~text
localhost
~~~

se refiere al propio contenedor, no al servicio PostgreSQL.

---

## 31. Red y exposición de PostgreSQL

Compose utilizará una red bridge privada:

~~~text
app_network
~~~

La API podrá acceder a:

~~~text
postgres:5432
~~~

sin publicar necesariamente el puerto 5432 al host.

Solo se expondrá PostgreSQL al host durante desarrollo si una herramienta externa realmente lo necesita.

---

## 32. .dockerignore

El backend deberá excluir al menos:

~~~text
.git
.github

.env
.env.*
!.env.example

.venv
venv

__pycache__
*.py[cod]

.pytest_cache
.mypy_cache
.ruff_cache
.coverage
htmlcov

dist
build
*.egg-info

.idea
.vscode

node_modules
~~~

Objetivos:

- reducir contexto de build;
- evitar copiar secretos;
- evitar artefactos locales;
- mejorar caché;
- aumentar reproducibilidad.

---

## 33. Tests dentro de Docker

Ejemplos:

~~~bash
docker compose run --rm api pytest
docker compose run --rm api pytest tests/unit
docker compose run --rm api pytest tests/integration
~~~

Si el contenedor está levantado:

~~~bash
docker compose exec api pytest
~~~

---

## 34. Ruff dentro de Docker

Validación:

~~~bash
docker compose run --rm api ruff check .
docker compose run --rm api ruff format --check .
~~~

Formato local:

~~~bash
docker compose run --rm api ruff format .
~~~

CI no corregirá automáticamente archivos: fallará si no cumplen las reglas.

---

## 35. Docker no es requisito para tests puros

Los tests unitarios de Domain deben seguir pudiendo ejecutarse sin PostgreSQL ni Docker.

Ejemplo:

~~~bash
uv run pytest tests/unit/domain
~~~

Docker es infraestructura de ejecución, no dependencia del modelo de dominio.

---

## 36. Integración con PostgreSQL real

Los tests de persistencia deberán validar comportamiento representativo de PostgreSQL.

No se reemplazará silenciosamente por SQLite para probar:

- constraints;
- locking;
- transacciones;
- índices;
- tipos;
- concurrencia.

Docker Compose podrá proporcionar PostgreSQL para integración.

---

## 37. Healthcheck de API

Cuando exista un endpoint técnico podrá agregarse:

~~~text
GET /health
~~~

Debe ser liviano.

Si el deployment lo necesita, podrán distinguirse:

~~~text
liveness
readiness
~~~

No se agregará complejidad de probes antes de necesitarla.

---

## 38. Desarrollo vs. producción

| Aspecto | Desarrollo | Producción |
|---|---|---|
| Código | bind mount | dentro de imagen |
| Reload | sí | no |
| Dependencias dev | sí | no |
| Usuario | target dev | non-root |
| PostgreSQL | Compose | administrado o externo |
| Migraciones | one-shot Compose | release/pre-deploy job |
| Puerto | 8000 por defecto | PORT inyectable |
| Workers | normalmente 1 | configurable |
| Secretos | .env local | secrets del proveedor |
| Mutabilidad | alta | imagen inmutable |

---

## 39. Paridad entre entornos

Desarrollo y producción compartirán:

- Python 3.13;
- mismo código;
- PostgreSQL;
- mismas migraciones Alembic;
- mismas dependencias runtime bloqueadas.

Diferencias intencionales:

- hot reload;
- bind mounts;
- dev dependencies;
- credenciales;
- cantidad de workers;
- infraestructura de PostgreSQL.

---

## 40. Deployment agnóstico

La imagen productiva requerirá solamente:

- variables de entorno;
- conectividad a PostgreSQL;
- puerto de escucha;
- ejecución previa de migraciones.

Esto permite desplegar posteriormente en servicios como:

~~~text
Render
Railway
Fly.io
AWS
GCP
Azure
~~~

sin cambiar Domain/Application.

No se congela todavía un proveedor.

---

## 41. API stateless y escalado

La API deberá ser reemplazable y esencialmente stateless respecto a su filesystem.

No se almacenarán localmente como fuente de verdad:

- sesiones;
- imágenes permanentes;
- documentos;
- datos de negocio.

Esto permite múltiples réplicas en el futuro.

---

## 42. Rollout y migraciones

El flujo productivo deseado será:

~~~text
build image
    ↓
lint + tests
    ↓
migration job único
    ↓
deploy API
~~~

No se asumirá que un `alembic downgrade` automático siempre constituye un rollback seguro.

Migraciones destructivas futuras deberán considerar backups y compatibilidad entre versiones.

---

## 43. Tags e imágenes reproducibles

No se dependerá de:

~~~text
latest
~~~

para deployments.

La imagen deberá identificarse mediante:

- commit SHA;
- release/tag;
- digest.

Ejemplo:

~~~text
proyecto-generico-api:<git-sha>
~~~

Las actualizaciones de imagen base serán intencionales y acompañadas por tests.

---

## 44. GitHub Actions

El workflow del proyecto genérico deberá poder ejecutar:

~~~text
checkout
    ↓
instalar dependencias
    ↓
ruff
    ↓
pytest
    ↓
build Docker
~~~

La publicación a registry se agregará cuando exista deployment real.

El build deberá fallar si el lockfile es inconsistente, los tests obligatorios fallan o el Dockerfile no construye.

---

## 45. Seguridad de imagen

Antes de producción se deberá:

- usar una imagen base mantenida;
- ejecutar como non-root;
- minimizar paquetes del sistema;
- excluir secretos;
- mantener dependencias actualizadas;
- incorporar scanning de imagen cuando CI lo justifique.

No se copiarán herramientas de compilación innecesarias a la imagen final.

---

## 46. Qué NO resuelve Docker

Docker no reemplaza:

- autenticación;
- autorización;
- backups;
- migraciones;
- tests;
- observabilidad;
- gestión de secretos;
- HTTPS;
- seguridad de PostgreSQL.

Containerizar no convierte automáticamente la aplicación en segura o distribuida.

---

## 47. Decisiones congeladas

Quedan definidas:

1. Python 3.13 como runtime.
2. Imagen propia basada en Python oficial slim.
3. Un Dockerfile multi-stage.
4. Targets development y production.
5. `PYTHONUNBUFFERED=1`.
6. `PYTHONDONTWRITEBYTECODE=1`.
7. Producción como usuario non-root.
8. `pyproject.toml + uv.lock + uv` como estrategia de dependencias.
9. Compose local con PostgreSQL.
10. Named volume para datos locales.
11. Bind mounts solo en desarrollo.
12. Uvicorn reload solo en desarrollo.
13. Puerto configurable mediante `PORT`.
14. Workers configurables mediante `WEB_CONCURRENCY`.
15. PostgreSQL con healthcheck.
16. `service_healthy` para readiness local.
17. Migraciones separadas del entrypoint normal.
18. Migraciones productivas ejecutadas una sola vez antes del rollout.
19. Imagen productiva inmutable.
20. Secretos inyectados en runtime.
21. Deployment agnóstico.

---

## 48. Decisiones diferidas

Quedan abiertas:

- proveedor de deployment;
- registry;
- política de backups productivos;
- número final de workers;
- número de réplicas;
- autoscaling;
- probes definitivas;
- image scanning concreto;
- firma/provenance de imágenes;
- estrategia de zero-downtime migrations;
- blue/green o rolling deployment;
- observabilidad centralizada.

---

## 49. Criterio de aceptación

La estrategia será aceptable si:

1. un desarrollador puede levantar API + PostgreSQL con Compose;
2. PostgreSQL conserva datos entre reinicios normales;
3. las tareas dependientes esperan a PostgreSQL healthy;
4. las migraciones se ejecutan como tarea independiente;
5. la imagen productiva excluye dependencias de desarrollo innecesarias;
6. producción corre como non-root;
7. el código productivo no depende de bind mounts;
8. secretos no forman parte de la imagen;
9. Uvicorn recibe señales correctamente;
10. el puerto es configurable externamente;
11. unit tests pueden ejecutarse sin infraestructura;
12. integration tests pueden usar PostgreSQL real;
13. la misma imagen puede desplegarse en distintos proveedores;
14. no se introducen servicios adicionales sin necesidad.

---

## 50. Cierre de arquitectura general

Con este documento queda completa la primera carpeta general:

~~~text
arquitectura/
├── arquitectura-general.md
├── estructura-backend.md
├── patrones-de-diseno.md
├── multitenant-y-seguridad.md
└── docker.md
~~~

El siguiente paso es traducir el Bloque 1 a persistencia:

~~~text
base-de-datos/bloque-1-fundacion/modelo-relacional.md
~~~

y luego:

~~~text
base-de-datos/bloque-1-fundacion/erd.puml
~~~

antes de crear mappings SQLAlchemy y migraciones Alembic.
