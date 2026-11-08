# Documentación de entrega — Programación 2

**Proyecto:** Asistente PyME — Plataforma generalista de gestión para múltiples empresas y rubros.  
**Ubicación prevista en el repositorio:** `plataforma-pyme/entrega-programacion-2/`.  
**Estado de esta carpeta:** 01 v0.7, 02 v0.8, 03 v0.8 y 04 v0.9; conservan el diseño conceptual y documentan equipo C.4b. 05 v0.5 registra rutas RBAC del equipo (CI aprobado, validación local pendiente). 06 pruebas/despliegue pendiente. No sustituye `../docs/`.

## Propósito

Reunir los documentos académicos y el material de exposición correspondientes al proyecto de Programación 2. El contenido debe reflejar la implementación demostrable y diferenciarla de la arquitectura de backend aún planificada.

Se toma como referencia la consigna oficial **«Desarrollo de una API RESTful»**: al menos cinco requerimientos funcionales de alto nivel cubiertos por endpoints, documentación y casos de uso, FastAPI, registro/autenticación segura, SQLAlchemy, Docker, testing, deploy, un patrón de diseño útil, al menos diez pruebas unitarias, GitHub Actions y una presentación con al menos un diagrama UML y explicación de patrones.

## Índice y orden de trabajo

| Documento | Propósito | Estado |
|---|---|---|
| `01_ANALISIS_DE_REQUERIMIENTOS.md` | Problema, objetivos, actores, alcance RF/RNF, reglas, criterios de aceptación y prioridad del backend | **BORRADOR funcional v0.7, equipo C.4b** |
| `02_CASOS_DE_USO.md` | 12 casos de uso del backend propuesto, flujos, errores, idempotencia, concurrencia y trazabilidad | **REVISADO v0.8 — equipo C.4b con RBAC** |
| [`03_MODELO_DE_DOMINIO_Y_UML.md`](03_MODELO_DE_DOMINIO_Y_UML.md) | Entidades, reglas, cardinalidades, estados, transacciones y tres diagramas UML | **PUBLICADO v0.8 — invariantes de membresía C.4b** |
| [`04_ARQUITECTURA_Y_PATRONES.md`](04_ARQUITECTURA_Y_PATRONES.md) | Arquitectura AS-IS/TO-BE, patrón Repository, Adapter y patrones del libro (Factory, Decorator, Observer) | **PUBLICADO v0.9 — administración de equipo C.4b** |
| [`05_MATRIZ_API_Y_TRAZABILIDAD.md`](05_MATRIZ_API_Y_TRAZABILIDAD.md) | RF → CU → endpoints reales → pruebas/roles/evidencia/pendientes | **PUBLICADO v0.5 — E2-1 C.4b** |
| `06_PRUEBAS_Y_DESPLIEGUE.md` | Estrategia de pruebas, GitHub Actions, Docker, despliegue y evidencias | Pendiente |
| [`diagramas/`](diagramas/) | SVG vectoriales aprobados, fuentes PlantUML editables y tres guías detalladas | **03A / 03B / 03C publicados** |
| `presentacion/` | Diapositivas de defensa final | A crear |

> La consigna exige **al menos un UML**, no exactamente dos. Se planifica un diagrama de casos de uso y uno de clases para mejorar la exposición, sujetos a aprobación del equipo.

## Convenciones

1. **AS-IS / Implementado DEMO:** evidencia disponible en el frontend React, con persistencia local y sin seguridad de servidor.
2. **AS-IMPLEMENTED / Backend comprobado:** FastAPI, PostgreSQL, SQLAlchemy, Docker, auth y empresas; contrastar rutas y pruebas con 05. **TO-BE / Pendiente:** invitaciones, autorización de futuros comandos, catálogo, compras, stock, ventas e integración con React.
3. **Diferido:** fuera del alcance del MVP; por ejemplo, pagos reales de Mercado Pago, QR parcial real, conciliación bancaria y automatizaciones no comprometidas.
4. Requerimientos identificados como `RF-xx`, no funcionales como `RNF-xx` y reglas de negocio como `RN-xx`. Conservan sus identificadores entre documentos. La etiqueta **NÚCLEO MVP**, **SOPORTE MVP** o **POST-MVP** expresa el alcance propuesto del backend, no una funcionalidad implementada.
5. Cada documento pasa por `BORRADOR` → `APROBADO` → `ACTUALIZADO PARA ENTREGA`, registrando versión/fecha. La aprobación corresponde al equipo. **No se debe marcar un backend como implementado ni una prueba como aprobada sin evidencia.**
6. **WALOS es una empresa de ejemplo**, no define el público objetivo ni limita los rubros de la plataforma.
7. Documentar únicamente hechos verificables; no confundir pruebas de frontend con pruebas de API real.

## Documentación interna complementaria

Los documentos en `../docs/` incluyen decisiones de integración E0–E1, ADR y pruebas. Son fuentes de consulta, **no equivalentes automáticamente a la entrega final**: algunos representan propuestas históricas que deben contrastarse con el código actual.

El README técnico de instalación y comandos se mantiene en `../frontend/README.md` y, cuando exista, en `../backend/README.md` o el README raíz correspondiente. Este índice académico no los sustituye.

## Uso

Se aprueba un documento por vez antes de incorporarlo a `main`. No subir capturas o datos sensibles de empresas reales. En las próximas etapas, completar la matriz de evidencia con rutas reales, resultados de tests y enlaces al despliegue.

**Alcance para la primera API:** la selección de requerimientos de núcleo y soporte del Documento 01 es una propuesta sometida a aprobación, no un compromiso de implementar todas las pantallas de la DEMO en FastAPI. La presentación debe distinguir un diagrama UML de clases (estructura) y uno de casos de uso (interacciones). Los diagramas se guardarán junto con sus fuentes editables en `diagramas/`, y la exposición en `presentacion/`.

## Cómo utilizar los diagramas del Documento 03

- **[03A — Identidad, empresas y catálogo](diagramas/03A_EXPLICACION_IDENTIDAD_EMPRESAS_CATALOGO.md):** identidad global, membresías por empresa, fundador, invitaciones, recursos y cardinalidades.
- **[03B — Compras, recepción, inventario y ventas](diagramas/03B_EXPLICACION_COMPRAS_INVENTARIO_VENTAS.md):** compra sin stock, recepción única, ventas y pagos declarados, snapshots, saldos, movimientos, concurrencia e idempotencia.
- **[03C — Casos de uso de la primera API](diagramas/03C_EXPLICACION_CASOS_DE_USO.md):** actores, CU-01 a CU-12, flujos ejemplificativos y trazabilidad a requerimientos.

Cada explicación enlaza la **lámina SVG vectorial** (visualización de presentación) y el archivo **PlantUML** (fuente UML editable). Las láminas muestran el diseño conceptual TO-BE, no la implementación ya existente de FastAPI. Para la defensa, usar los SVG; para mantener o revisar asociaciones y cardinalidades, consultar el PUML y el Documento 03.

## Política de actualización por incrementos E2

**Regla operativa:** ninguna entrega mayor se considera cerrada solo por compilar. La misma entrega debe enlazar código, contratos HTTP, pruebas, versión Alembic si corresponde y documentos académicos. En cada corte se revisa 05 y `../backend/README.md`; 01/02 cambian al concretar RF/CU, 03 y el UML 03A al modificar entidades/reglas/cardinalidades, y 04 al modificar arquitectura/seguridad/patrones. El 03B no se regenera por cambios de identidad o autorización.

**Orden acordado:** C.1 RBAC (validado) → C.2 edición empresarial (validado) → C.3 emisión (147 pruebas validadas) → C.4a aceptación (171 pruebas validadas) → C.4b equipo (CI aprobado, validación local pendiente) → C.5 cierre documental de E2-1 y revisión 03A/Documento 05 → RF-03 ubicaciones. Cada paso exige tests locales y CI verificables antes de avanzar; un código publicado no equivale por sí solo a etapa validada.

### Estado de E2-1.3C.2 (corte del 8/11/2026)

Se publicó `PATCH /api/v1/businesses/{business_id}` con validaciones de datos y autorización por rol real vinculada a la sesión y la empresa. La nueva ruta implementa una parte de RF-02/CU-03. **La ejecución local y CI de las pruebas nuevas está pendiente**; C.1 sí terminó con 98 pruebas aprobadas. No se alteró el modelo de dominio ni se regeneraron 03A/03B. Las invitaciones siguen en el bloque E2-1 (C.3/C.4); no generar todavía la hoja formal para revisión del compañero, porque el bloque funcional no terminó.

### Estado C.3, corte del 8/11/2026

Emisión segura de invitaciones `POST /api/v1/businesses/{business_id}/invitations` implementada y probada en CI. Existe nueva migración `e213c3_invitations`; la invitación no crea membresía, el token se entrega una sola vez y se persiste únicamente su hash. Aceptación y administración de miembros siguen pendientes. Validación de Alembic/PostgreSQL/Docker local requerida antes de cerrar C.3. La hoja formal de auditoría para el compañero se prepara solo al cerrar **E2-1** completo, no por cada subpaso.

### C.4a — Aceptación de invitaciones, 8/11/2026

Se implementó `POST /api/v1/invitations/accept`: el destinatario autenticado consume la invitación con el token de C.3, crea o reactiva una sola Membresía y confirma estado ACEPTADA + traza de usuario/fecha en una sola transacción. Migración `e213c4_acceptance`. CI aprobado en Python 3.12/3.14/PostgreSQL y Docker, **validación local pendiente**. C.4b (administración del equipo) y cierre UML 03A quedan pendientes. No generar todavía la entrega de auditoría por bloque E2-1; se confeccionará al cerrar todos sus pasos.

### C.4b — Control del equipo y titularidad protegida

Sin migración nueva, se agregaron `GET /api/v1/businesses/{business_id}/memberships` (solo titular/administrador) y `PATCH /api/v1/businesses/{business_id}/memberships/{membership_id}` (solo titular) para administrar roles operativos y estado. La fuente de permisos es la membresía SQL del tenant. CI aprobó PostgreSQL/Pytest y Docker, **validación local pendiente**. La titularidad no puede transferirse ni revocarse por esta operación. Cierre E2-1/03A y hoja de auditoría para el compañero siguen para C.5.
