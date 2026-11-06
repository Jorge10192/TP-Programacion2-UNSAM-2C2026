# Asistente PyME — Frontend (DEMO)

Plataforma generalista de gestión para múltiples empresas y rubros, desarrollada dentro del TP de Programación 2. WALOS es sólo un negocio de ejemplo, **no** el producto ni su rubro obligatorio.

**Estado:** E1-A1 (shell/navegación) verificado por el equipo con build, lint y revisión visual. E1-A2.1 (perfil personal y creación de empresas DEMO) publicado y **pendiente de pruebas locales**. No hay autenticación, autorización real, backend, stock, ventas, caja ni pagos.

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
- **Mi perfil:** nombre visible y correo de ejemplo opcional. Perfil global, no uno por empresa.
- **Crear empresa:** nombre, actividad Productos / Servicios / Mixto, rubro y descripción opcionales. Crea una membresía DEMO activa y registra fundador/titular administrativo inicial.
- **Selector superior:** todas las empresas de este entorno local, incluyendo las nuevas.
- **Inicio empresarial:** resumen y accesos a módulos (operaciones aún pendientes).
- **Datos de la empresa:** ficha inicial de solo lectura.
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
    ├── businesses/BusinessPages.tsx
    └── common/Feedback.tsx
~~~

## Límites de seguridad y datos

- La información se almacena en **localStorage del navegador** con una clave versionada. Es DEMO y no se sincroniza con otros dispositivos.
- No uses nombres, emails ni datos comerciales reales; cualquiera que tenga acceso al navegador puede leer o modificar estos datos.
- La UI no constituye autenticación, control de permisos, aislamiento multitenant seguro, respaldo ni garantía de persistencia.
- El fundador y titular administrativo inicial son campos distintos pero ambos apuntan a la identidad DEMO global en este incremento; transferencias e invitaciones siguen pendientes.
- No hay store de stock/ventas/caja ni QR de artículo/cobro implementado.
- React Router, pruebas automáticas, integración de HTML originales restantes, contratos API, TP3 y backend siguen pendientes.

## QA y decisiones

- ../docs/04_E1_A1_PRIMER_SHELL.md — shell inicial
- ../docs/05_E1_A1_MENU_ADAPTABLE.md — sidebar adaptable
- ../docs/06_E1_A1_DRAWER_Y_VOLVER.md — hamburguesa y navegación
- ../docs/07_E1_A2_PERFIL_EMPRESAS_DEMO.md — perfil, creación y pruebas de aceptación

Arquitectura E0-B y ADR-001/002/007 permanecen como **propuestas**, sujetas a validación del equipo. Su adopción DEMO no implica aprobación definitiva.
