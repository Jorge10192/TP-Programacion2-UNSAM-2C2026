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

## Corrección puntual aprobada en QA manual: nombre del responsable

La revisión visual de Compras E3-1E1 fue funcionalmente aceptada. Se solicitó que el comprobante de recepción muestre el nombre de la persona en lugar de privilegiar su UUID.

- Se muestran dos autores distintos: **«Registró la compra»** vinculado a `purchase.created_by_id` y **«Confirmó la recepción»** vinculado a `receipt.confirmed_by_id`. No suponer que necesariamente fueron la misma persona.
- La identidad del usuario conectado solo se usa cuando su UUID coincide con el campo de auditoría correspondiente. Para otros integrantes, se resuelve el **nombre de perfil actual** con la lista real de membresías de la empresa, únicamente si `canReadTeam(business)` lo autoriza. FastAPI sigue siendo la autoridad para la lectura de ese directorio.
- Si el nombre no es consultable para el rol o ya no está disponible, mostrar **«Nombre no disponible»** en lugar de inventar una atribución o revelar el listado privado del equipo.
- Se conservan los UUID del autor de compra y de recepción, pero quedan exclusivamente dentro de **«Identificadores de trazabilidad»** para revisión técnica.
- No se agregan campos al contrato de compra/recepción, ni escrituras, migraciones o cambios de permisos; el recibo sigue siendo de solo lectura.
- Pruebas unitarias aseguran que el autor de compra y el de recepción se muestren por separado, sin atribuir el nombre de sesión a otro UUID. El comportamiento para personas sin permiso de equipo permanece restringido.

**Limitación conocida:** los nombres corresponden al perfil actual de la membresía, no son un snapshot histórico inmutable del nombre al momento de la operación. Para resolver nombres históricos de actores que no pueden consultar el directorio hace falta una decisión de backend/permisos posterior.

## Alcance de esta primera parte

La vista de selección y confirmación de recepción se conserva como estaba (todavía bajo el listado), para no mezclar la migración visual de alta con el flujo irreversible de movimiento de stock. La parte siguiente **E3-1E2** abordará recepción/comprobante en vistas exclusivas con revisión de recuperación tras timeouts y F5.

## Validación

- E2E nueva en `frontend/e2e/real/purchases-visual-navigation.spec.ts` con PostgreSQL descartable: listado, filtro por estado, búsqueda, creación de borrador, Cancelar/Volver, ausencia de POST en cancelación, foco y 390px.
- Ejecutar build, lint, scripts de supply REAL, suite E2E y full-stack PostgreSQL.
- QA manual sin operaciones irreversibles: verificar botón Registrar, formulario y cancelación; las recepciones con stock solamente en base descartable.
- No fusionar a `main` sin revisión y autorización posteriores.
