# E2-7 T07 — Integración REAL de proveedores, compras y recepción

**Estado:** implementación sujeta a CI y QA manual en PostgreSQL; PR borrador, no fusionar prematuramente.  
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

**Pendiente:** comprobaciones manuales de T07-06 a T07-15 sobre roles, otras empresas, F5/replay, conceptos y paginación extensa; QA visual del costo propuesto T07-16 a T07-20 tras incorporar este cambio; y estado final de CI del último commit. No declarar T07 fusionado ni completo sin esas evidencias.

**Integración posterior:** el módulo T08 deberá usar entradas de recepción y balances reales, sin inferir stocks a partir de costos de referencia. Los reportes posteriores deberán distinguir `reference_cost_cents` vigente de `unit_cost_cents` histórico por compra. Esta regla se transmite a la documentación de cierre T12 y a cualquier UI que integre compras/catálogo.
