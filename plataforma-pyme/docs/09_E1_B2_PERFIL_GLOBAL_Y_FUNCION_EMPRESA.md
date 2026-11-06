# E1-B2 — Perfil global y función laboral por empresa

**Estado:** Implementado en main; build, lint y pruebas locales pendientes.
**Referencia visual:** modal Mi Perfil Personal de Menu_Principal(1).html.
**Alcance:** sigue siendo DEMO local, sin autenticación, autorizaciones, APIs ni usuarios reales.

## Conceptos y reglas

- Perfil personal ÚNICO y GLOBAL: nombre visible, correo DEMO opcional, avatar por iniciales opcionales y teléfono DEMO opcional.
- Avatar: hasta cuatro letras; si se deja vacío, las iniciales derivan del nombre. Se muestra en el perfil y en la barra superior. No se cargan ni se enlazan fotografías externas.
- Función laboral: texto descriptivo de la membresía de cada empresa, independiente del perfil global y del rol. No otorga permisos ni transforma a nadie en administrador.
- Guardado separado: Guardar mi perfil actualiza datos globales; Guardar función DEMO actualiza la función únicamente en la empresa seleccionada.
- No se copian las simulaciones de permisos ni los datos personales/telefónicos predefinidos en los HTML históricos.

## Persistencia compatible

Se conserva la misma clave local asistente-pyme.e1a2.demo.v1, esquema version 1.

Campos nuevos opcionales durante carga:
- profile.avatarInitials: vacío si faltaba.
- profile.contactPhone: vacío si faltaba.
- memberJobs: mapa de businessId a función; si falta, cada membresía usa jobTitle vacío.

No se borran profile.displayName, profile.email, createdBusinesses ni fixtureEdits al guardar. Las operaciones son locales a la DEMO; el backend tendrá otro esquema, con control de acceso real.

## Código

- frontend/src/data/demo/demoStore.ts: DTO global, membresía, almacenamiento compatible y comandos.
- frontend/src/features/profile/ProfilePage.tsx: formularios de perfil y función.
- frontend/src/app/shell/TopBar.tsx: avatar global.
- frontend/src/App.tsx: membresías enviadas a Mi perfil.
- frontend/src/App.css: diseño y responsive.

## Verificación pendiente

Desde plataforma-pyme/frontend:

~~~powershell
git pull --ff-only origin main
npm.cmd run build
npm.cmd run lint
npm.cmd run dev
~~~

| Caso | Procedimiento | Esperado |
|---|---|---|
| PERFIL-01 | Entrar a Mi perfil después de actualizar | Nombre y correo anteriores intactos |
| PERFIL-02 | Guardar iniciales ficticias | Avatar del perfil y barra superior coinciden |
| PERFIL-03 | Borrar iniciales | Aparecen letras derivadas del nombre |
| PERFIL-04 | Ingresar cinco letras o números como iniciales | Validación impide guardar |
| PERFIL-05 | Guardar teléfono ficticio y recargar F5 | Persistencia local |
| PERFIL-06 | Definir funciones laborales distintas en WALOS y Comercio; F5 | Cada empresa conserva su función |
| PERFIL-07 | Editar perfil global luego de puesto | No se borran las funciones |
| PERFIL-08 | Visitar una empresa creada previamente | Empresa y cambios anteriores conservados |
| PERFIL-09 | Ver formularios con 390 px | Sin desbordamiento horizontal |
| PERFIL-10 | Build y lint | Cero errores y cero advertencias |

No usar nombres, correos o teléfonos reales en la DEMO; localStorage no ofrece seguridad ni sincronización.
