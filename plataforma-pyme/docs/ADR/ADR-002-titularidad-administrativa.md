# ADR-002 — Fundador y titularidad administrativa
**Fecha:** 2026-11-06  
**Estado:** PROPUESTO; transferencia y recuperación DIFERIDAS con diseño obligatorio antes de API real.  
**Responsable de aprobación:** equipo del TP / responsable funcional (a designar).  
**Fuentes:** E0-A §§3.1 y 5; E0-B §§6, 8 y 12; v4 §3, D01/H01.

## Contexto
Crear una empresa requiere responsable inicial, pero **fundador histórico**, **titular administrativo de plataforma** y **titular legal/socio** no equivalen. Algunos prototipos combinan estos conceptos o permiten roles inconsistentes.

## Decisión propuesta
1. Al crear Business, registrar §founderUserId§ inmutable como hecho histórico.
2. Crear una Membership activa del creador y asignar exactamente **un titular administrativo activo inicial** por negocio (invariante).
3. No permitir en E1 transferir, revocar o eliminar el último responsable. Acciones todavía no diseñadas deben aparecer «Próximamente», no ofrecer falsa transferencia.
4. En API, transferencia de titularidad será transaccional, autorizada y auditada; la transición debe asegurar que nunca queden cero ni dos titulares **activos**. Recuperación y sucesión necesitan flujo aparte.
5. Atribución administrativa **no acredita propiedad legal** ni se deriva de aportes, socios o porcentajes.

## Alternativas
- Fundador único e irrevocable: no aceptable para negocios reales.
- Varios titulares activos sin regla de coordinación: se difiere porque rompe unicidad y responsabilidades.
- Titular legal como dato automático del usuario: descartado.

## Impacto / riesgos
La invariancia exige constraints/serialización de transferencias en backend; en DEMO se simula la validación pero no se promete concurrencia segura.

## Pruebas pendientes
- **QA-ONB-01:** alta crea una sola responsabilidad administrativa coherente con membresía.
- No se puede dejar empresa sin titular activo; dos solicitudes concurrentes de transferencia se serializan **cuando exista API**.
- Fundador registrado permanece aunque cambie el responsable.

## Aprobación
Aprobar la regla de alta inicial antes de E1-A2; dejar transferencias como capacidad no implementada hasta ADR complementario y tests.