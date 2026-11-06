# E1-A1.2 — Drawer global y retorno contextual

**Estado:** Implementado en GitHub main; compilación, lint y pruebas manuales locales pendientes para validación.
**Fecha:** 2026-11-06.
**Alcance:** comportamiento del menú y regreso entre pantallas en shell E1-A. No implementa autenticación, permisos, React Router ni funcionalidades reales de negocio.

## Decisiones implementadas

1. **Hamburguesa global:** botón de tres rayas arriba a la izquierda; abre el menú superpuesto en escritorio o móvil.
2. **Fondo bloqueado:** el backdrop oscurece y captura clics fuera. El contenedor central recibe el atributo HTML inert; no se debe poder interactuar con contenido de fondo ni mediante teclado. El desplazamiento se bloquea mientras el menú está abierto.
3. **Cierre:** X, clic en fondo, Escape o selección de sección; el foco se dirige al botón de cierre al abrir y regresa a la hamburguesa al cerrar; Tab se mantiene dentro del menú abierto.
4. **Preferencia opcional del menú fijo:** en escritorio hay controles adicionales para fijar el panel (expandido/compacto/oculto). La hamburguesa funciona como drawer modal siempre. El modo predeterminado del nuevo diseño es **oculto**. La clave local es asistente-pyme.sidebar-mode.v2 para no heredar el diseño anterior.
5. **Volver contextual:** en pantallas internas aparece Volver. Si la ruta anterior de navegación del prototipo pertenece a la misma empresa, se usa el historial; si no existe o corresponde a otra empresa/otro sitio, va al Inicio de la empresa activa. En perfil/crear empresa y rutas desconocidas, el destino de respaldo es /inicio.
6. **Navegación de negocio:** rutas del tipo /b/businessId/seccion. WALOS/Comercio/Servicios son fixtures, no tenants reales.

## Archivos principales

- frontend/src/App.tsx: manejo del menú abierto, desplazamiento, historial interno y botón Volver.
- frontend/src/app/shell/TopBar.tsx: hamburguesa global, botón Volver y controles de menú fijo.
- frontend/src/app/shell/SideMenu.tsx: role dialog, aria-modal, manejo del foco, cierre mediante backdrop.
- frontend/src/App.css: capa modal en escritorio y móvil; z-index y visual.
- frontend/src/app/shell/sidebarPreference.ts: modo inicial oculto, persistencia local v2.
- frontend/src/app/navigation.ts y frontend/src/app/Icon.tsx: icono atrás.

## Validación requerida (no ejecutada en esta entrega)

Desde la carpeta plataforma-pyme/frontend:

~~~powershell
git pull --ff-only origin main
npm.cmd run build
npm.cmd run lint
npm.cmd run dev
~~~

| Test | Procedimiento | Esperado |
|---|---|---|
| E1-DRAWER-01 | En escritorio, abrir desde tres líneas | Panel sobre la página y fondo oscuro |
| E1-DRAWER-02 | Tocar botón o área vacía fuera del menú | Cierra sin activar contenido de fondo |
| E1-DRAWER-03 | Abrir y pulsar Escape o X | Cierra y devuelve foco a las tres líneas |
| E1-DRAWER-04 | Abrir y navegar con Tab y Shift+Tab | Foco permanece dentro del menú |
| E1-DRAWER-05 | Abrir y elegir Catálogo en WALOS | Navega a Catálogo y cierra menú |
| E1-DRAWER-06 | En /b/walos-demo/catalogo, usar Volver | Regresa a la sección anterior en WALOS o a su Inicio |
| E1-DRAWER-07 | Abrir ruta interna directamente en nueva pestaña y usar Volver | Regresa al Inicio de esa empresa; no sale a web externa |
| E1-DRAWER-08 | Cambiar entre empresas y usar Volver | No mezcla contextos de empresas |
| E1-DRAWER-09 | Repetir en pantalla de 390 px | Drawer accesible, capa oscura y cierre |
| E1-DRAWER-10 | Fijar compacto, ocultar y abrir hamburguesa | Drawer presenta todas las etiquetas; al cerrar respeta preferencia |
| E1-DRAWER-11 | Refrescar página con preferencia guardada | Conserva modo fijo, pero no abre el drawer automáticamente |

## Pendiente

- Resultados de build, lint y pruebas del navegador del equipo.
- Integración de React Router y estado compartido por empresa en E1-A2.
- Guardas de autorización reales y aislamiento multitenant en backend (E3).
- Perfil/Creación de Empresa y las demás secciones funcionales.

No se copiaron scripts globales ni permisos simulados del HTML de referencia; se retuvieron sólo patrones de interacción.
