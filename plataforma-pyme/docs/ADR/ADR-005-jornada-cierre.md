# ADR-005 — Jornada, arqueo y snapshot de cierre
**Fecha:** 2026-11-06  
**Estado:** PROPUESTO; excepción «sin verificar» DIFERIDA y deshabilitada por defecto.  
**Responsable de aprobación:** equipo del TP / responsable funcional (a designar).  
**Fuentes:** E0-A Z092/Z093/Z075, H06/H07/H09/H13/H25/H26 y D05/D06; E0-B §8.4; v4 QA-JOR.

## Contexto
El HTML Z093 aporta una UX de cierre útil pero §commitFinalClosure§ borra el borrador sin dejar snapshot verificable. Z075/Z092 ofrecen otros resúmenes, con diferencias sobre cierre sin conteo. E0-C debe fijar una variante conservadora para E1 sin aprobar silenciosamente excepciones.

## Decisión propuesta
1. §CashSession§ pertenece a una empresa y, **cuando corresponde**, ubicación y caja. Empresas de servicios sin caja física pueden operar sin jornada obligatoria.
2. Apertura guarda actor, instante y fondo de efectivo inicial; no confundir billetera/CBU con caja.
3. Durante la jornada, movimientos registrados y aplicados tienen fuente/tipo/importe y referencias estables; no recalcular saldo desde capturas de pantalla.
4. Cierre normal exige arqueo contado, corte identificable, esperado, contado, diferencia, actor, fecha y motivo cuando aplique.
5. **Persistir snapshot inmutable primero** en el mismo cambio lógico que marca la sesión CERRADA. No reabrir, borrar ni sobreescribir evidencia. Reintento con misma clave no genera segundo cierre.
6. Movimientos de stock/retorno de feria se registran por comando independiente. Cerrar caja **no** devuelve productos ni inventa merma. El dinero digital se concilia por pagos de la jornada, no por saldo total de una cuenta compartida.
7. Cierre §sin verificar§ no se muestra como acción funcional en E1 salvo aprobación posterior de permiso especial, causa, alerta y estado diferenciado.

## Alternativas
- Cerrar sin arqueo y borrar borrador: rechazado para E1 por H06.
- Cerrar y retornar automáticamente mercadería: rechazado por H25.
- Reescribir snapshot después del cierre: rechazado por pérdida de auditabilidad.

## Riesgos y mitigaciones
La implementación DEMO es una transición en un store único; carrera venta/cierre requiere **transacción/lock real** en API. Montos exactos en centavos y parseo estricto.

## Aceptación pendiente
- **DEMO-JOR-01 / QA-JOR-01:** snapshot conserva actor, fecha, arqueo, esperado, diferencia y detalle tras consultar historial; doble clic no duplica.
- **QA-JOR-02 (backend):** venta concurrente al corte se incluye o rechaza, jamás queda a medias.
- Cierre no borra borradores sin snapshot, no muta stock ni saldo de billetera.

## Aprobación
Variante conservadora apta para implementar E1-C2 como **propuesta**, validable mediante E2E; definir excepciones sólo con aprobación.