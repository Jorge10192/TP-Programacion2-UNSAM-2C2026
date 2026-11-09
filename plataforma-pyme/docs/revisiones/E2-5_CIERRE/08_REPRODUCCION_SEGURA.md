# E2-5 — Guía de reproducción segura, sin borrar datos QA

**Destino:** Windows PowerShell, repositorio `TP-Programacion2-UNSAM-2C2026`, carpeta `plataforma-pyme/`. Se proponen **pruebas sobre datos QA nuevos**, nunca reescritura de las compras/recepciones/ajustes cuyos IDs figuran en este cierre.

## 1. Comprobación previa del código y la base

```powershell
git fetch origin
# Hacer checkout del SHA de código que efectivamente se audita en CLON AISLADO:
git switch --detach 748e69319d8d04900c009d5184168a264a9deeac
git rev-parse HEAD
cd backend
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
cd ..
docker compose --profile api up -d --build --wait api
Invoke-RestMethod http://127.0.0.1:18000/ready
```

Este bloque debe ejecutarse en **un clon de auditoría aislado**, no en el workspace con cambios del desarrollador; `--detach` es intencional para congelar la revisión funcional. Comprobar que el `HEAD` coincida con el commit que se desea revisar (en este paquete: `748e69319d8d04900c009d5184168a264a9deeac`). En una revisión posterior, fijar el **nuevo SHA** si `main` avanzó y declarar la diferencia. La migración vigente esperada es `e25a_inventory_ops (head)`, sin operaciones pendientes; DB/API `healthy`, `/ready` = `ready/ok`.

**No ejecutar** `down`, `-v`, `TRUNCATE`, `DROP`, `DELETE` global, `alembic downgrade`, `stamp` ni restauraciones que alteren datos comerciales. Antes de aplicar cualquier nueva migración, revisar la secuencia y disponer de un backup de trabajo cuando corresponda. En el último cierre Windows no fue necesario `upgrade head` porque ya estaba migrada.

## 2. Suite automatizada con separación de responsabilidad

En `plataforma-pyme/`:

```powershell
cd backend
$env:RUN_DB_INTEGRATION = "1"
try {
    .\.venv\Scripts\python.exe -m pytest -q
} finally {
    Remove-Item Env:\RUN_DB_INTEGRATION -ErrorAction SilentlyContinue
}
cd ..
```

**Observación:** esta bandera habilita las pruebas contra PostgreSQL. **No significa que la DB esté físicamente aislada.** Confirmar la configuración antes de ejecutar contra un ambiente compartido/real. En este corte el desarrollador reportó **840 passed in 110.89s**. No prometer que el mismo conteo seguirá si en `main` se agregan tests.

## 3. Autenticación segura en Swagger

Abrir `http://127.0.0.1:18000/docs`. Autenticarse mediante `POST /api/v1/auth/login`, tomar el token **solo dentro de la sesión local** y autorizar Swagger con el candado. Confirmar con `GET /api/v1/auth/me` (200). **No copiar desde Swagger el bloque `curl` a una conversación o informe**: puede contener un token Bearer utilizable. Enviar únicamente **Server response** saneada.

Para repetir escenarios de idempotencia, usar una clave nueva creada localmente por prueba:

```powershell
(New-Guid).Guid
```

Conservar su valor **fuera del reporte**, en un lugar temporal local durante el ejercicio. Para el replay usar exactamente **la misma clave y el mismo cuerpo**; para un intento de segunda operación distinta usar **otra clave**. No incluir el valor en Git, ZIP o capturas.

## 4. Escenario B de prueba limpio

1. Crear un **nuevo artículo** físico `REVENTA` con SKU de QA único; no reutilizar el artículo ART-A del cierre.
2. Crear dos ubicaciones activas `can_store=true` o reutilizar ubicaciones QA solo si el escenario así lo requiere y las existencias de artículos históricos no se tocan.
3. Registrar una compra de 10 unidades de ese nuevo artículo. `quantity_milli=10000`, costo monetario en centavos. El registro de compra debe responder `201` y **no** generar stock hasta recibir.
4. Confirmar recepción explícita en el origen; observar `COMPRA_RECEPCION +10000` y saldo de origen versión 1.
5. Transferir 4 unidades al destino: **201**, dos movimientos `-4000` y `+4000`. Consultar saldos: `6000` en origen, `4000` en destino.
6. Repetir la **misma solicitud** y clave: **200**, mismo comprobante y movimientos; GET de saldos sin cambios.
7. Intentar transferir 7 unidades desde el origen con otra clave: **409**, sin alteración de saldos ni ledger.
8. Consultar GET de movimientos filtrando por el nuevo artículo: exactamente una recepción y dos movimientos de traslado; suma +10000.

**Control de entrada:** para `UNIDAD`, `quantity_milli=1` debe rechazar la compra con **422**, porque no representa un número entero de unidades; el ejemplo JSON automático de Swagger no sustituye los valores del caso real.

## 5. Escenario C de prueba limpio

1. Crear **otro** artículo nuevo, físico y sin saldos anteriores.
2. Comprobar que `GET /inventory/balances?catalog_item_id=...` está vacío para el nuevo artículo. **No confundir lista vacía con saldo registrado de cero.**
3. `POST /inventory/adjustments` con `kind=STOCK_INICIAL`, ubicación apta, `quantity_milli=5000`, `expected_version=0`, motivo de recuento. Esperar **201** y `STOCK_INICIAL +5000`.
4. Repetir misma clave/cuerpo: **200**, mismo comprobante. Nueva clave de stock inicial sobre el mismo par: **409**.
5. Enviar `AJUSTE_ENTRADA`, `quantity_milli=2000`, `expected_version=1`, motivo; esperar **201**.
6. Enviar `AJUSTE_SALIDA`, `quantity_milli=1000`, `expected_version=2`, motivo; esperar **201**.
7. Intentar salida de 7 unidades, `expected_version=3`: **409** por stock insuficiente.
8. Intentar entrada de 1 unidad con `expected_version=1` ya obsoleta: **409** por versión antigua.
9. GET de saldos: 6000 milésimas, versión 3. GET de movimientos: 3 registros firmados, neto +6000. Los rechazos no deben aparecer como movimientos.

El recurso `GET /inventory/adjustments/{adjustment_id}` permite verificar el comprobante histórico de cada operación **sin mutar stock**.

## 6. Verificación documental y del ZIP

- Leer `00_LEEME.md` primero y los casos B/C junto a la tabla QA.
- No ejecutar solicitudes POST directamente contra los IDs históricos de `07_FICHA_QA_SANITIZADA.md`: esos datos se conservan como evidencia.
- En esta versión **versionada en Git**, verificar cada archivo con `git hash-object -- <ruta>` y contrastar el OID con `12_MANIFIESTO_GIT_BLOBS.md`; comprobar además el SHA del commit de la rama/PR. El manifiesto viejo `12_MANIFIESTO_SHA256.txt` correspondía al ZIP v1.0 **y no sirve para la revisión v1.1**. Ante cambios posteriores, regenerar los OID del manifiesto al final.
- Si el revisor trabaja con otra versión del repositorio, registrar **nuevo SHA** en su informe; jamás atribuirle resultados de CI de una versión distinta.

## 7. Lo que esta guía no permite inferir

No autoriza producción, acceso externo, publicación de credenciales, pruebas destructivas, eliminación de datos ni cambio de migraciones. No reemplaza el protocolo de auditoría independiente ni sus permisos de edición limitados.

## Reproducción adicional recomendada — 409 legítimo por concurrencia

1. En **entorno aislado**, crear artículo físico, dos ubicaciones STORE y saldo de destino con versión conocida. Leer GET de balances; registrar cantidad y versión.
2. Desde otra sesión independiente, ejecutar un traslado entrante que confirme y aumente la versión del saldo destino.
3. Intentar `AJUSTE_ENTRADA` con la versión leída antes del traslado y **clave UUID4 nueva**: esperar **409 por versión obsoleta**, sin operación ni movimiento parcial.
4. Releer saldo y versión, decidir si persiste el motivo/diferencia y **solo entonces**, con nueva clave, ejecutar el ajuste con la versión vigente; confirmar ledger y saldo.
5. Para una carrera simultánea real, usar un harness de dos conexiones HTTP/PostgreSQL con barrera y capturar ambos resultados; no simular concurrencia con dos llamadas secuenciales. **Esta carrera cruzada es prueba futura propuesta, no realizada durante el cierre.**

Un stock en cero después de movimientos previos **no** admite `STOCK_INICIAL`; usar nueva compra/traslado o ajuste positivo con versión actual. Nunca “arreglar” el conflicto cambiando claves o versiones a ciegas, deshabilitando restricciones o borrando datos de QA.
