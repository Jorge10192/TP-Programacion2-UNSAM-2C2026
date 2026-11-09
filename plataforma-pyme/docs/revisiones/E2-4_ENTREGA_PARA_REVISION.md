---
tipo_documento: "ENTREGA_PARA_REVISION"
bloque: "E2-4"
version: "1.0"
fecha_corte: "2026-11-08"
proyecto: "Plataforma PyME — Programación 2 UNSAM"
rama_de_origen: "main"
commit_cierre_backend: "4f88416141c09a82e744990b1aee8c00b9f31dfd"
rama_sugerida_revision: "review/e2-4-proveedores-compras-recepcion"
estado: "CERRADO_FUNCIONALMENTE_PARA_REVISION_INDEPENDIENTE"
fusion_automatica_del_revisor: false
---

# E2-4 — Hoja de entrega para una eventual revisión independiente

**Esta hoja no es el informe de la auditoría independiente.** Entrega las referencias del código y las evidencias ya obtenidas para que otro integrante audite de forma separada. La revisión externa textual resumida en `E2-4_CIERRE/10_OBSERVACIONES_DE_AUDITORIA_Y_DECISIONES.md` es un conjunto de observaciones, no una comprobación propia de todo el backend.

## 1. Acceso, rama y SHA

- Repo: https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026
- Carpeta única de alcance: `plataforma-pyme/`.
- **SHA de código y evidencias probado:** `4f88416141c09a82e744990b1aee8c00b9f31dfd` (merge del PR #18). La presente documentación tiene un commit posterior que **no cambia backend**.
- Rama sugerida para un revisor externo: `review/e2-4-proveedores-compras-recepcion`, fundada desde SHA del corte acordado, **sin rebase/merge automático posterior**.
- Leer previamente [guía maestra E2](GUIA_MAESTRA_REVISION_BLOQUES_E2_ASISTENTE_PYME.md) y [evidencia de cierre](E2-4_CIERRE/00_LEEME.md).

La revisión independiente deberá confirmar acceso al código real, metadatos de migraciones y docs académicos 01–05 antes de emitir conclusiones. Si no puede acceder, debe declararlo y no inventar resultados.

## 2. Alcance implementado por incremento

| Corte | Código / esquema | Evidencia final del corte |
|---|---|---|
| A Proveedores persistencia | `models/supplier.py`; `e24a_suppliers` | 598 tests, PR #12 |
| B Proveedores API | `modules/suppliers/`, cinco endpoints | 693 tests, PR #13 |
| C Compras persistencia | `models/purchase.py`, `purchase_line.py`; `e24c_purchases` | 717 tests, PR #14 |
| D Compras API | `modules/purchases/{router,service,schemas}.py`; `e24d_purchase_hash` | 772 tests, PR #15 |
| E Recepción y stock | `receipt_*.py`, `inventory_router.py`, tres modelos SQL; `e24e_receipt_stock` | 796 tests, PR #17 |
| Corrección de tests poblados | `tests/test_purchase_integration.py` | **797 tests, PR #18** |

**Backend actual:** recepción completa y única por compra, una ubicación STORE, UPSERT atómico de saldos, un movimiento por línea física y replay inmutable con clave original. Aún no hay ventas ni ajustes de stock, ni reconciliación multimoneda, ni integración React/API.

## 3. Evidencia a reproducir y separar por procedencia

- GitHub CI [42530739959](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42530739959): Python 3.12 y 3.14 con PostgreSQL 16, **797 tests cada uno**, Alembic `e24e_receipt_stock`, Docker 3/3 jobs.
- Windows autor: primero 781/796 y 15 fallas de tests por DB QA poblada; después PR #18, 20/20 archivo afectado y **797/797** full suite, misma base conservada. El estado original era **781 passed y 15 failed**, no se deben sumar tests repetidos al total final.
- Swagger autor: 17 casos observados, concept libre, compra física, depósito, recepción 201, replay 200, 409 de intento nuevo, saldo 10000 y único movimiento. **El CRUD completo de Proveedores no tiene bitácora manual detallada**. 
- Documentos completos: `E2-4_CIERRE/01...` a `10...`, JSON y colección `requests/E2-4_QA.http`.

**No afirmar pruebas propias si solo se leyeron las salidas del autor.** Para reproducir reintentos se generan nuevas claves/recursos en QA propio; los secretos históricos no se revelan.

## 4. Matriz mínima de auditoría

| Criterio | Rutas/modelos | Pruebas / riesgo |
|---|---|---|
| Aislamiento por tenant | todos los routers, FK compuestas | cero accesos interempresa y membresía revocada |
| Proveedor y nombre | supplier schemas/service/SQL | normalización, 409, sin duplicado canónico |
| Compra y snapshots | purchase/service, purchase_lines | HALF_UP, costo, 1–30 líneas, sin stock en alta |
| Idempotencia por actor y clave | purchase y receipt | 200 replay, 409 diferente, concurrencia |
| Ubicación/rol STORE | receipt_service, location permissions | empresa suspendida, falta asignación, can_store |
| Ledger y saldo | stock_movements/stock_balances | transacción y rollback, UPSERT sin lost update |
| Historia de tipo/unidad | catalog service + receipt_service | bloqueo de edición y lectura FOR SHARE real |
| Evolución de dominio | estados, parcial 1:N, multimoneda | **TO-BE**, no asumir implementados |
| Riesgo DB de tests | test_purchase_integration.py | PR #18 filtra; DB efímera sigue pendiente |
| Inmutabilidad SQL | roles/triggers de PostgreSQL | REST sin PATCH/DELETE; no trigger UPDATE/DELETE |

## 5. Lista blanca de revisión

Revisar preferentemente `backend/app/modules/suppliers/**`, `backend/app/modules/purchases/**`, `backend/app/infrastructure/models/{supplier,purchase,purchase_line,purchase_receipt,stock_balance,stock_movement}.py`, `backend/tests/test_{supplier,purchase,receipt}*.py`, `docs/E2-4_*.md` y el cierre. Catálogo/ubicaciones y E2-1 se consultan como dependencias y se modifican **solo ante defecto demostrado y justificación específica**, preservando compatibilidad.

**No editar migraciones 0012–0015 ya aplicadas**, no borrar volúmenes/datos, no cambiar `main` directamente ni fusionar el PR del revisor. Si una corrección exige cambio SQL, proponer migración **aditiva nueva**, impacto en contratos y pruebas independientes. Guardar un `E2-4_INFORME_DE_REVISION.md` que distinga hallazgo confirmado, riesgo, preferencia, código cambiado, test ejecutado, estado y pendientes. El responsable decide el merge.

## 6. Límite de esta hoja

El cierre E2-4 está validado para su alcance backend y la revisión posterior puede encontrar defectos adicionales. Esto **no equivale a producción ni a la auditoría externa completada**, y no autoriza ejecutar los desarrollos de E2-5, E2-6 o E2-7 dentro de la revisión.
