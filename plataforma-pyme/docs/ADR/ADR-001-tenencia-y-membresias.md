# ADR-001 — Aislamiento por empresa y membresías
**Fecha:** 2026-11-06  
**Estado:** PROPUESTO (regla provisional de E1; pendiente de aprobación del equipo)  
**Responsable de aprobación:** equipo del TP / responsable funcional (a designar).  
**Ámbito:** frontend DEMO, dominio y backend futuro.

## Contexto
La plataforma es multirrubro y multinegocio; un usuario puede tener cero, una o varias empresas. E0-A identifica H01/H02/H09/H14: modelos históricos de membresía única, permisos globales y almacenamiento aislado M1/M2/M3, incompatibles con el producto acordado. Fuentes: E0-A §§3.1, 5 y 7; E0-B §§5–8; plan rector v4 §§1–4.

## Decisión propuesta
1. **User** es identidad global; **Business** entidad independiente; **Membership** vincula usuario-negocio con rol/estado/alcance. Se admite 0..n membresías por usuario.
2. Todas las operaciones empresariales incluyen el contexto **businessId** y actor autenticado; **locationId** cuando la operación lo requiere. El §businessId§ de la URL no concede acceso por sí solo.
3. En DEMO, datos, borradores, proyecciones, operaciones idempotentes y permisos visibles quedan indexados por empresa. A→B invalida contexto de A (incluida caja/ubicación); no mueve borradores.
4. En backend cada recurso se busca dentro del tenant autorizado; validar permisos **en servidor**, usar filtros compuestos y constraints que impidan vínculos cruzados. Para IDs ajenos devolver error sin revelar atributos (404 o 403 según contrato a formalizar).
5. Registro de fundador y responsabilidad administrativa se define en **ADR-002**; invitación y aceptación en **ADR-003**.

## Alternativas evaluadas
- Perfil y negocio singleton: descartado, filtra información entre tenants.
- Rol único por usuario global: descartado, no respeta permisos distintos en A/B.
- Separación por despliegue/base de datos por empresa: no seleccionada para MVP; sobrecarga de operación.

## Consecuencias y riesgos
- Toda consulta y comando requiere ámbito explícito; aumenta validaciones pero evita fugas.
- Guardas visuales sólo mejoran UX; **no se presentan como seguridad real** hasta API.
- Futuro backend debe prevenir escrituras cross-tenant incluso si el cliente manipula IDs.

## Pruebas de aceptación pendientes
- **DEMO-TEN-01:** usuario pertenece a A y B con roles diferentes; alternar y verificar catálogo, borradores, botones y dashboard sin contaminación.
- **QA-TEN-01/02:** API niega lectura/escritura de recurso de B desde A y aplica rol efectivo por membresía.
- Crear usuario sin empresa y empresa de servicios sin depósito.

## Revisión y aprobación
Aprobar antes de cerrar E1-A2. Ajustar contratos según UML/TP3 durante E2; no confundir una demo en memoria con acceso protegido en servidor.