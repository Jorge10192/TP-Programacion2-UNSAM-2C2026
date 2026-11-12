# E3-2B — Plan rector incremental: vinculación de Mercado Pago DEMO, QR con detalle y confirmación de venta

**Estado:** B0 — planificación y decisiones base. No implica integración de cobro implementada.  
**Rama exclusiva:** `feature/e3-2b-mercadopago-qr-demo`, nacida de `main` en `5b21daec04df6c551d3221a06ce03d577ec36544`.  
**Proyecto:** plataforma PyME multitenant y multirrubro. Los HTML de WALOS son referencias de UX, no código definitivo, ni modelo exclusivo de un negocio.  
**Límite:** `plataforma-pyme/` y, cuando sea necesario, CI exclusivo de PyME. No modificar `main` hasta aprobación expresa.

## 0. Objetivo de experiencia de usuario

Una persona con permiso de gestión vincula una **cuenta ficticia de Mercado Pago** a la empresa activa. Luego, un operador autorizado abre el POS, selecciona sede, artículos/servicios, cantidades, precios y descuentos; elige **Cobrar con Mercado Pago QR (DEMO)**. La aplicación genera un intento de cobro individual y muestra **el QR y el desglose completo de la venta en la misma pantalla**, con imágenes de portada cuando existan. El laboratorio de pruebas permite aprobar/rechazar/cancelar/expirar y reproducir problemas de red. **Solo si el backend comprueba un pago de prueba aprobado se confirma una venta REAL en PostgreSQL QA** mediante la lógica existente de ventas/stock/idempotencia, conservando la marca inequívoca de pago simulado y sin acreditar fondos externos. Se genera el comprobante y se puede consultar el historial.

**Qué significa «detalle en el QR»:** detalle visible **al lado/debajo del código QR** siempre. En el futuro adaptador oficial, enviar al proveedor `items[]`, `description` y `external_reference` cuando el contrato Orders API lo permita; **no afirmar** que la billetera del comprador necesariamente represente cada línea, precio o descuento de manera idéntica. Lo que muestra la app de Mercado Pago depende de ella.

## 1. Referencias analizadas — conservar / no copiar

1. `WALOS_M3_Cargar_Venta_POS_vNext(2).html` (archivo facilitado): selección del medio de cobro, pantalla QR en espera, ticket, cuenta regresiva y laboratorio con aprobado, rechazado, expiración, pérdida de red y pago tardío. **Conservar UX conceptual. No copiar estado JS local ni botón que acredite libremente producción.** El modelo no muestra lista completa en pantalla QR: mejorarla.
2. `WALOS_Modulo_Ventas_UX_v4_0(4).html`: catálogo espacioso, etapa «Seleccionar artículos» y etapa «Revisar y cobrar», contexto de ubicación, confirmación visual, descuentos, historial y diseño adaptable. **Conservar patrón de navegación y lectura; usar los componentes React REAL ya existentes, sin duplicar POS.**
3. `cuentas_bancarias_asociadas(2).html`: tarjetas de cuentas, titular, alias, CBU/CVU, roles, estado y QR. **Conservar como guía visual separable**. No utilizar URL externa `qrserver.com` ni su QR ejemplificativo como código cobrable; no tratar CVU/alias como vinculación OAuth verificada.
4. Estado REAL de `main`: React TS/Vite, FastAPI/PostgreSQL/Alembic, POS `RealPosPage` / `RealPosCheckout`, `SaleService` con venta `CONFIRMADA` y descuento de inventario en la misma transacción, `Idempotency-Key`, recuperación de intentos, pagos actualmente **declarados**, y compuerta frontend `VITE_PYME_ENABLE_REAL_SALES`. No reescribir ni eliminar esas garantías.

## 2. Decisiones de alcance

- **Primera entrega: proveedor simulado interno, sin acceder a la API externa de Mercado Pago.** «Cuenta Mercado Pago DEMO vinculada» = configuración ficticia persistida y asociada a un único `business_id`. El nombre, ID y estado se muestran como DEMO, no como una vinculación real.
- Preparar interfaz `PaymentProvider` con un adaptador `MockMercadoPago` y contrato futuro `MercadoPagoOrdersApi`. **No enviar credenciales reales de prueba ni generar QR real cobrable en B1–B5**.
- El QR DEMO puede codificar una ruta/referencia de **prueba** controlada por la app, con marca visual «SIMULACIÓN — NO COBRABLE»; jamás usar `qr_data` falso que parezca emitido por Mercado Pago. El importe y detalle vienen del intento persistido del servidor, no del contenido del QR ni de inputs libres.
- **Un negocio ≠ una cuenta personal:** vínculo siempre por empresa; un usuario puede operar varias empresas sin compartir cuentas, intenciones, credenciales ni cobros.
- **Una cuenta de cobro no equivale a contabilidad bancaria:** registrar intenciones y eventos de cobro, pero no inventar acreditación ni saldo bancario. El futuro módulo financiero consumirá eventos conciliados de origen acreditado.
- **No mezclar pago declarado con pago verificado:** `MERCADO_PAGO` en la venta actual es medio declarado y **no** prueba de aprobación. La opción nueva «Mercado Pago QR (DEMO)» utiliza un flujo independiente de comprobación. Ningún botón del frontend autoriza un pago de producción.
- **Nada de ventas pendientes como `Sale` confirmada:** la tabla existente restringe `Sale.status = 'CONFIRMADA'`; las intenciones pendientes deben modelarse por separado.
- Descuentos, importes y líneas se congelan como **snapshot** al crear el intento de cobro; el backend valida/recotiza antes de aceptarlo. Identidad de `business_id`, `location_id`, cuenta y monto no puede cambiar durante ese intento.
- Durante QR pendiente, resolver explícitamente **reservas de stock** o control de stock en cierre. Si el stock desaparece tras un pago aprobado, nunca registrar venta de stock negativo, nunca duplicar el cobro; dejar intento en `REQUIERE_REVISION` para resolución y/o eventual reembolso. La etapa B4 deberá escoger e implementar la política de reserva con la misma atomicidad del ledger.
- Mantener `main` estable y no encender globalmente ventas REAL; pruebas exclusivamente contra PostgreSQL QA aislado y flags de autorización explícitos, sin claves reales ni dinero real.

## 3. Secuencia de desarrollo con puertas de aprobación

| Bloque | Entregable vertical | Backend / persistencia | Frontend / UX | Puerta de salida |
|---|---|---|---|---|
| **B0** — Plan rector | Este documento + ADR/contratos y matriz QA; rama desde `main`, PR draft | Auditoría mínima de ventas, permisos y paginación | Referencias UX mapeadas a REAL | Documentos y alcance revisados; sin modificar el funcionamiento |
| **B1** — Vincular cuenta | «Medios de cobro» → «Mercado Pago DEMO» con vincular, ver estado y desvincular | Migración de vínculo tenant-scoped; lectura/escritura según rol; sin tokens externos | Tarjeta con empresa, alias ficticio, modo DEMO, conectada/no conectada | Empresa A conecta; B no ve ni modifica; trabajador solo consulta |
| **B2** — Intento QR | Desde revisión de POS: iniciar intento de cobro, importe y detalle congelados | Tablas de intentos y renglones/snapshot; referencia y clave idempotente; expiración, cuenta/sede | Pantalla dedicada con QR DEMO, portada, unidades, precio, descuento, total, tiempo restante, estado y «Volver» seguro | F5 consulta mismo intento; no se crea venta, no mueve stock, 2 solicitudes no duplican intento |
| **B3** — Simular cobro | Operador/administrador QA prueba aprobado, rechazado, expirado, cancelado, sin red y tardío | Eventos inmutables, transición de estados, permisos y replays; endpoint de simulación **solo QA** | Laboratorio demo claramente separado del cliente; indicadores comprensibles | Red inestable, evento duplicado/fuera de orden, empresa incorrecta y rol incorrecto no provocan cobro duplicado |
| **B4** — Confirmar venta | Al aprobar DEMO, confirmar una única venta REAL QA y vincular comprobante al intento | Integración transaccional segura con `SaleService`, stock y comprobante; resolver reserva/stock insuficiente y recuperación | Pantalla «Venta confirmada» con desglose, referencia de pago DEMO y comprobante | Un solo ledger/saldo por bien físico, servicios sin stock, 409 protegido, idempotencia y recuperación F5 |
| **B5** — UX y cierre | Flujo único completo y responsive; observabilidad y documentación | GET de estado/operación, auditoría, cancelación/reconciliación; sin secretos en logs | Menú lateral consistente, estado por negocio, accesibilidad, móvil, feedback y errores sin doble mensaje | Backend Pytest + Alembic + build/lint + Playwright REAL y DEMO + QA manual integrado |
| **B6** — Adaptador oficial (posterior a demo aprobada) | Investigación implementable de integración externa: OAuth vendedor y Orders API QR en sandbox | Credenciales cifradas/backend, token refresh, sucursal/caja, `POST /v1/orders`, webhooks firmados, consulta confirmatoria, reembolsos | Conectar cuenta real de prueba por OAuth y usar QR oficial cuando esté habilitado por Mercado Pago | Solo después de verificar condiciones de acceso/API actual y cuentas de prueba, nunca tratar mock como pago real |

### Entrega B0 (presente)
- Rama nueva creada desde el SHA de `main` registrado.
- Documentación de decisiones, endpoints propuestos, pruebas y riesgos.
- Sin migraciones ni activación de ventas; el usuario aprueba el plan antes de B1 si desea hacer ajustes.

### Entrega B1 (primera implementación)
**API sugerida (a revisar con los patrones del repositorio):**
- `GET /api/v1/businesses/{business_id}/payment-connections/mercadopago`: configuración no sensible y estado.
- `POST /api/v1/businesses/{business_id}/payment-connections/mercadopago/demo`: crea/reactiva la vinculación ficticia, con `Idempotency-Key`.
- `DELETE /api/v1/businesses/{business_id}/payment-connections/mercadopago/demo`: desactiva sin borrar historial; no permite cortar un intento pendiente sin control de riesgo.
- No aceptar `business_id` del cuerpo como fuente de autorización. No admitir passwords, access tokens ni secretos reales en JSON de DEMO.

**Modelo mínimo:** `MerchantPaymentConnection` (uuid, business_id FK, provider, mode `DEMO`, mock_merchant_name, mock_merchant_ref, status `ACTIVA/INACTIVA`, timestamps y actor). Restricción de unicidad por negocio/proveedor/modo. Sin CBU/CVU inventados como prueba de propiedad. Control por ACL de empresa, nunca por esconder botones únicamente.

**QA B1:** cuenta A, segundo negocio B, usuario Dueño/Admin/Encargado/Trabajador, empresa suspendida, sesión revocada, doble clic y F5, cambios de empresa y no filtración de nombres.

### Entrega B2 (detalle y QR)
**Pantalla propuesta «Revisar y cobrar»:**
- Encabezado: Empresa, sede y «Mercado Pago DEMO vinculado».
- Artículos: portada si existe; nombre, SKU opcional, cantidad, precio unitario, subtotal de línea.
- Resumen: subtotal, descuento, **importe total fijo calculado por el backend**, ARS; notas internas fuera del QR.
- QR grande con rótulo persistente «DEMO · NO COBRABLE», expiración y referencia corta.
- Estado «Esperando pago», acción «Consultar estado» e instrucciones. El botón «Aprobar prueba» vive dentro de un panel **Laboratorio QA** con rol y flag controlados por backend.
- En móvil: detalle colapsable **visible y recuperable** y QR completo sin desbordes.

**Contratos tentativos:**
- `POST /api/v1/businesses/{business_id}/qr-payment-intents`: quote validada, cuenta/sede, líneas, descuentos, idempotencia.
- `GET /api/v1/businesses/{business_id}/qr-payment-intents/{intent_id}`: estado, snapshot, expiración, venta opcional.
- `POST /api/v1/businesses/{business_id}/qr-payment-intents/{intent_id}/cancel`: cancelación controlada.
- El QR DEMO identifica al intento mediante referencia opaca, no contiene datos sensibles y no equivale a la trama `qr_data` de un order real.

### Entregas B3/B4 (estados y venta)
`CREADA` → `ESPERANDO_PAGO` → `APROBADA_DEMO` → `FINALIZADA` (venta REAL QA confirmada).  
Otros destinos: `RECHAZADA`, `EXPIRADA`, `CANCELADA`, `INDETERMINADA` y `REQUIERE_REVISION`.  
**No reabrir** un intento finalizado, ni permitir aprobación posterior a expiración sin conciliación explícita.
- Por cada intento máximo una venta confirmada, una clave idempotente y un vínculo de recibo.
- Ningún webhook/retry/refresh ejecuta un segundo POST de venta con otra clave.
- Verificación de estado mediante GET persistente; el frontend jamás almacena el cobro solo en `localStorage`.
- Para pagos de prueba, `payment_origin=SIMULADO_QA` y aviso «No se recibió dinero real». Solo los futuros orders verificables podrán tener `payment_origin=MERCADO_PAGO_VERIFICADO`.

### Entrega B5 (auditoría final de etapa)
Revisión incremental del PR por bloque, no un solo merge masivo. Pruebas de compatibilidad de ventas declaradas, permisos, invitaciones, existencias, compras, caja DEMO, usuarios y empresas múltiples. Validación humana de una sola ruta de uso después de que B1–B4 estén verdes. Documentar qué funcionalidades son REAL, cuáles DEMO, cuáles diferidas.

## 4. Diseño de datos y compatibilidad

Propuesta evolutiva:
- `merchant_payment_connections`: metadatos de cuenta por empresa.
- `qr_payment_intents`: intento, total en centavos, ARS, referencia única, fuente DEMO, vencimiento, estado, `business_id`, `location_id` y eventual `sale_id`.
- `qr_payment_intent_lines`: snapshot de artículo/precio/cantidad (milésimas compatibles con POS).
- `qr_payment_events`: registro inmutable de transiciones, actor, proveedor y deduplicación.
- `stock_reservations` **solo si la política B4 decide reserva previa**, respetando concurrencia y caducidad; no declarar stock reservado ficticiamente.

Mínimo de invariantes: índice/unique por tenant para conexiones e idempotency keys; no aceptar cambios arbitrarios de titularidad o `business_id`; concurrencia explícita y restricciones SQL; trazabilidad de actor, sesión y origen; precisión de centavos y milésimas; salida 404 sin datos de recursos de otra empresa; prohibir tránsito demo→real por cambiar una bandera de UI.

## 5. Exclusiones deliberadas de B1–B5

No crear cuentas bancarias generales, balances ni transferencias externas, no acreditar dinero bancario, no implementar todavía OAuth con vendedores reales, ni link de pago, reservas de clientes o pago con QR de **artículo**. El QR de artículo/identificación queda aparte del **QR de cobro de una venta**, que es el único objetivo actual. No se promete mostrar imágenes o todos los campos dentro de la app de Mercado Pago: se mostrará el desglose completo en nuestra interfaz.

## 6. Referencias externas oficiales, verificadas 12/11/2026

- QR overview: https://www.mercadopago.com.ar/developers/es/docs/qr-code/overview
- Orders API para QR, `items[]`, `X-Idempotency-Key`, caja y `qr_data`: https://www.mercadopago.com.ar/developers/es/docs/qr-code/payment-processing
- Pruebas de compra QR: https://www.mercadopago.com.ar/developers/es/docs/qr-code/test-integration/test-purchase
- Migración a Orders API y modo `dynamic/hybrid`: https://www.mercadopago.com.ar/developers/es/docs/qr-code/resources/migrate-dynamic-qr-model-to-orders
- Webhooks `order.*` y firma: https://www.mercadopago.com.ar/developers/es/docs/qr-code/notifications
- OAuth autorización de terceros y PKCE: https://www.mercadopago.com.ar/developers/es/docs/security/oauth/creation

La API oficial puede evolucionar; revalidar parámetros exactos y elegibilidad de app/cuenta antes de B6.
