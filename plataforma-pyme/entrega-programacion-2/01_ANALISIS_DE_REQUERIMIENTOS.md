# 01 — Análisis de requerimientos

**Proyecto:** Asistente PyME — Plataforma de gestión multiempresa y multirrubro  
**Materia:** Programación 2  
**Versión:** 0.4\
**Estado:** ACTUALIZADO PARA INTEGRACIÓN - revisión del equipo pendiente\
**Fecha:** 7 de noviembre de 2026  
**Fuente de requisitos académicos:** consigna oficial «Desarrollo de una API RESTful».  
**Alcance de este documento:** análisis de producto y requisitos objetivo. **No equivale a afirmar que la API esté implementada.**

## Estado de la integración

La plataforma es multiempresa y multirrubro. La rama integra registro/login de Jorge con recursos, compras, stock, ventas, gastos y caja en PostgreSQL. El modo DEMO sigue separado; un fallo de API no guarda datos locales.

RF-01 a RF-09 tienen operaciones implementadas en este corte; RF-02 incluye membresías y permisos, pero CU-12/invitaciones permanece pendiente. RF-10 conserva únicamente su simulación DEMO. Los contratos y el alcance exacto están en [05](05_MATRIZ_API_Y_TRAZABILIDAD.md); las comprobaciones y límites de publicación en [06](06_PRUEBAS_Y_DESPLIEGUE.md). Implementado en rama no significa aprobado por el equipo ni desplegado públicamente.


## 1. Presentación del proyecto

Asistente PyME es una plataforma de gestión destinada a pequeñas y medianas empresas de distintos rubros. Su finalidad es centralizar información comercial y operativa que habitualmente se administra mediante herramientas separadas, registros manuales o planillas.

El sistema permite organizar empresas, ubicaciones, artículos y servicios, proveedores, compras, existencias, ventas, gastos, medios de pago y jornadas de caja. Cada empresa conserva un contexto de datos independiente, mientras que un usuario puede estar vinculado a más de una empresa.

**WALOS** se utiliza como ejemplo de negocio durante las pruebas y demostraciones. La plataforma **no está limitada** al sector de productos para mascotas.

El frontend React/TypeScript sigue en modo DEMO con almacenamiento local. En paralelo ya se implementó una API FastAPI con PostgreSQL y autenticación real, más las primeras operaciones de empresa. **La autorización específica por rol y los módulos comerciales del MVP siguen en desarrollo**; aún no existe integración frontend/API.

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

### 5.1 Implementación actual

En modo API: identidad global, empresas y membresías, ubicaciones, catálogo de bienes y servicios, proveedores, compras/recepción, stock/conteos/traslados, ventas/pagos declarados, gastos, cuentas declaradas y jornadas de caja. PostgreSQL es la autoridad de datos y permisos.

En modo DEMO: datos locales y simulaciones independientes; las invitaciones, fotos locales y QR no se presentan como funciones reales del servidor.

### 5.2 Alcance del corte conectado

RF-01 a RF-09, con las operaciones mínimas y permisos de [05](05_MATRIZ_API_Y_TRAZABILIDAD.md). CU-12/invitaciones, pagos reales y RF-10/QR conectado permanecen diferidos. La ampliación incluye gastos/caja y cuentas declaradas; no implica reproducir todas las capacidades futuras del modelo conceptual.

### 5.3 Funcionalidades diferidas

Cobros reales mediante Mercado Pago, OAuth por vendedor, webhooks de acreditación, conciliación bancaria, QR de pago parcial real, reservas de stock, devoluciones/reembolsos, producción por lotes, analítica avanzada e importación automática del historial local a la base de datos. No son requisitos comprometidos para el MVP actual salvo decisión posterior.

## 6. Requerimientos funcionales

**Convención de estados:** «DEMO» = interfaz y política local implementadas; «BACKEND PENDIENTE» = faltan endpoints, persistencia y validación de servidor. **La columna «Alcance backend» es una propuesta de priorización, no un compromiso aprobado ni un estado de implementación.**

- **NÚCLEO MVP:** debe contar con casos de uso, endpoints reales y pruebas para la entrega inicial de API.
- **SOPORTE MVP:** capacidad mínima necesaria para que el núcleo funcione; su implementación completa puede diferirse.
- **POST-MVP:** existe en el frontend DEMO, pero la integración con el backend se propone para una fase posterior.

| ID | Requerimiento de alto nivel | Comportamiento esperado | Estado actual | Alcance backend propuesto |
|---|---|---|---|---|
| **RF-01** | Gestionar usuarios y autenticación | Registro, inicio de sesión y acceso seguro a recursos autorizados | API: registro, login, me y logout | **NÚCLEO MVP — obligatorio por consigna** |
| **RF-02** | Gestionar empresas y miembros | Crear y consultar empresas; asociar usuarios mediante membresías y aplicar permisos por empresa | API: empresas, membresías iniciales y permisos; invitaciones pendientes | **NÚCLEO MVP** (membresía y permisos básicos) |
| **RF-03** | Administrar ubicaciones | Crear, editar, consultar y desactivar ubicaciones diferenciando venta y almacenamiento | API conectada | **SOPORTE MVP** (altas/consultas y validaciones mínimas) |
| **RF-04** | Administrar catálogo | Registrar y editar artículos, insumos y servicios con SKU, unidad, precio y estado | API conectada | **NÚCLEO MVP** |
| **RF-05** | Gestionar proveedores y compras | Registrar proveedores y compras; recibir mercadería explícitamente y consultar historial | API conectada | **NÚCLEO MVP** (compra/recepción básica e idempotente) |
| **RF-06** | Controlar inventario | Consultar existencias por ubicación, registrar traslados, conteos y ajustes trazables | API conectada | **NÚCLEO MVP** (existencias/traslados; conteos completos pueden ampliarse) |
| **RF-07** | Registrar ventas y pagos declarados | Registrar ventas, descuentos y uno o más medios cuyo importe total coincida con la venta; descontar stock físico cuando corresponda | API conectada | **NÚCLEO MVP** (ventas transaccionales con pagos declarados) |
| **RF-08** | Gestionar gastos y caja | Registrar gastos; abrir y cerrar jornadas con arqueo e historial de cierres | API conectada | Integrado en este corte |
| **RF-09** | Administrar cuentas financieras declaradas | Registrar bancos y billeteras como referencias para cobros/pagos; controlar estado activo y conservar histórico | API conectada | Integrado en este corte |
| **RF-10** | Gestionar intenciones QR DEMO | Crear, cancelar y aprobar de manera simulada una intención sin tratarla como cobro real | DEMO visual local, sin cobro real | **POST-MVP** (backend QR real no requerido) |

**Advertencia de alcance:** RF-01 a RF-07 no significan siete módulos completos y sin recortes: se especificarán operaciones mínimas aceptables en casos de uso y matriz API antes de implementar. En particular, las ubicaciones son una dependencia real de inventario y recepción; no pueden omitirse sin redefinir esos casos. RF-08 y RF-09 se incorporan en este corte; RF-10 sigue diferido.

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

## 9. API RESTful

La matriz única de rutas, permisos y evidencia está en [05_MATRIZ_API_Y_TRAZABILIDAD.md](05_MATRIZ_API_Y_TRAZABILIDAD.md). Todas las rutas comerciales están bajo `/api/v1/businesses/{business_id}`; el snapshot global contiene únicamente empresas autorizadas de la cuenta.

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

## 13. Trazabilidad del corte integrado

El estado vigente de RF-01 a RF-09, rutas y permisos está en [05](05_MATRIZ_API_Y_TRAZABILIDAD.md). Se preservan la identidad, la creación empresarial idempotente y la política RBAC de Jorge (`b750358`); `business.profile.edit` se aplica ahora al PATCH empresarial. CU-12 sigue pendiente, sin simular permisos de equipo en el modo API.

Cada entrega revisa RF/CU, entidades y cardinalidades afectadas, autorización, pruebas, migraciones y 05. Los diagramas conceptuales se distinguen del esquema implementado en 03; 06 contiene los comandos de comprobación. Publicar código no equivale a CI verde ni a aprobación académica.
