# Asistente PyME — Backend FastAPI

**Estado:** E2-1.3C.3: invitaciones con migración y CI exitoso, validación local pendiente. C.1 (98 pruebas) y C.2 (125 pruebas) validados localmente. Frontend React aún DEMO independiente.

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

El extra `.[dev]` instala **httpx2** para `TestClient` (Starlette moderna); mantenerlo en el manifiesto evita la advertencia que apareció al usuario. Las pruebas unitarias existentes son de infraestructura: **no equivalen a diez tests unitarios de lógica de negocio del TP**. Se añadirán pruebas de reglas de negocio, integración real con PostgreSQL y CI en las siguientes etapas.

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

## E2-0.4 — API Docker y CI independiente

El servicio `api` es **opcional** y usa un perfil Compose: `docker compose up -d db` sigue iniciando exclusivamente PostgreSQL. La API se ejecuta dentro de Docker con el hostname PostgreSQL `db` y puerto interno `5432`, sin publicar credenciales ni copiar `.env` a la imagen. El servicio utiliza un usuario sin privilegios de root.

Desde `plataforma-pyme/`, con Docker Desktop funcionando y el mismo `.env` privado de E2-0.2:

```powershell
git pull origin main
docker compose config --quiet
docker compose --profile api up -d --build api
docker compose ps
Invoke-RestMethod http://127.0.0.1:18000/health
Invoke-RestMethod http://127.0.0.1:18000/ready
```

Resultado esperado: `db` y `api` activos; ambos endpoints devuelven HTTP 200. El contenedor expone `127.0.0.1:18000` en Windows, **no 8000**, para permitir que tu Uvicorn local use 8000 sin conflicto. Si 18000 estuviera ocupado, definí `API_HOST_PORT` en `.env` y usá ese puerto. `POSTGRES_HOST_PORT` continúa en 55432; ninguna de estas opciones interfiere con PostgreSQL local de Windows en 5432.

```powershell
# Desde plataforma-pyme/
docker compose --profile api stop api
```

Detiene solo la API Docker, manteniendo PostgreSQL y su volumen. No ejecutar `docker compose down -v`. En el contenedor no se ejecutan migraciones automáticamente: son una operación de despliegue separada. La migración inicial ya fue aplicada al PostgreSQL local en E2-0.3.

### Tests con PostgreSQL real

Desde `backend/` siguen funcionando las pruebas independientes de PostgreSQL:

```powershell
.\.venv\Scripts\python.exe -m pytest -v
```

Además, el archivo `tests/test_postgres_integration.py` incluye comprobaciones reales de conexión y del registro `alembic_version`. **No se activan por defecto** para evitar acceso accidental a bases de datos reales. Si querés ejecutarlas manualmente contra el PostgreSQL de desarrollo, desde `backend/`, con el contenedor `db` saludable y la migración aplicada:

```powershell
$env:RUN_DB_INTEGRATION = "1"
.\.venv\Scripts\python.exe -m pytest -v
Remove-Item Env:\RUN_DB_INTEGRATION
```

Esperamos **15 tests**: 13 de infraestructura + 2 de integración (los tests comerciales se agregarán en E2-1 y posteriores). No se crean ni alteran registros comerciales.

### GitHub Actions

El workflow `.github/workflows/plataforma-pyme-backend.yml` es independiente del frontend y se activa ante cambios en backend, Compose o el workflow. Usa Python 3.12 y 3.14 con PostgreSQL 16 efímero, migra desde cero, ejecuta `alembic check` y todos los tests con las integraciones habilitadas. Otro job construye la imagen Docker y verifica `/health` en un contenedor.

Las credenciales de CI son **ficticias y efímeras** (no las del equipo). El pipeline del frontend sigue independiente. Verificar resultados en la pestaña **Actions** antes de afirmar que CI está aprobado.

El backend dockerizado todavía no está desplegado públicamente. Una imagen construida y un pipeline exitoso **no sustituyen el despliegue requerido por el TP**.

## E2-1.1 — Primera tabla: identidad global de usuario

**Fuente funcional:** RF-01, CU-01 y CU-02; Documento 03, sección 3.1 y UML 03A.

Se incorpora la entidad `User` con la tabla PostgreSQL `users`, sin usuarios DEMO persistidos, sin empresa obligatoria y sin roles globales. La migración `e2101_users` incluye:

- `id`: UUID único como clave primaria.
- `email_normalizado`: correo único, no nulo, en minúsculas y sin espacios exteriores, hasta 254 caracteres. E2-1.2 completará la validación semántica del correo.
- `password_hash`: no nulo, espacio para un hash de contraseña moderno. **El almacenamiento por sí solo no garantiza que sea un hash Argon2id**; E2-1.2 hará el hash y su verificación.
- `display_name`: nombre de 2 a 70 caracteres; `contact_phone` opcional de máximo 30, según el perfil del frontend.
- `status`: `ACTIVO` o `DESHABILITADO`, valor inicial `ACTIVO`.
- `created_at` y `updated_at`: fechas con zona horaria. El ORM actualiza `updated_at` al modificar registros desde SQLAlchemy; aún no existe un trigger para modificaciones SQL externas.

Las iniciales del avatar pueden derivarse en la UI. Roles y permisos pertenecerán a la tabla `memberships` en un incremento posterior, nunca a `users`.

### Aplicar y verificar la migración

Desde `plataforma-pyme/`, con PostgreSQL Docker saludable:

```powershell
git pull origin main
docker compose ps
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
```

Resultado esperado: `e2101_users (head)` y `No new upgrade operations detected.`

Las pruebas de integración realizan inserciones con correos aleatorios dentro de transacciones PostgreSQL que **siempre se revierten**. No dejan usuarios de prueba en la base:

```powershell
$env:RUN_DB_INTEGRATION = "1"
.\.venv\Scripts\python.exe -m pytest -v
Remove-Item Env:\RUN_DB_INTEGRATION
```

Para comprobar la revisión y la tabla, desde `plataforma-pyme/`:

```powershell
cd ..
docker compose exec -T db psql -U pyme -d asistente_pyme -c "SELECT version_num FROM alembic_version;"
docker compose exec -T db psql -U pyme -d asistente_pyme -c "\d users"
```

`\d users` es una orden interna de `psql`, no SQL ordinario; muestra columnas, restricciones e índices. Esperado: revisión `e2101_users`, tabla `users` y constraint `uq_users_email_normalizado`.

**No ejecutes `alembic downgrade` sobre datos reales**, porque revertir esta migración borra la tabla de usuarios.

### Alcance y siguiente paso

- **Hecho en código:** modelo, tabla, migración y pruebas de unicidad/normalización/estado y rollback.
- **Pendiente de validar en el equipo:** aplicación de migración y tests de integración.
- **E2-1.2 (después):** normalización de correo, Argon2id, registro y login reales, DTOs seguros y tests HTTP. La política concreta de credenciales se cerrará antes de programarla.
- **E2-1.3:** empresa, rol por membresía y controles multiempresa. El UML 03A seguirá siendo conceptual hasta integrar estas entidades y sus relaciones.

## E2-1.2A — Registro real de cuentas

Se incorpora `POST /api/v1/auth/register`: crea un usuario global, sin empresa ni membresia, devolviendo HTTP 201 con campos publicos (`id`, `email`, `display_name`, `contact_phone`, `status`, `created_at`). No devuelve password ni hash. La direccion de correo se valida y normaliza; se exige ASCII por consistencia con el CHECK PostgreSQL, la unicidad queda garantizada por `uq_users_email_normalizado`. Un duplicado devuelve 409 con mensaje generico. Invalidos devuelven 422.

Se utiliza Argon2id con sal aleatoria, memoria 64 MiB, 3 iteraciones y paralelismo 2. La politica inicial requiere frases de acceso de entre 15 y 128 caracteres. El registro **NO inicia sesion** ni otorga permisos empresariales. No se agregaron migraciones nuevas: se utiliza la tabla `users` ya validada en E2-1.1.

Desde `plataforma-pyme/backend/`:

```powershell
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
$env:RUN_DB_INTEGRATION = "1"
.\.venv\Scripts\python.exe -m pytest -v
Remove-Item Env:\RUN_DB_INTEGRATION
```

Las pruebas HTTP contra PostgreSQL usan una transaccion exterior y SAVEPOINT: las altas de prueba se revierten siempre, sin guardar usuarios. GitHub Actions ejecuta las pruebas en una base efimera. Para probar manualmente Swagger, usar la API en `http://127.0.0.1:8000/docs` (Uvicorn Windows) o reconstruir la imagen Docker y abrir `http://127.0.0.1:18000/docs`.

**No enviar credenciales reales en mensajes ni archivos.** Una alta manual realizada fuera de tests **si persiste**. Para despliegue publico faltan HTTPS, controles antiabuso y antifuerza bruta, proteccion frente a enumeracion (409 revela duplicados), verificacion/recuperacion de email y gestion de sesiones. E2-1.2B incorporara login, expiracion y revocacion. No se modifico el frontend.

## E2-1.2B — Sesiones personales

Nueva revisión Alembic `e212b_sessions`: tabla `auth_sessions` vinculada a `users` con FK, huella SHA-256 única del token, fechas de creación, vencimiento y revocación. No guarda el bearer en claro. El token aleatorio de 256 bits se emite **solo al iniciar sesión**; dura **12 horas**. Cada solicitud protegida consulta PostgreSQL para verificar sesión vigente y usuario activo.

| Ruta | Acción |
|---|---|
| `POST /api/v1/auth/register` | Crea identidad global, sin empresa |
| `POST /api/v1/auth/login` | Comprueba contraseña Argon2id y emite Bearer opaco |
| `GET /api/v1/auth/me` | Identidad pública, requiere Bearer |
| `POST /api/v1/auth/logout` | Revoca solo sesión actual; HTTP 204 |

Credenciales erróneas, usuario inexistente o deshabilitado, sesión vencida o revocada retornan HTTP 401 genérico, sin revelar qué condición ocurrió. Los permisos por empresa siguen **pendientes**, y el login personal no concede acceso comercial.

### Probarlo en PowerShell

Desde `plataforma-pyme/`, con PostgreSQL Docker iniciado:

```powershell
git pull origin main
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
$env:RUN_DB_INTEGRATION = "1"
.\.venv\Scripts\python.exe -m pytest -v
Remove-Item Env:\RUN_DB_INTEGRATION
```

Las pruebas de integración usan PostgreSQL real bajo transacciones exteriores reversibles; no dejan usuarios ni sesiones de prueba. Desde `plataforma-pyme/`, reconstruí solo la API Docker: `docker compose --profile api up -d --build api`. Consultá Swagger en `http://127.0.0.1:18000/docs`. No pegues tokens ni contraseñas reales en el chat, logs o capturas.

**Limitaciones para producción:** falta HTTPS público, límites de intentos antiabuso, protección frente a enumeración, recuperación y confirmación de correo, almacenamiento seguro de credenciales en frontend y estrategia de cookies/CSRF si se adopta después. No exponer públicamente esta API sin resolver estas medidas; el navegador React DEMO permanece sin integración.

## E2-1.3A — Entidades Empresa y Membresía (modelo real)

**Referencias:** Documento 01 RF-02; Documento 02 CU-03 y CU-12; Documento 03 UML 03A y sección 3.1; Documento 04 autorización por tenant.

La revisión Alembic `e213a_business_members` crea:

- `businesses`: UUID, nombre (2–120), rubro/categoría (2–120), actividad `PRODUCTOS/SERVICIOS/MIXTO`, fundador histórico `founder_user_id` (FK a `users`), estado `ACTIVA/SUSPENDIDA` y fechas.
- `memberships`: UUID, `business_id` (FK), `user_id` (FK), rol `TITULAR_ADMINISTRATIVO/ADMINISTRADOR/ENCARGADO/TRABAJADOR`, estado `ACTIVA/INACTIVA`, puesto opcional y fechas.
- `UNIQUE (business_id,user_id)`: una única membresía por persona y empresa.
- Índice único **parcial** `uq_memberships_one_active_owner`: a lo sumo una membresía activa con rol `TITULAR_ADMINISTRATIVO` por empresa. No bloquea a los demás administradores ni a los colaboradores.
- Índice `ix_memberships_user_id`: consultas eficientes de empresas asociadas a una cuenta.

**Decisión para evitar inconsistencia:** el fundador histórico vive en `businesses.founder_user_id`; el titular administrativo vigente se **deriva de la Membresía activa** con rol `TITULAR_ADMINISTRATIVO`. No hay `administrative_owner_user_id` redundante. No significa titularidad legal ni participación societaria. La transferencia de titularidad se pospone, como los documentos actuales.

**Límite de la base de datos:** el índice parcial garantiza **como máximo uno**; no garantiza que exista al menos uno. E2-1.3B implementará `crearEmpresa` en **una sola transacción**, con empresa y membresía inicial del fundador. Ningún endpoint de este corte crea aún empresas, membresías o invitaciones. No se crea ubicación ni stock por defecto; los roles serán autorizados en backend por permiso y tenant en los siguientes incrementos, no por confiar en el frontend.

### Comprobación en Windows

Desde `plataforma-pyme/`, manteniendo PostgreSQL saludable:

```powershell
git pull origin main
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
$env:RUN_DB_INTEGRATION = "1"
.\.venv\Scripts\python.exe -m pytest -v
Remove-Item Env:\RUN_DB_INTEGRATION
```

Se espera la revisión `e213a_business_members (head)` y ninguna diferencia Alembic. Las pruebas usan transacciones PostgreSQL y SAVEPOINTs que se revierten; **no dejan empresas ni usuarios de demostración**.

Comprobación de tablas desde `plataforma-pyme/`:

```powershell
cd ..
docker compose exec -T db psql -U pyme -d asistente_pyme -c "SELECT version_num FROM alembic_version;"
docker compose exec -T db psql -U pyme -d asistente_pyme -c "\d businesses"
docker compose exec -T db psql -U pyme -d asistente_pyme -c "\d memberships"
```

No ejecutar un `downgrade` con datos reales. Este corte **no modifica React, no crea rutas de negocios y no requiere reconstruir la imagen API Docker**: solamente cambia el esquema y los tests de backend. El backend Docker seguirá funcionando con `/health` y `/ready`.

**Próximo incremento E2-1.3B:** comando autenticado de creación de empresa y membresía inicial, en una transacción; listado de empresas propias, sin acceso cruzado. Después E2-1.3C: roles/permisos, invitaciones si se mantienen en alcance; actualización posterior del UML 03A con el código validado.

## E2-1.3B — CU-03: crear empresas y ver únicamente las propias

**Implementado:** tres endpoints protegidos con Bearer en `/api/v1/businesses`:

| Método | Ruta | Respuesta |
|---|---|---|
| POST | `/api/v1/businesses` | 201 primera creación; 200 reintento idéntico; 409 misma clave con datos diferentes |
| GET | `/api/v1/businesses` | 200 con arreglo de empresas donde la sesión tiene membresía activa |
| GET | `/api/v1/businesses/{business_id}` | 200 si es miembro activo; 404 si es ajena, inexistente o sin membresía activa |

La creación recibe nombre, rubro `category` y tipo de actividad `PRODUCTOS/SERVICIOS/MIXTO`. Debe llevar un encabezado **`Idempotency-Key` con un UUID v4 diferente por comando nuevo**. En reintentos HTTP del *mismo* comando se reutiliza la misma clave y el mismo contenido. No se permite enviar `founder_user_id`, `role` ni `user_id` desde el cliente: el servidor los deriva de la identidad real.

El servicio comprueba nuevamente la cuenta y sesión activas **con bloqueo de filas dentro de la misma transacción** y luego crea la Empresa, la Membresía inicial `TITULAR_ADMINISTRATIVO/ACTIVA` y el registro idempotente; confirma **una sola vez**. Ante falla revierte las tres escrituras. El registro `business_creation_requests` tiene clave primaria compuesta `(actor_user_id, idempotency_key)`, hash canónico de petición y referencia a la empresa creada. No se elimina con TTL: evita duplicación ante reintentos posteriores.

No se generan ubicaciones, catálogo, stock ni socios legales. Los nombres de empresas **no son globalmente únicos**; una razón social y un identificador tributario verificable se definirán más adelante si el negocio lo exige. El listado incluye empresas `SUSPENDIDA` para consulta; el bloqueo de operaciones comerciales se implementará cuando existan servicios empresariales. Para evitar enumeración, el GET por ID retorna **404 tanto para empresa ajena como inexistente**.

### Verificar en tu equipo

Desde `plataforma-pyme/` con Docker PostgreSQL activo:

```powershell
git pull origin main
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
$env:RUN_DB_INTEGRATION = "1"
.\.venv\Scripts\python.exe -m pytest -v
Remove-Item Env:\RUN_DB_INTEGRATION
```

La revisión esperada es `e213b_business_creation (head)`. Las pruebas de integración crean usuarios/empresas dentro de una transacción externa y SAVEPOINTs; **se revierten al finalizar** y no dejan registros persistidos.

Después, desde `plataforma-pyme/`, reconstruí la API Docker con `docker compose --profile api up -d --build api`, comprobá `docker compose ps` y abrí `http://127.0.0.1:18000/docs`. Las rutas nuevas aparecerán bajo `empresas`. La prueba manual de POST desde Swagger **sí guarda la empresa de verdad**, por lo que las pruebas automatizadas son suficientes para este corte.

**Pendiente E2-1.3C:** permisos detallados por rol, invitaciones y aceptación de membresías, verificación de autorizaciones en cada comando comercial. React seguirá en modo DEMO hasta disponer de contratos HTTP probados. Los modelos UML 03A se ajustarán sobre el código confirmado.

### Corrección de comparación Alembic en E2-1.3B

La clave primaria compuesta de `business_creation_requests(actor_user_id, idempotency_key)` **ya garantiza la unicidad del reintento por persona**. La declaración ORM contenía además un `UniqueConstraint` sobre exactamente esas mismas columnas. PostgreSQL 16 descarta el índice duplicado, pero Alembic lo veía en los metadatos y detectaba una supuesta operación pendiente `add_constraint`.

Se eliminó **solamente el UNIQUE redundante del modelo ORM** y se ajustó la prueba del modelo; no se modificó el esquema efectivo, no se alteraron contraseñas ni se generó una nueva migración. La migración histórica E2-1.3B permanece inmutable porque ya fue aplicada. La unicidad real sigue cubierta por la PK `pk_business_creation_requests`, y la referencia `business_id` conserva su UNIQUE independiente. Después de `git pull`, `python -m alembic check` debería indicar `No new upgrade operations detected.`. Si aún falla, inspeccionar `\\d business_creation_requests` antes de modificar la base de datos. No usar `alembic stamp`, `downgrade` ni SQL manual para esta corrección.

## E2-1.3C.1 — Matriz inicial de permisos y actualización documental

`app/modules/businesses/permissions.py` define las capacidades `business.view`, `business.profile.edit`, `members.invite` y `members.manage`. La decisión depende de **rol de la membresía, estado de la membresía, estado de la empresa y permiso solicitado**. Los roles inexistentes y estados desconocidos se deniegan; empresa suspendida es de solo lectura para miembros activos. Esta política es pura y cuenta con tests; **todavía NO se invoca desde nuevos endpoints de edición o invitación**.

Se corrigió también la recuperación de carreras de idempotencia en `BusinessService.create`: PostgreSQL puede informar la violación de **`pk_business_creation_requests`**, no la restricción `uq_business_creation_actor_key` que se eliminó por ser redundante. La ruta conserva reintentos sin duplicar empresas y se incorporó un test unitario específico.

Documentos académicos actualizados: 01 v0.3, 02 v0.4, 03 v0.4 y 04 v0.5; nuevo Documento 05 v0.1 con trazabilidad real y matriz de permisos. **No hay migración en este corte**, no se altera el frontend ni se modifican datos reales.

Desde `plataforma-pyme/`:

```powershell
git pull origin main
cd backend
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
$env:RUN_DB_INTEGRATION = "1"
.\.venv\Scripts\python.exe -m pytest -v
Remove-Item Env:\RUN_DB_INTEGRATION
```

La versión sigue siendo `e213b_business_creation (head)`; Alembic no debe detectar operaciones pendientes. Se espera conservar los **80 tests existentes** y aprobar además los nuevos casos de matriz RBAC y recuperación de idempotencia. No hace falta reconstruir Docker porque no hay un cambio HTTP efectivo en C.1. **E2-1.3C.2** conectará esta política a una operación real autorizada por rol, con pruebas de 401/403/404/409 y pertenencia a la empresa.

## E2-1.3C.2 — Editar datos de empresa con autorización efectiva

**Nuevo endpoint:** `PATCH /api/v1/businesses/{business_id}`. Recibe exclusivamente campos opcionales `name`, `category` y `activity_kind`. Al menos un campo obligatorio por petición; `null`, campos extra, nombre/rubro inválido o `activity_kind` fuera de `PRODUCTOS/SERVICIOS/MIXTO` producen HTTP 422. Los campos omitidos no se modifican.

**Permisos reales:** el servicio revalida el usuario y token de sesión con bloqueo SQL, luego obtiene y bloquea `Business` y `Membership` del mismo tenant con miembro `ACTIVA`, y aplica `BusinessPermission.EDIT_PROFILE`. Titular administrativo y administrador pueden editar; encargado y trabajador, no. Códigos: 401 sesión inválida, 404 empresa ajena/inexistente/membresía inactiva, 403 rol sin permiso, 409 empresa suspendida con rol apto, 200 edición exitosa. Ninguna solicitud puede alterar estado, fundador, membresía o rol. Una única transacción `flush/commit`, con rollback ante excepción; respuesta tipo `BusinessView`.

**Pruebas nuevas:** `tests/test_business_update_schemas.py`, `tests/test_business_update_http.py`, `tests/test_business_update_integration.py`. Se usan la misma base PostgreSQL y transacciones reversibles de los cortes anteriores: no crear empresas manuales desde Swagger para verificar. Los datos de prueba no deben quedar persistidos.

**Validación en Windows:** desde `plataforma-pyme/`, ejecutar:

```powershell
git pull origin main
cd backend
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
$env:RUN_DB_INTEGRATION = "1"
.\.venv\Scripts\python.exe -m pytest -q
Remove-Item Env:\RUN_DB_INTEGRATION
```

Esperado: misma revisión `e213b_business_creation (head)`, `No new upgrade operations detected` y suite completa aprobada. **No afirmar una cifra final hasta ejecutarla**. Para ver PATCH en Swagger de Docker, desde `plataforma-pyme/` volver a construir **solo la API** con `docker compose --profile api up -d --build api`, comprobar `docker compose ps`, `Invoke-RestMethod http://127.0.0.1:18000/ready` y abrir `http://127.0.0.1:18000/docs`. Esta actualización no necesita nuevas tablas ni migraciones.

**Documentación:** 01 v0.4, 02 v0.5, 03 v0.5, 04 v0.6, 05 v0.2, índice académico. La etapa siguiente dentro de E2-1 será C.3 (emisión de invitaciones), seguida de C.4 (aceptación/gestión de membresías). La hoja formal de auditoría para tu compañero se creará al cerrar el bloque funcional grande **E2-1**, no al completar este subpaso.

## E2-1.3C.3 — Invitaciones empresariales: emitir sin conceder acceso

**Nueva migración:** `e213c3_invitations` crea `business_invitations` (correos normalizados, token SHA-256, rol, estado, vencimiento, empresa e invitador). `POST /api/v1/businesses/{business_id}/invitations` responde 201 y devuelve el token secreto **una sola vez**. El token no se almacena en claro. Solamente invita a `ENCARGADO` o `TRABAJADOR`, y solo titulares/administradores pueden emitir. No hay aceptación, envío de emails ni cambios a `memberships` en este paso.

Permisos y errores: 401 sesión inválida, 403 miembro sin permiso, 404 empresa ajena/sin membresía activa, 409 suspendida/miembro ya activo/invitación vigente, 422 body incorrecto. Una invitación pendiente a email normalizado en una empresa se impide mediante índice parcial UNIQUE. Si venció, se marca `EXPIRADA` antes de generar una nueva. Se realiza validación y escritura en una transacción; el correo invitado no necesita tener cuenta global todavía.

**CI:** GitHub Actions validó migración, `alembic check`, Pytest real con PostgreSQL 16 en Python 3.12/3.14 y Docker. **Falta ejecutar en Windows local** después de aplicar migraciones nuevas.

Desde `plataforma-pyme/` con Docker DB saludable:

```powershell
git pull origin main
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
$env:RUN_DB_INTEGRATION = "1"
.\.venv\Scripts\python.exe -m pytest -q
Remove-Item Env:\RUN_DB_INTEGRATION
cd ..
docker compose --profile api up -d --build api
docker compose ps
Invoke-RestMethod http://127.0.0.1:18000/ready
```

Esperado: `e213c3_invitations (head)`, sin deriva Alembic, suite aprobada y API/DB `healthy`. En Swagger `http://127.0.0.1:18000/docs` aparecerá el nuevo POST. **Advertencia:** usar Swagger para emitir invitación crea un registro real; las pruebas de integración revertibles son suficientes para este corte. No exponer tokens de invitación en capturas, logs ni documentación.

**Documentación sincronizada:** 01 v0.5, 02 v0.6, 03 v0.6, 04 v0.7, 05 v0.3 e índice académico. **Siguiente:** C.4 aceptar y gestionar membresías; solo al cerrar E2-1 completo se genera el informe de traspaso a auditoría de tu compañero.
