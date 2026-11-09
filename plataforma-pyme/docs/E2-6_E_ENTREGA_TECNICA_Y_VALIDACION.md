# E2-6 — Ventas integradas: entrega técnica y cierre de implementación

**Proyecto:** Plataforma PyME / TP Programación 2 — UNSAM 2C2026  
**Directorio:** `plataforma-pyme/`  
**Rama de trabajo:** `feature/e2-6-ventas-integradas`  
**Estado:** A, B, C y D implementados y validados; E documental. **No fusionar a `main` antes de la auditoría selectiva y el PR único.**  
**Código evaluado en Windows:** `a66c180d02bfb5decc583a90a07efcc48d0a2783` (2026-11-09).

## 1. Alcance implementado

- Registro de ventas exclusivamente de servicios, bienes físicos y ventas mixtas, vinculadas al negocio autenticado.
- Persistencia de `Sale`, `SaleLine` y `SalePayment` con importes enteros en centavos y cantidades en milésimas.
- Snapshots inmutables del nombre, SKU, clase, unidad, precios y totales de cada renglón de venta.
- Pagos **declarados**: `EFECTIVO`, `TRANSFERENCIA`, `CUENTA_DNI`, `TARJETA`, `MERCADO_PAGO_DECLARADO`. Las sumas declaradas deben coincidir exactamente con el total. **No equivale a cobro efectivamente confirmado**.
- Descuento físico por ubicación y artículo con `UPDATE stock_balances ... WHERE quantity_milli >= required RETURNING`, versión incremental y rechazo si faltan existencias.
- Agregación por artículo para el descuento del saldo; un `StockMovement` de tipo `VENTA_SALIDA` por renglón físico con origen `sale_id` + `sale_line_id`.
- Inserción de comprobante, renglones, pagos, movimientos y cambio de saldo en **una transacción**. Rollback ante cualquier falla antes del commit.
- Clave `Idempotency-Key` UUID v4 por tenant: creación 201, replay idéntico del mismo actor 200, colisión de contenido/actor 409.
- Consulta del comprobante histórico por ID y tenant, sin alterar el stock ni pagos.
- Revalidación de sesión y membresía; empresa y ubicación activas para nuevas operaciones, capacidad de ubicación y asignación según rol.

## 2. API publicada

**POST** `/api/v1/businesses/{business_id}/sales`

Requiere autenticación Bearer y header `Idempotency-Key` (UUID v4). El cuerpo acepta:

```json
{
  "location_id": "UUID-de-ubicacion",
  "discount_cents": 0,
  "notes": "Venta de mostrador",
  "lines": [
    {"catalog_item_id": "UUID-del-articulo", "quantity_milli": 1000, "unit_price_cents": 2500}
  ],
  "payments": [
    {"method": "EFECTIVO", "amount_cents": 2500, "reference": ""}
  ]
}
```

El ejemplo es **ilustrativo**: sustituir UUID válidos antes de usarlo. Para venta de servicios sin ubicación, omitir `location_id` o usar `null` (modalidad administrativa). Para bienes físicos, se requiere una ubicación autorizada con `can_sell = true` y `can_store = true`.

**GET** `/api/v1/businesses/{business_id}/sales/{sale_id}` devuelve la venta histórica autorizada.

**Respuestas relevantes:** 201 creación; 200 replay; 401 sesión ausente/revocada; 403 operación no autorizada; 404 empresa/venta no disponible; 409 idempotencia, empresa/ubicación o stock no aptos; 422 validación de contenido o artículo. La API no ofrece anulación, devolución ni reversión de stock en este bloque.

## 3. Reglas y límites del contrato

- De 1 a 30 líneas; de 1 a 6 pagos declarados; totales positivos y dentro del límite `99_999_999_999` centavos.
- Redondeo HALF_UP **por renglón**: `floor((quantity_milli * unit_price_cents + 500) / 1000)`.
- `SERVICIO` exige unidad y cantidades discretas; bienes pueden usar unidades físicas válidas según Catálogo. Las unidades discretas `UNIDAD`, `PAQUETE` y `CAJA` requieren múltiplos de 1000.
- Tenant validado en catálogo, ubicación, comprobante y referencias SQL con FKs compuestas.
- Titular/administrador puede operar en ubicaciones habilitadas; encargado/trabajador requiere asignación activa. Para salida de bienes, debe satisfacer `SELL` y `STORE`.
- Sin ubicación, el comando administrativo solo admite servicios.
- El hash SHA-256 del payload normalizado permite detectar reintentos incompatibles.
- `balances_after` es histórico, no la fuente del stock actual.
- El flujo no asigna fondos a cuentas, no abre caja, no verifica webhooks ni acredita pagos de Mercado Pago.

## 4. Compatibilidad con etapas anteriores

E2-6 A reutiliza la migración `e26a_sales_foundation`, sin crear una nueva para B/C/D. Las lecturas de inventario muestran también `VENTA_SALIDA`. No se reemplazan ni alteran los orígenes de `COMPRA_RECEPCION`, `TRASLADO_*`, `AJUSTE_*` y `STOCK_INICIAL`.

Los movimientos por venta conservan FK al renglón comercial y no a una compra o inventario manual, preservando la exclusión de orígenes definida en el esquema.

## 5. Evidencia de validación

**Entorno local aportado por usuario (Windows, 2026-11-09):**
- B: `14 passed` focalizadas, migraciones y `alembic check` sin diferencias; regresión previa `864 passed, 1 warning`.
- C: `17 passed` focalizadas; `10 passed` concurrencia/API; `22 passed` integración cruzada; regresión `872 passed, 1 warning`.
- Seguridad C: `16 passed`.
- D: `9 passed` atomicidad/permisos/concurrencia.
- Regresión posterior a D: **`879 passed in 132.08s`**, sin warnings reportados.
- `alembic current`: `e26a_sales_foundation (head)`; `alembic check`: `No new upgrade operations detected.`
- La base utilizada fue `asistente_pyme_e26b_test_20261109_134652`, independiente de QA habitual.

**CI GitHub Actions:** `a66c180` — success (2026-11-09), workflow: https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42684413403. El CI debe verificarse de nuevo al terminar auditoría y cualquier corrección.

## 6. Riesgos, no-objetivos y trabajo futuro

- Este bloque no entrega frontend de ventas, caja, cuentas monetarias, comprobantes fiscales, reservas, devoluciones, conciliación ni liquidación de medios de pago.
- `MERCADO_PAGO_DECLARADO` no debe interpretarse como cobro confirmado; la integración de preferencias, QR, webhooks y cuenta MP por tenant exige flujo y contratos propios.
- La relación `can_sell` + `can_store` para bienes es una decisión conservadora de la etapa; validar en diseño si un punto de venta solo SELL debe operar sobre depósito externo mediante flujo explícito, nunca implícito.
- La prueba de carga y la evaluación de interbloqueos bajo diferentes órdenes de solicitudes siguen siendo límites del conjunto actual.
- La advertencia intermitente de Pydantic sobre alias se observó en regresiones anteriores, pero **no** en la última.
- Antes del merge: revisión independiente de permisos/tenancy, validación contable por renglón, condiciones de carrera, tratamiento de errores SQL, y compatibilidad con módulos históricos.

## 7. Criterios de salida E2-6

1. Código y pruebas integradas aprobados — **cumplido en `a66c180`**.
2. Documento técnico E2-6 E — **presente**.
3. Auditoría independiente documentada con hallazgos, severidad, decisión individual e impacto — **pendiente**.
4. Aplicar **solo** los hallazgos aceptados, con commits y pruebas de regresión — **pendiente**.
5. Confirmar nueva CI verde y revisión final de PR/diff contra `main` — **pendiente**.
6. Abrir **un PR** de toda E2-6; fusionar una sola vez después de aprobación — **pendiente**.

**Regla:** no usar este documento como evidencia de auditoría externa completada ni de que el PR ya está listo.

## 8. Validación manual Swagger (2026-11-09)

**Fuente:** respuestas HTTP reales proporcionadas por el operador desde Swagger local (`127.0.0.1:8000`) sobre la base temporal utilizada para E2-6. Esta evidencia no reemplaza las pruebas de concurrencia con PostgreSQL.

**Empresa exclusiva de prueba:** `fc37e4ff-9e26-423b-946e-a9cc0b662360`.  
**Ubicación SELL/STORE:** `013860da-e39b-4028-a080-1ae0638ae482`.  
**Artículo físico:** `dfbef980-9d7b-4810-9d04-ab0e4f51c86f`.  
**Servicio:** `740f0ed2-4371-4de3-bd0d-d218f9b53c34`.

| Operación | HTTP observado | Resultado observado |
|---|---:|---|
| Registrar usuario y empresa | 201 / 201 | Titular administrativo activo |
| Crear producto, servicio y ubicación | 201 / 201 / 201 | Ubicación activa con `can_sell` y `can_store` |
| Registrar `STOCK_INICIAL` | 201 | +10000 milésimas, saldo 10000/version 1 |
| Consultar inventario del producto | 200 | 10000/version 1 |
| Crear venta física de 2 unidades | 201 | Venta `def970fc-6b45-48cb-ba65-a5ca994c3fdd`; 1000000 centavos; saldo 8000/version 2 |
| Crear venta mixta (1 bien + 1 servicio) | 201 | Venta `61108b12-df7e-4da6-8046-ddde75eedba4`; 650000 centavos; dos pagos; saldo 7000/version 3 |
| Repetir venta mixta con misma clave y cuerpo | 200 | Mismo `sale_id`, fecha, líneas, pagos y snapshot de 7000/version 3 |
| Intentar vender 10 unidades con stock de 7 | 409 | `Stock insuficiente para confirmar la venta` |
| Consultar saldo tras rechazo | 200 | 7000/version 3, sin cambios |
| Consultar ledger con filtro de producto/ubicación | 200 | **Exactamente 3 movimientos:** `STOCK_INICIAL +10000`, `VENTA_SALIDA -2000` y `VENTA_SALIDA -1000` |

**Conciliación:** `10000 - 2000 - 1000 = 7000` milésimas. Los dos movimientos de venta están ligados a sus respectivos `sale_id` y `sale_line_id`. No aparecen movimientos físicos por el servicio, el replay ni la venta rechazada.

**Precisión del alcance:** los resultados acreditan el circuito manual principal sobre la empresa de prueba. No constituyen auditoría independiente ni prueba manual exhaustiva de permisos, fraudes, infraestructura o pagos externos. Los medios de pago solo son declarados. Se conserva pendiente la auditoría selectiva y el PR único hacia `main`.
