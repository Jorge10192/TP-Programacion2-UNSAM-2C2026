# Asistente PyME — Frontend (DEMO)

Plataforma generalista de gestión para múltiples empresas y rubros, desarrollada dentro del TP de Programación 2. WALOS es sólo un negocio de ejemplo, **no** el producto ni su rubro obligatorio.

**Estado:** E1-A1 (shell/navegación) verificado por el equipo con build, lint y revisión visual. E1-A2.1 (perfil personal y creación de empresas DEMO) validado visualmente por el equipo. E1-B1 (Datos de la Empresa editables) validado visualmente y con persistencia por el equipo; compilación/lint de ese corte no confirmadas. E1-B2 (avatar, contacto y función por empresa) validado funcionalmente por el equipo. E1-B3 de Ubicaciones validado funcionalmente en el navegador por el equipo. E1-B3.1 (Google Maps y compartir) validado manualmente por el equipo. E1-B4 (Equipo e invitaciones DEMO) validado funcionalmente por el equipo. E1-B5 (Catálogo DEMO) validado funcionalmente por el equipo; su ficha ampliada y el bug de modal fueron corregidos y el último build/lint informó cero errores y cero advertencias. E1-B6 (Proveedores DEMO) validado funcionalmente por el equipo. E1-B7 (Compras y recepción DEMO) publicado y pendiente de build/lint/tests/QA local. No hay autenticación, autorización real, backend, inventario operativo, ventas, caja ni pagos reales.

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
    ├── businesses/BusinessPages.tsx
    └── common/Feedback.tsx
~~~

## Límites de seguridad y datos

- La información se almacena en **localStorage del navegador** con una clave versionada. E1-B1, E1-B2, Ubicaciones, Google Maps y Equipo conservan la clave/formato previo de E1-A2 para no perder perfiles y empresas creadas; se guardan overrides de fixtures, funciones laborales, ubicaciones (incluido mapa opcional), invitaciones, miembros, catálogo, proveedores y compras/recepciones DEMO por businessId. Es DEMO y no se sincroniza con otros dispositivos.
- No uses nombres, emails ni datos comerciales reales; cualquiera que tenga acceso al navegador puede leer o modificar estos datos.
- La UI no constituye autenticación, control de permisos, aislamiento multitenant seguro, respaldo ni garantía de persistencia.
- El fundador y titular administrativo inicial son campos distintos pero ambos apuntan a la identidad DEMO global en este incremento; transferencias e invitaciones **reales** siguen pendientes. En Equipo sólo hay invitación y aceptación simuladas, sin correo, token ni acceso.
- La recepción de Compras registra movimientos positivos de entrada en el estado DEMO, pero el módulo Inventario, traslados, ajustes, saldos operativos, ventas, caja y QR de artículo/cobro todavía no están implementados. El Catálogo no constituye inventario y una compra sin recepción no crea existencias. Documentos, imágenes y cambios programados siguen pendientes.
- React Router, pruebas automatizadas de interfaz, integración de HTML originales restantes, contratos API, TP3 y backend siguen pendientes. Existen pruebas unitarias puras para Maps, Equipo, Catálogo, Proveedores y Compras.

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

Arquitectura E0-B y ADR-001/002/007 permanecen como **propuestas**, sujetas a validación del equipo. Su adopción DEMO no implica aprobación definitiva.
