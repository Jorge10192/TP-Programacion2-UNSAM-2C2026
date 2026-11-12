# E3-1E1 — Compras REAL: listado y formulario en vistas independientes

**Base:** `main` integrado en commit `03fa329` (PR #50–#54).  
**Rama:** `feature/e3-1e1-compras-visual-real`.  
**Estado:** incremento visual inicial de E3-1E, para revisión manual en PR borrador.

## Objetivo

Adecuar la carga de compras REAL a la interacción aprobada para Ubicaciones, Catálogo y Proveedores: una vista de listado y una pantalla exclusiva de alta, con navegación para volver. Conservar íntegramente las reglas existentes de compra, recepción, idempotencia y stock.

## Incluye

- Encabezado empresarial, tarjeta de seguridad indicando que una compra no mueve stock, indicadores **solo de compras cargadas** y búsqueda local por referencia/proveedor, filtro por estado y tarjetas más legibles.
- `Registrar compra REAL` abre una pantalla separada que oculta el listado; `Volver a compras` y `Cancelar` descartan el borrador no enviado.
- En el formulario se conservan fecha, proveedor, renglones, costo unitario, total editable exacto, validaciones, disponibilidad de más páginas, consentimiento IndexedDB, registro y reintento con identidad preexistente.
- **Operación pendiente recuperada:** se mantiene visible como formulario. Se deshabilita Volver/Cancelar hasta completar o resolver la intención: nunca se elimina silenciosamente el registro local.
- Encabezados/foco en cambio de vista, diseño de tarjetas responsive y estilos aislados `e3-purchases-*`, sin importar elementos DEMO.
- **Sin cambios** en gateway, backend, bases, migraciones, roles, contratos, compras, recepción, ledger, ni clave `Idempotency-Key`.

## Alcance de esta primera parte

La vista de selección y confirmación de recepción se conserva como estaba (todavía bajo el listado), para no mezclar la migración visual de alta con el flujo irreversible de movimiento de stock. La parte siguiente **E3-1E2** abordará recepción/comprobante en vistas exclusivas con revisión de recuperación tras timeouts y F5.

## Validación

- E2E nueva en `frontend/e2e/real/purchases-visual-navigation.spec.ts` con PostgreSQL descartable: listado, filtro por estado, búsqueda, creación de borrador, Cancelar/Volver, ausencia de POST en cancelación, foco y 390px.
- Ejecutar build, lint, scripts de supply REAL, suite E2E y full-stack PostgreSQL.
- QA manual sin operaciones irreversibles: verificar botón Registrar, formulario y cancelación; las recepciones con stock solamente en base descartable.
- No fusionar a `main` sin revisión y autorización posteriores.
