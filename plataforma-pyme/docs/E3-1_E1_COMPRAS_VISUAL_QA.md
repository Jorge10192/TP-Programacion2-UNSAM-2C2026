# E3-1E1 — Compras REAL: listado y pantalla exclusiva de registro

**Fecha:** 12/11/2026.
**Base integrada:** main 03fa3294268ef821d12609a59f39a32e194ad785, con PR #50 a #54 fusionados y verificación de árbol idéntico a E3-1D2B.
**Rama:** feature/e3-1e1-compras-visual.
**Estado:** visual y QA en PR DRAFT independiente. No fusionar hasta pruebas y aprobación manual.

## Alcance E3-1E1

- Listado con encabezado, tres contadores que representan **solo compras cargadas**, búsqueda local por referencia/proveedor/ID y filtro por estado.
- Mantener paginación de 100 y aviso explícito cuando quedan más páginas; nunca presentar estadísticas globales de toda la empresa.
- Botón Registrar compra REAL abre pantalla dedicada en la misma ruta, oculta el listado y coloca Volver a compras arriba con foco de teclado. Es el patrón aceptado en E3-1C y E3-1D.
- El formulario existente se conserva (fecha local, proveedor, referencia, notas, catálogo/concepto libre, cantidad, costo unitario, costo por línea, propuesta de costo de referencia, comparación con precio de venta, total y consentimiento IndexedDB), añadiendo CSS exclusivo para mejorar jerarquía y responsive.
- Volver/Cerrar formulario **solo cambian la vista**; si existe intención pendiente en IndexedDB, no se borra ni se genera una clave nueva. Reingresar muestra la misma operación pendiente.
- Registrar confirma en FastAPI y vuelve al listado. Registrar **no aumenta inventario**.

## Invariantes

1. Sin cambios en backend, tablas, modelos de compras, endpoints, permisos, cuenta o tenant.
2. **Sin cambios en operaciones:** savePurchase, buildPurchase, sendReceipt, checkReceipt, beginReceipt, discardPurchase, supplyPendingJournal y cálculos exactos conservan su comportamiento. Las recepciones siguen en el listado durante E3-1E1.
3. Idempotency-Key, cuerpo original y recuperación tras F5 siguen bajo la misma política. No se implementan reintentos automáticos, no se transforma una escritura incierta en éxito.
4. La recepción es la **única** operación de Compras que incrementa stock, siempre con sede STORE y verificación del backend. Se preserva la confirmación explícita.
5. La UI no mezcla datos de otras empresas ni utiliza DEMO; la navegación mantiene el mismo path existente.

## QA

- npm run build, npm run lint, npm run test:supply-real, npm run test:operations-real y el resto de pruebas de CI.
- E2E e2e/real/purchase-ui-persistence.spec.ts: abrir formulario, ocultar listado, foco en Volver, cancelar/volver sin escritura, continuar compra con 2 renglones, F5, recepción, comprobante y ledger; se agrega verificación de ancho 390 px. PostgreSQL **descartable** y PYME_DISPOSABLE_QA=1.
- E2E e2e/real/purchases.spec.ts: se mantiene el test crítico de bloqueo de otra compra mientras recupera una recepción.
- QA manual: verificar filtros y contadores con datos de prueba; crear/cancelar; guardar y comprobar que aparece pendiente, con stock sin cambios; entrar en recepción y comprobar que mantiene el flujo previo; móvil y escritorio.

## Próximo subbloque

**E3-1E2 — Recepción y comprobantes**: llevar recepción y consulta de comprobante a vistas independientes, con botón Volver y UX más clara para resultado incierto, reconsulta y recuperación segura. No hacerlo hasta revisión de E3-1E1, para aislar regresiones del circuito contable/de inventario.

## Pendientes generales E3

E3-1F Inventario, E3-1G POS/Ventas, E3-1H Inicio/onboarding REAL. Fotografía/archivos, gastos, caja y cuentas financieras quedan en etapas posteriores como marca el plan rector.
