# E2-7 — Revisión de T08 y preparación de QA T08-4

Fecha: 10/11/2026. Rama `feature/e2-7-t08-inventario-real`. PR #41 permanece borrador, sin merge.

## Base y alcance

Revisión iniciada sobre `be93ce133bec9e2c3d671d39888739ce9d7a89d8` y actualizada a `d417331ff6468acce89f90c27c311c435b82a8a7` tras commits concurrentes. El bloque siguiente de inventario es **T08-4**, no T09-4; ya estaba implementado. No se duplicó su desarrollo ni se sobrescribieron los cambios concurrentes.

| Bloque | Código y contrato revisados | Resultado |
|---|---|---|
| T08-1 | GET por tenant/sede/artículo, parser de saldos, paginación, cancelación de lecturas y montaje por usuario/ruta | Sin bloqueo identificado; alto volumen pendiente |
| T08-2 | Filtros locales explícitos, recuentos parciales y trazabilidad | Sin bloqueo identificado; aceptación manual previa conservada |
| T08-3 | UUID4 durable por actor/empresa, cuerpo inmutable, recuperación sin POST automático, dos movimientos vinculados; servicio backend con STORE en ambas sedes y transacción | Circuito funcional principal aceptado según actas; QA negativo y fallos controlados pendientes |
| T08-4 | Inicialización única, ajustes por versión, conteo convertido en delta, permisos diferenciados | Implementado; requiere QA manual REAL |

## Defectos detectados y correcciones concurrentes verificadas

El run `42868554058` de `be93ce1` falló. Se reprodujo localmente el fallo de `countedMilli`: dobles barras en un literal regex rechazaban cantidades válidas, incluido `0,000`. También se detectó que el formulario comparaba el saldo final con el límite por comando (999999999), bloqueando entradas legítimas sobre saldos grandes.

Durante la revisión llegaron `0af6e90` y `be848bd`, que corrigen ambos defectos, y `f57bbfd`, que incorpora regresión de límites. Se conservaron esas correcciones. El saldo máximo es 999999999999999 milésimas; el delta máximo por ajuste sigue siendo 999999999. La versión final revisada contiene ambas reglas.

## Evidencia y límites

- En `d417331`: `node --test plataforma-pyme/frontend/tests/*.test.mjs`, **256/256**, sin fallos ni omitidos. Incluye **26 inventario REAL, 14 transferencias y 15 ajustes**. El total corresponde a todos los archivos, no solo a la selección de scripts de CI.
- La corrección equivalente validada localmente pasó build y lint. Se vuelve a verificar la versión final concurrente; consultar CI del commit correspondiente antes del cierre.
- No se ejecutó aquí PostgreSQL ni el navegador REAL del usuario. Se leyeron los servicios backend y sus pruebas de permisos, atomicidad, idempotencia y concurrencia; esto no equivale a ejecutar pruebas de integración.
- Las capturas y aceptación de 7 + 4 = 11 son evidencia histórica de las actas previas, no una nueva consulta de saldos realizada en esta revisión.

## Siguiente paso

Ejecutar el checklist de `E2-7_T08_4_STOCK_INICIAL_AJUSTES_VERSIONADOS_QA.md` sobre un artículo nuevo, con titular de TEST Empresa A: stock inicial 5, entrada 2, conteo final 6; esperar saldos/versiones 5/v1, 7/v2, 6/v3 y tres movimientos +5, +2, -1. Conteo igual al saldo no debe enviar POST. No repetir operaciones sobre Producto A TEST para recrear evidencia.

Antes del cierre global T08-5: permisos negativos STORE, conflicto por versión obsoleta, recuperación/F5 y pérdida de respuesta, más de 100 registros, aislamiento A/B y regresión DEMO final. No declarar T08 integral aprobado ni fusionar a main por los tests frontend.
