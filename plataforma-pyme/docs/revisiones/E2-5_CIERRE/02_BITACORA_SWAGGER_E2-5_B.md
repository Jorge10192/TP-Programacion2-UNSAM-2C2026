# E2-5 B — Bitácora de QA manual en Swagger (traslados)

**Procedencia:** respuestas HTTP proporcionadas por el desarrollador en esta conversación, el 09/11/2026. No fue una ejecución remota independiente. **Ningún token ni clave idempotente real se transcribe.**

**Escenario controlado:** un usuario QA con membresía titular, una empresa QA, dos ubicaciones activas con `can_store=true` (Depósito QA y Casa) y un artículo físico `UNIDAD`. La prueba utilizó compra y recepción del bloque E2-4 como preparación, no como nuevo código E2-5 B.

## 1. Secuencia observada y resultados

| ID | Solicitud/operación | HTTP observado | Evidencia / lectura técnica |
|---|---|---|---|
| B-01 | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | Alta y autenticación correctas | Se creó identidad QA y se operó con sesión válida. No se retienen credenciales. |
| B-02 | `POST /businesses` | **201** | Empresa de QA con titular habilitado. |
| B-03 | `POST /businesses/{business_id}/locations` dos veces | **201 / 201** | Depósito QA: `DEPOSITO`, `can_store=true`, `can_sell=false`; Casa: `CASA`, misma capacidad de almacenamiento. |
| B-04 | `POST /catalog` artículo A | **201** | `Alimento balanceado QA`, `REVENTA`, `item_type=BIEN`, `unit=UNIDAD`, `status=ACTIVO`. |
| B-05 | Intento inicial de `POST /purchases` con ejemplo de Swagger, `quantity_milli=1` | **422** | Rechazo correcto: una unidad discreta exige milésimas múltiplos de 1000. Además el formulario conservaba un ID de ejemplo; el intento **no creó una compra**. |
| B-06 | `POST /purchases` corregido: 10 unidades, costo unitario 10000 centavos | **201** | Compra `REGISTRADA`, total `100000` centavos ($1.000 ARS); todavía sin ingreso físico. |
| B-07 | `POST /purchases/{purchase_id}/receive` en Depósito QA | **201** | `purchase_status=RECIBIDA`, movimiento `COMPRA_RECEPCION +10000`, saldo destino 10000, versión 1. |
| B-08 | `POST /inventory/transfers` Depósito QA → Casa de `4000` milésimas | **201** | Operación `TRASLADO`, dos hechos: salida `-4000` y entrada `+4000`; ambos ligados a la misma operación. |
| B-09 | `GET /inventory/balances` filtrado por artículo A | **200** | Casa `4000`, versión 1; Depósito QA `6000`, versión 2; total 10000. |
| B-10 | Repetición **idéntica** de B-08 (mismo cuerpo, misma clave no publicada) | **200** | ID de transferencia, fecha e IDs de ambos movimientos iguales a la primera respuesta. |
| B-11 | Intento de traslado de 7000 desde Depósito QA (disponibles 6000), clave nueva no publicada | **409** | `Stock insuficiente en la ubicacion de origen`. |
| B-12 | `GET /inventory/balances` después del 409 | **200** | Casa `4000`, versión 1; Depósito QA `6000`, versión 2, `updated_at` del traslado original. |
| B-13 | `GET /inventory/movements` filtrado por artículo A | **200** | **Exactamente tres movimientos:** salida -4000, entrada +4000, recepción +10000. No hay doble traslado ni entrada por el 409. |

## 2. Invariantes contrastados con los datos

- **Conservación del traslado:** `(-4000) + 4000 = 0` milésimas. No se registró ganancia/pérdida física al cambiar ubicación.
- **Conservación del total tras recepción:** `6000 + 4000 = 10000` milésimas; concuerda con `COMPRA_RECEPCION +10000`.
- **Versiones:** Depósito pasó a 2 tras la salida; Casa se creó con versión 1 al recibir el traslado.
- **Ledger común:** cada origen tiene relación histórica correcta: la recepción conserva `receipt_id`/`purchase_line_id`; los traslados usan `inventory_operation_id`/`operation_kind`.
- **Idempotencia:** B-10 devolvió mismo `id` y movimientos, y B-13 no evidenció filas nuevas.
- **Rechazo sin efectos parciales:** B-11 fue 409 y B-12/B-13 mostraron saldos y movimientos sin cambios.
- **Validación estricta:** B-05 fue un error de entrada/ejemplo de Swagger, **no** un bug demostrado de la API.

## 3. Identificadores de comprobantes para contraste (no credenciales)

- Compra: `c890b079-5d4c-4977-8143-258946d92060`.
- Recepción: `b5c6ce63-d99a-473a-83a1-2ee07eba1132`.
- Traslado: `be1de1eb-90bc-4be3-ac6e-84f5e9d1640f`.
- Movimiento de recepción: `faffad9c-6134-4714-b243-58c38315757b`.
- Movimiento de salida: `e73c0ec9-c976-45b4-8c1f-ce3cea21398b`.
- Movimiento de entrada: `d2e3ee16-b1f8-4466-a5eb-f4130b3caa8e`.

Los UUID anteriores son **IDs de recursos**, no claves de autenticación ni idempotencia. Permiten reconocer una respuesta futura, pero no conceden acceso sin permisos. Identificadores empresariales/artículos/ubicaciones: ver `07_FICHA_QA_SANITIZADA.md`.

## 4. Lo que NO prueba esta bitácora

No hubo en Swagger manual dos clientes concurrentes, un ensayo entre tenants, revocación de permisos durante una escritura ni estrés de bloqueo. Esos riesgos se analizan mediante **tests automatizados** documentados en `04_PRUEBAS_AUTOMATIZADAS_CI_Y_WINDOWS.md`; no se atribuyen a esta sesión manual.