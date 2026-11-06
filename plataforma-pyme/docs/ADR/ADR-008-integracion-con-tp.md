# ADR-008 — Convivencia con el TP académico y transición API
**Fecha:** 2026-11-06  
**Estado:** PROPUESTO; estrategia de integración de código PENDIENTE hasta E2.  
**Responsable de aprobación:** equipo del TP / responsable de integración (a designar).  
**Fuentes:** E0-A §§1/5/9; E0-B §§1–4 y 12; plan rector v4 §§3–5; backlog v4 §TP3.

## Contexto
En el repositorio compartido coexisten §Proyecto-3-AppAdmin-Mascotas/§, §Proyecto-3-Extendido-Generico/§ y §plataforma-pyme/§. El usuario pidió trabajar directamente en §main§ para facilitar colaboración. El TP de Programación 2 tiene requisitos académicos y backend en evolución. No se debe confundir plataforma de producto con una versión del TP ni alterar trabajo de compañeros por accidente.

## Decisión propuesta
1. Construir nueva UI/documentación bajo §plataforma-pyme/§, **dentro del mismo GitHub** y actualmente en §main§, sin crear repositorio independiente. No alterar archivos fuera de esa ruta durante E0/E1 salvo acuerdo del equipo.
2. Versionar cada corte con commit de alcance limitado; comprobar cambios ajenos antes de agregar archivos. No usar §git add .§ si hay archivos locales de otros integrantes sin revisar.
3. No duplicar ni trasladar §Proyecto-3-Extendido-Generico/backend/§ antes de evaluar código, pruebas, migraciones y dependencias en E2.
4. En E2 mapear **≥5 requisitos académicos de alto nivel** a endpoints; FastAPI + SQLAlchemy 2.x + PostgreSQL + Alembic, autenticación, Docker, tests, CI GitHub Actions, UML, patrón justificado, README, documentación y despliegue planificado según la consigna original.
5. TP3 exige **≥10 tests unitarios ejecutados** (no reemplazables por lista documental, E2E ni tests únicamente de integración). No tocar §Proyecto-3-AppAdmin-Mascotas/§ por suposiciones de compatibilidad.
6. Backend de producto futuro será autoridad sobre stock, ventas, caja, permisos y registros; la UI no debe conservar una segunda autoridad cuando cambie a §ApiGateway§.
7. MP OAuth/Orders/webhooks se integrará tras consolidar API, tests y cuentas proveedor válidas; QR de E1 será DEMO.

## Alternativas
- Reemplazar en sitio el backend académico de inmediato: descartado por alto riesgo sobre trabajo compartido.
- Repositorio externo o rama obligatoria: no adoptada por preferencia explícita del equipo; ramas futuras siguen disponibles.
- Forzar todas las necesidades del negocio a UML heredado: descartado; primero se trazan y validan contratos.

## Riesgos y pruebas
- Riesgo de modificaciones simultáneas de §main§: los colaboradores deben acordar responsables, revisar §git status§ y §git pull --ff-only§ antes de publicar.
- **TP3-01/02:** matriz de cumplimiento y evidencia verificable de tests y CI.
- **API-01..06:** desarrollo en cortes (identidad/scoping → catálogo → stock → ventas → caja), con PostgreSQL y rollback en fallos.

## Pendientes para E2
Ubicación final del backend, estrategia de reutilización de M01/M02, migraciones, patrón de diseño y despliegue **no** se consideran resueltos por este ADR.