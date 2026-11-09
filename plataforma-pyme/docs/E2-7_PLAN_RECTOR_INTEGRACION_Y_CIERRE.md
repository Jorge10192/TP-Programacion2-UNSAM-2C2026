# E2-7 — Plan rector de integración React–FastAPI, validación integral y cierre académico

**Estado:** PROPUESTA PARA REVISIÓN CON ASTRA; NO IMPLEMENTADA NI APROBADA.  
**Fecha de preparación:** 2026-11-09.  
**Proyecto:** Plataforma PyME, TP Final Programación 2, UNSAM 2C2026; sistema generalista multiempresa/multirrubro (WALOS solo ejemplo).  
**Referencia inmutable de análisis:** `main` `9a7a66394daf5a96b18b9ce796a2fe9ec92a4068` (incluye PR #28 de cierre E2-6).  
**Rama documental:** `docs/e2-7a-plan-integracion`. **No escribir código productivo en esta rama.**  
**Scope:** `plataforma-pyme/`, E2-7 = integración frontend/backend, QA integral y cierre académico, **no Gastos/Caja como nuevo bloque**.

> Este documento es una propuesta técnica construida leyendo código y documentos del repositorio. No sustituye la auditoría independiente de E2-1 a E2-6, ni certifica que el frontend existente funcione contra PostgreSQL. La revisión con Astra debe cuestionar las decisiones antes de implementar.

## 1. Propósito y criterios de éxito

Integrar la SPA React/TypeScript E1-D2 (hoy DEMO local) con los contratos FastAPI/PostgreSQL reales de E2-1 a E2-6, **preservando la estética, navegación y capacidades UI útiles**, habilitando de manera incremental el flujo real identidad → empresa → ubicación → catálogo → proveedores → compra → recepción → inventario → venta. Conservar las capacidades de RF-08–RF-10 (gastos/caja, cuentas, QR) explícitamente en modalidad DEMO o diferidas, sin insinuar acreditación, persistencia remota ni integración monetaria que no existe.

**Cierre verificable:** un usuario puede registrarse, autenticarse, crear una empresa, gestionar sus recursos autorizados, recibir stock, realizar venta física/mixta, consultar saldo y comprobante luego de recargar, y cambiar de empresa sin mezclar datos. Las pruebas de integración del navegador, backend y CI deben acreditar el flujo en un SHA preciso y con base PostgreSQL temporal.

## 2. Línea de base y alcance comprobado

### 2.1 Estado Git y backend

- `main` analizado: `9a7a66394daf5a96b18b9ce796a2fe9ec92a4068`; PR #26 persistencia E2-6, PR #27 ventas, PR #28 cierre documental fusionados.
- Migraciones versionadas hasta `20261109_0017_sales_foundation.py` / `e26a_sales_foundation`; no introducir otra migración sin necesidad demostrada.
- Módulos backend presentes: `auth`, `businesses`, `locations`, `catalog`, `suppliers`, `purchases` y `sales`; inventario/recepción/traslado/ajustes están organizados bajo `modules/purchases`.
- HTTP v1 protegido con JWT/Bearer para recursos privados; `POST /sales` usa `Idempotency-Key` UUID4; el servidor decide autorización, stock, conflictos y respuesta.
- CI del merge #27 sobre `6336152`: [run #42696474777](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42696474777), tres trabajos exitosos. El merge documental PR #28 no implica nueva ejecución backend. Regresión Windows anterior reportada: `879 passed`. **No se han ejecutado nuevas pruebas como parte de este plan.**

### 2.2 Estado frontend

- `frontend/src/App.tsx` construye la UI desde `useDemoSnapshot()`, `findDemoBusiness()` y listas `listDemo*`; el controlador de navegación usa `window.history.pushState`, no React Router.
- `frontend/src/data/demo/demoStore.ts` expone `demoGateway` y persiste datos en `window.localStorage`; el propio código advierte que no es autenticación ni aislamiento seguro.
- Las páginas de negocio consumen entidades `Demo*` y no hay cliente HTTP real reutilizable en `src` en el corte analizado.
- `frontend/vite.config.ts` no configura proxy; `backend/app/main.py` no configura CORS. **Decidir topología de red primero**.
- El frontend E1 ya tiene vistas de perfil, creación de empresa, ubicaciones, equipo, catálogo, proveedores, compras, inventario, ventas, gastos, jornadas, cuentas y QR visual.
- El workflow `.github/workflows/plataforma-pyme-frontend.yml` tiene jobs build/lint/tests y Playwright del prototipo DEMO. La ejecución de backend por sí sola no certifica esos jobs ni un E2E contra API real.

### 2.3 Reglas de alcance

**Dentro de E2-7:** conectar RF-01 a RF-07 a la API existente; contratos/adaptadores, estados remotos, permisos UX, error handling, pruebas, actualización documental final. **Fuera:** backend de gastos/jornadas, cuentas financieras reales, Mercado Pago QR real/OAuth/webhook, reservas, devoluciones, producción por recetas, migración automática de datos locales DEMO, fiscalidad, fotografía alojada en servidor, analítica avanzada.

**No falsear alcance:** un formulario visual puede existir en modo DEMO, pero eso no convierte sus operaciones en hechos de PostgreSQL. No mezclar datos DEMO con datos de empresa REAL, ni mostrarlos agregados en un mismo KPI.

## 3. Hallazgos de compatibilidad más importantes (no equivalen a bugs de E2-6)

| ID | Evidencia | Consecuencia en integración | Solución candidata |
|---|---|---|---|
| INT-01 | `App.tsx` consulta solo `demoStore`; las mutaciones de páginas llaman `demoGateway` | El backend no es fuente de verdad en la UI | Adaptador/repositorio remoto explícito, no reemplazo global ciego |
| INT-02 | Los IDs DEMO `demo-catalog-UUID`, `demo-location-UUID` no son UUID compatibles con FastAPI | Requests 422, confusión de entidad y tenant | DTOs API separados; no convertir ID DEMO a ID API por stripping; crear recursos reales |
| INT-03 | Sin Vite proxy ni CORS en la configuración existente | Requests cross-origin bloqueados en navegador | Preferir proxy Vite `/api` en desarrollo; producción mismo origen o CORS allowlist explícito |
| INT-04 | `App.tsx` toma `DemoBusiness` y fixtures; no hay estado de sesión autenticada | Acceso visual sin autoridad real | App bootstrap: sesión autenticada, empresas remotas y guards basados en API |
| INT-05 | `SalesPage.tsx` usa cuentas, jornadas y QR DEMO; `POST /sales` no acepta `financial_account_id` ni `cash_session_id` | Requests inválidos o falsa imputación financiera | Nunca enviar campos ajenos; ocultar/deshabilitar asociaciones en REAL, dejar DEMO separado |
| INT-06 | `POST /sales` y `GET /sales/{id}`, sin `GET /sales` en E2-6 | Historial global de ventas no se puede reconstruir desde la API | Para E2-7 evaluar `GET /sales` mínimo y paginado **mediante propuesta contractual y autorización**; alternativa UI: comprobante recién creado o por ID |
| INT-07 | E1 admite fotos en IndexedDB local, backend de catálogo no tiene carga de imágenes | Imágenes no portables entre dispositivos | Fallback local marcado; no tratar como foto remota ni inventar endpoint |
| INT-08 | E1 calcula movimientos demo y saldo a partir de eventos locales | Riesgo de duplicar saldo al combinar API y demo | En REAL `GET /inventory/balances` es autoridad; `GET /inventory/movements` es ledger |
| INT-09 | E1 incluye invitaciones simuladas, cancelación/aprobación local | Contrato API solo emisión nominativa/aceptación real y equipo; no hay paridad completa | Mostrar solo capacidades disponibles; prohibir aceptación simulada en REAL |
| INT-10 | `backend/app/main.py` mantiene descripción de E2-0.3; README y matriz API guardan estados históricos | Documentación no refleja integración final | Actualizar metadatos y trazabilidad en cierre E2-7 E |

## 4. Decisiones arquitectónicas propuestas (ADRs a ratificar)

### ADR E27-01 — Dos modos, aislados de extremo a extremo

- **Propuesta:** modo `REAL` para la plataforma conectada a PostgreSQL y modo `DEMO` claramente identificado solo para visualizaciones/funciones no conectadas. Preferencia: entrar en modo REAL tras login, sin mezclar carritos, selector de empresas ni datos de DEMO. La DEMO existente se mantiene aislada para preservar UX y evaluación académica; no hay migración ni importación de `localStorage` implícita.
- El modo no se determina por la mera existencia de un ID que empieza con `demo-`, sino por el contexto de aplicación/proveedor de datos. El servidor nunca confía en el modo declarado por la UI.
- Guardas UX y cachés deben incluir `userId + businessId + mode` como clave de identidad; jamás mezclar result sets.
- Evitar mantener por accidente dos saldos mutables del mismo artículo en modo REAL.

### ADR E27-02 — Cliente API tipado, centralizado y reemplazable

- `frontend/src/api/httpClient.ts`: `baseURL` relativa, timeouts o cancelación, JSON tipado, `Authorization: Bearer` en memoria y mapeo de errores 401/403/404/409/422/5xx.
- `frontend/src/api/contracts/*.ts`: DTOs en `snake_case` que coincidan con OpenAPI, sin reciclar los `Demo*`.
- `frontend/src/api/adapters/*.ts`: transforman DTOs hacia view models de React y inputs hacia comandos de backend, sin inventar datos o alterar IDs.
- `frontend/src/api/repositories/*.ts`: auth, businesses, locations, catalog, suppliers, purchases, inventory, sales.
- `frontend/src/app/session/` y `businessContext/`: sesión, selección tenant y solicitudes en curso. No es obligatorio incorporar React Router, Zustand o React Query en la primera etapa; decidir solo si reduce complejidad demostrablemente.
- **No generar cliente o código desde OpenAPI sin revisar límites y convenciones**; generación tipada es opción posterior si resulta útil.

### ADR E27-03 — Transporte y sesión

- **Desarrollo:** configurar Vite proxy para `/api`, `/health` o `/ready` si corresponde; navegador llama ruta relativa. En producción preferir mismo origen con reverse proxy. Si es inevitable origen cruzado, allowlist CORS explícita, sin wildcard con credenciales.
- JWT de acceso solo en estado de memoria, sin persistencia en `localStorage`. El backend expone `/auth/login`, `/auth/me`, `/auth/logout`, **no refresh token** en el contrato actual; tras F5 o expiración, un reinicio de sesión puede ser necesario. Eso debe quedar claro en UX.
- Proteger `/perfil`, `/empresas/nueva` y rutas `/b/:businessId/*` en modo REAL con sesión; verificar GET de empresa/membresía sin inferir permisos por datos DEMO.
- 401 => invalidar credenciales y volver a login; 403 => pantalla de falta de permiso; 404 tenant ajeno => no revelar información; 409 => mensaje contextual/reload; 422 => errores de formulario; 5xx/network => reintentar con seguridad.
- Token no debe aparecer en logs, URL, artefactos E2E, screenshots ni errores mostrados.

### ADR E27-04 — Comandos, idempotencia y actualizaciones

- Para cada operación idempotente, usar UUID4 generado **una vez por intento lógico**, conservado en memoria durante reintentos de mismo payload; no generar una nueva clave cuando la respuesta HTTP se pierda.
- En ventas, compras, recepciones, transferencias, ajustes, creación empresarial: comprobar ruta/cabecera exacta contra router; no asumir misma política de todos los POST.
- Después de cada commit exitoso, recargar saldo/ledger y las proyecciones dependientes, usando solo lo devuelto por API; ante timeout conservar clave/cuerpo y ofrecer «Verificar/reintentar» en lugar de enviar nuevo comando.
- `409` de versión obsoleta en ajuste obliga relectura de `StockBalance.version` antes de preparar un **nuevo** comando. No auto-repetir una modificación con parámetros obsoletos.
- Estados de formulario: `idle/loading/success/error/unknown-outcome`; botones de submit deshabilitados mientras se espera, sin prometer «no se registró» tras timeout incierto.

### ADR E27-05 — No ampliar backend sin necesidad validada

- La ausencia de `GET /sales` imposibilita replicar el historial existente. **Decisión formal previa:** aceptar UI de consulta parcial o abrir sub-PR de endpoint paginado `GET /sales` con tenant, permisos, filtros, orden y pruebas de integridad; es una extensión mínima de E2-6, **no garantía de alcance ya aprobado**.
- Similar criterio para invitaciones pendientes o atributos UI sin equivalente: degradar con transparencia u ofrecer un endpoint pequeño si hay justificación por flujo de aceptación, nunca generar respuestas ficticias.
- Nuevos endpoints no deben cambiar migraciones históricas ni ampliar RF-08–RF-10.
- Los contratos del backend tienen precedencia; ajustar UI para no enviar campos extras prohibidos (`extra=forbid`).

### ADR E27-06 — Diseño estable, datos reemplazables

- Conservar `AppShell`, sidebar/drawer, tarjetas, estilos y responsive.
- Usar páginas conectadas gradualmente y componentes presentacionales reutilizables; no importar `demoGateway` dentro de un componente REAL.
- El cambio de empresa remonta/invalida vistas y solicitudes anteriores; uso de `AbortController` y chequeo del contexto en respuesta.
- React no decide autorización efectiva, solo representa capacidades del servidor y oculta/deshabilita acciones sin permiso.

## 5. Plan incremental propuesto y puertas de calidad

### E2-7 A — Plan y contratos (esta entrega, solo docs)

1. Congelar referencia `main` y lista de archivos.
2. Inventariar página → acción UI → endpoint real → DTO → rol → dependencia.
3. Clasificar `REAL`/`DEMO`/`DIFERIDO` y brechas; tomar decisiones pendientes con Astra.
4. Definir forma de capa API, sesión, red, errores, idempotencia y tests.
5. Aprobar matriz y ADRs **antes de modificar React o FastAPI**.

**Salida A:** este plan, matriz detallada, matriz de riesgos/QA, feedback de Astra con decisiones sobre cambios. Puede fusionarse PR documental independiente solo después de esa revisión.

### E2-7 B — Acceso real, empresas, ubicaciones, catálogo

Dividir si conviene en B0–B3:

- **B0 infraestructura de integración:** Vite proxy/URLs, cliente HTTP, DTOs, manejo de error, config de modo DEMO/REAL, unit tests con mocks. Mantener `npm run build` y lint verdes.
- **B1 auth y tenant:** pantalla de registro/login/logout y `GET /auth/me`; listado/creación/edición de empresas; rutas privadas; selección de empresa, ausencia de negocios y estados de sesión.
- **B2 ubicaciones/equipo:** listado/creación/edición/estado/primaria, asignaciones, membresías e invitación nominativa real. Solo operaciones expuestas por API.
- **B3 catálogo:** listado, detalle, alta/edición/activación, SKU/estado, bien vs servicio, foto local opcional no autoritativa.

**Puerta B:** tras F5 del navegador la empresa y el catálogo se recuperan desde PostgreSQL; empresa A y B sin fuga; controles no autorizados no ejecutan comandos. CI frontend y backend que corresponda.

### E2-7 C — Proveedores, compras, inventario, ventas

Dividir para contener riesgo:

- **C1 proveedores/compras:** CRUD disponible de proveedores; compras con snapshots y concept libre; registrar no recibe; recepción se confirma con `POST /purchases/{id}/receive` en una ubicación STORE válida, clave idempotente.
- **C2 inventario:** saldos reales, movimientos firmados, transferencia entre ubicaciones y `STOCK_INICIAL`/`AJUSTE_*` con versión. El frontend deja de usar el ledger DEMO como autoridad en modo REAL.
- **C3 ventas:** POS real con líneas físicas/servicio, pagos exactos, ubicación SELL/STORE, `Idempotency-Key`; consultar recibo por ID; evaluar historial paginado como brecha contratada antes del desarrollo.
- Desactivar expresamente en REAL controles de cuenta/caja/QR de la DEMO si no están respaldados. La intención QR visual nunca debe disparar una venta real ni simular acreditación real.

**Puerta C:** flujo de extremo a extremo ejecutado con una base aislada y preservación de stock, sin movimientos duplicados tras replay; balance y ledger concilian.

### E2-7 D — QA integral y hardening

- Backend: pytest con PostgreSQL real en DB temporal, `alembic current/check`, concurrencia/rollback/tenancy.
- Frontend: build, lint, tests de adaptadores, estados de red, navegación, sesión, permisos, idempotencia.
- E2E Playwright con API/PostgreSQL reales, Chromium desktop y móvil; datos de test aislados por ejecución; reproducir reintento y cambio tenant, sin archivos secretos.
- CI: jobs backend, frontend y un job de integración e2e real (con servicios), con estado del mismo SHA, rutas tocadas y fallos trazables.
- QA manual guiada en navegador + comprobación cruzada Swagger/PostgreSQL.
- Contrastar hallazgos externos de E2-1 a E2-6 y no introducir correcciones transversales no aprobadas.

**Puerta D:** ninguna falla crítica/alta aceptada sin resolver, suite verde y evidencia escrita del alcance que se probó.

### E2-7 E — Cierre académico y entrega final

- Actualizar `plataforma-pyme/entrega-programacion-2/01..05`, diagramas PlantUML/UML 03A/03B/03C cuando corresponda, ADRs, README frontend/backend, CHANGELOG y matriz trazabilidad RF/CU → API → UI → test.
- Documentar instalación y modo de ejecución local sin credenciales, Docker y URLs; definir qué hace un usuario sin empresa, un miembro limitado y un empresario con múltiples tenants.
- Registrar estado REAL/DEMO/DIFERIDO por pantalla, pendientes y evidencia manual/automatizada real.
- Publicar informe final del TP, criterios de aceptación y manifiesto de SHAs/CI; no confundir auditoría pendiente con cerrada.

**Puerta E:** documentos coherentes con el último SHA realmente integrado y demostración reproducible del flujo completo.

## 6. Organización de trabajo y ramas

**Regla:** rama por incremento desde el `main` vigente **tras el merge del anterior**; PR aislado con diff acotado, descripción de comportamiento y pruebas. Nombre sugerido:

```text
docs/e2-7a-plan-integracion       (solo documentos; revisión Astra)
feature/e2-7b0-cliente-http
feature/e2-7b1-auth-tenant
feature/e2-7b2-ubicaciones-equipo
feature/e2-7b3-catalogo
feature/e2-7c1-proveedores-compras
feature/e2-7c2-inventario
feature/e2-7c3-ventas
feature/e2-7d-e2e-qa-integral
docs/e2-7e-cierre-final
```

Los nombres son **propuestos, no ramas ya creadas**, excepto la rama documental indicada al principio. E2-7 puede conservar las cinco macroentregas A–E aunque B/C tengan micro-PRs.

Si tu compañero abre revisiones E2-1..E2-6 en paralelo, no mezclar su trabajo con estas ramas sin decisión explícita. Rebasar o fusionar correcciones de `main` luego de aprobarlas, y repetir pruebas del flujo integrado tras cada cambio relevante.

## 7. Riesgos y mitigaciones

| Riesgo | Severidad orientativa | Mitigación / prueba |
|---|---|---|
| Confusión DEMO ↔ REAL y operaciones falsas | Alta | Etiqueta inequívoca, separación de estado, E2E no mezcla |
| Fuga de datos de empresa A a B | Bloqueante | Cache keys scoped, abort + guard, E2E con dos tenants |
| Pérdida de respuesta tras POST confirmado | Alta | Persistir clave/cuerpo en vida del intento, replay y comprobación |
| Tokens expuestos por storage, URL o logs | Alta | Solo memoria, mascarado de errores/logs, tests |
| Pérdida de precisión monetaria | Alta | Cents/milli como enteros, paridad con Python HALF_UP, tests |
| Venta ajusta stock en browser y servidor | Bloqueante | Solo backend escribe saldo REAL, verificar ledger |
| Campos DEMO extra causan 422 | Media | DTOs estrictos, adaptadores testeados |
| Falta historial global de ventas | Media | Decisión previa GET /sales o UI acotada, sin inventar |
| Un nuevo formulario activa función RF-08–10 no implementada | Alta | Modo DEMO y deshabilitar rutas REAL |
| Regresiones de E1 UX o bloque anterior | Media/Alta | Capturas/Playwright escritorio y móvil, CI por PR |

## 8. Criterios globales de aceptación

**Funcionales:** registro/login/logout; creación y selector de empresas; ubicaciones/roles; catálogo; proveedores/compras; recepción; balances/movimientos; ajuste/traslado; venta física/mixta; replay correcto; recarga y persistencia real.

**Seguridad:** aislamiento entre dos empresas y usuarios; 401/403/404 manejados; roles/ubicaciones respetados por servidor; no token en almacenamiento persistente o logs; no uso de IDs DEMO como UUID de recursos reales.

**Integridad:** ventas y compras conservan snapshots, importes HALF_UP y suma de pagos; ajuste con versión; idempotencia en comandos; stock no negativo y ledger consistente.

**UX:** mantener diseño profesional y responsive del prototipo; estados vacíos, permisos, loading, error y éxito precisos; función diferida marcada; acceso con teclado.

**Técnicos:** tests frontend/backend/e2e, Alembic y Docker en SHA final, documentación académica actualizada, datos de prueba aislados, sin credenciales versionadas.

## 9. Condiciones antes de implementar y revisión externa

La IA Astra debe revisar este plan **sin modificar el repositorio** y producir una propuesta de ajustes con evidencia del código, matriz de cobertura y decisiones. Antes de abrir E2-7 B, el equipo define explícitamente: (1) modelo de modos; (2) UX de sesión después de F5; (3) topología proxy/CORS; (4) si ampliar listado de ventas; (5) alcance de invitaciones; (6) política de imágenes; (7) cobertura E2E y compatibilidad QA.

**Regla de salida E2-7 A:** aprobar/rechazar cada recomendación, actualizar solo el plan aceptado, y fusionar este PR documental. Hasta ese punto no implementar backend/frontend en E2-7 A.
