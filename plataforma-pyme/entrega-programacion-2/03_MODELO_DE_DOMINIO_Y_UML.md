# 03 — Modelo de dominio y diagramas UML

**Proyecto:** Asistente PyME — Plataforma generalista de gestión multiempresa y multirrubro  
**Materia:** Programación 2 — UNSAM, segundo cuatrimestre de 2026  
**Versión:** 2.1 — E2-7 / T12-C1 (aprobado para publicación documental)  
**Fecha de corte:** 11 de noviembre de 2026  
**Referencia funcional:** `main` `c6a77137cf82dcb9aad225645e84b1265b1da3ec` (merge PR #45, T11).  
**Referencia documental:** PR #46, rama `docs/e2-7-t12-cierre-academico`, **documento actualizado en T12-C1**.  
**Estado documental:** **T12-C1 aprobado y publicado en rama documental; PR #46 permanece DRAFT**. Redacción AS-IMPLEMENTED contrastada con modelos ORM, reglas de servicio y migraciones del corte técnico; los diagramas 03A/03B/03C, sus SVG y guías permanecen pendientes de conciliación en T12-C2/C3/C4 y revisión transversal T12-E. **No se ejecutaron pruebas nuevas para elaborar este documento.**
**Decisión de publicación:** aprobada expresamente la sustitución del Documento 03 en la rama documental el 11/11/2026. Esta aprobación no autoriza merge a `main` ni modificaciones del código o la base de datos.

> **Convención de lectura.** Este texto describe el núcleo **REAL** ya implementado al corte indicado. Los aspectos **DEMO**, **DIFERIDOS** y **PROPUESTOS POST-T12** se indican expresamente. No confundir un modelo de dominio conceptual con una reproducción exhaustiva de todas las columnas del esquema SQL; la [matriz de trazabilidad del Documento 05](05_MATRIZ_API_Y_TRAZABILIDAD.md) y el código son la fuente de verdad de la API. Los diagramas gráficos publicados previamente siguen pendientes de actualización en T12-C2/C3/C4.

---

## 1. Objetivo y límites del documento

El modelo explica cómo una identidad global administra o integra varias empresas aisladas (*tenants*), cómo se registran recursos comerciales y cómo se preserva la integridad de compras, recepciones, saldos, movimientos y ventas. Se documentan **entidades, asociaciones, cardinalidades, estados, restricciones, autorización y operaciones atómicas**, así como la relación entre las clases conceptuales y las entidades persistidas.

**Núcleo vigente:** RF-01 a RF-07 y CU-01 a CU-12, con React REAL, FastAPI y PostgreSQL. Esta clasificación identifica las capacidades nucleares implementadas, no una equivalencia total entre el backend y todos los componentes visuales de la DEMO. **No son backend REAL del recorte:** RF-08 (gastos/jornadas de caja), RF-09 (cuentas financieras) y RF-10 (QR ilustrativo/cobro Mercado Pago). Sus pantallas DEMO no acreditan dinero, no son contabilidad bancaria y no deben mutar la API REAL. Tampoco se implementaron reservas de stock, producción por receta/lotes, recepción parcial o multidestino, devoluciones, reembolsos, conciliación bancaria, OAuth ni webhooks de Mercado Pago.

La plataforma es multirrubro; **WALOS es solo un ejemplo de negocio**. La creación de una empresa no crea ficticiamente locales, productos ni saldos. Es válido operar como empresa de servicios sin inventario físico.

### 1.1 Criterios de evidencia

- **Implementado:** clase, contrato, migración o regla verificable en el corte de código indicado.
- **Probado:** existe evidencia de ejecución referenciada; no confundir ejecución anterior de T11 con una ejecución nueva de T12.
- **Conceptual:** relación o nombre útil para comprender el negocio, aunque no tenga tabla con el mismo nombre.
- **Diferido:** funcionalidad o evolución propuesta que no debe aparecer en UML como persistencia operativa.
- **Histórico:** texto perteneciente a un corte anterior, sin precedencia sobre esta versión.
- **Propuesto post-T12:** objetivo explícito de evolución, sin clases persistidas, rutas ni pruebas actualmente acreditadas.
- **No certificado:** que un contrato y una prueba existan no prueba preparación para producción, acreditación bancaria o accesibilidad integral.

## 2. Vocabulario y convenciones

| Concepto | Significado vigente |
|---|---|
| **Usuario** | Identidad global; no tiene rol empresarial global. |
| **Empresa / tenant** | Ámbito independiente de datos, permisos y registros comerciales. |
| **Membresía** | Vínculo Usuario–Empresa con rol y estado; habilita autorización contextual. |
| **Asignación** | Vínculo de miembro a sede; condiciona SELL/STORE para roles operativos. |
| **Ubicación** | Local, feria, depósito, oficina, casa u otro espacio con capacidades `can_sell` y `can_store` separadas. |
| **Artículo** | Registro de catálogo: elaborado, reventa, insumo o servicio. `BIEN`/`SERVICIO` es una clasificación **derivada** del tipo de artículo. |
| **Proveedor** | Contacto comercial de una empresa; no es usuario autenticado por ser proveedor. |
| **Compra** | Registro de adquisición; no modifica existencias por sí mismo. |
| **Recepción** | Confirmación física completa y única de los bienes de una compra hacia una sede. |
| **Saldo** | Proyección transaccional por empresa, sede y artículo, con versión. |
| **Movimiento** | Hecho inmutable de entrada/salida que permite reconstruir el origen de la variación. |
| **Operación inventario** | Agrupación de traslado, ajuste de entrada/salida o carga inicial. |
| **Venta** | Hecho comercial `CONFIRMADA`, con detalle, pagos **declarados** y eventual débito físico. |
| **Idempotencia** | Misma identidad de solicitud + mismo contenido + actor/ámbito produce el mismo efecto, no duplicados. |

**Dinero:** enteros de centavos, sin `float` persistido. **Cantidades:** enteros en milésimas (`quantity_milli`, `delta_milli`); unidades discretas como `UNIDAD`, `PAQUETE`, `CAJA` y `SERVICIO` requieren múltiplos de 1.000 cuando corresponda. **Redondeo comercial:** `HALF_UP` por **línea**, no por subtotal agregado.

La nomenclatura de dominio (por ejemplo, `MovimientoInventario`) sirve para explicar el concepto. La implementación utiliza nombres Python/SQL en inglés (`StockMovement`, `stock_movements`). No inferir que el nombre UML es una tabla distinta.

## 3. Inventario de clases persistentes — correspondencia conceptual ↔ ORM ↔ SQL

**Resultado del inventario:** 19 modelos ORM de dominio e infraestructura identificados en `backend/app/infrastructure/models/` (sin contar `base.py` ni `__init__.py`). El esquema vigente se deriva de migraciones hasta `e26a_sales_foundation`.

| Área | Clase conceptual / soporte | Modelo SQLAlchemy | Tabla SQL |
|---|---|---|---|
| Identidad | Usuario | `User` | `users` |
| Identidad | Sesión técnica | `AuthSession` | `auth_sessions` |
| Empresa | Empresa | `Business` | `businesses` |
| Empresa | Membresía | `Membership` | `memberships` |
| Empresa | Invitación | `BusinessInvitation` | `business_invitations` |
| Soporte | Solicitud de creación empresarial | `BusinessCreationRequest` | `business_creation_requests` |
| Sedes | Ubicación | `Location` | `locations` |
| Sedes | AsignaciónUbicación | `LocationAssignment` | `location_assignments` |
| Catálogo | ArtículoCatalogo | `CatalogItem` | `catalog_items` |
| Proveedores | Proveedor | `Supplier` | `suppliers` |
| Compras | Compra | `Purchase` | `purchases` |
| Compras | DetalleCompra | `PurchaseLine` | `purchase_lines` |
| Recepción | Recepción | `PurchaseReceipt` | `purchase_receipts` |
| Inventario | SaldoInventario | `StockBalance` | `stock_balances` |
| Inventario | MovimientoInventario | `StockMovement` | `stock_movements` |
| Inventario | OperaciónInventario | `InventoryOperation` | `inventory_operations` |
| Ventas | Venta | `Sale` | `sales` |
| Ventas | DetalleVenta | `SaleLine` | `sale_lines` |
| Ventas | AplicaciónPago | `SalePayment` | `sale_payments` |

**Corrección respecto del diagrama anterior:** no existe en el esquema vigente una tabla genérica `SolicitudIdempotente` para todos los comandos. `BusinessCreationRequest` protege específicamente la creación empresarial; `Purchase`, `PurchaseReceipt`, `InventoryOperation` y `Sale` conservan `request_id` y digest de la solicitud en su propio registro. La idempotencia es una **regla distribuida por agregado**, no una única asociación física universal.

## 4. Identidad, empresa y equipo (RF-01, RF-02 y RF-03)

### 4.1 Usuario, sesión y titularidad

`User` representa la identidad global. El correo normalizado es único, la contraseña se conserva como hash y el usuario puede tener múltiples membresías. `AuthSession` registra el hash del token, su vencimiento y eventual revocación; **el token opaco en claro no es una relación de empresa ni un dato del UML comercial**. El frontend REAL conserva el Bearer **solo en memoria de ejecución** y requiere volver a iniciar sesión al refrescar la página (`F5`). Esto es una **limitación de experiencia vigente** y una decisión de seguridad, no una falla de integridad del modelo.

**Evolución post-T12 (no implementada):** estudiar un mecanismo de sesión renovable mediante cookies `HttpOnly`, `Secure` y `SameSite` y medidas apropiadas contra CSRF, fijación de sesión y uso indebido. No guardar Bearer en `localStorage` o `sessionStorage` sin un análisis de amenazas, ni presentar el mecanismo futuro como ya disponible.

`Business` guarda nombre, rubro/categoría, tipo de actividad (`PRODUCTOS`, `SERVICIOS`, `MIXTO`), estado y `founder_user_id` **histórico**. Al crear la empresa, la transacción produce la empresa y la membresía inicial `TITULAR_ADMINISTRATIVO` activa, sin crear una ubicación por defecto. No interpretar el fundador histórico como titular legal ni como una autorización perpetua independiente de la membresía.

`Membership` une un usuario con una empresa, con PK independiente, rol y estado. Se exige `UNIQUE(business_id,user_id)`. Los roles persistidos son `TITULAR_ADMINISTRATIVO`, `ADMINISTRADOR`, `ENCARGADO`, `TRABAJADOR`; los estados son `ACTIVA` e `INACTIVA`. El índice parcial `uq_memberships_one_active_owner` garantiza **a lo sumo un titular activo** en una empresa; **no prueba por sí solo que siempre exista uno**. La **existencia inicial** del titular la asegura la creación transaccional empresa+membresía; las modificaciones posteriores están restringidas por el servicio. En particular, el método de edición del equipo rechaza tanto la autoedición de la propia membresía como la modificación de una membresía de rol `TITULAR_ADMINISTRATIVO` (incluidas las históricas), por lo que **no existe actualmente una operación pública para degradar o revocar al titular**. La aceptación de invitación tampoco debe sobrescribir una titularidad histórica. **No es correcto proponer aquí una regla de servicio `COUNT(owners) > 1`** como si estuviera implementada: la transferencia de titularidad está diferida. El índice SQL, por sí solo, impone solamente *a lo sumo uno* activo.

### 4.2 Invitaciones y aceptación

`BusinessInvitation` conserva empresa, emisor obligatorio, correo normalizado del destinatario, rol propuesto, hash del token, vencimiento, estado y, tras aceptación, aceptante y fecha. **No exige que exista previamente un `User` para el correo invitado**. Una invitación pendiente no crea membresía ni permisos. La aceptación autenticada verifica identidad/correo y crea o reactiva la membresía en una misma transacción.

Estados almacenables: `PENDIENTE`, `ACEPTADA`, `RECHAZADA`, `CANCELADA`, `EXPIRADA`. No equiparar fecha de vencimiento superada con transición física inmediata del valor `status`: la vigencia se comprueba durante la operación. El rol propuesto en la invitación está restringido a `ENCARGADO` o `TRABAJADOR`; no se permite invitar un titular por este mecanismo. Existe un índice parcial de invitación pendiente única por empresa/correo y el secreto solo se persiste como hash SHA-256.

### 4.3 Ubicaciones y asignaciones

`Location` pertenece a una empresa; admite `LOCAL`, `FERIA`, `DEPOSITO`, `OFICINA`, `CASA` u `OTRO`, estado `ACTIVA`/`PAUSADA`, campos de referencia de dirección/mapa, capacidades independientes `can_sell` y `can_store`, e indicador `is_primary`. Un índice parcial garantiza **a lo sumo una sede principal activa** por empresa; no exige al menos una. Pausar una principal retira esa condición; reactivarla no la restituye automáticamente.

`LocationAssignment` vincula `(business_id, location_id, user_id)` y guarda estado `ACTIVA`/`REVOCADA`, con fecha de revocación. Sus claves foráneas compuestas verifican que la sede y la membresía pertenecen al mismo tenant. **La asignación no crea un rol empresarial nuevo**.

**Autorización operacional vigente:**

- Titular y administrador actúan conforme a permisos empresariales y capacidades de la ubicación, sin requerir asignación individual a cada sede.
- Encargado y trabajador necesitan membresía activa y **asignación activa en la sede** para operaciones SELL/STORE; la asignación se revalida en FastAPI, incluso si React no muestra una sede.
- `can_sell` no implica `can_store`, ni viceversa. Transferencias exigen STORE en **origen y destino**. Una venta de bien físico exige **SELL y STORE en su misma sede**: SELL para operar la venta y STORE para descontar las existencias. La lectura de saldos puede abarcar sedes del propio tenant sin conceder derecho a operar allí.
- Los permisos por función no son idénticos: por ejemplo, crear una compra requiere titular/administrador; `STOCK_INICIAL` requiere titular/administrador, mientras los ajustes ordinarios también pueden ser autorizados para encargado conforme al servicio. No afirmar que todo trabajador puede ajustar saldos.

La autorización efectiva siempre depende del backend: usuario, sesión, membresía, empresa, rol, sede, estado, capacidad y asignación según corresponda.

## 5. Catálogo y proveedores (RF-04, RF-05)

`CatalogItem` pertenece a un tenant y registra `kind` (`ELABORADO`, `REVENTA`, `INSUMO`, `SERVICIO`), nombre y clave de normalización, categoría, SKU opcional, unidad, condición `sellable`, precio y costo referencial opcionales en centavos, estado y metadatos. `BIEN`/`SERVICIO` se **deriva** de `kind`; no es otra columna persistida. Un servicio utiliza unidad `SERVICIO`; los bienes utilizan unidades físicas compatibles.

El nombre normalizado es único por empresa; el SKU normalizado es único **cuando se informa**, incluso para artículos inactivos. `ACTIVO`/`INACTIVO` son bajas lógicas: las transacciones históricas conservan el snapshot y la FK. El alta del artículo **no crea existencias**. Una ficha inactiva no debe venderse como operación nueva.

`Supplier` es **REAL**, no TO-BE: mantiene nombre y clave normalizada única por empresa, datos de contacto, redes, referencias, notas, métodos de pago y promociones referenciales en JSONB, más estado `ACTIVO`/`INACTIVO`. Una compra puede no tener proveedor; si lo tiene, se valida el tenant y se conserva el nombre histórico del proveedor. La información comercial del proveedor **no implica pagos acreditados ni cuentas bancarias integradas**.

## 6. Compras y recepciones (RF-05; CU-06 y CU-07)

### 6.1 Compra y detalle

`Purchase` contiene `business_id`, `request_id`, `request_sha256` (nullable en el modelo por compatibilidad), proveedor opcional, `supplier_name_snapshot`, fecha de compra, estado, importe total, referencia/notas, actor y fecha de creación. `PurchaseLine` contiene su empresa, compra, `line_number`, artículo opcional, snapshots de descripción, tipo, unidad y SKU, cantidad, costo unitario y total de línea.

La línea puede ser un **bien físico**, **servicio** o **concepto libre sin artículo**. Solo los bienes de catálogo originan recepción de existencias. La API calcula montos desde cantidades y costos con regla exacta de redondeo; el cliente no puede imponer un subtotal inconsistente. El registro de la compra **no modifica stock**.

**Estados en el modelo SQL:**

| Estado | Sentido y transición vigente |
|---|---|
| `REGISTRADA` | Compra con bienes físicos pendiente de recepción. |
| `RECIBIDA` | Compra física tras una recepción completa confirmada. |
| `CERRADA_SIN_RECEPCION` | Compra exclusivamente de servicios/conceptos que no admite ingreso físico. |
| `CANCELADA` | **Capacidad del esquema SQL, endpoint público diferido**. Que el CHECK permita el valor no implementa la transición ni una operación `PATCH/POST` de cancelación. |

### 6.2 Recepción completa

`PurchaseReceipt` almacena empresa, compra, ubicación STORE, `request_id`, `request_sha256`, actor, momento de confirmación y `balances_after` JSONB (snapshot de respuesta, **no** segundo saldo autoritativo). Una compra puede poseer **0..1** recepción y la unicidad `(business_id,purchase_id)` impide una segunda confirmación física. La recepción del MVP es **completa y en un único destino**. Servicios/conceptos no crean movimientos.

La transacción revalida membresía, capacidades STORE y estado de sede; persiste recepción, mueve balances y genera movimientos por líneas físicas, marcando compra como `RECIBIDA`. Fallar en cualquier paso deja rollback íntegro. Repetir con igual clave/cuerpo/actor recupera el resultado; volver a recibir con otra clave no crea una segunda recepción.

## 7. Inventario físico, ledger y operaciones (RF-06; CU-08, CU-09, CU-11)

### 7.1 Saldo y unidades

`StockBalance` utiliza PK compuesta `(business_id,location_id,catalog_item_id)`, `quantity_milli >= 0` y `version` positiva, con fecha de actualización. Representa el saldo materializado para consultar y proteger concurrencia; **no reemplaza** al ledger de hechos. Una fila ausente se interpreta como cero para decidir una salida; no se inventan existencias. Para una primera entrada se usa creación/actualización concurrente segura, no lectura+inserción sin control.

### 7.2 Movimiento auditable

`StockMovement` guarda empresa, sede, artículo, actor, tipo de evento, delta firmado y fecha, más referencias de origen compatibles. En el esquema actual aparecen: `receipt_id`, `purchase_line_id`, `inventory_operation_id`, `operation_kind`, `sale_id`, `sale_line_id`.

La regla no es simplemente “tres FK opcionales”: `ck_stock_movements_origin_and_sign` verifica **combinaciones permitidas** de origen, evento y signo. Ejemplos:

| Evento | Identificador de origen | Efecto |
|---|---|---|
| `COMPRA_RECEPCION` | `receipt_id` + `purchase_line_id` | Delta positivo por bien recibido. |
| `TRASLADO_SALIDA` | `inventory_operation_id` + `operation_kind=TRASLADO` | Delta negativo en sede origen. |
| `TRASLADO_ENTRADA` | Misma operación de traslado | Delta positivo en sede destino. |
| `AJUSTE_ENTRADA` / `AJUSTE_SALIDA` | Operación de inventario del tipo coherente | Delta positivo/negativo según caso. |
| `STOCK_INICIAL` | Operación de inventario de carga inicial | Alta inicial positiva, con reglas de ausencia de historia. |
| `VENTA_SALIDA` | `sale_id` + `sale_line_id` | Delta negativo por línea física vendida. |

Los nombres y variantes exactas están restringidos por el CHECK vigente; no agregar un tipo nuevo a la documentación sin cotejar el modelo. Existen FK compuestas por empresa y unicidades que impiden duplicar líneas de recepción/venta y eventos de operación. El hecho comercial no se “corrige” editando o borrando un movimiento histórico.

### 7.3 Operaciones de inventario

`InventoryOperation` soporta `TRASLADO`, `AJUSTE_ENTRADA`, `AJUSTE_SALIDA` y `STOCK_INICIAL`; contiene artículo, unidad/cantidad snapshot, sede origen/destino cuando aplique, motivo obligatorio, actor, `request_id`, hash y fecha. Un traslado exige sedes distintas STORE del mismo tenant y realiza **dos movimientos** con suma algebraica cero en **un único commit**.

Los ajustes positivos/negativos se justifican y respetan permisos por rol y sede; el conteo absoluto utiliza `expected_version` en el comando para impedir confirmar sobre un saldo observado obsoleto. `STOCK_INICIAL` es una operación especial con privilegios más fuertes y no puede usarse para duplicar el alta sobre un artículo/sede que ya tiene historia. Los checks y permisos se implementan entre DTO, servicio, transacción y SQL; no atribuir todo a un `CHECK` de fila.

## 8. Ventas y pagos declarados (RF-07; CU-10)

`Sale` contiene empresa, ubicación opcional, estado persistido **solo** `CONFIRMADA`, `request_id`, `request_sha256`, importes (subtotal/descuento/total), notas, actor, fecha y `balances_after`. `SaleLine` guarda catálogo, numeración, descripción/tipo/unidad/SKU snapshot, cantidad, precio unitario y total. `SalePayment` registra secuencia, método, importe positivo y referencia. El modelo admite **1 a 30 líneas** y **1 a 6 aplicaciones de pago** según controles implementados.

**Reglas principales:**

1. La venta es un evento confirmado, no un carrito persistente. En SQL se aplica `status = 'CONFIRMADA'`.
2. `subtotal_centavos = Σ total_linea_centavos`; `total_centavos = subtotal_centavos − descuento_centavos`; `Σ pagos_declarados = total_centavos`. El servidor comprueba las sumas; la DB verifica restricciones por fila y no sustituye la comprobación de agregados entre varias tablas.
3. `total_linea_centavos = HALF_UP(cantidad_milli × precio_unitario_centavos / 1000)`. No redondear después de fusionar líneas de productos distintos. Un renglón de precio cero puede formar parte de una venta de total positivo, según el contrato; no se habilitan ventas completas de total cero. Las restricciones de subtotal, descuento y total se verifican además en la persistencia.
4. Titular y administrador pueden operar con la política de precios/descuentos autorizada. `ENCARGADO` y `TRABAJADOR` **no pueden modificar el precio del catálogo ni agregar descuentos**: FastAPI exige precio de catálogo definido e igualdad exacta; no basta con bloquear inputs en React.
5. La venta de bienes exige sede activa con **SELL+STORE**, autorización efectiva y stock suficiente para todas las líneas físicas. Para una venta solo de servicios, la ubicación puede omitirse únicamente para un titular/administrador según el servicio vigente; sin sede, un rol operativo no puede confirmar.
6. Una venta de servicio no descuenta automáticamente insumos. Una venta mixta descuenta **solo las líneas físicas**; agrupa cantidades repetidas de un bien para comprobar el saldo sin perder precios/snapshots de cada línea.
7. Confirmar venta, detalles, pagos declarados, saldos, movimientos y `balances_after` sucede dentro de una sola transacción. Si falta una unidad, **ninguna parte** queda confirmada.
8. El listado/consulta de ventas para roles operativos se restringe a sedes con asignación activa; incluso el autor histórico puede perder acceso si perdió la asignación. La lectura de inventario tiene una política distinta y no se debe extrapolar.

**Pago declarado ≠ pago acreditado.** Los métodos persistidos son `EFECTIVO`, `TRANSFERENCIA`, `CUENTA_DNI`, `TARJETA` y `MERCADO_PAGO_DECLARADO`; son declaraciones, no conciliación. Los registros no demuestran transferencias bancarias, cobros efectivamente recibidos, operación acreditada de Mercado Pago ni documento fiscal. La habilitación de POST REAL desde el frontend local permanece controlada por `VITE_PYME_ENABLE_REAL_SALES` y no debe activarse para probar el documento sobre la base personal persistente.

## 9. Idempotencia, recuperación y pérdida de respuesta

Las claves de solicitud son UUID que identifican el **comando**, no al carrito ni al producto. Las altas y comandos comerciales pertinentes comparan identidad, cuerpo canónico (digest) y ámbito antes de recuperar resultados anteriores. **No inventar una tabla `SolicitudIdempotente` que abarque todos los casos**.

| Operación | Dónde persiste la identidad del comando | Garantía observable |
|---|---|---|
| Crear empresa | `BusinessCreationRequest`, PK `(actor_user_id,idempotency_key)` y digest | Un actor no crea dos empresas con la misma clave y contenido. |
| Registrar compra | `Purchase.request_id`, `request_sha256`, `created_by_id` | Unicidad por tenant/solicitud y replay controlado. |
| Confirmar recepción | `PurchaseReceipt.request_id`, `request_sha256`, actor y compra única | Una única entrada completa, con recuperación del comprobante. |
| Traslado/ajuste | `InventoryOperation.request_id`, `request_sha256`, `actor_id`, `kind` | Un comando físico no produce movimientos duplicados. |
| Registrar venta | `Sale.request_id`, `request_sha256`, autor | Relectura por ID y `request_id`, sin segunda venta. |

La comparación de hash/actor se revalida en el servicio y la unicidad de PostgreSQL es la segunda defensa frente a carreras. Una repetición idéntica puede devolver la operación ya confirmada; la misma clave con contenido/actor incompatible produce conflicto. **Timeout o respuesta perdida no significa rechazo confirmado:** la lógica de recuperación debe tratar la respuesta como *resultado incierto* y usar la identidad original del comando para verificar si hubo commit. La consulta REAL `GET /api/v1/businesses/{business_id}/sales/by-request/{request_id}` permite buscar un comprobante de venta autorizado; la disponibilidad del endpoint **no acredita** que cualquier cliente realice la consulta automáticamente en todos los fallos. No reenviar automáticamente un `POST` con una clave nueva.

**Mejora UX post-T12:** evaluar un estado visual `Verificando resultado…` que consulte por `request_id`, distinga comprobante confirmado de resultado aún no determinado y ofrezca recuperación segura sin duplicar ventas. No afirmar esta automatización como comportamiento implementado sin un test específico.

El frontend guarda ciertos comandos comerciales pendientes en IndexedDB para recuperación controlada (sin credenciales) y conserva limitaciones documentadas: esos datos no están cifrados; pueden perderse al borrar el navegador o cambiar de dispositivo. No prometer semántica global de entrega exactamente una vez para sistemas externos todavía no integrados.

## 10. Relaciones y cardinalidades del dominio

Las siguientes multiplicidades son **conceptuales del estado válido**, no promesas de que cada una esté impuesta mediante una FK aislada.

| Relación | Multiplicidad y regla |
|---|---|
| Usuario — Membresía — Empresa | Usuario `1 → 0..*` membresías; empresa inicia con titular activo, sin unicidad global del usuario; `(business_id,user_id)` único. |
| Usuario — Empresa (fundador) | Una empresa tiene exactamente un fundador histórico; usuario `1 → 0..*` empresas creadas. |
| Empresa — Invitación | Empresa `1 → 0..*`; invitación tiene emisor `1` y aceptante `0..1`, correo destinatario sin FK previa. |
| Empresa — Ubicación / Artículo / Proveedor | Empresa `1 → 0..*` de cada recurso; cada recurso pertenece a exactamente un tenant. |
| Membresía + Ubicación — Asignación | Cada asignación referencia exactamente una membresía y una sede del mismo tenant; puede estar revocada. |
| Proveedor — Compra | Compra `0..1` proveedor; proveedor `1 → 0..*` compras, con snapshot histórico. |
| Compra — DetalleCompra | Compra `1 → 1..*` líneas al confirmar la API; cada línea pertenece a una compra. |
| Compra — Recepción | Compra `1 → 0..1` recepción completa; la recepción identifica una única sede STORE. |
| DetalleCompra — Catálogo | Línea `0..1` artículo; la línea libre no necesita artículo, pero conserva snapshot. |
| Empresa + Sede + Artículo — Saldo | `0..1` fila de saldo por triple único; ausencia no significa stock positivo. |
| Recepción / Operación / Venta — Movimiento | Cada movimiento tiene **una familia de origen válida** y, cuando corresponde, el detalle de compra o venta específico. |
| OperaciónInventario — Movimiento | Traslado confirmado `1 → 2` eventos físicos; ajuste/stock inicial confirmado `1 → 1` evento. |
| Venta — DetalleVenta | Venta `1 → 1..*` líneas, cada una ligada a un artículo de ese tenant. |
| Venta — AplicaciónPago | Venta `1 → 1..*` pagos declarados, cuya suma concilia con el total. |
| Venta — Ubicación | Ubicación `0..1` en la venta; `null` solo para servicio bajo reglas y roles específicos. |

Un SVG puede ocultar asociaciones transversales por legibilidad, **pero no debe inventar cardinalidades**. Las FK físicas y las asociaciones omitidas han de figurar en su guía o anexo de correspondencia.

## 11. Integridad: qué garantiza SQL y qué valida la aplicación

| Invariante | Capa y referencia concreta |
|---|---|
| Unicidad de membresía | SQL `uq_memberships_business_user`. |
| A lo sumo un titular activo | Índice parcial SQL `uq_memberships_one_active_owner`; mantenimiento de titular inicial y protecciones de edición en servicio. |
| A lo sumo una sede principal activa | Índice parcial SQL `uq_locations_one_active_primary` y CHECK de principal activa. |
| Nombre/SKU de artículo por tenant | SQL `uq_catalog_items_business_name`, índice parcial `uq_catalog_items_business_sku`. |
| Identidad entre empresa y recurso enlazado | FK compuestas por `business_id` en tablas operativas + comprobaciones de autorización de FastAPI. |
| Una recepción por compra | SQL `uq_purchase_receipts_business_purchase`; servicio valida estado y transacción. |
| Stock no negativo y saldo versionado | SQL `ck_stock_balances_quantity_nonnegative`, `ck_stock_balances_version`; debit condicional, UPSERT y lock transaccional en servicio. |
| Origen/evento/signo coherentes | SQL `ck_stock_movements_origin_and_sign` y FK compuestas; servicio crea eventos correctos. |
| No duplicar eventos físicos | Unicidades `uq_stock_movements_receipt_line`, `uq_stock_movements_operation_event`, `uq_stock_movements_sale_line`. |
| Precio/redondeo de línea | CHECK de línea `ck_sale_lines_half_up_total` / `ck_purchase_lines_half_up_total`; comprobación y cálculo del comando en servicio. |
| Total/desc/pagos | SQL controla importes y relación aritmética dentro de `Sale`; **sumas entre filas** se verifican en servicio transaccional. |
| Rol, sede, SELL/STORE, asignación | FastAPI, sesión/membresía y servicios de autorización; no puede resolverse con un CHECK que consulte otras tablas. |
| Idempotencia por comando | PK o UNIQUE en tabla comercial, digest y actor comprobados por servicio; replay controlado. |

### 11.1 Errores de conflicto y comunicación al operador

Los contratos HTTP vigentes contemplan errores como `401` (sesión inválida), `403` (permiso insuficiente), `404` (recurso no visible o inexistente), `409` (conflicto) y `422` (validación). **No significa que todos los endpoints devuelvan todos los códigos.** En particular, el router de ajustes mapea el conflicto de versión a HTTP `409` con detalle textual «Version de saldo obsoleta o saldo inexistente»; no se verificó un código de error estructurado denominado `STALE_BALANCE_VERSION`.

**Evolución UX/API, no implementada en este documento:** evaluar respuestas de error estables y tipadas, más mensajes específicos en React (por ejemplo: «El stock cambió desde el último conteo. Actualizá los saldos antes de ajustar»). Cualquier nuevo contrato de errores exigiría cambio de código y pruebas en una etapa posterior: T12 no lo introduce.

**Nota académica:** PostgreSQL no permite usar un `CHECK` de una fila para garantizar valores actuales de otra tabla. Las FK compuestas resuelven pertenencia referencial al tenant, mientras los estados, la autorización y las sumatorias de agregados necesitan lógica de servicio y transacciones. Tampoco debe afirmarse que una restricción de “a lo sumo uno” asegura “existe exactamente uno”.

## 12. Transacciones y concurrencia

### 12.1 Alta empresarial

Comprobar sesión/actor, registrar identidad idempotente de creación, crear `Business` y titular inicial `Membership` en un commit. Evitar duplicados por `BusinessCreationRequest` y unicidad. No crear automáticamente `Location`, `CatalogItem` ni saldo.

### 12.2 Compra → recepción → existencia

1. Crear `Purchase` y `PurchaseLine` con snapshots, sin stock.
2. Registrar estado `REGISTRADA` si tiene físicos, o `CERRADA_SIN_RECEPCION` si solo contiene conceptos no recepcionables.
3. Al recibir, revalidar actor, tenant, estado y sede STORE; impedir segunda recepción.
4. Crear `PurchaseReceipt`; acreditar bienes con UPSERT concurrente seguro sobre `StockBalance`, generar entradas `StockMovement` por línea física y persistir `balances_after`.
5. Cambiar compra a `RECIBIDA` y realizar un solo commit; cualquier excepción exige rollback total.

### 12.3 Traslado de stock

1. Verificar misma empresa, artículo físico activo, sedes diferentes, ambas STORE, permisos y asignaciones.
2. Debitar origen condicionalmente (`quantity_milli >= solicitado`); si no existe saldo, rechazar.
3. Acreditar destino con UPSERT; persistir `InventoryOperation` y dos `StockMovement` (`TRASLADO_SALIDA`, `TRASLADO_ENTRADA`).
4. Commit conjunto y replay por la clave original. **Variación neta del artículo entre ambas sedes: cero.**

### 12.4 Ajuste / carga inicial

Verificar rol permitido, sede STORE, motivo, cantidad/unidad y, para conteo absoluto, versión esperada. El servidor controla el histórico de carga inicial y registra operación/movimiento/saldo atómicos. Una diferencia cero no justifica crear un movimiento ficticio. No se debe editar un movimiento pasado para “corregir” el saldo.

### 12.5 Venta mixta

1. Revalidar empresa, membresía, rol, política de precios y sede. Para bienes: SELL+STORE y asignación cuando corresponde.
2. Validar fichas activas/vendibles, cantidades, precio/descuento y suma exacta de pagos declarados.
3. Agregar cantidades físicas por artículo para control de disponibilidad, preservando las líneas individuales de venta.
4. Debitar saldos con condición de suficiencia; registrar `Sale`, `SaleLine`, `SalePayment`, movimientos `VENTA_SALIDA` y `balances_after` dentro de la misma transacción.
5. Confirmar íntegramente; ante faltante/concurrencia, revertir el comprobante, pagos declarados y movimientos del intento.

### 12.6 Casos de concurrencia que se deben conservar como evidencia

- Dos ventas sobre la última unidad: una confirma y otra recibe conflicto controlado, sin saldo negativo ni pago parcial.
- Dos recepciones de la misma compra con claves distintas: una sola recepción; ningún doble ingreso.
- Dos entradas simultáneas sobre saldo inexistente: suma correcta sin duplicar fila.
- Traslado y venta simultáneos: consistencia del origen/destino y el ledger tras commit/rollback.
- Ajuste con `expected_version` obsoleta: rechazo sin movimiento.
- Repetición de un `request_id` con hash diferente: conflicto y ningún efecto añadido.
- Trabajador revocado o asignado solo a una sede: no obtiene capacidad operativa sobre otra.
- Empresa A/B: las consultas y escrituras de un tenant nunca se habilitan por conocer el UUID de otro.

Las pruebas de transacción/concurrencia deben ejecutarse **contra PostgreSQL aislado**, no deducirse de un test puramente unitario o de simular dos clics.

## 13. Estados de las entidades — síntesis

| Entidad | Estados persistidos y precisión |
|---|---|
| Usuario | `ACTIVO`, `DESHABILITADO`; no inferir rol empresarial de `User.status`. |
| Empresa | `ACTIVA`, `SUSPENDIDA`; **no** se declara API pública para suspender aunque el estado exista en SQL. |
| Membresía | `ACTIVA`, `INACTIVA`; titularidad protegida por índice y reglas. |
| Invitación | `PENDIENTE`, `ACEPTADA`, `RECHAZADA`, `CANCELADA`, `EXPIRADA`; emisión ≠ acceso. |
| Ubicación | `ACTIVA`, `PAUSADA`; principal solo activa. |
| AsignaciónUbicación | `ACTIVA`, `REVOCADA`; fecha de revocación coherente. |
| Artículo | `ACTIVO`, `INACTIVO`; baja lógica sin destruir snapshots. |
| Proveedor | `ACTIVO`, `INACTIVO`; baja lógica. |
| Compra | `REGISTRADA`, `RECIBIDA`, `CERRADA_SIN_RECEPCION`, `CANCELADA` (último sin endpoint público comprometido). |
| Venta | Únicamente `CONFIRMADA` en tabla `sales`; borrador de carrito vive en UI. |
| Operación inventario | Su `kind` discrimina operación, no es un estado de borrador comercial. |

## 14. Patrones de diseño y decisiones arquitectónicas observables

El documento 04 desarrolla la arquitectura; aquí se presenta la correspondencia entre **patrón, implementación real, beneficio y límite** para facilitar la defensa técnica. No confundir *patrones GoF clásicos* con patrones de arquitectura empresarial, contratos HTTP o restricciones SQL. Una regla de estados no equivale automáticamente al patrón GoF **State**; copiar atributos históricos no implica haber implementado una clase **Memento**.

| Patrón / técnica | Evidencia concreta en el proyecto | Beneficio y precisión |
|---|---|---|
| **Repository (patrón de persistencia)** | Archivos como `businesses/repository.py`, `purchases/repository.py`, `catalog/repository.py`; otras áreas, como `sales/service.py`, ejecutan consultas SQLAlchemy directamente | Encapsula consultas en varios módulos; **no** declarar que todos los accesos están abstraídos por un repositorio uniforme. |
| **Service Layer (capa de aplicación)** | `app/modules/*/service.py`; revalidación de sesión, tenant, permisos, cálculos e invariantes | Coordina casos de uso; evita confiar en datos o controles solo del frontend. |
| **Unit of Work como límite transaccional** | `Session` de SQLAlchemy, `flush()`, `commit()` y `rollback()` en operaciones comerciales | Garantiza atomicidad por operación en una unidad de trabajo; **no** se identifica una clase propia `UnitOfWork` genérica en el inventario revisado. |
| **Snapshot de datos comerciales** | `purchase_lines.*_snapshot`, `sale_lines.*_snapshot`, `purchases.supplier_name_snapshot`, `balances_after` | Preserva el contexto de una transacción pese a cambios posteriores del catálogo; es técnica de snapshot, **no** implementación demostrada del GoF Memento. `balances_after` es evidencia de respuesta, no otra fuente de saldo. |
| **Idempotent request / replay seguro** | `BusinessCreationRequest` y las columnas `request_id`/`request_sha256` de compras, recepciones, operaciones y ventas | Evita duplicar efectos ante respuestas perdidas; no se presenta como consumidor de cola ni como garantía de *exactly once* sobre proveedores externos. |
| **Máquina de estados como reglas de dominio** | `Purchase.status`, `BusinessInvitation.status`, `Location.status`; validaciones y transiciones en servicios | Controla cambios válidos; **no** se afirma que existan clases polimórficas del patrón GoF State. |

**Ejemplo defendible:** `POST /sales` valida sesión, rol, precios y permisos de ubicación en el servicio; en una única transacción SQL crea `Sale` con sus líneas/pagos, debita `StockBalance` y genera `StockMovement`; `request_id` y `request_sha256` hacen posible recuperar el comprobante y rechazar reintentos incompatibles. Cada componente resuelve un problema distinto: **separación de responsabilidades, atomicidad, trazabilidad e idempotencia**.

**Criterio para la defensa:** acreditar patrones que aparecen efectivamente en el código y diferenciarlos de refactorizaciones propuestas. La consigna oficial de la asignatura es la fuente para precisar mínimos y ponderaciones de evaluación: no inferir porcentajes de nota a partir de una revisión externa sin comprobar dicha consigna.

## 15. Trazabilidad a requisitos, API y pruebas

| RF / CU | Entidades centrales | API / recorrido REAL | Evidencia disponible |
|---|---|---|---|
| RF-01 / CU-01 y CU-02 | `User`, `AuthSession` | Registro, login, `me`, logout | T11 E2E de registro/sesión y suites backend. |
| RF-02 / CU-03 y CU-12 | `Business`, `Membership`, `BusinessInvitation`, `BusinessCreationRequest` | Empresas, invitación, aceptación, equipo | Backend de invitaciones/equipo y navegación multiempresa. |
| RF-03 / CU-04 | `Location`, `LocationAssignment` | Ubicaciones, sede principal, asignaciones | QA de permisos y visibilidad por sede T11. |
| RF-04 / CU-05 | `CatalogItem` | Alta/edición/estado y paginación | E2E CRUD/persistencia. |
| RF-05 / CU-06 y CU-07 | `Supplier`, `Purchase`, `PurchaseLine`, `PurchaseReceipt` | Proveedor/compra/recepción única | Flujo compra→recepción y recuperación. |
| RF-06 / CU-08, CU-09 y **CU-11** | `StockBalance`, `StockMovement`, `InventoryOperation` | Saldos, ledger, traslado y ajuste | Tests PostgreSQL, Playwright REAL de inventario. |
| RF-07 / CU-10 | `Sale`, `SaleLine`, `SalePayment`, `StockMovement` | POS, listado, comprobante y consulta por `request_id` | T11 venta mixta, replay y políticas de pago/precio. |
| RF-08 a RF-10 | **Sin tablas homólogas del núcleo REAL** | DEMO/diferido | Aislamiento DEMO verificado; no cobro real. |

**Fuente de rutas y pruebas:** [Documento 05 vigente](05_MATRIZ_API_Y_TRAZABILIDAD.md) y [Documento 02 vigente](02_CASOS_DE_USO.md). La reconciliación T12-B comprobó **46 combinaciones método+ruta** de **13 routers** montados bajo `/api/v1`; `GET /health` y `GET /ready` son técnicas aparte.

**Evidencia técnica preexistente T11, no ejecutada para este borrador:** [Full-stack GitHub Actions #43015544889](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/43015544889): **892 Pytest, 38 Playwright REAL y 6 Playwright DEMO aprobadas**; [auditoría T11 de 26 criterios E27](../docs/E2-7_T11_E_AUDITORIA_FINAL_PREMERGE.md) y [acta manual de 39 pasos](../docs/E2-7_T11_D2_ACTA_PRUEBA_MANUAL_REAL.md). T11 cubre alcance funcional/smoke: no es una certificación general de accesibilidad, seguridad ni producción comercial.

## 16. Especificación que deberán cumplir los diagramas (T12-C2/C3/C4)

**03A — Identidad, empresas, sedes, catálogo y proveedor.** Mostrar las clases y relaciones de negocio vigentes. Representar `LocationAssignment` y las cardinalidades correctas; no declarar `Supplier`, SELL/STORE o invitaciones como TO-BE. Diferenciar `founder_user_id` histórico de `Membership` activo. Sesiones y solicitudes de creación son soporte técnico y pueden ir en un panel/guía, no necesariamente en la vista principal.

**03B — Compras, recepción, inventario y ventas.** Usar `Purchase`, `PurchaseLine`, `PurchaseReceipt`, `StockBalance`, `StockMovement`, `InventoryOperation`, `Sale`, `SaleLine` y `SalePayment` como mapeo verificable. Corregir los cuatro `kind` de inventario, relaciones de movimiento con línea física, FK por empresa, estados, snapshots y `request_id`/digest. Sustituir la clase persistente ficticia `SolicitudIdempotente` por explicación de identidad de comando distribuida. En una lámina general puede resumirse metadata técnica para mantener legibilidad; la guía contiene el detalle.

**03C — Casos de uso.** Mantener CU-01 a CU-12, con CU-12a/12b como dos objetivos del CU-12. Usar actores externos como visitante, persona autenticada y funciones comerciales ejercidas por miembros con roles **persistidos** (`TITULAR_ADMINISTRATIVO`, `ADMINISTRADOR`, `ENCARGADO`, `TRABAJADOR`); un actor funcional «operador de inventario» puede permanecer si se aclara que **no es un quinto rol SQL**. Respetar sede/asignación; no dibujar API, base de datos o sistema como actor externo. Rotular REAL y diferido con precisión. CU-11 corresponde a **RF-06**, no a RF-07.

**Control SVG vs PlantUML:** las láminas editoriales actuales no son renderizados literales de las fuentes `.puml`; cada corrección exige comprobar equivalencia semántica, texto, relaciones y legibilidad. **Las imágenes anteriores todavía muestran rótulos TO-BE y no deben presentarse como diagramas vigentes aprobados.** Hasta completar C2/C3/C4, consultar las [fuentes y guías históricas](diagramas/README.md) con esta advertencia.

## 17. Decisiones y capacidades diferidas

| Tema | Decisión de esta versión |
|---|---|
| Recepciones parciales/multidestino | No modelar como REAL; futura recepción por líneas y entregas múltiples requerirá rediseño de cardinalidades. |
| Servicios con insumos | Un servicio no consume stock automáticamente; recetas, consumos y mínimos operativos diferidos. |
| Fabricación/lotes/reservas | No se incluyen en el núcleo persistido actual. |
| Devolución/anulación de ventas | No dibujar estados/endpoints inexistentes como operativos. |
| Gastos, caja y cuentas financieras | RF-08/09 DEMO, sin conciliación bancaria en backend REAL. |
| Cobro QR, Mercado Pago | RF-10 DEMO ilustrativa; OAuth, preferencia de cobro, webhook y acreditación futura. |
| Estado de negocio suspendido | Existe en SQL, no se atribuye API pública no verificada. |
| Seguridad de datos pendientes | IndexedDB sin cifrar es un riesgo residual; no almacenar tokens ni prometer recuperación entre dispositivos. |
| UX, accesibilidad y despliegue | La documentación de modelos no constituye auditoría WCAG ni certificación de producción. |

## 18. Objetivos posteriores a T12 — hoja de evolución, NO alcance implementado

Este apartado registra necesidades confirmadas para el proyecto **después del cierre documental T12**. No modifica la evaluación del núcleo RF-01..07 ni transforma pantallas DEMO en API. Su función es evitar que la documentación técnica cierre el camino a la evolución posterior.

### 18.1 Convergencia de experiencia REAL ↔ DEMO

**Objetivo:** mejorar el uso y la presentación de las pantallas REAL tomando la DEMO ya trabajada como referencia funcional y visual: navegación, menú lateral, panel de empresa, catálogo, compras, inventario, ventas, composición de formularios, mensajes y comportamiento responsive. **No se plantea sustituir el backend autoritativo por `demoStore`**.

Criterios para el futuro incremento:

1. Inventariar pantallas y flujos **DEMO** frente a su contraparte **REAL**, con una matriz *conservar / adaptar / diferir*.
2. Mantener el aislamiento por empresa, los límites de roles y las validaciones efectivas del servidor mientras se reorganiza la interfaz.
3. Separar mejoras puramente estéticas de funcionalidades DEMO que aún no cuentan con contratos REAL (caja, cuentas financieras, QR); estas últimas no deben presentarse como operativas.
4. Unificar nombre visible de campos, precio unitario no editable para roles restringidos, cantidad, total por renglón, avisos de ubicación y manejo accesible de errores; validar escritorio, teclado y móvil.
5. Exigir pruebas de regresión E2E REAL y DEMO después de cada adaptación, sin importar automáticamente datos locales al tenant.

**Estado:** PROPUESTO POST-T12; no constituye requisito de alterar el Documento 03 en esta entrega.

### 18.2 Visualización del esquema de PostgreSQL (diagrama ER)

**Objetivo:** producir una vista **entidad–relación del esquema físico real**, complementaria de los UML conceptuales 03A/03B. Un diagrama ER generado por introspección enseña tablas, PK, FK y cardinalidades de base; los diagramas UML explican además casos de uso, reglas y conceptos. **No son el mismo artefacto**.

**Alternativa inicial recomendada:** DBeaver o una herramienta ERD equivalente conectada **en modo lectura** a una instancia PostgreSQL de prueba aislada, con Alembic migrado a `e26a_sales_foundation`; generar una vista general de las 19 tablas y vistas parciales por identidad, comercio e inventario. DBeaver permite diagramas de esquemas existentes y exportación en formatos gráficos (según la edición). [Documentación de diagramas de DBeaver](https://dbeaver.com/docs/dbeaver/ER-Diagrams/).

**Otras opciones:** ERD de pgAdmin, DBML/dbdiagram.io a partir de un esquema revisado o una instancia alojada en Supabase **solo si se decide expresamente cambiar el entorno**. Supabase no es requisito de la entrega ni implica un traslado automático de PostgreSQL. La herramienta de visualización **no debe modificar, borrar, migrar ni publicar datos reales**, y cualquier exportación debe excluir credenciales y registros personales.

**Criterio de aceptación posterior:** diagrama trazable al head real de Alembic, legible a nivel global y por módulos, sin relaciones inventadas ni cambios en `main`/base local por la tarea visual.

### 18.3 Demostración navegable tipo web y móvil

El sistema ya cuenta con React/TypeScript y Vite: la demostración inicial deberá usar la **aplicación REAL existente** en un navegador y un entorno aislado de FastAPI/PostgreSQL, con datos de prueba; no requiere compilar una aplicación móvil nativa. Mostrar vistas responsive mediante herramientas de desarrollo del navegador (viewport teléfono/tablet) y automatización Playwright. Si se desea una PWA o aplicación móvil empaquetada, será una decisión posterior y separada.

La demo de exposición debe acreditar el recorrido registro/login → empresa/sedes → catálogo → compra/recepción → inventario → POS → comprobante, con límites de roles y respuestas de error. Cuando se presenten pantallas locales DEMO, identificarlas de forma explícita y no mezclarlas con datos REAL. No habilitar ventas físicas sobre la base persistente de pruebas manuales solo por realizar una presentación.

### 18.4 Mercado Pago QR REAL por empresa

**Objetivo futuro:** que cada empresa conecte **su propia cuenta autorizada de Mercado Pago**, sin compartir credenciales entre tenants. Distinguir **QR de artículo** (identificación, catálogo o acceso a la intención de compra) de **QR de cobro** (pago de una orden o transacción) y distinguir siempre la declaración de un pago de la confirmación efectiva del proveedor.

El diseño futuro requiere decidir el producto QR vigente de Mercado Pago para terceros, su flujo de autorización de vendedor (p. ej., OAuth cuando corresponda), almacenamiento seguro de credenciales en backend, identificación de empresa/sede/orden, idempotencia de creación de órdenes, notificaciones webhook verificadas, consulta del estado autoritativo y conciliación. El modelo comercial actual `SalePayment` **no registra acreditaciones bancarias** y no debe sobrecargarse silenciosamente como si fueran pagos conciliados; probablemente requiera entidades y estados de **intención/orden de cobro**, evento de proveedor y conciliación, a diseñar y aprobar antes de migrar SQL.

Posibles estados de diseño, **no implementados**, incluyen pendiente, confirmado/aprobado, rechazado/cancelado/expirado, sujeto a los estados exactos de la API elegida. Se deben probar expiraciones, webhooks duplicados/fuera de orden, fallos de red, desconexión de cuenta, cobros duplicados y recuperación tras F5, con credenciales y entornos de prueba. **No generar un QR ilustrativo y presentarlo como cobro real.** Referencias iniciales: [Mercado Pago — QR](https://www.mercadopago.com.ar/developers/es/docs/qr-code/overview), [OAuth](https://www.mercadopago.com.ar/developers/es/docs/security/oauth/introduction) y [notificaciones QR](https://www.mercadopago.com.ar/developers/es/docs/qr-code/notifications).

### 18.5 Orden futuro sugerido y puerta de entrada

1. **Cerrar T12** con documentación coherente, UML y CI final; no incorporar cambios comerciales nuevos al PR #46.
2. **Convergencia visual/funcional REAL–DEMO** y recorrido demostrable web/móvil con pruebas; conservar backend y contratos, salvo decisiones separadas.
3. **ERD de PostgreSQL** desde una base desechable para exposición y revisión estructural; puede realizarse en paralelo a la mejora visual.
4. **Diseñar y luego integrar Mercado Pago QR REAL** como trabajo autónomo con análisis de seguridad, contratos, migraciones, pruebas y autorización del responsable.

Este orden no implica que QR esté integrado cuando se termine T12, ni que el software pase a ser productivo por mostrarlo en el navegador.

## 19. Fuentes de verdad, versionado y antecedentes

1. **Esquema y modelos:** `backend/app/infrastructure/models/*.py` y `backend/alembic/versions/*.py`. Última revisión documentada del esquema: `e26a_sales_foundation`, sucesora de `e25a_inventory_ops`. No se editan ni reordenan migraciones históricas para hacer coincidir un dibujo.
2. **Operaciones y autorizaciones:** `backend/app/modules/*/{service,permissions,router,schemas}.py` donde existan. El servicio es necesario para conocer invariantes no expresables como CHECK.
3. **API / UI / pruebas:** [Documento 05](05_MATRIZ_API_Y_TRAZABILIDAD.md), [Documento 02](02_CASOS_DE_USO.md), `frontend/src/features/` y `frontend/e2e/real/`.
4. **Historia del Documento 03:** la versión anterior (E2-3 E, 08/11/2026) permanece recuperable, sin modificaciones, en [Documento 03 antes de T12-C, commit `c6a77137`](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/blob/c6a77137cf82dcb9aad225645e84b1265b1da3ec/plataforma-pyme/entrega-programacion-2/03_MODELO_DE_DOMINIO_Y_UML.md). Sus apartados E2-1 a E2-3 describen cortes anteriores y **no prevalecen** sobre este estado AS-IMPLEMENTED.
5. **Preservación documental:** por defecto, el enlace inmutable del punto anterior conserva íntegramente la fuente previa y esta versión resume sus hitos; si el responsable exige disponer del texto histórico completo dentro de la rama de entrega, archivar una copia separada y expresamente rotulada `HISTORICO` antes del reemplazo. No mezclar ambos estados bajo el mismo encabezado «vigente».
6. **Puerta de publicación:** aprobación humana del Documento 03, actualización posterior 03A/03B/03C y control global de enlaces, gráficos y CI final. Este archivo es **candidato definitivo sujeto a aprobación**, no un documento ya fusionado.

## 20. Lista de aceptación para T12-C1

- [ ] El revisor aprueba que el estado vigente sea el de T11 y que lo histórico no se mezcle con él.
- [ ] Se confirma la correspondencia de los **19 modelos ORM** con sus tablas SQL (incluyendo soporte técnico).
- [ ] No queda una supuesta tabla única `SolicitudIdempotente` en el modelo REAL.
- [ ] Se documentan roles, permisos por sede y la exigencia SELL+STORE en venta física.
- [ ] Se distinguen los estados SQL de transiciones con endpoint REAL (en especial `CANCELADA` de compras).
- [ ] Se representan las reglas de compra/recepción, traslado, ajustes y venta sin stock negativo.
- [ ] Las invariantes SQL y las validaciones de servicio no se atribuyen a la capa equivocada.
- [ ] RF-08 a RF-10 continúan DEMO/diferidas; pagos REAL siguen declarados.
- [ ] Los diagramas actuales se señalan como pendientes de T12-C2/C3/C4 y no se anuncian como sincronizados.
- [ ] El titular no se puede degradar ni revocar por una operación pública; no se inventa un conteo `COUNT(owners)>1`.
- [ ] La sección de patrones distingue lo realmente codificado de etiquetas GoF no implementadas literalmente.
- [ ] Los objetivos de convergencia DEMO, ERD, presentación web/móvil y QR Mercado Pago quedan rotulados **post-T12**.
- [ ] Se preserva el texto histórico recuperable por commit y, si se solicita, mediante anexo archivado antes de publicar.

**Dictamen de esta entrega:** **T12-C1 APROBADO Y PUBLICADO EN LA RAMA DOCUMENTAL**. Los diagramas 03A/03B/03C, sus SVG y la revisión T12-E siguen pendientes. Esta publicación solo modifica documentación; no se ejecutaron nuevas pruebas, migraciones u operaciones de base de datos y no implica autorización de merge a `main`.


## 21. Registro de decisiones ante la revisión externa de T12-C1

| Observación recibida | Tratamiento en esta versión |
|---|---|
| Índice parcial admite cero titulares | Se precisa que el servicio **prohíbe** la edición de miembros titulares y la autoedición; no se propone como implementado un `COUNT(owners)>1`. Transferencia de titularidad diferida. |
| Bearer en memoria pierde sesión con F5 | Se declara limitación actual y se propone evaluar cookies seguras después de T12, **sin** introducir persistencia de token en el borrador. |
| `CANCELADA` existe en SQL sin ruta de cancelación | Se rotula **capacidad de esquema con endpoint diferido**. |
| Hacer visibles los patrones | Se documentan Repository, Service Layer, límite Unit of Work, snapshot e idempotencia; se evita atribuir implementaciones formales de State/Memento. |
| Recuperación automática tras timeout | Se documenta la ruta real `by-request` y el manejo conservador; la automatización uniforme queda como evolución UX, no como hecho verificado. |
| Código de error `STALE_BALANCE_VERSION` | No se inventa; se documenta el `409` y mensaje actualmente usado. Un error tipado queda como mejora API futura. |
| Diagrama ER, demo web/móvil y Mercado Pago QR | Se incorpora hoja de evolución **post-T12**, con separación REAL/DEMO y credenciales por empresa. |

**Criterio de prioridad:** el código verificado al corte base tiene prevalencia sobre afirmaciones del análisis externo; las sugerencias de UX y arquitectura que requieren desarrollo no alteran la descripción AS-IMPLEMENTED.