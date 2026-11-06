# ADR-004 — Catálogo, unidades y stock basado en movimientos
**Fecha:** 2026-11-06  
**Estado:** PROPUESTO (parámetros de unidades y homónimos PENDIENTES para fijar en E1-B).  
**Responsable de aprobación:** equipo del TP / responsable funcional (a designar).  
**Fuentes:** E0-A Z050/Z069/Z072/Z070; H07/H09/H16/H18/H19/H22/H25/H26; D04/D09/D10; E0-B §§6–8; v4.

## Decisión propuesta
1. §CatalogItem§ es **BIEN** o **SERVICIO**. Reventa, insumo y elaboración son capacidades opcionales del BIEN. Servicio no requiere existencias, depósito, lote ni receta.
2. Identificador y SKU pertenecen a negocio; **SKU único por empresa** (repetible entre empresas). Reglas de generación automática, nombres homónimos y cambios de SKU siguen propuestas.
3. El saldo no se edita directamente en las vistas. §StockMovement§ es el registro del que se derivan saldos físico, reservado y disponible por empresa/artículo/ubicación; ninguna pantalla mantiene contador independiente.
4. Compra, recepción, traslado y pago son hechos diferentes. Recepción aplica entrada una única vez (idempotente); traslado aplica -q y +q en un comando atómico. Rechazar negativo y transferencias mayores a disponible.
5. Cantidades incluyen unidad y escala; **no** utilizar §parseInt§ para kilos/litros; parseo estricto y representación exacta en unidades menores enteras o decimal con escala declarada. Elegir escalas por tipo antes de E1-B2.
6. Conteo registra ajuste y motivo; cambios concurrentes obligan a revisar versión en API. Retorno de feria/traslado no consume «faltantes» automáticamente: diferencia se documenta explícitamente.

## Alternativas
- Campo §stockActual§ editable en cada módulo: descartado por H09.
- Compra que recibe/paga automáticamente: descartado por inconsistencias.
- Cantidad JavaScript float sin política de redondeo: no aceptada para operaciones comerciales.

## Consecuencias
Se requiere gateway con operaciones transaccionales de DEMO y test de invariantes. La protección de concurrencia entre dispositivos se incorpora **en backend PostgreSQL**, no con flags UI.

## Pruebas pendientes
- **DEMO-STK-01 / QA-STK-01:** recibir 10 dos veces con misma clave deja +10, no +20.
- **DEMO-STK-02 / QA-STK-02:** traslado 3 de 10 deja 7 origen/3 destino; trasladar 11 falla completo.
- **QA-STK-03:** dos ventas concurrentes del último disponible no dejan saldo negativo (**API real**).
- **QA-CAT-01:** mismo SKU en distinto tenant permitido; servicio no tiene stock.
- Conteo diferencial y retorno no producen pérdida silenciosa H25.

## Pendientes acotados
Escalas/unidades, homónimos y política de SKU se fijarán al iniciar E1-B2, sin bloquear shell E1-A.