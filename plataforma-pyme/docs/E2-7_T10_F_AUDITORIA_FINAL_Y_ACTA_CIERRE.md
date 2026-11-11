# E2-7 · T10-F — Auditoría final y acta de cierre técnico del POS REAL

**Fecha:** 11/11/2026. **Rama exclusiva:** `feature/e2-7-t10-pos-ventas-real`. **PR:** [#43](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/43), **pendiente de merge al actualizar esta acta**.

> **Estado de esta acta: QA manual y cierre técnico documentados; CI del último cambio documental pendiente.** El responsable autorizó expresamente fusionar el PR si las verificaciones finales siguen aprobadas. Este cierre **no** autoriza desplegar ni habilitar POST REAL en una empresa persistente.

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
- **CI T10-F verificada antes de este agregado documental:** commit `8649e007`, frontend [#42982177656](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42982177656), backend [#42982177742](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42982177742) y full-stack [#42982177673](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42982177673): **SUCCESS**. Este anexo de QA manual es un nuevo commit documental; verificar también la CI correspondiente al HEAD final, sin atribuirle resultados de `8649e007`.
- **Pruebas API backend existentes:** `test_sales_api_integration.py` (venta física/mixta, replay, ledger, rollback stock insuficiente, sedes), `test_sales_price_policy_integration.py` (cuatro roles, precios, descuentos, sedes y bypass). La cobertura no equivale a un permiso para operar en la empresa TEST.

## 4.1. Protocolo de uso manual ejecutado por el responsable (TEST Empresa A)

**Carácter de la evidencia:** observación de la interfaz y comandos ejecutados localmente; **no es una venta efectuada**, ni equivale a una ejecución manual del POST de ventas en `TEST Empresa A`. El usuario aportó registro de consola y captura del checkout el **11/11/2026**.

| Control de uso | Procedimiento / evidencia | Resultado |
|---|---|---|
| Sincronización de rama | `git pull --ff-only origin feature/e2-7-t10-pos-ventas-real` y `git log -1 --oneline` | Fast-forward a `4c0cd1d` en la primera verificación local; las mejoras E/F posteriores se validaron en GitHub Actions |
| Carrito y subtotales | `npm.cmd run test:sales-real-pos` | **10/10** Node aprobadas; cantidades enteras/fraccionarias, bloqueo de precios, subtotal por producto y actualización del mismo renglón |
| Composición del checkout | `npm.cmd run test:sales-real-checkout` | **8/8** Node aprobadas; total, descuentos, cinco métodos declarados y suma exacta |
| Intentos de escritura | `npm.cmd run test:sales-real-write` | **12/12** Node aprobadas; reserva durable, HTTP incierto, replay, GET 404 y verificación de comprobante |
| Journal local | `npm.cmd run test:sales-real-pending` | **12/12** Node aprobadas; F5, aislamiento por actor/empresa, corrupción y error de IndexedDB |
| Contrato del comando | `npm.cmd run test:sales-real-command` | **11/11** Node aprobadas; HALF_UP, pagos, límites y formato canónico |
| Compilación | `npm.cmd run build` | TypeScript + Vite aprobaron; advertencia de bundle >500 kB **no bloqueante**; optimización de carga diferida |
| Lint inicial | `npm.cmd run lint` | **0 errores y 2 advertencias** (`no-useless-catch`, `set-state-in-effect`); ambas corregidas después en la rama T10-F |
| Checkout manual, lectura | Empresa `TEST Empresa A`, sede `Sede A TEST` | Revisión final muestra correctamente empresa, sede, renglones, subtotal, descuento y medio declarado |
| Importe del ejemplo | Producto A TEST **3 × $1.500 = $4.500**; Servicio A TEST **4 × $1.000 = $4.000**; descuento **$2.000** | Subtotal **$8.500**; total **$6.500** |
| Medio de pago | `Mercado Pago (solo declarado)`, importe **$6.500** | Coincide con el total; **no** implica acreditación o transferencia |
| Consentimiento y control de escritura | Casilla de confirmación marcada, mensaje de validación visible y botón `Confirmar y registrar venta REAL` deshabilitado | **No se envió POST** desde esta revisión local; no se descontó stock ni se creó comprobante |
| Regresión adicional en CI | Ejecuciones Playwright REAL/DEMO y backend sobre PostgreSQL descartable | Validaciones de stock físico, pagos mixtos, recuperación GET, 201 perdido y 409; resultados específicos ligados a los SHA citados en el acta |

**Límite de alcance:** la evidencia manual no incluye pago bancario acreditado, venta persistente en TEST Empresa A, reanudación real de un pendiente en el equipo del usuario ni validación de ambiente de producción. Las pruebas de escritura del POS se realizaron por navegador automatizado contra PostgreSQL **descartable** y con credenciales de QA aisladas.

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
- [x] CI T10-F `8649e007`: tres workflows SUCCESS con ambas correcciones de lint.
- [ ] **CI del HEAD documental final** que incorpora el protocolo de uso: verificar resultados de tres workflows sobre ese commit antes de merge.
- [x] Aprobación **expresa del responsable** para integrar PR #43 a `main` cuando sus controles estén verdes (11/11/2026); no confundir con habilitar POST fuera del entorno descartable.
- [ ] Confirmar merge y dejar evidencia del SHA de `main`.
- [ ] En acto separado, evaluar si se autoriza **habilitar ventas persistentes**; el cierre de T10 no lo hace por sí mismo.

**Dictamen tras revisión manual:** funcionalidad T10 auditada, QA local no destructiva documentada y CI T10-F `8649e007` aprobada. **Integración autorizada, condicionada exclusivamente a las CI del último commit documental**. La habilitación de POST sobre bases persistentes **no está autorizada**.
