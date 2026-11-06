# E1-A1.1 — Menú lateral adaptable

**Estado:** Implementado en código y publicado en main; compilación/lint y comportamiento visual de esta revisión pendientes de ejecutar en el equipo.

**Objetivo:** mejorar el shell validado con capturas, sin alterar el tablero ni iniciar los módulos funcionales.

## Comportamiento

| Entorno | Estado inicial | Acción | Resultado |
|---|---|---|---|
| Escritorio (>900 px) | Expandido | Botón de panel en la barra superior | Compacto: sólo íconos |
| Escritorio (>900 px) | Compacto | Botón de panel | Expandido: íconos y textos |
| Escritorio (>900 px) | Expandido o compacto | Botón «Ocultar menú lateral» en la barra superior | Oculto: panel central utiliza el espacio libre |
| Escritorio (>900 px) | Oculto | Botón «Mostrar menú lateral» | Expandido |
| Móvil (≤900 px) | Cerrado | Botón de hamburguesa | Drawer superpuesto |
| Móvil (≤900 px) | Abierto | Botón, fondo, Escape o navegación | Cierra el drawer |

La preferencia **de escritorio** se guarda en localStorage con clave asistente-pyme.sidebar-mode.v1. Es una preferencia global **sólo visual**; no depende de la empresa elegida. Si localStorage está bloqueado se usa el modo expandido durante la sesión. El menú móvil no cambia esa preferencia: es un drawer temporal.

En el modo compacto los enlaces siguen siendo reales, accesibles con teclado, con aria-label, aria-current para la ruta activa y title para mostrar nombres al pasar el cursor.

## Archivos modificados

- frontend/src/App.tsx: controlador de estados, persistencia y Escape.
- frontend/src/app/shell/sidebarPreference.ts: validación y almacenamiento local del modo.
- frontend/src/app/shell/TopBar.tsx: controles de modo para escritorio y drawer móvil.
- frontend/src/app/shell/SideMenu.tsx: clases y etiquetas accesibles.
- frontend/src/app/AppLink.tsx: title y aria-current opcionales.
- frontend/src/app/navigation.ts y frontend/src/app/Icon.tsx: dos íconos de panel.
- frontend/src/App.css: reglas de compacto/oculto y visibilidad móvil.

El dashboard y sus tarjetas se mantienen sin cambios funcionales. «Todas las secciones» había sido retirado previamente por duplicar el menú lateral.

## Validación pendiente

Ejecutar desde plataforma-pyme/frontend:

~~~powershell
git pull --ff-only origin main
npm.cmd run build
npm.cmd run lint
npm.cmd run dev
~~~

**Matriz de pruebas a registrar:**

| ID | Verificación | Resultado esperado | Estado |
|---|---|---|---|
| MENU-01 | Escritorio, botón de panel dos veces | Expandido → compacto → expandido | No ejecutada |
| MENU-02 | Escritorio, ocultar y mostrar | Área de trabajo se amplía y menú vuelve | No ejecutada |
| MENU-03 | Guardar compacto/oculto y actualizar F5 | Conserva el modo de escritorio | No ejecutada |
| MENU-04 | Cambiar WALOS ↔ otra demo | Preferencia visual igual; menú activo cambia | No ejecutada |
| MENU-05 | 390 px: abrir, cerrar con fondo, Escape y enlaces | Drawer temporal y sin superposición persistente | No ejecutada |
| MENU-06 | Pasar de 390 px a escritorio con drawer abierto | Drawer se cierra; respeta preferencia escritorio | No ejecutada |
| MENU-07 | Teclado Tab sobre enlaces compactos | Foco visible y destino accesible | No ejecutada |
| MENU-08 | npm.cmd run build | TypeScript y Vite sin errores | No ejecutada |
| MENU-09 | npm.cmd run lint | Cero advertencias/errores | No ejecutada |

**Límite:** el estado local de visibilidad NO es gestión de usuarios ni aislamiento multitenant; React Router, perfil, creación de empresa y estado real por tenant siguen previstos en E1-A2/E2-E3.

**Fuente:** E0-A Z003/Z014; 01_ARQUITECTURA_FRONTEND.md y 02_DECISIONES_Y_BACKLOG.md.
