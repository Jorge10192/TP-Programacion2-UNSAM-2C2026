# E1-B4 — Equipo de trabajo e invitaciones nominativas DEMO

**Fecha:** 2026-11-06.
**Estado:** Código publicado en GitHub main; build, lint, tests y navegador PENDIENTES de ejecutar localmente.
**Fuente:** E0-A Z002/Z014; E0-C E1-B1-02; ADR-001/002/003. Los ADR continúan PROPUESTOS.

## Alcance implementado

- Ruta /b/:businessId/equipo y acceso rápido «Equipo de trabajo» disponible.
- Listado: el perfil global del titular inicial, con la función laboral de esta empresa; colaboradores ficticios que resulten de respuestas simuladas.
- Invitación nominativa: correo de prueba, rol ENCARGADO o TRABAJADOR. No se ofrece PROPIETARIO ni transferencia de titularidad.
- Estados PENDIENTE, CANCELADA, RECHAZADA y ACEPTADA; EXPIRADA se calcula en la interfaz sin crear membresías. Vigencia propuesta de 7 días.
- Alta de invitación pendiente NO agrega integrante ni da acceso. «Simular respuesta» requiere un paso independiente, con aceptación/rechazo explícitos.
- Aceptar actualiza la invitación y crea miembro DEMO en una única notificación de estado local. Repetir aceptación no duplica miembros.
- Cancelar y rechazar no crean miembros. No se elimina ni degrada al titular inicial.
- Los comandos incluyen businessId y rechazan IDs de invitaciones de otras empresas. Mismo correo en A y B no comparte rol.
- Enlace/QR para solicitar incorporación continúa «Próximamente», sin inventar un QR que conceda acceso.

## Persistencia y seguridad

Se conserva la misma clave asistente-pyme.e1a2.demo.v1 y version 1. Se agregan arrays opcionales teamInvitations y teamMembers. Los datos previos profile, createdBusinesses, fixtureEdits, memberJobs, locations y mapUrl permanecen en el mismo objeto; su lectura es compatible.

La carga valida formato de IDs, correos, roles, estados, fechas y pertenencia al negocio. Un integrante restaurado tiene que estar asociado a una invitación ACEPTADA coherente.

No hay autenticación de destinatarios, envío real de emails, token de aceptación, autorización, auditoría persistente ni concurrencia. El botón «Simular aceptación» representa la respuesta del destinatario SÓLO dentro de la DEMO local; no es una acción real del titular para aceptar por otra persona. La implementación productiva debe incorporar tokens de un solo uso, permisos del actor, aceptación desde identidad verificada y transacciones en backend.

## Archivos

- frontend/src/data/demo/teamPolicy.ts — política pura de roles/email/expiración.
- frontend/src/data/demo/demoStore.ts — invitaciones y miembros en el snapshot y comandos tipados.
- frontend/src/features/team/TeamPage.tsx — panel, formulario y respuestas simuladas.
- frontend/src/App.tsx — ruta scoped por businessId.
- frontend/src/features/dashboard/Dashboards.tsx — acceso rápido disponible.
- frontend/src/App.css — diseño adaptable.
- frontend/tests/team-policy.test.mjs y script npm test:team — pruebas unitarias.

## Comandos desde plataforma-pyme/frontend

~~~powershell
git pull --ff-only origin main
npm.cmd run build
npm.cmd run lint
npm.cmd run test:team
npm.cmd run test:maps
npm.cmd run dev
~~~

Si Vite ya está activo, no volver a iniciarlo. La compilación y los tests nuevos NO han sido ejecutados en la computadora del equipo.

## Matriz de aceptación

| ID | Acción | Esperado |
|---|---|---|
| EQ-01 | Entrar a Equipo en WALOS | Titular inicial presente; ningún empleado inventado |
| EQ-02 | Invitar persona@ejemplo.invalid con rol Trabajador | PENDIENTE, número de miembros no cambia |
| EQ-03 | Invitar el mismo correo con mayúsculas en la misma empresa | Rechaza duplicado |
| EQ-04 | Mismo correo en otra empresa | Independencia de roles/invitaciones |
| EQ-05 | Simular aceptación | Sólo ahora crea integrante DEMO |
| EQ-06 | Actualizar F5 o repetir aceptación | Sin duplicados; invitación y miembro conservados |
| EQ-07 | Crear otra invitación y cancelar | CANCELADA, sin miembro |
| EQ-08 | Simular rechazo | RECHAZADA, sin miembro |
| EQ-09 | Revisar selector de roles | Sólo Encargado/Trabajador; no Propietario |
| EQ-10 | Editar puesto laboral del titular | No cambia la responsabilidad administrativa |
| EQ-11 | Probar antiguos perfil, empresas, ubicaciones y mapas | Persistencia anterior intacta |
| EQ-12 | Pantalla 390 px, teclado y menú | Interfaz legible, accesible |
| EQ-13 | Build, lint, test:team, test:maps | Sin errores |

## Próximas decisiones

ADR-003 debe ser aprobado o modificado por el equipo antes de generar invitaciones reales. Completar flujo de cuenta invitada, expiración efectiva, revocación y autorización por ubicación en backend, con auditoría. Para el siguiente corte funcional se puede avanzar con Catálogo o Cuentas y medios de cobro, manteniendo alcance TP3.
