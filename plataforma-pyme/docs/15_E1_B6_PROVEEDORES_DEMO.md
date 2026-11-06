# E1-B6 — Proveedores multirrubro (DEMO)

**Estado:** integrado y publicado en `main`. **Pendiente de compilación, lint, pruebas automatizadas y validación visual local.**
**Material recibido:** `walos_proveedores.html` y capturas de directorio, ficha y formulario; `01_ESPECIFICACION_FUNCIONAL_Y_UX(1).md`, `02_REVISION_TECNICA_RIESGOS_Y_QA(1).md`, `04_DECISIONES_Y_BACKLOG(1).md`.
**Selección E0-A:** referencia visual Z073; se preserva el shell React integrado, no se importan scripts del HTML ni sus proveedores ficticios.

## 1. Alcance funcional

Directorio de proveedores **por businessId**, independiente del rubro. La única información obligatoria es el nombre comercial (2–90 caracteres). Otros campos opcionales: descripción de productos/servicios ofrecidos, persona de contacto, teléfono, WhatsApp internacional, correo, dirección/referencia, enlace de Google Maps, sitio HTTPS, usuario de Instagram, medios de pago aceptados y observaciones comerciales.

- Crear y editar proveedor en el contexto de la empresa actual.
- Buscar por nombre, ofertas, contacto, teléfono, correo, dirección u observaciones y filtrar por Activos/Inactivos/Todos.
- Nombre único por empresa, normalizado en espacios y mayúsculas, incluso entre proveedores desactivados. El mismo nombre se permite en otras empresas.
- Desactivar/reactivar con confirmación y **sin eliminación física**: no se perderá la identidad del proveedor cuando exista una compra histórica. Compras aún no implementado.
- Ficha detallada `dialog` nativo: Escape, botón y clic fuera; sin handler `close` propenso al bug de StrictMode detectado en Catálogo.
- Acciones explícitas: abrir WhatsApp sólo con número E.164 internacional válido, teléfono `tel:`, `mailto:`, sitio HTTPS, enlace seguro de Maps o búsqueda por dirección e Instagram por usuario validado.
- «Copiar datos de contacto» exige pulsación del usuario; no incluye **notas internas ni promociones**. Si el navegador bloquea el portapapeles, muestra texto seleccionable.
- Medios de pago múltiples: efectivo, transferencia, Mercado Pago, Cuenta DNI, tarjeta, cheque, cuenta corriente. Son **métodos que declara aceptar el proveedor**, no cuentas de cobro configuradas de la empresa.
- Promociones informativas: hasta ocho reglas con selección opcional de días (lunes=0 a domingo=6), medio requerido opcional y beneficio textual. **No se aplican descuentos automáticamente en Compras**; tampoco se garantiza vigencia o cumplimiento. No se calcula el importe descontado.
- Un negocio sin proveedores es válido; los registros empiezan vacíos en todas las empresas DEMO.
- Las imágenes/fotos del HTML, WhatsApp por URL de mensajería incrustada, promociones automáticas, vínculos con artículo y compras históricas ficticias **no se importan** en este corte.

## 2. Reglas técnicas e integridad

- Datos aislados por empresa en `suppliersById` con el identificador empresarial y un ID UUID interno; comandos de update/estado siempre comprueban `businessId`.
- Se conserva la clave `asistente-pyme.e1a2.demo.v1` y la versión de almacenamiento 1; se añade un array `suppliers` opcional. Se preservan `profile`, `createdBusinesses`, `fixtureEdits`, `memberJobs`, `locations`, `teamInvitations`, `teamMembers` y `catalogItems`.
- Al cargar proveedores guardados, se valida el esquema, nombre, vínculos, promociones, IDs y pertenencia antes de incluirlos. Si un registro no es válido se descarta únicamente ese registro.
- No hay autorización del servidor: localStorage se usa sólo para pruebas de UX, no es un repositorio comercial seguro.
- Sitios externos: sólo URLs HTTPS válidas sin credenciales ni puertos; links `target="_blank"` usan `rel="noopener noreferrer"`. Maps reutiliza `mapsLinks.ts`; WhatsApp no añade prefijos ni presupone país; requiere `+<código país><número>`.
- La ficha es una **vista informativa**. No hay órdenes, descuentos aplicados, facturación, compras, recepción ni stock.
- Para el backend y TP3: `proveedor.id`, `empresa.id`, estado lógico, contactos, promociones declarativas y compras con referencia histórica. Mantener FK/tenant y snapshots de compra; nunca borrar históricos al inactivar proveedor.

## 3. Código y pruebas

- `frontend/src/data/demo/supplierPolicy.ts`: validación pura de campos, URL, WhatsApp, medios y promociones.
- `frontend/src/data/demo/demoStore.ts`: tipos, lectura persistente compatible, CRUD/estado, aislamiento empresarial.
- `frontend/src/features/suppliers/SupplierForm.tsx`: alta/edición seccionada.
- `frontend/src/features/suppliers/SuppliersPage.tsx`: directorio, búsqueda, filtros, estado.
- `frontend/src/features/suppliers/SupplierDetailDialog.tsx`: ficha, canales seguros, copiar.
- `frontend/src/App.tsx`: ruta `/b/:businessId/proveedores` con remount contextual.
- `frontend/src/features/dashboard/Dashboards.tsx`: acceso disponible DEMO.
- `frontend/src/App.css`: estilos responsive.
- `frontend/tests/supplier-policy.test.mjs`: regresiones para validaciones y enlaces.
- `frontend/package.json`: `npm.cmd run test:suppliers`.

Desde `plataforma-pyme/frontend`:

~~~powershell
git pull --ff-only origin main
npm.cmd run build
npm.cmd run lint
npm.cmd run test:suppliers
npm.cmd run test:catalog
npm.cmd run test:maps
npm.cmd run test:team
npm.cmd run dev
~~~

## 4. Matriz de pruebas manuales

| ID | Acción | Esperado |
|---|---|---|
| PROV-01 | Abrir Proveedores en empresa nueva | Listado vacío, sin proveedores inventados |
| PROV-02 | Crear proveedor sólo con nombre | Alta válida, ficha activa |
| PROV-03 | Completar ofertas, contacto y teléfono ficticios | Guardados y visibles en ficha |
| PROV-04 | Agregar WhatsApp `+5491112345678` | Link abre `wa.me/5491112345678` en otra pestaña |
| PROV-05 | Ingresar WhatsApp `1112345678` | Validación impide el alta sin formato internacional |
| PROV-06 | Guardar sitio HTTPS y enlace Maps de lugar público | Enlaces seguros visibles; abrir sólo al hacer clic |
| PROV-07 | Intentar `javascript:` o URL Maps con host falso | Guardado rechazado |
| PROV-08 | Agregar transferencia y efectivo como medios | Se muestran en la ficha como informativos |
| PROV-09 | Registrar regla «10% martes/jueves por transferencia» | Visible, sin aplicar cambios a precios ni Compras |
| PROV-10 | Copiar contacto y pegar en bloc de notas | Nombre, oferta y contactos; **sin observaciones ni promociones** |
| PROV-11 | Editar proveedor y F5 | Cambios conservados |
| PROV-12 | Intentar duplicar nombre con otras mayúsculas | Rechazo en la misma empresa |
| PROV-13 | Crear igual nombre en otra empresa | Permitido, sin cruce de registros |
| PROV-14 | Desactivar, filtrar Inactivos, reactivar | Ficha preservada, contadores correctos |
| PROV-15 | Abrir ficha y presionar Escape | El modal se cierra sólo cuando se solicita |
| PROV-16 | Cambiar empresa durante un formulario | Borrador no se arrastra a la otra empresa |
| PROV-17 | Cambiar de sección y regresar a Perfil/Catálogo/Ubicaciones | Datos anteriores sin modificaciones |
| PROV-18 | Pantalla 390 px | Formulario, opciones y fichas legibles sin desbordamiento |
| PROV-19 | Ejecutar build, lint y todos los test scripts | Sin errores ni advertencias |

## 5. Próximo corte

**Compras**: proveedor opcional, compra informativa o vinculada a artículo físico, revisión previa, importes enteros, conversión explícita unidad de compra→unidad base, recepción atómica e idempotencia al evolucionar a backend. La DEMO de proveedores todavía no modifica inventario ni medios de cobro de la propia empresa.
