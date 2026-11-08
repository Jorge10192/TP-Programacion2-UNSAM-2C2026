# 02 — Especificación de casos de uso

**Proyecto:** Asistente PyME — Plataforma de gestión multiempresa y multirrubro  
**Materia:** Programación 2  
**Versión:** 0.9 — cierre y sincronización documental C.5
**Estado:** **REVISADO PARA ENTREGA — especificación TO-BE, con decisiones de E2 todavía abiertas**  
**Fecha:** 8 de noviembre de 2026  
**Documento de referencia:** `01_ANALISIS_DE_REQUERIMIENTOS.md` (v0.8)  
**Alcance:** casos de uso del **núcleo propuesto** del backend RESTful (TO-BE), contrastados con los comportamientos del frontend DEMO (AS-IS). Las operaciones previstas NO implican endpoints implementados. La lista definitiva de permisos, campos y códigos HTTP se formalizará posteriormente. Esta revisión incorpora CU-12 como soporte para membresías reales, sin ampliar el alcance a envíos de correo o acceso público por QR.

> **Cierre E2-1 / C.5 — 08/11/2026:** C.1 (98), C.2 (125), C.3 (147), C.4a (171) y **C.4b (195/195 pruebas locales aprobadas; `195 passed in 23.86s`)**. Alembic `e213c4_acceptance (head)`, `No new upgrade operations detected.`; Docker FastAPI/PostgreSQL `healthy` y `/ready` = `ready`/`ok`. GitHub Actions **3/3** corresponde al commit funcional `8cd1674`. C.5 es **exclusivamente documental**; no se reejecutaron pruebas ni cambiaron endpoints, modelos SQL o migraciones. React sigue DEMO; RF-03–RF-07 no tienen backend; transferencia de titularidad, verificación de correo y endurecimiento para producción siguen pendientes.

## 1. Finalidad y metodología

Este documento describe **qué objetivos realizan los actores**, cómo responde la plataforma y qué debe ocurrir ante datos inválidos, operaciones repetidas o falta de permisos. No describe pantallas, botones específicos, tablas SQL ni implementación de FastAPI.

Un **requerimiento funcional** expresa una capacidad del sistema (por ejemplo, RF-07: registrar ventas). Un **caso de uso** especifica un objetivo observable del actor (por ejemplo, CU-10: registrar una venta con pagos declarados). Una **historia de usuario** es una formulación breve de necesidad y beneficio; no sustituye los flujos y excepciones necesarios para evaluar esta API.

Los flujos de autenticación y autorización aquí descritos son **objetivo de backend**; no están disponibles como seguridad efectiva en la DEMO local. Los escenarios de negocio de Catálogo, Compras, Inventario y Ventas utilizan reglas presentes en el frontend, pero deberán validarse de nuevo en el servidor.

### 1.1 Convenciones

- **Flujo principal:** secuencia exitosa y habitual.
- **Alternativo:** otra forma válida de completar la operación.
- **Excepción:** situación que impide completarla y produce una respuesta controlada.
- **Postcondición:** estado observable que debe mantenerse cuando termina la operación.
- **Idempotencia:** una misma solicitud repetida con la misma clave no produce un segundo efecto comercial.
- **Cuenta / pago declarado:** referencia interna; no supone movimiento ni acreditación bancaria externa.
- **Tenant:** empresa sobre la cual se realiza la operación. El usuario puede pertenecer a varias empresas, pero cada petición debe validar su acceso a la empresa concreta.
- **Moneda:** los importes de esta API se acuerdan y validan en **centavos enteros de ARS** (por ejemplo, ARS 10,50 = `1050` centavos), o se convierten sin pérdida desde un decimal textual en el límite de entrada. No se utilizan números de punto flotante para almacenar dinero. Cantidades físicas se representan según la escala de la unidad aprobada.
- **Atomicidad:** las validaciones de negocio que dependen de datos cambiantes (stock disponible, estado activo y recepción pendiente) se ejecutan con el control transaccional necesario para que entre la verificación y la escritura no se produzcan decisiones incompatibles.
- **Respuesta de error:** la futura API emitirá errores estructurados sin trazas internas. Se propone **Problem Details, RFC 9457** (actualización de RFC 7807), con códigos HTTP y `type`, `title`, `status`, `detail` e `instance` según corresponda; el contrato final se define en Documento 05.
- **Estado implementado:** los flujos CU-01, CU-02 y CU-03 tienen ya endpoints parciales o completos respaldados por pruebas SQL; los CU restantes permanecen TO-BE. La evidencia técnica específica figura en el Documento 05.
- **Datos persistidos:** cada operación exitosa confirma todas sus escrituras o ninguna; los resultados relevantes conservan identificadores, empresa, actor, fecha/hora y referencias de origen. Los detalles exactos de campos se definirán en Documento 03 y Documento 05.
- **Reintentos:** la idempotencia exige delimitar empresa, operación, actor/ámbito y clave; una clave repetida con carga equivalente debe devolver el resultado de esa operación y con carga distinta producir conflicto. Debe persistirse en la **misma transacción** que el efecto comercial o implementarse una garantía equivalente. La expiración/retención de claves queda para los contratos.
- **Concurrencia de stock:** si el stock es una proyección de movimientos, no basta con bloquear filas históricas del ledger. El backend deberá serializar operaciones sobre la **misma pareja empresa–ubicación–artículo** mediante saldo bloqueable, actualización condicional, aislamiento serializable con reintento controlado u otra estrategia probada en PostgreSQL. Las operaciones sobre varios saldos deben mantener un orden estable de bloqueo. El ledger sigue siendo la fuente auditable de movimientos.
- **Errores y permisos:** la validación del cliente es orientativa; toda lectura/escritura empresarial valida autenticación, membresía vigente y permisos en servidor. Para evitar revelación de información, un recurso ajeno puede responder como inexistente según el contrato. Un error de negocio no debe crear registros parciales.

## 2. Actores

| Actor | Descripción | Rol en los CU |
|---|---|---|
| Visitante | Persona sin sesión autenticada | Registrarse e iniciar sesión |
| Usuario autenticado | Persona con identidad propia, global a las empresas | Crear empresa y acceder a empresas autorizadas |
| Titular administrativo / administrador | Miembro con facultades de configuración y administración, según permisos futuros | Alta de ubicaciones, artículos e invitaciones |
| Colaborador autorizado | Miembro que ejecuta operaciones según sus permisos en la empresa | Consultar existencias, recibir, trasladar, vender |
| Usuario invitado | Identidad global destinataria de una invitación empresarial; no es automáticamente miembro | Aceptar invitación autorizada (CU-12) |


**Límite del sistema UML:** la API y la plataforma constituyen el **sistema bajo estudio**, por lo que **no se representan como actores** en el diagrama de casos de uso. Sí pueden aparecer como participantes internos en un diagrama de secuencia. Los actores son quienes interactúan desde afuera con el sistema para alcanzar sus objetivos.

**Nota de roles:** para E2 se propone un modelo de permisos mínimo. No se presume que todo colaborador pueda ejecutar todas las operaciones; la matriz exacta se aprobará antes de implementar autenticación/autorización. Clientes y proveedores son entidades comerciales de referencia, no actores que deban iniciar sesión en este alcance.

## 3. Catálogo de casos de uso y trazabilidad

| ID | Caso de uso | RF relacionado | Actores principales | Prioridad de primera API |
|---|---|---|---|---|
| CU-01 | Registrar cuenta de usuario | RF-01 | Visitante | Núcleo MVP |
| CU-02 | Iniciar sesión | RF-01 | Visitante | Núcleo MVP |
| CU-03 | Crear una empresa | RF-02 | Usuario autenticado | Núcleo MVP |
| CU-04 | Registrar una ubicación | RF-03 | Administrador autorizado | Soporte MVP |
| CU-05 | Registrar un artículo o servicio | RF-04 | Administrador autorizado | Núcleo MVP |
| CU-06 | Registrar una compra | RF-05 | Operador autorizado | Núcleo MVP |
| CU-07 | Confirmar recepción de una compra | RF-05, RF-06 | Operador autorizado | Núcleo MVP |
| CU-08 | Consultar existencias por ubicación | RF-06 | Miembro autorizado | Núcleo MVP |
| CU-09 | Trasladar existencias entre ubicaciones | RF-06 | Operador autorizado | Núcleo MVP |
| CU-10 | Registrar una venta con pagos declarados | RF-07 | Operador de ventas autorizado | Núcleo MVP |
| CU-11 | Registrar ajuste justificado de inventario | RF-06 | Operador autorizado de inventario | Núcleo MVP (ajuste básico; conteo múltiple diferido) |
| CU-12 | Invitar y aceptar incorporación de un colaborador | RF-02 | Administrador y usuario invitado | Soporte de membresías propuesto; confirmar para primera API |

**Importante:** los doce CU representan **seis requerimientos funcionales principales** (RF-01, RF-02, RF-04, RF-05, RF-06, RF-07) y una dependencia RF-03; no significan diez módulos completos ni diez requerimientos independientes. RF-08 a RF-10 permanecen fuera de esta primera especificación de backend y podrán documentarse en una ampliación posterior. **CU-12 es una propuesta acotada de soporte para membresías reales**: el envío automático de correos y los enlaces QR de solicitud no forman parte del núcleo acordado.

## 4. Especificaciones de casos de uso

### CU-01 — Registrar cuenta de usuario

**Requerimiento:** RF-01. **Actor:** Visitante. **Objetivo:** crear una identidad de usuario para acceder a la plataforma.  
**Disparador:** el visitante solicita registrarse.  
**Precondiciones:** no requiere una empresa previa; dispone de los datos mínimos solicitados.  
**Postcondición de éxito:** existe una cuenta identificable, con credenciales protegidas, sin obligación de pertenecer a una empresa.

**Flujo principal**

1. El visitante solicita crear una cuenta e informa identificador de contacto y contraseña, sin seleccionar una empresa.
2. La API valida formato, límites y política de credenciales, normaliza el identificador según la regla definida y comprueba que no exista otra cuenta equivalente.
3. El servidor calcula un hash de contraseña apto para autenticación, con parámetros de seguridad configurables; nunca guarda ni devuelve la contraseña original.
4. La API crea la identidad global sin asignarle empresas automáticamente y confirma la persistencia.
5. Devuelve un identificador de cuenta y los datos públicos mínimos; no incluye hash, secreto ni token de otra persona.
6. El nuevo usuario podrá iniciar sesión mediante CU-02 y, después, crear una empresa (CU-03) o incorporarse mediante invitación válida (CU-12).

**Alternativos:** registrarse sin asociarse a ninguna empresa; una invitación puede aceptarse posteriormente (CU-12), pero registrarse no acepta invitaciones ni concede acceso automáticamente.  
**Excepciones:** identidad duplicada, datos inválidos, contraseña fuera de política o fallo de persistencia. No se crea cuenta parcial; el tratamiento de identidad duplicada debe evitar la enumeración abusiva de usuarios.  
**Criterios de aceptación:** usuario único; contraseña con hash; no exige empresa; sin filtraciones de información sensible en la respuesta.  
**Pendiente E2:** política exacta de contraseñas, confirmación de correo y comportamiento posterior al registro; no se presupone correo saliente en el primer corte.

### CU-02 — Iniciar sesión

**Requerimiento:** RF-01. **Actor:** Visitante registrado. **Objetivo:** autenticarse de manera segura para utilizar las funciones autorizadas.  
**Disparador:** el visitante presenta sus credenciales.  
**Precondiciones:** la cuenta existe y está habilitada.  
**Postcondición de éxito:** la API emite una credencial de sesión válida para identificar al usuario en peticiones posteriores; no concede acceso automáticamente a empresas ajenas.

**Flujo principal**

1. La persona registrada envía identificador y contraseña por HTTPS.
2. La API busca la cuenta y comprueba la contraseña contra su hash con un verificador seguro.
3. Si la cuenta está habilitada, emite la credencial de acceso según el mecanismo definido en el Documento 05.
4. El cliente utiliza esa credencial para consultar la identidad autenticada y el listado de empresas asociadas mediante membresías activas.
5. Si el usuario selecciona una empresa, la API vuelve a validar la membresía y los permisos en **cada solicitud empresarial**, no solo en el inicio de sesión.
6. Si no existe ninguna membresía, permite funciones personales y CU-03; no muestra empresas ajenas ni crea permisos implícitos.

**Alternativos:** el usuario no pertenece a ninguna empresa y solo puede operar sobre funciones personales, crear empresa o aceptar una invitación válida; cambiar de empresa no modifica la identidad global de la sesión.  
**Excepciones:** credenciales incorrectas, cuenta deshabilitada, solicitud malformada o credencial vencida/no válida en una petición posterior. Se rechaza el acceso y no se informa innecesariamente qué componente de las credenciales fue incorrecto.  
**Criterios de aceptación:** acceso anónimo rechazado en recursos protegidos; token o sesión verificable; pertenencia a empresa validada en cada solicitud empresarial.  
**Pendiente E2:** duración, revocación y almacenamiento seguro de las credenciales de sesión.

### CU-03 — Crear una empresa

**Requerimiento:** RF-02. **Actor:** Usuario autenticado. **Objetivo:** registrar una nueva empresa y obtener la responsabilidad administrativa inicial.  
**Disparador:** el usuario solicita crear empresa.  
**Precondiciones:** identidad autenticada; datos empresariales mínimos válidos.  
**Postcondición de éxito:** empresa creada, usuario vinculado mediante una membresía activa y un único titular administrativo inicial; el fundador histórico queda identificado.

**Flujo principal**

1. Un usuario autenticado solicita crear una empresa e informa nombre, rubro/tipo de actividad y campos obligatorios acordados.
2. La API valida los datos y que el solicitante sigue autenticado; no infiere la nueva empresa a partir de la sesión anterior.
3. En una sola transacción crea Empresa, registra el identificador inmutable del fundador y crea la Membresía inicial activa con responsabilidad administrativa.
4. Garantiza que exista exactamente un titular administrativo activo **inicial** y que ninguna escritura parcial quede guardada si falla el alta.
5. Devuelve el identificador de empresa y la membresía creada, sin modificar la pertenencia del usuario a sus otras empresas.
6. La empresa queda operativa para su configuración y para servicios, pero **sin ubicaciones ni stock ficticios**. Para recibir o vender bienes físicos, el administrador registra una ubicación apta mediante CU-04.

**Alternativos:** el usuario ya pertenece a otras empresas; la nueva empresa se agrega a su conjunto de membresías. Una empresa puede crearse **sin ninguna ubicación**, especialmente si ofrece sólo servicios. **No se crea automáticamente** una ubicación ficticia, depósito ni stock inicial.  
**Excepciones:** campos inválidos o error de escritura; la transacción revierte y no quedan empresas sin membresía inicial.  
**Criterios de aceptación:** usuario global; empresa aislada; fundador histórico; única titularidad administrativa inicial; empresa recién creada sin ubicación puede usar funciones administrativas y vender servicios si cumple los demás requisitos, pero **no puede recibir mercadería ni vender bienes físicos** hasta crear una ubicación habilitada mediante CU-04.  
**Pendiente E2:** campos obligatorios definitivos y política para empresas homónimas. Transferencia de titularidad y recuperación quedan fuera del MVP.

### CU-04 — Registrar una ubicación

**Requerimiento:** RF-03 (soporte). **Actor:** Miembro autorizado para administrar ubicaciones. **Objetivo:** habilitar un espacio de operación para registrar recepciones, existencias o ventas físicas.  
**Disparador:** solicita registrar ubicación dentro de una empresa.  
**Precondiciones:** usuario autenticado, membresía/permisos válidos y empresa existente.  
**Postcondición de éxito:** ubicación persistida, vinculada a una sola empresa y con capacidades explícitas de venta y/o almacenamiento.

**Flujo principal**

1. El administrador ingresa al contexto de una empresa donde posee permiso de gestión de ubicaciones.
2. Informa nombre, tipo y capacidades independientes: almacenar stock y/o realizar ventas.
3. La API verifica identidad, membresía activa, autorización y validez de los atributos; no confía en que el selector del cliente ofrezca solo datos propios.
4. Crea la ubicación ligada a esa empresa y registra su estado inicial (por ejemplo, `ACTIVA`).
5. Devuelve identificador, capacidades y estado; no crea compras, movimientos ni saldos iniciales.
6. Las operaciones posteriores evalúan las capacidades **vigentes**, no las que tenía la ubicación cuando se creó.

**Alternativos:** ubicación apta solo para venta, solo para almacenamiento o para ambas; una empresa exclusivamente de servicios puede operar sin depósito.  
**Excepciones:** empresa ajena, nombre o capacidad inválidos; en una operación posterior, se rechaza una ubicación pausada/inactiva si se exige actividad.  
**Criterios de aceptación:** no existe uso cruzado entre empresas; una recepción requiere ubicación apta para almacenamiento; un servicio no exige stock físico.

### CU-05 — Registrar un artículo o servicio

**Requerimiento:** RF-04. **Actor:** Miembro autorizado para gestionar catálogo. **Objetivo:** incorporar una ficha reutilizable a las operaciones de la empresa.  
**Disparador:** solicita registrar un artículo.  
**Precondiciones:** membresía y permisos válidos en la empresa.  
**Postcondición de éxito:** ficha de catálogo creada con tipo, estado, unidad y datos comerciales aplicables; no se genera stock por el solo registro.

**Flujo principal**

1. Un miembro autorizado abre el contexto de catálogo de una empresa.
2. Define nombre, clasificación física/servicio, categoría, unidad de control, condición vendible y estado inicial; SKU y precios/costos se informan cuando corresponda.
3. La API valida identidad, membresía, longitud/formato, unidad compatible y importes exactos en centavos.
4. Comprueba la unicidad de SKU **dentro de la empresa**; esta garantía deberá sostenerse también con una restricción en la base de datos, no solo con consulta previa.
5. Persiste la ficha con identificador propio de la empresa y estado inicial activo; una ficha sin precio puede requerir precio explícito al vender.
6. Devuelve la ficha registrada sin crear saldo de inventario ni movimientos. Una línea de servicio nunca será recepcionable ni descontará existencias.
7. Cuando una venta o compra se confirma más adelante, guarda el precio/nombre/unidad relevantes como snapshot de operación; editar la ficha no cambia retrospectivamente esos registros.

**Alternativos:** servicio sin existencias; bien físico sin stock inicial; SKU ausente si la política lo permite; ficha sin precio de lista, para cotizar al vender. La eventual edición/desactivación requerirá autorización y no reescribirá snapshots históricos.  
**Excepciones:** SKU duplicado en la misma empresa, unidad incompatible, datos inválidos, usuario no autorizado.  
**Criterios de aceptación:** mismo SKU en diferentes empresas permitido; servicio sin ledger físico; creación no altera Inventario.  
**Pendiente E2:** detalle de los tipos elaborados/insumos/reventa y campos mínimos definitivos. La edición/desactivación puede definirse como extensión de este CU durante contratos API.

### CU-06 — Registrar una compra

**Requerimiento:** RF-05. **Actor:** Miembro autorizado para gestionar compras. **Objetivo:** documentar una adquisición sin confundirla con la recepción de mercadería.  
**Disparador:** solicita registrar una compra de bienes y/o conceptos vinculados a un proveedor.  
**Precondiciones:** empresa y permisos válidos; importes y cantidades compatibles con las reglas comerciales. **No es obligatorio disponer todavía de ubicación de recepción.**  
**Postcondición de éxito:** compra identificada y persistida con renglones, totales y estado, **sin generar entradas de inventario**.

**Flujo principal**

1. El operador autorizado elige una empresa y fecha/referencia de compra, y selecciona un proveedor de esa empresa o indica ausencia de proveedor si el contrato lo permite.
2. Agrega uno o más renglones: bien físico identificado en catálogo, servicio o concepto libre no inventariable. Informa cantidad, unidad y costo unitario; puede omitir todavía la ubicación de recepción.
3. La API valida permisos, existencia/pertenencia de los artículos y proveedor, tipo de cada renglón, unidades, cantidades, fechas e importes en centavos exactos.
4. Calcula los importes de cada línea y total usando una regla explícita de redondeo y conserva un snapshot de descripción, unidad y costo. No asume que registrar compra signifique pagarla.
5. Si hay al menos un renglón físico recepcionable, crea Compra `REGISTRADA`; si solo existen líneas no físicas, crea `CERRADA_SIN_RECEPCION`.
6. Confirma compra y renglones como una unidad y devuelve identificador, estado y total. **En ninguno de los dos casos** crea movimientos de inventario.
7. Para entradas físicas posteriores, el operador debe ejecutar CU-07; una compra sin destino informado puede esperar sin afectar stock.

**Alternativos:** proveedor opcional; registrar sin ubicación de destino; conceptos libres permitidos bajo reglas explícitas. Una compra **sin ningún renglón físico recepcionable** se registra como `CERRADA_SIN_RECEPCION` (estado propuesto de cierre administrativo): **no** genera movimiento de stock y **no** habilita CU-07. No se inventa una recepción vacía.  
**Excepciones:** proveedor o artículo ajeno, artículo inactivo no permitido, cantidad/precio inválido, fecha o referencia inválida, compra sin líneas o conflicto de solicitud repetida. Ningún rechazo crea stock ni compra parcial.  
**Criterios de aceptación:** registrar una compra nunca modifica existencias; con bienes físicos queda `REGISTRADA`; sin bienes físicos se identifica inequívocamente que no requiere recepción.  
**Pendiente E2:** nombres de estados, si la cancelación se expone en API e idempotencia del registro de compra. La primera versión compromete una **única recepción completa en una ubicación por compra**; recepciones parciales/multidestino quedan diferidas.

### CU-07 — Confirmar recepción de mercadería

**Requerimientos:** RF-05 y RF-06. **Actor:** Miembro autorizado a recibir compras. **Objetivo:** registrar la entrada física correspondiente a una compra previa.  
**Disparador:** solicita confirmar la recepción de una compra.  
**Precondiciones:** compra de la misma empresa en estado `REGISTRADA`, con al menos un renglón físico recepcionable; ubicación de destino **existente, activa y apta para almacenar**; permisos vigentes.  
**Postcondición de éxito:** la compra pasa a `RECIBIDA`, queda registrada **una única recepción completa**, y todas las entradas físicas quedan correlacionadas con ella.

**Flujo principal**

1. El operador autorizado consulta una compra de su empresa y solicita recepcionar sus renglones físicos en una ubicación elegida.
2. La API valida empresa, permisos, existencia de compra y ubicación, estado activo y capacidad de almacenamiento; las líneas no inventariables no generan entradas.
3. En una **única transacción**, bloquea la compra o ejecuta una transición condicional equivalente y revalida que siga `REGISTRADA`, sin recepción previa. Determina los renglones físicos desde el snapshot de compra.
4. Registra una Recepción con identificador propio, referencia a la compra, ubicación y actor; registra una entrada por cada línea física conforme a cantidades y unidades de la compra.
5. En la **misma transacción**, cambia la compra a `RECIBIDA` y guarda el resultado de idempotencia; no existen compras recibidas sin sus entradas, ni entradas sin recepción.
6. Confirma y devuelve datos de recepción, estado final y existencias actualizadas por ubicación/artículo.
7. Si la respuesta de red se pierde después del commit, el cliente reintenta con igual clave y carga: obtiene la recepción anterior sin un segundo efecto.

**Alternativos:** compra mixta con servicios/conceptos administrativos y bienes físicos: únicamente se reciben los bienes físicos. Compra `CERRADA_SIN_RECEPCION`: no existe CU-07 aplicable; se informa que no requiere recepción.  
**Excepciones:** compra o ubicación ajena, ubicación no apta, compra ya `RECIBIDA` o `CANCELADA`, cambio concurrente de estado, datos inválidos o solicitud repetida con diferentes claves. Con **la misma clave de idempotencia y carga equivalente**, se recupera el resultado sin una segunda entrada; si se repite la clave con una carga diferente, el servidor rechaza el conflicto. Una segunda recepción con otra clave se rechaza por estado y/o restricción de unicidad.  
**Criterios de aceptación:** una compra con 10 unidades físicas en ubicación A genera +10 en A y cambia a `RECIBIDA`; la misma petición repetida deja +10; con **dos claves distintas concurrentes** solo una recepción triunfa. Una compra mixta solo ingresa sus bienes físicos. Ante errores no quedan compras `RECIBIDA` sin movimientos ni movimientos sin recepción.  
**Pendiente E2:** estrategia SQL concreta de unicidad/idempotencia y códigos HTTP. Se mantendrá el límite **0..1 Recepción por Compra** en el modelo MVP; cambiarlo a recepción parcial requerirá revisar estados, endpoints y CU-07.

**Máquina de estados de Compra (propuesta MVP)**

| Estado origen | Evento | Estado destino | Efecto en stock |
|---|---|---|---|
| — | Registrar compra con bienes físicos | `REGISTRADA` | Ninguno |
| — | Registrar compra sin bienes recepcionables | `CERRADA_SIN_RECEPCION` | Ninguno |
| `REGISTRADA` | Confirmar recepción completa en **una ubicación**, válida y atómica | `RECIBIDA` | Entradas físicas una sola vez |
| `REGISTRADA` | Cancelar antes de recibir (si se habilita en API) | `CANCELADA` | Ninguno |
| `RECIBIDA`, `CANCELADA`, `CERRADA_SIN_RECEPCION` | Intentar nueva recepción | Sin transición | Se rechaza; sin movimientos |

`BORRADOR` representa un formulario todavía no confirmado en el frontend y **no necesita convertirse en un estado persistido** del MVP. La cancelación es opcional para el primer corte: si no hay endpoint de cancelación, no se incluirá como operación disponible. Los nombres exactos se cerrarán con Documento 03 y los contratos del Documento 05.

### CU-08 — Consultar existencias por ubicación

**Requerimiento:** RF-06. **Actor:** Miembro autorizado. **Objetivo:** conocer existencias físicas disponibles por artículo y ubicación de su empresa.  
**Disparador:** solicita el inventario actual o aplica filtros de consulta.  
**Precondiciones:** membresía válida; empresa existente.  
**Postcondición:** se obtiene una proyección consistente sin modificar movimientos ni cantidades.

**Flujo principal**

1. Un miembro autorizado indica empresa y, si necesita, filtros de ubicación y artículo.
2. La API comprueba membresía y permisos de lectura, y que cada filtro pertenece a la empresa solicitada.
3. Lee una proyección consistente de los movimientos confirmados o una proyección de saldos reconciliable con el ledger; nunca suma ventas o recepciones por separado para producir un segundo saldo independiente.
4. Agrupa por empresa, artículo físico y ubicación, respetando la escala de la unidad del artículo.
5. Devuelve saldos, identificación de ubicaciones/artículos y unidades. Los bienes sin movimientos pueden mostrar saldo cero según el contrato de consulta.
6. La consulta no genera ajustes ni movimientos; la corrección de una diferencia detectada se realiza mediante CU-11.

**Alternativos:** empresa sin bienes físicos o artículo sin movimientos: cero/resultado vacío según el contrato; múltiples ubicaciones muestran saldos separados. Las ubicaciones pausadas conservan su historial aunque no sean aptas para nuevas operaciones.  
**Excepciones:** empresa sin permiso, artículo o ubicación ajeno, filtro inválido.  
**Criterios de aceptación:** la consulta no modifica stock; nunca mezcla unidades ni datos de empresas; los servicios carecen de existencias físicas.

### CU-09 — Trasladar existencias entre ubicaciones

**Requerimiento:** RF-06. **Actor:** Miembro autorizado para movimientos. **Objetivo:** trasladar cantidades físicas de una ubicación a otra dentro de la misma empresa.  
**Disparador:** el actor confirma un traslado.  
**Precondiciones:** origen y destino válidos y distintos, ambos aptos para almacenamiento; artículo físico y cantidad mayor que cero.  
**Postcondición de éxito:** movimiento de salida en origen y entrada equivalente en destino, confirmados en una sola transacción.

**Flujo principal**

1. El operador indica empresa, artículo físico, ubicación de origen, ubicación de destino, cantidad y referencia/motivo si corresponde.
2. La API valida identidad, permisos y pertenencia de **ambas** ubicaciones y del artículo; origen y destino deben ser distintos, activos y aptos para almacenamiento.
3. Valida cantidad positiva y escala de unidad; no admite servicios ni conversiones implícitas de paquetes/cajas/kilos.
4. En **una única transacción**, obtiene control exclusivo o atómico sobre los saldos necesarios y comprueba disponibilidad actual del origen (no la observada anteriormente en la UI).
5. Genera una operación de traslado con identificador único y **dos movimientos correlacionados**: salida de origen y entrada equivalente en destino.
6. Guarda la clave de idempotencia junto con el efecto, confirma o revierte toda la operación y devuelve los dos saldos resultantes.
7. Una petición repetida con la misma clave/carga devuelve el traslado existente; una clave distinta representa operación nueva y se valida contra el stock vigente.

**Alternativos:** traslado entre distintos tipos de ubicación, si ambas están habilitadas para almacenamiento.  
**Excepciones:** origen y destino iguales; stock insuficiente; servicio seleccionado; recursos de otras empresas; alguna ubicación inactiva; reintento duplicado.  
**Criterios de aceptación:** desde 10 unidades, trasladar 3 deja 7 en origen y 3 en destino; intentar trasladar 11 se rechaza sin cambios; repetir la solicitud no vuelve a trasladar.  
**Pendiente E2:** decidir entre saldo bloqueable y ledger, actualización condicional o aislamiento serializable comprobado; definir el manejo de creación concurrente de saldo inicialmente cero.

### CU-10 — Registrar venta con pagos declarados

**Requerimiento:** RF-07. **Actor:** Miembro autorizado para ventas. **Objetivo:** registrar una venta con uno o varios medios declarados y mantener consistencia de inventario.  
**Disparador:** el vendedor solicita confirmar la venta.  
**Precondiciones:** empresa y permisos válidos; productos y servicios vendibles, cantidades y precios correctos; para bienes físicos, ubicación activa apta para la venta y almacenamiento y stock suficiente **al momento de confirmar**.  
**Postcondición de éxito:** venta confirmada exactamente una vez, aplicaciones de pago que suman el total exacto y movimientos de salida vinculados **sólo a renglones de bienes físicos**; no acredita pagos externos.

**Flujo principal**

1. El operador selecciona empresa y agrega al carrito uno o varios artículos físicos y/o servicios, con cantidades, unidades, precios y descuento total.
2. Si hay al menos un bien físico, indica ubicación **activa** que admita venta y almacenamiento; una venta solo de servicios puede prescindir de ubicación.
3. Informa uno o varios pagos **declarados** (p. ej., efectivo y transferencia), con importes positivos expresados en centavos; no se confirman ni concilian acreditaciones bancarias externas.
4. La API valida autenticación, membresía, permisos, pertenencia de artículos y ubicación, escala de unidades, disponibilidad comercial, límites de precios y descuentos; calcula subtotal, descuento y total con reglas exactas y verifica que los pagos sumen exactamente el total. Deben rechazarse ventas sin total positivo.
5. En **una transacción única**, revalida estado activo/vendible de productos, permisos y capacidades vigentes de ubicación. Controla la concurrencia de existencias de **todas** las líneas físicas (incluso artículos repetidos en el carrito) mediante saldo bloqueable/decremento condicionado o aislamiento equivalente; suma por artículo antes de exigir disponibilidad.
6. Si hay stock para todas las líneas físicas, registra Venta, renglones con snapshots, aplicaciones de pago declaradas y movimientos de salida físicos correlacionados, junto con la clave de idempotencia. **Los servicios no crean movimientos de stock**.
7. Confirma todo o revierte todo: ninguna falta de stock puede dejar pagos, comprobantes o salidas parciales. Devuelve el comprobante interno, totales, medios declarados y saldos afectados.
8. Ante una respuesta perdida, el reintento con la misma clave y carga recupera la venta existente; una operación nueva con otra clave vuelve a competir por el stock real.

**Alternativos:** venta solo de servicios sin depósito ni salida física; venta mixta; pagos divididos (efectivo + transferencia u otros medios declarados). Una referencia de cuenta financiera puede omitirse en esta primera API; la validación integral de cuentas y jornadas corresponde a RF-08/RF-09 posteriores. Una misma línea de artículo físico repetida se agrega lógicamente para comprobar disponibilidad.  
**Excepciones:** pagos que no concilian; total cero o descuento no válido; artículo desactivado entre selección y confirmación; cambio de ubicación; stock insuficiente, incluidos dos pedidos simultáneos por la última unidad; recurso ajeno; unidad/cantidad incorrecta; clave reutilizada con contenido distinto. No se genera venta parcial, stock negativo ni aplicaciones de pago sueltas.  
**Criterios de aceptación:** totales exactos en centavos; pagos combinados conciliados; servicios sin movimiento físico; 2 ventas concurrentes por 1 unidad = **exactamente 1 venta exitosa y 1 rechazo controlado**, con saldo final 0; la operación fallida no deja pagos ni salidas; reintento de la exitosa no duplica.  
**Pendiente E2:** elegir una estrategia transaccional coherente en PostgreSQL, definir bloqueo ordenado y manejo de colisiones, fijar reglas para artículo desactivado mientras se confirma. Cuentas asociadas, jornadas y QR de pago permanecen en una fase posterior del backend.

### CU-11 — Registrar ajuste justificado de inventario

**Requerimiento:** RF-06. **Actor:** Miembro autorizado para ajustar inventario. **Objetivo:** corregir diferencias físicas registrando su causa, sin inventar compras ni ventas.  
**Disparador:** el actor detecta faltante, merma, daño o sobrante, o registra una diferencia luego de contar físicamente.  
**Precondiciones:** usuario autorizado en la empresa; ubicación válida con almacenamiento; artículo físico, unidad y cantidad compatibles.  
**Postcondición de éxito:** se registra un movimiento de ajuste trazable y las existencias cambian únicamente por la diferencia confirmada.

**Flujo principal**

1. El operador autorizado selecciona empresa, ubicación apta, artículo físico y tipo de ajuste: **ingreso** o **egreso**.
2. Informa cantidad exacta en la unidad del artículo, motivo obligatorio y, opcionalmente, referencia a una verificación física; la API valida longitud, formato, actor y pertenencia al tenant.
3. Revalida que el artículo y la ubicación se encuentren habilitados para la operación.
4. En **una transacción única**, obtiene control concurrente sobre el saldo afectado, lee existencias vigentes y comprueba que un egreso no genere saldo negativo.
5. Inserta una operación identificable y el movimiento firmado correspondiente, con actor, fecha, motivo, empresa y referencia de idempotencia.
6. Confirma y devuelve el movimiento y saldo actualizado, sin modificar retroactivamente ventas, recepciones ni traslados.
7. Si se informa un **conteo físico** en lugar de una diferencia directa, se debe acompañar del saldo/versión observado: si otro actor modificó el stock desde la lectura, se rechaza el conteo obsoleto y se solicita revisar la diferencia; no se debe recalcular el ajuste contra un saldo cambiado sin advertirlo.

**Alternativos:** un **conteo físico individual** puede originar un ajuste, pero requiere comparar contra el saldo/versión observado y rechazar cambios intermedios; coincidencia sin diferencia no genera movimiento. El **conteo multiartículo con sesión de revisión** del frontend queda diferido si no se incorpora expresamente al MVP.  
**Excepciones:** artículo de tipo servicio, datos ajenos a la empresa, motivo ausente, cantidad o unidad inválida, intento de salida mayor al stock disponible, reintento duplicado, saldo cambiado concurrentemente durante un conteo. Si el stock cambia entre el conteo físico y su confirmación, la API debe **rechazar la operación obsoleta o exigir revisión explícita**, no sobrescribir silenciosamente movimientos de terceros.  
**Criterios de aceptación:** si hay 10 unidades y se registra merma de 2, saldo final 8; ajuste de salida de 11 se rechaza íntegramente; ajuste positivo queda trazado; reintento con la misma clave no duplica; una venta concurrente no deja saldo negativo ni anula una diferencia sin revisión.  
**Pendiente E2:** definir motivos mínimos y si el conteo individual tendrá operación propia. El **ajuste de diferencia justificada** es el compromiso mínimo del CU; no mezclar a ciegas «establecer saldo absoluto» con «sumar/restar cantidad».

### CU-12 — Invitar y aceptar incorporación de un colaborador

**Requerimiento:** RF-02. **Actores:** Administrador autorizado (solicita la invitación) y Usuario invitado (acepta). **Objetivo:** vincular de forma consentida una identidad global existente a otra empresa, con una membresía y permisos acotados.  
**Prioridad:** **soporte propuesto** para demostrar multiusuario real; confirmar si forma parte de la primera API o se prepara mediante fixtures en las pruebas. **No requiere envío automático de correos, enlace QR público ni alta de socios legales.**  
**Disparador:** el administrador desea incorporar a un colaborador.  
**Precondiciones:** empresa existente; administrador con permiso de invitación; destinatario con identidad válida (puede registrarse mediante CU-01 antes de aceptar).  
**Postcondición de éxito:** existe **una sola membresía activa** del invitado en esa empresa y el token de invitación queda consumido; en otra empresa conserva sus permisos originales.

**Flujo principal**

1. Un administrador autenticado elige su empresa y solicita una invitación dirigida a un correo/identidad concreta con rol permitido (nunca la titularidad administrativa por defecto).
2. La API comprueba la membresía y permiso del administrador, límites de rol, duplicados y validez del destinatario.
3. Genera una invitación `PENDIENTE` con token seguro, vencimiento y empresa de origen; **crear la invitación no otorga acceso**. Su comunicación al destinatario podrá ser manual durante el MVP.
4. El destinatario autenticado recibe el token y solicita aceptarlo; si aún no tiene cuenta, primero ejecuta CU-01 y CU-02.
5. La API valida en servidor token, vencimiento, estado `PENDIENTE`, destinatario autenticado correcto y empresa correspondiente.
6. **En una misma transacción** crea/activa su membresía permitida, registra aceptación y consume la invitación exactamente una vez; ninguna otra identidad puede aprovechar el token.
7. Devuelve membresía y empresa accesible. El usuario solo verá recursos para los que tenga permisos y únicamente desde ese momento.

**Alternativos:** si el usuario ya tiene membresía activa, no se crea otra; la API informa que ya pertenece a esa empresa. La invitación puede rechazarse/cancelarse si se implementan esas operaciones.  
**Excepciones:** token inválido, vencido, reutilizado o dirigido a otra cuenta; administrador no autorizado; rol excesivo; empresa no accesible; aceptación concurrente. Todos los errores deben evitar revelar información sensible del destinatario y no crear membresías parciales.  
**Criterios de aceptación:** invitar no concede acceso; un token se consume una vez; solo la identidad destinataria lo acepta; el invitado puede pertenecer a A y B con roles diferentes; no se duplican membresías bajo aceptación concurrente; el administrador no puede transferir titularidad mediante invitación básica.  
**E2-1.3C.3 y posteriores validados:** la emisión CU-12a existe en la API (token de siete días entregado solo en 201, roles `ENCARGADO`/`TRABAJADOR`, único pendiente por correo y empresa). C.4a implementó y validó la aceptación CU-12b (**171 pruebas locales**). C.4b implementó listado y actualización del equipo (**195 pruebas locales**, CI 3/3), sin habilitar transferencia de titularidad. Cancelación, rechazo y reenvío de invitaciones continúan pendientes. Se conserva unicidad SQL `(business_id,user_id)`.

## 5. Escenarios transversales de validación

| ID | Escenario | Casos vinculados | Resultado esperado en API |
|---|---|---|---|
| ET-01 | Usuario sin membresía intenta acceder a otra empresa | CU-04 a CU-12 (según contexto) | Rechazo, sin revelar datos de esa empresa |
| ET-02 | Reenvío de una recepción confirmada | CU-07 | Una sola recepción y entradas; resultado estable con misma clave |
| ET-03 | Dos usuarios autorizados venden simultáneamente el único artículo disponible | CU-10 | 1 venta confirmada, 1 rechazada; saldo final 0, nunca negativo |
| ET-04 | Traslado que supera existencias | CU-09 | Sin salida ni entrada; stock previo intacto |
| ET-05 | Venta mixta de producto físico y servicio | CU-10 | Stock sólo afectado por los bienes físicos |
| ET-06 | Usuario autenticado sin empresa | CU-02, CU-03 | Puede crear empresa; no obtiene acceso a otra por conocer un ID |
| ET-07 | SKU repetido en otra empresa | CU-05 | Permitido entre empresas, único dentro de cada empresa |
| ET-08 | Compra registrada sin recepción | CU-06, CU-08 | Inventario sin cambios |
| ET-09 | Compra sin bienes recepcionables | CU-06, CU-07 | Cierre sin recepción física; CU-07 rechazado, ningún movimiento |
| ET-10 | Dos solicitudes confirman recepción de la misma compra | CU-07 | Una sola transición a `RECIBIDA`; sin doble entrada |
| ET-11 | Ajuste por merma sin motivo o superior al saldo | CU-11 | Rechazo y stock intacto |
| ET-12 | Stock cambia entre lectura previa y confirmación de venta, traslado o ajuste | CU-09 a CU-11 | Se revalida dentro de transacción y no hay saldo negativo |
| ET-13 | Crear empresa sin ubicación, luego recibir bienes o vender bien físico | CU-03, CU-04, CU-07, CU-10 | Se rechaza hasta crear una ubicación habilitada; servicios permitidos sin depósito |
| ET-14 | Reusar misma clave de idempotencia con una carga diferente | CU-07, CU-09, CU-10, CU-11 | Conflicto controlado, sin segunda operación |
| ET-15 | Se invita a otro usuario pero no acepta, o intenta aceptar desde otra cuenta | CU-12, CU-02 | Sin nueva membresía activa; la invitación no concede acceso por sí sola |
| ET-16 | Se repite aceptación de invitación o se aceptan en paralelo dos veces | CU-12 | Una sola membresía; invitación consumida una vez |
| ET-17 | Compra/venta falla después de preparar registros pero antes de confirmar | CU-06, CU-07, CU-09, CU-10, CU-11 | Rollback completo; sin datos parciales, saldos y operaciones coherentes |
| ET-18 | Venta de 2 renglones del mismo artículo con stock menor que el total solicitado | CU-10 | Rechazo completo; no se valida cada renglón aisladamente |
| ET-19 | Usuario consulta otra empresa con un ID válido de artículo, proveedor o ubicación | CU-04 a CU-12 | Sin lectura/escritura ajena; rechazo sin fuga de atributos |

### 5.1 Cómo probar ET-03 con dos usuarios sin dos computadoras

La prueba de **concurrencia** no depende de que dos personas hagan clic al mismo tiempo ni de la interfaz visual: la ejecutará un test de integración que lance dos peticiones HTTP simultáneas contra el backend real, con **PostgreSQL de pruebas**. No sirve como prueba equivalente ejecutar en `localStorage`, ni asumir que SQLite en memoria replica el comportamiento de bloqueos de PostgreSQL.

**Preparación reproducible:**

1. Crear una empresa de pruebas, un artículo físico vendible, una ubicación activa y **exactamente 1 unidad** disponible mediante una recepción o ajuste válido.
2. Crear **dos usuarios distintos** con membresía y permiso de ventas en esa misma empresa, mediante CU-12 si está implementado o mediante **fixtures controladas de test**; obtener dos credenciales válidas. En ningún caso reutilizar una única identidad para fingir dos usuarios.
3. Preparar dos ventas con un renglón de 1 unidad, pagos declarados que concilien y **claves de idempotencia diferentes**.
4. Lanzar las dos peticiones en paralelo mediante `asyncio.gather`, con dos clientes HTTP y **dos sesiones/transacciones independientes de SQLAlchemy**; sincronizar el comienzo mediante barrera de prueba si se requiere probar contención real. Si el endpoint bloquea un recurso común, repetir la prueba varias veces.
5. Verificar respuestas y **estado persistido**: una confirmación exitosa y un rechazo de negocio por falta de stock, **exactamente una venta**, sus aplicaciones de pago, una salida física y saldo final 0. No debe quedar venta/línea/pago parcial del intento rechazado.
6. Reintentar la petición **exitosa con su misma clave** y confirmar que se recupera la misma venta sin generar otra salida.

> El test debe consultar la base tras finalizar ambas solicitudes. Dos respuestas HTTP por sí solas no demuestran integridad. Si el motor utiliza serialización con reintentos controlados, la API debe resolver o rechazar el conflicto de forma coherente. La coincidencia temporal exacta de las peticiones no puede darse por probada sin instrumentación; un ensayo repetible bajo contención es más sólido.

**Ejemplo conceptual de la prueba (no código implementado):**

```python
# Con PostgreSQL real, fixtures de dos usuarios autenticados y 1 unidad en stock.
resultados = await asyncio.gather(
    cliente_ana.post(ruta_ventas, json=venta_ana, headers=headers_ana),
    cliente_beto.post(ruta_ventas, json=venta_beto, headers=headers_beto),
)
assert sum(r.status_code == 201 for r in resultados) == 1
assert sum(r.status_code == 409 for r in resultados) == 1  # 409 propuesto; validar en Documento 05
assert consultar_ventas_confirmadas() == 1
assert consultar_salidas_de_stock() == 1
assert consultar_aplicaciones_pago() == 1  # un único medio en esta fixture
assert consultar_stock_disponible() == 0
```

**Clasificación:** ET-03 es una **prueba de integración/concurrencia**, no reemplaza los **10 tests unitarios** que exige la materia. El ejemplo presupone una aplicación de pago por venta, por eso espera una sola aplicación confirmada. Se pueden cubrir las reglas con tests unitarios separados y ejecutar este escenario adicional con PostgreSQL en Docker/GitHub Actions. La interfaz con dos navegadores puede servir como demostración, pero no es un test confiable de una condición de carrera.

### 5.2 Matriz breve de resultados para cada transacción

| Operación | Resultado exitoso | Si falla una validación o ocurre conflicto | Reintento idéntico |
|---|---|---|---|
| Registrar compra (CU-06) | Compra + líneas y estado, **sin stock** | Sin compra ni líneas parciales | Definir idempotencia en Documento 05; recomendado para evitar dobles compras |
| Recepción (CU-07) | Recepción + todas las entradas + estado `RECIBIDA` | Compra queda pendiente y stock inalterado | Devuelve la misma recepción |
| Traslado (CU-09) | Referencia + una salida y una entrada equivalentes | No aparece ninguno de los dos movimientos | Devuelve el mismo traslado |
| Venta (CU-10) | Venta + líneas + pagos declarados + salidas físicas | Sin venta, aplicaciones ni salidas parciales | Devuelve la misma venta |
| Ajuste (CU-11) | Operación + movimiento con motivo + saldo coherente | Sin movimiento ni cambio de saldo | Devuelve el mismo ajuste |
| Aceptar invitación (CU-12) | Membresía + invitación consumida | Sin nueva membresía y sin estado de aceptación parcial | No duplica membresía |

Un caso de uso no certifica por sí solo el cumplimiento: estos resultados pasan a ser **tests del servidor** cuando exista FastAPI/PostgreSQL. En los casos transaccionales es necesario verificar tanto la respuesta HTTP como el estado persistido.

## 6. Relación con los diagramas UML

El **diagrama de casos de uso** representará como actores externos al Usuario autenticado, Titular/Administrador y Colaborador autorizado (según permisos); CU-01 y CU-02 se asociarán al Visitante. CU-12 relaciona al Administrador que invita y al Usuario autenticado que acepta, sin dibujar la API como actor. **El sistema/API no será actor del diagrama**. Las relaciones entre actores deben indicar especialización solo cuando sea semánticamente válida.

No es necesario dibujar los doce casos con todas sus excepciones. Para la **presentación**, se propondrá una vista general legible y se detallarán los flujos complejos con esta especificación. Las relaciones `<<include>>` y `<<extend>>` se añadirán únicamente si cumplen su significado UML, no por decoración.

El **diagrama de clases** se definirá después de aprobar el dominio y no se confundirá con el esquema de tablas SQL: habrá entidades como Usuario, Empresa, Membresía, Artículo, Ubicación, Proveedor, Compra, Recepción, Movimiento de stock, Venta y Aplicación de pago, con cardinalidades e invariantes coherentes.

Para demostrar concurrencia e idempotencia en la defensa será útil, aunque no obligatorio, un **diagrama de secuencia de confirmación de venta**, mostrando verificación y descuento bajo la misma transacción. La máquina de estados de Compra se describe en CU-07; **no obliga a implementar el patrón State**.

## 7. Cobertura del alcance y funcionalidades diferidas

Los casos CU-01 a CU-12 corresponden al backend **propuesto**, no a doce capacidades completamente implementadas hoy. La inclusión de CU-12 no obliga a enviar correos ni incorpora automáticamente permisos reales al frontend local. RF-08 (gastos y caja), RF-09 (cuentas declaradas) y RF-10 (QR DEMO) permanecen en el frontend local y se especificarán para backend solo si la planificación se amplía. Las operaciones de devoluciones, producción por lotes, reservas, conciliación bancaria y pagos reales no están comprometidas para la primera API.

Los endpoints y métodos HTTP exactos se definirán en `05_MATRIZ_API_Y_TRAZABILIDAD.md`. No se equipararán pruebas del frontend DEMO con pruebas unitarias y de integración del backend académico.

## 8. Decisiones pendientes de aprobación

| Decisión | Propuesta inicial | Impacto |
|---|---|---|
| D-CU-01: permisos del backend | Titular/Administrador habilita catálogos y ubicaciones; colaboradores ejecutan operaciones concedidas por empresa | Seguridad y matriz de roles |
| D-CU-02: recepción de compras | Primera API registra **una recepción completa por compra**; recepciones parciales diferidas. Compra sólo administrativa termina en `CERRADA_SIN_RECEPCION` (propuesto) | Entidades, estados y pruebas |
| D-CU-03: ubicación de productos físicos | Una venta física requiere ubicación con capacidades de venta y almacenamiento; servicios no exigen ubicación | Diseño de venta e inventario |
| D-CU-04: proveedor de compra | Opcional para registro, como en la DEMO; no determina automáticamente recepción/pago | API de compras |
| D-CU-05: estrategias de sesión y errores | Registrar/login y permisos definidos en fase de contratos; errores estructurados preferentemente con RFC 9457 | Seguridad y pruebas |
| D-CU-06: concurrencia de stock | Comparar bloqueo de saldo en PostgreSQL vs actualizaciones atómicas condicionadas; transacción de venta y movimiento única | Garantía contra sobreventa; test ET-03 |
| D-CU-07: ajuste de inventario | Habilitar ajuste manual con motivo y traza; conteo multiartículo se difiere si no es parte del alcance aprobado | CU-11, permisos y pruebas |
| D-CU-08: invitaciones/membresías | CU-12 como soporte mínimo recomendado sin correo automático; alternativamente preparar membresías solo con fixtures para concurrencia si se difiere el endpoint | RF-02, usuarios reales y ET-03 |
| D-CU-09: monto y presentación | ARS en centavos, cantidades de unidad escalada y snapshots de importes; definir redondeo y rangos en esquemas | CU-05, CU-06, CU-10 y Documento 05 |
| D-CU-10: saldos concurrentes | Si se usa ledger, no bloquear únicamente movimientos históricos; garantizar recurso de saldo serializable para entradas/salidas concurrentes | CU-07, CU-09, CU-10, CU-11 |

## 9. Condiciones de aprobación

Esta versión se considera base revisada para entrega. El equipo deberá confirmar los actores, el alcance de operaciones del núcleo y, especialmente, si **una recepción completa por compra** es suficiente para la API académica. Se propone como decisión de menor complejidad para el MVP, sin impedir evolución posterior a recepciones parciales. Los campos, códigos HTTP y rutas definitivas podrán precisarse durante diseño de API sin reescribir las metas de los casos de uso.

**Estado:** versión 0.3 revisada para entrega como especificación **TO-BE**. Los contratos HTTP, permisos y esquemas SQL definitivos deberán concordar con los documentos siguientes; cualquier cambio de alcance exige actualizar los RF y CU relacionados.

**Referencia técnica externa consultada para el formato de errores:** RFC 9457 — *Problem Details for HTTP APIs* (IETF, 2023), que reemplaza a RFC 7807: https://www.rfc-editor.org/rfc/rfc9457.html. Se documenta como preferencia arquitectónica, no como obligación expresa de la consigna.

## 10. Estado de los casos de uso y próxima política de autorización

| CU | Estado API | Endpoint o comprobación |
|---|---|---|
| CU-01 Registro | Implementado y probado localmente | `POST /api/v1/auth/register` |
| CU-02 Login/perfil/salida | Implementado y probado localmente | `POST /login`, `GET /me`, `POST /logout` bajo `/api/v1/auth` |
| CU-03 Crear y administrar perfil de empresa | Alta y lectura verificadas; edición C.2 publicada, aún sin pruebas locales confirmadas | `POST/GET /api/v1/businesses`, `GET/PATCH /api/v1/businesses/{business_id}`; RBAC empresarial en PATCH |
| CU-04–CU-11 | Pendiente backend | Plan conceptual y experiencia frontend DEMO; todavía no hay endpoint real |
| CU-12 Invitaciones/equipo | **C.3/C.4a/C.4b validados localmente; 195 pruebas finales y CI funcional 3/3** | Emisión, aceptación, directorio `GET /api/v1/businesses/{business_id}/memberships` y edición `PATCH /api/v1/businesses/{business_id}/memberships/{membership_id}` |

**Política E2-1.3C.1:** se implementa la **matriz RBAC pura** con cuatro roles de membresía; para consulta empresarial todos los miembros activos pueden leer, mientras que la configuración se reserva al titular y administrador. `ENCARGADO` y `TRABAJADOR` no reciben facultad general para editar empresa, invitar ni administrar miembros. **Esta primera entrega define y prueba la política; la aplicación efectiva a la primera mutación protegida es el siguiente corte.** Identificador empresarial ajeno o membresía inactiva no deben otorgar acceso. Para un miembro activo de una empresa suspendida se prevé lectura informativa, no cambios. Véase Documento 05 para el detalle y los errores HTTP previstos.

## 11. Complemento CU-03 — editar el perfil de una empresa (E2-1.3C.2)

**Actor:** usuario autenticado con membresía `ACTIVA` en la empresa objetivo y rol `TITULAR_ADMINISTRATIVO` o `ADMINISTRADOR`. **Precondiciones:** sesión vigente y cuenta activa; empresa existente, propia y `ACTIVA`; cuerpo de PATCH con al menos uno de `name`, `category`, `activity_kind`.

**Flujo principal:** (1) cliente envía `PATCH /api/v1/businesses/{business_id}` con Bearer y campos permitidos; (2) FastAPI valida forma y valores, y el servidor autentica; (3) el servicio vuelve a bloquear/comprobar usuario y sesión; (4) consulta y bloquea el par `Business`–`Membership` del mismo tenant con membresía activa; (5) evalúa `BusinessPermission.EDIT_PROFILE`; (6) modifica solo campos presentes y confirma una única transacción; (7) responde 200 con `BusinessView` actualizado y la membresía que autorizó.

**Alternativas:** sesión inválida `401`; empresa ajena, inexistente o sin membresía activa `404`; miembro válido sin facultad `403`; titular/administrador de empresa suspendida `409`; campos prohibidos, `null`, nombres no válidos o cuerpo vacío `422`. Toda excepción antes del commit revierte la actualización. El rol de una empresa nunca habilita modificar otra. El estado no se actualiza por esta API.

**Pruebas introducidas en C.2 (validadas posteriormente en la regresión de E2-1):** flujo exitoso del titular, administrador, denegación a encargado/trabajador, aislamiento entre empresas, empresa suspendida, sesión revocada, membresía inactiva, validación del cuerpo y rollback inducido tras `flush`. Este complemento no crea una entidad nueva ni exige regenerar 03A/03B.

## 12. E2-1.3C.3 — contrato parcial de CU-12a: emitir invitación

**Precondiciones:** usuario con token personal vigente, membresía `ACTIVA` en la empresa `ACTIVA` y permiso `members.invite` (titular administrativo o administrador). Solicitud con `email` válido y rol `ENCARGADO` o `TRABAJADOR` exclusivamente. No se requiere una cuenta global previa del destinatario.

**Flujo:** autenticar; revalidar sesión/usuario bloqueando filas; bloquear empresa+membresía del actor; verificar permiso en el mismo tenant; verificar que no exista ya membresía `ACTIVA` asociada al correo en esa empresa; descartar de forma explícita una invitación `PENDIENTE` vencida de la misma empresa/correo; rechazar duplicado vigente; generar un token seguro de 256 bits, persistir **solo** hash, plazo y datos mínimos; confirmar una sola transacción; devolver 201 e incluir el token una vez en la respuesta. No se crean miembros ni usuarios.

**Alternativas:** 401 sin sesión; 404 si empresa ajena/inexistente o membresía inactiva; 403 si rol sin permiso; 409 empresa suspendida, miembro activo existente o invitación pendiente vigente; 422 correo/rol no admitidos o campos extra. Todos los errores revierten cambios. La tokenización se valida solo en servidor, no por React.

**Pruebas y evidencia:** CI del commit C.3 exitoso en Python 3.12/3.14, migración+deriva Alembic y contenedor. Debe ejecutarse también en el equipo local. CU-12b (aceptación única por destinatario autenticado), cancelación, gestión de miembros y permisos de aprobación siguen **pendientes**.

## 13. C.4a — Aceptación de invitación CU-12b (implementada y validada localmente)

**Actor:** cuenta global con sesión Bearer válida y correo normalizado **igual** al correo de la invitación. El destinatario puede registrar su cuenta después de que se haya emitido la invitación. El emisor no acepta en nombre del destinatario.

**Flujo principal:** (1) enviar `POST /api/v1/invitations/accept` con `{"invitation_token":"..."}`; (2) comprobar sesión y cuenta con bloqueo SQL; (3) consultar la invitación por huella SHA-256 y bloquearla; (4) exigir que el correo de la cuenta coincida con el destinatario; (5) exigir estado PENDIENTE y `expires_at` futura; (6) bloquear la Empresa ACTIVA; (7) bloquear la eventual Membresía del usuario y crearla si no existe o reactivarla si estaba INACTIVA, preservando la unicidad por tenant; (8) consumir token con estado ACEPTADA y guardar quién/cuándo aceptó; (9) confirmar membresía + invitación en una transacción; (10) devolver `BusinessView` y habilitar GET empresarial.

**Excepciones:** 401 sesión/usuario inválido; 404 token inexistente o dirigido a otra identidad **con el mismo mensaje**; 409 token consumido/vencido, empresa suspendida, membresía ya activa o reactivación de antiguo titular administrativo; 422 token con forma inválida o campos extra. Las excepciones no crean ni reactivan miembros. La aceptación consumida no produce segunda membresía ni cambio de rol al reintentarse. El rol para membresía reactivada proviene de invitación, no del cliente; el `job_title` anterior se limpia. No se permite degradar un titular histórico inactivo con una invitación operativa.

**Trazabilidad:** CU-12b complementa CU-12a y RF-02. Se añaden `accepted_by_user_id` y `accepted_at` en una migración aditiva `e213c4_acceptance`, con restricción para que las columnas de auditoría solo aparezcan con `ACEPTADA` y sean obligatorias en ese estado. **CI aprobó Pytest/Alembic para ambos Python**; C.4a se verificó con 171 pruebas locales y C.4b con 195. La validación por correo real, cambios de rol y UI pertenecen a otros cortes.

## 14. C.4b — CU-12: consultar equipo y cambiar permisos operativos

**Consulta:** un Usuario autenticado con membresía `ACTIVA` y rol `TITULAR_ADMINISTRATIVO` o `ADMINISTRADOR` solicita `GET /api/v1/businesses/{business_id}/memberships`. La API revalida su sesión, bloquea la empresa/membresía propia y comprueba el permiso `members.read`; devuelve directorio de **esa empresa exclusivamente**, incluyendo miembros inactivos. Respuestas: 200 lista, 401 sin sesión, 403 rol sin permiso, 404 empresa ajena o miembro actor inactivo, 409 empresa suspendida. El directorio muestra datos profesionales mínimos, no secretos del usuario.

**Mutación:** solo un titular administrativo **activo** puede solicitar `PATCH /api/v1/businesses/{business_id}/memberships/{membership_id}` con campo `role` y/o `status`. El cuerpo es parcial; valores `null`, desconocidos, `TITULAR_ADMINISTRATIVO` y campos extra dan 422. Revalidar sesión, empresa/membresía del actor, privilegio `members.manage` y membresía objetivo de la misma empresa; bloquear en SQL y confirmar una sola transacción. Un administrador no puede desactivar a colegas ni ascenderse. El titular no puede modificar su propia membresía ni ninguna membresía cuyo rol actual sea `TITULAR_ADMINISTRATIVO` (respuesta 409, rollback). Un objetivo ajeno/no existente da 404. Empresa suspendida da 409. Usuario no autenticado da 401 y miembro actor sin permisos da 403. Una desactivación tiene efecto inmediato en las próximas solicitudes con esa cuenta para ese tenant; no revoca su identidad global ni afecta otras empresas.

**Fuera de alcance:** transferencia o cese del titular, eliminación física, edición `job_title`, envío de emails, verificación de propiedad de correo y gestión de solicitudes de invitación. El usuario mantiene su identidad personal global. La revisión de 03A y el cierre del bloque E2-1 se tratarán en una etapa documental propia. **Pruebas de C.4b aprobadas en CI, todavía no ejecutadas localmente**.

## 15. C.5 — Correspondencia de casos de uso con API real

CU-01/CU-02 (identidad) y los flujos concretados de CU-03/CU-12 (empresa, invitación y equipo básico) tienen endpoints y pruebas PostgreSQL. **Los casos de uso comerciales permanecen TO-BE**, aunque React DEMO disponga de pantallas. C.4b: `195 passed in 23.86s`, CI funcional 3/3 y Alembic sin diferencias. La transferencia de titularidad no está implementada; la auditoría para el compañero se preparará en una entrega separada, antes de RF-03.
