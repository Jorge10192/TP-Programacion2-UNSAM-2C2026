# ADR-007 — Frontend, navegación y repositorio DEMO
**Fecha:** 2026-11-06  
**Estado:** PROPUESTO, pendiente de validación del equipo al comenzar E1-A.  
**Responsable de aprobación:** equipo del TP / responsable técnico (a designar).  
**Fuentes:** E0-A H08/H09/H15/H17/H21; E0-B §§2–7; plan v4 §§3–4.

## Decisión técnica propuesta
- §frontend/§ como **SPA React + TypeScript + Vite** dentro de §plataforma-pyme/§. React Router para rutas, §navigation.ts§ como registro único de menú/tarjetas, tokens CSS y componentes accesibles.
- Zustand es propuesta de store DEMO. **Estado del negocio central por businessId**, no §localStorage§ y funciones globales heredadas de M1/M2/M3.
- Separar §session§, §activeBusiness§, §businessesById§ y §draftsByScopedKey§ (user+business+feature+location cuando aplica).
- UI invoca comandos/consultas tipados a §AppGateway§; §DemoGateway§ primero, §ApiGateway§ después. Comandos empresariales siempre llevan actor, businessId y commandId; validación y resultado tipado.
- E1-A comienza con estado en memoria y fixtures DEMO; persistencia opcional se introduciría mediante adaptador versionado, **no** como seguridad real.
- Menú Inicio/empresa/perfil/ubicaciones/catálogo/ventas/caja con rutas explícitas; las no implementadas presentan «Próximamente».
- WALOS es una empresa ejemplo, **no** un requisito de rubro ni una marca del producto.

## Alternativas
- Importar 19 HTML por iframe o copiar scripts globales: descartado, acoplamiento y datos incoherentes.
- Estado aislado por M1/M2/M3: descartado.
- Acoplar §fetch§ directamente a cada pantalla: descartado por migración costosa a API.
- React + Redux o microfrontends: complejidad no necesaria en primer circuito; reconsiderar sólo con evidencia.

## Consecuencias y límites
Las autorizaciones, transacciones, concurrencia y tokens verdaderos estarán en backend. Guardas UX y fixtures en memoria son **simulación**: no afirmación de seguridad ni persistencia real.

## Pruebas pendientes
- **DEMO-NAV-01:** cada tarjeta lleva a vista o «Próximamente» y coincide con menú lateral.
- **DEMO-TEN-01:** alternar empresa A/B limpia contexto/carro/borradores.
- **DEMO-UX-01:** shell responsive, formularios/modal teclado, foco y errores visibles.
- Con el backend, mismas operaciones comerciales mediante §ApiGateway§ sin doble autoridad.

## Hito de revisión
Aprobar stack antes de crear el esqueleto Vite E1-A1; si se cambia framework, documentar impacto en este ADR sin reauditar HTML.