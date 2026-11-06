# Asistente PyME — Frontend (DEMO)

Plataforma generalista de gestión para múltiples empresas y rubros, desarrollada dentro del TP de Programación 2. WALOS es sólo un negocio de ejemplo, **no** el producto ni su rubro obligatorio.

**Estado:** E1-A1 (shell/navegación) verificado por el equipo con build, lint y revisión visual. E1-A2.1 (perfil personal y creación de empresas DEMO) validado visualmente por el equipo. E1-B1 (Datos de la Empresa editables) validado visualmente y con persistencia por el equipo; compilación/lint de ese corte no confirmadas. E1-B2 (avatar, contacto y función por empresa) validado funcionalmente por el equipo. E1-B3 de Ubicaciones validado funcionalmente en el navegador por el equipo. E1-B3.1 incorpora Google Maps por enlace y copia, **pendiente de build/lint/tests/QA de navegador**. No hay autenticación, autorización real, backend, stock, ventas, caja ni pagos.

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
- **Ubicaciones:** alta, edición, lista, principal, pausa y reactivación. Tipos local/feria/depósito/oficina/otro; venta y almacenamiento separados, sin ubicación obligatoria para servicios ni creación de stock/caja.
- **Google Maps y compartir:** campo opcional para pegar enlace compartido de Maps, búsqueda por dirección y botón para copiar nombre/dirección/enlace. No es mapa integrado ni geocodificación automática.
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
- /b/walos-demo/catalogo (placeholder)

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
│   └── demoStore.ts        # perfil/empresas/membresías DEMO, gateway, persistencia local
└── features/
    ├── dashboard/Dashboards.tsx
    ├── profile/ProfilePage.tsx
    ├── locations/LocationsPage.tsx
    ├── businesses/BusinessPages.tsx
    └── common/Feedback.tsx
~~~

## Límites de seguridad y datos

- La información se almacena en **localStorage del navegador** con una clave versionada. E1-B1, E1-B2, Ubicaciones y Google Maps conservan la clave/formato previo de E1-A2 para no perder perfiles y empresas creadas; se guardan overrides de fixtures, funciones laborales y ubicaciones (incluido mapa opcional) por businessId. Es DEMO y no se sincroniza con otros dispositivos.
- No uses nombres, emails ni datos comerciales reales; cualquiera que tenga acceso al navegador puede leer o modificar estos datos.
- La UI no constituye autenticación, control de permisos, aislamiento multitenant seguro, respaldo ni garantía de persistencia.
- El fundador y titular administrativo inicial son campos distintos pero ambos apuntan a la identidad DEMO global en este incremento; transferencias e invitaciones siguen pendientes.
- No hay store de stock/ventas/caja ni QR de artículo/cobro implementado. Documentos, contactos, logos y cambios programados siguen pendientes.
- React Router, pruebas automáticas, integración de HTML originales restantes, contratos API, TP3 y backend siguen pendientes.

## QA y decisiones

- ../docs/04_E1_A1_PRIMER_SHELL.md — shell inicial
- ../docs/05_E1_A1_MENU_ADAPTABLE.md — sidebar adaptable
- ../docs/06_E1_A1_DRAWER_Y_VOLVER.md — hamburguesa y navegación
- ../docs/07_E1_A2_PERFIL_EMPRESAS_DEMO.md — perfil, creación y pruebas de aceptación
- ../docs/08_E1_B1_DATOS_EMPRESA.md — integración de Z001, edición contextual y pruebas
- ../docs/09_E1_B2_PERFIL_GLOBAL_Y_FUNCION_EMPRESA.md — avatar global, contacto y función laboral por empresa
- ../docs/10_E1_B3_UBICACIONES_DEMO.md — ubicaciones por empresa y pruebas
- ../docs/11_E1_B3_1_GOOGLE_MAPS_Y_COMPARTIR.md — enlace de Maps y copia por ubicación; ejecutar también `npm.cmd run test:maps`

Arquitectura E0-B y ADR-001/002/007 permanecen como **propuestas**, sujetas a validación del equipo. Su adopción DEMO no implica aprobación definitiva.
