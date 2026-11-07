# Asistente PyME — Frontend (DEMO)

Plataforma generalista de gestión para múltiples empresas y rubros, desarrollada dentro del TP de Programación 2. WALOS es sólo un negocio de ejemplo, **no** el producto ni su rubro obligatorio.

**Estado:** E1-A1 (shell/navegación) verificado por el equipo con build, lint y revisión visual. E1-A2.1 (perfil personal y creación de empresas DEMO) validado visualmente por el equipo. E1-B1 (Datos de la Empresa editables) validado visualmente y con persistencia por el equipo; compilación/lint de ese corte no confirmadas. E1-B2 (avatar, contacto y función por empresa) validado funcionalmente por el equipo. E1-B3 de Ubicaciones validado funcionalmente en el navegador por el equipo. E1-B3.1 (Google Maps y compartir) validado manualmente por el equipo. E1-B4 (Equipo e invitaciones DEMO) validado funcionalmente por el equipo. E1-B5 (Catálogo DEMO) validado funcionalmente por el equipo; su ficha ampliada y el bug de modal fueron corregidos y el último build/lint informó cero errores y cero advertencias. E1-B6 (Proveedores DEMO) validado funcionalmente por el equipo. E1-B7 (Compras y recepción DEMO) validado funcionalmente por el usuario. E1-B8 (Inventario y Movimientos DEMO) validado manualmente por el usuario. E1-B9 (Control de stock multiartículo DEMO) validado funcionalmente por el usuario. E1-B10 (imágenes de fichas en IndexedDB) validado en el equipo: build, lint, 6 tests y funcionamiento visual. E1-C1 (Ventas DEMO conectadas a Inventario) ya probado funcionalmente por el usuario; E1-C1.1 (selector visual POS con fotos, filtros y stock por ubicación) publicado y pendiente de build/lint/QA local. E1-C2 (Gastos y Apertura/Cierre DEMO) probado visual y funcionalmente por el usuario, incluido cierre con diferencia y snapshot persistido. E1-C3 (Cuentas y medios DEMO) y E1-C3.1 (asociación opcional de cuentas en Ventas/Gastos) validados en build, lint y QA manual por el usuario. E1-D1 (QR visual DEMO y completar el último medio) validado manualmente por el usuario, incluida la aprobación rechazada si se desactiva el artículo antes de confirmar. E1-D2 agrega recorridos automatizados de navegador escritorio/móvil, QA de integración y documentación de cierre; sin seguridad backend todavía. No hay autenticación, autorización real, backend ni pagos externos verificados.

## Ejecutar en VS Code

Desde la **raíz del repositorio**:

~~~powershell
cd plataforma-pyme/frontend
npm.cmd install
npm.cmd run build
npm.cmd run lint
npm.cmd run dev
~~~

Si **ya estás ubicado** dentro de plataforma-pyme/frontend, **no vuelvas a hacer cd**: ejecutá directamente git pull, npm.cmd run build, npm.cmd run lint y npm.cmd run dev.

Abrí http://localhost:5173/inicio. No hace falta PostgreSQL, FastAPI ni Mercado Pago para esta DEMO. Detené Vite con Ctrl+C o q y Enter.

## Qué funciona en la DEMO

- **Inicio personal:** tres fixtures y empresas que creás en este navegador.
- **Mi perfil:** nombre visible, correo DEMO, iniciales de avatar y teléfono DEMO opcionales. El perfil es global. La función laboral se edita por empresa, sobre la membresía DEMO, sin confundirla con el rol o los permisos.
- **Crear empresa:** nombre, actividad Productos / Servicios / Mixto, rubro y descripción opcionales. Crea una membresía DEMO activa y registra fundador/titular administrativo inicial.
- **Selector superior:** todas las empresas de este entorno local, incluyendo las nuevas.
- **Inicio empresarial:** resumen y accesos a módulos (operaciones aún pendientes).
- **Datos de la empresa:** ficha comercial con edición inmediata por campo de nombre, rubro, eslogan, presentación y CUIT ficticio opcional. Conserva los cambios de cada empresa tras F5 si localStorage está disponible.
- **Ubicaciones:** alta, edición, lista, principal, pausa y reactivación. Tipos local/feria/depósito/oficina/otro; venta y almacenamiento separados, sin ubicación obligatoria para servicios ni creación de stock/caja. Enlaces de Google Maps opcionales: buscá dirección, pegá el link de un punto y copialo voluntariamente para compartir; sin Maps API ni pin seleccionado dentro de la plataforma.
- **Google Maps y compartir:** campo opcional para pegar enlace compartido de Maps, búsqueda por dirección y botón para copiar nombre/dirección/enlace. No es mapa integrado ni geocodificación automática.
- **Equipo de trabajo:** titular administrativo inicial, colaboradores ficticios e invitaciones por empresa. Invitar no envía correos ni crea usuarios: únicamente «Simular aceptación» agrega un integrante ficticio. Cancelación y rechazo disponibles, sin permisos efectivos.
- **Catálogo:** elaboración propia, reventa, insumo y servicio; alta, edición, SKU opcional único por empresa, unidad, categoría, búsqueda, filtros, desactivar/reactivar, precios ARS en centavos enteros. **Ver ficha** abre un modal con datos comerciales, fechas y observaciones internas separadas de la descripción. No crea stock.
- **Proveedores:** lista y fichas por empresa con contacto, ofertas, URLs validadas, WhatsApp internacional, medios de pago aceptados, promociones informativas, búsqueda y baja lógica. No hay descuentos automáticos ni historial real de proveedores; las fichas comienzan vacías en DEMO.
- **Compras:** multi-renglón, proveedor opcional, artículo del Catálogo o concepto libre, referencia de comprobante, precios ARS y cantidades exactas, historial, filtros y ficha con snapshots. **Registrar no recibe ni paga**; una recepción posterior y explícita genera entradas por artículo físico y ubicación apta, sólo una vez por compra.
- **Inventario y Movimientos:** stock por artículo físico y ubicación derivado de recepciones, traslados, conteos y salidas de venta. La lista de Existencias reutiliza la foto de la ficha del Catálogo de la misma empresa (o un ícono si no hay foto). Los traslados registran salida y entrada atómicas; los conteos registran la diferencia con motivo. Sin negativos ni cambios automáticos de unidad. Una empresa sin artículos físicos puede tener stock vacío.
- **Control de stock por ubicación (E1-B9):** sesión multiartículo con progreso, «Sin contar» distinto de «Marcar 0», revisión de diferencias y confirmación atómica. El historial muestra una fila desplegable por sesión; se conserva «Ajuste rápido» por producto.
- **Imágenes opcionales (E1-B10):** seleccionar/reemplazar/quitar fotos JPG, PNG o WebP de Datos de la Empresa (logo), Catálogo, Proveedores, Ubicaciones y Perfil personal. Se guardan optimizadas en IndexedDB del navegador, aisladas por empresa y ficha. Se asocian desde «Editar» luego de crear cada ficha y no alteran el inventario.
- **Ventas DEMO (E1-C1):** POS, carrito con bienes y servicios, descuento en ARS, pagos declarados múltiples con conciliación exacta al centavo, historial y comprobante interno. Completar saldo ahora utiliza el **último medio de pago** sin cambiar los anteriores. Un bien vendido genera una salida en el ledger de Inventario y el reintento con el mismo requestId no duplica la venta. No hay cobranza bancaria real.
- **Cobro QR visual DEMO (E1-D1):** desde una venta con **un único medio Mercado Pago declarado**, crea intención PENDIENTE con imagen ilustrativa **no escaneable**. Pendiente o cancelado no crea venta ni descuenta stock. «Simular aprobación» registra una venta DEMO por el mismo gateway de Ventas; no mueve dinero ni acredita pagos externos. Historial por empresa, idempotencia y recuperación al recargar.
- **Cuentas y medios (E1-C3/C3.1):** banco y billetera por empresa, alias o CBU/CVU de ejemplo, edición, principal, desactivar/reactivar, filtros y copia. En Ventas y Gastos se puede asociar opcionalmente una cuenta activa compatible; **Transferencia** permite elegir banco o billetera virtual, mientras que los medios específicos de billetera conservan su filtro. Las inactivas no se ofrecen para nuevas operaciones y se conserva la referencia histórica. Sin mover dinero ni verificar transferencias o saldos bancarios; nunca usar datos reales.
- **Gastos DEMO (E1-C2):** egresos operativos por categoría, ubicación y medio declarado. Sólo un gasto en efectivo de una caja ABIERTA se proyecta al efectivo esperado de esa jornada. Registrar compra no constituye pagarla.
- **Apertura y cierre de Caja (E1-C2):** jornadas por ubicación o caja general con fondo inicial, ventas y egresos en efectivo vinculados explícitamente, arqueo contado, diferencia explicada y snapshot de cierre persistido e inmutable. No representa balances bancarios ni mueve inventario. Ventas sin jornada previa siguen funcionando pero no entran en arqueos retroactivamente.
- **Menú de tres líneas:** drawer modal; bloquea el fondo y se cierra desde el fondo, Escape, X o al elegir una sección.
- **Menú fijo opcional:** expandido, compacto u oculto en escritorio, con preferencia local.
- **Volver:** contextual dentro de la misma empresa o a su Inicio.
- **Módulos aún sin desarrollar:** pantalla clara de «Próximamente».

## Rutas

- /inicio
- /perfil
- /empresas/nueva
- /b/walos-demo/inicio
- /b/comercio-demo/inicio
- /b/servicios-demo/inicio
- /b/walos-demo/empresa
- /b/walos-demo/ubicaciones
- /b/walos-demo/equipo
- /b/walos-demo/catalogo
- /b/walos-demo/proveedores
- /b/walos-demo/compras
- /b/walos-demo/ventas
- /b/walos-demo/gastos
- /b/walos-demo/jornadas
- /b/walos-demo/cuentas
- /b/walos-demo/inventario
- /b/walos-demo/movimientos


Para empresas creadas, el identificador está incorporado en /b/:businessId/inicio.

El enrutado usa provisionalmente History API; **React Router todavía no está integrado**.

## Organización

~~~text
src/
├── App.tsx
├── app/
│   ├── navigation.ts, Icon.tsx, AppLink.tsx, types.ts
│   └── shell/
│       ├── SideMenu.tsx
│       ├── TopBar.tsx
│       └── sidebarPreference.ts
├── data/demo/
│   ├── demoStore.ts        # perfil/empresas/ubicaciones y miembros DEMO
│   ├── teamPolicy.ts        # roles, email y vencimiento de invitaciones
│   ├── catalogPolicy.ts     # tipos de catálogo, SKU, unidades y centavos
│   ├── supplierPolicy.ts    # proveedores, canales seguros y promociones
│   ├── purchasePolicy.ts    # compras, cantidades y totales enteros
│   ├── inventoryPolicy.ts   # movimientos, traslados, conteos y saldos
│   └── mapsLinks.ts        # validación de enlaces Google Maps
└── features/
    ├── dashboard/Dashboards.tsx
    ├── profile/ProfilePage.tsx
    ├── locations/LocationsPage.tsx
    ├── team/TeamPage.tsx
    ├── catalog/CatalogPage.tsx
    │   └── CatalogDetailDialog.tsx
    ├── suppliers/
    │   ├── SuppliersPage.tsx
    │   ├── SupplierForm.tsx
    │   └── SupplierDetailDialog.tsx
    ├── purchases/
    │   ├── PurchasesPage.tsx
    │   ├── PurchaseForm.tsx
    │   └── PurchaseDetailDialog.tsx
    ├── inventory/
    │   ├── InventoryPage.tsx
    │   └── InventoryActionForm.tsx
    ├── businesses/BusinessPages.tsx
    └── common/Feedback.tsx
~~~

## Límites de seguridad y datos

- La información se almacena en **localStorage del navegador** con una clave versionada. E1-B1, E1-B2, Ubicaciones, Google Maps y Equipo conservan la clave/formato previo de E1-A2 para no perder perfiles y empresas creadas; se guardan overrides de fixtures, funciones laborales, ubicaciones (incluido mapa opcional), invitaciones, miembros, catálogo, proveedores, compras/recepciones operaciones de inventario y ventas, gastos y jornadas DEMO por businessId. Es DEMO y no se sincroniza con otros dispositivos.
- No uses nombres, emails ni datos comerciales reales; cualquiera que tenga acceso al navegador puede leer o modificar estos datos.
- La UI no constituye autenticación, control de permisos, aislamiento multitenant seguro, respaldo ni garantía de persistencia.
- El fundador y titular administrativo inicial son campos distintos pero ambos apuntan a la identidad DEMO global en este incremento; transferencias e invitaciones **reales** siguen pendientes. En Equipo sólo hay invitación y aceptación simuladas, sin correo, token ni acceso.
- Las recepciones de Compras, los traslados y los ajustes por conteo constituyen ahora el ledger local de Inventario DEMO. No están implementados reservas, costos por lote, integración financiera real ni QR de artículo/cobro. Las ventas y pagos son declaraciones locales sin acreditación externa. Una compra sin recepción no crea existencias. Documentos y cambios programados siguen pendientes. La subida de imágenes a un servidor también sigue pendiente. Las imágenes de Empresa, Catálogo, Proveedores, Ubicaciones y Perfil son locales y ya se pueden cargar en la DEMO.
- React Router, pruebas automatizadas de interfaz, integración de HTML originales restantes, contratos API, TP3 y backend siguen pendientes. Existen pruebas unitarias puras para Maps, Equipo, Catálogo, Proveedores, Compras, Inventario, imágenes, reglas de venta/pago, políticas de caja/gastos y validación de cuentas DEMO.

## QA y decisiones

- ../docs/04_E1_A1_PRIMER_SHELL.md — shell inicial
- ../docs/05_E1_A1_MENU_ADAPTABLE.md — sidebar adaptable
- ../docs/06_E1_A1_DRAWER_Y_VOLVER.md — hamburguesa y navegación
- ../docs/07_E1_A2_PERFIL_EMPRESAS_DEMO.md — perfil, creación y pruebas de aceptación
- ../docs/08_E1_B1_DATOS_EMPRESA.md — integración de Z001, edición contextual y pruebas
- ../docs/09_E1_B2_PERFIL_GLOBAL_Y_FUNCION_EMPRESA.md — avatar global, contacto y función laboral por empresa
- ../docs/10_E1_B3_UBICACIONES_DEMO.md — ubicaciones por empresa y pruebas
- ../docs/11_E1_B3_MAPS_Y_COMPARTIR.md — mapa por enlace, apertura y copia voluntaria
- ../docs/11_E1_B3_1_GOOGLE_MAPS_Y_COMPARTIR.md — enlace de Maps y copia por ubicación; ejecutar también `npm.cmd run test:maps`
- ../docs/12_E1_B4_EQUIPO_INVITACIONES_DEMO.md — equipo, invitaciones simuladas y pruebas; ejecutar también `npm.cmd run test:team`
- ../docs/13_E1_B5_CATALOGO_DEMO.md — catálogo multirrubro y pruebas; ejecutar también `npm.cmd run test:catalog`
- ../docs/14_E1_B5_1_FICHA_CATALOGO.md — modal de ficha y observaciones internas, compatible con fichas anteriores
- ../docs/15_E1_B6_PROVEEDORES_DEMO.md — proveedores, contactos, condiciones informativas y pruebas; ejecutar también `npm.cmd run test:suppliers`
- ../docs/16_E1_B7_COMPRAS_RECEPCION_DEMO.md — compras por empresa, snapshots, recepción única y QA; ejecutar también `npm.cmd run test:purchases`
- ../docs/17_E1_B8_INVENTARIO_MOVIMIENTOS_DEMO.md — ledger, existencias, traslados, conteos y QA; ejecutar `npm.cmd run test:inventory`
- ../docs/18_E1_B9_CONTROL_STOCK_MULTIPLE.md — control de inventario multiartículo por ubicación y QA; usa `npm.cmd run test:inventory`
- ../docs/19_E1_B10_IMAGENES_DEMO.md — imágenes locales para Catálogo, Proveedores, Ubicaciones y Perfil; ejecutar `npm.cmd run test:images`
- ../docs/20_E1_C1_VENTAS_DEMO.md — POS, descuentos, pagos declarados y ledger de venta; ejecutar `npm.cmd run test:sales`
- ../docs/21_E1_C1_1_SELECTOR_VISUAL_VENTAS.md — tarjetas con fotos, stock y filtro para agregar a Ventas sin alterar pagos; ejecutar build/lint y QA visual
- ../docs/22_E1_B7_1_COMPRA_UBICACION_RECEPCION.md — flujo de Compra guardada y ubicación de recepción pendiente
- ../docs/23_E1_C2_GASTOS_Y_CAJA_DEMO.md — Gastos, jornadas, arqueos, reglas de efectivo y QA; ejecutar `npm.cmd run test:cash`
- ../docs/24_E1_C3_CUENTAS_Y_MEDIOS_DEMO.md — Cuentas de referencia, billeteras, protección de datos, aislamiento y QA; ejecutar `npm.cmd run test:accounts`

Arquitectura E0-B y ADR-001/002/007 permanecen como **propuestas**, sujetas a validación del equipo. Su adopción DEMO no implica aprobación definitiva.

## Pruebas de integración de navegador E1-D2

Además de `npm.cmd run build`, `npm.cmd run lint` y los tests `npm.cmd run test:...`, hay recorridos reales de **Playwright / Chromium** en dos formatos: escritorio y móvil. Las dependencias de Playwright están aisladas en `e2e/`; no se alteró el package-lock del frontend.

```powershell
# Desde plataforma-pyme/frontend
npm.cmd ci
cd e2e
npm.cmd install
npx.cmd playwright install chromium
npm.cmd test
```

Los tests crean su propio contexto de navegador y datos ficticios. Validan rutas válidas y ajenas, placeholder, foco/ESC del drawer, ausencia de scroll horizontal, aislamiento de catálogo, intención QR, F5, cancelación y aprobación única. CI ejecuta esta suite junto con las pruebas unitarias y conserva evidencias ante fallos. **No sustituyen** la QA real del usuario sobre imágenes locales, caja, ventas físicas ni permisos del servidor futuro.

La matriz y límites de esta etapa están en `../docs/27_E1_D2_INTEGRACION_Y_CIERRE_FRONTEND.md`.
