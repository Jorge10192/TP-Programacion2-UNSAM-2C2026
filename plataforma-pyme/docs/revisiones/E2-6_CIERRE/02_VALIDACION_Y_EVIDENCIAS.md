# E2-6 — Bitácora de validación y evidencia comprobable

**Origen de evidencias:** GitHub Actions consultado en `main` + salidas reales del operador Windows/Swagger.  
**No se ejecutaron pruebas nuevas para redactar esta hoja.** Los resultados históricos están asociados a sus respectivos commits, fecha y ambiente.

## 1. Integración Git verificable

| Entrega | PR | Merge SHA `main` |
|---|---|---|
| A — Modelo y migración | [#26](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/26) | `9516633d8fe5ce69c7f8f6ed0af4c87c40e6e460` |
| B–E — Ventas integradas | [#27](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/27) | `6336152e8dd095ca91363566beddd2b622432a5e` |

**GitHub Actions del SHA #27:** [run 42696474777](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42696474777). Tres trabajos completados con `success`: Python 3.12 con PostgreSQL, Python 3.14 con PostgreSQL y build de Docker con liveness. No afirmar que esta ejecución validó futuros cambios a otro SHA.

## 2. Evidencia Windows del código previo al merge

**Código probado:** `a66c180d02bfb5decc583a90a07efcc48d0a2783`.  
**Base temporal independiente:** `asistente_pyme_e26b_test_20261109_134652`.

- Pruebas focalizadas B: 14 passed; regresión intermedia `864 passed, 1 warning`.
- Focalizadas C: 17 passed; seguridad 16 passed; interoperabilidad 22 passed; concurrencia/API 10 passed; regresión intermedia `872 passed, 1 warning`.
- Focalizadas D: 9 passed; regresión final: **`879 passed in 132.08s`**, sin warnings reportados.
- `alembic current`: **`e26a_sales_foundation (head)`**.
- `alembic check`: **`No new upgrade operations detected.`**.
- CI de la rama para el código `a66c180`: [run 42684413403](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42684413403), success.

## 3. Validación Swagger local (2026-11-09)

**Empresa de prueba exclusiva:** `fc37e4ff-9e26-423b-946e-a9cc0b662360`.  
**Ubicación:** `013860da-e39b-4028-a080-1ae0638ae482`, `can_sell=true`, `can_store=true`.  
**Bien:** `dfbef980-9d7b-4810-9d04-ab0e4f51c86f`.  
**Servicio:** `740f0ed2-4371-4de3-bd0d-d218f9b53c34`.

| Solicitud | HTTP | Resultado realmente observado |
|---|---|---|
| Registro usuario, creación empresa, alta de bien/servicio/ubicación | 201 cada alta | Recursos activos y aptos |
| `POST /inventory/adjustments` STOCK_INICIAL | 201 | Movimiento +10000, saldo 10000/v1 |
| `GET /inventory/balances` del bien | 200 | 10000/v1 |
| `POST /sales` venta física 2 unidades | 201 | Venta `def970fc-6b45-48cb-ba65-a5ca994c3fdd`, total 1000000 centavos; saldo 8000/v2 |
| `POST /sales` venta mixta (1 bien + 1 servicio) | 201 | Venta `61108b12-df7e-4da6-8046-ddde75eedba4`; total 650000; pagos 300000 efectivo y 350000 transferencia; saldo 7000/v3 |
| Mismo `Idempotency-Key`/payload/actor | 200 | Mismo comprobante, líneas, pagos, fecha y snapshot histórico |
| Venta de 10 unidades con 7 disponibles | 409 | `Stock insuficiente para confirmar la venta`; saldo 7000/v3 |
| `GET /inventory/movements` de artículo/ubicación | 200 | **Tres eventos exactos:** `STOCK_INICIAL +10000`, `VENTA_SALIDA -2000`, `VENTA_SALIDA -1000` |

**Conciliación observable:** `+10000 - 2000 - 1000 = 7000` milésimas. Cada `VENTA_SALIDA` conserva `sale_id` y `sale_line_id`. El replay, el servicio y el rechazo por saldo insuficiente no agregaron movimientos físicos.

## 4. Qué no demuestra esta evidencia

- La prueba Swagger no cubrió un ataque multiusuario/tenant en ejecución manual ni simuló clientes concurrentes; esas condiciones se examinan en las suites automatizadas, y aún son auditables independientemente.
- Las pruebas de concurrencia entre **ventas** y de interop **secuencial** con operaciones E2-4/E2-5 no significan prueba exhaustiva de todas las carreras cross-módulo bajo carga.
- Los medios de pago son declarados: no se probó liquidación real, caja, billetera, QR, OAuth MP ni webhooks.
- Las pruebas locales son las aportadas por el operador y no fueron vueltas a correr al redactar este cierre.
- No se recibieron en este cierre los cinco informes de una auditoría independiente completada.

## 5. Criterios comprobados

**Comprobado dentro del alcance:** operaciones de venta física y mixta, aritmética de pagos declarados, persistencia de comprobantes y snapshots, replay, rechazo por stock insuficiente, consulta de balances y ledger coherentes, y CI de `main` exitoso.

**Aún no certificado:** ausencia total de defectos, seguridad de producción, integración React–FastAPI o adopción selectiva de hallazgos externos.
