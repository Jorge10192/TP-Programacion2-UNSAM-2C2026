> **E2-5 C — Ajustes y stock inicial (09/11/2026):** API `POST/GET /api/v1/businesses/{business_id}/inventory/adjustments` con motivo, versión esperada, signos, idempotencia y controles de permisos por ubicación. El primer saldo (`STOCK_INICIAL`) requiere titular/admin y solo admite ubicación+artículo sin historial; ajustes exigen saldo anterior y no permiten negativos. **Sin migración nueva**: `e25a_inventory_ops`. [Contrato/QA](../docs/E2-5_C_AJUSTES_Y_STOCK_INICIAL.md). CI/local E2-5 C aún pendientes.

> **E2-5 B — Transferencias (09/11/2026, CI aprobado; Windows pendiente):** nuevo POST/GET `/api/v1/businesses/{business_id}/inventory/transfers`, debit/credit en una transacción, permiso STORE en ambas ubicaciones, ledger firmado y replay idempotente. Sin nuevas migraciones: `e25a_inventory_ops`. [Detalle y QA](../docs/E2-5_B_TRASLADOS_ATOMICOS.md). La base E2-5 A validó 816 pruebas locales y CI; [CI E2-5 B #42602232103](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42602232103): **826 tests Python 3.12, 826 Python 3.14, Docker 3/3, Alembic sin deriva**. Validación Windows todavía pendiente.

> **Estado actual — E2-5 A (09/11/2026):** preparación de operaciones de inventario sobre E2-4 cerrado. Nueva entidad `InventoryOperation`, ledger firmado ampliado y migración aditiva `e25a_inventory_ops`; **no hay nuevos endpoints de traslado/ajuste en este corte**. La recepción E2-4 y sus datos existentes permanecen intactos. [Contrato y procedimiento de E2-5 A](../docs/E2-5_A_MODELO_OPERACIONES_INVENTARIO.md). Los apartados E2-0 a E2-3 que siguen son registros históricos, no el último head. [CI E2-5 A](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42599668128): **816 tests en Python 3.12, 816 en Python 3.14, 3/3 jobs verdes**, `e25a_inventory_ops (head)` sin deriva; **Windows aún pendiente**.

# Asistente PyME — Backend FastAPI

> **ESTADO DE REFERENCIA — E2-4 (08–09/11/2026):** Proveedores y Compras con snapshots, recepción completa y única, movimiento por línea física, saldo atómico por empresa/ubicación/artículo. Migración `e24e_receipt_stock` (sin deriva), **797/797 tests en Windows y Python 3.12/3.14 CI**, Docker saludable, bitácora Swagger de 17 casos. Código de corte: `4f88416141c09a82e744990b1aee8c00b9f31dfd`. **Fuente vigente:** [cierre E2-4 documentado](../docs/revisiones/E2-4_CIERRE/00_LEEME.md); [hoja para auditor independiente](../docs/revisiones/E2-4_ENTREGA_PARA_REVISION.md). El resto de este README conserva notas **históricas** por incremento, que pueden presentar módulos de E2-4 como futuros a fecha de redacción. No confundir con el estado actual ni con un despliegue productivo.


**Estado histórico previo (08/11/2026):** E2-1 y E2-2 preservados; E2-3 A/B/C/D validado localmente (580 pruebas), E2-3 E documentación y UML 03A conciliados. Alembic `e23a_catalog (head)` sin deriva; API/DB healthy. Cinco rutas de Catálogo protegidas por empresa; frontend DEMO y operaciones comerciales pendientes. Entrega E2-3 de auditoría pendiente.

> **Estado histórico E2-2 (08/11/2026):** E2-2 A/A.1/B/C/D implementado y validado: **371 pruebas Windows aprobadas en 47.57s**, Alembic `e22d_assignments (head)` sin deriva, API y PostgreSQL en Docker `healthy`, `/ready` = `ready/ok`. [CI del código E2-2 D: 3/3 aprobado](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42497556047), 371 pruebas Python 3.12/3.14 y Docker. **La política por sede aún no se aplica a inventario/compras/ventas**, que son bloques futuros; frontend React permanece DEMO. Los estados parciales descritos en notas de A/B/C constituyen histórico.


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

**Actualización del registro histórico E2-1.3C:** permisos empresariales, emisión/aceptación y gestión de equipo ya están implementados; siguen pendientes controles específicos para los futuros comandos comerciales. React seguirá en modo DEMO hasta disponer de contratos HTTP probados. Los modelos UML 03A se ajustarán sobre el código confirmado.

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

## E2-1 C.4a — Aceptar invitación y habilitar membresía real

**Contrato:** `POST /api/v1/invitations/accept` con Bearer del destinatario y JSON `{"invitation_token":"..."}`. Solo la cuenta cuyo correo normalizado coincide con la invitación puede consumirla. El servicio revalida usuario/sesión, comprueba huella de token y vencimiento, bloquea invitación/empresa/membresía, crea o reactiva una sola Membresía operativa, marca ACEPTADA y guarda usuario/fecha en **una transacción**. Responde 200 con `BusinessView`; 401 sesión inválida, 404 token inexistente/ajeno, 409 vencido/consumido, empresa suspendida o pertenencia ya activa, 422 cuerpo inválido. El cliente no elige empresa/rol al aceptar. El estado/rol histórico del titular administrativo inactivo está protegido. No hay token secreto en los DTO de respuesta de aceptación.

**Nueva migración:** `e213c4_acceptance` agrega auditoría de aceptación a `business_invitations` (`accepted_by_user_id`, `accepted_at` y CHECK de coherencia con estado ACEPTADA). No modificar las migraciones aplicadas anteriormente. Las pruebas `test_business_acceptance_schema.py` y `test_business_acceptance_integration.py` comprueban receptor, cuenta creada después de la invitación, token ajeno/duplicado/vencido, empresa suspendida, rol, membresía reactivada, aislamiento multiempresa, sesión revocada y rollback después de un fallo. GitHub Actions aprobó migración, Pytest y Docker; falta validación local.

**Verificar desde `plataforma-pyme/`** con Docker PostgreSQL saludable:

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

La comprobación local posterior confirmó `e213c4_acceptance (head)`, Alembic sin nuevas operaciones y **195 pruebas aprobadas** al cierre C.4b. Una consulta a `/ready` inmediatamente después de reconstruir puede fallar mientras el contenedor muestra `health: starting`; repetir tras arrancar. No es necesario emitir invitaciones reales desde Swagger, porque las pruebas PostgreSQL crean y revierten los datos. La administración básica de miembros se completó en C.4b; cancelación/rechazo de invitaciones, validación de email y entrega segura para producción continúan pendientes.

**Documentos de aquel corte histórico C.4a:** 01 v0.6, 02 v0.7, 03 v0.7, 04 v0.8 y 05 v0.4. **Versiones al cerrar C.5:** 01 v0.8, 02 v0.9, 03 v0.9, 04 v1.0 y 05 v0.6; UML 03A conciliado. Sin cambios de frontend.

## E2-1 C.4b — Directorio de miembros y administración por titular

Se publicaron dos rutas de equipo:

- **GET `/api/v1/businesses/{business_id}/memberships`**: titular/administrador activo (permiso `members.read`) obtienen miembros del mismo tenant con identidad profesional mínima (`id`, `user_id`, `email`, `display_name`, `role`, `status`, `job_title`), incluidos los INACTIVOS. Encargado/trabajador no pueden leer ese directorio.
- **PATCH `/api/v1/businesses/{business_id}/memberships/{membership_id}`**: solo titular administrativo vigente (permiso `members.manage`) puede cambiar `role` (`ADMINISTRADOR`, `ENCARGADO`, `TRABAJADOR`) y/o `status` (`ACTIVA`, `INACTIVA`). Solo membresías operativas de ese tenant. No permite cambiar al titular activo ni a un titular histórico inactivo, ni transferir titularidad, ni actualizar user_id o job_title.

Ambas operaciones revalidan usuario, token, empresa y membresía del actor en la DB. La edición bloquea también la membresía objetivo y confirma una transacción única; no afecta otros negocios ni el perfil personal global. Errores: 401 auth, 403 rol insuficiente, 404 tenant/target ajeno, 409 empresa suspendida o titular protegido, 422 body de PATCH inválido. **No hay migración nueva**; Alembic sigue en `e213c4_acceptance`.

**Pruebas nuevas:** `test_business_team_schemas.py` (DTOs, OpenAPI y auth) y `test_business_team_integration.py` (RBAC, aislamiento, cambios de rol/estado, autodegradación imposible y rollback), más ampliación de `test_business_permissions.py`. CI aprobó Pytest con PostgreSQL Python 3.12/3.14 y Docker. Ejecutar las comprobaciones locales antes de dar por cerrado C.4b.

Desde `plataforma-pyme/`:

```powershell
git pull origin main
cd backend
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
$env:RUN_DB_INTEGRATION = "1"
.\.venv\Scripts\python.exe -m pytest -q
Remove-Item Env:\RUN_DB_INTEGRATION
cd ..
docker compose --profile api up -d --build --wait api
docker compose ps
Invoke-RestMethod http://127.0.0.1:18000/ready
```

No se alteró React ni ningún proyecto hermano. **C.5 consolidó el UML 03A y los documentos 01–05.** La hoja de auditoría del compañero se preparará aparte, después de la sincronización y antes de RF-03.

## E2-1 C.5 — Evidencia y alcance del cierre documental (08/11/2026)

**Base funcional:** commit `8cd167481291b78628da0d038c7414cc26e3a311`, con CI 3/3. En Windows, el desarrollador ejecutó las pruebas de integración PostgreSQL con `RUN_DB_INTEGRATION=1`, resultado `195 passed in 23.86s`. `alembic current` devolvió `e213c4_acceptance (head)` y `alembic check` no encontró operaciones nuevas. `docker compose --profile api up -d --build --wait api` concluyó con API/DB `healthy` y `/ready` `ready`/`ok`.

**C.5:** actualizar documentos 01–05, índices y 03A (PUML, SVG, guía). **No modifica** código, tests, migraciones, React, 03B ni 03C, ni implica reejecutar CI por el commit documental. Tras este cierre viene una **hoja de revisión independiente** para el compañero; después, RF-03 Ubicaciones.

## E2-2 A — Modelo de ubicaciones y validación incremental

**E2-2 A — persistencia de Ubicaciones (08/11/2026):** se publicó `Location`/`locations` con FK obligatoria `business_id → businesses.id` (`RESTRICT`), seis tipos, `can_sell`/`can_store` independientes, campos de referencia opcionales, `ACTIVA/PAUSADA`, `is_primary`, índice parcial que permite como máximo una principal activa por tenant y CHECK que impide principal pausada. Migración aditiva `20261108_0008_business_locations.py` (`e22a_locations`, descendiente de `e213c4_acceptance`). La empresa continúa iniciándose **sin ubicaciones**. **No hay todavía rutas HTTP de ubicaciones**, ni inventario/compra/venta conectado, ni permisos de ubicación; esos cambios pertenecen a E2-2 B/C y bloques siguientes. El CI del código del corte se verificó en `300fa6f` (GitHub Actions [run 42491816481](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42491816481)): resultado `success`. La validación local Windows del nuevo corte aún se requiere; los 195 tests anteriores correspondían a E2-1.

**Desde `plataforma-pyme/backend/` luego de `git pull`:**

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
$env:RUN_DB_INTEGRATION = "1"
try {
  .\.venv\Scripts\python.exe -m pytest -q
} finally {
  Remove-Item Env:\RUN_DB_INTEGRATION -ErrorAction SilentlyContinue
}
```

El head esperado ahora es **`e22b_location_casa (head)`** (el head anterior era `e22a_locations`). La migración agrega únicamente la tabla `locations`; no crea registros por defecto ni elimina datos anteriores. Los tests de integridad usan transacciones exteriores y SAVEPOINT. **No correr contra una base productiva; no ejecutar `downgrade`, `stamp` ni `docker compose down -v`.** El test de control de versión Alembic se ajustó al head nuevo, sin modificar las reglas de E2-1. La siguiente etapa implementará API/DTO/servicios/autorización; no atribuir CRUD a este incremento.


### E2-2 A.1 — CASA y nuevo head (08/11/2026)

`CASA` se añade a los tipos admitidos; las capacidades `can_sell`/`can_store` continúan independientes. Migración aditiva `e22b_location_casa` tras `e22a_locations`, sin cambios a datos anteriores, y reversión protegida cuando existen ubicaciones CASA. **CI backend** ([run](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42492475011)): **217 pruebas aprobadas, Python 3.12/3.14, Alembic `e22b_location_casa (head)` sin deriva, Docker 3/3**. **CI frontend** ([run](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42492474999)): **2/2 trabajos exitosos, incluidos build/lint y E2E**. Resultado Windows precedente de E2-2 A: 212 pruebas; **la migración adicional CASA y los 217 tests todavía deben reproducirse localmente**. Sin endpoints de ubicación hasta E2-2 B/C y sin conexión React–API.

**Comando seguro desde `plataforma-pyme/backend/`:** primero `python -m alembic upgrade head`, después `python -m alembic current`, `python -m alembic check`, y `RUN_DB_INTEGRATION=1` con `pytest -q` en una DB local conocida. No ejecutar downgrade sobre datos reales.

## E2-2 B — Creación y lectura de ubicaciones por API (corte parcial)

**Estado E2-2 B (08/11/2026):** se publicaron tres rutas reales para ubicaciones bajo `/api/v1/businesses/{business_id}/locations` (`POST` 201, `GET` lista 200, `GET /{location_id}` 200). La creación valida DTO sin campos protegidos, revalida identidad/sesión, bloquea la empresa y membresía del actor, exige tenant `ACTIVA` y rol `TITULAR_ADMINISTRATIVO` o `ADMINISTRADOR`, y confirma una única transacción. Una primera ubicación recibe `is_primary=true`; las posteriores no la reemplazan. Los miembros activos de cualquier rol reconocido pueden consultar las ubicaciones propias, incluso con empresa suspendida; una empresa suspendida no permite crear. Empresa ajena o membresía inactiva devuelve 404; rol sin permiso 403; sesión inválida 401; empresa suspendida al crear 409; cuerpo incorrecto 422. `CASA` y Google Maps HTTPS validado están incluidos. **No hay PATCH/DELETE, ni pausa/reactivación, cambio de principal, asignación individual de personal o consumo comercial de ubicaciones todavía.** La DEMO permanece independiente. Backend sin migración nueva respecto de `e22b_location_casa`.

**Evidencia de CI:** commit funcional `bdd2c84653dafb976c8cd6b49d8c2d577cc345de`; [GitHub Actions E2-2 B](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42493624747) **3/3** (Python 3.12 y 3.14 con PostgreSQL, Docker), **277 pruebas aprobadas**, `e22b_location_casa (head)` y Alembic sin deriva. La salida local de Windows aportada previamente para **E2-2 A.1** fue **217 passed in 23.90s**. Posteriormente E2-2 B **fue validado en Windows con `277 passed in 31.22s`**, Alembic sin deriva y Docker saludable; E2-2 C agrega nuevas pruebas por verificar localmente. La revisión de E2-1 por el compañero sigue anclada en el commit entregado.

**Verificación local sugerida tras `git pull` desde `plataforma-pyme/backend/`:** ejecutar `.\\.venv\\Scripts\\python.exe -m alembic current`, `... -m alembic check` y Pytest con `RUN_DB_INTEGRATION=1` en la base de desarrollo ya migrada. Head esperado `e22b_location_casa (head)`; no existen migraciones E2-2 B. **No ejecutar rollback de versión, downgrade ni borrado de volúmenes.** El contenedor Docker debe reconstruirse para usar las rutas nuevas. Exponer /docs sólo en entorno de desarrollo.

## E2-2 C — Administración de ubicaciones (sin nueva migración)

**E2-2 C (08/11/2026) — operaciones reales sobre ubicaciones:** `PATCH /api/v1/businesses/{business_id}/locations/{location_id}` permite editar únicamente `name`, `kind`, `address`, `map_url`, `can_sell` y `can_store` (campos opcionales en el cuerpo, pero se rechazan `null`, cuerpos vacíos, valores inválidos y campos protegidos). `PATCH /{location_id}/status` recibe solo `ACTIVA` o `PAUSADA`: pausar revoca `is_primary` en la misma transacción y reactivar **no** recupera la titularidad de ubicación automáticamente. `PUT /{location_id}/primary` designa una ubicación `ACTIVA`, desmarca la anterior y marca la elegida dentro del **mismo tenant y de una transacción única**, serializada por bloqueo de empresa y protegida con el índice SQL `uq_locations_one_active_primary`. La operación sobre una ubicación ya principal no realiza cambios adicionales. Titular/administrador con membresía ACTIVA pueden administrar; encargado/trabajador solo consultan. Empresa `SUSPENDIDA` admite lectura pero no cambios; recurso ajeno/inexistente 404, rol sin permiso 403, sesión inválida 401, estado incompatible 409 y cuerpo inválido 422. No se habilitó DELETE ni se crearon tablas nuevas.

**Evidencia:** código funcional `7abafd8208965cd99b0116e02ffc5240d23f218f`, [GitHub Actions E2-2 C](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42495567321) **3/3 exitoso**, 325/325 pruebas en Python 3.12 y 3.14 con PostgreSQL, Alembic `e22b_location_casa (head)` sin deriva y Docker correcto. Windows había validado previamente E2-2 B (`277 passed in 31.22s`, `/ready` = `ready`/`ok`). **Los 325 tests todavía deben reproducirse en Windows para dar por cerrado localmente E2-2 C.** La integración React/API, la asignación individual de miembros a ubicaciones, control de existencias al quitar `can_store`, recepciones/ventas y gestión de cajas operativas son trabajos futuros; no se atribuyen a este incremento. E2-1 y UML 03B/03C no fueron modificados.

**Validación Windows:** desde `plataforma-pyme/backend/`, ejecutar `alembic current`, `alembic check`, y `RUN_DB_INTEGRATION=1 pytest -q` con el mismo intérprete `.venv` de cortes previos. Reconstruir con Docker Compose y consultar `/ready`. Head esperado `e22b_location_casa (head)`, total esperado **325 pruebas**, pendiente de confirmación por el desarrollador. No tocar la rama de revisión de E2-1, ni ejecutar downgrades ni borrar volúmenes.

## E2-2 D — Asignaciones operativas por sede

**E2-2 D AS-IMPLEMENTED:** `LocationAssignment` con clave `(business_id,location_id,user_id)` y FK compuesta hacia `Location` y `Membership` del MISMO tenant. Migración aditiva `e22d_assignments`, índice único auxiliar de ubicación `(business_id,id)`. Estados administrativos `ACTIVA`/`REVOCADA`; fecha `revoked_at`, sin borrado físico. `GET /api/v1/businesses/{business_id}/locations/{location_id}/assignments` lista asignaciones de una sede (titular/administrador); `PUT /api/v1/businesses/{business_id}/locations/{location_id}/assignments/{membership_id}` recibe JSON `{"status":"ACTIVA"}` o `{"status":"REVOCADA"}` y activa/revoca idempotentemente. Solo se activa una membresía ENCARGADO/TRABAJADOR activa hacia ubicación ACTIVA; revocar permite sede pausada o miembro inactivo. Empresa SUSPENDIDA solo lectura. La política pura `can_operate_at_location` obliga a tenant, membresía, sede y capacidad `SELL/STORE` vigentes, además de asignación ACTIVA a encargados/trabajadores. **La política todavía no se consume en compras, inventario ni ventas**, fuera de este corte. Sin nuevas funciones de E2-1 ni conexión del frontend.

**CI comprobado para código funcional `3cd7bce71d951218e8c77da58d147e78fb0d426e`:** [run 42497556047](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42497556047), **371/371 tests Python 3.12 y 3.14, 3/3 trabajos aprobados**, Alembic `e22d_assignments (head)` sin deriva y Docker saludable. **Windows local E2-2 D está pendiente:** la última ejecución aportada corresponde a E2-2 C, 325 passed. No atribuir al último commit documental ejecución propia de tests.

**Comprobación local con PostgreSQL de desarrollo (PowerShell desde `backend/`):**

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
$env:RUN_DB_INTEGRATION = "1"
try { .\.venv\Scripts\python.exe -m pytest -q }
finally { Remove-Item Env:\RUN_DB_INTEGRATION -ErrorAction SilentlyContinue }
```

Esperado: `e22d_assignments (head)` y **371 passed**. La migración agrega tabla e índice único, sin tocar datos anteriores. No usar `stamp`, `downgrade`, `down -v` ni comandos destructivos. Reconstruir contenedores y verificar `/ready` tras sincronizar.

## E2-3 A — Catálogo: ORM y migración, sin API HTTP todavía

**Corte E2-3 A (08/11/2026), persistencia parcial de RF-04/CU-05:** clase SQLAlchemy `CatalogItem` y tabla `catalog_items` con `business_id` obligatorio, FK a Empresa (`RESTRICT`) y par UNIQUE `(business_id,id)` para futuras FK comerciales del mismo tenant. Cuatro clases de ficha según la DEMO: `ELABORADO`, `REVENTA`, `INSUMO` (bienes físicos) y `SERVICIO` (conceptualmente un servicio). Un servicio obliga unidad `SERVICIO`; un bien físico la prohíbe. Unidades físicas: `UNIDAD`, `GRAMO`, `KILOGRAMO`, `MILILITRO`, `LITRO`, `PAQUETE`, `CAJA`. Se almacenan nombre, clave normalizada `name_key`, categoría, SKU opcional, descripción, observaciones internas, estado `ACTIVO`/`INACTIVO`, condición `sellable`, `price_cents` y `reference_cost_cents` opcionales. Importes enteros BIGINT entre 0 y 99.999.999.999 centavos, sin Float. Dos restricciones independientes impiden repetir `name_key` y SKU no nulo **dentro de la empresa**, también en fichas inactivas; distintos tenants pueden reutilizarlos. En E2-3 B el servicio deberá calcular `name_key` de forma canónica (NFKC, espacios colapsados, equivalencia de mayúsculas) y normalizar SKU a mayúsculas **antes de insertar/editar**: SQL impone la unicidad de las claves guardadas y el formato de SKU, pero no deriva `name_key` automáticamente. Crear ficha no crea ubicación, stock, compras, ventas ni movimientos.

**Evidencia:** corte de código/pruebas `79c2071f4e5192be95d75c78d5b1e9a75492a645`; [GitHub Actions E2-3 A](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42504783843) **3/3**, **407 pruebas aprobadas** en Python 3.12 y Python 3.14 con PostgreSQL 16, Docker liveness aprobado y `e23a_catalog (head)` sin cambios pendientes de Alembic. **Validación local de Windows pendiente para E2-3 A**; los 371 tests anteriores corresponden al cierre de E2-2. **No existen rutas HTTP de Catálogo** en este corte; CRUD, RBAC de catálogo, SKU/name normalization de entrada y protección de historias comerciales se implementarán en E2-3 B/C/D. No hay integración React API ni revisión independiente de E2-3 todavía. No se modificó E2-1 ni E2-2 ni frontend DEMO.

**Validación local segura** desde `plataforma-pyme/backend/` con PostgreSQL 16 de desarrollo (no producción):

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
$env:RUN_DB_INTEGRATION = "1"
try {
  .\.venv\Scripts\python.exe -m pytest -q
} finally {
  Remove-Item Env:\RUN_DB_INTEGRATION -ErrorAction SilentlyContinue
}
```

Esperado **`e23a_catalog (head)`** y **407 passed**. Es una tabla nueva sin datos ni stock. Evitar `downgrade`, `stamp` y eliminación de volúmenes.

## E2-3 B — API inicial de Catálogo

**E2-3 B — API real de Catálogo (RF-04/CU-05, 08/11/2026):** cuatro rutas bajo `/api/v1/businesses/{business_id}/catalog`: `POST /catalog` (201 alta), `GET /catalog` (200 lista con `offset>=0`, `1<=limit<=500`; por defecto `limit=100`), `GET /catalog/{item_id}` (200 detalle) y `PATCH /catalog/{item_id}` (200 edición parcial). Cada operación requiere Bearer válido, revalidación de sesión, usuario y membresía de la empresa solicitada. Titular/administrador pueden leer y escribir; encargado/trabajador con membresía activa solo leen; empresa SUSPENDIDA solo lectura; empresa o artículo ajenos/inexistentes 404. El servidor normaliza los nombres Unicode NFKC, colapsa espacios y genera `name_key` con `casefold`; normaliza SKU a mayúsculas ASCII y convierte SKU vacío en NULL. PostgreSQL conserva la unicidad por empresa de `name_key`/SKU incluso con fichas INACTIVO, y la API traduce esa colisión a 409. Datos inválidos o campos protegidos (id, tenant, status, clave derivada) reciben 422. Tipo SERVICIO exige unidad SERVICIO; ninguna otra clasificación puede usarla. Son válidos `price_cents` y `reference_cost_cents` NULL o enteros desde 0 hasta 99.999.999.999. El PATCH permite eliminar SKU/precio/costo con NULL, pero no editar estado. La ficha conserva su `status` y timestamps SQL. La creación no crea ubicación, saldo de stock, compras, ventas ni movimientos.

**Límites explícitos:** E2-3 B no expone todavía `PATCH /status` ni borrado físico (se evaluarán en E2-3 C). No existe integración del frontend React con esta API; no se implementan recepción, ventas, snapshots comerciales ni protección de edición de unidad con historia, pues esos módulos son posteriores. Los tests nuevos comprueban permisos, rollback de duplicados, SKU/nombres normalizados, aislamiento multiempresa, lectura bajo suspensión y fallas 401/403/404/409/422. **Evidencia CI E2-3 B:** [GitHub Actions 42506409757](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42506409757) finalizó **3/3 trabajos exitosos**, **498 pruebas aprobadas** tanto en Python 3.12 (53.96s) como Python 3.14 (50.12s), PostgreSQL 16, `e23a_catalog (head)` y `alembic check` sin operaciones, imagen Docker/liveness aprobado. Código funcional validado: `35ff901855397c024cee50fa590c6c05a7f04cfe`. El CI anterior `42506050141` había detectado dos fallos de mapeo HTTP en PATCH con tipo/unidad incompatible; se corrigieron y ambos casos pasan ahora. **La validación Windows local de E2-3 B sigue pendiente**; el último resultado local confirmado es 407/407 de E2-3 A.

**Validación:** desde `plataforma-pyme/backend/`, Alembic sigue en `e23a_catalog (head)`; ejecutar Pytest con `RUN_DB_INTEGRATION=1` en una base segura migrada. Swagger tendrá las cuatro rutas de `/api/v1/businesses/{business_id}/catalog`. Reconstruir Docker antes de probarlas localmente. E2-3 C incorporará una ruta propia para activar/desactivar, no un campo mutable en el PATCH actual.

## E2-3 C — Estado ACTIVO/INACTIVO

**E2-3 C (08/11/2026):** se implementó `PATCH /api/v1/businesses/{business_id}/catalog/{item_id}/status` con cuerpo exclusivo `{"status":"ACTIVO"}` o `{"status":"INACTIVO"}`, validación estricta y rechazo de atributos extra (422). La ruta revalida sesión y membresía y exige titular/administrador de empresa ACTIVA para escribir (401/403/404/409 según caso). El artículo se bloquea dentro del tenant y se cambia de estado en una sola transacción. El cambio repetido es idempotente, sin alterar `updated_at`. El artículo inactivo continúa visible en GET/listados, con UUID, nombre y SKU reservados incluso ante altas duplicadas; no hay DELETE ni stock ficticio. El PATCH genérico mantiene `status` protegido. Esta funcionalidad tampoco modifica el campo independiente `sellable`.

**Dependencias:** las futuras compras/ventas deben prohibir nuevos movimientos con fichas INACTIVO y conservar snapshots históricos reales. Todavía no hay operaciones comerciales ni frontend integrado; por lo tanto, tampoco existe una restricción real de cambio de unidad por transacciones anteriores. Ninguna migración nueva: se reutiliza CHECK `ACTIVO/INACTIVO` de `e23a_catalog`.

**Pruebas:** [CI E2-3 C](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42507243181) **3/3 trabajos aprobados**, **527 passed** en Python 3.12 y 3.14 con PostgreSQL, `e23a_catalog (head)`, `alembic check` sin operaciones y Docker correcto; código `c2153ab9b65b265eb46b3081079e0f3f15002215`. E2-3 B: **498 passed en Windows (55.79s)**, Docker/API/DB saludables. **E2-3 C: Windows pendiente**. El commit documental posterior no equivale a otra ejecución CI.

**Verificar en Windows:** `alembic current`, `alembic check`, `RUN_DB_INTEGRATION=1` con Pytest (**527 passed** esperados), reconstruir Docker y consultar `/ready`. No ejecutar migraciones destructivas.

## E2-3 D — Integridad y regresión del catálogo

**E2-3 D (08/11/2026):** se reforzó el Catálogo existente, **sin agregar tablas ni migraciones**. Los tests nuevos verifican equivalencias Unicode NFKC + `casefold` en nombres, SKU NFKC y mayúsculas ASCII, rechazo de controles y formas inválidas, desbordamiento de `name_key` por expansión Unicode, importes enteros estrictos (sin booleanos ni decimales), diferenciación entre `PATCH` con campo omitido y con `null` explícito, incompatibilidad SERVICIO/unidad física, campos protegidos de `/status`, colisiones de nombre/SKU incluso en fichas INACTIVO, independencia entre dos empresas del mismo usuario, recuperación de la sesión tras 409, y rollback provocado después de `flush` tanto en alta como en edición. Se añadió un límite máximo a `offset` de catálogo (`9_223_372_036_854_775_807`, BIGINT PostgreSQL): excederlo produce 422 antes de ejecutar SQL, manteniendo `limit` de 1 a 500 y `offset` no negativo. Los cinco endpoints de Catálogo conservan sus contratos y permisos empresariales; no se crea stock.

**Alcance y límites:** las UNIQUE por `(business_id,name_key)` y `(business_id,sku)` y las transacciones/bloqueos existentes protegen ante colisiones; los tests ejercen duplicados y recuperaciones reales en PostgreSQL, **pero no son una prueba simultánea de carga/concurrencia con múltiples conexiones independientes**. Esta última queda registrada como verificación futura antes de producción. No hay aún compras, ventas, movimientos ni snapshots, por lo que no se puede comprobar una regla de cambio de unidad/estado con historial comercial real. `sellable` no sustituye `status`. No conectar frontend DEMO ni E2-1/E2-2 para este corte.

**Evidencia CI del código D:** commit `bf4fd3fa809c9f4e6afdeb064a155acf233b1722`, [GitHub Actions run 42508771222](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42508771222): **3/3 trabajos aprobados**, **580 passed** en Python 3.12 y Python 3.14 con PostgreSQL, Docker build/liveness aprobado, `e23a_catalog (head)` y `alembic check` sin diferencias. **Validación local Windows E2-3 C:** 527 passed in 59.60s, contenedores saludables y `/ready` correcto. **Validación local Windows E2-3 D:** todavía pendiente. No confundir CI remoto con pruebas ejecutadas en la computadora del autor.

**Para Windows, desde `plataforma-pyme/backend/`:** `alembic current`, `alembic check` y Pytest con `RUN_DB_INTEGRATION=1` (**580 passed esperados**). Después reconstruir Docker, comprobar `docker compose ps` y `/ready`. No hay migraciones nuevas ni es necesario modificar E2-1/E2-2.

## E2-3 E — Cierre de Catálogo

**E2-3 E cerrado funcional y documentalmente (08/11/2026):** catálogo `CatalogItem` con migración `e23a_catalog`, cinco rutas REST reales, verificación de tenant/RBAC y estado ACTIVO/INACTIVO. **580 passed en Windows (66.45s)**, Alembic sin deriva, API y DB Docker healthy, `/ready` ready/ok. CI D [3/3 y 580 tests en Python 3.12/3.14](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42508771222) sobre `bf4fd3fa809c9f4e6afdeb064a155acf233b1722`. UML 03A v0.7 (PUML, guía y SVG editorial) actualizado; Proveedor TO-BE, 03B/03C preservados. No hay aún compras, inventario, ventas ni integración React/API. **Pendiente: entrega formal al revisor, sin merge de PR**. Los estados A/B/C/D más abajo corresponden a cortes históricos.

**Validación D ya reportada desde Windows:** `580 passed in 66.45s`, Alembic `e23a_catalog (head)` sin operaciones y `/ready` `ready/ok`. Un commit solo documental no obliga a repetir el conjunto de pruebas. La auditoría independiente deberá distinguir pruebas propias de pruebas suministradas.

## E2-4 — Referencia de validación y entrega consolidada (corte 08/11/2026)

- **API:** cinco operaciones de Proveedores, tres de Compras, recepción `POST /purchases/{purchase_id}/receive`, consulta de recibo y consultas de `inventory/balances` / `inventory/movements`.
- **Migraciones aditivas:** `e24a_suppliers` → `e24c_purchases` → `e24d_purchase_hash` → `e24e_receipt_stock`.
- **Pruebas:** commit `4f88416141c09a82e744990b1aee8c00b9f31dfd`; `20 passed` archivo afectado y `797 passed` suite total en Windows sobre DB poblada; [CI run 42530739959](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42530739959), tres trabajos exitosos.
- **QA manual:** compra de concepto libre 12505 centavos; compra física de 10 unidades por 1000000 centavos; depósito real activo; recepción 201, replay 200, segundo intento con clave distinta 409, saldo 10000 milésimas/versión 1 y un único movimiento de entrada. [Detalle exacto, sin claves ni tokens](../docs/revisiones/E2-4_CIERRE/02_BITACORA_PRUEBAS_SWAGGER.md).
- **Pendientes no implementados:** cancelación por API, parcial 1:N, devoluciones, ajustes, transferencias, ventas, multimoneda, permisos DB de inmutabilidad, separación completa de DB de tests, frontend React integrado, producción. [Trazabilidad](../docs/revisiones/E2-4_CIERRE/05_TRAZABILIDAD_Y_PENDIENTES.md).

**Cómo revalidar:** seguir [guía segura E2-4](../docs/revisiones/E2-4_CIERRE/07_GUIA_REPRODUCCION_SEGURA.md). **No borrar volúmenes** para ejecutar pruebas ni reutilizar identificadores históricos como nuevas claves.

## E2-5 A — Preparar trazabilidad de transferencias y ajustes

Esta entrega suma `inventory_operations` (tipo, artículo, unidad, cantidad, origen/destino, motivo, actor e idempotencia por empresa), y amplía `stock_movements` para representar `TRASLADO_{SALIDA,ENTRADA}`, `AJUSTE_{SALIDA,ENTRADA}` y `STOCK_INICIAL` con deltas firmados, sin romper `COMPRA_RECEPCION`. Solo **modelo, migración y pruebas de integridad SQL**; no expone nuevos comandos ni modifica saldos del usuario. El endpoint de movimientos E2-4 aún está especializado en recepciones; se extenderá al publicar operaciones manuales en E2-5 B/C.

Migración: `e25a_inventory_ops` (tras `e24e_receipt_stock`). Ruta y controles: [E2-5 A](../docs/E2-5_A_MODELO_OPERACIONES_INVENTARIO.md).

Desde `plataforma-pyme/backend`:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
$env:RUN_DB_INTEGRATION = "1"
try { .\.venv\Scripts\python.exe -m pytest -q }
finally { Remove-Item Env:\RUN_DB_INTEGRATION -ErrorAction SilentlyContinue }
```

**No usar downgrade, stamp o eliminación del volumen para validar**: la compra/recepción manual QA de E2-4 debe conservarse.
