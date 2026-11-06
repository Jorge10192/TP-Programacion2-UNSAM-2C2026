# E1-A1 — Primer shell React y navegación DEMO

**Fecha:** 2026-11-06  
**Estado:** Código **publicado en GitHub**; compilación y navegación en la computadora del equipo **PENDIENTES DE VERIFICACIÓN**.  
**Repositorio/branch:** Jorge10192/TP-Programacion2-UNSAM-2C2026, main.  
**Alcance:** primer incremento visual siguiendo E0-A/E0-B/E0-C; **no** se declara E1-A1 entero aprobado ni el prototipo integrado completo.

## 1. Implementado en código (sin asegurar ejecución)

| Pieza | Ruta | Referencia y límite |
|---|---|---|
| Shell / layout | frontend/src/App.tsx, frontend/src/App.css | E0-A Z003/Z014; marco de aplicación |
| Registro de menú y fixtures | frontend/src/app/navigation.ts | Mapa común para sidebar y tarjetas; negocios de prueba |
| Iconografía tipada | frontend/src/app/Icon.tsx | SVG propio, sin dependencias de iconos |
| Enlaces con History API | frontend/src/app/AppLink.tsx | Provisorio; **React Router pendiente según ADR-007** |
| Barra superior y selector | frontend/src/app/shell/TopBar.tsx | Selector de fixtures; no autenticación ni autorización |
| Sidebar responsive | frontend/src/app/shell/SideMenu.tsx | Menú lateral, navegación móvil, badge DEMO |
| Inicio personal/empresarial | frontend/src/features/dashboard/Dashboards.tsx | Panel, tarjetas de herramientas, valores vacíos intencionales |
| Vistas sin implementación | frontend/src/features/common/Feedback.tsx | «Próximamente», 404, empresa ficticia no encontrada |
| Reset y meta | frontend/src/index.css, frontend/index.html | Identidad visual basada en Z003/Z014 |
| Instrucciones | frontend/README.md | Arranque local y límites |

**No se modificaron** Proyecto-3-AppAdmin-Mascotas/ ni Proyecto-3-Extendido-Generico/. No se importaron ni fusionaron scripts de los 19 HTML, no se crearon cuentas ni bases de datos, no se tocaron credenciales.

## 2. Qué verificar localmente (NO ejecutado aquí)

En la raíz del repositorio, después de guardar cualquier cambio local ajeno:

~~~powershell
git status --short
git pull --ff-only origin main
cd plataforma-pyme/frontend
npm.cmd install
npm.cmd run build
npm.cmd run lint
npm.cmd run dev
~~~

Abrir la URL de Vite. **No afirmar “pasó” hasta obtener las salidas reales**.

| ID | Prueba manual / comando | Resultado esperado | Estado |
|---|---|---|---|
| E1A-BOOT-01 | npm.cmd run build | TS + Vite completan sin errores | NO EJECUTADA |
| E1A-LINT-01 | npm.cmd run lint | Sin errores de lint | NO EJECUTADA |
| E1A-NAV-01 | /inicio → WALOS → Catálogo → Volver | Navegación sin pantallas en blanco; Catálogo dice «Próximamente» | NO EJECUTADA |
| E1A-NAV-02 | Probar back/forward del navegador | Rutas cambian y sidebar indica destino | NO EJECUTADA |
| E1A-UX-01 | Tamaño móvil 390 px y escritorio | Drawer abre/cierra, tarjetas visibles, no scroll horizontal accidental | NO EJECUTADA |
| E1A-TEN-UI-01 | Cambiar WALOS ↔ Servicios Ejemplo | Encabezado y página reflejan empresa seleccionada | NO EJECUTADA |
| E1A-ROUTE-01 | /b/otro-negocio/inicio | «Empresa no disponible», sin datos de otros fixtures | NO EJECUTADA |
| E1A-DEMO-01 | Revisar dashboard y formularios | Sin cifras falsas ni acciones que supuestamente guardan | NO EJECUTADA |

**Aclaración:** E1A-TEN-UI-01 verifica UX de fixtures, **no** aislamiento real de tenants; ese trabajo empieza en E1-A2 y se asegura de verdad en backend E3.

## 3. Trabajo pendiente para cerrar E1-A1 y continuar E1-A2

1. Ejecutar y corregir **build**, **lint** y pruebas de navegador. Registrar fallos o resultados observados.
2. Incorporar React Router mediante instalación normal de npm, actualización sincronizada de package.json y lockfile y refactor controlado de navegación. Evitar publicar package.json desincronizado de package-lock.
3. Crear shells de componentes/guards de rol **DEMO** y foco accesible al cambiar de ruta.
4. E1-A2: perfil global, creación de empresa, membresía por businessId y estado demo único; sumar tests de cambio A↔B y borradores.
5. Más adelante: E1-B catálogo/stock/compras; E1-C ventas/caja; E1-D QR demo. Ninguno está implementado ahora.

## 4. Resultado de la entrega

**Estado verificable:** archivos presentes en GitHub, no pruebas ejecutadas en esta respuesta.  
**Próxima acción del equipo:** git pull → npm.cmd run build → npm.cmd run lint → npm.cmd run dev, informar salidas para cerrar E1-A1 sin confundir documentación con pruebas.

**Fuente principal de diseño:** 00_MATRIZ_INTEGRACION_HTML.md (Z003/Z014); arquitectura: 01_ARQUITECTURA_FRONTEND.md; backlog: 02_DECISIONES_Y_BACKLOG.md; ADRs: ADR-001/007/008.
