# E2-6 — Pendientes expresos y transición hacia E2-7

**Corte de cierre:** `main` `6336152e8dd095ca91363566beddd2b622432a5e` (PR #27 fusionado).  
**Propósito:** evitar que completar E2-6 implique silenciar deuda o expandir E2-7.

## 1. Auditorías externas por bloque

Las hojas de E2-1, E2-2, E2-3, E2-4 y E2-5 entregan instrucciones o evidencias de cierre, pero no prueban que el compañero haya completado todas las auditorías y correcciones. El paquete `docs/E2-6_AUDITORIA_IA_*.md` es **solo protocolo**; no hay en este cierre un informe independiente final de E2-6.

Toda corrección identificada por el compañero debe nacer de un hallazgo rastreable y decisión del responsable. Para integración posterior: rama independiente desde SHA real de `main`, PR individual, tests que reproduzcan el fallo, revisión explícita de compatibilidad y CI final. No modificar migraciones históricas aplicadas ni afectar empresas QA sin necesidad.

## 2. Riesgos funcionales que deben permanecer visibles

| Tema | Alcance o incertidumbre |
|---|---|
| Replay histórico tras pausar ubicación | `SaleService` comprueba autorización/aptitud de ubicación antes del replay. Validar política de recuperación de respuestas históricas. No hay fallo confirmado solo por el escenario potencial. |
| Concurrencia cruzada | Más intercalaciones PostgreSQL simultáneas entre ventas, recepciones, traslados y ajustes pueden mejorar la cobertura de orden de locks y deadlocks. |
| Permisos con revocación simultánea | Justifica pruebas específicas de asignación/rol frente a confirmación de venta. |
| Contrato OpenAPI | `SaleView.balances_after` se tipa como `list` genérica; la respuesta concreta conserva `catalog_item_id`, `quantity_milli`, `version`. |
| Política de precios/descuentos | El cliente informa `unit_price_cents`; catalogo se usa para identidad y snapshots. Definir qué roles pueden alterar importes en integración UI/API. |
| Pagos | Declaraciones, no confirmaciones de entidades externas; no afectan caja/cuentas. |
| Devoluciones | No se implementan anulación, compensación o reembolso en E2-6. |
| Stock y manufactura | Una venta de bien elaborado no rebaja insumos de receta ni tiene reservas de stock. |

No convertir estas incertidumbres en hallazgos confirmados sin test o causalidad reproducible.

## 3. Documentación transversal pendiente de actualizar

- `plataforma-pyme/entrega-programacion-2/05_MATRIZ_API_Y_TRAZABILIDAD.md` conserva filas históricas que señalan RF-05/RF-06/RF-07 como planificados. Al cerrar la integración E2-7 debe actualizarse con endpoints, pruebas y SHA vigentes.
- `plataforma-pyme/entrega-programacion-2/01_ANALISIS_DE_REQUERIMIENTOS.md` aún mezcla estados de implementación anteriores con el recorte inicial. Distinguir propuesta histórica y estado real sin reescribir requisitos arbitrariamente.
- `plataforma-pyme/CHANGELOG.md` se concentra en E1 DEMO y no incorpora todos los incrementos reales E2.
- Los encabezados antiguos de `E2-6_DOCUMENTACION_INTEGRAL.md` y `E2-6_E_ENTREGA_TECNICA_Y_VALIDACION.md` dicen «merge pendiente», correctamente para su fecha de redacción, pero **son superados** por el cierre posterior al PR #27.

## 4. Plan acordado y límites de E2-7

**E2-7 = Integración frontend/backend, QA integral y cierre académico.** No debe renombrarse como «Gastos y Caja».

| Subetapa sugerida | Definición verificable |
|---|---|
| **A** | Inventariar React E1 DEMO versus rutas reales E2-1..E2-6; matriz pantalla → endpoint → dependencias → criterio de aceptación, seleccionar límites de integración |
| **B** | Gateway/API tipado, login/sesión reales, selección de tenant, habilitación progresiva de vistas respaldadas por servidor; no migrar datos DEMO silenciosamente |
| **C** | E2E de procesos reales: cuenta → empresa → ubicación → catálogo → proveedor/compra/recepción → inventario → venta; aislar tenant y validar persistencia |
| **D** | Regresión automática, pruebas de seguridad y permisos, Docker/CI, QA manual focalizada y compatibilidad entre módulos |
| **E** | Matriz API y documentación académica 01–05, UML/ADRs cuando corresponda, README/Changelog y cierre final de TP |

**RF-08 gastos/caja, RF-09 cuentas financieras, RF-10 QR** siguen descritos como post-MVP en la consigna. Sus pantallas DEMO pueden permanecer con aviso visible; no presentarlas como operaciones API ni acreditación real.

## 5. Condiciones antes de declarar finalizada E2-7

1. Definir qué pantallas consumen datos reales y cuáles permanecen DEMO sin confusión.
2. Probar aislamiento por `business_id` tanto en backend como en selector y estado de frontend.
3. Alinear permisos UX con autorización real de API (backend fuente de verdad).
4. No representar pagos `MERCADO_PAGO_DECLARADO` como acreditados.
5. Verificar que el flujo real de recepción y venta produce ledger y balances consistentes.
6. Publicar pruebas en SHA preciso, actualizar documentos académicos y registrar auditorías externas/correcciones efectivamente recibidas.
7. Cualquier nuevo bloque funcional ajeno al alcance debe acordarse por separado.

**Decisión:** cierre técnico de E2-6 asentado; el desarrollo de E2-7 puede prepararse sin declarar resueltas las auditorías independientes de E2-1 a E2-6.
