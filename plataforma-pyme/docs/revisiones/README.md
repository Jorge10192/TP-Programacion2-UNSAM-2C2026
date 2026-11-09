# Revisiones por bloque — Plataforma PyME

Este directorio conserva hojas de entrega a revisión y evidencias de bloque. **No interpretar una hoja de entrega como auditoría independiente concluida.** Los revisores trabajan en ramas propias sin merge automático.

| Bloque | Hoja de entrega | Evidencia o estado |
|---|---|---|
| E2-1 Identidad/empresas | [Entrega E2-1](E2-1_ENTREGA_PARA_REVISION.md) | Revisión externa según hoja |
| E2-2 Ubicaciones | [Entrega E2-2](E2-2_ENTREGA_PARA_REVISION.md) | Revisión externa según hoja |
| E2-3 Catálogo | [Entrega E2-3](E2-3_ENTREGA_PARA_REVISION.md) | Revisión externa según hoja |
| **E2-4 Proveedores/Compras/Recepción** | [Entrega E2-4](E2-4_ENTREGA_PARA_REVISION.md) | [**Cierre E2-4 con bitácora QA, CI y auditoría de observaciones**](E2-4_CIERRE/00_LEEME.md) |
| **E2-5 Inventario A–C** | [Hoja de auditoría específica](E2-5_ENTREGA_PARA_REVISION.md) **preparada, no ejecutada** | [**Cierre documental E2-5 v1.1, pruebas y evaluación crítica de observaciones externas**](E2-5_CIERRE/00_LEEME.md) · borrador para PR, no auditoría independiente |

La [guía maestra](GUIA_MAESTRA_REVISION_BLOQUES_E2_ASISTENTE_PYME.md) fija alcance, metodología de lectura, permisos de edición y reglas de seguridad.

**Corte E2-4:** `4f88416141c09a82e744990b1aee8c00b9f31dfd`, `e24e_receipt_stock`, 797/797 tests Windows y GitHub CI 3/3. Cierre funcional no significa auditoría independiente terminada ni sistema apto para producción.

**Corte funcional E2-5 (09/11/2026):** `main` `748e69319d8d04900c009d5184168a264a9deeac`, PR #21–#23 fusionados, Alembic `e25a_inventory_ops`, CI 816/826/840 pruebas por corte en Python 3.12 y 3.14, 840/840 Windows para E2-5 C. **Este índice enlaza el borrador documental en PR** y [plan de auditoría independiente](E2-5_AUDITORIA/00_LEEME_Y_PRECONDICIONES.md), **preparado pero no ejecutado**. No equivale a una auditoría externa ni a la versión definitiva. Observaciones de otra IA contrastadas [aquí](E2-5_CIERRE/13_EVALUACION_OBSERVACIONES_IA.md).
