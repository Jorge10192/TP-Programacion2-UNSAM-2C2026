# E2-7 · T10-F — Auditoría final y acta de cierre técnico del POS REAL

**Fecha:** 11/11/2026. **Rama exclusiva:** `feature/e2-7-t10-pos-ventas-real`. **PR:** [#43](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/43), **DRAFT / sin merge**.

> **Estado de esta acta: cierre técnico CONDICIONADO.** Esta acta distingue evidencia aprobada de correcciones cuya CI debe validarse en el último HEAD. No autoriza desplegar ni habilitar POST REAL en una empresa persistente, ni fusionar el PR a `main` sin aceptación explícita del responsable.

## 1. Alcance auditado y fronteras

Se revisaron T10-0, T10-A, T10-B1/B2 (comando, validación, journal por actor/tenant y coordinador), P01 (precios y RBAC en FastAPI), T10-C (sede, catálogo, carrito y subtotales), T10-D (pagos declarados, consentimiento, POST idempotente y GET de recuperación) y T10-E (pruebas integradas). También se inspeccionaron `SaleService`, contratos de lectura, QA navegador, CI y UX local.

**Alcance expresamente excluido:** acreditación bancaria, cobro real de Mercado Pago, webhook, QR de cobro, conciliación bancaria, diseño final DEMO, stock mostrado en tiempo real dentro de la ficha POS, y autorización de habilitación comercial. `MERCADO_PAGO_DECLARADO` registra lo que declara el vendedor, **no demuestra que hubo un pago**.

## 2. Hallazgos, correcciones y decisión

| Hallazgo | Severidad | Acción / conclusión |
|---|---|---|
| Playwright T10-C esperaba pago previo `3501,00` tras editar 2→3 unidades; la UI indicaba correctamente `5301,50` | Falla de test | Corregido `c6252282`; prueba de revisión final agregada, CI posterior aprobada |
| Falta de caso navegador de dos pagos, precio excepcional y descuento | Cobertura | Incorporado `49cc8c73`/`ef7b223a`, comprobación de `SaleView` individual, CI posterior aprobada |
| Falta de comprobación de GET 404 tras POST realmente perdido | Cobertura | Incorporado `66ac8470`: reenvío manual con **misma clave y body**, una venta final, CI aprobada |
| Falta de comprobación navegador de stock físico/ledger | Cobertura | Incorporado `71a1e486`: stock 5→3, versión 1→2, un movimiento `VENTA_SALIDA=-2` y comprobante |
| Falta de comprobación navegador de `409` sin stock | Cobertura | Incorporado `a0f96845`: 409, pendiente recuperable tras F5, GET 404, sin POST automático ni venta |
| `try/catch` que solo relanzaba error | Lint | Simplificado en `73d683b7`; conserva errores y journal, sin cambiar transporte |
| `setState` sincrónico en `useEffect` para pago único | Lint/UX | En `561928fe` el pago inicial se **deriva del total del carrito** durante edición y se congela solo ante modificación manual; respeta el bloqueo durante revisión |

**Hallazgos de alcance, no bugs confirmados:** P01 debe seguir siendo obligatorio en FastAPI aunque el navegador oculte campos; precio/sede del carrito pueden quedar obsoletos hasta el POST y se revalidan en el backend; IndexedDB guarda **datos comerciales no cifrados** (sin token) y no está destinado a dispositivos compartidos. Los intentos inciertos no se eliminan automáticamente ni se reemplazan por otra clave.

## 3. Invariantes revisados

1. **Aislamiento:** actor + empresa + `sale.create`; un comprobante ajeno, cambio de actor/tenant o un journal corrupto no autoriza eliminar un intento distinto.
2. **Idempotencia:** UUID4 + body canónico inmutable guardados y releídos antes del primer POST; no hay retry automático al montar/F5/401/403/409/422, ni tras respuesta o red incierta. GET 404 no demuestra que una venta no fue registrada. Replay permitido únicamente por acción explícita sobre la misma solicitud.
3. **RBAC/P01:** titular/administrador pueden cotizar y descontar, encargado/trabajador solo precio de catálogo y sede asignada; FastAPI deniega bypass. Sin sede, solo servicios por roles gerenciales.
4. **Exactitud monetaria:** cantidades milésimas, precios centavos enteros, subtotal por renglón con HALF_UP, descuento y suma exacta de 1–6 pagos declarados; no usar floats ni interpretar pagos como acreditados.
5. **Stock/atomicidad:** venta física requiere sede vendedora y con almacenamiento, stock suficiente y débito `UPDATE` condicionado; comprobante, ledger, saldo y pago se confirman en una sola transacción; rechazo 409 revierte escrituras.
6. **Despliegue seguro:** `VITE_PYME_ENABLE_REAL_SALES` apagado por defecto fuera del runner descartable. Esta variable **no es seguridad de backend**: solamente evita una acción accidental desde la UI local.

## 4. Evidencia

- **QA local del usuario:** 53/53 pruebas Node de T10-A/B1/B2/C/D, TypeScript/Vite build correcto, lint inicialmente 0 errores + 2 advertencias.
- **QA visual del usuario:** revisión final de `TEST Empresa A`, sede `Sede A TEST`; producto 3×$1.500=$4.500, servicio 4×$1.000=$4.000, subtotal $8.500, descuento $2.000 y total/pago declarado $6.500. Casilla de revisión activada con **botón de confirmar REAL deshabilitado**. Se comprobó **sin registrar ventas**.
- **CI del último incremento T10-E antes de T10-F:** commit `a0f96845`, frontend [#42980722941](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42980722941), backend [#42980723006](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42980723006) y full-stack [#42980722949](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42980722949): **SUCCESS**.
- **CI de T10-F:** verificar resultado de frontend, backend y full-stack sobre el último commit que incluya las dos correcciones de lint y **esta acta**; registrar SHA y URLs antes de levantar la condición de cierre. No extrapolar una CI de SHA anterior.
- **Pruebas API backend existentes:** `test_sales_api_integration.py` (venta física/mixta, replay, ledger, rollback stock insuficiente, sedes), `test_sales_price_policy_integration.py` (cuatro roles, precios, descuentos, sedes y bypass). La cobertura no equivale a un permiso para operar en la empresa TEST.

## 5. Riesgos residuales y decisiones fuera de T10

- **Habilitación comercial:** pendiente decisión separada, controles de despliegue, backups y monitoreo. No cambiar la variable de entorno en TEST Empresa A ni ejecutar ventas de prueba sobre base persistente.
- **Interfaz operativa:** las sedes pueden mostrarse como opciones antes de que FastAPI verifique asignación individual; un operador no obtiene permiso por elegirla. Conviene mejorar el filtrado/feedback cuando exista una API de sedes autorizadas; no asumir permisos de frontend.
- **Dispositivos compartidos:** el journal IndexedDB puede contener cantidades, notas y referencias no cifradas. Definir política de puesto de trabajo y cierre seguro de pendientes antes de producción.
- **T10-E pruebas ya realizadas:** stock, servicio, pagos mixtos y recuperar 201/404/409. Aun con CI verde, las pruebas no sustituyen monitoreo operativo bajo fallas reales de red o energía.
- **Diseño y DEMO:** homologar estética y navegación tras integrar módulos; sin copiar datos de demo al tenant REAL.
- **Mercado Pago real:** QR de artículo, QR de cobro y confirmación por webhook son tareas posteriores y separadas.

## 6. Puerta de cierre y acciones

- [x] Auditoría de código, contratos y pruebas T10.
- [x] QA manual **no destructiva**: revisión final y botón bloqueado.
- [x] CI E2-7/T10-E `a0f96845` aprobada en tres workflows.
- [x] Correcciones de las dos advertencias de lint incorporadas a rama.
- [ ] **CI en último HEAD T10-F**: comprobar resultados reales de tres workflows, sin fallos y lint sin las dos advertencias originales.
- [ ] Registrar aprobación del responsable de la **integración** del PR #43 (merge); no confundir con habilitar POST fuera del entorno descartable.
- [ ] En acto separado, evaluar si se autoriza **habilitar ventas persistentes**; el cierre de T10 no lo hace por sí mismo.

**Dictamen al redactar:** funcionalidad T10 integrada y auditada, sin defecto de seguridad confirmado en los escenarios inspeccionados; **cierre documental condicionado a la CI final**. PR #43 permanece DRAFT y no se modificó `main`.
