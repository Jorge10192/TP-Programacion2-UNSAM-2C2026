# ADR — Índice de decisiones y estado vigente T12 (11/11/2026)

**Línea base técnica:** `main` `c6a77137cf82dcb9aad225645e84b1265b1da3ec` (E2-7/T11).  
**Rama de documentación:** `docs/e2-7-t12-cierre-academico`, PR #46, sin merge.

> **Regla de precedencia:** los ocho ADR se escribieron durante E0/E1 como **decisiones o propuestas históricas**. Sus encabezados «PROPUESTO» se mantienen para no reescribir decisiones fechadas; **este índice y el [Documento 04 vigente](../../entrega-programacion-2/04_ARQUITECTURA_Y_PATRONES.md) aclaran qué parte ya está implementada, qué propuesta cambió y qué falta**. La fuente de verdad es código + modelos SQL y documentos 01–05, no el diseño original de cada ADR.

| ADR histórico | Estado actualizado a T11 | Observación verificable |
|---|---|---|
| [001 — Aislamiento multiempresa y membresías](ADR-001-tenencia-y-membresias.md) | **REAL** | Identidad global, `Membership` por empresa y autorización tenant en FastAPI |
| [002 — Titularidad administrativa](ADR-002-titularidad-administrativa.md) | **REAL PARCIAL** | Fundador histórico y titular protegido; transferencia/recuperación **DIFERIDA** |
| [003 — Invitaciones](ADR-003-invitaciones.md) | **REAL NOMINATIVA / DIFERIDO QR SOLICITUD** | Emisión dirigida a correo + aceptación autenticada; link/QR de solicitud abierta no es un acceso público autorizado |
| [004 — Catálogo/unidades/stock](ADR-004-stock-unidades-sku.md) | **REAL CON AJUSTES DE MODELO** | Catálogo y unidades; stock materializado + ledger, control concurrente, no negativo; clasificaciones y snapshots definitivos en Doc 03 |
| [005 — Jornada y cierre de caja](ADR-005-jornada-cierre.md) | **SOLO DEMO / DIFERIDO EN REAL** | No hay RF-08 de caja REAL ni conciliación de fondos en backend |
| [006 — Ventas, medios de pago y QR](ADR-006-ventas-pagos-qr.md) | **VENTAS REAL / QR MP DIFERIDO** | `Sale` y `SalePayment` declarados en FastAPI. OAuth/webhooks/QR de cobro acreditado **no existen** en REAL |
| [007 — Frontend/gateway DEMO](ADR-007-frontend-demo-gateway.md) | **EVOLUCIONÓ** | React/Vite con rutas REAL mediante cliente HTTP y DEMO local; no afirmar que Zustand, `AppGateway` o todos los puertos propuestos se implementaron literalmente |
| [008 — Integración con el TP](ADR-008-integracion-con-tp.md) | **APLICADO EN ALCANCE DE REPO / RÚBRICA TP3 POR COTEJAR** | Trabajo concentrado en `plataforma-pyme/`; el ADR histórico menciona un umbral de **≥10 pruebas unitarias ejecutadas** para TP3, pero los totales de Pytest (que incluyen integración) no demuestran por sí solos ese subconjunto ni sustituyen la consigna oficial |

## Precauciones para la defensa

- **No adoptar propuestas retroactivamente:** una decisión histórica puede haber sido corregida durante T01–T11. No confundir Zustand propuesto con `demoStore` existente ni un patrón descrito en seudocódigo con implementación.
- **Alcance académico:** RF-01..RF-07 y CU-01..CU-12 componen el núcleo REAL documentado. RF-08..RF-10 y QR de Mercado Pago real quedan DEMO/diferidos. La consigna oficial TP3 debe contrastarse antes de afirmar su absorción completa.
- **Seguridad de datos:** la DEMO es local, no autoriza operaciones reales. La API verifica tenant, membresía, rol y sede. `MERCADO_PAGO_DECLARADO` no acredita pagos de terceros.
- **Etapa 2:** [acta T12 y backlog postacadémico](../E2-7_T12_E_ACTA_CIERRE_Y_BACKLOG_ETAPA_2.md) — convergencia visual REAL/DEMO, ERD PostgreSQL, web/móvil y Mercado Pago QR productivo por empresa.
