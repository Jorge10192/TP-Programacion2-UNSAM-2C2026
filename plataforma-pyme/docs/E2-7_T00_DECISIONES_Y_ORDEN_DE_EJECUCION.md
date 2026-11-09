# E2-7 T00 — Decisiones operativas y orden de ejecución posterior a la revisión externa

**Estado:** T00 documental; implementación NO iniciada. **Fecha:** 2026-11-09.  
**Base verificada:** `main` `b72997be411d659ff7480f642543162445c951a0`.  
**Rama:** `docs/e2-7-t00-decisiones` (solo documentos, sin cambios de aplicación).  
**Alcance:** `plataforma-pyme/` únicamente; E2-7 = integración React/FastAPI/PostgreSQL + QA + cierre académico.  
**Insumos:** `E2-7_PLAN_RECTOR_INTEGRACION_Y_CIERRE.md`, `E2-7_MATRIZ_FRONTEND_BACKEND_Y_CONTRATOS.md`, `E2-7_QA_CRITERIOS_ACEPTACION_Y_RIESGOS.md`, informe externo `REVISION_GENERAL_PLATAFORMA_PYME_PRE_E2-7.md` v2 entregado por el responsable, más observaciones de otra IA. El informe externo no está incorporado aquí como archivo original; no atribuir ejecución de sus pruebas al equipo.

> **Propósito:** fijar un orden de construcción comprobable y preservar distinción entre: hecho del código, recomendación aceptada técnicamente para la planificación, decisión de negocio pendiente y mejora diferida. No es auditoría independiente ejecutada ni autorización de cambios de política de precios o seguridad.

## 1. Corrección de línea base y hechos observados

- En `backend/app/modules/auth/tokens.py`, el token se crea mediante `secrets.token_urlsafe(32)` y su hash mediante SHA-256. Es **Bearer opaco** almacenado/verificado por sesión; **NO JWT**. Nunca decodificar claims desde él.
- `frontend/src/App.tsx` y `src/data/demo/demoStore.ts` continúan usando DEMO y `localStorage`. El modo REAL necesita cliente HTTP, sesión y tenant explícitos; no usar objetos ni IDs `demo-...` como DTOs reales.
- `GET /api/v1/businesses/{business_id}/catalog` admite `offset` y `limit`, con `limit=100` predeterminado y máximo 500. La búsqueda local en una sola página **no es búsqueda global**.
- El contrato E2-6 tiene `POST /sales` y `GET /sales/{sale_id}`, sin `GET /sales` paginado ni consulta de comprobante por `request_id` en el corte inspeccionado.
- `SalesService` valida ubicación operativa antes de ejecutar replay de POST. Su modificación requiere decisión explícita de política histórica y pruebas de rol/membresía/sede.
- `SaleLineInput.unit_price_cents` y descuento provienen del cliente; el servidor no fuerza el precio vigente de catálogo. **Es decisión comercial pendiente** para roles con SELL, no falla demostrada universalmente.
- Las operaciones de conteo del frontend representan cantidad final; `AdjustStockRequest` de backend representa **delta positivo con tipo** más `expected_version`.
- El backend de compra/recepción registra una recepción completa y a una sola ubicación; recepción parcial/múltiple es fuera del MVP actual salvo aprobación específica.
- Los informes previos de CI prueban los commits referenciados, no el código aún no integrado de E2-7.

## 2. Decisiones adoptadas para el plan de integración

| ID | Política de trabajo para E2-7 | Justificación y condición |
|---|---|---|
| D01 | **Conservar** SPA React y diseño E1, adaptar datos y callbacks por flujo | Evitar reescritura de UI existente |
| D02 | Separación explícita `REAL` y `DEMO`; jamás mezclar identidades, saldos, KPIs ni IDs | PostgreSQL es la autoridad del estado REAL |
| D03 | Cliente HTTP central con DTOs API, manejo de 204, fallos, timeouts, 401/403/404/409/422 | Reducir discrepancias FastAPI/React |
| D04 | Desarrollo con proxy Vite hacia FastAPI; sin hardcodear URL final | Evitar bloqueos CORS locales y mantener transporte reutilizable |
| D05 | Token de acceso **opaco**, solo en memoria inicialmente; re-login claro tras F5 | Sin refresh endpoint hoy. No interpretar el token como JWT. Sesión persistente se reconsidera si UX lo requiere |
| D06 | Estado remoto scoped por usuario + empresa + modo + generación de sesión; ignorar respuestas tardías | Evitar fugas por cambios A→B, logout/login |
| D07 | Paginación/completitud explícita; no declarar total global ni stock cero por página parcial | Catálogo/listas y POS >100 artículos |
| D08 | Comandos idempotentes: clave/cuerpo inmutables por intento; **sin reintento automático con nueva clave** | Timeout puede ocurrir después de commit |
| D09 | Para comandos de resultado incierto se adopta diseño de **registro durable acotado** independiente del Bearer, sujeto a revisión de privacidad, limpieza y compatibilidad antes de activarlo | Debe sobrevivir F5; ninguna cola automática ni almacenamiento de tokens |
| D10 | Ventas REAL requerirán listado/recovery **si se aprueban contratos específicos**; no fingir historial en cliente | Extensiones mínimas candidatas a GET /sales paginado y GET por request_id |
| D11 | Ajuste de conteo traducido a delta/version con confirmación humana; lote multiartículo no atómico queda DEMO o diferido | No crear cambios erróneos por lectura desactualizada |
| D12 | Caja, gastos, cuentas financieras, QR y fotos remotas quedan DEMO/diferidos en E2-7 | Mantener recorte académico RF-01..07 |
| D13 | No refactorizar autorización común ni ampliar recepción parcial solo por oportunidad | Compatibilidad E2-1..E2-6; primero integrar y medir |
| D14 | Cada incremento tiene tests focalizados, compilación, evidencia SHA, y PR delimitado; QA full-stack inicia en autenticación, no al final | Reducir regresiones y acumular evidencia |

Estas son reglas de *implementación/integración*, no decisiones nuevas de política comercial.

## 3. Decisiones de negocio y contrato por cerrar **antes del flujo afectado**

| ID | Tema | Recomendación inicial | Puerta |
|---|---|---|---|
| P01 | Política de precios/descuentos por rol | Conservación explícita del contrato actual mientras se decide; si se elige precio restringido, validar backend, nunca solo UX. No habilitar trabajadores con supuestos de restricción sin esa decisión | Antes de T10 |
| P02 | Recuperación histórica/replay ante sede pausada, rol o asignación cambiados | Mantener autenticación, tenant, actor y digest. Definir derechos de lectura histórica frente al derecho de nueva venta. Testear escenarios antes de mover validaciones | Antes de T09 |
| P03 | Diseño exacto de listado/consulta de ventas por request_id | DTO de resumen, paginación, orden, permisos, semántica de 404 y rutas sin colisión con `/{sale_id}` | T09 |
| P04 | Registro local de intenciones comerciales | Decidir soporte (IndexedDB u otro), scope usuario/tenant, ciclo de vida, borrado manual, límite de retención, dispositivos compartidos y casos de pérdida/daño de almacenamiento. **No purgar silenciosamente un intento no resuelto** | T06 |
| P05 | Persistencia de sesión tras recarga | Comenzar memoria y reautenticación MVP. Si se requiere sesión continua, evaluar alternativa de cookie HttpOnly/refresh server-side antes de pasar Bearer a `sessionStorage` | T02 / revisión de UX |
| P06 | POS con más de 100 artículos | Primer enfoque: iterar páginas o paginar UI; buscar globalmente exige endpoint/filtros compatibles. No crear `q` ficticio en frontend | T05–T10 |

**Importante:** P01 y P02 no deben implementarse automáticamente porque una IA haya propuesto una política; se documentará decisión del responsable.

## 4. Tratamiento de observaciones externas

| Hallazgo | Tipo | Tratamiento |
|---|---|---|
| REV-001 | Brecha | Aceptada para diseño: desacoplar estado DEMO de REAL por flujos |
| REV-002 | Brecha | Aceptada: paginación/completitud en listado y POS |
| REV-003 | Riesgo fundado | Aceptada dirección técnica: identidad durable de comandos, pendiente política de retención |
| REV-004 | Riesgo fundado | Reservada para T09; no mover autorización sin pruebas |
| REV-005 | Brecha | Aceptada: conteo final → delta + versión |
| REV-006 | Error documental | Corregir referencias JWT en los documentos E2-7; backend no cambia |
| REV-007 | Riesgo dependiente de negocio | Pendiente P01, no declarar bug confirmado |
| REV-008 | Mejora opcional | Diferida tras integración y medición |
| Re-login tras F5 | Tradeoff UX | Comportamiento MVP inicial explícito; sesión persistente requiere evaluación separada |
| Recepción parcial / múltiples depósitos | Extensión de alcance | Diferida |
| Endpoint de búsqueda remota `?q=` | Extensión de alcance | Condicionada a prueba de necesidad y contrato |
| Límite cinco archivos/commit | Sugerencia de proceso | No adoptado literalmente: PR pequeño por objetivo y pruebas |
| TTL de pendientes 24 h | Política propuesta | No adoptado automáticamente; exigir retención/borrado definido |
| `GET /sales` y búsqueda por request ID | Extensión mínima candidata | Planificar contrato y aprobación en T09 |

## 5. Orden de implementación — T00 a T12

| Incremento | Entrega | Actividad | Dependencias/puerta |
|---|---|---|---|
| **T00** | E2-7 A | Este documento, corrección JWT y referencias de planificación | Solo docs; sin cambios al código |
| **T01** | B0 | Cliente HTTP, transporte/proxy, errores y tests de red | T00 y red definida |
| **T02** | B1 | Registro/login/me/logout, guards, REAL/DEMO y sesión opaca | T01; probar API real desde navegador |
| **T03** | B1 | Empresas y tenant, cambio seguro, dashboard inicial | T02 |
| **T04** | B2 | Ubicaciones, equipo, invitaciones y asignaciones | T03 |
| **T05** | B3 | Catálogo, paginación/completitud, tipos, precios null | T03; T04 si uso de sede |
| **T06** | C preparación | Seguimiento de intentos de comandos, resultado incierto, scope y recuperación | T02/T03 y P04 |
| **T07** | C1 | Proveedores, compras y recepción | T04/T05/T06 |
| **T08** | C2 | Inventario, traslado, conteo individual versionado | T07 para flujo end-to-end |
| **T09** | C3 soporte | Definir y, si se aprueba, implementar listado/recuperación ventas; replay histórico con política P02 | T06, P02/P03 |
| **T10** | C3 | POS real, pagos declarados, comprobante, saldos | T08/T09 y política P01 |
| **T11** | D | QA integral PostgreSQL/Playwright/CI, multiempresa, errores de red | E2-7 integrada |
| **T12** | E | Documentos académicos 01–05, UML, README, CHANGELOG, cierre | QA validado |

**Regla:** un incremento puede subdividirse si abarca demasiadas responsabilidades; no fusionar cambios sin test del comportamiento nuevo. El SHA de `main` debe refrescarse al empezar cada incremento. Las ramas de implementación se crean desde el `main` actualizado, no desde una rama documental no fusionada.

## 6. Pruebas mínimas nuevas por riesgo

- **T01/T02:** 204 sin JSON, 401 actual frente a sesión vieja, CORS/proxy, rutas seguras, F5 y re-login.
- **T03:** respuesta tardía de A después de seleccionar B; usuario distinto en mismo navegador.
- **T05:** 101 y 501 productos, segunda página fallida, selector POS no oculta un artículo por paginación; campos null.
- **T06/T09:** 201 confirmado y respuesta perdida; F5; login mismo actor; recuperar comprobante, un solo efecto. 404 temporal no equivale a operación nunca enviada; reintentar mismo cuerpo/clave.
- **T07:** alta compra sin stock; recepción una vez y replay; concepto/servicio sin movimientos físicos.
- **T08:** conteo 10→7 delta -3, 10→0, 0 con historial, `expected_version` vieja y venta concurrente.
- **T09/T10:** tenant, permisos y actor en listado/consulta por request, replay con sede pausada/membresía revocada; precio según política; stock no negativo y sin venta duplicada.
- **T11:** navegador escritorio/móvil con FastAPI y PostgreSQL **en misma base efímera**, sin fallback DEMO; trazas y credenciales sanitizadas.

## 6.1. Precisiones de aceptación surgidas de una segunda revisión

La segunda opinión recibida respalda el orden T00–T12 y destaca cuatro puntos operativos. No cambia las decisiones D01–D14 ni aprueba extensiones de backend por sí misma. Estas precisiones son **criterios de prueba futuros**, no pruebas ejecutadas:

1. **F5 y sesión (T02):** ensayar login → navegación a empresa → F5. Con Bearer solo en memoria debe producirse una reautenticación clara, conservarse la ruta de retorno cuando sea segura y no mostrarse información de una sesión vencida. Evaluar la fricción UX con uso real antes de adoptar persistencia de tokens. `sessionStorage` no se aprueba automáticamente; cookies `HttpOnly` exigirían un cambio de contrato/autenticación con análisis de CSRF.
2. **Completitud del catálogo/POS (T05 y T10):** probar al menos 101 y 501 artículos. Si se descargan páginas sucesivas, la UI debe distinguir `loading`, `partial`, `complete` y `error`. Un filtro local sobre una lista incompleta no puede prometer resultados globales; un error de página posterior no puede ocultarse bajo «sin resultados». La alternativa `GET /catalog?q=` sigue condicionada a un contrato/backend explícito.
3. **Dependencia T06 → T09 → T10:** T06 define y prueba conservación de identidad de intento/cuerpo ante red incierta; T09 define recuperación autenticada de venta por `request_id` y listado si se aprueban; T10 **no habilita POS real con garantía de recuperación tras F5** hasta probar el camino completo ante pérdida de respuesta. Un GET con 404 no prueba que el POST original haya fallado; no crear clave nueva ni reenviar automáticamente.
4. **Conflicto de versión de conteo (T08):** ante `409` por `expected_version` obsoleta, refrescar saldo/versión y mostrar claramente que el inventario cambió durante el conteo. Exigir nueva revisión y confirmación humana; no recalcular ni enviar automáticamente una diferencia contra la nueva versión. Distinguir ese conflicto de otros 409.
5. **Pruebas desde T02:** cada primer flujo HTTP real debe probar navegador → FastAPI → PostgreSQL en base temporal explícita, además de los tests unitarios. T11 consolida los escenarios completos, pero no constituye la primera ejecución full-stack.
6. **PR pequeño por objetivo:** mantener PR independiente por incremento y pruebas vinculadas; no imponer un número arbitrario de archivos por commit.

**Salida:** estas condiciones deben trasladarse a los criterios de aceptación de los incrementos correspondientes cuando se implementen. No hacen necesaria una nueva fase previa a T01.

## 7. Condición de salida T00 y siguiente paso

**T00 está completo como propuesta documental** cuando este documento se publique, las referencias JWT del plan rector se corrijan y se verifique que el diff frente a `main` contiene solo documentos. No afirmar que T01 o los casos E2E ya están implementados o aprobados.

**Siguiente incremento:** T01 cliente HTTP/transporte. Iniciar en una rama nueva basada en el SHA de `main` posterior al PR documental. No modificar GitHub Actions fuera de `plataforma-pyme/` sin autorización independiente.

### Nota sobre material externo

El informe ampliado de revisión es evidencia proporcionada por el responsable; para una futura IA desarrolladora, anexarlo explícitamente o usar esta matriz resumida. No asumir que el archivo original se encuentra en GitHub si no ha sido publicado allí.
