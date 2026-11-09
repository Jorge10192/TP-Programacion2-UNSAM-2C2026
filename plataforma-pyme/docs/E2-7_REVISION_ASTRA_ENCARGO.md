# E2-7 A — Encargo de revisión crítica del plan de integración para Astra

**Estado:** preparado, **no ejecutado**.  
**Objetivo:** que una segunda IA critique el plan de E2-7 **antes de implementar código**, sin confundir diseño con auditoría de los bloques previos.  
**Proyecto:** Plataforma PyME — TP Programación 2 UNSAM 2C2026; `plataforma-pyme/`.  
**Referencia base que utilizaron los documentos:** `main` `9a7a66394daf5a96b18b9ce796a2fe9ec92a4068`, PR #28 cerrado; confirmar SHA real al iniciar revisión.  
**Rama propuesta para documentos:** `docs/e2-7a-plan-integracion`; el auditor debe registrar HEAD real, que incluye estos documentos.

## Texto listo para entregar a Astra

> Quiero que actúes como **revisor técnico independiente** del plan E2-7 de mi plataforma PyME multiempresa/multirrubro (no un sistema exclusivo de WALOS). El objetivo de E2-7 es **integración frontend React/TypeScript E1 con backend FastAPI/PostgreSQL E2-1..E2-6, QA integral y cierre académico**. No es un nuevo módulo de gastos, caja o Mercado Pago.
>
> Repositorio: https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026  
> Carpeta exclusiva: `plataforma-pyme/`  
> Base de código revisada por el plan: `main` SHA `9a7a66394daf5a96b18b9ce796a2fe9ec92a4068`  
> Rama del plan: `docs/e2-7a-plan-integracion`
>
> **Antes de juzgar, verificá acceso real a ambas carpetas `frontend/` y `backend/`, a los routers/schemas, los tests relevantes y a los siguientes documentos completos:**
>
> 1. `docs/E2-7_PLAN_RECTOR_INTEGRACION_Y_CIERRE.md`
> 2. `docs/E2-7_MATRIZ_FRONTEND_BACKEND_Y_CONTRATOS.md`
> 3. `docs/E2-7_QA_CRITERIOS_ACEPTACION_Y_RIESGOS.md`
> 4. `docs/E2-6_DOCUMENTACION_INTEGRAL.md`
> 5. `docs/revisiones/E2-6_CIERRE/00_LEEME.md`
> 6. `entrega-programacion-2/01_ANALISIS_DE_REQUERIMIENTOS.md`, `02_CASOS_DE_USO.md`, `03_MODELO_DE_DOMINIO_Y_UML.md`, `04_ARQUITECTURA_Y_PATRONES.md`, `05_MATRIZ_API_Y_TRAZABILIDAD.md`.
>
> Revisá también `frontend/src/App.tsx`, `frontend/src/data/demo/demoStore.ts`, `frontend/src/features/`, `frontend/package.json`, `frontend/vite.config.ts`, `backend/app/main.py`, `backend/app/api/v1/router.py` y los servicios/schemas de auth, businesses, locations, catalog, suppliers, purchases, inventory y sales.
>
> **Tu misión es evaluar el plan, no implementarlo.** No edites, borres, publiques o fusiones archivos/ramas, ni abras PR. Confirmá SHA exacto de base y plan; si no podés leer el repo, declará la limitación y no inventes análisis.
>
> Preguntas principales:
>
> - ¿E2-7 A–E cubre las funciones mínimas del TP y de los contratos E2-1..E2-6 sin ampliar indebidamente el MVP?
> - ¿El diseño REAL/DEMO permite aprovechar toda la UX actual sin mezclar datos o falsear persistencia?
> - ¿Son razonables un cliente HTTP simple, estado de sesión en memoria y Vite proxy antes de agregar librerías? ¿Qué riesgos y alternativas concretas existen?
> - ¿Cómo debería tratarse la autenticación después de F5 si no hay refresh endpoint? ¿Se necesita una decisión técnica adicional de sesión?
> - ¿Hay problemas de RBAC, filtraciones de tenant, idempotencia, carreras por cambio de empresa o dobles escrituras entre demoStore/API?
> - ¿Qué discrepancias concretas hay entre DTOs UI y schemas/backend? Contrastar nombres y enum reales, campos extra prohibidos y URL exactas.
> - ¿Es imprescindible crear `GET /sales` paginado para integrar la pantalla de historial o se puede reducir el alcance de forma académicamente correcta? ¿Qué pruebas requeriría ese endpoint?
> - ¿Cómo tratar fotos IndexedDB, invitaciones simuladas, jornada/cuenta asociada a venta, batch de stock y QR sin prometer que son reales?
> - ¿Los subincrementos B0–B3, C1–C3, D y E están bien ordenados? ¿Cambiarías dependencias o tamaño de PR?
> - ¿Qué falta en los tests E2E reales, en CI, en seguridad de token, en red y en la recuperación de operaciones con resultado incierto?
> - ¿Qué actualizaciones de UML, TP3, requisitos y trazabilidad son obligatorias y cuáles son mejoras opcionales?
>
> **Para cada observación registrá:** ID `ASTRA-E27-XXX`, prioridad (bloqueante/alta/media/baja), clase (defecto del plan, brecha de contrato, riesgo plausible, mejora opcional), archivo(s)/líneas que la fundamentan, qué consecuencia real tendría, alternativa propuesta, impacto de compatibilidad con E2-1..E2-6 y un criterio de aceptación o test concreto.
>
> **No apruebes automáticamente el plan por tener documentos detallados.** Evitá rediseñar la aplicación o agregar librerías, backend financiero o infraestructura innecesaria sin justificación reproducible.
>
> Entregá estos cinco Markdown separados, sin modificar el repositorio:
>
> - `ASTRA-E27-00_RESUMEN_Y_VEREDICTO.md`
> - `ASTRA-E27-01_MATRIZ_COBERTURA_Y_BRECHAS.md`
> - `ASTRA-E27-02_HALLAZGOS_PRIORIZADOS.md`
> - `ASTRA-E27-03_PLAN_REVISADO_PROPUESTO.md`
> - `ASTRA-E27-04_EVIDENCIA_ACCESOS_Y_LIMITES.md`
>
> El plan revisado es **una propuesta**, no un permiso automático de ejecución. Quiero decidir con el responsable cuáles cambios aceptar, ajustar, diferir o rechazar; después actualizaré los documentos y recién comenzaremos E2-7 B0.

## Checklist para el equipo que recibirá la revisión

- [ ] Astra confirmó repositorio, SHA base, SHA plan y acceso real a React/Backend.
- [ ] Informó qué documentos y archivos no pudo leer.
- [ ] Contrastó al menos auth/tenant, catálogo, compras/recepción, inventario y ventas con sus rutas reales.
- [ ] Cuestionó y resolvió explícitamente las decisiones de sesión, proxy, DEMO/REAL e historial de ventas.
- [ ] Separó riesgos potenciales de defectos demostrados.
- [ ] Justificó cambios con impacto/alternativas y pruebas, no con gusto de arquitectura.
- [ ] Entregó cinco archivos y dejó la decisión final en manos del equipo.
- [ ] No editó ni abrió PR ni alteró datos externos.

## Matriz de adopción selectiva (llenar después)

| ID Astra | Prioridad | Evidencia | Recomendación | Decisión equipo | Justificación | Documento/sección ajustada |
|---|---|---|---|---|---|---|
| ASTRA-E27-001 | Pendiente | Pendiente | Pendiente | **Sin decidir** | — | — |

**Secuencia convenida:** plan propuesto → revisión Astra → decisión selectiva → plan E2-7 A corregido → PR documental → B0 técnico. No mezclar la auditoría de E2-1..E2-6 que lleva el compañero con la revisión estratégica de E2-7.
