# E1-A2.1 — Perfil personal y alta de empresas DEMO

**Fecha:** 2026-11-06.
**Estado:** Código publicado en GitHub main; build, lint y pruebas manuales E1-A2 pendientes de ejecutar/registrar por el equipo.
**Fuente:** E0-B y backlog E0-C (E1-A2); ADR-001, ADR-002 y ADR-007, todavía **PROPUESTOS**.
**Alcance:** incremento funcional de demostración, no autentica usuarios y no crea empresas en backend.

## Qué se implementó

1. **Perfil personal único** en /perfil: nombre visible y correo DEMO opcional, editables; el perfil no depende del negocio seleccionado. No contraseña, login ni autorización.
2. **Crear empresa** en /empresas/nueva: nombre, tipo Productos / Servicios / Mixto, rubro opcional y descripción opcional. Sin obligatoriedad de stock, caja, local, recetas o feria.
3. **Alta coherente**: la creación registra una empresa y una membresía DEMO ACTIVA con rol TITULAR_ADMINISTRATIVO para el usuario de demostración; fundador y responsable inicial coinciden pero son campos diferentes. No hay transferencia de titularidad.
4. **Selector y dashboard integrados**: empresas recién creadas aparecen tanto en /inicio como en el selector de la barra superior y se puede recorrer su /b/:businessId/inicio.
5. **Ficha inicial de negocio** en /b/:businessId/empresa: nombre, actividad, descripción e información DEMO de titularidad. Sólo lectura; edición futura E1-B.
6. **Gateway tipado de ejemplo**: demoGateway.saveProfile y demoGateway.createBusiness retornan Promise y operan sobre una única fuente de estado local observable mediante useSyncExternalStore.
7. **Persistencia sólo local**: datos de creación y perfil se guardan en localStorage bajo la clave versionada asistente-pyme.e1a2.demo.v1. Los 3 negocios iniciales WALOS, Comercio Ejemplo y Servicios Ejemplo se reconstruyen como fixtures, no se duplican en cada guardado. Valor local, no seguridad ni backup.
8. **Contexto por empresa**: negocios y membresías indexados por businessId. La ruta no valida identidad real; la vista DEMO sólo encuentra negocios con membresía DEMO activa en el snapshot local.

## Archivos

- frontend/src/data/demo/demoStore.ts — tipos, fixtures, snapshot único, carga versionada, comandos tipados y suscripción.
- frontend/src/features/profile/ProfilePage.tsx — formulario personal.
- frontend/src/features/businesses/BusinessPages.tsx — creación y ficha de empresa.
- frontend/src/App.tsx — rutas funcionales y lectura del snapshot DEMO.
- frontend/src/app/shell/TopBar.tsx — selector y avatar dinámicos.
- frontend/src/app/navigation.ts — sin lista paralela de empresas.
- frontend/src/features/dashboard/Dashboards.tsx — listado dinámico de empresas y acceso Crear activo.
- frontend/src/App.css — estilos responsivos de formularios.
- frontend/README.md — instrucciones.

## Pruebas de aceptación (pendientes, no se afirma resultado)

Primero, dentro de plataforma-pyme/frontend:

~~~powershell
git pull --ff-only origin main
npm.cmd run build
npm.cmd run lint
npm.cmd run dev
~~~

| ID | Procedimiento | Criterio |
|---|---|---|
| E1A2-BUILD | build y lint | Sin errores ni advertencias |
| E1A2-PER-01 | Ir a Mi perfil, cambiar nombre DEMO y guardar | Avatar y nombre reflejan cambio; refrescar mantiene valor |
| E1A2-PER-02 | Cambiar WALOS↔Servicios y volver a Mi perfil | El perfil permanece único y compartido |
| E1A2-PER-03 | Correo inválido, nombre de 1 carácter | Formulario rechaza guardado, da feedback |
| E1A2-ONB-01 | Crear empresa tipo SERVICIOS sin rubro/local/stock | Creación exitosa; lleva al Inicio del negocio |
| E1A2-ONB-02 | Volver a /inicio y abrir selector | Empresa aparece en ambos lugares |
| E1A2-ONB-03 | Refrescar página y reiniciar Vite | Empresa creada se conserva en mismo navegador |
| E1A2-ONB-04 | Crear empresa de tipo MIXTO | No solicita almacén; muestra tipo correcto en ficha |
| E1A2-TEN-01 | Alternar empresa A/B, visitar ficha, volver | Nombres/identificadores corresponden al businessId activo |
| E1A2-TEN-02 | Abrir /b/id-no-existente/inicio | «Empresa no disponible»; no muestra atributos de otras compañías |
| E1A2-NAV-01 | Hamburguesa, volver, cambio de empresa | Navegación y modal siguen funcionando |
| E1A2-RESP-01 | Pantalla 390 px | Formularios usables sin desplazamiento horizontal |

## Limitaciones y próximas tareas

- Las empresas/identidades/roles DEMO no son usuarios, autorizaciones ni tenants reales; cualquiera con acceso al navegador local puede alterar los datos locales.
- No hay sesiones reales, sincronización entre equipos o pestañas, invitaciones, borradores operativos, transferencias, API, PostgreSQL ni Mercado Pago.
- Persistencia local puede fallar por cuota, modo privado o configuración: la interfaz seguirá en memoria, pero no se asegura guardado permanente; requisito de mejora: indicar fallo de almacenamiento al usuario si se hace uso serio.
- Próximos cortes: suite Vitest + smoke E2E; React Router; reglas de aislamiento y draft scope; después integración de módulos M1/M2 y E1-C. No inventar funciones de negocio a partir del formulario.
- Antes de cerrar E1-A2 el equipo debe revisar/aprobar o modificar ADR-001/002. La regla usada aquí es provisional y segura para demo, no implica aprobación del ADR.

**No se tocaron** los proyectos hermanos del TP ni se copiaron datos reales o scripts globales de HTML históricos.
