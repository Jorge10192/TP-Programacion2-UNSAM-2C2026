# E2-7 T07 — Integración REAL de proveedores, compras y recepción

**Estado:** revisión de cierre incremental aprobada técnicamente el 10/11/2026; se conserva trazabilidad de QA pendiente para T11. Consultar `E2-7_T07_CIERRE_REVISION_Y_PRUEBAS.md` antes de fusionar.  
**Rama:** `feature/e2-7-t07-proveedores-compras-recepcion`  
**Base:** `main` `fed4f8282fed964cdfb00bf96c07a5ab71e7eb75` (T06 integrado).

## 1. Alcance y contratos

Esta entrega conecta UI REAL con los endpoints de FastAPI ya existentes. No cambia backend, Alembic, datos DEMO ni habilita ventas/caja reales.

| Acción | Endpoint, relativo a `/api/v1` | Condición |
|---|---|---|
| Listar proveedores | `GET /businesses/{id}/suppliers?offset=n&limit=100` | Membresía activa y permiso de lectura; activos e inactivos |
| Crear proveedor | `POST /businesses/{id}/suppliers` | Solo titular/administrador; nombre obligatorio |
| Activar/desactivar | `PATCH /businesses/{id}/suppliers/{supplier_id}/status` | Solo titular/administrador |
| Listar compras | `GET /businesses/{id}/purchases?offset=n&limit=100` | Lectura empresarial; todas las situaciones |
| Detalle de compra | `GET /businesses/{id}/purchases/{purchase_id}` | Snapshots históricos |
| Registrar compra | `POST /businesses/{id}/purchases` | `Idempotency-Key: UUID4`; 201 alta / 200 replay |
| Recibir compra | `POST /businesses/{id}/purchases/{purchase_id}/receive` | `Idempotency-Key: UUID4`; 201 recepción / 200 replay |
| Consultar recepción | `GET /businesses/{id}/purchases/{purchase_id}/receipt` | Historial, movimientos y saldos |

La UI genera y valida UUID4; no los construye desde IDs DEMO ni los publica como tokens. El backend comprueba empresa, permisos, estado, artículo/proveedor y destino nuevamente.

## 2. Semántica comercial importante

**Registrar compra NO modifica inventario.** Se guarda un documento con renglones, montos y snapshots inmutables. La compra con algún bien físico queda `REGISTRADA` y debe recibirse después, seleccionando sede. Una compra compuesta solo por conceptos o servicios queda `CERRADA_SIN_RECEPCION`.

**Confirmar recepción SÍ incrementa el stock real.** Es integral, irreversible desde esta pantalla, atómica y destinada a una única sede activa con `can_store=true`. No permite cantidades manuales ni recepciones parciales. El servicio de backend vuelve a comprobar que los artículos físicos estén activos, que mantengan tipo/unidad, que el actor pueda operar en la sede y que el stock no exceda límites. Un reintento idéntico con la misma clave devuelve comprobante histórico y no duplica stock. Si la compra ya se recibió con otra clave, corresponde verificar comprobante, no crear un nuevo intento.

Cálculo: cantidades en `quantity_milli` (entero en milésimas) y costos en `unit_cost_cents` (entero en centavos). Total por línea = `HALF_UP(quantity_milli * unit_cost_cents / 1000)`, con **BigInt** para evitar imprecisión numérica, concordando con Python. `UNIDAD`, `PAQUETE`, `CAJA`, `SERVICIO` y `CONCEPTO` requieren múltiplos de 1000.

El formulario permite líneas vinculadas al catálogo REAL (con unidad derivada) o concepto libre (sin stock). Hasta 30 renglones. Se permite compra sin proveedor. La selección de catálogo y proveedores es sobre páginas cargadas: si hay más de 100, la pantalla ofrece cargar más y no presume que vio todo.

### 2.1. Costo unitario propuesto desde catálogo (mejora UX de T07)

**Decisión de negocio y arquitectura:** el `reference_cost_cents` del artículo NO es el `unit_cost_cents` de la compra. El primero es una referencia vigente y editable en el catálogo; el segundo es el valor histórico efectivamente pactado con el proveedor y queda fijado en cada renglón de la compra.

- Al **seleccionar un artículo** del catálogo REAL en un renglón nuevo, la UI propone `reference_cost_cents` convertido a pesos con dos decimales, sin multiplicar números flotantes.
- El campo de costo unitario **sigue siendo editable** para cargar el importe exacto del comprobante del proveedor; modificar cantidad, proveedor o fecha no reemplaza el costo editado.
- `reference_cost_cents = null` significa costo de referencia no informado: el campo queda **vacío**, no se interpreta como cero. `reference_cost_cents = 0` sí representa cero informado y se propone como `0,00`.
- Al volver a seleccionar otro artículo se propone el costo del nuevo artículo; al pasar a concepto libre, el costo queda vacío. Las líneas recuperadas de IndexedDB después de F5 conservan el costo original bloqueado: nunca se recalculan desde el catálogo.
- Cuando el costo unitario ingresado supera el **precio de venta actual** (`price_cents`), la interfaz exhibe un aviso **informativo, no bloqueante**. No hay comparación si falta el precio de venta o si el importe aún está vacío/no válido.
- Crear o recibir una compra **no modifica automáticamente** el costo de referencia, el precio de venta ni la ficha del catálogo. Actualizar referencias sería otra decisión explícita y otro comando.
- No se infieren márgenes reales sin considerar gastos, descuentos, impuestos y diferencias de unidad; la advertencia solo detecta una comparación simple por unidad.
- Contratos FastAPI/DTO, `quantity_milli`, `unit_cost_cents`, snapshots e idempotencia permanecen **sin cambios**. Es una mejora de formulario, no de modelo de datos.

**Caso testigo (TEST Empresa A):** `Producto A TEST` tiene precio de venta $1.500,00 y costo de referencia $800,00. Al elegirlo en una nueva compra se sugiere **$800,00**, que puede reemplazarse por **$2.000,00**, generando una advertencia sin impedir el POST. El ejemplo histórico ya creado por el usuario conserva **2 UNIDAD × $2.000,00 = $4.000,00**; no debe mutarse para reflejar la sugerencia.


## 3. Recuperación de operaciones pendientes

A diferencia de proveedores, las altas de compra y recepción disponen de **replay idempotente server-side**. Se aplica el patrón de T06:

1. Antes de POST, guarda en IndexedDB el actor, tenant, tipo de operación, UUID4 y cuerpo EXACTO.
2. Si falla almacenamiento, se aborta antes de enviar.
3. Si se pierde respuesta, no se dispara un segundo comando automático.
4. Tras F5 y login, la pantalla de compras recupera el pendiente de creación por actor/empresa. Muestra los renglones originales inmutables y permite consultar historial antes de reintentar exactamente la misma clave y cuerpo.
5. Para recepción se guarda también ID de compra y sede; el pendiente se restaura al seleccionar la compra. El comprobante `GET /receipt` expone `request_id` y permite reconciliar. Si coincide con la clave local, se limpia sin repetir POST.
6. Se limpia el registro local solo después de confirmar respuesta, confirmar comprobante por request-id coincidente o descarte manual informado de una compra. Nunca se borra un movimiento o documento del backend con ello.

**Limitaciones y privacidad:** IndexedDB del navegador no está cifrado; puede guardar datos comerciales de compra (renglones, notas, costos). No contiene contraseñas, token Bearer ni secretos de invitación. Usar únicamente con datos de prueba y no en equipos compartidos. Se limita a 60 registros por origen, no se purgan silenciosamente; mayor a 30 días requiere revisión en el cierre del producto. Borrar datos del navegador destruye pendientes; en otra computadora no se transfieren. La persistencia solo protege frente a F5/caídas cuando IndexedDB está disponible.

**Proveedores:** la API carece de clave idempotente. No se persiste/repite automáticamente un alta de proveedor ante respuesta incierta; la UI solicita reconsultar proveedores antes de una nueva acción.

## 4. UI y archivos

- `/real/empresas/{id}/proveedores` — proveedores reales por tenant, alta inicial por nombre y estados, paginación.
- `/real/empresas/{id}/compras` — historial paginado, registro con artículos/costos, proveedor opcional, recepción de bienes en sede, comprobante.
- `frontend/src/features/purchases/realSupplyGateway.ts` — DTOs, rutas, validación HTTP, centavos y milésimas.
- `frontend/src/features/purchases/purchaseCostProposal.ts` — funciones puras para proponer costo de catálogo y detectar costo mayor al precio de venta; **no realizan PATCH ni POST**.
- `frontend/src/features/purchases/supplyPendingJournal.ts` — intents durables por actor, empresa y compra; chequeo de cuerpo inmutable.
- `frontend/src/features/suppliers/RealSuppliersPage.tsx` y `frontend/src/features/purchases/RealPurchasesPage.tsx` — vistas independientes de DEMO.
- `frontend/tests/supply-real-api.test.mjs` + `npm.cmd run test:supply-real` — contratos/roles/tenancy/saldo.
- El workflow de frontend incorpora `test:supply-real`. No se modificaron contratos del backend.

## 5. Comandos Windows — desde `plataforma-pyme/frontend`

```powershell
git pull --ff-only origin feature/e2-7-t07-proveedores-compras-recepcion

npm.cmd run test:supply-real
if ($LASTEXITCODE -ne 0) { throw 'Falló test:supply-real' }
npm.cmd run test:pending-commands
if ($LASTEXITCODE -ne 0) { throw 'Falló test:pending-commands' }
npm.cmd run test:catalog-real
if ($LASTEXITCODE -ne 0) { throw 'Falló test:catalog-real' }
npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'Falló build' }
npm.cmd run lint
if ($LASTEXITCODE -ne 0) { throw 'Falló lint' }
```

Para navegar: API/Postgres Docker activos, ejecutar `$env:PYME_API_PROXY_TARGET='http://127.0.0.1:18000'; npm.cmd run dev` y abrir `http://localhost:5173/real/login`.

## 6. QA manual con las empresas TEST existentes

| Prueba | Acción | Esperado |
|---|---|---|
| T07-01 | Titular de Empresa A → Proveedores, crear `Proveedor A T07` | Figura solo en A; B no lo ve |
| T07-02 | Desactivar/reactivar proveedor | Estado persistente tras actualizar |
| T07-03 | Crear `Compra A T07` con artículo de REVENTA activo del Catálogo A, `UNIDAD`, cantidad `2`, costo `1250,55` | Compra `REGISTRADA`, total $2501,10, **sin stock incrementado aún** |
| T07-04 | Abrir la compra y confirmar recepción en `Sede A TEST` | Compra pasa a `RECIBIDA` y se crean movimientos/saldos reales de entrada |
| T07-05 | Consultar comprobante de recepción | Mismo `purchase_id`, `location_id`, `request_id`; no duplica stock |
| T07-06 | Crear compra solo con concepto libre | `CERRADA_SIN_RECEPCION`; no botón para recibir |
| T07-07 | Empresa B → Proveedores y Compras | No se muestran documentos ni proveedores de A |
| T07-08 | Trabajador de Empresa A consulta compras/proveedores | Lectura sin formulario de alta; permisos efectivos se vuelven a comprobar en servidor |
| T07-09 | Trabajador de A intenta URL directa de compra B | `404`, sin datos de B |
| T07-10 | Interrumpir API ANTES de enviar una compra de prueba | Pendiente IndexedDB; F5/re-login recupera clave y cuerpo; reintento manual solo una compra |
| T07-11 | Interrumpir API antes de confirmar recepción | Misma clave/sede tras re-login; consultar recibo antes de reintento; no doble entrada |
| T07-12 | Prueba backend replay con clave idéntica | 201 primera, 200 segunda; documento y stock únicos |
| T07-13 | Intentar recibir en sede pausada/sin can_store | Rechazo 409, sin stock |
| T07-14 | DEMO `/inicio` | Ninguna modificación en cuentas, gastos, compras o stock simulados |
| T07-15 | Catálogos/proveedores 101+ y compras 101+ | Paginación real, sin listas incompletas asumidas como completas |
| T07-16 | En nueva compra, seleccionar `Producto A TEST` | Costo sugerido $800,00 desde catálogo, campo editable |
| T07-17 | Sustituir sugerencia por $2.000,00 y cambiar cantidad a 2 | Conserva $2.000,00, muestra advertencia sobre venta $1.500,00 y **no bloquea** |
| T07-18 | Artículo con costo de referencia no informado (`null`) / cero explícito (`0`) | Vacío / `0,00`; ambos se distinguen correctamente |
| T07-19 | Reabrir compra histórica, regresar a catálogo | La compra original conserva su costo; la ficha del artículo no se modifica automáticamente |
| T07-20 | Recuperar una compra pendiente tras F5 y nuevo login | Costo guardado e inmutable; no se reemplaza por referencia actualizada |


Las pruebas de fallo se realizan solo con datos de prueba y la API de Docker. No eliminar el volumen PostgreSQL. No simular un 201 perdido en datos productivos; para una prueba de extremo a extremo exhaustiva conviene utilizar PostgreSQL temporal aislado y un proxy controlable.

## 7. Puerta de cierre

No fusionar T07 sin CI aprobado, tests locales, creación de proveedor, documento con concepto y bienes, recepción con movimiento real, permisos por tenant, prueba de reintento manual y DEMO intacta. Documentar que la lectura de balances reales detallados de inventario se abordará en T08; T07 solo muestra el comprobante.

## 8. Evidencia de QA de T07 y estado de integración

**Confirmado con capturas compartidas por el usuario (10/11/2026):** Empresa A muestra botones de proveedores y compras REAL; `Proveedor A T07` se creó, desactivó y reactivó; una compra de **2 UNIDAD × $2.000,00 = $4.000,00** se registró sin stock, después se confirmó como **RECIBIDA** con 1 movimiento real de stock; la lectura posterior del comprobante confirmó recepción en una sede, sin reenvío del POST. La señal 404 transitoria que había aparecido no volvió a presentarse en la última lectura.

**Actualización de cierre del 10/11/2026:** los casos centrales descritos anteriormente fueron completados y están registrados en las secciones 9–16. El informe `E2-7_T07_CIERRE_REVISION_Y_PRUEBAS.md` presenta las 165 pruebas frontend aprobadas en CI, 6 recorridos Chromium DEMO, evidencia manual con PostgreSQL, limitaciones del alcance y criterios adicionales trasladados a T11. No confundir esta conformidad del incremento T07 con el cierre de toda la integración E2-7.

**Integración posterior:** el módulo T08 deberá usar entradas de recepción y balances reales, sin inferir stocks a partir de costos de referencia. Los reportes posteriores deberán distinguir `reference_cost_cents` vigente de `unit_cost_cents` histórico por compra. Esta regla se transmite a la documentación de cierre T12 y a cualquier UI que integre compras/catálogo.

## 9. Decisión UX T07: importe por renglón y proveedor de compra

**Diseño aprobado por el usuario (10/11/2026):** el proveedor se selecciona **una sola vez en la cabecera de cada compra**, no repetido por renglón. Una compra puede contener múltiples productos, servicios o conceptos del mismo proveedor. Si los proveedores difieren, corresponden documentos de compra separados. La compra sin proveedor sigue siendo válida conforme al contrato de FastAPI.

Cada renglón presenta en una misma fila, de izquierda a derecha:

1. **Cantidad** (editable, hasta tres decimales según unidad).
2. **Costo unitario de esta compra** (editable, precargado con costo de referencia cuando exista).
3. **Costo total del renglón** (más ancho y visualmente destacado; se calcula automáticamente).

El subtotal **no se repite** en una fórmula de texto ni en un segundo bloque. Una acción `Editar` junto al campo total habilita una **edición explícita por total**. Mientras el usuario modifica el total, cantidad y unitario quedan temporalmente bloqueados; debe pulsar `Aplicar total` o `Cancelar` antes de registrar la compra. Si aplica, se calcula un `unit_cost_cents` compatible con la cantidad y se comprueba que `HALF_UP(quantity_milli * unit_cost_cents / 1000)` sea exactamente el importe introducido. **No se admiten ajustes silenciosos de centavos.** Algunos importes no se pueden representar exactamente con las unidades y costos actuales (por ejemplo 3 unidades por $10,00); en esos casos se explica la incompatibilidad y se mantiene la edición sin enviar POST.

La suma de subtotales de todos los renglones aparece una sola vez, al pie del formulario, como **Total de la compra**. Es solo una vista previa calculada: los contratos backend permanecen iguales y FastAPI vuelve a calcular el total histórico de forma autoritativa. No hay campo de total adicional enviado a la API ni actualización automática del costo de referencia del catálogo. La funcionalidad futura de *ofrecer actualizar el costo de referencia* queda registrada como propuesta optativa y autorizada explícitamente, separada del alta de compra. No se modifica el precio de venta sin una operación independiente.

**QA de presentación y cálculos:**

- T07-21: 4 unidades a $800,00 → subtotal $3.200,00; el importe no se duplica visualmente.
- T07-22: editar total a $12.000,00 con cantidad 4 → costo unitario $3.000,00; margen informativo si supera el precio de venta.
- T07-23: 3 unidades con total $10,00 → validación de importe no representable; no redondear ni registrar.
- T07-24: dos renglones 4×$800,00 y 2×$2.000,00 → Total de la compra $7.200,00, sin multiplicación float.
- T07-25: cambiar la cantidad o el unitario → subtotal se recalcula; no se modifica referencia del catálogo.
- T07-26: verificar el formulario en pantallas estrechas: el subtotal pasa a la fila siguiente sin perder etiquetas ni controles.

## 10. Decisión UX T07: distinguir recepción pendiente de confirmada

**Solicitud adicional del usuario (10/11/2026):** los controles de **Confirmar recepción** no deben tener apariencia de operación completada. La comunicación visual depende exclusivamente de `Purchase.status` devuelto por FastAPI, no de que el usuario haya abierto la pantalla de recepción.

| Estado backend | Etiqueta mostrada | Estilo |
|---|---|---|
| `REGISTRADA` | **REGISTRADA · RECEPCIÓN PENDIENTE** | Insignia ámbar; botón *Pendiente · Confirmar recepción en ubicación* también ámbar |
| Formulario de recepción por confirmar | **Confirmar recepción REAL** / **Reintentar MISMA recepción** | Acción principal ámbar, nunca verde; botón deshabilitado sin sede seleccionada |
| `RECIBIDA` | **RECIBIDA** | Insignia verde de confirmación real; acción posterior solo **Consultar comprobante** |
| `CERRADA_SIN_RECEPCION`, `CANCELADA` | Etiquetas respectivas | Neutro, no implican recepción pendiente ni exitosa |

El color **acompaña al texto**, nunca lo reemplaza: los estados se distinguen también por su nombre. El amarillo/ámbar representa una operación pendiente de confirmar; el verde se reserva para el registro que ya consta como `RECIBIDA` en PostgreSQL. El botón de recepción no provoca ninguna mutación al abrir el formulario: la escritura sigue ejecutándose solo con la confirmación, el destino válido y el mismo mecanismo de idempotencia/replay que antes. No se cambia backend, modelo de datos, balances ni permisos.

**QA adicional:**

- T07-27: compra recién creada `REGISTRADA` → etiqueta y botón ámbar; no aparece ninguna señal verde de `RECIBIDA`.
- T07-28: confirmar recepción en sede activa → en nueva lectura aparece `RECIBIDA` en verde; desaparece botón de confirmar y aparece *Consultar comprobante*.
- T07-29: compra solo concepto / cancelada → estilo neutro; jamás se ofrece recepción.
- T07-30: modo móvil y teclado → contraste legible, foco visible, estado también por texto.
- T07-31: API rechaza recepción o se pierde respuesta → no pintar verde por optimismo; conservar `REGISTRADA` hasta confirmar desde servidor.

**Trazabilidad:** `frontend/src/features/purchases/realSupplyGateway.ts` exporta la clasificación semántica del estado; `RealPurchasesPage.tsx` aplica clases según dicho estado; `auth.css` contiene los estilos ámbar/verde/neutro. Las pruebas automatizadas validan el mapeo y los cálculos; las pruebas de interfaz aún deben observarse en el navegador antes del cierre de T07. Este criterio cromático se incluye en el traspaso a T08/T12, y en los módulos futuros que reciban mercadería.

## 11. Corrección UX: error 404 al verificar recepción pendiente (QA colaborador)

**Observación real de QA (10/11/2026):** un trabajador con acceso de lectura a `TEST Empresa A` recuperó una intención de recepción de la compra `Compra2 prueba E2-7 T07` en IndexedDB, pulsó `Consultar comprobante` y vio el error rojo genérico «Proveedor, compra, sede o empresa no disponible para esta cuenta». La compra continuaba visible como `REGISTRADA · RECEPCIÓN PENDIENTE`.

**Causa verificada en backend:** `GET /businesses/{id}/purchases/{purchase_id}/receipt` devuelve `404` tanto cuando todavía NO existe el recibo (`ReceiptNotFound`) como para determinados recursos no disponibles/ajenos. El frontend anterior confundía ausencia de comprobante con inaccesibilidad a un recurso, sin verificar el estado de la compra.

**Resolución en T07, sin cambios de backend:** ante `404` de `GET /receipt`, se consulta mediante **otro GET** el detalle de la misma compra, autenticado con el mismo token y tenant:

- Si `GET /purchase` confirma que es legible y sigue `REGISTRADA`: mostrar aviso informativo «Todavía no hay un comprobante de recepción confirmado…», mantener el intento original y su clave, sin repetir POST ni incrementar stock.
- Si el detalle muestra `RECIBIDA` pero no se puede leer su comprobante: presentar inconsistencia explícita y pedir revisar el acceso/servidor; **no volver a recibir**.
- Si `GET /purchase` devuelve `401`, `403` o `404`: respetar el error de autenticación/autorización/inaccesibilidad. **Nunca** transformar un recurso ajeno o inaccesible en una supuesta compra pendiente.
- Si `GET /receipt` devuelve `200`, comprobar `request_id` y conciliar/limpiar la clave local únicamente al verificar la misma operación, igual que antes.
- Ante un fallo de conexión, no afirmar que no existe el comprobante; conservar la intención y no reintentar automáticamente.

**Importante:** esta mejora es para **consultar**, no para otorgar autorización de confirmar recepción. Al pulsar `Reintentar MISMA recepción` sigue siendo FastAPI quien valida los permisos de `STORE` de la cuenta y su asignación a la sede. Una solicitud fallida por permisos no puede convertirse en exitosa desde React.

**Pruebas automatizadas:** `inspectReceipt` comprueba que el caso 404 + compra registrada hace exactamente dos GET y cero POST; que el 404 del detalle no se disfraza de ausencia de recibo; que estado `RECIBIDA` sin recibo es inconsistencia; y que un comprobante confirmado se lee con un GET.

**QA manual pendiente después del ajuste:** con la cuenta trabajadora, abrir el intento pendiente, usar `Consultar comprobante`, esperar el aviso no rojo si la compra sigue `REGISTRADA` y confirmar que el botón de reintento conserva la clave original, sin movimientos nuevos. Si luego se decide completar la recepción, verificar previamente asignación activa y permisos en sede, y hacer **una** confirmación explícita con esa misma clave. No suprimir los códigos HTTP para otros recursos.

## 12. Detalle visual del comprobante de recepción confirmada

**Decisión aprobada por el usuario el 10/11/2026.** Durante la prueba de recepción con la cuenta colaboradora se confirmó la compra «Compra2 prueba E2-7 T07» y el backend devolvió correctamente la recepción. Sin embargo, el botón «Consultar comprobante» solo mostraba un mensaje verde con el UUID de la ubicación. La expectativa era consultar un detalle legible, no solamente una notificación.

**Resolución T07 (solo frontend):**

- «Consultar comprobante» ejecuta el GET del recibo existente, y al obtener un registro válido presenta un panel inline «Detalle de recepción», asociado a su compra, con estado **CONFIRMADA**.
- Incluye referencia de la compra, nombre de la sede, fecha/hora de confirmación, responsable, detalle de entradas de stock y saldos posteriores del backend.
- La sede se resuelve por su nombre desde las ubicaciones REAL ya consultadas para la empresa; si no aparece en la lista, se explicita el nombre no disponible, dejando su UUID en la sección desplegable de trazabilidad.
- Se utiliza el campo confirmed_by_id del servidor: cuando coincide con la sesión actual, se muestra session.user.display_name; si corresponde a otra persona, se muestra su ID de auditoría sin inventar ni revelar datos privados del equipo. No se ejecutan lecturas de membresías restringidas al trabajador.
- Cada movimiento y cantidad proceden del comprobante REAL. La descripción y unidad se obtienen preferentemente de los snapshots históricos de la compra, no de los artículos vigentes; balances_after se utiliza solo cuando está disponible. No se agregan movimientos ficticios para servicios o conceptos.
- Los identificadores de recibo y ubicación quedan bajo «Identificadores de trazabilidad», no como texto principal. No se publica ni copia la clave request_id del comando idempotente.
- El panel señala que **es un registro interno de FastAPI/PostgreSQL, no una factura ni un PDF**. La exportación PDF no forma parte de T07.
- El detalle dispone de «Cerrar detalle» y diseño adaptable a pantallas estrechas. Al consultar desde el formulario de recepción (situado debajo del listado), el navegador enfoca y desplaza la vista al detalle recién abierto para que el usuario no siga viendo solamente el formulario. No modifica estado comercial, inventario, roles, importes ni datos DEMO.
- Cuando un POST de recepción acaba con respuesta válida, ese mismo recibo puede presentarse directamente, sin hacer otro POST. Al consultar un comprobante confirmado, se sigue reconciliando la clave pendiente por request_id según T06/T07. Para una recepción todavía pendiente, el manejo de 404 de la sección 11 continúa intacto.

**Implementación:**
- frontend/src/features/purchases/RealReceiptDetail.tsx: vista legible.
- frontend/src/features/purchases/receiptViewModel.ts: mapeo puro de DTOs históricos, sedes, actor, milésimas y saldos.
- frontend/src/features/purchases/RealPurchasesPage.tsx: apertura del comprobante dentro de la compra correspondiente.
- frontend/src/features/auth/RealAuthApp.tsx: comparte display_name del usuario autenticado, sin consultar miembros privados.
- frontend/src/features/auth/auth.css: estilos responsive.
- frontend/tests/supply-real-api.test.mjs: pruebas de nombre/ID de responsable, sede, snapshots y servicios sin movimientos.

**QA manual antes de fusionar PR #40:**

1. Con Miguel, abrir «Compra2 prueba E2-7 T07» ya RECIBIDA, consultar comprobante y comprobar sede «Sede A TEST», fecha de servidor, responsable «miguel» (si coincide con display_name de la sesión), +5 UNIDAD de Producto A TEST y saldo posterior. Las 2 unidades de servicio no deben generar movimiento de inventario.
2. Desde el titular, leer esa misma recepción: no mostrar un nombre de responsable inventado para el otro usuario; mostrar su identificador.
3. Consultar la primera compra recibida: debe presentar +2 UNIDAD sin crear otro movimiento.
4. Verificar que el estado RECIBIDA siga verde, que «Cerrar detalle» funcione y que consultar nunca reenvíe una recepción.
5. Verificar el panel en pantalla estrecha y las etiquetas de identificadores de auditoría.
6. En compras REGISTRADA sin recibo, mantener el aviso de ausencia de comprobante y la clave original, sin simulación de éxito.

**Transferencia:** T08 debe conservar la separación entre comprobantes de compra y el ledger global del inventario. T12 debe documentar que esta vista es comprobante **interno**, no factura electrónica ni PDF. El cierre de T07 requiere capturas de navegador y CI aprobado.

## 13. Evidencia visual posterior al comprobante detallado — 10/11/2026

**Validado por captura de navegador del usuario en la cuenta colaboradora (Miguel):** el botón «Consultar comprobante» de la compra real «Compra2 prueba E2-7 T07» abre correctamente el panel «Detalle de recepción», estado **CONFIRMADA**, ubicación **Sede A TEST**, fecha/hora de confirmación **10 nov 2026, 8:23 a. m.**, responsable **miguel**, **1 entrada real de inventario** de **Producto A TEST +5 UNIDAD**, saldo posterior de **11 UNIDAD** y la aclaración expresa de que no se trata de factura del proveedor ni archivo PDF. No se presenta una entrada ficticia del servicio incluido en esa compra. «Identificadores de trazabilidad» aparece plegado y está disponible «Cerrar detalle».

**Criterio T07 de comprobante: aprobado visualmente**, además de los tests de mapeo automatizados. El valor de saldo informado corresponde al balance que devuelve el backend para esa recepción, no debe deducirse de los importes de compras.

**Otras evidencias del mismo recorrido QA compartidas en la conversación:** la compra quedó `RECIBIDA` después de la acción explícita autorizada a un TRABAJADOR con asignación a sede; la consulta posterior confirmó el registro sin hacer otro POST. Anteriormente, la cuenta colaboradora con sede `NO ASIGNADO` podía consultar compras pero no estaba autorizada para confirmar allí. En Empresa B el listado de compras estaba vacío mientras Empresa A mostraba tres compras. La pantalla de proveedores del trabajador de A se presentó sin controles de administración. Los subtotales, la suma del documento, costo de referencia y el color ámbar/verde se comprobaron mediante capturas.

**Criterios de cierre pendientes de evidencia manual completa:** URL directa de compra de B como trabajador A (T07-09); pruebas controladas de interrupción y recuperación de alta/recepción con F5 en entorno aislado (T07-10 y T07-11); verificación independiente de replay backend (T07-12); sede pausada/sin almacenamiento (T07-13); paginación 101+ (T07-15) y los casos de importes especiales T07-18/T07-20/T07-23. Parte de estas situaciones ya tiene pruebas unitarias/contratos, pero eso no equivale a evidencias manuales end-to-end.

**Decisión de cierre:** no declarar el incremento completamente validado ni fusionar automáticamente por la sola captura. Mantener PR #40 como borrador hasta revisar y ejecutar o justificar explícitamente los criterios pendientes, sin crear movimientos de stock adicionales solo para validar una vista de lectura.

## 14. Evidencia QA de aislamiento de proveedores por empresa — 10/11/2026

**T07-07 (proveedores): aprobado visualmente.** El usuario abrió la vista **Proveedores REAL** de **TEST Empresa B**, autenticado en el entorno real. La captura indica «Proveedores de TEST Empresa B consultados en FastAPI y PostgreSQL. Sin datos DEMO», muestra **0 proveedores cargados** y el estado vacío «No hay proveedores registrados en esta empresa». En capturas anteriores la vista de **TEST Empresa A** mostraba **Proveedor A T07**. Por lo tanto, el proveedor de A no se presenta en el listado de B. La lectura no efectuó ninguna mutación.

La parte de **compras** del mismo caso T07-07 también tenía evidencia anterior: B mostraba 0 compras y A mostraba 3. Esta observación confirma el aislamiento de listados en la UI, **no equivale por sí sola a una prueba adversarial HTTP** de acceso por ID al recurso ajeno; esa prueba queda dentro de T07-09 y del conjunto de contratos automatizados.

**Estado:** T07-07 completo en su alcance de interfaz. Continúan las demás verificaciones pendientes descritas en la sección 13; no fusionar el PR por esta sola comprobación.

## 15. Evidencia QA: compra compuesta exclusivamente por concepto libre — 10/11/2026

**T07-06: aprobado visualmente con captura de la interfaz REAL.** El usuario registró una cuarta compra de TEST Empresa A bajo la referencia `concepto libre T07`, sin proveedor, con **1 renglón de CONCEPTO**, cantidad **5** y costo unitario **$500,00**; el resumen mostró **$2.500,00** y estado **CERRADA SIN RECEPCIÓN**. No se presentó botón para confirmar recepción ni acción para aumentar inventario.

**Alcance de la evidencia:** se verificó la aritmética, el estado comercial y la ausencia de la acción de recepción en el frontend conectado a FastAPI/PostgreSQL. Aunque el caso inicialmente sugería cantidad 1, utilizar cantidad 5 es compatible con la misma regla y muestra correctamente la multiplicación. No se comparó en esta prueba el ledger de stock antes y después, por lo que la ausencia de movimientos queda respaldada por el comportamiento de la UI y las reglas/pruebas del backend, pero no por una comprobación independiente de existencias.

**No fusionado:** T07-06 pasa de pendiente a aprobado en su alcance de interfaz; otros criterios aún pendientes se enumeran en la sección 13. No se requirió confirmar recepción ni modificar movimientos de stock.

## 16. Evidencia QA de no regresión DEMO y aislamiento REAL — 10/11/2026

**T07-14: aprobado en el alcance manual revisado.** El usuario abrió la aplicación de demostración después de integrar los módulos REAL de T07. Proporcionó dos capturas y confirmó que la navegación y los botones que probó funcionan correctamente, con los datos de ejemplo de WALOS y sin mezcla visible con las empresas TEST A/B.

**Captura de Inventario DEMO:** pestañas «Existencias» e «Historial de movimientos», filtros de búsqueda y ubicación, y seis combinaciones visibles de existencias por artículo/sede. Se observan «colageno hidrolizado» (Casa Propia 600 gramo; San Martín Feria 380 gramo), «Crema de enjuague» (Casa Propia 11 caja; San Martín Feria 80 caja), «Shampoo» (Casa Propia 8 unidad; San Martín Feria 70 unidad). Son datos de demostración, **no saldos reales de PostgreSQL**.

**Captura de Catálogo DEMO:** «Artículos y servicios» con 3 activos visibles de 4, campos de búsqueda/tipo/estado, fichas para esos mismos artículos, imágenes, costos y precios DEMO, con acciones «Ver ficha», «Editar» y «Desactivar». El usuario informó que los botones probados respondieron correctamente.

**Aislamiento observable:** ninguna ficha ni combinación de existencias de TEST Empresa A o TEST Empresa B aparece mezclada con el catálogo/inventario DEMO mostrado. Las verificaciones previas en áreas REAL también excluyeron los registros DEMO. Estas capturas no prueban por sí solas todos los recorridos DEMO (ventas, gastos, otras pantallas) ni autorizan afirmar una batería e2e completa; el resultado se circunscribe a catálogo, inventario, navegación y acciones reportadas.

**Resultado:** T07-14 aprobado para no regresión de las vistas inspeccionadas, sin mutaciones de datos reales y sin necesidad de alterar imágenes o existencias DEMO. Mantener suites y controles de regresión para los módulos adicionales en T11. Los demás criterios pendientes de la sección 13 continúan como pendientes, a revisar antes de fusionar.
