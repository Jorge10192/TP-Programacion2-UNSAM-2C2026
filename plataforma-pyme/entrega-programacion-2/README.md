# Documentación de entrega — Programación 2

**Proyecto:** Asistente PyME — Plataforma generalista de gestión para múltiples empresas y rubros.  
**Ubicación prevista en el repositorio:** `plataforma-pyme/entrega-programacion-2/`.  
**Estado vigente (08/11/2026):** E2-2 cerrado y entregado a auditoría independiente. E2-3 A de Catálogo validado en Windows (407 pruebas); **E2-3 B implementó cuatro rutas y aprobó 498 pruebas CI; pendiente Windows**. React continúa DEMO. Documentos: 01 v1.4, 02 v1.5, 03 v1.5, 04 v1.6, 05 v1.2. No se modificaron UML 03B/03C.

> **Estado vigente E2-2 (08/11/2026):** E2-2 A/A.1/B/C/D implementado y validado: **371 pruebas Windows aprobadas en 47.57s**, Alembic `e22d_assignments (head)` sin deriva, API y PostgreSQL en Docker `healthy`, `/ready` = `ready/ok`. [CI del código E2-2 D: 3/3 aprobado](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42497556047), 371 pruebas Python 3.12/3.14 y Docker. **La política por sede aún no se aplica a inventario/compras/ventas**, que son bloques futuros; frontend React permanece DEMO. Los estados parciales descritos en notas de A/B/C constituyen histórico.


## Propósito

Reunir los documentos académicos y el material de exposición correspondientes al proyecto de Programación 2. El contenido debe reflejar la implementación demostrable y diferenciarla de la arquitectura de backend aún planificada.

Se toma como referencia la consigna oficial **«Desarrollo de una API RESTful»**: al menos cinco requerimientos funcionales de alto nivel cubiertos por endpoints, documentación y casos de uso, FastAPI, registro/autenticación segura, SQLAlchemy, Docker, testing, deploy, un patrón de diseño útil, al menos diez pruebas unitarias, GitHub Actions y una presentación con al menos un diagrama UML y explicación de patrones.

## Índice y orden de trabajo

| Documento | Propósito | Estado |
|---|---|---|
| `01_ANALISIS_DE_REQUERIMIENTOS.md` | Problema, objetivos, actores, alcance RF/RNF, reglas, criterios de aceptación y prioridad del backend | **BORRADOR funcional v1.2 — E2-2 D** |
| `02_CASOS_DE_USO.md` | 12 casos de uso del backend propuesto, flujos, errores, idempotencia, concurrencia y trazabilidad | **REVISADO v1.3 — CU-04 con asignaciones** |
| [`03_MODELO_DE_DOMINIO_Y_UML.md`](03_MODELO_DE_DOMINIO_Y_UML.md) | Entidades, reglas, cardinalidades, estados, transacciones y tres diagramas UML | **PUBLICADO v1.3 — modelo LocationAssignment** |
| [`04_ARQUITECTURA_Y_PATRONES.md`](04_ARQUITECTURA_Y_PATRONES.md) | Arquitectura AS-IS/TO-BE, patrón Repository, Adapter y patrones del libro (Factory, Decorator, Observer) | **PUBLICADO v1.4 — arquitectura E2-2 D** |
| [`05_MATRIZ_API_Y_TRAZABILIDAD.md`](05_MATRIZ_API_Y_TRAZABILIDAD.md) | RF → CU → endpoints reales → pruebas/roles/evidencia/pendientes | **PUBLICADO v1.0 — matriz E2-2 D** |
| `06_PRUEBAS_Y_DESPLIEGUE.md` | Estrategia de pruebas, GitHub Actions, Docker, despliegue y evidencias | Pendiente |
| [`diagramas/`](diagramas/) | SVG vectoriales aprobados, fuentes PlantUML editables y tres guías detalladas | **03A / 03B / 03C publicados** |
| `presentacion/` | Diapositivas de defensa final | A crear |

> La consigna exige **al menos un UML**, no exactamente dos. Se planifica un diagrama de casos de uso y uno de clases para mejorar la exposición, sujetos a aprobación del equipo.

## Convenciones

1. **AS-IS / Implementado DEMO:** evidencia disponible en el frontend React, con persistencia local y sin seguridad de servidor.
2. **AS-IMPLEMENTED / Backend comprobado:** FastAPI, PostgreSQL, SQLAlchemy, Docker, auth y empresas; contrastar rutas y pruebas con 05. **TO-BE / Pendiente:** autorización granular por ubicación, reglas de stock al cambiar capacidades, catálogo, compras, stock, ventas e integración React. **RF-03 ya dispone de POST/GET/PATCH/PUT de ubicaciones en E2-2 B/C.** **Invitaciones y equipo básico ya están implementados en la API E2-1.**
3. **Diferido:** fuera del alcance del MVP; por ejemplo, pagos reales de Mercado Pago, QR parcial real, conciliación bancaria y automatizaciones no comprometidas.
4. Requerimientos identificados como `RF-xx`, no funcionales como `RNF-xx` y reglas de negocio como `RN-xx`. Conservan sus identificadores entre documentos. La etiqueta **NÚCLEO MVP**, **SOPORTE MVP** o **POST-MVP** expresa el alcance propuesto del backend, no una funcionalidad implementada.
5. Cada documento pasa por `BORRADOR` → `APROBADO` → `ACTUALIZADO PARA ENTREGA`, registrando versión/fecha. La aprobación corresponde al equipo. **No se debe marcar un backend como implementado ni una prueba como aprobada sin evidencia.**
6. **WALOS es una empresa de ejemplo**, no define el público objetivo ni limita los rubros de la plataforma.
7. Documentar únicamente hechos verificables; no confundir pruebas de frontend con pruebas de API real.

## Documentación interna complementaria

Los documentos en `../docs/` incluyen decisiones de integración E0–E1, ADR y pruebas. Son fuentes de consulta, **no equivalentes automáticamente a la entrega final**: algunos representan propuestas históricas que deben contrastarse con el código actual.

El README técnico de instalación y comandos se mantiene en `../frontend/README.md` y, cuando exista, en `../backend/README.md` o el README raíz correspondiente. Este índice académico no los sustituye.

## Uso

Se aprueba un documento por vez antes de incorporarlo a `main`. No subir capturas o datos sensibles de empresas reales. En las próximas etapas, completar la matriz de evidencia con rutas reales, resultados de tests y enlaces al despliegue.

**Alcance para la primera API:** la selección de requerimientos de núcleo y soporte del Documento 01 es una propuesta sometida a aprobación, no un compromiso de implementar todas las pantallas de la DEMO en FastAPI. La presentación debe distinguir un diagrama UML de clases (estructura) y uno de casos de uso (interacciones). Los diagramas se guardarán junto con sus fuentes editables en `diagramas/`, y la exposición en `presentacion/`.

## Cómo utilizar los diagramas del Documento 03

- **[03A — Identidad, empresas y catálogo](diagramas/03A_EXPLICACION_IDENTIDAD_EMPRESAS_CATALOGO.md):** identidad global, membresías por empresa, fundador, invitaciones, recursos y cardinalidades.
- **[03B — Compras, recepción, inventario y ventas](diagramas/03B_EXPLICACION_COMPRAS_INVENTARIO_VENTAS.md):** compra sin stock, recepción única, ventas y pagos declarados, snapshots, saldos, movimientos, concurrencia e idempotencia.
- **[03C — Casos de uso de la primera API](diagramas/03C_EXPLICACION_CASOS_DE_USO.md):** actores, CU-01 a CU-12, flujos ejemplificativos y trazabilidad a requerimientos.

Cada explicación enlaza la **lámina SVG vectorial** (visualización de presentación) y el archivo **PlantUML** (fuente UML editable). Las láminas muestran el diseño conceptual TO-BE, no la implementación ya existente de FastAPI. Para la defensa, usar los SVG; para mantener o revisar asociaciones y cardinalidades, consultar el PUML y el Documento 03.

## Política de actualización por incrementos E2

**Regla operativa:** ninguna entrega mayor se considera cerrada solo por compilar. La misma entrega debe enlazar código, contratos HTTP, pruebas, versión Alembic si corresponde y documentos académicos. En cada corte se revisa 05 y `../backend/README.md`; 01/02 cambian al concretar RF/CU, 03 y el UML 03A al modificar entidades/reglas/cardinalidades, y 04 al modificar arquitectura/seguridad/patrones. El 03B no se regenera por cambios de identidad o autorización.

**Secuencia verificada:** C.1 RBAC (98) → C.2 edición empresarial (125) → C.3 emisión (147) → C.4a aceptación (171) → C.4b equipo (195), todos validados localmente. **C.5:** documentación y 03A. **Próximo orden:** preparar por separado la revisión de E2-1 para el compañero y, después, RF-03 Ubicaciones.

### Estado de E2-1.3C.2 (corte del 8/11/2026)

Se publicó `PATCH /api/v1/businesses/{business_id}` con validaciones de datos y autorización por rol real vinculada a la sesión y la empresa. La nueva ruta implementa una parte de RF-02/CU-03. **La ejecución local/CI se validó posteriormente en C.2 (125 pruebas)**; C.1 sí terminó con 98 pruebas aprobadas. No se alteró el modelo de dominio ni se regeneraron 03A/03B. Las invitaciones siguen en el bloque E2-1 (C.3/C.4); no generar todavía la hoja formal para revisión del compañero, porque el bloque funcional no terminó.

### Estado C.3, corte del 8/11/2026

Emisión segura de invitaciones `POST /api/v1/businesses/{business_id}/invitations` implementada y probada en CI. Existe nueva migración `e213c3_invitations`; la invitación no crea membresía, el token se entrega una sola vez y se persiste únicamente su hash. Aceptación y administración de miembros siguen pendientes. La validación local del corte C.3 se completó posteriormente (147 pruebas); el texto anterior es histórico. La hoja formal de auditoría para el compañero se prepara solo al cerrar **E2-1** completo, no por cada subpaso.

### C.4a — Aceptación de invitaciones, 8/11/2026

Se implementó `POST /api/v1/invitations/accept`: el destinatario autenticado consume la invitación con el token de C.3, crea o reactiva una sola Membresía y confirma estado ACEPTADA + traza de usuario/fecha en una sola transacción. Migración `e213c4_acceptance`. CI aprobado en Python 3.12/3.14/PostgreSQL y Docker, **validación local posteriormente aprobada (171 pruebas)**. C.4b luego se completó con 195 pruebas; C.5 sincronizó 03A. No generar todavía la entrega de auditoría por bloque E2-1; se confeccionará al cerrar todos sus pasos.

### C.4b — Control del equipo y titularidad protegida

Sin migración nueva, se agregaron `GET /api/v1/businesses/{business_id}/memberships` (solo titular/administrador) y `PATCH /api/v1/businesses/{business_id}/memberships/{membership_id}` (solo titular) para administrar roles operativos y estado. La fuente de permisos es la membresía SQL del tenant. CI aprobó PostgreSQL/Pytest y Docker; **validación local aprobada (195 pruebas)**. La titularidad no puede transferirse ni revocarse por esta operación. Cierre E2-1/03A y hoja de auditoría para el compañero siguen para C.5.

### C.5 — Sincronización documental completa (08/11/2026)

El cierre funcional E2-1 tiene `195 passed in 23.86s`, Alembic `e213c4_acceptance (head)` sin deriva, Docker API/DB `healthy` y `/ready` `ready`/`ok`; el código C.4b `8cd1674` aprobó 3/3 CI. Se conciliaron documentos 01–05, README técnico, y el UML 03A (fuente PlantUML, SVG editorial y guía). 03B/03C y el código no se alteran. Este cierre **no presupone una nueva ejecución de pruebas sobre el commit documental**. El informe de revisión para el compañero será el siguiente trabajo separado; recién después comenzará RF-03.

### E2-2 A — Primer incremento de Ubicaciones (RF-03)

**E2-2 A — persistencia de Ubicaciones (08/11/2026):** se publicó `Location`/`locations` con FK obligatoria `business_id → businesses.id` (`RESTRICT`), seis tipos, `can_sell`/`can_store` independientes, campos de referencia opcionales, `ACTIVA/PAUSADA`, `is_primary`, índice parcial que permite como máximo una principal activa por tenant y CHECK que impide principal pausada. Migración aditiva `20261108_0008_business_locations.py` (`e22a_locations`, descendiente de `e213c4_acceptance`). La empresa continúa iniciándose **sin ubicaciones**. **No hay todavía rutas HTTP de ubicaciones**, ni inventario/compra/venta conectado, ni permisos de ubicación; esos cambios pertenecen a E2-2 B/C y bloques siguientes. El CI del código del corte se verificó en `300fa6f` (GitHub Actions [run 42491816481](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42491816481)): resultado `success`. La validación local Windows del nuevo corte aún se requiere; los 195 tests anteriores correspondían a E2-1.

La revisión E2-1 sigue anclada en el commit de entrega fijado; el nuevo trabajo no modifica su rama. El próximo paso E2-2 B añadirá la API real y su autorización por empresa, manteniendo las mismas reglas `Location` y sin alterar E1 React.


### E2-2 A.1 — CASA y nuevo head (08/11/2026)

`CASA` se añade a los tipos admitidos; las capacidades `can_sell`/`can_store` continúan independientes. Migración aditiva `e22b_location_casa` tras `e22a_locations`, sin cambios a datos anteriores, y reversión protegida cuando existen ubicaciones CASA. **CI backend** ([run](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42492475011)): **217 pruebas aprobadas, Python 3.12/3.14, Alembic `e22b_location_casa (head)` sin deriva, Docker 3/3**. **CI frontend** ([run](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42492474999)): **2/2 trabajos exitosos, incluidos build/lint y E2E**. Resultado Windows precedente de E2-2 A: 212 pruebas; **la migración adicional CASA y los 217 tests todavía deben reproducirse localmente**. Sin endpoints de ubicación hasta E2-2 B/C y sin conexión React–API.

### E2-2 B — Primer corte HTTP de Ubicaciones

**Estado E2-2 B (08/11/2026):** se publicaron tres rutas reales para ubicaciones bajo `/api/v1/businesses/{business_id}/locations` (`POST` 201, `GET` lista 200, `GET /{location_id}` 200). La creación valida DTO sin campos protegidos, revalida identidad/sesión, bloquea la empresa y membresía del actor, exige tenant `ACTIVA` y rol `TITULAR_ADMINISTRATIVO` o `ADMINISTRADOR`, y confirma una única transacción. Una primera ubicación recibe `is_primary=true`; las posteriores no la reemplazan. Los miembros activos de cualquier rol reconocido pueden consultar las ubicaciones propias, incluso con empresa suspendida; una empresa suspendida no permite crear. Empresa ajena o membresía inactiva devuelve 404; rol sin permiso 403; sesión inválida 401; empresa suspendida al crear 409; cuerpo incorrecto 422. `CASA` y Google Maps HTTPS validado están incluidos. **No hay PATCH/DELETE, ni pausa/reactivación, cambio de principal, asignación individual de personal o consumo comercial de ubicaciones todavía.** La DEMO permanece independiente. Backend sin migración nueva respecto de `e22b_location_casa`.

**Evidencia de CI:** commit funcional `bdd2c84653dafb976c8cd6b49d8c2d577cc345de`; [GitHub Actions E2-2 B](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42493624747) **3/3** (Python 3.12 y 3.14 con PostgreSQL, Docker), **277 pruebas aprobadas**, `e22b_location_casa (head)` y Alembic sin deriva. La salida local de Windows aportada previamente para **E2-2 A.1** fue **217 passed in 23.90s**. Posteriormente E2-2 B **fue validado en Windows con `277 passed in 31.22s`**, Alembic sin deriva y Docker saludable; E2-2 C agrega nuevas pruebas por verificar localmente. La revisión de E2-1 por el compañero sigue anclada en el commit entregado.

### E2-2 C — Edición, pausa y principal

**E2-2 C (08/11/2026) — operaciones reales sobre ubicaciones:** `PATCH /api/v1/businesses/{business_id}/locations/{location_id}` permite editar únicamente `name`, `kind`, `address`, `map_url`, `can_sell` y `can_store` (campos opcionales en el cuerpo, pero se rechazan `null`, cuerpos vacíos, valores inválidos y campos protegidos). `PATCH /{location_id}/status` recibe solo `ACTIVA` o `PAUSADA`: pausar revoca `is_primary` en la misma transacción y reactivar **no** recupera la titularidad de ubicación automáticamente. `PUT /{location_id}/primary` designa una ubicación `ACTIVA`, desmarca la anterior y marca la elegida dentro del **mismo tenant y de una transacción única**, serializada por bloqueo de empresa y protegida con el índice SQL `uq_locations_one_active_primary`. La operación sobre una ubicación ya principal no realiza cambios adicionales. Titular/administrador con membresía ACTIVA pueden administrar; encargado/trabajador solo consultan. Empresa `SUSPENDIDA` admite lectura pero no cambios; recurso ajeno/inexistente 404, rol sin permiso 403, sesión inválida 401, estado incompatible 409 y cuerpo inválido 422. No se habilitó DELETE ni se crearon tablas nuevas.

**Evidencia:** código funcional `7abafd8208965cd99b0116e02ffc5240d23f218f`, [GitHub Actions E2-2 C](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42495567321) **3/3 exitoso**, 325/325 pruebas en Python 3.12 y 3.14 con PostgreSQL, Alembic `e22b_location_casa (head)` sin deriva y Docker correcto. Windows había validado previamente E2-2 B (`277 passed in 31.22s`, `/ready` = `ready`/`ok`). **Los 325 tests todavía deben reproducirse en Windows para dar por cerrado localmente E2-2 C.** La integración React/API, la asignación individual de miembros a ubicaciones, control de existencias al quitar `can_store`, recepciones/ventas y gestión de cajas operativas son trabajos futuros; no se atribuyen a este incremento. E2-1 y UML 03B/03C no fueron modificados.

### E2-2 D — Asignaciones por ubicación

**E2-2 D AS-IMPLEMENTED:** `LocationAssignment` con clave `(business_id,location_id,user_id)` y FK compuesta hacia `Location` y `Membership` del MISMO tenant. Migración aditiva `e22d_assignments`, índice único auxiliar de ubicación `(business_id,id)`. Estados administrativos `ACTIVA`/`REVOCADA`; fecha `revoked_at`, sin borrado físico. `GET /api/v1/businesses/{business_id}/locations/{location_id}/assignments` lista asignaciones de una sede (titular/administrador); `PUT /api/v1/businesses/{business_id}/locations/{location_id}/assignments/{membership_id}` recibe JSON `{"status":"ACTIVA"}` o `{"status":"REVOCADA"}` y activa/revoca idempotentemente. Solo se activa una membresía ENCARGADO/TRABAJADOR activa hacia ubicación ACTIVA; revocar permite sede pausada o miembro inactivo. Empresa SUSPENDIDA solo lectura. La política pura `can_operate_at_location` obliga a tenant, membresía, sede y capacidad `SELL/STORE` vigentes, además de asignación ACTIVA a encargados/trabajadores. **La política todavía no se consume en compras, inventario ni ventas**, fuera de este corte. Sin nuevas funciones de E2-1 ni conexión del frontend.

**CI comprobado para código funcional `3cd7bce71d951218e8c77da58d147e78fb0d426e`:** [run 42497556047](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42497556047), **371/371 tests Python 3.12 y 3.14, 3/3 trabajos aprobados**, Alembic `e22d_assignments (head)` sin deriva y Docker saludable. **Windows local E2-2 D está pendiente:** la última ejecución aportada corresponde a E2-2 C, 325 passed. No atribuir al último commit documental ejecución propia de tests.

**Entrega de revisión E2-2 aún no emitida:** primero verificar migración, tests y Docker local en Windows; después fijar SHA del cierre, reconciliar UML 03A y aplicar la guía maestra. E2-1 sigue en su rama separada; no iniciar E2-3 antes de terminar este cierre.

### E2-3 A — Primer incremento persistente del Catálogo

**Corte E2-3 A (08/11/2026), persistencia parcial de RF-04/CU-05:** clase SQLAlchemy `CatalogItem` y tabla `catalog_items` con `business_id` obligatorio, FK a Empresa (`RESTRICT`) y par UNIQUE `(business_id,id)` para futuras FK comerciales del mismo tenant. Cuatro clases de ficha según la DEMO: `ELABORADO`, `REVENTA`, `INSUMO` (bienes físicos) y `SERVICIO` (conceptualmente un servicio). Un servicio obliga unidad `SERVICIO`; un bien físico la prohíbe. Unidades físicas: `UNIDAD`, `GRAMO`, `KILOGRAMO`, `MILILITRO`, `LITRO`, `PAQUETE`, `CAJA`. Se almacenan nombre, clave normalizada `name_key`, categoría, SKU opcional, descripción, observaciones internas, estado `ACTIVO`/`INACTIVO`, condición `sellable`, `price_cents` y `reference_cost_cents` opcionales. Importes enteros BIGINT entre 0 y 99.999.999.999 centavos, sin Float. Dos restricciones independientes impiden repetir `name_key` y SKU no nulo **dentro de la empresa**, también en fichas inactivas; distintos tenants pueden reutilizarlos. En E2-3 B el servicio deberá calcular `name_key` de forma canónica (NFKC, espacios colapsados, equivalencia de mayúsculas) y normalizar SKU a mayúsculas **antes de insertar/editar**: SQL impone la unicidad de las claves guardadas y el formato de SKU, pero no deriva `name_key` automáticamente. Crear ficha no crea ubicación, stock, compras, ventas ni movimientos.

**Evidencia:** corte de código/pruebas `79c2071f4e5192be95d75c78d5b1e9a75492a645`; [GitHub Actions E2-3 A](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42504783843) **3/3**, **407 pruebas aprobadas** en Python 3.12 y Python 3.14 con PostgreSQL 16, Docker liveness aprobado y `e23a_catalog (head)` sin cambios pendientes de Alembic. **Validación local de Windows pendiente para E2-3 A**; los 371 tests anteriores corresponden al cierre de E2-2. **No existen rutas HTTP de Catálogo** en este corte; CRUD, RBAC de catálogo, SKU/name normalization de entrada y protección de historias comerciales se implementarán en E2-3 B/C/D. No hay integración React API ni revisión independiente de E2-3 todavía. No se modificó E2-1 ni E2-2 ni frontend DEMO.

### E2-3 B — Primeros endpoints de Catálogo

**E2-3 B — API real de Catálogo (RF-04/CU-05, 08/11/2026):** cuatro rutas bajo `/api/v1/businesses/{business_id}/catalog`: `POST /catalog` (201 alta), `GET /catalog` (200 lista con `offset>=0`, `1<=limit<=500`; por defecto `limit=100`), `GET /catalog/{item_id}` (200 detalle) y `PATCH /catalog/{item_id}` (200 edición parcial). Cada operación requiere Bearer válido, revalidación de sesión, usuario y membresía de la empresa solicitada. Titular/administrador pueden leer y escribir; encargado/trabajador con membresía activa solo leen; empresa SUSPENDIDA solo lectura; empresa o artículo ajenos/inexistentes 404. El servidor normaliza los nombres Unicode NFKC, colapsa espacios y genera `name_key` con `casefold`; normaliza SKU a mayúsculas ASCII y convierte SKU vacío en NULL. PostgreSQL conserva la unicidad por empresa de `name_key`/SKU incluso con fichas INACTIVO, y la API traduce esa colisión a 409. Datos inválidos o campos protegidos (id, tenant, status, clave derivada) reciben 422. Tipo SERVICIO exige unidad SERVICIO; ninguna otra clasificación puede usarla. Son válidos `price_cents` y `reference_cost_cents` NULL o enteros desde 0 hasta 99.999.999.999. El PATCH permite eliminar SKU/precio/costo con NULL, pero no editar estado. La ficha conserva su `status` y timestamps SQL. La creación no crea ubicación, saldo de stock, compras, ventas ni movimientos.

**Límites explícitos:** E2-3 B no expone todavía `PATCH /status` ni borrado físico (se evaluarán en E2-3 C). No existe integración del frontend React con esta API; no se implementan recepción, ventas, snapshots comerciales ni protección de edición de unidad con historia, pues esos módulos son posteriores. Los tests nuevos comprueban permisos, rollback de duplicados, SKU/nombres normalizados, aislamiento multiempresa, lectura bajo suspensión y fallas 401/403/404/409/422. **Evidencia CI E2-3 B:** [GitHub Actions 42506409757](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42506409757) finalizó **3/3 trabajos exitosos**, **498 pruebas aprobadas** tanto en Python 3.12 (53.96s) como Python 3.14 (50.12s), PostgreSQL 16, `e23a_catalog (head)` y `alembic check` sin operaciones, imagen Docker/liveness aprobado. Código funcional validado: `35ff901855397c024cee50fa590c6c05a7f04cfe`. El CI anterior `42506050141` había detectado dos fallos de mapeo HTTP en PATCH con tipo/unidad incompatible; se corrigieron y ambos casos pasan ahora. **La validación Windows local de E2-3 B sigue pendiente**; el último resultado local confirmado es 407/407 de E2-3 A.
