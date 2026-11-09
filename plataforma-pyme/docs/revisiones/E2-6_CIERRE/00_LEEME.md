# E2-6 — Cierre formal de Ventas Integradas (RF-07 / CU-10)

**Fecha de corte:** 2026-11-09. **Proyecto:** Plataforma PyME, Programación 2 UNSAM, backend generalista multiempresa.  
**Estado:** **CÓDIGO E2-6 FUSIONADO A `main`, VALIDACIÓN FUNCIONAL DOCUMENTADA Y CIERRE TÉCNICO CONSOLIDADO.**  
**No equivale a:** auditoría independiente concluida, certificación de seguridad productiva, cobro bancario efectivo o integración frontend/backend terminada.

## Fuente de verdad y commits

- Repositorio: https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026
- E2-6 A / persistencia: [PR #26](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/26), fusionado el 2026-11-09 16:15 UTC; merge SHA `9516633d8fe5ce69c7f8f6ed0af4c87c40e6e460`.
- E2-6 B–E / integración de ventas: [PR #27](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/pull/27), fusionado el 2026-11-09 20:48 UTC; merge SHA **`6336152e8dd095ca91363566beddd2b622432a5e`**.
- Último código probado localmente en Windows: `a66c180d02bfb5decc583a90a07efcc48d0a2783`.
- CI sobre `main` **en el SHA exacto de merge #27**: [GitHub Actions 42696474777](https://github.com/Jorge10192/TP-Programacion2-UNSAM-2C2026/actions/runs/42696474777), **3/3 jobs exitosos**.
- Alembic último head observado en pruebas: `e26a_sales_foundation`.

## Índice del cierre

1. [01_INFORME_CONSOLIDADO.md](01_INFORME_CONSOLIDADO.md) — alcance, arquitectura, contratos, implementación, dependencias y límites.
2. [02_VALIDACION_Y_EVIDENCIAS.md](02_VALIDACION_Y_EVIDENCIAS.md) — pruebas reales Windows, CI del merge, Swagger y conciliación de stock.
3. [03_PENDIENTES_Y_PASO_A_E2-7.md](03_PENDIENTES_Y_PASO_A_E2-7.md) — deuda explícita, auditoría independiente y entrada a integración frontend/backend.

Fuentes previas que siguen siendo válidas:

- [Documentación integral E2-6](../../E2-6_DOCUMENTACION_INTEGRAL.md) — especificación extensa *as implemented*; su encabezado conserva contexto **anterior al PR #27**.
- [Entrega técnica y QA E2-6 E](../../E2-6_E_ENTREGA_TECNICA_Y_VALIDACION.md) — evidencia detallada anterior al merge.
- [Modelo y migración A](../../E2-6_A_MODELO_VENTAS_Y_PAGOS.md) — diseño histórico; contiene notas de fase previa.
- [Contrato físico/mixto C](../../E2-6_C_CONTRATO_VENTAS_STOCK.md) — contrato inicial antes de completar C.
- [Prompt para auditoría independiente](../../E2-6_AUDITORIA_IA_PROMPT_MAESTRO.md) y [matriz](../../E2-6_AUDITORIA_IA_MATRIZ_Y_PLANTILLA.md) — **encargos, no informes ejecutados**.

**Precedencia temporal:** el presente cierre posterior al merge prevalece sobre frases históricas «pendiente de merge» de documentos escritos antes del PR. El código prevalece sobre las descripciones del documento. Si la revisión independiente detecta defectos, se registrarán en informe separado y se corregirán por rama y PR específicos.

## Delimitación de la etapa

Se cierra el bloque **backend de ventas** de E2-6. E2-7 conserva su función original: **integración frontend–backend, QA integral y cierre académico**. No se redefine E2-7 como módulo de gastos y caja. RF-08 (gastos/caja), RF-09 (cuentas financieras) y RF-10 (QR) permanecen fuera del recorte backend implementado y no deben presentarse como operativos.
