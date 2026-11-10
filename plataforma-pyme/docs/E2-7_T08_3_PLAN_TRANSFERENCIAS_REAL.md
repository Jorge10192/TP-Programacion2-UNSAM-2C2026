# E2-7 T08-3 — Plan de integración de transferencias REALES

**Estado:** plan de implementación; **no se ha programado todavía T08-3**. Rama propuesta: `feature/e2-7-t08-inventario-real`. PR #41 continúa como borrador, sin fusionar.

## 1. Punto de partida verificado

T08-1 (consulta de existencias/ledger) y T08-2 (historial y trazabilidad) tienen pruebas funcionales principales aprobadas por el usuario; T08-2 reporta **6/6** casos manuales. CI T08-2 validado: 25/25 inventario, 190/190 frontend, build y lint correctos; E2E Chromium existentes. Esto no equivale al QA integral T08-5/T11.

Backend **ya implementado** bajo `app/modules/purchases/`:
- `transfer_router.py`
- `transfer_schemas.py`
- `transfer_service.py`

**No duplicar ni reimplementar reglas de negocio en frontend.**

## 2. Contrato real existente

**POST** `/api/v1/businesses/{business_id}/inventory/transfers`

Cabeceras:
- `Authorization: Bearer <token opaco>`
- `Idempotency-Key: <UUID v4>` por intención única, estable ante replay.

Cuerpo estricto:

```json
{
  "catalog_item_id": "UUID DEL ARTICULO REAL",
  "source_location_id": "UUID ORIGEN",
  "destination_location_id": "UUID DESTINO",
  "quantity_milli": 1000,
  "reason": "Traslado entre sedes de prueba"
}
```

Restricciones del contrato:
- Artículo `BIEN` activo de la empresa seleccionada; servicio no transferible.
- Sedes distintas, activas y con almacenamiento; ambos extremos dentro del mismo tenant.
- `quantity_milli` entero `1..999999999`; unidades discretas (`UNIDAD`, `CAJA`, `PAQUETE`) múltiplos de 1000; otras unidades admiten milésimas compatibles.
- `reason`: entre 3 y 500 caracteres tras normalizar espacios.
- El backend verifica **permiso STORE en ambas sedes** y evita saldo negativo.
- Un solo commit registra **salida** en origen, **entrada** en destino, operación histórica y saldos actualizados.
- `201`: creación; `200`: replay con **misma clave, actor y cuerpo** (sin duplicar).
- `401` sesión no válida, `403` falta permiso en origen o destino, `404` recurso fuera de tenant/no disponible, `409` falta de saldo, sede incompatible, empresa suspendida o conflicto de idempotencia, `422` cuerpo/cantidad incompatible.
- **GET** `/api/v1/businesses/{business_id}/inventory/transfers/{transfer_id}` permite recuperar una operación **si se conoce el transfer_id**; no hay aquí endpoint por `Idempotency-Key`.

## 3. Orden de trabajo propuesto

1. **Gateway TypeScript**: DTOs estrictos por tenant, UUIDs, movimientos y signo; POST y GET; distinción errores HTTP y transporte. Sin reintentos automáticos.
2. **Conversión exacta**: texto `1` unidad discreta → `1000` milésimas; rechazar fracciones de bienes discretos. No usar multiplicaciones flotantes ambiguas para cantidades monetarias/unidades.
3. **Diálogo de traslado** desde Inventario REAL: seleccionar artículo, sede origen, destino distinto, cantidad y motivo. Mostrar saldo **consultado** de origen antes de confirmar, pero **no asumirlo como autorización ni garantía contra concurrencia**.
4. **Permisos**: elegibilidad visual orientativa según rol/ubicación/asignación conocida; FastAPI autoriza siempre, especialmente STORE en ambas sedes. No inventar privilegios.
5. **Confirmación explícita**: mostrar `X unidades de artículo desde Origen hasta Destino`. Un único POST tras aceptación. Bloquear dobles clics.
6. **Identidad durable de la intención**: diseñar registro seguro por `actor_id + business_id` que conserve **cuerpo canónico y misma Idempotency-Key** tras F5, sin almacenar token. Política de consentimiento y riesgo de IndexedDB siguiendo T06/T07. Si almacenamiento falla, evitar mutación que no pueda recuperarse.
7. **Resultado incierto**: al fallar conexión/timeout después de enviar el POST, **no crear otra intención ni clave**. Si se obtuvo `transfer_id`, ofrecer GET de detalle. Si no se obtuvo, revalidar con el usuario y permitir **reenvío explícito con clave/cuerpo idénticos** (el backend responderá 200 ante replay). Sin GET por clave inexistente, sin borrado arbitrario de intención ni reintento automático.
8. **Confirmación y lectura posterior**: mostrar resumen de salida/entrada y los dos movimientos con identificadores; refrescar ambos saldos y el historial con la API. No calcular la proyección final como fuente de verdad.
9. **Regresión**: preservar T08-1/2, T07 y DEMO, sin nuevos endpoints backend ni scripts globales.

## 4. Pruebas automatizadas obligatorias

- DTOs de POST/GET completos, URL relativa, Bearer, header UUID v4.
- `201` nuevo y `200` replay del mismo cuerpo; un solo traslado lógico.
- Rechazo local: fuente=destino, cantidad 0/negativa, exceso máximo, fracción de unidad discreta, `SERVICIO`, motivo inválido.
- Los dos movimientos deben corresponder al mismo `inventory_operation_id`, uno `TRASLADO_SALIDA` negativo en origen y otro `TRASLADO_ENTRADA` positivo en destino; error cerrado si no.
- `401/403/404/409/422` con mensajes útiles, sin DEMO fallback.
- Interrupción de red/timeout: resultado desconocido, no POST automático; F5 recupera cuerpo/clave original en el scope del usuario correcto.
- Cambio de empresa o usuario cancela lectura anterior y no expone datos cruzados.
- Compilación, lint, tests frontend existentes y CI Chromium sin regresión.

## 5. QA manual sugerido (usar datos ficticios y poca cantidad)

**Precondición:** en TEST Empresa A, Producto A TEST tiene 11 unidades en `Sede A TEST` y no hay saldo registrado en `Sede A TEST 2`, **solo si no hubo movimientos posteriores**. Verificar estado inmediatamente antes del ejercicio.

1. Con la cuenta propietaria, hacer traslado de **1 UNIDAD** del Producto A TEST de Sede A TEST a Sede A TEST 2, motivo explicativo y confirmación.
2. Comprobar desde el servidor que origen pasa a **10** y destino a **1**, si el origen era 11. El historial debe registrar **-1** y **+1** con la misma operación.
3. Consultar el detalle por ID y confirmar UUIDs, actor, sedes, unidad y cantidad sin factura ficticia.
4. Reabrir el detalle y/o verificar idempotencia **solo con la misma intención almacenada**, sin emitir un nuevo traslado con nueva clave.
5. Intentar origen=destino y cantidad que exceda saldo: bloquear o recibir 409 **sin alterar stock**.
6. Cambiar a TEST Empresa B: no mostrar productos ni traslados de A.
7. Con Miguel (TRABAJADOR), comprobar acceso y conducta de permisos: si no está asignado para STORE **a ambas sedes**, FastAPI debe rechazar el traslado. No modificar membresías solo para forzar éxito.
8. Verificar que WALOS/DEMO sigue independiente.
9. Ante interrupción simulada de API para QA, confirmar recuperación con **misma clave y cuerpo** tras F5; evitar un segundo traslado por error.

**Advertencia:** repetir el POST con **otra clave** crea una operación nueva; no usarlo como prueba de replay.

## 6. Siguiente bloque

T08-4 integrará **stock inicial y ajustes versionados**, mediante `adjustment_router.py` y `adjustment_schemas.py`: `kind`, `quantity_milli`, `expected_version`, `reason`, `location_id`. Ante 409 por versión obsoleta se requiere **refresco, revisión y nueva confirmación humana**, no recalcular diferencias ni reintentar automáticamente.

T08-5 consolidará QA full-stack real/DEMO y preparación de merge único de T08, siempre luego de validar cada subincremento. **No se solicita ni realiza merge en esta planificación.**
