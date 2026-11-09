# E2-5 — Informe consolidado de implementación y validación

**Estado:** funcionalidad implementada en `main`, CI verde y pruebas manuales principales aprobadas; **cierre documental propuesto sujeto a revisión**. Fecha: 09/11/2026.  
**Referencia congelada:** `748e69319d8d04900c009d5184168a264a9deeac`.

## 1. Objetivo

Implementar el núcleo físico de RF-06/CU-08, CU-09 y CU-11: representar operaciones de inventario con origen y signo verificables, consultar saldos/movimientos por empresa/ubicación/artículo, transferir stock sin crearlo ni destruirlo y registrar stock inicial y ajustes justificados sin admitir saldos negativos o reintentos duplicados.

La plataforma es **generalista, multirrubro y multiempresa**. Los artículos de ejemplo pertenecen a un negocio de QA; el sistema no se limita al rubro de mascotas.

## 2. Evolución incremental

| Corte | Qué entregó | Qué **no** entregó en ese instante | PR / merge SHA |
|---|---|---|---|
| **E2-5 A** | `InventoryOperation`, ampliación firmada de `StockMovement`, FK/CHECK/UNIQUE por tenant, migración `e25a_inventory_ops`, retrocompatibilidad de recepción | Todavía no había comandos de traslado o ajuste | [#21](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/21) · `4268846abc524ebd827b4da930ef58d8d9789ac7` |
| **E2-5 B** | POST/GET de traslados atómicos, doble movimiento, idempotencia, control de stock y permisos STORE; lectura general del ledger extendida | Todavía no había ajustes/stock inicial | [#22](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/22) · `4f992b3beb8dda732e4cd752f828b375f240e13d` |
| **E2-5 C** | POST/GET de ajuste `AJUSTE_ENTRADA`, `AJUSTE_SALIDA`, `STOCK_INICIAL`, versión optimista, motivo, roles reforzados y trazabilidad | No integró ventas/React ni conteo absoluto | [#23](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/23) · `748e69319d8d04900c009d5184168a264a9deeac` |

Los tres PR están **fusionados**, y el código vigente de `main` coincide con el SHA de E2-5 C. Los cortes B y C no introdujeron nuevas migraciones; reutilizan `e25a_inventory_ops` de A.

## 3. Criterios de aceptación y evidencia

1. **Invariantes de unidades:** cantidad física en milésimas enteras; artículos discretos con cantidades enteras; productos físicos ACTIVO; servicios sin saldo. Respaldado por esquemas, restricciones y pruebas automatizadas.
2. **Integridad por empresa:** FK y consultas con `business_id`; permisos de membresía y ubicación; revalidación en servidor. Respaldado por código y tests negativos entre tenants. El QA manual se ejecutó en **una** empresa de prueba, no probó inter-tenant de forma independiente.
3. **Traslados:** 4 unidades se retiraron de Depósito QA y entraron en Casa. Los dos movimientos comparten operación y suman cero. Resultado manual: **201**; balances confirmados **6 + 4 = 10**, GET **200**.
4. **Reintento de traslado:** mismo resultado e IDs mediante POST repetido, **200**; sin segundo movimiento registrado en el ledger consultado.
5. **Stock insuficiente en traslado:** solicitud superior al saldo → **409**; posterior balance/historial sin cambios.
6. **Stock inicial:** primer ingreso de 5 unidades para otro artículo en Casa → **201**; replay **200** con mismo comprobante; una segunda carga nueva → **409**.
7. **Ajustes:** entrada de 2 unidades → **201**; salida de 1 → **201**; el saldo final del artículo de prueba es **6 unidades, versión 3**, confirmado por GET **200**.
8. **Protecciones de ajuste:** salida superior al disponible → **409**; versión desactualizada → **409**; GET posterior muestra saldo y movimientos intactos.
9. **CI y regresión:** 816 → 826 → 840 tests por versión de Python (suite total de cada corte), 3/3 jobs por run, con PostgreSQL 16, Docker y `alembic check` sin deriva.
10. **Windows de E2-5 C:** `840 passed in 110.89s`, `e25a_inventory_ops (head)`, `No new upgrade operations detected.`, Docker DB/API `healthy`, `/ready = ready/ok` (salida aportada por desarrollador).

## 4. Resultado funcional consolidado

| Escenario | Estado final reportado | Justificación |
|---|---|---|
| **Artículo A** — alimento balanceado | Depósito QA: **6 unidades, versión 2**; Casa: **4 unidades, versión 1** | Recepción de 10, traslado de 4, replay sin efecto y rechazo por insuficiencia |
| **Artículo B** — galletitas QA | Casa: **6 unidades, versión 3** | Inicial 5, entrada 2, salida 1, dos rechazos sin mutaciones |
| **Historial artículo A** | 3 movimientos: `COMPRA_RECEPCION +10`, `TRASLADO_SALIDA -4`, `TRASLADO_ENTRADA +4` | GET general por catálogo, 200 |
| **Historial artículo B** | 3 movimientos: `STOCK_INICIAL +5`, `AJUSTE_ENTRADA +2`, `AJUSTE_SALIDA -1` | GET general por catálogo, 200 |

Los dos artículos son independientes: la prueba C no reutilizó ni modificó el artículo A. La bitácora solo confirma los saldos que fueron efectivamente consultados y aportados; no demuestra ausencia de escrituras externas futuras.

## 5. Compatibilidad y delimitación

La **compra** y la **recepción** son procesos distintos. Registrar la compra no genera stock; recibir físicamente sí. El esquema E2-5 A hace compatibles los registros de recepción previos con nuevos movimientos de operación manual sin alterar las recepciones existentes. Los servicios trabajan con `StockBalance` como proyección actual y `StockMovement` como rastro histórico firmado.

**No implementado ni certificado en E2-5:** consumo automático de inventario por una venta backend, ventas/pagos reales, reversos o devoluciones, lotes, conteo físico absoluto derivado automáticamente, modificaciones masivas, informes de conciliación periódica, UI React conectada a estas API, congelamiento del ledger ante acceso SQL privilegiado o despliegue productivo. La existencia de pantallas DEMO no equivale a backend.

## 6. Dictamen de esta entrega

**Apto para revisión de cierre funcional del alcance E2-5 A–C.** Las evidencias disponibles son consistentes: código integrado, CI aprobado y flujos manuales con resultados esperados. **No es dictamen de auditoría independiente ni aprobación para producción.** Antes de publicar el cierre deben revisarse exactitud, lenguaje de alcance, política de seguridad, trazabilidad académica y pendientes de la sección 09. El documento de asignación al auditor **se preparó en una etapa posterior a este cierre preliminar**, a pedido del equipo: [hoja formal](../E2-5_ENTREGA_PARA_REVISION.md) y [paquete de auditoría](../E2-5_AUDITORIA/00_LEEME_Y_PRECONDICIONES.md). **No se ejecutó la auditoría**.

## Evaluación crítica posterior al primer paquete (v1.1)

Se contrastó una revisión asistida por IA que propuso cambiar concurrencia, reinicializar saldos cero, introducir reversión y aprobaciones, endurecer la base, tipificar motivos y extender operaciones comerciales. **No se identificó, en el material recibido, una reproducción de corrupción o pérdida de stock en E2-5**: los rechazos 409 tras cambios concurrentes son coherentes con el contrato del ajuste y las operaciones sobre una misma ubicación se serializan mediante locks. Tampoco corresponde equiparar saldo registrado cero con par artículo-ubicación sin historial.

Se consideran **deudas reales**, sujetas a diseño y validación separada: control de alteración directa del ledger SQL, conciliación balances/ledger, reversos compensatorios vinculados, políticas de ajustes negativos, categorías de motivo y ergonomía de conflictos de versión. Reservas, recepción parcial, moneda y cambios de redondeo pertenecen a otros bloques y requieren decisión de producto; no justifican reescribir E2-5 o migraciones ya aplicadas en este cierre. [Dictamen y evidencias](13_EVALUACION_OBSERVACIONES_IA.md) · [Backlog priorizado](09_RIESGOS_DEUDAS_Y_DECISIONES.md).

El **cierre funcional A–C** se mantiene respaldado por los resultados reportados y CI, pero **la auditoría independiente, el hardening previo a producción y la publicación definitiva** siguen pendientes de aprobación explícita. No se ejecutaron nuevos tests de backend por la edición documental.
