# E2-7 · T08-4 — Stock inicial, conteo físico y ajustes versionados REALES

**Fecha:** 10/11/2026. **Estado actualizado tras T08-5:** implementación frontend terminada, aceptación manual principal en UI REAL **APROBADA** y suites PostgreSQL/Playwright de integración **APROBADAS** en CI. La evidencia manual no es inspección SQL independiente. Rama: `feature/e2-7-t08-inventario-real`; PR #41 sigue en borrador, **sin merge a main**.

## 1. Contrato y reglas reales de FastAPI

Revisión directa de `backend/app/modules/purchases/{adjustment_router.py,adjustment_schemas.py,adjustment_service.py}`, tests `test_adjustment_api_integration.py` y `test_adjustment_concurrency_integration.py` de E2-5 C:

- `POST /api/v1/businesses/{business_id}/inventory/adjustments`, header `Authorization: Bearer <opaco>` y `Idempotency-Key: <UUID4>`; creación **201**, replay de clave y cuerpo idénticos **200**. No hay reintentos HTTP automáticos.
- Cuerpo JSON **exactamente** `{kind, catalog_item_id, location_id, quantity_milli, expected_version, reason}`. `kind` = `STOCK_INICIAL`, `AJUSTE_ENTRADA` o `AJUSTE_SALIDA`. Cantidad positiva entera en milésimas 1..999999999, motivo normalizado de 3–500 caracteres, versión >= 0.
- `GET /api/v1/businesses/{business_id}/inventory/adjustments/{adjustment_id}` consulta histórica **sin mutar stock**.
- **STOCK_INICIAL** solo para titular/admin, saldo **no existente**, sin historial de movimientos en la sede+artículo, `expected_version=0`, saldo inicial positivo, nueva proyección con versión 1. No habilitar inicialización repetida, ni siquiera tras saldo histórico cero.
- **AJUSTE_ENTRADA/SALIDA** solo si ya existe saldo: exige su versión positiva exacta; un `expected_version` obsoleto (por traslado, compra, venta u otro ajuste) produce **409** y la API NO altera saldo ni ledger. Salida exige cantidad <= saldo existente.
- **CONTEO FÍSICO** es solo una comodidad frontend: el usuario introduce **saldo final** (hasta 999999999999999 milésimas); la interfaz calcula diferencia `contado − saldo consultado`, construye `AJUSTE_ENTRADA` o `AJUSTE_SALIDA` con delta positivo y `expected_version` leído. Si diferencia = 0, **no envía POST**. Si la diferencia es mayor que 999999999 milésimas, se rechaza por exceder el máximo de una operación individual: no se trunca ni redondea. Un saldo final contado de cero está permitido en conteo, no en stock inicial.
- Roles: titular y administrador pueden inicializar y ajustar; encargado puede ajustar si cuenta con asignación STORE activa a la sede; trabajador no puede ajustar ni inicializar. Ubicación activa con `can_store=true`, negocio y membresía activos, artículo `BIEN` y `ACTIVO`. Toda autorización real pertenece al backend.
- Respuesta contiene exactamente **un movimiento firmado**, con tipo de operación, actor y UUID de operación consistente con el comprobante. No inventar facturas ni cambiar precios del catálogo.

## 2. Arquitectura y cambios en frontend

- `features/inventory/realAdjustmentGateway.ts`: validación estricta y conversiones milésimas, roles visibles, interpretación de conteo y parsing del único movimiento coherente. Distinción entre HTTP 409, respuesta GET inválida y respuesta POST 201 inválida (potencial confirmación).
- `features/inventory/adjustmentPendingJournal.ts`: registro IndexedDB por `actorId:businessId:inventory.adjustment`. Guarda clave UUID4, cuerpo exacto, versión, fecha, scope; **sin token ni contraseñas**, pero datos operativos **sin cifrar**. Reserva transaccional previa al POST, verificación tras lectura, scope aislado y prohibición de reemplazar el cuerpo/clave. Si falla IndexedDB, se bloquea la mutación. No borra automáticamente intentos de resultado incierto.
- `features/inventory/RealAdjustmentPanel.tsx`: interfaz contextual con artículo físico, sede apta, modalidad **conteo físico / ajuste entrada / ajuste salida / stock inicial**, lectura API específica del saldo y versión, vista previa de delta y saldo proyectado, motivo, consentimiento, confirmación humana, mensajes de errores y comprobante con ID. Recuperación en F5 sin reenviar automáticamente. Una operación fallida por 409 **no** se recalcula automáticamente contra la versión nueva.
- `features/inventory/RealInventoryPage.tsx`: botón independiente **Stock inicial y ajustes** junto a transferencias; las dos operaciones no se montan simultáneamente. Al confirmar se vuelven a consultar saldos y movimientos a FastAPI. El DEMO y sus `demoStore` permanecen intactos.
- `features/auth/auth.css`: tarjetas responsive del saldo observado, delta y saldo esperado.
- `tests/adjustment-real-api.test.mjs`, `package.json` (`npm run test:adjustment-real`), GitHub Actions frontend CI.

**Privacidad:** los datos persistentes de la intención no están cifrados ni se sincronizan entre navegadores. No realizar estas pruebas desde equipos compartidos.

## 3. Evidencia automática

GitHub Actions en rama T08 con el nuevo script `test:adjustment-real` (verificar último run del commit de código, no confundir CI anteriores):
- Frontend, build y lint: **220/220 pruebas de las suites frontend**, incluidas **15/15 del ajuste**, **14/14 transferencias** y **26/26 inventario**; lint **0 errores, 0 advertencias**.
- Tests nuevos cubren `201`, replay `200`, GET histórico, UUID4, cantidad exacta, rol, balance inicial v0, ajustes v1+, conteo con diferencia (+,−,cero), HTTP 401/403/404/409/422, firma de movimiento, tenant, respuesta malformada, falla de red incierta, F5 con clave/cuerpo y versión originales, fallo y corrupción de IndexedDB.
- El backend **ya** tiene pruebas de PostgreSQL específicas de ajustes y concurrencia (`test_adjustment_api_integration.py`, `test_adjustment_concurrency_integration.py`), que no deben confundirse con las nuevas pruebas unitarias de frontend.
- Aviso Vite por chunk JS >500 kB continúa visible; es un aviso de rendimiento, no un fallo de build.
- Se encontró y corrigió una divergencia entre el límite de **saldo acumulado** y el de **delta individual**; el conteo final puede superar el máximo de un único ajuste mientras el delta cumpla su tope, conforme a `StockBalance.MAX_BALANCE_MILLI`. Hay prueba específica del saldo grande.

## 4. QA manual recomendado — minimizar alteración de los datos existentes

**Punto de partida documentado:** Producto A TEST en TEST Empresa A, Sede A TEST **7 UNIDAD** y Sede A TEST 2 **4 UNIDAD** luego de las transferencias T08-3; no utilizar este artículo para las primeras pruebas T08-4. Los saldos solo representan un estado observado el 10/11; releer la API antes de toda operación.

1. Actualizar la rama y ejecutar tests locales: `npm.cmd run test:adjustment-real`, `npm.cmd run test:inventory-real`, `npm.cmd run test:transfer-real`, `npm.cmd run build` y `npm.cmd run lint`. Levantar Docker y Vite mediante el proxy `PYME_API_PROXY_TARGET=http://127.0.0.1:18000`.
2. Con usuario **titular de TEST Empresa A**, en Catálogo REAL crear artículo físico nuevo de prueba **«Producto T08-4 CONTEO»**, de tipo REVENTA y unidad UNIDAD, SKU único. Elegir ubicación activa apta para stock (p.ej. **Sede A TEST 2**), verificando primero que para ese artículo **no hay saldo**.
3. Inventario REAL → **Stock inicial y ajustes**. Seleccionar artículo nuevo, ubicación, tipo **STOCK_INICIAL**, cantidad `5`, motivo `Conteo inicial de prueba T08-4`, aceptar almacenamiento, confirmar **una sola vez**. Esperado: comprobante `STOCK_INICIAL +5`, stock **5 UNIDAD**, versión **1**, y un movimiento de ledger. Si la API rechaza (p.ej. 409) **no inventar otra operación**; verificar estado/registro.
4. Volver a abrir, seleccionar el mismo artículo y sede: **AJUSTE_ENTRADA**, cantidad `2`, motivo `Reposición por conteo de prueba`. Esperado saldo **7 UNIDAD**, versión **2**, movimiento `+2`.
5. Abrir **CONTEO FÍSICO** con saldo consultado 7. Ingresar saldo contado `6`. Debe mostrar **delta −1** y proyección **6**. Confirmar una vez; esperado saldo **6 UNIDAD**, versión **3**, movimiento `AJUSTE_SALIDA −1`.
6. Verificar que conteo `6` sobre saldo 6 muestre que no hay diferencia y **no** habilite POST. Cambiar de sede/artículo y verificar que la versión se vuelva a consultar; no reutilizar un `expected_version` obsoleto.
7. Intentar inicializar de nuevo un artículo con saldo existente: debe bloquearse en formulario, y en backend un POST directo similar devolvería **409**. No es necesario enviar una operación insegura para demostrar esta condición si hay test de backend.
8. **QA de concurrencia (opcional, controlado, T08-5):** dos sesiones leyendo misma versión; una hace ajuste autorizado y la otra intenta comando con la versión anterior: **409**, sin modificar saldo. Revisar ledger, recuperar/descartar identidad anterior luego de verificar; no crear clave nueva automáticamente.
9. **Permisos:** con Miguel como **TRABAJADOR**, el formulario debe informar solo lectura; con encargado asignado, se permiten ajustes pero no stock inicial. El backend debe revalidar, no crear asignaciones artificiales.
10. **Aislamiento:** Empresa B no debe ver el artículo/movimientos/saldos de A. DEMO sigue con datos propios. No reiniciar/eliminar volúmenes de PostgreSQL.

## 5. Riesgos y criterios de cierre

- **Concurrencia:** lectura previa no reserva inventario. El backend compara `expected_version` y bloquea operaciones obsoletas en transacción. Ante **409** se conserva el intento y se orienta a consultar saldos e historial antes de descartar o reintentar **la misma** intención. Para cambiar versión es obligatorio resolver la intención anterior y preparar un **nuevo** comando explícito.
- **Pérdida de respuesta:** aun con HTTP 201 inválido puede haberse confirmado. No hacer reintentos automáticos ni inventar éxito; el registro durable conserva el mismo UUID4.
- **Registro histórico:** no permitir `STOCK_INICIAL` sobre ubicación+artículo con movimientos anteriores, aunque el saldo histórico sea cero. No usar suma de compras en el navegador.
- **Datos demo:** no mezclar. **T08-4 quedará funcionalmente aprobado** solo tras las capturas de stock inicial, ajuste positivo/negativo, conservación del historial y control de permisos/tenant o sus evidencias de QA documentadas.

**Estado de cierre histórico:** al redactar este plan faltaba QA manual REAL; **esa pendiente se resolvió el 10/11/2026** y está respaldada a continuación y en [T08-5](E2-7_T08_5_QA_INTEGRAL_Y_CIERRE.md). PR #41 aún no se fusiona.

## 6. Acta retrospectiva de QA manual T08-4 — resultado final (10/11/2026)

**Fuente:** capturas y confirmaciones del usuario sobre la interfaz de Inventario REAL conectada a FastAPI. Esta sección registra lo observado, sin afirmar consultas SQL ni capturas de tráfico HTTP independientes. **Sede efectivamente utilizada: Sede A TEST**, no Sede A TEST 2 como sugería a modo de ejemplo el plan anterior. Artículo: **Producto T08-4 CONTEO**, SKU `TEST-T084-001`, unidad UNIDAD, en **TEST Empresa A**.

| Control | Evidencia manual observada | Resultado |
|---|---|---|
| Carga inicial | Sin saldo previo, `expected_version=0`; registro `STOCK_INICIAL +5` | Aprobado; 5 UNIDAD / versión 1 |
| Ajuste de entrada | Sobre 5/v1, `AJUSTE_ENTRADA +2` | Aprobado; 7 UNIDAD / versión 2 |
| Conteo físico | Saldo leído 7/v2, saldo contado 6; delta `AJUSTE_SALIDA -1` | Aprobado; 6 UNIDAD / versión 3 |
| Ledger | En artículo/sede aparecen `+5, +2, -1` | Aprobado visualmente, total 6 |
| Conteo sin diferencia | Conteo 6 con saldo actual 6/v3 | Aprobado: mensaje de coincidencia y botón de confirmar deshabilitado |
| Inicialización repetida | Mismo artículo y sede con 6/v3, cantidad propuesta, motivo y aceptación completos | Aprobado: operación inicial bloqueada por stock previo |
| Rol trabajador | Miguel ve aviso de solo lectura y no obtiene formulario de ajustes | Aprobado en UI |
| Separación de empresas | TEST Empresa B no muestra saldos ni movimientos de A | Aprobado visualmente |
| Regresión DEMO | DEMO muestra empresas y artículos propios, sin mezclarse con datos TEST | Aprobado visualmente |

**Pendientes que NO deben confundirse con pruebas manuales realizadas:** no se verificó manualmente una colisión de dos sesiones con `expected_version` obsoleta; tampoco un rechazo directo al backend de encargado que intenta inicializar stock. Ambos comportamientos se validaron en PostgreSQL aislado, y el 409 se probó también con Playwright REAL.

**CI de cierre:** [run #42896686337](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42896686337), 879/879 backend, 256/256 frontend, 4/4 Playwright REAL y 6/6 Playwright DEMO, sin fallos. No repetir los movimientos sobre el artículo TEST para reconstruir pruebas. **T08-4 queda funcionalmente aprobado**; el merge requiere autorización posterior del usuario.
