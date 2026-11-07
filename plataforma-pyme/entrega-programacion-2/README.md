# Documentación de entrega — Programación 2

**Proyecto:** Asistente PyME — Plataforma generalista de gestión para múltiples empresas y rubros.  
**Ubicación prevista en el repositorio:** `plataforma-pyme/entrega-programacion-2/`.  
**Estado de esta copia:** borrador v0.2 para revisión y aprobación. No sustituye la documentación de desarrollo de `../docs/`.

## Propósito

Reunir los documentos académicos y el material de exposición correspondientes al proyecto de Programación 2. El contenido debe reflejar la implementación demostrable y diferenciarla de la arquitectura de backend aún planificada.

Se toma como referencia la consigna oficial **«Desarrollo de una API RESTful»**: al menos cinco requerimientos funcionales de alto nivel cubiertos por endpoints, documentación y casos de uso, FastAPI, registro/autenticación segura, SQLAlchemy, Docker, testing, deploy, un patrón de diseño útil, al menos diez pruebas unitarias, GitHub Actions y una presentación con al menos un diagrama UML y explicación de patrones.

## Índice y orden de trabajo

| Documento | Propósito | Estado |
|---|---|---|
| `01_ANALISIS_DE_REQUERIMIENTOS.md` | Problema, objetivos, actores, alcance RF/RNF, reglas, criterios de aceptación y prioridad del backend | **BORRADOR v0.2; pendiente de aprobación** |
| `02_CASOS_DE_USO.md` | Actores, escenarios, flujos principal/alternativo, errores y trazabilidad | Pendiente |
| `03_MODELO_DE_DOMINIO_Y_UML.md` | Modelo conceptual, relaciones, cardinalidades y enlaces a diagramas UML | Pendiente |
| `04_ARQUITECTURA_Y_PATRONES.md` | Arquitectura AS-IS/TO-BE, responsabilidades, patrón(es) de diseño y justificación | Pendiente |
| `05_MATRIZ_API_Y_TRAZABILIDAD.md` | RF → caso de uso → endpoints reales → pruebas/evidencias | Pendiente |
| `06_PRUEBAS_Y_DESPLIEGUE.md` | Estrategia de pruebas, GitHub Actions, Docker, despliegue y evidencias | Pendiente |
| `diagramas/` | Fuentes y exportaciones de diagramas aprobados | A crear |
| `presentacion/` | Diapositivas de defensa final | A crear |

> La consigna exige **al menos un UML**, no exactamente dos. Se planifica un diagrama de casos de uso y uno de clases para mejorar la exposición, sujetos a aprobación del equipo.

## Convenciones

1. **AS-IS / Implementado DEMO:** evidencia disponible en el frontend React, con persistencia local y sin seguridad de servidor.
2. **TO-BE / Planificado:** backend FastAPI, PostgreSQL, SQLAlchemy, Docker, autenticación, permisos y API; no presentarlo como implementado hasta verificarlo.
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
