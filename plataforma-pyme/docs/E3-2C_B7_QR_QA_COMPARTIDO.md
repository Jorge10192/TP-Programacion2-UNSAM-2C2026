# E3-2C · B7 — asociación automática a la única caja QR QA

**Base:** B6 commit `6ed69cc70a740f2491daf06510fa0b8366d70f47`. **Rama:** `feature/e3-2c-qr-qa-caja-unica`.
Sin merge a `main`. Se conserva el código B6 (OAuth por vendedor/Orders dinámicas) independiente.

## Recursos que ya creó el operador en Mercado Pago TEST

| Tipo | Identificador |
|---|---|
| Seller TEST | `3837129107` |
| Sucursal TEST | `89968780` (`PYMEQA001`) |
| Caja TEST | `140776986` (`PYMEQA001POS001`) |
| QR estático | trama devuelta por Mercado Pago al crear esa caja |

No volver a invocar POST de sucursal ni POS. La trama pública se representa en PNG desde el backend con `qrcode`, pero no equivale a un pago ni a una orden.

## Implementación B7-A: vinculación de lectura (entregada)

- `GET /api/v1/businesses/{business_id}/mercadopago/qa-shared/connection`.
- Requiere sesión y membresía activa en la empresa; las empresas ajenas dan 404.
- Devuelve por empresa una **asociación virtual, automática** al mismo recurso QA; no se crean comerciantes ni cajas, no se escribe saldo ni se copian credenciales.
- Visible en **Medios de cobro** para toda empresa QA, solo si `PYME_DISPOSABLE_QA=1` y `PYME_MP_QR_SHARED_QA_ENABLED=1`.
- No utiliza Access Token, clave privada, OAuth ni API remota. Cuando las banderas faltan no expone la trama QR ni sus identificadores.
- Mientras el modo QA compartido esté habilitado, se bloquea por backend el alta de vendedor OAuth y el cambio de POS desde las rutas B6.
- La UI deja explícito: aún no se creó una **order** para asignar importe; no hay acreditación ni garantía de que el QR siga activo en el proveedor.

## Pendiente B7-B: habilitar cobro QR real en TEST, antes de marcar el flujo listo

Se requiere configurar `PYME_MP_SHARED_QA_ACCESS_TOKEN` **solo en el entorno backend QA** y comprobar por GET la identidad del vendedor y caja (sin pegar el token en GitHub, frontend ni esta conversación). Luego:
1. Extender Orders API B6 al modo **static** usando `config.qr.external_pos_id=PYMEQA001POS001`; cada venta/empresa genera su propia `external_reference` y clave idempotente.
2. Un solo intento externo pendiente globalmente por caja, con exclusión **en base de datos**; las empresas se mantienen aisladas por `business_id`.
3. Validar importe y artículos del snapshot, estado de Merchant/Test, webhook firmado o GET al proveedor, y recién después asentar venta QA idempotente.
4. Probar con comprador TEST, credencial local y red accesible; nunca afirmar que un pago está acreditado solo porque aparece el QR.
5. No permitir otras cajas ni cuentas a usuarios de QA compartido.

B7-A no integra pagos remotos. **No escanear como si el carrito del POS estuviera asociado a este QR hasta finalizar B7-B**.

Referencias: https://www.mercadopago.com.ar/developers/es/docs/qr-code/payment-processing
