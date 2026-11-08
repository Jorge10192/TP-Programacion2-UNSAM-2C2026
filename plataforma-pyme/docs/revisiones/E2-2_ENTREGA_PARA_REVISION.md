---
tipo_documento: "ENTREGA_PARA_REVISION"
proyecto: "Asistente PyME — Programación 2, UNSAM"
bloque: "E2-2"
nombre: "Ubicaciones empresariales, capacidades, asignaciones y autorización por sede"
version: "1.0"
fecha_corte: "2026-11-08"
repositorio: "Jorge10192/TP-Programacion2-UNSAM-2C2026"
carpeta_exclusiva: "plataforma-pyme/"
rama_origen: "main"
rama_revision: "review/e2-2-ubicaciones"
commit_baseline_previo_e2_2: "51ec1161045ca3458807e60612fb7c6d3f9f2d52"
commit_codigo_final_validado_ci: "3cd7bce71d951218e8c77da58d147e78fb0d426e"
commit_cierre_documental_pre_hoja: "e815be73f4d5ab6ecbd436e9c9587938a62195fc"
base_rama_revision: "SHA_DE_PUBLICACION_DE_ESTA_HOJA_COMUNICADO_POR_EL_RESPONSABLE"
informe_revisor: "plataforma-pyme/docs/revisiones/E2-2_INFORME_DE_REVISION.md"
estado: "CERRADO_PARA_REVISION_INDEPENDIENTE"
merge_por_revisor: false
---

# E2-2 — Entrega formal para auditoría y correcciones controladas

**Destinatario:** compañero revisor y la IA con la que trabaje. Este documento es **la hoja de entrega**, no un informe de auditoría ni una certificación de ausencia de errores. El segundo Markdown, `E2-2_INFORME_DE_REVISION.md`, lo produce el revisor EN SU RAMA, junto con un Pull Request hacia `main`, **sin fusionarlo**.

> **Regla prioritaria:** auditar E2-2 a fondo sin modificar ni reinterpretar el trabajo de E2-0, E2-1, el frontend DEMO u otros bloques. Una corrección local y demostrada es bienvenida; una extensión funcional, refactorización amplia, actualización transversal o modificación fuera de la lista blanca requiere autorización previa. **No se premia tener muchos cambios**. El equipo responsable decidirá por separado qué commits o cambios del PR acepta.

## 1. Referencia exacta, fuentes y alcance temporal

**Repositorio público:** https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026

**Rama de desarrollo:** `main`. **Rama de revisión que deberá crear el compañero:** `review/e2-2-ubicaciones`.

- **SHA de cierre anterior a E2-2:** `51ec1161045ca3458807e60612fb7c6d3f9f2d52` (cierre documental C.5 de E2-1).
- **SHA de código E2-2 D efectivamente verificado por CI:** `3cd7bce71d951218e8c77da58d147e78fb0d426e`.
- **SHA de código + documentación E2-2 antes de emitir esta hoja:** `e815be73f4d5ab6ecbd436e9c9587938a62195fc`.
- **SHA exacto para CREAR la rama de revisión:** **el SHA completo del commit que publica esta misma hoja**, comunicado junto con su enlace por el responsable. No puede autorreferenciarse dentro de su propio contenido: el hash se calcula al publicarla. El revisor DEBE contrastar el SHA informado con GitHub y `git rev-parse HEAD` **antes de analizar o editar**.
- **No partir automáticamente del `main` más reciente** si avanzó después del corte.

**Precedencia y lectura obligatoria:**

1. Esta hoja E2-2, especialmente lista blanca, alcance y SHA de publicación.
2. [Guía maestra de revisión de bloques](GUIA_MAESTRA_REVISION_BLOQUES_E2_ASISTENTE_PYME.md), versión 1.1; sus ejemplos de E2-1 no son permiso para editar identidad.
3. [01 Requerimientos](../../entrega-programacion-2/01_ANALISIS_DE_REQUERIMIENTOS.md), [02 Casos de uso](../../entrega-programacion-2/02_CASOS_DE_USO.md), [03 Dominio/UML](../../entrega-programacion-2/03_MODELO_DE_DOMINIO_Y_UML.md), [04 Arquitectura](../../entrega-programacion-2/04_ARQUITECTURA_Y_PATRONES.md) y [05 Matriz API](../../entrega-programacion-2/05_MATRIZ_API_Y_TRAZABILIDAD.md).
4. [03A fuente PlantUML](../../entrega-programacion-2/diagramas/03A_CLASES_IDENTIDAD_Y_CATALOGO.puml), [guía 03A](../../entrega-programacion-2/diagramas/03A_EXPLICACION_IDENTIDAD_EMPRESAS_CATALOGO.md) y [SVG editorial](../../entrega-programacion-2/diagramas/03A_IDENTIDAD_EMPRESAS_CATALOGO_REDISENADO.svg).
5. [Plan y decisiones E2-2 D](../E2-2_D_PERMISOS_POR_UBICACION_PLAN.md), [README técnico](../../backend/README.md), migraciones, modelos y tests realmente presentes.

**Nota de historia Git:** el diff desde `51ec116` también incluye archivos de entrega y guía de **E2-1** creados posteriormente, e incluso un ajuste acotado a la DEMO para añadir `CASA`. **Que aparezcan en el diff histórico NO los convierte en archivos editables de E2-2.** Solo revisar como contexto.

## 2. Qué se buscó lograr y qué quedó implementado

**Objetivo funcional:** representar una empresa con cero o varias ubicaciones reales (local, feria, depósito, oficina, casa u otro espacio), indicar sus capacidades independientes de venta/almacenamiento, administrar su estado y principal, y habilitar asignaciones seguras de colaboradores por sede sin romper identidad y membresías empresariales.

| Corte | Implementación efectivamente entregada | Prueba local del autor |
|---|---|---|
| **E2-2 A** | Entidad SQLAlchemy `Location`, tabla `locations`, restricciones e índice de principal; migración `e22a_locations` | **212 passed** |
| **E2-2 A.1** | Tipo `CASA` incorporado mediante **nueva** migración `e22b_location_casa`; selector/validaciones de la DEMO también lo reconocen | **217 passed** |
| **E2-2 B** | Crear, listar y obtener detalle de ubicaciones reales, con autenticación, tenant y roles | **277 passed** |
| **E2-2 C** | Editar datos/capacidades, pausar/reactivar y elegir principal de forma transaccional | **325 passed** |
| **E2-2 D** | Asociación `LocationAssignment`, migración `e22d_assignments`, asignación/revocación de trabajadores y política pura de autorización operacional por sede | **371 passed in 47.57s** |

La empresa **nace sin ubicaciones**. No se crean depósitos, existencias, ventas ni permisos por defecto al registrar un negocio.

### 2.1. Tabla y dominio de ubicación

- `locations.id` UUID y `business_id` obligatorio con FK a `businesses.id`; consulta siempre acotada al tenant.
- Tipos **`LOCAL`, `FERIA`, `DEPOSITO`, `OFICINA`, `CASA`, `OTRO`**. No agregar tipos o subcategorías sin autorización.
- `name` de 2 a 80 caracteres, `address` y `map_url` opcionales en la experiencia de usuario (en SQL se guardan como cadenas vacías por defecto).
- `can_sell` y `can_store` son booleanos independientes. Son válidas las cuatro combinaciones, inclusive **ambos falsos** para una sede administrativa.
- Estado `ACTIVA`/`PAUSADA`. `is_primary` opcional: **a lo sumo una principal ACTIVA por empresa**. No es obligatorio que exista una principal.
- La primera ubicación creada se designa principal automáticamente. Pausarla revoca principal en esa transacción; reactivarla NO devuelve la condición automáticamente. Otra ubicación ACTIVA puede elegirse mediante ruta específica.
- CHECK e índice parcial único de PostgreSQL respaldan esas reglas y el servicio usa bloqueos y transacciones.

### 2.2. Tabla y dominio de asignación a sede

- Tabla `location_assignments` con PK compuesta **`(business_id, location_id, user_id)`**.
- FK compuesta `(business_id, location_id)` → `locations(business_id,id)`, con UNIQUE auxiliar en la tabla de ubicaciones; FK compuesta `(business_id,user_id)` → `memberships(business_id,user_id)`. **Ninguna asignación puede cruzar tenants siquiera mediante SQL directo**.
- No se crea una nueva cuenta ni membresía. Una persona pertenece a la empresa mediante `Membership`; la asignación determina en qué sedes puede trabajar como encargado/trabajador.
- Estados `ACTIVA`/`REVOCADA`; `revoked_at` coherente con CHECK. Se preserva la fila al revocar. Reactivar reutiliza la misma relación, sin duplicarla.
- El campo de clave es `user_id`, **no `membership_id`**; la API expone `membership_id` resolviendo la membresía del mismo tenant. Esto es **deliberado** y debe evaluarse con las FK, no cambiarse por estilo.

### 2.3. Operaciones HTTP nuevas del bloque

Prefijo común: `/api/v1/businesses/{business_id}`. Todas requieren bearer válido y revisan sesión, usuario, membresía y empresa.

| Método | Sufijo exacto | Semántica | Éxito |
|---|---|---|---|
| POST | `/locations` | Crear ubicación, primera principal | 201 |
| GET | `/locations` | Listar ubicaciones del tenant | 200 |
| GET | `/locations/{location_id}` | Detalle de ubicación propia | 200 |
| PATCH | `/locations/{location_id}` | Editar solo datos, tipo y capacidades | 200 |
| PATCH | `/locations/{location_id}/status` | `ACTIVA` / `PAUSADA` | 200 |
| PUT | `/locations/{location_id}/primary` | Designar principal ACTIVA | 200 |
| GET | `/locations/{location_id}/assignments` | Listar asignaciones activas y revocadas de una sede | 200 |
| PUT | `/locations/{location_id}/assignments/{membership_id}` | Activar/revocar asignación, JSON `{"status":"ACTIVA"}` o `{"status":"REVOCADA"}` | 200 |

**No hay DELETE físico** de ubicación o asignación.

Contratos de error: sin sesión válida 401; actor sin facultades 403; tenant, recurso o miembro ajeno/inexistente o membresía inactiva 404; empresa suspendida ante escritura, sede/miembro incompatible o sede PAUSADA al designar principal 409; atributos protegidos o cuerpo inválido 422. Verificar códigos **según ruta**, no suponer que todas usan exactamente el mismo conjunto.

### 2.4. Autorización y alcance de la política

| Acción | TITULAR_ADMINISTRATIVO | ADMINISTRADOR | ENCARGADO | TRABAJADOR |
|---|---|---|---|---|
| Leer ubicaciones del tenant | Sí | Sí | Sí | Sí |
| Crear/editar/pausar/reactivar/designar principal | Sí | Sí | No | No |
| Consultar y administrar asignaciones | Sí | Sí | No | No |
| Ser asignado operativamente a sede en el contrato actual | No necesario | No necesario | Sí | Sí |
| Operación futura `SELL`/`STORE` con empresa/miembro/sede activos y capacidad compatible | Sin asignación individual | Sin asignación individual | Requiere asignación ACTIVA | Requiere asignación ACTIVA |

La función `can_operate_at_location` es una **política pura reutilizable**. **No autoriza hoy una venta o recepción existente**: todavía no hay endpoints comerciales que la invoquen. Revisar si sus parámetros y condiciones son coherentes y seguros, sin inventar rutas nuevas.

Empresa `SUSPENDIDA`: se mantiene lectura empresarial y administrativa vigente, sin mutaciones; miembro `INACTIVA`: pierde acceso efectivo. Ubicación `PAUSADA`: no permite operar ni activar asignaciones nuevas; una asignación puede seguir registrada en estado ACTIVA pero resultar **inefectiva** mientras la sede o membresía esté inactiva. La revocación administrativa sí se permite en esos casos con empresa activa.

## 3. Decisiones deliberadas: no corregir sin evidencia y autorización

1. Plataforma **multiempresa/multirrubro**: WALOS es solo un cliente de ejemplo; no se fija un rubro ni una empresa única.
2. `CASA` es tipo legítimo; **no** indica habilitación comercial, inventario ni dirección pública.
3. No se generan sedes automáticamente al crear una empresa, ni registros de stock ficticios.
4. La sede principal es **0..1 ACTIVA** por empresa. Pausar principal puede dejar cero principales; no elegir otra por sorpresa.
5. Estado y principal se gestionan por rutas separadas; PATCH genérico no permite escribir `status`, `is_primary`, `id` ni `business_id`.
6. No hay rol global por sede: se reutilizan roles por Membresía de empresa. Tener una asignación NO concede administración empresarial.
7. Únicamente `ENCARGADO`/`TRABAJADOR` son objetivos del alta operativa de asignaciones; titular y administrador conservan facultad empresarial independiente de una asignación.
8. Se permiten revocaciones de asignaciones de un miembro que fue desactivado o cambió de rol, y de una sede pausada (con empresa activa), para facilitar saneamiento.
9. Asignaciones revocadas permanecen como fila; `revoked_at` da el estado/última revocación, **no un historial completo de todos los cambios**.
10. Enlaces de Maps: se valida estructura HTTPS y dominios admitidos, pero **no se consulta el enlace, no se geocodifica, no se garantiza exactitud geográfica**.
11. El SVG 03A es **editorial y resumido**: la clase `AsignacionUbicacion` con sus multiplicidades está en la fuente PlantUML y guía 03A. No igualar las dos composiciones artificialmente.
12. Las migraciones aplicadas son históricas e **inmutables para esta revisión**. Las nuevas restricciones se agregan de forma aditiva; no reescribir `e22a`, `e22b` ni `e22d`.
13. La lectura de ubicaciones por miembros activos conserva el contrato vigente. El domicilio `CASA` merece evaluación de privacidad antes del despliegue, pero **un cambio de visibilidad sería una decisión de negocio y de contrato**.
14. Al desactivar una membresía o pausar sede, una asignación `ACTIVA` deja de conceder acceso efectivo sin necesidad de borrar el registro. **Reactivar la membresía o sede podría devolver eficacia a la asignación preexistente**; el revisor debe evaluar y reportar este comportamiento, sin alterar unilateralmente la política empresarial.

## 4. Lo que NO se hizo y debe continuar fuera de E2-2

- **E2-3:** catálogo de productos/servicios, variantes, reglas comerciales y precios.
- **E2-4:** proveedores, compras y recepción mercadería, incluidas validaciones de sede por recepción.
- **E2-5:** movimientos, existencias, transferencias y reglas de no permitir desactivar capacidad de almacenamiento con stock real.
- **E2-6:** ventas, pagos declarados, caja, concurrencia comercial y consumo efectivo de `SELL`/`STORE`.
- **E2-7:** integración frontend React/FastAPI, pruebas end-to-end integradas y despliegue.
- Reglas de asignación por turnos/horarios, geolocalización, validación jurídica de domicilios, auditoría histórica completa, notificaciones, borrado definitivo, QR de cobro Mercado Pago y cuentas financieras.
- Cambios en titularidad, sesiones, registro, invitaciones, membresías o perfiles E2-1; estos pertenecen al bloque **anterior** y quedan fuera de la revisión.
- Producción pública, endurecimiento de seguridad, administración de secretos y pruebas de carga: NO se infieren de un CI verde.

**Nota:** «fuera de E2-2» no significa «innecesario». Registrar riesgos y dependencias con su bloque, sin implementarlos de forma oportunista durante esta auditoría.

## 5. Migraciones, modelos, archivos y pruebas que deben revisarse

**Migraciones:**

- `backend/alembic/versions/20261108_0008_business_locations.py` → `e22a_locations`: tabla y restricciones iniciales.
- `backend/alembic/versions/20261108_0009_location_casa.py` → `e22b_location_casa`: amplía tipo `CASA` sin reescribir la anterior.
- `backend/alembic/versions/20261108_0010_location_assignments.py` → `e22d_assignments`: asociación y FKs compuestas; UNIQUE auxiliar en `locations`.

**Código del bloque:** `backend/app/infrastructure/models/location.py` y `location_assignment.py`; `backend/app/modules/locations/` (routers, service, repository, schemas, permissions y variantes `assignment_*`); registro de modelos en `backend/app/infrastructure/models/__init__.py` y registro de routers en `backend/app/api/v1/router.py`.

**Tests entregados:** `backend/tests/test_location_model.py`, `test_location_integration.py`, `test_location_schemas.py`, `test_location_http.py`, `test_location_api_integration.py`, `test_location_assignment_model.py`, `test_location_assignment_schemas.py`, `test_location_assignment_http.py` y `test_location_assignment_integration.py`. `test_postgres_integration.py` comprueba la revisión Alembic global.

**Revisar explícitamente:** esquema SQL, FK compuestas tenant-safe, rollback y savepoints, idempotencia, autorización con sesiones revocadas, roles cambiantes, aceptación/denegación de datos protegidos, carrera en elección de principal, estados suspendidos, revocación/reactivación, y coherencia del SVG/PUML 03A. **La presencia de un test no prueba por sí sola que cubre todas las carreras posibles**.

## 6. LISTA BLANCA de modificaciones (norma vinculante)

El permiso para modificar una ruta requiere además un **hallazgo demostrado y una corrección justificada**. Las rutas listadas no son una invitación a reescribir archivos.

~~~yaml
rutas_permitidas_modificar:
  - "plataforma-pyme/backend/app/modules/locations/**"
  - "plataforma-pyme/backend/app/infrastructure/models/location.py"
  - "plataforma-pyme/backend/app/infrastructure/models/location_assignment.py"
  - "plataforma-pyme/backend/tests/test_location*.py"
  - "plataforma-pyme/docs/revisiones/E2-2_INFORME_DE_REVISION.md"
  - "plataforma-pyme/docs/E2-2_D_PERMISOS_POR_UBICACION_PLAN.md"
  - "plataforma-pyme/backend/README.md" # Solo secciones E2-2
  - "plataforma-pyme/entrega-programacion-2/01_ANALISIS_DE_REQUERIMIENTOS.md" # Solo RF-03/E2-2
  - "plataforma-pyme/entrega-programacion-2/02_CASOS_DE_USO.md" # Solo CU-04/E2-2
  - "plataforma-pyme/entrega-programacion-2/03_MODELO_DE_DOMINIO_Y_UML.md" # Solo Ubicaciones/E2-2
  - "plataforma-pyme/entrega-programacion-2/04_ARQUITECTURA_Y_PATRONES.md" # Solo E2-2
  - "plataforma-pyme/entrega-programacion-2/05_MATRIZ_API_Y_TRAZABILIDAD.md" # Solo E2-2
  - "plataforma-pyme/entrega-programacion-2/README.md" # Índice/estado E2-2
  - "plataforma-pyme/entrega-programacion-2/diagramas/03A_CLASES_IDENTIDAD_Y_CATALOGO.puml" # Solo modelo E2-2
  - "plataforma-pyme/entrega-programacion-2/diagramas/03A_EXPLICACION_IDENTIDAD_EMPRESAS_CATALOGO.md" # Solo E2-2
  - "plataforma-pyme/entrega-programacion-2/diagramas/03A_IDENTIDAD_EMPRESAS_CATALOGO_REDISENADO.svg" # Solo corrección editorial E2-2
  - "plataforma-pyme/entrega-programacion-2/diagramas/README.md" # Solo entrada de 03A E2-2

rutas_excepcionales_solo_con_aprobacion_previa:
  - "plataforma-pyme/backend/alembic/versions/**" # Jamás editar migraciones 0008/0009/0010 aplicadas. Solo NUEVA migración aditiva autorizada.
  - "plataforma-pyme/backend/app/infrastructure/models/__init__.py" # Registro de modelos E2-2, solo si indispensable.
  - "plataforma-pyme/backend/app/api/v1/router.py" # Registro de routers E2-2, no modificar endpoints ajenos.
  - "plataforma-pyme/backend/tests/test_postgres_integration.py" # Solo ajuste de head Alembic si hay migración autorizada.
  - "plataforma-pyme/frontend/src/data/demo/demoStore.ts" # CASA ya incorporado; no refactorizar DEMO.
  - "plataforma-pyme/docs/10_E1_B3_UBICACIONES_DEMO.md" # Solo si se detecta error factual E2-2.
rutas_prohibidas_o_solo_lectura:
  - "plataforma-pyme/backend/app/modules/auth/**"
  - "plataforma-pyme/backend/app/modules/businesses/**"
  - "plataforma-pyme/backend/app/infrastructure/models/user.py"
  - "plataforma-pyme/backend/app/infrastructure/models/membership.py"
  - "plataforma-pyme/backend/app/infrastructure/models/business.py"
  - "plataforma-pyme/backend/app/infrastructure/db.py"
  - "plataforma-pyme/backend/app/infrastructure/config.py"
  - "plataforma-pyme/backend/app/main.py"
  - "plataforma-pyme/backend/alembic/env.py"
  - "plataforma-pyme/backend/alembic/versions/20261108_0008_business_locations.py"
  - "plataforma-pyme/backend/alembic/versions/20261108_0009_location_casa.py"
  - "plataforma-pyme/backend/alembic/versions/20261108_0010_location_assignments.py"
  - "plataforma-pyme/compose.yaml"
  - ".github/workflows/**"
  - "plataforma-pyme/entrega-programacion-2/diagramas/03B*"
  - "plataforma-pyme/entrega-programacion-2/diagramas/03C*"
  - "plataforma-pyme/docs/revisiones/E2-1_*"
  - "plataforma-pyme/docs/revisiones/GUIA_MAESTRA_REVISION_BLOQUES_E2_ASISTENTE_PYME.md"
  - "plataforma-pyme/docs/revisiones/E2-2_ENTREGA_PARA_REVISION.md"
  - "plataforma-pyme/entrega-programacion-2/REVISION_INDEPENDIENTE_E2-1.md"
  - "cualquier_otra_ruta_no_autorizada/**"
regla_por_defecto: "Si no está expresamente permitida, es SOLO LECTURA."
~~~

**No evadir la lista blanca** creando un archivo nuevo fuera de esas rutas, copiando otro módulo o cambiando configuración global para que una prueba pase. Si surge una corrección excepcional, **describir el hallazgo, el diff previsto, riesgos y tests; solicitar aprobación antes de editarla**. Una vulnerabilidad fuera de alcance se eleva como hallazgo prioritario; no se oculta.

## 7. Evidencia recibida: base de partida, NO resultado del revisor

| Control | Evidencia del autor / CI | Estado para el revisor |
|---|---|---|
| PostgreSQL / Alembic | `e22d_assignments (head)`; `No new upgrade operations detected.` | `REPORTADO_POR_AUTOR` hasta reproducir |
| Pytest local Windows | **371 passed in 47.57s** | `REPORTADO_POR_AUTOR` |
| Docker | `asistente-pyme-e2-api-1` y `db-1` saludables | `REPORTADO_POR_AUTOR` |
| Readiness | `GET http://127.0.0.1:18000/ready` → `ready / ok` | `REPORTADO_POR_AUTOR` |
| CI Python 3.12 | **371 passed**, migración sin deriva | [CI E2-2 D](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42497556047), `CI_PASS_VERIFICADO` en SHA `3cd7bce...` |
| CI Python 3.14 | **371 passed**, migración sin deriva | Mismo run y SHA; `CI_PASS_VERIFICADO` |
| CI Docker | Trabajo «Construir imagen y comprobar liveness» aprobado | Mismo run y SHA; `CI_PASS_VERIFICADO` |

La validación local fue reportada por el autor; **el revisor no debe declararla ejecutada personalmente**. El commit posterior de documentación no es una ejecución nueva de CI.

## 8. Protocolo de Git: rama fija, cambios separables y PR sin merge

### Fase A. Confirmar acceso y crear rama

- Confirmar acceso real a la carpeta `plataforma-pyme/` y a los documentos 01–05 y diagramas; si falta algún archivo, detener solo el análisis afectado e indicarlo. No inventar lecturas.
- Usar preferentemente **otro clon limpio** o un worktree aislado. No borrar archivos personales, cambios de terceros o archivos sin seguimiento.
- Obtener **el SHA exacto de PUBLICACIÓN de esta hoja del mensaje de entrega**. Verificar su commit y que el archivo `E2-2_ENTREGA_PARA_REVISION.md` existe en él.

~~~powershell
git clone https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026.git
cd TP-Programacion2-UNSAM-2C2026
git fetch origin
git status --short

# Reemplazar con el SHA COMPLETO indicado por el responsable.
$SHA_CORTE = "SHA_DE_PUBLICACION_RECIBIDO"
git show --no-patch --format="%H %s" $SHA_CORTE
git cat-file -e "$SHA_CORTE^{commit}"

git switch -c review/e2-2-ubicaciones $SHA_CORTE
git branch --show-current
git rev-parse HEAD
~~~

Si la rama ya existe, **no sobrescribirla** ni ejecutar `reset --hard`: coordinar. Nunca crear la rama desde un `main` movido sin verificar el SHA exacto.

### Fase B. Auditar antes de editar

1. Leer la hoja, guía maestra, 01–05, 03A y código real. Crear matriz RF-03/CU-04 → rutas → servicios → repositorios/modelos → migraciones → tests → documentos.
2. Ver diff desde `51ec1161045ca3458807e60612fb7c6d3f9f2d52` hasta el SHA de corte; **filtrar por archivos de E2-2** y excluir entregas E2-1. Distinguir código nuevo de compatibilidad transversal.
3. Registrar potenciales defectos con evidencia (archivo + línea, SQL/HTTP/test reproducible y riesgo). Priorizar **P0/P1/P2/P3**. Antes de editar, decidir qué correcciones son realmente necesarias.
4. Comprobar decisiones conscientes de la sección 3. Una discrepancia en documento histórico debe etiquetarse como histórica, no «corregirse» reescribiendo E2-1.
5. Evaluar especialmente **revocación + reactivación** de membresía/sede, privacidad de `CASA`, transacciones y concurrencia, FKs tenant-safe, altas duplicadas y autorización en cada punto.

### Fase C. Corregir solo lo justificado

- Editar únicamente allowlist; preservar contratos E2-1, DEMO, DB y API anteriores. **Un hallazgo = un cambio lógico y preferentemente un commit**, con ID `REV-E2-2-###` y `MOD-E2-2-###`.
- Cada corrección de código debe aportar test de regresión que **falle antes y pase después**, cuando sea reproducible. Documentar explícitamente las excepciones.
- Evitar cambios cosméticos o refactors no necesarios. No «normalizar» otros módulos o tocar 03B/03C.
- Para una migración nueva o un archivo transversal, solicitar permiso previo y explicar compatibilidad, datos, rollback y dependencias; no borrar ni recrear DB como remedio.

### Fase D. Probar en entorno propio seguro

**Desde `plataforma-pyme/backend/` en una DB de desarrollo conocida y aislada** (adaptar el intérprete a su propio entorno, sin asumir el del autor):

~~~powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check

$env:RUN_DB_INTEGRATION = "1"
try {
    .\.venv\Scripts\python.exe -m pytest -q
} finally {
    Remove-Item Env:\RUN_DB_INTEGRATION -ErrorAction SilentlyContinue
}
~~~

`alembic upgrade head` **solo sobre base segura**; si no existe el entorno o falla la conexión, registrar `OMITIDO_SIN_ENTORNO`, no `EJECUTADO_PASS`. No usar `stamp`, `downgrade` destructivo, `docker compose down -v`, limpieza SQL ni `git reset --hard`.

**Desde `plataforma-pyme/`:**

~~~powershell
docker compose --profile api up -d --build --wait api
docker compose ps
Invoke-RestMethod http://127.0.0.1:18000/ready
~~~

Revisar el CI del **PR del revisor**, asociado al SHA del PR, no únicamente el CI histórico de `3cd7bce`.

**Estados permitidos por prueba:** `EJECUTADO_PASS`, `EJECUTADO_FAIL`, `OMITIDO_SIN_ENTORNO`, `NO_EJECUTADO`, `CI_PENDIENTE`; para CI verificado indicar `CI_PASS_VERIFICADO` o `CI_FAIL_VERIFICADO`. Cada estado debe incluir comando, entorno, SHA, evidencia y límite.

### Fase E. Publicar y NO integrar

~~~powershell
git status --short
git diff --check
git diff --stat

# Agregar EXPLÍCITAMENTE los archivos reales permitidos.
# Ejemplo del informe, obligatorio aunque no haya cambios en el código:
git add plataforma-pyme/docs/revisiones/E2-2_INFORME_DE_REVISION.md
git commit -m "docs(review): informe E2-2 con evidencias y decisiones"
git push -u origin review/e2-2-ubicaciones
~~~

El ejemplo asume un informe creado y, en caso de otros cambios, que hayan sido agregados/confirmados de forma controlada en commits previos. **No usar `git add -A` indiscriminado** ni forzar el push. Abrir PR **base `main` ← head `review/e2-2-ubicaciones`**, preferiblemente Draft hasta completar toda la auditoría. **El revisor NO fusiona su PR**. El responsable evaluará la integración selectiva.

**Si `main` avanza durante la revisión:** prohibido hacer `git rebase origin/main` o `git merge origin/main` sin autorización. Mantener el SHA congelado, registrar SHA actual de `main` y diferencias/conflictos. Si hay colisión, marcar `CONFLICTO_CON_MAIN` en el informe. La resolución, cherry-pick o merge selectivo corresponderá al responsable.

## 9. Segundo entregable: INFORME exhaustivo del compañero

Nombre fijo: **`plataforma-pyme/docs/revisiones/E2-2_INFORME_DE_REVISION.md`**, versionado **en la misma rama y PR**. Completarlo con evidencia propia, no copiarlo como si los resultados del autor fueran suyos. El informe tendrá encabezado YAML parseable:

~~~yaml
---
tipo_documento: "INFORME_DE_REVISION"
bloque: "E2-2"
rama: "review/e2-2-ubicaciones"
sha_base_recibido: null
sha_final_rama: null
sha_main_al_abrir_pr: null
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
~~~

**Secciones obligatorias en prosa:**

1. Resumen ejecutivo y recomendación, cantidades P0–P3 y limitaciones.
2. Confirmación de acceso: archivos realmente inspeccionados y SHA exactos.
3. Estado inicial: tabla RF-03/CU-04, operaciones HTTP, modelos y migraciones, decisiones de diseño respetadas.
4. Metodología: revisión de permisos, SQL, API, concurrency/idempotencia y documentos (con comprobaciones realizadas).
5. Hallazgos `REV-E2-2-###`: evidencia exacta, prioridad, impacto, comportamiento actual/esperado, reproducción, corrección o motivo de no corregir.
6. Modificaciones `MOD-E2-2-###`: commit(s) individuales, archivo/líneas, antes/después, compatibilidad, test nuevo, riesgo y dependencia de otra modificación.
7. Hallazgos **no corregidos** por fuera de alcance, falta de información, decisión de negocio o riesgo de regresión. Explicar por qué.
8. Compatibilidad con E2-0/E2-1, migraciones existentes, DEMO, datos y `main` posterior.
9. Coherencia con Documentos 01–05, UML 03A PUML/guía/SVG (sin cambiar 03B/03C).
10. Tabla de pruebas con comando, entorno, fecha, SHA, estado normalizado, resultado literal y fuente. Distinguir pruebas propias de CI histórico y CI del PR.
11. **Matriz de decisiones selectivas** del punto siguiente, para decidir qué tomar y qué descartar.
12. Archivos/commits cambiados, verificación de lista blanca, dependencias entre commits, backlog residual.
13. Dictamen final y URL de PR; declaración explícita de que **NO realizó merge**.

### 9.1. Matriz OBLIGATORIA para aceptar cambios por separado

| ID cambio | Hallazgo que atiende | Commit SHA | Archivos | Prioridad | Cambio funcional concreto | Prueba propia y CI | Compatibilidad / regresión | Depende de otro cambio | Sugerencia revisor | Decisión del equipo |
|---|---|---|---|---|---|---|---|---|---|---|
| MOD-E2-2-001 | REV-E2-2-001 | SHA real | rutas reales | P1/P2/... | antes/después | evidencia | impacto | sí/no, IDs | **ACEPTAR / RECHAZAR / AJUSTAR / DIFERIR** | **PENDIENTE** |

La columna `Decisión del equipo` debe permanecer **PENDIENTE** hasta nuestra reunión. La sugerencia del revisor **no es autorización para fusionar**. Si una corrección requiere dos commits, explicitar la dependencia y el orden de aplicación.

**Ejemplo de separación deseada:** un bug P1 demostrado con test en un commit y una mejora estética P3 en otro; podemos aceptar el primero y descartar la segunda. Si el revisor mezcla ambos en un único commit, deberá facilitar un diff separable o explicar por qué no se puede.

### 9.2. Taxonomía de prioridad y resultado

| Situación | Estado recomendado |
|---|---|
| Cero P0/P1 pendientes, pruebas relevantes propias satisfactorias, CI del PR verificado cuando aplique, sin violación de alcance ni regresiones | `APTO` |
| Cero P0/P1, solo P2/P3 documentados y pruebas relevantes satisfactorias | `APTO_CON_OBSERVACIONES` |
| P0/P1 pendientes o pruebas críticas fallidas | `REQUIERE_CORRECCIONES` |
| Ediciones no autorizadas, ruptura grave de contratos, pérdida de datos, migración incompatible o conflictos no resueltos | `BLOQUEADO` |

Sin entorno para pruebas críticas, no llamar `PASS` a la prueba omitida. La ausencia de hallazgos no habilita afirmar perfección; el informe debe explicar evidencia y límites.

## 10. Lista de comprobación técnica del revisor

- [ ] SHA fijo y acceso real; revisión contra código y documentación del mismo corte.
- [ ] Ningún cambio en E2-0/E2-1, frontend DEMO ni 03B/03C.
- [ ] Registro multiempresa y sede cero inicial; tipo `CASA` y 4 combinaciones de `can_sell`/`can_store`.
- [ ] Unicidad de principal ACTIVA por empresa, transacción y ausencia de elección automática al reactivar.
- [ ] Consultas por tenant incluso al conocer UUID ajeno; 401/403/404/409/422 por escenario.
- [ ] Asignación solo de miembro válido del mismo tenant; FKs compuestas y PK triple.
- [ ] Revocar/reactivar, idempotencia y coherencia `revoked_at` sin borrar filas.
- [ ] La inactivación de empresa/membresía/sede anula acceso efectivo; evaluar reactivaciones.
- [ ] Política `SELL`/`STORE` no permite capacidad incompatible ni asignación revocada; no confundir con ejecución comercial.
- [ ] Seguridad y privacidad de `CASA` y validación de `map_url` evaluadas sin introducir cambios de producto no autorizados.
- [ ] Pruebas PostgreSQL verdaderas, rollback, condiciones concurrentes y potenciales conflictos SQL.
- [ ] Documentos 01–05, 03A PlantUML y SVG coherentes, con diferencias editoriales deliberadas.
- [ ] Solo archivos de lista blanca; cambios excepcionales solicitados antes de aplicar.
- [ ] Informe completo, matriz selectiva, CI del PR, `main` posterior y PR **sin merge**.

## 11. Cierre del trabajo solicitado

El compañero entregará **dos cosas**: **(a)** un Pull Request de `review/e2-2-ubicaciones` a `main`, sin fusionar, con solo correcciones locales justificadas; **(b)** el informe completo `E2-2_INFORME_DE_REVISION.md` versionado dentro de ese PR, aunque no haya cambiado ningún archivo de código.

Nuestro equipo revisará **hallazgo por hallazgo y commit por commit**, decidirá qué incorporar y, si `main` avanzó, resolverá compatibilidad antes de cualquier integración. La auditoría de E2-2 no autoriza a avanzar ni a modificar otros bloques. **E2-3 Catálogo se planifica por separado después de cerrar la entrega y el mecanismo de revisión.**
