# E3-2B — ADR, propuesta de contratos y matriz de aceptación

**Tipo:** propuesta inicial revisable, derivada del estado de `main` y los HTML proporcionados. No afirma endpoints implementados.

## ADR-01 — Separar intención de cobro y venta

**Contexto:** `Sale.status` solo admite `CONFIRMADA` y `SaleService` registra venta, líneas, pagos, stock y movimientos de inventario en un único commit. Crear la venta al generar QR descontaría stock sin pago.  
**Decisión:** intención QR como recurso separado; se crea sin `Sale` y sin mover stock. Se registra venta única después de autorización del backend. Si la confirmación posterior falla por stock, entra en `REQUIERE_REVISION` para compensación, jamás se descuenta stock ficticiamente. Evaluar reserva temporal con ledger transaccional en B4.  
**Prueba:** GET de ventas y ledger vacío después del QR; un solo movimiento al finalizar.

## ADR-02 — Vinculación ficticia ≠ OAuth

**Contexto:** la conexión de cuentas de terceros en producción requiere consentimiento OAuth, tokens cifrados y renovación.  
**Decisión:** B1 usa un proveedor MOCK, guarda `business_id` y metadatos DEMO, no claves, tokens, contraseñas ni CVU ficticio validado como real. Mostrar siempre marca DEMO en cuentas y cobranzas. Adapter backend sustituible para B6.  
**Prueba:** dos empresas no comparten vínculo; operador sin permiso no lo modifica; no hay secretos de MP en logs/front.

## ADR-03 — QR y detalle comercial

**Decisión:** en B2 el QR muestra al lado una tabla de snapshot para usuario y cliente: foto/nombre, cantidad, unitario, subtotal, descuento y total. El mock QR **no** es procesable por Mercado Pago. En B6 enviar `items[]` y `description` a la Orders API cuando se admitan; no depender de que la billetera renderice cada producto.  
**Prueba:** cambios posteriores en catálogo/precios no alteran el importe ni las líneas de la intención; F5 conserva el detalle.

## ADR-04 — Origen y estados de pago

**Decisión:** origen `MOCK_QA` vs `MP_API` y estado separado del estado de venta. `APROBADA_DEMO` no equivale a saldo acreditado. Conservar historial de eventos inmutable y claves únicas por intento. El servidor determina transiciones válidas y autorización del actor.  
**Prueba:** 2 aprobaciones → 1 evento efectivo y 1 venta; expiración y pago tardío no acreditan ni descuentan stock automáticamente.

## ADR-05 — Seguridad por capas y entornos

**Decisión:** política backend para conectar/desconectar (titular/admin con permiso), cobro (rol con permiso SELL y sede habilitada), simulación (exclusivamente rol QA/administrador con flag QA y base QA explícita). Fail closed, sesión activa, empresa activa, sin token en URLs, no confiar en `role` o `status` enviados por cliente. Mantener la compuerta de ventas REAL existente para otros métodos hasta su propia autorización.
**Prueba:** 401/403/404/409 según causa, no se filtra QR ni monto de otro negocio, cuenta suspendida no crea intentos, sin feature flag mock no puede aprobar.

## ADR-06 — Compatibilidad, evolución y alcance

**Decisión:** no tocar `Sale` ni `SalePayment` con estados `PENDIENTE` que rompan su CHECK vigente. Mantener ventas declaradas por ruta actual; agregar integración QR como orquestador autorizado que produce eventualmente un `SaleCommand` normalizado. No confundir QR de artículo con QR de cobro. No implementar todavía libro contable general.

## Matriz QA por bloque

| Escenario | Bloque | Comprobación mínima |
|---|---|---|
| Conectar cuenta DEMO A, recargar, desconectar, reconectar | B1 | Estado persistente, idempotencia, sin credenciales externas |
| Trabajador/encargado solo consulta | B1 | Ocultamiento visual + 403 backend para mutación |
| Cuenta de empresa A no visible en B | B1–B5 | Rutas y bytes aislados por tenant |
| Intento sin cuenta / empresa suspendida / sede sin SELL | B2 | Error, cero intentos |
| Dos clics en Generar QR | B2 | Una sola intención para la misma clave |
| QR muestra 2 productos + 1 servicio, descuento, foto, ARS | B2 | Totales del servidor; detalle completo a 390 px y escritorio |
| Cambio posterior de precio o foto del catálogo | B2 | El snapshot e importe del cobro no cambian; foto actual es solo decorativa |
| F5, logout/login, navegar y retomar intento | B2–B4 | GET recupera el intento sin reemitir QR ni cobrar |
| Aprobado/rechazado/expirado/cancelado | B3 | Transiciones autorizadas y eventos auditables |
| Pérdida de respuesta y reintentos, orden de llegada invertido | B3–B4 | Estado recuperable, sin nueva venta ni nuevo débito |
| Stock cambiado entre QR y pago | B4 | No saldo negativo; revisión/compensación documentada |
| Servicio vendido por QR | B4 | Venta sin consumo de inventario |
| Bien físico vendido por QR | B4 | Una venta y un único ledger de stock |
| Pago aprobado y error DB al registrar venta | B4 | REQUIERE_REVISION, no fingir comprobante final |
| QR DEMO nunca aparece como acreditación bancaria | B1–B5 | Marca DEMO en estado, comprobante e historial |
| Teclado, pantalla móvil, conexión caída, accesibilidad | B5 | Navegación y estados legibles |
| Pytest, Alembic check, OpenAPI, Playwright REAL/DEMO y CI | B1–B5 | Todos verdes en SHA de cada entrega; PR sin merge automático |

## Guía de ejecución incremental

Cada bloque se implementa en commits coherentes con tests y documentación. Antes de pasar a otro bloque: validar los tres workflows existentes, explicar controles manuales en Windows/PowerShell y mantener `main` aislado. El PR permanece DRAFT hasta aprobación integral. No usar secretos reales ni ejecutar pagos con dinero real.

**Propuesta de primera prueba humana (B1):** abrir empresa A → vincular Mercado Pago DEMO → F5 → ver cuenta; cambiar a B → no ver A; entrar como trabajador → consultar, no modificar; volver como titular → desconectar/reconectar. Ninguna compra, venta o saldo se crea en B1.
