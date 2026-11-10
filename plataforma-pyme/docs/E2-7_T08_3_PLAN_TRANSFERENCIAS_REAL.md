# E2-7 T08-3 — Plan de integración de transferencias REALES

**Estado:** implementación de frontend T08-3 completada en `feature/e2-7-t08-inventario-real` y tests automatizados aprobados; **QA funcional REAL pendiente**. PR #41 continúa como borrador, sin fusionar.

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

## 7. Implementación efectiva del frontend — 10/11/2026

### Archivos nuevos

- `frontend/src/features/inventory/realTransferGateway.ts`: contrato estricto `POST /transfers` con `Idempotency-Key` UUID4, `GET /transfers/{id}`, motivos normalizados como backend, entrada exacta en milésimas con `BigInt` y verificación de operación/actor/sedes/artículo y dos movimientos firmados. Sin reintentos automáticos ni `demoStore`.
- `frontend/src/features/inventory/transferPendingJournal.ts`: IndexedDB independiente de T06/T07, scope `actorId:businessId:inventory.transfer`. Reserva transaccional y verificación por lectura **antes del POST**; clave y cuerpo inmutables, solo un intento pendiente por actor/empresa. No guarda credenciales, Bearer, contraseña, email ni datos de DEMO. Los datos de operación permanecen **sin cifrar** en el navegador; usuario consiente. Si IndexedDB falla se bloquea la mutación.
- `frontend/src/features/inventory/RealTransferPanel.tsx`: formulario por artículo físico ACTIVO, dos sedes ACTIVA con `can_store=true`, cantidades exactas, motivo y consentimiento de persistencia; consulta saldo de origen por GET específico antes de confirmar. Confirmación explícita `window.confirm`, deshabilitación de dobles clics; si el resultado es incierto, conserva clave/cuerpo y **nunca** reenvía automáticamente. El usuario puede revisar saldos/historial, reintentar **la misma clave** mediante acción explícita, o descartar solo después de afirmar que verificó y confirmar de nuevo. En éxito muestra ID de operación, dos deltas y consulta detalle por GET.
- `frontend/src/features/inventory/RealInventoryPage.tsx`: lanza el formulario desde el inventario REAL y vuelve a consultar balances/movements en FastAPI al confirmar. Sigue permitiendo filtros, historial y trazabilidad T08-1/2.
- `frontend/src/features/auth/auth.css`: estilos responsive de formulario, saldo consultado, pendiente ámbar y confirmación verde.
- `frontend/tests/transfer-real-api.test.mjs`, `frontend/package.json` y `.github/workflows/plataforma-pyme-frontend.yml`: comando `npm.cmd run test:transfer-real` incorporado al CI.

### Garantías y límites importantes

- El saldo mostrado es lectura previa, **no reserva**: FastAPI vuelve a validar disponibilidad con UPDATE condicional y transacción atómica, por lo que un 409 de concurrencia es normal y no provoca retry automático.
- El botón aparece para la empresa activa con sedes y artículos elegibles; **los permisos STORE reales son los del servidor**. A un trabajador sin asignaciones a ambas sedes FastAPI puede rechazar con 403. No se crean ni se cambian asignaciones para habilitarlo.
- La respuesta se acepta solo si incluye **exactamente dos** movimientos, uno `TRASLADO_SALIDA=-quantity_milli` en origen y uno `TRASLADO_ENTRADA=+quantity_milli` en destino, ambos con el mismo `inventory_operation_id`, actor y artículo.
- Un 201 (creación) y un 200 (replay de misma clave/cuerpo) se presentan como confirmación, **no** como dos traslados diferentes.
- El GET por ID no recupera un POST cuyo identificador nunca llegó. En resultado incierto se utiliza historial/saldos y eventual replay **idéntico**, jamás clave nueva automática.
- No se crean comprobantes fiscales, no se editan saldos en el frontend y no se modifica la cuenta/caja.
- Los registros de intención persisten solo en el navegador donde se originaron y pueden permanecer sin cifrar hasta limpieza explícita; no usar equipo compartido.
- T08-3 no requiere cambios de backend ni migraciones. No modifica inventario inicial/ajustes de T08-4.

### CI y pruebas

GitHub Actions [#42855668226](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42855668226), commit de implementación `7dc23ba`: **ambos jobs SUCCESS**.

- **Frontend: SUCCESS:** `npm ci`, `npm run build`, `npm run lint` **0 warnings y 0 errors**.
- **Tests frontend: 204/204 aprobadas** (14 pruebas nuevas en `test:transfer-real` y 190 preexistentes); **test:inventory-real 25/25** sin regresión.
- Se conserva el aviso Vite por chunk JavaScript mayor de 500 kB, sin modificar umbrales ni silenciar. Se corrigió además el formulario para limpiar el destino al cambiar de origen y bloquear el botón durante la reserva de identidad en IndexedDB. También se distingue respuesta GET inválida (solo lectura) de POST exitoso con DTO inválido (resultado incierto: conservar el intento); estos casos están probados.
- **Chromium escritorio y móvil: SUCCESS**. Sus recorridos actuales son **DEMO**, no pruebas full-stack de POST transferencias con PostgreSQL.
- Pruebas T08-3 incluyen: POST Bearer e Idempotency-Key, 200 replay, GET histórico, validación de unidades y motivo, dos movimientos con actor/sede/ID compartidos, HTTP 401/403/404/409/422, timeout/red incierta, conservación de clave tras F5, aislamiento de actor/tenant y rechazo cerrado de registro corrupto y de nuevo cuerpo.
- Una ejecución anterior detectó un test que esperaba rechazo de salto de línea en motivo; se corrigió porque el backend normaliza espacios y saltos de línea. La última ejecución de frontend está aprobada.

### QA humano pendiente

1. `git pull --ff-only origin feature/e2-7-t08-inventario-real`, ejecutar `npm.cmd run test:transfer-real`, `npm.cmd run test:inventory-real`, `npm.cmd run build` y `npm.cmd run lint` desde `plataforma-pyme/frontend`.
2. Con FastAPI y Postgres saludables, abrir `http://localhost:5173/real/login`, entrar como titular de **TEST Empresa A** → Inventario REAL → **Transferir entre ubicaciones**.
3. Elegir `Producto A TEST`, origen `Sede A TEST`, destino `Sede A TEST 2`. Verificar mediante GET el saldo **antes de confirmar**. Si sigue en 11 y destino no tenía registro, transferir **1 UNIDAD**, motivo `Reposición de sede secundaria`. Confirmar.
4. Resultado esperado si los saldos no cambiaron antes de la operación: **origen 10, destino 1**, historial con **−1 en origen y +1 en destino**, relacionados por un único identificador de transferencia. **No** asumir saldos fijos ni repetir el POST de esa operación con clave nueva.
5. Abrir «Ver identificadores» del resultado, después «Revisar saldos e historial actualizados» y comprobar datos leídos desde API. No debe modificar DEMO ni el historial anterior.
6. Probar destino=origen, cantidad inválida/servicio y saldo insuficiente **sin realizar una nueva transferencia válida**. El frontend debe bloquear y/o API devolver 409 sin cambios.
7. Cambiar a cuenta Miguel: sin permisos STORE **a ambas sedes**, un intento debe recibir 403; conservar el pendiente de ese actor si se envió POST y no inventar permisos.
8. Comprobar Empresa B y WALOS/DEMO continúan aislados.
9. **Prueba de fallo de red opcional y controlada**: parar solo la API una vez que se haya reservado un intento nuevo, revisar el mensaje de resultado incierto, F5 y re-login; el registro deberá reaparecer con la **misma clave y el mismo cuerpo** y nunca reenviarse solo. No usar la prueba sobre una transferencia confirmada que ya se haya limpiado.

**Prohibido:** detener/eliminar volúmenes PostgreSQL, forzar roles, crear segunda clave para imitar un replay, asumir éxito por los tests simulados o fusionar el PR #41 antes de T08-4/5.

## 8. Criterio de cierre

El subincremento **T08-3 queda listo para pruebas manuales**, no aprobado todavía en PostgreSQL real. Cerrar una vez contrastados 201/200, saldos, exactamente dos movimientos, aislamiento A/B, permisos STORE y regresión DEMO. Los casos de carrera >100 movimientos y pérdida de respuesta permanecerán en T08-5/T11 cuando requieran orquestación full-stack.
