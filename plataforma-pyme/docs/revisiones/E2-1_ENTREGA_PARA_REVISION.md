---
tipo_documento: "ENTREGA_PARA_REVISION"
proyecto: "Asistente PyME — Programación 2, UNSAM"
bloque: "E2-1"
nombre: "Identidad, autenticación, empresas, roles, permisos, invitaciones y membresías"
version: "1.0"
fecha_corte: "2026-11-08"
repositorio: "Jorge10192/TP-Programacion2-UNSAM-2C2026"
carpeta: "plataforma-pyme/"
rama_origen: "main"
rama_revision: "review/e2-1-identidad-empresas"
commit_e2_0_previo: "5a5a8afb4495818828543a6625694ea01a49fb9c"
commit_e2_1_funcional_ci: "8cd167481291b78628da0d038c7414cc26e3a311"
commit_cierre_tecnico_documental: "53aa3863d5fd827ef6c8108386cc4e0885be687a"
commit_guia_maestra: "fb34b6c53f283d60f774d390caa6dd61b92fdd7f"
base_rama_revision: "SHA_DE_PUBLICACION_DE_ESTA_HOJA_INFORMADO_POR_EL_RESPONSABLE"
informe_revisor: "plataforma-pyme/docs/revisiones/E2-1_INFORME_DE_REVISION.md"
estado: "CERRADO_PARA_REVISION_INDEPENDIENTE"
merge_por_revisor: false
---

# E2-1 — Entrega formal para auditoría y correcciones controladas

**Para:** compañero revisor y su IA. **Este documento NO es el informe de auditoría.** Es la especificación del trabajo que se entrega para revisar. El compañero debe desarrollar su análisis, corregir únicamente lo justificable **en su rama** y elaborar el informe detallado dentro del mismo Pull Request.

> **Regla prioritaria:** respetar la integración anterior y el crecimiento incremental de la plataforma. **No reescribir módulos anteriores, no rediseñar el proyecto, no implementar funcionalidades futuras y no modificar componentes fuera de la lista blanca.** Una revisión con cero cambios de código es válida si las evidencias la sostienen. **Nunca hacer push directo a `main` ni fusionar el PR.**

## 1. Fuentes, precedencia y referencias Git

Lectura obligatoria y en este orden:

1. **Esta hoja de E2-1** (alcance, permisos de edición y base de revisión).
2. [Guía maestra v1.1](GUIA_MAESTRA_REVISION_BLOQUES_E2_ASISTENTE_PYME.md): metodología de auditoría, resultados de pruebas, informe y PR. **La hoja específica prevalece ante una divergencia con un ejemplo genérico de la guía.**
3. [Documentos 01–05](../../entrega-programacion-2/README.md), especialmente [05 — Matriz API y trazabilidad](../../entrega-programacion-2/05_MATRIZ_API_Y_TRAZABILIDAD.md).
4. [Modelo 03A PlantUML](../../entrega-programacion-2/diagramas/03A_CLASES_IDENTIDAD_Y_CATALOGO.puml), [SVG 03A](../../entrega-programacion-2/diagramas/03A_IDENTIDAD_EMPRESAS_CATALOGO_REDISENADO.svg) y [guía 03A](../../entrega-programacion-2/diagramas/03A_EXPLICACION_IDENTIDAD_EMPRESAS_CATALOGO.md).
5. `plataforma-pyme/backend/`: modelos, routers, servicios, repositorios, permisos, migraciones, tests y README **reales**.
6. [Guía técnica anterior](../../entrega-programacion-2/REVISION_INDEPENDIENTE_E2-1.md), **solo referencia complementaria**, no sustituye estas reglas.
7. [CI de C.4b](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42472269979).

| Referencia | SHA íntegro | Significado |
|---|---|---|
| Último E2-0 anterior a E2-1 | `5a5a8afb4495818828543a6625694ea01a49fb9c` | Límite histórico: **lo heredado se preserva** |
| Último commit funcional C.4b con CI verificado | `8cd167481291b78628da0d038c7414cc26e3a311` | Backend y pruebas de E2-1 |
| Cierre de documentos C.5 y guía inicial | `53aa3863d5fd827ef6c8108386cc4e0885be687a` | Base técnica y documental que se pretende auditar |
| Incorporación de guía maestra al repo | `fb34b6c53f283d60f774d390caa6dd61b92fdd7f` | Protocolo de revisión |
| **Publicación de esta hoja** | **SHA completo informado por el responsable junto al enlace de esta entrega** | **Commit exacto para crear la rama de revisión**, porque incluye las dos hojas |

**Importante sobre la base:** el código/documentación E2-1 se congeló en `53aa386...`. Los commits posteriores únicamente incorporan protocolos. La rama de tu compañero **debe partir del commit que agrega ESTA hoja** (el SHA exacto que recibirá junto al enlace); de otro modo no incluirá los documentos de revisión. Ese SHA no puede aparecer dentro del propio archivo antes de que Git lo genere. **No utilizar `origin/main` como base móvil** si hubiera avanzado.

Como análisis histórico opcional, comparar el estado previo `5a5a8afb...` con el último C.4b `8cd16748...`. El rango ayuda a distinguir responsabilidades, **no amplía la lista de archivos editables**.

## 2. Objetivos y alcance realmente construido

**Producto:** Asistente PyME, plataforma de gestión **generalista, multirrubro y multiempresa**. WALOS es un negocio de ejemplo, no el producto. Una persona posee identidad global y puede estar vinculada a varias empresas con roles específicos de cada una. La seguridad empresarial debe funcionar aunque el frontend React continúe como DEMO local.

**Objetivos de E2-1:**

1. Registro, validación de identidad, contraseñas seguras y sesiones personales persistidas en PostgreSQL.
2. Empresas con fundador histórico, membresía titular inicial y aislamiento por `business_id`.
3. Rol y permiso por **membresía vigente en cada tenant**, sin rol global ni confianza en datos del cliente.
4. Creación empresarial atómica e idempotente para evitar duplicación ante reintentos/concurrencia.
5. Emisión dirigida de invitaciones seguras, aceptación autenticada y creación/reactivación de una membresía única.
6. Directorio de equipo y cambios controlados de roles operativos/estado, preservando titularidad.
7. Tests de unidad/HTTP/integración SQL, migraciones y sincronización de documentos 01–05 con UML 03A.

### Entregas internas ya realizadas

| Paso | Qué se desarrolló | Pruebas locales reportadas |
|---|---|---:|
| E2-1.1 | Entidad `User`, tabla `users` y restricciones de identidad | Integradas en sucesivas regresiones |
| E2-1.2A/B | Registro con Argon2id; login, `/me`, logout, sesiones revocables y vencimiento | Integradas en sucesivas regresiones |
| E2-1.3A/B | `Business`, `Membership`, fundador, titular inicial, creación idempotente y consultas de empresas propias | Integradas en sucesivas regresiones |
| C.1 | Matriz RBAC y corrección de recuperación idempotente | **98** |
| C.2 | `PATCH` de perfil empresarial, permisos y aislamiento real | **125** |
| C.3 | Emisión de invitaciones por empresa/rol | **147** |
| C.4a | Aceptación autenticada, una sola membresía, rollback | **171** |
| C.4b | `GET` de equipo y `PATCH` de rol/estado por titular | **195** |
| C.5 | Documentos 01–05, README y UML 03A actualizados | **Solo documentación; sin nuevos tests** |

Los números son totales acumulados por corte; **no sumarlos**.

### Operaciones HTTP a auditar

| Grupo | Método y ruta | Objetivo |
|---|---|---|
| Salud | `GET /health`, `GET /ready` | Infraestructura anterior E2-0: **solo verificar compatibilidad; no modificar** |
| Autenticación | `POST /api/v1/auth/register`, `POST /api/v1/auth/login` | Alta de cuenta e inicio de sesión |
| Autenticación | `GET /api/v1/auth/me`, `POST /api/v1/auth/logout` | Identidad autenticada y revocación |
| Empresas | `POST /api/v1/businesses` | Alta + titular inicial + idempotencia |
| Empresas | `GET /api/v1/businesses`, `GET /api/v1/businesses/{business_id}` | Listar/consultar empresas propias |
| Empresas | `PATCH /api/v1/businesses/{business_id}` | Editar perfil según RBAC |
| Invitaciones | `POST /api/v1/businesses/{business_id}/invitations` | Emisión autorizada, token de un solo acceso |
| Invitaciones | `POST /api/v1/invitations/accept` | Aceptación por destinatario autenticado |
| Equipo | `GET /api/v1/businesses/{business_id}/memberships` | Directorio limitado a titular/administrador |
| Equipo | `PATCH /api/v1/businesses/{business_id}/memberships/{membership_id}` | Cambio de rol/estado de colaboradores solo por titular |

**HTTP esperado:** contrastar cada contrato concreto del Documento 05. En general `401` sin auth; `403` sin permiso para una empresa propia; `404` recurso ajeno/inexistente; `409` conflictos o estados incompatibles; `422` datos inválidos. La creación idempotente puede devolver `201` al crear y `200` al recuperar resultado de un reintento válido. **No unificar códigos sin revisar reglas y tests.**

### Matriz RBAC que debe preservarse

| Permiso | TITULAR_ADMINISTRATIVO | ADMINISTRADOR | ENCARGADO | TRABAJADOR |
|---|---|---|---|---|
| `business.view` | Sí | Sí | Sí | Sí |
| `business.profile.edit` | Sí | Sí | No | No |
| `members.invite` | Sí | Sí | No | No |
| `members.read` | Sí | Sí | No | No |
| `members.manage` | Sí | No | No | No |

**Reglas transversales:** `Membership` activa del tenant exacto; roles/estados desconocidos denegados; `SUSPENDIDA` permite lectura informativa del perfil pero no modificaciones ni directorio sensible. Un titular de la empresa A **no** tiene permiso por su rol sobre la empresa B.

## 3. Decisiones de diseño deliberadas — NO "corregir" por preferencia

| Decisión consciente | Motivo / implicación |
|---|---|
| `User` global, rol por `Membership` | Multitenencia sin privilegios empresariales globales |
| `founder_user_id` histórico ≠ titular vigente | El fundador no concede permiso perpetuo ni representa necesariamente propiedad legal |
| Empresa nueva con titular inicial en transacción | No dejar empresas sin administrador inicial |
| Índice `uq_memberships_one_active_owner` | Impone **como máximo uno** activo; la creación impone existencia del inicial |
| Una membresía por empresa+usuario | Evita duplicación al aceptar o reactivar |
| Invitación a correo sin cuenta previa | Emitir no concede acceso; aceptar requiere cuenta autenticada del email |
| Roles invitables acotados a `ENCARGADO` y `TRABAJADOR` | No crear administradores/titulares con invitación básica |
| Administrador puede invitar/leer, pero no `members.manage` | Se reserva al titular la administración de privilegios del equipo |
| Secreto de invitación entregado solo en respuesta 201 | Persistir exclusivamente hash SHA-256; plazo siete días |
| C.4b no modificó el esquema | Reutiliza `Membership` y su estado/rol existentes |
| Código React DEMO desacoplado | La integración real pertenece a E2-7 |
| UML 03A conceptual | PlantUML conserva emisor obligatorio y aceptante opcional; SVG puede resumir; Ubicación/Catálogo/Proveedor aún TO-BE |
| Empresa sin ubicación por defecto | Los servicios no requieren depósito ficticio |

Si un requisito, documento y código se contradicen, el revisor **NO cambia unilateralmente** reglas de negocio. Registra `DECISION_REQUERIDA` con evidencia de ambos lados, alternativas y riesgo. No confundir una **decisión posterior legítima** con un bug solo por diferir de un diseño antiguo.

## 4. Lo que NO se implementó y debe permanecer pendiente

**En identidad/equipo:** transferencia o cese de titularidad; verificación/recuperación de correo y contraseña; envío automático, rechazo, cancelación, reenvío y listado administrativo de invitaciones; edición de `job_title`; auditoría histórica de cambios de roles; eliminación física de miembros; protección integral para internet público (HTTPS, rate limiting, controles antiabuso, etc.); integración con React; despliegue público.

**Bloques siguientes expresamente excluidos:** E2-2 ubicaciones; E2-3 catálogo y variantes; E2-4 proveedores/compras/recepción; E2-5 inventario y movimientos; E2-6 ventas/pagos; E2-7 integración frontend/backend, QA integral y despliegue; Mercado Pago/QR real, conciliación, producción, analítica y otras ampliaciones diferidas.

**La consigna académica exige más que E2-1:** entre otros puntos, una API que cubra **al menos cinco RF de alto nivel**, pruebas, CI, patrones y despliegue. Aquí RF-01/RF-02 poseen backend; RF-03–RF-07 siguen pendientes. **No implementar adelantadamente E2-2–E2-7 durante esta revisión.** Sí documentar riesgos o dependencias si afectan el futuro.

## 5. Evidencia de cierre que recibe el revisor

| Verificación | Resultado recibido | Procedencia |
|---|---|---|
| Pytest con PostgreSQL | `195 passed in 23.86s` | Salida local Windows aportada por el desarrollador |
| Alembic | `e213c4_acceptance (head)`, `No new upgrade operations detected.` | Salida local aportada |
| Docker | API y PostgreSQL `healthy` con `--wait` | Salida local aportada |
| `GET /ready` | `status=ready`; `database=ok` | Salida local aportada |
| GitHub Actions | 3/3 jobs `success` para SHA `8cd1674`: Python 3.12/PostgreSQL, Python 3.14/PostgreSQL y Docker liveness | [Run 42472269979](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42472269979) |

**Precisión:** los datos de Windows son **`REPORTADO_POR_AUTOR`** hasta que el compañero los reproduzca. El CI corresponde a **`8cd1674`**, no a un supuesto CI de C.5 o de su futura rama. Las migraciones relevantes culminan en `e213c4_acceptance`; no editar ninguna migración histórica aplicada.

## 6. Lista blanca de modificaciones de E2-1

**Default:** cualquier archivo **no autorizado expresamente** es **SOLO LECTURA**. Se puede consultar infraestructura anterior para entender dependencias, **no modificarla**.

### 6.1. Archivos editables por defecto SOLO por un hallazgo confirmado/justificado

```yaml
rutas_permitidas_modificar:
  - "plataforma-pyme/backend/app/modules/auth/**"
  - "plataforma-pyme/backend/app/modules/businesses/**"
  - "plataforma-pyme/backend/tests/test_auth*.py"
  - "plataforma-pyme/backend/tests/test_user*.py"
  - "plataforma-pyme/backend/tests/test_business*.py"
  - "plataforma-pyme/entrega-programacion-2/01_ANALISIS_DE_REQUERIMIENTOS.md"
  - "plataforma-pyme/entrega-programacion-2/02_CASOS_DE_USO.md"
  - "plataforma-pyme/entrega-programacion-2/03_MODELO_DE_DOMINIO_Y_UML.md"
  - "plataforma-pyme/entrega-programacion-2/04_ARQUITECTURA_Y_PATRONES.md"
  - "plataforma-pyme/entrega-programacion-2/05_MATRIZ_API_Y_TRAZABILIDAD.md"
  - "plataforma-pyme/backend/README.md"
  - "plataforma-pyme/entrega-programacion-2/diagramas/03A_CLASES_IDENTIDAD_Y_CATALOGO.puml"
  - "plataforma-pyme/entrega-programacion-2/diagramas/03A_IDENTIDAD_EMPRESAS_CATALOGO_REDISENADO.svg"
  - "plataforma-pyme/entrega-programacion-2/diagramas/03A_EXPLICACION_IDENTIDAD_EMPRESAS_CATALOGO.md"
  - "plataforma-pyme/docs/revisiones/E2-1_INFORME_DE_REVISION.md"
```

**Regla para documentación:** editar **solo** las secciones afectadas por una corrección real, conservar el resto de decisiones y del estado TO-BE, no reescribir 01–05. UML 03A: corregir contenido si está errado y sincronizar fuente/exportación; **no regenerar estética por gusto**. Preferir un nuevo test `test_auth*`/`test_user*`/`test_business*` a desactivar tests existentes.

### 6.2. Edición excepcional — exige autorización previa por hallazgo

```yaml
rutas_condicionadas_a_aprobacion:
  - "plataforma-pyme/backend/app/infrastructure/models/user.py"
  - "plataforma-pyme/backend/app/infrastructure/models/auth_session.py"
  - "plataforma-pyme/backend/app/infrastructure/models/business.py"
  - "plataforma-pyme/backend/app/infrastructure/models/membership.py"
  - "plataforma-pyme/backend/app/infrastructure/models/business_creation_request.py"
  - "plataforma-pyme/backend/app/infrastructure/models/business_invitation.py"
  - "plataforma-pyme/backend/app/infrastructure/models/__init__.py"
  - "plataforma-pyme/backend/app/api/dependencies.py"
  - "plataforma-pyme/backend/app/api/v1/router.py"
  - "plataforma-pyme/backend/pyproject.toml"
  - "plataforma-pyme/backend/alembic/env.py"
  - "cualquier_nueva_migracion_alembic"
regla: "Proponer cambios con ID, impacto, test y compatibilidad; esperar aprobación."
```

Se pueden **leer** para identificar errores. No cambiar tablas, FK, UNIQUE, CHECK ni contratos compartidos sin autorización explícita. **Prohibido reescribir migraciones históricas ya aplicadas.** Si una corrección requiere una nueva migración, se propone primero su plan de compatibilidad/rollback y se deja pendiente de decisión.

### 6.3. Solo lectura / prohibido modificar en esta revisión

```yaml
rutas_prohibidas_modificar:
  - "plataforma-pyme/frontend/**"
  - "plataforma-pyme/docs/00_*"
  - "plataforma-pyme/docs/01_*"
  - "plataforma-pyme/docs/02_*"
  - "plataforma-pyme/docs/03_*"
  - "plataforma-pyme/docs/04_*"
  - "plataforma-pyme/docs/05_*"
  - "plataforma-pyme/docs/06_*"
  - "plataforma-pyme/docs/07_*"
  - "plataforma-pyme/docs/08_*"
  - "plataforma-pyme/docs/09_*"
  - "plataforma-pyme/docs/1*"
  - "plataforma-pyme/docs/2*"
  - "plataforma-pyme/docs/ADR/**"
  - "plataforma-pyme/backend/app/infrastructure/db.py"
  - "plataforma-pyme/backend/app/infrastructure/models/base.py"
  - "plataforma-pyme/backend/app/core/**"
  - "plataforma-pyme/backend/app/main.py"
  - "plataforma-pyme/backend/alembic/versions/**"
  - "plataforma-pyme/backend/tests/test_db*.py"
  - "plataforma-pyme/backend/tests/test_postgres_integration.py"
  - "plataforma-pyme/backend/tests/test_health.py"
  - "plataforma-pyme/backend/tests/test_readiness.py"
  - "plataforma-pyme/compose.yaml"
  - "plataforma-pyme/.env.example"
  - "plataforma-pyme/.gitignore"
  - ".github/workflows/**"
  - "plataforma-pyme/entrega-programacion-2/diagramas/03B*"
  - "plataforma-pyme/entrega-programacion-2/diagramas/03C*"
  - "plataforma-pyme/entrega-programacion-2/REVISION_INDEPENDIENTE_E2-1.md"
  - "plataforma-pyme/docs/revisiones/GUIA_MAESTRA_REVISION_BLOQUES_E2_ASISTENTE_PYME.md"
  - "plataforma-pyme/docs/revisiones/E2-1_ENTREGA_PARA_REVISION.md"
  - "cualquier_otra_carpeta_del_repositorio/**"
default: "Si no está en rutas_permitidas_modificar, es de SOLO LECTURA."
```

Estas reglas **preservan E2-0, E1, 03B/03C y otros proyectos**. Si un hallazgo importante está fuera de la allowlist, **informarlo** sin arreglarlo silenciosamente. No es válido hacer un cambio no autorizado "para que pasen los tests".

## 7. Proceso de revisión en Git y Pull Request

### 7.1. Fase A — confirmar acceso y crear rama desde SHA exacto

Verificar acceso real a documentos, código y tests, fijar el commit de **publicación de esta hoja** comunicado por el responsable; no confiar solo en una captura. Trabajar preferiblemente en un **clon aislado**. Si hay archivos no versionados o de otra persona, **no borrarlos**.

```powershell
git clone https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026.git
cd TP-Programacion2-UNSAM-2C2026
git fetch origin
git status --short
$BASE_REVISION = "SHA_COMPLETO_DE_LA_ENTREGA_COMUNICADO_POR_EL_RESPONSABLE"
git show --no-patch --format="%H %s" $BASE_REVISION
git cat-file -e "$($BASE_REVISION):plataforma-pyme/docs/revisiones/E2-1_ENTREGA_PARA_REVISION.md"
git cat-file -e "$($BASE_REVISION):plataforma-pyme/docs/revisiones/GUIA_MAESTRA_REVISION_BLOQUES_E2_ASISTENTE_PYME.md"
git switch -c review/e2-1-identidad-empresas $BASE_REVISION
git rev-parse HEAD
git branch --show-current
```

**Sin permiso para escribir en el repo:** usar fork propio, crear la misma rama desde el mismo SHA y presentar PR desde el fork hacia el `main` original. No compartir credenciales.

### 7.2. Fase B — auditoría de solo lectura, antes de corregir

Formar matriz `RF/RN → CU → HTTP/endpoint → schema/service/repository/model → prueba → doc/03A → estado`. Revisar controles positivos, negativos, RBAC, aislamiento tenant, idempotencia, concurrencia, integridad de transacciones y migraciones.

Clasificar hallazgos como `BUG_CONFIRMADO`, `RIESGO_FUNDAMENTADO`, `DOCUMENTACION_INCONSISTENTE`, `COBERTURA_INSUFICIENTE`, `MEJORA_OPCIONAL` o `DECISION_REQUERIDA`. Cada conclusión sustantiva requiere **archivo, símbolo, evidencia, impacto y contraste con RF/CU**. No inventar archivos o bugs.

### 7.3. Fase C — correcciones mínimas y commits separables

| Prioridad | Definición | Acción prevista |
|---|---|---|
| P0 | Seguridad/integridad crítica o pérdida/exposición de datos | Corregir solo si local y seguro; si excede el alcance, detener ese cambio y consultar |
| P1 | Bug reproducido, regresión o incumplimiento importante | Corrección puntual con test de regresión |
| P2 | Riesgo, cobertura débil, inconsistencia documental | Corregir solo si proporcionado y dentro de la allowlist; si no, informar |
| P3 | Estética, estilo, refactor opcional | Normalmente **no modificar**, solo sugerir |

Un hallazgo usa ID `REV-E2-1-###`; cada cambio `MOD-E2-1-###`. **Preferir un commit por corrección lógica** para que podamos aceptar una y rechazar otra. No mezclar un arreglo pequeño con una reescritura estructural. Conservar todos los contratos y funcionalidades previos. Si no existen fallas justificables, **no inventar cambios**.

### 7.4. Fase D — comprobar tests y regresiones

En una base de **desarrollo propia, aislada y segura**, desde `plataforma-pyme/backend/`:

```powershell
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
$env:RUN_DB_INTEGRATION = "1"
try {
    .\.venv\Scripts\python.exe -m pytest -q
} finally {
    Remove-Item Env:\RUN_DB_INTEGRATION -ErrorAction SilentlyContinue
}
```

Para comprobar Docker, desde `plataforma-pyme/`:

```powershell
docker compose --profile api up -d --build --wait api
docker compose ps
Invoke-RestMethod http://127.0.0.1:18000/ready
```

No hacer cambios en producción. No ejecutar `git clean -fd`, `git reset --hard`, `docker compose down -v`, `alembic stamp`, downgrades destructivos ni operaciones que borren datos. No publicar archivos `.env`, logs con contraseñas ni tokens.

**Estados obligatorios en el informe:**

| Estado | Significado |
|---|---|
| `EJECUTADO_PASS` | El revisor ejecutó y aprobó |
| `EJECUTADO_FAIL` | El revisor ejecutó y detectó fallas |
| `OMITIDO_SIN_ENTORNO` | No pudo ejecutar por falta de PostgreSQL, Docker, servicio u otra dependencia concreta |
| `NO_EJECUTADO` | No se intentó; explicar |
| `CI_PENDIENTE` | Falta resultado de CI del PR |
| `CI_PASS_VERIFICADO` / `CI_FAIL_VERIFICADO` | CI revisado con URL, estado y SHA |
| `REPORTADO_POR_AUTOR` | Evidencia previa del desarrollador, no reproducida por el revisor |
| `NO_APLICA` | Justificar por qué no corresponde |

Los **195 tests de origen** son `REPORTADO_POR_AUTOR` para la IA revisora hasta que los repita. Para cada control anotar **comando, directorio, fecha, SHA, entorno, pasó/falló/omitió, evidencia y limitaciones**.

### 7.5. Fase E — publicar rama y PR, NO fusionar

Revisar el diff (solo lista blanca), ejecutar `git diff --check`, agregar archivos individualmente con `git add ruta_real` (nunca `git add -A` indiscriminado) y realizar commits identificables por hallazgo. Incluir el informe final en la misma rama, subir **solo** `review/e2-1-identidad-empresas` y abrir PR con **base `main`**. Puede ser Draft hasta completar tests/informe.

**Prohibiciones:** no hacer push directo a `main`; no hacer merge del PR; no force-push sobre ramas compartidas; no resolver conflictos sobrescribiendo código nuevo.

### 7.6. Fase F — si `main` cambia mientras se revisa

**Regla mecánica:** no ejecutar `git rebase origin/main` ni `git merge origin/main` automáticamente. Mantener la rama basada en el SHA fijado. Registrar `sha_main_al_abrir_pr` y `sha_main_al_cerrar_revision`; si hay incompatibilidades marcar `CONFLICTO_CON_MAIN` y detallar archivos. **La decisión sobre integración/rebase/cherry-pick corresponde a nosotros** al revisar el PR; no introducir en silencio avances posteriores.

## 8. Checklist técnico de auditoría (NO es licencia para editar)

| Área | Qué verificar | Evidencias |
|---|---|---|
| Registro y passwords | Email normalizado/único, Argon2id, respuestas sin secreto | `auth`, `User`, tests |
| Sesiones | Login, vencimiento/revocación, usuario deshabilitado, bearer hash en DB | `AuthSession`, tests y HTTP |
| Empresa + titular | Alta transaccional, fundador histórico, no empresas huérfanas, único titular activo | `Business`, `Membership`, tests |
| Idempotencia | Reintento igual/diferente, claves por actor, concurrencia, rollback | `business_creation_requests`, test |
| RBAC | Fuente SQL real, rol vigente por tenant, denegación por defecto | `permissions.py`, routers/services, tests |
| PATCH empresa | Solo campos admitidos, 401/403/404/409/422, rollback | DTO, service, tests |
| Invitación | Emisor autorizado, destinatario email, roles limitados, TTL, token hash y duplicados | `BusinessInvitation`, tests |
| Aceptación | Destinatario autenticado, vencimiento/consumo único, reactivación y rollback | `accept`, constraints, tests |
| Equipo | GET limitado, PATCH por titular, target del mismo tenant, titulares protegidos | SQL/DTOs/tests |
| Integridad | Bloqueos, transacciones, PK/UNIQUE/FK/CHECK, Alembic head/deriva | Modelos/migraciones/tests |
| Documentación | 01–05/03A corresponden a API; 03B/03C no se confunden con código ejecutable | Markdown/UML/README |
| CI | Run real para código funcional, jobs del PR, regresiones y evidencias | GitHub Actions y SHA |

## 9. Informe FINAL que el compañero debe crear (segundo Markdown)

**Ruta obligatoria EN SU RAMA y en el mismo PR:**

```text
plataforma-pyme/docs/revisiones/E2-1_INFORME_DE_REVISION.md
```

El informe debe explicar **qué encontró, qué cambió, por qué, qué dejó sin modificar y cómo preservar lo anterior**. Su objetivo es que podamos **aceptar, ajustar, rechazar o diferir cada cambio de manera independiente**, sin necesidad de conocer los intercambios entre su IA y él.

### 9.1. Front matter YAML parseable (rellenar con valores reales)

```yaml
---
bloque: "E2-1"
tipo: "INFORME_DE_REVISION"
commit_base_auditado: "SHA_COMPLETO_DE_PUBLICACION_DE_LA_HOJA"
rama_revision: "review/e2-1-identidad-empresas"
commit_main_al_presentar_pr: null
pr_url: null
estado_recomendado: null # APTO | APTO_CON_OBSERVACIONES | REQUIERE_CORRECCIONES | BLOQUEADO
resumen_hallazgos:
  P0_bloqueantes: null
  P1_altos: null
  P2_medios: null
  P3_bajos: null
hallazgos_corregidos: null
hallazgos_pendientes: null
requiere_decision_humana: null
conflicto_con_main: null
cumplio_lista_blanca: null
pruebas_regresion: null # EJECUTADO_PASS | EJECUTADO_FAIL | OMITIDO_SIN_ENTORNO | NO_EJECUTADO
ci_del_pr: null # CI_PENDIENTE | CI_PASS_VERIFICADO | CI_FAIL_VERIFICADO
---
```

**No inventar:** si aún no hay evidencia, usar `null` y explicar. Antes de entregar, reemplazar todos los marcadores por valores reales o `null` justificados.

### 9.2. Apartados obligatorios del informe

1. Resumen ejecutivo: SHA, estado, hallazgos P0–P3, cambios corregidos y pendientes.
2. Acceso confirmado y archivos efectivamente inspeccionados.
3. Estado inicial del bloque y decisiones deliberadas respetadas.
4. Metodología y matriz RF/RN → CU → endpoint → código → prueba → documento/03A.
5. Hallazgos, con evidencia y prioridad, incluyendo los no corregidos.
6. Modificaciones `MOD-E2-1-###`: commits, archivos, antes/después, riesgo, tests, compatibilidad.
7. Protección de E2-0, frontend E1, esquema anterior, roles, API y `main` posterior.
8. Documentos 01–05, UML 03A y README: cambiados o revisados sin cambios y por qué.
9. Pruebas: resultados reales, omisiones, entorno, CI del PR y URL/SHA.
10. **Matriz de aceptación selectiva**, dependencias entre modificaciones y recomendación del revisor.
11. Backlog residual y funcionalidades diferidas fuera del bloque.
12. Conclusión y declaración de que NO hubo push directo ni merge en `main`.

### 9.3. Ficha por hallazgo y por modificación

```markdown
### REV-E2-1-001 — [Título]
- Prioridad: P0 / P1 / P2 / P3
- Tipo: BUG_CONFIRMADO / RIESGO_FUNDAMENTADO / DOCUMENTACION_INCONSISTENTE /
        COBERTURA_INSUFICIENTE / MEJORA_OPCIONAL / DECISION_REQUERIDA
- Archivo y símbolo / línea: ...
- RF/RN/CU o contrato involucrado: ...
- Evidencia y cómo reproducir: ...
- Comportamiento esperado vs observado: ...
- Impacto: ...
- Estado: CORREGIDO_VALIDADO / CORREGIDO_SIN_VALIDAR / PENDIENTE
- Cambios relacionados: MOD-E2-1-001 / ninguno

### MOD-E2-1-001 — [Corrección]
- Hallazgo: REV-E2-1-001
- Commit(s) del revisor: SHA(s)
- Archivo(s) exactos: ...
- Antes y después: ...
- Beneficio y justificación: ...
- Regresiones y compatibilidad con E2-0/E1/E2-1: ...
- Test y resultado REAL: ...
- Documentos afectados: ...
- ¿Se puede aceptar sin otros cambios?: Sí / No; dependencias
- Recomendación del revisor: ACEPTAR / AJUSTAR / RECHAZAR / DIFERIR
```

### 9.4. Matriz para decidir qué modificaciones adoptamos

**OBLIGATORIA:** una fila por **cada** `MOD`, aunque parezca pequeña.

| MOD | Hallazgo | Commit(s) | Cambio y beneficio | Archivos | Evidencia/Tests | Riesgo/compatibilidad | Independiente | Propuesta del revisor | Decisión de nosotros |
|---|---|---|---|---|---|---|---|---|---|
| `MOD-E2-1-001` | `REV-E2-1-001` | SHA real | Descripción | Rutas | Estado | Riesgo | Sí/No, depende de... | ACEPTAR/AJUSTAR/RECHAZAR/DIFERIR | **PENDIENTE** |

**Ejemplo del objetivo de esta matriz:** si el PR arregla un bug P1 y además incorpora un refactor opcional, necesitamos poder aceptar el arreglo y rechazar el refactor. Preferir commits separados; cuando los cambios sean inseparables, declararlo expresamente.

**Tabla de pruebas requerida:**

| Prueba / comando | Directorio, entorno y fecha | Estado normalizado | Resultado exacto | Evidencia (URL/commit/log) | Limitación |
|---|---|---|---|---|---|
| Pytest PostgreSQL | ... | EJECUTADO_PASS / OMITIDO_SIN_ENTORNO / ... | X passed / failed | ... | ... |
| Alembic | ... | ... | ... | ... | ... |
| Docker | ... | ... | ... | ... | ... |
| CI del PR | GitHub | CI_PASS_VERIFICADO / CI_PENDIENTE / ... | ... | URL y SHA | ... |

## 10. Reglas para la recomendación del revisor

| Condición | Estado de informe |
|---|---|
| 0 P0/P1 pendientes; pruebas relevantes `EJECUTADO_PASS`; CI del PR verificado cuando corresponda; sin regresiones ni cambios fuera de lista blanca | `APTO` |
| 0 P0/P1; solamente P2/P3 no bloqueantes documentados; evidencia y pruebas relevantes satisfactorias | `APTO_CON_OBSERVACIONES` |
| P0/P1 pendientes o pruebas críticas fallidas que requieren reparación | `REQUIERE_CORRECCIONES` |
| Cambios fuera de alcance sin autorización, regresión severa, pérdida de datos, esquema incompatible, conflictos de `main` no resueltos | `BLOQUEADO` |

**Si falta entorno para un test crítico:** `OMITIDO_SIN_ENTORNO` NO equivale a `PASS`. No recomendar `APTO` con base exclusivamente en el CI histórico C.4b o en los 195 casos que corrió otra persona. El informe debe explicar qué faltó probar.

### Descripción breve del Pull Request

El PR resume: SHA exacto de origen, rama, enlace al informe, hallazgos P0–P3, cambios `MOD`, cumplimiento de lista blanca, tests/CI reales, compatibilidad con E2-0/E1, pendientes, decisiones a tomar y confirmación de **NO MERGE**. El informe versionado contiene el detalle completo. Si la revisión no está terminada, abrir **Draft PR**.

## 11. Checklist final de aceptación de la entrega

- [ ] La IA pudo leer realmente el código, los documentos y las migraciones.
- [ ] Fijó y verificó el SHA exacto de publicación de esta hoja.
- [ ] Rama `review/e2-1-identidad-empresas` nacida del SHA indicado, no de un `main` móvil.
- [ ] E2-0, frontend E1, 03B/03C y proyectos ajenos intactos.
- [ ] Archivos editados exclusivamente permitidos o con autorización previa explícita.
- [ ] No modificó migraciones históricas ni debilitó contratos, tenant, permisos o atomicidad.
- [ ] Cada corrección tiene hallazgo, justificación, test y documento si corresponde.
- [ ] No se inventaron pruebas, CI, cobertura, archivos ni evidencias.
- [ ] No se subieron tokens, contraseñas, `.env` ni datos sensibles.
- [ ] Informe con YAML inicial, matriz de trazabilidad y matriz de aceptación selectiva.
- [ ] CI del PR se distingue del CI anterior del commit funcional.
- [ ] Se informaron pruebas no ejecutadas y sus motivos.
- [ ] Si `main` avanzó, se documentaron sus SHAs y conflictos sin rebase/merge autónomo.
- [ ] PR publicado hacia `main` y **NO fusionado**.

## 12. Mensaje final esperado del compañero

El compañero debe enviarnos una síntesis con **(a)** SHA auditado, rama y URL del PR; **(b)** URL al informe en su rama; **(c)** número de hallazgos por severidad, correcciones y pendientes; **(d)** resultados reales y omisiones de pruebas/CI; **(e)** lista de cambios `MOD-E2-1-###` sugeridos para aceptar, ajustar, rechazar o diferir; **(f)** riesgos y decisiones de nuestra parte; **(g)** confirmación de que no hizo push/merge a `main` ni editó bloques anteriores.

**Flujo posterior:** nosotros revisamos el informe y el PR, decidimos **por cada cambio** qué conservar, ajustamos o rechazamos lo que haga falta y **solo después** integramos los cambios autorizados. La revisión no da permiso al compañero para fusionar. Tras cerrar esta segunda revisión podrá comenzar E2-2 — Ubicaciones.

---

**Criterio de éxito:** auditoría útil, reproducible, focalizada, con correcciones mínimas y selectivamente aceptables, **sin perder lo que ya funciona e integra la plataforma**.
