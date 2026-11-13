# E3-2B · B6 — Mercado Pago oficial TEST: OAuth, QR Orders, conciliación y venta QA

**Rama de trabajo:** `feature/e3-2b-mercadopago-qr-demo`.  
**Modo de operación:** exclusivamente **cuentas y credenciales de prueba**, en PostgreSQL **descartable**. **Desactivado por defecto. No preparado para producción.**  
**Política:** mantener B1–B6 en esta rama; NO modificar `main` sin autorización expresa. La conexión a MP real no se valida sin autorización efectiva y Seller Test.

## Fuentes oficiales y decisiones (consultadas 12/11/2026)

- [Integrar el procesamiento de pagos QR](https://www.mercadopago.com.ar/developers/es/docs/qr-code/payment-processing). Orders API POST `/v1/orders`; `config.qr.mode=dynamic`, `config.qr.external_pos_id` de caja previamente registrada, `X-Idempotency-Key`, `transactions.payments[0].amount` decimal exacto; obtener `type_response.qr_data` e imprimir QR.
- [Migrar QR dinámicos a Orders](https://www.mercadopago.com.ar/developers/es/docs/qr-code/resources/migrate-dynamic-qr-model-to-orders). Preferir Orders API y tópico `order` en lugar de APIs legacy.
- [OAuth authorization code + PKCE](https://www.mercadopago.com.ar/developers/es/docs/security/oauth/creation). Credenciales solo backend; `state` aleatorio; `code_verifier` de un solo uso; `code_challenge_method=S256`; `test_token=true`.
- [Webhooks QR](https://www.mercadopago.com.ar/developers/es/docs/qr-code/notifications). Validar `x-signature` y `x-request-id` con HMAC SHA256; notificación NO es acreditación por sí misma: GET a Orders API con token de vendedor de su empresa.
- [Crear sucursal y caja](https://www.mercadopago.com.ar/developers/es/docs/qr-code/create-store-and-pos). Se requiere configurar vendedor, sucursal y caja. `external_pos_id` es el `external_id` de caja: **no** es CBU/CVU ni token.

## UX tomada de los HTML aportados

- `WALOS_M3_Cargar_Venta_POS_vNext(2).html`: conservar revisión del carrito, snapshot por renglón, cantidades, subtotal, descuento, total y transición a QR con caducidad; NO adoptar su `PaymentMockEngine` como prueba de un pago real.
- `WALOS_Modulo_Ventas_UX_v4_0(4).html`: separar historial, comprobante, registro de pago y cierre de venta; no confundir importes comerciales con saldos bancarios.
- `cuentas_bancarias_asociadas(2).html`: conservar tarjetas de cuenta, roles y estados claros con diseño `md:grid-cols-2`, móvil una columna. No reutilizar URLs de imágenes QR genéricas, CBU/CVU ficticios, datos personales del ejemplo ni formularios de pegar tokens.
- La app es multiempresa y multirrubro. WALOS es solo un cliente de ejemplo.

## Arquitectura B6

### 1. Bases de datos y cifrado

Migración `e32b_mp_official` después de `e32b_qr_sales`:
- `mp_oauth_pending`: hash SHA256 de `state`, `code_verifier` cifrado, usuario y empresa vinculados, expiración de 10 min y uso único.
- `mp_test_accounts`: 1 vendedor por empresa, vendedor MP identificado y único globalmente, token y refresh cifrados con Fernet, estado, vencimiento y caja externa.
- `mp_test_orders`: 1 order por QR original, idempotencia empresa + request UUID4, importe exacto en centavos, referencia y ID de order únicos, respuesta `qr_data` de prueba, estado MP conciliado, enlace opcional único a `Sale`.
- Relaciones mediante claves foráneas compuestas por `business_id` hacia QrPaymentIntent/Sale/Account. Nunca enviar tokens en JSON ni usar `localStorage` para credenciales.

### 2. Bloqueo intencional

B1–B5 conservan `MOCK_QA`; B6 introduce por separado `official-test`.
- Una order oficial TEST solo puede emitirse desde un QR original `ESPERANDO_PAGO` sin caducar.
- Cuando ya existe `mp_test_orders` para ese QR, el simulador B3 y cierre DEMO B4 quedan bloqueados (409); no se puede sumar otra venta por el mismo carrito.
- Ordenes oficiales se crean con `X-Idempotency-Key` igual al `request_id` del QR congelado. Recuperación por `GET orders/for-qr/{source_intent_id}` tras F5. Respuestas inciertas requieren reenviar **la misma** orden y clave, no generar otra.
- Los importes, catálogo y notas provienen del snapshot en servidor, nunca de un nuevo formulario del navegador.
- La UI muestra QR ficticio en modo B2 y QR oficial TEST separado solo si MP devuelve `type_response.qr_data` válido; ningún QR genérico de URL externa.

### 3. Estados confiables

| Estado | Significado | Impacto inventario |
|---|---|---|
| `PREPARANDO` | Preparación persistida antes del POST remoto | Ninguno |
| `INDETERMINADA` | Timeout/resultado remoto desconocido | Ninguno; conservar identidad |
| `CREADA` | Order TEST creada y QR dinámico mostrado | Ninguno |
| `PROCESADA` | GET al proveedor confirma `status=processed` + transacción procesada | Todavía ninguno |
| `REQUIERE_REVISION` | Pago TEST procesado pero no se pudo crear venta por catálogo/stock | Ninguno parcial; revisión humana |
| `CANCELADA`, `EXPIRADA`, `REEMBOLSADA` | Estados remotos conciliados | No vender; revisar restitución si ya hubo venta |

El estado `PROCESADA` no es sinónimo de venta. La operación `settle-qa` reconsulta proveedor, exige `status_detail=accredited`, rol administrativo y registra venta, renglones, pago `MERCADO_PAGO_QR_TEST`, movimiento/stock y enlace `sale_id` con un solo `COMMIT`. Repetición retorna el mismo `sale_id` sin redescuento.

**Importante:** un pago test procesado con faltante de stock queda `REQUIERE_REVISION`, sin venta parcial; no se implementan reembolsos automáticos ni compensaciones de stock en B6. Un reembolso posterior a una venta requiere proceso humano de compensación, jamás borrado retroactivo.

### 4. Endpoints

| Ruta bajo `/api/v1` | Acción |
|---|---|
| `GET /businesses/{bid}/mercadopago/official-test/connection` | Cuenta OAuth sin secretos |
| `POST /businesses/{bid}/mercadopago/official-test/oauth/start` | URL oficial de autorización PKCE (titular/admin) |
| `GET /mercadopago/official-test/oauth/callback` | Code/state de un solo uso, guardar tokens cifrados |
| `PUT /businesses/{bid}/mercadopago/official-test/pos` | Vincular caja external_pos_id MP |
| `POST /businesses/{bid}/mercadopago/official-test/orders/from-qr/{qr_id}` | Crear orden dinámica TEST con clave idéntica al QR original |
| `GET /businesses/{bid}/mercadopago/official-test/orders/for-qr/{qr_id}` | Recuperación tras F5 |
| `GET /businesses/{bid}/mercadopago/official-test/orders/{order_id}` | Leer estado local |
| `POST /businesses/{bid}/mercadopago/official-test/orders/{order_id}/reconcile` | GET a Mercado Pago y validación de merchant, QR, moneda e importe |
| `POST /businesses/{bid}/mercadopago/official-test/orders/{order_id}/settle-qa` | Confirmar venta QA sin duplicados, desde estado procesado verificado |
| `POST /mercadopago/official-test/orders/webhook` | Firma HMAC + reconciliación por GET (sin aceptación del body como prueba) |

### 5. Configuración segura, NO ejecutar en la base habitual

El servicio está apagado salvo **ambas** banderas:
```text
PYME_DISPOSABLE_QA=1
PYME_MP_QR_TEST_ENABLED=1
```
Antes de pruebas oficiales el operador debe configurar las siguientes variables como secretos del entorno QA (nunca versionarlas, pegarlas en ChatGPT ni enviarlas al frontend):
```text
PYME_MP_CLIENT_ID=<APP_ID del integrador TEST>
PYME_MP_CLIENT_SECRET=<secreto de la aplicación, SOLO backend>
PYME_MP_REDIRECT_URI=https://qa.example.net/api/v1/mercadopago/official-test/oauth/callback
PYME_MP_FERNET_KEY=<clave Fernet generada y custodiada fuera del repositorio>
PYME_MP_WEBHOOK_SECRET=<firma secreta configurada en Developers TEST>
PYME_MP_FRONTEND_RETURN_URL=https://qa.example.net/real/empresas
```
`PYME_MP_REDIRECT_URI` debe coincidir exactamente con el registro de la aplicación MP. Requiere HTTPS público para OAuth/webhooks (excepto la opción de retorno frontend loopback admitida en modo QA). No se configura `API_ROOT` por input: el host del proveedor es fijo. Crear la app y la caja requiere acción del titular de la cuenta de prueba, fuera de GitHub.

El secreto Fernet debe preservarse entre reinicios: su pérdida vuelve ilegibles los tokens, y su sustitución requiere migración/rotación controlada. No habilitar acceso a producción con estas rutas, ni mezclar fondos reales con DEMO.

### 6. Seguridad y UX móvil

- Botones y controles con estados accesibles, `role=alert/status` y tamaños táctiles de al menos 44 px; tarjetas y comprobante legibles sin zoom.
- No hay campos para pegar access tokens, ni Webhook Secret en HTML, ni redirección a host de OAuth elegido por el usuario.
- OAuth siempre abierto en dominio `auth.mercadopago.com`; retorno fijo y sin reflejar `code`/`state`.
- Bitácora de B3 se conserva; orders oficiales tienen referencia e identificadores de proveedor, pero no invocan el simulador B3.
- La confirmación QA es explícita y requiere titular/administrador. Un vendedor puede consultar la orden que creó, pero no asentar fondos y stock sin rol administrativo.
- No usar un QR como prueba de pago: solo consulta autenticada de Orders API y validación completa.

### 7. QA automático y condiciones de aceptación

Python/SQLAlchemy/PostgreSQL + Node/Vite + Playwright Chromium:
- PKCE S256, state expira y solo se usa una vez; rechazo de OAuth `live_mode=true`.
- Tokens cifrados, permiso administrativo y aislamiento por empresa.
- HMAC correcto, replay, timestamp ±5 min, rechazo de datos ajenos.
- Request y response de Orders: `mode=dynamic`, `external_pos_id`, importes decimal exacto ARS, usuario vendedor, referencias y suma de pagos.
- Idempotencia ante doble click/respuesta incierta y recuperación por QR.
- Validación de venta único y bloqueo mutuo B3/B4/B6; stock no se descuenta antes del cierre QA.
- UI escritorio/móvil, rotulado no producción, OAuth externo sin secretos en cliente.
- Regressión completa de módulos y Alembic `current/check`.

**La suite HTTP simulada no certifica el funcionamiento de Mercado Pago real.** Una prueba oficial exitosa todavía requiere: Seller Test, app de Developers, sucursal/caja MP, URL de callback y Webhook HTTPS accesibles, una compra desde comprador TEST, evento firmado y GET remoto confirmado. Esto no se puede ejecutar sin esas credenciales y una cuenta de prueba aportadas por el usuario en el entorno QA.

## 8. Momento de pruebas funcionales manuales

Después de CI verde de B1–B6 en **el mismo commit**, documentación y revisión de seguridad. Se entregará una matriz guiada para verificar:
1. Registro/empresa/rol, DEMO y TEST diferenciados.
2. Vinculación OAuth Seller Test, caja, y QR por venta detallada.
3. Lectura móvil y F5/reintentos: no duplicar orden ni stock.
4. Compra con usuario comprador TEST, webhook HMAC, reconciliación.
5. Sale + inventario + comprobante e incidentes de stock; rechazo/refund.
6. Aislamiento multiempresa; control de titulares y trabajadores.

No realizar merge ni modificar la base local hasta aprobación expresa. Tras B6, las limitaciones de ambiente/test se dejan como pendientes concretos, no se finge aprobación de la pasarela externa.
