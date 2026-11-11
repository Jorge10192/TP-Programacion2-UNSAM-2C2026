# E2-7 · T12-B — Acta de conciliación RF / CU / API / UI / test

**Fecha:** 11/11/2026. **Rama:** `docs/e2-7-t12-cierre-academico` (PR #46, **DRAFT**).  
**Base técnica:** `main` `c6a77137cf82dcb9aad225645e84b1265b1da3ec` (PR #45, E2-7/T11).  
**Estado:** T12-B **documental ejecutada**, con controles de coherencia estática; **no constituye aprobación de T12-C, T12-D ni T12-E**.

## 1. Entregables actualizados

| Documento | Corrección incorporada |
|---|---|
| [01 — Análisis de requerimientos](../entrega-programacion-2/01_ANALISIS_DE_REQUERIMIENTOS.md) | Versión vigente RF-01..RF-10; REAL RF-01..07, DEMO RF-08..10; reglas, estados, límites, 39 pasos manuales y CI |
| [02 — Casos de uso](../entrega-programacion-2/02_CASOS_DE_USO.md) | CU-01..12 con actor, API, pantalla, postcondición y prueba; alternativas 401/403/404/409/422; idempotencia y recepción vs compra |
| [05 — API y trazabilidad](../entrega-programacion-2/05_MATRIZ_API_Y_TRAZABILIDAD.md) | Matriz RF→CU→API→UI→test, inventario de **46 operaciones HTTP reales** obtenidas de **13 routers** montados, fuentes enlazadas, pruebas y riesgos |

El contenido previo de cada documento fue **conservado expresamente como histórico**, sin borrar evidencias incrementales ni atribuirles estados vigentes. No se inventaron RF adicionales ni se renumeraron CU. **CU-11 pertenece a RF-06**; CU-07 apoya RF-05 y RF-06.

## 2. Método y pruebas de consistencia de documentación

1. Se confirmó `api_v1_router = APIRouter(prefix="/api/v1")` y los 13 `include_router` de `backend/app/api/v1/router.py`.
2. Se inspeccionaron los decoradores HTTP `@router.get/post/patch/put` y prefijos de los routers de autenticación, empresas/invitaciones, ubicaciones/asignaciones, catálogo, proveedores, compras/recepción, balances/movimientos, traslados, ajustes y ventas.
3. **Resultado del inventario:** **46 métodos+rutas montados**; `GET /health` y `GET /ready` son rutas técnicas separadas de `/api/v1` y no se cuentan entre esos 46.
4. Se contrastaron con `frontend/src/features/auth/RealAuthApp.tsx` y las páginas `Real*Page.tsx`: React REAL usa rutas `/real/...` y DEMO `/inicio`, `/b/{demoId}/...`. No se presentaron gastos, jornadas, cuentas ni QR ilustrativo como recursos de API REAL.
5. Se citaron archivos concretos de `frontend/e2e/real/*.spec.ts`, suites Pytest backend y [CI full-stack #43015544889](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/43015544889). La cifra probada en el código base fue **892 Pytest + 38 Playwright REAL + 6 DEMO, todos PASS**. Estos resultados no son una nueva ejecución de tests por el cambio documental.
6. Se mantuvieron explícitos: separación compra/recepción, SELL/STORE por sede, saldo-version y ledger, snapshot, centavos/milésimas, pagos declarados, replay idempotente, sesiones en memoria y DEMO sin impacto REAL.
7. La revisión confirmó que las versiones históricas contenían rótulos que habían quedado falsos después de T11 (p. ej., «React sigue DEMO», «RF-07 diferido», «no existe autenticación REAL»); la **versión T12-B al inicio** de cada documento tiene precedencia frente a esos apartados históricos.

## 3. Resultado por requisito

| RF | Resultado de T12-B |
|---|---|
| RF-01 | Registro, login, me y logout REAL trazados a API/UI/prueba |
| RF-02 | Empresas, invitación, aceptación y equipo REAL trazados |
| RF-03 | Ubicaciones, capacidad SELL/STORE y asignación activa por actor trazadas |
| RF-04 | Catálogo REAL de bienes/servicios, precio y estado trazado |
| RF-05 | Proveedores y compras REAL con recepción completa única trazados |
| RF-06 | Balance, ledger, traslado atómico y ajustes/versiones trazados |
| RF-07 | Venta REAL, pagos declarados, recuperación y permiso por sede trazados |
| RF-08–10 | **DEMO/diferidos**, sin confundir con backend comercial real |

## 4. Límites del cierre y trabajo pendiente

- **T12-C:** el modelo y los diagramas `.puml` 03A/03B/03C todavía deben confrontarse contra **clases SQLAlchemy, esquema Alembic y casos de uso vigentes**. Los SVG editoriales no se regeneran automáticamente sin control visual.
- **T12-D:** Documento 04, README de backend/frontend/entrega, CHANGELOG y guía PowerShell/Docker todavía pueden contener información histórica inconsistente.
- **T12-E:** revisión completa de enlaces, artefactos visuales, consigna académica y CI del HEAD final; decisión expresa antes de fusionar a `main`.
- **Riesgos residuales ya documentados:** avisos Pydantic `UnsupportedFieldAttributeWarning`, payload de recuperación local IndexedDB sin cifrar, pagos reales declarados (no acreditados), sin WEBHOOK de MP, UX/WCAG completa pendiente.
- La revisión fue **solo de documentación**: sin comandos de base de datos, sin nuevas migraciones y sin escrituras de negocio en `TEST Empresa A`. No se alteró `main`.

**Dictamen T12-B:** **APROBABLE COMO CONCILIACIÓN DOCUMENTAL DEL NÚCLEO RF/CU/API/UI/TEST**, pendiente revisión global T12-E; no implica que el TP esté terminado. Siguiente paso: **T12-C — 03 / 03A / 03B / 03C y modelos SQL**.
