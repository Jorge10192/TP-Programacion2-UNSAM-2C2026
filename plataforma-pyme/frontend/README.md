# Asistente PyME — Frontend (DEMO)

Primer incremento de la plataforma multinegocio y multirrubro, dentro del repositorio del TP de Programación 2.

**Estado:** E1-A1: shell visual, navegación DEMO y placeholders. **No es una aplicación comercial funcional**: no hay cuentas reales, permisos de servidor, altas persistidas, stock, ventas, caja ni cobros.

El diseño toma como referencia la matriz E0-A de ../docs/00_MATRIZ_INTEGRACION_HTML.md, en particular Z003 (Menú principal) y Z014 (Módulo 1 v1.2). WALOS es únicamente una empresa ficticia de prueba.

## Para ejecutar en VS Code

Abrir una terminal en la raíz del repositorio:

~~~powershell
cd plataforma-pyme/frontend
npm.cmd install
npm.cmd run dev
~~~

Abrir la dirección que anuncie Vite, generalmente http://localhost:5173/.

Para verificar tipos y compilación:

~~~powershell
npm.cmd run build
npm.cmd run lint
~~~

No se requieren PostgreSQL, FastAPI ni Mercado Pago para este incremento. Detener Vite con Ctrl+C.

## Qué se puede recorrer

- **Mi espacio personal**: pantalla inicial, tres empresas ficticias y accesos a Mi perfil/Crear empresa (ambos como «Próximamente»).
- **Panel de empresa**: tarjetas de resumen sin cifras inventadas, accesos a secciones comerciales y administrativas.
- **Navegación lateral** y barra superior: todos los destinos de la matriz E0-A; secciones aún no implementadas muestran un aviso claro.
- **Selector de empresa**: cambia entre fixtures de presentación, sin transportar datos de pantalla.
- **Botón de tres líneas**: en la esquina superior izquierda, abre un menú superpuesto en escritorio y móvil. Mientras está abierto, el contenido de fondo queda bloqueado. Se cierra con X, Escape, un clic fuera o al elegir una sección.
- **Menú fijo opcional**: el botón adicional de panel permite fijar el menú en escritorio, expandido o compacto, o volver a ocultarlo. La preferencia se guarda localmente y no depende de la empresa activa; por defecto el menú empieza oculto.
- **Volver contextual**: en pantallas internas aparece un botón Volver; regresa a la página anterior de la misma empresa cuando existe y, si no, al Inicio de esa empresa (o al Inicio personal).

Rutas útiles:

- /inicio
- /b/walos-demo/inicio
- /b/comercio-demo/inicio
- /b/servicios-demo/inicio
- /b/walos-demo/catalogo (placeholder)
- /perfil (placeholder)

La navegación se implementó provisionalmente con History API del navegador **sin dependencias adicionales**. La adopción de React Router, prevista en E0-B/ADR-007, queda para el siguiente corte de integración; no es un router final.

## Estructura

~~~text
src/
├── App.tsx
├── app/
│   ├── navigation.ts
│   ├── Icon.tsx
│   ├── AppLink.tsx
│   ├── types.ts
│   └── shell/
│       ├── SideMenu.tsx
│       └── TopBar.tsx
└── features/
    ├── dashboard/Dashboards.tsx
    └── common/Feedback.tsx
~~~

## Límites importantes

- Los fixtures de las tres empresas son **públicos y estáticos**. El selector no implementa autorización, privacidad real ni separación entre usuarios.
- Las cifras comerciales usan guiones («—») y no se generan registros ficticios que aparenten existir.
- «Crear empresa», «Mi perfil» y las secciones comerciales no guardan datos.
- No hay persistencia DEMO, gateway, Zustand, React Router, tests E2E, backend ni QR de Mercado Pago. Su implementación y aceptación pertenecen a futuros tickets E1.
- No utilizar esta interfaz para datos personales, comerciales ni financieros reales.

Para revisar alcance y QA: ../docs/04_E1_A1_PRIMER_SHELL.md (shell inicial), ../docs/05_E1_A1_MENU_ADAPTABLE.md (menú adaptable anterior) y ../docs/06_E1_A1_DRAWER_Y_VOLVER.md (nueva navegación).

**Estado de revisión actual:** menú superpuesto y volver publicados en GitHub; ejecutar npm.cmd run build, npm.cmd run lint y las verificaciones de ../docs/06_E1_A1_DRAWER_Y_VOLVER.md antes de considerarlo validado.
