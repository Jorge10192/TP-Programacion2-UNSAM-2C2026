# E2-7 · T09-D — Historial de ventas REALES en React y QA

**Fecha:** 10/11/2026. **Rama:** `feature/e2-7-t09-consulta-recuperacion-ventas`; PR [#42](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/42), **borrador, sin merge**. T09-D corresponde a **consultas históricas de solo lectura**, no al POS de T10.

## Contrato y ruta

- Acceso: en modo REAL, **Mis empresas → Empresa → Historial de ventas REAL · consulta**, o `/real/empresas/{business_id}/ventas` (ID UUID de la empresa). Las rutas DEMO permanecen separadas.
- `GET /api/v1/businesses/{business_id}/sales?offset=0&limit=50[&location_id=...]`: resúmenes, orden del más nuevo al más antiguo, permiso aplicado por FastAPI antes de paginar. Botón **Cargar más ventas**, sin afirmar que un listado parcial sea completo.
- `GET /api/v1/businesses/{business_id}/sales/{sale_id}`: comprobante histórico con líneas, precios y medios de pago **declarados**, descuentos y saldos después de la venta si hubo bienes.
- `GET /api/v1/businesses/{business_id}/sales/by-request/{request_id}`: consulta explícita de comprobante por **clave UUID4 original**, no crea venta ni repite POST. Un 404 no implica que el POST original nunca ocurrió.
- Errores de 401, 403, 404 y red se muestran sin inventar datos DEMO. Si vence la sesión, se vuelve al login sin conservar Bearer en almacenamiento.
- La operación que creó la venta puede haber sido hecha antes con FastAPI, pero **esta pantalla jamás confirma ventas, cambia stock, abre caja ni acredita Mercado Pago**.

## Diseño e integración

`frontend/src/features/sales/RealSalesPage.tsx` presenta información de la empresa, filtro de sede, resumen de ventas, comprobante detallado y búsqueda por solicitud. Estilos responsive aislados en `frontend/src/features/auth/auth.css`. Se añadió la ruta a `RealAuthApp` y la tarjeta de entrada en `RealBusinessesPage`. La lectura y validación de payloads están en `realSalesReadGateway.ts` y sus pruebas Node en `tests/sales-real-read-api.test.mjs`.

**Matriz de acceso aprobada T09-B:** TITULAR_ADMINISTRATIVO/ADMINISTRADOR leen todas las ventas del tenant; ENCARGADO/TRABAJADOR solo de sedes con asignación ACTIVA; ventas sin sede solo para titular/admin; roles o membresías ajenas no leen. La UI **no decide ni suplanta permisos**: FastAPI restringe también la consulta directa por UUID y `request_id`.

## Pruebas automáticas previstas

1. **Node T09-D:** listado con Bearer y filtro de sede solo vía GET; parser de resúmenes, límites y duplicados; recuperación por clave, comprobante de tenant válido y respuesta incompatible; sin llamadas POST.
2. **Build y Oxlint:** `npm.cmd run build`, `npm.cmd run lint` y `node --test tests/*.test.mjs`. La CI también valida backend PostgreSQL, Playwright de inventario REAL y regresión DEMO.
3. **Playwright T09-D REAL:** con `PYME_DISPOSABLE_QA=1` únicamente, crea fixtures efímeros en PostgreSQL de CI; abre el historial de dos sedes, filtra, consulta un comprobante y lo recupera por `request_id`; verifica **cero POST a ventas desde la interfaz**. Segundo caso en viewport móvil y después de F5/login. No ejecutar contra bases locales con datos del usuario.
4. **Backend T09-C (ya validado):** 886 pruebas en PostgreSQL con matriz rol/sede, revocación, filtros SQL y paginación; se repiten como regresión en este incremento.

**Evidencia de CI:** pendiente de registrar el run final del commit de T09-D. No marcar T09-D aprobado antes de que la CI finalice y se inspeccionen las nuevas pruebas Playwright.

## Guía de QA manual NO MUTANTE (a ejecutar en frontend local)

1. Sin generar ventas nuevas, comprobar que se ve el botón **Historial de ventas REAL · consulta** en el detalle de la empresa REAL. No navegar a DEMO.
2. Abrir historial. Verificar nombre de empresa, rol, aviso **Solo lectura** y filtro de sede. Si la empresa todavía no tiene ventas, esperar **No hay ventas accesibles...**: **no es un fallo**.
3. Si hay ventas históricas ya existentes de esa empresa, elegir una sede y abrir **Ver comprobante**. Validar importe, snapshot de artículo/servicio, descuentos, método de pago declarado y que no se prometa acreditación externa.
4. Si se dispone de un `request_id` **preexistente y autorizado**, consultarlo. Si no se conserva uno, **no crear una venta para obtenerlo** en este bloque.
5. Comprobar en red del navegador, si se revisa, que las rutas de ventas usadas por este módulo son **GET**, sin POST ni cambios de stock.
6. Comprobar regreso a empresa, F5 y login. En móvil, revisar que las tarjetas no desborden la pantalla y que la interfaz de ventas siga siendo solo lectura.
7. Registrar capturas y resultados en esta acta: **al escribir este documento no hay evidencia de ejecución manual del nuevo T09-D**. No atribuir pruebas de CI a la sesión local del usuario.

## Riesgos conocidos y límites

- Los filtros por sede se aplican en FastAPI; la lista de nombres de ubicaciones puede incluir sedes no asignadas al operario. Seleccionarlas devolverá un listado vacío, sin permitir ver ventas ajenas.
- La paginación `offset/limit` puede desplazarse si se registran ventas mientras el usuario pagina. Si aparece un ID duplicado entre páginas, el frontend ofrece reiniciar la consulta; no hay cursor/snapshot estable.
- La pantalla no muestra saldo de caja ni integración bancaria/MP. Los pagos son **declaraciones**. Los importes usan centavos enteros recibidos del servidor, sin recalcular la venta contra precios actuales.
- T09-E añadirá pruebas de recuperación de ventas con **respuesta POST perdida y clave persistida**; T09-D solo ofrece la consulta y el smoke de lectura.
