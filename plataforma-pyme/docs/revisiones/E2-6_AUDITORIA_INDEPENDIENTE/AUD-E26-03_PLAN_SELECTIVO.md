# E2-6 - Decisiones selectivas

| MOD | Hallazgo | Commit | Sugerencia | Dependencia | Decisión equipo |
|---|---|---|---|---|---|
| E2-6-001 | AUD-E26-001 | `aae118313d595cb6a681df27854b30fa6097c57b` | ACEPTAR | Ninguna otra auditoría | PENDIENTE |
| E2-6-002 | AUD-E26-002 | `0a74f2b6e38a099bad20a2648ebf58547b06442e` | ACEPTAR | DTO `BalanceAfterView` ya presente | PENDIENTE |

Ambos cambios son separables. El primero cambia el error del estado extremo de 500 a 409 y conserva rollback; el segundo completa el contrato de respuesta para integración E2-7. No requieren migración ni reconversión de datos.

Antes de aceptar: CI del PR con Python 3.12/3.14 y Docker, ausencia de conflictos contra el `main` vigente y revisión del equipo. Los cinco archivos de código/tests afectados quedan dentro de ventas. Los informes se mantienen separados de la memoria del autor.

Backlog, sin implementación automática: decidir replay tras cambios de permisos/sede y límites de precios por rol; ampliar carreras con revocación e intermodulares; configurar privilegios productivos; consolidar documentación transversal en E2-7. No añadir caja, pagos bancarios, recetas, reservas, devoluciones o arquitectura nueva a este PR.

Rama propuesta `review/e2-6-ventas` hacia `main`. Publicación y URL pendientes al preparar el documento. **No merge.**
