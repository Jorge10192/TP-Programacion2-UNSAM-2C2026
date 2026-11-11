# 03A — Guía de identidad, empresas, ubicaciones, catálogo y proveedores

**Proyecto:** Asistente PyME — Plataforma generalista de gestión multiempresa y multirrubro  
**Materia:** Programación 2 — UNSAM (2C2026)  
**Versión:** 2.1 — **T12-C2** (aprobada y publicada en la rama documental)  
**Fecha de corte:** 11 de noviembre de 2026  
**Referencia funcional:** `main` en `c6a77137cf82dcb9aad225645e84b1265b1da3ec` (PR #45, T11).  
**Documento rector:** [03 — Modelo de dominio y diagramas UML](../03_MODELO_DE_DOMINIO_Y_UML.md), **v2.1**, aprobado y publicado en la rama documental del PR #46.  
**Archivos asociados:** [`03A_CLASES_IDENTIDAD_Y_CATALOGO.puml`](03A_CLASES_IDENTIDAD_Y_CATALOGO.puml) y [`03A_IDENTIDAD_EMPRESAS_CATALOGO_REDISENADO.svg`](03A_IDENTIDAD_EMPRESAS_CATALOGO_REDISENADO.svg).

> **Alcance y estado:** esta guía sustituye conceptualmente la edición **v0.7 (E2-3, 08/11/2026)**. Las ocho clases principales del 03A son **AS-IMPLEMENTED** y están persistidas. El diagrama **no** supone que las funcionalidades fuera de RF-01 a RF-07 tengan backend real. T12-C2 es una actualización exclusivamente documental aprobada: **se publicaron únicamente los tres archivos de 03A en la rama del PR #46; no se modificaron código, base de datos ni `main`**.

![03A — Clases, relaciones y cardinalidades](03A_IDENTIDAD_EMPRESAS_CATALOGO_REDISENADO.svg)

## 1. Finalidad, alcance y regla de interpretación

El 03A responde **quién es una persona dentro del sistema, qué empresas puede integrar, con qué permisos puede actuar y cuáles son los recursos empresariales asociados**. Explica la identidad **global** y la empresa como **tenant** independiente. Una misma persona puede participar en varias empresas y tener distinto rol en cada una.

Las **ocho clases representadas** están respaldadas por modelos reales de SQLAlchemy. Los campos del dibujo utilizan nombres **conceptuales en español**, no la nomenclatura exacta de los DTO HTTP ni de los atributos Python. La fuente `.puml` documenta las asociaciones completas; la lámina `.svg` combina campos para legibilidad. La correspondencia de ambas se comprueba en las tablas siguientes.

Las compras, sus recepciones, los saldos, los movimientos y las ventas están **implementados** en el backend del corte T11; su estructura corresponde al **03B**, no a este diagrama. Los casos de uso y los actores de negocio corresponden al **03C**.

**No está dentro de este 03A:** el DER físico exhaustivo, pantallas de caja y cuentas financieras, QR REAL de Mercado Pago, producción con recetas/lotes, reservas con stock apartado, transferencia de titularidad o auditoría completa de cada cambio histórico de asignación. El documento rector separa ese alcance pendiente.

## 2. Las ocho clases REAL y su correspondencia SQL

| Clase UML | Modelo SQLAlchemy / tabla | Datos y comportamiento relevantes |
|---|---|---|
| `Usuario` | `User` / `users` | UUID; correo normalizado único; `password_hash`; nombre visible; estado `ACTIVO`/`DESHABILITADO`; no contiene rol empresarial global. |
| `Empresa` | `Business` / `businesses` | Nombre, categoría, actividad `PRODUCTOS`/`SERVICIOS`/`MIXTO`, `founder_user_id` histórico y estado `ACTIVA`/`SUSPENDIDA`. |
| `Membresia` | `Membership` / `memberships` | `business_id`, `user_id`, rol, estado `ACTIVA`/`INACTIVA`, puesto opcional; UNIQUE `(business_id,user_id)`. |
| `Invitacion` | `BusinessInvitation` / `business_invitations` | Empresa; emisor obligatorio; email del destinatario; rol propuesto; token SHA-256; vigencia; aceptante y fecha opcionales hasta aceptar. |
| `Ubicacion` | `Location` / `locations` | Empresa, tipo, dirección/mapa, `can_sell`, `can_store`, `is_primary`, `ACTIVA`/`PAUSADA`. |
| `AsignacionUbicacion` | `LocationAssignment` / `location_assignments` | Clave primaria `(business_id,location_id,user_id)` y FKs compuestas hacia sede y membresía del mismo tenant; estado `ACTIVA`/`REVOCADA`. |
| `ArticuloCatalogo` | `CatalogItem` / `catalog_items` | Nombre normalizado, `kind`, unidad, SKU opcional, vendible, precio/costo de referencia en centavos, estado y fechas. |
| `Proveedor` | `Supplier` / `suppliers` | Nombre y `name_key`, referencias de contacto, redes, ofertas, JSONB de medios y promociones, estado `ACTIVO`/`INACTIVO`. |

**Dos tablas técnicas reales que no aparecen como clases centrales de esta lámina:** `AuthSession`/`auth_sessions` (sesiones y token opaco almacenado **solo como hash**) y `BusinessCreationRequest`/`business_creation_requests` (idempotencia del alta empresarial con PK `(actor_user_id,idempotency_key)`). Su exclusión es una decisión de **legibilidad del modelo de negocio**, no una afirmación de que no existen. El Documento 03 contiene el inventario completo de **19 modelos**.

### 2.1 Nomenclatura: clase, atributo conceptual y SQL real

| UML conceptual | Nombre técnico implementado | Precisión |
|---|---|---|
| `Usuario.emailNormalizado` | `users.email_normalizado` | Correo normalizado y único globalmente. |
| `Empresa.fundadorUserId` | `businesses.founder_user_id` | Historia de creación; **no** fuente exclusiva de permiso ni titularidad legal. |
| `Membresia.rol` | `memberships.role` | `TITULAR_ADMINISTRATIVO`, `ADMINISTRADOR`, `ENCARGADO`, `TRABAJADOR`. |
| `Invitacion.emisorUserId` | `business_invitations.invited_by_user_id` | FK obligatoria a identidad global. |
| `Invitacion.aceptanteUserId` | `business_invitations.accepted_by_user_id` | FK opcional, poblada al aceptar. |
| `Invitacion.emailDestinatarioNormalizado` | `business_invitations.email_normalizado` | No se exige una FK previa a `users`. |
| `Ubicacion.canSell / canStore` | `locations.can_sell / can_store` | Capacidades independientes. |
| `Ubicacion.esPrincipal` | `locations.is_primary` | Índice parcial de **máximo una** sede principal activa por empresa. |
| `AsignacionUbicacion.revocadoEn` | `location_assignments.revoked_at` | Coherente con su estado; no guarda todos los ciclos históricos. |
| `ArticuloCatalogo.clase` | `catalog_items.kind` | `ELABORADO`, `REVENTA`, `INSUMO`, `SERVICIO`. |
| `ArticuloCatalogo.tipoDerivado` | `CatalogItem.item_type` (propiedad) | `BIEN`/`SERVICIO` **no** es columna SQL adicional. |
| `ArticuloCatalogo.claveNombre` | `catalog_items.name_key` | Normalización con NFKC/casefold y unicidad por empresa. |
| `ArticuloCatalogo.precioCentavos` | `catalog_items.price_cents` | `BIGINT` o `NULL`; sin cálculo monetario con float. |
| `Proveedor.claveNombre` | `suppliers.name_key` | UNIQUE `(business_id,name_key)` también para inactivos. |
| `Proveedor.metodosPago / promociones` | `suppliers.payment_methods / promotions` | **Dos campos JSONB de arreglo**, no un campo genérico `contacto_jsonb`. |

La entidad `Supplier` también dispone de atributos SQL como `offerings`, `contact_person`, `phone`, `whatsapp`, `email`, `address`, `maps_url`, `website`, `instagram`, `notes` y fechas. El SVG resume estos atributos para no convertir el diagrama de clases en un volcado de todas las columnas.

## 3. Asociaciones UML y multiplicidades verificables

| Asociación | Cardinalidad | Regla real / conceptual |
|---|---|---|
| `Usuario — Membresia` | Usuario **1** ⇄ **0..*** membresías | Cada membresía corresponde a un usuario; un usuario puede no tener empresa. |
| `Empresa — Membresia` | Empresa **1** ⇄ **1..*** membresías en una empresa creada válidamente | La transacción de alta crea el primer titular. **El mínimo 1 no se impone por una FK o CHECK aislados.** |
| `Usuario — Empresa` | Usuario fundador **1** ⇄ **0..*** empresas | Cada empresa almacena `founder_user_id` obligatorio e histórico. |
| `Empresa — Invitacion` | Empresa **1** ⇄ **0..*** invitaciones | Toda invitación pertenece a una empresa. |
| `Usuario — Invitacion` (emisor) | Usuario emisor **1** ⇄ **0..*** invitaciones emitidas | `invited_by_user_id` obligatorio. |
| `Usuario — Invitacion` (aceptante) | Usuario aceptante **0..1** ⇄ **0..*** invitaciones aceptadas | `accepted_by_user_id` es opcional hasta aceptación. |
| `Empresa — Ubicacion` | Empresa **1** ⇄ **0..*** ubicaciones | La empresa nace con cero sedes; no crea depósito ficticio. |
| `Membresia — AsignacionUbicacion` | Membresía **1** ⇄ **0..*** asignaciones | FK `(business_id,user_id)` hacia la membresía del tenant. |
| `Ubicacion — AsignacionUbicacion` | Ubicación **1** ⇄ **0..*** asignaciones | FK `(business_id,location_id)` hacia la sede del tenant. |
| `Empresa — ArticuloCatalogo` | Empresa **1** ⇄ **0..*** artículos | Artículo siempre acotado a un tenant. |
| `Empresa — Proveedor` | Empresa **1** ⇄ **0..*** proveedores | Proveedor opcional en compras; referencia propia de una empresa. |

**Lectura de 0..1 vs 0..*:** en la relación del aceptante de una invitación, **cada invitación** admite cero o un usuario aceptante, pero **un usuario** puede aceptar muchas invitaciones a distintas empresas. No se debe invertir la multiplicidad.

La pertenencia empresarial de `location_assignments` no es solo una promesa documental: la PK triple y las FKs compuestas restringen referencias cruzadas. El backend comprueba además los permisos; **FK correcta no equivale a autorización**.

## 4. Reglas críticas del dominio

### 4.1 Usuario global, sesión y titularidad

Al registrarse, una persona obtiene una identidad global con email normalizado y contraseña almacenada como hash. Las autorizaciones comerciales se resuelven mediante **su membresía activa en la empresa seleccionada** y no a partir de un rol en la tabla `users`.

La creación de empresa guarda Empresa y Membresía inicial `TITULAR_ADMINISTRATIVO` **en una misma transacción**. `founder_user_id` identifica un hecho histórico, no propiedad legal, ni una autorización independiente de la membresía actual. El índice parcial `uq_memberships_one_active_owner` establece **a lo sumo un titular ACTIVO**, no existencia obligatoria de uno en todos los estados SQL posibles.

El servicio de edición de equipo impide **autoedición** y la modificación de membresías de rol `TITULAR_ADMINISTRATIVO`, incluidas las que se encuentran inactivas. La aceptación de invitaciones no puede reescribir la titularidad histórica. **No hay transferencia de titularidad pública implementada**; por ello tampoco se documenta un supuesto flujo de degradación transaccional como si existiera.

Las sesiones (`AuthSession`) emplean token opaco y hash; la sesión de React REAL se conserva en memoria del cliente, por lo que refrescar (`F5`) exige volver a autenticarse en el corte actual. Un mecanismo de persistencia segura de sesión sería evolución **post-T12** y no debe confundirse con el diseño ya implementado.

### 4.2 Invitación: identidad, vigencia y aceptación

`BusinessInvitation` almacena `business_id`, emisor obligatorio, destinatario por email, `proposed_role` limitado a **ENCARGADO** o **TRABAJADOR**, token hasheado, estado, vencimiento y datos de aceptación opcionales. Estados posibles: `PENDIENTE`, `ACEPTADA`, `RECHAZADA`, `CANCELADA`, `EXPIRADA`.

El índice parcial único impide dos filas **PENDIENTE** para el mismo `(business_id,email_normalizado)`. La fecha vencida debe validarse al utilizar la invitación; no implica que una tarea automática cambie inmediatamente su columna `status`.

**CU-12:** invitar no concede acceso. La aceptación exige usuario autenticado cuyo email corresponda y, en una misma transacción, consume la invitación y crea/reactiva la Membresía sin duplicar `(business_id,user_id)`.

### 4.3 Sedes, asignaciones y permisos reales

`Location` admite `LOCAL`, `FERIA`, `DEPOSITO`, `OFICINA`, `CASA`, `OTRO`; tiene `ACTIVA`/`PAUSADA`, atributos de contacto y capacidades `can_sell` y `can_store`. No se crea ninguna sede al registrar la empresa. Si una sede principal se pausa, pierde `is_primary`; reactivarla no recupera automáticamente ese indicador. SQL permite **0 o 1** ubicación principal activa en un tenant, no exige una.

`LocationAssignment` vincula una membresía y una ubicación del **mismo tenant**, se activa/revoca sin borrar físicamente la fila y no otorga un quinto rol de empresa.

**Política SELL/STORE implementada:**

- `TITULAR_ADMINISTRATIVO` y `ADMINISTRADOR` pueden operar bajo las capacidades de la sede sin asignación individual.
- `ENCARGADO` y `TRABAJADOR` requieren **membresía activa y asignación activa a esa sede**, además de empresa/sede activas y capacidad apropiada.
- **Recepcionar bienes:** STORE en la sede de destino.
- **Trasladar:** STORE en origen y destino, sin traslado entre empresas.
- **Vender bienes físicos:** SELL **y** STORE sobre la sede de venta, porque la confirmación también descuenta existencias.
- **Servicios:** no se genera salida automática de insumos; las condiciones específicas de sede y rol se aplican según el comando.
- **Administrar compra / stock inicial / ajustes:** no todos los roles tienen idénticas facultades. Crear compra y fijar stock inicial corresponde a titular/administrador; los ajustes ordinarios pueden admitir encargado conforme al servicio. No extrapolar estos permisos a trabajador.

Estas políticas se utilizan en los bloques **E2-4 (compras/recepción), E2-5 (stock), E2-6/E2-7 (ventas POS)**. La guía v0.7 que las llamaba «futuras» está desactualizada.

### 4.4 Artículo de catálogo

`CatalogItem` diferencia `kind` comercial (`ELABORADO`, `REVENTA`, `INSUMO`, `SERVICIO`) del `item_type` derivado (`BIEN`/`SERVICIO`). El SKU, si se informa, es único dentro de una empresa; el nombre normalizado es único incluso al desactivar una ficha. Los campos de precio y costo de referencia son enteros en centavos o `NULL`.

Una ficha `ACTIVO` no implica que exista stock; **crear catálogo no crea saldo**. La política de venta toma precios de catálogo y permite variaciones según rol: trabajadores y encargados no pueden imponer descuentos ni reemplazar el precio vigente con otro valor; un artículo sin precio de lista no puede venderse por esos roles. El artículo solo de servicio puede venderse sin descontar existencias físicas.

Las líneas históricas de compras y ventas guardan snapshots de descripción, tipo, unidad, SKU e importe para no reescribir transacciones ya confirmadas cuando se modifica el catálogo.

### 4.5 Proveedor real, no TO-BE

`Supplier` ya tiene tabla `suppliers`, lógica de lectura/edición y estados **ACTIVO/INACTIVO**. La unicidad `(business_id,name_key)` se aplica también a inactivos. Se conservan contacto, redes, ofertas y condiciones comerciales; `payment_methods` y `promotions` son **arreglos JSONB** con restricciones de estructura y tamaño.

En compras el proveedor es **opcional**. Cuando una compra se asocia con un proveedor activo del mismo tenant, el documento comercial conserva `supplier_name_snapshot`. Desactivar o cambiar el proveedor no altera el histórico. Las condiciones de pago almacenadas son **descripciones comerciales**, no acreditaciones bancarias ni una integración REAL con Mercado Pago.

## 5. Recorridos operativos para explicar en la defensa

| Recorrido | Resultado | Vinculación con el UML |
|---|---|---|
| CU-01/CU-02 | Registro y acceso de cuenta global | `Usuario` y sesión técnica omitida del dibujo principal. |
| CU-03 | Empresa y titular inicial, sin sede ni stock | `Usuario` (fundador histórico), `Empresa`, `Membresia`. |
| CU-12 | Emisión/aceptación segura de invitación | `Empresa`, `Usuario` emisor/aceptante, `Invitacion`, `Membresia`. |
| CU-04 | Alta, edición y estados de sede; asignaciones | `Empresa`, `Ubicacion`, `AsignacionUbicacion`, `Membresia`. |
| CU-05 | Alta, consulta y edición de ficha vendible | `Empresa`, `ArticuloCatalogo`; normalización y baja lógica. |
| CU-06/CU-07 | Compra y recepción física posterior | `Proveedor` (opcional), `ArticuloCatalogo`, `Ubicacion` (destino); detalle completo en 03B. |
| CU-08/CU-09/CU-11 | Consulta de saldos, traslado y ajustes | `Ubicacion`, `AsignacionUbicacion`, `ArticuloCatalogo`; movimientos en 03B. |
| CU-10 | Venta en POS REAL, física o de servicio | `ArticuloCatalogo`, sede SELL/STORE, membresía del actor; venta y pagos en 03B. |

El sistema contempla **múltiples empresas y rubros**. WALOS es solamente un ejemplo; estas clases no deben especializarse para una tienda de mascotas.

## 6. Integridad: diferenciación de SQL y de servicios

| Garantía | Restricción persistente | Validación adicional de aplicación |
|---|---|---|
| Identidad única | `uq_users_email_normalizado` | Normalización, contraseña, sesión vigente. |
| Equipo sin duplicados | `uq_memberships_business_user` | Asignaciones y protección del titular. |
| Titular activo único | Índice parcial `uq_memberships_one_active_owner` | Creación inicial atómica; bloqueo de ediciones de titular. |
| Invitaciones sin duplicados pendientes | Índice parcial `uq_business_invitations_pending_email` | Vencimiento, email del aceptante, reintentos. |
| Principal única activa | Índice parcial `uq_locations_one_active_primary` | Transición `PAUSADA` y nueva principal transaccional. |
| Asignaciones de mismo tenant | PK triple y FKs compuestas | Rol, estado y permisos SELL/STORE. |
| SKU único de empresa | Índice único parcial por `(business_id,sku)` cuando SKU no es `NULL` | Normalización y controles de artículo. |
| Proveedor único por nombre de empresa | `uq_suppliers_business_name` | Normalización, estado y verificación antes de comprar. |
| Transacciones históricas | FKs y snapshots en tablas comerciales | Operaciones atómicas; sin borrado en cascada del historial. |

**Importante:** los índices de «a lo sumo uno» no significan «exactamente uno» a nivel SQL. La regla de disponer de titular inicial resulta de la operación de alta. Los roles se validan por empresa, no por una propiedad global de `User`.

## 7. Diferencia entre PlantUML, SVG y DER físico

La fuente `.puml` es un **diagrama de clases UML editable**, con las **ocho clases y once asociaciones** explícitas y sus multiplicidades. La lámina `.svg` es una **representación vectorial editorial** de esas mismas clases y asociaciones: simplifica o combina algunos campos del cuadro para que el texto no desborde. **No es un renderizado literal de PlantUML**; un motor PlantUML redistribuirá las cajas si se lo compila directamente.

Para evitar falsa equivalencia:

1. Ambas versiones deben mostrar **`AsignacionUbicacion`**, a diferencia del SVG antiguo, y conservar emisor y aceptante de `Invitacion`.
2. Ambas deben mostrar a **`Proveedor` como REAL** y a catálogo/ubicaciones como recursos ya utilizados por operaciones comerciales.
3. Ambas deben distinguir `item_type` derivado de columna SQL y fundador histórico de titularidad actual.
4. Las líneas de asociación del SVG usan colores por tema y algunas trayectorias ortogonales; se deben leer por sus **etiquetas y extremos**, no como nuevas clases.
5. La fuente de verdad para FKs, tipos físicos, índices y columnas completas son SQLAlchemy/Alembic; el **DER físico post-T12** podrá generarse desde PostgreSQL con una herramienta como DBeaver sin reemplazar 03A.

El diagrama no incluye `Supplier → Purchase` ni otras asociaciones comerciales con clases ausentes; esto no indica que no existan. Se desarrollan en 03B. Asimismo, la relación `Empresa — Membresia` de **1 a 1..*** representa el invariante de la empresa creada válidamente, pero SQL por sí solo no puede garantizar ese mínimo usando solamente la FK de `Membership`.

## 8. Evidencia y límites de validación

**Base contrastada:** modelos SQLAlchemy `User`, `Business`, `Membership`, `BusinessInvitation`, `Location`, `LocationAssignment`, `CatalogItem`, `Supplier`, junto con las políticas y servicios del corte `main` `c6a77137`. El Documento 03 v2.1 aprobado contiene el inventario más amplio de 19 modelos, operaciones transaccionales y límites de seguridad.

**Evidencia histórica T11** (no reejecutada para crear estas láminas): pipeline de QA integral [GitHub Actions run 43015544889](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/43015544889), con **892 Pytest, 38 Playwright REAL y 6 DEMO** informados en el cierre previo. La existencia de esas pruebas no sustituye la revisión visual/semántica de esta nueva documentación.

**Control de publicación:** se revisaron las entidades, asociaciones y cardinalidades del `.puml` y su equivalencia semántica con el SVG editorial, así como la integridad XML de este último. La compilación de la fuente `.puml` con el motor PlantUML **queda pendiente** de un entorno con el ejecutable instalado; no se presenta como una validación realizada. Los enlaces se comprueban tras la publicación. El SVG propuesto se generó como vector gráfico y se visualizó; no es una exportación directa del motor PlantUML.

## 9. Qué cambió con respecto a v0.7 (08/11/2026)

| Punto | Versión anterior | Propuesta T12-C2 |
|---|---|---|
| Proveedor | Figura con implementación futura/TO-BE | `Supplier`/`suppliers` **REAL**, nombre normalizado, contacto y JSONB. |
| Comercio | Compra/inventario/venta proyectados | E2-4/E2-5/E2-6/E2-7 ya implementados. |
| Sedes | SELL/STORE declarados como futuros | Capacidad y asignación aplicadas en comandos reales. |
| Asignación de sede | En PlantUML, omitida del SVG | **Incluida en ambos** y asociada a membresía y ubicación. |
| Invitación aceptada | Enlace opcional solo en PUML | Emisor y aceptante visibles en ambas representaciones. |
| Cabecera | E2-3, 8/11/2026 | T12-C2, corte T11/11-11-2026, Documento 03 v2.1. |
| PlantUML y SVG | Sin comprobación de equivalencia vigente | Matriz de asociaciones y regla explícita de simplificación editorial. |
| Sesiones e idempotencia | No siempre diferenciadas del negocio | Modelos de soporte SQL reales documentados, fuera de la lámina central. |

**Corrección al prompt de apoyo:** el SVG v0.7 **sí contiene nombres de clases y atributos visibles**. El hallazgo verificable es que la imagen editorial era una **representación parcial** frente al `.puml`, particularmente por la ausencia de `AsignacionUbicacion` y el aceptante opcional. No es correcto presentarlo como una imagen sin texto.

## 10. Preguntas útiles para la defensa académica

**¿Por qué Usuario no tiene rol?** Porque una identidad puede trabajar para muchas empresas, con roles distintos; `Membership` determina acceso contextual.

**¿Qué diferencia hay entre fundador y titular?** El fundador es un UUID histórico inmutable; los permisos provienen de la membresía vigente. El índice parcial evita dos titulares activos pero no impone que exista uno sin servicio.

**¿Por qué una clase de asignación y no una relación simple?** La relación miembro–sede posee datos propios (`status`, `revoked_at`) y necesita FKs compuestas para validar el tenant. Es una entidad asociativa real con PK triple.

**¿Puede una feria vender y almacenar?** Sí, `can_sell` y `can_store` son independientes. La operación física requiere capacidades acordes y asignación para roles operativos.

**¿Por qué Proveedor está en este diagrama pero Compra no?** 03A muestra recursos empresariales principales. Su participación opcional en compras y el snapshot de proveedor se explican en 03B.

**¿Se guardan pagos en el Proveedor?** No: `payment_methods` contiene información comercial referencial. No representa conciliación, pago acreditado ni QR REAL de Mercado Pago.

**¿Por qué no dibujar `AuthSession`?** Se conserva en PostgreSQL pero es infraestructura de autenticación, no una nueva relación conceptual de catálogo, sedes o membresía. El Documento 03 contiene las tablas técnicas.

## 11. Pendientes y criterio de aprobación de T12-C2

- [x] Conciliación de clases SQLAlchemy, campos representativos y relaciones principales contra el corte T11.
- [x] Proveedor marcado REAL, atributos de contacto y arreglos JSONB.
- [x] Aplicación vigente de SELL/STORE y condiciones de rol/asignación.
- [x] `AsignacionUbicacion`, invitador y aceptante reflejados en la representación SVG editorial.
- [x] Documentación de clases omitidas por razones de alcance (`AuthSession`, `BusinessCreationRequest`).
- [x] Nuevo SVG vectorial y vista previa raster para revisión.
- [x] Confirmación visual y aprobación expresa del usuario; no se solicitaron cambios estructurales.
- [ ] Validación de sintaxis con un ejecutable PlantUML (si no está disponible en el entorno, usar el instalado por el equipo).
- [x] Aprobación expresa y reemplazo de los **tres** archivos actuales de 03A en la rama documental del PR #46.
- [ ] Control posterior de enlaces en GitHub y conciliación cruzada con 03B/03C en T12-C5.

**Publicación aprobada:** se conservó sin modificaciones el Documento 03 v2.1 y el código frontend/backend/SQL. Se reemplazaron exclusivamente los tres archivos 03A en la rama documental del PR #46, que permanece en DRAFT sin merge a `main`. El siguiente paso es **T12-C3: 03B — Compras, recepción, inventario y ventas**.
