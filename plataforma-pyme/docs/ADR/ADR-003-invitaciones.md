# ADR-003 — Dos modalidades de invitación y acceso
**Fecha:** 2026-11-06  
**Estado:** PROPUESTO. Orden del MVP: nominativa primero; enlace/QR de solicitud DIFERIDO sin cancelarlo como requisito.  
**Responsable de aprobación:** equipo del TP / responsable funcional (a designar).  
**Fuentes:** E0-A Z002/Z014, H12 y D02, ``3.1/5; E0-B ``5 y 8; plan v4.

## Problema
El diseño de Equipo contempla invitación nominativa mientras M1 permite compartir un link o QR para **solicitar** ingresar. Son procesos con autorizaciones y estados distintos.

## Decisión propuesta
**A. Invitación nominativa:** una persona autorizada invita a un email y rol permitido. Estados conceptuales `PENDIENTE → ACEPTADA / RECHAZADA / CANCELADA / EXPIRADA`; token no reutilizable, vencimiento y destinatario correcto. Aceptación confirma membresía una sola vez y se audita.

**B. Enlace o QR de solicitud:** un enlace empresarial permite iniciar una solicitud, **no** asigna permiso automáticamente. Estados conceptuales `PENDIENTE → APROBADA / RECHAZADA / CANCELADA`; aprobación por miembro autorizado crea/activa membresía. Token de enlace y solicitud no se confunden con invitación nominada.

**En E1:** implementar la invitación nominada sólo después de tener Empresa/Membresía; el segundo flujo puede permanecer como vista «Próximamente». Nunca prometer envío de correo real en DEMO.

## Alternativas y consecuencias
- Unificar invitación y solicitud en un único botón «Ingresar» que crea membresía: descartado por escalamiento de privilegios.
- Eliminar QR/enlace: rechazado como política permanente; diferido como implementación.
- Rol PROPIETARIO asignable en invitación: no permitido por propuesta; la transferencia usa ADR-002.

## Pruebas pendientes
- **QA-INV-01:** token vencido, revocado o para otro usuario no concede acceso.
- Reusar invitación aceptada no duplica membresías; usuario sin autorización no invita.
- Solicitud por enlace no habilita acceso hasta aprobación.

## Revisar antes de API
Concretar expiración, revocación, política de roles y entrega segura de tokens; sin credenciales en fixtures públicos.