# E1-B1 — Datos de la Empresa: primera integración de Z001

**Fecha:** 2026-11-06.
**Estado:** Publicado en GitHub main. Compilación, lint y recorridos de navegador pendientes de ejecución local por el equipo.

## Referencias de diseño

- Boton_Editar_Perfil_Empresa.html (Z001): información general, identidad visual, edición contextual, CUIT opcional, eslogan, biografía, documentos y contactos.
- Menu_Principal(1).html (Z003): panel del negocio, identidad, perfil de usuario y menú.
- Capturas de React actual y de HTML previos aportadas por el equipo.

Se reconstruyen los patrones visuales en React. NO se copian scripts globales, innerHTML, datos fijos de WALOS como regla del producto, archivos de ejemplo, métricas inventadas o simulaciones de autorización.

## Implementado

1. Vista editable en la ruta empresarial /b/:businessId/empresa, con hero del negocio.
2. Tarjetas con edición contextual, Cancelar y Guardar para nombre comercial, rubro, eslogan, presentación/biografía y CUIT opcional de prueba.
3. Único comando demoGateway.updateBusinessDetails(businessId, patch), que actúa exclusivamente sobre la empresa DEMO seleccionada y mantiene actualizado el selector superior y el Inicio.
4. Empresas creadas siguen persistidas como antes bajo createdBusinesses.
5. Para editar los tres negocios fixture, se guarda un objeto opcional fixtureEdits en la misma clave versionada asistente-pyme.e1a2.demo.v1; evita borrar el perfil y las empresas creadas que ya estén en ese almacenamiento.
6. Se incorporan campos slogan y taxId, vacíos por defecto en datos antiguos (compatible con E1-A2).
7. Borradores de campo se desmontan al cambiar businessId; no se transfieren entre empresas.
8. Validaciones: nombre entre 2 y 80 caracteres, rubro hasta 120, descripción hasta 350, eslogan hasta 120, CUIT ficticio vacío o formato de once dígitos (con guiones opcionales). El formato no verifica la identidad fiscal.
9. Documentos y medios de contacto aparecen como Próximamente, sin prometer cargas, redes, cuotas de almacenamiento o autorizaciones.
10. Carga de logos, programación de cambios, roles, pausa y edición de contactos diferidos a posteriores incrementos con dominio definido.

## Código actualizado

- frontend/src/data/demo/demoStore.ts
- frontend/src/features/businesses/BusinessDetailsPage.tsx
- frontend/src/features/businesses/BusinessPages.tsx
- frontend/src/App.tsx
- frontend/src/App.css

## Verificar en VS Code (todavía no ejecutado en esta entrega)

Desde plataforma-pyme/frontend:

~~~powershell
git pull --ff-only origin main
npm.cmd run build
npm.cmd run lint
npm.cmd run dev
~~~

| ID | Acción | Esperado |
|---|---|---|
| E1B-EDIT-01 | Cambiar nombre de empresa DEMO creada | Hero, selector e Inicio actualizados |
| E1B-EDIT-02 | Guardar eslogan y biografía, F5 | Persisten en el mismo navegador |
| E1B-EDIT-03 | Editar rubro de fixture WALOS, F5 | Cambio se conserva |
| E1B-EDIT-04 | Editar A, cambiar a B y regresar | No se mezclan los datos entre A y B |
| E1B-EDIT-05 | Guardar nombre vacío o 1 letra | Rechazo, dato anterior intacto |
| E1B-EDIT-06 | CUIT ficticio de formato incorrecto | Error claro, sin guardar |
| E1B-EDIT-07 | Cambiar campo y Cancelar | No altera los datos |
| E1B-EDIT-08 | Cambiar de empresa con edición abierta | No traslada el borrador |
| E1B-EDIT-09 | Documentos/contactos | Próximamente, sin acciones engañosas |
| E1B-EDIT-10 | Reducir ancho a 390 px | Campos legibles y menú operativo |
| E1B-MIG-01 | Perfil y empresa DEMO existentes antes del cambio | Datos previos preservados |

**Nota:** almacenamiento únicamente DEMO, no es backup, sincronización, autenticación ni autorización real. Evitar datos personales/fiscales reales.

## Pendiente

- Ejecutar build, lint y las pruebas; luego registrar resultados.
- Integrar pruebas automatizadas y React Router, como plantea ADR-007.
- Más adelante enriquecer el perfil global (iniciales, puesto, contacto opcional), basándose en la captura del modal original, sin duplicar perfil por empresa.
- Modelar documentos, visibilidad de contactos y cambios programados antes de habilitarlos.
- Integrar Ubicaciones y Equipo de trabajo según E1-B, manteniendo requisitos de TP3.
