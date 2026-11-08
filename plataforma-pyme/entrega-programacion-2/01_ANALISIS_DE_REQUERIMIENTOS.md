# 01 — Análisis de requerimientos

**Proyecto:** Asistente PyME — Plataforma de gestión multiempresa y multirrubro  
**Materia:** Programación 2  
**Versión:** 1.1 — E2-2 C, edición y transiciones de ubicaciones
**Estado:** **BORRADOR FUNCIONAL — RF-01/RF-02 núcleo implementado; RF-03 API de ubicaciones E2-2 C disponible con límites declarados**  
**Fecha:** 8 de noviembre de 2026  
**Fuente de requisitos académicos:** consigna oficial «Desarrollo de una API RESTful».  
**Alcance de este documento:** análisis de producto y requisitos objetivo. **No equivale a afirmar que la API esté implementada.**

> **Cierre E2-1 / C.5 — 08/11/2026:** C.1 (98), C.2 (125), C.3 (147), C.4a (171) y **C.4b (195/195 pruebas locales aprobadas; `195 passed in 23.86s`)**. Alembic `e213c4_acceptance (head)`, `No new upgrade operations detected.`; Docker FastAPI/PostgreSQL `healthy` y `/ready` = `ready`/`ok`. GitHub Actions **3/3** corresponde al commit funcional `8cd1674`. C.5 es **exclusivamente documental**; no se reejecutaron pruebas ni cambiaron endpoints, modelos SQL o migraciones. React sigue DEMO; RF-03–RF-07 no tienen backend; transferencia de titularidad, verificación de correo y endurecimiento para producción siguen pendientes.

## 1. Presentación del proyecto

Asistente PyME es una plataforma de gestión destinada a pequeñas y medianas empresas de distintos rubros. Su finalidad es centralizar información comercial y operativa que habitualmente se administra mediante herramientas separadas, registros manuales o planillas.

El sistema permite organizar empresas, ubicaciones, artículos y servicios, proveedores, compras, existencias, ventas, gastos, medios de pago y jornadas de caja. Cada empresa conserva un contexto de datos independiente, mientras que un usuario puede estar vinculado a más de una empresa.

**WALOS** se utiliza como ejemplo de negocio durante las pruebas y demostraciones. La plataforma **no está limitada** al sector de productos para mascotas.

El frontend React/TypeScript sigue en modo DEMO con almacenamiento local. En paralelo ya se implementó una API FastAPI con PostgreSQL y autenticación real, más las primeras operaciones de empresa. **La autorización empresarial de perfil, invitaciones y equipo ya está implementada; los permisos de las futuras operaciones comerciales y módulos RF-03–RF-07 siguen en desarrollo**; aún no existe integración frontend/API.

## 2. Problema que se busca resolver

Una empresa puede manejar su catálogo, proveedores, existencias, ventas y caja en medios diferentes, dificultando la consulta de información y el seguimiento de operaciones.

Esa fragmentación puede causar registros duplicados, diferencias entre existencias físicas y ventas declaradas, dificultad para reconstruir el origen de un movimiento y poca claridad sobre las operaciones de cada ubicación.

Se propone una aplicación única que vincule los registros sin confundir operaciones distintas: **una compra no implica recepción**, **una venta no equivale a acreditación bancaria** y **una intención de cobro no equivale a venta confirmada**.

## 3. Objetivos

### 3.1 Objetivo general

Desarrollar una plataforma de gestión comercial y operativa multiempresa, accesible mediante una interfaz web y respaldada por una API RESTful, que permita registrar, consultar y mantener la trazabilidad de los principales procesos del negocio.

### 3.2 Objetivos específicos

- Centralizar los datos de cada empresa y sus ubicaciones, sin mezclar información entre negocios.
- Administrar productos, materiales y servicios desde un catálogo común.
- Registrar proveedores, compras y recepción de mercadería con trazabilidad.
- Mantener existencias consistentes mediante movimientos de inventario.
- Registrar ventas con importes y pagos declarados exactos.
- Gestionar gastos y jornadas de caja con registros históricos verificables.
- Consolidar el backend autenticado ya iniciado e incorporar controles de permisos por empresa en cada operación real.
- Ofrecer pruebas automatizadas y documentación suficientes para verificar el funcionamiento de la API.

## 4. Actores e interesados

| Actor/interesado | Relación con el sistema | Observación |
|---|---|---|
| Usuario de la plataforma | Accede a su espacio personal y puede pertenecer a una o varias empresas | Registro, login y sesiones reales disponibles en la API; frontend aún DEMO |
| Fundador o titular administrativo | Crea una empresa y gestiona su configuración inicial | La titularidad y transferencia futura requieren definición formal |
| Administrador de empresa | Administra información y operaciones según permisos | Roles y permisos definitivos se concretarán en E2 |
| Colaborador | Opera únicamente las funciones autorizadas en la empresa | Los roles actuales del frontend son de demostración |
| Responsable de ventas o caja | Registra ventas, gastos o jornadas, según autorización | Es una función operativa; no necesariamente un rol técnico independiente |
| Proveedor y cliente | Se referencian en operaciones comerciales | No se presupone que ingresen a la plataforma |

**Distinción:** actores y permisos previstos para la API no deben presentarse como mecanismos de seguridad ya operativos en la DEMO.

## 5. Alcance y estados de implementación

### 5.1 Funcionalidades disponibles en el frontend DEMO (AS-IS)

Interfaz de múltiples empresas; perfil personal local; datos empresariales; ubicaciones; equipo e invitaciones simuladas; catálogo; imágenes locales; proveedores; compras y recepción; inventario y conteos; ventas con pagos divididos; gastos; cuentas declaradas; jornadas de caja y QR visual de cobro DEMO.

Las operaciones ya fueron objeto de pruebas manuales y automatizadas de frontend, pero su almacenamiento sigue siendo local. No hay registro/login real, permisos de servidor, sincronización segura entre dispositivos ni conexión bancaria.

### 5.2 Alcance objetivo del backend académico (TO-BE)

API RESTful en FastAPI, registro e inicio de sesión seguros, autorización y aislamiento de recursos por empresa, persistencia SQLAlchemy con base de datos, manejo de errores, Docker, pruebas automatizadas, GitHub Actions, documentación y despliegue. El alcance exacto de endpoints se fijará antes de implementar, manteniendo **al menos cinco requerimientos funcionales de alto nivel** cubiertos y verificables.

**Propuesta de recorte para la primera entrega de API (sujeta a aprobación):** autenticar usuarios (RF-01); administrar empresas/membresías básicas (RF-02); administrar catálogo (RF-04); registrar compras y recepciones básicas (RF-05); controlar existencias y traslados (RF-06); y registrar ventas con pagos declarados (RF-07). Ubicaciones (RF-03) es una dependencia de soporte para compras, inventario y ventas: implementar lo mínimo necesario del lado servidor. Esta selección contiene más de cinco requerimientos de alto nivel, pero **no exige reproducir en el backend la totalidad de funciones avanzadas de cada pantalla**. Gastos/caja, cuentas financieras declaradas y QR DEMO (RF-08 a RF-10) quedan propuestos como segunda fase de integración, salvo revisión del equipo.

La consigna exige autenticación segura aunque la aplicación actual no tenga login. Ninguno de los servicios mencionados se considera implementado por existir su interfaz DEMO.

### 5.3 Funcionalidades diferidas

Cobros reales mediante Mercado Pago, OAuth por vendedor, webhooks de acreditación, conciliación bancaria, QR de pago parcial real, reservas de stock, devoluciones/reembolsos, producción por lotes, analítica avanzada e importación automática del historial local a la base de datos. No son requisitos comprometidos para el MVP actual salvo decisión posterior.

## 6. Requerimientos funcionales

**Convención de estados:** «DEMO» = interfaz y política local implementadas; «BACKEND PENDIENTE» = faltan endpoints, persistencia y validación de servidor. **La columna «Alcance backend» es una propuesta de priorización, no un compromiso aprobado ni un estado de implementación.**

- **NÚCLEO MVP:** debe contar con casos de uso, endpoints reales y pruebas para la entrega inicial de API.
- **SOPORTE MVP:** capacidad mínima necesaria para que el núcleo funcione; su implementación completa puede diferirse.
- **POST-MVP:** existe en el frontend DEMO, pero la integración con el backend se propone para una fase posterior.

| ID | Requerimiento de alto nivel | Comportamiento esperado | Estado actual | Alcance backend propuesto |
|---|---|---|---|---|
| **RF-01** | Gestionar usuarios y autenticación | Registro, inicio de sesión y acceso seguro a recursos autorizados | React DEMO sin login; **API real con registro y sesiones** | **NÚCLEO MVP — obligatorio por consigna** |
| **RF-02** | Gestionar empresas y miembros | Crear/editar empresas, invitar/aceptar y administrar equipo con permisos por tenant | React DEMO simulado; **backend RF-02 básico implementado** | **NÚCLEO MVP** (membresía y permisos básicos) |
| **RF-03** | Administrar ubicaciones | Crear, editar, consultar y desactivar ubicaciones diferenciando venta y almacenamiento | **API E2-2 B/C: alta, lista/detalle, edición, pausa/reactivación y principal; DEMO independiente; controles comerciales posteriores pendientes** | **SOPORTE MVP** (altas/consultas y validaciones mínimas) |
| **RF-04** | Administrar catálogo | Registrar y editar artículos, insumos y servicios con SKU, unidad, precio y estado | DEMO local | **NÚCLEO MVP** |
| **RF-05** | Gestionar proveedores y compras | Registrar proveedores y compras; recibir mercadería explícitamente y consultar historial | DEMO local | **NÚCLEO MVP** (compra/recepción básica e idempotente) |
| **RF-06** | Controlar inventario | Consultar existencias por ubicación, registrar traslados, conteos y ajustes trazables | DEMO local | **NÚCLEO MVP** (existencias/traslados; conteos completos pueden ampliarse) |
| **RF-07** | Registrar ventas y pagos declarados | Registrar ventas, descuentos y uno o más medios cuyo importe total coincida con la venta; descontar stock físico cuando corresponda | DEMO local | **NÚCLEO MVP** (ventas transaccionales con pagos declarados) |
| **RF-08** | Gestionar gastos y caja | Registrar gastos; abrir y cerrar jornadas con arqueo e historial de cierres | DEMO local | **POST-MVP** (backend de segunda fase) |
| **RF-09** | Administrar cuentas financieras declaradas | Registrar bancos y billeteras como referencias para cobros/pagos; controlar estado activo y conservar histórico | DEMO local | **POST-MVP** (backend de segunda fase) |
| **RF-10** | Gestionar intenciones QR DEMO | Crear, cancelar y aprobar de manera simulada una intención sin tratarla como cobro real | DEMO visual local, sin cobro real | **POST-MVP** (backend QR real no requerido) |

**Advertencia de alcance:** RF-01 a RF-07 no significan siete módulos completos y sin recortes: se especificarán operaciones mínimas aceptables en casos de uso y matriz API antes de implementar. En particular, las ubicaciones son una dependencia real de inventario y recepción; no pueden omitirse sin redefinir esos casos. Los RF-08 a RF-10 no deben declararse implementados en la API de la primera entrega.

### 6.1 Criterios de aceptación funcional preliminares

- **RF-01:** una persona no autenticada no puede acceder a endpoints protegidos; las contraseñas no se almacenan en texto plano.
- **RF-02:** un usuario sin autorización para la empresa B no puede consultar ni modificar sus recursos aunque conozca sus identificadores.
- **RF-04:** el SKU se valida dentro de cada empresa; un servicio no genera existencias físicas.
- **RF-05:** registrar una compra no incrementa stock; recibirla genera entradas una sola vez.
- **RF-06:** no se acepta un traslado o salida que produzca stock negativo; cada movimiento queda trazado. La validación debe ser transaccional al ejecutar la operación, no sólo visual en el cliente.
- **RF-07:** los pagos suman exactamente el total en centavos; una venta válida genera las salidas de stock de los **bienes físicos** sin duplicarlas ante reintentos. En una venta mixta los servicios no generan salidas de inventario.
- **RF-08:** las operaciones digitales no se suman al efectivo esperado; un cierre guarda un snapshot que no se recalcula retroactivamente.
- **RF-09:** una cuenta desactivada no se ofrece para nuevas asociaciones y permanece identificada en operaciones previas.
- **RF-10:** un QR pendiente no crea venta; aprobarlo vuelve a validar disponibilidad del artículo y nunca se interpreta como acreditación externa.

Estos criterios son propuestas para el futuro sistema y se convertirán en escenarios de casos de uso, contratos y pruebas. No todos constituyen resultados ya obtenidos en API.

## 7. Requerimientos no funcionales

| ID | Requerimiento | Criterio de verificación propuesto |
|---|---|---|
| **RNF-01** | Seguridad y aislamiento multiempresa | Registro/login seguros, protección de credenciales y comprobación de membresía y permisos para cada recurso empresarial en el servidor. Ningún ID provisto por el cliente concede acceso por sí solo. |
| **RNF-02** | Integridad y pertenencia de datos | Transacciones para operaciones que modifican varias entidades, integridad referencial y vínculos entre recursos de una misma empresa; sin estados parciales inconsistentes. |
| **RNF-03** | Persistencia | Datos del backend conservados en PostgreSQL a través de SQLAlchemy, independientes del almacenamiento local del navegador |
| **RNF-04** | Interoperabilidad | Endpoints RESTful, solicitudes/respuestas JSON, códigos HTTP y manejo explícito de errores |
| **RNF-05** | Mantenibilidad | Responsabilidades separadas entre API, servicios, dominio y acceso a datos; al menos un patrón útil justificado |
| **RNF-06** | Calidad verificable | Al menos 10 tests unitarios de la API y ejecución automatizada mediante GitHub Actions |
| **RNF-07** | Despliegue y reproducibilidad | API ejecutable en Docker, instrucciones de instalación, configuración y despliegue publicadas |
| **RNF-08** | Usabilidad | Interfaz clara, formularios validados y navegación adaptada a escritorio y móvil |
| **RNF-09** | Trazabilidad | Identificadores, estados y referencias históricas suficientes para explicar operaciones y cierres |

Los objetivos cuantitativos adicionales de rendimiento, disponibilidad y cobertura se definirán si la cátedra o el proyecto requieren medirlos; no se afirman métricas que aún no fueron relevadas.

## 8. Reglas de negocio principales

| ID | Regla |
|---|---|
| **RN-01** | Todo recurso de negocio está asociado a una empresa y su acceso se valida en backend mediante membresías y permisos. Las entidades globales, como Usuario, no pertenecen a una única empresa; una Membresía vincula Usuario y Empresa. La base debe impedir referencias empresariales cruzadas mediante claves y restricciones adecuadas, directas o derivadas. |
| **RN-02** | Una compra registrada no crea existencias hasta su recepción confirmada. |
| **RN-03** | La recepción y la venta deben evitar movimientos duplicados por reintentos. |
| **RN-04** | Los bienes físicos se controlan por artículo y ubicación; los servicios no consumen inventario físico. En ventas mixtas de bienes y servicios, únicamente los renglones físicos generan movimientos de inventario. |
| **RN-05** | Los importes monetarios se representan de forma exacta: centavos enteros (preferentemente `BIGINT` en persistencia, según límites aprobados) o `NUMERIC`/`Decimal` con escala definida. Pydantic debe validar formato y rango. **No usar `Float` para almacenar dinero**; definir y probar reglas de redondeo. |
| **RN-06** | Una venta puede aplicar varios medios, pero la suma de sus importes debe ser igual al total. |
| **RN-07** | Sólo los cobros y gastos en efectivo asociados a una jornada modifican el efectivo esperado de esa jornada. |
| **RN-08** | Un cierre de caja conserva su arqueo como snapshot histórico. |
| **RN-09** | Desactivar una cuenta declarada impide nuevas referencias internas; no cierra una cuenta bancaria real. |
| **RN-10** | Una intención QR DEMO pendiente o cancelada no crea venta ni descuenta stock. La aprobación simulada revalida la operación. |

## 9. Relación preliminar con la API RESTful

Para satisfacer la consigna académica, los requerimientos de alto nivel deben estar contemplados por endpoints reales. Estos ejemplos son **propuestos, no implementados**:

| Requerimiento | Ejemplo de recursos/operaciones de API |
|---|---|
| RF-01 | `POST /auth/register`, `POST /auth/login` |
| RF-02 | `GET/POST /businesses`, `GET /businesses/{id}/members` |
| RF-03 (soporte) | `GET/POST /businesses/{id}/locations` (altas/consultas mínimas) |
| RF-04 | `GET/POST /businesses/{id}/items` |
| RF-05 | `GET/POST /businesses/{id}/purchases`, operación de recepción |
| RF-06 | `GET /businesses/{id}/inventory`, operación de traslado |
| RF-07 | `GET/POST /businesses/{id}/sales` |
| RF-08 | `GET/POST /businesses/{id}/expenses`, operaciones de caja |

El diseño definitivo de métodos, rutas, estados HTTP y schemas se hará en el documento `05_MATRIZ_API_Y_TRAZABILIDAD.md`, tras aprobar los casos de uso y modelo de dominio. **No debe contarse una ruta de frontend como endpoint de API.**

## 10. Restricciones y supuestos

- El trabajo se realizará dentro de `plataforma-pyme/` sin modificar los proyectos académicos hermanos.
- Se conservará el frontend React/TypeScript como base visual de la integración; el backend ejercerá autoridad sobre el estado y las reglas críticas.
- Los datos de la DEMO no se migrarán automáticamente a PostgreSQL sin una decisión y un procedimiento específico.
- Las fotografías hoy están en IndexedDB y sólo se ven en el navegador donde se cargaron. Para la API inicial se propone almacenar como metadato una referencia opcional (`image_url`/`image_key`) o usar un recurso estático controlado; la carga y persistencia binaria compartida puede diferirse. Si se decide incorporar imágenes multiusuario, deberá definirse un almacenamiento persistente externo al contenedor efímero y su política de permisos. No se almacenarán blobs base64 directamente en los datos de negocio por inercia.
- La empresa de ejemplo WALOS no limita a negocios de otros rubros.
- Los roles y permisos detallados, así como el alcance exacto de cada endpoint, quedan sujetos a aprobación antes de implementar la API.

## 11. Trazabilidad y documentos siguientes

- **Documento 02 — Casos de uso:** especificará actores, precondiciones, flujo principal, alternativos y excepciones de los RF seleccionados.
- **Documento 03 — Modelo de dominio y UML:** formalizará entidades, asociaciones, cardinalidades e invariantes.
- **Documento 04 — Arquitectura y patrones:** explicará la separación de responsabilidades y el patrón de diseño escogido.
- **Documento 05 — Matriz API y trazabilidad:** relacionará RF → caso de uso → endpoint → pruebas.
- **Documento 06 — Pruebas y despliegue:** reunirá Docker, tests, CI y evidencias reales del deploy.

## 12. Aspectos a aprobar antes de la versión 1.0

1. Aprobar o ajustar la propuesta de **NÚCLEO MVP** RF-01, RF-02, RF-04, RF-05, RF-06 y RF-07, con RF-03 como soporte mínimo; este recorte es provisional y debe verificarse contra los tiempos del equipo.
2. Precisar para cada RF las operaciones mínimas que tendrán endpoints reales y pruebas (no necesariamente todo el módulo visual), asegurando **al menos cinco requerimientos de alto nivel** cubiertos.
3. Acordar los actores, permisos y relación Usuario–Empresa–Membresía a detallar en casos de uso.
4. Definir si el primer backend conservará sólo una referencia opcional de imagen o implementará carga binaria persistente.
5. Fijar contratos monetarios y límites de cantidades antes del modelo SQL y schemas Pydantic.

**Este documento permanece en borrador hasta su aprobación.**

## 13. Seguimiento de RF implementados y trazabilidad E2

| RF | Código y evidencia verificada | Pendiente |
|---|---|---|
| RF-01 | `POST /api/v1/auth/register`, `login`, `GET /me`, `POST /logout`; Argon2id, sesiones persistentes y pruebas PostgreSQL | Endurecimiento público, recuperación de cuenta e integración de React |
| RF-02 | Crear/consultar/editar empresa; emitir/aceptar invitaciones; listar/administrar equipo — **195 pruebas locales aprobadas y CI funcional 3/3**; `e213c4_acceptance (head)` | React conectado, verificación de correo, transferencia de titularidad, auditoría histórica y endurecimiento público |
| RF-03–RF-07 | Reglas planificadas, algunos comportamientos DEMO | Endpoints reales, tablas, transacciones y tests de negocio |
| RF-08–RF-10 | Frontend DEMO o diseños diferidos | No comprometidos como backend del primer MVP |

**Política documental:** cada entrega E2 grande debe revisar sus RF y RNF, el caso de uso, las entidades UML si cambiaron, la arquitectura, el Documento 05 y la evidencia de pruebas. `03B` no se regenera por cambios de permisos de identidad; se conserva su trabajo conceptual. La matriz de permisos de E2-1.3C.1 es código de política testeable, **no equivale aún a un endpoint protegido por rol**.

### 13.1 E2-1.3C.2 — requisito RF-02: edición de perfil con autorización

Se publicó `PATCH /api/v1/businesses/{business_id}`: permite modificar parcialmente `name`, `category` y `activity_kind`. No puede modificar fundador, estado, titularidad, rol ni membresía. El actor se deriva del Bearer de la sesión, nunca de campos del cliente. La ejecución bloquea y vuelve a comprobar la identidad, sesión, empresa y membresía en PostgreSQL antes de escribir; titular y administrador pueden editar. Encargado y trabajador no reciben privilegios de modificación. Empresa ajena/no miembro activo responde 404; rol sin permiso, 403; empresa suspendida con rol autorizado, 409; cuerpo inválido, vacío o con campos prohibidos, 422. Todo ocurre en una única transacción, con rollback ante errores.

**Estado de evidencia actualizado en C.5:** C.2 quedó validado con **125 pruebas locales** y las regresiones C.3/C.4a/C.4b finalizaron en **195/195**. El PATCH no requirió migración ni cambió cardinalidades. El circuito CU-12, pendiente cuando se cerró C.2, fue implementado posteriormente en C.3/C.4a/C.4b.

### 13.2 E2-1.3C.3 — RF-02: invitación dirigida sin alta automática de membresía

Se implementó `POST /api/v1/businesses/{business_id}/invitations`, protegido por Bearer y por permiso `members.invite` sobre una membresía activa de la empresa solicitada. Permite invitar exclusivamente a los roles operativos **ENCARGADO** y **TRABAJADOR**; no asigna administrador, titularidad ni permisos de otra empresa. El destinatario se identifica por correo normalizado y no necesita una cuenta previa para **emitir** la invitación. La emisión **no crea, activa ni transfiere ninguna membresía**: la aceptación autenticada corresponde a C.4.

El token opaco aleatorio se entrega **una única vez en la respuesta 201** y solo su hash SHA-256 se guarda. Vence a los siete días. La base contiene una restricción UNIQUE parcial que impide dos invitaciones `PENDIENTE` al mismo correo normalizado dentro de la misma empresa. El servicio marca `EXPIRADA` una pendiente vencida antes de permitir una nueva; no existe tarea automática de expiración. Una solicitud duplicada mientras la primera está vigente responde 409. La confirmación ocurre en una transacción junto con la comprobación de identidad, membresía, permisos y empresa.

**Registro histórico de C.3:** aceptación y administración de miembros estaban pendientes al emitir invitaciones, pero **fueron implementadas y validadas posteriormente en C.4a/C.4b**. El listado/cancelación/reenvío de invitaciones, correo/QR, generación de cuentas e interfaz React siguen fuera de E2-1.

### 13.3 C.4a — Aceptación de una invitación como identidad autenticada

El destinatario puede aceptar exclusivamente una invitación cuyo correo normalizado coincida con el de su cuenta global autenticada. El token opaco se presenta mediante `POST /api/v1/invitations/accept`; la API usa únicamente `Authorization: Bearer` para obtener la identidad (no acepta `user_id`, rol o empresa enviados por el cliente). Se verifica por hash SHA-256 en PostgreSQL, estado `PENDIENTE`, vencimiento vigente y empresa `ACTIVA`. La operación crea una sola membresía o reactiva la anterior `INACTIVA` sin duplicar `(business_id,user_id)`; la nueva membresía utiliza el rol `ENCARGADO` o `TRABAJADOR` que fijó la invitación, nunca titularidad ni privilegios globales. La invitación pasa a `ACEPTADA` y registra `accepted_by_user_id` y `accepted_at` en el mismo commit. Repetir la aceptación no produce efectos.

**Limitaciones actuales:** no hay interfaz React conectada, envío de correo, listado/cancelación/reenvío de invitaciones ni verificación de propiedad de email. **La gestión de equipo y cambios de rol operativo sí están disponibles desde C.4b.** Para producción se requieren entrega segura del token, rate limiting y endurecimiento de auth. C.4a se validó con 171 pruebas y C.4b con 195.

### 13.4 C.4b — RF-02: consultar y administrar las membresías del equipo

Se incorporan `GET /api/v1/businesses/{business_id}/memberships` y `PATCH /api/v1/businesses/{business_id}/memberships/{membership_id}`. El primero permite al titular administrativo y al administrador consultar **únicamente el equipo de su empresa** (miembros activos e inactivos) con id, usuario, email, nombre visible, rol, estado y puesto de trabajo existente. No expone contraseña, teléfonos ni tokens. Encargado/trabajador no pueden acceder a ese directorio. La segunda operación está reservada al **titular administrativo activo** y cambia, parcialmente, `role` entre `ADMINISTRADOR/ENCARGADO/TRABAJADOR` o `status` entre `ACTIVA/INACTIVA`. No admite el cambio de `user_id`, empresa ni titularidad.

Se protege tanto la membresía del titular vigente como cualquier membresía histórica con rol `TITULAR_ADMINISTRATIVO`: ni la desactivación, ni la degradación ni la transferencia se implementan aquí. Las modificaciones se autorizan con el rol vigente **consultado en PostgreSQL dentro de la transacción** y se bloquean empresa, miembro actor y membresía objetivo. Una empresa suspendida no admite lectura de directorio sensible ni mutaciones; la lectura informativa del perfil de empresa sigue disponible.

**Estado C.5:** C.4b validado en Windows con **195/195 pruebas**, CI funcional 3/3, `e213c4_acceptance (head)` sin migración adicional y Docker saludable. Se actualizó la documentación y UML 03A sin alterar 03B; transferencia de titularidad y administración avanzada del puesto siguen pendientes.

## 14. C.5 — Cierre de requerimientos comprobables

**RF-01:** registro, login, `/me` y logout con sesiones PostgreSQL. **RF-02:** creación/listado/lectura/edición de empresa, emisión y aceptación de invitaciones, consulta de membresías y actualización de rol/estado por titular; permisos RBAC y aislamiento de tenant verificados. **No** equivale a todos los procesos futuros de gestión, cesión de titularidad ni integración React.

**Evidencia local 08/11/2026:** `195 passed in 23.86s`, Alembic `e213c4_acceptance (head)` y `alembic check` sin operaciones, contenedores API y base `healthy`, `/ready` conectado. CI 3/3 corresponde al código `8cd1674`, no a un nuevo CI de C.5. Los RF-03–RF-07 carecen todavía de endpoints backend. Primero se prepara la revisión separada de E2-1 y luego se inicia RF-03.

## 15. E2-2 A — Persistencia de ubicaciones (implementación parcial RF-03)

**E2-2 A — persistencia de Ubicaciones (08/11/2026):** se publicó `Location`/`locations` con FK obligatoria `business_id → businesses.id` (`RESTRICT`), seis tipos, `can_sell`/`can_store` independientes, campos de referencia opcionales, `ACTIVA/PAUSADA`, `is_primary`, índice parcial que permite como máximo una principal activa por tenant y CHECK que impide principal pausada. Migración aditiva `20261108_0008_business_locations.py` (`e22a_locations`, descendiente de `e213c4_acceptance`). La empresa continúa iniciándose **sin ubicaciones**. **No hay todavía rutas HTTP de ubicaciones**, ni inventario/compra/venta conectado, ni permisos de ubicación; esos cambios pertenecen a E2-2 B/C y bloques siguientes. El CI del código del corte se verificó en `300fa6f` (GitHub Actions [run 42491816481](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42491816481)): resultado `success`. La validación local Windows del nuevo corte aún se requiere; los 195 tests anteriores correspondían a E2-1.

**Decisiones vigentes:** nombres de 2 a 80 caracteres; tipos `LOCAL/FERIA/DEPOSITO/OFICINA/CASA/OTRO`; `address` (hasta 160) y `map_url` (hasta 2048) guardados como textos opcionales representados con cadena vacía; capacidades booleanas obligatorias **sin exigir que alguna sea verdadera** (una oficina administrativa puede no vender ni guardar). La ubicación principal es opcional (cero o una activa) y no puede estar en estado `PAUSADA`; el futuro servicio gestionará la transición de principal de modo transaccional. No se impone un nombre único dentro del tenant porque el contrato actual no lo exige. La validación de enlaces, RBAC y reglas de pausa con stock pendiente corresponden a etapas posteriores. **RF-03 no se declara finalizado.**


### E2-2 A.1 — Nuevo tipo CASA (08/11/2026)

Se incorporó `CASA` como sexto tipo de ubicación, sin cambiar el contrato de capacidades independientes `can_sell` y `can_store`, ni los estados `ACTIVA`/`PAUSADA`. Una casa puede vender, almacenar, ambas actividades o ninguna (domicilio administrativo). **No se crean direcciones ni ubicaciones automáticamente** y no se presupone habilitación comercial. La migración nueva `e22b_location_casa`, descendiente de `e22a_locations`, amplía `ck_locations_kind` sin reescribir la migración anterior ni alterar filas existentes; impide su reversión mientras queden filas CASA. La DEMO React admite CASA en el selector y en validación/lectura del almacenamiento local, pero sigue separada de la API. CI del código `b50bf200`: **backend 217/217 pruebas, Alembic sin deriva y Docker 3/3** ([run backend](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42492475011)); **frontend 2/2, incluido E2E de escritorio y móvil** ([run frontend](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42492474999)). Resultado Windows anterior de E2-2 A: 212 pruebas; **validación local de A.1 pendiente**. CRUD HTTP y permisos por ubicación siguen para E2-2 B/C. E2-1/03B/03C no se alteran.

## 16. E2-2 B — Alta y consulta autenticadas de ubicaciones (RF-03 parcial)

**Estado E2-2 B (08/11/2026):** se publicaron tres rutas reales para ubicaciones bajo `/api/v1/businesses/{business_id}/locations` (`POST` 201, `GET` lista 200, `GET /{location_id}` 200). La creación valida DTO sin campos protegidos, revalida identidad/sesión, bloquea la empresa y membresía del actor, exige tenant `ACTIVA` y rol `TITULAR_ADMINISTRATIVO` o `ADMINISTRADOR`, y confirma una única transacción. Una primera ubicación recibe `is_primary=true`; las posteriores no la reemplazan. Los miembros activos de cualquier rol reconocido pueden consultar las ubicaciones propias, incluso con empresa suspendida; una empresa suspendida no permite crear. Empresa ajena o membresía inactiva devuelve 404; rol sin permiso 403; sesión inválida 401; empresa suspendida al crear 409; cuerpo incorrecto 422. `CASA` y Google Maps HTTPS validado están incluidos. **No hay PATCH/DELETE, ni pausa/reactivación, cambio de principal, asignación individual de personal o consumo comercial de ubicaciones todavía.** La DEMO permanece independiente. Backend sin migración nueva respecto de `e22b_location_casa`.

**Evidencia de CI:** commit funcional `bdd2c84653dafb976c8cd6b49d8c2d577cc345de`; [GitHub Actions E2-2 B](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42493624747) **3/3** (Python 3.12 y 3.14 con PostgreSQL, Docker), **277 pruebas aprobadas**, `e22b_location_casa (head)` y Alembic sin deriva. La salida local de Windows aportada previamente para **E2-2 A.1** fue **217 passed in 23.90s**. Posteriormente E2-2 B **fue validado en Windows con `277 passed in 31.22s`**, Alembic sin deriva y Docker saludable; E2-2 C agrega nuevas pruebas por verificar localmente. La revisión de E2-1 por el compañero sigue anclada en el commit entregado.

## 17. E2-2 C — Gestión segura de ubicaciones (RF-03)

**E2-2 C (08/11/2026) — operaciones reales sobre ubicaciones:** `PATCH /api/v1/businesses/{business_id}/locations/{location_id}` permite editar únicamente `name`, `kind`, `address`, `map_url`, `can_sell` y `can_store` (campos opcionales en el cuerpo, pero se rechazan `null`, cuerpos vacíos, valores inválidos y campos protegidos). `PATCH /{location_id}/status` recibe solo `ACTIVA` o `PAUSADA`: pausar revoca `is_primary` en la misma transacción y reactivar **no** recupera la titularidad de ubicación automáticamente. `PUT /{location_id}/primary` designa una ubicación `ACTIVA`, desmarca la anterior y marca la elegida dentro del **mismo tenant y de una transacción única**, serializada por bloqueo de empresa y protegida con el índice SQL `uq_locations_one_active_primary`. La operación sobre una ubicación ya principal no realiza cambios adicionales. Titular/administrador con membresía ACTIVA pueden administrar; encargado/trabajador solo consultan. Empresa `SUSPENDIDA` admite lectura pero no cambios; recurso ajeno/inexistente 404, rol sin permiso 403, sesión inválida 401, estado incompatible 409 y cuerpo inválido 422. No se habilitó DELETE ni se crearon tablas nuevas.

**Evidencia:** código funcional `7abafd8208965cd99b0116e02ffc5240d23f218f`, [GitHub Actions E2-2 C](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42495567321) **3/3 exitoso**, 325/325 pruebas en Python 3.12 y 3.14 con PostgreSQL, Alembic `e22b_location_casa (head)` sin deriva y Docker correcto. Windows había validado previamente E2-2 B (`277 passed in 31.22s`, `/ready` = `ready`/`ok`). **Los 325 tests todavía deben reproducirse en Windows para dar por cerrado localmente E2-2 C.** La integración React/API, la asignación individual de miembros a ubicaciones, control de existencias al quitar `can_store`, recepciones/ventas y gestión de cajas operativas son trabajos futuros; no se atribuyen a este incremento. E2-1 y UML 03B/03C no fueron modificados.
