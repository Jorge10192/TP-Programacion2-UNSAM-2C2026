# E3-3B — QR de exhibición pública, no vinculante

## Objetivo

Para la evaluación académica pública (dos usuarios y múltiples empresas), mostrar un **QR sintético no pagable**, el desglose del carrito y el importe. Sin crear órdenes remotas, sin conectar vendedor/caja, sin supuestos pagos confirmados y sin afectar ventas, caja o stock. No reemplaza el flujo Mercado Pago TEST B6/B7 que ya se verificó localmente.

## Implementación

- En Render público: `PYME_QR_EXHIBITION_ENABLED=1` y en el build del frontend `VITE_PYME_QR_EXHIBITION=1`.
- No se deben habilitar `PYME_DISPOSABLE_QA`, `PYME_MP_QR_SHARED_QA_ENABLED`, `PYME_MP_SHARED_QA_ORDERS_ENABLED`, `PYME_MP_QR_TEST_ENABLED`, `PYME_ENABLE_QR_DEMO_LAB` ni `PYME_ENABLE_QR_FINALIZATION_QA`: la API rechaza al arrancar cualquier combinación peligrosa con modo exhibición.
- Se conserva el QR de referencia ficticia generado por `render_demo_qr_data_uri`: contiene `PYME-DEMO-QR:<referencia>` y **no contiene** URL de pago, alias, token de vendedor o un QR estático de Mercado Pago.
- Se habilita una vinculación DEMO **interna y ficticia** por empresa al primer intento de exhibición, porque el snapshot QR requiere `merchant_connection_id` con FK. No hay llamada remota ni cuenta Mercado Pago conectada.
- La UI pública del POS permite crear el intento sin entrar a Medios de cobro, muestra el importe total y permite leer el detalle. En Medios de cobro se indica que no se vincula cuenta/caja.
- La pantalla del intento usa el QR ficticio, evita consultar integraciones oficiales y no muestra botones para crear, conciliar, cancelar o asentar órdenes remotas. El laboratorio de aprobación/conciliación permanece apagado.
- El QR **no es un link público para compradores**. No sirve para pagar ni para acceder sin sesión al detalle comercial privado. Los detalles se muestran únicamente dentro del área autenticada del vendedor.

## Alcance del negocio

- Se crea un intento QR de exhibición y un evento inicial auditado en PostgreSQL; **no** se registra una venta, cobro, caja o salida de inventario.
- Para comprobar una venta real con stock, utilizar el POS con un medio de pago declarado y su confirmación explícita, separado del QR.
- Operaciones e historial siguen aislados por `business_id`, sesión y rol. Los usuarios de empresas diferentes no pueden consultar las exhibiciones ajenas.
- Se mantiene la idempotencia del request_id y la recuperación de intentos pendientes.

## Validación

- Build TypeScript y Vite del frontend, npm test:qr, Docker público de React+FastAPI y suite backend de Pytest.
- Probar dos usuarios diferentes: empresa A muestra QR de exhibición con carrito A; empresa B con carrito B. Verificar que el usuario B no pueda consultar la referencia o el intento A. Confirmar que no existan nuevas órdenes `mp_shared_qa_orders`/`mp_test_orders`, ventas ni movimientos `stock_movements` por exhibir.
- El nuevo `render.yaml` habilita exhibición, pero **no** instala credenciales MP en Render. `DB_HOST`, `DB_USER`, `POSTGRES_PASSWORD` son secretos privados cargados directamente en Render.
- Supabase debe conservar Data API desactivada; las tablas de `public` tienen grants y RLS desactivado. No habilitarla para la demostración.

## Reversión

Cambiar `PYME_QR_EXHIBITION_ENABLED=0` y desplegar frontend sin `VITE_PYME_QR_EXHIBITION` para regresar al modo anterior. No requiere nuevas migraciones ni afecta los datos de B6/B7.
