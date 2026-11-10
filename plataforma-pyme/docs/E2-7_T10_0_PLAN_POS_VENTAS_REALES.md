# E2-7 · T10-0 — Plan de implementación del POS de ventas REALES

**Fecha:** 10/11/2026. **Rama:** `feature/e2-7-t10-pos-ventas-real`. **Base verificada:** `main` en el merge de T09 PR #42, commit `a09c0152aabc1b2c110726ef7aa2f42d71d79a0a`.

## Objetivo y frontera

Construir el POS de ventas REALES en React, integrado con FastAPI y PostgreSQL para empresas de múltiples rubros. **WALOS no determina el dominio ni el precio ni la unidad**. El POS registrará bienes, servicios o ventas mixtas, pagos **declarados** (no confirmados por bancos/MP), descuentos, comprobantes inmutables de venta y débito atómico de stock solo cuando haya bienes.

**T09 queda fusionado:** existen `POST /api/v1/businesses/{business_id}/sales`, `GET /sales`, `GET /sales/{sale_id}` y `GET /sales/by-request/{request_id}`. El backend realiza la validación efectiva de permiso de empresa/sede, catálogo vendible, importes, pagos y stock; la UI no es un control de seguridad.

**No hacer cambios de ventas ni stock en TEST Empresa A para programar este bloque.** Todas las pruebas de escritura deben usar usuarios/empresas y PostgreSQL completamente descartables en CI. El frontend DEMO queda separado.

## 1. Contrato verificado en backend

`CreateSaleRequest` tiene exactamente (se pueden omitir los campos con default en la API, pero T10 usará una representación canónica completa para los reintentos):

- `location_id: UUID | null` (null permitido para servicio sin sede **solo** a titular/administrador según política backend vigente).
- `discount_cents`: entero estricto de 0 a 99.999.999.999.
- `notes`: texto normalizado, máximo 500 caracteres una vez normalizado.
- `lines`: de 1 a 30, `{catalog_item_id: UUID, quantity_milli: 1..999999999, unit_price_cents: 0..99999999999}`.
- `payments`: de 1 a 6, `{method,amount_cents,reference}`, importe positivo. Métodos: `EFECTIVO`, `TRANSFERENCIA`, `CUENTA_DNI`, `TARJETA`, `MERCADO_PAGO_DECLARADO`.
- Importes en centavos enteros, cantidades en milésimas. **HALF_UP por renglón:** `(quantity_milli * unit_price_cents + 500) // 1000`, **sin floats**. Total final y suma de pagos declarados deben coincidir exactamente; el total después del descuento debe ser positivo.
- **POST exige `Idempotency-Key` UUID4**. Primera confirmación `201` con `SaleView`; replay autorizado del mismo actor/clave/cuerpo `200`; clave reaprovechada con otro cuerpo/actor `409`. Dos intentos HTTP no equivalen a dos ventas si preservan identidad.
- No se permite vender cantidades fraccionadas de catálogo con unidades `UNIDAD`, `PAQUETE`, `CAJA` o `SERVICIO`. Se validará tanto en frontend con catálogo completo como en backend.
- Catálogo puede tener `price_cents=null`, por lo que jamás inventar precio `0` automáticamente ni tomar precio de DEMO. La API existente permite que el comando indique precio; la política de **quién puede editarlo** es la decisión P01, todavía no aprobada para T10.

## 2. Decisión formal P01 — PUERTA ANTES DE HABILITAR POST EN REACT

El plan previo `E2-7_T00_DECISIONES_Y_ORDEN_DE_EJECUCION.md` exige aprobación del responsable para precio/descuerdo por rol. **No asumir que el backend restringe precios por rol:** actualmente sus reglas controlan permiso de venta por empresa/sede, pero toman `unit_price_cents` y `discount_cents` del comando y verifican consistencia.

**Propuesta para aprobación (no vigente aún):**
- Titular administrativo y administrador: pueden modificar precio de la venta, ofrecer descuentos y registrar cualquier método **declarado**.
- Encargado/trabajador: pueden vender en sus sedes autorizadas a precio del catálogo; **no** pueden cambiar precio unitario ni descontar. Si el catálogo no define precio, no pueden vender ese artículo hasta que un administrador defina precio o autorice una excepción formal.
- Servicios sin sede: solo titular/admin conforme al backend.
- Cualquier restricción aprobada deberá implementarse en FastAPI **y** React, con tests de bypass API, no solo ocultando el campo.

**Alternativa legítima:** conservar el comportamiento actual del backend, que permite al personal autorizado elegir precio y descuento, siempre con registro de actor. Elegir cualquiera de estas políticas requiere aprobación del usuario; T10-A se desarrolla sin cambiar ni ejecutar el endpoint POST.

## 3. Arquitectura de intentos idempotentes (P04)

Antes del primer POST, persistir en IndexedDB por scope **actor + empresa + `sale.create`** un `request_id` UUID4 y un **cuerpo completo, canónico e inmutable**, sin Bearer ni credenciales. La escritura en IndexedDB debe terminar y releerse exitosamente **antes** de habilitar la transmisión. Si almacenamiento está bloqueado/corrupto, **no enviar POST**.

- Tras caída de red, abort, timeout, respuesta inválida o F5: guardar el intento como incierto; reautenticarse con token solo en memoria.
- Primero ofrecer `GET /sales/by-request/{request_id}`. **404 no prueba que el POST no llegó**: conservar el intento y ofrecer reintento **explícito** de la misma clave/cuerpo; no generar nueva clave por un timeout.
- Con `201`/`200` y comprobante verificado para empresa, clave y totales: cerrar la intención duradera. Si la eliminación del journal falla, conservarla y permitir recuperación sin nuevo POST.
- Ante `409`: **no** borrar intento, ni reescribir su cuerpo, ni intentar nueva clave automáticamente. Exigir intervención humana/diagnóstico (puede ser stock insuficiente, empresa o sede suspendida, o clave conflictiva).
- Si actor/tenant cambia, **aislar físicamente** el scope; no revelar un intento de otra cuenta. Advertir que la información comercial almacenada en IndexedDB no está cifrada: evitar equipos compartidos.
- No purgar silenciosamente pendientes; definir retención y borrado manual seguro. Reutilizar patrones comprobados `supplyPendingJournal.ts`, sin reutilizar su store con otro esquema.

## 4. Diseño mínimo del POS

1. Selector explícito de **empresa** y sede activa con permiso de venta (sede SELL y STORE para bienes). Nunca usar sede implícita para debitar stock.
2. Catálogo paginado con estados **loading/parcial/completo/error**; probar **101 y 501 artículos**. No filtrar localmente como si fueran todos cuando solo cargó la primera página. No inventar endpoint de búsqueda `?q=`.
3. Carrito de 1–30 renglones; unidades, cantidad en milésimas y totales HALF_UP por renglón. Precio del catálogo como sugerencia, no valor impuesto hasta decidir P01.
4. Descuento y pagos declarados sumando total exacto; no confundir `MERCADO_PAGO_DECLARADO` con webhook/acreditación externa ni el QR del artículo con el QR de cobro.
5. Revisión final de empresa/sede, renglones, precio, descuento y medios, consentimiento humano explícito; bloqueo de doble clic, journal persistido primero.
6. Mostrar comprobante REAL de T09; errores 401/403/404/409/422 y resultado incierto con semántica clara. Saldo actual consultado en Inventario, saldo postventa mostrado como snapshot.
7. Integración y pruebas con varias empresas/roles, stock suficiente/insuficiente, 409 por replay distinto, red caída tras commit, F5/relogin, servicio sin stock y venta mixta.

## 5. Incrementos T10 propuestos

| Etapa | Salida verificable | Puerta |
|---|---|---|
| **T10-0** | Plan, contratos, riesgos P01/P04 y arquitectura | Se realiza ahora |
| **T10-A** | Validador puro TypeScript de comando y preview HALF_UP + pruebas unitarias sin POST | Seguro antes de P01 |
| **T10-B** | Journal de venta durable scoped por tenant/actor, gateway de creación con request_id y recuperación por GET; tests sin efectos sobre base real | P04; no habilitar botón de escritura |
| **T10-C** | POS React para sede/catálogo/carrito, paginación completa 101/501 y roles | P01 aprobada antes de aceptar descuentos/precios |
| **T10-D** | Declaración de pagos, confirmación humana, persistir intento antes del POST, UI de resultado incierto y comprobante | P01 y B/C aprobados |
| **T10-E** | Playwright REAL + PostgreSQL descartable: venta física/servicio/mixta, pagos, movimientos, pérdida 201, F5 y 200/409, no duplicados | CI integral verde |
| **T10-F** | QA manual no destructiva, auditoría premerge, cierre documental y aprobación del responsable | No fusionar automáticamente |

## 6. Criterios de seguridad y evidencias

- Archivos propios bajo `plataforma-pyme/`, PR T10 independiente en borrador; **main no se modifica** durante desarrollo.
- No cambiar backend de T09/T08 salvo necesidad fundada y probada. Evitar cambios en acciones GitHub globales y carpetas no rastreadas.
- En cada bloque: Node/TS/Vite/Oxlint; backend Pytest PostgreSQL/migraciones; full-stack REAL y regresión DEMO con datos efímeros.
- CI T09 antes del merge: 886 backend, 273 frontend, 11 Playwright REAL, 6 DEMO, todos aprobados; se usan como línea base, no como resultado de T10.
- Este plan es una **iniciación de T10**, no autorización para ventas reales desde el navegador.
