# E3-3E — Agregar aceptación/rechazo ficticios al QR de exhibición de main

## Base y alcance

- Rama: `feature/e3-3e-main-qr-aceptacion-rechazo` creada **directamente desde main `5ddfde989d29aba384d2e133d7ff24b0a2435e37`**.
- La rama E3-3D no se integra y su PR #73 fue cerrado sin merge.
- Se conserva el QR PNG original de E3-3B y su pantalla de exhibición, precios, renglones, referencia y navegación. En el panel visual, **debajo del PNG**, se agregan solamente dos botones:
  - **Simular aceptación**: un usuario titular/administrador confirma ficticiamente ese QR y crea una única venta interna QA con comprobante y descuento de stock cuando corresponde.
  - **Simular rechazo**: marca el QR como rechazado. No crea venta ni modifica stock.
- El QR sigue siendo **no pagable**: escanearlo no mueve dinero ni contacta a Mercado Pago.
- Si no hay empresas registradas, se debe registrar un usuario de prueba y crear una empresa de prueba, como en el main original. Esta rama no instala datos de demostración.

## Backend y garantías

- Nuevo endpoint específico: `POST /api/v1/businesses/{business_id}/qr-payment-intents/{intent_id}/exhibition-decision`.
- JSON únicamente `{"action":"ACEPTAR"}` o `{"action":"RECHAZAR"}` con header `Idempotency-Key` UUID v4, Bearer y autorización de la empresa.
- Aceptación: reutiliza B4 y SaleService, registra APROBAR+FINALIZAR y la venta completa **en una sola transacción**. El estado final es `FINALIZADA`, el medio interno es `MERCADO_PAGO_DEMO_QA`, nunca un pago del proveedor. Intento 1:1 con la venta y clave determinística del servicio.
- Rechazo: registra evento RECHAZAR y estado `RECHAZADA` sin venta ni stock. Una repetición del mismo actor con la misma clave retorna el mismo resultado.
- Protección de tenant, rol, vencimiento, estados, stock, órdenes externas y concurrencia. Cuando la creación de venta falla por stock/ubicación, se revierte la aprobación sin dejar venta parcial.
- El simulador anterior B3 y cierre B4 siguen deshabilitados en modo exhibición.

## Configuración local (solo QA con datos ficticios)

Backend:
```env
PYME_QR_EXHIBITION_ENABLED=1
PYME_QR_EXHIBITION_DECISIONS_ENABLED=1
PYME_ENABLE_QR_DEMO_LAB=0
PYME_ENABLE_QR_FINALIZATION_QA=0
PYME_DISPOSABLE_QA=0
PYME_MP_QR_SHARED_QA_ENABLED=0
PYME_MP_SHARED_QA_ORDERS_ENABLED=0
PYME_MP_QR_TEST_ENABLED=0
```

Frontend Vite:
```env
VITE_PYME_ENABLE_REAL_SALES=1
VITE_PYME_QR_EXHIBITION=1
VITE_PYME_QR_EXHIBITION_DECISIONS=1
VITE_PYME_ENABLE_QR_DEMO_LAB=0
VITE_PYME_ENABLE_QR_FINALIZATION_QA=0
PYME_API_PROXY_TARGET=http://127.0.0.1:18003
```

No conectar las credenciales reales de Mercado Pago. Cualquier venta ficticia descontará efectivamente el stock de **la base de datos local seleccionada**; utilizar solo empresa y artículos ficticios.

## Plan de prueba

1. Abrir main QR de exhibición local y verificar que el PNG grande sigue visible encima de los dos botones.
2. Usar empresa titular, artículo con saldo físico, generar QR y pulsar `Simular aceptación`. Confirmar `FINALIZADA`, una venta, comprobante y salida de stock.
3. Recargar y comprobar el mismo QR y comprobante, sin duplicación de ventas.
4. Generar otro QR y pulsar `Simular rechazo`. Confirmar `RECHAZADA`, sin venta ni decremento de stock.
5. Verificar expiración, falta de stock, usuarios no titulares y tenants distintos.
6. En caso de error de red, consultar primero el estado original; solo repetir con la misma clave idempotente.

## Publicación

Render público continúa con main hasta que el usuario apruebe merge y despliegue manual (autodeploy apagado). El `Dockerfile.public` y `render.yaml` incluyen flags de esta función para una publicación futura controlada.
